import logging
from flask import Blueprint, jsonify, current_app
from sqlalchemy import text
from app.extensions import db

health_bp = Blueprint("health", __name__)
logger = logging.getLogger(__name__)


@health_bp.route("/health", methods=["GET"])
def health_check():
    """Basic service liveness check."""
    return jsonify({
        "application": current_app.config.get("APPLICATION_NAME", "KicksHub"),
        "status": "ok",
    }), 200


@health_bp.route("/health/db", methods=["GET"])
def db_health_check():
    """Database readiness probe executing a lightweight test query."""
    app_name = current_app.config.get("APPLICATION_NAME", "KicksHub")
    try:
        # Execute lightweight query to confirm database connectivity
        db.session.execute(text("SELECT 1"))
        return jsonify({
            "application": app_name,
            "status": "ok",
            "database": "connected",
        }), 200
    except Exception as exc:
        # Log error securely internally; NEVER return raw exceptions or credentials in response
        current_app.logger.error("Database health check failed: %s", str(exc))
        return jsonify({
            "application": app_name,
            "status": "error",
            "database": "unavailable",
        }), 503
