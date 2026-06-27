// Modelo principal de cupón
export interface Coupon {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  discount: CouponDiscount;
  conditions: CouponConditions;
  status: CouponStatus;
  expiresAt: string;
  createdAt: string;
  source: 'api' | 'scraper';
}

export interface CouponDiscount {
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  currency?: string;
}

export interface CouponConditions {
  minPurchase?: number;
  maxDiscount?: number;
  categories?: string[];
  firstPurchaseOnly?: boolean;
  usageLimit?: number;
}

export type CouponStatus =
  | 'available'
  | 'activated'
  | 'expired'
  | 'used'
  | 'failed';

// Resultado de activación
export interface ActivationResult {
  couponId: string;
  status: 'activated' | 'already_active' | 'expired' | 'failed';
  message?: string;
  timestamp: string;
}

// Historial local
export interface ActivationRecord {
  couponId: string;
  couponTitle: string;
  result: ActivationResult;
  pageUrl?: string;
  category?: string;
}
