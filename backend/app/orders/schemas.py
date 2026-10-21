class OrderValidationError(Exception):
    def __init__(self, code, message, status_code=400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


def validate_checkout_payload(data):
    """Validate payload for placing an order from cart."""
    if not isinstance(data, dict):
        raise OrderValidationError("INVALID_JSON", "Request body must be a JSON object.")

    address_id = data.get("address_id")
    if address_id is None:
        raise OrderValidationError("MISSING_ADDRESS_ID", "Delivery address ID is required.")

    if not isinstance(address_id, int) or address_id <= 0:
        raise OrderValidationError("INVALID_ADDRESS_ID", "Address ID must be a positive integer.")

    idempotency_key = data.get("idempotency_key")
    if idempotency_key is not None:
        if not isinstance(idempotency_key, str):
            raise OrderValidationError("INVALID_IDEMPOTENCY_KEY", "Idempotency key must be a string.")
        idempotency_key = idempotency_key.strip()
        if len(idempotency_key) > 100:
            raise OrderValidationError("INVALID_IDEMPOTENCY_KEY", "Idempotency key cannot exceed 100 characters.")
        if not idempotency_key:
            idempotency_key = None

    return {
        "address_id": address_id,
        "idempotency_key": idempotency_key,
    }
