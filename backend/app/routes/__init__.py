from flask import Blueprint
from app.routes.health import health_bp
from app.products.routes import products_bp
from app.auth import auth_bp, users_bp
from app.cart import cart_bp
from app.addresses import addresses_bp
from app.orders import orders_bp
from app.admin import admin_bp

api_v1_bp = Blueprint("api_v1", __name__, url_prefix="/api/v1")
api_v1_bp.register_blueprint(health_bp)
api_v1_bp.register_blueprint(products_bp)
api_v1_bp.register_blueprint(auth_bp)
api_v1_bp.register_blueprint(users_bp)
api_v1_bp.register_blueprint(cart_bp)
api_v1_bp.register_blueprint(addresses_bp)
api_v1_bp.register_blueprint(orders_bp)
api_v1_bp.register_blueprint(admin_bp)

__all__ = ["api_v1_bp"]


