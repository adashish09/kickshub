import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { validateEmail } from '../utils/validation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const resolveDestination = (targetUser) => {
    const fromPath = location.state?.from?.pathname;
    if (!fromPath) {
      return targetUser?.role === 'admin' ? '/admin' : '/account';
    }
    // Prevent customers from being redirected into admin console if prior state held /admin
    if (fromPath.startsWith('/admin')) {
      return targetUser?.role === 'admin' ? fromPath : '/account';
    }
    return fromPath;
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      const destination = resolveDestination(user);
      navigate(destination, { replace: true });
    }
  }, [user, navigate, location]);

  const validate = () => {
    const errors = {};
    const emailErr = validateEmail(email);
    if (emailErr) {
      errors.email = emailErr;
    }

    if (!password) {
      errors.password = 'Password is required.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'email') {
      const err = validateEmail(email);
      setFieldErrors((prev) => ({ ...prev, email: err }));
    } else if (field === 'password') {
      setFieldErrors((prev) => ({
        ...prev,
        password: password ? null : 'Password is required.',
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setTouched({ email: true, password: true });

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const loggedInUser = await login(email.trim(), password);
      const destination = resolveDestination(loggedInUser);
      navigate(destination, { replace: true });
    } catch (err) {
      setServerError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-badge">Member Access</div>
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">
            Sign in to access your saved sizes, drop alerts, and exclusive sneaker drops.
          </p>
        </div>

        {serverError && (
          <div className="auth-alert auth-alert-error" role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {/* Email Field */}
          <div className="form-group">
            <label htmlFor="login-email" className="form-label">
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              className={`form-input ${touched.email && fieldErrors.email ? 'input-error' : ''}`}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (touched.email) {
                  setFieldErrors((prev) => ({ ...prev, email: validateEmail(e.target.value) }));
                }
              }}
              onBlur={() => handleBlur('email')}
              autoComplete="email"
              required
              aria-invalid={touched.email && Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
            />
            {touched.email && fieldErrors.email && (
              <span className="field-error-msg" id="login-email-error" role="alert">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {fieldErrors.email}
              </span>
            )}
          </div>

          {/* Password Field */}
          <div className="form-group">
            <div className="form-label-row">
              <label htmlFor="login-password" className="form-label">
                Password
              </label>
              <button
                type="button"
                className="show-hide-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="password-input-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className={`form-input ${touched.password && fieldErrors.password ? 'input-error' : ''}`}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (touched.password) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      password: e.target.value ? null : 'Password is required.',
                    }));
                  }
                }}
                onBlur={() => handleBlur('password')}
                autoComplete="current-password"
                required
                aria-invalid={touched.password && Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
              />
            </div>
            {touched.password && fieldErrors.password && (
              <span className="field-error-msg" id="login-password-error" role="alert">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {fieldErrors.password}
              </span>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            id="login-submit-btn"
            className="btn-auth-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="btn-spinner-content">
                <span className="btn-spinner"></span>
                <span>Signing In...</span>
              </span>
            ) : (
              'Sign In to KicksHub'
            )}
          </button>
        </form>

        <div className="auth-footer-prompt">
          <span>Don't have an account? </span>
          <Link to="/register" className="auth-link">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
