# KicksHub — Sneaker E-Commerce Platform

KicksHub is a modern sneaker e-commerce web application focused on sneaker releases, size-based product variants, and limited-stock inventory management.

This repository contains the completed implementations of:
- **Phase 1: Foundation & Database** (Flask application factory, MySQL schema tables, Alembic migrations, idempotent seed data, health checks, test suite).
- **Phase 2: Product Catalog API & React Storefront** (Complete RESTful catalog endpoints, filtering, search, sorting, server-side pagination, product details with dynamic size/color availability, responsive React storefront).
- **Phase 3: Authentication and Account Management** (Secure token-based auth with Flask-JWT-Extended, in-memory access tokens, HttpOnly refresh cookies, CSRF protection, persistent token revocation sessions, password hashing with Werkzeug, React auth pages, Axios silent refresh interceptors, and protected routes).
- **Phase 4: Persistent Shopping Cart** (Database-backed shopping cart with Flask-SQLAlchemy, strict user ownership, line items, quantity controls, stock verification, Decimal currency calculations, centralized React `CartContext`, interactive navbar badge, dedicated `/cart` page with quantity adjustment, item removal, clear bag confirmation modal, empty cart states, and seamless Phase 3 auth integration).
- **Phase 5: Checkout, Orders, and Real-Time Add-to-Bag Feedback** (Immediate dual-metric feedback on every Add to Bag click communicating current addition and variant in-bag count, persistent in-bag indicators, delivery address management, transactional checkout, historical snapshot preservation for order items and addresses, concurrency row-locking and stock decrements, idempotency key replay protection, honest pending/simulated payment statuses, order confirmation page, and paginated order history).
- **Phase 6: Production-Style E-commerce UX, Responsive Redesign, and Cart Improvements** (Full responsive optimization from 320px small mobile to 1440px desktop, sliding mini-cart drawer with instant dual-metric feedback, mobile catalog filter drawer with active count badges, mobile navigation drawer with search, complete removal of technical diagnostic clutter and roadmap displays from storefront, retail-grade footer, SVG icon replacements for emoji substitutes, and focus-visible accessibility polish).
- **Phase 7: Minimalist Theme, Typography Refresh, and Responsive Optimization** (Cohesive minimalist light theme inspired by contemporary sneaker storefronts: warm off-white `#FAF9F6` canvas, pure white surfaces `#FFFFFF`, charcoal `#242424` typography, soft neutral `#E7E4DE` borders, muted sage `#73766A` subtle accent; primary font refresh to Manrope with geometric clarity and `font-display: swap`; unified fluid layout system `clamp(16px, 4vw, 56px)` with max-width container; elimination of oversized 9999px pills and dark gradient blocks in favor of restrained radii and airy aesthetics; audited across 320px–1440px viewports with zero horizontal overflow).
- **Phase 8: Admin Panel, UI/UX Refinement, Mobile Navigation, Search Optimization & Hero Redesign** (Role-based access control with `@admin_required` backend guard and `AdminRoute` frontend guard; secure CLI administrator provisioning via `flask promote-admin` and `flask create-admin`; comprehensive admin suite with dashboard metrics, product & variant CRUD with historical order reference protection, category management, order fulfillment transitions, and customer audit; root-cause diagnosis and repair of mobile navigation drawer opacity/blur defects; fix for sidebar search button disappearing bug; redesigned homepage hero with sneaker photography, reserved aspect ratio, and balanced responsive layout; verified across 320px–1440px viewports with 91 backend automated tests).

---

## 1. Technology Stack

### Backend
- **Language & Runtime:** Python 3.14+
- **Web Framework:** Flask 3.1 (Application Factory Pattern)
- **Authentication:** Flask-JWT-Extended 4.7 & PyJWT 2.15
- **ORM:** Flask-SQLAlchemy 3.1 / SQLAlchemy 2.0
- **Database Migrations:** Flask-Migrate 4.1 / Alembic
- **MySQL Driver:** PyMySQL 1.1 with `cryptography` for secure authentication
- **Password Security:** Werkzeug PBKDF2/scrypt password hashing utilities
- **Environment Management:** python-dotenv
- **CORS Management:** Flask-CORS strictly configured with credentials enabled for authorized frontend origins
- **Testing:** Pytest 8.3 (91 automated unit and integration tests)

### Frontend
- **Framework & Tooling:** React 19 with Vite 6
- **Routing:** React Router v7 with protected route redirection
- **HTTP Client:** Axios (Centralized client with automatic in-memory Bearer token injection, request queuing on 401, and silent token refresh)
- **State Management:** Centralized `AuthContext` (token/session lifecycle) and `CartContext` (database-synchronized cart, total unit badges, mutation states, variant in-bag tracking)
- **Design System:** Custom Vanilla CSS design system with modern sneaker-retail aesthetics, responsive product grid, interactive size tiles, member dashboards, shopping bag UI, and streamlined checkout flow

### Database
- **Engine:** MySQL 8.x / 8.4 (InnoDB storage engine)
- **Integrity:** Foreign keys, composite unique constraints, check constraints for positive prices/quantities, unique `(cart_id, variant_id)` constraint, unique `payments.idempotency_key` constraint, and refresh token revocation table

---

## 2. Architecture Overview

```
                           +----------------------------+
                           |     React + Vite Shell     |
                           |   (http://localhost:5173)  |
                           |   - Landing & Drops        |
                           |   - Catalog with Filters   |
                           |   - Sneaker Details & Sizes|
                           |   - Real-Time Bag Feedback |
                           |   - Shopping Bag (/cart)   |
                           |   - Checkout (/checkout)   |
                           |   - Order Confirmation     |
                           |   - Order History (/orders)|
                           |   - Member Sign In/Register|
                           |   - Account & Security     |
                           +--------------+-------------+
                                          |
                                          | Axios HTTP Client
                                          | (Bearer Access Token in memory)
                                          | (HttpOnly Refresh Cookie)
                                          v
                           +----------------------------+
                           |    Flask Application API   |
                           |   (http://localhost:5000)  |
                           |   - /api/v1/health         |
                           |   - /api/v1/health/db      |
                           |   - /api/v1/products       |
                           |   - /api/v1/products/<slug>|
                           |   - /api/v1/categories     |
                           |   - /api/v1/auth/*         |
                           |   - /api/v1/users/me       |
                           |   - /api/v1/cart/*         |
                           |   - /api/v1/addresses      |
                           |   - /api/v1/orders/*       |
                           +--------------+-------------+
                                          |
                                          | PyMySQL / SQLAlchemy
                                          v
+---------------------------------------------------------------------------------+
|                                 MySQL 8.x Database                              |
|                                                                                 |
|  [users] <---> [refresh_tokens] (revocation & session tracking)                 |
|    |                                                                            |
|    +---------> [carts] <---> [cart_items] ---> [product_variants] <--- [products]|
|    |                                                                      |     |
|    +---------> [addresses]                                                |     |
|    |                                                                      v     |
|    +---------> [orders] <---> [order_items] (snapshot preserved)      [categories]
|                   |                                                             |
|                   +---------> [payments]                                        |
+---------------------------------------------------------------------------------+
```

---

## 3. Authentication & Account Architecture (Phase 3)

### 3.1 Token Strategy & Storage Security
- **Access Tokens:** Short-lived (15 minutes). Kept exclusively in React application memory via `AuthContext` and Axios headers. Never written to `localStorage` or `sessionStorage` to eliminate XSS token theft.
- **Refresh Tokens:** Long-lived (7 days). Issued as an `HttpOnly`, `SameSite=Lax` cookie (`kickshub_refresh_token`) scoped strictly to `/api/v1/auth`. JavaScript cannot access this cookie.
- **CSRF Protection:** Enabled on cookie-authenticated refresh and logout operations (`JWT_COOKIE_CSRF_PROTECT = True`). Flask-JWT-Extended issues double-submit CSRF cookies (`csrf_refresh_token`) and validates the `X-CSRF-TOKEN` header on mutation calls.
- **Token Revocation & Sessions:** Every refresh token has a corresponding record in the MySQL `refresh_tokens` table with a unique `jti` (JWT ID). Tokens are checked against the database upon refresh (`@jwt.token_in_blocklist_loader`). Revoked tokens cannot be reused.
- **Password Changes:** Changing a password immediately revokes all active refresh tokens for the user in the database, invalidating prior sessions across all devices.

### 3.2 CORS & Cookie Configuration
| Environment | `JWT_COOKIE_SECURE` | `JWT_COOKIE_SAMESITE` | `FRONTEND_ORIGIN` | Credentials |
| :--- | :--- | :--- | :--- | :--- |
| **Development** | `False` (allows HTTP) | `Lax` | `http://localhost:5173` (and `127.0.0.1:5173`) | `True` |
| **Testing** | `False` | `Lax` | Isolated test client | `True` |
| **Production** | `True` (enforces HTTPS) | `Lax` or `Strict` | Strictly authorized domain | `True` |

---

## 4. API Endpoints Reference

All endpoints are versioned under `/api/v1`.

### 4.1 Authentication Endpoints (`/api/v1/auth`)

#### 1. Register Account
- **URL:** `POST /api/v1/auth/register`
- **Request Body:**
  ```json
  {
    "name": "Jordan Fan",
    "email": "jordan@example.com",
    "password": "StrongPassword123!"
  }
  ```
- **Validation Rules:**
  - `name`: 2–150 characters, trimmed.
  - `email`: Valid format, normalized to lowercase, unique across database.
  - `password`: 8–128 characters, requires letters and numbers or symbols.
- **Response (201 Created):**
  ```json
  {
    "user": {
      "id": 3,
      "name": "Jordan Fan",
      "email": "jordan@example.com",
      "role": "customer",
      "created_at": "2026-10-21T09:30:00"
    }
  }
  ```
- **Duplicate Email:** Returns `409 Conflict` with `code: "DUPLICATE_EMAIL"`.

#### 2. User Login
- **URL:** `POST /api/v1/auth/login`
- **Request Body:**
  ```json
  {
    "email": "jordan@example.com",
    "password": "StrongPassword123!"
  }
  ```
- **Response (200 OK):**
  Sets `HttpOnly` cookie `kickshub_refresh_token` and `csrf_refresh_token`.
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1Ni...",
    "csrf_token": "2fd92fd3-712a-4e84-acbc-c91aba01ad98",
    "user": {
      "id": 3,
      "name": "Jordan Fan",
      "email": "jordan@example.com",
      "role": "customer",
      "created_at": "2026-10-21T09:30:00"
    }
  }
  ```
- **Invalid Credentials:** Returns `401 Unauthorized` with generic message `Invalid email or password.`

#### 3. Refresh Access Token
- **URL:** `POST /api/v1/auth/refresh`
- **Headers:** `X-CSRF-TOKEN: <csrf_token>` (when cookies are used)
- **Cookies:** `kickshub_refresh_token`
- **Response (200 OK):**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1Ni..."
  }
  ```
- **Revoked / Expired Token:** Returns `401 Unauthorized`.

#### 4. Logout
- **URL:** `POST /api/v1/auth/logout`
- **Cookies:** `kickshub_refresh_token`
- **Headers:** `X-CSRF-TOKEN: <csrf_token>`
- **Response (200 OK):**
  Revokes active refresh session in MySQL and unsets cookies.
  ```json
  {
    "message": "Successfully logged out."
  }
  ```

#### 5. Current Authenticated User
- **URL:** `GET /api/v1/auth/me`
- **Headers:** `Authorization: Bearer <access_token>`
- **Response (200 OK):** Returns current user safe profile. Missing or invalid token returns `401 Unauthorized`.

---

### 4.2 User Profile Endpoints (`/api/v1/users`)

#### 1. Get Profile
- **URL:** `GET /api/v1/users/me`
- **Headers:** `Authorization: Bearer <access_token>`
- **Response (200 OK):** Returns authenticated user profile.

#### 2. Update Profile
- **URL:** `PATCH /api/v1/users/me`
- **Headers:** `Authorization: Bearer <access_token>`
- **Request Body:**
  ```json
  {
    "name": "Jordan Fan Pro"
  }
  ```
- **Permitted Fields:** Only `name` can be updated. Attempts to alter `role`, `email`, `is_active`, or password hashes are rejected with `400 Bad Request`.
- **Response (200 OK):** Returns updated user profile.

#### 3. Change Password
- **URL:** `POST /api/v1/users/me/change-password`
- **Headers:** `Authorization: Bearer <access_token>`
- **Request Body:**
  ```json
  {
    "current_password": "OldPassword123!",
    "new_password": "NewStrongPassword456!"
  }
  ```
- **Requirements:** Verifies current password, enforces password policy on new password, updates hash, and revokes all active refresh sessions for this user.
- **Response (200 OK):**
  ```json
  {
    "message": "Password changed successfully. Please log in again."
  }
  ```

---

### 4.3 Product Catalog Endpoints (`/api/v1/products`)
- `GET /api/v1/products`: List sneakers with filtering (category, brand, size, price, stock), search, sorting, and pagination.
- `GET /api/v1/products/<slug>`: Retrieve product details including category and variant inventory.
- `GET /api/v1/products/<id>/variants`: Retrieve variant stock by product ID.
- `GET /api/v1/categories`: Retrieve list of active catalog categories.

---

### 4.4 Shopping Cart Endpoints (`/api/v1/cart`)

All cart endpoints require a valid JWT access token (`Authorization: Bearer <access_token>`).

#### 1. Retrieve Current User's Cart
- **URL:** `GET /api/v1/cart`
- **Response (200 OK):**
  ```json
  {
    "id": 1,
    "user_id": 2,
    "items": [
      {
        "id": 10,
        "variant_id": 1,
        "product": {
          "id": 1,
          "name": "Air Jordan 1 Retro High OG 'Chicago'",
          "slug": "air-jordan-1-retro-high-og-chicago",
          "brand": "Jordan",
          "image": "/images/products/air-jordan-1-chicago.png"
        },
        "size": "UK 9",
        "color": "Chicago Red/White/Black",
        "unit_price": "179.99",
        "quantity": 2,
        "line_total": "359.98",
        "available": true,
        "stock_quantity": 8
      }
    ],
    "item_count": 2,
    "subtotal": "359.98",
    "updated_at": "2026-10-21T15:30:00"
  }
  ```
- **Empty Cart:** Returns `{"id": 1, "items": [], "item_count": 0, "subtotal": "0.00"}` cleanly.

#### 2. Add Variant to Cart
- **URL:** `POST /api/v1/cart/items`
- **Request Body:**
  ```json
  {
    "variant_id": 1,
    "quantity": 1
  }
  ```
- **Behavior:**
  - Slices existing variant rows; if the variant already exists in the cart, increments `quantity`.
  - Enforces `MAX_ITEM_QUANTITY = 10` and checks against `product_variants.stock_quantity`.
- **Response (200 OK):** Returns full updated cart object.
- **Errors:**
  - `400 Bad Request`: Inactive product, unavailable variant, out of stock, exceeds stock, or quantity > 10.
  - `404 Not Found`: Variant does not exist.

#### 3. Update Cart Item Quantity
- **URL:** `PATCH /api/v1/cart/items/<int:item_id>`
- **Request Body:**
  ```json
  {
    "quantity": 3
  }
  ```
- **Behavior:** Verifies item ownership, validates quantity against stock limits, recalculates line total and subtotal. Disallows modifying `variant_id`.
- **Response (200 OK):** Returns updated cart object.

#### 4. Remove Item from Cart
- **URL:** `DELETE /api/v1/cart/items/<int:item_id>`
- **Behavior:** Verifies item ownership and deletes the specific line item.
- **Response (200 OK):**
  ```json
  {
    "message": "Item removed from cart.",
    "cart": { ... }
  }
  ```

#### 5. Clear Entire Cart
- **URL:** `DELETE /api/v1/cart/items`
- **Behavior:** Removes all items belonging exclusively to the authenticated user's cart.
- **Response (200 OK):** Returns cleared cart with `items: []`, `item_count: 0`, and `subtotal: "0.00"`.

#### 6. Cart Summary
- **URL:** `GET /api/v1/cart/summary`
- **Response (200 OK):**
  ```json
  {
    "item_count": 2,
    "subtotal": "359.98"
  }
  ```

---

### 4.5 Delivery Address Endpoints (`/api/v1/addresses`)

#### 1. List User Addresses
- **URL:** `GET /api/v1/addresses`
- **Authentication:** Required (JWT Bearer)
- **Response (200 OK):**
  ```json
  {
    "addresses": [
      {
        "id": 1,
        "user_id": 2,
        "full_name": "Jordan Fan",
        "phone": "+1 555-0199",
        "street_address": "742 Evergreen Terrace",
        "apartment": "Apt 4B",
        "city": "Springfield",
        "state": "OR",
        "postal_code": "97477",
        "country": "US",
        "is_default": true,
        "created_at": "2026-10-21T10:00:00"
      }
    ]
  }
  ```

#### 2. Create Delivery Address
- **URL:** `POST /api/v1/addresses`
- **Authentication:** Required (JWT Bearer)
- **Request Body:**
  ```json
  {
    "full_name": "Jordan Fan",
    "phone": "+1 555-0199",
    "street_address": "742 Evergreen Terrace",
    "apartment": "Apt 4B",
    "city": "Springfield",
    "state": "OR",
    "postal_code": "97477",
    "country": "US",
    "is_default": true
  }
  ```
- **Validation Rules:**
  - `full_name`: Required, max 150 chars.
  - `phone`: Required, max 30 chars.
  - `street_address`: Required, max 255 chars.
  - `city`, `state`, `postal_code`: Required.
  - `country`: Required, ISO alpha-2 (defaults to `US`).
- **Response (201 Created):** Returns created address object.

---

### 4.6 Order Endpoints (`/api/v1/orders`)

#### 1. Place Order (Transactional Checkout)
- **URL:** `POST /api/v1/orders`
- **Authentication:** Required (JWT Bearer)
- **Request Body:**
  ```json
  {
    "address_id": 1,
    "idempotency_key": "kh_ord_c8b1a3f0"
  }
  ```
- **Behavior:**
  1. Identifies authenticated user and verifies address ownership.
  2. Acquires row locks (`with_for_update()`) on product variants in cart.
  3. Revalidates stock availability; decrements stock transactionally.
  4. Recalculates unit prices, line totals, and final order total server-side with `Decimal`.
  5. Creates `Order` with status `"confirmed"`.
  6. Creates immutable `OrderItem` snapshots (product name, size, color, SKU, price, line total).
  7. Creates `Payment` record with honest `"simulated"` provider and `"pending"` status.
  8. Clears the user's cart in the same atomic transaction.
  9. Handles repeated requests with identical `idempotency_key` safely without duplicate order creation.
- **Response (201 Created):**
  ```json
  {
    "message": "Order placed successfully.",
    "order": {
      "id": 1,
      "user_id": 2,
      "status": "confirmed",
      "currency": "INR",
      "subtotal": "359.98",
      "shipping_fee": "0.00",
      "discount_amount": "0.00",
      "total_amount": "359.98",
      "created_at": "2026-10-21T15:45:00",
      "delivery_address": {
        "full_name": "Jordan Fan",
        "phone": "+1 555-0199",
        "street_address": "742 Evergreen Terrace",
        "apartment": "Apt 4B",
        "city": "Springfield",
        "state": "OR",
        "postal_code": "97477",
        "country": "US"
      },
      "items": [
        {
          "id": 1,
          "product_id": 1,
          "variant_id": 1,
          "product_name": "Air Retro High OG",
          "size_value": "UK 9",
          "color_name": "Bred",
          "sku": "ARH-01-UK9-BRED",
          "unit_price": "179.99",
          "quantity": 2,
          "line_total": "359.98",
          "product_image": "/assets/sneakers/air-retro-high.png"
        }
      ],
      "payments": [
        {
          "id": 1,
          "provider": "simulated",
          "status": "pending",
          "amount": "359.98",
          "transaction_id": "SIM_KH_ORD_1"
        }
      ]
    }
  }
  ```

#### 2. Get User Order History
- **URL:** `GET /api/v1/orders?page=1&per_page=10`
- **Authentication:** Required (JWT Bearer)
- **Response (200 OK):** Returns paginated list of user's orders, sorted newest first (`created_at DESC`), with items and payment snapshots.

#### 3. Get Order by ID
- **URL:** `GET /api/v1/orders/<int:order_id>`
- **Authentication:** Required (JWT Bearer)
- **Response (200 OK):** Returns full historical order snapshot.
- **Security:** Strict ownership check. Requests for orders belonging to another user return `404 Not Found` (zero IDOR exposure).

---

### 4.7 Health Endpoints
- `GET /api/v1/health`: Basic service liveness check.
- `GET /api/v1/health/db`: Database connectivity readiness check.

---

### 4.8 Administrative Endpoints (`/api/v1/admin`)

All administrative endpoints require JWT Bearer authentication and role `admin`. Unauthorized access returns `401 Unauthorized` (unauthenticated) or `403 Forbidden` with `"Administrator privileges required."` (customer role).

#### 1. Dashboard Metrics
- **URL:** `GET /api/v1/admin/dashboard`
- **Response (200 OK):** Real-time aggregate statistics: `total_products`, `active_products`, `total_orders`, `pending_orders`, `total_customers`, and `recent_orders` list.

#### 2. Products Management
- **List Products:** `GET /api/v1/admin/products?page=1&per_page=15&search=&category_id=&status=`
  Returns paginated products with SKU count, total stock, active status, and primary image.
- **Get Product Details:** `GET /api/v1/admin/products/<int:product_id>`
  Returns complete product details along with its size/color variant matrix.
- **Create Product:** `POST /api/v1/admin/products`
  Creates product record and its variants transactionally. Validates unique slugs and unique SKUs.
- **Update Product:** `PATCH /api/v1/admin/products/<int:product_id>`
  Updates name, slug, brand, base price, category, active status, image URL, and variants.
- **Delete / Deactivate Product:** `DELETE /api/v1/admin/products/<int:product_id>`
  Safe archival: If product variants are referenced by past customer orders, automatically deactivates product (`is_active = False`) to preserve immutable order history. If unreferenced, performs hard deletion.

#### 3. Category Management
- **List Categories:** `GET /api/v1/admin/categories`
  Returns all categories with calculated live product counts.
- **Create Category:** `POST /api/v1/admin/categories`
  Validates name and unique slug.
- **Update Category:** `PATCH /api/v1/admin/categories/<int:category_id>`
  Updates name and slug.
- **Delete Category:** `DELETE /api/v1/admin/categories/<int:category_id>`
  Guards against orphaned products: Rejects deletion with `400 Bad Request` (`code: "HAS_PRODUCTS"`) if products are currently assigned to the category.

#### 4. Order Management & Status Transitions
- **List Orders:** `GET /api/v1/admin/orders?page=1&per_page=15&status=&search=`
  Paginated orders sorted newest first with customer info and payment summaries.
- **Get Order Detail:** `GET /api/v1/admin/orders/<int:order_id>`
  Deep snapshot with customer, delivery address, payment, and line items.
- **Update Order Status:** `PATCH /api/v1/admin/orders/<int:order_id>/status`
  Enforces strict state machine transitions (`pending` → `confirmed` / `cancelled`, `confirmed` → `completed` / `cancelled`). Terminal states cannot be altered.

#### 5. Customer Account Audit
- **List Customers:** `GET /api/v1/admin/users?page=1&per_page=20&search=`
  Lists customer accounts with registration dates, order counts, and active status. Never exposes passwords, hashes, or security tokens.

---

## 5. Shopping Cart Architecture & Business Rules (Phase 4)

### 5.1 Data Model & Constraints
- **`carts` Table:**
  - `id`: Auto-increment integer primary key.
  - `user_id`: Foreign key referencing `users.id` with `unique=True` and `ondelete="CASCADE"`. Enforces one active cart per authenticated user.
  - `created_at`, `updated_at`: UTC timestamps.
- **`cart_items` Table:**
  - `id`: Auto-increment integer primary key.
  - `cart_id`: Foreign key referencing `carts.id` with `ondelete="CASCADE"`.
  - `variant_id`: Foreign key referencing `product_variants.id` with `ondelete="CASCADE"`.
  - `quantity`: Integer with check constraint `quantity > 0`.
  - `UniqueConstraint("cart_id", "variant_id", name="uq_cart_items_cart_variant")`: Guarantees database-level uniqueness; prevented duplicate variant rows.

### 5.2 Server-Authoritative Pricing & Subtotal Policy
- **No Client Price Trust:** Unit prices, totals, discounts, and currency calculations sent from the browser are ignored. All prices originate from `product_variants.price` in MySQL.
- **Decimal-Exact Arithmetic:** Subtotals and line totals are computed using Python's `Decimal` module:
  $$\text{line\_total} = (\text{variant.price} \times \text{quantity}).\text{quantize}(0.01)$$
  $$\text{subtotal} = \sum \text{line\_total}$$
- Monies are serialized as two-decimal strings (e.g. `"179.99"`). Storefront UI formats values with the appropriate currency symbol (defaults to ₹ / INR).

### 5.3 Backend Business Rules
1. **Authentication Requirement:** All cart endpoints strictly require valid JWT access tokens.
2. **Strict Cart Ownership:** Insecure direct object references (IDOR) are prevented by verifying that the targeted `CartItem` belongs to the requesting user's cart on every `PATCH` and `DELETE`.
3. **Repeat Variant Additions:** Adding a variant already present increments the line quantity rather than creating duplicate records.
4. **Stock & Quantity Limits:**
   - Products with `is_active=False` cannot be added to a cart.
   - Out-of-stock variants (`stock_quantity = 0`) cannot be added.
   - Quantities exceeding stock or exceeding `MAX_ITEM_QUANTITY = 10` are rejected with clean HTTP 400 errors.
5. **Transactional Integrity:** All cart operations execute inside atomic database transactions, automatically rolling back on integrity or validation failures.
6. **Lazy Initialization:** An empty cart is lazily provisioned on the user's first cart action.

### 5.4 React Storefront Integration
- **`CartContext` State Management:**
  - Synchronizes with the backend as the single source of truth.
  - Automatically fetches the authenticated user's cart on login or token restoration.
  - Completely clears private cart state in memory upon logout, ensuring zero data leakage between users.
- **Product Detail Add to Bag:**
  - Requires size and color selection.
  - Disables out-of-stock variants.
  - Shows loading state and displays toast feedback with a "View Shopping Bag" shortcut.
  - Unauthenticated visitors are redirected to `/login` with return-path preservation.
- **Dedicated `/cart` Page:**
  - Displays product thumbnail, brand, name, size, color, unit price, quantity, line total, and subtotal.
  - Interactive quantity stepper (`+` / `-`) with optimistic item-level loading feedback.
  - Single item removal action.
  - "Clear Bag" modal confirmation dialog preventing accidental basket wipeout.
  - Clean empty bag state with direct link to browse sneakers.
  - Disabled placeholder button: "Proceed to Checkout (Phase 5)".
- **Navbar Cart Badge:** Shows the total units sum across all items in the bag (e.g. 2 pairs + 1 pair = badge 3).

---

## 6. Checkout, Orders, and Add-to-Bag Architecture (Phase 5)

### 6.1 Real-Time Add-to-Bag Dual-Metric Feedback (Part A)
- **Problem Solved:** Previously, clicking "Add to Bag" gave generic feedback without indicating how many items were in the user's bag.
- **Dual-Metric Feedback:** Every addition immediately communicates:
  1. The exact quantity added in the current operation (`quantity_added`).
  2. The new total quantity of that specific variant in the user's bag (`variant_quantity`).
  - *First click:* "✓ Added 1 · 1 in bag" (supporting text: "Added 1 pair. You now have 1 of this size and color in your bag.")
  - *Second click:* "✓ Added 1 · 2 in bag" (supporting text: "Added 1 more pair. You now have 2 of this size and color in your bag.")
- **Persistent Variant In-Bag Indicator:** Adjacent to the action button, an indicator persists the count for the currently selected size and color (`"2 of this exact size & color currently in your bag"`).
- **Variant Isolation:** Switching size or color immediately resets the feedback button and displays the newly selected variant's own bag count from authoritative cart state.
- **Global Badge Synchronization:** The navigation cart badge tracks total items across all items in the cart (e.g. 2 UK 9 Bred + 1 UK 8 White = badge count 3).
- **Rapid-Click Concurrency Guard:** The Add to Bag button disables and displays "Adding..." during pending requests, preventing duplicate accidental submissions while allowing deliberate additions once completed.

### 6.2 Transactional Checkout & Order Lifecycle (Part B)
- **Strict Server-Authoritative Pricing:**
  - Client-supplied prices, totals, taxes, or shipping values are completely ignored.
  - Line totals and final order sums are calculated inside the backend transaction using exact `Decimal` precision.
- **Inventory Concurrency & Row Locking:**
  - During checkout (`POST /api/v1/orders`), each variant row is fetched using `db.session.get(ProductVariant, variant_id, with_for_update=True)`.
  - Ensures accurate stock decrementing even under concurrent checkouts for high-demand drops without overselling.
- **Order & Item Snapshot Preservation:**
  - Historical order items do not rely on joining dynamic product catalogs.
  - `order_items` stores permanent snapshots of:
    - `product_name`, `size_value`, `color_name`, `sku`
    - `unit_price`, `quantity`, `line_total`
  - Subsequent catalog price or name changes leave past order records completely unmodified.
- **Transactional Cart Clearance:**
  - Cart clearing happens in the exact same database transaction as `Order`, `OrderItem`, and `Payment` insertion.
  - If stock validation or payment recording fails, the entire transaction rolls back, leaving the user's cart completely intact.
- **Idempotency Mechanism:**
  - The checkout endpoint accepts an `idempotency_key` (generated as a unique client key, e.g. `kh_ord_<uuid>`).
  - Backed by the unique constraint on `payments.idempotency_key`. Replaying a submission returns the existing order safely without duplicate order rows or double inventory decrements.
- **Honest Payment Representation:**
  - In compliance with Phase 5 requirements, no live payment gateway credentials are used.
  - Payment records are explicitly stamped with `provider="simulated"` and initial `status="pending"`, keeping payment status distinct from order status (`"confirmed"`).
- **Security & Authorization:**
  - Strict ownership checks on delivery addresses: submitting another user's address ID is rejected (`400 Bad Request`).
  - Strict ownership checks on order retrieval: accessing another user's order ID returns `404 Not Found` (eliminating IDOR).

### 6.3 React Storefront Integration
- **`/checkout`:**
  - Address selection from saved addresses or inline creation form for new delivery addresses.
  - Order summary sidebar with product thumbnails, sizes, quantities, unit prices, and server-recalculated subtotal and total.
  - Clearly marked simulated payment notice.
  - Place Order button with loading state and duplicate submission prevention.
- **`/order-confirmation/:orderId`:**
  - Order confirmed badge, order ID (`#KH-<id>`), snapshot item details, delivery destination, payment status badge, and "Continue Shopping" link.
- **`/orders`:**
  - Customer order history sorted newest first with order status badge, date, total, and item previews.
  - Empty state with direct link to browse sneakers.
- **`/orders/:orderId`:**
  - Deep-dive historical view showing complete immutable snapshots of purchased items, prices, delivery address, and payment transaction details.

---

## 7. Local Setup & Running Instructions

### 7.1 Prerequisites
- Python 3.14+
- Node.js 18+ and npm
- MySQL 8.x running locally on port `3306`

### 7.2 Backend Setup

1. Navigate to `backend/` and activate the virtual environment:
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

2. Configure environment variables in `backend/.env` (see `backend/.env.example`):
   ```dotenv
   FLASK_ENV=development
   FLASK_APP=run.py
   SECRET_KEY=kickshub-dev-secret-key-38f9b2d8c1e4
   JWT_SECRET_KEY=kickshub-jwt-secret-key-92a7f3e1b8c4d5
   JWT_ACCESS_MINUTES=15
   JWT_REFRESH_DAYS=7
   DATABASE_URL=mysql+pymysql://kickshub_user:kickshub_pass123@127.0.0.1:3306/kickshub
   FRONTEND_ORIGIN=http://localhost:5173
   PORT=5000
   ```

3. Run migrations and seed data:
   ```bash
   flask db upgrade
   flask seed-data
   ```

4. Start Flask backend server:
   ```bash
   python run.py
   ```
   API runs at `http://127.0.0.1:5000`.

### 7.3 Frontend Setup

1. Navigate to `frontend/`:
   ```bash
   cd frontend
   npm install
   ```

2. Verify `frontend/.env`:
   ```dotenv
   VITE_API_BASE_URL=http://localhost:5000/api/v1
   ```

3. Start Vite dev server:
   ```bash
   npm run dev
   ```
   Application opens at `http://localhost:5173`.

---

## 8. Automated Test Suite

Run the full pytest suite from `backend/`:

```bash
cd backend
source .venv/bin/activate
python3 -m pytest tests/ -v
```

### Complete Test Coverage (91 Tests Passing):

```text
tests/test_admin.py::test_admin_endpoints_require_authentication PASSED
tests/test_admin.py::test_customer_forbidden_from_admin_endpoints PASSED
tests/test_admin.py::test_admin_dashboard_metrics PASSED
tests/test_admin.py::test_admin_product_create_and_validation PASSED
tests/test_admin.py::test_admin_product_edit PASSED
tests/test_admin.py::test_admin_product_deactivation_when_ordered PASSED
tests/test_admin.py::test_admin_category_management_and_safe_delete PASSED
tests/test_admin.py::test_admin_order_management_and_status_transitions PASSED
tests/test_admin.py::test_admin_users_list_without_passwords PASSED
tests/test_admin.py::test_promote_admin_cli_command PASSED
tests/test_auth.py::test_successful_registration PASSED
tests/test_auth.py::test_registration_missing_or_invalid_fields PASSED
tests/test_auth.py::test_duplicate_email_registration PASSED
tests/test_auth.py::test_password_hashing_and_verification PASSED
tests/test_auth.py::test_successful_login PASSED
tests/test_auth.py::test_invalid_login_credentials PASSED
tests/test_auth.py::test_login_with_inactive_account PASSED
tests/test_auth.py::test_access_auth_me_without_token PASSED
tests/test_auth.py::test_access_auth_me_with_valid_token PASSED
tests/test_auth.py::test_access_auth_me_with_expired_or_invalid_token PASSED
tests/test_auth.py::test_successful_access_token_refresh PASSED
tests/test_auth.py::test_rejection_of_revoked_or_expired_refresh_token PASSED
tests/test_auth.py::test_logout_and_subsequent_refresh_rejection PASSED
tests/test_auth.py::test_profile_retrieval_and_update PASSED
tests/test_auth.py::test_rejection_of_attempts_to_change_protected_fields PASSED
tests/test_auth.py::test_successful_password_change PASSED
tests/test_auth.py::test_rejection_of_incorrect_current_password PASSED
tests/test_auth.py::test_revocation_of_refresh_sessions_after_password_change PASSED
tests/test_auth.py::test_prevention_of_cross_user_profile_access PASSED
tests/test_auth.py::test_csrf_protection_on_cookie_refresh PASSED
tests/test_cart.py::test_unauthenticated_cart_access_rejected PASSED
tests/test_cart.py::test_authenticated_user_retrieves_own_cart PASSED
tests/test_cart.py::test_empty_cart_returns_correct_response PASSED
tests/test_cart.py::test_add_valid_variant_creates_cart_item PASSED
tests/test_cart.py::test_add_same_variant_increments_quantity PASSED
tests/test_cart.py::test_invalid_variant_id_rejected PASSED
tests/test_cart.py::test_invalid_quantities_rejected PASSED
tests/test_cart.py::test_quantities_above_configured_maximum_rejected PASSED
tests/test_cart.py::test_unavailable_or_inactive_product_rejected PASSED
tests/test_cart.py::test_stock_limits_enforced PASSED
tests/test_cart.py::test_stock_limits_enforced_on_accumulated_additions PASSED
tests/test_cart.py::test_quantity_updates_work_correctly PASSED
tests/test_cart.py::test_disallow_changing_variant_id_on_patch PASSED
tests/test_cart.py::test_user_cannot_update_another_users_cart_item PASSED
tests/test_cart.py::test_user_cannot_delete_another_users_cart_item PASSED
tests/test_cart.py::test_remove_cart_item_updates_totals PASSED
tests/test_cart.py::test_clear_cart_removes_only_current_users_items PASSED
tests/test_cart.py::test_subtotal_calculations_are_exact_decimal PASSED
tests/test_cart.py::test_cart_summary_endpoint PASSED
tests/test_cart.py::test_failed_operations_roll_back PASSED
tests/test_cart.py::test_duplicate_cart_item_rows_prevented_by_unique_constraint PASSED
tests/test_health.py::test_app_factory_creates_app PASSED
tests/test_health.py::test_health_endpoint PASSED
tests/test_health.py::test_db_health_endpoint_connected PASSED
tests/test_health.py::test_db_health_endpoint_disconnected PASSED
tests/test_health.py::test_model_metadata_includes_all_ten_tables PASSED
tests/test_health.py::test_seed_database_is_idempotent PASSED
tests/test_models.py::test_user_creation_and_cart_relationship PASSED
tests/test_models.py::test_user_email_unique_constraint PASSED
tests/test_models.py::test_product_and_variant_relationship PASSED
tests/test_models.py::test_variant_product_size_color_uniqueness PASSED
tests/test_models.py::test_order_snapshot_preservation PASSED
tests/test_orders.py::test_add_to_bag_returns_variant_and_added_quantity PASSED
tests/test_orders.py::test_repeated_add_to_bag_increments_variant_quantity PASSED
tests/test_orders.py::test_cart_badge_reflects_total_units_across_variants PASSED
tests/test_orders.py::test_failed_add_to_bag_does_not_increment_or_report_success PASSED
tests/test_orders.py::test_unauthenticated_order_placement_rejected PASSED
tests/test_orders.py::test_empty_cart_order_rejected PASSED
tests/test_orders.py::test_another_users_address_rejected PASSED
tests/test_orders.py::test_client_supplied_totals_ignored_for_authoritative_backend_calc PASSED
tests/test_orders.py::test_order_placement_creates_snapshots_and_clears_cart PASSED
tests/test_orders.py::test_failed_order_preserves_cart PASSED
tests/test_orders.py::test_idempotent_order_submission_prevents_duplicate_orders PASSED
tests/test_orders.py::test_inventory_decremented_on_order PASSED
tests/test_orders.py::test_user_cannot_access_another_users_order PASSED
tests/test_orders.py::test_price_change_does_not_affect_past_order_snapshots PASSED
tests/test_orders.py::test_payment_status_is_honest_pending_simulated PASSED
tests/test_orders.py::test_order_history_pagination_newest_first PASSED
tests/test_orders.py::test_address_endpoints_create_and_list PASSED
tests/test_products.py::test_product_list_structure PASSED
tests/test_products.py::test_pagination_and_max_limit PASSED
tests/test_products.py::test_search_filter PASSED
tests/test_products.py::test_brand_and_category_filters PASSED
tests/test_products.py::test_size_filter_without_duplication PASSED
tests/test_products.py::test_price_filters PASSED
tests/test_products.py::test_stock_filtering PASSED
tests/test_products.py::test_sorting_options PASSED
tests/test_products.py::test_invalid_parameters_controlled_errors PASSED
tests/test_products.py::test_product_details_with_variants PASSED
tests/test_products.py::test_unknown_or_inactive_product_returns_404 PASSED
tests/test_products.py::test_categories_endpoint PASSED
```

Frontend production build check:
```bash
cd frontend && npm run build
```

---

## 9. Known Limitations & Phase Boundaries

- **Modular Monolith Architecture:** Application remains cleanly bounded as a modular monolith. No Redis, Kafka, Kubernetes, or microservices are introduced prematurely.
- **Simulated Payment Mode:** Payments are not routed through an external production gateway (Stripe/Razorpay/PayPal). Payments are explicitly persisted with `provider="simulated"` and `status="pending"` to prevent false claims of real fund capture.
- **Inventory Locking Scope:** Stock is decremented transactionally via MySQL row-level locking (`with_for_update()`). In Phase 6, high-demand flash drops may introduce Redis-based atomic decrement queues or reservation leases.
- **No Complex Discount / Coupon Engine:** Only verified base product pricing and zero shipping fee defaults are active. Complex coupon validation engines are reserved for future promotional features.

---

## 10. Roadmap

- [x] **Phase 1: Foundation & Database** (Flask application factory, MySQL schema tables, Alembic migrations, idempotent seed data, health checks).
- [x] **Phase 2: Product Catalog API & React Storefront** (Complete RESTful catalog endpoints, filtering, search, sorting, server-side pagination, product details with dynamic size/color availability, responsive React storefront).
- [x] **Phase 3: User Authentication & Accounts** (JWT token auth, customer registration/login, refresh sessions, token revocation, profile editing, password changing, protected routes).
- [x] **Phase 4: Persistent Shopping Cart** (Database-backed carts, server-authoritative Decimal calculations, quantity controls, stock limits, React CartContext, navbar bag badge, `/cart` page with interactive mutations and empty state).
- [x] **Phase 5: Checkout, Orders, and Real-Time Add-to-Bag Feedback** (Dual-metric Add to Bag feedback, persistent in-bag indicator, delivery addresses, atomic checkout with row-level stock locks, immutable order-item snapshots, idempotency deduplication, simulated honest payment status, confirmation, and order history).
- [x] **Phase 6: Production-Style E-commerce UX, Responsive Redesign, and Cart Improvements** (Responsive redesign 320px–1440px, sliding mini-cart drawer, mobile catalog filter drawer, mobile navigation drawer, clean retail footer, removal of technical diagnostic clutter, SVG icon replacements, and keyboard focus accessibility).
- [x] **Phase 7: Minimalist Theme, Typography Refresh, and Responsive Optimization** (Minimalist light theme, Manrope geometric typography, warm neutral surfaces, refined button and border radii, fluid responsive container, zero horizontal overflow across 320px–1440px, preserved dual-metric Add to Bag feedback and checkout flows).
- [x] **Phase 8: Admin Panel, UI/UX Refinement, Mobile Navigation, Search Optimization & Hero Redesign** (Functional and secure Admin Panel with `@admin_required` and `AdminRoute`, server-side CLI admin provisioning, product/category/order/user CRUD and lifecycle state transitions, safe deactivation preserving historical orders, root-cause repair of mobile nav transparency/blur, search button disappearing bug fix, redesigned homepage hero with sneaker photography and responsive composition, 91 automated tests).

