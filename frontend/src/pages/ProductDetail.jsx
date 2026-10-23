import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { getProductBySlug, formatINR } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import ChasingBlocksLoader from '../components/ChasingBlocksLoader';

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { addItem, getVariantQuantity } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Variant Selection State
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [activeVariant, setActiveVariant] = useState(null);
  const [imgError, setImgError] = useState(false);

  // Real-time Cart Feedback State (Part A)
  const [adding, setAdding] = useState(false);
  const [addSuccessMessage, setAddSuccessMessage] = useState('');
  const [addErrorMessage, setAddErrorMessage] = useState('');
  const [feedbackInfo, setFeedbackInfo] = useState(null); // { variantId, addedQty, newTotal }

  // Current authoritative bag quantity for the active variant
  const currentVariantInBag = activeVariant ? getVariantQuantity(activeVariant.id) : 0;

  // When changing variants, clear previous variant's feedback
  useEffect(() => {
    setAddSuccessMessage('');
    setAddErrorMessage('');
    setFeedbackInfo(null);
  }, [activeVariant?.id]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    getProductBySlug(slug, controller.signal)
      .then((data) => {
        if (!active) return;
        setProduct(data);

        // Pre-select first in-stock variant color and size if available
        const variants = data.variants || [];
        const firstAvailable = variants.find((v) => v.in_stock) || variants[0];
        if (firstAvailable) {
          setSelectedColor(firstAvailable.color);
          setSelectedSize(firstAvailable.size);
          setActiveVariant(firstAvailable);
        }
        setError(null);
      })
      .catch((err) => {
        if (!active || err.name === 'CanceledError') return;
        if (err.response?.status === 404) {
          setError('PRODUCT_NOT_FOUND');
        } else {
          setError(
            err.response?.data?.error?.message ||
            err.friendlyMessage ||
            err.message ||
            'Error loading product details.'
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [slug]);

  // Available unique colors for this product
  const availableColors = React.useMemo(() => {
    if (!product?.variants) return [];
    return Array.from(new Set(product.variants.map((v) => v.color)));
  }, [product]);

  // Available unique sizes for this product
  const availableSizes = React.useMemo(() => {
    if (!product?.variants) return [];
    return Array.from(new Set(product.variants.map((v) => v.size)));
  }, [product]);

  // Resolve matching variant whenever color or size changes
  useEffect(() => {
    if (!product?.variants) return;
    const match = product.variants.find(
      (v) => v.color === selectedColor && v.size === selectedSize
    );
    setActiveVariant(match || null);
  }, [product, selectedColor, selectedSize]);

  // Handle color change: auto-select available size if current size isn't available in new color
  const handleColorChange = (newColor) => {
    setSelectedColor(newColor);
    if (!product?.variants) return;
    const availableInNewColor = product.variants.filter((v) => v.color === newColor);
    const sameSize = availableInNewColor.find((v) => v.size === selectedSize);
    if (!sameSize) {
      const firstInStock = availableInNewColor.find((v) => v.in_stock) || availableInNewColor[0];
      if (firstInStock) {
        setSelectedSize(firstInStock.size);
      }
    }
  };

  // Check if a size is in stock for currently selected color
  const isSizeInStockForColor = (sizeStr) => {
    if (!product?.variants) return false;
    const match = product.variants.find(
      (v) => v.color === selectedColor && v.size === sizeStr
    );
    return match ? match.in_stock : false;
  };

  // Check if a combination exists at all
  const doesSizeExistForColor = (sizeStr) => {
    if (!product?.variants) return false;
    return product.variants.some((v) => v.color === selectedColor && v.size === sizeStr);
  };

  const handleBackToCatalog = () => {
    // If navigation has a previous state, navigate(-1), otherwise go to /products
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/products');
    }
  };

  const handleAddToCart = async () => {
    setAddErrorMessage('');

    if (!selectedSize) {
      setAddErrorMessage('Please select a size before adding to bag.');
      return;
    }

    if (!activeVariant) {
      setAddErrorMessage('The selected size combination is unavailable.');
      return;
    }

    if (!activeVariant.in_stock || activeVariant.stock_quantity <= 0) {
      setAddErrorMessage('This size is currently sold out.');
      return;
    }

    // Check stock limit against current in-bag units
    if (currentVariantInBag >= activeVariant.stock_quantity) {
      setAddErrorMessage(
        `All available stock for this size (${activeVariant.stock_quantity} available) is already in your bag.`
      );
      return;
    }

    // Check maximum configured line limit (10)
    if (currentVariantInBag >= 10) {
      setAddErrorMessage('You have reached the maximum allowed limit of 10 pairs for this size.');
      return;
    }

    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }

    // Prevent duplicate clicks while pending
    if (adding) return;

    setAdding(true);
    const res = await addItem(activeVariant.id, 1, {
      product,
      variant: activeVariant,
    });
    setAdding(false);

    if (res.success) {
      const added = res.quantityAdded || 1;
      const total = res.variantQuantity || (currentVariantInBag + added);

      setFeedbackInfo({
        variantId: activeVariant.id,
        addedQty: added,
        newTotal: total,
      });

      // Supporting message:
      const msg =
        total === 1
          ? 'Added 1 pair. You now have 1 of this size and color in your bag.'
          : `Added ${added} more pair${added > 1 ? 's' : ''}. You now have ${total} of this size and color in your bag.`;

      setAddSuccessMessage(msg);
    } else {
      setAddErrorMessage(res.error || 'Failed to add item to bag.');
    }
  };


  // 1. Loading State
  if (loading) {
    return (
      <div className="product-detail-container loading-container">
        <ChasingBlocksLoader
          title="Loading Sneaker Details"
          subtitle="Retrieving real-time size availability, high-res angles, and variant pricing..."
          size="md"
        />
        <div className="detail-skeleton">
          <div className="skeleton-detail-img"></div>
          <div className="skeleton-detail-info">
            <div className="skeleton-line line-short"></div>
            <div className="skeleton-line line-title"></div>
            <div className="skeleton-line line-price"></div>
            <div className="skeleton-box"></div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Not Found 404 State
  if (error === 'PRODUCT_NOT_FOUND' || !product) {
    return (
      <div className="product-detail-container not-found-container">
        <div className="not-found-card">
          <div className="not-found-icon" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
          <h1 className="not-found-title">Sneaker Not Found</h1>
          <p className="not-found-text">
            The sneaker model "<strong>{slug}</strong>" could not be found or has been retired from our active catalog.
          </p>
          <Link to="/products" className="btn-primary">
            ← Return to All Sneakers
          </Link>
        </div>
      </div>
    );
  }

  // 3. Generic Error State
  if (error) {
    return (
      <div className="product-detail-container error-container">
        <div className="not-found-card">
          <div className="not-found-icon" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <h1 className="not-found-title">Error Loading Sneaker</h1>
          <p className="not-found-text">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const fallbackImage =
    'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=800&q=80';

  const displayedPrice = activeVariant ? activeVariant.price : product.price_from;
  const isAvailable = activeVariant ? activeVariant.in_stock : product.in_stock;

  return (
    <div className="product-detail-page">
      {/* Breadcrumb Navigation */}
      <nav className="detail-breadcrumb" aria-label="Breadcrumb">
        <button type="button" onClick={handleBackToCatalog} className="breadcrumb-back-btn">
          ← Back to Catalog
        </button>
        <span className="breadcrumb-separator">/</span>
        <Link to="/products">All Sneakers</Link>
        {product.category && (
          <>
            <span className="breadcrumb-separator">/</span>
            <Link to={`/products?category=${product.category.slug}`}>{product.category.name}</Link>
          </>
        )}
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{product.name}</span>
      </nav>

      <div className="product-detail-grid">
        {/* Left Column: Product Photography */}
        <div className="detail-media-column">
          <div className="detail-image-card">
            <img
              src={imgError || !product.image_url ? fallbackImage : product.image_url}
              alt={product.name}
              className="detail-main-image"
              onError={() => setImgError(true)}
            />
            {/* Authenticity Watermark */}
            <div className="auth-watermark">
              <span>✓ 100% Verified Authentic</span>
            </div>
          </div>
        </div>

        {/* Right Column: Information, Variant Pickers & CTA */}
        <div className="detail-info-column">
          <div className="detail-brand-badge">{product.brand}</div>
          <h1 className="detail-title">{product.name}</h1>

          {/* Pricing & Stock Status */}
          <div className="detail-price-row">
            <div className="detail-price-display">
              <span className="detail-currency-amount">{formatINR(displayedPrice)}</span>
              {!activeVariant && <span className="starting-tag">Starting price</span>}
            </div>

            <div className="detail-stock-indicator">
              {isAvailable ? (
                <span className="stock-pill in-stock">
                  <span className="pulse-dot"></span> In Stock
                </span>
              ) : (
                <span className="stock-pill out-of-stock">
                  <span className="pulse-dot red"></span> Out of Stock
                </span>
              )}
            </div>
          </div>

          {/* SKU & Category Metadata */}
          <div className="detail-metadata-strip">
            {activeVariant && (
              <div className="meta-pill">
                <span>SKU:</span> <strong>{activeVariant.sku}</strong>
              </div>
            )}
            {product.category && (
              <div className="meta-pill">
                <span>Category:</span> <strong>{product.category.name}</strong>
              </div>
            )}
          </div>

          {/* Colorway Selector */}
          {availableColors.length > 1 && (
            <div className="variant-selection-group">
              <label className="selection-label">
                Colorway: <strong>{selectedColor}</strong>
              </label>
              <div className="color-options-list">
                {availableColors.map((colorName) => (
                  <button
                    key={colorName}
                    type="button"
                    className={`color-chip-btn ${selectedColor === colorName ? 'selected' : ''}`}
                    onClick={() => handleColorChange(colorName)}
                  >
                    {colorName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size Selector */}
          <div className="variant-selection-group">
            <div className="size-label-row">
              <label className="selection-label">
                Select Size (UK): <strong>{selectedSize || 'Choose Size'}</strong>
              </label>
              <span className="size-guide-hint">Standard UK Sizing</span>
            </div>

            <div className="size-selection-grid">
              {availableSizes.map((sz) => {
                const exists = doesSizeExistForColor(sz);
                const inStock = isSizeInStockForColor(sz);
                const isSelected = selectedSize === sz;

                return (
                  <button
                    key={sz}
                    type="button"
                    disabled={!exists}
                    className={`size-tile ${isSelected ? 'selected' : ''} ${!inStock ? 'out-of-stock' : ''}`}
                    onClick={() => setSelectedSize(sz)}
                    title={!exists ? 'Combination not produced' : !inStock ? 'Sold Out in this size' : `Select ${sz}`}
                  >
                    <span className="size-tile-val">{sz}</span>
                    {!inStock && <span className="size-tile-status">Sold Out</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Add to Cart Actions */}
          <div className="detail-action-group">
            {/* Persistent In-Bag Indicator for current variant */}
            {currentVariantInBag > 0 && (
              <div className="variant-bag-indicator" id="variant-bag-indicator" role="status">
                <span className="indicator-dot"></span>
                <span>
                  <strong>{currentVariantInBag}</strong> of this exact size & color currently in your bag
                </span>
              </div>
            )}

            {addSuccessMessage && (
              <div className="auth-alert auth-alert-success detail-cart-toast" role="status" aria-live="polite">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <div className="toast-text-group">
                  <span>{addSuccessMessage}</span>
                  <Link to="/cart" className="toast-view-cart-link" id="view-bag-link">
                    View Shopping Bag →
                  </Link>
                </div>
              </div>
            )}

            {addErrorMessage && (
              <div className="auth-alert auth-alert-error detail-cart-toast" role="alert" aria-live="polite">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{addErrorMessage}</span>
              </div>
            )}

            <button
              type="button"
              id="add-to-cart-btn"
              className={`btn-add-cart ${!activeVariant || !activeVariant.in_stock ? 'disabled' : ''} ${feedbackInfo?.variantId === activeVariant?.id ? 'btn-added-feedback' : ''}`}
              disabled={!activeVariant || !activeVariant.in_stock || adding}
              onClick={handleAddToCart}
              aria-live="polite"
            >
              {adding ? (
                <span className="btn-spinner-content">
                  <span className="btn-spinner"></span>
                  <span>Adding...</span>
                </span>
              ) : !selectedSize ? (
                'Select a Size to Add'
              ) : activeVariant && !activeVariant.in_stock ? (
                'Sold Out in This Size'
              ) : feedbackInfo?.variantId === activeVariant?.id ? (
                <>
                  <span className="cart-action-icon">✓</span>
                  <span>Added {feedbackInfo.addedQty} · {feedbackInfo.newTotal} in bag</span>
                </>
              ) : currentVariantInBag > 0 ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                  </svg>
                  <span>Add to Bag · {currentVariantInBag} in bag • {formatINR(activeVariant?.price || product.price_from)}</span>
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                  </svg>
                  <span>Add to Bag • {formatINR(activeVariant?.price || product.price_from)}</span>
                </>
              )}
            </button>

            {!isAuthenticated && (
              <p className="cart-phase-notice">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: '-1px', marginRight: '5px' }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                You will be asked to sign in to save this pair to your personal bag.
              </p>
            )}
          </div>

          {/* Product Description */}
          {product.description && (
            <div className="detail-description-box">
              <h3 className="description-heading">Product Overview</h3>
              <p className="description-text">{product.description}</p>
            </div>
          )}

          {/* Specs List */}
          <div className="detail-specs-list">
            <div className="spec-row">
              <span className="spec-name">Authenticity</span>
              <span className="spec-val">100% Brand New & Verified</span>
            </div>
            <div className="spec-row">
              <span className="spec-name">Packaging</span>
              <span className="spec-val">Original Manufacturer Box</span>
            </div>
            <div className="spec-row">
              <span className="spec-name">Inventory Standard</span>
              <span className="spec-val">Size-Specific SKU Tracking</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
