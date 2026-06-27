import type { Coupon } from '../../types';
import { CouponCard } from './CouponCard';

interface CouponListProps {
  coupons: Coupon[];
  loading: boolean;
  onActivate: (id: string) => void;
  activating: boolean;
  apiStatus?: 'checking' | 'online' | 'offline';
}

export function CouponList({ coupons, loading, onActivate, activating, apiStatus }: CouponListProps) {
  if (loading) {
    return (
      <div className="coupon-list-empty">
        <div className="spinner" />
        <p>Cargando cupones...</p>
      </div>
    );
  }

  if (apiStatus === 'offline' && coupons.length === 0) {
    return (
      <div className="coupon-list-empty">
        <span className="empty-icon" style={{ fontSize: '32px' }}>⚠️</span>
        <p style={{ color: '#F85149', fontWeight: 'bold', marginTop: '8px' }}>Servidor offline</p>
        <p className="empty-hint">No se pudo conectar con la API de cupones. Verifica que la API local esté en ejecución.</p>
      </div>
    );
  }

  if (coupons.length === 0) {
    return (
      <div className="coupon-list-empty">
        <span className="empty-icon">📭</span>
        <p>No hay cupones disponibles</p>
        <p className="empty-hint">Intenta cambiar el filtro o refrescar</p>
      </div>
    );
  }

  return (
    <div className="coupon-list">
      {coupons.map((coupon) => (
        <CouponCard
          key={coupon.id}
          coupon={coupon}
          onActivate={onActivate}
          activating={activating}
        />
      ))}
    </div>
  );
}
