import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductFilters from '../components/ProductFilters';
import ProductSort from '../components/ProductSort';
import ProductGrid from '../components/ProductGrid';
import Pagination from '../components/Pagination';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { getProducts, getCategories } from '../services/api';

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState([]);
  const [productsData, setProductsData] = useState({ items: [], pagination: { page: 1, limit: 12, total: 0, pages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Extract filter params from current URL search params
  const currentFilters = useMemo(() => {
    return {
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '12', 10),
      search: searchParams.get('search') || '',
      brand: searchParams.get('brand') || '',
      category: searchParams.get('category') || '',
      size: searchParams.get('size') || '',
      min_price: searchParams.get('min_price') || '',
      max_price: searchParams.get('max_price') || '',
      sort: searchParams.get('sort') || 'newest',
      in_stock: searchParams.get('in_stock') || '',
    };
  }, [searchParams]);

  // Load available categories once on mount
  useEffect(() => {
    let active = true;
    getCategories()
      .then((cats) => {
        if (active) setCategories(cats);
      })
      .catch((err) => {
        console.error('Failed to load categories', err);
      });
    return () => {
      active = false;
    };
  }, []);

  // Fetch products whenever URL query params change
  const fetchProducts = useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    getProducts(currentFilters, controller.signal)
      .then((data) => {
        setProductsData(data);
        setError(null);
      })
      .catch((err) => {
        if (err.name !== 'CanceledError') {
          const msg = err.response?.data?.error?.message || err.friendlyMessage || err.message || 'Unable to retrieve catalog products.';
          setError(msg);
        }
      })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, [currentFilters]);

  useEffect(() => {
    const cancel = fetchProducts();
    return cancel;
  }, [fetchProducts]);

  // Handle individual or multiple filter updates
  const handleFilterChange = (newFilterValues) => {
    const updated = new URLSearchParams(searchParams);

    // Apply updates
    Object.entries(newFilterValues).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        updated.set(key, val);
      } else {
        updated.delete(key);
      }
    });

    // Reset page to 1 on filter changes unless changing page directly
    if (!('page' in newFilterValues)) {
      updated.set('page', '1');
    }

    setSearchParams(updated);
  };

  const handleSortChange = (newSort) => {
    handleFilterChange({ sort: newSort, page: '1' });
  };

  const handlePageChange = (newPage) => {
    const updated = new URLSearchParams(searchParams);
    updated.set('page', String(newPage));
    setSearchParams(updated);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetFilters = () => {
    // Preserve only sort option if desired, or clear everything
    const updated = new URLSearchParams();
    if (currentFilters.sort && currentFilters.sort !== 'newest') {
      updated.set('sort', currentFilters.sort);
    }
    setSearchParams(updated);
  };

  const removeSingleFilter = (key) => {
    const updated = new URLSearchParams(searchParams);
    updated.delete(key);
    updated.set('page', '1');
    setSearchParams(updated);
  };

  // Active filter pills
  const activeChips = [];
  if (currentFilters.search) {
    activeChips.push({ key: 'search', label: `Search: "${currentFilters.search}"` });
  }
  if (currentFilters.category) {
    const catObj = categories.find((c) => c.slug === currentFilters.category);
    activeChips.push({ key: 'category', label: `Category: ${catObj ? catObj.name : currentFilters.category}` });
  }
  if (currentFilters.brand) {
    activeChips.push({ key: 'brand', label: `Brand: ${currentFilters.brand}` });
  }
  if (currentFilters.size) {
    activeChips.push({ key: 'size', label: `Size: ${currentFilters.size}` });
  }
  if (currentFilters.min_price || currentFilters.max_price) {
    const minStr = currentFilters.min_price ? `₹${currentFilters.min_price}` : '₹0';
    const maxStr = currentFilters.max_price ? `₹${currentFilters.max_price}` : 'Any';
    activeChips.push({ key: 'price', label: `Price: ${minStr}–${maxStr}`, isPrice: true });
  }
  if (currentFilters.in_stock) {
    activeChips.push({ key: 'in_stock', label: 'In-Stock Only' });
  }

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const activeFilterCount = activeChips.length;

  return (
    <div className="catalog-page">
      {/* Catalog Title Header */}
      <div className="catalog-header">
        <h1 className="catalog-title">All Sneakers</h1>
        <p className="catalog-subtitle">
          Explore authentic sneakers, rare colorways, and real-time size-based stock.
        </p>
      </div>

      <div className="catalog-layout">
        {/* Left Column: Filter Sidebar (turns into drawer on mobile) */}
        <ProductFilters
          filters={currentFilters}
          categories={categories}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          mobileOpen={mobileFiltersOpen}
          onCloseMobile={() => setMobileFiltersOpen(false)}
        />

        {/* Right Column: Catalog Grid & Controls */}
        <main className="catalog-main" id="catalog-main-content">
          {/* Top Sort & Filter Toolbar */}
          <ProductSort
            currentSort={currentFilters.sort}
            onSortChange={handleSortChange}
            totalItems={productsData.pagination.total}
            onToggleFilters={() => setMobileFiltersOpen(true)}
            activeFilterCount={activeFilterCount}
          />

          {/* Active Filter Chips */}
          {activeChips.length > 0 && (
            <div className="active-filters-bar" aria-label="Active filters">
              <span className="active-filters-label">Active:</span>
              <div className="active-chips-list">
                {activeChips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    className="active-filter-chip"
                    onClick={() => {
                      if (chip.isPrice) {
                        const updated = new URLSearchParams(searchParams);
                        updated.delete('min_price');
                        updated.delete('max_price');
                        updated.set('page', '1');
                        setSearchParams(updated);
                      } else {
                        removeSingleFilter(chip.key);
                      }
                    }}
                    title="Remove filter"
                  >
                    <span>{chip.label}</span>
                    <span className="chip-remove-icon">×</span>
                  </button>
                ))}
                <button
                  type="button"
                  className="chip-clear-all"
                  onClick={handleResetFilters}
                >
                  Clear All
                </button>
              </div>
            </div>
          )}

          {/* Catalog Content Area */}
          {loading ? (
            <LoadingState count={8} />
          ) : error ? (
            <ErrorState message={error} onRetry={fetchProducts} />
          ) : productsData.items.length === 0 ? (
            <EmptyState onReset={handleResetFilters} />
          ) : (
            <>
              <ProductGrid products={productsData.items} />
              <Pagination
                pagination={productsData.pagination}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
