import logging
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    jwt_required,
    current_user,
    get_jwt,
    get_jwt_identity,
    set_refresh_cookies,
    unset_jwt_cookies,
    get_csrf_token,
)
from app.auth.schemas import (
    ValidationError,
    validate_register_payload,
    validate_login_payload,
    validate_profile_update_payload,
    validate_password_change_payload,
)
from app.auth.service import (
    AuthError,
    DuplicateEmailError,
    InvalidCredentialsError,
    AccountInactiveError,
    TokenRevokedError,
    InvalidPasswordError,
    register_user,
    authenticate_user,
    create_user_tokens,
    refresh_access_token,
    revoke_refresh_token,
    change_user_password,
    update_user_profile,
)

logger = logging.getLogger(__name__)

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")
users_bp = Blueprint("users", __name__, url_prefix="/users")


def error_response(code, message, status_code=400):
    """Generate consistent JSON error responses."""
    return jsonify({
        "error": {
            "code": code,
            "message": message,
        }
    }), status_code


# ---------------------------------------------------------------------------
# Auth Endpoints (/api/v1/auth)
# ---------------------------------------------------------------------------


@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a new customer account."""
    payload = request.get_json(silent=True)
    try:
        validated_data = validate_register_payload(payload)
    except ValidationError as ve:
        return error_response(ve.code, ve.message, ve.status_code)

    try:
        user = register_user(
            name=validated_data["name"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        user_dict = user.to_dict()
        return jsonify({"user": user_dict, **user_dict}), 201
    except DuplicateEmailError as dee:
        return error_response(dee.code, dee.message, dee.status_code)
    except Exception as exc:
        current_app.logger.error("Registration error: %s", exc)
        return error_response("SERVER_ERROR", "An error occurred during registration.", 500)


@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticate user credentials, set refresh cookie, and return access token and user profile."""
    payload = request.get_json(silent=True)
    try:
        validated_data = validate_login_payload(payload)
    except ValidationError as ve:
        return error_response(ve.code, ve.message, ve.status_code)

    try:
        user = authenticate_user(
            email=validated_data["email"],
            password=validated_data["password"],
        )
        access_token, refresh_token = create_user_tokens(user)
        csrf_token = (
            get_csrf_token(refresh_token)
            if current_app.config.get("JWT_COOKIE_CSRF_PROTECT")
            else None
        )

        user_dict = user.to_dict()
        response = jsonify({
            "user": user_dict,
            **user_dict,
            "access_token": access_token,
            "csrf_token": csrf_token,
        })
        set_refresh_cookies(response, refresh_token)
        return response, 200

    except (InvalidCredentialsError, AccountInactiveError) as ae:
        return error_response(ae.code, ae.message, ae.status_code)
    except Exception as exc:
        current_app.logger.error("Login error: %s", exc)
        return error_response("SERVER_ERROR", "An error occurred during login.", 500)


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """Issue a new access token using an active, unrevoked refresh token cookie/header."""
    try:
        identity = get_jwt_identity()
        jwt_data = get_jwt()
        jti = jwt_data.get("jti")

        new_access_token = refresh_access_token(jti=jti, user_id=int(identity))
        return jsonify({"access_token": new_access_token}), 200
    except (TokenRevokedError, AccountInactiveError) as ae:
        return error_response(ae.code, ae.message, ae.status_code)
    except Exception as exc:
        current_app.logger.error("Token refresh error: %s", exc)
        return error_response("SERVER_ERROR", "Failed to refresh access token.", 500)


@auth_bp.route("/logout", methods=["POST"])
@jwt_required(refresh=True)
def logout():
    """Revoke the current refresh session and clear the HttpOnly refresh token cookie."""
    try:
        jwt_data = get_jwt()
        jti = jwt_data.get("jti")
        if jti:
            revoke_refresh_token(jti)

        response = jsonify({"message": "Successfully logged out."})
        unset_jwt_cookies(response)
        return response, 200
    except Exception as exc:
        current_app.logger.error("Logout error: %s", exc)
        return error_response("SERVER_ERROR", "Failed to log out.", 500)


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def auth_me():
    """Return the safe public profile of the currently authenticated user."""
    if not current_user:
        return error_response("UNAUTHORIZED", "User not found or is inactive.", 401)
    user_dict = current_user.to_dict()
    return jsonify({"user": user_dict, **user_dict}), 200


# ---------------------------------------------------------------------------
# User Profile Endpoints (/api/v1/users)
# ---------------------------------------------------------------------------


@users_bp.route("/me", methods=["GET"])
@jwt_required()
def get_user_profile():
    """Retrieve profile for currently authenticated user."""
    if not current_user:
        return error_response("UNAUTHORIZED", "User not found or is inactive.", 401)
    user_dict = current_user.to_dict()
    return jsonify({"user": user_dict, **user_dict}), 200


@users_bp.route("/me", methods=["PATCH"])
@jwt_required()
def update_profile():
    """Update permitted fields for the currently authenticated user."""
    if not current_user:
        return error_response("UNAUTHORIZED", "User not found or is inactive.", 401)

    payload = request.get_json(silent=True)
    try:
        updates = validate_profile_update_payload(payload)
    except ValidationError as ve:
        return error_response(ve.code, ve.message, ve.status_code)

    try:
        updated_user = update_user_profile(current_user, updates)
        user_dict = updated_user.to_dict()
        return jsonify({"user": user_dict, **user_dict}), 200
    except Exception as exc:
        current_app.logger.error("Profile update error: %s", exc)
        return error_response("SERVER_ERROR", "Failed to update profile.", 500)


@users_bp.route("/me/change-password", methods=["POST"])
@jwt_required()
def change_password():
    """Change user password, securely hash new password, and revoke all active refresh sessions."""
    if not current_user:
        return error_response("UNAUTHORIZED", "User not found or is inactive.", 401)

    payload = request.get_json(silent=True)
    try:
        data = validate_password_change_payload(payload)
    except ValidationError as ve:
        return error_response(ve.code, ve.message, ve.status_code)

    try:
        change_user_password(
            user=current_user,
            current_password=data["current_password"],
            new_password=data["new_password"],
        )
        response = jsonify({"message": "Password changed successfully. Please log in again."})
        unset_jwt_cookies(response)
        return response, 200
    except InvalidPasswordError as ipe:
        return error_response(ipe.code, ipe.message, ipe.status_code)
    except Exception as exc:
        current_app.logger.error("Password change error: %s", exc)
        return error_response("SERVER_ERROR", "Failed to change password.", 500)
