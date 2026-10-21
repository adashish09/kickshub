from datetime import datetime, timezone
from app.extensions import db


def utc_now():
    return datetime.now(timezone.utc)


class Order(db.Model):
    """Customer order record retaining snapshots of address and pricing."""

    __tablename__ = "orders"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    status = db.Column(db.String(20), default="pending", nullable=False)
    subtotal = db.Column(db.Numeric(10, 2), nullable=False)
    shipping_fee = db.Column(db.Numeric(10, 2), default=0.00, nullable=False)
    total = db.Column(db.Numeric(10, 2), nullable=False)
    address_snapshot = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    __table_args__ = (
        db.CheckConstraint(
            "status IN ('pending', 'confirmed', 'cancelled', 'completed')",
            name="ck_orders_status",
        ),
        db.CheckConstraint("subtotal >= 0", name="ck_orders_subtotal_non_negative"),
        db.CheckConstraint("shipping_fee >= 0", name="ck_orders_shipping_fee_non_negative"),
        db.CheckConstraint("total >= 0", name="ck_orders_total_non_negative"),
    )

    # Relationships
    user = db.relationship("User", back_populates="orders")
    items = db.relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payment = db.relationship("Payment", back_populates="order", uselist=False)

    def __repr__(self):
        return f"<Order id={self.id} status='{self.status}' total={self.total}>"


class OrderItem(db.Model):
    """Historical line item capturing purchase snapshots independent of catalog edits."""

    __tablename__ = "order_items"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(
        db.Integer,
        db.ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    variant_id = db.Column(
        db.Integer,
        db.ForeignKey("product_variants.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    product_name = db.Column(db.String(200), nullable=False)
    sku = db.Column(db.String(64), nullable=False)
    size = db.Column(db.String(32), nullable=False)
    color = db.Column(db.String(50), nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    line_total = db.Column(db.Numeric(10, 2), nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)

    __table_args__ = (
        db.CheckConstraint("quantity > 0", name="ck_order_item_quantity_positive"),
        db.CheckConstraint("unit_price >= 0", name="ck_order_item_unit_price_non_negative"),
        db.CheckConstraint("line_total >= 0", name="ck_order_item_line_total_non_negative"),
    )

    # Relationships
    order = db.relationship("Order", back_populates="items")
    variant = db.relationship("ProductVariant", back_populates="order_items")

    def __repr__(self):
        return f"<OrderItem id={self.id} order_id={self.order_id} sku='{self.sku}' qty={self.quantity}>"
