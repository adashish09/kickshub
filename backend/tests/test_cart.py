from decimal import Decimal
from app.extensions import db
from app.models.category import Category
from app.models.product import Product
from app.models.product_variant import ProductVariant
from app.models.cart import Cart, CartItem
from app.models.user import User


def create_test_product(app, stock=10, is_active=True, price=Decimal("120.00")):
    """Helper to provision a test product and variant in database."""
    with app.app_context():
        category = Category.query.first()
        if not category:
            category = Category(name="Test Category", slug="test-category")
            db.session.add(category)
            db.session.flush()

        product = Product(
            name=f"Test Sneaker {Product.query.count() + 1}",
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
        json={"name": "Cart User", "email": email, "password": password},
    )
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return res.get_json()["access_token"]


def test_unauthenticated_user_cannot_access_cart(client):
    """Verify 401 Unauthorized when attempting to access cart without a token."""
    response = client.get("/api/v1/cart")
    assert response.status_code == 401
    assert response.get_json()["error"]["code"] == "UNAUTHORIZED"


def test_authenticated_user_receives_own_cart(client):
    """Verify authenticated user receives their own cart."""
    token = register_and_login(client, "user_cart@example.com")
    response = client.get("/api/v1/cart", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.get_json()
    assert "items" in data
    assert "item_count" in data
    assert "subtotal" in data


def test_empty_cart_structure(client):
    """Verify an empty cart returns items: [], item_count: 0, subtotal: '0.00'."""
    token = register_and_login(client, "empty_cart@example.com")
    response = client.get("/api/v1/cart", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.get_json()
    assert data["items"] == []
    assert data["item_count"] == 0
    assert data["subtotal"] == "0.00"


def test_add_valid_variant_creates_cart_item(app, client):
    """Verify adding a valid variant creates a cart item with correct details."""
    variant_id = create_test_product(app, stock=5, price=Decimal("150.00"))
    token = register_and_login(client, "add_item@example.com")

    response = client.post(
        "/api/v1/cart/items",
        headers={"Authorization": f"Bearer {token}"},
        json={"variant_id": variant_id, "quantity": 2},
    )
    assert response.status_code == 200
    data = response.get_json()
    assert len(data["items"]) == 1
    assert data["item_count"] == 2
    assert data["subtotal"] == "300.00"

    item = data["items"][0]
    assert item["variant_id"] == variant_id
    assert item["quantity"] == 2
    assert item["unit_price"] == "150.00"
    assert item["line_total"] == "300.00"
    assert item["size"] == "UK 9"
    assert item["color"] == "Black"
    assert item["available"] is True


def test_adding_same_variant_increments_quantity(app, client):
    """Verify adding the same variant multiple times increments quantity instead of creating duplicate rows."""
    variant_id = create_test_product(app, stock=10, price=Decimal("100.00"))
    token = register_and_login(client, "repeat_add@example.com")

    # First add: 1
    res1 = client.post(
        "/api/v1/cart/items",
        headers={"Authorization": f"Bearer {token}"},
        json={"variant_id": variant_id, "quantity": 1},
    )
    assert res1.status_code == 200
    assert res1.get_json()["item_count"] == 1

    # Second add: 2
    res2 = client.post(
        "/api/v1/cart/items",
        headers={"Authorization": f"Bearer {token}"},
        json={"variant_id": variant_id, "quantity": 2},
    )
    assert res2.status_code == 200
    data = res2.get_json()
    assert len(data["items"]) == 1
    assert data["items"][0]["quantity"] == 3
    assert data["item_count"] == 3
    assert data["subtotal"] == "300.00"


def test_invalid_variant_ids_rejected(client):
    """Verify nonexistent or invalid variant IDs return appropriate errors."""
    token = register_and_login(client, "invalid_var@example.com")

    # Non-existent ID
    res1 = client.post(
        "/api/v1/cart/items",
        headers={"Authorization": f"Bearer {token}"},
        json={"variant_id": 99999, "quantity": 1},
    )
    assert res1.status_code == 404
    assert res1.get_json()["error"]["code"] == "VARIANT_NOT_FOUND"

    # Non-integer / negative
    res2 = client.post(
        "/api/v1/cart/items",
        headers={"Authorization": f"Bearer {token}"},
        json={"variant_id": -5, "quantity": 1},
    )
    assert res2.status_code == 400


def test_invalid_quantities_rejected(app, client):
    """Verify 0, negative, and non-integer quantities are rejected."""
    variant_id = create_test_product(app)
    token = register_and_login(client, "invalid_qty@example.com")

    # Zero
    res1 = client.post(
        "/api/v1/cart/items",
        headers={"Authorization": f"Bearer {token}"},
        json={"variant_id": variant_id, "quantity": 0},
    )
    assert res1.status_code == 400

    # Negative
    res2 = client.post(
        "/api/v1/cart/items",
        headers={"Authorization": f"Bearer {token}"},
        json={"variant_id": variant_id, "quantity": -3},
    )
    assert res2.status_code == 400


def test_quantities_above_maximum_rejected(app, client):
    """Verify quantities exceeding the configured max limit (10) are rejected."""
    variant_id = create_test_product(app, stock=50)
    token = register_and_login(client, "max_qty@example.com")

    response = client.post(
        "/api/v1/cart/items",
        headers={"Authorization": f"Bearer {token}"},
        json={"variant_id": variant_id, "quantity": 11},
    )
    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "MAX_QUANTITY_EXCEEDED"


def test_unavailable_products_cannot_be_added(app, client):
    """Verify variants belonging to an inactive product are rejected."""
    variant_id = create_test_product(app, is_active=False)
    token = register_and_login(client, "inactive_prod@example.com")

    response = client.post(
        "/api/v1/cart/items",
        headers={"Authorization": f"Bearer {token}"},
        json={"variant_id": variant_id, "quantity": 1},
    )
    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "PRODUCT_UNAVAILABLE"


def test_stock_limits_enforced_on_addition(app, client):
    """Verify adding more than available stock is rejected."""
    variant_id = create_test_product(app, stock=2)
    token = register_and_login(client, "stock_limit@example.com")

    # Attempt to add 3 when only 2 in stock
    response = client.post(
        "/api/v1/cart/items",
        headers={"Authorization": f"Bearer {token}"},
        json={"variant_id": variant_id, "quantity": 3},
    )
    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "EXCEEDS_STOCK"


def test_stock_limits_enforced_on_accumulated_quantity(app, client):
    """Verify accumulated additions cannot exceed available stock."""
    variant_id = create_test_product(app, stock=3)
    token = register_and_login(client, "accum_stock@example.com")

    # First add 2 (valid)
    res1 = client.post(
        "/api/v1/cart/items",
        headers={"Authorization": f"Bearer {token}"},
        json={"variant_id": variant_id, "quantity": 2},
    )
    assert res1.status_code == 200

    # Add 2 more (total 4 > 3 stock)
    res2 = client.post(
        "/api/v1/cart/items",
        headers={"Authorization": f"Bearer {token}"},
        json={"variant_id": variant_id, "quantity": 2},
    )
    assert res2.status_code == 400
    assert res2.get_json()["error"]["code"] == "EXCEEDS_STOCK"


def test_quantity_update_works_correctly(app, client):
    """Verify PATCH /api/v1/cart/items/<id> updates item quantity and recalculated totals."""
    variant_id = create_test_product(app, stock=8, price=Decimal("80.00"))
    token = register_and_login(client, "patch_qty@example.com")

    add_res = client.post(
        "/api/v1/cart/items",
        headers={"Authorization": f"Bearer {token}"},
        json={"variant_id": variant_id, "quantity": 1},
    )
    item_id = add_res.get_json()["items"][0]["id"]

    patch_res = client.patch(
        f"/api/v1/cart/items/{item_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"quantity": 4},
    )
    assert patch_res.status_code == 200
    data = patch_res.get_json()
    assert data["items"][0]["quantity"] == 4
    assert data["item_count"] == 4
    assert data["subtotal"] == "320.00"


def test_user_cannot_update_another_users_cart_item(app, client):
    """Verify User A cannot update User B's cart item (returns 404)."""
    variant_id = create_test_product(app, stock=10)
    token_a = register_and_login(client, "user_a@example.com")
    token_b = register_and_login(client, "user_b@example.com")

    # User B adds item
    add_b = client.post(
        "/api/v1/cart/items",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"variant_id": variant_id, "quantity": 1},
    )
    item_b_id = add_b.get_json()["items"][0]["id"]

    # User A tries to patch User B's item
    patch_a = client.patch(
        f"/api/v1/cart/items/{item_b_id}",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"quantity": 3},
    )
    assert patch_a.status_code == 404
    assert patch_a.get_json()["error"]["code"] == "ITEM_NOT_FOUND"


def test_user_cannot_delete_another_users_cart_item(app, client):
    """Verify User A cannot delete User B's cart item (returns 404)."""
    variant_id = create_test_product(app, stock=10)
    token_a = register_and_login(client, "delete_a@example.com")
    token_b = register_and_login(client, "delete_b@example.com")

    add_b = client.post(
        "/api/v1/cart/items",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"variant_id": variant_id, "quantity": 1},
    )
    item_b_id = add_b.get_json()["items"][0]["id"]

    delete_a = client.delete(
        f"/api/v1/cart/items/{item_b_id}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert delete_a.status_code == 404
    assert delete_a.get_json()["error"]["code"] == "ITEM_NOT_FOUND"


def test_removing_item_updates_totals(app, client):
    """Verify deleting an item removes it and updates subtotal and item count."""
    var1 = create_test_product(app, stock=10, price=Decimal("100.00"))
    var2 = create_test_product(app, stock=10, price=Decimal("50.00"))
    token = register_and_login(client, "remove_item@example.com")

    client.post("/api/v1/cart/items", headers={"Authorization": f"Bearer {token}"}, json={"variant_id": var1, "quantity": 2})
    res2 = client.post("/api/v1/cart/items", headers={"Authorization": f"Bearer {token}"}, json={"variant_id": var2, "quantity": 1})
    items = res2.get_json()["items"]
    assert len(items) == 2
    assert res2.get_json()["subtotal"] == "250.00"

    item_to_remove = items[0]["id"]
    del_res = client.delete(f"/api/v1/cart/items/{item_to_remove}", headers={"Authorization": f"Bearer {token}"})
    assert del_res.status_code == 200
    data = del_res.get_json()
    assert len(data["items"]) == 1
    assert data["item_count"] == 1
    assert data["subtotal"] == "50.00"


def test_clearing_cart_removes_only_current_users_items(app, client):
    """Verify DELETE /api/v1/cart/items clears only the authenticated user's cart."""
    var = create_test_product(app, stock=10)
    token_1 = register_and_login(client, "clear_1@example.com")
    token_2 = register_and_login(client, "clear_2@example.com")

    client.post("/api/v1/cart/items", headers={"Authorization": f"Bearer {token_1}"}, json={"variant_id": var, "quantity": 2})
    client.post("/api/v1/cart/items", headers={"Authorization": f"Bearer {token_2}"}, json={"variant_id": var, "quantity": 3})

    # Clear user 1 cart
    clear_res = client.delete("/api/v1/cart/items", headers={"Authorization": f"Bearer {token_1}"})
    assert clear_res.status_code == 200
    assert clear_res.get_json()["items"] == []
    assert clear_res.get_json()["item_count"] == 0

    # User 2 cart must remain completely intact
    get_user2 = client.get("/api/v1/cart", headers={"Authorization": f"Bearer {token_2}"})
    assert get_user2.get_json()["item_count"] == 3


def test_subtotal_calculation_and_decimal_precision(app, client):
    """Verify subtotal arithmetic handles decimal fractions accurately without floating point error."""
    var1 = create_test_product(app, stock=10, price=Decimal("129.99"))
    var2 = create_test_product(app, stock=10, price=Decimal("79.95"))
    token = register_and_login(client, "precision@example.com")

    client.post("/api/v1/cart/items", headers={"Authorization": f"Bearer {token}"}, json={"variant_id": var1, "quantity": 2})
    client.post("/api/v1/cart/items", headers={"Authorization": f"Bearer {token}"}, json={"variant_id": var2, "quantity": 3})

    # 129.99 * 2 = 259.98
    # 79.95 * 3 = 239.85
    # Total = 499.83
    cart_res = client.get("/api/v1/cart", headers={"Authorization": f"Bearer {token}"})
    data = cart_res.get_json()
    assert data["subtotal"] == "499.83"
    assert data["item_count"] == 5


def test_cart_summary_endpoint(app, client):
    """Verify GET /api/v1/cart/summary returns concise item count and subtotal."""
    var = create_test_product(app, stock=10, price=Decimal("45.50"))
    token = register_and_login(client, "summary@example.com")

    client.post("/api/v1/cart/items", headers={"Authorization": f"Bearer {token}"}, json={"variant_id": var, "quantity": 2})

    summary_res = client.get("/api/v1/cart/summary", headers={"Authorization": f"Bearer {token}"})
    assert summary_res.status_code == 200
    data = summary_res.get_json()
    assert data["item_count"] == 2
    assert data["subtotal"] == "91.00"


def test_cannot_modify_variant_id_via_patch(app, client):
    """Verify attempting to modify variant_id via PATCH is rejected."""
    var1 = create_test_product(app, stock=10)
    var2 = create_test_product(app, stock=10)
    token = register_and_login(client, "no_variant_patch@example.com")

    add_res = client.post("/api/v1/cart/items", headers={"Authorization": f"Bearer {token}"}, json={"variant_id": var1, "quantity": 1})
    item_id = add_res.get_json()["items"][0]["id"]

    patch_res = client.patch(
        f"/api/v1/cart/items/{item_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"variant_id": var2, "quantity": 2},
    )
    assert patch_res.status_code == 400
    assert patch_res.get_json()["error"]["code"] == "FORBIDDEN_FIELD_UPDATE"


def test_failed_operations_roll_back_correctly(app, client):
    """Verify failed mutation operations roll back database session without altering existing cart state."""
    var = create_test_product(app, stock=5, price=Decimal("60.00"))
    token = register_and_login(client, "rollback_test@example.com")

    # Add initial item of quantity 2
    client.post("/api/v1/cart/items", headers={"Authorization": f"Bearer {token}"}, json={"variant_id": var, "quantity": 2})

    # Attempt to update with invalid quantity (e.g. 15 > 5 stock)
    with app.app_context():
        user = User.query.filter_by(email="rollback_test@example.com").first()
        cart = Cart.query.filter_by(user_id=user.id).first()
        item = cart.items[0]
        item_id = item.id

    fail_res = client.patch(
        f"/api/v1/cart/items/{item_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"quantity": 15},
    )
    assert fail_res.status_code == 400

    # Ensure quantity in database was rolled back and remains 2
    with app.app_context():
        db.session.expire_all()
        item_after = db.session.get(CartItem, item_id)
        assert item_after.quantity == 2


def test_database_unique_constraint_prevents_duplicate_cart_item(app):
    """Verify database enforces unique constraint on (cart_id, variant_id)."""
    from sqlalchemy.exc import IntegrityError
    var_id = create_test_product(app, stock=10)

    with app.app_context():
        user = User(name="Constraint User", email="constraint@example.com")
        db.session.add(user)
        db.session.flush()

        cart = Cart(user_id=user.id)
        db.session.add(cart)
        db.session.flush()

        item1 = CartItem(cart_id=cart.id, variant_id=var_id, quantity=1)
        db.session.add(item1)
        db.session.commit()

        # Attempt to insert direct duplicate row
        item2 = CartItem(cart_id=cart.id, variant_id=var_id, quantity=2)
        db.session.add(item2)
        try:
            db.session.commit()
            assert False, "Expected IntegrityError on duplicate cart_id and variant_id"
        except IntegrityError:
            db.session.rollback()

