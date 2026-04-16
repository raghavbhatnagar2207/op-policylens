import random
import bcrypt
from datetime import datetime, timedelta
from app import create_app
from models import db, User, Application, DistrictStats, Complaint, Post

# Base Data for Generation
NAMES_CITIZEN = ["Ramesh Kumar", "Sita Devi", "Kavita Rao", "Suresh Iyer", "Vikram Singh", "Priya Desai", "Amit Patel", "Neha Sharma", "Ravi Verma", "Sonia Gupta", "Manoj Tiwari", "Anjali Mehta", "Pooja Das"]
NAMES_ADMIN = ["Rajesh Officer", "Nisha Bureaucrat", "Vijay Admin", "Karan Official"]
DISTRICTS = ["Delhi", "Mumbai", "Chennai", "Kolkata", "Bangalore", "Hyderabad", "Pune", "Jaipur", "Lucknow", "Ahmedabad", "Surat", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal", "Visakhapatnam", "Patna", "Vadodara"]
CATEGORIES = ["General", "OBC", "SC", "ST"]
STATUSES_APP = ["Pending", "Approved", "Rejected"]
STATUSES_COMP = ["Open", "In Progress", "Resolved", "Closed"]
URGENCIES = ["Low", "Medium", "High", "Critical"]
SCHEMES = ["PM Kisan Samman Nidhi", "Ayushman Bharat", "PM Awas Yojana", "Ujjwala Yojana", "Mudra Loan", "Digital India", "Swachh Bharat Mission", "Stand Up India", "StartUp India", "Sukanya Samriddhi Yojana", "Jal Jeevan Mission"]

COMPLAINT_TEXTS = [
    ("The funds for my scholarship haven't arrived yet.", -0.6, "Medium"),
    ("Great portal! Very easy to use.", 0.8, "Low"),
    ("Server is always down when I try to upload documents.", -0.8, "High"),
    ("My Ayushman Bharat card is showing wrong date of birth.", -0.5, "Medium"),
    ("Hospital refused to accept the health card.", -0.9, "Critical"),
    ("I need help understanding the eligibility for agricultural subsidies.", 0.0, "Low"),
    ("Road construction in my ward has been pending for 2 years.", -0.7, "Medium"),
    ("Thank you for the prompt resolution of my housing loan issue.", 0.9, "Low")
]

def generate_users():
    users = []
    # Generate 30 additional Citizens
    for _ in range(30):
        name = random.choice(NAMES_CITIZEN)
        users.append(User(
            name=name,
            email=f"citizen_{random.randint(1000,9999)}@example.com",
            password=bcrypt.hashpw(b"password123", bcrypt.gensalt()).decode(),
            role="Citizen",
            state="Uttar Pradesh",
            city=random.choice(DISTRICTS)
        ))
    
    # Generate 5 additional Authorities
    for _ in range(5):
        name = random.choice(NAMES_ADMIN)
        users.append(User(
            name=name,
            email=f"authority_{random.randint(1000,9999)}@example.com",
            password=bcrypt.hashpw(b"password123", bcrypt.gensalt()).decode(),
            role="Authority"
        ))
    
    db.session.add_all(users)
    db.session.flush()
    return User.query.all()

def add_dummy_data():
    app = create_app()
    with app.app_context():
        print("Starting massive database seeding...")
        
        # 1. Generate more users
        all_users = generate_users()
        citizens = [u for u in all_users if u.role == "Citizen"]
        
        # 2. District Stats (Populate for all districts)
        for dist in DISTRICTS:
            # Check if exists
            if not DistrictStats.query.filter_by(district=dist).first():
                db.session.add(DistrictStats(
                    district=dist,
                    funds_allocated=random.randint(1000000, 10000000),
                    funds_utilized=random.randint(500000, 9000000),
                    beneficiaries=random.randint(500, 5000),
                    delay_days=random.randint(0, 60)
                ))

        # 3. Applications
        for _ in range(100):
            citizen = random.choice(citizens)
            app_req = Application(
                user_id=citizen.id,
                income=random.randint(50000, 1500000),
                marks=random.randint(40, 100),
                category=random.choice(CATEGORIES),
                district=random.choice(DISTRICTS),
                status=random.choice(STATUSES_APP)
            )
            db.session.add(app_req)

        # 4. Complaints
        for _ in range(50):
            citizen = random.choice(citizens)
            text, sentiment, urgency = random.choice(COMPLAINT_TEXTS)
            complaint = Complaint(
                user_id=citizen.id,
                text=text,
                sentiment_score=sentiment,
                urgency=urgency,
                status=random.choice(STATUSES_COMP)
            )
            db.session.add(complaint)

        # 5. More Posts
        for _ in range(80):
            citizen = random.choice(citizens)
            post = Post(
                user_id=citizen.id,
                scheme_name=random.choice(SCHEMES),
                content=f"Just sharing my experience regarding {random.choice(SCHEMES)}... very informative!",
                likes_count=random.randint(0, 150)
            )
            db.session.add(post)

        db.session.commit()
        print("Seeding Complete: Added 35 Users, 100 Applications, 50 Complaints, 80 Posts, and multiple District Stats!")

if __name__ == "__main__":
    add_dummy_data()
