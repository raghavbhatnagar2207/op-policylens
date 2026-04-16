import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fetchAPI } from '../lib/utils';
import {
  AlertTriangle, ShieldAlert, BarChart3, ShieldCheck, Users,
  MessageCircle, TrendingUp, Cpu, Sparkles
} from 'lucide-react';

const iconMap = {
  'alert-triangle': AlertTriangle,
  'shield-alert': ShieldAlert,
  'bar-chart': BarChart3,
  'shield-check': ShieldCheck,
  'users': Users,
  'message-circle': MessageCircle,
  'trending-up': TrendingUp,
  'cpu': Cpu,
};

const typeStyles = {
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30',
    icon: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    badge: 'badge-warning',
  },
  danger: {
    bg: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30',
    icon: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    badge: 'badge-danger',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30',
    icon: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    badge: 'badge-info',
  },
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30',
    icon: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    badge: 'badge-success',
  },
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

export default function Insights() {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAPI('/insights').then(data => {
      setInsights(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-surface-500">Generating AI insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="page-title">AI Insights</h1>
          <span className="badge bg-gradient-to-r from-primary-500 to-accent-500 text-white">
            <Sparkles className="w-3 h-3 mr-1" /> Auto-Generated
          </span>
        </div>
        <p className="page-subtitle">Intelligent analysis & pattern detection powered by Isolation Forest AI model</p>
      </div>

      {/* Insight summary bar */}
      <div className="glass-card p-4 mb-6 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-surface-500">{insights.filter(i => i.type === 'danger').length} Critical</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-surface-500">{insights.filter(i => i.type === 'warning').length} Warnings</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-surface-500">{insights.filter(i => i.type === 'info').length} Informational</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-surface-500">{insights.filter(i => i.type === 'success').length} Positive</span>
        </div>
      </div>

      {/* Insights Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {insights.map(insight => {
          const styles = typeStyles[insight.type] || typeStyles.info;
          const Icon = iconMap[insight.icon] || Sparkles;
          return (
            <motion.div
              key={insight.id}
              variants={item}
              className={`rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${styles.bg}`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl shrink-0 ${styles.icon}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-semibold">{insight.title}</h3>
                    <span className={styles.badge}>
                      {insight.type === 'danger' ? 'Critical' : insight.type === 'warning' ? 'Warning' : insight.type === 'success' ? 'Positive' : 'Info'}
                    </span>
                  </div>
                  <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                    {insight.description}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
