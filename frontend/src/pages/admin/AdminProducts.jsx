import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminGetProducts, adminDeleteProduct, adminUpdateProduct, getCategories } from '../../services/api';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);

  // Filters state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Load categories once
  useEffect(() => {
    getCategories()
      .then((res) => setCategories(res || []))
      .catch((err) => console.error('Failed to load categories', err));
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminGetProducts({
        page,
        limit: 10,
        search: search.trim() || undefined,
        category: categoryFilter || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setProducts(res.items || []);
      setPagination(res.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to retrieve products.'
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter, statusFilter]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadProducts();
  };

  const handleToggleStatus = async (product) => {
    const newStatus = !product.is_active;
    try {
      await adminUpdateProduct(product.id, { is_active: newStatus });
      setActionNotice(`Sneaker '${product.name}' is now ${newStatus ? 'ACTIVE' : 'INACTIVE'}.`);
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_active: newStatus } : p))
      );
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update product status.');
    }
  };

  const handleDeleteProduct = async (product) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove or deactivate '${product.name}'?`
    );
    if (!confirmed) return;

    try {
      const res = await adminDeleteProduct(product.id);
      setActionNotice(res.message);
      loadProducts();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete product.');
    }
  };

  return (
    <div className="admin-products-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Sneaker Inventory Catalog</h1>
          <p className="admin-page-subtitle">
            Manage product listings, SKU variants, real-time stock levels, and catalog visibility.
          </p>
        </div>
        <Link to="/admin/products/new" className="btn-primary">
          + Add New Sneaker
        </Link>
      </div>

      {actionNotice && (
        <div className="admin-action-notice" role="alert">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="notice-dismiss">
            ×
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="admin-toolbar-card">
        <form onSubmit={handleSearchSubmit} className="admin-search-form">
          <input
            type="text"
            placeholder="Search by sneaker name, brand, or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-input-search"
          />
          <button type="submit" className="btn-primary btn-sm">
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              className="btn-secondary btn-sm"
            >
              Clear
            </button>
          )}
        </form>

        <div className="admin-toolbar-filters">
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="admin-select"
            aria-label="Filter by category"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="admin-select"
            aria-label="Filter by status"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="admin-loading-state">
          <div className="admin-spinner"></div>
          <p>Loading catalog items...</p>
        </div>
      ) : error ? (
        <div className="admin-error-box">
          <p>{error}</p>
          <button onClick={loadProducts} className="btn-primary">
            Retry
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className="admin-empty-table">
          <p>No sneakers found matching the selected filters.</p>
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Sneaker</th>
                <th>Brand</th>
                <th>Category</th>
                <th>Variants</th>
                <th>Total Stock</th>
                <th>Price Range</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="table-product-cell">
                      <div className="product-cell-thumb">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} loading="lazy" />
                        ) : (
                          <div className="thumb-placeholder">👟</div>
                        )}
                      </div>
                      <div className="product-cell-meta">
                        <Link to={`/admin/products/${p.id}/edit`} className="product-cell-name">
                          {p.name}
                        </Link>
                        <span className="product-cell-slug">/{p.slug}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong>{p.brand}</strong>
                  </td>
                  <td>{p.category?.name || '—'}</td>
                  <td>{p.variant_count} variant(s)</td>
                  <td>
                    <span
                      className={`stock-badge ${
                        p.total_stock === 0 ? 'out' : p.total_stock < 10 ? 'low' : 'good'
                      }`}
                    >
                      {p.total_stock} in stock
                    </span>
                  </td>
                  <td>
                    ₹{p.price_range?.min}
                    {p.price_range?.min !== p.price_range?.max && ` – ₹${p.price_range?.max}`}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(p)}
                      className={`btn-toggle-status ${p.is_active ? 'active' : 'inactive'}`}
                      title="Click to toggle status"
                    >
                      {p.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td>
                    <div className="table-action-btns">
                      <Link
                        to={`/admin/products/${p.id}/edit`}
                        className="btn-table-action"
                        title="Edit product & variants"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(p)}
                        className="btn-table-action btn-danger"
                        title="Delete or deactivate product"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Bar */}
      {pagination.pages > 1 && (
        <div className="admin-pagination-bar">
          <span className="pagination-info">
            Showing Page {pagination.page} of {pagination.pages} ({pagination.total} total)
          </span>
          <div className="pagination-controls">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={pagination.page <= 1}
              className="btn-secondary btn-sm"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((prev) => Math.min(pagination.pages, prev + 1))}
              disabled={pagination.page >= pagination.pages}
              className="btn-secondary btn-sm"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
