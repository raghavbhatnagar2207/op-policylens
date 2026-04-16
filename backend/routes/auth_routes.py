"""
PolicyLens AI — Authentication Routes
Handles signup, login, and logout with JWT-based session management.
Supports login via email OR phone number with comprehensive validation.
"""
import re
import html
import logging
from datetime import timedelta

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
# Validation Helpers
# ---------------------------------------------------------------------------

def sanitize(value: str) -> str:
    """Strip HTML tags and trim whitespace."""
    if not isinstance(value, str):
        return ""
    return html.escape(value.strip())


def validate_email(email: str):
    """Comprehensive email validation. Returns (clean_email, error_msg)."""
    email = email.strip().lower()

    if len(email) < 5 or len(email) > 254:
        return None, "Email length must be between 5 and 254 characters"

    if " " in email:
        return None, "Email must not contain spaces"

    if email.count("@") != 1:
        return None, "Email must contain exactly one '@' symbol"

    # Must not start with a digit
    if email[0].isdigit():
        return None, "Email must not start with a number"

    # Must not start with a special character (only letters allowed at start)
    if not email[0].isalpha():
        return None, "Email must not start with a special character"

    # Standard format check
    pattern = r'^[a-zA-Z][a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        return None, "Invalid email format"

    return email, None


def validate_phone(phone: str):
    """Indian phone number validation. Returns (clean_phone, error_msg)."""
    phone = phone.strip()

    if not phone.isdigit():
        return None, "Phone number must contain only digits"

    if len(phone) != 10:
        return None, "Phone number must be exactly 10 digits"

    if phone[0] in ("0", "1", "2", "3", "4", "5"):
        return None, "Phone number must start with 6-9 (valid Indian format)"

    return phone, None


def is_phone_input(identifier: str) -> bool:
    """Detect whether the identifier looks like a phone number."""
    cleaned = identifier.strip()
    return cleaned.isdigit()


# ---------------------------------------------------------------------------
# POST /api/signup — Register a new user
# ---------------------------------------------------------------------------
@auth_bp.route("/api/signup", methods=["POST"])
def signup():
    """Create a new user account.

    Expects JSON: { name, email, password, role, phone? }
    Returns 201 on success, 409 if email/phone already exists.
    """
    data = request.get_json(silent=True)

    # --- Input validation ---
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    name = sanitize(data.get("name", ""))
    email_raw = data.get("email", "").strip()
    password = data.get("password", "")
    role = sanitize(data.get("role", "Citizen"))
    phone_raw = data.get("phone", "").strip()

    if not name or not email_raw or not password:
        return jsonify({"error": "name, email, and password are required"}), 400

    if len(name) > 120:
        return jsonify({"error": "Name is too long (max 120 characters)"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    if len(password) > 128:
        return jsonify({"error": "Password is too long (max 128 characters)"}), 400

    if role not in ("Citizen", "Authority"):
        return jsonify({"error": "role must be 'Citizen' or 'Authority'"}), 400

    # --- Email validation ---
    email, email_err = validate_email(email_raw)
    if email_err:
        return jsonify({"error": email_err, "code": "INVALID_EMAIL"}), 400

    # --- Duplicate email check ---
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered", "code": "EMAIL_EXISTS"}), 409

    # --- Phone validation (optional field) ---
    clean_phone = None
    if phone_raw:
        clean_phone, phone_err = validate_phone(phone_raw)
        if phone_err:
            return jsonify({"error": phone_err, "code": "INVALID_PHONE"}), 400

        # Duplicate phone check
        if User.query.filter_by(phone=clean_phone).first():
            return jsonify({"error": "Phone number already registered", "code": "PHONE_EXISTS"}), 409

    # --- Hash password & create user ---
    hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    new_user = User(
        name=name,
        email=email,
        password=hashed_pw,
        role=role,
        phone=clean_phone,
    )
    db.session.add(new_user)
    db.session.commit()

    logger.info("New user registered: %s (%s)", email, role)
    return jsonify({"message": "User registered successfully"}), 201


# ---------------------------------------------------------------------------
# POST /api/login — Authenticate and receive JWT
# ---------------------------------------------------------------------------
@auth_bp.route("/api/login", methods=["POST"])
def login():
    """Authenticate with (email OR phone) & password.

    Accepts JSON: { identifier, password, remember_me? }
    Also accepts legacy format: { email, password }
    Returns JWT access token and user role on success.
    """
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    # Support both 'identifier' (new) and 'email' (legacy) field names
    identifier = data.get("identifier", "").strip() or data.get("email", "").strip()
    password = data.get("password", "")
    remember_me = data.get("remember_me", False)

    if not identifier or not password:
        return jsonify({"error": "Login identifier and password are required"}), 400

    # --- Detect input type and validate ---
    user = None

    if is_phone_input(identifier):
        # Phone login
        clean_phone, phone_err = validate_phone(identifier)
        if phone_err:
            return jsonify({"error": phone_err, "code": "INVALID_PHONE"}), 400

        user = User.query.filter_by(phone=clean_phone).first()
        if not user:
            return jsonify({"error": "No account found with this phone number", "code": "USER_NOT_FOUND"}), 404
    else:
        # Email login
        clean_email, email_err = validate_email(identifier)
        if email_err:
            return jsonify({"error": email_err, "code": "INVALID_EMAIL"}), 400

        user = User.query.filter_by(email=clean_email).first()
        if not user:
            return jsonify({"error": "User not found", "code": "USER_NOT_FOUND"}), 404

    # --- Check password ---
    if not bcrypt.checkpw(password.encode("utf-8"), user.password.encode("utf-8")):
        return jsonify({"error": "Incorrect password", "code": "INVALID_PASSWORD"}), 401

    # --- Create JWT (remember me controls expiry) ---
    expires = timedelta(days=30) if remember_me else timedelta(hours=24)
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role, "email": user.email},
        expires_delta=expires,
    )

    logger.info("User logged in: %s (via %s)", user.email, "phone" if is_phone_input(identifier) else "email")
    return jsonify({
        "message": "Login successful",
        "access_token": access_token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
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
