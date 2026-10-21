import re


class ValidationError(Exception):
    """Exception raised for client request validation errors."""

    def __init__(self, message, code="VALIDATION_ERROR", status_code=400):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


EMAIL_REGEX = re.compile(
    r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$"
)


def validate_password_strength(password):
    """Enforce password strength policy: min 8, max 128, at least 1 letter, at least 1 digit or symbol."""
    if not isinstance(password, str):
        raise ValidationError("Password must be a valid string.", code="INVALID_PASSWORD")
    if len(password) < 8:
        raise ValidationError("Password must be at least 8 characters long.", code="PASSWORD_TOO_SHORT")
    if len(password) > 128:
        raise ValidationError("Password must not exceed 128 characters.", code="PASSWORD_TOO_LONG")
    if not re.search(r"[a-zA-Z]", password):
        raise ValidationError("Password must contain at least one letter.", code="PASSWORD_WEAK")
    if not re.search(r"[\d\W_]", password):
        raise ValidationError("Password must contain at least one number or special character.", code="PASSWORD_WEAK")


def validate_register_payload(payload):
    """Validate and normalize user registration payload."""
    if not isinstance(payload, dict):
        raise ValidationError("Request body must be a JSON object.")

    name = payload.get("name")
    if not name or not isinstance(name, str) or not name.strip():
        raise ValidationError("Name is required.", code="MISSING_NAME")
    name = name.strip()
    if len(name) < 2 or len(name) > 150:
        raise ValidationError("Name must be between 2 and 150 characters.", code="INVALID_NAME")

    email = payload.get("email")
    if not email or not isinstance(email, str) or not email.strip():
        raise ValidationError("Email is required.", code="MISSING_EMAIL")
    email = email.strip().lower()
    if len(email) > 255 or not EMAIL_REGEX.match(email):
        raise ValidationError("A valid email address is required.", code="INVALID_EMAIL")

    password = payload.get("password")
    if not password:
        raise ValidationError("Password is required.", code="MISSING_PASSWORD")
    validate_password_strength(password)

    return {
        "name": name,
        "email": email,
        "password": password,
    }


def validate_login_payload(payload):
    """Validate user login payload."""
    if not isinstance(payload, dict):
        raise ValidationError("Request body must be a JSON object.")

    email = payload.get("email")
    if not email or not isinstance(email, str) or not email.strip():
        raise ValidationError("Email is required.", code="MISSING_EMAIL")
    email = email.strip().lower()

    password = payload.get("password")
    if not password or not isinstance(password, str):
        raise ValidationError("Password is required.", code="MISSING_PASSWORD")

    return {
        "email": email,
        "password": password,
    }


def validate_profile_update_payload(payload):
    """Validate profile update payload, restricting modifications to permitted fields."""
    if not isinstance(payload, dict):
        raise ValidationError("Request body must be a JSON object.")

    # Explicitly check for protected fields to protect integrity
    protected_fields = {"id", "email", "role", "is_active", "password", "password_hash", "created_at", "updated_at"}
    disallowed = [key for key in payload.keys() if key in protected_fields]
    if disallowed:
        raise ValidationError(
            f"Modifying protected fields ({', '.join(sorted(disallowed))}) is not permitted.",
            code="FORBIDDEN_FIELD_UPDATE",
            status_code=400,
        )

    allowed_fields = {"name"}
    unrecognized = [key for key in payload.keys() if key not in allowed_fields]
    if unrecognized:
        raise ValidationError(
            f"Unrecognized fields: {', '.join(sorted(unrecognized))}. Only 'name' can be updated.",
            code="INVALID_FIELD",
            status_code=400,
        )

    updates = {}
    if "name" in payload:
        name = payload["name"]
        if not name or not isinstance(name, str) or not name.strip():
            raise ValidationError("Name cannot be empty.", code="INVALID_NAME")
        name = name.strip()
        if len(name) < 2 or len(name) > 150:
            raise ValidationError("Name must be between 2 and 150 characters.", code="INVALID_NAME")
        updates["name"] = name

    if not updates:
        raise ValidationError("No valid fields provided to update.", code="NO_UPDATES")

    return updates


def validate_password_change_payload(payload):
    """Validate password change payload."""
    if not isinstance(payload, dict):
        raise ValidationError("Request body must be a JSON object.")

    current_password = payload.get("current_password")
    if not current_password or not isinstance(current_password, str):
        raise ValidationError("Current password is required.", code="MISSING_CURRENT_PASSWORD")

    new_password = payload.get("new_password")
    if not new_password or not isinstance(new_password, str):
        raise ValidationError("New password is required.", code="MISSING_NEW_PASSWORD")

    if current_password == new_password:
        raise ValidationError("New password cannot be the same as your current password.", code="PASSWORD_UNCHANGED")

    validate_password_strength(new_password)

    return {
        "current_password": current_password,
        "new_password": new_password,
    }
