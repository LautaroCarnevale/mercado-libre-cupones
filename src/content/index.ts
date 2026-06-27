import { buildPageContext } from './detector';
import { scrapePromotions, getApplyCouponButtons, getNextPageLink } from './scraper';
import { panelInjector } from './injector';
import type { Coupon, InjectPanelMessage } from '../types';
import { storageManager } from '../store/storage';
import { createLogger } from '../utils/logger';

const log = createLogger('ContentIndex');

// Función que corre dentro del iframe oculto para escanear cupones de forma invisible
async function runIframeScanner(): Promise<void> {
  log.info('Corriendo escaneo en iframe...');
  
  // Ocultar visualmente la carga en el iframe por seguridad
  if (document.body) {
    document.body.style.opacity = '0.01';
  }

  // Esperar a que carguen los elementos reales (cupones o paginador)
  let loaded = false;
  for (let i = 0; i < 20; i++) {
    const buttons = getApplyCouponButtons();
    const hasPaginator = document.querySelector('.andes-pagination') !== null;
    if (buttons.length > 0 || hasPaginator) {
      loaded = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  const buttons = getApplyCouponButtons();
  const nextLink = getNextPageLink();

  // Enviar progreso al parent (página principal)
  window.parent.postMessage({
    type: 'SCAN_PROGRESS',
    payload: {
      pendingCount: buttons.length,
    }
  }, '*');

  const isValidNext = nextLink && nextLink.href && 
                      nextLink.href !== window.location.href &&
                      !nextLink.href.endsWith('#') && 
                      !nextLink.href.startsWith('javascript:');

  if (isValidNext) {
    // Navegar a la siguiente página agregando la bandera de escaneo
    const url = new URL(nextLink.href);
    url.searchParams.set('iframe_scan', 'true');
    window.location.href = url.toString();
  } else {
    // Escaneo completado, notificar al parent
    window.parent.postMessage({
      type: 'SCAN_COMPLETE',
      payload: { finished: true }
    }, '*');
  }
}

// Entry point del content script
async function main(): Promise<void> {
  const isIframe = window.self !== window.top;
  const isScan = window.location.href.includes('iframe_scan=true');
  
  if (isIframe) {
    if (isScan) {
      await runIframeScanner();
    }
    return; // Evitar inyección de paneles en subframes
  }

  const context = buildPageContext();

  // Si salimos de la página de filtros, limpiamos banderas de auto-aplicación
  if (context.pageType !== 'coupons') {
    try {
      const autoApplyActive = await storageManager.get<boolean>('auto_apply_all_pages');
      if (autoApplyActive) {
        log.info('Auto-aplicacion cancelada: fuera de la pagina de filtros');
        await storageManager.remove('auto_apply_all_pages');
        await storageManager.remove('auto_apply_applied_count');
      }
    } catch (err) {
      log.error('Error al limpiar banderas de auto-aplicacion', err);
    }
  }

  // Detectar promociones visibles
  context.promotions = scrapePromotions();

  // Enviar contexto al background
  chrome.runtime.sendMessage({
    type: 'PAGE_CONTEXT',
    payload: context,
  });

  // Inyectar panel flotante (siempre, en cualquier página de ML)
  panelInjector.inject();

  // Configurar modo según el tipo de página
  if (context.pageType === 'coupons') {
    panelInjector.setupCouponsPageMode();
  } else {
    // Si hay categoría, marcarla
    if (context.category) {
      panelInjector.showCategoryMatch(context.category);
    }

    // Pedir cupones relevantes
    chrome.runtime.sendMessage(
      {
        type: 'GET_COUPONS',
        payload: { category: context.category },
      },
      (response: { success: boolean; data?: { coupons: Coupon[] } }) => {
        if (response?.success && response.data?.coupons) {
          panelInjector.updateCoupons(response.data.coupons);
        }
      },
    );
  }
}

// Escuchar mensajes del background
chrome.runtime.onMessage.addListener(
  (message: InjectPanelMessage) => {
    if (message.type === 'TOGGLE_PANEL') {
      if (message.payload.visible) {
        panelInjector.inject();
        if (message.payload.coupons) {
          panelInjector.updateCoupons(message.payload.coupons);
        }
      } else {
        panelInjector.destroy();
      }
    }
  },
);

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { main(); });
} else {
  main();
}
