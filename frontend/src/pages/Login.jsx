import { useState, useCallback } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, Mail, ArrowRight, Loader2, Users, ArrowLeft, Phone, CheckCircle2, XCircle } from 'lucide-react';
import { API_BASE } from '../lib/utils';

/* ------------------------------------------------------------------ */
/*  Validation helpers (mirrors backend rules)                        */
/* ------------------------------------------------------------------ */
function validateEmail(email) {
  const errors = [];
  email = email.trim().toLowerCase();

  if (email.length < 5 || email.length > 254)
    errors.push('Email must be between 5 and 254 characters');
  if (/\s/.test(email))
    errors.push('Email must not contain spaces');
  if ((email.match(/@/g) || []).length !== 1)
    errors.push('Email must contain exactly one @ symbol');
  if (/^[0-9]/.test(email))
    errors.push('Email must not start with a number');
  if (/^[^a-zA-Z]/.test(email))
    errors.push('Email must not start with a special character');
  if (errors.length === 0 && !/^[a-zA-Z][a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email))
    errors.push('Invalid email format');

  return errors;
}

function validatePhone(phone) {
  const errors = [];
  phone = phone.trim();

  if (/[^0-9]/.test(phone))
    errors.push('Phone number must contain only digits');
  else {
    if (phone.length !== 10)
      errors.push('Phone number must be exactly 10 digits');
    if (phone.length > 0 && '012345'.includes(phone[0]))
      errors.push('Phone number must start with 6–9');
  }
  return errors;
}

function isPhoneInput(val) {
  return /^\d+$/.test(val.trim());
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export default function Login() {
  const { portalType } = useParams();
  const isAdmin = portalType === 'admin';

  const [mode, setMode] = useState('email');          // 'email' | 'phone'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState([]);
  const navigate = useNavigate();

  /* live validation on blur */
  const handleBlur = useCallback(() => {
    if (!identifier) { setFieldErrors([]); return; }
    const errs = mode === 'phone' ? validatePhone(identifier) : validateEmail(identifier);
    setFieldErrors(errs);
  }, [identifier, mode]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors([]);

    // client-side validation
    const errs = mode === 'phone' ? validatePhone(identifier) : validateEmail(identifier);
    if (errs.length) {
      setFieldErrors(errs);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password, remember_me: rememberMe }),
      });
      const data = await res.json();

      if (res.ok && data.access_token) {
        const userRole = data.user.role;
        if (isAdmin && userRole !== 'Authority') {
          setError('Access denied. This portal is for Authority accounts only.');
          setLoading(false);
          return;
        }
        if (!isAdmin && userRole !== 'Citizen') {
          setError('Access denied. This portal is for Citizen accounts only.');
          setLoading(false);
          return;
        }

        localStorage.setItem('token', data.access_token);
        localStorage.setItem('role', data.user.role);
        localStorage.setItem('userName', data.user.name);
        navigate(data.user.role === 'Authority' ? '/dashboard' : '/eligibility');
      } else if (data.code === 'USER_NOT_FOUND') {
        navigate(`/signup/${portalType}`, { state: { [mode]: identifier } });
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch {
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  };

  /* theming */
  const accentFrom = isAdmin ? 'from-teal-500' : 'from-indigo-500';
  const accentTo   = isAdmin ? 'to-emerald-500' : 'to-blue-500';
  const accentRing = isAdmin ? 'focus:ring-teal-500/50' : 'focus:ring-indigo-500/50';
  const borderColor = isAdmin ? 'border-t-teal-500' : 'border-t-indigo-500';
  const btnGradient = isAdmin
    ? 'from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 shadow-teal-500/30'
    : 'from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-indigo-500/30';
  const linkColor = isAdmin ? 'text-teal-600 dark:text-teal-400' : 'text-primary-600 dark:text-primary-400';
  const tabActive = isAdmin ? 'bg-teal-500 text-white shadow-md' : 'bg-indigo-500 text-white shadow-md';

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 p-4 relative">
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 flex items-center gap-2 text-sm text-surface-500 hover:text-surface-300 transition-colors font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className={`glass-card p-8 shadow-xl border-t-4 ${borderColor}`}>
          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${accentFrom} ${accentTo} flex items-center justify-center shadow-glow mb-4`}>
              {isAdmin ? <Lock className="w-8 h-8 text-white" /> : <Users className="w-8 h-8 text-white" />}
            </div>
            <h1 className="text-2xl font-bold gradient-text">
              {isAdmin ? 'Authority Login' : 'Citizen Login'}
            </h1>
            <p className="text-sm text-surface-500 font-medium">
              {isAdmin ? 'Government & Admin Access' : 'Public Welfare Portal'}
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="flex rounded-xl bg-surface-100 dark:bg-surface-800 p-1 mb-6">
            <button
              type="button"
              onClick={() => { setMode('email'); setIdentifier(''); setFieldErrors([]); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'email' ? tabActive : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'}`}
            >
              <Mail className="w-4 h-4" /> Email
            </button>
            <button
              type="button"
              onClick={() => { setMode('phone'); setIdentifier(''); setFieldErrors([]); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'phone' ? tabActive : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'}`}
            >
              <Phone className="w-4 h-4" /> Phone
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Server error */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-sm text-red-600 dark:text-red-400 text-center font-medium">
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Identifier Field */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider pl-1">
                {mode === 'email' ? 'Email Address' : 'Phone Number'}
              </label>
              <div className="relative">
                {mode === 'email'
                  ? <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                  : <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                }
                <input
                  type={mode === 'email' ? 'text' : 'tel'}
                  inputMode={mode === 'phone' ? 'numeric' : 'email'}
                  value={identifier}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (mode === 'phone') val = val.replace(/\D/g, '').slice(0, 10);
                    setIdentifier(val);
                    if (fieldErrors.length) setFieldErrors([]);
                  }}
                  onBlur={handleBlur}
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl border ${fieldErrors.length ? 'border-red-400 dark:border-red-600' : 'border-surface-200 dark:border-surface-700'} bg-white/50 dark:bg-surface-900/50 focus:outline-none focus:ring-2 ${accentRing} transition-all font-medium`}
                  placeholder={mode === 'email' ? 'Enter your email' : 'Enter 10-digit mobile number'}
                  required
                  maxLength={mode === 'phone' ? 10 : 254}
                  autoComplete={mode === 'email' ? 'email' : 'tel'}
                />
                {/* Inline status icon */}
                {identifier.length > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {fieldErrors.length === 0
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      : <XCircle className="w-5 h-5 text-red-400" />
                    }
                  </span>
                )}
              </div>
              {/* Inline validation errors */}
              <AnimatePresence>
                {fieldErrors.length > 0 && (
                  <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-red-500 dark:text-red-400 space-y-0.5 pl-1 pt-1">
                    {fieldErrors.map((err, i) => <li key={i}>• {err}</li>)}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider pl-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white/50 dark:bg-surface-900/50 focus:outline-none focus:ring-2 ${accentRing} transition-all font-medium`}
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            {/* Remember Me */}
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-surface-300 dark:border-surface-600 accent-indigo-500"
              />
              <span className="text-sm text-surface-500 group-hover:text-surface-700 dark:group-hover:text-surface-300 transition-colors">
                Remember me for 30 days
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl bg-gradient-to-r ${btnGradient} text-white font-bold shadow-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed`}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Secure Login'}
              {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-surface-200/50 dark:border-surface-700/50 text-center">
            <p className="text-sm text-surface-500">
              Don't have an account?{' '}
              <Link to={`/signup/${portalType}`} className={`font-semibold ${linkColor} hover:underline`}>
                Sign up here
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
