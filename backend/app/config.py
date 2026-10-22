import os
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


def normalize_database_url(url: str | None) -> str:
    """Normalize database connection string for SQLAlchemy with PyMySQL."""
    if not url:
        return ""
    url = url.strip()
    if url.startswith("mysql://"):
        return url.replace("mysql://", "mysql+pymysql://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    return url


class Config:
    """Base application configuration."""

    SECRET_KEY = os.getenv("SECRET_KEY", "dev-insecure-secret-key-change-in-production")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 1800,
    }
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    APPLICATION_NAME = "KicksHub"

    # JWT Configuration
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=int(os.getenv("JWT_ACCESS_MINUTES", "15")))
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=int(os.getenv("JWT_REFRESH_DAYS", "7")))
    JWT_TOKEN_LOCATION = ["headers", "cookies"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"
    JWT_COOKIE_SECURE = os.getenv("JWT_COOKIE_SECURE", "False").lower() in ("true", "1")
    JWT_COOKIE_SAMESITE = os.getenv("JWT_COOKIE_SAMESITE", "Lax")
    JWT_REFRESH_COOKIE_NAME = "kickshub_refresh_token"
    JWT_REFRESH_COOKIE_PATH = "/api/v1/auth"
    JWT_COOKIE_CSRF_PROTECT = True
    JWT_CSRF_METHODS = ["POST", "PUT", "PATCH", "DELETE"]
    JWT_CSRF_IN_COOKIES = True

    @classmethod
    def validate(cls):
        """Hook to validate required environment settings."""
        pass


class DevelopmentConfig(Config):
    """Development environment configuration."""

    DEBUG = True
    SQLALCHEMY_DATABASE_URI = normalize_database_url(
        os.getenv(
            "DATABASE_URL",
            "mysql+pymysql://kickshub_user:kickshub_pass123@127.0.0.1:3306/kickshub",
        )
    )


class TestingConfig(Config):
    """Testing environment configuration."""

    TESTING = True
    DEBUG = False
    # Default to an isolated in-memory SQLite database for unit tests when live MySQL is unavailable,
    # or an isolated MySQL test database when specified.
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "TEST_DATABASE_URL",
        "sqlite:///:memory:",
    )
    SQLALCHEMY_ENGINE_OPTIONS = {}
    # For testing, disable CSRF cookie verification to allow clean API test calls,
    # or test CSRF explicitly
    JWT_COOKIE_CSRF_PROTECT = False


class ProductionConfig(Config):
    """Production environment configuration."""

    DEBUG = False
    SQLALCHEMY_DATABASE_URI = normalize_database_url(os.getenv("DATABASE_URL", ""))
    JWT_COOKIE_SECURE = os.getenv("JWT_COOKIE_SECURE", "True").lower() in ("true", "1")
    JWT_COOKIE_SAMESITE = os.getenv("JWT_COOKIE_SAMESITE", "None")

    @classmethod
    def validate(cls):
        if not cls.SQLALCHEMY_DATABASE_URI:
            raise ValueError("DATABASE_URL environment variable must be set in production.")
        if not os.getenv("SECRET_KEY") or os.getenv("SECRET_KEY") == Config.SECRET_KEY:
            raise ValueError("A secure SECRET_KEY must be provided in production.")
        if not os.getenv("JWT_SECRET_KEY") or os.getenv("JWT_SECRET_KEY") == Config.JWT_SECRET_KEY:
            raise ValueError("A secure JWT_SECRET_KEY must be provided in production.")


config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
