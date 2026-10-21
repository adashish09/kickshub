import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminRoute({ children }) {
  const { user, isInitialLoading } = useAuth();
  const location = useLocation();

  if (isInitialLoading) {
    return (
      <div className="auth-loading-screen" role="status" aria-live="polite">
        <div className="auth-spinner"></div>
        <p className="auth-loading-text">Verifying administrative credentials...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role !== 'admin') {
    return (
      <div className="admin-access-denied-container">
        <div className="admin-access-denied-card">
          <div className="access-denied-icon">🔒</div>
          <h2>Access Denied</h2>
          <p>
            Your account (<strong>{user.email}</strong>) has customer permissions and cannot access the administration console.
          </p>
          <div className="access-denied-actions">
            <Link to="/" className="btn-primary">
              Return to Storefront
            </Link>
            <Link to="/account" className="btn-secondary">
              View My Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
