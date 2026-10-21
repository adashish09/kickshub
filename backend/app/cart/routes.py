import logging
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, current_user
from app.cart.schemas import (
    ValidationError,
    validate_add_item_payload,
    validate_update_item_payload,
)
from app.cart.service import (
    CartError,
    get_or_create_cart,
    serialize_cart,
    add_item_to_cart,
    update_cart_item_quantity,
    remove_cart_item,
    clear_cart,
    get_cart_summary,
)

logger = logging.getLogger(__name__)

cart_bp = Blueprint("cart", __name__, url_prefix="/cart")


def error_response(code, message, status_code=400):
    """Generate standardized error response format."""
    return jsonify({
        "error": {
            "code": code,
            "message": message,
        }
    }), status_code


@cart_bp.route("", methods=["GET"])
@jwt_required()
def get_cart():
    """Retrieve the authenticated user's persistent shopping cart."""
    if not current_user:
        return error_response("UNAUTHORIZED", "User not found or is inactive.", 401)

    try:
        cart = get_or_create_cart(current_user.id)
        return jsonify(serialize_cart(cart)), 200
    except Exception as exc:
        current_app.logger.error("Error fetching cart for user %s: %s", current_user.id, exc)
        return error_response("SERVER_ERROR", "An error occurred retrieving your cart.", 500)


@cart_bp.route("/items", methods=["POST"])
@jwt_required()
def add_item():
    """Add a product variant to the current user's cart."""
    if not current_user:
        return error_response("UNAUTHORIZED", "User not found or is inactive.", 401)

    payload = request.get_json(silent=True)
    try:
        data = validate_add_item_payload(payload)
    except ValidationError as ve:
        return error_response(ve.code, ve.message, ve.status_code)

    try:
        cart_data = add_item_to_cart(
            user_id=current_user.id,
            variant_id=data["variant_id"],
            quantity=data["quantity"],
        )
        return jsonify(cart_data), 200
    except CartError as ce:
        return error_response(ce.code, ce.message, ce.status_code)
    except Exception as exc:
        current_app.logger.error("Error adding item to cart for user %s: %s", current_user.id, exc)
        return error_response("SERVER_ERROR", "Failed to add item to cart.", 500)


@cart_bp.route("/items/<int:item_id>", methods=["PATCH"])
@jwt_required()
def update_item(item_id):
    """Update the quantity of an item in the user's cart."""
    if not current_user:
        return error_response("UNAUTHORIZED", "User not found or is inactive.", 401)

    payload = request.get_json(silent=True)
    try:
        data = validate_update_item_payload(payload)
    except ValidationError as ve:
        return error_response(ve.code, ve.message, ve.status_code)

    try:
        cart_data = update_cart_item_quantity(
            user_id=current_user.id,
            item_id=item_id,
            quantity=data["quantity"],
        )
        return jsonify(cart_data), 200
    except CartError as ce:
        return error_response(ce.code, ce.message, ce.status_code)
    except Exception as exc:
        current_app.logger.error("Error updating cart item %s for user %s: %s", item_id, current_user.id, exc)
        return error_response("SERVER_ERROR", "Failed to update cart item.", 500)


@cart_bp.route("/items/<int:item_id>", methods=["DELETE"])
@jwt_required()
def remove_item(item_id):
    """Remove a specific line item from the user's cart."""
    if not current_user:
        return error_response("UNAUTHORIZED", "User not found or is inactive.", 401)

    try:
        cart_data = remove_cart_item(user_id=current_user.id, item_id=item_id)
        return jsonify({"message": "Item removed from cart.", "cart": cart_data, **cart_data}), 200
    except CartError as ce:
        return error_response(ce.code, ce.message, ce.status_code)
    except Exception as exc:
        current_app.logger.error("Error removing cart item %s for user %s: %s", item_id, current_user.id, exc)
        return error_response("SERVER_ERROR", "Failed to remove item from cart.", 500)


@cart_bp.route("/items", methods=["DELETE"])
@jwt_required()
def clear_cart_endpoint():
    """Clear all items from the current user's cart."""
    if not current_user:
        return error_response("UNAUTHORIZED", "User not found or is inactive.", 401)

    try:
        cart_data = clear_cart(user_id=current_user.id)
        return jsonify({"message": "Cart cleared successfully.", "cart": cart_data, **cart_data}), 200
    except Exception as exc:
        current_app.logger.error("Error clearing cart for user %s: %s", current_user.id, exc)
        return error_response("SERVER_ERROR", "Failed to clear cart.", 500)


@cart_bp.route("/summary", methods=["GET"])
@jwt_required()
def cart_summary():
    """Retrieve quick summary of cart item count and subtotal."""
    if not current_user:
        return error_response("UNAUTHORIZED", "User not found or is inactive.", 401)

    try:
        summary_data = get_cart_summary(user_id=current_user.id)
        return jsonify(summary_data), 200
    except Exception as exc:
        current_app.logger.error("Error getting cart summary for user %s: %s", current_user.id, exc)
        return error_response("SERVER_ERROR", "Failed to retrieve cart summary.", 500)
