import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { fetchAPI, formatCurrency } from '../lib/utils';
import {
  FlaskConical, Play, RotateCcw, Zap, AlertTriangle, TrendingUp,
  Activity, Sparkles
} from 'lucide-react';

const COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Simulation() {
  const [riskScores, setRiskScores] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [simCount, setSimCount] = useState(5);
  const [simulating, setSimulating] = useState(false);
  const [history, setHistory] = useState([]);
  const [totalInjected, setTotalInjected] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const [risk, anom] = await Promise.all([
      fetchAPI('/risk-score'),
      fetchAPI('/anomalies'),
    ]);
    setRiskScores(risk);
    setAnomalies(anom);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSimulate = async () => {
    setSimulating(true);
    const result = await fetchAPI('/simulate', {
      method: 'POST',
      body: JSON.stringify({ count: simCount }),
    });
    if (result.success) {
      setTotalInjected(result.total);
      setHistory(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        count: result.injected,
        anomalies: result.newAnomalies,
      }]);
      await loadData();
    }
    setSimulating(false);
  };

  const handleReset = async () => {
    await fetchAPI('/simulate/reset', { method: 'POST' });
    setTotalInjected(0);
    setHistory([]);
    await loadData();
  };

  // Prepare chart data
  const districtAnomalyData = riskScores.map(r => ({
    name: r.district,
    riskScore: r.riskScore,
    anomalies: r.anomalyCount,
  }));

  const schemeBreakdown = {};
  anomalies.forEach(a => {
    schemeBreakdown[a.scheme] = (schemeBreakdown[a.scheme] || 0) + 1;
  });
  const schemePieData = Object.entries(schemeBreakdown).map(([name, value]) => ({ name, value }));

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-surface-500">Loading simulation data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="page-title">Simulation Mode</h1>
          <span className="badge bg-gradient-to-r from-amber-500 to-red-500 text-white">
            <FlaskConical className="w-3 h-3 mr-1" /> Sandbox
          </span>
        </div>
        <p className="page-subtitle">Inject simulated fraud anomalies and observe real-time impact on dashboards</p>
      </div>

      {/* Controls */}
      <div className="glass-card p-5 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/10 to-red-500/10 dark:from-amber-500/20 dark:to-red-500/20">
              <Zap className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h3 className="font-semibold">Fraud Simulator</h3>
              <p className="text-xs text-surface-400">Inject fake anomaly records into the live dataset</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Count:</label>
              <select
                className="input-field w-20 py-2"
                value={simCount}
                onChange={e => setSimCount(parseInt(e.target.value))}
              >
                {[1, 3, 5, 10, 15, 20].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSimulate}
              disabled={simulating}
              className="btn-primary flex items-center gap-2"
            >
              {simulating ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Simulate Fraud
            </button>

            <button
              onClick={handleReset}
              className="btn-secondary flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
            <p className="text-xs text-surface-400">Injected</p>
            <p className="text-xl font-bold text-amber-500">{totalInjected}</p>
          </div>
          <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
            <p className="text-xs text-surface-400">Total Anomalies</p>
            <p className="text-xl font-bold text-red-500">{anomalies.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
            <p className="text-xs text-surface-400">Simulations Run</p>
            <p className="text-xl font-bold text-primary-500">{history.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
            <p className="text-xs text-surface-400">Avg Risk Score</p>
            <p className="text-xl font-bold text-accent-500">
              {riskScores.length > 0 ? Math.round(riskScores.reduce((s, r) => s + r.riskScore, 0) / riskScores.length) : 0}
            </p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Live Risk Bar Chart */}
        <div className="glass-card p-5">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary-500" />
            Live Risk Scores
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={districtAnomalyData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(255,255,255,0.95)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  fontSize: '13px'
                }}
              />
              <Bar dataKey="riskScore" name="Risk Score" fill="#6366f1" radius={[6, 6, 0, 0]} />
              <Bar dataKey="anomalies" name="Anomalies" fill="#ef4444" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Scheme Pie */}
        <div className="glass-card p-5">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent-500" />
            Anomalies by Scheme (Live)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={schemePieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={95}
                dataKey="value"
                nameKey="name"
                paddingAngle={3}
              >
                {schemePieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.95)', border: 'none', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Simulation History */}
      <div className="glass-card">
        <div className="p-4 border-b border-surface-200/50 dark:border-surface-700/50">
          <h3 className="text-base font-semibold">Simulation History</h3>
        </div>
        {history.length === 0 ? (
          <div className="p-8 text-center text-surface-400">
            <FlaskConical className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No simulations run yet. Click "Simulate Fraud" to begin.</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100 dark:divide-surface-700/50 max-h-64 overflow-y-auto">
            {history.map((h, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-3 flex items-center gap-4 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition"
              >
                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Injected {h.count} anomalies</p>
                  <p className="text-xs text-surface-400">
                    Districts affected: {[...new Set(h.anomalies.map(a => a.district))].join(', ')}
                  </p>
                </div>
                <span className="text-xs text-surface-400">{h.time}</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
