from datetime import datetime, timezone
from app.extensions import db


def utc_now():
    return datetime.now(timezone.utc)


class ProductVariant(db.Model):
    """Specific SKU for a sneaker with size, color, stock, and pricing."""

    __tablename__ = "product_variants"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sku = db.Column(db.String(64), unique=True, nullable=False, index=True)
    size = db.Column(db.String(32), nullable=False)
    color = db.Column(db.String(50), nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    stock_quantity = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    __table_args__ = (
        db.UniqueConstraint("product_id", "size", "color", name="uq_variant_product_size_color"),
        db.CheckConstraint("price >= 0", name="ck_variant_price_non_negative"),
        db.CheckConstraint("stock_quantity >= 0", name="ck_variant_stock_non_negative"),
    )

    # Relationships
    product = db.relationship("Product", back_populates="variants")
    cart_items = db.relationship("CartItem", back_populates="variant")
    order_items = db.relationship("OrderItem", back_populates="variant")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def __repr__(self):
        return f"<ProductVariant id={self.id} sku='{self.sku}' size='{self.size}' stock={self.stock_quantity}>"
