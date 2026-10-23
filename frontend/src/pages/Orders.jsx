import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiGetOrders, formatINR } from '../services/api';
import ChasingBlocksLoader from '../components/ChasingBlocksLoader';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total_items: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    apiGetOrders(currentPage, 10)
      .then((data) => {
        if (!active) return;
        setOrders(data.orders || []);
        setPagination(data.pagination || { page: 1, total_pages: 1, total_items: 0 });
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err.response?.data?.error?.message || err.friendlyMessage || 'Failed to load order history.'
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [currentPage]);

  if (loading && orders.length === 0) {
    return (
      <div className="orders-page-container loading-container">
        <ChasingBlocksLoader
          title="Loading Order History"
          subtitle="Retrieving verified past purchases and fulfillment tracking..."
          fullPage
        />
      </div>
    );
  }

  return (
    <div className="orders-page-container">
      <div className="orders-page-header">
        <div className="header-breadcrumbs">
          <Link to="/account">My Account</Link>
          <span>/</span>
          <span>Order History</span>
        </div>
        <h1 className="orders-page-title">My Orders</h1>
        <p className="orders-page-subtitle">
          View all your past sneaker purchases, historical receipts, and tracking status.
        </p>
      </div>

      {error && (
        <div className="auth-alert auth-alert-error" role="alert">
          <span>{error}</span>
        </div>
      )}

      {orders.length === 0 && !loading ? (
        <div className="empty-orders-card">
          <div className="empty-orders-icon" aria-hidden="true">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <h2>No Orders Found</h2>
          <p>You haven't placed any sneaker orders yet. Your confirmed purchases will show up here.</p>
          <div className="empty-orders-actions">
            <Link to="/products" className="btn-primary" id="orders-browse-catalog-btn">
              Explore Sneaker Drops →
            </Link>
          </div>
        </div>
      ) : (
        <div className="orders-list-stream">
          {orders.map((order) => {
            const formattedDate = order.created_at
              ? new Date(order.created_at).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : 'Recent';

            return (
              <div key={order.id} className="order-history-card" id={`order-card-${order.id}`}>
                <div className="order-card-header">
                  <div className="header-col-left">
                    <span className="order-number-title">Order #KH-{order.id}</span>
                    <span className="order-date-text">{formattedDate}</span>
                  </div>
                  <div className="header-col-right">
                    <span className="status-badge status-confirmed">Confirmed</span>
                    <span className="order-total-header">{formatINR(order.total)}</span>
                  </div>
                </div>

                <div className="order-card-items-preview">
                  {order.items?.map((item) => (
                    <div key={item.id} className="order-preview-item">
                      <div className="preview-thumb">
                        {item.image ? (
                          <img src={item.image} alt={item.product_name} />
                        ) : (
                          <span className="thumb-fallback" aria-hidden="true">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M2 18h20v2H2v-2zm1.15-4.05L4 9l4 1 3-4 6 2 4.85 5.95H3.15z"></path>
                            </svg>
                          </span>
                        )}
                      </div>
                      <div className="preview-meta">
                        <div className="preview-title">{item.product_name}</div>
                        <div className="preview-specs">
                          Size: <strong>{item.size}</strong> • Color: <strong>{item.color}</strong> • Qty: <strong>{item.quantity}</strong>
                        </div>
                      </div>
                      <div className="preview-line-price">
                        {formatINR(item.line_total)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="order-card-footer">
                  <div className="footer-destination">
                    <span>Delivered to: </span>
                    <strong>{order.address_snapshot?.recipient_name || 'Customer'}</strong>
                    <span> ({order.address_snapshot?.city || 'India'})</span>
                  </div>
                  <Link
                    to={`/orders/${order.id}`}
                    className="btn-order-view"
                    id={`view-order-btn-${order.id}`}
                  >
                    View Order Details →
                  </Link>
                </div>
              </div>
            );
          })}

          {/* Pagination controls */}
          {pagination.total_pages > 1 && (
            <div className="pagination-bar">
              <button
                type="button"
                className="btn-page"
                disabled={currentPage <= 1 || loading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                ← Previous
              </button>
              <span className="page-indicator">
                Page {pagination.page} of {pagination.total_pages}
              </span>
              <button
                type="button"
                className="btn-page"
                disabled={currentPage >= pagination.total_pages || loading}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
