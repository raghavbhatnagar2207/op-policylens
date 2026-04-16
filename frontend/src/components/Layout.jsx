import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_OPTIONS } from '../i18n';
import VoiceBot from './VoiceBot';
import {
  LayoutDashboard, Map, Lightbulb, MessageSquareWarning, ShieldCheck,
  FlaskConical, Sun, Moon, Bell, Menu, X, ChevronDown, Shield, Users,
  AlertTriangle, LogOut, Globe
} from 'lucide-react';

const adminLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/heatmap', label: 'Risk Heatmap', icon: Map },
  { to: '/insights', label: 'AI Insights', icon: Lightbulb },
  { to: '/complaints', label: 'Complaints', icon: MessageSquareWarning },
  { to: '/simulation', label: 'Simulation', icon: FlaskConical },
];

const citizenLinks = [
  { to: '/eligibility', label: 'Check Eligibility', icon: ShieldCheck },
  { to: '/voices', label: 'Citizen Voices', icon: Users },
  { to: '/complaints', label: 'File Complaint', icon: MessageSquareWarning },
];

const notifications = [
  { id: 1, text: '3 new anomalies detected in Moradabad', time: '2 min ago', type: 'danger' },
  { id: 2, text: 'Risk score updated for Kanpur district', time: '15 min ago', type: 'warning' },
  { id: 3, text: 'New complaint filed from Agra', time: '1 hr ago', type: 'info' },
  { id: 4, text: 'Monthly report generated successfully', time: '3 hr ago', type: 'success' },
];

export default function Layout() {
  const { t, i18n } = useTranslation();
  const { isDark, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAlert, setShowAlert] = useState(true);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const langMenuRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Close language menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) setShowLangMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const role = localStorage.getItem('role');
  const mode = role === 'Citizen' ? 'citizen' : 'admin';
  const links = mode === 'admin' ? adminLinks : citizenLinks;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/');
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`glass-sidebar fixed lg:static inset-y-0 left-0 z-50 w-72 flex flex-col transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Logo */}
        <div className="p-6 border-b border-surface-200/50 dark:border-surface-700/50">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate(mode === 'admin' ? '/dashboard' : '/eligibility')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-glow group-hover:shadow-lg group-hover:scale-105 transition-all duration-200">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text group-hover:opacity-80 transition-opacity">PolicyLens AI</h1>
              <p className="text-[11px] text-surface-400 dark:text-surface-500 font-medium uppercase tracking-wider">Governance Intelligence</p>
            </div>
          </div>
        </div>

        {/* Role Display */}
        <div className="px-4 pt-4">
          <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium bg-primary-50 dark:bg-primary-900/20 w-fit mx-auto border border-primary-100 dark:border-primary-800">
            {mode === 'admin' ? <Shield className="w-4 h-4 text-primary-600" /> : <Users className="w-4 h-4 text-accent-600" />}
            <span className={mode === 'admin' ? 'text-primary-600 dark:text-primary-400' : 'text-accent-600 dark:text-accent-400'}>
              {mode === 'admin' ? t("authority_portal") : t("citizen_portal")}
            </span>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 w-full overflow-y-auto py-4">
          <p className="text-[11px] font-semibold text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2 px-6">
            {mode === 'admin' ? t('administration') : t('citizen_services')}
          </p>
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all duration-200 group border-l-4 ${
                  isActive
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'border-transparent text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-surface-200'
                }`
              }
            >
              <link.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
              {t(link.label.toLowerCase().replace(' ', '_')) || link.label}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="p-4 border-t border-surface-200/50 dark:border-surface-700/50">
          <div className="glass-card p-3 bg-gradient-to-br from-primary-500/5 to-accent-500/5 dark:from-primary-500/10 dark:to-accent-500/10">
            <p className="text-xs font-medium text-surface-500 dark:text-surface-400">{t("system_status")}</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{t("active")} — {t("monitoring")}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Alert Banner */}
        <AnimatePresence>
          {showAlert && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-gradient-to-r from-red-500 to-orange-500 text-white overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <AlertTriangle className="w-4 h-4 animate-pulse" />
                  <span>⚠ High-risk alert: Moradabad district shows 30% higher anomaly rate than state average</span>
                </div>
                <button onClick={() => setShowAlert(false)} className="hover:bg-white/20 rounded p-1 transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top bar */}
        <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-surface-200/50 dark:border-surface-700/50 bg-white/60 dark:bg-surface-900/60 backdrop-blur-lg z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div>
              <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                {t(links.find(l => l.to === location.pathname)?.label.toLowerCase().replace(' ', '_')) || 'PolicyLens AI'}
              </h2>
              <p className="text-xs text-surface-400 dark:text-surface-500">Uttar Pradesh Governance Monitor</p>
            </div>
          </div>
          {/* Right Actions */}
          <div className="flex items-center gap-1 sm:gap-3">
            {/* Language Switcher — Dropdown */}
            <div className="relative" ref={langMenuRef}>
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="p-2.5 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700 transition-all font-semibold flex items-center gap-2 text-sm shadow-sm"
                title={t('language')}
              >
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">{LANGUAGE_OPTIONS.find(l => l.code === i18n.language)?.native || 'EN'}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showLangMenu ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showLangMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 glass-card overflow-hidden z-50 py-1"
                  >
                    {LANGUAGE_OPTIONS.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => { i18n.changeLanguage(lang.code); setShowLangMenu(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${
                          i18n.language === lang.code
                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-semibold'
                            : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
                        }`}
                      >
                        <span>{lang.native}</span>
                        <span className="text-xs opacity-50">{lang.label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 transition-all duration-300 group"
              title="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-500 group-hover:rotate-45 transition-transform" />
              ) : (
                <Moon className="w-4 h-4 text-primary-600 group-hover:-rotate-12 transition-transform" />
              )}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 rounded-xl bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 transition-all relative"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 glass-card overflow-hidden z-50"
                  >
                    <div className="p-3 border-b border-surface-200/50 dark:border-surface-700/50">
                      <p className="text-sm font-semibold">Notifications</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.map(n => (
                        <div key={n.id} className="p-3 border-b border-surface-100 dark:border-surface-700/50 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition cursor-pointer">
                          <p className="text-sm">{n.text}</p>
                          <p className="text-xs text-surface-400 mt-1">{n.time}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Avatar & Logout */}
            <div className="flex items-center gap-2 ml-1">
              <div
                onClick={() => navigate('/profile')}
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold shadow-sm cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200"
                title="View Profile"
              >
                {localStorage.getItem('userName') ? localStorage.getItem('userName').charAt(0).toUpperCase() : (mode === 'admin' ? 'A' : 'C')}
              </div>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content with animated transitions */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <VoiceBot />
    </div>
  );
}
