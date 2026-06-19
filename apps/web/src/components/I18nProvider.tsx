'use client';
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Locale } from '../lib/i18n';
import en from '../messages/en.json';
import hi from '../messages/hi.json';

const messages: Record<Locale, Record<string, string>> = { en, hi };

interface I18nCtx {
  locale: Locale;
  t: (key: string, vars?: Record<string, string | number>) => string;
  setLocale: (l: Locale) => void;
}

const I18nContext = createContext<I18nCtx>({ locale: 'en', t: (k) => k, setLocale: () => {} });

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const saved = document.cookie.match(/locale=([^;]+)/)?.[1];
    if (saved === 'hi' || saved === 'en') setLocaleState(saved);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    document.cookie = `locale=${l};path=/;max-age=31536000`;
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string | number>) => {
    let msg = messages[locale][key] ?? messages.en[key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => { msg = msg.replace(`{${k}}`, String(v)); });
    }
    return msg;
  }, [locale]);

  return <I18nContext.Provider value={{ locale, t, setLocale }}>{children}</I18nContext.Provider>;
}

export function useT() { return useContext(I18nContext); }
