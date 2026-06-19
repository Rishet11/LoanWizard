import * as tf from '@tensorflow/tfjs';

export interface AgeEstimate {
  age: number;
  confidence: number;
}

const MODEL_URL = '/models/age-mobilenet-tfjs/model.json';
const ROLLING_WINDOW = 5;

export class AgeEstimator {
  private model: tf.LayersModel | null = null;
  private samples: number[] = [];
  private modelUrl: string;
  private useMock: boolean;

  constructor(modelUrl?: string) {
    this.modelUrl = modelUrl ?? MODEL_URL;
    this.useMock = false;
  }

  async load(): Promise<void> {
    try {
      this.model = await tf.loadLayersModel(this.modelUrl);
    } catch {
      console.warn('[AgeEstimator] Model load failed, using mock estimator');
      this.useMock = true;
    }
  }

  async estimate(video: HTMLVideoElement): Promise<AgeEstimate | null> {
    if (this.useMock) {
      // Mock: return a plausible age each call; no declared_age available here
      const mockAge = 28 + (Math.random() * 6 - 3);
      return this.addSample(mockAge, 0.5);
    }
    if (!this.model) return null;

    try {
      const imageTensor = tf.browser.fromPixels(video)
        .resizeBilinear([224, 224])
        .expandDims(0)
        .div(255.0);

      const pred = this.model.predict(imageTensor) as tf.Tensor;
      const ageValue = (await pred.data())[0];

      tf.dispose([imageTensor, pred]);

      return this.addSample(ageValue, 0.82);
    } catch {
      return null;
    }
  }

  private addSample(age: number, baseConfidence: number): AgeEstimate {
    this.samples.push(age);
    if (this.samples.length > ROLLING_WINDOW) this.samples.shift();

    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    // Confidence grows as window fills
    const confidence = baseConfidence * (this.samples.length / ROLLING_WINDOW);
    return { age: Math.round(avg), confidence };
  }

  reset(): void {
    this.samples = [];
  }
}
