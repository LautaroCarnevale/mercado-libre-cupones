import { useState, useEffect, useCallback } from 'react';
import type { Coupon, PageContext, CategoryInfo } from '../types';
import { StatusBar } from './components/StatusBar';
import { CategoryFilter } from './components/CategoryFilter';
import { CouponList } from './components/CouponList';
import { ActionButtons } from './components/ActionButtons';

declare const chrome: any;

type ApiStatus = 'checking' | 'online' | 'offline';

interface ActivationSummary {
  total: number;
  activated: number;
  failed: number;
  skipped: number;
}

export function App() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking');
  const [pageContext, setPageContext] = useState<PageContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [lastResult, setLastResult] = useState<ActivationSummary | null>(null);

  // Verificar estado de la API
  useEffect(() => {
    try {
      chrome.runtime.sendMessage({ type: 'HEALTH_CHECK' }, (res: any) => {
        setApiStatus(res?.success && res.data?.online ? 'online' : 'offline');
      });
    } catch (err) {
      console.error('Error al realizar health check', err);
      setApiStatus('offline');
    }
  }, []);

  // Cargar contexto de página actual
  useEffect(() => {
    try {
      chrome.storage.local.get('ml_cupones_last_context', (result: any) => {
        if (result.ml_cupones_last_context) {
          setPageContext(result.ml_cupones_last_context);
        }
      });
    } catch (err) {
      console.error('Error al cargar contexto de pagina', err);
    }
  }, []);

  // Cargar categorias
  useEffect(() => {
    if (apiStatus === 'online') {
      try {
        chrome.runtime.sendMessage({ type: 'GET_CATEGORIES' }, (res: any) => {
          if (res?.success && res.data) {
            setCategories(res.data);
          }
        });
      } catch (err) {
        console.error('Error al cargar categorías', err);
      }
    }
  }, [apiStatus]);

  // Cargar cupones
  const loadCoupons = useCallback((category?: string, force = false) => {
    setLoading(true);

    // Timeout de seguridad de 3.5 segundos para evitar spinner infinito en caso de error de red
    const safetyTimeout = setTimeout(() => {
      console.warn('Timeout de seguridad alcanzado en carga de cupones');
      setLoading(false);
    }, 3500);

    try {
      chrome.runtime.sendMessage(
        {
          type: 'GET_COUPONS',
          payload: { category, forceRefresh: force },
        },
        (res: any) => {
          clearTimeout(safetyTimeout);
          if (res?.success && res.data?.coupons) {
            setCoupons(res.data.coupons);
          }
          setLoading(false);
        },
      );
    } catch (err) {
      clearTimeout(safetyTimeout);
      console.error('Error enviando mensaje GET_COUPONS', err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoupons(selectedCategory || undefined);
  }, [selectedCategory, loadCoupons]);

  // Activar cupones seleccionados
  const handleActivate = useCallback((couponIds: string[]) => {
    setActivating(true);
    setLastResult(null);
    chrome.runtime.sendMessage(
      {
        type: 'ACTIVATE_COUPONS',
        payload: {
          couponIds,
          context: pageContext ? { url: pageContext.url, category: pageContext.category } : undefined,
        },
      },
      (res: any) => {
        setActivating(false);
        if (res?.success && res.data) {
          const summary = res.data.summary ?? {
            total: res.data.results?.length ?? 0,
            activated: res.data.results?.filter((r: { status: string }) => r.status === 'activated').length ?? 0,
            failed: res.data.results?.filter((r: { status: string }) => r.status === 'failed').length ?? 0,
            skipped: 0,
          };
          setLastResult(summary);
          loadCoupons(selectedCategory || undefined, true);
        }
      },
    );
  }, [pageContext, selectedCategory, loadCoupons]);

  // Activar todos
  const handleActivateAll = useCallback(() => {
    const available = coupons.filter((c) => c.status === 'available');
    if (available.length > 0) {
      handleActivate(available.map((c) => c.id));
    }
  }, [coupons, handleActivate]);

  // Derivar al usuario a la sección web de Mercado Libre y activar auto-aplicación
  const handleAutoApplyWeb = useCallback(() => {
    try {
      chrome.storage.local.set({ auto_apply_all_pages: true }, () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any) => {
          const activeTab = tabs[0];
          const mlUrl = 'https://www.mercadolibre.com.ar/cupones/filter?all=true&source_page=int_view_all';
          
          if (activeTab && activeTab.url && activeTab.url.includes('mercadolibre.com.ar')) {
            chrome.tabs.update(activeTab.id, { url: mlUrl }, () => {
              window.close();
            });
          } else {
            chrome.tabs.create({ url: mlUrl }, () => {
              window.close();
            });
          }
        });
      });
    } catch (err) {
      console.error('Error al iniciar auto-aplicacion web', err);
    }
  }, []);

  const availableCount = coupons.filter((c) => c.status === 'available').length;

  return (
    <div className="popup-container">
      <header className="popup-header">
        <div className="header-brand">
          <span className="header-icon">🏷️</span>
          <h1>Mercado Libre Cupones</h1>
        </div>
        <StatusBar status={apiStatus} />
      </header>

      {pageContext && pageContext.pageType !== 'unknown' && (
        <div className="page-context-bar">
          <span className="context-type">{pageContext.pageType}</span>
          {pageContext.category && (
            <span className="context-category">{pageContext.category}</span>
          )}
        </div>
      )}

      <CategoryFilter
        categories={categories}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />

      {lastResult && (
        <div className="result-banner">
          <span className="result-activated">{lastResult.activated} activados</span>
          {lastResult.failed > 0 && (
            <span className="result-failed">{lastResult.failed} fallidos</span>
          )}
          {lastResult.skipped > 0 && (
            <span className="result-skipped">{lastResult.skipped} omitidos</span>
          )}
        </div>
      )}

      <CouponList
        coupons={coupons}
        loading={loading}
        onActivate={(id) => handleActivate([id])}
        activating={activating}
        apiStatus={apiStatus}
      />

      <ActionButtons
        availableCount={availableCount}
        activating={activating}
        onActivateAll={handleActivateAll}
        onRefresh={() => loadCoupons(selectedCategory || undefined, true)}
        onAutoApplyWeb={handleAutoApplyWeb}
      />
    </div>
  );
}
