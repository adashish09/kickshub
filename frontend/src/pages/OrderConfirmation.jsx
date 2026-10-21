import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { apiGetOrderById, formatINR } from '../services/api';

export default function OrderConfirmation() {
  const { orderId } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!location.state?.order);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (order) return;

    let active = true;
    setLoading(true);

    apiGetOrderById(orderId)
      .then((data) => {
        if (!active) return;
        setOrder(data.order);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err.response?.data?.error?.message || 'Failed to retrieve order confirmation details.'
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [orderId, order]);

  if (loading) {
    return (
      <div className="confirmation-page-container loading-container">
        <div className="btn-spinner-content">
          <span className="btn-spinner"></span>
          <span>Loading your order confirmation...</span>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="confirmation-page-container">
        <div className="auth-alert auth-alert-error" role="alert">
          <span>{error || 'Order confirmation details unavailable.'}</span>
        </div>
        <div style={{ marginTop: '1.5rem' }}>
          <Link to="/orders" className="btn-primary">
            View My Orders →
          </Link>
        </div>
      </div>
    );
  }

  const addr = order.address_snapshot || {};
  const formattedDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Just now';

  return (
    <div className="confirmation-page-container">
      <div className="confirmation-banner-card">
        <div className="confirmation-celebration-badge" aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h1 className="confirmation-title">Thank You For Your Order!</h1>
        <p className="confirmation-subtitle">
          Your order <strong>#KH-{order.id}</strong> has been received and confirmed in the KicksHub system.
        </p>

        <div className="confirmation-meta-strip">
          <div className="meta-item">
            <span className="meta-label">Order Number</span>
            <span className="meta-val" id="order-number-val">#KH-{order.id}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Date Placed</span>
            <span className="meta-val">{formattedDate}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Order Status</span>
            <span className="status-badge status-confirmed">Confirmed</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Payment Status</span>
            <span className="status-badge status-simulated">
              {order.payment?.status === 'pending' ? 'Pending (Simulated)' : order.payment?.status}
            </span>
          </div>
        </div>
      </div>

      <div className="confirmation-details-grid">
        {/* Left: Purchased Item Snapshots */}
        <div className="confirmation-items-column">
          <div className="confirmation-card">
            <h2 className="card-heading">Purchased Items ({order.items?.length || 0})</h2>
            <div className="confirmation-items-list">
              {order.items?.map((item) => (
                <div key={item.id} className="confirmation-item-card">
                  <div className="item-thumb-box">
                    {item.image ? (
                      <img src={item.image} alt={item.product_name} />
                    ) : (
                      <div className="thumb-placeholder" aria-hidden="true">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M2 18h20v2H2v-2zm1.15-4.05L4 9l4 1 3-4 6 2 4.85 5.95H3.15z"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="item-info-box">
                    <h3 className="item-name">{item.product_name}</h3>
                    <div className="item-variant-spec">
                      <span>Size: <strong>{item.size}</strong></span>
                      <span>Color: <strong>{item.color}</strong></span>
                      <span>SKU: <strong>{item.sku}</strong></span>
                    </div>
                    <div className="item-price-unit">
                      Qty: <strong>{item.quantity}</strong> × {formatINR(item.unit_price)}
                    </div>
                  </div>
                  <div className="item-line-total">
                    {formatINR(item.line_total)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Delivery Address & Order Total */}
        <div className="confirmation-sidebar-column">
          {/* Delivery Address Snapshot */}
          <div className="confirmation-card">
            <h2 className="card-heading">Delivery Destination</h2>
            <div className="destination-snapshot-body">
              <div className="snapshot-name">{addr.recipient_name}</div>
              {addr.phone && <div className="snapshot-phone">{addr.phone}</div>}
              <div className="snapshot-address">
                {addr.line1}
                {addr.line2 ? `, ${addr.line2}` : ''}
              </div>
              <div className="snapshot-city">
                {addr.city}, {addr.state} - {addr.postal_code}
              </div>
              <div className="snapshot-country">{addr.country || 'India'}</div>
            </div>
          </div>

          {/* Pricing Totals */}
          <div className="confirmation-card">
            <h2 className="card-heading">Order Total</h2>
            <div className="summary-row">
              <span>Subtotal</span>
              <span className="summary-val">{formatINR(order.subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <span className="summary-val highlight-green">
                {parseFloat(order.shipping_fee) === 0 ? 'FREE' : formatINR(order.shipping_fee)}
              </span>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-total-row">
              <span>Total Paid</span>
              <span className="summary-total-val" id="confirmation-order-total">{formatINR(order.total)}</span>
            </div>
          </div>

          {/* Action Navigation */}
          <div className="confirmation-actions-box">
            <Link to={`/orders/${order.id}`} className="btn-primary full-width" id="view-order-details-btn">
              View Order Details →
            </Link>
            <Link to="/products" className="btn-secondary full-width" id="continue-shopping-btn">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
