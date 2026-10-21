import logging
import uuid
from decimal import Decimal
from app.extensions import db
from app.models import Order, OrderItem, Payment, Address, Cart, CartItem, ProductVariant

logger = logging.getLogger(__name__)


class OrderError(Exception):
    def __init__(self, code, message, status_code=400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


class EmptyCartError(OrderError):
    def __init__(self, message="Cannot place an order with an empty shopping cart."):
        super().__init__("EMPTY_CART", message, 400)


class AddressOwnershipError(OrderError):
    def __init__(self, message="Selected delivery address does not exist or does not belong to you."):
        super().__init__("INVALID_ADDRESS", message, 400)


class ProductUnavailableError(OrderError):
    def __init__(self, message="One or more products in your cart are no longer active."):
        super().__init__("PRODUCT_UNAVAILABLE", message, 400)


class InsufficientStockError(OrderError):
    def __init__(self, message="Requested quantity exceeds available stock."):
        super().__init__("INSUFFICIENT_STOCK", message, 400)


class OrderNotFoundError(OrderError):
    def __init__(self, message="Order not found."):
        super().__init__("NOT_FOUND", message, 404)


def serialize_order(order):
    """Serialize an Order entity along with item snapshots and payment records."""
    return {
        "id": order.id,
        "user_id": order.user_id,
        "status": order.status,
        "subtotal": f"{order.subtotal:.2f}",
        "shipping_fee": f"{order.shipping_fee:.2f}",
        "total": f"{order.total:.2f}",
        "address_snapshot": order.address_snapshot or {},
        "items": [
            {
                "id": item.id,
                "variant_id": item.variant_id,
                "product_name": item.product_name,
                "sku": item.sku,
                "size": item.size,
                "color": item.color,
                "unit_price": f"{item.unit_price:.2f}",
                "quantity": item.quantity,
                "line_total": f"{item.line_total:.2f}",
                "image": (
                    item.variant.product.image_url
                    if item.variant and item.variant.product
                    else None
                ),
            }
            for item in order.items
        ],
        "payment": {
            "id": order.payment.id,
            "provider": order.payment.provider,
            "status": order.payment.status,
            "amount": f"{order.payment.amount:.2f}",
            "transaction_ref": order.payment.transaction_ref,
            "idempotency_key": order.payment.idempotency_key,
        } if order.payment else None,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "updated_at": order.updated_at.isoformat() if order.updated_at else None,
    }


def create_order_from_cart(user_id, address_id, idempotency_key=None):
    """Create a persistent order from the user's cart in a strict database transaction."""
    # 1. Idempotency Check: if key already used by this user, return previous order
    if idempotency_key:
        existing_payment = Payment.query.filter_by(idempotency_key=idempotency_key).first()
        if existing_payment and existing_payment.order and existing_payment.order.user_id == user_id:
            logger.info("Idempotent order replay for key '%s', returning order #%s", idempotency_key, existing_payment.order.id)
            return serialize_order(existing_payment.order)

    # 2. Validate Delivery Address Ownership
    address = Address.query.filter_by(id=address_id, user_id=user_id).first()
    if not address:
        raise AddressOwnershipError()

    # 3. Retrieve Cart
    cart = Cart.query.filter_by(user_id=user_id).first()
    if not cart or not cart.items:
        raise EmptyCartError()

    # 4. Atomic Transaction: Revalidate catalog, row lock variants, decrement stock, snapshot items, clear cart
    subtotal = Decimal("0.00")
    order_items = []

    try:
        for cart_item in cart.items:
            variant = db.session.get(ProductVariant, cart_item.variant_id, with_for_update=True)
            if not variant:
                raise ProductUnavailableError("One of the selected sneaker variants is no longer in our catalog.")

            product = variant.product
            if not product or not product.is_active:
                raise ProductUnavailableError(f"Sneaker '{product.name if product else 'Item'}' is currently inactive.")

            if variant.stock_quantity < cart_item.quantity:
                raise InsufficientStockError(
                    f"Insufficient stock for '{product.name} ({variant.size} • {variant.color})'. Only {variant.stock_quantity} pairs remaining."
                )

            unit_price = Decimal(str(variant.price))
            line_total = (unit_price * Decimal(cart_item.quantity)).quantize(Decimal("0.01"))
            subtotal += line_total

            # Decrement stock authoritative count
            variant.stock_quantity -= cart_item.quantity

            # Create immutable OrderItem snapshot
            order_items.append(OrderItem(
                variant_id=variant.id,
                product_name=product.name,
                sku=variant.sku,
                size=variant.size,
                color=variant.color,
                unit_price=unit_price,
                quantity=cart_item.quantity,
                line_total=line_total,
            ))

        shipping_fee = Decimal("0.00")  # Free shipping standard for KicksHub members
        total = (subtotal + shipping_fee).quantize(Decimal("0.01"))

        address_snapshot = {
            "recipient_name": address.recipient_name,
            "phone": address.phone or "",
            "line1": address.line1,
            "line2": address.line2 or "",
            "city": address.city,
            "state": address.state,
            "postal_code": address.postal_code,
            "country": address.country,
        }

        order = Order(
            user_id=user_id,
            status="confirmed",
            subtotal=subtotal,
            shipping_fee=shipping_fee,
            total=total,
            address_snapshot=address_snapshot,
        )
        order.items = order_items
        db.session.add(order)
        db.session.flush()

        tx_ref = f"SIM-{order.id}-{uuid.uuid4().hex[:8].upper()}"
        payment = Payment(
            order_id=order.id,
            provider="simulated",
            status="pending",
            amount=total,
            transaction_ref=tx_ref,
            idempotency_key=idempotency_key if idempotency_key else None,
        )
        db.session.add(payment)

        # Clear cart items for this user in the same transaction
        CartItem.query.filter_by(cart_id=cart.id).delete()

        db.session.commit()
    except OrderError:
        db.session.rollback()
        raise
    except Exception as exc:
        db.session.rollback()
        logger.error("Failed to commit order creation for user %s: %s", user_id, exc)
        raise

    return serialize_order(order)


def get_user_orders(user_id, page=1, per_page=10):
    """Retrieve paginated order history for the authenticated user, newest first."""
    query = Order.query.filter_by(user_id=user_id).order_by(Order.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return {
        "orders": [serialize_order(order) for order in pagination.items],
        "pagination": {
            "page": pagination.page,
            "per_page": pagination.per_page,
            "total_items": pagination.total,
            "total_pages": pagination.pages,
            "has_next": pagination.has_next,
            "has_prev": pagination.has_prev,
        },
    }


def get_order_by_id(user_id, order_id):
    """Retrieve an order by ID, enforcing user ownership check."""
    order = Order.query.filter_by(id=order_id, user_id=user_id).first()
    if not order:
        raise OrderNotFoundError()
    return serialize_order(order)
