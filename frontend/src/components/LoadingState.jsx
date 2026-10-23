import React from 'react';
import ChasingBlocksLoader from './ChasingBlocksLoader';

export default function LoadingState({
  count = 8,
  title,
  subtitle,
  hideSkeletons = false,
}) {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  return (
    <div className="catalog-loading-wrapper">
      {/* Dynamic Chasing Blocks kinetic loader with cold-start feedback */}
      <ChasingBlocksLoader title={title} subtitle={subtitle} size="md" />

      {/* Sneaker card skeleton preview grid */}
      {!hideSkeletons && (
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
      )}
    </div>
  );
}
