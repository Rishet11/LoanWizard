import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/admin-auth';
import { config } from '../../../../../lib/config';

export async function GET(req: NextRequest, { params }: { params: { feature: string } }) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  if (config.mlMode === 'mock') {
    return NextResponse.json(mockDrift(params.feature));
  }

  const res = await fetch(`${config.mlServiceUrl}/admin/drift/${params.feature}`);
  return NextResponse.json(await res.json());
}

function mockDrift(feature: string) {
  const baseline = Array.from({ length: 10 }, (_, i) => ({ bucket: i * 10000, value: Math.random() * 0.2 }));
  const production = baseline.map(b => ({ ...b, value: b.value + (Math.random() - 0.5) * 0.05 }));
  return { feature, baseline, production, psi: 0.04 + Math.random() * 0.1 };
}
