import type { MLPageType, PageContext } from '../types';
import { ML_URL_PATTERNS } from '../shared/constants';
import { createLogger } from '../utils/logger';

const log = createLogger('Detector');

// Detectar tipo de página de Mercado Libre según la URL
export function detectPageType(url: string): MLPageType {
  for (const [type, pattern] of Object.entries(ML_URL_PATTERNS)) {
    if (pattern.test(url)) {
      return type as MLPageType;
    }
  }
  return 'unknown';
}

// Construir contexto completo de la página actual
export function buildPageContext(): PageContext {
  const url = window.location.href;
  const pageType = detectPageType(url);

  const context: PageContext = {
    url,
    pageType,
    breadcrumbs: extractBreadcrumbs(),
    promotions: [],
    timestamp: new Date().toISOString(),
  };

  switch (pageType) {
    case 'product':
      context.productTitle = extractProductTitle();
      context.productId = extractProductId(url);
      context.category = extractCategoryFromBreadcrumbs(
        context.breadcrumbs,
      );
      break;
    case 'search':
      context.searchQuery = extractSearchQuery(url);
      context.category = extractCategoryFromBreadcrumbs(
        context.breadcrumbs,
      );
      break;
    case 'category':
      context.category = extractCategoryFromUrl(url);
      break;
    default:
      context.category = extractCategoryFromBreadcrumbs(
        context.breadcrumbs,
      );
  }

  log.debug('Contexto de página detectado', {
    pageType,
    category: context.category,
  });

  return context;
}

// Extraer breadcrumbs del DOM
function extractBreadcrumbs(): string[] {
  // Selectores resilientes: múltiples estrategias
  const selectors = [
    'ol.andes-breadcrumb li a',
    '.andes-breadcrumb__item a',
    'nav[aria-label="breadcrumb"] a',
    '[class*="breadcrumb"] a',
  ];

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      return Array.from(elements)
        .map((el) => el.textContent?.trim() ?? '')
        .filter(Boolean);
    }
  }

  return [];
}

// Extraer título del producto
function extractProductTitle(): string | undefined {
  const selectors = [
    'h1.ui-pdp-title',
    '.ui-pdp-header__title-container h1',
    '[class*="title"] h1',
    'h1',
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el?.textContent?.trim()) {
      return el.textContent.trim();
    }
  }

  return undefined;
}

// Extraer ID de producto de la URL
function extractProductId(url: string): string | undefined {
  const match = url.match(/MLA[-]?(\d+)/);
  return match ? `MLA${match[1]}` : undefined;
}

// Extraer query de búsqueda
function extractSearchQuery(url: string): string | undefined {
  try {
    const urlObj = new URL(url);
    // La query va en el path en ML
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      return decodeURIComponent(pathParts[0].replace(/-/g, ' '));
    }
  } catch {
    // URL inválida
  }
  return undefined;
}

// Categoría desde breadcrumbs
function extractCategoryFromBreadcrumbs(
  breadcrumbs: string[],
): string | undefined {
  // La primera o segunda entrada suele ser la categoría principal
  return breadcrumbs.length > 0
    ? breadcrumbs[breadcrumbs.length > 1 ? 1 : 0]
    : undefined;
}

// Categoría desde URL de categoría
function extractCategoryFromUrl(url: string): string | undefined {
  const match = url.match(/\/c\/([^/?#]+)/);
  if (match) {
    return decodeURIComponent(match[1].replace(/-/g, ' '));
  }
  return undefined;
}
