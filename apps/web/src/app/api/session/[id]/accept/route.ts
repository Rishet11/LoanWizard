import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../../../lib/db';
import { logConsent } from '../../../../../lib/audit-logger';

const body = z.object({ otp: z.string().length(6) });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const parsed = body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });

  await logConsent(params.id, {
    session_id: params.id,
    consent_type: 'offer_acceptance',
    verbal_text: `Customer accepted via e-sign OTP ${parsed.data.otp}`,
    audio_ref: null,
    timestamp: new Date().toISOString(),
  });

  await prisma.session.update({
    where: { id: params.id },
    data: { status: 'accepted' },
  });

  return NextResponse.json({ ok: true });
}
