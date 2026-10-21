from datetime import datetime, timezone
from app.extensions import db


def utc_now():
    return datetime.now(timezone.utc)


class RefreshToken(db.Model):
    """Database record for active and revoked JWT refresh tokens."""

    __tablename__ = "refresh_tokens"

    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(64), unique=True, nullable=False, index=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    expires_at = db.Column(db.DateTime, nullable=False)
    revoked_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)

    # Relationships
    user = db.relationship("User", back_populates="refresh_tokens")

    @property
    def is_revoked(self):
        return self.revoked_at is not None

    def __repr__(self):
        return f"<RefreshToken id={self.id} user_id={self.user_id} revoked={self.is_revoked}>"
