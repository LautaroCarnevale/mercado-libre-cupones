import type {
  Coupon,
  ActivationResult,
  ActivationRecord,
  PageContext,
} from '../types';
import { apiClient } from './api-client';
import { storageManager } from '../store/storage';
import { STORAGE_KEYS, LIMITS } from '../shared/constants';
import { ActivationError } from '../shared/errors';
import { createLogger } from '../utils/logger';

const log = createLogger('ActivationService');

// Servicio de activación de cupones
export class ActivationService {
  // Activar un cupón individual
  async activate(
    coupon: Coupon,
    context?: Partial<PageContext>,
  ): Promise<ActivationResult> {
    // Verificar si ya fue activado
    const history = await this.getHistory();
    const alreadyActivated = history.find(
      (r) =>
        r.couponId === coupon.id &&
        r.result.status === 'activated',
    );
    if (alreadyActivated) {
      log.info(`Cupón ${coupon.code} ya activado, omitiendo`);
      return {
        couponId: coupon.id,
        status: 'already_active',
        message: 'Este cupón ya fue activado anteriormente',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const response = await apiClient.activateCoupon({
        couponId: coupon.id,
        context: context
          ? {
              pageUrl: context.url,
              category: context.category,
              productId: context.productId,
            }
          : undefined,
      });

      const result: ActivationResult = response.success
        ? response.data
        : {
            couponId: coupon.id,
            status: 'failed',
            message: response.error?.message ?? 'Error desconocido',
            timestamp: new Date().toISOString(),
          };

      await this.recordActivation(coupon, result, context);
      return result;
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Error desconocido';
      log.error(`Error activando ${coupon.code}`, err);

      const result: ActivationResult = {
        couponId: coupon.id,
        status: 'failed',
        message: errorMsg,
        timestamp: new Date().toISOString(),
      };
      await this.recordActivation(coupon, result, context);
      throw new ActivationError(errorMsg, coupon.id);
    }
  }

  // Activar múltiples cupones vía API bulk
  async activateBulk(
    coupons: Coupon[],
    context?: Partial<PageContext>,
  ): Promise<{
    results: ActivationResult[];
    summary: {
      total: number;
      activated: number;
      failed: number;
      skipped: number;
    };
  }> {
    if (coupons.length > LIMITS.MAX_BULK_ACTIVATE) {
      log.warn(
        `Limitando bulk a ${LIMITS.MAX_BULK_ACTIVATE} cupones`,
      );
      coupons = coupons.slice(0, LIMITS.MAX_BULK_ACTIVATE);
    }

    // Filtrar ya activados
    const history = await this.getHistory();
    const activatedIds = new Set(
      history
        .filter((r) => r.result.status === 'activated')
        .map((r) => r.couponId),
    );

    const toActivate = coupons.filter(
      (c) => !activatedIds.has(c.id),
    );
    const skipped = coupons.length - toActivate.length;

    if (toActivate.length === 0) {
      return {
        results: [],
        summary: {
          total: coupons.length,
          activated: 0,
          failed: 0,
          skipped,
        },
      };
    }

    try {
      const response = await apiClient.activateBulk({
        couponIds: toActivate.map((c) => c.id),
        context: context
          ? { pageUrl: context.url, category: context.category }
          : undefined,
      });

      if (response.success) {
        // Registrar cada resultado
        for (const result of response.data.results) {
          const coupon = toActivate.find(
            (c) => c.id === result.couponId,
          );
          if (coupon) {
            await this.recordActivation(coupon, result, context);
          }
        }

        return {
          results: response.data.results,
          summary: {
            ...response.data.summary,
            skipped: response.data.summary.skipped + skipped,
          },
        };
      }

      return {
        results: [],
        summary: {
          total: coupons.length,
          activated: 0,
          failed: toActivate.length,
          skipped,
        },
      };
    } catch (err) {
      log.error('Error en activación bulk', err);
      throw err;
    }
  }

  // Obtener historial
  async getHistory(): Promise<ActivationRecord[]> {
    return (
      (await storageManager.get<ActivationRecord[]>(
        STORAGE_KEYS.ACTIVATION_HISTORY,
      )) ?? []
    );
  }

  // Limpiar historial
  async clearHistory(): Promise<void> {
    await storageManager.set(STORAGE_KEYS.ACTIVATION_HISTORY, []);
    log.info('Historial de activaciones limpiado');
  }

  // Registrar activación en historial local
  private async recordActivation(
    coupon: Coupon,
    result: ActivationResult,
    context?: Partial<PageContext>,
  ): Promise<void> {
    const record: ActivationRecord = {
      couponId: coupon.id,
      couponTitle: coupon.title,
      result,
      pageUrl: context?.url,
      category: context?.category,
    };

    const history = await this.getHistory();
    history.push(record);

    // Limitar tamaño del historial
    const trimmed = history.slice(-LIMITS.MAX_HISTORY_SIZE);
    await storageManager.set(
      STORAGE_KEYS.ACTIVATION_HISTORY,
      trimmed,
    );

    log.info(
      `Activación registrada: ${coupon.code} -> ${result.status}`,
    );
  }
}

export const activationService = new ActivationService();
