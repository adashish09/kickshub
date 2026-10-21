import React, { useState, useEffect } from 'react';

export default function ProductFilters({
  filters,
  categories,
  availableBrands = ['Nike', 'Adidas', 'Jordan', 'Puma'],
  availableSizes = ['UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
  onFilterChange,
  onResetFilters,
  mobileOpen = false,
  onCloseMobile,
}) {
  const [minPriceInput, setMinPriceInput] = useState(filters.min_price || '');
  const [maxPriceInput, setMaxPriceInput] = useState(filters.max_price || '');
  const [searchInput, setSearchInput] = useState(filters.search || '');

  // Keep local inputs synchronized with parent filters
  useEffect(() => {
    setMinPriceInput(filters.min_price || '');
    setMaxPriceInput(filters.max_price || '');
    setSearchInput(filters.search || '');
  }, [filters]);

  const handlePriceApply = (e) => {
    e.preventDefault();
    onFilterChange({
      min_price: minPriceInput ? minPriceInput.trim() : '',
      max_price: maxPriceInput ? maxPriceInput.trim() : '',
    });
    if (onCloseMobile) onCloseMobile();
  };

  const handleSearchApply = (e) => {
    e.preventDefault();
    onFilterChange({ search: searchInput.trim() });
  };

  const handleSearchClear = () => {
    setSearchInput('');
    onFilterChange({ search: '' });
  };

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.brand ||
    filters.category ||
    filters.size ||
    filters.min_price ||
    filters.max_price ||
    filters.in_stock
  );

  return (
    <>
      {mobileOpen && (
        <div
          className="filters-backdrop"
          onClick={onCloseMobile}
          role="presentation"
        />
      )}

      <aside
        className={`filters-sidebar ${mobileOpen ? 'is-mobile-open' : ''}`}
        aria-label="Product filters"
      >
        <div className="filters-header">
          <div className="filters-title-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            <h2 className="filters-heading">Refine Drops</h2>
          </div>

          <div className="filters-header-actions">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                className="btn-reset-filters"
                id="btn-reset-filters"
              >
                Reset
              </button>
            )}
            {onCloseMobile && (
              <button
                type="button"
                className="btn-close-filters-mobile"
                onClick={onCloseMobile}
                aria-label="Close filters"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* 1. Search Query Filter */}
        <div className="filter-group">
          <label htmlFor="filter-search" className="filter-label">Search Keyword</label>
          <form onSubmit={handleSearchApply} className="filter-search-form-group">
            <div className="filter-search-box">
              <span className="filter-search-icon" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
              <input
                id="filter-search"
                type="text"
                placeholder="Model, brand, silhouette..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="filter-input filter-input-with-icon"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleSearchClear}
                  className="filter-clear-btn"
                  aria-label="Clear search text"
                  title="Clear search"
                >
                  ×
                </button>
              )}
            </div>
            <button
              type="submit"
              className="btn-filter-search-action"
              id="filter-search-submit-btn"
              aria-label="Apply keyword search"
            >
              Search
            </button>
          </form>
        </div>

        {/* 2. In Stock Only Toggle */}
        <div className="filter-group">
          <label className="checkbox-label" htmlFor="filter-in-stock">
            <input
              id="filter-in-stock"
              type="checkbox"
              checked={Boolean(filters.in_stock)}
              onChange={(e) => onFilterChange({ in_stock: e.target.checked ? 'true' : '' })}
            />
            <span className="checkbox-custom"></span>
            <span className="checkbox-text">In-stock sneakers only</span>
          </label>
        </div>

        {/* 3. Category Filter */}
        <div className="filter-group">
          <h3 className="filter-title">Category</h3>
          <div className="filter-options-list">
            <button
              type="button"
              className={`filter-chip ${!filters.category ? 'active' : ''}`}
              onClick={() => onFilterChange({ category: '' })}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`filter-chip ${filters.category === cat.slug ? 'active' : ''}`}
                onClick={() => onFilterChange({ category: cat.slug })}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Brand Filter */}
        <div className="filter-group">
          <h3 className="filter-title">Brand</h3>
          <div className="filter-options-list">
            <button
              type="button"
              className={`filter-chip ${!filters.brand ? 'active' : ''}`}
              onClick={() => onFilterChange({ brand: '' })}
            >
              All Brands
            </button>
            {availableBrands.map((brandName) => (
              <button
                key={brandName}
                type="button"
                className={`filter-chip ${filters.brand?.toLowerCase() === brandName.toLowerCase() ? 'active' : ''}`}
                onClick={() => onFilterChange({ brand: brandName })}
              >
                {brandName}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Size Filter */}
        <div className="filter-group">
          <h3 className="filter-title">Size (UK)</h3>
          <div className="size-selector-grid">
            {availableSizes.map((sz) => (
              <button
                key={sz}
                type="button"
                className={`size-btn ${filters.size === sz ? 'active' : ''}`}
                onClick={() => onFilterChange({ size: filters.size === sz ? '' : sz })}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>

        {/* 6. Price Range Filter */}
        <div className="filter-group">
          <h3 className="filter-title">Price Range (₹)</h3>
          <form onSubmit={handlePriceApply} className="price-filter-form">
            <div className="price-inputs">
              <input
                type="number"
                placeholder="Min"
                min="0"
                step="10"
                value={minPriceInput}
                onChange={(e) => setMinPriceInput(e.target.value)}
                className="price-input"
                aria-label="Minimum price"
              />
              <span className="price-separator">–</span>
              <input
                type="number"
                placeholder="Max"
                min="0"
                step="10"
                value={maxPriceInput}
                onChange={(e) => setMaxPriceInput(e.target.value)}
                className="price-input"
                aria-label="Maximum price"
              />
            </div>
            <button type="submit" className="btn-apply-price">
              Apply
            </button>
          </form>
        </div>

        {/* Mobile footer apply button */}
        {onCloseMobile && (
          <div className="filters-mobile-bottom-bar">
            <button
              type="button"
              className="btn-primary btn-apply-mobile"
              onClick={onCloseMobile}
            >
              View Results
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
