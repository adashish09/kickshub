import logging
from datetime import datetime, timezone
from flask_jwt_extended import create_access_token, create_refresh_token, decode_token
from sqlalchemy.exc import IntegrityError
from app.extensions import db
from app.models.user import User
from app.models.refresh_token import RefreshToken

logger = logging.getLogger(__name__)


def current_utc_time():
    """Return current timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


class AuthError(Exception):
    """Base exception for authentication and authorization errors."""

    def __init__(self, message, code="AUTH_ERROR", status_code=401):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


class DuplicateEmailError(AuthError):
    """Raised when registering an email address that already exists."""

    def __init__(self, message="An account with this email address already exists."):
        super().__init__(message, code="DUPLICATE_EMAIL", status_code=409)


class InvalidCredentialsError(AuthError):
    """Raised when email or password verification fails."""

    def __init__(self, message="Invalid email or password."):
        super().__init__(message, code="INVALID_CREDENTIALS", status_code=401)


class AccountInactiveError(AuthError):
    """Raised when an inactive or disabled user attempts to authenticate."""

    def __init__(self, message="Account is inactive or disabled."):
        super().__init__(message, code="ACCOUNT_INACTIVE", status_code=401)


class TokenRevokedError(AuthError):
    """Raised when a refresh token has been revoked or is no longer valid."""

    def __init__(self, message="Token has been revoked or is invalid."):
        super().__init__(message, code="TOKEN_REVOKED", status_code=401)


class InvalidPasswordError(AuthError):
    """Raised when the current password does not match on password change."""

    def __init__(self, message="Current password is incorrect."):
        super().__init__(message, code="INVALID_CURRENT_PASSWORD", status_code=400)


def register_user(name, email, password):
    """Register a new customer account, ensuring uniqueness and secure password hashing."""
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        raise DuplicateEmailError()

    user = User(
        name=name,
        email=email,
        role="customer",  # Explicitly force customer role on public registration
        is_active=True,
    )
    user.set_password(password)

    try:
        db.session.add(user)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise DuplicateEmailError()
    except Exception as exc:
        db.session.rollback()
        logger.error("Failed to register user '%s': %s", email, exc)
        raise

    return user


def authenticate_user(email, password):
    """Authenticate credentials against user records, rejecting inactive accounts."""
    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        # Generic error message prevents disclosing whether email is registered
        raise InvalidCredentialsError()

    if not user.is_active:
        raise AccountInactiveError()

    return user


def create_user_tokens(user):
    """Issue short-lived access token and persistent refresh token record."""
    identity = str(user.id)
    additional_claims = {
        "role": user.role,
        "email": user.email,
    }

    access_token = create_access_token(
        identity=identity,
        additional_claims=additional_claims,
    )
    refresh_token = create_refresh_token(
        identity=identity,
        additional_claims={"email": user.email},
    )

    decoded_refresh = decode_token(refresh_token)
    jti = decoded_refresh["jti"]
    exp_timestamp = decoded_refresh["exp"]
    expires_at = datetime.fromtimestamp(exp_timestamp, tz=timezone.utc)

    # Persist refresh token session in database
    token_record = RefreshToken(
        jti=jti,
        user_id=user.id,
        expires_at=expires_at,
        created_at=current_utc_time(),
    )
    db.session.add(token_record)
    db.session.commit()

    return access_token, refresh_token


def refresh_access_token(jti, user_id):
    """Validate refresh token record from database and issue a new access token."""
    token_record = RefreshToken.query.filter_by(jti=jti).first()
    if not token_record or token_record.is_revoked:
        raise TokenRevokedError()

    now_utc = current_utc_time()
    token_exp = token_record.expires_at
    if token_exp.tzinfo is None:
        token_exp = token_exp.replace(tzinfo=timezone.utc)

    if token_exp < now_utc:
        raise TokenRevokedError("Refresh token has expired.")

    user = db.session.get(User, user_id)
    if not user or not user.is_active:
        raise AccountInactiveError()

    new_access_token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role, "email": user.email},
    )
    return new_access_token


def revoke_refresh_token(jti):
    """Mark a refresh token as revoked in the database."""
    token_record = RefreshToken.query.filter_by(jti=jti).first()
    if token_record and token_record.revoked_at is None:
        token_record.revoked_at = current_utc_time()
        db.session.commit()
        return True
    return False


def change_user_password(user, current_password, new_password):
    """Verify current password, update to hashed new password, and revoke all active refresh tokens."""
    if not user.check_password(current_password):
        raise InvalidPasswordError()

    user.set_password(new_password)

    # Invalidate all active refresh sessions for this user
    RefreshToken.query.filter(
        RefreshToken.user_id == user.id,
        RefreshToken.revoked_at.is_(None),
    ).update({"revoked_at": current_utc_time()}, synchronize_session=False)

    db.session.commit()
    return True


def update_user_profile(user, updates):
    """Apply permitted profile updates (e.g. name)."""
    if "name" in updates:
        user.name = updates["name"]

    db.session.commit()
    return user
