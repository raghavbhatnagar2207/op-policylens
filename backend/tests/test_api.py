import pytest
from app import app as flask_app
from models import db

@pytest.fixture
def app():
    # Configure Flask app for testing in memory to avoid writing to database.db
    flask_app.config["TESTING"] = True
    flask_app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    
    with flask_app.app_context():
        # Re-create fresh database explicitly for testing
        db.create_all()
        yield flask_app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

def test_signup_and_login(client):
    """End-to-End Test for the Authentication Flow"""
    # 1. Register a new mock user
    res_signup = client.post("/api/signup", json={
        "name": "Automated Tester", 
        "email": "ci-cd-tester@ai.com", 
        "password": "securepassword123", 
        "role": "Citizen"
    })
    assert res_signup.status_code == 201
    
    # 2. Assert they can login and receive a valid JSON Web Token
    res_login = client.post("/api/login", json={
        "email": "ci-cd-tester@ai.com", 
        "password": "securepassword123"
    })
    assert res_login.status_code == 200
    
    data = res_login.get_json()
    assert "access_token" in data
    assert data["user"]["role"] == "Citizen"

def test_nlp_complaint(client):
    """Test the NLP Deep Learning text parser route logic."""
    # First acquire a mock JWT
    client.post("/api/signup", json={
        "name": "Mr Angry", "email": "angry@ai.com", "password": "123", "role": "Citizen"
    })
    auth = client.post("/api/login", json={"email": "angry@ai.com", "password": "123"}).get_json()
    token = auth["access_token"]

    # Send an extremely angry simulated complaint
    res_complaint = client.post("/api/complaints", json={
        "text": "This is completely terrible and unacceptable! Horrible delays!"
    }, headers={"Authorization": f"Bearer {token}"})

    assert res_complaint.status_code == 201
    data = res_complaint.get_json()
    # Ensure TextBlob successfully caught the negative polarity
    assert data["sentiment"] < 0
    assert data["urgency"] in ["Critical", "High"]
