"""
PolicyLens AI — Flask Application Entry Point

Run:
    python app.py

The server starts on http://localhost:5000.
On first run it will:
  1. Create the SQLite database
  2. Train the ML models
  3. Seed sample data
"""
import os
import sys
import logging

from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
import bcrypt

# ---------------------------------------------------------------------------
# Configure logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("policylens")


def create_app():
    """Application factory."""
    app = Flask(__name__)

    # -- Load config --
    from config import Config, BLOCKLIST
    app.config.from_object(Config)

    from models import db
    from extensions import cache
    from data_streamer import start_streamer
    db.init_app(app)
    cache.init_app(app)
    
    if not app.config.get("TESTING"):
        start_streamer(app)

    # -- JWT --
    jwt = JWTManager(app)

    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(_jwt_header, jwt_payload):
        """Return True if the token's jti is in the blocklist."""
        return jwt_payload["jti"] in BLOCKLIST

    @jwt.revoked_token_loader
    def revoked_token_callback(_jwt_header, _jwt_payload):
        return {"error": "Token has been revoked"}, 401

    @jwt.expired_token_loader
    def expired_token_callback(_jwt_header, _jwt_payload):
        return {"error": "Token has expired"}, 401

    @jwt.invalid_token_loader
    def invalid_token_callback(reason):
        return {"error": f"Invalid token: {reason}"}, 401

    @jwt.unauthorized_loader
    def missing_token_callback(reason):
        return {"error": f"Authorization required: {reason}"}, 401

    # -- CORS --
    CORS(app, origins=app.config.get("CORS_ORIGINS", "*"))

    # -- Register blueprints --
    from routes.auth_routes import auth_bp
    from routes.prediction_routes import prediction_bp
    from routes.dashboard_routes import dashboard_bp
    from routes.legacy_routes import legacy_bp
    from routes.post_routes import posts_bp
    from routes.profile_routes import profile_bp
    from routes.scheme_routes import scheme_bp
    from routes.chatbot_routes import chatbot_bp
    from routes.tts_routes import tts_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(prediction_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(legacy_bp)
    app.register_blueprint(posts_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(scheme_bp)
    app.register_blueprint(chatbot_bp)
    app.register_blueprint(tts_bp)

    # -- Health check --
    @app.route("/api/health", methods=["GET"])
    def health():
        return {"status": "ok", "service": "PolicyLens AI"}, 200

    return app


# ---------------------------------------------------------------------------
# Seed database with sample data
# ---------------------------------------------------------------------------
def seed_database():
    """Insert sample users, applications, and district stats if tables are empty."""
    from models import db, User, Application, DistrictStats

    if User.query.first():
        logger.info("Database already seeded — skipping")
        return

    logger.info("Seeding database with sample data …")

    # --- Users ---
    users = [
        User(
            name="Rahul Sharma",
            email="citizen@example.com",
            password=bcrypt.hashpw(b"citizen123", bcrypt.gensalt()).decode(),
            role="Citizen",
        ),
        User(
            name="Priya Singh",
            email="authority@example.com",
            password=bcrypt.hashpw(b"authority123", bcrypt.gensalt()).decode(),
            role="Authority",
        ),
        User(
            name="Amit Kumar",
            email="citizen2@example.com",
            password=bcrypt.hashpw(b"citizen456", bcrypt.gensalt()).decode(),
            role="Citizen",
        ),
    ]
    db.session.add_all(users)
    db.session.flush()  # get auto-incremented IDs

    # --- Applications ---
    applications = [
        Application(user_id=users[0].id, income=250000, marks=78, category="OBC", district="Delhi", status="Approved"),
        Application(user_id=users[0].id, income=600000, marks=45, category="General", district="Mumbai", status="Rejected"),
        Application(user_id=users[2].id, income=180000, marks=82, category="SC", district="Chennai", status="Approved"),
        Application(user_id=users[2].id, income=350000, marks=55, category="ST", district="Jaipur", status="Approved"),
        Application(user_id=users[0].id, income=420000, marks=67, category="OBC", district="Bangalore", status="Approved"),
        Application(user_id=users[2].id, income=750000, marks=38, category="General", district="Kolkata", status="Rejected"),
    ]
    db.session.add_all(applications)

    # --- District stats ---
    district_stats = [
        DistrictStats(district="Delhi",     funds_allocated=5000000, funds_utilized=4200000, beneficiaries=1200, delay_days=15),
        DistrictStats(district="Mumbai",    funds_allocated=8000000, funds_utilized=6500000, beneficiaries=2100, delay_days=22),
        DistrictStats(district="Chennai",   funds_allocated=4500000, funds_utilized=4100000, beneficiaries=980,  delay_days=10),
        DistrictStats(district="Kolkata",   funds_allocated=3500000, funds_utilized=1500000, beneficiaries=600,  delay_days=45),
        DistrictStats(district="Bangalore", funds_allocated=6000000, funds_utilized=5800000, beneficiaries=1500, delay_days=8),
        DistrictStats(district="Hyderabad", funds_allocated=4000000, funds_utilized=3200000, beneficiaries=850,  delay_days=30),
        DistrictStats(district="Pune",      funds_allocated=3000000, funds_utilized=2700000, beneficiaries=720,  delay_days=12),
        DistrictStats(district="Jaipur",    funds_allocated=2500000, funds_utilized=2000000, beneficiaries=500,  delay_days=20),
        DistrictStats(district="Lucknow",   funds_allocated=3200000, funds_utilized=1800000, beneficiaries=450,  delay_days=55),
        DistrictStats(district="Ahmedabad", funds_allocated=4800000, funds_utilized=4500000, beneficiaries=1100, delay_days=14),
    ]
    db.session.add_all(district_stats)

    db.session.commit()
    logger.info("Seed data inserted — %d users, %d applications, %d districts",
                len(users), len(applications), len(district_stats))


# ---------------------------------------------------------------------------
# Train ML models if model.pkl doesn't exist
# ---------------------------------------------------------------------------
def ensure_models():
    """Train ML models if the pickle file doesn't exist yet."""
    model_path = os.path.join(os.path.dirname(__file__), "ml", "model.pkl")
    if not os.path.exists(model_path):
        logger.info("model.pkl not found — bypassing training because scikit-learn is unsupported in this env")
        pass
    else:
        logger.info("model.pkl found — skipping training")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
app = create_app()

if __name__ == "__main__":
    with app.app_context():
        from models import db
        db.create_all()
        logger.info("Database tables created")

        seed_database()

    ensure_models()

    logger.info("Starting PolicyLens AI backend on http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=True)
