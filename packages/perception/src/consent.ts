async function sha256Text(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export type ConsentType = 'video_kyc' | 'data_processing' | 'credit_pull';

export interface ConsentEvidence {
  consent_type: ConsentType;
  verbal_text: string;
  audio_ref: string | null;
  text_hash: string;
}

export async function buildConsentEvidence(
  consentType: ConsentType,
  verbalText: string,
  audioBlob: Blob | null,
): Promise<ConsentEvidence> {
  const text_hash = await sha256Text(verbalText);
  const audio_ref = audioBlob ? URL.createObjectURL(audioBlob) : null;
  return { consent_type: consentType, verbal_text: verbalText, audio_ref, text_hash };
}
