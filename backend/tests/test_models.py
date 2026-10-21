from decimal import Decimal
import pytest
from sqlalchemy.exc import IntegrityError
from app.extensions import db
from app.models import (
    User,
    Category,
    Product,
    ProductVariant,
    Cart,
    CartItem,
    Address,
    Order,
    OrderItem,
    Payment,
)


def test_user_creation_and_cart_relationship(app):
    """Verify User model creation and 1:1 relationship with Cart."""
    user = User(name="Sneaker Head", email="head@kickshub.local", role="customer")
    db.session.add(user)
    db.session.commit()

    cart = Cart(user_id=user.id)
    db.session.add(cart)
    db.session.commit()

    assert user.cart is not None
    assert user.cart.id == cart.id
    assert cart.user.email == "head@kickshub.local"


def test_user_email_unique_constraint(app):
    """Verify unique constraint on User email."""
    user1 = User(name="User One", email="unique@kickshub.local")
    user2 = User(name="User Two", email="unique@kickshub.local")
    db.session.add(user1)
    db.session.commit()

    db.session.add(user2)
    with pytest.raises(IntegrityError):
        db.session.commit()
    db.session.rollback()


def test_product_and_variant_relationship(app):
    """Verify Product and ProductVariant relationships and constraints."""
    category = Category(name="Running", slug="running-test")
    db.session.add(category)
    db.session.commit()

    product = Product(
        category_id=category.id,
        name="Velocity Boost",
        slug="velocity-boost",
        brand="Adidas",
    )
    db.session.add(product)
    db.session.commit()

    variant1 = ProductVariant(
        product_id=product.id,
        sku="VB-BLK-UK8",
        size="UK 8",
        color="Triple Black",
        price=Decimal("149.99"),
        stock_quantity=10,
    )
    db.session.add(variant1)
    db.session.commit()

    assert len(product.variants) == 1
    assert product.variants[0].sku == "VB-BLK-UK8"


def test_variant_product_size_color_uniqueness(app):
    """Verify unique constraint on (product_id, size, color)."""
    category = Category(name="Lifestyle", slug="lifestyle-test")
    db.session.add(category)
    db.session.commit()

    product = Product(category_id=category.id, name="Retro 1", slug="retro-1", brand="Nike")
    db.session.add(product)
    db.session.commit()

    v1 = ProductVariant(
        product_id=product.id,
        sku="R1-RED-UK8",
        size="UK 8",
        color="Bred",
        price=Decimal("160.00"),
        stock_quantity=5,
    )
    db.session.add(v1)
    db.session.commit()

    # Attempt duplicate variant with same product, size, and color
    v2 = ProductVariant(
        product_id=product.id,
        sku="R1-RED-UK8-DUP",
        size="UK 8",
        color="Bred",
        price=Decimal("160.00"),
        stock_quantity=2,
    )
    db.session.add(v2)
    with pytest.raises(IntegrityError):
        db.session.commit()
    db.session.rollback()


def test_order_snapshot_preservation(app):
    """Verify Order preserves shipping snapshot and order items retain historical snapshots."""
    user = User(name="Buyer", email="buyer@kickshub.local")
    category = Category(name="Basketball", slug="bb-test")
    db.session.add_all([user, category])
    db.session.commit()

    product = Product(category_id=category.id, name="Dunk High", slug="dunk-high", brand="Nike")
    db.session.add(product)
    db.session.commit()

    variant = ProductVariant(
        product_id=product.id,
        sku="DH-BLU-UK9",
        size="UK 9",
        color="Royal Blue",
        price=Decimal("120.00"),
        stock_quantity=10,
    )
    db.session.add(variant)
    db.session.commit()

    address_snapshot = {
        "recipient_name": "Buyer Person",
        "line1": "123 Sneaker St",
        "city": "Bengaluru",
        "state": "Karnataka",
        "postal_code": "560001",
        "country": "India",
    }

    order = Order(
        user_id=user.id,
        status="pending",
        subtotal=Decimal("120.00"),
        shipping_fee=Decimal("10.00"),
        total=Decimal("130.00"),
        address_snapshot=address_snapshot,
    )
    db.session.add(order)
    db.session.commit()

    order_item = OrderItem(
        order_id=order.id,
        variant_id=variant.id,
        product_name="Dunk High",
        sku="DH-BLU-UK9",
        size="UK 9",
        color="Royal Blue",
        unit_price=Decimal("120.00"),
        quantity=1,
        line_total=Decimal("120.00"),
    )
    payment = Payment(
        order_id=order.id,
        provider="simulated",
        status="pending",
        amount=Decimal("130.00"),
        transaction_ref="SIM-TXN-12345",
    )
    db.session.add_all([order_item, payment])
    db.session.commit()

    # Verify order and snapshots
    retrieved_order = db.session.get(Order, order.id)
    assert retrieved_order.address_snapshot["city"] == "Bengaluru"
    assert len(retrieved_order.items) == 1
    assert retrieved_order.items[0].sku == "DH-BLU-UK9"
    assert retrieved_order.payment.transaction_ref == "SIM-TXN-12345"
