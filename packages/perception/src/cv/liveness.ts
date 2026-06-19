import type { BlazeFacePrediction } from './face-detector';
import { getLandmarks } from './face-detector';

function eyeAspectRatio(eye1: number[], eye2: number[]): number {
  const dx = eye1[0] - eye2[0];
  const dy = eye1[1] - eye2[1];
  return Math.sqrt(dx * dx + dy * dy);
}

// Laplacian variance for texture/sharpness — low variance = deepfake/screen replay
function laplacianVariance(video: HTMLVideoElement, face: BlazeFacePrediction): number {
  try {
    const [x1, y1] = face.topLeft as number[];
    const [x2, y2] = face.bottomRight as number[];
    const w = Math.max(1, Math.round(x2 - x1));
    const h = Math.max(1, Math.round(y2 - y1));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, x1, y1, w, h, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    // Grayscale
    const gray: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      gray.push(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    }
    // Laplacian approximation: variance of (pixel - mean of 4 neighbors)
    let sum = 0, sumSq = 0, n = 0;
    for (let row = 1; row < h - 1; row++) {
      for (let col = 1; col < w - 1; col++) {
        const idx = row * w + col;
        const lap = Math.abs(
          4 * gray[idx] - gray[idx - 1] - gray[idx + 1] - gray[idx - w] - gray[idx + w]
        );
        sum += lap; sumSq += lap * lap; n++;
      }
    }
    const mean = sum / n;
    return sumSq / n - mean * mean;
  } catch {
    return 500; // assume ok if canvas fails (SSR guard)
  }
}

const BLINK_EAR_THRESHOLD = 0.2;
const BLINK_WINDOW_SECS = 5;
const STILL_HEAD_SECS = 10;
const YAW_TRAVEL_THRESHOLD = 0.2; // fraction of frame width

interface BlinkSample { ts: number; ear: number }

export type YawChallengeState = 'idle' | 'started' | 'gone_left' | 'gone_right' | 'done';

export class LivenessTracker {
  private blinkSamples: BlinkSample[] = [];
  private blinkCount = 0;
  private inBlink = false;
  private noseHistory: Array<{ ts: number; x: number; y: number }> = [];

  // Yaw challenge state
  private yawState: YawChallengeState = 'idle';
  private yawStartTs = 0;
  private yawBaseX = 0;
  private yawFrameW = 1;
  private yawOnComplete: ((passed: boolean) => void) | null = null;

  startYawChallenge(frameWidth: number, onComplete: (passed: boolean) => void): void {
    this.yawState = 'started';
    this.yawStartTs = Date.now();
    this.yawFrameW = frameWidth || 640;
    this.yawOnComplete = onComplete;
    // baseline nose x set on first update after challenge starts
    this.yawBaseX = -1;
  }

  update(
    face: BlazeFacePrediction,
    ts: number,
    video?: HTMLVideoElement,
  ): { blinkCount: number; headPoseDelta: number; textureScore: number } {
    const lm = getLandmarks(face);
    const rightEye = lm[0];
    const leftEye = lm[1];
    const nose = lm[2];

    const faceBox = face.topLeft as number[];
    const faceBox2 = face.bottomRight as number[];
    const faceH = Math.abs(faceBox2[1] - faceBox[1]) || 1;
    const ear = eyeAspectRatio(rightEye, leftEye) / faceH;

    if (ear < BLINK_EAR_THRESHOLD) {
      if (!this.inBlink) { this.inBlink = true; this.blinkCount++; }
    } else { this.inBlink = false; }

    this.blinkSamples.push({ ts, ear });
    this.blinkSamples = this.blinkSamples.filter((s) => ts - s.ts < BLINK_WINDOW_SECS * 1000);

    this.noseHistory.push({ ts, x: nose[0], y: nose[1] });
    this.noseHistory = this.noseHistory.filter((n) => ts - n.ts < STILL_HEAD_SECS * 1000);

    let headPoseDelta = 0;
    if (this.noseHistory.length >= 2) {
      const first = this.noseHistory[0], last = this.noseHistory[this.noseHistory.length - 1];
      headPoseDelta = Math.hypot(last.x - first.x, last.y - first.y);
    }

    // Yaw challenge tracking
    if (this.yawState === 'started' || this.yawState === 'gone_left') {
      const elapsed = ts - this.yawStartTs;
      if (elapsed > 4000) {
        this.yawState = 'done';
        this.yawOnComplete?.(false);
        this.yawOnComplete = null;
      } else {
        if (this.yawBaseX < 0) this.yawBaseX = nose[0];
        const travel = (nose[0] - this.yawBaseX) / this.yawFrameW;
        if (this.yawState === 'started' && travel < -YAW_TRAVEL_THRESHOLD) {
          this.yawState = 'gone_left';
        } else if (this.yawState === 'gone_left' && travel > YAW_TRAVEL_THRESHOLD) {
          this.yawState = 'done';
          this.yawOnComplete?.(true);
          this.yawOnComplete = null;
        }
      }
    }

    const textureScore = video ? Math.min(1, laplacianVariance(video, face) / 500) : 1;

    return { blinkCount: this.blinksInWindow(ts), headPoseDelta, textureScore };
  }

  private blinksInWindow(now: number): number {
    return this.blinkSamples.filter(
      (s) => now - s.ts < BLINK_WINDOW_SECS * 1000 && s.ear < BLINK_EAR_THRESHOLD,
    ).length;
  }

  getLivenessScore(now: number): number {
    const blinks = this.blinksInWindow(now);
    const hasMove = this.noseHistory.length >= 2 &&
      Math.hypot(
        this.noseHistory[this.noseHistory.length - 1].x - this.noseHistory[0].x,
        this.noseHistory[this.noseHistory.length - 1].y - this.noseHistory[0].y,
      ) > 5;
    if (blinks > 0 && hasMove) return 1.0;
    if (blinks > 0 || hasMove) return 0.5;
    return 0.0;
  }

  get yawChallengeState(): YawChallengeState { return this.yawState; }

  reset(): void {
    this.blinkSamples = [];
    this.blinkCount = 0;
    this.noseHistory = [];
    this.inBlink = false;
    this.yawState = 'idle';
    this.yawOnComplete = null;
  }
}
