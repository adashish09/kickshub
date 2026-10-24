import axios from 'axios';

// Centralized Axios client with configurable base URL and timeout
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 75000, // 75 seconds to allow cloud instances (Render free tier) to spin up on cold start
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// In-memory token storage (never written to localStorage for security)
let inMemoryAccessToken = null;
let inMemoryCsrfToken = null;
let onAuthFailureCallback = null;

export const setAccessToken = (token) => {
  inMemoryAccessToken = token;
};

export const getAccessToken = () => inMemoryAccessToken;

export const setCsrfToken = (token) => {
  inMemoryCsrfToken = token;
};

export const getCsrfToken = () => inMemoryCsrfToken;

export const registerAuthFailureHandler = (cb) => {
  onAuthFailureCallback = cb;
};

// Request Interceptor: Attach in-memory access token and CSRF token when applicable
apiClient.interceptors.request.use(
  (config) => {
    if (inMemoryAccessToken) {
      config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
    }
    // Attach CSRF token on mutation requests if available
    if (
      inMemoryCsrfToken &&
      ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())
    ) {
      config.headers['X-CSRF-TOKEN'] = inMemoryCsrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Queue failed requests on 401 and handle cold-start server wakeups
let isRefreshing = false;
let refreshQueue = [];

const processRefreshQueue = (error, newToken = null) => {
  refreshQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(newToken);
    }
  });
  refreshQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not attempt refresh on auth endpoints (login, register, refresh, logout) or if already retried
    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/logout');

    // 1. Silent token refresh on 401
    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // Queue this request until current refresh finishes
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await apiClient.post('/auth/refresh');
        const newToken = refreshResponse.data.access_token;
        setAccessToken(newToken);
        processRefreshQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processRefreshQueue(refreshError, null);
        setAccessToken(null);
        if (typeof onAuthFailureCallback === 'function') {
          onAuthFailureCallback();
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // 2. Automatic Cloud Cold-Start Retry: If an idempotent GET fails because the cloud instance is booting
    const method = (originalRequest?.method || 'get').toLowerCase();
    const isIdempotent = ['get', 'head', 'options'].includes(method);
    const isNetworkOrColdStart =
      !error.response ||
      error.code === 'ECONNABORTED' ||
      (error.response?.status >= 502 && error.response?.status <= 504);

    if (isIdempotent && isNetworkOrColdStart && !isAuthEndpoint) {
      originalRequest._coldStartRetryCount = (originalRequest._coldStartRetryCount || 0) + 1;
      if (originalRequest._coldStartRetryCount <= 2) {
        // Wait 2.5 seconds before retrying to give the sleeping server time to finish spinning up
        await new Promise((resolve) => setTimeout(resolve, 2500));
        return apiClient(originalRequest);
      }
    }

    // 3. User-friendly formatting for timeout and network wake-up errors
    if (error.code === 'ECONNABORTED' || (error.message && error.message.includes('timeout'))) {
      error.friendlyMessage =
        'The cloud server is taking longer than usual to awaken (~60s on Render free tier). Please retry in a moment.';
    } else if (!error.response) {
      error.friendlyMessage =
        'Unable to connect to the cloud server. The backend may still be spinning up from sleep mode.';
    }

    return Promise.reject(error);
  }
);

/**
 * Format a numeric/decimal price into Indian Rupee (INR) currency representation.
 * @param {string|number} price
 * @returns {string} e.g. "₹129.99"
 */
export function formatINR(price) {
  if (price === undefined || price === null || price === '') return '₹0.00';
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return '₹0.00';
  return (
    '₹' +
    num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

// ---------------------------------------------------------------------------
// Authentication API Endpoints
// ---------------------------------------------------------------------------

/**
 * Register a new user account.
 * @param {{name: string, email: string, password: string}} userData
 */
export async function apiRegister(userData) {
  const response = await apiClient.post('/auth/register', userData);
  return response.data;
}

/**
 * Log in with user credentials.
 * @param {{email: string, password: string}} credentials
 */
export async function apiLogin(credentials) {
  const response = await apiClient.post('/auth/login', credentials);
  if (response.data.access_token) {
    setAccessToken(response.data.access_token);
  }
  if (response.data.csrf_token) {
    setCsrfToken(response.data.csrf_token);
  }
  return response.data;
}

/**
 * Silently refresh the access token using HttpOnly cookie.
 */
export async function apiRefresh() {
  const response = await apiClient.post('/auth/refresh');
  if (response.data.access_token) {
    setAccessToken(response.data.access_token);
  }
  return response.data;
}

/**
 * Log out user and revoke refresh token.
 */
export async function apiLogout() {
  try {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  } finally {
    setAccessToken(null);
    setCsrfToken(null);
  }
}

/**
 * Get current authenticated user profile via /auth/me.
 */
export async function apiGetMe() {
  const response = await apiClient.get('/auth/me');
  return response.data;
}

/**
 * Get user profile via /users/me.
 */
export async function apiGetUserProfile() {
  const response = await apiClient.get('/users/me');
  return response.data;
}

/**
 * Update user profile (e.g. name).
 * @param {{name?: string}} updates
 */
export async function apiUpdateProfile(updates) {
  const response = await apiClient.patch('/users/me', updates);
  return response.data;
}

/**
 * Change authenticated user's password.
 * @param {{current_password: string, new_password: string}} data
 */
export async function apiChangePassword(data) {
  const response = await apiClient.post('/users/me/change-password', data);
  return response.data;
}

// ---------------------------------------------------------------------------
// Product Catalog Endpoints (Phase 2)
// ---------------------------------------------------------------------------

/**
 * Fetch paginated, filtered catalog products.
 * @param {Object} params Query parameters
 * @param {AbortSignal} [signal]
 */
export async function getProducts(params = {}, signal) {
  const cleanParams = {};
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      cleanParams[key] = val;
    }
  });

  const response = await apiClient.get('/products', {
    params: cleanParams,
    signal,
  });
  return response.data;
}

/**
 * Fetch detailed product by slug including variants.
 * @param {string} slug
 * @param {AbortSignal} [signal]
 */
export async function getProductBySlug(slug, signal) {
  const response = await apiClient.get(`/products/${encodeURIComponent(slug)}`, { signal });
  return response.data;
}

/**
 * Fetch variants for a product by ID.
 * @param {number} productId
 * @param {AbortSignal} [signal]
 */
export async function getProductVariants(productId, signal) {
  const response = await apiClient.get(`/products/${productId}/variants`, { signal });
  return response.data.items || [];
}

/**
 * Fetch categories used by active catalog products.
 * @param {AbortSignal} [signal]
 */
export async function getCategories(signal) {
  const response = await apiClient.get('/categories', { signal });
  return response.data.items || [];
}

/**
 * Check backend service liveness.
 */
export async function checkBackendHealth() {
  try {
    const response = await apiClient.get('/health');
    return {
      success: true,
      data: response.data,
      status: response.status,
    };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.message || err.message || 'Unable to connect to backend service',
      status: err.response?.status || 0,
    };
  }
}

/**
 * Check database readiness through backend probe.
 */
export async function checkDatabaseHealth() {
  try {
    const response = await apiClient.get('/health/db');
    return {
      success: true,
      data: response.data,
      status: response.status,
    };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.database || err.message || 'Database unavailable',
      status: err.response?.status || 503,
    };
  }
}

// ---------------------------------------------------------------------------
// Shopping Cart Endpoints (Phase 4)
// ---------------------------------------------------------------------------

/**
 * Fetch the authenticated user's persistent cart.
 */
export async function apiGetCart() {
  const response = await apiClient.get('/cart');
  return response.data;
}

/**
 * Add a sneaker variant to the user's cart.
 * @param {number} variantId
 * @param {number} [quantity=1]
 */
export async function apiAddToCart(variantId, quantity = 1) {
  const response = await apiClient.post('/cart/items', {
    variant_id: variantId,
    quantity,
  });
  return response.data;
}

/**
 * Update the quantity of a line item in the cart.
 * @param {number} itemId
 * @param {number} quantity
 */
export async function apiUpdateCartItem(itemId, quantity) {
  const response = await apiClient.patch(`/cart/items/${itemId}`, {
    quantity,
  });
  return response.data;
}

/**
 * Remove an item from the cart.
 * @param {number} itemId
 */
export async function apiRemoveCartItem(itemId) {
  const response = await apiClient.delete(`/cart/items/${itemId}`);
  return response.data;
}

/**
 * Clear all items from the cart.
 */
export async function apiClearCart() {
  const response = await apiClient.delete('/cart/items');
  return response.data;
}

/**
 * Fetch cart summary (item count and subtotal).
 */
export async function apiGetCartSummary() {
  const response = await apiClient.get('/cart/summary');
  return response.data;
}

// ---------------------------------------------------------------------------
// Addresses API Endpoints
// ---------------------------------------------------------------------------

/**
 * Retrieve saved delivery addresses for the authenticated user.
 */
export async function apiGetAddresses() {
  const response = await apiClient.get('/addresses');
  return response.data;
}

/**
 * Save a new delivery address for the authenticated user.
 * @param {object} addressData
 */
export async function apiCreateAddress(addressData) {
  const response = await apiClient.post('/addresses', addressData);
  return response.data;
}

/**
 * Update an existing delivery address for the authenticated user.
 * @param {number} addressId
 * @param {object} addressData
 */
export async function apiUpdateAddress(addressId, addressData) {
  const response = await apiClient.put(`/addresses/${addressId}`, addressData);
  return response.data;
}

/**
 * Delete a delivery address for the authenticated user.
 * @param {number} addressId
 */
export async function apiDeleteAddress(addressId) {
  const response = await apiClient.delete(`/addresses/${addressId}`);
  return response.data;
}

// ---------------------------------------------------------------------------
// Orders API Endpoints
// ---------------------------------------------------------------------------

/**
 * Place a new order from the current user's shopping cart.
 * @param {{address_id: number, idempotency_key?: string}} orderData
 */
export async function apiCreateOrder(orderData) {
  const response = await apiClient.post('/orders', orderData);
  return response.data;
}

/**
 * Retrieve paginated order history for the authenticated user.
 * @param {number} [page=1]
 * @param {number} [perPage=10]
 */
export async function apiGetOrders(page = 1, perPage = 10) {
  const response = await apiClient.get('/orders', {
    params: { page, per_page: perPage },
  });
  return response.data;
}

/**
 * Retrieve specific order details by ID.
 * @param {number} orderId
 */
export async function apiGetOrderById(orderId) {
  const response = await apiClient.get(`/orders/${orderId}`);
  return response.data;
}

// ---------------------------------------------------------------------------
// Admin API Endpoints
// ---------------------------------------------------------------------------

/**
 * Retrieve admin dashboard summary stats and recent orders.
 */
export async function adminGetDashboard() {
  const response = await apiClient.get('/admin/dashboard');
  return response.data;
}

/**
 * Retrieve paginated product list for admin panel with search & filters.
 */
export async function adminGetProducts(params = {}) {
  const response = await apiClient.get('/admin/products', { params });
  return response.data;
}

/**
 * Retrieve full product details including variants for editing.
 */
export async function adminGetProduct(productId) {
  const response = await apiClient.get(`/admin/products/${productId}`);
  return response.data;
}

/**
 * Create a new product and its size/color variants atomically.
 */
export async function adminCreateProduct(payload) {
  const response = await apiClient.post('/admin/products', payload);
  return response.data;
}

/**
 * Update an existing product and its variants.
 */
export async function adminUpdateProduct(productId, payload) {
  const response = await apiClient.patch(`/admin/products/${productId}`, payload);
  return response.data;
}

/**
 * Safely delete or deactivate a product.
 */
export async function adminDeleteProduct(productId) {
  const response = await apiClient.delete(`/admin/products/${productId}`);
  return response.data;
}

/**
 * List all categories with product counts.
 */
export async function adminGetCategories() {
  const response = await apiClient.get('/admin/categories');
  return response.data;
}

/**
 * Create a new category.
 */
export async function adminCreateCategory(payload) {
  const response = await apiClient.post('/admin/categories', payload);
  return response.data;
}

/**
 * Update an existing category.
 */
export async function adminUpdateCategory(categoryId, payload) {
  const response = await apiClient.patch(`/admin/categories/${categoryId}`, payload);
  return response.data;
}

/**
 * Delete a category (only if empty).
 */
export async function adminDeleteCategory(categoryId) {
  const response = await apiClient.delete(`/admin/categories/${categoryId}`);
  return response.data;
}

/**
 * List customer orders with pagination, search, and status filters.
 */
export async function adminGetOrders(params = {}) {
  const response = await apiClient.get('/admin/orders', { params });
  return response.data;
}

/**
 * Retrieve full order details including delivery address, items, and payments.
 */
export async function adminGetOrderDetail(orderId) {
  const response = await apiClient.get(`/admin/orders/${orderId}`);
  return response.data;
}

/**
 * Update order lifecycle status.
 */
export async function adminUpdateOrderStatus(orderId, status) {
  const response = await apiClient.patch(`/admin/orders/${orderId}/status`, { status });
  return response.data;
}

/**
 * List registered user accounts safely.
 */
export async function adminGetUsers(params = {}) {
  const response = await apiClient.get('/admin/users', { params });
  return response.data;
}

export default apiClient;



