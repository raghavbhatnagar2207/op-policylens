import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "dashboard": "Dashboard",
      "simulation": "Simulation",
      "authority_portal": "Authority Portal",
      "citizen_portal": "Citizen Portal",
      "fraud_alerts": "Fraud Alerts",
      "system_status": "System Status",
      "sign_out": "Sign Out",
      "active": "Active",
      "language": "Language",
      "theme": "Theme",
      "notifications": "Notifications"
    }
  },
  hi: {
    translation: {
      "dashboard": "डैशबोर्ड",
      "simulation": "सिमुलेशन",
      "authority_portal": "अधिकारी पोर्टल",
      "citizen_portal": "नागरिक पोर्टल",
      "fraud_alerts": "धोखाधड़ी अलर्ट",
      "system_status": "सिस्टम स्थिति",
      "sign_out": "साइन आउट",
      "active": "सक्रिय",
      "language": "भाषा",
      "theme": "थीम",
      "notifications": "सूचनाएं"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", 
    fallbackLng: "en",
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;
