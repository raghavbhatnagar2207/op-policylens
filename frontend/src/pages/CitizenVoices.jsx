import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, Heart, Send, TrendingUp, Hash, Clock,
  Sparkles, Users, Loader2, AlertTriangle
} from 'lucide-react';
import { API_BASE } from '../lib/utils';

const SCHEMES = [
  'PM Kisan Samman Nidhi', 'MGNREGA', 'PM Ujjwala Yojana',
  'Ayushman Bharat (PM-JAY)', 'PM Awas Yojana', 'Sukanya Samriddhi Yojana',
  'National Pension Scheme', 'PM Mudra Yojana', 'Atal Pension Yojana',
  'Pradhan Mantri Fasal Bima Yojana', 'Digital India', 'Swachh Bharat Mission',
  'Skill India Mission', 'Make in India', 'Beti Bachao Beti Padhao',
];

const SCHEME_COLORS = [
  'from-indigo-500 to-blue-500', 'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500', 'from-rose-500 to-pink-500',
  'from-violet-500 to-purple-500', 'from-cyan-500 to-sky-500',
  'from-lime-500 to-green-500', 'from-fuchsia-500 to-pink-500',
];

function getSchemeColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return SCHEME_COLORS[Math.abs(hash) % SCHEME_COLORS.length];
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function CitizenVoices() {
  const [posts, setPosts] = useState([]);
  const [trending, setTrending] = useState([]);
  const [content, setContent] = useState('');
  const [schemeName, setSchemeName] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  useEffect(() => {
    loadFeed();
    loadTrending();
  }, []);

  const loadFeed = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/posts`, { headers });
      const data = await res.json();
      if (data.posts) setPosts(data.posts);
    } catch (err) {
      setError('Failed to load feed');
    } finally {
      setLoading(false);
    }
  };

  const loadTrending = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/posts/trending`, { headers });
      const data = await res.json();
      if (data.trending) setTrending(data.trending);
    } catch (err) { /* ignore */ }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!content.trim() || !schemeName) return;
    setPosting(true);
    try {
      const res = await fetch(`${API_BASE}/api/posts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: content.trim(), scheme_name: schemeName }),
      });
      const data = await res.json();
      if (res.ok && data.post) {
        setPosts([data.post, ...posts]);
        setContent('');
        setSchemeName('');
        loadTrending();
      }
    } catch (err) {
      setError('Failed to post');
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId) => {
    // Optimistic UI update
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          user_liked: !p.user_liked,
          likes_count: p.user_liked ? p.likes_count - 1 : p.likes_count + 1,
        };
      }
      return p;
    }));

    try {
      await fetch(`${API_BASE}/api/posts/${postId}/like`, {
        method: 'POST',
        headers,
      });
    } catch (err) {
      // Revert on failure
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            user_liked: !p.user_liked,
            likes_count: p.user_liked ? p.likes_count - 1 : p.likes_count + 1,
          };
        }
        return p;
      }));
    }
  };

  const charCount = content.length;
  const charColor = charCount > 260 ? 'text-red-500' : charCount > 220 ? 'text-amber-500' : 'text-surface-400';

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="page-title flex items-center gap-2">
          <MessageCircle className="w-7 h-7 text-primary-500" />
          Citizen Voices
        </h1>
        <p className="page-subtitle">Share your experience, review government schemes, and hear from fellow citizens</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-4">
          {/* Compose Box */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden">
            <div className="p-1.5 bg-gradient-to-r from-primary-500 to-accent-500" />
            <form onSubmit={handlePost} className="p-5">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  Y
                </div>
                <div className="flex-1 space-y-3">
                  <select
                    value={schemeName}
                    onChange={(e) => setSchemeName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-sm font-medium focus:ring-2 focus:ring-primary-500/50 focus:border-transparent outline-none transition-all"
                  >
                    <option value="">Select a scheme to discuss...</option>
                    {SCHEMES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value.slice(0, 280))}
                    placeholder="Share your experience with this scheme..."
                    rows={3}
                    required
                    className="w-full px-3 py-2.5 rounded-lg bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-sm focus:ring-2 focus:ring-primary-500/50 focus:border-transparent outline-none resize-none transition-all"
                  />
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-mono ${charColor}`}>{charCount}/280</span>
                    <button
                      type="submit"
                      disabled={posting || !content.trim() || !schemeName}
                      className="flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-500 hover:to-accent-500 text-white text-sm font-bold shadow-lg shadow-primary-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Post
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </motion.div>

          {/* Feed */}
          {loading ? (
            <div className="glass-card p-12 text-center">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary-500" />
              <p className="text-sm text-surface-400 mt-3">Loading citizen voices...</p>
            </div>
          ) : error ? (
            <div className="glass-card p-8 text-center">
              <AlertTriangle className="w-8 h-8 mx-auto text-red-400 mb-2" />
              <p className="text-red-500 font-medium">{error}</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <MessageCircle className="w-12 h-12 mx-auto text-surface-300 mb-3" />
              <p className="text-lg font-medium text-surface-500">No voices yet</p>
              <p className="text-sm text-surface-400 mt-1">Be the first to share your thoughts on a government scheme!</p>
            </div>
          ) : (
            <AnimatePresence>
              {posts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card p-5 hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex gap-3">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getSchemeColor(post.author_name)} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                      {post.author_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-surface-900 dark:text-surface-100">{post.author_name}</span>
                        <span className="text-xs text-surface-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeAgo(post.created_at)}
                        </span>
                      </div>

                      {/* Scheme badge */}
                      <div className="mt-1.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${getSchemeColor(post.scheme_name)}`}>
                          <Hash className="w-3 h-3" />
                          {post.scheme_name}
                        </span>
                      </div>

                      {/* Content */}
                      <p className="text-sm text-surface-700 dark:text-surface-300 mt-2.5 leading-relaxed">
                        {post.content}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-4 mt-3 pt-2 border-t border-surface-100 dark:border-surface-800">
                        <button
                          onClick={() => handleLike(post.id)}
                          className={`flex items-center gap-1.5 text-sm font-medium transition-all duration-200 group ${
                            post.user_liked
                              ? 'text-red-500'
                              : 'text-surface-400 hover:text-red-500'
                          }`}
                        >
                          <Heart
                            className={`w-4 h-4 transition-transform group-hover:scale-125 ${
                              post.user_liked ? 'fill-red-500' : ''
                            }`}
                          />
                          {post.likes_count > 0 && post.likes_count}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Sidebar — Trending */}
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card sticky top-4"
          >
            <div className="p-4 border-b border-surface-200/50 dark:border-surface-700/50">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary-500" />
                Trending Schemes
              </h3>
            </div>
            <div className="p-2">
              {trending.length === 0 ? (
                <p className="text-xs text-surface-400 p-3 text-center">No trending schemes yet. Start posting!</p>
              ) : (
                trending.map((t, i) => (
                  <div key={t.scheme_name} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors cursor-default">
                    <span className="text-lg font-bold text-surface-300 dark:text-surface-600 w-6 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-surface-800 dark:text-surface-200 truncate">{t.scheme_name}</p>
                      <p className="text-xs text-surface-400">{t.post_count} {t.post_count === 1 ? 'post' : 'posts'}</p>
                    </div>
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getSchemeColor(t.scheme_name)} flex items-center justify-center`}>
                      <Hash className="w-4 h-4 text-white" />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Info */}
            <div className="p-4 border-t border-surface-200/50 dark:border-surface-700/50">
              <div className="flex items-start gap-2 text-xs text-surface-400">
                <Sparkles className="w-4 h-4 shrink-0 text-primary-500 mt-0.5" />
                <p>Share honest reviews to help fellow citizens. Top voices help shape policy recommendations.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
