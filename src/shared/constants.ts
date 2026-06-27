// Dominios de Mercado Libre Argentina
export const ML_DOMAINS = [
  'mercadolibre.com.ar',
  'listado.mercadolibre.com.ar',
  'articulo.mercadolibre.com.ar',
] as const;

// Patrones de URL para detección de páginas
export const ML_URL_PATTERNS = {
  home: /^https:\/\/(www\.)?mercadolibre\.com\.ar\/?$/,
  search: /^https:\/\/listado\.mercadolibre\.com\.ar\//,
  category: /^https:\/\/(www\.)?mercadolibre\.com\.ar\/c\//,
  product: /^https:\/\/(articulo|www)\.mercadolibre\.com\.ar\/.+\/p\/MLA/,
  productItem: /^https:\/\/articulo\.mercadolibre\.com\.ar\/MLA-/,
  cart: /^https:\/\/(www\.)?mercadolibre\.com\.ar\/gz\/cart/,
  checkout: /^https:\/\/(www\.)?mercadolibre\.com\.ar\/checkout/,
  coupons: /^https:\/\/(www\.)?mercadolibre\.com\.ar\/(cupones|beneficios)\/filter/,
  couponsHub: /^https:\/\/(www\.)?mercadolibre\.com\.ar\/(cupones|beneficios)/,
  promotions: /^https:\/\/(www\.)?mercadolibre\.com\.ar\/ofertas/,
} as const;

// Claves de storage
export const STORAGE_KEYS = {
  SETTINGS: 'ml_cupones_settings',
  COUPONS_CACHE: 'ml_cupones_cache',
  ACTIVATION_HISTORY: 'ml_cupones_history',
  LOGS: 'ml_cupones_logs',
  LAST_PAGE_CONTEXT: 'ml_cupones_last_context',
} as const;

// Defaults de la API (sobreescritos por .env en build)
export const API_DEFAULTS = {
  BASE_URL: 'http://localhost:3000/api',
  TIMEOUT: 3000,
  RETRIES: 1,
  RETRY_DELAY: 1000,
} as const;

// Cache TTL en milisegundos
export const CACHE_TTL = {
  COUPONS: 5 * 60 * 1000,
  CATEGORIES: 30 * 60 * 1000,
  HEALTH: 60 * 1000,
} as const;

// Límites
export const LIMITS = {
  MAX_BULK_ACTIVATE: 50,
  MAX_HISTORY_SIZE: 500,
  MAX_LOGS: 1000,
  MAX_RETRIES: 5,
} as const;
