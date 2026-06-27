// Abstracción sobre webextension-polyfill para uso cross-browser
// En content/background se usa directamente; en popup/options via import
import type { ExtensionMessage } from '../types';

// Detecta el entorno de ejecución
function getBrowserAPI(): typeof chrome {
  if (typeof browser !== 'undefined') {
    return browser as unknown as typeof chrome;
  }
  if (typeof chrome !== 'undefined') {
    return chrome;
  }
  throw new Error('No se detectó API de extensión de navegador');
}

export const browserAPI = getBrowserAPI();

// Enviar mensaje al background
export async function sendMessage<T = unknown>(
  message: ExtensionMessage,
): Promise<T> {
  return browserAPI.runtime.sendMessage(message) as Promise<T>;
}

// Enviar mensaje a tab específica
export async function sendTabMessage<T = unknown>(
  tabId: number,
  message: ExtensionMessage,
): Promise<T> {
  return browserAPI.tabs.sendMessage(tabId, message) as Promise<T>;
}

// Obtener tab activa
export async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await browserAPI.tabs.query({
    active: true,
    currentWindow: true,
  });
  return tab ?? null;
}

// Verificar si estamos en una página de ML
export function isMLUrl(url: string): boolean {
  return /mercadolibre\.com(\.ar)?/.test(url);
}
