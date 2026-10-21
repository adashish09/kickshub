import logging
from decimal import Decimal
from sqlalchemy.exc import IntegrityError
from app.extensions import db
from app.models.cart import Cart, CartItem
from app.models.product_variant import ProductVariant
from app.cart.schemas import MAX_ITEM_QUANTITY

logger = logging.getLogger(__name__)


class CartError(Exception):
    """Base exception for cart business logic errors."""

    def __init__(self, message, code="CART_ERROR", status_code=400):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


class VariantNotFoundError(CartError):
    def __init__(self, message="Sneaker variant not found."):
        super().__init__(message, code="VARIANT_NOT_FOUND", status_code=404)


class ProductUnavailableError(CartError):
    def __init__(self, message="Product is currently inactive or unavailable."):
        super().__init__(message, code="PRODUCT_UNAVAILABLE", status_code=400)


class OutOfStockError(CartError):
    def __init__(self, message="This sneaker variant is currently out of stock."):
        super().__init__(message, code="OUT_OF_STOCK", status_code=400)


class ExceedsStockError(CartError):
    def __init__(self, message="Requested quantity exceeds available inventory stock."):
        super().__init__(message, code="EXCEEDS_STOCK", status_code=400)


class MaxQuantityExceededError(CartError):
    def __init__(self, message=f"Total quantity cannot exceed {MAX_ITEM_QUANTITY} per item."):
        super().__init__(message, code="MAX_QUANTITY_EXCEEDED", status_code=400)


class CartItemNotFoundError(CartError):
    def __init__(self, message="Cart item not found."):
        super().__init__(message, code="ITEM_NOT_FOUND", status_code=404)


def get_or_create_cart(user_id):
    """Retrieve the user's persistent cart, lazily creating one if it does not yet exist."""
    cart = Cart.query.filter_by(user_id=user_id).first()
    if cart:
        return cart

    cart = Cart(user_id=user_id)
    try:
        db.session.add(cart)
        db.session.commit()
        return cart
    except IntegrityError:
        # Concurrent request already created the cart
        db.session.rollback()
        return Cart.query.filter_by(user_id=user_id).first()


def serialize_cart(cart):
    """Serialize the cart and its line items with server-authoritative Decimal calculations."""
    subtotal = Decimal("0.00")
    total_quantity = 0
    items_list = []

    for item in cart.items:
        variant = item.variant
        if not variant:
            continue

        product = variant.product
        unit_price = Decimal(str(variant.price))
        line_total = unit_price * item.quantity
        subtotal += line_total
        total_quantity += item.quantity

        is_available = bool(
            product
            and product.is_active
            and variant.stock_quantity >= item.quantity
        )

        items_list.append({
            "id": item.id,
            "variant_id": variant.id,
            "product": {
                "id": product.id if product else None,
                "name": product.name if product else "Unavailable Product",
                "slug": product.slug if product else "",
                "brand": product.brand if product else "",
                "image": product.image_url if product else None,
            },
            "size": variant.size,
            "color": variant.color,
            "unit_price": f"{unit_price:.2f}",
            "quantity": item.quantity,
            "line_total": f"{line_total:.2f}",
            "available": is_available,
            "stock_quantity": variant.stock_quantity,
        })

    return {
        "id": cart.id,
        "items": items_list,
        "item_count": total_quantity,
        "subtotal": f"{subtotal:.2f}",
    }


def add_item_to_cart(user_id, variant_id, quantity=1):
    """Add a product variant to the user's cart or increment quantity if already present."""
    cart = get_or_create_cart(user_id)

    variant = db.session.get(ProductVariant, variant_id)
    if not variant:
        raise VariantNotFoundError()

    product = variant.product
    if not product or not product.is_active:
        raise ProductUnavailableError()

    if variant.stock_quantity <= 0:
        raise OutOfStockError()

    existing_item = CartItem.query.filter_by(
        cart_id=cart.id,
        variant_id=variant.id,
    ).first()

    if existing_item:
        new_quantity = existing_item.quantity + quantity
        if new_quantity > MAX_ITEM_QUANTITY:
            raise MaxQuantityExceededError(
                f"Adding {quantity} item(s) would exceed the maximum limit of {MAX_ITEM_QUANTITY} per item."
            )
        if new_quantity > variant.stock_quantity:
            raise ExceedsStockError(
                f"Requested total quantity ({new_quantity}) exceeds available stock ({variant.stock_quantity} available)."
            )
        existing_item.quantity = new_quantity
        resulting_variant_quantity = new_quantity
    else:
        if quantity > variant.stock_quantity:
            raise ExceedsStockError(
                f"Requested quantity ({quantity}) exceeds available stock ({variant.stock_quantity} available)."
            )
        new_item = CartItem(
            cart_id=cart.id,
            variant_id=variant.id,
            quantity=quantity,
        )
        db.session.add(new_item)
        resulting_variant_quantity = quantity

    try:
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        logger.error("Failed to commit add_item_to_cart: %s", exc)
        raise

    cart_dict = serialize_cart(cart)
    cart_dict["added_quantity"] = quantity
    cart_dict["quantity_added"] = quantity
    cart_dict["variant_quantity"] = resulting_variant_quantity
    cart_dict["variant_id"] = variant_id
    return cart_dict


def update_cart_item_quantity(user_id, item_id, quantity):
    """Update the quantity of an existing item in the user's cart."""
    cart = get_or_create_cart(user_id)

    item = CartItem.query.filter_by(id=item_id, cart_id=cart.id).first()
    if not item:
        raise CartItemNotFoundError()

    variant = item.variant
    if not variant or not variant.product or not variant.product.is_active:
        raise ProductUnavailableError("The product for this item is no longer available.")

    if quantity > variant.stock_quantity:
        raise ExceedsStockError(
            f"Requested quantity ({quantity}) exceeds available stock ({variant.stock_quantity} available)."
        )

    item.quantity = quantity
    try:
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        logger.error("Failed to commit update_cart_item_quantity: %s", exc)
        raise

    return serialize_cart(cart)


def remove_cart_item(user_id, item_id):
    """Remove a specific line item from the user's cart."""
    cart = get_or_create_cart(user_id)

    item = CartItem.query.filter_by(id=item_id, cart_id=cart.id).first()
    if not item:
        raise CartItemNotFoundError()

    try:
        db.session.delete(item)
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        logger.error("Failed to delete cart item: %s", exc)
        raise

    return serialize_cart(cart)


def clear_cart(user_id):
    """Remove all line items belonging to the user's cart."""
    cart = get_or_create_cart(user_id)

    try:
        CartItem.query.filter_by(cart_id=cart.id).delete()
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        logger.error("Failed to clear cart: %s", exc)
        raise

    return serialize_cart(cart)


def get_cart_summary(user_id):
    """Retrieve quick cart item count and subtotal summary."""
    cart = get_or_create_cart(user_id)
    serialized = serialize_cart(cart)
    return {
        "item_count": serialized["item_count"],
        "subtotal": serialized["subtotal"],
    }
