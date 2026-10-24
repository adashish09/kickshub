import logging
from app.extensions import db
from app.models import Address

logger = logging.getLogger(__name__)


def serialize_address(address):
    """Serialize an Address model instance into a dictionary."""
    return {
        "id": address.id,
        "user_id": address.user_id,
        "recipient_name": address.recipient_name,
        "phone": address.phone or "",
        "line1": address.line1,
        "line2": address.line2 or "",
        "city": address.city,
        "state": address.state,
        "postal_code": address.postal_code,
        "country": address.country,
        "created_at": address.created_at.isoformat() if address.created_at else None,
    }


def get_user_addresses(user_id):
    """Retrieve all delivery addresses for a specific user, newest first."""
    addresses = (
        Address.query.filter_by(user_id=user_id)
        .order_by(Address.created_at.desc())
        .all()
    )
    return [serialize_address(addr) for addr in addresses]


def create_address(user_id, address_data):
    """Create a new delivery address for a user."""
    address = Address(
        user_id=user_id,
        recipient_name=address_data["recipient_name"],
        phone=address_data.get("phone", ""),
        line1=address_data["line1"],
        line2=address_data.get("line2", ""),
        city=address_data["city"],
        state=address_data["state"],
        postal_code=address_data["postal_code"],
        country=address_data.get("country", "India"),
    )
    db.session.add(address)
    try:
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        logger.error("Failed to commit new address for user %s: %s", user_id, exc)
        raise

    return serialize_address(address)


def update_address(user_id, address_id, address_data):
    """Update an existing delivery address for a user."""
    address = Address.query.filter_by(id=address_id, user_id=user_id).first()
    if not address:
        return None

    address.recipient_name = address_data["recipient_name"]
    address.phone = address_data.get("phone", "")
    address.line1 = address_data["line1"]
    address.line2 = address_data.get("line2", "")
    address.city = address_data["city"]
    address.state = address_data["state"]
    address.postal_code = address_data["postal_code"]
    address.country = address_data.get("country", "India")

    try:
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        logger.error("Failed to update address %s for user %s: %s", address_id, user_id, exc)
        raise

    return serialize_address(address)


def delete_address(user_id, address_id):
    """Delete a delivery address for a user."""
    address = Address.query.filter_by(id=address_id, user_id=user_id).first()
    if not address:
        return False

    db.session.delete(address)
    try:
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        logger.error("Failed to delete address %s for user %s: %s", address_id, user_id, exc)
        raise

    return True
