#!/usr/bin/env python3
"""Standalone script to seed the KicksHub database."""

import sys
from app import create_app
from app.services.seed_service import seed_database

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        try:
            print("Starting KicksHub database seeding...")
            stats = seed_database()
            print(
                f"Seeding completed successfully:\n"
                f"  - Categories: {stats['categories']}\n"
                f"  - Products:   {stats['products']}\n"
                f"  - Variants:   {stats['variants']}\n"
                f"  - Users:      {stats['users']}"
            )
        except Exception as exc:
            print(f"Error seeding database: {exc}", file=sys.stderr)
            sys.exit(1)
