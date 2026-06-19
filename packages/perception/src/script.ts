import type { FormData } from '@loan-wizard/contracts';
import {
  extractName,
  extractAge,
  extractEmployment,
  extractIncome,
  extractLoanDetails,
  extractConsent,
} from './extraction/regex-extractors';

export interface ExtractResult<T = any> {
  value: T;
  confidence: number;
}

export interface ScriptQuestion {
  id: string;
  text: string;
  expectedField: keyof FormData;
  extractor: (transcript: string) => ExtractResult | null;
}

export interface AgentScript {
  questions: ScriptQuestion[];
}

// ~2–3 minute flow: 8 questions + intro + final consent
// Average TTS + answer per question: 18–22 seconds → total ~2.5 min
export const DEFAULT_SCRIPT: AgentScript = {
  questions: [
    // ① Consent & intro — long TTS (~15 s) + short answer
    {
      id: 'consent',
      text: 'Hello and welcome. I am your AI loan assistant from Loan Wizard. This video call is being recorded solely for RBI Video-KYC verification purposes, and your personal data will be processed in accordance with the Digital Personal Data Protection Act 2023. By continuing, you confirm your consent. Do you agree to proceed?',
      expectedField: 'name',
      extractor: extractConsent,
    },

    // ② Name — ~10 s
    {
      id: 'name',
      text: 'Thank you for consenting. Could you please tell me your full legal name as it appears on your Aadhaar or PAN card?',
      expectedField: 'name',
      extractor: extractName,
    },

    // ③ Age — ~10 s
    {
      id: 'age',
      text: 'And what is your current age?',
      expectedField: 'declared_age',
      extractor: extractAge,
    },

    // ④ Employment — ~15 s
    {
      id: 'employment',
      text: 'Could you describe your current employment status? For example, are you salaried at a company, self-employed or freelancing, running your own business, or something else?',
      expectedField: 'employment_type',
      extractor: extractEmployment,
    },

    // ⑤ Income — ~12 s
    {
      id: 'income',
      text: 'What is your approximate monthly take-home income in rupees? You can give an estimate.',
      expectedField: 'monthly_income',
      extractor: extractIncome,
    },

    // ⑥ Loan purpose — ~12 s
    {
      id: 'purpose',
      text: 'What is the primary purpose of this loan — for example, home renovation, education, medical expenses, vehicle purchase, or something else?',
      expectedField: 'purpose',
      extractor: (t) => {
        const r = extractLoanDetails(t);
        return r && r.value.purpose ? { value: r.value.purpose, confidence: r.confidence } : null;
      },
    },

    // ⑦ Loan amount — ~12 s
    {
      id: 'loan_amount',
      text: 'How much loan amount are you looking for? Please state the amount in rupees.',
      expectedField: 'loan_amount_requested',
      extractor: (t) => {
        const r = extractLoanDetails(t);
        return r && r.value.amount ? { value: r.value.amount, confidence: r.confidence } : null;
      },
    },

    // ⑧ Final KYC consent — long TTS (~12 s) + short answer
    {
      id: 'kyc_consent',
      text: 'We are almost done. I need your explicit consent on three things: one, that this video recording may be used for KYC verification; two, that your data may be shared with credit bureaus for a soft enquiry; and three, that we may process your information to generate a personalised loan offer. Do you confirm all three?',
      expectedField: 'name', // field unused — captured as consent_captured events
      extractor: extractConsent,
    },
  ],
};
