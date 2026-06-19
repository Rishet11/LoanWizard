import { describe, it, expect } from 'vitest';
import {
  extractName,
  extractEmployment,
  extractIncome,
  extractLoanDetails,
  extractConsent,
} from '../src/extraction/regex-extractors';

// ─── income ──────────────────────────────────────────────────────────────────
describe('extractIncome', () => {
  const cases: Array<[string, number]> = [
    ['75000', 75000],
    ['75,000', 75000],
    ['₹75,000', 75000],
    ['75k', 75000],
    ['1 lakh', 100000],
    ['1L', 100000],
    ['1.5 lakh', 150000],
    ['seventy five thousand', 75000],
    ['one lakh', 100000],
    ['50000 rupees', 50000],
    ['2 lac', 200000],
  ];
  for (const [input, expected] of cases) {
    it(`"${input}" → ${expected}`, () => {
      const r = extractIncome(input);
      expect(r).not.toBeNull();
      expect(r!.value).toBe(expected);
    });
  }

  it('rejects too-small values', () => {
    expect(extractIncome('500')).toBeNull();
  });
});

// ─── employment ──────────────────────────────────────────────────────────────
describe('extractEmployment', () => {
  it('salaried', () => expect(extractEmployment('I have a salaried job')?.value).toBe('salaried'));
  it('self_employed via freelance', () => expect(extractEmployment('I am a freelancer')?.value).toBe('self_employed'));
  it('business_owner', () => expect(extractEmployment('I run my own business')?.value).toBe('business_owner'));
  it('retired', () => expect(extractEmployment('I am retired')?.value).toBe('retired'));
  it('unemployed', () => expect(extractEmployment('currently unemployed')?.value).toBe('unemployed'));
  it('null on unknown', () => expect(extractEmployment('yes maybe not sure')).toBeNull());
});

// ─── name ────────────────────────────────────────────────────────────────────
describe('extractName', () => {
  it('extracts "my name is X"', () => {
    const r = extractName('my name is Rahul Sharma');
    expect(r?.value).toBe('Rahul Sharma');
    expect(r!.confidence).toBeGreaterThan(0.7);
  });

  it('extracts bare first-last', () => {
    const r = extractName('Priya Singh');
    expect(r?.value).toBe('Priya Singh');
  });

  it('low confidence on single name', () => {
    const r = extractName('Rahul');
    expect(r).not.toBeNull();
    expect(r!.confidence).toBeLessThan(0.7);
  });
});

// ─── loan details ─────────────────────────────────────────────────────────────
describe('extractLoanDetails', () => {
  it('extracts amount + purpose', () => {
    const r = extractLoanDetails('I need 5 lakh for home renovation');
    expect(r?.value.amount).toBe(500000);
    expect(r?.value.purpose).toBe('home renovation');
  });

  it('extracts amount without purpose', () => {
    const r = extractLoanDetails('need around 2 lakh');
    expect(r?.value.amount).toBe(200000);
  });

  it('extracts purpose without amount', () => {
    const r = extractLoanDetails('it is for my car');
    expect(r?.value.purpose).toBe('vehicle purchase');
  });
});

// ─── consent ─────────────────────────────────────────────────────────────────
describe('extractConsent', () => {
  it('yes triggers consent', () => expect(extractConsent('yes I agree')?.value).toBe(true));
  it('no triggers refusal', () => expect(extractConsent('no I refuse')?.value).toBe(false));
  it('null on ambiguous', () => expect(extractConsent('maybe')).toBeNull());
});
