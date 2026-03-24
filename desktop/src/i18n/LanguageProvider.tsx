import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Language, translations } from "./translations";

type LanguageContextValue = {
  language: Language;
  locale: string;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
  tx: (enText: string, esText: string) => string;
};

const STORAGE_KEY = "automia.desktop.language";

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "es" ? "es" : "en";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => {
    const locale = language === "es" ? "es-ES" : "en-US";
    const t = (key: string, fallback?: string) =>
      translations[language][key] ?? fallback ?? key;
    const tx = (enText: string, esText: string) =>
      language === "es" ? esText : enText;
    return { language, locale, setLanguage, t, tx };
  }, [language]);

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
}
