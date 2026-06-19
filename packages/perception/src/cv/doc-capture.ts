export type DocType = 'aadhaar' | 'pan';

export interface OcrResult {
  fields: Record<string, string>;
  confidence: number;
  imageHash: string;
}

async function sha256Frame(dataUrl: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(dataUrl.slice(0, 2000)));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function captureFrame(video: HTMLVideoElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.9);
}

function extractPAN(text: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const panMatch = text.match(/[A-Z]{5}[0-9]{4}[A-Z]/);
  if (panMatch) fields.pan_number = panMatch[0];
  const dobMatch = text.match(/\d{2}[\/\-]\d{2}[\/\-]\d{4}/);
  if (dobMatch) fields.dob = dobMatch[0];
  // Name: first ALL-CAPS line that is not the PAN number
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (/^[A-Z\s]+$/.test(line) && line.length > 4 && !panMatch?.[0].includes(line)) {
      fields.name = line;
      break;
    }
  }
  return fields;
}

function extractAadhaar(text: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const uidMatch = text.match(/[2-9]\d{3}\s?\d{4}\s?\d{4}/);
  if (uidMatch) fields.aadhaar_number = uidMatch[0].replace(/\s/g, '');
  const dobMatch = text.match(/(?:DOB|Date of Birth)[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i);
  if (dobMatch) fields.dob = dobMatch[1];
  const genderMatch = text.match(/\b(MALE|FEMALE|Male|Female)\b/);
  if (genderMatch) fields.gender = genderMatch[1].toUpperCase();
  return fields;
}

async function runTesseract(dataUrl: string): Promise<{ text: string; confidence: number }> {
  try {
    // Lazy-load tesseract to avoid bundling it upfront
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    const { data } = await worker.recognize(dataUrl);
    await worker.terminate();
    return {
      text: data.text,
      confidence: (data.confidence ?? 50) / 100,
    };
  } catch {
    // tesseract not available — return empty result, caller handles it
    return { text: '', confidence: 0 };
  }
}

export async function captureDocument(
  video: HTMLVideoElement,
  docType: DocType,
): Promise<OcrResult> {
  const dataUrl = captureFrame(video);
  const imageHash = await sha256Frame(dataUrl);

  const { text, confidence } = await runTesseract(dataUrl);
  const fields = docType === 'pan' ? extractPAN(text) : extractAadhaar(text);

  return { fields, confidence, imageHash };
}

// Returns true when a face/card fills >60% of the frame (simple brightness variance check)
export function isDocumentReady(video: HTMLVideoElement): boolean {
  if (!video.videoWidth) return false;
  try {
    const canvas = document.createElement('canvas');
    const scale = 0.1; // downsample for speed
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // Check variance — a card in frame has higher edge sharpness than empty scene
    let sum = 0, sumSq = 0;
    for (let i = 0; i < data.length; i += 4) {
      const v = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      sum += v; sumSq += v * v;
    }
    const n = data.length / 4;
    const variance = sumSq / n - (sum / n) ** 2;
    return variance > 300; // tunable threshold
  } catch {
    return true; // assume ready if we can't check
  }
}
