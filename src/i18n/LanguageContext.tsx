import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';
import i18n from './index';
import { DEFAULT_LANGUAGE } from './languages';
import { getStoredLanguage, setStoredLanguage } from './storage';

interface LanguageValue {
  language: string;
  setLanguage: (code: string) => Promise<void>;
}

const LanguageContext = createContext<LanguageValue>({
  language: DEFAULT_LANGUAGE,
  setLanguage: async () => {},
});

export function useLanguage() {
  return use(LanguageContext);
}

/**
 * Restores the driver's previously chosen language on launch (default stays
 * English until they pick one — see AGENTS.md-adjacent product decision).
 */
export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);

  useEffect(() => {
    (async () => {
      const stored = await getStoredLanguage();
      if (stored && stored !== DEFAULT_LANGUAGE) {
        await i18n.changeLanguage(stored);
        setLanguageState(stored);
      }
    })();
  }, []);

  const setLanguage = async (code: string) => {
    await i18n.changeLanguage(code);
    setLanguageState(code);
    await setStoredLanguage(code);
  };

  return <LanguageContext value={{ language, setLanguage }}>{children}</LanguageContext>;
}
