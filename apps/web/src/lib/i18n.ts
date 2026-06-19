'use client';
import { createContext, useContext } from 'react';

export type Locale = 'en' | 'hi';

export const I18nContext = createContext<{
  locale: Locale;
  t: (key: string) => string;
  setLocale: (l: Locale) => void;
}>({
  locale: 'en',
  t: (k) => k,
  setLocale: () => {},
});

export function useT() {
  return useContext(I18nContext);
}
