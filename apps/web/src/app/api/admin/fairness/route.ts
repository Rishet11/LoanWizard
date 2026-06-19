import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin-auth';
import { config } from '../../../../lib/config';

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  if (config.mlMode === 'mock') {
    return NextResponse.json(mockFairness());
  }

  const res = await fetch(`${config.mlServiceUrl}/admin/fairness`);
  return NextResponse.json(await res.json());
}

function mockFairness() {
  return {
    by_employment: [
      { group: 'salaried', approval_rate: 0.82, disparate_impact_ratio: 1.0 },
      { group: 'self_employed', approval_rate: 0.61, disparate_impact_ratio: 0.74 },
      { group: 'business_owner', approval_rate: 0.70, disparate_impact_ratio: 0.85 },
      { group: 'retired', approval_rate: 0.55, disparate_impact_ratio: 0.67 },
    ],
    by_age_bucket: [
      { group: '21-30', approval_rate: 0.75, disparate_impact_ratio: 0.91 },
      { group: '31-40', approval_rate: 0.82, disparate_impact_ratio: 1.0 },
      { group: '41-50', approval_rate: 0.78, disparate_impact_ratio: 0.95 },
      { group: '51+', approval_rate: 0.60, disparate_impact_ratio: 0.73 },
    ],
    flagged: true,
  };
}
