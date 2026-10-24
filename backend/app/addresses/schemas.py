import re


class AddressValidationError(Exception):
    def __init__(self, code, message, status_code=400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


def validate_recipient_name(name):
    """Validate that recipient name is between 2 and 100 characters and contains letters."""
    if not name or not isinstance(name, str) or not name.strip():
        raise AddressValidationError("INVALID_RECIPIENT_NAME", "Recipient name is required.")
    name = name.strip()
    if len(name) < 2:
        raise AddressValidationError("INVALID_RECIPIENT_NAME", "Recipient name must be at least 2 characters.")
    if len(name) > 100:
        raise AddressValidationError("INVALID_RECIPIENT_NAME", "Recipient name cannot exceed 100 characters.")
    if not re.search(r"[a-zA-Z]", name):
        raise AddressValidationError("INVALID_RECIPIENT_NAME", "Recipient name must contain letters.")
    if not re.match(r"^[a-zA-Z\s\.\-']+$", name):
        raise AddressValidationError("INVALID_RECIPIENT_NAME", "Recipient name contains invalid characters.")
    return name


def validate_phone_number(phone, country="India"):
    """
    Validate contact phone number:
    - Required
    - Numbers only
    - Max length 10 digits
    - Indian mobile validation: exactly 10 digits starting with 6, 7, 8, or 9
    """
    if not phone or not isinstance(phone, str) or not phone.strip():
        raise AddressValidationError("INVALID_PHONE", "Contact phone number is required.")
    phone_str = phone.strip()

    # Reject if contains letters
    if re.search(r"[a-zA-Z]", phone_str):
        raise AddressValidationError(
            "INVALID_PHONE",
            "Phone number must contain numbers only."
        )

    # Extract digits, allowing optional +91 or 0 prefix from legacy/external callers
    digits = re.sub(r"\D", "", phone_str)
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]

    # Enforce strictly 10 digits
    if len(digits) != 10:
        raise AddressValidationError(
            "INVALID_PHONE",
            f"Phone number must be exactly 10 digits (received {len(digits)} digits)."
        )

    # Enforce Indian mobile starting digit 6, 7, 8, or 9
    if digits[0] not in "6789":
        raise AddressValidationError(
            "INVALID_PHONE",
            "Indian mobile number must be 10 digits starting with 6, 7, 8, or 9."
        )

    return digits


def validate_line1(line1):
    """Validate street address line 1."""
    if not line1 or not isinstance(line1, str) or not line1.strip():
        raise AddressValidationError("INVALID_LINE1", "Street address line 1 is required.")
    line1 = line1.strip()
    if len(line1) < 5:
        raise AddressValidationError("INVALID_LINE1", "Street address must be at least 5 characters.")
    if len(line1) > 255:
        raise AddressValidationError("INVALID_LINE1", "Street address line 1 cannot exceed 255 characters.")
    return line1


def validate_line2(line2):
    """Validate optional street address line 2."""
    if line2 is None:
        return ""
    if not isinstance(line2, str):
        raise AddressValidationError("INVALID_LINE2", "Address line 2 must be a string.")
    line2 = line2.strip()
    if len(line2) > 255:
        raise AddressValidationError("INVALID_LINE2", "Address line 2 cannot exceed 255 characters.")
    return line2


def validate_city(city):
    """Validate city name."""
    if not city or not isinstance(city, str) or not city.strip():
        raise AddressValidationError("INVALID_CITY", "City is required.")
    city = city.strip()
    if len(city) < 2:
        raise AddressValidationError("INVALID_CITY", "City name must be at least 2 characters.")
    if len(city) > 100:
        raise AddressValidationError("INVALID_CITY", "City name cannot exceed 100 characters.")
    if not re.match(r"^[a-zA-Z\s\.\-']+$", city):
        raise AddressValidationError("INVALID_CITY", "City name contains invalid characters.")
    return city


def validate_state(state):
    """Validate state name."""
    if not state or not isinstance(state, str) or not state.strip():
        raise AddressValidationError("INVALID_STATE", "State is required.")
    state = state.strip()
    if len(state) < 2:
        raise AddressValidationError("INVALID_STATE", "State name must be at least 2 characters.")
    if len(state) > 100:
        raise AddressValidationError("INVALID_STATE", "State name cannot exceed 100 characters.")
    if not re.match(r"^[a-zA-Z\s\.\-']+$", state):
        raise AddressValidationError("INVALID_STATE", "State name contains invalid characters.")
    return state


def validate_postal_code(postal_code, country="India"):
    """
    Validate postal code / PIN code:
    - Required
    - Numbers only
    - Min and Max length is exactly 6 digits
    - Valid Indian PIN code (cannot start with 0)
    """
    if not postal_code or not isinstance(postal_code, str) or not postal_code.strip():
        raise AddressValidationError("INVALID_POSTAL_CODE", "PIN code is required.")
    pin_str = postal_code.strip()

    if not re.match(r"^\d{6}$", pin_str):
        raise AddressValidationError(
            "INVALID_POSTAL_CODE",
            "PIN code must be exactly 6 digits and contain numbers only."
        )

    if pin_str.startswith("0"):
        raise AddressValidationError(
            "INVALID_POSTAL_CODE",
            "Indian PIN code cannot start with 0."
        )

    return pin_str


def validate_create_address_payload(data):
    """Validate payload for creating or updating a user address."""
    if not isinstance(data, dict):
        raise AddressValidationError("INVALID_JSON", "Request body must be a JSON object.")

    country = data.get("country", "India")
    if not isinstance(country, str) or not country.strip():
        country = "India"
    country = country.strip()

    recipient_name = validate_recipient_name(data.get("recipient_name"))
    phone = validate_phone_number(data.get("phone"), country=country)
    line1 = validate_line1(data.get("line1"))
    line2 = validate_line2(data.get("line2"))
    city = validate_city(data.get("city"))
    state = validate_state(data.get("state"))
    postal_code = validate_postal_code(data.get("postal_code"), country=country)

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
