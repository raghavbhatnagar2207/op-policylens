"""
WSGI entry point for production (Gunicorn / Render).
Ensures database is created and seeded on first deploy.
"""
import os
import sys
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("policylens.wsgi")

from app import create_app, seed_database, ensure_models

app = create_app()

with app.app_context():
    from models import db
    db.create_all()
    logger.info("Database tables created (production)")
    seed_database()

ensure_models()
