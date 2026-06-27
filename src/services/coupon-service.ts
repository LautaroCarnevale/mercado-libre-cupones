import type { Coupon, CouponsQueryParams, CategoryInfo } from '../types';
import { apiClient } from './api-client';
import { storageManager } from '../store/storage';
import { CACHE_TTL, STORAGE_KEYS } from '../shared/constants';
import { createLogger } from '../utils/logger';

const log = createLogger('CouponService');

interface CouponCache {
  coupons: Coupon[];
  timestamp: number;
  category?: string;
}

// Servicio de lógica de negocio para cupones
export class CouponService {
  // Obtener cupones con cache
  async getCoupons(
    params?: CouponsQueryParams,
    forceRefresh = false,
  ): Promise<{ coupons: Coupon[]; fromCache: boolean }> {
    if (!forceRefresh) {
      const cached = await this.getCachedCoupons(params?.category);
      if (cached) {
        log.debug('Sirviendo cupones desde cache');
        return { coupons: cached, fromCache: true };
      }
    }

    try {
      const response = await apiClient.getCoupons(params);
      if (response.success && response.data.coupons) {
        await this.cacheCoupons(
          response.data.coupons,
          params?.category,
        );
        return { coupons: response.data.coupons, fromCache: false };
      }
      return { coupons: [], fromCache: false };
    } catch (err) {
      log.error('Error obteniendo cupones', err);
      // Fallback a cache expirado si hay error de red
      const stale = await this.getCachedCoupons(
        params?.category,
        true,
      );
      if (stale) {
        log.warn('Usando cache expirado por error de red');
        return { coupons: stale, fromCache: true };
      }
      throw err;
    }
  }

  // Obtener categorías
  async getCategories(): Promise<CategoryInfo[]> {
    try {
      const response = await apiClient.getCategories();
      if (response.success) {
        return response.data.categories;
      }
      return [];
    } catch (err) {
      log.error('Error obteniendo categorías', err);
      return [];
    }
  }

  // Filtrar cupones por categoría localmente
  filterByCategory(coupons: Coupon[], category: string): Coupon[] {
    return coupons.filter(
      (c) =>
        c.category.toLowerCase() === category.toLowerCase() ||
        c.conditions.categories?.some(
          (cat) => cat.toLowerCase() === category.toLowerCase(),
        ),
    );
  }

  // Filtrar cupones no activados
  filterAvailable(coupons: Coupon[]): Coupon[] {
    return coupons.filter((c) => c.status === 'available');
  }

  // Resolver duplicados por código
  deduplicate(coupons: Coupon[]): Coupon[] {
    const seen = new Set<string>();
    return coupons.filter((c) => {
      if (seen.has(c.code)) return false;
      seen.add(c.code);
      return true;
    });
  }

  // Verificar estado de la API
  async checkApiHealth(): Promise<{
    online: boolean;
    status?: string;
  }> {
    try {
      const response = await apiClient.checkHealth();
      return {
        online: response.success && response.data.status === 'ok',
        status: response.data.status,
      };
    } catch {
      return { online: false };
    }
  }

  // Cache interno
  private async getCachedCoupons(
    category?: string,
    ignoreExpiry = false,
  ): Promise<Coupon[] | null> {
    const cache = await storageManager.get<CouponCache>(
      STORAGE_KEYS.COUPONS_CACHE,
    );
    if (!cache) return null;

    const isExpired =
      Date.now() - cache.timestamp > CACHE_TTL.COUPONS;
    if (isExpired && !ignoreExpiry) return null;

    if (category && cache.category !== category) return null;

    return cache.coupons;
  }

  private async cacheCoupons(
    coupons: Coupon[],
    category?: string,
  ): Promise<void> {
    const cache: CouponCache = {
      coupons,
      timestamp: Date.now(),
      category,
    };
    await storageManager.set(STORAGE_KEYS.COUPONS_CACHE, cache);
  }
}

export const couponService = new CouponService();
