const DEVANAGARI = /[\u0900-\u097F]/;

export type SupportedLang = 'en' | 'hi';

export function detectLang(text: string, confidence: number): SupportedLang | null {
  if (DEVANAGARI.test(text)) return 'hi';
  // Low-confidence + no English markers → probably Hindi in Roman script
  if (confidence < 0.5 && /\b(mera|meri|haan|nahi|rupaye|lakh|hajaar)\b/i.test(text)) return 'hi';
  if (confidence >= 0.5) return 'en';
  return null; // inconclusive
}

export function langToSTTLocale(lang: SupportedLang): string {
  return lang === 'hi' ? 'hi-IN' : 'en-IN';
}

export function langToTTSLocale(lang: SupportedLang): string {
  return lang === 'hi' ? 'hi-IN' : 'en-IN';
}
