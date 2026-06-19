import type { FormData, CVSignal, Offer, DeviceFingerprint } from '@loan-wizard/contracts';

interface SessionState {
  formData: Partial<FormData>;
  cvSignals: CVSignal[];
  transcriptSnippets: string[];
  offer: Offer | null;
  startedAt: number;
  deviceFingerprint?: DeviceFingerprint;
}

const store = new Map<string, SessionState>();

export function initSession(id: string) {
  store.set(id, { formData: {}, cvSignals: [], transcriptSnippets: [], offer: null, startedAt: Date.now() });
}

export function getSession(id: string): SessionState | undefined {
  return store.get(id);
}

export function updateFormField(id: string, field: keyof FormData, value: unknown) {
  const s = store.get(id);
  if (!s) return;
  (s.formData as Record<string, unknown>)[field] = value;
}

export function appendCvSignal(id: string, signal: CVSignal) {
  store.get(id)?.cvSignals.push(signal);
}

export function setDeviceFingerprint(id: string, fp: DeviceFingerprint) {
  const s = store.get(id);
  if (s) s.deviceFingerprint = fp;
}

export function appendTranscript(id: string, text: string) {
  store.get(id)?.transcriptSnippets.push(text);
}

export function setOffer(id: string, offer: Offer) {
  const s = store.get(id);
  if (s) s.offer = offer;
}

export function getOffer(id: string): Offer | null {
  return store.get(id)?.offer ?? null;
}

export function buildRiskInput(id: string) {
  const s = store.get(id);
  if (!s) return null;
  const signals = s.cvSignals;
  const avgAge = signals.length
    ? signals.reduce((a, b) => a + (b.age_estimate ?? 0), 0) / signals.length
    : null;
  const avgLiveness = signals.length
    ? signals.reduce((a, b) => a + b.liveness_score, 0) / signals.length
    : 0;
  const minLiveness = signals.length ? Math.min(...signals.map((s) => s.liveness_score)) : 0;
  const faceRatio = signals.length
    ? signals.filter((s) => s.face_present).length / signals.length
    : 0;
  const textureScores = signals
    .map((sig) => sig.texture_score)
    .filter((v): v is number => v != null);
  const textureScoreAvg = textureScores.length
    ? textureScores.reduce((a, b) => a + b, 0) / textureScores.length
    : 0.85;

  return {
    session_id: id,
    form_data: s.formData as FormData,
    cv_signals_summary: {
      avg_age_estimate: avgAge,
      avg_liveness: avgLiveness,
      min_liveness: minLiveness,
      face_present_ratio: faceRatio,
      texture_score_avg: textureScoreAvg,
    },
    transcript_snippets: s.transcriptSnippets,
    device_fingerprint: s.deviceFingerprint,
  };
}
