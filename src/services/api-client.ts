import type {
  ApiResponse,
  CouponsListData,
  CategoriesListData,
  HealthData,
  ActivateRequestBody,
  BulkActivateRequestBody,
  BulkActivateData,
  ActivationResult,
  CouponsQueryParams,
} from '../types';
import { ApiClientError, TimeoutError } from '../shared/errors';
import { API_DEFAULTS } from '../shared/constants';
import { createLogger } from '../utils/logger';

const log = createLogger('ApiClient');

interface ClientConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  retryDelay: number;
}

interface CustomRequestInit extends RequestInit {
  timeout?: number;
  retries?: number;
}

// Cliente HTTP para la API de cupones
export class ApiClient {
  private config: ClientConfig;

  constructor(overrides?: Partial<ClientConfig>) {
    this.config = {
      baseUrl: overrides?.baseUrl ?? API_DEFAULTS.BASE_URL,
      timeout: overrides?.timeout ?? API_DEFAULTS.TIMEOUT,
      retries: overrides?.retries ?? API_DEFAULTS.RETRIES,
      retryDelay: overrides?.retryDelay ?? API_DEFAULTS.RETRY_DELAY,
    };
  }

  // Actualizar config en runtime
  updateConfig(overrides: Partial<ClientConfig>): void {
    this.config = { ...this.config, ...overrides };
    log.info('Config actualizada', { baseUrl: this.config.baseUrl });
  }

  // GET /health
  async checkHealth(): Promise<ApiResponse<HealthData>> {
    return this.request<HealthData>('/health', { timeout: 1500, retries: 0 });
  }

  // GET /categories
  async getCategories(): Promise<ApiResponse<CategoriesListData>> {
    return this.request<CategoriesListData>('/categories');
  }

  // GET /coupons
  async getCoupons(
    params?: CouponsQueryParams,
  ): Promise<ApiResponse<CouponsListData>> {
    const query = params ? this.buildQuery(params) : '';
    return this.request<CouponsListData>(`/coupons${query}`);
  }

  // POST /coupons/activate
  async activateCoupon(
    body: ActivateRequestBody,
  ): Promise<ApiResponse<ActivationResult>> {
    return this.request<ActivationResult>('/coupons/activate', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // POST /coupons/activate-bulk
  async activateBulk(
    body: BulkActivateRequestBody,
  ): Promise<ApiResponse<BulkActivateData>> {
    return this.request<BulkActivateData>('/coupons/activate-bulk', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // Request con reintentos y timeout
  private async request<T>(
    path: string,
    options?: CustomRequestInit,
  ): Promise<ApiResponse<T>> {
    const { timeout, retries, ...init } = options ?? {};
    const reqTimeout = timeout ?? this.config.timeout;
    const reqRetries = retries ?? this.config.retries;
    const url = `${this.config.baseUrl}${path}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= reqRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          log.info(`Reintento ${attempt}/${reqRetries}`, { delay });
          await this.sleep(delay);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          reqTimeout,
        );

        const response = await fetch(url, {
          ...init,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...init?.headers,
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new ApiClientError(
            errorBody.error?.message ?? `HTTP ${response.status}`,
            response.status,
            errorBody,
          );
        }

        const data = (await response.json()) as ApiResponse<T>;
        log.debug(`${init?.method ?? 'GET'} ${path} OK`, {
          attempt,
        });
        return data;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          lastError = new TimeoutError();
        } else {
          lastError = err instanceof Error ? err : new Error(String(err));
        }
        log.warn(`Request fallido: ${path}`, {
          attempt,
          error: lastError.message,
        });
      }
    }

    log.error(`Todos los reintentos fallaron: ${path}`);
    throw lastError ?? new ApiClientError('Error desconocido');
  }

  private buildQuery(params: Record<string, any>): string {
    const entries = Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== '',
    );
    if (entries.length === 0) return '';
    const searchParams = new URLSearchParams();
    entries.forEach(([k, v]) => searchParams.set(k, String(v)));
    return `?${searchParams.toString()}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Instancia singleton
export const apiClient = new ApiClient();
