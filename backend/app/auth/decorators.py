from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, current_user


def admin_required():
    """Decorator to protect endpoints requiring verified administrator role."""
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            # Verify valid JWT access token
            verify_jwt_in_request()
            if not current_user or not current_user.is_active:
                return jsonify({
                    "error": {
                        "code": "UNAUTHORIZED",
                        "message": "User account not found or is inactive.",
                    }
                }), 401

            if current_user.role != "admin":
                return jsonify({
                    "error": {
                        "code": "FORBIDDEN",
                        "message": "Administrator privileges required.",
                    }
                }), 403

            return fn(*args, **kwargs)
        return decorator
    return wrapper
