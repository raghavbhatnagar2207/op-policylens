"""
PolicyLens AI — Authentication Routes
Handles signup, login, and logout with JWT-based session management.
"""
import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
    get_jwt,
)
import bcrypt

from models import db, User
from config import BLOCKLIST

logger = logging.getLogger(__name__)

auth_bp = Blueprint("auth", __name__)


# ---------------------------------------------------------------------------
# POST /api/signup — Register a new user
# ---------------------------------------------------------------------------
@auth_bp.route("/api/signup", methods=["POST"])
def signup():
    """Create a new user account.

    Expects JSON: { name, email, password, role }
    Returns 201 on success, 409 if email already exists.
    """
    data = request.get_json(silent=True)

    # --- Input validation ---
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    role = data.get("role", "Citizen").strip()

    if not name or not email or not password:
        return jsonify({"error": "name, email, and password are required"}), 400

    if role not in ("Citizen", "Authority"):
        return jsonify({"error": "role must be 'Citizen' or 'Authority'"}), 400

    # --- Duplicate check ---
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    # --- Hash password & create user ---
    hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    new_user = User(name=name, email=email, password=hashed_pw, role=role)
    db.session.add(new_user)
    db.session.commit()

    logger.info("New user registered: %s (%s)", email, role)
    return jsonify({"message": "User registered successfully"}), 201


# ---------------------------------------------------------------------------
# POST /api/login — Authenticate and receive JWT
# ---------------------------------------------------------------------------
@auth_bp.route("/api/login", methods=["POST"])
def login():
    """Authenticate with email & password.

    Returns JWT access token and user role on success.
    """
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"error": "User not found", "code": "USER_NOT_FOUND"}), 404

    if not bcrypt.checkpw(password.encode("utf-8"), user.password.encode("utf-8")):
        return jsonify({"error": "Incorrect password", "code": "INVALID_PASSWORD"}), 401

    # Create JWT with user identity and role as additional claim
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role, "email": user.email},
    )

    logger.info("User logged in: %s", email)
    return jsonify({
        "message": "Login successful",
        "access_token": access_token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
        },
    }), 200


# ---------------------------------------------------------------------------
# POST /api/logout — Revoke current JWT
# ---------------------------------------------------------------------------
@auth_bp.route("/api/logout", methods=["POST"])
@jwt_required()
def logout():
    """Revoke the current access token by adding its JTI to the blocklist."""
    jti = get_jwt()["jti"]
    BLOCKLIST.add(jti)

    logger.info("Token revoked (jti=%s)", jti)
    return jsonify({"message": "Successfully logged out"}), 200
