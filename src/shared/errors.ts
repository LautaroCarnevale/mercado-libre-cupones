// Error base de la extensión
export class MLCuponesError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'MLCuponesError';
  }
}

// Error de red / API
export class ApiClientError extends MLCuponesError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    details?: Record<string, unknown>,
  ) {
    super(message, 'API_ERROR', details);
    this.name = 'ApiClientError';
  }
}

// Error de timeout
export class TimeoutError extends MLCuponesError {
  constructor(message = 'La solicitud excedió el tiempo límite') {
    super(message, 'TIMEOUT');
    this.name = 'TimeoutError';
  }
}

// Error de activación de cupón
export class ActivationError extends MLCuponesError {
  constructor(
    message: string,
    public readonly couponId: string,
    details?: Record<string, unknown>,
  ) {
    super(message, 'ACTIVATION_ERROR', { couponId, ...details });
    this.name = 'ActivationError';
  }
}

// Error de scraping
export class ScrapingError extends MLCuponesError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'SCRAPING_ERROR', details);
    this.name = 'ScrapingError';
  }
}
