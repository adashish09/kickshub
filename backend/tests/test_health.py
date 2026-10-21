from unittest.mock import patch
from sqlalchemy.exc import OperationalError
from app import create_app
from app.extensions import db
from app.services.seed_service import seed_database


def test_app_factory_creates_app():
    """Verify that create_app factory instantiates a valid Flask application."""
    test_app = create_app(config_name="testing")
    assert test_app is not None
    assert test_app.config["TESTING"] is True
    assert test_app.config["APPLICATION_NAME"] == "KicksHub"


def test_health_endpoint(client):
    """Verify GET /api/v1/health returns 200 and standard JSON payload."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data["application"] == "KicksHub"
    assert data["status"] == "ok"


def test_db_health_endpoint_connected(client):
    """Verify GET /api/v1/health/db returns 200 when database is responsive."""
    response = client.get("/api/v1/health/db")
    assert response.status_code == 200
    data = response.get_json()
    assert data["application"] == "KicksHub"
    assert data["status"] == "ok"
    assert data["database"] == "connected"


def test_db_health_endpoint_disconnected(app, client):
    """Verify GET /api/v1/health/db returns 503 and safe JSON when DB is unavailable."""
    with patch.object(db.session, "execute", side_effect=OperationalError("Connection refused", {}, None)):
        response = client.get("/api/v1/health/db")
        assert response.status_code == 503
        data = response.get_json()
        assert data["application"] == "KicksHub"
        assert data["status"] == "error"
        assert data["database"] == "unavailable"
        # Confirm no internal exception trace or sensitive info is leaked
        assert "password" not in response.get_data(as_text=True).lower()
        assert "traceback" not in response.get_data(as_text=True).lower()


def test_model_metadata_includes_all_ten_tables(app):
    """Verify that SQLAlchemy metadata registers all 10 core tables."""
    expected_tables = {
        "users",
        "categories",
        "products",
        "product_variants",
        "carts",
        "cart_items",
        "addresses",
        "orders",
        "order_items",
        "payments",
    }
    registered_tables = set(db.metadata.tables.keys())
    missing_tables = expected_tables - registered_tables
    assert not missing_tables, f"Missing tables in metadata: {missing_tables}"
    assert expected_tables.issubset(registered_tables)


def test_seed_database_is_idempotent(app):
    """Verify seed_database inserts expected records without failing on multiple runs."""
    stats1 = seed_database()
    assert stats1["categories"] >= 3
    assert stats1["products"] >= 5
    assert stats1["variants"] >= 15
    assert stats1["users"] >= 2

    # Second run should succeed without unique constraint errors
    stats2 = seed_database()
    assert stats2["categories"] == stats1["categories"]
    assert stats2["products"] == stats1["products"]
    assert stats2["variants"] == stats1["variants"]
