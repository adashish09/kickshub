import React, { useState, useEffect, useCallback } from 'react';
import { adminGetUsers } from '../../services/api';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminGetUsers({
        page,
        limit: 15,
        search: search.trim() || undefined,
        role: roleFilter || undefined,
      });
      setUsers(res.items || []);
      setPagination(res.pagination || { page: 1, limit: 15, total: 0, pages: 1 });
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to load registered accounts.'
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  return (
    <div className="admin-users-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Registered Accounts & Roles</h1>
          <p className="admin-page-subtitle">
            Audit customer accounts, administrative assignments, and purchase history activity.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="admin-toolbar-card">
        <form onSubmit={handleSearchSubmit} className="admin-search-form">
          <input
            type="text"
            placeholder="Search by customer name or email..."
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
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="admin-select"
            aria-label="Filter by role"
          >
            <option value="">All Roles</option>
            <option value="customer">Customers</option>
            <option value="admin">Administrators</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="admin-loading-state">
          <div className="admin-spinner"></div>
          <p>Loading accounts...</p>
        </div>
      ) : error ? (
        <div className="admin-error-box">
          <p>{error}</p>
          <button onClick={loadUsers} className="btn-primary">
            Retry
          </button>
        </div>
      ) : users.length === 0 ? (
        <div className="admin-empty-table">
          <p>No user accounts found matching the criteria.</p>
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Full Name</th>
                <th>Email Address</th>
                <th>Role</th>
                <th>Status</th>
                <th>Date Joined</th>
                <th>Orders Placed</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>#{u.id}</td>
                  <td>
                    <strong>{u.name}</strong>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span
                      className={`role-pill ${
                        u.role === 'admin' ? 'role-admin' : 'role-customer'
                      }`}
                    >
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${u.is_active ? 'status-confirmed' : 'status-cancelled'}`}>
                      {u.is_active ? 'ACTIVE' : 'DISABLED'}
                    </span>
                  </td>
                  <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                  <td>
                    <strong>{u.orders_count}</strong> order(s)
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
