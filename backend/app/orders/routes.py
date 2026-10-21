from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, current_user
from app.orders.schemas import validate_checkout_payload, OrderValidationError
from app.orders.service import (
    create_order_from_cart,
    get_user_orders,
    get_order_by_id,
    OrderError,
)

orders_bp = Blueprint("orders", __name__, url_prefix="/orders")


def error_response(code, message, status_code=400):
    return jsonify({
        "error": {
            "code": code,
            "message": message,
        }
    }), status_code


@orders_bp.route("", methods=["POST"])
@jwt_required()
def checkout():
    """Create an order from the authenticated user's cart."""
    if not current_user:
        return error_response("UNAUTHORIZED", "User not found or is inactive.", 401)

    payload = request.get_json(silent=True)
    try:
        data = validate_checkout_payload(payload)
    except OrderValidationError as ve:
        return error_response(ve.code, ve.message, ve.status_code)

    try:
        order = create_order_from_cart(
            user_id=current_user.id,
            address_id=data["address_id"],
            idempotency_key=data.get("idempotency_key"),
        )
        return jsonify({"order": order, "message": "Order placed successfully."}), 201
    except OrderError as oe:
        return error_response(oe.code, oe.message, oe.status_code)
    except Exception as exc:
        current_app.logger.error("Error creating order for user %s: %s", current_user.id, exc)
        return error_response("SERVER_ERROR", "Failed to place order.", 500)


@orders_bp.route("", methods=["GET"])
@jwt_required()
def list_orders():
    """List paginated orders for the authenticated user, newest first."""
    if not current_user:
        return error_response("UNAUTHORIZED", "User not found or is inactive.", 401)

    try:
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 10, type=int)
        if page < 1:
            page = 1
        if per_page < 1 or per_page > 50:
            per_page = 10

        data = get_user_orders(current_user.id, page=page, per_page=per_page)
        return jsonify(data), 200
    except Exception as exc:
        current_app.logger.error("Error listing orders for user %s: %s", current_user.id, exc)
        return error_response("SERVER_ERROR", "Failed to retrieve orders.", 500)


@orders_bp.route("/<int:order_id>", methods=["GET"])
@jwt_required()
def get_order(order_id):
    """Retrieve details for a specific order owned by the current user."""
    if not current_user:
        return error_response("UNAUTHORIZED", "User not found or is inactive.", 401)

    try:
        order = get_order_by_id(current_user.id, order_id)
        return jsonify({"order": order}), 200
    except OrderError as oe:
        return error_response(oe.code, oe.message, oe.status_code)
    except Exception as exc:
        current_app.logger.error("Error retrieving order %s for user %s: %s", order_id, current_user.id, exc)
        return error_response("SERVER_ERROR", "Failed to retrieve order.", 500)
