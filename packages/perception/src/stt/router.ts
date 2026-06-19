import type { STTResult } from './web-speech';
import { AudioBuffer, whisperFallback } from './whisper-fallback';

export interface STTRouterConfig {
  sttFallbackUrl?: string;
  sttConfidenceThreshold?: number;
}

export class STTRouter {
  private audioBuffer: AudioBuffer;
  readonly threshold: number;
  readonly fallbackUrl?: string;

  constructor(config: STTRouterConfig) {
    this.threshold = config.sttConfidenceThreshold ?? 0.7;
    this.fallbackUrl = config.sttFallbackUrl;
    this.audioBuffer = new AudioBuffer();
  }

  startAudioCapture(stream: MediaStream): void {
    // Only spin up the MediaRecorder if we actually have a Whisper endpoint
    // to send audio to. Otherwise it's wasted work and a source of errors.
    if (!this.fallbackUrl) return;
    try {
      this.audioBuffer.start(stream);
    } catch (err) {
      // Fallback path becomes unavailable; primary STT still works
      console.warn('[STTRouter] audio capture failed, whisper fallback disabled', err);
    }
  }

  stopAudioCapture(): void {
    try { this.audioBuffer.stop(); } catch { /* noop */ }
  }

  getLastAudioBlob(): Blob | null {
    return this.audioBuffer.getBlob();
  }

  async resolve(primary: STTResult): Promise<STTResult> {
    if (primary.confidence >= this.threshold || !this.fallbackUrl) {
      return primary;
    }
    const blob = this.audioBuffer.getBlob();
    if (!blob) return primary;
    try {
      return await whisperFallback(blob, this.fallbackUrl);
    } catch {
      return primary;
    }
  }
}
