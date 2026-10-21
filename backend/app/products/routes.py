import logging
from flask import Blueprint, request, jsonify, current_app
from app.products.schemas import validate_product_list_params, ValidationError
from app.products.service import (
    list_products,
    get_product_by_slug,
    get_product_variants,
    get_active_categories,
)

products_bp = Blueprint("products", __name__)
logger = logging.getLogger(__name__)


def error_response(code, message, status_code=400):
    """Generate consistent error response payload."""
    return jsonify({
        "error": {
            "code": code,
            "message": message,
        }
    }), status_code


@products_bp.route("/products", methods=["GET"])
def get_products():
    """List products with filtering, search, sorting, and pagination."""
    try:
        validated_params = validate_product_list_params(request.args)
    except ValidationError as ve:
        return error_response(ve.code, ve.message, status_code=400)
    except Exception as exc:
        current_app.logger.error("Unexpected error validating params: %s", exc)
        return error_response("VALIDATION_ERROR", "Invalid query parameters.", status_code=400)

    try:
        result = list_products(validated_params)
        return jsonify(result), 200
    except Exception as exc:
        current_app.logger.error("Error retrieving products: %s", exc)
        return error_response("SERVER_ERROR", "An error occurred retrieving products.", status_code=500)


@products_bp.route("/products/<slug>", methods=["GET"])
def get_product(slug):
    """Retrieve details for a single active product by slug."""
    try:
        product_detail = get_product_by_slug(slug)
        if not product_detail:
            return error_response("NOT_FOUND", f"Product '{slug}' not found.", status_code=404)
        return jsonify(product_detail), 200
    except Exception as exc:
        current_app.logger.error("Error retrieving product '%s': %s", slug, exc)
        return error_response("SERVER_ERROR", "An error occurred retrieving product details.", status_code=500)


@products_bp.route("/products/<int:product_id>/variants", methods=["GET"])
def get_variants(product_id):
    """Retrieve variants for an active product."""
    try:
        variants = get_product_variants(product_id)
        if variants is None:
            return error_response("NOT_FOUND", f"Product ID {product_id} not found.", status_code=404)
        return jsonify({"items": variants}), 200
    except Exception as exc:
        current_app.logger.error("Error retrieving variants for product %d: %s", product_id, exc)
        return error_response("SERVER_ERROR", "An error occurred retrieving product variants.", status_code=500)


@products_bp.route("/categories", methods=["GET"])
def get_categories():
    """Retrieve categories used by active catalog products."""
    try:
        categories = get_active_categories()
        return jsonify({"items": categories}), 200
    except Exception as exc:
        current_app.logger.error("Error retrieving categories: %s", exc)
        return error_response("SERVER_ERROR", "An error occurred retrieving categories.", status_code=500)
