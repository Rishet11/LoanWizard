import { describe, it, expect } from 'vitest';
import { DEFAULT_SCRIPT } from '../src/script';

describe('DEFAULT_SCRIPT', () => {
  it('has 8 questions in order', () => {
    const ids = DEFAULT_SCRIPT.questions.map((q) => q.id);
    expect(ids).toEqual([
      'consent',
      'name',
      'age',
      'employment',
      'income',
      'purpose',
      'loan_amount',
      'kyc_consent',
    ]);
  });

  it('consent extractor recognises yes', () => {
    const q = DEFAULT_SCRIPT.questions.find((q) => q.id === 'consent')!;
    expect(q.extractor('yes I am fine with that')?.value).toBe(true);
  });

  it('name question targets name field', () => {
    const q = DEFAULT_SCRIPT.questions.find((q) => q.id === 'name')!;
    expect(q.expectedField).toBe('name');
    expect(q.extractor('Rahul Sharma')?.value).toBe('Rahul Sharma');
  });

  it('income extractor is wired', () => {
    const q = DEFAULT_SCRIPT.questions.find((q) => q.id === 'income')!;
    expect(q.extractor('50k')?.value).toBe(50000);
  });

  it('purpose extractor returns the loan purpose', () => {
    const q = DEFAULT_SCRIPT.questions.find((q) => q.id === 'purpose')!;
    const r = q.extractor('need 3 lakh for my car');
    expect(r?.value).toBe('vehicle purchase');
  });

  it('loan_amount extractor returns the amount in rupees', () => {
    const q = DEFAULT_SCRIPT.questions.find((q) => q.id === 'loan_amount')!;
    const r = q.extractor('need 3 lakh for my car');
    expect(r?.value).toBe(300000);
  });
});
