import { NextRequest, NextResponse } from 'next/server';
import type { FormData, DeviceFingerprint } from '@loan-wizard/contracts';
import { prisma } from '../../../../../lib/db';
import { getOffer as fetchOffer } from '../../../../../lib/ml-client';

async function buildInputFromPrisma(sessionId: string) {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return null;

  const cvSignals = await prisma.cvSignal.findMany({ where: { sessionId } });
  const transcripts = await prisma.transcript.findMany({
    where: { sessionId, speaker: 'customer' },
    orderBy: { turnIdx: 'asc' },
  });

  const formData: FormData = {
    name: session.declaredName ?? null,
    employment_type: (session.declaredEmployment as FormData['employment_type']) ?? null,
    monthly_income: session.declaredIncome ?? null,
    loan_amount_requested: session.loanAmountReq ?? null,
    purpose: session.loanPurpose ?? null,
  };

  const avgAge = cvSignals.length
    ? cvSignals.reduce((a, b) => a + (b.ageEstimate ?? 0), 0) / cvSignals.length
    : null;
  const avgLiveness = cvSignals.length
    ? cvSignals.reduce((a, b) => a + b.livenessScore, 0) / cvSignals.length
    : 0;
  const minLiveness = cvSignals.length ? Math.min(...cvSignals.map((s) => s.livenessScore)) : 0;
  const faceRatio = cvSignals.length
    ? cvSignals.filter((s) => s.facePresent).length / cvSignals.length
    : 0;

  // texture_score_avg — average of non-null texture scores, defaulting to 0.85
  const textureScores = cvSignals
    .map((s) => s.textureScore)
    .filter((v): v is number => v != null);
  const textureScoreAvg = textureScores.length
    ? textureScores.reduce((a, b) => a + b, 0) / textureScores.length
    : 0.85;

  const deviceFingerprint: DeviceFingerprint | undefined = session.deviceFingerprint
    ? JSON.parse(session.deviceFingerprint)
    : undefined;

  return {
    session_id: sessionId,
    tenant_id: session.tenantId,
    form_data: formData,
    cv_signals_summary: {
      avg_age_estimate: avgAge,
      avg_liveness: avgLiveness,
      min_liveness: minLiveness,
      face_present_ratio: faceRatio,
      texture_score_avg: textureScoreAvg,
    },
    transcript_snippets: transcripts.map((t) => t.text),
    device_fingerprint: deviceFingerprint,
  };
}

// POST — compute offer from ML service, persist to DB
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const input = await buildInputFromPrisma(params.id);
  if (!input) {
    return NextResponse.json({ error: 'session not found' }, { status: 404 });
  }

  try {
    const offer = await fetchOffer(input);

    await prisma.session.update({
      where: { id: params.id },
      data: {
        status: offer.eligible ? 'offered' : 'rejected',
        offerJson: JSON.stringify(offer),
      },
    });

    return NextResponse.json(offer);
  } catch (err) {
    console.error('[offer] ML service error:', err);
    return NextResponse.json({ error: 'ML service unavailable' }, { status: 502 });
  }
}

// GET — return persisted offer (for offer page on refresh/direct nav)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await prisma.session.findUnique({
    where: { id: params.id },
    select: { offerJson: true },
  });
  if (!session?.offerJson) {
    return NextResponse.json({ error: 'offer not found' }, { status: 404 });
  }
  return NextResponse.json(JSON.parse(session.offerJson));
}
