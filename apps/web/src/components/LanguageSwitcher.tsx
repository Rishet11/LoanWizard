'use client';
import { useT } from './I18nProvider';

export function LanguageSwitcher() {
  const { locale, setLocale } = useT();
  return (
    <div className="flex items-center gap-1 text-sm" role="group" aria-label="Language selector">
      <button
        onClick={() => setLocale('en')}
        className={`px-2 py-1 rounded transition-colors ${locale === 'en' ? 'font-semibold text-(--color-fg)' : 'text-(--color-muted) hover:text-(--color-fg)'}`}
        aria-pressed={locale === 'en'}
      >
        EN
      </button>
      <span className="text-(--color-muted)" aria-hidden="true">|</span>
      <button
        onClick={() => setLocale('hi')}
        className={`px-2 py-1 rounded transition-colors ${locale === 'hi' ? 'font-semibold text-(--color-fg)' : 'text-(--color-muted) hover:text-(--color-fg)'}`}
        aria-pressed={locale === 'hi'}
      >
        हिन्दी
      </button>
    </div>
  );
}
