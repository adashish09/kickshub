class AddressValidationError(Exception):
    def __init__(self, code, message, status_code=400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


def validate_create_address_payload(data):
    """Validate payload for creating a user address."""
    if not isinstance(data, dict):
        raise AddressValidationError("INVALID_JSON", "Request body must be a JSON object.")

    recipient_name = data.get("recipient_name")
    if not recipient_name or not isinstance(recipient_name, str) or not recipient_name.strip():
        raise AddressValidationError("INVALID_RECIPIENT_NAME", "Recipient name is required.")
    recipient_name = recipient_name.strip()
    if len(recipient_name) > 150:
        raise AddressValidationError("INVALID_RECIPIENT_NAME", "Recipient name cannot exceed 150 characters.")

    phone = data.get("phone")
    if phone is not None:
        if not isinstance(phone, str):
            raise AddressValidationError("INVALID_PHONE", "Phone number must be a string.")
        phone = phone.strip()
        if len(phone) > 30:
            raise AddressValidationError("INVALID_PHONE", "Phone number cannot exceed 30 characters.")
    else:
        phone = ""

    line1 = data.get("line1")
    if not line1 or not isinstance(line1, str) or not line1.strip():
        raise AddressValidationError("INVALID_LINE1", "Address line 1 is required.")
    line1 = line1.strip()
    if len(line1) > 255:
        raise AddressValidationError("INVALID_LINE1", "Address line 1 cannot exceed 255 characters.")

    line2 = data.get("line2")
    if line2 is not None:
        if not isinstance(line2, str):
            raise AddressValidationError("INVALID_LINE2", "Address line 2 must be a string.")
        line2 = line2.strip()
        if len(line2) > 255:
            raise AddressValidationError("INVALID_LINE2", "Address line 2 cannot exceed 255 characters.")
    else:
        line2 = ""

    city = data.get("city")
    if not city or not isinstance(city, str) or not city.strip():
        raise AddressValidationError("INVALID_CITY", "City is required.")
    city = city.strip()
    if len(city) > 100:
        raise AddressValidationError("INVALID_CITY", "City cannot exceed 100 characters.")

    state = data.get("state")
    if not state or not isinstance(state, str) or not state.strip():
        raise AddressValidationError("INVALID_STATE", "State is required.")
    state = state.strip()
    if len(state) > 100:
        raise AddressValidationError("INVALID_STATE", "State cannot exceed 100 characters.")

    postal_code = data.get("postal_code")
    if not postal_code or not isinstance(postal_code, str) or not postal_code.strip():
        raise AddressValidationError("INVALID_POSTAL_CODE", "Postal code is required.")
    postal_code = postal_code.strip()
    if len(postal_code) > 20:
        raise AddressValidationError("INVALID_POSTAL_CODE", "Postal code cannot exceed 20 characters.")

    country = data.get("country", "India")
    if not isinstance(country, str) or not country.strip():
        country = "India"
    country = country.strip()

    return {
        "recipient_name": recipient_name,
        "phone": phone,
        "line1": line1,
        "line2": line2,
        "city": city,
        "state": state,
        "postal_code": postal_code,
        "country": country,
    }
