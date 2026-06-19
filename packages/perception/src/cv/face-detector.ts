import * as blazeface from '@tensorflow-models/blazeface';
import '@tensorflow/tfjs';

export type BlazeFacePrediction = blazeface.NormalizedFace;

let modelPromise: Promise<blazeface.BlazeFaceModel> | null = null;

export function getFaceDetector(): Promise<blazeface.BlazeFaceModel> {
  if (!modelPromise) {
    modelPromise = blazeface.load({ maxFaces: 1 });
  }
  return modelPromise;
}

export async function detectFaces(
  video: HTMLVideoElement,
): Promise<BlazeFacePrediction[]> {
  const model = await getFaceDetector();
  return model.estimateFaces(video, false) as Promise<BlazeFacePrediction[]>;
}

// Eye landmarks from BlazeFace: indices 0-5 are [rightEye, leftEye, nose, mouth, rightEar, leftEar]
export function getLandmarks(face: BlazeFacePrediction): number[][] {
  const lm = face.landmarks as number[][];
  return lm;
}
