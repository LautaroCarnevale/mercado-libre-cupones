import type { Coupon, ActivationResult } from './coupon';

// Respuesta genérica de la API
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// GET /coupons
export interface CouponsListData {
  coupons: Coupon[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
  };
}

// GET /categories
export interface CategoriesListData {
  categories: CategoryInfo[];
}

export interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
  couponCount: number;
}

// POST /coupons/activate
export interface ActivateRequestBody {
  couponId: string;
  context?: {
    pageUrl?: string;
    category?: string;
    productId?: string;
  };
}

// POST /coupons/activate-bulk
export interface BulkActivateRequestBody {
  couponIds: string[];
  context?: {
    pageUrl?: string;
    category?: string;
  };
}

export interface BulkActivateData {
  results: ActivationResult[];
  summary: {
    total: number;
    activated: number;
    failed: number;
    skipped: number;
  };
}

// GET /health
export interface HealthData {
  status: 'ok' | 'degraded' | 'down';
  version: string;
  timestamp: string;
}

// Parámetros de query para GET /coupons
export interface CouponsQueryParams {
  category?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  search?: string;
}
