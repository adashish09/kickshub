import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductGrid from '../components/ProductGrid';
import LoadingState from '../components/LoadingState';
import { getProducts } from '../services/api';

export default function Landing() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadFeatured() {
      try {
        setLoading(true);
        const data = await getProducts({ limit: 4, sort: 'newest' }, controller.signal);
        if (isMounted) {
          setFeaturedProducts(data.items || []);
          setError(null);
        }
      } catch (err) {
        if (isMounted && err.name !== 'CanceledError') {
          setError('Unable to load featured drops.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadFeatured();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const categories = [
    {
      title: 'Running',
      slug: 'running',
      desc: 'Engineered for road propulsion and lightweight endurance.',
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80',
    },
    {
      title: 'Lifestyle',
      slug: 'lifestyle',
      desc: 'Iconic retro silhouettes crafted for everyday street wear.',
      image: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=600&q=80',
    },
    {
      title: 'Basketball',
      slug: 'basketball',
      desc: 'High-traction court kicks for hard cuts and lockdown response.',
      image: 'https://images.unsplash.com/photo-1579338559194-a162d19bf842?auto=format&fit=crop&w=600&q=80',
    },
  ];

  return (
    <div className="landing-page">
      {/* Redesigned Hero Section (Phase 8) */}
      <section className="hero-banner">
        <div className="hero-grid-layout">
          <div className="hero-content-col">
            <span className="hero-eyebrow">AUTHENTIC DROPS • VERIFIED EXCLUSIVE</span>
            <h1 className="hero-main-title">
              Find Your Next <br />
              <span>Favorite Pair.</span>
            </h1>
            <p className="hero-subtext">
              Explore sneakers built for everyday comfort, court performance, and standout style. Real-time inventory managed down to the exact size and color SKU.
            </p>

            <div className="hero-cta-group">
              <Link to="/products" className="btn-primary hero-btn-main" id="hero-btn-shop">
                Shop Sneakers →
              </Link>
              <Link to="/products?category=running" className="btn-secondary hero-btn-sub">
                Explore Running
              </Link>
            </div>

            <div className="hero-trust-badges">
              <span className="hero-trust-tag">✓ 100% Verified Authentic</span>
              <span className="hero-trust-tag">⚡ Real-Time Stock</span>
              <span className="hero-trust-tag">📦 Double-Boxed Delivery</span>
            </div>
          </div>

          <div className="hero-media-col">
            <div className="hero-image-frame">
              <img
                src="https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1000&q=80"
                alt="Air Jordan Retro High iconic lifestyle sneaker"
                className="hero-sneaker-image"
                width="600"
                height="450"
                loading="eager"
              />
              <div className="hero-image-caption-badge">
                <span className="caption-brand">JORDAN</span>
                <span className="caption-model">Street Retro High</span>
                <span className="caption-price">From ₹169.99</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Drops Section */}
      <section className="featured-section">
        <div className="section-header">
          <div>
            <span className="section-eyebrow">FRESH ARRIVALS</span>
            <h2 className="section-title">Latest Drops</h2>
          </div>
          <Link to="/products" className="section-view-all">
            View All ({featuredProducts.length}+ kicks) →
          </Link>
        </div>

        {loading ? (
          <LoadingState count={4} />
        ) : error ? (
          <div className="landing-notice error">{error}</div>
        ) : (
          <ProductGrid products={featuredProducts} />
        )}
      </section>

      {/* Categories Showcase */}
      <section className="categories-section">
        <div className="section-header">
          <div>
            <span className="section-eyebrow">SHOP BY CATEGORY</span>
            <h2 className="section-title">Built for Performance & Style</h2>
          </div>
        </div>

        <div className="category-card-grid">
          {categories.map((c) => (
            <Link
              key={c.slug}
              to={`/products?category=${c.slug}`}
              className="category-card"
            >
              <div className="category-card-image">
                <img src={c.image} alt={c.title} loading="lazy" />
                <div className="category-overlay"></div>
              </div>
              <div className="category-card-info">
                <h3 className="category-card-title">{c.title}</h3>
                <p className="category-card-desc">{c.desc}</p>
                <span className="category-card-link">Explore {c.title} →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Trust & Guarantee Banner with Clean SVGs */}
      <section className="trust-strip">
        <div className="trust-item">
          <span className="trust-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <polyline points="9 12 11 14 15 10"></polyline>
            </svg>
          </span>
          <div>
            <h4>100% Verified Authentic</h4>
            <p>Every pair inspected by hand before dispatch</p>
          </div>
        </div>
        <div className="trust-item">
          <span className="trust-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13"></rect>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
              <circle cx="5.5" cy="18.5" r="2.5"></circle>
              <circle cx="18.5" cy="18.5" r="2.5"></circle>
            </svg>
          </span>
          <div>
            <h4>Express Pan-India Delivery</h4>
            <p>Dispatched in double-boxed premium packaging</p>
          </div>
        </div>
        <div className="trust-item">
          <span className="trust-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
          </span>
          <div>
            <h4>Real-Time Variant Stock</h4>
            <p>What you select is what you get, down to UK half-sizes</p>
          </div>
        </div>
      </section>
    </div>
  );
}
