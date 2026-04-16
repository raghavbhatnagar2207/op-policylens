import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquareWarning, Send, AlertTriangle, CheckCircle, Clock, ShieldAlert } from 'lucide-react';
import { fetchAPI, API_BASE } from '../lib/utils';
import { useTranslation } from 'react-i18next';

export default function Complaints() {
  const role = localStorage.getItem('role') || 'Citizen';
  const isCitizen = role === 'Citizen';
  const { t } = useTranslation();
  
  const [complaints, setComplaints] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!isCitizen) {
      loadComplaints();
    }
  }, [isCitizen]);

  const loadComplaints = async () => {
    try {
      const data = await fetchAPI('/api/complaints');
      if (data.complaints) {
        setComplaints(data.complaints);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/complaints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, ...data });
        setText('');
      } else {
        setResult({ success: false, error: data.error });
      }
    } catch (err) {
      setResult({ success: false, error: 'Failed to submit' });
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency) => {
    switch(urgency) {
      case 'Critical': return 'badge-danger bg-red-100 text-red-800 border-red-200';
      case 'High': return 'badge-warning bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium': return 'badge-warning bg-amber-100 text-amber-800 border-amber-200';
      default: return 'badge-success bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="page-title">{isCitizen ? 'Submit a Complaint' : 'Complaints Inbox'}</h1>
        <p className="page-subtitle">
          {isCitizen 
            ? 'Detail your issue below. Our AI immediately analyzes and routes urgent requests.' 
            : 'AI-sorted public complaints requiring attention.'}
        </p>
      </div>

      {isCitizen ? (
        /* ============ CITIZEN VIEW — File a Complaint ============ */
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
          <div className="glass-card p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-accent-500" />
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2">Issue Description</label>
                <textarea
                  required
                  rows={6}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Describe the policy issue, fraud, or delay you are experiencing in detail..."
                  className="w-full px-4 py-3 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none resize-none"
                />
              </div>

              {result && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`p-4 rounded-xl border ${result.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300' : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'}`}>
                  {result.success ? (
                    <div className="flex gap-3">
                      <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold mb-1">Complaint Received</p>
                        <p className="text-sm opacity-90">Our NLP engine flagged this as <strong>{result.urgency}</strong> urgency (Sentiment: {result.sentiment?.toFixed(2)}).</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <p className="text-sm font-medium">{result.error}</p>
                    </div>
                  )}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading || !text.trim()}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-500 hover:to-accent-500 text-white font-bold tracking-wide transition-all shadow-lg shadow-primary-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                    Submit to AI Routing
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>
      ) : (
        /* ============ AUTHORITY VIEW — Read-only Complaints Table ============ */
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Info Banner */}
          <div className="mb-6 p-4 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800/50 flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
            <p className="text-sm text-teal-700 dark:text-teal-300 font-medium">
              Authority View — You can review and monitor citizen complaints. Only citizens can file new complaints.
            </p>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-surface-200/50 dark:border-surface-700/50 bg-surface-50/50 dark:bg-surface-800/50">
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-surface-500">Subject</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-surface-500 w-32">Urgency</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-surface-500 w-32">Sentiment</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-surface-500 w-40">Date</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-surface-500 w-32">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800 text-sm">
                  {complaints.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-surface-400">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        No complaints in the system.
                      </td>
                    </tr>
                  ) : (
                    complaints.map(c => (
                      <tr key={c.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-surface-900 dark:text-surface-100 line-clamp-2">{c.text}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getUrgencyColor(c.urgency)}`}>
                            {c.urgency === 'Critical' && <AlertTriangle className="w-3 h-3 mr-1" />}
                            {c.urgency}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs text-surface-500">{c.sentiment.toFixed(2)}</span>
                        </td>
                        <td className="px-6 py-4 text-surface-500">
                          {new Date(c.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                            <Clock className="w-4 h-4" />
                            {c.status}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
