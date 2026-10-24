import React, { useState, useEffect } from 'react';
import {
  adminGetCategories,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
} from '../../services/api';
import { validateName } from '../../utils/validation';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);

  // New Category Form
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [nameError, setNameError] = useState(null);
  const [nameTouched, setNameTouched] = useState(false);
  const [slugError, setSlugError] = useState(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Editing Category
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminGetCategories();
      setCategories(res.categories || []);
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to load categories.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const validateSlug = (slugVal) => {
    if (!slugVal || !slugVal.trim()) return null;
    if (!/^[a-z0-9-]+$/.test(slugVal.trim())) {
      return 'Slug can only contain lowercase letters, numbers, and hyphens.';
    }
    return null;
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setCreateError(null);
    setNameTouched(true);
    setSlugTouched(true);

    const nErr = validateName(newName, 'Category name');
    setNameError(nErr);

    const sErr = validateSlug(newSlug);
    setSlugError(sErr);

    if (nErr || sErr) {
      return;
    }

    setCreating(true);
    try {
      const res = await adminCreateCategory({
        name: newName.trim(),
        slug: newSlug.trim() || undefined,
        description: newDesc.trim() || undefined,
      });
      setActionNotice(res.message || 'Category created successfully.');
      setNewName('');
      setNewSlug('');
      setNewDesc('');
      setNameTouched(false);
      setSlugTouched(false);
      setNameError(null);
      setSlugError(null);
      loadCategories();
    } catch (err) {
      setCreateError(err.response?.data?.error?.message || 'Failed to create category.');
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditSlug(c.slug);
    setEditDesc(c.description || '');
  };

  const handleSaveEdit = async (catId) => {
    try {
      await adminUpdateCategory(catId, {
        name: editName.trim(),
        slug: editSlug.trim(),
        description: editDesc.trim(),
      });
      setActionNotice('Category updated successfully.');
      setEditingId(null);
      loadCategories();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update category.');
    }
  };

  const handleDeleteCategory = async (c) => {
    if (c.product_count > 0) {
      alert(
        `Cannot delete category '${c.name}' because ${c.product_count} product(s) are currently associated with it. Reassign products first.`
      );
      return;
    }

    if (!window.confirm(`Are you sure you want to delete category '${c.name}'?`)) {
      return;
    }

    try {
      const res = await adminDeleteCategory(c.id);
      setActionNotice(res.message);
      loadCategories();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete category.');
    }
  };

  return (
    <div className="admin-categories-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Catalog Categories</h1>
          <p className="admin-page-subtitle">
            Manage sneaker classification hierarchies and storefront category navigation.
          </p>
        </div>
      </div>

      {actionNotice && (
        <div className="admin-action-notice" role="alert">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="notice-dismiss">
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="admin-error-box">
          <p>{error}</p>
        </div>
      )}

      <div className="admin-categories-layout">
        {/* Left: Categories Table */}
        <div className="admin-categories-table-col">
          <div className="admin-card">
            <h2 className="admin-card-title">Existing Categories</h2>
            {loading ? (
              <div className="admin-loading-state">
                <div className="admin-spinner"></div>
                <p>Loading categories...</p>
              </div>
            ) : categories.length === 0 ? (
              <div className="admin-empty-table">
                <p>No categories configured yet.</p>
              </div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Slug</th>
                      <th>Description</th>
                      <th>Products</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((c) => (
                      <tr key={c.id}>
                        {editingId === c.id ? (
                          <>
                            <td>
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="form-input form-input-sm"
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={editSlug}
                                onChange={(e) => setEditSlug(e.target.value)}
                                className="form-input form-input-sm"
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                className="form-input form-input-sm"
                              />
                            </td>
                            <td>{c.product_count}</td>
                            <td>
                              <div className="table-action-btns">
                                <button
                                  onClick={() => handleSaveEdit(c.id)}
                                  className="btn-primary btn-sm"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="btn-secondary btn-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td>
                              <strong>{c.name}</strong>
                            </td>
                            <td>
                              <code>{c.slug}</code>
                            </td>
                            <td className="table-desc-cell">{c.description || '—'}</td>
                            <td>
                              <span className="badge-product-count">
                                {c.product_count} sneakers
                              </span>
                            </td>
                            <td>
                              <div className="table-action-btns">
                                <button
                                  onClick={() => startEdit(c)}
                                  className="btn-table-action"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteCategory(c)}
                                  className="btn-table-action btn-danger"
                                  disabled={c.product_count > 0}
                                  title={
                                    c.product_count > 0
                                      ? 'Cannot delete category with associated products'
                                      : 'Delete category'
                                  }
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: Create Category Form */}
        <div className="admin-categories-form-col">
          <div className="admin-card">
            <h2 className="admin-card-title">Add New Category</h2>
            <p className="card-subtitle">
              Create a new category for sneaker grouping. Slugs must be unique.
            </p>

            <form onSubmit={handleCreateCategory} className="admin-entity-form" noValidate>
              {createError && (
                <div className="auth-alert auth-alert-error" role="alert" style={{ marginBottom: '1rem' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <span>{createError}</span>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="cat-name" className="form-label">
                  Category Name *
                </label>
                <input
                  id="cat-name"
                  type="text"
                  placeholder="e.g. Skateboarding"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    if (nameTouched) {
                      setNameError(validateName(e.target.value, 'Category name'));
                    }
                  }}
                  onBlur={() => {
                    setNameTouched(true);
                    setNameError(validateName(newName, 'Category name'));
                  }}
                  className={`form-input ${nameTouched && nameError ? 'input-error' : ''}`}
                  required
                  aria-invalid={nameTouched && Boolean(nameError)}
                  aria-describedby={nameError ? 'cat-name-error' : undefined}
                />
                {nameTouched && nameError && (
                  <span className="field-error-msg" id="cat-name-error" role="alert">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    {nameError}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="cat-slug" className="form-label">
                  Slug (Optional)
                </label>
                <input
                  id="cat-slug"
                  type="text"
                  placeholder="e.g. skateboarding"
                  value={newSlug}
                  onChange={(e) => {
                    setNewSlug(e.target.value);
                    if (slugTouched) {
                      setSlugError(validateSlug(e.target.value));
                    }
                  }}
                  onBlur={() => {
                    setSlugTouched(true);
                    setSlugError(validateSlug(newSlug));
                  }}
                  className={`form-input ${slugTouched && slugError ? 'input-error' : ''}`}
                  aria-invalid={slugTouched && Boolean(slugError)}
                  aria-describedby={slugError ? 'cat-slug-error' : undefined}
                />
                {slugTouched && slugError && (
                  <span className="field-error-msg" id="cat-slug-error" role="alert">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    {slugError}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="cat-desc" className="form-label">
                  Description
                </label>
                <textarea
                  id="cat-desc"
                  rows="3"
                  placeholder="Description for category page metadata..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="form-textarea"
                />
              </div>

              <button
                type="submit"
                disabled={creating || !newName.trim()}
                className="btn-primary btn-block"
              >
                {creating ? 'Creating...' : '+ Create Category'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
