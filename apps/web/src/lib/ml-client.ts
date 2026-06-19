import type { Offer, RiskScoreInput } from '@loan-wizard/contracts';
import { MOCK_OFFER } from '@loan-wizard/contracts';
import { config } from './config';

export async function getOffer(input: RiskScoreInput): Promise<Offer> {
  if (config.mlMode === 'mock') {
    await new Promise((r) => setTimeout(r, 1500));
    return { ...MOCK_OFFER, session_id: input.session_id };
  }
  const res = await fetch(`${config.mlServiceUrl}/offer`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`ML service error: ${res.status}`);
  return res.json();
}
