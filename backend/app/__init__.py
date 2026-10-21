import os
from flask import Flask, jsonify
from flask_jwt_extended.exceptions import CSRFError
from app.config import config_by_name
from app.extensions import db, migrate, cors, jwt


def create_app(config_name=None):
    """Application factory for KicksHub Flask backend."""
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")

    config_class = config_by_name.get(config_name, config_by_name["default"])
    config_class.validate()

    flask_app = Flask(__name__)
    flask_app.config.from_object(config_class)

    # Centralized extension initialization
    db.init_app(flask_app)
    migrate.init_app(flask_app, db)
    jwt.init_app(flask_app)

    # Configure CORS strictly for the local React development origin
    frontend_origin = flask_app.config.get("FRONTEND_ORIGIN", "http://localhost:5173")
    origins = [frontend_origin]
    if "localhost" in frontend_origin:
        origins.append(frontend_origin.replace("localhost", "127.0.0.1"))
    elif "127.0.0.1" in frontend_origin:
        origins.append(frontend_origin.replace("127.0.0.1", "localhost"))

    cors.init_app(
        flask_app,
        resources={r"/api/*": {"origins": origins}},
        supports_credentials=True,
    )

    # JWT Callbacks and Blocklist Check
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(_jwt_header, jwt_payload):
        token_type = jwt_payload.get("type")
        if token_type == "refresh":
            jti = jwt_payload.get("jti")
            from app.models.refresh_token import RefreshToken
            token = RefreshToken.query.filter_by(jti=jti).first()
            return token is None or token.is_revoked
        return False

    @jwt.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_data):
        identity = jwt_data.get("sub")
        from app.models.user import User
        try:
            user_id = int(identity)
        except (ValueError, TypeError):
            return None
        user = db.session.get(User, user_id)
        if user and user.is_active:
            return user
        return None

    @jwt.unauthorized_loader
    def unauthorized_callback(reason):
        return jsonify({
            "error": {
                "code": "UNAUTHORIZED",
                "message": reason or "Missing or invalid authorization token.",
            }
        }), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(reason):
        return jsonify({
            "error": {
                "code": "INVALID_TOKEN",
                "message": reason or "Invalid authorization token.",
            }
        }), 401

    @jwt.expired_token_loader
    def expired_token_callback(_jwt_header, _jwt_payload):
        return jsonify({
            "error": {
                "code": "TOKEN_EXPIRED",
                "message": "The authorization token has expired.",
            }
        }), 401

    @jwt.revoked_token_loader
    def revoked_token_callback(_jwt_header, _jwt_payload):
        return jsonify({
            "error": {
                "code": "TOKEN_REVOKED",
                "message": "The authorization token has been revoked.",
            }
        }), 401

    @jwt.user_lookup_error_loader
    def user_lookup_error_callback(_jwt_header, _jwt_data):
        return jsonify({
            "error": {
                "code": "UNAUTHORIZED",
                "message": "User account not found or is inactive.",
            }
        }), 401

    @flask_app.errorhandler(CSRFError)
    def handle_csrf_error(_error):
        return jsonify({
            "error": {
                "code": "CSRF_ERROR",
                "message": "CSRF verification token missing or invalid.",
            }
        }), 401

    # Import models within app context to register SQLAlchemy metadata
    with flask_app.app_context():
        import app.models  # noqa: F401

    # Register API blueprints
    from app.routes import api_v1_bp
    flask_app.register_blueprint(api_v1_bp)

    # Global JSON error handlers
    @flask_app.errorhandler(404)
    def handle_not_found(error):
        return jsonify({"error": {"code": "NOT_FOUND", "message": "Resource not found"}, "status": 404}), 404

    @flask_app.errorhandler(405)
    def handle_method_not_allowed(error):
        return jsonify({"error": {"code": "METHOD_NOT_ALLOWED", "message": "Method not allowed"}, "status": 405}), 405

    @flask_app.errorhandler(500)
    def handle_server_error(error):
        flask_app.logger.error("Unhandled server error: %s", error)
        return jsonify({"error": {"code": "SERVER_ERROR", "message": "Internal server error"}, "status": 500}), 500

    # Register custom CLI commands
    from app.commands import register_commands
    register_commands(flask_app)

    return flask_app

