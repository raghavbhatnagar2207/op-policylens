"""
PolicyLens AI — Database Models (SQLAlchemy)
"""
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


class User(db.Model):
    """Registered user — Citizen or Authority."""
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password = db.Column(db.String(256), nullable=False)  # bcrypt hash
    role = db.Column(db.String(20), nullable=False, default="Citizen")  # Citizen | Authority
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Profile fields
    phone = db.Column(db.String(15), nullable=True, unique=True, index=True)
    address = db.Column(db.String(256), nullable=True)
    city = db.Column(db.String(100), nullable=True)
    state = db.Column(db.String(100), nullable=True, default="Uttar Pradesh")
    aadhaar_last4 = db.Column(db.String(4), nullable=True)
    bio = db.Column(db.Text, nullable=True)

    # Relationship
    applications = db.relationship("Application", backref="user", lazy=True)

    def __repr__(self):
        return f"<User {self.email} ({self.role})>"


class Application(db.Model):
    """Scheme / policy application submitted by a citizen."""
    __tablename__ = "applications"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    income = db.Column(db.Float, nullable=False)
    marks = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    district = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="Pending")  # Pending | Approved | Rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Application {self.id} — {self.status}>"


class DistrictStats(db.Model):
    """Aggregated district-level policy statistics."""
    __tablename__ = "district_stats"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    district = db.Column(db.String(100), nullable=False)
    funds_allocated = db.Column(db.Float, nullable=False, default=0)
    funds_utilized = db.Column(db.Float, nullable=False, default=0)
    beneficiaries = db.Column(db.Integer, nullable=False, default=0)
    delay_days = db.Column(db.Integer, nullable=False, default=0)

    def __repr__(self):
        return f"<DistrictStats {self.district}>"

class Complaint(db.Model):
    """Citizen complaint / feedback with NLP sentiment scoring."""
    __tablename__ = "complaints"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    text = db.Column(db.Text, nullable=False)
    sentiment_score = db.Column(db.Float, nullable=False)  # -1.0 to 1.0
    urgency = db.Column(db.String(20), nullable=False)     # Low | Medium | High | Critical
    status = db.Column(db.String(20), nullable=False, default="Open")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Complaint {self.id} — Urgency: {self.urgency}>"


class Post(db.Model):
    """Citizen Voices — public scheme discussions (Twitter-like)."""
    __tablename__ = "posts"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    scheme_name = db.Column(db.String(150), nullable=False)
    content = db.Column(db.String(280), nullable=False)
    likes_count = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    author = db.relationship("User", backref="posts", lazy=True)
    likes = db.relationship("PostLike", backref="post", lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Post {self.id} by User {self.user_id}>"


class PostLike(db.Model):
    """Tracks which user liked which post (prevents double-liking)."""
    __tablename__ = "post_likes"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    post_id = db.Column(db.Integer, db.ForeignKey("posts.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Unique constraint: one like per user per post
    __table_args__ = (db.UniqueConstraint("post_id", "user_id", name="uq_post_user_like"),)

    def __repr__(self):
        return f"<PostLike post={self.post_id} user={self.user_id}>"

