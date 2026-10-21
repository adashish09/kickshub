import re
from decimal import Decimal, InvalidOperation


class ValidationError(Exception):
    """Custom validation exception for catalog query parameters."""

    def __init__(self, message, code="VALIDATION_ERROR"):
        super().__init__(message)
        self.message = message
        self.code = code


def size_sort_key(size_str):
    """Sort sizes numerically where possible (e.g. UK 7 before UK 10)."""
    if not size_str:
        return (1, 0.0, "")
    match = re.search(r"(\d+(?:\.\d+)?)", size_str)
    if match:
        return (0, float(match.group(1)), size_str)
    return (1, 0.0, size_str)


def validate_product_list_params(args):
    """Validate and normalize query parameters for product listing.

    Supported parameters:
      - page: positive integer, default 1
      - limit: positive integer, default 12, max 48
      - search: optional string
      - brand: optional string
      - category: optional category slug
      - size: optional variant size (e.g., 'UK 9')
      - min_price: optional non-negative decimal
      - max_price: optional non-negative decimal
      - sort: 'newest' | 'price_asc' | 'price_desc' | 'name_asc'
      - in_stock: optional boolean
    """
    params = {}

    # 1. Page
    raw_page = args.get("page", 1)
    try:
        page = int(raw_page)
        if page < 1:
            raise ValidationError("Parameter 'page' must be a positive integer >= 1.")
        params["page"] = page
    except (ValueError, TypeError):
        raise ValidationError("Parameter 'page' must be a valid integer.")

    # 2. Limit
    raw_limit = args.get("limit", 12)
    try:
        limit = int(raw_limit)
        if limit < 1 or limit > 48:
            raise ValidationError("Parameter 'limit' must be between 1 and 48.")
        params["limit"] = limit
    except (ValueError, TypeError):
        raise ValidationError("Parameter 'limit' must be a valid integer.")

    # 3. Search
    search = args.get("search")
    if search is not None:
        search_str = search.strip()
        params["search"] = search_str if search_str else None
    else:
        params["search"] = None

    # 4. Brand
    brand = args.get("brand")
    if brand is not None:
        brand_str = brand.strip()
        params["brand"] = brand_str if brand_str else None
    else:
        params["brand"] = None

    # 5. Category
    category = args.get("category")
    if category is not None:
        cat_str = category.strip()
        params["category"] = cat_str if cat_str else None
    else:
        params["category"] = None

    # 6. Size
    size = args.get("size")
    if size is not None:
        size_str = size.strip()
        params["size"] = size_str if size_str else None
    else:
        params["size"] = None

    # 7. Min Price
    min_price = args.get("min_price")
    if min_price is not None and str(min_price).strip() != "":
        try:
            min_dec = Decimal(str(min_price).strip())
            if min_dec < 0:
                raise ValidationError("Parameter 'min_price' must be non-negative.")
            params["min_price"] = min_dec
        except InvalidOperation:
            raise ValidationError("Parameter 'min_price' must be a valid decimal number.")
    else:
        params["min_price"] = None

    # 8. Max Price
    max_price = args.get("max_price")
    if max_price is not None and str(max_price).strip() != "":
        try:
            max_dec = Decimal(str(max_price).strip())
            if max_dec < 0:
                raise ValidationError("Parameter 'max_price' must be non-negative.")
            params["max_price"] = max_dec
        except InvalidOperation:
            raise ValidationError("Parameter 'max_price' must be a valid decimal number.")
    else:
        params["max_price"] = None

    if params["min_price"] is not None and params["max_price"] is not None:
        if params["min_price"] > params["max_price"]:
            raise ValidationError("Parameter 'min_price' cannot be greater than 'max_price'.")

    # 9. Sort
    allowed_sorts = ("newest", "price_asc", "price_desc", "name_asc")
    sort = args.get("sort", "newest")
    if sort not in allowed_sorts:
        raise ValidationError(
            f"Unsupported sort option '{sort}'. Must be one of: {', '.join(allowed_sorts)}."
        )
    params["sort"] = sort

    # 10. In Stock
    in_stock = args.get("in_stock")
    if in_stock is not None and str(in_stock).strip() != "":
        val_str = str(in_stock).strip().lower()
        if val_str in ("true", "1", "yes"):
            params["in_stock"] = True
        elif val_str in ("false", "0", "no"):
            params["in_stock"] = False
        else:
            raise ValidationError("Parameter 'in_stock' must be a boolean ('true' or 'false').")
    else:
        params["in_stock"] = None

    return params


def serialize_product_summary(product, active_filters=None):
    """Serialize a product model into a catalog card summary."""
    active_filters = active_filters or {}
    variants = product.variants or []

    # Determine eligible variants based on active query filters (size, price, stock)
    eligible = variants
    if active_filters.get("size"):
        eligible = [v for v in eligible if v.size == active_filters["size"]]
    if active_filters.get("min_price") is not None:
        eligible = [v for v in eligible if v.price >= active_filters["min_price"]]
    if active_filters.get("max_price") is not None:
        eligible = [v for v in eligible if v.price <= active_filters["max_price"]]
    if active_filters.get("in_stock") is True:
        eligible = [v for v in eligible if v.stock_quantity > 0]
    elif active_filters.get("in_stock") is False:
        eligible = [v for v in eligible if v.stock_quantity == 0]

    # Calculate starting price from eligible variants (or all variants if none matched filter)
    pool = eligible if eligible else variants
    if pool:
        price_from = min(v.price for v in pool)
    else:
        price_from = Decimal("0.00")

    # Check overall availability
    in_stock = any(v.stock_quantity > 0 for v in variants)

    # Unique sorted available sizes where stock > 0
    available_sizes = []
    seen_sizes = set()
    sorted_variants = sorted(variants, key=lambda v: size_sort_key(v.size))
    for v in sorted_variants:
        if v.stock_quantity > 0 and v.size not in seen_sizes:
            seen_sizes.add(v.size)
            available_sizes.append(v.size)

    return {
        "id": product.id,
        "name": product.name,
        "slug": product.slug,
        "brand": product.brand,
        "description": product.description,
        "image_url": product.image_url,
        "price_from": f"{price_from:.2f}",
        "in_stock": in_stock,
        "available_sizes": available_sizes,
    }


def serialize_product_detail(product):
    """Serialize a product model into comprehensive detail response."""
    variants = sorted(product.variants or [], key=lambda v: (size_sort_key(v.size), v.color))

    variant_list = []
    prices = []
    for v in variants:
        variant_list.append({
            "id": v.id,
            "sku": v.sku,
            "size": v.size,
            "color": v.color,
            "price": f"{v.price:.2f}",
            "in_stock": v.stock_quantity > 0,
        })
        prices.append(v.price)

    price_from = min(prices) if prices else Decimal("0.00")
    in_stock = any(v.stock_quantity > 0 for v in variants)

    category_info = None
    if product.category:
        category_info = {
            "id": product.category.id,
            "name": product.category.name,
            "slug": product.category.slug,
        }

    return {
        "id": product.id,
        "name": product.name,
        "slug": product.slug,
        "brand": product.brand,
        "description": product.description,
        "image_url": product.image_url,
        "price_from": f"{price_from:.2f}",
        "in_stock": in_stock,
        "category": category_info,
        "variants": variant_list,
    }


def serialize_variant(variant):
    """Serialize a single product variant without exposing raw inventory quantity."""
    return {
        "id": variant.id,
        "sku": variant.sku,
        "size": variant.size,
        "color": variant.color,
        "price": f"{variant.price:.2f}",
        "in_stock": variant.stock_quantity > 0,
    }


def serialize_category(category):
    """Serialize a category item."""
    return {
        "id": category.id,
        "name": category.name,
        "slug": category.slug,
    }
