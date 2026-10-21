import React from 'react';

export default function ProductSort({
  currentSort = 'newest',
  onSortChange,
  totalItems = 0,
  onToggleFilters,
  activeFilterCount = 0,
}) {
  const sortOptions = [
    { value: 'newest', label: 'Newest Releases' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'name_asc', label: 'Name: A to Z' },
  ];

  return (
    <div className="catalog-toolbar">
      <div className="toolbar-left-group">
        {onToggleFilters && (
          <button
            type="button"
            className="btn-mobile-filters-trigger"
            onClick={onToggleFilters}
            aria-label="Open filter options"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="filter-count-badge">{activeFilterCount}</span>
            )}
          </button>
        )}
        <div className="results-count">
          <strong>{totalItems}</strong> {totalItems === 1 ? 'Sneaker' : 'Sneakers'}
        </div>
      </div>

      <div className="sort-container">
        <label htmlFor="product-sort-select" className="sort-label">
          Sort by:
        </label>
        <select
          id="product-sort-select"
          value={currentSort}
          onChange={(e) => onSortChange(e.target.value)}
          className="sort-select"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
