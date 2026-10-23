import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatINR } from '../services/api';
import ChasingBlocksLoader from '../components/ChasingBlocksLoader';

export default function Cart() {
  const {
    items,
    totalUnits,
    subtotal,
    loading,
    mutatingItemId,
    error,
    clearError,
    fetchCart,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();

  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // 1. Unauthenticated Visitor State
  if (!isAuthenticated) {
    return (
      <div className="cart-page-wrapper">
        <div className="cart-container empty-state-container">
          <div className="cart-empty-card">
            <div className="empty-cart-icon" aria-hidden="true">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
            </div>
            <h1 className="empty-cart-title">Your Sneaker Bag is Waiting</h1>
            <p className="empty-cart-subtitle">
              Sign in to view your saved sneaker sizes, manage your cart, and secure your spot for limited drops.
            </p>
            <div className="empty-cart-actions">
              <Link
                to="/login"
                state={{ from: location }}
                className="btn-primary-cart"
                id="cart-signin-btn"
              >
                Sign In to View Bag
              </Link>
              <Link to="/products" className="btn-secondary-cart">
                Explore All Sneakers
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Loading State
  if (loading && items.length === 0) {
    return (
      <div className="cart-page-wrapper">
        <div className="cart-container loading-container">
          <ChasingBlocksLoader
            title="Loading Sneaker Bag"
            subtitle="Synchronizing your bag items, reserved sizes, and price totals..."
            fullPage
          />
        </div>
      </div>
    );
  }

  // 3. Authenticated Empty Cart State
  if (items.length === 0) {
    return (
      <div className="cart-page-wrapper">
        <div className="cart-container empty-state-container">
          <div className="cart-empty-card">
            <div className="empty-cart-icon" aria-hidden="true">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
            </div>
            <h1 className="empty-cart-title">Your Sneaker Bag is Empty</h1>
            <p className="empty-cart-subtitle">
              You haven't added any pairs to your bag yet. Check out the latest authentic drops and find your size.
            </p>
            <div className="empty-cart-actions">
              <Link to="/products" className="btn-primary-cart" id="empty-cart-explore-btn">
                Shop New Arrivals
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. Cart with Items
  return (
    <div className="cart-page-wrapper">
      <div className="cart-container">
        {/* Page Header */}
        <div className="cart-header-row">
          <div>
            <h1 className="cart-page-title">Shopping Bag</h1>
            <p className="cart-page-meta">
              {totalUnits} {totalUnits === 1 ? 'item' : 'items'} in your bag
            </p>
          </div>
          <button
            type="button"
            className="btn-clear-cart-text"
            onClick={() => setConfirmClearOpen(true)}
            id="clear-cart-btn"
          >
            Clear Entire Bag
          </button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="auth-alert auth-alert-error" role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{error}</span>
            <button
              onClick={() => {
                clearError();
                fetchCart();
              }}
              className="alert-retry-btn"
            >
              Retry
            </button>
          </div>
        )}

        {/* Clear Cart Confirmation Modal / Banner */}
        {confirmClearOpen && (
          <div className="cart-confirm-modal-overlay">
            <div className="cart-confirm-modal">
              <h3>Clear Shopping Bag?</h3>
              <p>Are you sure you want to remove all {totalUnits} items from your cart?</p>
              <div className="confirm-modal-actions">
                <button
                  type="button"
                  className="btn-danger-confirm"
                  onClick={async () => {
                    await clearCart();
                    setConfirmClearOpen(false);
                  }}
                  id="confirm-clear-btn"
                >
                  Yes, Clear Bag
                </button>
                <button
                  type="button"
                  className="btn-cancel-confirm"
                  onClick={() => setConfirmClearOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Two-Column Grid: Items List + Order Summary */}
        <div className="cart-content-grid">
          {/* Left Column: Cart Items List */}
          <div className="cart-items-column">
            {items.map((item) => {
              const isMutating = mutatingItemId === item.id;
              const isMaxQuantity = item.quantity >= 10 || item.quantity >= item.stock_quantity;
              const isMinQuantity = item.quantity <= 1;

              return (
                <div key={item.id} className={`cart-item-card ${isMutating ? 'is-mutating' : ''}`}>
                  {/* Thumbnail */}
                  <Link
                    to={item.product?.slug ? `/products/${item.product.slug}` : '#'}
                    className="cart-item-img-link"
                  >
                    <img
                      src={item.product?.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff'}
                      alt={item.product?.name || 'Sneaker'}
                      className="cart-item-img"
                    />
                  </Link>

                  {/* Details */}
                  <div className="cart-item-details">
                    <div className="cart-item-top-row">
                      <div>
                        {item.product?.brand && (
                          <span className="cart-item-brand">{item.product.brand}</span>
                        )}
                        <h2 className="cart-item-title">
                          <Link to={item.product?.slug ? `/products/${item.product.slug}` : '#'}>
                            {item.product?.name}
                          </Link>
                        </h2>
                      </div>
                      <span className="cart-item-line-total">
                        {formatINR(item.line_total)}
                      </span>
                    </div>

                    {/* Variant Specs */}
                    <div className="cart-item-specs">
                      <span className="spec-badge">Size: {item.size}</span>
                      <span className="spec-badge">Color: {item.color}</span>
                      <span className="cart-item-unit-price">
                        {formatINR(item.unit_price)} each
                      </span>
                    </div>

                    {/* Stock Notice if Low */}
                    {item.stock_quantity <= 3 && item.stock_quantity > 0 && (
                      <span className="low-stock-warning">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ verticalAlign: '-1px', marginRight: '4px' }}>
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                          <line x1="12" y1="9" x2="12" y2="13"></line>
                          <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        Only {item.stock_quantity} pairs remaining in stock
                      </span>
                    )}

                    {!item.available && (
                      <span className="unavailable-warning">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ verticalAlign: '-1px', marginRight: '4px' }}>
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="15" y1="9" x2="9" y2="15"></line>
                          <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                        This size combination is currently unavailable
                      </span>
                    )}

                    {/* Bottom Controls: Quantity + Remove */}
                    <div className="cart-item-controls-row">
                      <div className="cart-qty-picker" aria-label="Item quantity controls">
                        <button
                          type="button"
                          className="qty-btn"
                          disabled={isMinQuantity || isMutating}
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="qty-value">{item.quantity}</span>
                        <button
                          type="button"
                          className="qty-btn"
                          disabled={isMaxQuantity || isMutating}
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className="btn-remove-item"
                        disabled={isMutating}
                        onClick={() => removeItem(item.id)}
                        id={`remove-item-${item.id}`}
                      >
                        {isMutating ? 'Updating...' : 'Remove'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="continue-shopping-bar">
              <Link to="/products" className="continue-shopping-link">
                ← Continue Browsing Sneakers
              </Link>
            </div>
          </div>

          {/* Right Column: Order Summary Card */}
          <div className="cart-summary-column">
            <div className="order-summary-card">
              <h2 className="order-summary-title">Order Summary</h2>

              <div className="summary-breakdown">
                <div className="summary-row">
                  <span>Subtotal ({totalUnits} {totalUnits === 1 ? 'item' : 'items'})</span>
                  <span className="summary-val">{formatINR(subtotal)}</span>
                </div>
                <div className="summary-row">
                  <span>Estimated Delivery</span>
                  <span className="summary-free-badge">FREE</span>
                </div>
                <div className="summary-row">
                  <span>Authenticity Guarantee</span>
                  <span className="summary-verified-badge">Included</span>
                </div>

                <div className="summary-divider"></div>

                <div className="summary-row summary-total-row">
                  <span>Total Amount</span>
                  <span className="summary-total-val" id="cart-total-display">
                    {formatINR(subtotal)}
                  </span>
                </div>
              </div>

              {/* Active Checkout Action */}
              <div className="checkout-action-box">
                <Link
                  to="/checkout"
                  className="btn-checkout-cta"
                  id="checkout-button"
                  style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}
                >
                  Proceed to Checkout →
                </Link>
                <p className="checkout-phase-notice">
                  Guaranteed authentic sneakers with tracked express delivery.
                </p>
              </div>

              <div className="security-badges-row">
                <span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: '5px' }}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                  Verified Authentic
                </span>
                <span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: '5px' }}>
                    <rect x="1" y="3" width="15" height="13"></rect>
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                    <circle cx="5.5" cy="18.5" r="2.5"></circle>
                    <circle cx="18.5" cy="18.5" r="2.5"></circle>
                  </svg>
                  Express Delivery
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
