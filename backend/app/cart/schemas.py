class ValidationError(Exception):
    """Exception raised for client request validation errors in cart operations."""

    def __init__(self, message, code="VALIDATION_ERROR", status_code=400):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


# Configured maximum quantity per individual cart line
MAX_ITEM_QUANTITY = 10


def validate_add_item_payload(payload):
    """Validate request body for adding an item to the cart."""
    if not isinstance(payload, dict):
        raise ValidationError("Request body must be a JSON object.")

    # variant_id validation
    if "variant_id" not in payload:
        raise ValidationError("variant_id is required.", code="MISSING_VARIANT_ID")

    try:
        variant_id = int(payload["variant_id"])
        if variant_id <= 0:
            raise ValueError()
    except (ValueError, TypeError):
        raise ValidationError("variant_id must be a positive integer.", code="INVALID_VARIANT_ID")

    # quantity validation (optional, default 1)
    quantity = payload.get("quantity", 1)
    try:
        quantity = int(quantity)
        if quantity <= 0:
            raise ValueError()
    except (ValueError, TypeError):
        raise ValidationError("quantity must be a positive integer.", code="INVALID_QUANTITY")

    if quantity > MAX_ITEM_QUANTITY:
        raise ValidationError(
            f"Quantity cannot exceed the maximum limit of {MAX_ITEM_QUANTITY} per item.",
            code="MAX_QUANTITY_EXCEEDED",
        )

    return {
        "variant_id": variant_id,
        "quantity": quantity,
    }


def validate_update_item_payload(payload):
    """Validate request body for updating cart item quantity."""
    if not isinstance(payload, dict):
        raise ValidationError("Request body must be a JSON object.")

    if "quantity" not in payload:
        raise ValidationError("quantity is required.", code="MISSING_QUANTITY")

    # Disallow attempting to modify variant or other immutable fields
    forbidden_fields = {"id", "variant_id", "cart_id", "price", "subtotal", "created_at"}
    disallowed = [key for key in payload.keys() if key in forbidden_fields]
    if disallowed:
        raise ValidationError(
            f"Modifying field '{disallowed[0]}' is not permitted on cart item update.",
            code="FORBIDDEN_FIELD_UPDATE",
        )

    try:
        quantity = int(payload["quantity"])
        if quantity <= 0:
            raise ValueError()
    except (ValueError, TypeError):
        raise ValidationError("quantity must be a positive integer.", code="INVALID_QUANTITY")

    if quantity > MAX_ITEM_QUANTITY:
        raise ValidationError(
            f"Quantity cannot exceed the maximum limit of {MAX_ITEM_QUANTITY} per item.",
            code="MAX_QUANTITY_EXCEEDED",
        )

    return {
        "quantity": quantity,
    }
