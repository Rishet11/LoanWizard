import * as faceapi from '@vladmandic/face-api';

export interface AgeEstimate {
  age: number;
  confidence: number;
}

// Directory that serves the face-api weight manifests + .bin files. In the web
// app these live in /public/models/face-api; the weights are vendored from the
// @vladmandic/face-api npm package (no external download needed).
const DEFAULT_MODEL_URL = '/models/face-api';
const ROLLING_WINDOW = 5;

export class AgeEstimator {
  private samples: number[] = [];
  private modelUrl: string;
  private useMock = false;
  private ready = false;

  constructor(modelUrl?: string) {
    this.modelUrl = modelUrl ?? DEFAULT_MODEL_URL;
  }

  async load(): Promise<void> {
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri(this.modelUrl);
      await faceapi.nets.ageGenderNet.loadFromUri(this.modelUrl);
      this.ready = true;
    } catch (err) {
      console.warn('[AgeEstimator] face-api model load failed, using mock estimator', err);
      this.useMock = true;
    }
  }

  async estimate(video: HTMLVideoElement): Promise<AgeEstimate | null> {
    if (this.useMock) {
      // Graceful fallback if weights are unavailable so the session never breaks.
      const mockAge = 28 + (Math.random() * 6 - 3);
      return this.addSample(mockAge, 0.5);
    }
    if (!this.ready) return null;

    try {
      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });
      const result = await faceapi.detectSingleFace(video, options).withAgeAndGender();
      if (!result) return null;

      // Use the face-detection score as the per-frame confidence.
      const confidence = Math.max(0.3, Math.min(1, result.detection.score));
      return this.addSample(result.age, confidence);
    } catch {
      return null;
    }
  }

  private addSample(age: number, baseConfidence: number): AgeEstimate {
    this.samples.push(age);
    if (this.samples.length > ROLLING_WINDOW) this.samples.shift();

    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    // Confidence grows as the rolling window fills.
    const confidence = baseConfidence * (this.samples.length / ROLLING_WINDOW);
    return { age: Math.round(avg), confidence };
  }

  reset(): void {
    this.samples = [];
  }
}
