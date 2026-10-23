import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminGetDashboard } from '../../services/api';
import ChasingBlocksLoader from '../../components/ChasingBlocksLoader';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminGetDashboard();
      setData(res);
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
        err.friendlyMessage ||
        err.message ||
        'Failed to load administration dashboard.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  if (loading) {
    return (
      <div className="admin-loading-state">
        <ChasingBlocksLoader
          title="Loading Store Metrics"
          subtitle="Gathering real-time GMV revenue, catalog counts, and recent purchases..."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-error-box">
        <h3>Dashboard Error</h3>
        <p>{error}</p>
        <button onClick={loadMetrics} className="btn-primary">
          Retry
        </button>
      </div>
    );
  }

  const { metrics, recent_orders } = data || {};

  return (
    <div className="admin-dashboard-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Store Operations Dashboard</h1>
          <p className="admin-page-subtitle">
            Authoritative overview of catalog inventory, orders, and customer activity.
          </p>
        </div>
        <div className="admin-header-button-group">
          <Link to="/admin/products/new" className="btn-primary btn-admin-add">
            + New Sneaker
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="admin-metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Sneakers</div>
          <div className="metric-value">{metrics?.total_products || 0}</div>
          <div className="metric-subtext">
            <span>{metrics?.active_products || 0}</span> currently active in catalog
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Total Orders</div>
          <div className="metric-value">{metrics?.total_orders || 0}</div>
          <div className="metric-subtext">Lifetime customer purchases</div>
        </div>

        <div className="metric-card highlight">
          <div className="metric-label">Pending Processing</div>
          <div className="metric-value">{metrics?.pending_orders || 0}</div>
          <div className="metric-subtext">Orders awaiting fulfillment or verification</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Registered Customers</div>
          <div className="metric-value">{metrics?.total_customers || 0}</div>
          <div className="metric-subtext">Verified accounts with saved carts & history</div>
        </div>
      </div>

      {/* Quick Links Banner */}
      <div className="admin-quick-links-bar">
        <span className="quick-links-title">Quick Actions:</span>
        <Link to="/admin/products" className="quick-link-btn">
          Manage Inventory
        </Link>
        <Link to="/admin/categories" className="quick-link-btn">
          Categories & Slugs
        </Link>
        <Link to="/admin/orders" className="quick-link-btn">
          Fulfill Orders
        </Link>
        <Link to="/admin/users" className="quick-link-btn">
          View Customers
        </Link>
      </div>

      {/* Recent Orders Section */}
      <div className="admin-card-section">
        <div className="section-title-row">
          <h2>Recent Customer Orders</h2>
          <Link to="/admin/orders" className="section-view-link">
            View All Orders ({metrics?.total_orders || 0}) →
          </Link>
        </div>

        {recent_orders && recent_orders.length > 0 ? (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Date Placed</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recent_orders.map((ord) => (
                  <tr key={ord.id}>
                    <td>
                      <strong>#KH-{ord.id}</strong>
                    </td>
                    <td>
                      <div className="customer-cell">
                        <span className="cell-main-text">{ord.customer_name}</span>
                        <span className="cell-sub-text">{ord.customer_email}</span>
                      </div>
                    </td>
                    <td>{ord.items_count} item(s)</td>
                    <td>
                      <strong>₹{ord.total}</strong>
                    </td>
                    <td>
                      <span className={`status-pill status-${ord.status.toLowerCase()}`}>
                        {ord.status.toUpperCase()}
                      </span>
                    </td>
                    <td>{ord.created_at ? new Date(ord.created_at).toLocaleDateString() : '—'}</td>
                    <td>
                      <Link to={`/admin/orders/${ord.id}`} className="btn-table-action">
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-table">
            <p>No customer orders placed yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
