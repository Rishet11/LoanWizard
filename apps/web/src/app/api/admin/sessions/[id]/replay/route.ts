import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../../lib/admin-auth';
import { getOffer } from '../../../../../../lib/ml-client';
import { prisma } from '../../../../../../lib/db';
import type { FormData } from '@loan-wizard/contracts';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const overrides = await req.json(); // { monthly_income?: number, employment_type?: string, ... }

  const session = await prisma.session.findUnique({ where: { id: params.id } });
  if (!session) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const cvSignals = await prisma.cvSignal.findMany({ where: { sessionId: params.id } });
  const avgLiveness = cvSignals.length ? cvSignals.reduce((a, b) => a + b.livenessScore, 0) / cvSignals.length : 0;

  const formData: FormData = {
    name: session.declaredName ?? null,
    employment_type: (session.declaredEmployment as FormData['employment_type']) ?? null,
    monthly_income: overrides.monthly_income ?? session.declaredIncome ?? null,
    loan_amount_requested: overrides.loan_amount_requested ?? session.loanAmountReq ?? null,
    purpose: session.loanPurpose ?? null,
    ...overrides,
  };

  const offer = await getOffer({
    session_id: params.id,
    form_data: formData,
    cv_signals_summary: {
      avg_age_estimate: null,
      avg_liveness: avgLiveness,
      min_liveness: Math.min(...cvSignals.map(s => s.livenessScore), 0),
      face_present_ratio: cvSignals.length ? cvSignals.filter(s => s.facePresent).length / cvSignals.length : 0,
    },
  });

  return NextResponse.json({ original: JSON.parse(session.offerJson ?? 'null'), replayed: offer });
}
