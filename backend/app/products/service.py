from sqlalchemy import or_, and_, func
from sqlalchemy.orm import selectinload, joinedload
from app.extensions import db
from app.models import Product, ProductVariant, Category
from app.products.schemas import (
    serialize_product_summary,
    serialize_product_detail,
    serialize_variant,
    serialize_category,
)


def list_products(params):
    """Retrieve filtered, sorted, and paginated active products.

    Avoids N+1 queries through eager relationship loading, ensures distinct product
    counts, and enforces server-side pagination.
    """
    query = db.session.query(Product).filter(Product.is_active.is_(True))

    # 1. Search across name and brand
    if params.get("search"):
        search_pattern = f"%{params['search']}%"
        query = query.filter(
            or_(
                Product.name.ilike(search_pattern),
                Product.brand.ilike(search_pattern),
            )
        )

    # 2. Exact Brand filter
    if params.get("brand"):
        query = query.filter(func.lower(Product.brand) == params["brand"].lower())

    # 3. Category Slug filter
    if params.get("category"):
        query = query.filter(Product.category.has(Category.slug == params["category"].lower()))

    # 4. Variant-level filters (size, price range, stock availability)
    # Using Product.variants.any(...) produces an EXISTS subquery, ensuring no row duplication
    variant_conditions = []
    if params.get("size"):
        variant_conditions.append(ProductVariant.size == params["size"])
    if params.get("min_price") is not None:
        variant_conditions.append(ProductVariant.price >= params["min_price"])
    if params.get("max_price") is not None:
        variant_conditions.append(ProductVariant.price <= params["max_price"])
    if params.get("in_stock") is True:
        variant_conditions.append(ProductVariant.stock_quantity > 0)
    elif params.get("in_stock") is False:
        variant_conditions.append(ProductVariant.stock_quantity == 0)

    if variant_conditions:
        query = query.filter(Product.variants.any(and_(*variant_conditions)))

    # 5. Sorting with stable secondary sort key
    sort_option = params.get("sort", "newest")
    if sort_option == "name_asc":
        query = query.order_by(Product.name.asc(), Product.id.asc())
    elif sort_option == "price_asc":
        min_price_subq = (
            db.session.query(func.min(ProductVariant.price))
            .filter(ProductVariant.product_id == Product.id)
            .correlate(Product)
            .scalar_subquery()
        )
        query = query.order_by(min_price_subq.asc(), Product.id.asc())
    elif sort_option == "price_desc":
        max_price_subq = (
            db.session.query(func.max(ProductVariant.price))
            .filter(ProductVariant.product_id == Product.id)
            .correlate(Product)
            .scalar_subquery()
        )
        query = query.order_by(max_price_subq.desc(), Product.id.desc())
    else:  # 'newest' default
        query = query.order_by(Product.created_at.desc(), Product.id.desc())

    # 6. Count distinct products matching filters
    total = query.count()

    # 7. Server-side pagination
    page = params["page"]
    limit = params["limit"]
    offset = (page - 1) * limit
    pages = (total + limit - 1) // limit if total > 0 else 1

    # 8. Eager load variants and category to eliminate N+1 queries on the page slice
    paginated_products = (
        query.options(
            joinedload(Product.category),
            selectinload(Product.variants),
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

    items = [serialize_product_summary(p, active_filters=params) for p in paginated_products]

    return {
        "items": items,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": pages,
        },
    }


def get_product_by_slug(slug):
    """Retrieve single active product by slug with category and variants."""
    product = (
        Product.query.filter_by(slug=slug, is_active=True)
        .options(
            joinedload(Product.category),
            selectinload(Product.variants),
        )
        .first()
    )
    if not product:
        return None
    return serialize_product_detail(product)


def get_product_variants(product_id):
    """Retrieve active variants for an active product."""
    product = Product.query.filter_by(id=product_id, is_active=True).first()
    if not product:
        return None

    variants = (
        ProductVariant.query.filter_by(product_id=product_id)
        .order_by(ProductVariant.size.asc(), ProductVariant.color.asc())
        .all()
    )
    return [serialize_variant(v) for v in variants]


def get_active_categories():
    """Retrieve distinct categories containing active products."""
    categories = (
        Category.query.join(Product)
        .filter(Product.is_active.is_(True))
        .distinct()
        .order_by(Category.name.asc())
        .all()
    )
    return [serialize_category(c) for c in categories]
