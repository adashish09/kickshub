from decimal import Decimal
import pytest
from app.extensions import db
from app.models import Category, Product, ProductVariant
from app.services.seed_service import seed_database


@pytest.fixture(autouse=True)
def populate_sample_catalog(app):
    """Seed test database with the sample catalog before each test."""
    seed_database()


def test_product_list_structure(client):
    """Test 1: Product listing returns expected schema structure."""
    response = client.get("/api/v1/products")
    assert response.status_code == 200
    data = response.get_json()

    assert "items" in data
    assert "pagination" in data
    assert isinstance(data["items"], list)
    assert len(data["items"]) > 0

    item = data["items"][0]
    expected_fields = {
        "id",
        "name",
        "slug",
        "brand",
        "description",
        "image_url",
        "price_from",
        "in_stock",
        "available_sizes",
    }
    assert expected_fields.issubset(set(item.keys()))
    assert isinstance(item["price_from"], str)
    assert isinstance(item["in_stock"], bool)
    assert isinstance(item["available_sizes"], list)

    pagination = data["pagination"]
    assert pagination["page"] == 1
    assert pagination["limit"] == 12
    assert pagination["total"] >= 5
    assert pagination["pages"] >= 1


def test_pagination_and_max_limit(client):
    """Test 2: Pagination honors page/limit and enforces max limit 48."""
    # Test valid limit
    res1 = client.get("/api/v1/products?page=1&limit=2")
    assert res1.status_code == 200
    data1 = res1.get_json()
    assert len(data1["items"]) == 2
    assert data1["pagination"]["limit"] == 2
    assert data1["pagination"]["pages"] >= 3

    # Test limit exceeding 48
    res_invalid_limit = client.get("/api/v1/products?limit=50")
    assert res_invalid_limit.status_code == 400
    err = res_invalid_limit.get_json()["error"]
    assert err["code"] == "VALIDATION_ERROR"
    assert "between 1 and 48" in err["message"]

    # Test invalid page <= 0
    res_invalid_page = client.get("/api/v1/products?page=0")
    assert res_invalid_page.status_code == 400


def test_search_filter(client):
    """Test 3: Case-insensitive search filters by name and brand."""
    # Search by brand
    res_brand = client.get("/api/v1/products?search=nike")
    assert res_brand.status_code == 200
    items = res_brand.get_json()["items"]
    assert len(items) >= 2
    for item in items:
        assert "nike" in item["brand"].lower() or "nike" in item["name"].lower()

    # Search by model name
    res_name = client.get("/api/v1/products?search=velocity")
    assert res_name.status_code == 200
    name_items = res_name.get_json()["items"]
    assert len(name_items) == 1
    assert name_items[0]["name"] == "Air Velocity Pro"

    # Search non-matching term
    res_empty = client.get("/api/v1/products?search=xyznonexistent99")
    assert res_empty.status_code == 200
    assert len(res_empty.get_json()["items"]) == 0
    assert res_empty.get_json()["pagination"]["total"] == 0


def test_brand_and_category_filters(client):
    """Test 4: Brand and category slug filters."""
    # Brand filter
    res_puma = client.get("/api/v1/products?brand=Puma")
    assert res_puma.status_code == 200
    puma_items = res_puma.get_json()["items"]
    assert len(puma_items) == 1
    assert puma_items[0]["brand"] == "Puma"

    # Category filter
    res_running = client.get("/api/v1/products?category=running")
    assert res_running.status_code == 200
    running_items = res_running.get_json()["items"]
    assert len(running_items) >= 2
    slugs = {item["slug"] for item in running_items}
    assert "air-velocity-pro" in slugs
    assert "cloudstride-nitro" in slugs


def test_size_filter_without_duplication(client):
    """Test 5: Size filter filters by variant size without duplicate products."""
    res_size = client.get("/api/v1/products?size=UK 8")
    assert res_size.status_code == 200
    data = res_size.get_json()
    items = data["items"]

    # Ensure no duplicates
    product_ids = [item["id"] for item in items]
    assert len(product_ids) == len(set(product_ids))
    assert data["pagination"]["total"] == len(items)

    # Verify that each returned product actually has a variant in UK 8
    for item in items:
        prod = db.session.get(Product, item["id"])
        sizes = [v.size for v in prod.variants]
        assert "UK 8" in sizes


def test_price_filters(client):
    """Test 6: Price filtering by min_price and max_price."""
    # Price range 90 to 110 (Should match Downtown Clean Low at 99.99)
    res_price = client.get("/api/v1/products?min_price=90&max_price=110")
    assert res_price.status_code == 200
    items = res_price.get_json()["items"]
    assert len(items) >= 1
    for item in items:
        price = Decimal(item["price_from"])
        assert 90 <= price <= 110


def test_stock_filtering(client):
    """Test 7: In-stock filtering."""
    res_stock = client.get("/api/v1/products?in_stock=true")
    assert res_stock.status_code == 200
    items = res_stock.get_json()["items"]
    assert len(items) > 0
    for item in items:
        assert item["in_stock"] is True


def test_sorting_options(client):
    """Test 8: Sorting by newest, price_asc, price_desc, and name_asc."""
    # Name Ascending
    res_name = client.get("/api/v1/products?sort=name_asc")
    assert res_name.status_code == 200
    names = [i["name"] for i in res_name.get_json()["items"]]
    assert names == sorted(names)

    # Price Ascending
    res_price_asc = client.get("/api/v1/products?sort=price_asc")
    assert res_price_asc.status_code == 200
    prices_asc = [Decimal(i["price_from"]) for i in res_price_asc.get_json()["items"]]
    assert prices_asc == sorted(prices_asc)

    # Price Descending
    res_price_desc = client.get("/api/v1/products?sort=price_desc")
    assert res_price_desc.status_code == 200
    prices_desc = [Decimal(i["price_from"]) for i in res_price_desc.get_json()["items"]]
    assert prices_desc == sorted(prices_desc, reverse=True)


def test_invalid_parameters_controlled_errors(client):
    """Test 9: Invalid query parameters return HTTP 400 with controlled JSON."""
    bad_requests = [
        "/api/v1/products?page=-1",
        "/api/v1/products?page=abc",
        "/api/v1/products?limit=0",
        "/api/v1/products?limit=100",
        "/api/v1/products?min_price=-5",
        "/api/v1/products?max_price=-10",
        "/api/v1/products?min_price=200&max_price=100",
        "/api/v1/products?sort=hacked_sort",
        "/api/v1/products?in_stock=notabool",
    ]
    for url in bad_requests:
        res = client.get(url)
        assert res.status_code == 400
        data = res.get_json()
        assert "error" in data
        assert data["error"]["code"] == "VALIDATION_ERROR"


def test_product_details_with_variants(client):
    """Test 10: GET /api/v1/products/<slug> returns full details and variants."""
    res = client.get("/api/v1/products/air-velocity-pro")
    assert res.status_code == 200
    data = res.get_json()

    assert data["name"] == "Air Velocity Pro"
    assert data["slug"] == "air-velocity-pro"
    assert data["brand"] == "Nike"
    assert "variants" in data
    assert len(data["variants"]) == 5

    # Check variant structure (no raw stock count exposed!)
    var = data["variants"][0]
    assert "sku" in var
    assert "size" in var
    assert "color" in var
    assert "price" in var
    assert "in_stock" in var
    assert "stock_quantity" not in var  # Raw quantity must NOT be leaked


def test_unknown_or_inactive_product_returns_404(client):
    """Test 11: Unknown or inactive product returns HTTP 404."""
    # Unknown slug
    res_unknown = client.get("/api/v1/products/unknown-sneaker-slug")
    assert res_unknown.status_code == 404
    assert res_unknown.get_json()["error"]["code"] == "NOT_FOUND"

    # Inactive product
    inactive = Product(
        category_id=1,
        name="Archived Sneaker",
        slug="archived-sneaker",
        brand="Nike",
        is_active=False,
    )
    db.session.add(inactive)
    db.session.commit()

    res_inactive = client.get("/api/v1/products/archived-sneaker")
    assert res_inactive.status_code == 404

    # Also verify GET /api/v1/products/<id>/variants returns 404 for inactive
    res_var_inactive = client.get(f"/api/v1/products/{inactive.id}/variants")
    assert res_var_inactive.status_code == 404


def test_categories_endpoint(client):
    """Test 12: GET /api/v1/categories returns distinct active catalog categories."""
    res = client.get("/api/v1/categories")
    assert res.status_code == 200
    data = res.get_json()
    assert "items" in data
    items = data["items"]
    assert len(items) >= 3

    slugs = [c["slug"] for c in items]
    assert "basketball" in slugs
    assert "lifestyle" in slugs
    assert "running" in slugs
    # Verify deterministic alphabetical sorting
    names = [c["name"] for c in items]
    assert names == sorted(names)
