import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/admin-auth';
import { config } from '../../../../../lib/config';

export async function GET(req: NextRequest, { params }: { params: { feature: string } }) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  if (config.mlMode === 'mock') {
    return NextResponse.json(mockDrift(params.feature));
  }

  const [baselineRes, productionRes] = await Promise.all([
    fetch(`${config.mlServiceUrl}/drift/${params.feature}/baseline`, { cache: 'no-store' }),
    fetch(`${config.mlServiceUrl}/drift/${params.feature}`, { cache: 'no-store' }),
  ]);

  const baseline = baselineRes.ok ? await baselineRes.json() : null;
  const production = productionRes.ok ? await productionRes.json() : null;

  if (!baseline && !production) {
    return NextResponse.json({ error: 'Drift feature unavailable' }, { status: 404 });
  }

  return NextResponse.json({
    feature: params.feature,
    baseline,
    production,
    mean_shift: baseline && production && baseline.std
      ? Math.abs(production.mean - baseline.mean) / baseline.std
      : null,
    status: production ? 'ok' : 'awaiting_samples',
  });
}

function mockDrift(feature: string) {
  const baseline = {
    feature,
    n: 10000,
    mean: feature === 'avg_liveness' ? 0.88 : feature === 'monthly_income' ? 72000 : 480000,
    std: feature === 'avg_liveness' ? 0.08 : feature === 'monthly_income' ? 18000 : 125000,
    p50: feature === 'avg_liveness' ? 0.9 : feature === 'monthly_income' ? 70000 : 500000,
    p99: feature === 'avg_liveness' ? 0.99 : feature === 'monthly_income' ? 150000 : 900000,
    source: 'training',
  };
  const production = {
    ...baseline,
    n: 24,
    mean: baseline.mean * 1.03,
    std: baseline.std * 0.92,
    p50: baseline.p50 * 1.02,
    p99: baseline.p99 * 0.98,
  };
  return { feature, baseline, production, mean_shift: 0.18, status: 'ok' };
}
