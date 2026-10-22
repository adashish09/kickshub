from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db


def utc_now():
    return datetime.now(timezone.utc)


class User(db.Model):
    """User account entity for customers and administrators."""

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=True)
    role = db.Column(db.String(20), nullable=False, default="customer")
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    __table_args__ = (
        db.CheckConstraint("role IN ('customer', 'admin')", name="ck_users_role"),
    )

    # Relationships
    cart = db.relationship("Cart", back_populates="user", uselist=False, cascade="all, delete-orphan")
    addresses = db.relationship("Address", back_populates="user", cascade="all, delete-orphan")
    orders = db.relationship("Order", back_populates="user")
    refresh_tokens = db.relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def set_password(self, password):
        """Hash and securely store user password."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Verify candidate password against securely stored hash."""
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        """Serialize safe public user profile, never exposing password hashes."""
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<User id={self.id} email='{self.email}' role='{self.role}'>"
