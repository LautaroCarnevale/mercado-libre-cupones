import type { Coupon } from '../../types';

interface CouponCardProps {
  coupon: Coupon;
  onActivate: (id: string) => void;
  activating: boolean;
}

export function CouponCard({ coupon, onActivate, activating }: CouponCardProps) {
  const isAvailable = coupon.status === 'available';
  const isActivated = coupon.status === 'activated';

  const discountLabel = (() => {
    switch (coupon.discount.type) {
      case 'percentage': return `${coupon.discount.value}%`;
      case 'fixed': return `$${coupon.discount.value}`;
      case 'free_shipping': return 'Envio gratis';
      default: return '';
    }
  })();

  return (
    <div className={`coupon-card ${isActivated ? 'coupon-activated' : ''}`}>
      <div className="coupon-discount-badge">
        <span className="discount-value">{discountLabel}</span>
        {coupon.discount.type !== 'free_shipping' && (
          <span className="discount-type">OFF</span>
        )}
      </div>

      <div className="coupon-info">
        <h3 className="coupon-title">{coupon.title}</h3>
        <p className="coupon-category">{coupon.category}</p>
        {coupon.conditions.minPurchase && (
          <p className="coupon-condition">
            Min: ${coupon.conditions.minPurchase.toLocaleString()}
          </p>
        )}
      </div>

      <div className="coupon-action">
        {isActivated ? (
          <span className="coupon-status-badge activated">Activado</span>
        ) : isAvailable ? (
          <button
            className="btn-activate"
            onClick={() => onActivate(coupon.id)}
            disabled={activating}
          >
            {activating ? '...' : 'Activar'}
          </button>
        ) : (
          <span className="coupon-status-badge expired">
            {coupon.status === 'expired' ? 'Expirado' : coupon.status}
          </span>
        )}
      </div>
    </div>
  );
}
