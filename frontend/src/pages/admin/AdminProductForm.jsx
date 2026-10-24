import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  adminGetProduct,
  adminCreateProduct,
  adminUpdateProduct,
  getCategories,
} from '../../services/api';
import {
  validateName,
  validateSku,
  validatePrice,
  validateStock,
} from '../../utils/validation';

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

  // Field validation and touched states
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});

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

  const validateVariant = (v, allVariants, index) => {
    const errs = {};
    const skuErr = validateSku(v.sku);
    if (skuErr) {
      errs.sku = skuErr;
    } else {
      const normalizedSku = v.sku.trim().toUpperCase();
      const isDuplicate = allVariants.some(
        (other, otherIdx) => otherIdx !== index && (other.sku || '').trim().toUpperCase() === normalizedSku
      );
      if (isDuplicate) {
        errs.sku = 'Duplicate SKU within variants.';
      }
    }

    if (!v.size || !v.size.trim()) {
      errs.size = 'Size is required.';
    }

    if (!v.color || !v.color.trim()) {
      errs.color = 'Colorway is required.';
    }

    const priceErr = validatePrice(v.price, 'Price');
    if (priceErr) errs.price = priceErr;

    const stockErr = validateStock(v.stock_quantity, 'Stock quantity');
    if (stockErr) errs.stock_quantity = stockErr;

    return errs;
  };

  const validateAll = () => {
    const errors = {};
    const nameErr = validateName(name, 'Sneaker model name');
    if (nameErr) errors.name = nameErr;

    if (!brand || !brand.trim()) {
      errors.brand = 'Brand is required.';
    }

    if (!categoryId) {
      errors.categoryId = 'Please select a product category.';
    }

    if (imageUrl && imageUrl.trim()) {
      if (!/^https?:\/\/.+/i.test(imageUrl.trim())) {
        errors.imageUrl = 'Image URL must begin with http:// or https://.';
      }
    }

    const variantErrors = variants.map((v, i) => validateVariant(v, variants, i));
    const hasVariantErrors = variantErrors.some((vErrs) => Object.keys(vErrs).length > 0);
    if (hasVariantErrors) {
      errors.variants = variantErrors;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

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
    setVariants((prev) => {
      const updated = prev.map((v, i) => (i === index ? { ...v, [field]: value } : v));
      // If variant was touched, update its validation
      if (touched.variants?.[index]?.[field]) {
        const vErrs = validateVariant(updated[index], updated, index);
        setFieldErrors((curr) => {
          const currentVarErrs = [...(curr.variants || [])];
          currentVarErrs[index] = vErrs;
          return { ...curr, variants: currentVarErrs };
        });
      }
      return updated;
    });
  };

  const handleVariantBlur = (index, field) => {
    setTouched((prev) => {
      const currTouchedVariants = [...(prev.variants || [])];
      currTouchedVariants[index] = { ...(currTouchedVariants[index] || {}), [field]: true };
      return { ...prev, variants: currTouchedVariants };
    });

    const vErrs = validateVariant(variants[index], variants, index);
    setFieldErrors((prev) => {
      const currentVarErrs = [...(prev.variants || [])];
      currentVarErrs[index] = vErrs;
      return { ...prev, variants: currentVarErrs };
    });
  };

  const handleRemoveVariant = (index) => {
    if (variants.length <= 1) {
      alert('A product must contain at least one size/color variant.');
      return;
    }
    setVariants((prev) => prev.filter((_, i) => i !== index));
    setFieldErrors((prev) => {
      if (!prev.variants) return prev;
      return { ...prev, variants: prev.variants.filter((_, i) => i !== index) };
    });
    setTouched((prev) => {
      if (!prev.variants) return prev;
      return { ...prev, variants: prev.variants.filter((_, i) => i !== index) };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Mark all as touched
    const touchedVariants = variants.map(() => ({
      sku: true,
      size: true,
      color: true,
      price: true,
      stock_quantity: true,
    }));
    setTouched({
      name: true,
      brand: true,
      categoryId: true,
      imageUrl: true,
      variants: touchedVariants,
    });

    if (!validateAll()) {
      setError('Please resolve all highlighted field validation errors before saving.');
      return;
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

      <form onSubmit={handleSubmit} className="admin-entity-form" noValidate>
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
                  onChange={(e) => {
                    setName(e.target.value);
                    if (touched.name) {
                      setFieldErrors((curr) => ({ ...curr, name: validateName(e.target.value, 'Sneaker model name') }));
                    }
                  }}
                  onBlur={() => {
                    setTouched((curr) => ({ ...curr, name: true }));
                    setFieldErrors((curr) => ({ ...curr, name: validateName(name, 'Sneaker model name') }));
                  }}
                  className={`form-input ${touched.name && fieldErrors.name ? 'input-error' : ''}`}
                  required
                  aria-invalid={touched.name && Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? 'product-name-error' : undefined}
                />
                {touched.name && fieldErrors.name && (
                  <span className="field-error-msg" id="product-name-error" role="alert">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    {fieldErrors.name}
                  </span>
                )}
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
                    onChange={(e) => {
                      setBrand(e.target.value);
                      if (touched.brand) {
                        setFieldErrors((curr) => ({ ...curr, brand: e.target.value.trim() ? null : 'Brand is required.' }));
                      }
                    }}
                    onBlur={() => {
                      setTouched((curr) => ({ ...curr, brand: true }));
                      setFieldErrors((curr) => ({ ...curr, brand: brand.trim() ? null : 'Brand is required.' }));
                    }}
                    className={`form-input ${touched.brand && fieldErrors.brand ? 'input-error' : ''}`}
                    required
                    aria-invalid={touched.brand && Boolean(fieldErrors.brand)}
                    aria-describedby={fieldErrors.brand ? 'product-brand-error' : undefined}
                  />
                  {touched.brand && fieldErrors.brand && (
                    <span className="field-error-msg" id="product-brand-error" role="alert">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      {fieldErrors.brand}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="product-category" className="form-label">
                    Category *
                  </label>
                  <select
                    id="product-category"
                    value={categoryId}
                    onChange={(e) => {
                      setCategoryId(e.target.value);
                      if (touched.categoryId) {
                        setFieldErrors((curr) => ({ ...curr, categoryId: e.target.value ? null : 'Please select a category.' }));
                      }
                    }}
                    onBlur={() => {
                      setTouched((curr) => ({ ...curr, categoryId: true }));
                      setFieldErrors((curr) => ({ ...curr, categoryId: categoryId ? null : 'Please select a category.' }));
                    }}
                    className={`form-select ${touched.categoryId && fieldErrors.categoryId ? 'input-error' : ''}`}
                    required
                    aria-invalid={touched.categoryId && Boolean(fieldErrors.categoryId)}
                    aria-describedby={fieldErrors.categoryId ? 'product-category-error' : undefined}
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {touched.categoryId && fieldErrors.categoryId && (
                    <span className="field-error-msg" id="product-category-error" role="alert">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      {fieldErrors.categoryId}
                    </span>
                  )}
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
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    if (touched.imageUrl && e.target.value.trim() && !/^https?:\/\/.+/i.test(e.target.value.trim())) {
                      setFieldErrors((curr) => ({ ...curr, imageUrl: 'Image URL must begin with http:// or https://.' }));
                    } else if (touched.imageUrl) {
                      setFieldErrors((curr) => ({ ...curr, imageUrl: null }));
                    }
                  }}
                  onBlur={() => {
                    setTouched((curr) => ({ ...curr, imageUrl: true }));
                    if (imageUrl.trim() && !/^https?:\/\/.+/i.test(imageUrl.trim())) {
                      setFieldErrors((curr) => ({ ...curr, imageUrl: 'Image URL must begin with http:// or https://.' }));
                    } else {
                      setFieldErrors((curr) => ({ ...curr, imageUrl: null }));
                    }
                  }}
                  className={`form-input ${touched.imageUrl && fieldErrors.imageUrl ? 'input-error' : ''}`}
                  aria-invalid={touched.imageUrl && Boolean(fieldErrors.imageUrl)}
                  aria-describedby={fieldErrors.imageUrl ? 'product-image-error' : undefined}
                />
                {touched.imageUrl && fieldErrors.imageUrl && (
                  <span className="field-error-msg" id="product-image-error" role="alert">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    {fieldErrors.imageUrl}
                  </span>
                )}
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
                {variants.map((v, idx) => {
                  const vErrs = fieldErrors.variants?.[idx] || {};
                  const vTouched = touched.variants?.[idx] || {};

                  return (
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
                        {/* SKU */}
                        <div className="form-group">
                          <label className="form-label-sm">SKU *</label>
                          <input
                            type="text"
                            placeholder="e.g. AVP-RED-UK8"
                            value={v.sku}
                            onChange={(e) => handleVariantChange(idx, 'sku', e.target.value)}
                            onBlur={() => handleVariantBlur(idx, 'sku')}
                            className={`form-input form-input-sm ${vTouched.sku && vErrs.sku ? 'input-error' : ''}`}
                            required
                          />
                          {vTouched.sku && vErrs.sku && (
                            <span className="field-error-msg">{vErrs.sku}</span>
                          )}
                        </div>

                        {/* Size */}
                        <div className="form-group">
                          <label className="form-label-sm">Size *</label>
                          <input
                            type="text"
                            placeholder="e.g. UK 8"
                            value={v.size}
                            onChange={(e) => handleVariantChange(idx, 'size', e.target.value)}
                            onBlur={() => handleVariantBlur(idx, 'size')}
                            className={`form-input form-input-sm ${vTouched.size && vErrs.size ? 'input-error' : ''}`}
                            required
                          />
                          {vTouched.size && vErrs.size && (
                            <span className="field-error-msg">{vErrs.size}</span>
                          )}
                        </div>

                        {/* Color */}
                        <div className="form-group">
                          <label className="form-label-sm">Color *</label>
                          <input
                            type="text"
                            placeholder="e.g. Bred, Cloud White"
                            value={v.color}
                            onChange={(e) => handleVariantChange(idx, 'color', e.target.value)}
                            onBlur={() => handleVariantBlur(idx, 'color')}
                            className={`form-input form-input-sm ${vTouched.color && vErrs.color ? 'input-error' : ''}`}
                            required
                          />
                          {vTouched.color && vErrs.color && (
                            <span className="field-error-msg">{vErrs.color}</span>
                          )}
                        </div>

                        {/* Price */}
                        <div className="form-group">
                          <label className="form-label-sm">Price (₹) *</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={v.price}
                            onChange={(e) => handleVariantChange(idx, 'price', e.target.value)}
                            onBlur={() => handleVariantBlur(idx, 'price')}
                            className={`form-input form-input-sm ${vTouched.price && vErrs.price ? 'input-error' : ''}`}
                            required
                          />
                          {vTouched.price && vErrs.price && (
                            <span className="field-error-msg">{vErrs.price}</span>
                          )}
                        </div>

                        {/* Stock Quantity */}
                        <div className="form-group">
                          <label className="form-label-sm">Stock Quantity *</label>
                          <input
                            type="number"
                            min="0"
                            value={v.stock_quantity}
                            onChange={(e) => handleVariantChange(idx, 'stock_quantity', e.target.value)}
                            onBlur={() => handleVariantBlur(idx, 'stock_quantity')}
                            className={`form-input form-input-sm ${vTouched.stock_quantity && vErrs.stock_quantity ? 'input-error' : ''}`}
                            required
                          />
                          {vTouched.stock_quantity && vErrs.stock_quantity && (
                            <span className="field-error-msg">{vErrs.stock_quantity}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
