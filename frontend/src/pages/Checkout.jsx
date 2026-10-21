import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
  apiGetAddresses,
  apiCreateAddress,
  apiCreateOrder,
  formatINR,
} from '../services/api';

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, items, totalUnits, subtotal, resetCart } = useCart();

  // Address state
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);

  // New Address form state
  const [newAddress, setNewAddress] = useState({
    recipient_name: user?.name || '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
  });
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState('');

  // Order submission state
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');

  // Fetch saved delivery addresses
  useEffect(() => {
    let active = true;
    setLoadingAddresses(true);

    apiGetAddresses()
      .then((data) => {
        if (!active) return;
        const list = data.addresses || [];
        setAddresses(list);
        if (list.length > 0) {
          setSelectedAddressId(list[0].id);
        } else {
          setShowNewAddressForm(true);
        }
      })
      .catch((err) => {
        if (!active) return;
        setAddressError(
          err.response?.data?.error?.message || 'Failed to load saved addresses.'
        );
      })
      .finally(() => {
        if (active) setLoadingAddresses(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleAddressInputChange = (e) => {
    const { name, value } = e.target;
    setNewAddress((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    setAddressError('');

    if (!newAddress.recipient_name.trim()) {
      setAddressError('Recipient name is required.');
      return;
    }
    if (!newAddress.line1.trim()) {
      setAddressError('Address line 1 is required.');
      return;
    }
    if (!newAddress.city.trim() || !newAddress.state.trim() || !newAddress.postal_code.trim()) {
      setAddressError('City, State, and Postal Code are required.');
      return;
    }

    setSavingAddress(true);
    try {
      const data = await apiCreateAddress(newAddress);
      const created = data.address;
      setAddresses((prev) => [created, ...prev]);
      setSelectedAddressId(created.id);
      setShowNewAddressForm(false);
      // Reset form
      setNewAddress({
        recipient_name: user?.name || '',
        phone: '',
        line1: '',
        line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'India',
      });
    } catch (err) {
      setAddressError(
        err.response?.data?.error?.message || 'Failed to save address.'
      );
    } finally {
      setSavingAddress(false);
    }
  };

  const handlePlaceOrder = async () => {
    setOrderError('');

    if (!selectedAddressId) {
      setOrderError('Please select or add a delivery address to proceed.');
      return;
    }

    if (items.length === 0) {
      setOrderError('Your shopping bag is empty. Please add items before checking out.');
      return;
    }

    setSubmitting(true);
    try {
      const idempotencyKey =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `order-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const data = await apiCreateOrder({
        address_id: selectedAddressId,
        idempotency_key: idempotencyKey,
      });

      const order = data.order;
      // Reset client cart immediately
      resetCart();
      // Navigate to order confirmation
      navigate(`/order-confirmation/${order.id}`, { state: { order } });
    } catch (err) {
      setOrderError(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Failed to place order. Please review your cart and try again.'
      );
      setSubmitting(false);
    }
  };

  // If cart is empty, show empty checkout state
  if (!items || items.length === 0) {
    return (
      <div className="cart-page-wrapper">
        <div className="empty-cart-card">
          <div className="empty-cart-icon">🛍️</div>
          <h2>Your Shopping Bag is Empty</h2>
          <p>You cannot proceed to checkout without any sneakers in your shopping bag.</p>
          <div className="empty-cart-actions">
            <Link to="/products" className="btn-primary" id="checkout-browse-catalog-btn">
              Browse Sneaker Catalog →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page-container">
      <div className="checkout-header-section">
        <h1 className="checkout-page-title">Secure Checkout</h1>
        <p className="checkout-subtitle">
          Confirm your delivery destination and review your items.
        </p>
      </div>

      {orderError && (
        <div className="auth-alert auth-alert-error checkout-alert" role="alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{orderError}</span>
        </div>
      )}

      <div className="checkout-layout-grid">
        {/* Left Column: Delivery Address & Payment simulation */}
        <div className="checkout-main-column">
          {/* 1. Delivery Address Card */}
          <div className="checkout-card">
            <div className="card-header-row">
              <h2 className="card-heading">
                <span className="step-pill">1</span> Delivery Address
              </h2>
              {!showNewAddressForm && (
                <button
                  type="button"
                  className="btn-link-action"
                  onClick={() => setShowNewAddressForm(true)}
                  id="add-new-address-toggle-btn"
                >
                  + Add New Address
                </button>
              )}
            </div>

            {loadingAddresses ? (
              <div className="checkout-loading-state">
                <span className="btn-spinner"></span>
                <span>Loading delivery addresses...</span>
              </div>
            ) : (
              <>
                {/* Saved Addresses List */}
                {!showNewAddressForm && addresses.length > 0 && (
                  <div className="address-options-list">
                    {addresses.map((addr) => (
                      <label
                        key={addr.id}
                        className={`address-option-card ${
                          selectedAddressId === addr.id ? 'selected' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="selected_address"
                          value={addr.id}
                          checked={selectedAddressId === addr.id}
                          onChange={() => setSelectedAddressId(addr.id)}
                          className="address-radio-input"
                        />
                        <div className="address-card-body">
                          <div className="address-card-name">
                            <strong>{addr.recipient_name}</strong>
                            {addr.phone && <span className="address-phone"> • {addr.phone}</span>}
                          </div>
                          <div className="address-card-lines">
                            {addr.line1}
                            {addr.line2 ? `, ${addr.line2}` : ''}
                          </div>
                          <div className="address-card-city">
                            {addr.city}, {addr.state} - {addr.postal_code}, {addr.country}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {/* New Address Form */}
                {showNewAddressForm && (
                  <form onSubmit={handleSaveAddress} className="new-address-form" id="new-address-form">
                    {addressError && (
                      <div className="auth-alert auth-alert-error" role="alert">
                        <span>{addressError}</span>
                      </div>
                    )}

                    <div className="form-row">
                      <div className="form-group flex-1">
                        <label className="form-label" htmlFor="recipient_name">
                          Recipient Full Name *
                        </label>
                        <input
                          type="text"
                          id="recipient_name"
                          name="recipient_name"
                          value={newAddress.recipient_name}
                          onChange={handleAddressInputChange}
                          className="form-input"
                          placeholder="e.g. Rahul Sharma"
                          required
                        />
                      </div>
                      <div className="form-group flex-1">
                        <label className="form-label" htmlFor="phone">
                          Contact Phone Number
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={newAddress.phone}
                          onChange={handleAddressInputChange}
                          className="form-input"
                          placeholder="e.g. +91 98765 43210"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="line1">
                        Street Address / Flat / Building *
                      </label>
                      <input
                        type="text"
                        id="line1"
                        name="line1"
                        value={newAddress.line1}
                        onChange={handleAddressInputChange}
                        className="form-input"
                        placeholder="e.g. 42 Sneaker Street, Flat 4B"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="line2">
                        Area / Landmark (Optional)
                      </label>
                      <input
                        type="text"
                        id="line2"
                        name="line2"
                        value={newAddress.line2}
                        onChange={handleAddressInputChange}
                        className="form-input"
                        placeholder="e.g. Near Central Park, Bandra West"
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group flex-1">
                        <label className="form-label" htmlFor="city">
                          City *
                        </label>
                        <input
                          type="text"
                          id="city"
                          name="city"
                          value={newAddress.city}
                          onChange={handleAddressInputChange}
                          className="form-input"
                          placeholder="e.g. Mumbai"
                          required
                        />
                      </div>

                      <div className="form-group flex-1">
                        <label className="form-label" htmlFor="state">
                          State *
                        </label>
                        <input
                          type="text"
                          id="state"
                          name="state"
                          value={newAddress.state}
                          onChange={handleAddressInputChange}
                          className="form-input"
                          placeholder="e.g. Maharashtra"
                          required
                        />
                      </div>

                      <div className="form-group flex-1">
                        <label className="form-label" htmlFor="postal_code">
                          PIN / Postal Code *
                        </label>
                        <input
                          type="text"
                          id="postal_code"
                          name="postal_code"
                          value={newAddress.postal_code}
                          onChange={handleAddressInputChange}
                          className="form-input"
                          placeholder="e.g. 400050"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-actions-row">
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={savingAddress}
                        id="save-address-btn"
                      >
                        {savingAddress ? 'Saving Address...' : 'Save & Deliver Here'}
                      </button>
                      {addresses.length > 0 && (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setShowNewAddressForm(false)}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </>
            )}
          </div>

          {/* 2. Payment Method Simulation Notice */}
          <div className="checkout-card">
            <h2 className="card-heading">
              <span className="step-pill">2</span> Payment Method
            </h2>
            <div className="simulated-payment-box">
              <div className="simulated-payment-badge">
                <span className="badge-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                    <line x1="1" y1="10" x2="23" y2="10"></line>
                  </svg>
                </span>
                <strong>Test & Demonstration Payment Mode</strong>
              </div>
              <p className="simulated-payment-desc">
                No credit card or real financial transaction is required.
                Your order will be created and confirmed in our system with status <em>Confirmed</em> and payment status <em>Pending</em>.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & Place Order */}
        <div className="checkout-summary-column">
          <div className="order-summary-card">
            <h2 className="summary-title">Order Summary ({totalUnits} {totalUnits === 1 ? 'item' : 'items'})</h2>

            {/* Items Mini-list */}
            <div className="checkout-items-preview">
              {items.map((item) => (
                <div key={item.id} className="checkout-item-row">
                  <div className="checkout-item-thumb">
                    {item.product?.image ? (
                      <img src={item.product.image} alt={item.product.name} />
                    ) : (
                      <div className="item-thumb-fallback" aria-hidden="true">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M2 18h20v2H2v-2zm1.15-4.05L4 9l4 1 3-4 6 2 4.85 5.95H3.15z"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="checkout-item-info">
                    <div className="checkout-item-title">{item.product?.name}</div>
                    <div className="checkout-item-variant">
                      Size: <strong>{item.size}</strong> • Color: <strong>{item.color}</strong>
                    </div>
                    <div className="checkout-item-qty">
                      Qty: <strong>{item.quantity}</strong> × {formatINR(item.unit_price)}
                    </div>
                  </div>
                  <div className="checkout-item-total">
                    {formatINR(item.line_total)}
                  </div>
                </div>
              ))}
            </div>

            <div className="summary-divider"></div>

            <div className="summary-row">
              <span>Bag Subtotal</span>
              <span className="summary-val">{formatINR(subtotal)}</span>
            </div>

            <div className="summary-row">
              <span>Estimated Shipping</span>
              <span className="summary-val highlight-green">FREE</span>
            </div>

            <div className="summary-divider"></div>

            <div className="summary-total-row">
              <span>Order Total</span>
              <span className="summary-total-val" id="checkout-order-total">{formatINR(subtotal)}</span>
            </div>

            <button
              type="button"
              className="btn-checkout-cta"
              id="place-order-btn"
              disabled={submitting || !selectedAddressId || items.length === 0}
              onClick={handlePlaceOrder}
            >
              {submitting ? (
                <span className="btn-spinner-content">
                  <span className="btn-spinner"></span>
                  <span>Placing Your Order...</span>
                </span>
              ) : (
                `Place Order • ${formatINR(subtotal)}`
              )}
            </button>

            <div className="summary-guarantee-note">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: '5px' }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <span>100% Verified Authentic • Safe Checkout</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
