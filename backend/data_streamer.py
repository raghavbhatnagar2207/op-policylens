import random
import logging
from textblob import TextBlob
from apscheduler.schedulers.background import BackgroundScheduler
from models import db, Complaint

logger = logging.getLogger(__name__)

COMPLAINT_TEXTS = [
    "I have not received my funds for PM-Kisan yet. It has been 3 months.",
    "The hospital charged me extra money despite Ayushman Bharat card! Shocking service.",
    "House construction stopped because PMAY funds are blocked by local official. Need urgent help.",
    "MGNREGA wages are delayed again. How do we survive?",
    "Everything works perfectly, thank you for the scheme.",
    "Process is very smooth now but took a while to register.",
    "The middleman asked for a 10% cut to release the Ayushman Bharat funds! Outrageous.",
    "Very happy with the prompt response from the block officer.",
    "My loan was rejected without any valid reason provided. Absolute corruption.",
    "Excellent portal layout, I could find my application easily."
]

def inject_live_data(app):
    """Background job that generates synthetic live data to mimic real-world usage."""
    with app.app_context():
        try:
            # Check if there's any user to tie complaints to
            from models import User
            admin = User.query.filter_by(role="Authority").first()
            user_id = admin.id if admin else 1

            # 1) Inject a random localized NLP Complaint
            text = random.choice(COMPLAINT_TEXTS)
            sentiment = TextBlob(text).sentiment.polarity
            
            if sentiment < -0.5:
                urgency = "Critical"
            elif sentiment < 0:
                urgency = "High"
            elif sentiment < 0.5:
                urgency = "Medium"
            else:
                urgency = "Low"
            
            c = Complaint(user_id=user_id, text=text, sentiment_score=sentiment, urgency=urgency)
            db.session.add(c)
            db.session.commit()
            
            logger.info("Live data stream: Injected 1 new AI-graded Complaint.")
        except Exception as e:
            logger.error(f"Live data stream error: {e}")

def start_streamer(app):
    """Initialize the APScheduler to run in the background thread."""
    scheduler = BackgroundScheduler()
    # Fire the stream every 45 seconds to keep the dashboard flowing with data
    scheduler.add_job(func=inject_live_data, args=[app], trigger="interval", seconds=45)
    scheduler.start()
    return scheduler
