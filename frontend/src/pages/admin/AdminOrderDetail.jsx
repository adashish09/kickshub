import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { adminGetOrderDetail, adminUpdateOrderStatus } from '../../services/api';

export default function AdminOrderDetail() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusUpdate, setStatusUpdate] = useState('');
  const [updating, setUpdating] = useState(false);
  const [notice, setNotice] = useState(null);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminGetOrderDetail(orderId);
      setOrder(res.order);
      setStatusUpdate(res.order?.status || '');
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to load order details.'
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handleStatusChange = async (e) => {
    e.preventDefault();
    if (!statusUpdate || statusUpdate === order.status) return;

    const confirmed = window.confirm(
      `Confirm order status transition from '${order.status.toUpperCase()}' to '${statusUpdate.toUpperCase()}'?`
    );
    if (!confirmed) return;

    setUpdating(true);
    try {
      const res = await adminUpdateOrderStatus(order.id, statusUpdate);
      setNotice(res.message);
      loadOrder();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update order status.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading-state">
        <div className="admin-spinner"></div>
        <p>Loading order #{orderId}...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="admin-error-box">
        <p>{error || 'Order not found.'}</p>
        <Link to="/admin/orders" className="btn-primary">
          Back to Orders
        </Link>
      </div>
    );
  }

  const allowedTransitions = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
  };

  const isTerminal =
    order.status === 'completed' || order.status === 'cancelled';
  const nextOptions = allowedTransitions[order.status] || [];

  return (
    <div className="admin-order-detail-page">
      <div className="admin-page-header">
        <div>
          <Link to="/admin/orders" className="admin-back-link">
            ← Back to Orders List
          </Link>
          <h1 className="admin-page-title">Order #KH-{order.id}</h1>
          <p className="admin-page-subtitle">
            Placed on {order.created_at ? new Date(order.created_at).toLocaleString() : '—'}
          </p>
        </div>

        {/* Status Transition Card */}
        <div className="admin-status-control-card">
          <div className="status-control-header">
            <span className="control-label">Current Status:</span>
            <span className={`status-pill status-${order.status.toLowerCase()}`}>
              {order.status.toUpperCase()}
            </span>
          </div>

          {!isTerminal ? (
            <form onSubmit={handleStatusChange} className="status-transition-form">
              <select
                value={statusUpdate}
                onChange={(e) => setStatusUpdate(e.target.value)}
                className="admin-select form-input-sm"
              >
                <option value={order.status}>Current: {order.status}</option>
                {nextOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    Transition to: {opt.toUpperCase()}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={updating || statusUpdate === order.status}
                className="btn-primary btn-sm"
              >
                {updating ? 'Updating...' : 'Update Status'}
              </button>
            </form>
          ) : (
            <span className="terminal-status-note">
              This order has reached a terminal state ({order.status}).
            </span>
          )}
        </div>
      </div>

      {notice && (
        <div className="admin-action-notice" role="alert">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="notice-dismiss">
            ×
          </button>
        </div>
      )}

      {/* 2-Column Details Layout */}
      <div className="admin-order-info-grid">
        {/* Customer & Destination */}
        <div className="admin-card">
          <h2 className="admin-card-title">Customer & Destination</h2>
          <div className="info-block">
            <div className="info-row">
              <span className="info-label">Customer Account:</span>
              <span className="info-value">
                {order.customer?.name} ({order.customer?.email})
              </span>
            </div>
            {order.delivery_address ? (
              <>
                <div className="info-row">
                  <span className="info-label">Recipient:</span>
                  <span className="info-value">{order.delivery_address.full_name}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Phone:</span>
                  <span className="info-value">{order.delivery_address.phone}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Address:</span>
                  <span className="info-value">
                    {order.delivery_address.street_address}
                    {order.delivery_address.apartment && `, ${order.delivery_address.apartment}`}
                    <br />
                    {order.delivery_address.city}, {order.delivery_address.state} —{' '}
                    {order.delivery_address.postal_code}
                    <br />
                    {order.delivery_address.country}
                  </span>
                </div>
              </>
            ) : (
              <p className="no-address-note">No delivery address recorded.</p>
            )}
          </div>
        </div>

        {/* Payment & Audit Snapshot */}
        <div className="admin-card">
          <h2 className="admin-card-title">Payment & Financial Snapshot</h2>
          <div className="info-block">
            <div className="info-row">
              <span className="info-label">Payment Provider:</span>
              <span className="info-value">
                <strong>{order.payment?.provider?.toUpperCase() || 'SIMULATED'}</strong>
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Payment Status:</span>
              <span className="info-value">
                <span className="payment-pill">
                  {order.payment?.status?.toUpperCase() || 'PENDING'}
                </span>
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Transaction ID:</span>
              <span className="info-value">
                <code>{order.payment?.transaction_id || 'SIM_KH_ORD_' + order.id}</code>
              </span>
            </div>
            <div className="info-divider"></div>
            <div className="info-row">
              <span className="info-label">Subtotal:</span>
              <span className="info-value">₹{order.subtotal}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Shipping:</span>
              <span className="info-value">
                {parseFloat(order.shipping_fee) === 0 ? 'FREE' : `₹${order.shipping_fee}`}
              </span>
            </div>
            <div className="info-row total-row">
              <span className="info-label">Order Total:</span>
              <span className="info-value highlight">₹{order.total}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="admin-card">
        <h2 className="admin-card-title">Purchased Items ({order.items?.length || 0})</h2>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Sneaker</th>
                <th>SKU</th>
                <th>Size</th>
                <th>Colorway</th>
                <th>Unit Price</th>
                <th>Quantity</th>
                <th>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="table-product-cell">
                      <div className="product-cell-thumb">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.product_name} loading="lazy" />
                        ) : (
                          <div className="thumb-placeholder">👟</div>
                        )}
                      </div>
                      <span className="product-cell-name">{item.product_name}</span>
                    </div>
                  </td>
                  <td>
                    <code>{item.sku}</code>
                  </td>
                  <td>
                    <strong>{item.size}</strong>
                  </td>
                  <td>{item.color}</td>
                  <td>₹{item.unit_price}</td>
                  <td>× {item.quantity}</td>
                  <td>
                    <strong>₹{item.line_total}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
