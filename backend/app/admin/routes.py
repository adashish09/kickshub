import re
from decimal import Decimal
from flask import Blueprint, request, jsonify, current_app
from sqlalchemy import func, or_
from app.auth.decorators import admin_required
from app.extensions import db
from app.models.product import Product
from app.models.product_variant import ProductVariant
from app.models.category import Category
from app.models.order import Order, OrderItem
from app.models.payment import Payment
from app.models.user import User

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")


def error_response(code, message, status_code=400):
    return jsonify({
        "error": {
            "code": code,
            "message": message,
        }
    }), status_code


def slugify(text):
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    return re.sub(r"[-\s]+", "-", text)


# ---------------------------------------------------------------------------
# 1. Dashboard Metrics & Analytics
# ---------------------------------------------------------------------------


@admin_bp.route("/dashboard", methods=["GET"])
@admin_required()
def get_dashboard_stats():
    """Retrieve verified high-level store metrics and recent orders."""
    try:
        total_products = Product.query.count()
        active_products = Product.query.filter_by(is_active=True).count()
        total_orders = Order.query.count()
        pending_orders = Order.query.filter(Order.status.in_(["pending", "confirmed"])).count()
        total_customers = User.query.filter_by(role="customer").count()

        # Recent 5 orders
        recent_orders_query = (
            Order.query
            .order_by(Order.created_at.desc())
            .limit(5)
            .all()
        )

        recent_orders = []
        for o in recent_orders_query:
            recent_orders.append({
                "id": o.id,
                "customer_name": o.user.name if o.user else (o.address_snapshot or {}).get("full_name", "Guest"),
                "customer_email": o.user.email if o.user else "—",
                "total": str(o.total),
                "status": o.status,
                "items_count": len(o.items),
                "created_at": o.created_at.isoformat() if o.created_at else None,
            })

        return jsonify({
            "metrics": {
                "total_products": total_products,
                "active_products": active_products,
                "total_orders": total_orders,
                "pending_orders": pending_orders,
                "total_customers": total_customers,
            },
            "recent_orders": recent_orders,
        }), 200
    except Exception as exc:
        current_app.logger.error("Failed to load admin dashboard stats: %s", exc)
        return error_response("SERVER_ERROR", "Failed to retrieve dashboard metrics.", 500)


# ---------------------------------------------------------------------------
# 2. Product Management Endpoints
# ---------------------------------------------------------------------------


@admin_bp.route("/products", methods=["GET"])
@admin_required()
def list_admin_products():
    """Paginated list of all products with variant counts and filters."""
    try:
        page = max(1, request.args.get("page", 1, type=int))
        limit = min(50, max(1, request.args.get("limit", 10, type=int)))
        search = (request.args.get("search") or "").strip()
        category_param = (request.args.get("category") or "").strip()
        status_param = (request.args.get("status") or "all").strip().lower()

        query = Product.query

        if search:
            query = query.filter(
                or_(
                    Product.name.ilike(f"%{search}%"),
                    Product.brand.ilike(f"%{search}%"),
                    Product.variants.any(ProductVariant.sku.ilike(f"%{search}%")),
                )
            )

        if category_param:
            if category_param.isdigit():
                query = query.filter(Product.category_id == int(category_param))
            else:
                cat = Category.query.filter_by(slug=category_param).first()
                if cat:
                    query = query.filter(Product.category_id == cat.id)

        if status_param == "active":
            query = query.filter(Product.is_active.is_(True))
        elif status_param == "inactive":
            query = query.filter(Product.is_active.is_(False))

        total_items = query.count()
        products = (
            query.order_by(Product.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
            .all()
        )

        items = []
        for p in products:
            variant_count = len(p.variants)
            total_stock = sum(v.stock_quantity for v in p.variants)
            min_price = min((v.price for v in p.variants), default=Decimal("0.00"))
            max_price = max((v.price for v in p.variants), default=Decimal("0.00"))

            items.append({
                "id": p.id,
                "name": p.name,
                "slug": p.slug,
                "brand": p.brand,
                "image_url": p.image_url,
                "is_active": p.is_active,
                "category": {
                    "id": p.category.id,
                    "name": p.category.name,
                    "slug": p.category.slug,
                } if p.category else None,
                "variant_count": variant_count,
                "total_stock": total_stock,
                "price_range": {
                    "min": str(min_price),
                    "max": str(max_price),
                },
                "created_at": p.created_at.isoformat() if p.created_at else None,
            })

        total_pages = max(1, (total_items + limit - 1) // limit)
        return jsonify({
            "items": items,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_items,
                "pages": total_pages,
            },
        }), 200
    except Exception as exc:
        current_app.logger.error("Admin products listing error: %s", exc)
        return error_response("SERVER_ERROR", "Failed to retrieve products.", 500)


@admin_bp.route("/products", methods=["POST"])
@admin_required()
def create_product():
    """Create a new sneaker product with its inventory variants atomically."""
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    brand = (payload.get("brand") or "").strip()
    category_id = payload.get("category_id")
    slug = (payload.get("slug") or "").strip() or slugify(name)
    description = (payload.get("description") or "").strip()
    image_url = (payload.get("image_url") or "").strip()
    is_active = payload.get("is_active", True)
    variants_data = payload.get("variants") or []

    if not name or len(name) < 2:
        return error_response("VALIDATION_ERROR", "Product name must be at least 2 characters.")
    if not brand:
        return error_response("VALIDATION_ERROR", "Brand is required.")
    if not category_id:
        return error_response("VALIDATION_ERROR", "Category selection is required.")

    category = db.session.get(Category, category_id)
    if not category:
        return error_response("NOT_FOUND", "Selected category does not exist.")

    # Check slug uniqueness
    existing_slug = Product.query.filter_by(slug=slug).first()
    if existing_slug:
        return error_response("DUPLICATE_SLUG", f"Product slug '{slug}' already exists.")

    if not variants_data or not isinstance(variants_data, list):
        return error_response("VALIDATION_ERROR", "At least one product variant (size, color, price) is required.")

    # Validate variants
    sku_set = set()
    cleaned_variants = []
    for idx, v in enumerate(variants_data):
        sku = (v.get("sku") or "").strip().upper()
        size = (v.get("size") or "").strip()
        color = (v.get("color") or "").strip()
        price_raw = v.get("price")
        stock_raw = v.get("stock_quantity", 0)

        if not sku:
            return error_response("VALIDATION_ERROR", f"Variant #{idx + 1} is missing a SKU.")
        if sku in sku_set:
            return error_response("VALIDATION_ERROR", f"Duplicate SKU '{sku}' in submission.")
        sku_set.add(sku)

        # Check existing SKU in DB
        if ProductVariant.query.filter_by(sku=sku).first():
            return error_response("DUPLICATE_SKU", f"SKU '{sku}' already exists in database.")

        if not size:
            return error_response("VALIDATION_ERROR", f"Variant #{idx + 1} requires a size.")
        if not color:
            return error_response("VALIDATION_ERROR", f"Variant #{idx + 1} requires a colorway.")

        try:
            price = Decimal(str(price_raw))
            if price < 0:
                raise ValueError()
        except (ValueError, TypeError):
            return error_response("VALIDATION_ERROR", f"Variant #{idx + 1} requires a non-negative price.")

        try:
            stock = int(stock_raw)
            if stock < 0:
                raise ValueError()
        except (ValueError, TypeError):
            return error_response("VALIDATION_ERROR", f"Variant #{idx + 1} requires non-negative stock quantity.")

        cleaned_variants.append({
            "sku": sku,
            "size": size,
            "color": color,
            "price": price,
            "stock_quantity": stock,
        })

    try:
        product = Product(
            category_id=category.id,
            name=name,
            slug=slug,
            brand=brand,
            description=description,
            image_url=image_url,
            is_active=bool(is_active),
        )
        db.session.add(product)
        db.session.flush()

        for cv in cleaned_variants:
            variant = ProductVariant(
                product_id=product.id,
                sku=cv["sku"],
                size=cv["size"],
                color=cv["color"],
                price=cv["price"],
                stock_quantity=cv["stock_quantity"],
            )
            db.session.add(variant)

        db.session.commit()

        return jsonify({
            "message": "Product created successfully.",
            "product": {
                "id": product.id,
                "name": product.name,
                "slug": product.slug,
                "brand": product.brand,
                "is_active": product.is_active,
                "variants_count": len(cleaned_variants),
            }
        }), 201
    except Exception as exc:
        db.session.rollback()
        current_app.logger.error("Failed to create product: %s", exc)
        return error_response("SERVER_ERROR", "Failed to create product.", 500)


@admin_bp.route("/products/<int:product_id>", methods=["GET"])
@admin_required()
def get_admin_product(product_id):
    """Retrieve full product details including all variants."""
    product = db.session.get(Product, product_id)
    if not product:
        return error_response("NOT_FOUND", "Product not found.", 404)

    variants = []
    for v in product.variants:
        variants.append({
            "id": v.id,
            "sku": v.sku,
            "size": v.size,
            "color": v.color,
            "price": str(v.price),
            "stock_quantity": v.stock_quantity,
        })

    return jsonify({
        "product": {
            "id": product.id,
            "category_id": product.category_id,
            "category": {
                "id": product.category.id,
                "name": product.category.name,
                "slug": product.category.slug,
            } if product.category else None,
            "name": product.name,
            "slug": product.slug,
            "brand": product.brand,
            "description": product.description,
            "image_url": product.image_url,
            "is_active": product.is_active,
            "created_at": product.created_at.isoformat() if product.created_at else None,
            "variants": variants,
        }
    }), 200


@admin_bp.route("/products/<int:product_id>", methods=["PATCH"])
@admin_required()
def update_product(product_id):
    """Update product details and manage variant attributes."""
    product = db.session.get(Product, product_id)
    if not product:
        return error_response("NOT_FOUND", "Product not found.", 404)

    payload = request.get_json(silent=True) or {}

    if "name" in payload:
        name = (payload["name"] or "").strip()
        if len(name) < 2:
            return error_response("VALIDATION_ERROR", "Product name must be at least 2 characters.")
        product.name = name

    if "brand" in payload:
        brand = (payload["brand"] or "").strip()
        if not brand:
            return error_response("VALIDATION_ERROR", "Brand cannot be empty.")
        product.brand = brand

    if "category_id" in payload:
        category = db.session.get(Category, payload["category_id"])
        if not category:
            return error_response("NOT_FOUND", "Specified category does not exist.")
        product.category_id = category.id

    if "slug" in payload:
        slug = (payload["slug"] or "").strip()
        if slug and slug != product.slug:
            existing = Product.query.filter_by(slug=slug).first()
            if existing:
                return error_response("DUPLICATE_SLUG", f"Slug '{slug}' is already taken.")
            product.slug = slug

    if "description" in payload:
        product.description = (payload["description"] or "").strip()

    if "image_url" in payload:
        product.image_url = (payload["image_url"] or "").strip()

    if "is_active" in payload:
        product.is_active = bool(payload["is_active"])

    # Optional variant updates
    if "variants" in payload and isinstance(payload["variants"], list):
        for v_data in payload["variants"]:
            v_id = v_data.get("id")
            if v_id:
                variant = db.session.get(ProductVariant, v_id)
                if variant and variant.product_id == product.id:
                    if "price" in v_data:
                        try:
                            p = Decimal(str(v_data["price"]))
                            if p >= 0:
                                variant.price = p
                        except (ValueError, TypeError):
                            pass
                    if "stock_quantity" in v_data:
                        try:
                            s = int(v_data["stock_quantity"])
                            if s >= 0:
                                variant.stock_quantity = s
                        except (ValueError, TypeError):
                            pass
                    if "size" in v_data and v_data["size"]:
                        variant.size = str(v_data["size"]).strip()
                    if "color" in v_data and v_data["color"]:
                        variant.color = str(v_data["color"]).strip()
            elif "sku" in v_data:
                # Add new variant
                sku = v_data["sku"].strip().upper()
                if not ProductVariant.query.filter_by(sku=sku).first():
                    new_v = ProductVariant(
                        product_id=product.id,
                        sku=sku,
                        size=str(v_data.get("size", "Standard")).strip(),
                        color=str(v_data.get("color", "Default")).strip(),
                        price=Decimal(str(v_data.get("price", "99.99"))),
                        stock_quantity=int(v_data.get("stock_quantity", 0)),
                    )
                    db.session.add(new_v)

    try:
        db.session.commit()
        return jsonify({
            "message": "Product updated successfully.",
            "product": {
                "id": product.id,
                "name": product.name,
                "slug": product.slug,
                "brand": product.brand,
                "is_active": product.is_active,
            }
        }), 200
    except Exception as exc:
        db.session.rollback()
        current_app.logger.error("Failed to update product %s: %s", product_id, exc)
        return error_response("SERVER_ERROR", "Failed to update product.", 500)


@admin_bp.route("/products/<int:product_id>", methods=["DELETE"])
@admin_required()
def delete_or_deactivate_product(product_id):
    """Safely delete or deactivate product based on historical order references."""
    product = db.session.get(Product, product_id)
    if not product:
        return error_response("NOT_FOUND", "Product not found.", 404)

    # Check if any variant is linked to historical order items
    variant_ids = [v.id for v in product.variants]
    has_orders = False
    if variant_ids:
        has_orders = OrderItem.query.filter(OrderItem.variant_id.in_(variant_ids)).first() is not None

    if has_orders:
        # Deactivate rather than deleting to preserve immutable order history
        product.is_active = False
        db.session.commit()
        return jsonify({
            "message": "Product has associated order records and cannot be permanently deleted. It has been deactivated.",
            "is_active": False,
            "action": "deactivated",
        }), 200
    else:
        try:
            db.session.delete(product)
            db.session.commit()
            return jsonify({
                "message": "Product permanently deleted.",
                "action": "deleted",
            }), 200
        except Exception as exc:
            db.session.rollback()
            current_app.logger.error("Failed to delete product %s: %s", product_id, exc)
            return error_response("SERVER_ERROR", "Failed to delete product.", 500)


# ---------------------------------------------------------------------------
# 3. Category Management Endpoints
# ---------------------------------------------------------------------------


@admin_bp.route("/categories", methods=["GET"])
@admin_required()
def list_admin_categories():
    """List all categories with live product count."""
    try:
        categories = Category.query.order_by(Category.name.asc()).all()
        result = []
        for c in categories:
            result.append({
                "id": c.id,
                "name": c.name,
                "slug": c.slug,
                "description": c.description,
                "product_count": len(c.products),
                "created_at": c.created_at.isoformat() if c.created_at else None,
            })
        return jsonify({"categories": result}), 200
    except Exception as exc:
        current_app.logger.error("Failed to list categories: %s", exc)
        return error_response("SERVER_ERROR", "Failed to retrieve categories.", 500)


@admin_bp.route("/categories", methods=["POST"])
@admin_required()
def create_category():
    """Create a new category."""
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    slug = (payload.get("slug") or "").strip() or slugify(name)
    description = (payload.get("description") or "").strip()

    if not name:
        return error_response("VALIDATION_ERROR", "Category name is required.")

    existing = Category.query.filter_by(slug=slug).first()
    if existing:
        return error_response("DUPLICATE_SLUG", f"Category slug '{slug}' already exists.")

    try:
        category = Category(name=name, slug=slug, description=description)
        db.session.add(category)
        db.session.commit()
        return jsonify({
            "message": "Category created successfully.",
            "category": {
                "id": category.id,
                "name": category.name,
                "slug": category.slug,
                "description": category.description,
            }
        }), 201
    except Exception as exc:
        db.session.rollback()
        current_app.logger.error("Failed to create category: %s", exc)
        return error_response("SERVER_ERROR", "Failed to create category.", 500)


@admin_bp.route("/categories/<int:category_id>", methods=["PATCH"])
@admin_required()
def update_category(category_id):
    """Update existing category details."""
    category = db.session.get(Category, category_id)
    if not category:
        return error_response("NOT_FOUND", "Category not found.", 404)

    payload = request.get_json(silent=True) or {}
    if "name" in payload:
        name = (payload["name"] or "").strip()
        if not name:
            return error_response("VALIDATION_ERROR", "Category name cannot be empty.")
        category.name = name

    if "slug" in payload:
        slug = (payload["slug"] or "").strip()
        if slug and slug != category.slug:
            existing = Category.query.filter_by(slug=slug).first()
            if existing:
                return error_response("DUPLICATE_SLUG", f"Category slug '{slug}' already exists.")
            category.slug = slug

    if "description" in payload:
        category.description = (payload["description"] or "").strip()

    try:
        db.session.commit()
        return jsonify({
            "message": "Category updated successfully.",
            "category": {
                "id": category.id,
                "name": category.name,
                "slug": category.slug,
                "description": category.description,
            }
        }), 200
    except Exception as exc:
        db.session.rollback()
        current_app.logger.error("Failed to update category %s: %s", category_id, exc)
        return error_response("SERVER_ERROR", "Failed to update category.", 500)


@admin_bp.route("/categories/<int:category_id>", methods=["DELETE"])
@admin_required()
def delete_category(category_id):
    """Delete a category only if no products are assigned to it."""
    category = db.session.get(Category, category_id)
    if not category:
        return error_response("NOT_FOUND", "Category not found.", 404)

    if category.products and len(category.products) > 0:
        return error_response(
            "HAS_PRODUCTS",
            f"Cannot delete category '{category.name}' because {len(category.products)} product(s) are assigned to it. Reassign or remove them first.",
            400
        )

    try:
        db.session.delete(category)
        db.session.commit()
        return jsonify({"message": f"Category '{category.name}' deleted successfully."}), 200
    except Exception as exc:
        db.session.rollback()
        current_app.logger.error("Failed to delete category %s: %s", category_id, exc)
        return error_response("SERVER_ERROR", "Failed to delete category.", 500)


# ---------------------------------------------------------------------------
# 4. Order Management Endpoints
# ---------------------------------------------------------------------------


@admin_bp.route("/orders", methods=["GET"])
@admin_required()
def list_admin_orders():
    """Paginated list of customer orders with status filter."""
    try:
        page = max(1, request.args.get("page", 1, type=int))
        limit = min(50, max(1, request.args.get("limit", 10, type=int)))
        status_param = (request.args.get("status") or "").strip().lower()
        search = (request.args.get("search") or "").strip()

        query = Order.query

        if status_param and status_param in ["pending", "confirmed", "completed", "cancelled"]:
            query = query.filter(Order.status == status_param)

        if search:
            if search.isdigit():
                query = query.filter(Order.id == int(search))
            else:
                query = query.join(User, Order.user_id == User.id, isouter=True).filter(
                    or_(
                        User.name.ilike(f"%{search}%"),
                        User.email.ilike(f"%{search}%"),
                    )
                )

        total_orders = query.count()
        orders = (
            query.order_by(Order.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
            .all()
        )

        items = []
        for o in orders:
            items.append({
                "id": o.id,
                "customer": {
                    "id": o.user.id if o.user else None,
                    "name": o.user.name if o.user else (o.address_snapshot or {}).get("full_name", "Guest"),
                    "email": o.user.email if o.user else "—",
                },
                "status": o.status,
                "total": str(o.total),
                "items_count": sum(it.quantity for it in o.items),
                "payment": {
                    "provider": o.payment.provider if o.payment else "simulated",
                    "status": o.payment.status if o.payment else "pending",
                } if o.payment else None,
                "created_at": o.created_at.isoformat() if o.created_at else None,
            })

        total_pages = max(1, (total_orders + limit - 1) // limit)
        return jsonify({
            "items": items,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_orders,
                "pages": total_pages,
            },
        }), 200
    except Exception as exc:
        current_app.logger.error("Admin orders listing error: %s", exc)
        return error_response("SERVER_ERROR", "Failed to retrieve orders.", 500)


@admin_bp.route("/orders/<int:order_id>", methods=["GET"])
@admin_required()
def get_admin_order_detail(order_id):
    """Retrieve full order details including snapshots and items."""
    order = db.session.get(Order, order_id)
    if not order:
        return error_response("NOT_FOUND", "Order not found.", 404)

    items = []
    for item in order.items:
        items.append({
            "id": item.id,
            "sku": item.sku,
            "product_name": item.product_name,
            "size": item.size,
            "color": item.color,
            "unit_price": str(item.unit_price),
            "quantity": item.quantity,
            "line_total": str(item.line_total),
            "image_url": item.variant.product.image_url if item.variant and item.variant.product else None,
        })

    return jsonify({
        "order": {
            "id": order.id,
            "status": order.status,
            "subtotal": str(order.subtotal),
            "shipping_fee": str(order.shipping_fee),
            "total": str(order.total),
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "customer": {
                "id": order.user.id if order.user else None,
                "name": order.user.name if order.user else (order.address_snapshot or {}).get("full_name", "Guest"),
                "email": order.user.email if order.user else "—",
            },
            "delivery_address": order.address_snapshot,
            "payment": {
                "id": order.payment.id if order.payment else None,
                "provider": order.payment.provider if order.payment else "simulated",
                "status": order.payment.status if order.payment else "pending",
                "amount": str(order.payment.amount) if order.payment else str(order.total),
                "transaction_id": order.payment.transaction_id if order.payment else None,
            } if order.payment else None,
            "items": items,
        }
    }), 200


@admin_bp.route("/orders/<int:order_id>/status", methods=["PATCH"])
@admin_required()
def update_order_status(order_id):
    """Update order status according to valid lifecycle transitions."""
    order = db.session.get(Order, order_id)
    if not order:
        return error_response("NOT_FOUND", "Order not found.", 404)

    payload = request.get_json(silent=True) or {}
    new_status = (payload.get("status") or "").strip().lower()

    valid_statuses = ["pending", "confirmed", "completed", "cancelled"]
    if new_status not in valid_statuses:
        return error_response(
            "INVALID_STATUS",
            f"Invalid status '{new_status}'. Allowed: {', '.join(valid_statuses)}."
        )

    # Valid lifecycle transitions:
    # pending -> confirmed, cancelled
    # confirmed -> completed, cancelled
    # completed -> (terminal)
    # cancelled -> (terminal)
    current_status = order.status
    if current_status == new_status:
        return jsonify({
            "message": f"Order #{order.id} is already in '{new_status}' status.",
            "order": {"id": order.id, "status": order.status}
        }), 200

    allowed_transitions = {
        "pending": ["confirmed", "cancelled"],
        "confirmed": ["completed", "cancelled"],
        "completed": [],
        "cancelled": [],
    }

    if new_status not in allowed_transitions.get(current_status, []):
        return error_response(
            "ILLEGAL_TRANSITION",
            f"Cannot transition order from '{current_status}' to '{new_status}'."
        )

    order.status = new_status
    try:
        db.session.commit()
        return jsonify({
            "message": f"Order #{order.id} status updated to '{new_status}'.",
            "order": {"id": order.id, "status": order.status}
        }), 200
    except Exception as exc:
        db.session.rollback()
        current_app.logger.error("Failed to update status for order %s: %s", order_id, exc)
        return error_response("SERVER_ERROR", "Failed to update order status.", 500)


# ---------------------------------------------------------------------------
# 5. User Management Endpoints (Admin Read-Only, Safe)
# ---------------------------------------------------------------------------


@admin_bp.route("/users", methods=["GET"])
@admin_required()
def list_admin_users():
    """List registered user accounts with order count and safe metadata."""
    try:
        page = max(1, request.args.get("page", 1, type=int))
        limit = min(50, max(1, request.args.get("limit", 15, type=int)))
        search = (request.args.get("search") or "").strip()
        role_param = (request.args.get("role") or "").strip().lower()

        query = User.query

        if search:
            query = query.filter(
                or_(
                    User.name.ilike(f"%{search}%"),
                    User.email.ilike(f"%{search}%"),
                )
            )

        if role_param in ["customer", "admin"]:
            query = query.filter(User.role == role_param)

        total_users = query.count()
        users = (
            query.order_by(User.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
            .all()
        )

        items = []
        for u in users:
            items.append({
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "role": u.role,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "orders_count": len(u.orders),
            })

        total_pages = max(1, (total_users + limit - 1) // limit)
        return jsonify({
            "items": items,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_users,
                "pages": total_pages,
            },
        }), 200
    except Exception as exc:
        current_app.logger.error("Admin user listing error: %s", exc)
        return error_response("SERVER_ERROR", "Failed to retrieve users.", 500)
