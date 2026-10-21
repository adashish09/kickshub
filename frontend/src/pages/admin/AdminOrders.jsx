import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminGetOrders } from '../../services/api';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminGetOrders({
        page,
        limit: 10,
        status: statusFilter || undefined,
        search: search.trim() || undefined,
      });
      setOrders(res.items || []);
      setPagination(res.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to retrieve customer orders.'
      );
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadOrders();
  };

  return (
    <div className="admin-orders-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Customer Order Fulfillment</h1>
          <p className="admin-page-subtitle">
            Track customer purchases, review delivery destination snapshots, and manage status transitions.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="admin-toolbar-card">
        <form onSubmit={handleSearchSubmit} className="admin-search-form">
          <input
            type="text"
            placeholder="Search by order ID, customer name, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-input-search"
          />
          <button type="submit" className="btn-primary btn-sm">
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              className="btn-secondary btn-sm"
            >
              Clear
            </button>
          )}
        </form>

        <div className="admin-toolbar-filters">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="admin-select"
            aria-label="Filter by order status"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="admin-loading-state">
          <div className="admin-spinner"></div>
          <p>Loading customer orders...</p>
        </div>
      ) : error ? (
        <div className="admin-error-box">
          <p>{error}</p>
          <button onClick={loadOrders} className="btn-primary">
            Retry
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="admin-empty-table">
          <p>No orders found matching the filter criteria.</p>
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Date Placed</th>
                <th>Quantity</th>
                <th>Order Total</th>
                <th>Order Status</th>
                <th>Payment Mode</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((ord) => (
                <tr key={ord.id}>
                  <td>
                    <strong>#KH-{ord.id}</strong>
                  </td>
                  <td>
                    <div className="customer-cell">
                      <span className="cell-main-text">{ord.customer?.name}</span>
                      <span className="cell-sub-text">{ord.customer?.email}</span>
                    </div>
                  </td>
                  <td>{ord.created_at ? new Date(ord.created_at).toLocaleString() : '—'}</td>
                  <td>{ord.items_count} item(s)</td>
                  <td>
                    <strong>₹{ord.total}</strong>
                  </td>
                  <td>
                    <span className={`status-pill status-${ord.status.toLowerCase()}`}>
                      {ord.status.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span className="payment-pill">
                      {ord.payment?.provider?.toUpperCase()} ({ord.payment?.status?.toUpperCase()})
                    </span>
                  </td>
                  <td>
                    <Link to={`/admin/orders/${ord.id}`} className="btn-table-action">
                      View Details →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="admin-pagination-bar">
          <span className="pagination-info">
            Showing Page {pagination.page} of {pagination.pages} ({pagination.total} total)
          </span>
          <div className="pagination-controls">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={pagination.page <= 1}
              className="btn-secondary btn-sm"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((prev) => Math.min(pagination.pages, prev + 1))}
              disabled={pagination.page >= pagination.pages}
              className="btn-secondary btn-sm"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
