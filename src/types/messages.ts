import type { PageContext } from './page-context';
import type { Coupon } from './coupon';
import type { UserSettings } from './settings';

// Mensajes entre background, content y popup
export type ExtensionMessage =
  | PageContextMessage
  | CouponsRequestMessage
  | CouponsResponseMessage
  | ActivateMessage
  | ActivateResultMessage
  | SettingsUpdateMessage
  | HealthCheckMessage
  | InjectPanelMessage;

// Content -> Background: contexto de página detectado
export interface PageContextMessage {
  type: 'PAGE_CONTEXT';
  payload: PageContext;
}

// Popup -> Background: pedir cupones
export interface CouponsRequestMessage {
  type: 'GET_COUPONS';
  payload?: { category?: string; forceRefresh?: boolean };
}

// Background -> Popup: cupones disponibles
export interface CouponsResponseMessage {
  type: 'COUPONS_DATA';
  payload: { coupons: Coupon[]; fromCache: boolean };
}

// Popup/Content -> Background: activar cupón(es)
export interface ActivateMessage {
  type: 'ACTIVATE_COUPONS';
  payload: { couponIds: string[]; context?: Partial<PageContext> };
}

// Background -> Popup/Content: resultado de activación
export interface ActivateResultMessage {
  type: 'ACTIVATE_RESULT';
  payload: {
    results: Array<{
      couponId: string;
      status: string;
      message?: string;
    }>;
  };
}

// Popup/Options -> Background: settings actualizados
export interface SettingsUpdateMessage {
  type: 'SETTINGS_UPDATED';
  payload: Partial<UserSettings>;
}

// Popup -> Background: verificar API
export interface HealthCheckMessage {
  type: 'HEALTH_CHECK';
}

// Background -> Content: mostrar/ocultar panel
export interface InjectPanelMessage {
  type: 'TOGGLE_PANEL';
  payload: { visible: boolean; coupons?: Coupon[] };
}
