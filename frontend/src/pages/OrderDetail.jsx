import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGetOrderById, formatINR } from '../services/api';

export default function OrderDetail() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    apiGetOrderById(orderId)
      .then((data) => {
        if (!active) return;
        setOrder(data.order);
      })
      .catch((err) => {
        if (!active) return;
        if (err.response?.status === 404) {
          setError('Order not found or does not belong to your account.');
        } else {
          setError(
            err.response?.data?.error?.message || 'Failed to retrieve order details.'
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="order-detail-page-container loading-container">
        <div className="btn-spinner-content">
          <span className="btn-spinner"></span>
          <span>Loading order snapshot...</span>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="order-detail-page-container">
        <div className="auth-alert auth-alert-error" role="alert">
          <span>{error || 'Unable to display order details.'}</span>
        </div>
        <div style={{ marginTop: '1.5rem' }}>
          <Link to="/orders" className="btn-primary">
            ← Back to Order History
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
    : 'Recent';

  return (
    <div className="order-detail-page-container">
      {/* Breadcrumb & Navigation */}
      <div className="header-breadcrumbs">
        <Link to="/account">My Account</Link>
        <span>/</span>
        <Link to="/orders">Orders</Link>
        <span>/</span>
        <span>Order #KH-{order.id}</span>
      </div>

      <div className="detail-top-banner">
        <div className="banner-left">
          <h1 className="order-main-title">Order #KH-{order.id}</h1>
          <p className="order-timestamp">Placed on {formattedDate}</p>
        </div>
        <div className="banner-right">
          <span className="status-badge status-confirmed">Confirmed</span>
          <span className="status-badge status-simulated">
            Payment: {order.payment?.status === 'pending' ? 'Pending (Simulated)' : order.payment?.status}
          </span>
        </div>
      </div>

      <div className="confirmation-details-grid">
        {/* Left Column: Historical Line Item Snapshots */}
        <div className="confirmation-items-column">
          <div className="confirmation-card">
            <h2 className="card-heading">
              Purchased Items Snapshot ({order.items?.length || 0})
            </h2>
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
                      Price at Purchase: <strong>{formatINR(item.unit_price)}</strong> × {item.quantity}
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

        {/* Right Column: Address Snapshot, Payment Snapshot, Totals */}
        <div className="confirmation-sidebar-column">
          {/* Delivery Address Snapshot */}
          <div className="confirmation-card">
            <h2 className="card-heading">Delivery Address</h2>
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

          {/* Payment Snapshot */}
          {order.payment && (
            <div className="confirmation-card">
              <h2 className="card-heading">Payment Information</h2>
              <div className="summary-row">
                <span>Method</span>
                <span className="summary-val">Simulated Checkout</span>
              </div>
              <div className="summary-row">
                <span>Payment Status</span>
                <span className="summary-val highlight-green">
                  {order.payment.status === 'pending' ? 'Pending (Test)' : order.payment.status}
                </span>
              </div>
              {order.payment.transaction_ref && (
                <div className="summary-row">
                  <span>Reference</span>
                  <span className="summary-val" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    {order.payment.transaction_ref}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Financial Breakdown */}
          <div className="confirmation-card">
            <h2 className="card-heading">Order Total</h2>
            <div className="summary-row">
              <span>Subtotal</span>
              <span className="summary-val">{formatINR(order.subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping Charge</span>
              <span className="summary-val highlight-green">
                {parseFloat(order.shipping_fee) === 0 ? 'FREE' : formatINR(order.shipping_fee)}
              </span>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-total-row">
              <span>Grand Total</span>
              <span className="summary-total-val" id="order-grand-total">{formatINR(order.total)}</span>
            </div>
          </div>

          <div className="confirmation-actions-box">
            <Link to="/orders" className="btn-secondary full-width">
              ← Return to Order History
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
