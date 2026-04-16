from app import create_app
from models import db, Complaint, User
from datetime import datetime, timedelta
import random

app = create_app()

def seed_complaints():
    with app.app_context():
        users = User.query.filter_by(role='Citizen').all()
        if not users:
            print('ERROR: No Citizen users found. Please create a citizen account first.')
            return

        complaints_data = [
            ('The road construction was abandoned midway, causing massive dust and accidents.', -0.8, 'High', 'Open'),
            ('Hospital staff asked for a bribe to process my Ayushman card. Completely unacceptable!', -0.9, 'Critical', 'Open'),
            ('My MGNREGA wages are delayed by over 3 months. How am I supposed to feed my family?', -0.7, 'High', 'Open'),
            ('The ration shop dealer is giving less grain than mandated and overcharging us.', -0.8, 'Critical', 'Open'),
            ('School building roof is leaking badly during rains. Children have to sit in water.', -0.6, 'High', 'Open'),
            ('No drinking water supply in our ward for the last 5 days. Tankers are charging high rates.', -0.8, 'Critical', 'In Progress'),
            ('Street lights installed 2 weeks ago have already stopped working. Poor quality materials used.', -0.4, 'Medium', 'Open'),
            ('Garbage hasn\'t been collected from our colony for a week. The smell is unbearable.', -0.5, 'Medium', 'Resolved'),
            ('Panchayat officials are showing favoritisim in allocating PM Awas Yojana houses.', -0.7, 'High', 'Open'),
            ('Online portal to apply for scholarship keeping crashing. I missed the deadline.', -0.5, 'Medium', 'Resolved'),
        ]

        if Complaint.query.count() < 5:
            for text, sentiment, urgency, status in complaints_data:
                user = random.choice(users)
                comp = Complaint(
                    user_id=user.id,
                    text=text,
                    sentiment_score=sentiment,
                    urgency=urgency,
                    status=status,
                    created_at=datetime.utcnow() - timedelta(days=random.randint(1, 15))
                )
                db.session.add(comp)
            
            db.session.commit()
            print('✅ SUCCESS: Fake Complaints Seeded Successfully!')
        else:
            print('ℹ️ SKIPPED: Complaints already exist in the database.')

if __name__ == '__main__':
    seed_complaints()
