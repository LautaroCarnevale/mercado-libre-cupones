import type { ScrapedData, PromotionInfo } from '../types';
import { sanitizeText } from '../utils/sanitize';
import { createLogger } from '../utils/logger';

const log = createLogger('Scraper');

// Extraer datos relevantes del DOM de ML
export function scrapePageData(): ScrapedData {
  const data: ScrapedData = {
    categoryPath: [],
    visibleCoupons: [],
    promotionalBanners: [],
  };

  try {
    data.title = scrapeTitle();
    data.price = scrapePrice();
    data.originalPrice = scrapeOriginalPrice();
    data.discount = scrapeDiscount();
    data.seller = scrapeSeller();
    data.categoryPath = scrapeCategoryPath();
    data.visibleCoupons = scrapeVisibleCoupons();
    data.promotionalBanners = scrapePromotionalBanners();
    data.mlItemId = scrapeItemId();
  } catch (err) {
    log.error('Error durante scraping', err);
  }

  return data;
}

// Detectar promociones visibles en la página
export function scrapePromotions(): PromotionInfo[] {
  const promotions: PromotionInfo[] = [];

  // Banners promocionales
  const bannerSelectors = [
    '[class*="promotion"]',
    '[class*="discount"]',
    '[class*="coupon"]',
    '[class*="deal"]',
    '.andes-badge--discount',
  ];

  for (const selector of bannerSelectors) {
    document.querySelectorAll(selector).forEach((el) => {
      const text = el.textContent?.trim();
      if (text && text.length < 200) {
        promotions.push({
          text: sanitizeText(text),
          type: 'banner',
          element: selector,
        });
      }
    });
  }

  // Badges de descuento
  document
    .querySelectorAll(
      '.andes-money-amount__discount, [class*="discount-badge"]',
    )
    .forEach((el) => {
      const text = el.textContent?.trim();
      if (text) {
        promotions.push({
          text: sanitizeText(text),
          type: 'discount_label',
        });
      }
    });

  // Botones de cupón
  const couponButtonSelectors = [
    'button[class*="coupon"]',
    'a[href*="cupon"]',
    'a[href*="cupones"]',
    '[data-testid*="coupon"]',
  ];

  for (const selector of couponButtonSelectors) {
    document.querySelectorAll(selector).forEach((el) => {
      const text = el.textContent?.trim();
      if (text) {
        promotions.push({
          text: sanitizeText(text),
          type: 'coupon_button',
          element: selector,
        });
      }
    });
  }

  log.debug(`${promotions.length} promociones detectadas`);
  return promotions;
}

// --- Scrapers individuales ---

function scrapeTitle(): string | undefined {
  const selectors = [
    'h1.ui-pdp-title',
    '.ui-pdp-header__title-container h1',
    'h1',
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el?.textContent?.trim()) {
      return sanitizeText(el.textContent);
    }
  }
  return undefined;
}

function scrapePrice(): number | undefined {
  const selectors = [
    '.andes-money-amount__fraction',
    '[class*="price"] .andes-money-amount__fraction',
    'meta[itemprop="price"]',
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (!el) continue;

    if (el instanceof HTMLMetaElement) {
      const val = parseFloat(el.content);
      if (!isNaN(val)) return val;
    }

    const text = el.textContent?.replace(/\./g, '').replace(',', '.');
    if (text) {
      const val = parseFloat(text);
      if (!isNaN(val)) return val;
    }
  }

  return undefined;
}

function scrapeOriginalPrice(): number | undefined {
  const el = document.querySelector(
    '.andes-money-amount--previous .andes-money-amount__fraction',
  );
  if (!el?.textContent) return undefined;

  const text = el.textContent.replace(/\./g, '').replace(',', '.');
  const val = parseFloat(text);
  return isNaN(val) ? undefined : val;
}

function scrapeDiscount(): string | undefined {
  const selectors = [
    '.andes-money-amount__discount',
    '.ui-pdp-price__second-line__label',
    '[class*="discount"]',
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el?.textContent?.trim()) {
      return sanitizeText(el.textContent);
    }
  }
  return undefined;
}

function scrapeSeller(): string | undefined {
  const selectors = [
    '.ui-pdp-seller__header__title',
    '[class*="seller"] a',
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el?.textContent?.trim()) {
      return sanitizeText(el.textContent);
    }
  }
  return undefined;
}

function scrapeCategoryPath(): string[] {
  const selectors = [
    'ol.andes-breadcrumb li a',
    '.andes-breadcrumb__item a',
  ];
  for (const sel of selectors) {
    const els = document.querySelectorAll(sel);
    if (els.length > 0) {
      return Array.from(els)
        .map((el) => sanitizeText(el.textContent ?? ''))
        .filter(Boolean);
    }
  }
  return [];
}

function scrapeVisibleCoupons(): string[] {
  const coupons: string[] = [];
  const selectors = [
    '[class*="coupon"]',
    '[data-testid*="coupon"]',
    'a[href*="cupon"]',
  ];

  for (const sel of selectors) {
    document.querySelectorAll(sel).forEach((el) => {
      const text = el.textContent?.trim();
      if (text && text.length < 100) {
        coupons.push(sanitizeText(text));
      }
    });
  }

  return [...new Set(coupons)];
}

function scrapePromotionalBanners(): string[] {
  const banners: string[] = [];
  const selectors = [
    '.slick-slide img[alt]',
    '[class*="carousel"] img[alt]',
    '[class*="banner"] img[alt]',
  ];

  for (const sel of selectors) {
    document.querySelectorAll(sel).forEach((el) => {
      const alt = (el as HTMLImageElement).alt?.trim();
      if (alt && alt.length < 150) {
        banners.push(sanitizeText(alt));
      }
    });
  }

  return banners;
}

function scrapeItemId(): string | undefined {
  // Buscar en meta tags
  const meta = document.querySelector(
    'meta[name="item:id"], meta[property="product:retailer_item_id"]',
  );
  if (meta instanceof HTMLMetaElement && meta.content) {
    return meta.content;
  }

  // Buscar en la URL
  const match = window.location.href.match(/MLA[-]?(\d+)/);
  return match ? `MLA${match[1]}` : undefined;
}

// Obtener botones de aplicar cupones en la pagina
export function getApplyCouponButtons(): HTMLButtonElement[] {
  const buttons: HTMLButtonElement[] = [];

  // Buscar todos los botones interactivos
  const possibleButtons = document.querySelectorAll<HTMLButtonElement | HTMLElement>(
    'button.andes-button, button, [role="button"], .andes-button'
  );

  possibleButtons.forEach((el) => {
    // Si esta deshabilitado, omitir
    if ((el as any).disabled) return;

    const text = el.textContent?.trim().toLowerCase() || '';
    
    // El texto debe ser de aplicacion de cupones
    const isCouponAction = 
      text === 'aplicar' || 
      text === 'activar' || 
      text === 'conseguir' ||
      text === 'obtener' ||
      text.includes('aplicar cupón') || 
      text.includes('activar cupón') ||
      text === 'usar';

    if (!isCouponAction) return;

    // Verificar si el boton esta dentro de una tarjeta de producto comercial
    // Subiendo por el DOM para ver si encontramos clases de productos
    let isProductCard = false;
    let parent: HTMLElement | null = el.parentElement;
    while (parent) {
      const className = parent.className || '';
      const dataTestId = parent.getAttribute('data-testid') || '';
      
      if (
        className.includes('ui-search-result') ||
        className.includes('promotion-item') ||
        className.includes('poly-card') ||
        className.includes('carousel') ||
        className.includes('recommendation') ||
        dataTestId.includes('poly-card') ||
        parent.querySelector('a[href*="/MLA-"]') ||
        parent.querySelector('a[href*="/p/MLA"]')
      ) {
        // Excepcion: a menos que sea un contenedor de cupones real
        if (!className.includes('coupon') && !className.includes('beneficio')) {
          isProductCard = true;
          break;
        }
      }
      parent = parent.parentElement;
    }

    if (!isProductCard) {
      if (!buttons.includes(el as any)) {
        buttons.push(el as HTMLButtonElement);
      }
    }
  });

  return buttons;
}

// Obtener enlace a la pagina siguiente
export function getNextPageLink(): HTMLAnchorElement | null {
  // 1. Buscar boton contenedor de siguiente
  const nextBtnContainer = document.querySelector('.andes-pagination__button--next');
  if (nextBtnContainer) {
    if (
      nextBtnContainer.classList.contains('andes-pagination__button--disabled') ||
      nextBtnContainer.getAttribute('aria-disabled') === 'true'
    ) {
      return null;
    }
    const link = nextBtnContainer.querySelector('a');
    if (link && link.href) return link;
  }

  // 2. Intentar con selectores alternativos
  const selectors = [
    '.andes-pagination__action-button--next a',
    'a.andes-pagination__link[title*="Siguiente"]',
    'a[aria-label*="Siguiente"]',
    'li.andes-pagination__button--next a',
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el instanceof HTMLAnchorElement && el.href) {
      const parent = el.parentElement;
      if (
        parent?.classList.contains('andes-pagination__button--disabled') ||
        el.classList.contains('disabled') ||
        el.getAttribute('aria-disabled') === 'true'
      ) {
        continue;
      }
      return el;
    }
  }

  // 3. Fallback de busqueda por texto
  const anchors = Array.from(document.querySelectorAll('a'));
  for (const a of anchors) {
    const text = a.textContent?.trim().toLowerCase();
    const title = a.title?.toLowerCase();
    const aria = a.getAttribute('aria-label')?.toLowerCase();
    if (
      text === 'siguiente' ||
      title === 'siguiente' ||
      aria === 'siguiente'
    ) {
      if (
        a.classList.contains('disabled') ||
        a.getAttribute('aria-disabled') === 'true' ||
        a.parentElement?.classList.contains('andes-pagination__button--disabled')
      ) {
        continue;
      }
      if (a.href) return a;
    }
  }
  return null;
}

