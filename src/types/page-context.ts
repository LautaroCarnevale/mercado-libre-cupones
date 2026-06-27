// Contexto detectado de la página actual de ML
export interface PageContext {
  url: string;
  pageType: MLPageType;
  category?: string;
  productId?: string;
  productTitle?: string;
  searchQuery?: string;
  breadcrumbs: string[];
  promotions: PromotionInfo[];
  timestamp: string;
}

export type MLPageType =
  | 'home'
  | 'search'
  | 'category'
  | 'product'
  | 'cart'
  | 'checkout'
  | 'coupons'
  | 'couponsHub'
  | 'promotions'
  | 'account'
  | 'unknown';

export interface PromotionInfo {
  text: string;
  type: 'banner' | 'badge' | 'coupon_button' | 'discount_label';
  element?: string;
}

// Datos extraídos del DOM
export interface ScrapedData {
  title?: string;
  price?: number;
  originalPrice?: number;
  discount?: string;
  seller?: string;
  categoryPath: string[];
  visibleCoupons: string[];
  promotionalBanners: string[];
  mlItemId?: string;
}
