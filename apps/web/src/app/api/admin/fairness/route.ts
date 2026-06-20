import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin-auth';
import { config } from '../../../../lib/config';

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  if (config.mlMode === 'mock') {
    return NextResponse.json(mockFairness());
  }

  const res = await fetch(`${config.mlServiceUrl}/fairness/report`, { cache: 'no-store' });
  if (!res.ok) {
    return NextResponse.json({ error: 'ML fairness report unavailable' }, { status: 502 });
  }
  return NextResponse.json(adaptFairnessReport(await res.json()));
}

function toGroupStats(groups: Record<string, number>) {
  const maxRate = Math.max(...Object.values(groups), 0.0001);
  return Object.entries(groups).map(([group, approval_rate]) => ({
    group,
    approval_rate,
    disparate_impact_ratio: approval_rate / maxRate,
  }));
}

function adaptFairnessReport(report: {
  by_employment: Record<string, number>;
  by_age_bucket: Record<string, number>;
  disparate_impact_ratio: number;
}) {
  const by_employment = toGroupStats(report.by_employment);
  const by_age_bucket = toGroupStats(report.by_age_bucket);
  return {
    by_employment,
    by_age_bucket,
    flagged: report.disparate_impact_ratio < 0.8 ||
      [...by_employment, ...by_age_bucket].some((g) => g.disparate_impact_ratio < 0.8),
  };
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
