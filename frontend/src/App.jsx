import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import MiniCartDrawer from './components/MiniCartDrawer';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Account from './pages/Account';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import AdminRoute from './components/AdminRoute';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminProductForm from './pages/admin/AdminProductForm';
import AdminCategories from './pages/admin/AdminCategories';
import AdminOrders from './pages/admin/AdminOrders';
import AdminOrderDetail from './pages/admin/AdminOrderDetail';
import AdminUsers from './pages/admin/AdminUsers';

function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className={`site-wrapper ${isAdminRoute ? 'admin-mode' : ''}`}>
      {!isAdminRoute && <Navbar />}
      {!isAdminRoute && <MiniCartDrawer />}
      <main className={isAdminRoute ? 'admin-site-main' : 'site-main'}>
              <Routes>
                {/* Public Catalog Routes */}
                <Route path="/" element={<Landing />} />
                <Route path="/products" element={<Products />} />
                <Route path="/products/:slug" element={<ProductDetail />} />

                {/* Shopping Bag Route */}
                <Route path="/cart" element={<Cart />} />

                {/* Authentication Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected User Account Route */}
                <Route
                  path="/account"
                  element={
                    <ProtectedRoute>
                      <Account />
                    </ProtectedRoute>
                  }
                />

                {/* Protected Checkout & Orders Routes */}
                <Route
                  path="/checkout"
                  element={
                    <ProtectedRoute>
                      <Checkout />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/order-confirmation/:orderId"
                  element={
                    <ProtectedRoute>
                      <OrderConfirmation />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <ProtectedRoute>
                      <Orders />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders/:orderId"
                  element={
                    <ProtectedRoute>
                      <OrderDetail />
                    </ProtectedRoute>
                  }
                />

                {/* Protected Administrative Console Routes (Phase 8) */}
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminLayout />
                    </AdminRoute>
                  }
                >
                  <Route index element={<AdminDashboard />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="products/new" element={<AdminProductForm />} />
                  <Route path="products/:productId/edit" element={<AdminProductForm />} />
                  <Route path="categories" element={<AdminCategories />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="orders/:orderId" element={<AdminOrderDetail />} />
                  <Route path="users" element={<AdminUsers />} />
                </Route>
              </Routes>
            </main>

            {/* Clean Retail Customer-Facing Footer (Only on storefront) */}
            {!isAdminRoute && (
              <footer className="site-footer">
                <div className="footer-container">
                  <div className="footer-brand-section">
                    <Link to="/" className="footer-logo">
                      KICKS<span>HUB</span>
                    </Link>
                    <p className="footer-tagline">
                      The premier marketplace for authentic sneakers, limited heat drops, and real-time size-based stock.
                    </p>
                  </div>

                  <div className="footer-links-group">
                    <h4>Shop Sneakers</h4>
                    <ul>
                      <li><Link to="/products">All Drops</Link></li>
                      <li><Link to="/products?category=running">Running Shoes</Link></li>
                      <li><Link to="/products?category=lifestyle">Lifestyle Retro</Link></li>
                      <li><Link to="/products?category=basketball">Court Basketball</Link></li>
                    </ul>
                  </div>

                  <div className="footer-links-group">
                    <h4>Customer Service</h4>
                    <ul>
                      <li><Link to="/products">Verified Authentic Drops</Link></li>
                      <li><Link to="/orders">Order Tracking & History</Link></li>
                      <li><Link to="/cart">Review Shopping Bag</Link></li>
                    </ul>
                  </div>

                  <div className="footer-links-group">
                    <h4>My Account</h4>
                    <ul>
                      <li><Link to="/account">Account Settings</Link></li>
                      <li><Link to="/orders">Past Purchases</Link></li>
                      <li><Link to="/login">Sign In / Register</Link></li>
                    </ul>
                  </div>
                </div>

                <div className="footer-bottom-bar">
                  <span>© 2026 KicksHub Inc. All rights reserved.</span>
                  <span>Verified Authentic • Fast Pan-India Delivery</span>
                </div>
              </footer>
            )}
          </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
