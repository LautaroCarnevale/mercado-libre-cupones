// Configuración persistente del usuario
export interface UserSettings {
  // Conexión API
  apiBaseUrl: string;
  apiTimeout: number;
  apiRetries: number;

  // Categorías favoritas
  favoriteCategories: string[];

  // Automatización
  autoAnalyzePage: boolean;
  autoActivate: boolean;
  autoActivateCategories: string[];

  // UI
  showFloatingPanel: boolean;
  showNotifications: boolean;

  // Avanzado
  logLevel: LogLevel;
  maxHistorySize: number;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Valores por defecto
export const DEFAULT_SETTINGS: UserSettings = {
  apiBaseUrl: 'http://localhost:3000/api',
  apiTimeout: 10000,
  apiRetries: 3,
  favoriteCategories: [],
  autoAnalyzePage: true,
  autoActivate: false,
  autoActivateCategories: [],
  showFloatingPanel: true,
  showNotifications: true,
  logLevel: 'info',
  maxHistorySize: 500,
};
