import { useState, useCallback } from 'react';
import { useNavigate, Link, useLocation, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, Mail, User as UserIcon, ArrowRight, Loader2, ArrowLeft, Users, Phone, CheckCircle2, XCircle } from 'lucide-react';
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
  if (!phone) return errors; // phone is optional

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

function getPasswordStrength(pw) {
  if (!pw) return { label: '', color: '', width: '0%' };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { label: 'Weak', color: 'bg-red-500', width: '20%' };
  if (score <= 2) return { label: 'Fair', color: 'bg-orange-500', width: '40%' };
  if (score <= 3) return { label: 'Good', color: 'bg-amber-500', width: '60%' };
  if (score <= 4) return { label: 'Strong', color: 'bg-emerald-500', width: '80%' };
  return { label: 'Excellent', color: 'bg-green-500', width: '100%' };
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export default function Signup() {
  const { portalType } = useParams();
  const isAdmin = portalType === 'admin';
  const role = isAdmin ? 'Authority' : 'Citizen';

  const location = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState(location.state?.email || '');
  const [phone, setPhone] = useState(location.state?.phone || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailErrors, setEmailErrors] = useState([]);
  const [phoneErrors, setPhoneErrors] = useState([]);
  const navigate = useNavigate();

  const pwStrength = getPasswordStrength(password);

  const handleEmailBlur = useCallback(() => {
    if (!email) { setEmailErrors([]); return; }
    setEmailErrors(validateEmail(email));
  }, [email]);

  const handlePhoneBlur = useCallback(() => {
    if (!phone) { setPhoneErrors([]); return; }
    setPhoneErrors(validatePhone(phone));
  }, [phone]);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // client-side validation
    const eErrs = validateEmail(email);
    const pErrs = phone ? validatePhone(phone) : [];

    if (eErrs.length) { setEmailErrors(eErrs); return; }
    if (pErrs.length) { setPhoneErrors(pErrs); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, role, phone: phone.trim() || undefined }),
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess('Account created successfully! Redirecting to login...');
        setTimeout(() => navigate(`/login/${portalType}`), 2000);
      } else {
        setError(data.error || 'Failed to create account.');
      }
    } catch {
      setError('Failed to connect to the server.');
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

  const inputCls = (hasError) =>
    `w-full pl-10 pr-10 py-2.5 rounded-xl border ${hasError ? 'border-red-400 dark:border-red-600' : 'border-surface-200 dark:border-surface-700'} bg-white/50 dark:bg-surface-900/50 focus:outline-none focus:ring-2 ${accentRing} transition-all font-medium`;

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
            <h1 className="text-2xl font-bold gradient-text">Create Account</h1>
            <p className="text-sm text-surface-500 font-medium">
              {isAdmin ? 'Register as Authority' : 'Register as Citizen'}
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Server Messages */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-sm text-red-600 dark:text-red-400 text-center font-medium">
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-sm text-emerald-600 dark:text-emerald-400 text-center font-medium">
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider pl-1">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputCls(false)}
                  placeholder="John Doe"
                  required
                  maxLength={120}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider pl-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (emailErrors.length) setEmailErrors([]); }}
                  onBlur={handleEmailBlur}
                  className={inputCls(emailErrors.length > 0)}
                  placeholder="name@example.com"
                  required
                  maxLength={254}
                  autoComplete="email"
                />
                {email.length > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {emailErrors.length === 0
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      : <XCircle className="w-5 h-5 text-red-400" />}
                  </span>
                )}
              </div>
              <AnimatePresence>
                {emailErrors.length > 0 && (
                  <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-red-500 dark:text-red-400 space-y-0.5 pl-1 pt-1">
                    {emailErrors.map((err, i) => <li key={i}>• {err}</li>)}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>

            {/* Phone (optional) */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider pl-1">
                Phone Number <span className="text-surface-400 normal-case font-normal">(optional — enables phone login)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setPhone(val);
                    if (phoneErrors.length) setPhoneErrors([]);
                  }}
                  onBlur={handlePhoneBlur}
                  className={inputCls(phoneErrors.length > 0)}
                  placeholder="9876543210"
                  maxLength={10}
                  autoComplete="tel"
                />
                {phone.length > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {phoneErrors.length === 0
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      : <XCircle className="w-5 h-5 text-red-400" />}
                  </span>
                )}
              </div>
              <AnimatePresence>
                {phoneErrors.length > 0 && (
                  <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-red-500 dark:text-red-400 space-y-0.5 pl-1 pt-1">
                    {phoneErrors.map((err, i) => <li key={i}>• {err}</li>)}
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
                  placeholder="Create a strong password"
                  required
                  minLength={6}
                  maxLength={128}
                />
              </div>
              {/* Strength bar */}
              {password.length > 0 && (
                <div className="pt-1.5">
                  <div className="h-1.5 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${pwStrength.color}`}
                      initial={{ width: 0 }}
                      animate={{ width: pwStrength.width }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className={`text-xs mt-1 font-medium ${pwStrength.color.replace('bg-', 'text-')}`}>{pwStrength.label}</p>
                </div>
              )}
            </div>

            {/* Role badge - read-only */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50">
              <Shield className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Role: <span className="font-bold">{role}</span>
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl bg-gradient-to-r ${btnGradient} text-white font-bold shadow-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed mt-2`}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
              {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-surface-200/50 dark:border-surface-700/50 text-center">
            <p className="text-sm text-surface-500">
              Already have an account?{' '}
              <Link to={`/login/${portalType}`} className={`font-semibold ${linkColor} hover:underline`}>
                Log in here
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
