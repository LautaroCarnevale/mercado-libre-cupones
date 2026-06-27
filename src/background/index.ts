import type {
  ExtensionMessage,
  Coupon,
  PageContext,
} from '../types';
import { couponService } from '../services/coupon-service';
import { activationService } from '../services/activation-service';
import { settingsStore } from '../store/settings-store';
import { apiClient } from '../services/api-client';
import { storageManager } from '../store/storage';
import { STORAGE_KEYS } from '../shared/constants';
import { createLogger, setLogLevel } from '../utils/logger';

const log = createLogger('Background');

// Inicialización del service worker
async function init(): Promise<void> {
  const settings = await settingsStore.get();

  // Aplicar config de usuario al cliente API
  apiClient.updateConfig({
    baseUrl: settings.apiBaseUrl,
    timeout: settings.apiTimeout,
    retries: settings.apiRetries,
  });

  setLogLevel(settings.logLevel);
  log.info('Service worker inicializado');
}

// Listener de mensajes
chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void,
  ) => {
    handleMessage(message, sendResponse);
    // true = respuesta asíncrona
    return true;
  },
);

async function handleMessage(
  message: ExtensionMessage,
  sendResponse: (response: unknown) => void,
): Promise<void> {
  try {
    switch (message.type) {
      case 'HEALTH_CHECK': {
        const health = await couponService.checkApiHealth();
        sendResponse({ success: true, data: health });
        break;
      }

      case 'GET_CATEGORIES': {
        const result = await couponService.getCategories();
        sendResponse({ success: true, data: result });
        break;
      }

      case 'GET_COUPONS': {
        const params = message.payload;
        const result = await couponService.getCoupons(
          params?.category ? { category: params.category } : undefined,
          params?.forceRefresh,
        );
        sendResponse({ success: true, data: result });
        break;
      }

      case 'ACTIVATE_COUPONS': {
        const { couponIds, context } = message.payload;

        // Obtener cupones completos del cache
        const cached = await couponService.getCoupons();
        const couponsToActivate = cached.coupons.filter(
          (c: Coupon) => couponIds.includes(c.id),
        );

        if (couponsToActivate.length === 1) {
          const result = await activationService.activate(
            couponsToActivate[0],
            context as Partial<PageContext> | undefined,
          );
          sendResponse({ success: true, data: { results: [result] } });
        } else if (couponsToActivate.length > 1) {
          const result = await activationService.activateBulk(
            couponsToActivate,
            context as Partial<PageContext> | undefined,
          );
          sendResponse({ success: true, data: result });
        } else {
          sendResponse({
            success: false,
            error: { message: 'No se encontraron cupones' },
          });
        }
        break;
      }

      case 'PAGE_CONTEXT': {
        // Guardar contexto de página para el popup
        await storageManager.set(
          STORAGE_KEYS.LAST_PAGE_CONTEXT,
          message.payload,
        );

        // Auto-activar si está habilitado
        const settings = await settingsStore.get();
        if (settings.autoActivate) {
          await handleAutoActivation(
            message.payload,
            settings.autoActivateCategories,
          );
        }

        sendResponse({ success: true });
        break;
      }

      case 'SETTINGS_UPDATED': {
        const newSettings = await settingsStore.update(
          message.payload,
        );
        apiClient.updateConfig({
          baseUrl: newSettings.apiBaseUrl,
          timeout: newSettings.apiTimeout,
          retries: newSettings.apiRetries,
        });
        setLogLevel(newSettings.logLevel);
        sendResponse({ success: true, data: newSettings });
        break;
      }

      default:
        sendResponse({
          success: false,
          error: { message: 'Tipo de mensaje desconocido' },
        });
    }
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : 'Error interno';
    log.error('Error procesando mensaje', { type: message.type, err });
    sendResponse({ success: false, error: { message: errorMsg } });
  }
}

// Auto-activación cuando el usuario entra a páginas con categorías configuradas
async function handleAutoActivation(
  context: PageContext,
  categories: string[],
): Promise<void> {
  if (!context.category) return;

  const matchesCategory = categories.some(
    (cat) => cat.toLowerCase() === context.category?.toLowerCase(),
  );

  if (!matchesCategory && categories.length > 0) return;

  log.info('Auto-activación disparada', {
    category: context.category,
  });

  try {
    const { coupons } = await couponService.getCoupons({
      category: context.category,
    });
    const available = couponService.filterAvailable(coupons);

    if (available.length > 0) {
      await activationService.activateBulk(available, context);

      // Notificar al usuario
      const settings = await settingsStore.get();
      if (settings.showNotifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Mercado Libre Cupones',
          message: `${available.length} cupones activados en ${context.category}`,
        });
      }
    }
  } catch (err) {
    log.error('Error en auto-activación', err);
  }
}

// Listener de instalación
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    log.info('Extensión instalada');
  } else if (details.reason === 'update') {
    log.info('Extensión actualizada');
  }
});

// Inicializar
init();
