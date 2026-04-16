"""
PolicyLens AI — Citizen Voices Routes (Twitter-like Scheme Discussions)
GET    /api/posts              — Fetch feed of posts (latest first)
POST   /api/posts              — Create a new post (Citizens only)
POST   /api/posts/<id>/like    — Toggle like on a post
GET    /api/posts/trending     — Get top trending schemes
"""
import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from sqlalchemy import func

from models import db, Post, PostLike, User

logger = logging.getLogger(__name__)

posts_bp = Blueprint("posts", __name__)


# ---------------------------------------------------------------------------
# GET /api/posts — Fetch feed
# ---------------------------------------------------------------------------
@posts_bp.route("/api/posts", methods=["GET"])
@jwt_required()
def get_posts():
    """Return all posts sorted by latest first, with author info and like status."""
    user_id = int(get_jwt_identity())
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 30, type=int)

    posts = Post.query.order_by(Post.created_at.desc()).limit(per_page).offset((page - 1) * per_page).all()

    results = []
    for p in posts:
        # Check if current user liked this post
        user_liked = PostLike.query.filter_by(post_id=p.id, user_id=user_id).first() is not None

        results.append({
            "id": p.id,
            "author_name": p.author.name if p.author else "Unknown",
            "author_role": p.author.role if p.author else "Citizen",
            "scheme_name": p.scheme_name,
            "content": p.content,
            "likes_count": p.likes_count,
            "user_liked": user_liked,
            "created_at": p.created_at.isoformat(),
        })

    return jsonify({"posts": results}), 200


# ---------------------------------------------------------------------------
# POST /api/posts — Create a new post (Citizens only)
# ---------------------------------------------------------------------------
@posts_bp.route("/api/posts", methods=["POST"])
@jwt_required()
def create_post():
    """Create a new scheme discussion post."""
    claims = get_jwt()
    if claims.get("role") != "Citizen":
        return jsonify({"error": "Only citizens can create posts"}), 403

    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    content = data.get("content", "").strip()
    scheme_name = data.get("scheme_name", "").strip()

    if not content:
        return jsonify({"error": "Post content cannot be empty"}), 400
    if len(content) > 280:
        return jsonify({"error": "Post must be 280 characters or less"}), 400
    if not scheme_name:
        return jsonify({"error": "Please select a scheme to discuss"}), 400

    post = Post(user_id=user_id, content=content, scheme_name=scheme_name)
    db.session.add(post)
    db.session.commit()

    user = User.query.get(user_id)
    logger.info("New post by %s about '%s'", user.name, scheme_name)

    return jsonify({
        "message": "Post created!",
        "post": {
            "id": post.id,
            "author_name": user.name,
            "author_role": user.role,
            "scheme_name": post.scheme_name,
            "content": post.content,
            "likes_count": 0,
            "user_liked": False,
            "created_at": post.created_at.isoformat(),
        }
    }), 201


# ---------------------------------------------------------------------------
# POST /api/posts/<id>/like — Toggle like
# ---------------------------------------------------------------------------
@posts_bp.route("/api/posts/<int:post_id>/like", methods=["POST"])
@jwt_required()
def toggle_like(post_id):
    """Toggle the current user's like on a post."""
    user_id = int(get_jwt_identity())

    post = Post.query.get(post_id)
    if not post:
        return jsonify({"error": "Post not found"}), 404

    existing_like = PostLike.query.filter_by(post_id=post_id, user_id=user_id).first()

    if existing_like:
        # Unlike
        db.session.delete(existing_like)
        post.likes_count = max(0, post.likes_count - 1)
        liked = False
    else:
        # Like
        new_like = PostLike(post_id=post_id, user_id=user_id)
        db.session.add(new_like)
        post.likes_count += 1
        liked = True

    db.session.commit()

    return jsonify({
        "liked": liked,
        "likes_count": post.likes_count,
    }), 200


# ---------------------------------------------------------------------------
# GET /api/posts/trending — Trending schemes
# ---------------------------------------------------------------------------
@posts_bp.route("/api/posts/trending", methods=["GET"])
@jwt_required()
def trending_schemes():
    """Return the top 5 most discussed schemes."""
    results = (
        db.session.query(Post.scheme_name, func.count(Post.id).label("post_count"))
        .group_by(Post.scheme_name)
        .order_by(func.count(Post.id).desc())
        .limit(5)
        .all()
    )

    trending = [
        {"scheme_name": r[0], "post_count": r[1]}
        for r in results
    ]

    return jsonify({"trending": trending}), 200
