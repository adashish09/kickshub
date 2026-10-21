import React from 'react';
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="admin-container">
      {/* Admin Header / Top Bar */}
      <header className="admin-header">
        <div className="admin-header-inner">
          <div className="admin-brand-group">
            <Link to="/admin" className="admin-brand-link">
              <span className="admin-badge">ADMIN</span>
              <span className="brand-name">
                KICKS<span>HUB</span>
              </span>
            </Link>
            <span className="admin-env-pill">Console</span>
          </div>

          <nav className="admin-nav-tabs" aria-label="Admin Navigation">
            <NavLink
              to="/admin"
              end
              className={({ isActive }) => (isActive ? 'admin-tab active' : 'admin-tab')}
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/admin/products"
              className={({ isActive }) => (isActive ? 'admin-tab active' : 'admin-tab')}
            >
              Products
            </NavLink>
            <NavLink
              to="/admin/categories"
              className={({ isActive }) => (isActive ? 'admin-tab active' : 'admin-tab')}
            >
              Categories
            </NavLink>
            <NavLink
              to="/admin/orders"
              className={({ isActive }) => (isActive ? 'admin-tab active' : 'admin-tab')}
            >
              Orders
            </NavLink>
            <NavLink
              to="/admin/users"
              className={({ isActive }) => (isActive ? 'admin-tab active' : 'admin-tab')}
            >
              Customers
            </NavLink>
          </nav>

          <div className="admin-header-actions">
            <span className="admin-user-tag" title={`Logged in as ${user?.email}`}>
              <span className="admin-status-dot"></span>
              {user?.name || 'Administrator'}
            </span>
            <Link to="/" className="btn-admin-return-store" title="Go back to public store">
              Storefront ↗
            </Link>
            <button
              onClick={handleLogout}
              className="btn-admin-logout"
              title="Sign out of administrator console"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Admin Content Body */}
      <main className="admin-main">
        <div className="admin-page-content">
          <Outlet />
        </div>
      </main>

      {/* Admin Status Footer */}
      <footer className="admin-footer">
        <div className="admin-footer-inner">
          <span>KicksHub Admin Console • Connected to Flask REST API & MySQL 8</span>
          <span>Logged in as <strong>{user?.email}</strong> (Administrator)</span>
        </div>
      </footer>
    </div>
  );
}
