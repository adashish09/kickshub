import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatINR } from '../services/api';

export default function MiniCartDrawer() {
  const { isDrawerOpen, closeDrawer, drawerItem, subtotal, totalUnits } = useCart();
  const drawerRef = useRef(null);
  const closeBtnRef = useRef(null);
  const navigate = useNavigate();

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        closeDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, closeDrawer]);

  // Focus close button on open
  useEffect(() => {
    if (isDrawerOpen && closeBtnRef.current) {
      closeBtnRef.current.focus();
    }
  }, [isDrawerOpen]);

  if (!isDrawerOpen) return null;

  const product = drawerItem?.product || {};
  const variant = drawerItem?.variant || {};
  const quantityAdded = drawerItem?.quantityAdded || 1;
  const variantQuantity = drawerItem?.variantQuantity || 1;

  const handleViewBag = () => {
    closeDrawer();
    navigate('/cart');
  };

  const fallbackImage =
    'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=600&q=80';

  return (
    <div className="mini-cart-overlay" onClick={closeDrawer} role="presentation">
      <div
        className="mini-cart-drawer"
        ref={drawerRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mini-cart-title"
      >
        {/* Drawer Header */}
        <div className="mini-cart-header">
          <div className="mini-cart-title-group">
            <span className="mini-cart-check-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </span>
            <h2 id="mini-cart-title" className="mini-cart-heading">Added to Bag</h2>
          </div>
          <button
            type="button"
            className="mini-cart-close-btn"
            onClick={closeDrawer}
            ref={closeBtnRef}
            aria-label="Close cart drawer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Added Item Preview */}
        <div className="mini-cart-item-preview">
          <div className="mini-cart-thumb-box">
            <img
              src={product.image_url || fallbackImage}
              alt={product.name || 'Sneaker'}
              className="mini-cart-thumb"
              onError={(e) => {
                e.currentTarget.src = fallbackImage;
              }}
            />
          </div>
          <div className="mini-cart-info">
            {product.brand && <span className="mini-cart-brand">{product.brand}</span>}
            <h3 className="mini-cart-item-title">{product.name}</h3>
            <div className="mini-cart-variant-tags">
              <span className="mini-tag">Size: <strong>{variant.size}</strong></span>
              <span className="mini-tag">Color: <strong>{variant.color}</strong></span>
            </div>
            <div className="mini-cart-price-line">
              <span className="mini-cart-unit-price">
                {formatINR(variant.price || product.price_from)}
              </span>
            </div>
          </div>
        </div>

        {/* Dual-Metric Quantity Confirmation Banner */}
        <div className="mini-cart-feedback-banner" role="status">
          <span className="feedback-pill-added">
            Added +{quantityAdded}
          </span>
          <span className="feedback-variant-total">
            You now have <strong>{variantQuantity}</strong> of this exact size & color in your bag
          </span>
        </div>

        {/* Bag Summary Section */}
        <div className="mini-cart-summary">
          <div className="mini-cart-subtotal-row">
            <span>Bag Subtotal ({totalUnits} {totalUnits === 1 ? 'item' : 'items'})</span>
            <span className="mini-cart-subtotal-val">{formatINR(subtotal)}</span>
          </div>
          <p className="mini-cart-shipping-note">Free express delivery & hand-verified authenticity included.</p>
        </div>

        {/* Actions */}
        <div className="mini-cart-actions">
          <button
            type="button"
            className="btn-mini-cart-primary"
            onClick={handleViewBag}
            id="mini-cart-view-bag-btn"
          >
            View Shopping Bag ({totalUnits}) →
          </button>
          <button
            type="button"
            className="btn-mini-cart-secondary"
            onClick={closeDrawer}
            id="mini-cart-continue-btn"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
