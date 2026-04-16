"""
PolicyLens AI — Profile Routes
GET /api/profile
PUT /api/profile
"""
import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import db, User

logger = logging.getLogger(__name__)

profile_bp = Blueprint("profile", __name__)

@profile_bp.route("/api/profile", methods=["GET"])
@jwt_required()
def get_profile():
    """Get the current user's full profile."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "created_at": user.created_at.isoformat(),
        "phone": user.phone or "",
        "address": user.address or "",
        "city": user.city or "",
        "state": user.state or "Uttar Pradesh",
        "aadhaar_last4": user.aadhaar_last4 or "",
        "bio": user.bio or ""
    }), 200

@profile_bp.route("/api/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    """Update the current user's profile details."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    # Updatable fields (email and role are locked)
    if "name" in data:
        user.name = str(data["name"]).strip()
    if "phone" in data:
        user.phone = str(data["phone"]).strip()
    if "address" in data:
        user.address = str(data["address"]).strip()
    if "city" in data:
        user.city = str(data["city"]).strip()
    if "state" in data:
        user.state = str(data["state"]).strip()
    if "aadhaar_last4" in data:
        user.aadhaar_last4 = str(data["aadhaar_last4"]).strip()
    if "bio" in data:
        user.bio = str(data["bio"]).strip()

    db.session.commit()
    logger.info(f"User {user_id} updated their profile")

    return jsonify({"message": "Profile updated successfully"}), 200
