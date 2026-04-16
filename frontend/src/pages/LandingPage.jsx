import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Shield, Users, Lock, ArrowRight, Sparkles, Globe } from 'lucide-react';
import { LANGUAGE_OPTIONS } from '../i18n';

export default function LandingPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 bg-teal-500/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute -bottom-40 left-1/3 w-72 h-72 bg-purple-500/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Language selector on landing page */}
      <div className="absolute top-6 right-6 z-20">
        <select
          value={i18n.language}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          className="bg-slate-800/80 backdrop-blur-lg text-white text-sm px-3 py-2 rounded-xl border border-slate-600/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
        >
          {LANGUAGE_OPTIONS.map(l => (
            <option key={l.code} value={l.code}>{l.native} ({l.label})</option>
          ))}
        </select>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-teal-400 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3 tracking-tight">
            Policy<span className="bg-gradient-to-r from-indigo-400 to-teal-400 bg-clip-text text-transparent">Lens</span> AI
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-xl mx-auto font-light leading-relaxed">
            {t('governance_platform')}
          </p>

          <div className="flex items-center justify-center gap-2 mt-5">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span className="text-sm text-slate-500 font-medium tracking-wide uppercase">{t('select_portal')}</span>
            <Sparkles className="w-4 h-4 text-teal-400" />
          </div>
        </motion.div>

        {/* Two Portal Cards */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 w-full max-w-3xl">
          {/* Citizen Card */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            onClick={() => navigate('/login/citizen')}
            className="flex-1 group cursor-pointer"
          >
            <div className="relative rounded-2xl border border-slate-700/60 bg-slate-900/60 backdrop-blur-xl p-8 transition-all duration-500
                            hover:border-indigo-500/50 hover:bg-slate-800/60 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/0 to-blue-500/0 group-hover:from-indigo-500/5 group-hover:to-blue-500/5 transition-all duration-500" />

              <div className="relative z-10">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-shadow duration-500">
                  <Users className="w-7 h-7 text-white" />
                </div>

                <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors duration-300">
                  {t('citizen_portal_title')}
                </h2>

                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  {t('citizen_portal_desc')}
                </p>

                <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm group-hover:gap-3 transition-all duration-300">
                  <span>{t('continue_citizen')}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Admin Card */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            onClick={() => navigate('/login/admin')}
            className="flex-1 group cursor-pointer"
          >
            <div className="relative rounded-2xl border border-slate-700/60 bg-slate-900/60 backdrop-blur-xl p-8 transition-all duration-500
                            hover:border-teal-500/50 hover:bg-slate-800/60 hover:shadow-2xl hover:shadow-teal-500/10 hover:-translate-y-1">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-teal-500/0 to-emerald-500/0 group-hover:from-teal-500/5 group-hover:to-emerald-500/5 transition-all duration-500" />

              <div className="relative z-10">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center mb-6 shadow-lg shadow-teal-500/25 group-hover:shadow-teal-500/40 transition-shadow duration-500">
                  <Lock className="w-7 h-7 text-white" />
                </div>

                <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-teal-300 transition-colors duration-300">
                  {t('authority_portal_title')}
                </h2>

                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  {t('authority_portal_desc')}
                </p>

                <div className="flex items-center gap-2 text-teal-400 font-semibold text-sm group-hover:gap-3 transition-all duration-300">
                  <span>{t('continue_authority')}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
          className="mt-16 text-slate-600 text-xs tracking-wider uppercase"
        >
          Powered by AI &middot; Secure &middot; Transparent
        </motion.p>
      </div>
    </div>
  );
}
