"""
PolicyLens AI — Prediction Routes
POST /api/predict-approval  (Citizen only)
"""
import os
import pickle
import logging
try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False
    np = None
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt

from models import db, Application

logger = logging.getLogger(__name__)

prediction_bp = Blueprint("prediction", __name__)

# Load trained models once at import time
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "ml", "model.pkl")


def _load_models():
    """Load the trained models from disk."""
    path = os.path.abspath(MODEL_PATH)
    if not os.path.exists(path):
        logger.warning("model.pkl not found — run ml/train_model.py first")
        return None
    try:
        with open(path, "rb") as f:
            return pickle.load(f)
    except Exception as e:
        logger.warning("Could not load model.pkl: %s — using rule-based fallback", e)
        return None


try:
    MODELS = _load_models()
except Exception:
    MODELS = None


# ---------------------------------------------------------------------------
# POST /api/predict-approval
# ---------------------------------------------------------------------------
@prediction_bp.route("/api/predict-approval", methods=["POST"])
@jwt_required()
def predict_approval():
    """Predict scheme-approval probability for a citizen.

    Expects JSON: { income, marks, category, district }
    Returns: approval_probability, rejection_reasons, status
    """
    # --- Role check ---
    claims = get_jwt()
    if claims.get("role") != "Citizen":
        return jsonify({"error": "Access denied — Citizens only"}), 403

    # --- Reload models if they weren't available at startup ---
    global MODELS
    if MODELS is None:
        MODELS = _load_models()

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    # --- Input validation ---
    try:
        income = float(data["income"])
        marks = float(data["marks"])
        category_name = str(data["category"]).strip()
        district_name = str(data["district"]).strip()
    except (KeyError, ValueError) as exc:
        return jsonify({"error": f"Invalid input: {exc}"}), 400

    rejection_reasons = []
    if income > 500000:
        rejection_reasons.append("Income too high (above ₹5,00,000)")
    if marks < 50:
        rejection_reasons.append("Marks too low (below 50)")
    if not data.get("documents_submitted", True):
        rejection_reasons.append("Missing documents")

    if HAS_NUMPY and MODELS and "approval_model" in MODELS:
        # ML-based prediction using RandomForest
        categories = MODELS["categories"]
        districts = MODELS["districts"]

        category_encoded = categories.get(category_name)
        district_encoded = districts.get(district_name)

        if category_encoded is None:
            return jsonify({"error": f"Unknown category '{category_name}'. Valid: {list(categories)}"}), 400
        if district_encoded is None:
            return jsonify({"error": f"Unknown district '{district_name}'. Valid: {list(districts)}"}), 400

        features = np.array([[income, marks, category_encoded, district_encoded]])
        model = MODELS["approval_model"]
        proba = model.predict_proba(features)[0]
        approval_probability = round(float(proba[1]) * 100, 2)
    else:
        # Rule-based fallback when ML models are unavailable
        probability = 60
        if income > 500000:
            probability -= 30
        if marks < 60:
            probability -= 40
        else:
            probability += 20
        if not district_name:
            probability -= 15
        approval_probability = max(0, min(100, probability))

    status = "Likely Approved" if approval_probability >= 50 else "Likely Rejected"

    # --- Save application record ---
    user_id = int(claims.get("sub", get_jwt()["sub"]))
    application = Application(
        user_id=user_id,
        income=income,
        marks=marks,
        category=category_name,
        district=district_name,
        status="Approved" if approval_probability >= 50 else "Rejected",
    )
    db.session.add(application)
    db.session.commit()

    logger.info("Prediction for user %s: %.2f%% (%s)", user_id, approval_probability, status)
    return jsonify({
        "approval_probability": approval_probability,
        "status": status,
        "rejection_reasons": rejection_reasons,
        "application_id": application.id,
    }), 200
