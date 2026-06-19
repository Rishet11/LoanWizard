import type { STTResult } from './web-speech';

export class AudioBuffer {
  private blobs: Blob[] = [];
  private recorder: MediaRecorder | null = null;
  private readonly maxDurationMs = 10000;

  start(stream: MediaStream): void {
    this.blobs = [];
    // MediaRecorder with an audio mimeType cannot accept a stream that also
    // contains video tracks on some browsers (Windows Chrome throws
    // NotSupportedError). Build an audio-only stream from the audio tracks.
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) throw new Error('No audio tracks in stream');
    const audioStream = new MediaStream(audioTracks);

    const mime = this.bestMime();
    this.recorder = mime
      ? new MediaRecorder(audioStream, { mimeType: mime })
      : new MediaRecorder(audioStream);

    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.blobs.push(e.data);
      // Keep a rolling 10s window — each chunk is ~1s
      if (this.blobs.length > 10) this.blobs.shift();
    };
    this.recorder.start(1000); // 1s chunks
  }

  stop(): void {
    this.recorder?.stop();
    this.recorder = null;
  }

  getBlob(): Blob | null {
    if (this.blobs.length === 0) return null;
    return new Blob(this.blobs, { type: this.blobs[0].type });
  }

  private bestMime(): string {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'];
    return candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
  }
}

export async function whisperFallback(
  audioBlob: Blob,
  endpointUrl: string,
): Promise<STTResult> {
  const form = new FormData();
  form.append('file', audioBlob, 'audio.webm');
  form.append('language', 'en');

  const res = await fetch(endpointUrl, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Whisper endpoint ${res.status}`);
  const data = await res.json() as { text: string; confidence?: number };
  return {
    text: data.text.trim(),
    confidence: data.confidence ?? 0.75,
    isFinal: true,
  };
}
