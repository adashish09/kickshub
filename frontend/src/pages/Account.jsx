import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Account() {
  const { user, updateProfile, changePassword, logout } = useAuth();
  const navigate = useNavigate();

  // Profile Edit State
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Password requirements calculation
  const passLengthMet = newPassword.length >= 8 && newPassword.length <= 128;
  const passLetterMet = /[a-zA-Z]/.test(newPassword);
  const passSpecialMet = /[\d\W_]/.test(newPassword);

  const handleUpdateName = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!editName.trim()) {
      setProfileError('Name cannot be empty.');
      return;
    }
    if (editName.trim().length < 2) {
      setProfileError('Name must be at least 2 characters.');
      return;
    }

    setProfileLoading(true);
    try {
      await updateProfile(editName.trim());
      setProfileSuccess('Your profile name has been updated.');
      setIsEditingName(false);
    } catch (err) {
      setProfileError(err.message || 'Failed to update name.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Please provide your current password.');
      return;
    }

    if (!passLengthMet || !passLetterMet || !passSpecialMet) {
      setPasswordError('New password does not meet the security criteria.');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('New password cannot be the same as your current password.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      // Changing password revokes sessions on backend; user is logged out and guided to re-authenticate
      navigate('/login', {
        state: {
          message: 'Password changed successfully! For your security, all active sessions were revoked. Please log in with your new password.',
        },
      });
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password.');
      setPasswordLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Format member since date
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Active Member';

  return (
    <div className="account-page-wrapper">
      <div className="account-container">
        {/* Account Top Hero */}
        <div className="account-hero-card">
          <div className="account-avatar-circle">
            {(user?.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="account-hero-info">
            <div className="account-title-row">
              <h1 className="account-user-name">{user?.name}</h1>
              <span className={`role-badge ${user?.role === 'admin' ? 'badge-admin' : 'badge-customer'}`}>
                {user?.role === 'admin' ? 'Administrator' : 'KicksHub Member'}
              </span>
            </div>
            <p className="account-user-email">{user?.email}</p>
            <p className="account-meta">Member since {memberSince}</p>
          </div>
          <div className="account-hero-action">
            <button
              onClick={handleLogout}
              id="account-logout-btn"
              className="btn-logout"
              title="Sign out of your account"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Grid of Settings Cards */}
        <div className="account-sections-grid">
          {/* Card 1: Profile Details */}
          <div className="account-card" id="profile-section">
            <div className="card-header-row">
              <div>
                <h2 className="card-heading">Profile Information</h2>
                <p className="card-subheading">Personal details and identity</p>
              </div>
              {!isEditingName && (
                <button
                  type="button"
                  id="edit-name-btn"
                  className="btn-text-action"
                  onClick={() => {
                    setEditName(user?.name || '');
                    setIsEditingName(true);
                    setProfileSuccess('');
                    setProfileError('');
                  }}
                >
                  Edit Name
                </button>
              )}
            </div>

            {profileSuccess && (
              <div className="auth-alert auth-alert-success" role="status">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="auth-alert auth-alert-error" role="alert">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{profileError}</span>
              </div>
            )}

            {isEditingName ? (
              <form onSubmit={handleUpdateName} className="profile-edit-form">
                <div className="form-group">
                  <label htmlFor="edit-name-input" className="form-label">
                    Full Name
                  </label>
                  <input
                    id="edit-name-input"
                    type="text"
                    className="form-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-actions-inline">
                  <button
                    type="submit"
                    id="save-name-btn"
                    className="btn-primary-sm"
                    disabled={profileLoading}
                  >
                    {profileLoading ? 'Saving...' : 'Save Name'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary-sm"
                    onClick={() => {
                      setIsEditingName(false);
                      setProfileError('');
                    }}
                    disabled={profileLoading}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-details-list">
                <div className="profile-detail-item">
                  <span className="detail-label">Full Name</span>
                  <span className="detail-value" id="display-user-name">{user?.name}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="detail-label">Email Address</span>
                  <span className="detail-value">{user?.email}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="detail-label">Account Role</span>
                  <span className="detail-value capitalize">{user?.role}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="detail-label">User ID</span>
                  <span className="detail-value text-mono">#{user?.id}</span>
                </div>
              </div>
            )}
          </div>

          {/* Card: Orders Quick Link */}
          <div className="account-card" id="orders-quick-section">
            <div className="card-header-row">
              <div>
                <h2 className="card-heading">Orders & Receipts</h2>
                <p className="card-subheading">Track past drops and purchases</p>
              </div>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: '1.5' }}>
              View and track all your confirmed sneaker drops, purchase snapshots, and delivery destinations.
            </p>
            <Link to="/orders" className="btn-primary" id="account-view-orders-btn">
              View Order History →
            </Link>
          </div>

          {/* Card 2: Security & Password */}
          <div className="account-card" id="security-section">
            <div className="card-header-row">
              <div>
                <h2 className="card-heading">Security & Password</h2>
                <p className="card-subheading">Update your password to keep your drops secure</p>
              </div>
            </div>

            {passwordSuccess && (
              <div className="auth-alert auth-alert-success" role="status">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="auth-alert auth-alert-error" role="alert">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="security-form" noValidate>
              {/* Current Password */}
              <div className="form-group">
                <div className="form-label-row">
                  <label htmlFor="current-password" className="form-label">
                    Current Password
                  </label>
                  <button
                    type="button"
                    className="show-hide-btn"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                  >
                    {showCurrentPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  id="current-password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              {/* New Password */}
              <div className="form-group">
                <div className="form-label-row">
                  <label htmlFor="new-password" className="form-label">
                    New Password
                  </label>
                  <button
                    type="button"
                    className="show-hide-btn"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                  >
                    {showNewPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter new password (min. 8 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />

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
                    <span>Contains number or symbol</span>
                  </div>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="form-group">
                <label htmlFor="confirm-new-password" className="form-label">
                  Confirm New Password
                </label>
                <input
                  id="confirm-new-password"
                  type="password"
                  className="form-input"
                  placeholder="Re-enter new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="security-notice-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <span>
                  Updating your password will revoke all active refresh sessions. You will be prompted to sign in with your new password.
                </span>
              </div>

              <button
                type="submit"
                id="change-password-submit-btn"
                className="btn-auth-primary"
                disabled={passwordLoading}
              >
                {passwordLoading ? (
                  <span className="btn-spinner-content">
                    <span className="btn-spinner"></span>
                    <span>Updating Password...</span>
                  </span>
                ) : (
                  'Change Password'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
