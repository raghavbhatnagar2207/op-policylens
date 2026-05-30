"""
PolicyLens AI — ML Model Training

Trains two models on synthetic data and saves them to model.pkl:
  1. RandomForestClassifier  — scheme approval prediction
  2. IsolationForest          — anomaly / fraud detection
"""
import os
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.model_selection import train_test_split

# Reproducibility
np.random.seed(42)

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model.pkl")

# ── Category / district encoding maps (shared with prediction route) ──────
CATEGORIES = {"General": 0, "OBC": 1, "SC": 2, "ST": 3}
DISTRICTS = {
    "Delhi": 0, "Mumbai": 1, "Chennai": 2, "Kolkata": 3,
    "Bangalore": 4, "Hyderabad": 5, "Pune": 6, "Jaipur": 7,
    "Lucknow": 8, "Ahmedabad": 9,
}


def generate_approval_data(n: int = 1000) -> pd.DataFrame:
    """Create synthetic approval dataset."""
    data = {
        "income": np.random.randint(10000, 1000000, n),
        "marks": np.random.randint(30, 100, n),
        "category": np.random.randint(0, len(CATEGORIES), n),
        "district": np.random.randint(0, len(DISTRICTS), n),
    }
    df = pd.DataFrame(data)

    # Label: approved (1) if income < 500000 AND marks >= 50
    df["approved"] = ((df["income"] < 500000) & (df["marks"] >= 50)).astype(int)
    # Add some noise
    noise_idx = np.random.choice(n, size=int(n * 0.05), replace=False)
    df.loc[noise_idx, "approved"] = 1 - df.loc[noise_idx, "approved"]
    return df


def generate_anomaly_data(n: int = 500) -> pd.DataFrame:
    """Create synthetic district-stats data for anomaly training."""
    data = {
        "funds_allocated": np.random.uniform(100000, 10000000, n),
        "funds_utilized": np.random.uniform(50000, 10000000, n),
        "delay_days": np.random.randint(0, 365, n),
    }
    df = pd.DataFrame(data)
    # Inject some clear anomalies
    anomaly_idx = np.random.choice(n, size=int(n * 0.05), replace=False)
    df.loc[anomaly_idx, "funds_utilized"] = df.loc[anomaly_idx, "funds_allocated"] * 2.5
    df.loc[anomaly_idx, "delay_days"] = np.random.randint(300, 700, len(anomaly_idx))
    return df


def train_models():
    """Train and persist both models."""
    # --- 1. Approval model ---
    approval_df = generate_approval_data()
    X_approval = approval_df[["income", "marks", "category", "district"]]
    y_approval = approval_df["approved"]
    X_train, X_test, y_train, y_test = train_test_split(
        X_approval, y_approval, test_size=0.2, random_state=42
    )

    rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
    rf_model.fit(X_train, y_train)
    accuracy = rf_model.score(X_test, y_test)
    print(f"[OK] Approval model accuracy: {accuracy:.2%}")

    # --- 2. Anomaly model ---
    anomaly_df = generate_anomaly_data()
    iso_model = IsolationForest(contamination=0.05, random_state=42)
    iso_model.fit(anomaly_df[["funds_allocated", "funds_utilized", "delay_days"]])
    print("[OK] Anomaly detection model trained")

    # --- Save ---
    models = {
        "approval_model": rf_model,
        "anomaly_model": iso_model,
        "categories": CATEGORIES,
        "districts": DISTRICTS,
    }
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(models, f)
    print(f"[OK] Models saved to {MODEL_PATH}")

    return models


if __name__ == "__main__":
    train_models()
