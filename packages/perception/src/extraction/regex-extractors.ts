import type { EmploymentType, FormData } from '@loan-wizard/contracts';

export interface ExtractResult<T> {
  value: T;
  confidence: number;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const WORD_NUMBERS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  hundred: 100, thousand: 1000, lakh: 100000, lac: 100000,
  crore: 10000000,
};

function parseIndianNumber(text: string): number | null {
  const t = text.toLowerCase().trim();

  // digit-first: 75000 / 75,000 / ₹75,000 / 75k / 1L / 1.5L / 1.5 lakh
  const digitMatch = t.match(/[₹rs.]?\s*([\d,]+\.?\d*)\s*(k|l|lakh|lac|cr|crore)?/i);
  if (digitMatch) {
    const base = parseFloat(digitMatch[1].replace(/,/g, ''));
    const suffix = (digitMatch[2] ?? '').toLowerCase();
    if (suffix === 'k') return Math.round(base * 1000);
    if (suffix === 'l' || suffix === 'lakh' || suffix === 'lac') return Math.round(base * 100000);
    if (suffix === 'cr' || suffix === 'crore') return Math.round(base * 10000000);
    return Math.round(base);
  }

  // word-number: "seventy five thousand", "one lakh"
  const words = t.replace(/[^a-z ]/g, '').split(/\s+/);
  let total = 0, current = 0;
  for (const w of words) {
    const n = WORD_NUMBERS[w];
    if (n === undefined) continue;
    if (n === 100) { current = (current || 1) * 100; }
    else if (n === 1000) { total += (current || 1) * 1000; current = 0; }
    else if (n === 100000) { total += (current || 1) * 100000; current = 0; }
    else if (n === 10000000) { total += (current || 1) * 10000000; current = 0; }
    else { current += n; }
  }
  total += current;
  return total > 0 ? total : null;
}

// ─── extractors ──────────────────────────────────────────────────────────────

export function extractName(transcript: string): ExtractResult<string> | null {
  const t = transcript.trim();
  if (!t) return null;

  // "my name is X" / "I am X" / "this is X"
  const patterns = [
    /(?:my name is|i am|i'm|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)$/,  // bare "First Last"
    /^([A-Z][a-z]+)$/,                       // single name fallback
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m) {
      const name = m[1].trim();
      const confidence = name.includes(' ') ? 0.85 : 0.5;
      return { value: name, confidence };
    }
  }
  // Last-ditch: return first 3 capitalised tokens
  const caps = t.match(/\b[A-Z][a-z]+/g);
  if (caps) return { value: caps.slice(0, 3).join(' '), confidence: 0.4 };
  return null;
}

export function extractEmployment(transcript: string): ExtractResult<EmploymentType> | null {
  const t = transcript.toLowerCase();
  const map: Array<[RegExp, EmploymentType]> = [
    [/salar|employed.*company|corporate|job|office/i, 'salaried'],
    [/self.?employ|freelanc|consultant|own.*work/i, 'self_employed'],
    [/business|entrepreneur|proprietor|shop|firm/i, 'business_owner'],
    [/unemploy|no.*job|not.*work|without.*job/i, 'unemployed'],
    [/retir|pension/i, 'retired'],
  ];
  for (const [re, type] of map) {
    if (re.test(t)) return { value: type, confidence: 0.85 };
  }
  return null;
}

export function extractIncome(transcript: string): ExtractResult<number> | null {
  const amount = parseIndianNumber(transcript);
  if (amount === null || amount < 1000) return null;
  // income > 10 crore is probably a misparse
  if (amount > 100000000) return null;
  const confidence = /\d/.test(transcript) ? 0.9 : 0.7;
  return { value: amount, confidence };
}

export function extractLoanDetails(
  transcript: string,
): ExtractResult<{ amount: number | null; purpose: string | null }> | null {
  const t = transcript.toLowerCase();

  const amount = parseIndianNumber(transcript);

  // purpose keywords
  const purposeMap: Array<[RegExp, string]> = [
    [/home|house|renovation|property/i, 'home renovation'],
    [/car|vehicle|bike|auto/i, 'vehicle purchase'],
    [/education|college|school|study|fees/i, 'education'],
    [/medical|hospital|health|treatment/i, 'medical'],
    [/business|startup|shop|expand/i, 'business'],
    [/wedding|marriage/i, 'wedding'],
    [/travel|trip|vacation/i, 'travel'],
    [/personal|misc/i, 'personal'],
  ];
  let purpose: string | null = null;
  for (const [re, label] of purposeMap) {
    if (re.test(t)) { purpose = label; break; }
  }

  if (!amount && !purpose) return null;
  const confidence = amount && purpose ? 0.85 : 0.55;
  return { value: { amount: amount ?? null, purpose }, confidence };
}

export function extractAge(transcript: string): ExtractResult<number> | null {
  const t = transcript.toLowerCase();
  // "I am 28 years old" / "I'm 35" / "28" / "twenty eight"
  const digitMatch = t.match(/\b(\d{2})\s*(?:years?(?:\s*old)?)?/);
  if (digitMatch) {
    const age = parseInt(digitMatch[1], 10);
    if (age >= 18 && age <= 75) return { value: age, confidence: 0.9 };
  }
  // word numbers for age
  const amount = parseIndianNumber(transcript);
  if (amount !== null && amount >= 18 && amount <= 75) {
    return { value: amount, confidence: 0.7 };
  }
  return null;
}

export function extractConsent(transcript: string): ExtractResult<boolean> | null {
  if (/yes|i consent|continue|sure|okay|agree|proceed/i.test(transcript)) {
    return { value: true, confidence: 0.9 };
  }
  if (/no|refuse|don't|not agree|stop/i.test(transcript)) {
    return { value: false, confidence: 0.9 };
  }
  return null;
}

// Convenience map so script.ts can reference by field key
export const FIELD_EXTRACTORS: Partial<Record<keyof FormData, (t: string) => ExtractResult<any> | null>> = {
  name: extractName,
  declared_age: extractAge,
  employment_type: extractEmployment,
  monthly_income: extractIncome,
  loan_amount_requested: (t) => {
    const r = extractLoanDetails(t);
    return r ? { value: r.value.amount, confidence: r.confidence } : null;
  },
  purpose: (t) => {
    const r = extractLoanDetails(t);
    return r ? { value: r.value.purpose, confidence: r.confidence } : null;
  },
};
