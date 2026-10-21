import uuid
from decimal import Decimal
from app.extensions import db
from app.models.category import Category
from app.models.product import Product
from app.models.product_variant import ProductVariant
from app.models.cart import Cart, CartItem
from app.models.address import Address
from app.models.order import Order
from app.models.user import User


def create_test_product(app, stock=10, is_active=True, price=Decimal("120.00"), name="Test Runner"):
    """Helper to provision a test product and variant in database."""
    with app.app_context():
        category = Category.query.first()
        if not category:
            category = Category(name="Test Category", slug="test-category")
            db.session.add(category)
            db.session.flush()

        product = Product(
            name=f"{name} {Product.query.count() + 1}",
            slug=f"test-sneaker-{Product.query.count() + 1}",
            brand="Nike",
            category_id=category.id,
            is_active=is_active,
            image_url="https://example.com/test.jpg",
        )
        db.session.add(product)
        db.session.flush()

        variant = ProductVariant(
            product_id=product.id,
            sku=f"TS-{product.id}-UK9",
            size="UK 9",
            color="Black",
            price=price,
            stock_quantity=stock,
        )
        db.session.add(variant)
        db.session.commit()
        return variant.id


def register_and_login(client, email, password="Password123!"):
    """Helper to create user and obtain auth access token."""
    client.post(
        "/api/v1/auth/register",
        json={"name": "Test User", "email": email, "password": password},
    )
    res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    return res.get_json()["access_token"]


def create_test_address(app, user_email):
    """Helper to create a test delivery address for a user."""
    with app.app_context():
        user = User.query.filter_by(email=user_email).first()
        address = Address(
            user_id=user.id,
            recipient_name=user.name,
            phone="+91 98765 43210",
            line1="123 Sneaker Way",
            line2="Apt 101",
            city="Mumbai",
            state="Maharashtra",
            postal_code="400001",
            country="India",
        )
        db.session.add(address)
        db.session.commit()
        return address.id


# ==============================================================================
# PART A: Add to Bag Feedback Tests (Requirements 1–8)
# ==============================================================================

def test_add_to_bag_returns_added_and_variant_quantity(app, client):
    """Test 1 & 3 & 4: Adding a variant returns the added quantity and resulting variant quantity."""
    v_id = create_test_product(app, stock=10)
    token = register_and_login(client, "feedback1@kickshub.local")

    res = client.post(
        "/api/v1/cart/items",
        json={"variant_id": v_id, "quantity": 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["quantity_added"] == 1
    assert data["variant_quantity"] == 1
    assert data["item_count"] == 1


def test_add_to_bag_repeatedly_increments_and_tracks_quantities(app, client):
    """Test 2 & 4: Adding the same variant repeatedly increases its quantity accurately."""
    v_id = create_test_product(app, stock=10)
    token = register_and_login(client, "feedback2@kickshub.local")

    # First click: 1 unit
    res1 = client.post(
        "/api/v1/cart/items",
        json={"variant_id": v_id, "quantity": 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res1.status_code == 200
    assert res1.get_json()["variant_quantity"] == 1

    # Second click: 2 more units
    res2 = client.post(
        "/api/v1/cart/items",
        json={"variant_id": v_id, "quantity": 2},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res2.status_code == 200
    data2 = res2.get_json()
    assert data2["quantity_added"] == 2
    assert data2["variant_quantity"] == 3
    assert data2["item_count"] == 3


def test_add_to_bag_cart_badge_and_variant_quantities_are_distinct(app, client):
    """Test 5: Cart badge count reflects all units while variant_quantity reflects only the selected variant."""
    v1_id = create_test_product(app, stock=10, name="Kicks One")
    v2_id = create_test_product(app, stock=10, name="Kicks Two")
    token = register_and_login(client, "feedback3@kickshub.local")

    # Add 2 of variant 1
    res1 = client.post(
        "/api/v1/cart/items",
        json={"variant_id": v1_id, "quantity": 2},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res1.get_json()["variant_quantity"] == 2
    assert res1.get_json()["item_count"] == 2

    # Add 1 of variant 2
    res2 = client.post(
        "/api/v1/cart/items",
        json={"variant_id": v2_id, "quantity": 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    # Variant 2 has 1, but total badge count is 3
    assert res2.get_json()["variant_quantity"] == 1
    assert res2.get_json()["item_count"] == 3


def test_add_to_bag_failed_requests_do_not_report_success(app, client):
    """Test 6, 7 & 8: Failed requests (non-existent, out of stock, over limit) reject without incrementing."""
    v_id = create_test_product(app, stock=0)
    token = register_and_login(client, "feedback4@kickshub.local")

    # 1. Nonexistent variant
    res_404 = client.post(
        "/api/v1/cart/items",
        json={"variant_id": 999999, "quantity": 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_404.status_code == 404

    # 2. Out of stock variant
    res_stock = client.post(
        "/api/v1/cart/items",
        json={"variant_id": v_id, "quantity": 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_stock.status_code == 400
    assert "OUT_OF_STOCK" in res_stock.get_json()["error"]["code"]

    # 3. Over max limit
    v_instock = create_test_product(app, stock=20)
    res_max = client.post(
        "/api/v1/cart/items",
        json={"variant_id": v_instock, "quantity": 11},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_max.status_code == 400


# ==============================================================================
# PART B: Checkout and Order Tests (Requirements 9–23)
# ==============================================================================

def test_unauthenticated_user_cannot_place_order(client):
    """Test 9: An unauthenticated user cannot place an order."""
    res = client.post("/api/v1/orders", json={"address_id": 1})
    assert res.status_code == 401


def test_empty_cart_cannot_be_checked_out(app, client):
    """Test 10: An empty cart cannot be checked out."""
    token = register_and_login(client, "checkout_empty@kickshub.local")
    addr_id = create_test_address(app, "checkout_empty@kickshub.local")

    res = client.post(
        "/api/v1/orders",
        json={"address_id": addr_id},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "EMPTY_CART"


def test_another_users_address_cannot_be_used(app, client):
    """Test 11: A user cannot use another customer's delivery address."""
    token_a = register_and_login(client, "user_a@kickshub.local")
    token_b = register_and_login(client, "user_b@kickshub.local")

    addr_a_id = create_test_address(app, "user_a@kickshub.local")
    v_id = create_test_product(app, stock=5)

    # User B adds item to cart
    client.post(
        "/api/v1/cart/items",
        json={"variant_id": v_id, "quantity": 1},
        headers={"Authorization": f"Bearer {token_b}"},
    )

    # User B tries to checkout using User A's address ID
    res = client.post(
        "/api/v1/orders",
        json={"address_id": addr_a_id},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "INVALID_ADDRESS"


def test_client_supplied_totals_are_ignored(app, client):
    """Test 12: Client-supplied totals, discounts, or prices are ignored in favor of server math."""
    v_id = create_test_product(app, stock=5, price=Decimal("150.00"))
    token = register_and_login(client, "fake_totals@kickshub.local")
    addr_id = create_test_address(app, "fake_totals@kickshub.local")

    client.post(
        "/api/v1/cart/items",
        json={"variant_id": v_id, "quantity": 2},
        headers={"Authorization": f"Bearer {token}"},
    )

    # Client tries to inject a $1.00 total
    res = client.post(
        "/api/v1/orders",
        json={
            "address_id": addr_id,
            "total": "1.00",
            "subtotal": "1.00",
            "discount": "99.00",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    order = res.get_json()["order"]
    assert order["total"] == "300.00"
    assert order["subtotal"] == "300.00"


def test_order_creation_success_creates_snapshots_and_clears_cart(app, client):
    """Test 13, 14, 15 & 16: Successful order preserves line snapshots, computes total, and clears cart."""
    v_id = create_test_product(app, stock=5, price=Decimal("179.99"))
    token = register_and_login(client, "order_success@kickshub.local")
    addr_id = create_test_address(app, "order_success@kickshub.local")

    client.post(
        "/api/v1/cart/items",
        json={"variant_id": v_id, "quantity": 2},
        headers={"Authorization": f"Bearer {token}"},
    )

    res = client.post(
        "/api/v1/orders",
        json={"address_id": addr_id},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    order = res.get_json()["order"]
    assert order["status"] == "confirmed"
    assert order["subtotal"] == "359.98"
    assert order["total"] == "359.98"
    assert len(order["items"]) == 1

    item = order["items"][0]
    assert item["quantity"] == 2
    assert item["unit_price"] == "179.99"
    assert item["line_total"] == "359.98"
    assert item["size"] == "UK 9"
    assert item["color"] == "Black"
    assert order["address_snapshot"]["recipient_name"] == "Test User"

    # Verify cart is now completely cleared
    cart_res = client.get("/api/v1/cart", headers={"Authorization": f"Bearer {token}"})
    assert cart_res.get_json()["item_count"] == 0
    assert len(cart_res.get_json()["items"]) == 0


def test_failed_order_leaves_cart_intact(app, client):
    """Test 17: A failed order leaves the user's cart intact."""
    v_id = create_test_product(app, stock=1, price=Decimal("120.00"))
    token = register_and_login(client, "failed_order@kickshub.local")
    addr_id = create_test_address(app, "failed_order@kickshub.local")

    client.post(
        "/api/v1/cart/items",
        json={"variant_id": v_id, "quantity": 1},
        headers={"Authorization": f"Bearer {token}"},
    )

    # Simulate stock becoming 0 right before checkout
    with app.app_context():
        variant = db.session.get(ProductVariant, v_id)
        variant.stock_quantity = 0
        db.session.commit()

    res = client.post(
        "/api/v1/orders",
        json={"address_id": addr_id},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "INSUFFICIENT_STOCK"

    # Verify cart still has the item
    cart_res = client.get("/api/v1/cart", headers={"Authorization": f"Bearer {token}"})
    assert cart_res.get_json()["item_count"] == 1


def test_repeated_idempotent_submissions_do_not_create_duplicate_orders(app, client):
    """Test 18: Repeated submissions with the same idempotency_key return the original order."""
    v_id = create_test_product(app, stock=10, price=Decimal("99.99"))
    token = register_and_login(client, "idempotent@kickshub.local")
    addr_id = create_test_address(app, "idempotent@kickshub.local")

    client.post(
        "/api/v1/cart/items",
        json={"variant_id": v_id, "quantity": 1},
        headers={"Authorization": f"Bearer {token}"},
    )

    idem_key = str(uuid.uuid4())

    # First submission
    res1 = client.post(
        "/api/v1/orders",
        json={"address_id": addr_id, "idempotency_key": idem_key},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res1.status_code == 201
    order1 = res1.get_json()["order"]

    # Second submission with identical key
    res2 = client.post(
        "/api/v1/orders",
        json={"address_id": addr_id, "idempotency_key": idem_key},
        headers={"Authorization": f"Bearer {token}"},
    )
    # Returns existing order without creating a duplicate
    assert res2.status_code in [200, 201]
    order2 = res2.get_json()["order"]
    assert order1["id"] == order2["id"]

    # Verify stock only decremented once
    with app.app_context():
        variant = db.session.get(ProductVariant, v_id)
        assert variant.stock_quantity == 9


def test_stock_decremented_at_checkout(app, client):
    """Test 19: Stock is accurately decremented upon checkout."""
    v_id = create_test_product(app, stock=6, price=Decimal("100.00"))
    token = register_and_login(client, "stock_dec@kickshub.local")
    addr_id = create_test_address(app, "stock_dec@kickshub.local")

    client.post(
        "/api/v1/cart/items",
        json={"variant_id": v_id, "quantity": 4},
        headers={"Authorization": f"Bearer {token}"},
    )

    client.post(
        "/api/v1/orders",
        json={"address_id": addr_id},
        headers={"Authorization": f"Bearer {token}"},
    )

    with app.app_context():
        variant = db.session.get(ProductVariant, v_id)
        assert variant.stock_quantity == 2


def test_one_user_cannot_access_another_users_order(app, client):
    """Test 20: Cross-user access to orders is rejected with 404 (IDOR prevention)."""
    token_a = register_and_login(client, "owner_a@kickshub.local")
    token_b = register_and_login(client, "intruder_b@kickshub.local")

    v_id = create_test_product(app, stock=5)
    addr_a_id = create_test_address(app, "owner_a@kickshub.local")

    client.post(
        "/api/v1/cart/items",
        json={"variant_id": v_id, "quantity": 1},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    res = client.post(
        "/api/v1/orders",
        json={"address_id": addr_a_id},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    order_a_id = res.get_json()["order"]["id"]

    # Intruder B tries to fetch Order A
    res_idor = client.get(
        f"/api/v1/orders/{order_a_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert res_idor.status_code == 404


def test_historical_order_details_remain_unchanged_when_catalog_price_changes(app, client):
    """Test 21: Changing product prices and titles in catalog later does not rewrite past order snapshots."""
    v_id = create_test_product(app, stock=5, price=Decimal("120.00"), name="Retro OG")
    token = register_and_login(client, "history_immutability@kickshub.local")
    addr_id = create_test_address(app, "history_immutability@kickshub.local")

    client.post(
        "/api/v1/cart/items",
        json={"variant_id": v_id, "quantity": 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    res = client.post(
        "/api/v1/orders",
        json={"address_id": addr_id},
        headers={"Authorization": f"Bearer {token}"},
    )
    order_id = res.get_json()["order"]["id"]

    # Modify catalog price and product name in database
    with app.app_context():
        variant = db.session.get(ProductVariant, v_id)
        variant.price = Decimal("299.99")
        variant.product.name = "Mutated Product Name"
        db.session.commit()

    # Retrieve past order
    order_res = client.get(
        f"/api/v1/orders/{order_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    order_data = order_res.get_json()["order"]
    assert order_data["total"] == "120.00"
    assert order_data["items"][0]["unit_price"] == "120.00"
    assert "Retro OG" in order_data["items"][0]["product_name"]


def test_payment_status_is_honest_not_falsely_marked_as_paid(app, client):
    """Test 22: Payment status clearly indicates pending/simulated without pretending real money was collected."""
    v_id = create_test_product(app, stock=5, price=Decimal("85.00"))
    token = register_and_login(client, "honest_payment@kickshub.local")
    addr_id = create_test_address(app, "honest_payment@kickshub.local")

    client.post(
        "/api/v1/cart/items",
        json={"variant_id": v_id, "quantity": 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    res = client.post(
        "/api/v1/orders",
        json={"address_id": addr_id},
        headers={"Authorization": f"Bearer {token}"},
    )
    payment = res.get_json()["order"]["payment"]
    assert payment["status"] == "pending"
    assert payment["provider"] == "simulated"


def test_user_can_list_paginated_orders_newest_first(app, client):
    """Test 23: User can retrieve paginated order history, newest first."""
    token = register_and_login(client, "order_list@kickshub.local")
    addr_id = create_test_address(app, "order_list@kickshub.local")

    # Place order 1
    v1_id = create_test_product(app, stock=5, price=Decimal("50.00"))
    client.post("/api/v1/cart/items", json={"variant_id": v1_id, "quantity": 1}, headers={"Authorization": f"Bearer {token}"})
    res1 = client.post("/api/v1/orders", json={"address_id": addr_id}, headers={"Authorization": f"Bearer {token}"})
    order1_id = res1.get_json()["order"]["id"]

    # Place order 2
    v2_id = create_test_product(app, stock=5, price=Decimal("70.00"))
    client.post("/api/v1/cart/items", json={"variant_id": v2_id, "quantity": 1}, headers={"Authorization": f"Bearer {token}"})
    res2 = client.post("/api/v1/orders", json={"address_id": addr_id}, headers={"Authorization": f"Bearer {token}"})
    order2_id = res2.get_json()["order"]["id"]

    # Fetch orders list
    res = client.get("/api/v1/orders", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.get_json()
    assert len(data["orders"]) == 2
    # Newest first
    assert data["orders"][0]["id"] == order2_id
    assert data["orders"][1]["id"] == order1_id
    assert data["pagination"]["total_items"] == 2


def test_address_management_endpoints(app, client):
    """Test address creation and retrieval endpoints."""
    token = register_and_login(client, "addr_mgmt@kickshub.local")

    # List empty initially
    res_list = client.get("/api/v1/addresses", headers={"Authorization": f"Bearer {token}"})
    assert res_list.status_code == 200
    assert len(res_list.get_json()["addresses"]) == 0

    # Create address
    res_create = client.post(
        "/api/v1/addresses",
        json={
            "recipient_name": "Jane Sneakerhead",
            "phone": "+91 91234 56789",
            "line1": "Flat 202, Marine Drive",
            "city": "Mumbai",
            "state": "Maharashtra",
            "postal_code": "400020",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_create.status_code == 201
    created_addr = res_create.get_json()["address"]
    assert created_addr["recipient_name"] == "Jane Sneakerhead"
    assert created_addr["city"] == "Mumbai"

    # List again -> 1 address
    res_list2 = client.get("/api/v1/addresses", headers={"Authorization": f"Bearer {token}"})
    assert len(res_list2.get_json()["addresses"]) == 1
