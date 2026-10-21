from datetime import datetime, timezone
from app.extensions import db


def utc_now():
    return datetime.now(timezone.utc)


class Payment(db.Model):
    """Payment transaction record associated with an order."""

    __tablename__ = "payments"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(
        db.Integer,
        db.ForeignKey("orders.id", ondelete="RESTRICT"),
        unique=True,
        nullable=False,
        index=True,
    )
    provider = db.Column(db.String(50), default="simulated", nullable=False)
    status = db.Column(db.String(20), default="pending", nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    transaction_ref = db.Column(db.String(100), unique=True, nullable=True, index=True)
    idempotency_key = db.Column(db.String(100), unique=True, nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    __table_args__ = (
        db.CheckConstraint(
            "status IN ('pending', 'succeeded', 'failed')",
            name="ck_payments_status",
        ),
        db.CheckConstraint("amount >= 0", name="ck_payments_amount_non_negative"),
    )

    # Relationships
    order = db.relationship("Order", back_populates="payment")

    def __repr__(self):
        return f"<Payment id={self.id} order_id={self.order_id} provider='{self.provider}' status='{self.status}'>"
