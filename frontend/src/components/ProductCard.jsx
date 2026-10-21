import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatINR } from '../services/api';

export default function ProductCard({ product }) {
  const [imgError, setImgError] = useState(false);

  const fallbackImage =
    'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=600&q=80';

  return (
    <article className="product-card" id={`product-card-${product.id}`}>
      <Link to={`/products/${product.slug}`} className="product-card-link">
        {/* Product Image Media Container */}
        <div className="product-image-container">
          <img
            src={imgError || !product.image_url ? fallbackImage : product.image_url}
            alt={product.name}
            loading="lazy"
            className="product-image"
            onError={() => setImgError(true)}
          />

          {/* Status Badge */}
          <div className="product-badges">
            {product.in_stock ? (
              <span className="badge-stock in-stock">In Stock</span>
            ) : (
              <span className="badge-stock out-of-stock">Sold Out</span>
            )}
          </div>
        </div>

        {/* Product Info */}
        <div className="product-info">
          <div className="product-brand">{product.brand}</div>
          <h3 className="product-name" title={product.name}>
            {product.name}
          </h3>

          <div className="product-pricing">
            <span className="price-label">From</span>
            <span className="price-amount">{formatINR(product.price_from)}</span>
          </div>

          {/* Available Sizes Pills */}
          <div className="product-sizes-preview">
            {product.available_sizes && product.available_sizes.length > 0 ? (
              <div className="size-pill-list">
                {product.available_sizes.slice(0, 4).map((sz) => (
                  <span key={sz} className="size-pill">
                    {sz}
                  </span>
                ))}
                {product.available_sizes.length > 4 && (
                  <span className="size-pill-more">
                    +{product.available_sizes.length - 4}
                  </span>
                )}
              </div>
            ) : (
              <span className="no-sizes-text">Currently unavailable</span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
