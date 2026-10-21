import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, isInitialLoading } = useAuth();
  const location = useLocation();

  if (isInitialLoading) {
    return (
      <div className="auth-loading-screen" role="status" aria-live="polite">
        <div className="auth-spinner"></div>
        <p className="auth-loading-text">Verifying your session...</p>
      </div>
    );
  }

  if (!user) {
    // Preserve the original destination so the user returns upon logging in
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
