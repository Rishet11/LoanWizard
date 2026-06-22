# Perception → Integration Notes

## Assumptions about Stream C
- Stream C calls `usePerception({ sessionId, onEvent })` from a `'use client'` component.
- `videoRef` is attached to a `<video>` element that is mounted before `start()` is called.
- Stream C dispatches every `PerceptionEvent` to its own state store; Perception does not maintain UI state.
- Stream C's session API provides the `sessionId`; Perception never creates one.

## Unreliable Events (flag for integration tests)
- `cv_signal`: may not fire for the first 1-2 seconds while TF.js models load. Integration test should not assert on the first signal.
- `transcript_turn` confidence: Web Speech API on Safari returns `confidence = 0` for all results. Treat Safari confidence as 0.5 and always route to Whisper if fallback URL is set.
- `form_field_extracted` for `name`: emitted with confidence 0.4-0.5 on single-word answers. Stream B's LLM should clean these up.

## Model Decision
- Age estimation now uses a real in-browser model via `@vladmandic/face-api`.
  Weights are vendored from the npm package into `packages/perception/models/face-api/`
  and `apps/web/public/models/face-api/` (re-sync with `scripts/copy-face-api-models.mjs`).
- `AgeEstimator` still falls back to a `28 ± 3` mock if the weights fail to load.
- Demo serves these at `/face-api`; the Next.js app serves them at `/models/face-api`.

## Known Browser Issues
- **Safari**: `SpeechRecognition` is `webkitSpeechRecognition`, `continuous = true` is unreliable. Safari fires `onend` after each utterance; the STT wrapper restarts automatically but there may be a 300ms gap.
- **Firefox**: Web Speech API is disabled by default behind `media.webspeech.recognition.enable` flag. Whisper fallback is the primary path on Firefox.
- **Chrome/Edge**: Primary target. All features tested.

## Geo
- `captureGeo()` times out after 5s and resolves `null`. `permission_granted.geo` will be `false` if the user denies or the browser is slow.

## Audio Buffer for Whisper
- `AudioBuffer` keeps a 10-second rolling window. If a question takes >10s to answer, the beginning of the answer is lost. Whisper quality degrades for very long answers.
