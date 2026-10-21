import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, login, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/account', { replace: true });
    }
  }, [user, navigate]);

  // Live password requirement evaluations
  const passLengthMet = password.length >= 8 && password.length <= 128;
  const passLetterMet = /[a-zA-Z]/.test(password);
  const passSpecialMet = /[\d\W_]/.test(password);

  const validate = () => {
    const errors = {};

    if (!name.trim()) {
      errors.name = 'Full name is required.';
    } else if (name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    }

    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
      errors.email = 'Please provide a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (!passLengthMet || !passLetterMet || !passSpecialMet) {
      errors.password = 'Password must meet all requirement criteria listed below.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password);
      // Seamlessly log the newly registered user in
      try {
        await login(email.trim(), password);
        navigate('/account', { replace: true });
      } catch {
        navigate('/login', {
          state: { message: 'Registration successful! Please sign in with your credentials.' },
        });
      }
    } catch (err) {
      setServerError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-badge">Join KicksHub</div>
          <h1 className="auth-title">Create an Account</h1>
          <p className="auth-subtitle">
            Join the community to unlock member-only sneaker drops, size alerts, and authentic releases.
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
          {/* Full Name */}
          <div className="form-group">
            <label htmlFor="register-name" className="form-label">
              Full Name
            </label>
            <input
              id="register-name"
              type="text"
              className={`form-input ${fieldErrors.name ? 'input-error' : ''}`}
              placeholder="e.g. Michael Jordan"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: null });
              }}
              autoComplete="name"
              required
            />
            {fieldErrors.name && <span className="field-error-msg">{fieldErrors.name}</span>}
          </div>

          {/* Email Address */}
          <div className="form-group">
            <label htmlFor="register-email" className="form-label">
              Email Address
            </label>
            <input
              id="register-email"
              type="email"
              className={`form-input ${fieldErrors.email ? 'input-error' : ''}`}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: null });
              }}
              autoComplete="email"
              required
            />
            {fieldErrors.email && <span className="field-error-msg">{fieldErrors.email}</span>}
          </div>

          {/* Password */}
          <div className="form-group">
            <div className="form-label-row">
              <label htmlFor="register-password" className="form-label">
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
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              className={`form-input ${fieldErrors.password ? 'input-error' : ''}`}
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: null });
              }}
              autoComplete="new-password"
              required
            />
            {fieldErrors.password && <span className="field-error-msg">{fieldErrors.password}</span>}

            {/* Password Criteria Checklist */}
            <div className="password-checklist">
              <div className={`checklist-item ${passLengthMet ? 'met' : ''}`}>
                <span className="check-icon">{passLengthMet ? '✓' : '•'}</span>
                <span>At least 8 characters</span>
              </div>
              <div className={`checklist-item ${passLetterMet ? 'met' : ''}`}>
                <span className="check-icon">{passLetterMet ? '✓' : '•'}</span>
                <span>Contains letters</span>
              </div>
              <div className={`checklist-item ${passSpecialMet ? 'met' : ''}`}>
                <span className="check-icon">{passSpecialMet ? '✓' : '•'}</span>
                <span>Contains a number or special character</span>
              </div>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <div className="form-label-row">
              <label htmlFor="register-confirm-password" className="form-label">
                Confirm Password
              </label>
              <button
                type="button"
                className="show-hide-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              id="register-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              className={`form-input ${fieldErrors.confirmPassword ? 'input-error' : ''}`}
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword) {
                  setFieldErrors({ ...fieldErrors, confirmPassword: null });
                }
              }}
              autoComplete="new-password"
              required
            />
            {fieldErrors.confirmPassword && (
              <span className="field-error-msg">{fieldErrors.confirmPassword}</span>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            id="register-submit-btn"
            className="btn-auth-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="btn-spinner-content">
                <span className="btn-spinner"></span>
                <span>Creating Account...</span>
              </span>
            ) : (
              'Create My Account'
            )}
          </button>
        </form>

        <div className="auth-footer-prompt">
          <span>Already have a KicksHub account? </span>
          <Link to="/login" className="auth-link">
            Sign in instead
          </Link>
        </div>
      </div>
    </div>
  );
}
