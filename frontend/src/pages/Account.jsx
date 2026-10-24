import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  apiGetAddresses,
  apiCreateAddress,
  apiUpdateAddress,
  apiDeleteAddress,
} from '../services/api';
import {
  validateName,
  validatePassword,
  validateConfirmPassword,
  validatePhone,
  formatPhoneInput,
  validatePostalCode,
  formatPostalCodeInput,
  validateAddressLine,
  validateCityOrState,
} from '../utils/validation';

export default function Account() {
  const { user, updateProfile, changePassword, logout } = useAuth();
  const navigate = useNavigate();

  // Profile Edit State
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [nameError, setNameError] = useState(null);
  const [nameTouched, setNameTouched] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Delivery Addresses State
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [addressSuccess, setAddressSuccess] = useState('');
  const [addressError, setAddressError] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [deletingAddressId, setDeletingAddressId] = useState(null);
  const [savingAddress, setSavingAddress] = useState(false);

  const initialAddressForm = {
    recipient_name: user?.name || '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
  };

  const [addressForm, setAddressForm] = useState(initialAddressForm);
  const [addressFieldErrors, setAddressFieldErrors] = useState({});
  const [addressTouched, setAddressTouched] = useState({});

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordFieldErrors, setPasswordFieldErrors] = useState({});
  const [passwordTouched, setPasswordTouched] = useState({});
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Password requirements calculation
  const passLengthMet = newPassword.length >= 8 && newPassword.length <= 128;
  const passLetterMet = /[a-zA-Z]/.test(newPassword);
  const passSpecialMet = /[\d\W_]/.test(newPassword);

  // Fetch saved addresses on mount
  useEffect(() => {
    let active = true;
    setAddressesLoading(true);

    apiGetAddresses()
      .then((data) => {
        if (!active) return;
        setAddresses(data.addresses || []);
      })
      .catch((err) => {
        if (!active) return;
        setAddressError(
          err.response?.data?.error?.message || 'Failed to load saved addresses.'
        );
      })
      .finally(() => {
        if (active) setAddressesLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Address validation helpers
  const validateAddressField = (name, value) => {
    switch (name) {
      case 'recipient_name':
        return validateName(value, 'Recipient name');
      case 'phone':
        return validatePhone(value);
      case 'line1':
        return validateAddressLine(value, 'Street address line 1');
      case 'city':
        return validateCityOrState(value, 'City');
      case 'state':
        return validateCityOrState(value, 'State');
      case 'postal_code':
        return validatePostalCode(value);
      default:
        return null;
    }
  };

  const validateAllAddressFields = () => {
    const errors = {
      recipient_name: validateAddressField('recipient_name', addressForm.recipient_name),
      phone: validateAddressField('phone', addressForm.phone),
      line1: validateAddressField('line1', addressForm.line1),
      city: validateAddressField('city', addressForm.city),
      state: validateAddressField('state', addressForm.state),
      postal_code: validateAddressField('postal_code', addressForm.postal_code),
    };

    const activeErrors = {};
    Object.keys(errors).forEach((key) => {
      if (errors[key]) {
        activeErrors[key] = errors[key];
      }
    });
    setAddressFieldErrors(activeErrors);
    return Object.keys(activeErrors).length === 0;
  };

  const handleAddressInputChange = (e) => {
    const { name, value } = e.target;
    let formattedVal = value;
    if (name === 'phone') {
      formattedVal = formatPhoneInput(value);
    } else if (name === 'postal_code') {
      formattedVal = formatPostalCodeInput(value);
    }
    setAddressForm((prev) => ({ ...prev, [name]: formattedVal }));

    if (addressTouched[name]) {
      const err = validateAddressField(name, formattedVal);
      setAddressFieldErrors((prev) => ({ ...prev, [name]: err }));
    }
  };

  const handleAddressBlur = (e) => {
    const { name, value } = e.target;
    setAddressTouched((prev) => ({ ...prev, [name]: true }));
    const err = validateAddressField(name, value);
    setAddressFieldErrors((prev) => ({ ...prev, [name]: err }));
  };

  const handleOpenAddAddress = () => {
    setEditingAddressId(null);
    setAddressForm({
      recipient_name: user?.name || '',
      phone: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'India',
    });
    setAddressFieldErrors({});
    setAddressTouched({});
    setAddressError('');
    setAddressSuccess('');
    setShowAddressForm(true);
  };

  const handleOpenEditAddress = (addr) => {
    setEditingAddressId(addr.id);
    setAddressForm({
      recipient_name: addr.recipient_name || '',
      phone: addr.phone || '',
      line1: addr.line1 || '',
      line2: addr.line2 || '',
      city: addr.city || '',
      state: addr.state || '',
      postal_code: addr.postal_code || '',
      country: addr.country || 'India',
    });
    setAddressFieldErrors({});
    setAddressTouched({});
    setAddressError('');
    setAddressSuccess('');
    setShowAddressForm(true);
  };

  const handleCancelAddressForm = () => {
    setShowAddressForm(false);
    setEditingAddressId(null);
    setAddressFieldErrors({});
    setAddressTouched({});
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    setAddressError('');
    setAddressSuccess('');

    setAddressTouched({
      recipient_name: true,
      phone: true,
      line1: true,
      city: true,
      state: true,
      postal_code: true,
    });

    if (!validateAllAddressFields()) {
      setAddressError('Please resolve all highlighted field errors before saving.');
      return;
    }

    setSavingAddress(true);
    try {
      const payload = {
        recipient_name: addressForm.recipient_name.trim(),
        phone: addressForm.phone.trim(),
        line1: addressForm.line1.trim(),
        line2: addressForm.line2.trim(),
        city: addressForm.city.trim(),
        state: addressForm.state.trim(),
        postal_code: addressForm.postal_code.trim(),
        country: addressForm.country.trim() || 'India',
      };

      if (editingAddressId) {
        const data = await apiUpdateAddress(editingAddressId, payload);
        const updated = data.address;
        setAddresses((prev) =>
          prev.map((a) => (a.id === editingAddressId ? updated : a))
        );
        setAddressSuccess('Delivery address updated successfully.');
      } else {
        const data = await apiCreateAddress(payload);
        const created = data.address;
        setAddresses((prev) => [created, ...prev]);
        setAddressSuccess('New delivery address added successfully.');
      }

      setShowAddressForm(false);
      setEditingAddressId(null);
      setAddressForm(initialAddressForm);
      setAddressFieldErrors({});
      setAddressTouched({});
    } catch (err) {
      setAddressError(
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to save delivery address. Please check your entries.'
      );
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm('Are you sure you want to delete this delivery address?')) {
      return;
    }

    setDeletingAddressId(addressId);
    setAddressError('');
    setAddressSuccess('');

    try {
      await apiDeleteAddress(addressId);
      setAddresses((prev) => prev.filter((a) => a.id !== addressId));
      setAddressSuccess('Delivery address deleted successfully.');
      if (editingAddressId === addressId) {
        setShowAddressForm(false);
        setEditingAddressId(null);
      }
    } catch (err) {
      setAddressError(
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to delete address.'
      );
    } finally {
      setDeletingAddressId(null);
    }
  };

  const handleUpdateName = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setNameTouched(true);

    const err = validateName(editName, 'Full name');
    setNameError(err);
    if (err) {
      setProfileError(err);
      return;
    }

    setProfileLoading(true);
    try {
      await updateProfile(editName.trim());
      setProfileSuccess('Your profile name has been updated.');
      setIsEditingName(false);
      setNameTouched(false);
      setNameError(null);
    } catch (err) {
      setProfileError(err.message || 'Failed to update name.');
    } finally {
      setProfileLoading(false);
    }
  };

  const validatePasswordFields = () => {
    const errors = {};
    if (!currentPassword) {
      errors.currentPassword = 'Current password is required.';
    }
    const newPassErr = validatePassword(newPassword);
    if (newPassErr) {
      errors.newPassword = newPassErr;
    } else if (currentPassword === newPassword) {
      errors.newPassword = 'New password cannot be the same as your current password.';
    }
    const confirmErr = validateConfirmPassword(newPassword, confirmNewPassword);
    if (confirmErr) {
      errors.confirmNewPassword = confirmErr;
    }

    setPasswordFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    setPasswordTouched({
      currentPassword: true,
      newPassword: true,
      confirmNewPassword: true,
    });

    if (!validatePasswordFields()) {
      setPasswordError('Please resolve the errors highlighted below.');
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
              <form onSubmit={handleUpdateName} className="profile-edit-form" noValidate>
                <div className="form-group">
                  <label htmlFor="edit-name-input" className="form-label">
                    Full Name
                  </label>
                  <input
                    id="edit-name-input"
                    type="text"
                    className={`form-input ${nameTouched && nameError ? 'input-error' : ''}`}
                    value={editName}
                    onChange={(e) => {
                      setEditName(e.target.value);
                      if (nameTouched) {
                        setNameError(validateName(e.target.value, 'Full name'));
                      }
                    }}
                    onBlur={() => {
                      setNameTouched(true);
                      setNameError(validateName(editName, 'Full name'));
                    }}
                    required
                    aria-invalid={nameTouched && Boolean(nameError)}
                    aria-describedby={nameError ? 'edit-name-error' : undefined}
                  />
                  {nameTouched && nameError && (
                    <span className="field-error-msg" id="edit-name-error" role="alert">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      {nameError}
                    </span>
                  )}
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
                      setNameError(null);
                      setNameTouched(false);
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

          {/* Card 3: Saved Delivery Addresses (Add, Edit, View, Delete) */}
          <div className="account-card account-addresses-card" id="addresses-section">
            <div className="card-header-row">
              <div>
                <h2 className="card-heading">
                  Saved Delivery Addresses
                  {addresses.length > 0 && (
                    <span className="addresses-count-pill">{addresses.length}</span>
                  )}
                </h2>
                <p className="card-subheading">Manage your shipping destinations for faster checkout</p>
              </div>
              {!showAddressForm && (
                <button
                  type="button"
                  id="account-add-address-btn"
                  className="btn-text-action"
                  onClick={handleOpenAddAddress}
                >
                  + Add New Address
                </button>
              )}
            </div>

            {addressSuccess && (
              <div className="auth-alert auth-alert-success" role="status">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>{addressSuccess}</span>
              </div>
            )}

            {addressError && (
              <div className="auth-alert auth-alert-error" role="alert">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{addressError}</span>
              </div>
            )}

            {addressesLoading ? (
              <div className="checkout-loading-state">
                <span className="btn-spinner"></span>
                <span>Loading your saved addresses...</span>
              </div>
            ) : (
              <>
                {/* Add or Edit Address Form */}
                {showAddressForm && (
                  <div className="profile-address-form-card" id="profile-address-form-box">
                    <h3 className="profile-address-form-title">
                      {editingAddressId ? 'Edit Delivery Address' : 'Add New Delivery Address'}
                    </h3>
                    <form onSubmit={handleSaveAddress} className="new-address-form" noValidate>
                      <div className="form-row">
                        {/* Recipient Full Name */}
                        <div className="form-group flex-1">
                          <label className="form-label" htmlFor="addr-recipient-name">
                            Recipient Full Name *
                          </label>
                          <input
                            type="text"
                            id="addr-recipient-name"
                            name="recipient_name"
                            value={addressForm.recipient_name}
                            onChange={handleAddressInputChange}
                            onBlur={handleAddressBlur}
                            className={`form-input ${addressTouched.recipient_name && addressFieldErrors.recipient_name ? 'input-error' : ''}`}
                            placeholder="e.g. Rahul Sharma"
                            required
                            aria-invalid={addressTouched.recipient_name && Boolean(addressFieldErrors.recipient_name)}
                            aria-describedby={addressFieldErrors.recipient_name ? 'addr-recipient-error' : undefined}
                          />
                          {addressTouched.recipient_name && addressFieldErrors.recipient_name && (
                            <span className="field-error-msg" id="addr-recipient-error" role="alert">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                              </svg>
                              {addressFieldErrors.recipient_name}
                            </span>
                          )}
                        </div>

                        {/* Contact Phone Number */}
                        <div className="form-group flex-1">
                          <label className="form-label" htmlFor="addr-phone">
                            Contact Phone Number *
                          </label>
                          <input
                            type="tel"
                            inputMode="numeric"
                            pattern="[6-9][0-9]{9}"
                            maxLength={10}
                            id="addr-phone"
                            name="phone"
                            value={addressForm.phone}
                            onChange={handleAddressInputChange}
                            onBlur={handleAddressBlur}
                            className={`form-input ${addressTouched.phone && addressFieldErrors.phone ? 'input-error' : ''}`}
                            placeholder="e.g. 9876543210"
                            required
                            aria-invalid={addressTouched.phone && Boolean(addressFieldErrors.phone)}
                            aria-describedby={addressFieldErrors.phone ? 'addr-phone-error' : 'addr-phone-hint'}
                          />
                          <span className="form-field-hint" id="addr-phone-hint">
                            10-digit Indian mobile number (numbers only, starts with 6-9).
                          </span>
                          {addressTouched.phone && addressFieldErrors.phone && (
                            <span className="field-error-msg" id="addr-phone-error" role="alert">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                              </svg>
                              {addressFieldErrors.phone}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Street Address Line 1 */}
                      <div className="form-group">
                        <label className="form-label" htmlFor="addr-line1">
                          Street Address / Flat / Building *
                        </label>
                        <input
                          type="text"
                          id="addr-line1"
                          name="line1"
                          value={addressForm.line1}
                          onChange={handleAddressInputChange}
                          onBlur={handleAddressBlur}
                          className={`form-input ${addressTouched.line1 && addressFieldErrors.line1 ? 'input-error' : ''}`}
                          placeholder="e.g. Flat 402, Sneaker Residency, Linking Road"
                          required
                          aria-invalid={addressTouched.line1 && Boolean(addressFieldErrors.line1)}
                          aria-describedby={addressFieldErrors.line1 ? 'addr-line1-error' : undefined}
                        />
                        {addressTouched.line1 && addressFieldErrors.line1 && (
                          <span className="field-error-msg" id="addr-line1-error" role="alert">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                              <circle cx="12" cy="12" r="10"></circle>
                              <line x1="12" y1="8" x2="12" y2="12"></line>
                              <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            {addressFieldErrors.line1}
                          </span>
                        )}
                      </div>

                      {/* Area / Landmark (Line 2) */}
                      <div className="form-group">
                        <label className="form-label" htmlFor="addr-line2">
                          Area / Landmark (Optional)
                        </label>
                        <input
                          type="text"
                          id="addr-line2"
                          name="line2"
                          value={addressForm.line2}
                          onChange={handleAddressInputChange}
                          className="form-input"
                          placeholder="e.g. Near National College, Bandra West"
                        />
                      </div>

                      <div className="form-row">
                        {/* City */}
                        <div className="form-group flex-1">
                          <label className="form-label" htmlFor="addr-city">
                            City *
                          </label>
                          <input
                            type="text"
                            id="addr-city"
                            name="city"
                            value={addressForm.city}
                            onChange={handleAddressInputChange}
                            onBlur={handleAddressBlur}
                            className={`form-input ${addressTouched.city && addressFieldErrors.city ? 'input-error' : ''}`}
                            placeholder="e.g. Mumbai"
                            required
                            aria-invalid={addressTouched.city && Boolean(addressFieldErrors.city)}
                            aria-describedby={addressFieldErrors.city ? 'addr-city-error' : undefined}
                          />
                          {addressTouched.city && addressFieldErrors.city && (
                            <span className="field-error-msg" id="addr-city-error" role="alert">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                              </svg>
                              {addressFieldErrors.city}
                            </span>
                          )}
                        </div>

                        {/* State */}
                        <div className="form-group flex-1">
                          <label className="form-label" htmlFor="addr-state">
                            State *
                          </label>
                          <input
                            type="text"
                            id="addr-state"
                            name="state"
                            value={addressForm.state}
                            onChange={handleAddressInputChange}
                            onBlur={handleAddressBlur}
                            className={`form-input ${addressTouched.state && addressFieldErrors.state ? 'input-error' : ''}`}
                            placeholder="e.g. Maharashtra"
                            required
                            aria-invalid={addressTouched.state && Boolean(addressFieldErrors.state)}
                            aria-describedby={addressFieldErrors.state ? 'addr-state-error' : undefined}
                          />
                          {addressTouched.state && addressFieldErrors.state && (
                            <span className="field-error-msg" id="addr-state-error" role="alert">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                              </svg>
                              {addressFieldErrors.state}
                            </span>
                          )}
                        </div>

                        {/* PIN / Postal Code */}
                        <div className="form-group flex-1">
                          <label className="form-label" htmlFor="addr-postal-code">
                            PIN / Postal Code *
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[1-9][0-9]{5}"
                            maxLength={6}
                            minLength={6}
                            id="addr-postal-code"
                            name="postal_code"
                            value={addressForm.postal_code}
                            onChange={handleAddressInputChange}
                            onBlur={handleAddressBlur}
                            className={`form-input ${addressTouched.postal_code && addressFieldErrors.postal_code ? 'input-error' : ''}`}
                            placeholder="e.g. 400050"
                            required
                            aria-invalid={addressTouched.postal_code && Boolean(addressFieldErrors.postal_code)}
                            aria-describedby={addressFieldErrors.postal_code ? 'addr-postal-code-error' : 'addr-postal-hint'}
                          />
                          <span className="form-field-hint" id="addr-postal-hint">
                            6-digit Indian PIN code (numbers only).
                          </span>
                          {addressTouched.postal_code && addressFieldErrors.postal_code && (
                            <span className="field-error-msg" id="addr-postal-code-error" role="alert">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                              </svg>
                              {addressFieldErrors.postal_code}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="form-actions-row">
                        <button
                          type="submit"
                          className="btn-primary"
                          disabled={savingAddress}
                          id="save-profile-address-btn"
                        >
                          {savingAddress
                            ? 'Saving Address...'
                            : editingAddressId
                            ? 'Update Address'
                            : 'Save Address'}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={handleCancelAddressForm}
                          disabled={savingAddress}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Empty State when no addresses exist */}
                {!showAddressForm && addresses.length === 0 && (
                  <div className="profile-address-empty-state">
                    <div className="profile-address-empty-icon" aria-hidden="true">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                    </div>
                    <div className="profile-address-empty-title">No Saved Delivery Addresses</div>
                    <p className="profile-address-empty-desc">
                      You haven't saved any delivery addresses yet. Add your home, apartment, or office address for faster 1-click checkout on sneaker drops.
                    </p>
                    <button
                      type="button"
                      className="btn-primary-sm"
                      onClick={handleOpenAddAddress}
                      id="empty-add-address-btn"
                    >
                      + Add Your First Address
                    </button>
                  </div>
                )}

                {/* Saved Addresses List Grid */}
                {addresses.length > 0 && (
                  <div className="profile-addresses-grid">
                    {addresses.map((addr) => (
                      <div key={addr.id} className="profile-address-card" id={`profile-address-${addr.id}`}>
                        <div className="profile-address-card-top">
                          <div className="profile-address-recipient">
                            <span className="profile-address-name">{addr.recipient_name}</span>
                          </div>
                          {addr.phone && (
                            <div className="profile-address-phone">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                              </svg>
                              <span>{addr.phone}</span>
                            </div>
                          )}
                          <div className="profile-address-details">
                            <div className="profile-address-street">{addr.line1}</div>
                            {addr.line2 && <div className="profile-address-street">{addr.line2}</div>}
                            <div className="profile-address-citystate">
                              {addr.city}, {addr.state} - {addr.postal_code}
                            </div>
                            <div className="profile-address-citystate">{addr.country}</div>
                          </div>
                        </div>

                        <div className="profile-address-actions">
                          <button
                            type="button"
                            className="btn-address-action-edit"
                            onClick={() => handleOpenEditAddress(addr)}
                            id={`edit-address-btn-${addr.id}`}
                            title="Edit this address"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            className="btn-address-action-delete"
                            onClick={() => handleDeleteAddress(addr.id)}
                            id={`delete-address-btn-${addr.id}`}
                            disabled={deletingAddressId === addr.id}
                            title="Delete this address"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            <span>{deletingAddressId === addr.id ? 'Deleting...' : 'Delete'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Card 4: Security & Password */}
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
                  className={`form-input ${passwordTouched.currentPassword && passwordFieldErrors.currentPassword ? 'input-error' : ''}`}
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (passwordTouched.currentPassword) {
                      setPasswordFieldErrors((prev) => ({
                        ...prev,
                        currentPassword: e.target.value ? null : 'Current password is required.',
                      }));
                    }
                  }}
                  onBlur={() => {
                    setPasswordTouched((prev) => ({ ...prev, currentPassword: true }));
                    setPasswordFieldErrors((prev) => ({
                      ...prev,
                      currentPassword: currentPassword ? null : 'Current password is required.',
                    }));
                  }}
                  autoComplete="current-password"
                  required
                  aria-invalid={passwordTouched.currentPassword && Boolean(passwordFieldErrors.currentPassword)}
                  aria-describedby={passwordFieldErrors.currentPassword ? 'current-password-error' : undefined}
                />
                {passwordTouched.currentPassword && passwordFieldErrors.currentPassword && (
                  <span className="field-error-msg" id="current-password-error" role="alert">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    {passwordFieldErrors.currentPassword}
                  </span>
                )}
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
                  className={`form-input ${passwordTouched.newPassword && passwordFieldErrors.newPassword ? 'input-error' : ''}`}
                  placeholder="Enter new password (min. 8 characters)"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (passwordTouched.newPassword) {
                      setPasswordFieldErrors((prev) => ({
                        ...prev,
                        newPassword: validatePassword(e.target.value),
                      }));
                    }
                    if (passwordTouched.confirmNewPassword && confirmNewPassword) {
                      setPasswordFieldErrors((prev) => ({
                        ...prev,
                        confirmNewPassword: validateConfirmPassword(e.target.value, confirmNewPassword),
                      }));
                    }
                  }}
                  onBlur={() => {
                    setPasswordTouched((prev) => ({ ...prev, newPassword: true }));
                    setPasswordFieldErrors((prev) => ({
                      ...prev,
                      newPassword: validatePassword(newPassword),
                    }));
                  }}
                  autoComplete="new-password"
                  required
                  aria-invalid={passwordTouched.newPassword && Boolean(passwordFieldErrors.newPassword)}
                  aria-describedby={passwordFieldErrors.newPassword ? 'new-password-error' : undefined}
                />
                {passwordTouched.newPassword && passwordFieldErrors.newPassword && (
                  <span className="field-error-msg" id="new-password-error" role="alert">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    {passwordFieldErrors.newPassword}
                  </span>
                )}

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
                  className={`form-input ${passwordTouched.confirmNewPassword && passwordFieldErrors.confirmNewPassword ? 'input-error' : ''}`}
                  placeholder="Re-enter new password"
                  value={confirmNewPassword}
                  onChange={(e) => {
                    setConfirmNewPassword(e.target.value);
                    if (passwordTouched.confirmNewPassword) {
                      setPasswordFieldErrors((prev) => ({
                        ...prev,
                        confirmNewPassword: validateConfirmPassword(newPassword, e.target.value),
                      }));
                    }
                  }}
                  onBlur={() => {
                    setPasswordTouched((prev) => ({ ...prev, confirmNewPassword: true }));
                    setPasswordFieldErrors((prev) => ({
                      ...prev,
                      confirmNewPassword: validateConfirmPassword(newPassword, confirmNewPassword),
                    }));
                  }}
                  autoComplete="new-password"
                  required
                  aria-invalid={passwordTouched.confirmNewPassword && Boolean(passwordFieldErrors.confirmNewPassword)}
                  aria-describedby={passwordFieldErrors.confirmNewPassword ? 'confirm-new-password-error' : undefined}
                />
                {passwordTouched.confirmNewPassword && passwordFieldErrors.confirmNewPassword && (
                  <span className="field-error-msg" id="confirm-new-password-error" role="alert">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    {passwordFieldErrors.confirmNewPassword}
                  </span>
                )}
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
