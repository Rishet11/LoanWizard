import { NextRequest, NextResponse } from 'next/server';
import type { PerceptionEvent } from '@loan-wizard/contracts';
import { prisma } from '../../../../../lib/db';
import { logTranscript, logCvSignal } from '../../../../../lib/audit-logger';
import { updateFormField, appendCvSignal, appendTranscript, setDeviceFingerprint } from '../../../../../lib/session-store';
import { broadcast } from '../../../../../lib/sse-broadcast';

const FIELD_COLUMN: Record<string, string> = {
  name: 'declaredName',
  employment_type: 'declaredEmployment',
  monthly_income: 'declaredIncome',
  loan_amount_requested: 'loanAmountReq',
  purpose: 'loanPurpose',
};

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const event = (await req.json()) as PerceptionEvent;
  const sessionId = params.id;

  // Broadcast to SSE subscribers (Co-pilot, admin detail)
  broadcast(sessionId, event);

  try {
    switch (event.type) {
      case 'transcript_turn':
        await logTranscript(sessionId, event.payload);
        if (event.payload.speaker === 'customer') appendTranscript(sessionId, event.payload.text);
        break;

      case 'cv_signal':
        await logCvSignal(sessionId, event.payload);
        appendCvSignal(sessionId, event.payload);
        break;

      case 'form_field_extracted': {
        const { field, value } = event.payload;
        updateFormField(sessionId, field, value);
        const col = FIELD_COLUMN[field];
        if (col) {
          await prisma.session.update({ where: { id: sessionId }, data: { [col]: value } }).catch(() => {});
        }
        break;
      }

      case 'device_fingerprint':
        setDeviceFingerprint(sessionId, event.payload);
        await prisma.session
          .update({
            where: { id: sessionId },
            data: { deviceFingerprint: JSON.stringify(event.payload) },
          })
          .catch(() => {});
        break;

      case 'document_captured': {
        const session = await prisma.session.findUnique({
          where: { id: sessionId },
          select: { documentCapturesJson: true },
        }).catch(() => null);
        const existing: unknown[] = session?.documentCapturesJson
          ? JSON.parse(session.documentCapturesJson)
          : [];
        existing.push(event.payload);
        await prisma.session
          .update({
            where: { id: sessionId },
            data: { documentCapturesJson: JSON.stringify(existing) },
          })
          .catch(() => {});
        break;
      }

      case 'consent_captured':
        await prisma.consentRecord
          .create({
            data: {
              sessionId,
              consentType: event.payload.consent_type,
              verbalText: event.payload.verbal_text,
              audioRef: event.payload.audio_ref ?? null,
              timestamp: new Date(),
            },
          })
          .catch(() => {});
        break;
    }
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true });
}
