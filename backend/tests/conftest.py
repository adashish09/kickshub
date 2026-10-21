import pytest
from app import create_app
from app.extensions import db


@pytest.fixture
def app():
    """Create and configure a Flask application for testing."""
    application = create_app(config_name="testing")

    with application.app_context():
        db.create_all()
        yield application
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """Test client for dispatching requests to the Flask test app."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """CLI runner for testing Flask commands."""
    return app.test_cli_runner()
