"""
PolicyLens AI — Dashboard & Fraud-Detection Routes
GET /api/dashboard-data    (Authority only)
GET /api/fraud-detection   (Authority only)
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
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from models import db, Application, DistrictStats, Complaint
from extensions import cache
from textblob import TextBlob

logger = logging.getLogger(__name__)

dashboard_bp = Blueprint("dashboard", __name__)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "ml", "model.pkl")


def _load_models():
    path = os.path.abspath(MODEL_PATH)
    if not os.path.exists(path):
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


def _authority_only():
    """Return error response if current user is not Authority, else None."""
    claims = get_jwt()
    if claims.get("role") != "Authority":
        return jsonify({"error": "Access denied — Authority only"}), 403
    return None


# ---------------------------------------------------------------------------
# GET /api/dashboard-data
# ---------------------------------------------------------------------------
@dashboard_bp.route("/api/dashboard-data", methods=["GET"])
@jwt_required()
@cache.cached(timeout=60, query_string=True)
def dashboard_data():
    """Return aggregated policy dashboard stats for Authority users.

    Response includes:
      - fund_stats: total allocated / utilized
      - approval_rates: overall + per-district
      - district_scores: composite score per district
      - delay_risks: districts with high average delay
    """
    denied = _authority_only()
    if denied:
        return denied

    # --- Fund stats ---
    stats = DistrictStats.query.all()
    total_allocated = sum(s.funds_allocated for s in stats) if stats else 0
    total_utilized = sum(s.funds_utilized for s in stats) if stats else 0
    total_beneficiaries = sum(s.beneficiaries for s in stats) if stats else 0

    fund_stats = {
        "total_allocated": round(total_allocated, 2),
        "total_utilized": round(total_utilized, 2),
        "utilization_rate": round((total_utilized / total_allocated * 100), 2) if total_allocated else 0,
        "total_beneficiaries": total_beneficiaries,
    }

    # --- Approval rates ---
    total_apps = Application.query.count()
    approved_apps = Application.query.filter_by(status="Approved").count()
    overall_rate = round((approved_apps / total_apps * 100), 2) if total_apps else 0

    # Per-district approval
    district_rates = {}
    for stat in stats:
        d = stat.district
        d_total = Application.query.filter_by(district=d).count()
        d_approved = Application.query.filter_by(district=d, status="Approved").count()
        district_rates[d] = round((d_approved / d_total * 100), 2) if d_total else 0

    approval_rates = {
        "overall": overall_rate,
        "total_applications": total_apps,
        "approved": approved_apps,
        "per_district": district_rates,
    }

    # --- District scores ---
    # score = utilization_ratio + approval_rate - delay_factor
    district_scores = {}
    for stat in stats:
        utilization_ratio = (stat.funds_utilized / stat.funds_allocated) if stat.funds_allocated else 0
        approval_rate = district_rates.get(stat.district, 0) / 100
        delay_factor = min(stat.delay_days / 365, 1)  # cap at 1
        score = round((utilization_ratio + approval_rate - delay_factor) * 100, 2)
        district_scores[stat.district] = score

    # --- Delay risks ---
    avg_delay = (sum(s.delay_days for s in stats) / len(stats)) if stats else 0
    delay_risks = [
        {"district": s.district, "delay_days": s.delay_days, "risk": "High" if s.delay_days > avg_delay else "Low"}
        for s in stats
    ]

    return jsonify({
        "fund_stats": fund_stats,
        "approval_rates": approval_rates,
        "district_scores": district_scores,
        "delay_risks": delay_risks,
    }), 200


# ---------------------------------------------------------------------------
# GET /api/fraud-detection
# ---------------------------------------------------------------------------
@dashboard_bp.route("/api/fraud-detection", methods=["GET"])
@jwt_required()
@cache.cached(timeout=60, query_string=True)
def fraud_detection():
    """Detect suspicious / anomalous district records using IsolationForest.

    Returns a list of district stats with their anomaly scores.
    """
    denied = _authority_only()
    if denied:
        return denied

    global MODELS
    if MODELS is None:
        MODELS = _load_models()

    stats = DistrictStats.query.all()
    if not stats:
        return jsonify({"anomalies": [], "message": "No district data available"}), 200

    results = []

    if HAS_NUMPY and MODELS and "anomaly_model" in MODELS:
        # ML-based fraud detection using IsolationForest
        features = np.array([
            [s.funds_allocated, s.funds_utilized, s.delay_days] for s in stats
        ])
        anomaly_model = MODELS["anomaly_model"]
        predictions = anomaly_model.predict(features)
        scores = anomaly_model.decision_function(features)

        for stat, pred, score in zip(stats, predictions, scores):
            results.append({
                "district": stat.district,
                "funds_allocated": stat.funds_allocated,
                "funds_utilized": stat.funds_utilized,
                "delay_days": stat.delay_days,
                "beneficiaries": stat.beneficiaries,
                "is_anomaly": bool(pred == -1),
                "anomaly_score": round(float(score), 4),
            })
    else:
        # Rule-based fallback when ML models are unavailable
        for stat in stats:
            utilization = (stat.funds_utilized / stat.funds_allocated) if stat.funds_allocated else 0
            is_anomaly = utilization < 0.5 or stat.delay_days > 30
            score = round(utilization - (stat.delay_days / 100), 4)
            results.append({
                "district": stat.district,
                "funds_allocated": stat.funds_allocated,
                "funds_utilized": stat.funds_utilized,
                "delay_days": stat.delay_days,
                "beneficiaries": stat.beneficiaries,
                "is_anomaly": is_anomaly,
                "anomaly_score": score,
            })

    # Sort by anomaly score ascending (most suspicious first)
    results.sort(key=lambda r: r["anomaly_score"])

    suspicious_count = sum(1 for r in results if r["is_anomaly"])
    logger.info("Fraud detection: %d/%d districts flagged", suspicious_count, len(results))

    return jsonify({
        "anomalies": results,
        "total_districts": len(results),
        "suspicious_count": suspicious_count,
    }), 200


# ---------------------------------------------------------------------------
# POST & GET /api/complaints
# ---------------------------------------------------------------------------
@dashboard_bp.route("/api/complaints", methods=["POST", "GET"])
@jwt_required()
def handle_complaints():
    """Submit NLP NLP Complaint (Citizen) or View AI-graded Complaints (Authority)"""
    claims = get_jwt()
    user_id = int(get_jwt_identity())

    if request.method == "POST":
        # Only Citizens can submit complaints
        if claims.get("role") != "Citizen":
            return jsonify({"error": "Only citizens can file complaints"}), 403

        # Citizen submitting a complaint
        data = request.get_json(silent=True)
        text = data.get("text", "").strip()

        if not text:
            return jsonify({"error": "No text provided"}), 400

        # Mathematical Sentiment Analysis [-1.0 = highly negative, 1.0 = positive]
        sentiment = TextBlob(text).sentiment.polarity
        
        if sentiment < -0.5:
            urgency = "Critical"
        elif sentiment < 0:
            urgency = "High"
        elif sentiment < 0.5:
            urgency = "Medium"
        else:
            urgency = "Low"

        complaint = Complaint(user_id=user_id, text=text, sentiment_score=sentiment, urgency=urgency)
        db.session.add(complaint)
        db.session.commit()

        logger.info(f"NLP Complaint registered: Urgency={urgency}, Sentiment={sentiment:.2f}")
        return jsonify({"message": "Complaint submitted successfully", "urgency": urgency, "sentiment": sentiment}), 201

    elif request.method == "GET":
        # Authority fetching sorted complaints by AI sentiment
        if claims.get("role") != "Authority":
            return jsonify({"error": "Access denied"}), 403
            
        complaints = Complaint.query.order_by(Complaint.sentiment_score.asc()).all()
        results = [
            {
                "id": c.id,
                "text": c.text,
                "sentiment": c.sentiment_score,
                "urgency": c.urgency,
                "status": c.status,
                "created_at": c.created_at.isoformat()
            } for c in complaints
        ]
        return jsonify({"complaints": results}), 200
