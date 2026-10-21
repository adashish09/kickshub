import React from 'react';

export default function LoadingState({ count = 8 }) {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  return (
    <div className="product-grid skeleton-grid" aria-label="Loading products">
      {skeletons.map((n) => (
        <div key={n} className="skeleton-card">
          <div className="skeleton-image"></div>
          <div className="skeleton-content">
            <div className="skeleton-line line-short"></div>
            <div className="skeleton-line line-title"></div>
            <div className="skeleton-line line-price"></div>
            <div className="skeleton-pills"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
