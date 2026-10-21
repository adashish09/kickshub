from decimal import Decimal
import pytest
from app.extensions import db
from app.models.user import User
from app.models.category import Category
from app.models.product import Product
from app.models.product_variant import ProductVariant
from app.models.order import Order, OrderItem
from app.auth.service import create_user_tokens


@pytest.fixture
def admin_user(app):
    """Create an administrator account and return auth headers."""
    user = User(
        name="Admin Boss",
        email="admin_test@kickshub.local",
        role="admin",
        is_active=True,
    )
    user.set_password("AdminPass123!")
    db.session.add(user)
    db.session.commit()

    access_token, _ = create_user_tokens(user)
    return {"user": user, "headers": {"Authorization": f"Bearer {access_token}"}}


@pytest.fixture
def customer_user(app):
    """Create a regular customer account and return auth headers."""
    user = User(
        name="Customer Joe",
        email="customer_test@kickshub.local",
        role="customer",
        is_active=True,
    )
    user.set_password("CustomerPass123!")
    db.session.add(user)
    db.session.commit()

    access_token, _ = create_user_tokens(user)
    return {"user": user, "headers": {"Authorization": f"Bearer {access_token}"}}


@pytest.fixture
def sample_category(app):
    """Create sample category for product tests."""
    cat = Category(name="Basketball", slug="basketball", description="Court shoes")
    db.session.add(cat)
    db.session.commit()
    return cat


def test_admin_endpoints_require_auth(client):
    """Verify unauthorized requests to admin endpoints return 401."""
    res = client.get("/api/v1/admin/dashboard")
    assert res.status_code == 401
    assert res.get_json()["error"]["code"] == "UNAUTHORIZED"


def test_admin_endpoints_reject_regular_customers(client, customer_user):
    """Verify customer role is rejected with 403 Forbidden."""
    res = client.get("/api/v1/admin/dashboard", headers=customer_user["headers"])
    assert res.status_code == 403
    assert res.get_json()["error"]["code"] == "FORBIDDEN"


def test_admin_dashboard_metrics(client, admin_user, sample_category):
    """Verify administrator retrieves store metrics successfully."""
    # Seed a product and order
    prod = Product(
        category_id=sample_category.id,
        name="Test Shoe",
        slug="test-shoe",
        brand="TestBrand",
        is_active=True,
    )
    db.session.add(prod)
    db.session.flush()

    var = ProductVariant(
        product_id=prod.id,
        sku="TS-01-UK8",
        size="UK 8",
        color="Red",
        price=Decimal("150.00"),
        stock_quantity=10,
    )
    db.session.add(var)

    order = Order(
        user_id=admin_user["user"].id,
        status="confirmed",
        subtotal=Decimal("150.00"),
        shipping_fee=Decimal("0.00"),
        total=Decimal("150.00"),
        address_snapshot={"full_name": "Test Name"},
    )
    db.session.add(order)
    db.session.commit()

    res = client.get("/api/v1/admin/dashboard", headers=admin_user["headers"])
    assert res.status_code == 200
    data = res.get_json()
    assert "metrics" in data
    assert data["metrics"]["total_products"] >= 1
    assert data["metrics"]["total_orders"] >= 1
    assert "recent_orders" in data
    assert len(data["recent_orders"]) >= 1


def test_admin_product_crud_and_validation(client, admin_user, sample_category):
    """Verify admin product creation, retrieval, patch, and safe deactivation."""
    # 1. Create Product
    payload = {
        "name": "Air Elite Sneaker",
        "slug": "air-elite-sneaker",
        "brand": "Nike",
        "category_id": sample_category.id,
        "description": "High performance sneaker",
        "image_url": "https://example.com/shoe.png",
        "is_active": True,
        "variants": [
            {
                "sku": "AES-UK8-RED",
                "size": "UK 8",
                "color": "Red/White",
                "price": "189.99",
                "stock_quantity": 15,
            },
            {
                "sku": "AES-UK9-RED",
                "size": "UK 9",
                "color": "Red/White",
                "price": "189.99",
                "stock_quantity": 20,
            },
        ],
    }

    create_res = client.post(
        "/api/v1/admin/products",
        json=payload,
        headers=admin_user["headers"],
    )
    assert create_res.status_code == 201
    prod_data = create_res.get_json()
    product_id = prod_data["product"]["id"]

    # 2. List Products
    list_res = client.get("/api/v1/admin/products?search=Elite", headers=admin_user["headers"])
    assert list_res.status_code == 200
    items = list_res.get_json()["items"]
    assert len(items) == 1
    assert items[0]["name"] == "Air Elite Sneaker"
    assert items[0]["variant_count"] == 2
    assert items[0]["total_stock"] == 35

    # 3. Get Product Detail
    get_res = client.get(f"/api/v1/admin/products/{product_id}", headers=admin_user["headers"])
    assert get_res.status_code == 200
    detail = get_res.get_json()["product"]
    assert len(detail["variants"]) == 2

    # 4. Patch Product
    patch_res = client.patch(
        f"/api/v1/admin/products/{product_id}",
        json={"name": "Air Elite Sneaker Pro", "is_active": False},
        headers=admin_user["headers"],
    )
    assert patch_res.status_code == 200
    assert patch_res.get_json()["product"]["name"] == "Air Elite Sneaker Pro"
    assert patch_res.get_json()["product"]["is_active"] is False

    # 5. Delete Product without orders -> completely removed
    del_res = client.delete(f"/api/v1/admin/products/{product_id}", headers=admin_user["headers"])
    assert del_res.status_code == 200
    assert del_res.get_json()["action"] == "deleted"

    # Confirm deletion
    assert client.get(f"/api/v1/admin/products/{product_id}", headers=admin_user["headers"]).status_code == 404


def test_admin_product_deactivation_when_ordered(client, admin_user, sample_category):
    """Verify products referenced in past orders are deactivated, not hard-deleted."""
    prod = Product(
        category_id=sample_category.id,
        name="Historic Jordan",
        slug="historic-jordan",
        brand="Jordan",
        is_active=True,
    )
    db.session.add(prod)
    db.session.flush()

    var = ProductVariant(
        product_id=prod.id,
        sku="HJ-01",
        size="UK 10",
        color="Black",
        price=Decimal("200.00"),
        stock_quantity=5,
    )
    db.session.add(var)
    db.session.flush()

    order = Order(
        user_id=admin_user["user"].id,
        status="completed",
        subtotal=Decimal("200.00"),
        shipping_fee=Decimal("0.00"),
        total=Decimal("200.00"),
    )
    db.session.add(order)
    db.session.flush()

    order_item = OrderItem(
        order_id=order.id,
        variant_id=var.id,
        product_name="Historic Jordan",
        sku="HJ-01",
        size="UK 10",
        color="Black",
        unit_price=Decimal("200.00"),
        quantity=1,
        line_total=Decimal("200.00"),
    )
    db.session.add(order_item)
    db.session.commit()

    # Attempt to delete
    del_res = client.delete(f"/api/v1/admin/products/{prod.id}", headers=admin_user["headers"])
    assert del_res.status_code == 200
    data = del_res.get_json()
    assert data["action"] == "deactivated"
    assert data["is_active"] is False

    # Check product still exists in DB but is inactive
    refetched = db.session.get(Product, prod.id)
    assert refetched is not None
    assert refetched.is_active is False


def test_admin_category_management(client, admin_user):
    """Verify category creation, update, and dependency-checked deletion."""
    # 1. Create Category
    res = client.post(
        "/api/v1/admin/categories",
        json={"name": "Tennis", "slug": "tennis", "description": "Tennis shoes"},
        headers=admin_user["headers"],
    )
    assert res.status_code == 201
    cat_id = res.get_json()["category"]["id"]

    # 2. Update Category
    patch_res = client.patch(
        f"/api/v1/admin/categories/{cat_id}",
        json={"name": "Tennis Classic"},
        headers=admin_user["headers"],
    )
    assert patch_res.status_code == 200
    assert patch_res.get_json()["category"]["name"] == "Tennis Classic"

    # 3. Delete empty category
    del_res = client.delete(f"/api/v1/admin/categories/{cat_id}", headers=admin_user["headers"])
    assert del_res.status_code == 200


def test_admin_category_deletion_blocked_with_products(client, admin_user, sample_category):
    """Verify deleting a category containing products is rejected."""
    prod = Product(
        category_id=sample_category.id,
        name="Court Shoe",
        slug="court-shoe",
        brand="Nike",
        is_active=True,
    )
    db.session.add(prod)
    db.session.commit()

    del_res = client.delete(f"/api/v1/admin/categories/{sample_category.id}", headers=admin_user["headers"])
    assert del_res.status_code == 400
    assert del_res.get_json()["error"]["code"] == "HAS_PRODUCTS"


def test_admin_order_status_transitions(client, admin_user):
    """Verify valid and invalid order status transitions."""
    order = Order(
        user_id=admin_user["user"].id,
        status="pending",
        subtotal=Decimal("99.99"),
        shipping_fee=Decimal("0.00"),
        total=Decimal("99.99"),
    )
    db.session.add(order)
    db.session.commit()

    # Valid: pending -> confirmed
    res1 = client.patch(
        f"/api/v1/admin/orders/{order.id}/status",
        json={"status": "confirmed"},
        headers=admin_user["headers"],
    )
    assert res1.status_code == 200
    assert res1.get_json()["order"]["status"] == "confirmed"

    # Valid: confirmed -> completed
    res2 = client.patch(
        f"/api/v1/admin/orders/{order.id}/status",
        json={"status": "completed"},
        headers=admin_user["headers"],
    )
    assert res2.status_code == 200
    assert res2.get_json()["order"]["status"] == "completed"

    # Invalid: completed is terminal -> cannot transition back to pending
    res3 = client.patch(
        f"/api/v1/admin/orders/{order.id}/status",
        json={"status": "pending"},
        headers=admin_user["headers"],
    )
    assert res3.status_code == 400
    assert res3.get_json()["error"]["code"] == "ILLEGAL_TRANSITION"


def test_admin_users_listing_safe(client, admin_user):
    """Verify user list does not leak password hashes."""
    res = client.get("/api/v1/admin/users", headers=admin_user["headers"])
    assert res.status_code == 200
    items = res.get_json()["items"]
    assert len(items) >= 1
    for u in items:
        assert "password_hash" not in u
        assert "password" not in u
        assert "name" in u
        assert "email" in u
        assert "role" in u


def test_promote_admin_cli(runner, app):
    """Verify promote-admin CLI command updates user role."""
    with app.app_context():
        user = User(
            name="Promo Candidate",
            email="promo@kickshub.local",
            role="customer",
        )
        user.set_password("Pass123!")
        db.session.add(user)
        db.session.commit()

    result = runner.invoke(args=["promote-admin", "promo@kickshub.local"])
    assert result.exit_code == 0
    assert "promoted to administrator" in result.output

    with app.app_context():
        updated = User.query.filter_by(email="promo@kickshub.local").first()
        assert updated.role == "admin"
