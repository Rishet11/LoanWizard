# Stream A: Perception Plus

**Owner:** one independent build stream
**Path:** `packages/perception/`
**Duration:** ~20-24 hrs
**Prereq:** Contract bump landed (see `prds/README.md`)

**Do not touch:**
- `packages/contracts/` (READ-ONLY, but you rely on the new events the contract bump added)
- `apps/ml-service/` (not your problem)
- `apps/web/` (not your problem)
- Root `package.json`, `turbo.json`, `tsconfig.base.json`

---

## Your Job

Take the existing browser-only perception engine and level it up to a richer customer-side perception layer: **multi-lingual, document-aware, passively anti-spoof, fraud-signalling, consent-capturing**. Everything still runs in the tab, with no new backend dependencies.

The rule: the `usePerception()` hook's public API must stay compatible. Existing callers in `apps/web/` keep working. All new capabilities come through additional events on the existing event bus.

---

## Deliverables

1. **Multi-language STT**: English + Hindi at minimum, with runtime switching and auto-detect on first utterance.
2. **Document capture flow**: Aadhaar + PAN card scan via camera, OCR'd on-device.
3. **Passive liveness v2**: yaw challenge ("look left, now right"), texture/noise score for deepfake resistance.
4. **Device fingerprint**: one-shot event emitted on session start (UA + screen + canvas hash + TZ + lang).
5. **Consent evidence**: capture verbal consent, emit event with text + audio blob ref + sha256 text hash.
6. **Real age estimator**: replace mock with actual MobileNet-based regressor (ship model weights in `public/models/`).
7. **CV loop in Web Worker**: offload TF.js face/liveness to a worker so the UI never jank-stutters.
8. **Per-extractor tests** plus integration test for the new doc-capture flow.
9. **TODO_INTEGRATION.md update**: document the new events Stream C needs to handle.

---

## Public API (must stay compatible)

```ts
// packages/perception/src/index.ts (DO NOT CHANGE)
export interface PerceptionConfig {
  sessionId: string;
  sttFallbackUrl?: string;
  sttConfidenceThreshold?: number;
  ageModelUrl?: string;
  onEvent: (event: PerceptionEvent) => void;
  script?: AgentScript;
  // NEW (additive, optional):
  language?: 'en' | 'hi';
  enableDocCapture?: boolean;       // default true
  enableYawChallenge?: boolean;     // default true
}
export interface PerceptionHandle {
  status: 'idle' | 'requesting_permissions' | 'ready' | 'running' | 'ended' | 'error';
  videoRef: RefObject<HTMLVideoElement>;
  start: () => Promise<void>;
  stop: () => void;
  error: string | null;
  // NEW:
  setLanguage: (lang: 'en' | 'hi') => void;
  captureDocument: (docType: 'aadhaar' | 'pan') => Promise<void>;
}
```

Every new feature must emit events. No direct callbacks beyond `onEvent`.

---

## Feature specs

### 1. Multi-language STT

- Wrap `WebSpeechSTT` with a language param; map `en` → `en-IN`, `hi` → `hi-IN`.
- On first customer utterance, run a quick language-detect: if Web Speech confidence for `en-IN` < 0.5 AND the text contains Devanagari (regex `/[\u0900-\u097F]/`), switch to `hi-IN` and re-listen.
- Emit `{ type: 'language_detected', payload: { lang } }` (extend the `LanguageDetectedEvent` contract type, coordinate before landing).
- TTS (`browser-tts.ts`) picks Hindi voice if `lang === 'hi'`; fall back to English voice if no Hindi voice installed.

### 2. Document capture flow

- New module `packages/perception/src/cv/doc-capture.ts`.
- Public method `captureDocument(docType)` on the hook:
  1. Pauses the scripted Q-flow.
  2. Shows a guided overlay in the `<video>` via a new event `{ type: 'document_capture_started', payload: { doc_type } }`; the web app renders the overlay.
  3. Uses `MediaStream` frames; runs edge-detection (simple Sobel on a canvas) to auto-capture when the document fills >70% of frame and is parallel within 10°.
  4. OCR via **tesseract.js** (tesseract.js-core lazy-loaded, English language data for both Aadhaar + PAN, add Hindi data for Aadhaar back side if time permits).
  5. For **PAN**: extract regex `/[A-Z]{5}[0-9]{4}[A-Z]/`, name line, DOB line.
     For **Aadhaar**: extract 12-digit number (regex `/\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b/`), name, DOB, gender.
  6. Compute SHA-256 of the captured frame (use `crypto.subtle.digest`).
  7. Emit `document_captured` event with OCR fields + image_hash + confidence (tesseract mean word confidence / 100).
  8. Resume the Q-flow.
- Confidence threshold: if < 0.5, emit the event with `confidence < 0.5`, and the web app decides whether to re-prompt.

### 3. Passive liveness v2

Extend `LivenessTracker` with:

- **Yaw challenge**: at one random point during the interview, the script emits a `challenge_requested` event ("Please look to your left, then right"). The CV loop tracks nose X-position; a successful challenge requires the nose-x to move > 0.2 of frame width left and right within 4 s. Emit `challenge_completed` with pass/fail.
- **Texture score**: on each face crop, compute Laplacian variance (sharpness). Deepfakes and phone-screen replays typically have low Laplacian variance. Compute `texture_score = min(1, laplacian_var / 500)` and add to the `CVSignal` payload (the contract bump added this field).
- Keep existing EAR blink logic unchanged.

### 4. Device fingerprint

- New module `packages/perception/src/fingerprint.ts`.
- Emitted **once**, right after `permission_granted`.
- Fields:
  - `ua`: `navigator.userAgent`
  - `screen`: `{ w, h, dpr }` from `screen` + `devicePixelRatio`
  - `canvas_hash`: draw "loan-wizard" string with one of each known fillStyle, read back `toDataURL()`, sha256 it
  - `timezone`: `Intl.DateTimeFormat().resolvedOptions().timeZone`
  - `lang`: `navigator.language`
- No PII: the hash is just a cohort signal for fraud.

### 5. Consent evidence

- Extend the scripted flow with a new question at the end: *"Do you consent to video-KYC recording under RBI Master Direction and processing of your data under DPDP Act?"*
- Capture the customer's response (STT), compute sha256 of the text.
- If MediaRecorder is available, keep the last 10 s of audio around the consent answer (leveraging the existing Whisper buffer; re-use code, don't duplicate).
- Emit `consent_captured` event with `consent_type: 'video_kyc' | 'data_processing' | 'credit_pull'` (emit once per consent type), `verbal_text`, `audio_ref` (object URL for now; Stream C promotes to upload), `text_hash`.

### 6. Real age estimator weights

- Replace the mock branch. Use a published MobileNet-based age regressor model:
  - Option A (preferred): `https://storage.googleapis.com/tfjs-models/tfjs/age_net/model.json` (or any TF.js-convertible age model weights you can ship statically).
  - Option B: fine-tune a small head on UTKFace subset and export via `tensorflowjs_converter`. Commit weights under `apps/web/public/models/age-mobilenet-tfjs/`.
- Confidence: keep the rolling-window scheme.
- Target: median prediction within ±5 years on adults 22–55 during manual smoke test.

### 7. Web Worker CV loop

- Move `detectFaces`, `LivenessTracker`, `AgeEstimator` into a worker: `packages/perception/src/cv/cv-worker.ts`.
- Main thread: captures a frame every 500 ms via `createImageBitmap(video)`, transfers the bitmap to the worker.
- Worker: runs TF.js inference, posts `CVSignal` back.
- Use `Comlink` (small, permissive license) to keep the ergonomics nice.
- Fallback: if `OffscreenCanvas` or worker TF.js fails to init, run on main thread with a one-line warning.

### 8. Tests

- `tests/doc-extract.test.ts`: feed 3 fixture images (commit under `tests/fixtures/`) of Aadhaar/PAN cards (can be synthetic or blurred-real), assert OCR extracts the right fields.
- `tests/liveness-yaw.test.ts`: feed a synthetic nose-x position stream, assert challenge_completed fires correctly for pass and fail cases.
- `tests/fingerprint.test.ts`: assert all 5 fields present, hash is stable across two calls in the same environment.
- `tests/consent.test.ts`: assert `consent_captured` events emit with correct text_hash (compare with `crypto.subtle` result).
- Existing extraction + script tests must keep passing.

---

## Directory additions

```
packages/perception/
  src/
    cv/
      cv-worker.ts              NEW
      doc-capture.ts            NEW
      liveness.ts               ← extend (yaw, texture)
      age-estimator.ts          ← swap mock for real
    fingerprint.ts              NEW
    consent.ts                  NEW
    stt/
      lang-detect.ts            NEW
      web-speech.ts             ← accept lang param
    tts/
      browser-tts.ts            ← pick voice by lang
    engine.ts                   ← wire new modules
    script.ts                   ← add consent question, yaw challenge trigger
    hook.ts                     ← expose setLanguage, captureDocument
  tests/
    doc-extract.test.ts         NEW
    liveness-yaw.test.ts        NEW
    fingerprint.test.ts         NEW
    consent.test.ts             NEW
    fixtures/                   NEW (sample card images)
```

---

## Dependencies to add

```json
{
  "tesseract.js": "^5.1.0",
  "comlink": "^4.4.1"
}
```

No new root-level deps. Keep everything within `packages/perception/package.json`.

---

## Performance targets

- First face detection within **1 s** of `start()` returning.
- CV loop at **2 Hz** sustained, never dropping below 1 Hz.
- Document capture OCR completes within **3 s** on mid-range laptop.
- Bundle size budget: total perception chunk (excluding tesseract lang data) ≤ **2.5 MB gzipped**.
- Tesseract worker + lang data loaded lazily, only on first `captureDocument()` call.

---

## Milestones

| Hours | Milestone |
|---|---|
| 0-2   | Contract bump verified, language detection stub emits new event |
| 2-6   | Web Worker CV loop with existing liveness + age running in worker, UI never blocks |
| 6-10  | Doc capture: overlay trigger, edge detection, tesseract OCR, PAN extraction working |
| 10-14 | Aadhaar OCR, texture score, yaw challenge complete, all new events wired |
| 14-17 | Device fingerprint, consent evidence event, real age model weights in place |
| 17-20 | Multi-lingual STT + TTS end-to-end, auto-detect working |
| 20-22 | Test coverage for all new modules, fixtures committed |
| 22-24 | TODO_INTEGRATION.md written, perf budget verified, demo script cut |

---

## Cut order if time slips

1. Drop Aadhaar OCR (keep PAN only). Aadhaar is harder because of orientation + aspect ratios.
2. Drop Hindi TTS, keep Hindi STT but respond in English.
3. Drop Web Worker offload, main thread is fine for demo with a single user.
4. Drop texture score.

**Never cut:** contract-bumped events (`document_captured`, `device_fingerprint`, `consent_captured`), even if the content is stubbed. Stream C depends on them firing.

---

## Handoff to integration (`TODO_INTEGRATION.md`)

Document:
1. Every new event type, with a one-line description and a full payload example.
2. The new `setLanguage` / `captureDocument` methods on `PerceptionHandle`.
3. Where the `document_capture_started` event expects the web app to render the overlay (position, size, what to show).
4. Performance notes (first-load cost of tesseract, etc.).
5. Demo steps: how to manually trigger a doc capture during a session.

Commit tag: `stream-a-complete`
