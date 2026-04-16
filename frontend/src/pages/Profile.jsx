import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Phone, MapPin, Building, Map, CreditCard, Mail, Shield, Save, Edit2, Loader2, Info } from 'lucide-react';
import { API_BASE } from '../lib/utils';
import { useTranslation } from 'react-i18next';

export default function Profile() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(data);
        setFormData(data);
      }
    } catch (err) {
      console.error('Failed to load profile', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setProfile(formData);
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Failed to save profile', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="page-container mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <User className="w-7 h-7 text-primary-500" />
            My Profile
          </h1>
          <p className="page-subtitle">Manage your personal information and preferences.</p>
        </div>
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} className="btn-secondary flex items-center gap-2">
            <Edit2 className="w-4 h-4" /> Edit Profile
          </button>
        ) : (
          <div className="flex gap-3">
            <button onClick={() => { setIsEditing(false); setFormData(profile); }} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Avatar Sidebar */}
        <div className="md:col-span-1">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 text-center">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-xl">
              {formData.name?.charAt(0).toUpperCase()}
            </div>
            {isEditing ? (
              <input 
                className="input-field text-center font-bold text-lg mb-2" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
              />
            ) : (
              <h2 className="text-xl font-bold dark:text-white">{profile.name}</h2>
            )}
            
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 text-xs font-semibold">
              <Shield className="w-3.5 h-3.5" />
              {profile.role} User
            </div>
            
            <p className="text-xs text-surface-400 mt-4 flex items-center justify-center gap-1">
              <Info className="w-3 h-3" /> Member since {new Date(profile.created_at).getFullYear()}
            </p>
          </motion.div>
        </div>

        {/* Details Form */}
        <div className="md:col-span-2">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 space-y-6">
            <h3 className="text-lg font-semibold border-b border-surface-200 dark:border-surface-700 pb-2">Personal Details</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-surface-500 mb-1">
                  <Mail className="w-4 h-4 text-surface-400" /> Email Address (Read-only)
                </label>
                <input type="email" value={profile.email} disabled className="input-field opacity-60 cursor-not-allowed" />
              </div>
              
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-surface-500 mb-1">
                  <Phone className="w-4 h-4 text-surface-400" /> Phone Number
                </label>
                {isEditing ? (
                  <input type="text" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="input-field text-surface-900 dark:text-white" placeholder="+91 XXXXX XXXXX" />
                ) : (
                  <div className="px-3 py-2 text-surface-900 dark:text-white font-medium">{profile.phone || 'Not provided'}</div>
                )}
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-surface-500 mb-1">
                  <CreditCard className="w-4 h-4 text-surface-400" /> Aadhaar (Last 4 digits)
                </label>
                {isEditing ? (
                  <input type="text" maxLength={4} value={formData.aadhaar_last4 || ''} onChange={e => setFormData({...formData, aadhaar_last4: e.target.value})} className="input-field text-surface-900 dark:text-white" placeholder="XXXX" />
                ) : (
                  <div className="px-3 py-2 text-surface-900 dark:text-white font-medium">{profile.aadhaar_last4 ? `XXXX XXXX ${profile.aadhaar_last4}` : 'Not provided'}</div>
                )}
              </div>
              
              <div className="sm:col-span-2">
                <label className="flex items-center gap-1.5 text-sm font-medium text-surface-500 mb-1">
                  <MapPin className="w-4 h-4 text-surface-400" /> Street Address
                </label>
                {isEditing ? (
                  <input type="text" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} className="input-field text-surface-900 dark:text-white" placeholder="Enter complete address" />
                ) : (
                  <div className="px-3 py-2 text-surface-900 dark:text-white font-medium">{profile.address || 'Not provided'}</div>
                )}
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-surface-500 mb-1">
                  <Building className="w-4 h-4 text-surface-400" /> City / District
                </label>
                {isEditing ? (
                  <input type="text" value={formData.city || ''} onChange={e => setFormData({...formData, city: e.target.value})} className="input-field text-surface-900 dark:text-white" placeholder="E.g. Lucknow" />
                ) : (
                  <div className="px-3 py-2 text-surface-900 dark:text-white font-medium">{profile.city || 'Not provided'}</div>
                )}
              </div>

               <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-surface-500 mb-1">
                  <Map className="w-4 h-4 text-surface-400" /> State
                </label>
                {isEditing ? (
                  <select value={formData.state || ''} onChange={e => setFormData({...formData, state: e.target.value})} className="input-field text-surface-900 dark:text-white">
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Karnataka">Karnataka</option>
                  </select>
                ) : (
                  <div className="px-3 py-2 text-surface-900 dark:text-white font-medium">{profile.state || 'Uttar Pradesh'}</div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
