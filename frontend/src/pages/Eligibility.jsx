import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck, Search, CheckCircle2, XCircle, IndianRupee, Calendar,
  Users, Sparkles, ExternalLink, Loader2, Globe, Award, Heart,
  Home, Briefcase, GraduationCap, Tractor, PiggyBank, Stethoscope,
  BookOpen, Accessibility, Building2, Baby, MapPin, CreditCard, Volume2
} from 'lucide-react';
import { API_BASE } from '../lib/utils';
import { speak, stopSpeaking } from '../lib/speechUtils';

const TYPE_ICONS = {
  Scholarship: GraduationCap,
  Subsidy: PiggyBank,
  Pension: Award,
  Insurance: ShieldCheck,
  Housing: Home,
  Employment: Briefcase,
  Loan: PiggyBank,
  Healthcare: Stethoscope,
  Agriculture: Tractor,
  Education: GraduationCap,
};

const TYPE_COLORS = {
  Scholarship: 'from-indigo-500 to-blue-500',
  Subsidy: 'from-amber-500 to-orange-500',
  Pension: 'from-purple-500 to-fuchsia-500',
  Insurance: 'from-teal-500 to-emerald-500',
  Housing: 'from-rose-500 to-pink-500',
  Employment: 'from-cyan-500 to-blue-500',
  Loan: 'from-lime-500 to-green-500',
  Healthcare: 'from-red-500 to-rose-500',
  Agriculture: 'from-green-500 to-emerald-500',
  Education: 'from-violet-500 to-indigo-500',
};

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

export default function Eligibility() {
  const { t, i18n } = useTranslation();
  const [income, setIncome] = useState('');
  const [age, setAge] = useState('');
  const [category, setCategory] = useState('');
  const [gender, setGender] = useState('');
  const [state, setState] = useState('');
  const [education, setEducation] = useState('');
  const [occupation, setOccupation] = useState('');
  const [disability, setDisability] = useState('None');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [residence, setResidence] = useState('');
  const [bplCard, setBplCard] = useState('No');
  const [minority, setMinority] = useState('No');
  const [dependents, setDependents] = useState('');
  const [speakingId, setSpeakingId] = useState(null);

  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState(null);

  const checkEligibility = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSchemes([]);

    try {
      const res = await fetch(`${API_BASE}/api/schemes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          age: parseInt(age),
          income: parseInt(income),
          category,
          gender,
          state,
          education,
          occupation,
          disability,
          marital_status: maritalStatus,
          residence,
          bpl_card: bplCard === 'Yes',
          minority: minority === 'Yes',
          dependents: dependents ? parseInt(dependents) : 0,
          language: i18n.language,
        })
      });

      const data = await res.json();

      if (res.ok && data.schemes) {
        setSchemes(data.schemes);
      } else {
        setError(data.error || t('error_message'));
      }
    } catch (err) {
      setError(t('error_message'));
    } finally {
      setLoading(false);
      setChecked(true);
    }
  };

  const handleSpeak = (text, id) => {
    if (speakingId === id) {
      stopSpeaking();
      setSpeakingId(null);
    } else {
      stopSpeaking();
      speak(text, i18n.language, () => setSpeakingId(null));
      setSpeakingId(id);
    }
  };

  const getIcon = (type) => TYPE_ICONS[type] || Award;
  const getGradient = (type) => TYPE_COLORS[type] || 'from-primary-500 to-accent-500';

  const SelectField = ({ icon: Icon, label, value, onChange, options, required = true, placeholder }) => (
    <div>
      <label className="block text-sm font-medium mb-1.5 flex items-center gap-1">
        <Icon className="w-3 h-3" /> {label}
      </label>
      <select className="input-field" value={value} onChange={e => onChange(e.target.value)} required={required}>
        <option value="">{placeholder || t('select') || 'Select...'}</option>
        {options.map(opt => (
          <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
            {typeof opt === 'string' ? opt : opt.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="page-title flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-primary-500" />
          {t('ai_scheme_matcher')}
        </h1>
        <p className="page-subtitle">{t('scheme_matcher_desc')}</p>
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
                {t('enter_details')}
              </h3>
              <p className="text-xs text-surface-400 mt-1">{t('more_details_hint')}</p>
            </div>
            <form onSubmit={checkEligibility} className="p-5 space-y-3.5">

              {/* ---- Basic Info Section ---- */}
              <p className="text-xs font-bold uppercase tracking-wider text-primary-500 pt-1">{t('basic_info')}</p>

              <div>
                <label className="block text-sm font-medium mb-1.5 flex items-center gap-1">
                  <IndianRupee className="w-3 h-3" /> {t('annual_income')}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {t('age')}
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
                <SelectField icon={Heart} label={t('gender')} value={gender} onChange={setGender}
                  options={[
                    { value: 'Male', label: t('male') },
                    { value: 'Female', label: t('female') },
                    { value: 'Other', label: t('other') },
                  ]} />
              </div>

              <SelectField icon={Users} label={t('category')} value={category} onChange={setCategory}
                options={['General', 'OBC', 'SC', 'ST']} />

              <SelectField icon={Globe} label={t('state')} value={state} onChange={setState}
                options={INDIAN_STATES} />

              {/* ---- Education & Work Section ---- */}
              <div className="border-t border-surface-200/30 dark:border-surface-700/30 pt-3 mt-1">
                <p className="text-xs font-bold uppercase tracking-wider text-primary-500 mb-3">{t('education_work')}</p>
              </div>

              <SelectField icon={GraduationCap} label={t('education_level')} value={education} onChange={setEducation}
                options={[
                  { value: 'No Formal Education', label: 'No Formal Education' },
                  { value: 'Below 10th', label: 'Below 10th' },
                  { value: '10th Pass', label: '10th Pass (SSC)' },
                  { value: '12th Pass', label: '12th Pass (HSC)' },
                  { value: 'ITI / Diploma', label: 'ITI / Diploma' },
                  { value: 'Graduate', label: 'Graduate' },
                  { value: 'Post Graduate', label: 'Post Graduate' },
                  { value: 'Professional Degree', label: 'Professional (B.Tech / MBBS / LLB)' },
                  { value: 'PhD', label: 'PhD / Doctorate' },
                ]} />

              <SelectField icon={Briefcase} label={t('occupation')} value={occupation} onChange={setOccupation}
                options={[
                  { value: 'Unemployed', label: 'Unemployed' },
                  { value: 'Student', label: 'Student' },
                  { value: 'Farmer', label: 'Farmer' },
                  { value: 'Self-Employed', label: 'Self-Employed / Business' },
                  { value: 'Daily Wage Laborer', label: 'Daily Wage Laborer' },
                  { value: 'Skilled Worker', label: 'Skilled Worker' },
                  { value: 'Private Sector', label: 'Private Sector' },
                  { value: 'Government Employee', label: 'Government Employee' },
                  { value: 'Retired', label: 'Retired' },
                  { value: 'Homemaker', label: 'Homemaker' },
                ]} />

              {/* ---- Personal Details Section ---- */}
              <div className="border-t border-surface-200/30 dark:border-surface-700/30 pt-3 mt-1">
                <p className="text-xs font-bold uppercase tracking-wider text-primary-500 mb-3">{t('personal_details')}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SelectField icon={Heart} label={t('marital_status')} value={maritalStatus} onChange={setMaritalStatus}
                  options={['Single', 'Married', 'Widowed', 'Divorced']} />
                <div>
                  <label className="block text-sm font-medium mb-1.5 flex items-center gap-1">
                    <Baby className="w-3 h-3" /> {t('dependents')}
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="0"
                    value={dependents}
                    onChange={e => setDependents(e.target.value)}
                    min="0"
                    max="15"
                  />
                </div>
              </div>

              <SelectField icon={Accessibility} label={t('disability')} value={disability} onChange={setDisability}
                options={[
                  { value: 'None', label: 'No Disability' },
                  { value: 'Visual Impairment', label: 'Visual Impairment' },
                  { value: 'Hearing Impairment', label: 'Hearing Impairment' },
                  { value: 'Locomotor Disability', label: 'Locomotor Disability' },
                  { value: 'Intellectual Disability', label: 'Intellectual Disability' },
                  { value: 'Mental Illness', label: 'Mental Illness' },
                  { value: 'Multiple Disabilities', label: 'Multiple Disabilities' },
                  { value: 'Other', label: 'Other Disability' },
                ]}
                required={false}
              />

              <SelectField icon={MapPin} label={t('residence')} value={residence} onChange={setResidence}
                options={[
                  { value: 'Rural', label: 'Rural' },
                  { value: 'Urban', label: 'Urban' },
                  { value: 'Semi-Urban', label: 'Semi-Urban' },
                ]} />

              <div className="grid grid-cols-2 gap-3">
                <SelectField icon={CreditCard} label={t('bpl_card')} value={bplCard} onChange={setBplCard}
                  options={['Yes', 'No']} required={false} />
                <SelectField icon={Building2} label={t('minority')} value={minority} onChange={setMinority}
                  options={['Yes', 'No']} required={false} />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('ai_searching')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {t('find_schemes')}
                  </>
                )}
              </button>

              {loading && (
                <p className="text-xs text-center text-surface-400 animate-pulse">
                  {t('ai_searching')}
                </p>
              )}
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
                <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">{t('ai_scheme_matcher')}</p>
                <p className="text-sm mt-1">{t('scheme_matcher_desc')}</p>
              </motion.div>
            ) : loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card p-12 text-center"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 flex items-center justify-center animate-pulse">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <p className="text-lg font-semibold gradient-text">{t('ai_searching')}</p>
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card p-8 text-center"
              >
                <XCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
                <p className="text-lg font-medium text-red-500">{error}</p>
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {schemes.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        {schemes.length} {t('schemes_found')}
                      </h3>
                      <span className="text-xs text-surface-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Gemini AI
                      </span>
                    </div>

                    <div className="space-y-3">
                      {schemes.map((s, i) => {
                        const Icon = getIcon(s.type);
                        const gradient = getGradient(s.type);
                        return (
                          <motion.div
                            key={s.name + i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="glass-card p-5 hover:-translate-y-0.5 transition-all duration-200 group"
                          >
                            <div className="flex items-start gap-4">
                              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg shrink-0`}>
                                <Icon className="w-6 h-6" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <h4 className="font-bold text-surface-900 dark:text-surface-100">{s.name}</h4>
                                    <p className="text-xs text-surface-400 mt-0.5">{s.ministry}</p>
                                  </div>
                                  <div className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${
                                    s.match_score >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                    s.match_score >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                    'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400'
                                  }`}>
                                    {s.match_score}% {t('match')}
                                  </div>
                                </div>

                                <p className="text-sm text-surface-600 dark:text-surface-300 mt-2">{s.eligibility_summary}</p>

                                <div className="flex flex-wrap items-center gap-3 mt-3">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 text-xs font-semibold border border-primary-100 dark:border-primary-800/50">
                                    {s.benefit}
                                  </span>
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 text-xs font-medium">
                                    {s.type}
                                  </span>

                                  {/* Listen button */}
                                  <button
                                    onClick={() => handleSpeak(`${s.name}. ${s.eligibility_summary}. ${s.benefit}`, i)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                                      speakingId === i
                                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                        : 'bg-surface-100 dark:bg-surface-800 text-surface-500 hover:text-indigo-500'
                                    }`}
                                  >
                                    <Volume2 className="w-3 h-3" />
                                    {speakingId === i ? t('stop_listening') : t('listen')}
                                  </button>

                                  {s.official_url && (
                                    <a
                                      href={s.official_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium ml-auto"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      {t('apply_now')}
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="glass-card p-8 text-center">
                    <XCircle className="w-12 h-12 mx-auto mb-3 text-red-400 opacity-50" />
                    <p className="text-lg font-medium text-surface-500">{t('no_schemes')}</p>
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
