import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Search, CheckCircle2, XCircle, IndianRupee, Calendar, Users } from 'lucide-react';

const schemeRules = [
  {
    name: 'PM Kisan Samman Nidhi',
    description: 'Direct income support of ₹6,000/year to small & marginal farmer families',
    maxIncome: 200000,
    minAge: 18,
    maxAge: 70,
    categories: ['General', 'OBC', 'SC', 'ST'],
    amount: '₹6,000/year',
    icon: '🌾',
  },
  {
    name: 'MGNREGA',
    description: 'Guaranteed 100 days of wage employment per year to rural households',
    maxIncome: 300000,
    minAge: 18,
    maxAge: 65,
    categories: ['General', 'OBC', 'SC', 'ST'],
    amount: '₹202/day (100 days)',
    icon: '👷',
  },
  {
    name: 'PM Ujjwala Yojana',
    description: 'Free LPG connections to women from BPL families',
    maxIncome: 120000,
    minAge: 18,
    maxAge: 60,
    categories: ['OBC', 'SC', 'ST'],
    amount: '₹1,600 (one-time)',
    icon: '🔥',
  },
  {
    name: 'Ayushman Bharat (PM-JAY)',
    description: 'Health insurance cover of ₹5 lakh/family/year for hospitalization',
    maxIncome: 180000,
    minAge: 0,
    maxAge: 100,
    categories: ['General', 'OBC', 'SC', 'ST'],
    amount: '₹5,00,000/year',
    icon: '🏥',
  },
  {
    name: 'Sukanya Samriddhi Yojana',
    description: 'Savings scheme for girl child with 8.2% interest rate',
    maxIncome: 500000,
    minAge: 0,
    maxAge: 10,
    categories: ['General', 'OBC', 'SC', 'ST'],
    amount: '8.2% interest',
    icon: '👧',
  },
  {
    name: 'PM Awas Yojana',
    description: 'Housing subsidy for construction/renovation of houses',
    maxIncome: 300000,
    minAge: 21,
    maxAge: 65,
    categories: ['OBC', 'SC', 'ST'],
    amount: '₹1,20,000 - ₹1,50,000',
    icon: '🏠',
  },
  {
    name: 'National Pension Scheme (NPS)',
    description: 'Pension scheme for citizens in unorganized sector',
    maxIncome: 200000,
    minAge: 18,
    maxAge: 40,
    categories: ['General', 'OBC', 'SC', 'ST'],
    amount: '₹1,000 - ₹5,000/month',
    icon: '👴',
  },
];

export default function Eligibility() {
  const [income, setIncome] = useState('');
  const [age, setAge] = useState('');
  const [category, setCategory] = useState('');
  const [results, setResults] = useState(null);
  const [checked, setChecked] = useState(false);

  const checkEligibility = (e) => {
    e.preventDefault();
    const inc = parseInt(income);
    const ag = parseInt(age);

    const eligible = schemeRules.filter(s =>
      inc <= s.maxIncome &&
      ag >= s.minAge &&
      ag <= s.maxAge &&
      s.categories.includes(category)
    );

    const ineligible = schemeRules.filter(s =>
      !eligible.includes(s)
    );

    setResults({ eligible, ineligible });
    setChecked(true);
  };

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="page-title">Eligibility Checker</h1>
        <p className="page-subtitle">Check which government welfare schemes you qualify for</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card sticky top-4"
          >
            <div className="p-5 border-b border-surface-200/50 dark:border-surface-700/50">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Search className="w-4 h-4 text-primary-500" />
                Enter Your Details
              </h3>
            </div>
            <form onSubmit={checkEligibility} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 flex items-center gap-1">
                  <IndianRupee className="w-3 h-3" /> Annual Income (₹)
                </label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="e.g. 150000"
                  value={income}
                  onChange={e => setIncome(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Age
                </label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="e.g. 35"
                  value={age}
                  onChange={e => setAge(e.target.value)}
                  required
                  min="0"
                  max="120"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 flex items-center gap-1">
                  <Users className="w-3 h-3" /> Category
                </label>
                <select
                  className="input-field"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  required
                >
                  <option value="">Select category</option>
                  <option value="General">General</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                </select>
              </div>
              <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Check Eligibility
              </button>
            </form>
          </motion.div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {!checked ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card p-12 text-center text-surface-400"
              >
                <ShieldCheck className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Enter your details to check eligibility</p>
                <p className="text-sm mt-1">We'll match you against {schemeRules.length} government welfare schemes</p>
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Eligible */}
                {results.eligible.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" />
                      Eligible Schemes ({results.eligible.length})
                    </h3>
                    <div className="space-y-3">
                      {results.eligible.map((s, i) => (
                        <motion.div
                          key={s.name}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="glass-card p-4 border-l-4 border-emerald-500 hover:-translate-y-0.5 transition-transform"
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{s.icon}</span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold">{s.name}</h4>
                                <span className="badge-success">✓ Eligible</span>
                              </div>
                              <p className="text-sm text-surface-500 mt-1">{s.description}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-surface-400">
                                <span>💰 {s.amount}</span>
                                <span>👤 Age: {s.minAge}-{s.maxAge}</span>
                                <span>📊 Max Income: ₹{s.maxIncome.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ineligible */}
                {results.ineligible.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-surface-400 mb-3 flex items-center gap-2">
                      <XCircle className="w-5 h-5" />
                      Not Eligible ({results.ineligible.length})
                    </h3>
                    <div className="space-y-2">
                      {results.ineligible.map((s, i) => (
                        <motion.div
                          key={s.name}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: results.eligible.length * 0.1 + i * 0.05 }}
                          className="glass-card p-3 opacity-60"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{s.icon}</span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium">{s.name}</h4>
                                <span className="badge-danger">✗ Not Eligible</span>
                              </div>
                              <p className="text-xs text-surface-400 mt-0.5">{s.description}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {results.eligible.length === 0 && (
                  <div className="glass-card p-8 text-center">
                    <XCircle className="w-12 h-12 mx-auto mb-3 text-red-400 opacity-50" />
                    <p className="text-lg font-medium text-surface-500">No eligible schemes found</p>
                    <p className="text-sm text-surface-400 mt-1">Try adjusting your income or age criteria</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
