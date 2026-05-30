import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import {
  AlertTriangle, TrendingUp, Users, IndianRupee, ShieldAlert, Eye,
  ChevronRight, ArrowUpRight, ArrowDownRight, X
} from 'lucide-react';
import { fetchAPI, formatCurrency, getRiskColor, getRiskBg } from '../lib/utils';

const COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

function AnimatedCounter({ value, suffix = '' }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseInt(value);
    if (start === end) return;
    const duration = 1500;
    const stepTime = Math.abs(Math.floor(duration / end));
    const timer = setInterval(() => {
      start += Math.ceil(end / 60);
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(start);
    }, stepTime);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{count.toLocaleString('en-IN')}{suffix}</span>;
}

export default function Dashboard() {
  const [riskScores, setRiskScores] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [allData, setAllData] = useState([]);
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [drillDistrict, setDrillDistrict] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchAPI('/risk-score'),
      fetchAPI('/anomalies'),
      fetchAPI('/data'),
    ]).then(([risk, anom, data]) => {
      setRiskScores(risk);
      setAnomalies(anom);
      setAllData(data);
      setLoading(false);
    });
  }, []);

  const totalBeneficiaries = allData.length;
  const totalAnomalies = anomalies.length;
  const totalAmount = allData.reduce((s, r) => s + r.amount, 0);
  const anomalyAmount = anomalies.reduce((s, r) => s + r.amount, 0);

  // Scheme-wise chart data
  const schemes = [...new Set(allData.map(r => r.scheme))];
  const schemeData = schemes.map(s => ({
    name: s,
    total: allData.filter(r => r.scheme === s).length,
    anomalies: allData.filter(r => r.scheme === s && r.status === 'anomaly').length
  }));

  // Drill down data
  const districtData = drillDistrict
    ? allData.filter(r => r.district === drillDistrict)
    : [];

  // Top fraud cases
  const topFraud = [...anomalies].sort((a, b) => (b.confidence || 0) - (a.confidence || 0)).slice(0, 5);

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-surface-500">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Real-time governance analytics & anomaly monitoring</p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-sm text-surface-400">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Live Data Feed
        </div>
      </div>

      {/* Summary Cards */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div variants={item} className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-primary-100 dark:bg-primary-900/30">
              <Users className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <span className="badge-info">
              <ArrowUpRight className="w-3 h-3 mr-1" /> +12%
            </span>
          </div>
          <p className="text-2xl font-bold"><AnimatedCounter value={totalBeneficiaries} /></p>
          <p className="text-sm text-surface-500 mt-1">Total Beneficiaries</p>
        </motion.div>

        <motion.div variants={item} className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <span className="badge-danger">
              <ArrowUpRight className="w-3 h-3 mr-1" /> +8%
            </span>
          </div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400"><AnimatedCounter value={totalAnomalies} /></p>
          <p className="text-sm text-surface-500 mt-1">Anomalies Detected</p>
        </motion.div>

        <motion.div variants={item} className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
              <IndianRupee className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="badge-success">
              <ArrowDownRight className="w-3 h-3 mr-1" /> -3%
            </span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
          <p className="text-sm text-surface-500 mt-1">Total Disbursed</p>
        </motion.div>

        <motion.div variants={item} className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="badge-warning">
              Flagged
            </span>
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(anomalyAmount)}</p>
          <p className="text-sm text-surface-500 mt-1">Suspicious Amount</p>
        </motion.div>
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* District Risk Bar Chart */}
        <motion.div variants={item} initial="hidden" animate="show" className="glass-card p-5 lg:col-span-2">
          <h3 className="text-base font-semibold mb-4">District Risk Scores</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={riskScores} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-color, #e2e8f0)" opacity={0.3} />
              <XAxis dataKey="district" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(255,255,255,0.95)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  fontSize: '13px'
                }}
              />
              <Bar dataKey="riskScore" name="Risk Score" radius={[6, 6, 0, 0]}>
                {riskScores.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.riskLevel === 'High' ? '#ef4444' : entry.riskLevel === 'Medium' ? '#f59e0b' : '#10b981'}
                    className="cursor-pointer"
                    onClick={() => setDrillDistrict(entry.district)}
                  />
                ))}
              </Bar>
              <Bar dataKey="anomalyCount" name="Anomalies" fill="#818cf8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Scheme Pie Chart */}
        <motion.div variants={item} initial="hidden" animate="show" className="glass-card p-5">
          <h3 className="text-base font-semibold mb-4">Anomalies by Scheme</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={schemeData.filter(s => s.anomalies > 0)}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                dataKey="anomalies"
                nameKey="name"
                paddingAngle={4}
              >
                {schemeData.filter(s => s.anomalies > 0).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.95)', border: 'none', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Drill-down panel */}
      {drillDistrict && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="glass-card mb-6 overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-surface-200/50 dark:border-surface-700/50">
            <div className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-primary-500" />
              <h3 className="text-base font-semibold">Drill Down: {drillDistrict}</h3>
              <span className="badge-info">{districtData.length} records</span>
            </div>
            <button onClick={() => setDrillDistrict(null)} className="p-1 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">ID</th>
                  <th className="table-header">Name</th>
                  <th className="table-header">Scheme</th>
                  <th className="table-header">Amount</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody>
                {districtData.map(row => (
                  <tr key={row.beneficiary_id} className="table-row" onClick={() => row.status === 'anomaly' && setSelectedAnomaly(row)}>
                    <td className="table-cell font-mono text-xs">{row.beneficiary_id}</td>
                    <td className="table-cell font-medium">{row.name}</td>
                    <td className="table-cell">{row.scheme}</td>
                    <td className="table-cell">{formatCurrency(row.amount)}</td>
                    <td className="table-cell">{row.date}</td>
                    <td className="table-cell">
                      <span className={row.status === 'anomaly' ? 'badge-danger' : 'badge-success'}>
                        {row.status === 'anomaly' ? '⚠ Anomaly' : '✓ Normal'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Anomaly Table + Top Fraud */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Anomaly Table */}
        <div className="lg:col-span-2 table-container">
          <div className="p-4 border-b border-surface-200/50 dark:border-surface-700/50">
            <h3 className="text-base font-semibold">Anomaly Detection Log</h3>
            <p className="text-xs text-surface-400 mt-0.5">Click on a row to view explainable AI analysis</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">ID</th>
                  <th className="table-header">Name</th>
                  <th className="table-header">District</th>
                  <th className="table-header">Scheme</th>
                  <th className="table-header">Amount</th>
                  <th className="table-header">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map(row => (
                  <tr
                    key={row.beneficiary_id}
                    className={`table-row ${selectedAnomaly?.beneficiary_id === row.beneficiary_id ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}
                    onClick={() => setSelectedAnomaly(row)}
                  >
                    <td className="table-cell font-mono text-xs">{row.beneficiary_id}</td>
                    <td className="table-cell font-medium">{row.name}</td>
                    <td className="table-cell">{row.district}</td>
                    <td className="table-cell">{row.scheme}</td>
                    <td className="table-cell font-semibold text-red-600 dark:text-red-400">{formatCurrency(row.amount)}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-500"
                            style={{ width: `${row.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold">{row.confidence}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Explainable AI Panel / Top Fraud */}
        <div className="space-y-4">
          {/* ExplainableAI Panel */}
          <motion.div
            className="glass-card overflow-hidden"
            initial={false}
            animate={{ height: selectedAnomaly ? 'auto' : 'auto' }}
          >
            <div className="p-4 border-b border-surface-200/50 dark:border-surface-700/50 bg-gradient-to-r from-primary-500/5 to-accent-500/5">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary-500" />
                Explainable AI
              </h3>
            </div>
            {selectedAnomaly ? (
              <div className="p-4 space-y-4">
                <div>
                  <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">Beneficiary</p>
                  <p className="font-semibold">{selectedAnomaly.name}</p>
                  <p className="text-sm text-surface-500">{selectedAnomaly.beneficiary_id} · {selectedAnomaly.district}</p>
                </div>
                <div>
                  <p className="text-xs text-surface-400 uppercase tracking-wider mb-2">Fraud Confidence</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-3 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 via-red-500 to-red-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${selectedAnomaly.confidence}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-lg font-bold text-red-500">{selectedAnomaly.confidence}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-surface-400 uppercase tracking-wider mb-2">Detection Reasons</p>
                  <div className="space-y-2">
                    {selectedAnomaly.reasons.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200/50 dark:border-red-800/30">
                        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-red-700 dark:text-red-400">{r}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-2 border-t border-surface-200/50 dark:border-surface-700/50">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-surface-400">Scheme</p>
                      <p className="text-sm font-semibold">{selectedAnomaly.scheme}</p>
                    </div>
                    <div>
                      <p className="text-xs text-surface-400">Amount</p>
                      <p className="text-sm font-semibold text-red-500">{formatCurrency(selectedAnomaly.amount)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-surface-400">
                <Eye className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Select an anomaly to view AI analysis</p>
              </div>
            )}
          </motion.div>

          {/* Top Fraud Cases */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-surface-200/50 dark:border-surface-700/50">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-500" />
                Top Fraud Cases
              </h3>
            </div>
            <div className="divide-y divide-surface-100 dark:divide-surface-700/50">
              {topFraud.map((f, i) => (
                <div
                  key={f.beneficiary_id}
                  className="p-3 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition cursor-pointer"
                  onClick={() => setSelectedAnomaly(f)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-xs font-bold text-red-600 dark:text-red-400">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{f.name}</p>
                        <p className="text-xs text-surface-400">{f.district} · {f.scheme}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-500">{f.confidence}%</p>
                      <p className="text-xs text-surface-400">{formatCurrency(f.amount)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
