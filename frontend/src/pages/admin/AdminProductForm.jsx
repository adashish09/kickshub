import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  adminGetProduct,
  adminCreateProduct,
  adminUpdateProduct,
  getCategories,
} from '../../services/api';

export default function AdminProductForm() {
  const { productId } = useParams();
  const isEditing = Boolean(productId);
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('Nike');
  const [categoryId, setCategoryId] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Variants array
  const [variants, setVariants] = useState([
    { sku: '', size: 'UK 8', color: '', price: '129.99', stock_quantity: 10 },
  ]);

  // Load categories and initial product if editing
  useEffect(() => {
    let isMounted = true;
    getCategories()
      .then((cats) => {
        if (isMounted) {
          setCategories(cats || []);
          if (cats && cats.length > 0 && !categoryId) {
            setCategoryId(cats[0].id);
          }
        }
      })
      .catch((err) => console.error('Failed to load categories', err));

    if (isEditing) {
      setLoading(true);
      adminGetProduct(productId)
        .then((res) => {
          if (!isMounted) return;
          const p = res.product;
          setName(p.name || '');
          setBrand(p.brand || 'Nike');
          setCategoryId(p.category_id || '');
          setSlug(p.slug || '');
          setDescription(p.description || '');
          setImageUrl(p.image_url || '');
          setIsActive(Boolean(p.is_active));
          if (p.variants && p.variants.length > 0) {
            setVariants(
              p.variants.map((v) => ({
                id: v.id,
                sku: v.sku,
                size: v.size,
                color: v.color,
                price: String(v.price),
                stock_quantity: v.stock_quantity,
              }))
            );
          }
        })
        .catch((err) => {
          if (isMounted) {
            setError(
              err.response?.data?.error?.message ||
              err.message ||
              'Failed to load product details.'
            );
          }
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [productId, isEditing]);

  const handleAddVariant = () => {
    const nextSuffix = variants.length + 1;
    const baseSku = (name.slice(0, 3).toUpperCase() || 'SKU') + `-UK${8 + (nextSuffix % 4)}`;
    setVariants((prev) => [
      ...prev,
      {
        sku: `${baseSku}-${Date.now().toString().slice(-4)}`,
        size: 'UK 9',
        color: variants[0]?.color || 'Standard',
        price: variants[0]?.price || '129.99',
        stock_quantity: 10,
      },
    ]);
  };

  const handleVariantChange = (index, field, value) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  };

  const handleRemoveVariant = (index) => {
    if (variants.length <= 1) {
      alert('A product must contain at least one size/color variant.');
      return;
    }
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Product name is required.');
      return;
    }
    if (!brand.trim()) {
      setError('Brand is required.');
      return;
    }
    if (!categoryId) {
      setError('Please select a category.');
      return;
    }
    if (variants.length === 0) {
      setError('At least one variant must be configured.');
      return;
    }

    // Validate variant SKUs
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v.sku || !v.sku.trim()) {
        setError(`Variant #${i + 1} is missing a SKU.`);
        return;
      }
      if (!v.size) {
        setError(`Variant #${i + 1} requires a size.`);
        return;
      }
      if (!v.color) {
        setError(`Variant #${i + 1} requires a colorway.`);
        return;
      }
    }

    setSaving(true);
    const payload = {
      name: name.trim(),
      brand: brand.trim(),
      category_id: Number(categoryId),
      slug: slug.trim() || undefined,
      description: description.trim(),
      image_url: imageUrl.trim(),
      is_active: isActive,
      variants: variants.map((v) => ({
        id: v.id,
        sku: v.sku.trim().toUpperCase(),
        size: v.size.trim(),
        color: v.color.trim(),
        price: parseFloat(v.price) || 0,
        stock_quantity: parseInt(v.stock_quantity, 10) || 0,
      })),
    };

    try {
      if (isEditing) {
        await adminUpdateProduct(productId, payload);
      } else {
        await adminCreateProduct(payload);
      }
      navigate('/admin/products');
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to save product.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading-state">
        <div className="admin-spinner"></div>
        <p>Loading product information...</p>
      </div>
    );
  }

  return (
    <div className="admin-form-page">
      <div className="admin-page-header">
        <div>
          <Link to="/admin/products" className="admin-back-link">
            ← Back to Inventory
          </Link>
          <h1 className="admin-page-title">
            {isEditing ? `Edit Sneaker: ${name}` : 'Create New Sneaker Listing'}
          </h1>
          <p className="admin-page-subtitle">
            Configure metadata, pricing, imagery, and individual size/color variants.
          </p>
        </div>
      </div>

      {error && (
        <div className="admin-error-box">
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="admin-entity-form">
        <div className="admin-form-grid">
          {/* Left Column: Core Product Metadata */}
          <div className="admin-form-col">
            <div className="admin-card">
              <h2 className="admin-card-title">General Information</h2>

              <div className="form-group">
                <label htmlFor="product-name" className="form-label">
                  Sneaker Model Name *
                </label>
                <input
                  id="product-name"
                  type="text"
                  placeholder="e.g. Air Velocity Pro"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="product-brand" className="form-label">
                    Brand *
                  </label>
                  <input
                    id="product-brand"
                    type="text"
                    placeholder="e.g. Nike, Jordan, Adidas, Puma"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="product-category" className="form-label">
                    Category *
                  </label>
                  <select
                    id="product-category"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="form-select"
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="product-slug" className="form-label">
                  URL Slug (Optional — auto-generated if blank)
                </label>
                <input
                  id="product-slug"
                  type="text"
                  placeholder="e.g. air-velocity-pro"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="product-desc" className="form-label">
                  Product Description
                </label>
                <textarea
                  id="product-desc"
                  rows="4"
                  placeholder="Provide tech specs, upper materials, and performance features..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-textarea"
                />
              </div>

              <div className="form-group">
                <label htmlFor="product-image" className="form-label">
                  Product Image URL
                </label>
                <input
                  id="product-image"
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="form-input"
                />
                {imageUrl && (
                  <div className="form-image-preview">
                    <img src={imageUrl} alt="Preview" onError={(e) => (e.target.style.display = 'none')} />
                  </div>
                )}
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label" htmlFor="product-active">
                  <input
                    id="product-active"
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <span className="checkbox-text">
                    <strong>Active in Storefront</strong> (when unchecked, sneaker is hidden from shoppers)
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Size/Color Variant Matrix */}
          <div className="admin-form-col">
            <div className="admin-card">
              <div className="card-header-with-action">
                <h2 className="admin-card-title">Inventory Variants & Sizes</h2>
                <button
                  type="button"
                  onClick={handleAddVariant}
                  className="btn-secondary btn-sm"
                >
                  + Add Variant
                </button>
              </div>
              <p className="card-subtitle">
                Each SKU tracks independent size, colorway, price, and real-time stock count.
              </p>

              <div className="variants-editor-list">
                {variants.map((v, idx) => (
                  <div key={idx} className="variant-editor-card">
                    <div className="variant-card-header">
                      <span className="variant-num">Variant #{idx + 1}</span>
                      {variants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(idx)}
                          className="btn-remove-variant"
                          title="Remove variant"
                        >
                          Remove ×
                        </button>
                      )}
                    </div>

                    <div className="variant-fields-grid">
                      <div className="form-group">
                        <label className="form-label-sm">SKU *</label>
                        <input
                          type="text"
                          placeholder="e.g. AVP-RED-UK8"
                          value={v.sku}
                          onChange={(e) => handleVariantChange(idx, 'sku', e.target.value)}
                          className="form-input form-input-sm"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label-sm">Size *</label>
                        <input
                          type="text"
                          placeholder="e.g. UK 8"
                          value={v.size}
                          onChange={(e) => handleVariantChange(idx, 'size', e.target.value)}
                          className="form-input form-input-sm"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label-sm">Color *</label>
                        <input
                          type="text"
                          placeholder="e.g. Bred, Cloud White"
                          value={v.color}
                          onChange={(e) => handleVariantChange(idx, 'color', e.target.value)}
                          className="form-input form-input-sm"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label-sm">Price (₹) *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={v.price}
                          onChange={(e) => handleVariantChange(idx, 'price', e.target.value)}
                          className="form-input form-input-sm"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label-sm">Stock Quantity *</label>
                        <input
                          type="number"
                          min="0"
                          value={v.stock_quantity}
                          onChange={(e) => handleVariantChange(idx, 'stock_quantity', e.target.value)}
                          className="form-input form-input-sm"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Button Bar */}
        <div className="admin-form-actions-bar">
          <Link to="/admin/products" className="btn-secondary">
            Cancel
          </Link>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving Sneaker...' : isEditing ? 'Save Changes' : 'Create Sneaker'}
          </button>
        </div>
      </form>
    </div>
  );
}
