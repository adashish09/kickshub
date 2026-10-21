import click
from flask.cli import with_appcontext
from app.extensions import db
from app.models.user import User
from app.services.seed_service import seed_database


def register_commands(app):
    """Register custom Click CLI commands with the Flask application."""

    @app.cli.command("seed-db")
    @with_appcontext
    def seed_db_command():
        """Seed the database with initial sneaker catalog and test data."""
        click.echo("Seeding KicksHub database...")
        stats = seed_database()
        click.echo(
            f"Seeding completed successfully! "
            f"({stats['categories']} categories, {stats['products']} products, "
            f"{stats['variants']} variants, {stats['users']} users)"
        )

    @app.cli.command("promote-admin")
    @click.argument("email")
    @with_appcontext
    def promote_admin_command(email):
        """Promote an existing customer account to administrator role."""
        email_clean = email.strip().lower()
        user = User.query.filter_by(email=email_clean).first()
        if not user:
            click.echo(f"Error: User with email '{email_clean}' not found.", err=True)
            return

        if user.role == "admin":
            click.echo(f"User '{user.email}' is already an administrator.")
            return

        user.role = "admin"
        db.session.commit()
        click.echo(f"Success: User '{user.email}' has been promoted to administrator.")

    @app.cli.command("create-admin")
    @click.argument("name")
    @click.argument("email")
    @click.argument("password")
    @with_appcontext
    def create_admin_command(name, email, password):
        """Create a new administrator account securely from the server console."""
        email_clean = email.strip().lower()
        existing = User.query.filter_by(email=email_clean).first()
        if existing:
            click.echo(f"Error: User with email '{email_clean}' already exists.", err=True)
            return

        user = User(
            name=name.strip(),
            email=email_clean,
            role="admin",
            is_active=True,
        )
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        click.echo(f"Success: Administrator '{user.email}' created successfully.")
