# Loan Wizard, Build Briefs

This folder holds the original written briefs that each of the three independent build streams (perception, ML service, web app) was developed against. They are kept here as reference documentation of how the build was planned, not as a sign of unfinished or ongoing work. The briefs describe the path toward the target architecture (see `docs/architecture-target.pdf`) without blowing up the existing contracts.

| Brief | Stream | Owner path | Focus |
|---|---|---|---|
| [`stream-a.md`](./stream-a.md) | **A (Perception)** | `packages/perception/` | Document OCR, passive liveness v2, multi-lingual STT, device fingerprint, consent evidence |
| [`stream-b.md`](./stream-b.md) | **B (ML Service)** | `apps/ml-service/` | Fraud model, multi-bureau adapter, LLM reason narration, decision replay, event emission |
| [`stream-c.md`](./stream-c.md) | **C (Web)** | `apps/web/` | UI overhaul, Agent Co-pilot, Admin dashboard, offer/e-sign flow, i18n, tenant theming |

---

## Contract bump (one-time coordination)

This work adds new event types and one new API field. This MUST be landed before Streams A, B, C start: all three depend on it.

**Owner:** whichever stream finishes first, or a dedicated coordinator run. Should be a <= 1 hr change.

### `packages/contracts/src/types.ts` additions

```ts
// New perception events (Stream A will emit)
export type DocumentCapturedEvent = {
  type: 'document_captured';
  payload: {
    doc_type: 'aadhaar' | 'pan' | 'selfie';
    ocr: Record<string, string>;     // key/value OCR fields
    image_hash: string;              // sha256 of captured frame
    confidence: number;
  };
};

export type DeviceFingerprintEvent = {
  type: 'device_fingerprint';
  payload: {
    ua: string;
    screen: { w: number; h: number; dpr: number };
    canvas_hash: string;
    timezone: string;
    lang: string;
  };
};

export type ConsentCapturedEvent = {
  type: 'consent_captured';
  payload: {
    consent_type: 'video_kyc' | 'data_processing' | 'credit_pull';
    verbal_text: string;
    audio_ref: string | null;
    text_hash: string;               // sha256 of verbal_text
  };
};

// Add to PerceptionEvent union
export type PerceptionEvent =
  | ...existing...
  | DocumentCapturedEvent
  | DeviceFingerprintEvent
  | ConsentCapturedEvent;

// Extend CVSignal for anti-deepfake
export interface CVSignal {
  ...existing...
  texture_score?: number | null;     // 0–1, optional
}

// Multi-tenant + fraud on Risk I/O
export interface RiskScoreInput {
  ...existing...
  tenant_id?: string;
}
export interface RiskScoreOutput {
  ...existing...
  fraud_score?: number | null;       // 0–1
}

// Offer enrichment (Stream B adds, Stream C renders)
export interface Offer {
  ...existing...
  reason_narrative?: string | null;  // LLM-generated human explanation
  fraud_score?: number | null;
}
```

### Zod schemas

Mirror every addition in `packages/contracts/src/schemas.ts`. Bump the package version.

### Mocks

Extend `packages/contracts/src/mocks.ts` with `MOCK_DOCUMENT_CAPTURED`, `MOCK_DEVICE_FINGERPRINT`, `MOCK_CONSENT_CAPTURED`, and update `MOCK_PERCEPTION_EVENT_SEQUENCE`.

---

## Ground rules (unchanged from the project's build contract)

- No touching another stream's directory.
- All cross-stream communication goes through the contract types.
- If you need a new type, STOP and do the contract bump above in a single PR first.
- `turbo.json`, root `package.json`, `tsconfig.base.json` are off-limits.

---

## Suggested sequencing

```
T+0h    Contract bump merged
T+0h    Streams A, B, C start in parallel
T+18h   Each stream hits their "integration ready" milestone (see individual PRDs)
T+20h   3-way integration: real perception events → ML decision → UI render
T+24h   Hardening, demo scripts, docs
```

## Demo script (what the finished build looks like in the pitch)

1. **Tenant theming**: open the app as "NBFC Alpha" (navy theme), switch to "NBFC Beta" (emerald theme).
2. **Language switch**: toggle to Hindi; STT and TTS follow.
3. **Video interview**: camera up, passive liveness challenge (look left/right), customer speaks, Aadhaar + PAN scan inline.
4. **Agent Co-pilot**: side panel shows live transcript, form extractions, CV confidence, fraud score ticking.
5. **Decision**: offer card with LLM-narrated reason codes ("Approved: stable salaried income, low LTV. Rate +0.75% for thin file.").
6. **Admin**: jump to `/admin`, open the session that just ran, see the full timeline with fraud signals and consent evidence, click "Replay Decision" to re-run on frozen features.
7. **Compliance**: click "Download Audit Pack" to get a ZIP of video blob refs, consent hashes, decision features, and model version.

That's the full story in one 2-minute demo.
