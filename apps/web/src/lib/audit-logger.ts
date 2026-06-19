import type { TranscriptTurn, CVSignal, ConsentRecord } from '@loan-wizard/contracts';
import { prisma } from './db';

export async function logTranscript(sessionId: string, turn: TranscriptTurn) {
  await prisma.transcript.create({
    data: {
      sessionId,
      turnIdx: turn.turn_idx,
      speaker: turn.speaker,
      text: turn.text,
      confidence: turn.confidence,
      timestamp: new Date(turn.timestamp),
      questionId: turn.question_id ?? null,
    },
  });
}

export async function logCvSignal(sessionId: string, signal: CVSignal) {
  await prisma.cvSignal.create({
    data: {
      sessionId,
      timestamp: new Date(signal.timestamp),
      ageEstimate: signal.age_estimate,
      ageConfidence: signal.age_confidence,
      livenessScore: signal.liveness_score,
      facePresent: signal.face_present,
      blinkCountWindow: signal.blink_count_window,
      headPoseDelta: signal.head_pose_delta,
      textureScore: signal.texture_score ?? null,
    },
  });
}

export async function logConsent(sessionId: string, consent: ConsentRecord) {
  await prisma.consentRecord.create({
    data: {
      sessionId,
      consentType: consent.consent_type,
      verbalText: consent.verbal_text,
      audioRef: consent.audio_ref ?? null,
      timestamp: new Date(consent.timestamp),
    },
  });
}
