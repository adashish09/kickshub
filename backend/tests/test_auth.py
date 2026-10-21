from datetime import datetime, timedelta, timezone
from flask_jwt_extended import create_access_token, create_refresh_token, decode_token
from app.extensions import db
from app.models.user import User
from app.models.refresh_token import RefreshToken


def test_successful_registration(client, app):
    """Verify customer registration with valid payload returns 201 and safe profile without password hash."""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Jordan Fan",
            "email": "jordan@example.com",
            "password": "StrongPassword123!",
        },
    )
    assert response.status_code == 201
    data = response.get_json()
    assert "user" in data
    user_info = data["user"]
    assert user_info["name"] == "Jordan Fan"
    assert user_info["email"] == "jordan@example.com"
    assert user_info["role"] == "customer"
    assert "password" not in user_info
    assert "password_hash" not in user_info
    assert "created_at" in user_info

    # Verify user exists in database and password is hashed
    with app.app_context():
        user = User.query.filter_by(email="jordan@example.com").first()
        assert user is not None
        assert user.password_hash is not None
        assert user.password_hash != "StrongPassword123!"
        assert user.check_password("StrongPassword123!") is True


def test_registration_missing_or_invalid_fields(client):
    """Verify validation errors for missing or invalid registration inputs."""
    # Missing name
    res = client.post("/api/v1/auth/register", json={"email": "a@b.com", "password": "Password123!"})
    assert res.status_code == 400
    assert "name" in res.get_json()["error"]["message"].lower()

    # Invalid email format
    res = client.post("/api/v1/auth/register", json={"name": "A", "email": "invalid-email", "password": "Password123!"})
    assert res.status_code == 400

    # Short password (<8 chars)
    res = client.post("/api/v1/auth/register", json={"name": "Test User", "email": "valid@email.com", "password": "short"})
    assert res.status_code == 400
    assert "8 characters" in res.get_json()["error"]["message"].lower()

    # Password without numbers or symbols
    res = client.post("/api/v1/auth/register", json={"name": "Test User", "email": "valid@email.com", "password": "OnlyLettersHere"})
    assert res.status_code == 400


def test_duplicate_email_registration(client):
    """Verify duplicate email registration yields HTTP 409 Conflict with DUPLICATE_EMAIL error code."""
    payload = {
        "name": "Sneaker Head",
        "email": "sneakerhead@example.com",
        "password": "Password123!",
    }
    first_res = client.post("/api/v1/auth/register", json=payload)
    assert first_res.status_code == 201

    # Second registration with same email (case-insensitive)
    payload_dup = {
        "name": "Another Name",
        "email": "SNEAKERHEAD@EXAMPLE.COM",
        "password": "AnotherPassword123!",
    }
    dup_res = client.post("/api/v1/auth/register", json=payload_dup)
    assert dup_res.status_code == 409
    assert dup_res.get_json()["error"]["code"] == "DUPLICATE_EMAIL"


def test_password_hashing_and_verification(app):
    """Verify Werkzeug secure password hashing logic on User model."""
    with app.app_context():
        user = User(name="Hash Test", email="hash@example.com", role="customer")
        user.set_password("Secret123!")
        assert user.password_hash is not None
        assert user.password_hash != "Secret123!"
        assert user.check_password("Secret123!") is True
        assert user.check_password("WrongSecret123!") is False
        assert user.check_password("") is False


def test_successful_login(client):
    """Verify login sets HttpOnly refresh cookie and returns access token and safe profile."""
    client.post(
        "/api/v1/auth/register",
        json={"name": "Login User", "email": "login@example.com", "password": "SecurePassword123!"},
    )

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "login@example.com", "password": "SecurePassword123!"},
    )
    assert response.status_code == 200
    data = response.get_json()
    assert "access_token" in data
    assert data["user"]["email"] == "login@example.com"
    assert "password_hash" not in data
    assert "password_hash" not in data["user"]

    # Verify refresh token cookie is set and is HttpOnly
    cookie_header = response.headers.get("Set-Cookie", "")
    assert "kickshub_refresh_token=" in cookie_header
    assert "HttpOnly" in cookie_header


def test_invalid_login_credentials(client):
    """Verify invalid credentials return 401 without disclosing whether email exists."""
    client.post(
        "/api/v1/auth/register",
        json={"name": "Existing User", "email": "exist@example.com", "password": "SecurePassword123!"},
    )

    # Wrong password for existing user
    res1 = client.post("/api/v1/auth/login", json={"email": "exist@example.com", "password": "WrongPassword!"})
    assert res1.status_code == 401
    assert res1.get_json()["error"]["message"] == "Invalid email or password."

    # Non-existent email
    res2 = client.post("/api/v1/auth/login", json={"email": "nonexistent@example.com", "password": "SecurePassword123!"})
    assert res2.status_code == 401
    assert res2.get_json()["error"]["message"] == "Invalid email or password."


def test_login_with_inactive_account(client, app):
    """Verify disabled or inactive accounts cannot log in."""
    client.post(
        "/api/v1/auth/register",
        json={"name": "Banned User", "email": "banned@example.com", "password": "SecurePassword123!"},
    )

    with app.app_context():
        user = User.query.filter_by(email="banned@example.com").first()
        user.is_active = False
        db.session.commit()

    res = client.post("/api/v1/auth/login", json={"email": "banned@example.com", "password": "SecurePassword123!"})
    assert res.status_code == 401
    assert res.get_json()["error"]["code"] == "ACCOUNT_INACTIVE"


def test_access_auth_me_without_token(client):
    """Verify accessing /api/v1/auth/me without an access token returns 401."""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert response.get_json()["error"]["code"] == "UNAUTHORIZED"


def test_access_auth_me_with_valid_token(client):
    """Verify accessing /api/v1/auth/me with a valid Bearer token returns current user profile."""
    client.post(
        "/api/v1/auth/register",
        json={"name": "Me User", "email": "me@example.com", "password": "SecurePassword123!"},
    )
    login_res = client.post("/api/v1/auth/login", json={"email": "me@example.com", "password": "SecurePassword123!"})
    token = login_res.get_json()["access_token"]

    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.get_json()
    assert data["user"]["email"] == "me@example.com"
    assert data["user"]["name"] == "Me User"


def test_access_auth_me_with_expired_or_invalid_token(client, app):
    """Verify invalid and expired Bearer tokens are rejected with 401."""
    # Malformed token
    res1 = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not-a-valid-jwt"})
    assert res1.status_code == 401
    assert res1.get_json()["error"]["code"] == "INVALID_TOKEN"

    # Expired token
    with app.app_context():
        expired_token = create_access_token(
            identity="999",
            expires_delta=timedelta(seconds=-10),
        )
    res2 = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert res2.status_code == 401
    assert res2.get_json()["error"]["code"] == "TOKEN_EXPIRED"


def test_successful_access_token_refresh(client):
    """Verify refresh endpoint validates the cookie and issues a new valid access token."""
    client.post(
        "/api/v1/auth/register",
        json={"name": "Refresh User", "email": "refresh@example.com", "password": "SecurePassword123!"},
    )
    login_res = client.post("/api/v1/auth/login", json={"email": "refresh@example.com", "password": "SecurePassword123!"})
    original_token = login_res.get_json()["access_token"]

    # Call /api/v1/auth/refresh with the cookie saved in client test session
    refresh_res = client.post("/api/v1/auth/refresh")
    assert refresh_res.status_code == 200
    new_token = refresh_res.get_json()["access_token"]
    assert new_token is not None
    assert new_token != original_token

    # Verify new token works on protected endpoints
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {new_token}"})
    assert me_res.status_code == 200
    assert me_res.get_json()["user"]["email"] == "refresh@example.com"


def test_rejection_of_revoked_or_expired_refresh_token(client, app):
    """Verify revoked or expired refresh tokens are rejected upon refresh attempt."""
    client.post(
        "/api/v1/auth/register",
        json={"name": "Revoke User", "email": "revoke@example.com", "password": "SecurePassword123!"},
    )
    client.post("/api/v1/auth/login", json={"email": "revoke@example.com", "password": "SecurePassword123!"})

    # Revoke all tokens directly in database
    with app.app_context():
        RefreshToken.query.update({"revoked_at": datetime.now(timezone.utc)})
        db.session.commit()

    res = client.post("/api/v1/auth/refresh")
    assert res.status_code == 401
    assert res.get_json()["error"]["code"] in ("TOKEN_REVOKED", "UNAUTHORIZED")


def test_logout_and_subsequent_refresh_rejection(client):
    """Verify logout revokes the server session, unsets cookies, and blocks subsequent refresh."""
    client.post(
        "/api/v1/auth/register",
        json={"name": "Logout User", "email": "logout@example.com", "password": "SecurePassword123!"},
    )
    client.post("/api/v1/auth/login", json={"email": "logout@example.com", "password": "SecurePassword123!"})

    # Perform logout
    logout_res = client.post("/api/v1/auth/logout")
    assert logout_res.status_code == 200

    # Ensure refresh cookie is cleared
    cookie_headers = " ".join(logout_res.headers.getlist("Set-Cookie"))
    assert (
        "kickshub_refresh_token=;" in cookie_headers
        or 'kickshub_refresh_token=""' in cookie_headers
        or "Expires=" in cookie_headers
    )

    # Subsequent refresh attempt must fail
    refresh_res = client.post("/api/v1/auth/refresh")
    assert refresh_res.status_code == 401


def test_profile_retrieval_and_update(client):
    """Verify GET and PATCH /api/v1/users/me retrieve and update permitted user fields."""
    client.post(
        "/api/v1/auth/register",
        json={"name": "Profile User", "email": "profile@example.com", "password": "SecurePassword123!"},
    )
    login_res = client.post("/api/v1/auth/login", json={"email": "profile@example.com", "password": "SecurePassword123!"})
    token = login_res.get_json()["access_token"]

    # Get profile
    get_res = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert get_res.status_code == 200
    assert get_res.get_json()["user"]["name"] == "Profile User"

    # Update name
    patch_res = client.patch(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Updated Profile Name"},
    )
    assert patch_res.status_code == 200
    assert patch_res.get_json()["user"]["name"] == "Updated Profile Name"

    # Confirm updated value persists
    get_res2 = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert get_res2.get_json()["user"]["name"] == "Updated Profile Name"


def test_rejection_of_attempts_to_change_protected_fields(client, app):
    """Verify attempts to modify protected fields like role, email, or id via profile update are rejected."""
    client.post(
        "/api/v1/auth/register",
        json={"name": "Customer User", "email": "customer1@example.com", "password": "SecurePassword123!"},
    )
    login_res = client.post("/api/v1/auth/login", json={"email": "customer1@example.com", "password": "SecurePassword123!"})
    token = login_res.get_json()["access_token"]

    # Attempt to escalate privilege to admin
    res1 = client.patch(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
        json={"role": "admin"},
    )
    assert res1.status_code == 400
    assert "protected fields" in res1.get_json()["error"]["message"].lower()

    # Attempt to change email via profile endpoint
    res2 = client.patch(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
        json={"email": "newemail@example.com"},
    )
    assert res2.status_code == 400

    # Ensure role in database was not escalated
    with app.app_context():
        user = User.query.filter_by(email="customer1@example.com").first()
        assert user.role == "customer"


def test_successful_password_change(client):
    """Verify changing password updates hash and requires new password for subsequent logins."""
    client.post(
        "/api/v1/auth/register",
        json={"name": "Password User", "email": "pwd@example.com", "password": "OldPassword123!"},
    )
    login_res = client.post("/api/v1/auth/login", json={"email": "pwd@example.com", "password": "OldPassword123!"})
    token = login_res.get_json()["access_token"]

    # Change password
    change_res = client.post(
        "/api/v1/users/me/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"current_password": "OldPassword123!", "new_password": "BrandNewPassword456!"},
    )
    assert change_res.status_code == 200

    # Old password must now fail
    old_login = client.post("/api/v1/auth/login", json={"email": "pwd@example.com", "password": "OldPassword123!"})
    assert old_login.status_code == 401

    # New password must succeed
    new_login = client.post("/api/v1/auth/login", json={"email": "pwd@example.com", "password": "BrandNewPassword456!"})
    assert new_login.status_code == 200


def test_rejection_of_incorrect_current_password(client):
    """Verify password change fails when the current password does not match."""
    client.post(
        "/api/v1/auth/register",
        json={"name": "Pwd User 2", "email": "pwd2@example.com", "password": "CorrectPassword123!"},
    )
    login_res = client.post("/api/v1/auth/login", json={"email": "pwd2@example.com", "password": "CorrectPassword123!"})
    token = login_res.get_json()["access_token"]

    res = client.post(
        "/api/v1/users/me/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"current_password": "WrongPassword999!", "new_password": "BrandNewPassword456!"},
    )
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "INVALID_CURRENT_PASSWORD"


def test_revocation_of_refresh_sessions_after_password_change(client, app):
    """Verify all refresh sessions for the user are revoked when password is changed."""
    client.post(
        "/api/v1/auth/register",
        json={"name": "Session User", "email": "session@example.com", "password": "Password123!"},
    )
    login_res = client.post("/api/v1/auth/login", json={"email": "session@example.com", "password": "Password123!"})
    token = login_res.get_json()["access_token"]

    with app.app_context():
        user = User.query.filter_by(email="session@example.com").first()
        active_tokens = RefreshToken.query.filter_by(user_id=user.id, revoked_at=None).count()
        assert active_tokens >= 1

    # Change password
    client.post(
        "/api/v1/users/me/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"current_password": "Password123!", "new_password": "NewPassword456!"},
    )

    # Verify previous refresh token is now revoked
    with app.app_context():
        active_tokens_after = RefreshToken.query.filter_by(user_id=user.id, revoked_at=None).count()
        assert active_tokens_after == 0

    # Refresh attempt with previous cookie must now be rejected
    refresh_res = client.post("/api/v1/auth/refresh")
    assert refresh_res.status_code == 401


def test_prevention_of_cross_user_profile_access(client):
    """Verify one user cannot read or update another user's profile."""
    # User 1
    client.post("/api/v1/auth/register", json={"name": "User One", "email": "one@example.com", "password": "Password123!"})
    login1 = client.post("/api/v1/auth/login", json={"email": "one@example.com", "password": "Password123!"})
    token1 = login1.get_json()["access_token"]

    # User 2
    client.post("/api/v1/auth/register", json={"name": "User Two", "email": "two@example.com", "password": "Password123!"})
    login2 = client.post("/api/v1/auth/login", json={"email": "two@example.com", "password": "Password123!"})
    token2 = login2.get_json()["access_token"]

    # User 1 requests /users/me
    res1 = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token1}"})
    assert res1.get_json()["user"]["email"] == "one@example.com"

    # User 2 requests /users/me
    res2 = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token2}"})
    assert res2.get_json()["user"]["email"] == "two@example.com"

    # User 1 updates their name
    client.patch("/api/v1/users/me", headers={"Authorization": f"Bearer {token1}"}, json={"name": "User One Updated"})

    # User 2's profile remains completely untouched
    res2_check = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token2}"})
    assert res2_check.get_json()["user"]["name"] == "User Two"


def test_csrf_protection_on_cookie_refresh(app, client):
    """Verify CSRF token enforcement when JWT_COOKIE_CSRF_PROTECT is active."""
    from flask_jwt_extended import get_csrf_token

    # Temporarily enable CSRF protection
    app.config["JWT_COOKIE_CSRF_PROTECT"] = True
    try:
        client.post(
            "/api/v1/auth/register",
            json={"name": "CSRF User", "email": "csrf@example.com", "password": "Password123!"},
        )
        login_res = client.post("/api/v1/auth/login", json={"email": "csrf@example.com", "password": "Password123!"})
        csrf_token = login_res.get_json()["csrf_token"]
        assert csrf_token is not None

        # Attempt refresh WITHOUT X-CSRF-TOKEN header should fail with 401
        res_fail = client.post("/api/v1/auth/refresh")
        assert res_fail.status_code == 401

        # Attempt refresh WITH X-CSRF-TOKEN header should succeed with 200
        res_success = client.post("/api/v1/auth/refresh", headers={"X-CSRF-TOKEN": csrf_token})
        assert res_success.status_code == 200
        assert "access_token" in res_success.get_json()
    finally:
        app.config["JWT_COOKIE_CSRF_PROTECT"] = False

