from app import create_app
from models import db, Post, User
import random

dummy_posts = [
    ("PM Kisan Samman Nidhi", "Received the latest installment today. Very helpful for buying seeds!"),
    ("Ayushman Bharat", "Got my father's surgery done cashless. Grateful for this scheme."),
    ("PM Awas Yojana", "Finally got the approval letter for my housing subsidy."),
    ("Ujjwala Yojana", "Gas connection has made cooking so much healthier for my family!"),
    ("Mudra Loan", "Used the loan to expand my small tailoring business. Things are looking up."),
    ("Digital India", "Internet access in rural areas is improving. Helps students a lot."),
    ("PM Jan Dhan Yojana", "Opened an account easily without any minimum balance hassle."),
    ("Swachh Bharat Mission", "Our village finally has proper sanitation facilities."),
    ("Stand Up India", "Great initiative for SC/ST women entrepreneurs, but the process took too long."),
    ("StartUp India", "Got tax exemption for my new AI startup. Highly recommend applying!"),
    ("PM Kisan Samman Nidhi", "Still waiting for my installment for this month. Does anyone know why it's delayed?"),
    ("Ayushman Bharat", "The empanelled hospital list in my district is too small. Need more hospitals connected."),
    ("PM Awas Yojana", "Does anyone know if the documents needed for this have changed this year?"),
    ("Mudra Loan", "The bank manager was super helpful in getting the forms filled out."),
]

def seed_posts():
    app = create_app()
    with app.app_context():
        users = User.query.filter_by(role="Citizen").all()
        if not users:
            print("No citizen users found in the database. Please ensure the database is seeded with users first.")
            return

        print(f"Assigning dummy posts to {len(users)} citizens...")
        
        # We will add 30 random assignments
        for _ in range(30):
            user = random.choice(users)
            scheme, content = random.choice(dummy_posts)
            likes = random.randint(0, 50)
            
            post = Post(
                user_id=user.id,
                scheme_name=scheme,
                content=content,
                likes_count=likes
            )
            db.session.add(post)

        db.session.commit()
        print("Successfully added 30 dummy posts to Citizen Voice!")

if __name__ == "__main__":
    seed_posts()
