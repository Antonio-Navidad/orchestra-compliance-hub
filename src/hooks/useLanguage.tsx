import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { translations, LANGUAGES, type SupportedLanguage } from "@/lib/i18n/translations";

interface LanguageContextValue {
  language: SupportedLanguage;
  previousLanguage: SupportedLanguage | null;
  setLanguage: (lang: SupportedLanguage) => void;
  undoLanguageChange: () => void;
  t: (key: string, vars?: Record<string, string>) => string;
  isMissing: (key: string) => boolean;
  showBanner: boolean;
  dismissBanner: () => void;
  bannerNewLang: SupportedLanguage | null;
  bannerPrevLang: SupportedLanguage | null;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const fallbackT = (key: string) => key;
const noopLang: LanguageContextValue = {
  language: "en",
  previousLanguage: null,
  setLanguage: () => {},
  undoLanguageChange: () => {},
  t: fallbackT,
  isMissing: () => false,
  showBanner: false,
  dismissBanner: () => {},
  bannerNewLang: null,
  bannerPrevLang: null,
};

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) return noopLang;
  return ctx;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLangState] = useState<SupportedLanguage>(() => {
    return (localStorage.getItem("orchestra-lang") as SupportedLanguage) || "en";
  });
  const [previousLanguage, setPreviousLanguage] = useState<SupportedLanguage | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [bannerNewLang, setBannerNewLang] = useState<SupportedLanguage | null>(null);
  const [bannerPrevLang, setBannerPrevLang] = useState<SupportedLanguage | null>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const profileLoadedRef = useRef(false);

  // Load language from profile on mount
  useEffect(() => {
    const loadFromProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("preferred_language")
        .eq("id", session.user.id)
        .single();
      if (data?.preferred_language && LANGUAGES.some(l => l.code === data.preferred_language)) {
        setLangState(data.preferred_language as SupportedLanguage);
        localStorage.setItem("orchestra-lang", data.preferred_language);
      }
      profileLoadedRef.current = true;
    };
    loadFromProfile();
  }, []);

  const setLanguage = useCallback((newLang: SupportedLanguage) => {
    if (newLang === language) return;
    setPreviousLanguage(language);
    setBannerPrevLang(language);
    setBannerNewLang(newLang);
    setLangState(newLang);
    localStorage.setItem("orchestra-lang", newLang);
    setShowBanner(true);

    // Save to profile
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase.from("profiles").update({ preferred_language: newLang } as any).eq("id", session.user.id).then(() => {});
      }
    });

    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => {
      setShowBanner(false);
      setPreviousLanguage(null);
    }, 60000);
  }, [language]);

  const undoLanguageChange = useCallback(() => {
    if (!previousLanguage) return;
    setLangState(previousLanguage);
    localStorage.setItem("orchestra-lang", previousLanguage);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase.from("profiles").update({ preferred_language: previousLanguage } as any).eq("id", session.user.id).then(() => {});
      }
    });

    setPreviousLanguage(null);
    setShowBanner(false);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
  }, [previousLanguage]);

  const dismissBanner = useCallback(() => {
    setShowBanner(false);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string>): string => {
    const dict = translations[language];
    let str = dict?.[key] ?? translations.en[key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, v);
      });
    }
    return str;
  }, [language]);

  const isMissing = useCallback((key: string): boolean => {
    if (language === "en") return false;
    return !(key in (translations[language] || {}));
  }, [language]);

  return (
    <LanguageContext.Provider value={{
      language, previousLanguage, setLanguage, undoLanguageChange,
      t, isMissing, showBanner, dismissBanner, bannerNewLang, bannerPrevLang,
    }}>
      {children}
    </LanguageContext.Provider>
  );
}
