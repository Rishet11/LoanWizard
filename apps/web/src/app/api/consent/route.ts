import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logConsent } from '../../../lib/audit-logger';
import { prisma } from '../../../lib/db';

const bodySchema = z.object({
  session_id: z.string(),
  consent_type: z.enum(['data_processing', 'recording', 'offer_acceptance']),
  verbal_text: z.string(),
  audio_ref: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const body = bodySchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });

  const { session_id, consent_type, verbal_text, audio_ref } = body.data;

  await logConsent(session_id, {
    session_id,
    consent_type,
    verbal_text,
    audio_ref: audio_ref ?? null,
    timestamp: new Date().toISOString(),
  });

  if (consent_type === 'offer_acceptance') {
    await prisma.session.update({
      where: { id: session_id },
      data: { status: 'accepted' },
    });
  }

  return NextResponse.json({ ok: true });
}
