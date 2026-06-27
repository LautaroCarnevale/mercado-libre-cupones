import type { Coupon } from '../types';
import { createLogger } from '../utils/logger';
import { getApplyCouponButtons, getNextPageLink } from './scraper';
import { storageManager } from '../store/storage';

const log = createLogger('Injector');

const PANEL_ID = 'mercado-libre-cupones-panel';
const TOGGLE_ID = 'mercado-libre-cupones-toggle';

export class PanelInjector {
  private shadow: ShadowRoot | null = null;
  private visible = false;

  inject(): void {
    if (document.getElementById(TOGGLE_ID)) return;

    const host = document.createElement('div');
    host.id = TOGGLE_ID;
    host.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:999999;';
    document.body.appendChild(host);

    this.shadow = host.attachShadow({ mode: 'closed' });
    this.shadow.innerHTML = this.getToggleHTML();

    const btn = this.shadow.querySelector('#toggle-btn');
    btn?.addEventListener('click', () => this.togglePanel());

    const applyCurrentPageBtn = this.shadow.querySelector('#apply-current-page-btn');
    applyCurrentPageBtn?.addEventListener('click', () => {
      this.applyCouponsOnCurrentPage();
    });

    const goToCouponsBtn = this.shadow.querySelector('#go-to-coupons-btn');
    goToCouponsBtn?.addEventListener('click', async () => {
      await storageManager.set('auto_apply_all_pages', true);
      await storageManager.set('auto_apply_applied_count', 0);
      await storageManager.remove('auto_apply_scan_done');
      window.location.href = 'https://www.mercadolibre.com.ar/cupones/filter?all=true&source_page=int_view_all';
    });

    // Auto-abrir panel si la auto-aplicacion esta activa
    storageManager.get<boolean>('auto_apply_all_pages').then((active) => {
      if (active) {
        this.visible = true;
        const panel = this.shadow?.querySelector('#panel');
        if (panel instanceof HTMLElement) {
          panel.style.display = 'block';
        }
      }
    });

    log.info('Panel flotante inyectado');
  }

  togglePanel(): void {
    this.visible = !this.visible;
    const panel = this.shadow?.querySelector('#panel');
    if (panel instanceof HTMLElement) {
      panel.style.display = this.visible ? 'block' : 'none';
    }
  }

  updateCoupons(coupons: Coupon[]): void {
    const list = this.shadow?.querySelector('#coupon-list');
    if (!list) return;

    if (coupons.length === 0) {
      list.innerHTML = '<p class="empty-msg">No hay cupones para esta pagina</p>';
      return;
    }

    list.innerHTML = coupons.slice(0, 10).map((c) => `
      <div class="coupon-row">
        <div>
          <div class="coupon-title">${this.esc(c.title)}</div>
          <div class="coupon-meta">${this.esc(c.category)} · ${this.fmtDiscount(c)}</div>
        </div>
        <button data-coupon-id="${c.id}" class="activate-btn">Activar</button>
      </div>
    `).join('');

    list.querySelectorAll('button[data-coupon-id]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.target as HTMLElement).dataset.couponId;
        if (id) {
          chrome.runtime.sendMessage({
            type: 'ACTIVATE_COUPONS',
            payload: { couponIds: [id], context: { url: window.location.href } },
          });
          (e.target as HTMLButtonElement).textContent = '...';
          (e.target as HTMLButtonElement).disabled = true;
        }
      });
    });
  }

  showCategoryMatch(category: string): void {
    const badge = this.shadow?.querySelector('#category-badge');
    if (badge instanceof HTMLElement) {
      badge.textContent = `Categoria: ${category}`;
      badge.style.display = 'block';
    }
  }

  destroy(): void {
    document.getElementById(TOGGLE_ID)?.remove();
    this.shadow = null;
    this.visible = false;
  }

  // Configura la UI para el modo de pagina de cupones
  async setupCouponsPageMode(): Promise<void> {
    const section = this.shadow?.querySelector('#coupons-page-section');
    const normalSection = this.shadow?.querySelector('#normal-page-section');
    const list = this.shadow?.querySelector('#coupon-list');
    const statusText = this.shadow?.querySelector('#coupons-page-status');
    const applyPageBtn = this.shadow?.querySelector(
      '#apply-page-btn',
    ) as HTMLButtonElement;
    const applyAllPagesBtn = this.shadow?.querySelector(
      '#apply-all-pages-btn',
    ) as HTMLButtonElement;
    const cancelBtn = this.shadow?.querySelector(
      '#cancel-btn',
    ) as HTMLButtonElement;

    if (section instanceof HTMLElement) section.style.display = 'block';
    if (normalSection instanceof HTMLElement) normalSection.style.display = 'none';
    if (list instanceof HTMLElement) list.style.display = 'none';

    let cancelActivation = false;

    // Listener para cancelar
    cancelBtn?.addEventListener('click', async () => {
      cancelActivation = true;
      await storageManager.remove('auto_apply_all_pages');
      if (statusText instanceof HTMLElement) {
        statusText.textContent = 'Cancelando proceso...';
      }
      cancelBtn.disabled = true;
    });



    const updateStatus = () => {
      const buttons = getApplyCouponButtons();
      const count = buttons.length;
      const hasNext = getNextPageLink() !== null;

      if (statusText instanceof HTMLElement) {
        if (count > 0) {
          statusText.textContent = `Se detectaron ${count} cupones para aplicar`;
        } else {
          statusText.textContent = hasNext
            ? 'Listo para ir a la siguiente pagina'
            : 'Todos los cupones ya estan aplicados';
        }
      }

      if (applyPageBtn) {
        applyPageBtn.textContent = `Aplicar ${count} (esta pagina)`;
        applyPageBtn.disabled = count === 0;
      }

      if (applyAllPagesBtn) {
        applyAllPagesBtn.textContent = hasNext
          ? 'Aplicar en TODAS las paginas'
          : 'Aplicar (ultima pagina)';
        applyAllPagesBtn.disabled = count === 0 && !hasNext;
      }

      if (cancelBtn) {
        cancelBtn.style.display = 'none';
        cancelBtn.disabled = false;
      }
    };

    // Ejecuta la aplicacion en la pagina actual
    const runApplication = async (): Promise<number> => {
      const buttons = getApplyCouponButtons();
      const total = buttons.length;
      if (total === 0) return 0;

      if (applyPageBtn) applyPageBtn.disabled = true;
      if (applyAllPagesBtn) applyAllPagesBtn.disabled = true;
      if (cancelBtn) {
        cancelBtn.style.display = 'block';
        cancelBtn.disabled = false;
      }

      // Mostrar contenedor de progreso
      const progressContainer = this.shadow.querySelector('#progress-container') as HTMLElement;
      const progressFill = this.shadow.querySelector('#progress-fill') as HTMLElement;
      if (progressContainer) progressContainer.style.display = 'block';
      if (progressFill) progressFill.style.width = '0%';

      let appliedCount = 0;
      for (let i = 0; i < total; i++) {
        if (cancelActivation) {
          log.info('Activacion cancelada en bucle de clics');
          break;
        }

        // Cargar contador acumulado para feedback al usuario
        const accumApplied = (await storageManager.get<number>('auto_apply_applied_count')) || 0;
        const totalAppliedSoFar = accumApplied + i;
        
        if (statusText instanceof HTMLElement) {
          statusText.textContent = totalAppliedSoFar > 0
            ? `Aplicando cupón ${i + 1} de ${total} (Total aplicados: ${totalAppliedSoFar})`
            : `Aplicando cupón ${i + 1} de ${total}...`;
        }

        // Actualizar barra de progreso visual
        if (progressFill) {
          progressFill.style.width = `${((i + 1) / total) * 100}%`;
        }

        buttons[i].click();
        appliedCount++;

        // Chequear cancelacion durante el sleep de 800ms
        for (let delayMs = 0; delayMs < 800; delayMs += 100) {
          if (cancelActivation) break;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      if (progressContainer) progressContainer.style.display = 'none';

      if (cancelBtn) {
        cancelBtn.style.display = 'none';
      }
      return appliedCount;
    };

    updateStatus();

    // Auto-aplicacion multi-pagina
    const autoApplyActive = await storageManager.get<boolean>(
      'auto_apply_all_pages',
    );
    if (autoApplyActive) {
      const scanDone = await storageManager.get<boolean>('auto_apply_scan_done');
      if (!scanDone) {
        log.info('Primera visita en auto-aplicacion. Iniciando escaneo en segundo plano...');
        this.startBackgroundScan();
        return;
      }

      log.info('Auto-aplicacion activa (modo visual), esperando carga de cupones...');
      cancelActivation = false;

      if (cancelBtn) {
        cancelBtn.style.display = 'block';
        cancelBtn.disabled = false;
      }

      if (statusText instanceof HTMLElement) {
        statusText.textContent = 'Esperando a que carguen los cupones...';
      }

      // Esperar hasta 4 segundos a que aparezcan los botones o el paginador
      let loaded = false;
      for (let i = 0; i < 20; i++) {
        if (cancelActivation) break;
        const count = getApplyCouponButtons().length;
        const hasPaginator = document.querySelector('.andes-pagination') !== null;
        if (count > 0 || hasPaginator) {
          loaded = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      if (cancelActivation) {
        await storageManager.remove('auto_apply_all_pages');
        await storageManager.remove('auto_apply_applied_count');
        if (statusText instanceof HTMLElement) {
          statusText.textContent = 'Proceso cancelado por el usuario';
        }
        if (cancelBtn) cancelBtn.style.display = 'none';
        setTimeout(() => updateStatus(), 2500);
        return;
      }

      const count = getApplyCouponButtons().length;
      let appliedInThisPage = 0;
      if (count > 0) {
        appliedInThisPage = await runApplication();
        // Guardar acumulado
        const accumApplied = (await storageManager.get<number>('auto_apply_applied_count')) || 0;
        await storageManager.set('auto_apply_applied_count', accumApplied + appliedInThisPage);
      }

      // Si fue cancelada la aplicacion, detenerse y limpiar
      if (cancelActivation) {
        await storageManager.remove('auto_apply_all_pages');
        await storageManager.remove('auto_apply_applied_count');
        await storageManager.remove('auto_apply_scan_done');
        if (statusText instanceof HTMLElement) {
          statusText.textContent = 'Proceso cancelado por el usuario';
        }
        if (cancelBtn) cancelBtn.style.display = 'none';
        setTimeout(() => updateStatus(), 2500);
        return;
      }

      const nextLink = getNextPageLink();
      const isValidNext = nextLink && nextLink.href && 
                          nextLink.href !== window.location.href &&
                          !nextLink.href.endsWith('#') && 
                          !nextLink.href.startsWith('javascript:');

      if (isValidNext) {
        const totalAccum = (await storageManager.get<number>('auto_apply_applied_count')) || 0;
        if (statusText instanceof HTMLElement) {
          statusText.textContent = totalAccum > 0
            ? `¡Pág. completada! (Aplicados: ${totalAccum}). Yendo a sig. página...`
            : 'Navegando a la siguiente pagina...';
        }
        
        // Espera de 1.5s antes de navegar, con chequeo rapido de cancelacion
        for (let delayMs = 0; delayMs < 1500; delayMs += 100) {
          if (cancelActivation) break;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        if (cancelActivation) {
          await storageManager.remove('auto_apply_all_pages');
          await storageManager.remove('auto_apply_applied_count');
          await storageManager.remove('auto_apply_scan_done');
          if (statusText instanceof HTMLElement) {
            statusText.textContent = 'Proceso cancelado antes de navegar';
          }
          if (cancelBtn) cancelBtn.style.display = 'none';
          setTimeout(() => updateStatus(), 2500);
          return;
        }

        window.location.href = nextLink!.href;
      } else {
        const totalAccum = (await storageManager.get<number>('auto_apply_applied_count')) || 0;
        await storageManager.remove('auto_apply_all_pages');
        await storageManager.remove('auto_apply_applied_count');
        await storageManager.remove('auto_apply_scan_done');
        if (statusText instanceof HTMLElement) {
          statusText.textContent = totalAccum > 0
            ? `¡Completado! Se aplicaron ${totalAccum} cupones en total.`
            : '¡Completado! Ultima pagina procesada';
        }
        if (cancelBtn) cancelBtn.style.display = 'none';
        setTimeout(() => updateStatus(), 2500);
      }
      return;
    }

    applyPageBtn?.addEventListener('click', async () => {
      cancelActivation = false;
      const applied = await runApplication();
      if (statusText instanceof HTMLElement) {
        statusText.textContent = cancelActivation 
          ? `Proceso cancelado. Se aplicaron ${applied} cupones.`
          : `Cupones aplicados: ${applied}`;
      }
      setTimeout(() => updateStatus(), 2500);
    });

    applyAllPagesBtn?.addEventListener('click', async () => {
      cancelActivation = false;
      const buttons = getApplyCouponButtons();
      const nextLink = getNextPageLink();

      if (buttons.length > 0) {
        await storageManager.set('auto_apply_all_pages', true);
        await storageManager.set('auto_apply_applied_count', 0); // Inicializar
        const applied = await runApplication();
        await storageManager.set('auto_apply_applied_count', applied);

        if (cancelActivation) {
          await storageManager.remove('auto_apply_all_pages');
          await storageManager.remove('auto_apply_applied_count');
          if (statusText instanceof HTMLElement) {
            statusText.textContent = `Proceso cancelado. Se aplicaron ${applied} cupones.`;
          }
          setTimeout(() => updateStatus(), 2500);
          return;
        }

        const isValidNext = nextLink && nextLink.href && 
                            nextLink.href !== window.location.href &&
                            !nextLink.href.endsWith('#') && 
                            !nextLink.href.startsWith('javascript:');

        if (isValidNext) {
          if (statusText instanceof HTMLElement) {
            statusText.textContent = 'Navegando a la siguiente pagina...';
          }
          
          // Espera de 1.5s antes de navegar, con chequeo rapido de cancelacion
          for (let delayMs = 0; delayMs < 1500; delayMs += 100) {
            if (cancelActivation) break;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          if (cancelActivation) {
            await storageManager.remove('auto_apply_all_pages');
            await storageManager.remove('auto_apply_applied_count');
            if (statusText instanceof HTMLElement) {
              statusText.textContent = 'Proceso cancelado antes de navegar';
            }
            setTimeout(() => updateStatus(), 2500);
            return;
          }

          window.location.href = nextLink!.href;
        } else {
          await storageManager.remove('auto_apply_all_pages');
          await storageManager.remove('auto_apply_applied_count');
          if (statusText instanceof HTMLElement) {
            statusText.textContent = `¡Listo! Se aplicaron ${applied} cupones en total.`;
          }
          setTimeout(() => updateStatus(), 2500);
        }
      } else {
        const isValidNext = nextLink && nextLink.href && 
                            nextLink.href !== window.location.href &&
                            !nextLink.href.endsWith('#') && 
                            !nextLink.href.startsWith('javascript:');

        if (isValidNext) {
          await storageManager.set('auto_apply_all_pages', true);
          await storageManager.set('auto_apply_applied_count', 0);
          if (statusText instanceof HTMLElement) {
            statusText.textContent = 'Navegando a la siguiente pagina...';
          }
          
          // Espera de 1.0s antes de navegar, con chequeo rapido de cancelacion
          for (let delayMs = 0; delayMs < 1000; delayMs += 100) {
            if (cancelActivation) break;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          if (cancelActivation) {
            await storageManager.remove('auto_apply_all_pages');
            await storageManager.remove('auto_apply_applied_count');
            if (statusText instanceof HTMLElement) {
              statusText.textContent = 'Proceso cancelado antes de navegar';
            }
            setTimeout(() => updateStatus(), 2500);
            return;
          }

          window.location.href = nextLink!.href;
        }
      }
    });
  }

  private fmtDiscount(c: Coupon): string {
    if (c.discount.type === 'percentage') return `${c.discount.value}% OFF`;
    if (c.discount.type === 'fixed') return `$${c.discount.value} OFF`;
    return 'Envio gratis';
  }

  private esc(t: string): string {
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
  }

  // Iniciar escaneo en segundo plano usando un iframe invisible
  private startBackgroundScan(): void {
    const statusText = this.shadow?.querySelector('#coupons-page-status') || this.shadow?.querySelector('.empty-msg');
    const progressContainer = this.shadow?.querySelector('#progress-container');
    const progressFill = this.shadow?.querySelector('#progress-fill');
    
    // Cambiar la vista del panel para reflejar el escaneo
    const couponsSection = this.shadow?.querySelector('#coupons-page-section') as HTMLElement;
    const normalSection = this.shadow?.querySelector('#normal-page-section') as HTMLElement;
    const list = this.shadow?.querySelector('#coupon-list') as HTMLElement;
    
    if (couponsSection) couponsSection.style.display = 'block';
    if (normalSection) normalSection.style.display = 'none';
    if (list) list.style.display = 'none';

    // Mostrar contenedor de progreso
    if (progressContainer instanceof HTMLElement) {
      progressContainer.style.display = 'block';
    }
    if (progressFill instanceof HTMLElement) {
      progressFill.style.width = '0%';
    }

    // Mostrar botón de cancelar
    const cancelBtn = this.shadow?.querySelector('#cancel-btn') as HTMLButtonElement;
    if (cancelBtn) {
      cancelBtn.style.display = 'block';
      cancelBtn.disabled = false;
    }
    
    // Ocultar botones de acción en la vista de cupones durante el escaneo
    const applyPageBtn = this.shadow?.querySelector('#apply-page-btn') as HTMLButtonElement;
    const applyAllPagesBtn = this.shadow?.querySelector('#apply-all-pages-btn') as HTMLButtonElement;
    if (applyPageBtn) applyPageBtn.style.display = 'none';
    if (applyAllPagesBtn) applyAllPagesBtn.style.display = 'none';

    if (statusText instanceof HTMLElement) {
      statusText.textContent = '🔍 Analizando cupones en segundo plano...';
    }

    // Crear iframe invisible para navegar las páginas de cupones
    let iframe = document.getElementById('ml-coupons-scanner-iframe') as HTMLIFrameElement;
    if (iframe) iframe.remove(); // Limpiar previo

    iframe = document.createElement('iframe');
    iframe.id = 'ml-coupons-scanner-iframe';
    iframe.style.display = 'none';
    iframe.src = 'https://www.mercadolibre.com.ar/cupones/filter?all=true&source_page=int_view_all&iframe_scan=true';
    document.body.appendChild(iframe);

    let totalPending = 0;
    let scanPage = 1;
    let cancelled = false;

    // Listener para cancelar
    const onCancelClick = () => {
      cancelled = true;
      if (iframe) iframe.remove();
      if (statusText instanceof HTMLElement) {
        statusText.textContent = 'Proceso cancelado';
      }
      setTimeout(() => this.restoreNormalPanelState(), 2000);
      cancelBtn?.removeEventListener('click', onCancelClick);
    };
    cancelBtn?.addEventListener('click', onCancelClick);

    // Escuchar progreso del iframe
    const onMessage = async (event: MessageEvent) => {
      if (cancelled) {
        window.removeEventListener('message', onMessage);
        return;
      }

      if (event.data && event.data.type === 'SCAN_PROGRESS') {
        const { pendingCount } = event.data.payload;
        totalPending += pendingCount;
        
        if (statusText instanceof HTMLElement) {
          statusText.textContent = `🔍 Analizando... Pág. ${scanPage} (Pendientes: ${totalPending})`;
        }
        
        if (progressFill instanceof HTMLElement) {
          const percent = Math.min((scanPage / (scanPage + 1)) * 100, 95);
          progressFill.style.width = `${percent}%`;
        }
        scanPage++;
      }

      if (event.data && event.data.type === 'SCAN_COMPLETE') {
        window.removeEventListener('message', onMessage);
        cancelBtn?.removeEventListener('click', onCancelClick);
        
        if (iframe) iframe.remove();

        if (progressFill instanceof HTMLElement) {
          progressFill.style.width = '100%';
        }

        if (totalPending === 0) {
          await storageManager.remove('auto_apply_all_pages');
          await storageManager.remove('auto_apply_applied_count');
          await storageManager.remove('auto_apply_scan_done');
          if (statusText instanceof HTMLElement) {
            statusText.textContent = '¡Todos los cupones ya están activos!';
          }
          if (progressContainer instanceof HTMLElement) {
            progressContainer.style.display = 'none';
          }
          setTimeout(() => this.restoreNormalPanelState(), 3000);
        } else {
          if (statusText instanceof HTMLElement) {
            statusText.textContent = `¡Faltan ${totalPending} cupones! Iniciando aplicación automática...`;
          }
          
          // Guardar banderas para iniciar visualmente sin recargar
          await storageManager.set('auto_apply_all_pages', true);
          await storageManager.set('auto_apply_applied_count', 0);
          await storageManager.set('auto_apply_scan_done', true);
          
          setTimeout(() => {
            this.restoreNormalPanelState();
          }, 1500);
        }
      }
    };

    window.addEventListener('message', onMessage);
  }

  // Restaurar el panel a su vista normal
  private restoreNormalPanelState(): void {
    const couponsSection = this.shadow?.querySelector('#coupons-page-section') as HTMLElement;
    const normalSection = this.shadow?.querySelector('#normal-page-section') as HTMLElement;
    const list = this.shadow?.querySelector('#coupon-list') as HTMLElement;
    const progressContainer = this.shadow?.querySelector('#progress-container') as HTMLElement;
    const cancelBtn = this.shadow?.querySelector('#cancel-btn') as HTMLButtonElement;
    const applyPageBtn = this.shadow?.querySelector('#apply-page-btn') as HTMLButtonElement;
    const applyAllPagesBtn = this.shadow?.querySelector('#apply-all-pages-btn') as HTMLButtonElement;

    if (progressContainer) progressContainer.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (applyPageBtn) applyPageBtn.style.display = 'block';
    if (applyAllPagesBtn) applyAllPagesBtn.style.display = 'block';

    // Determinar la página actual
    const isCouponsPage = window.location.href.includes('/cupones');
    if (isCouponsPage) {
      if (couponsSection) couponsSection.style.display = 'block';
      if (normalSection) normalSection.style.display = 'none';
      if (list) list.style.display = 'none';
      this.setupCouponsPageMode();
    } else {
      if (couponsSection) couponsSection.style.display = 'none';
      if (normalSection) normalSection.style.display = 'block';
      if (list) list.style.display = 'block';
    }
  }

  // Activa localmente los cupones que existan en la página actual
  private async applyCouponsOnCurrentPage(): Promise<void> {
    const buttons = getApplyCouponButtons();
    const statusText = this.shadow?.querySelector('.empty-msg') || this.shadow?.querySelector('#coupons-page-status');
    const actionBtn = this.shadow?.querySelector('#apply-current-page-btn') as HTMLButtonElement;

    if (buttons.length === 0) {
      if (statusText instanceof HTMLElement) {
        statusText.textContent = 'No se encontraron cupones activables en esta página.';
      }
      setTimeout(() => {
        if (statusText instanceof HTMLElement) {
          statusText.textContent = 'Cargando cupones...';
        }
      }, 3000);
      return;
    }

    if (actionBtn) {
      actionBtn.disabled = true;
      actionBtn.textContent = 'Activando...';
    }

    let activated = 0;
    for (const btn of buttons) {
      try {
        btn.click();
        activated++;
        await new Promise((resolve) => setTimeout(resolve, 600));
      } catch (err) {
        log.error('Error al clickear cupón', err);
      }
    }

    if (actionBtn) {
      actionBtn.textContent = `¡${activated} activados!`;
      setTimeout(() => {
        actionBtn.disabled = false;
        actionBtn.textContent = 'Aplicar en esta página';
      }, 2500);
    }
  }

  private getToggleHTML(): string {
    return `
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        #toggle-btn{width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#FFC107,#FF9800);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(255,193,7,.3);transition:transform .2s;font-size:20px}
        #toggle-btn:hover{transform:scale(1.1)}
        #panel{display:none;position:absolute;bottom:60px;right:0;width:320px;max-height:420px;background:#161B22;border:1px solid #30363D;border-radius:12px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.4);font-family:Inter,-apple-system,sans-serif}
        #panel-header{padding:12px 16px;background:#1C2128;border-bottom:1px solid #30363D;display:flex;justify-content:space-between;align-items:center}
        #panel-header h3{color:#FFC107;font-size:14px;font-weight:700}
        #category-badge{display:none;padding:6px 12px;background:rgba(255,193,7,.1);color:#FFC107;font-size:11px;text-align:center;border-bottom:1px solid #30363D}
        #coupons-page-section{display:none;padding:16px;border-bottom:1px solid #30363D;text-align:center}
        .page-btn{width:100%;background:#FFC107;color:#0D1117;border:none;border-radius:6px;padding:10px;font-size:13px;font-weight:600;cursor:pointer;margin-top:10px;transition:background-color .2s}
        .page-btn:hover{background:#FFB300}
        .page-btn:disabled{background:#30363D;color:#8B949E;cursor:not-allowed}
        .status-text{color:#E6EDF3;font-size:13px;font-weight:600}
        #coupon-list{max-height:320px;overflow-y:auto}
        #coupon-list::-webkit-scrollbar{width:4px}
        #coupon-list::-webkit-scrollbar-thumb{background:#30363D;border-radius:4px}
        .coupon-row{padding:10px 12px;border-bottom:1px solid #30363D;display:flex;justify-content:space-between;align-items:center}
        .coupon-title{font-weight:600;font-size:13px;color:#E6EDF3}
        .coupon-meta{font-size:11px;color:#8B949E;margin-top:2px}
        .activate-btn{background:#FFC107;color:#0D1117;border:none;border-radius:6px;padding:5px 10px;font-size:11px;font-weight:600;cursor:pointer}
        .empty-msg{color:#8B949E;text-align:center;padding:24px;font-size:13px}
      </style>
      <div id="panel">
        <div id="panel-header"><h3>Mercado Libre Cupones</h3><span style="color:#8B949E;font-size:11px">v1.0</span></div>
        <div id="category-badge"></div>
        <div id="coupons-page-section">
          <div id="coupons-page-status" class="status-text">Buscando cupones...</div>
          <div id="progress-container" style="display:none;margin-top:10px;background:#30363D;border-radius:4px;height:8px;overflow:hidden;width:100%">
            <div id="progress-fill" style="background:#FF9800;height:100%;width:0%;transition:width 0.2s ease"></div>
          </div>
          <button id="apply-page-btn" class="page-btn" disabled>Aplicar cupones</button>
          <button id="apply-all-pages-btn" class="page-btn" style="background:#FF9800;margin-top:8px;box-shadow:0 4px 12px rgba(255,152,0,.2)" disabled>Aplicar en TODAS las paginas</button>
          <button id="cancel-btn" class="page-btn" style="background:#F85149;color:#FFFFFF;margin-top:8px;display:none;box-shadow:0 4px 12px rgba(248,81,73,.2)">Cancelar activación</button>
        </div>
        <div id="coupon-list"><p class="empty-msg">Cargando cupones...</p></div>
        <div id="normal-page-section" style="padding:12px;border-top:1px solid #30363D;text-align:center">
          <button id="apply-current-page-btn" class="page-btn" style="margin-top:0;">Aplicar en esta página</button>
          <button id="go-to-coupons-btn" class="page-btn" style="background:#FF9800;margin-top:8px;box-shadow:0 4px 12px rgba(255,152,0,.2)">🤖 Aplicar en todas las páginas</button>
        </div>
      </div>
      <button id="toggle-btn" title="Mercado Libre Cupones">🏷️</button>
    `;
  }
}

export const panelInjector = new PanelInjector();
