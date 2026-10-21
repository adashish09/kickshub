from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, current_user
from app.addresses.schemas import validate_create_address_payload, AddressValidationError
from app.addresses.service import get_user_addresses, create_address

addresses_bp = Blueprint("addresses", __name__, url_prefix="/addresses")


def error_response(code, message, status_code=400):
    return jsonify({
        "error": {
            "code": code,
            "message": message,
        }
    }), status_code


@addresses_bp.route("", methods=["GET"])
@jwt_required()
def list_addresses():
    """Retrieve saved delivery addresses for the authenticated user."""
    if not current_user:
        return error_response("UNAUTHORIZED", "User not found or is inactive.", 401)

    try:
        addresses = get_user_addresses(current_user.id)
        return jsonify({"addresses": addresses}), 200
    except Exception as exc:
        current_app.logger.error("Error fetching addresses for user %s: %s", current_user.id, exc)
        return error_response("SERVER_ERROR", "Failed to retrieve addresses.", 500)


@addresses_bp.route("", methods=["POST"])
@jwt_required()
def add_address():
    """Add a new delivery address for the authenticated user."""
    if not current_user:
        return error_response("UNAUTHORIZED", "User not found or is inactive.", 401)

    payload = request.get_json(silent=True)
    try:
        data = validate_create_address_payload(payload)
    except AddressValidationError as ve:
        return error_response(ve.code, ve.message, ve.status_code)

    try:
        address = create_address(current_user.id, data)
        return jsonify({"address": address}), 201
    except Exception as exc:
        current_app.logger.error("Error creating address for user %s: %s", current_user.id, exc)
        return error_response("SERVER_ERROR", "Failed to save address.", 500)
