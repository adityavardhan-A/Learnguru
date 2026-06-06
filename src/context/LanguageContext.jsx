import React, { createContext, useContext, useMemo, useState } from "react";

const LanguageContext = createContext();

const labels = {
  en: {
    dashboard: "Dashboard",
    courses: "Courses",
    lectures: "Lectures",
    assignments: "Assignments",
    quizzes: "Quizzes",
    live: "Live Classes",
    leaderboard: "Leaderboard",
    chat: "Chat",
    users: "Users",
    analytics: "Analytics"
  },
  hi: {
    dashboard: "डैशबोर्ड",
    courses: "कोर्स",
    lectures: "लेक्चर",
    assignments: "असाइनमेंट",
    quizzes: "क्विज़",
    live: "लाइव क्लास",
    leaderboard: "लीडरबोर्ड",
    chat: "चैट",
    users: "उपयोगकर्ता",
    analytics: "एनालिटिक्स"
  },
  te: {
    dashboard: "డ్యాష్‌బోర్డ్",
    courses: "కోర్సులు",
    lectures: "లెక్చర్లు",
    assignments: "అసైన్‌మెంట్లు",
    quizzes: "క్విజ్‌లు",
    live: "లైవ్ క్లాసులు",
    leaderboard: "లీడర్‌బోర్డ్",
    chat: "చాట్",
    users: "వినియోగదారులు",
    analytics: "అనలిటిక్స్"
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(localStorage.getItem("learnguru_lang") || "en");
  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem("learnguru_lang", lang);
  };

  const value = useMemo(() => ({
    language,
    changeLanguage,
    t: (key) => labels[language]?.[key] || labels.en[key] || key
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => useContext(LanguageContext);
