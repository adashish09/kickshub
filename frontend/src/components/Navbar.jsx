import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, logout } = useAuth();
  const { totalUnits } = useCart();
  const navigate = useNavigate();

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setMobileMenuOpen(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="site-header">
      {/* Top Banner Notice */}
      <div className="top-banner">
        <span>Limited Drops • 100% Verified Authentic • Real-Time Size Inventory • Express India Delivery</span>
      </div>

      <div className="header-inner">
        {/* Brand Logo */}
        <Link to="/" className="brand-logo" onClick={() => setMobileMenuOpen(false)} aria-label="KicksHub Home">
          <span className="brand-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 18h20v2H2v-2zm1.15-4.05L4 9l4 1 3-4 6 2 4.85 5.95H3.15z" />
            </svg>
          </span>
          <span className="brand-name">
            KICKS<span>HUB</span>
          </span>
        </Link>

        {/* Primary Desktop Nav */}
        <nav className="desktop-nav" aria-label="Main Navigation">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Home
          </NavLink>
          <NavLink to="/products" end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            All Sneakers
          </NavLink>
          <NavLink
            to="/products?category=running"
            className={({ isActive }) => (isActive ? 'nav-link' : 'nav-link')}
          >
            Running
          </NavLink>
          <NavLink
            to="/products?category=lifestyle"
            className={({ isActive }) => (isActive ? 'nav-link' : 'nav-link')}
          >
            Lifestyle
          </NavLink>
          <NavLink
            to="/products?category=basketball"
            className={({ isActive }) => (isActive ? 'nav-link' : 'nav-link')}
          >
            Basketball
          </NavLink>
        </nav>

        {/* Header Right Actions */}
        <div className="header-actions">
          {/* Quick Search on Desktop */}
          <form onSubmit={handleSearchSubmit} className="header-search-form" role="search">
            <input
              type="text"
              placeholder="Search kicks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="header-search-input"
              aria-label="Search sneakers"
            />
            <button type="submit" className="header-search-btn" aria-label="Submit search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
          </form>

          {/* Authentication Actions */}
          {user ? (
            <div className="navbar-user-group">
              {user.role === 'admin' && (
                <Link to="/admin" className="navbar-admin-badge-link" id="nav-admin-link" title="Administration Dashboard">
                  Admin
                </Link>
              )}
              <Link to="/orders" className="navbar-orders-link" id="nav-orders-link" title="My Orders">
                Orders
              </Link>
              <Link to="/account" className="navbar-user-btn" id="nav-account-link" title={`Account: ${user.name}`}>
                <span className="navbar-avatar-circle">
                  {(user.name || 'U').charAt(0).toUpperCase()}
                </span>
                <span className="navbar-user-display-name">
                  {user.name?.split(' ')[0]}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                id="nav-logout-btn"
                className="btn-nav-logout"
                title="Sign out"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="navbar-auth-links">
              <Link to="/login" id="nav-login-link" className="btn-nav-login">
                Sign In
              </Link>
              <Link to="/register" id="nav-register-link" className="btn-nav-register">
                Register
              </Link>
            </div>
          )}

          {/* Cart Link with Live Total Units Badge */}
          <Link to="/cart" className="action-btn cart-btn" id="navbar-cart-btn" title="Shopping Bag" aria-label={`Shopping Bag, ${totalUnits} items`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            <span className="cart-badge" id="cart-badge-count">{totalUnits}</span>
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            className="mobile-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileMenuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M3 12h18M3 6h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer (Portal to document.body to prevent parent backdrop-filter & stacking context issues) */}
      {mobileMenuOpen &&
        createPortal(
          <>
            <div
              className="mobile-nav-backdrop"
              onClick={() => setMobileMenuOpen(false)}
              role="presentation"
            />
            <div
              className="mobile-nav-drawer"
              id="mobile-nav-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile Navigation"
            >
              {/* Mobile Drawer Header with Close Button */}
              <div className="mobile-nav-drawer-header">
                <div className="brand-logo">
                  <span className="brand-icon" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2 18h20v2H2v-2zm1.15-4.05L4 9l4 1 3-4 6 2 4.85 5.95H3.15z" />
                    </svg>
                  </span>
                  <span className="brand-name">
                    KICKS<span>HUB</span>
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-close-mobile-drawer"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close navigation menu"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              {/* Mobile Search Input */}
              <form onSubmit={handleSearchSubmit} className="mobile-search-form" role="search">
                <input
                  type="text"
                  placeholder="Search sneakers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mobile-search-input"
                  aria-label="Search sneakers on mobile"
                />
                <button type="submit" className="mobile-search-btn" aria-label="Submit search">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </button>
              </form>

              <nav className="mobile-nav-links">
                <NavLink to="/" onClick={() => setMobileMenuOpen(false)}>
                  Home
                </NavLink>
                <NavLink to="/products" onClick={() => setMobileMenuOpen(false)}>
                  All Sneakers
                </NavLink>
                <NavLink to="/products?category=running" onClick={() => setMobileMenuOpen(false)}>
                  Running Shoes
                </NavLink>
                <NavLink to="/products?category=lifestyle" onClick={() => setMobileMenuOpen(false)}>
                  Lifestyle Kicks
                </NavLink>
                <NavLink to="/products?category=basketball" onClick={() => setMobileMenuOpen(false)}>
                  Basketball Shoes
                </NavLink>
                <NavLink to="/cart" onClick={() => setMobileMenuOpen(false)}>
                  Shopping Bag ({totalUnits})
                </NavLink>

                {user?.role === 'admin' && (
                  <NavLink
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="mobile-nav-admin-link"
                  >
                    ⚙️ Admin Dashboard
                  </NavLink>
                )}

                <div className="mobile-nav-divider"></div>

                {user ? (
                  <>
                    <NavLink to="/orders" onClick={() => setMobileMenuOpen(false)}>
                      My Orders
                    </NavLink>
                    <NavLink to="/account" onClick={() => setMobileMenuOpen(false)}>
                      My Account ({user.name})
                    </NavLink>
                    <button
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="mobile-nav-logout-btn"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <div className="mobile-auth-actions">
                    <NavLink to="/login" onClick={() => setMobileMenuOpen(false)} className="mobile-btn-signin">
                      Sign In
                    </NavLink>
                    <NavLink to="/register" onClick={() => setMobileMenuOpen(false)} className="mobile-btn-register">
                      Create Account
                    </NavLink>
                  </div>
                )}
              </nav>
            </div>
          </>,
          document.body
        )}
    </header>
  );
}
