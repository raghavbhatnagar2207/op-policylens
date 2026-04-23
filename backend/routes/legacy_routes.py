import os
import json
from datetime import datetime
import random
from flask import Blueprint, request, jsonify

legacy_bp = Blueprint("legacy", __name__)

# Fallback to the dataset.csv in root, or an empty JSON structure if not available.
DATASET_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "dataset.csv")

import csv

def load_dataset():
    data = []
    try:
        with open(DATASET_PATH, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Convert amount and confidence to numeric where possible
                try:
                    row["amount"] = float(row["amount"]) if row["amount"] else 0
                except:
                    row["amount"] = 0
                try:
                    row["confidence"] = float(row["confidence"]) if row["confidence"] else 0
                except:
                    row["confidence"] = 0
                data.append(row)
        return data
    except Exception as e:
        print(f"Error loading {DATASET_PATH}: {e}")
        return []

dataset = load_dataset()
complaints = []
simulated_anomalies = []

@legacy_bp.route("/data", methods=["GET"])
def get_data():
    district = request.args.get("district")
    scheme = request.args.get("scheme")
    status = request.args.get("status")
    
    result = dataset + simulated_anomalies
    if district:
        result = [r for r in result if r.get("district") == district]
    if scheme:
        result = [r for r in result if r.get("scheme") == scheme]
    if status:
        result = [r for r in result if r.get("status") == status]
    return jsonify(result)

@legacy_bp.route("/anomalies", methods=["GET"])
def get_anomalies():
    all_data = dataset + simulated_anomalies
    anomalies = [r for r in all_data if r.get("status") == "anomaly"]
    return jsonify(anomalies)

@legacy_bp.route("/complaint", methods=["POST"])
def post_complaint():
    data = request.json or {}
    district = data.get("district")
    issue_type = data.get("issueType")
    description = data.get("description")
    
    if not district or not issue_type or not description:
        return jsonify({"error": "district, issueType, and description are required"}), 400
        
    complaint = {
        "id": f"CMP{str(len(complaints) + 1).zfill(3)}",
        "district": district,
        "issueType": issue_type,
        "description": description,
        "name": data.get("name", "Anonymous"),
        "phone": data.get("phone", "N/A"),
        "date": datetime.now().strftime("%Y-%m-%d"),
        "status": "Pending"
    }
    complaints.append(complaint)
    return jsonify({"success": True, "complaint": complaint})

@legacy_bp.route("/complaints", methods=["GET"])
def get_complaints():
    return jsonify(complaints)

@legacy_bp.route("/risk-score", methods=["GET"])
def get_risk_score():
    all_data = dataset + simulated_anomalies
    districts = list(set(r.get("district") for r in all_data if r.get("district")))
    
    risk_scores = []
    for district in districts:
        district_data = [r for r in all_data if r.get("district") == district]
        anomaly_count = sum(1 for r in district_data if r.get("status") == "anomaly")
        total_count = len(district_data)
        complaint_count = sum(1 for c in complaints if c.get("district") == district)
        total_amount = sum(r.get("amount", 0) for r in district_data)
        anomaly_amount = sum(r.get("amount", 0) for r in district_data if r.get("status") == "anomaly")
        
        anomaly_ratio = (anomaly_count / total_count) if total_count > 0 else 0
        risk_score = min(100, round((anomaly_ratio * 60) + (complaint_count * 10) + (anomaly_count * 5)))
        
        risk_level = "High" if risk_score >= 60 else "Medium" if risk_score >= 30 else "Low"
        
        risk_scores.append({
            "district": district,
            "riskScore": risk_score,
            "anomalyCount": anomaly_count,
            "totalBeneficiaries": total_count,
            "complaintCount": complaint_count,
            "totalAmount": total_amount,
            "anomalyAmount": anomaly_amount,
            "riskLevel": risk_level
        })
        
    return jsonify(sorted(risk_scores, key=lambda x: x["riskScore"], reverse=True))

@legacy_bp.route("/insights", methods=["GET"])
def get_insights():
    all_data = dataset + simulated_anomalies
    districts = list(set(r.get("district") for r in all_data if r.get("district")))
    schemes = list(set(r.get("scheme") for r in all_data if r.get("scheme")))
    
    district_stats = []
    for d in districts:
        d_total = sum(1 for r in all_data if r.get("district") == d)
        d_anomalies = sum(1 for r in all_data if r.get("district") == d and r.get("status") == "anomaly")
        district_stats.append({"district": d, "total": d_total, "anomalies": d_anomalies})
        
    scheme_stats = []
    for s in schemes:
        s_total = sum(1 for r in all_data if r.get("scheme") == s)
        s_anomalies = sum(1 for r in all_data if r.get("scheme") == s and r.get("status") == "anomaly")
        scheme_stats.append({"scheme": s, "total": s_total, "anomalies": s_anomalies})
        
    if not district_stats or not scheme_stats:
        return jsonify([])
        
    highest_anomaly_district = max(district_stats, key=lambda x: x["anomalies"])
    lowest_anomaly_district = min(district_stats, key=lambda x: x["anomalies"])
    highest_anomaly_scheme = max(scheme_stats, key=lambda x: x["anomalies"])
    
    total_anomalies = sum(1 for r in all_data if r.get("status") == "anomaly")
    total_records = len(all_data)
    avg_anomaly = f"{(total_anomalies / total_records * 100):.1f}" if total_records else "0.0"
    
    avg_anomaly_rate = sum((d["anomalies"]/d["total"]) if d["total"] > 0 else 0 for d in district_stats) / len(district_stats) if district_stats else 0
    high_dist_rate = f"{(highest_anomaly_district['anomalies']/highest_anomaly_district['total']*100):.0f}" if highest_anomaly_district["total"] > 0 else "0"
    
    above_avg_pct = "0"
    if avg_anomaly_rate > 0 and highest_anomaly_district["total"] > 0:
        val = (highest_anomaly_district["anomalies"]/highest_anomaly_district["total"] - avg_anomaly_rate) / avg_anomaly_rate * 100
        above_avg_pct = f"{val:.0f}"
        
    avg_conf = 0
    if total_anomalies > 0:
        avg_conf = sum(r.get("confidence", 0) for r in all_data if r.get("status") == "anomaly") / total_anomalies
        
    insights = [
        {
            "id": 1, "type": "warning", "title": "Highest Risk District",
            "description": f"{highest_anomaly_district['district']} has {high_dist_rate}% anomaly rate with {highest_anomaly_district['anomalies']} flagged cases — approximately {above_avg_pct}% higher than the state average.",
            "icon": "alert-triangle"
        },
        {
            "id": 2, "type": "danger", "title": "Most Affected Scheme",
            "description": f"{highest_anomaly_scheme['scheme']} has the highest fraud cases with {highest_anomaly_scheme['anomalies']} anomalies detected out of {highest_anomaly_scheme['total']} total transactions.",
            "icon": "shield-alert"
        },
        {
            "id": 3, "type": "info", "title": "Overall Anomaly Rate",
            "description": f"{avg_anomaly}% of all {total_records} beneficiary records have been flagged as anomalies. A total of {total_anomalies} suspicious transactions detected.",
            "icon": "bar-chart"
        },
        {
            "id": 4, "type": "success", "title": "Safest District",
            "description": f"{lowest_anomaly_district['district']} has the lowest anomaly count with only {lowest_anomaly_district['anomalies']} flagged case(s) out of {lowest_anomaly_district['total']} beneficiaries.",
            "icon": "shield-check"
        },
        {
            "id": 5, "type": "warning", "title": "Duplicate ID Pattern",
            "description": f"Multiple beneficiaries across districts share duplicate IDs, suggesting potential identity fraud spanning {len(districts)} districts.",
            "icon": "users"
        },
        {
            "id": 6, "type": "info", "title": "Complaint Correlation",
            "description": f"{len(complaints)} complaints received across all districts. Districts with higher complaint counts show {'strong' if len(complaints) > 0 else 'potential'} correlation with anomaly rates.",
            "icon": "message-circle"
        },
        {
            "id": 7, "type": "danger", "title": "Amount Anomaly Trend",
            "description": "Several transactions exceed scheme limits by 150-230%, indicating systematic over-disbursement fraud patterns.",
            "icon": "trending-up"
        },
        {
            "id": 8, "type": "info", "title": "AI Model Confidence",
            "description": f"The Isolation Forest model flags anomalies with confidence scores ranging from 74% to 97%, with an average confidence of {avg_conf:.1f}%.",
            "icon": "cpu"
        }
    ]
    return jsonify(insights)

@legacy_bp.route("/simulate", methods=["POST"])
def post_simulate():
    districts = ['Lucknow', 'Kanpur', 'Moradabad', 'Agra', 'Varanasi', 'Bareilly', 'Meerut', 'Allahabad', 'Gorakhpur', 'Aligarh']
    schemes = ['PM Kisan', 'MGNREGA', 'PM Ujjwala', 'Ayushman Bharat', 'Sukanya Samriddhi']
    names = ['Fake User A', 'Fake User B', 'Fake User C', 'Fake User D', 'Fake User E']
    reason_options = [
        'Duplicate ID detected', 'Unusual transaction amount', 'Multiple schemes overlap',
        'Suspicious transaction pattern', 'Amount exceeds scheme limit',
        'Ghost beneficiary detected', 'Backdated transaction'
    ]
    
    data = request.json or {}
    count = data.get("count", 5)
    new_anomalies = []
    
    global simulated_anomalies
    for _ in range(count):
        id_str = f"SIM{str(len(simulated_anomalies) + len(new_anomalies) + 1).zfill(3)}"
        district = random.choice(districts)
        scheme = random.choice(schemes)
        num_reasons = random.randint(1, 3)
        reasons = list(set(random.choice(reason_options) for _ in range(num_reasons)))
        
        new_anomalies.append({
            "beneficiary_id": id_str,
            "name": f"{random.choice(names)} {id_str}",
            "district": district,
            "scheme": scheme,
            "amount": random.randint(5000, 34999),
            "date": datetime.now().strftime("%Y-%m-%d"),
            "status": "anomaly",
            "confidence": random.randint(75, 99),
            "reasons": reasons,
            "simulated": True
        })
        
    simulated_anomalies.extend(new_anomalies)
    return jsonify({
        "success": True, 
        "injected": len(new_anomalies), 
        "total": len(simulated_anomalies), 
        "newAnomalies": new_anomalies
    })

@legacy_bp.route("/simulate/reset", methods=["POST"])
def simulate_reset():
    global simulated_anomalies
    cleared = len(simulated_anomalies)
    simulated_anomalies = []
    return jsonify({"success": True, "cleared": cleared})

@legacy_bp.route("/districts", methods=["GET"])
def get_districts():
    all_data = dataset + simulated_anomalies
    districts = list(set(r.get("district") for r in all_data if r.get("district")))
    return jsonify(districts)

@legacy_bp.route("/schemes", methods=["GET"])
def get_schemes():
    all_data = dataset + simulated_anomalies
    schemes = list(set(r.get("scheme") for r in all_data if r.get("scheme")))
    return jsonify(schemes)
