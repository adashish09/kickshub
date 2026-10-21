from decimal import Decimal
from app.extensions import db
from app.models import Category, Product, ProductVariant, User, Address


def seed_database():
    """Populate the database with deterministic sample data.

    This function is idempotent: re-running it updates existing entries
    without creating duplicate records.
    """
    stats = {"categories": 0, "products": 0, "variants": 0, "users": 0, "addresses": 0}

    # 1. Seed Categories
    category_data = [
        {
            "name": "Running",
            "slug": "running",
            "description": "High-performance running shoes built for endurance, speed, and daily road miles.",
        },
        {
            "name": "Lifestyle",
            "slug": "lifestyle",
            "description": "Casual, heritage, and streetwear sneakers engineered for everyday style and comfort.",
        },
        {
            "name": "Basketball",
            "slug": "basketball",
            "description": "Court-ready kicks offering explosive traction, lockdown stability, and impact cushioning.",
        },
    ]

    cat_map = {}
    for cat in category_data:
        existing = Category.query.filter_by(slug=cat["slug"]).first()
        if not existing:
            existing = Category(
                name=cat["name"],
                slug=cat["slug"],
                description=cat["description"],
            )
            db.session.add(existing)
            db.session.flush()
        else:
            existing.name = cat["name"]
            existing.description = cat["description"]
        cat_map[cat["slug"]] = existing
        stats["categories"] += 1

    # 2. Seed Products
    product_data = [
        {
            "category_slug": "running",
            "name": "Air Velocity Pro",
            "slug": "air-velocity-pro",
            "brand": "Nike",
            "description": "Engineered for maximum responsiveness, featuring lightweight breathable mesh and dual-density foam.",
            "image_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
            "is_active": True,
            "variants": [
                {"sku": "AVP-RED-UK7", "size": "UK 7", "color": "University Red", "price": Decimal("129.99"), "stock_quantity": 15},
                {"sku": "AVP-RED-UK8", "size": "UK 8", "color": "University Red", "price": Decimal("129.99"), "stock_quantity": 8},
                {"sku": "AVP-RED-UK9", "size": "UK 9", "color": "University Red", "price": Decimal("129.99"), "stock_quantity": 0},  # Out of stock
                {"sku": "AVP-BLK-UK8", "size": "UK 8", "color": "Triple Black", "price": Decimal("129.99"), "stock_quantity": 12},
                {"sku": "AVP-BLK-UK9", "size": "UK 9", "color": "Triple Black", "price": Decimal("129.99"), "stock_quantity": 5},
            ],
        },
        {
            "category_slug": "running",
            "name": "CloudStride Nitro",
            "slug": "cloudstride-nitro",
            "brand": "Puma",
            "description": "Nitrogen-infused foam technology delivering elite energy return and featherlight propulsion.",
            "image_url": "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=800&q=80",
            "is_active": True,
            "variants": [
                {"sku": "CSN-WHT-UK8", "size": "UK 8", "color": "Cloud White", "price": Decimal("139.99"), "stock_quantity": 10},
                {"sku": "CSN-WHT-UK9", "size": "UK 9", "color": "Cloud White", "price": Decimal("139.99"), "stock_quantity": 0},  # Out of stock
                {"sku": "CSN-BLU-UK9", "size": "UK 9", "color": "Royal Blue", "price": Decimal("139.99"), "stock_quantity": 14},
                {"sku": "CSN-BLU-UK10", "size": "UK 10", "color": "Royal Blue", "price": Decimal("139.99"), "stock_quantity": 6},
            ],
        },
        {
            "category_slug": "lifestyle",
            "name": "Street Retro High",
            "slug": "street-retro-high",
            "brand": "Jordan",
            "description": "Iconic high-top silhouette crafted with premium full-grain leather and vintage hardwood heritage.",
            "image_url": "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=800&q=80",
            "is_active": True,
            "variants": [
                {"sku": "SRH-BRD-UK7", "size": "UK 7", "color": "Bred", "price": Decimal("179.99"), "stock_quantity": 4},
                {"sku": "SRH-BRD-UK8", "size": "UK 8", "color": "Bred", "price": Decimal("179.99"), "stock_quantity": 0},  # Out of stock
                {"sku": "SRH-BRD-UK9", "size": "UK 9", "color": "Bred", "price": Decimal("179.99"), "stock_quantity": 7},
                {"sku": "SRH-WHT-UK8", "size": "UK 8", "color": "Cloud White", "price": Decimal("169.99"), "stock_quantity": 9},
                {"sku": "SRH-WHT-UK9", "size": "UK 9", "color": "Cloud White", "price": Decimal("169.99"), "stock_quantity": 3},
            ],
        },
        {
            "category_slug": "lifestyle",
            "name": "Downtown Clean Low",
            "slug": "downtown-clean-low",
            "brand": "Adidas",
            "description": "Timeless minimalist sneaker with clean lines, soft leather upper, and durable rubber cupsole.",
            "image_url": "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80",
            "is_active": True,
            "variants": [
                {"sku": "DCL-WHT-UK7", "size": "UK 7", "color": "Cloud White", "price": Decimal("99.99"), "stock_quantity": 20},
                {"sku": "DCL-WHT-UK8", "size": "UK 8", "color": "Cloud White", "price": Decimal("99.99"), "stock_quantity": 15},
                {"sku": "DCL-BLK-UK8", "size": "UK 8", "color": "Triple Black", "price": Decimal("99.99"), "stock_quantity": 0},  # Out of stock
                {"sku": "DCL-BLK-UK9", "size": "UK 9", "color": "Triple Black", "price": Decimal("99.99"), "stock_quantity": 11},
            ],
        },
        {
            "category_slug": "basketball",
            "name": "Court Dominator Elite",
            "slug": "court-dominator-elite",
            "brand": "Nike",
            "description": "Engineered for hard cuts and fast breaks with targeted ankle support and multidirectional grip.",
            "image_url": "https://images.unsplash.com/photo-1579338559194-a162d19bf842?auto=format&fit=crop&w=800&q=80",
            "is_active": True,
            "variants": [
                {"sku": "CDE-BLU-UK8", "size": "UK 8", "color": "Royal Blue", "price": Decimal("159.99"), "stock_quantity": 8},
                {"sku": "CDE-BLU-UK9", "size": "UK 9", "color": "Royal Blue", "price": Decimal("159.99"), "stock_quantity": 12},
                {"sku": "CDE-BLU-UK10", "size": "UK 10", "color": "Royal Blue", "price": Decimal("159.99"), "stock_quantity": 0},  # Out of stock
                {"sku": "CDE-RED-UK8", "size": "UK 8", "color": "University Red", "price": Decimal("159.99"), "stock_quantity": 5},
                {"sku": "CDE-RED-UK9", "size": "UK 9", "color": "University Red", "price": Decimal("159.99"), "stock_quantity": 7},
            ],
        },
    ]

    for p in product_data:
        category = cat_map[p["category_slug"]]
        product = Product.query.filter_by(slug=p["slug"]).first()
        if not product:
            product = Product(
                category_id=category.id,
                name=p["name"],
                slug=p["slug"],
                brand=p["brand"],
                description=p["description"],
                image_url=p["image_url"],
                is_active=p["is_active"],
            )
            db.session.add(product)
            db.session.flush()
        else:
            product.category_id = category.id
            product.name = p["name"]
            product.brand = p["brand"]
            product.description = p["description"]
            product.image_url = p["image_url"]
            product.is_active = p["is_active"]
        stats["products"] += 1

        # Seed Variants
        for v in p["variants"]:
            variant = ProductVariant.query.filter_by(sku=v["sku"]).first()
            if not variant:
                variant = ProductVariant(
                    product_id=product.id,
                    sku=v["sku"],
                    size=v["size"],
                    color=v["color"],
                    price=v["price"],
                    stock_quantity=v["stock_quantity"],
                )
                db.session.add(variant)
            else:
                variant.product_id = product.id
                variant.size = v["size"]
                variant.color = v["color"]
                variant.price = v["price"]
                variant.stock_quantity = v["stock_quantity"]
            stats["variants"] += 1

    # 3. Seed Users (No plain-text passwords or production credentials)
    user_data = [
        {"name": "Sneaker Fanatic", "email": "customer@kickshub.local", "role": "customer"},
        {"name": "Store Admin", "email": "admin@kickshub.local", "role": "admin"},
    ]
    for u in user_data:
        user = User.query.filter_by(email=u["email"]).first()
        if not user:
            user = User(
                name=u["name"],
                email=u["email"],
                role=u["role"],
                is_active=True,
            )
            user.set_password("Password123!")
            db.session.add(user)
        else:
            user.name = u["name"]
            user.role = u["role"]
            user.is_active = True
            if not user.password_hash:
                user.set_password("Password123!")
        stats["users"] += 1

    # 4. Seed Address for Customer
    customer = User.query.filter_by(email="customer@kickshub.local").first()
    if customer:
        existing_addr = Address.query.filter_by(user_id=customer.id).first()
        if not existing_addr:
            addr = Address(
                user_id=customer.id,
                recipient_name=customer.name,
                phone="+91 98765 43210",
                line1="42 Sneaker Street, Flat 4B",
                line2="Bandra West",
                city="Mumbai",
                state="Maharashtra",
                postal_code="400050",
                country="India",
            )
            db.session.add(addr)
            stats["addresses"] += 1

    db.session.commit()
    return stats
