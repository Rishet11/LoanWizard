# @loan-wizard/perception

**Owned by Stream A.**

Browser-only perception package: camera, microphone, STT, TF.js CV, liveness detection, age estimation, and the scripted agent flow. Emits `PerceptionEvent`s consumed by Stream C's orchestrator.

## Public API

```typescript
import { usePerception, DEFAULT_SCRIPT, PerceptionEngine } from '@loan-wizard/perception';

// React hook (Stream C usage)
const { videoRef, start, stop, status } = usePerception({
  sessionId: 'abc-123',
  onEvent: (e) => dispatch(e),
});

// Non-React usage
const engine = new PerceptionEngine({ sessionId: 'abc', onEvent: console.log });
engine.attachVideo(videoEl);
await engine.start();
```

## Architecture

```
usePerception (hook.ts)
  └── PerceptionEngine (engine.ts)
        ├── WebRTC media (media/webrtc.ts)
        ├── Geo (media/geo.ts)
        ├── STTRouter (stt/router.ts)
        │     ├── WebSpeechSTT (stt/web-speech.ts)
        │     └── WhisperFallback (stt/whisper-fallback.ts)
        ├── AgentScript (script.ts → extraction/regex-extractors.ts)
        ├── BrowserTTS (tts/browser-tts.ts)
        └── CV loop (cv/)
              ├── FaceDetector (BlazeFace)
              ├── AgeEstimator (TF.js MobileNet or mock)
              └── LivenessTracker (EAR + head pose)
```

## Development

```bash
# Run standalone demo (no Stream C needed)
pnpm --filter @loan-wizard/perception dev

# Tests
pnpm --filter @loan-wizard/perception test

# Typecheck
pnpm --filter @loan-wizard/perception typecheck
```

## Age Model

`AgeEstimator` runs a real in-browser model via `@vladmandic/face-api`
(tiny face detector + age/gender net). Weights are vendored under
`models/face-api/` (MIT licensed, copied from the npm package, no external
download), served at `/models/face-api` in the web app and `/face-api` in the
demo. If the weights can't load it degrades gracefully to a `28 ± 3` mock.
Re-sync weights with `node scripts/copy-face-api-models.mjs`.

## Browser Compatibility

| Feature | Chrome | Safari | Firefox |
|---|---|---|---|
| WebRTC | ✅ | ✅ | ✅ |
| Web Speech | ✅ | ⚠️ no `continuous` | ❌ flag required |
| TF.js / BlazeFace | ✅ | ✅ | ✅ |
| MediaRecorder | ✅ | ✅ (limited) | ✅ |
