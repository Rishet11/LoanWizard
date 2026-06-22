# LoanWizard: Submission Readiness (Bharat Academix CodeQuest 2026, Round 2)

> AI video loan origination: the customer applies by talking to their camera; the
> system verifies liveness, fills the form by voice, scores risk and fraud with real
> Keras models, and returns an instant, explainable, auditable offer in minutes, not days.

**Round 2 (Prototype Development) deadline: 22 Jun 2026, 11:59 PM IST.**
Submit via **both** the Unstop dashboard (ZIP) and the Google Form.

## Live links

- **Live app (frontend):** https://rishet11-loanwizard-web.hf.space/
- **Live ML API (backend):** https://rishet11-loanwizard-ml.hf.space/ (`/health`, `/docs`)
- **Presentation, demo video and PDFs:** https://drive.google.com/drive/folders/1-aanpEn7EELmkbgKpguxsXyxLnKeT2ai?usp=sharing

---

## 1. Deliverables checklist

| Required deliverable | Status | Where |
|---|---|---|
| Functional Prototype / MVP | ✅ Ready | Full flow perception → ML → offer → admin; live at https://rishet11-loanwizard-web.hf.space/ and runs locally |
| Source Code | ✅ Ready | This monorepo (web, ml-service, perception, contracts); MIT `LICENSE` |
| Technical Documentation | ✅ Ready | `docs/technical-documentation.pdf` (+ `README.md`, `QNA.md`, `docs/DEPLOYMENT.md`, this file) |
| Presentation Deck (PDF) | ✅ Ready | `docs/presentation-deck.pdf` (12 slides, in the repo) + the Drive folder above |
| Architecture Diagram | ✅ Ready | `docs/architecture-current.pdf` (as built) + `docs/architecture-target.pdf` (target platform) |
| Demo Video | ✅ Ready | In the Google Drive folder linked above |

The deck, technical documentation and both architecture diagrams are committed as PDFs under
`docs/` (sources in `docs/src/`).

**You still need to:** download/assemble the ZIP and submit on Unstop + Google Form. The two HF
Spaces and the demo video are already live (links above).

---

## 2. Build & test results (verified in this environment)

| Component | Check | Result |
|---|---|---|
| Web (`apps/web`) | `tsc --noEmit` | ✅ clean |
| Web | `next build` **without** `DATABASE_URL` | ✅ succeeds; all routes server-rendered on demand (build needs no DB) |
| Perception (`packages/perception`) | `vitest run` | ✅ 33/33 passing |
| ML (`apps/ml-service`) | `pytest` | ✅ 95/95 passing |
| ML | `POST /offer` against committed Keras models | ✅ 200, eligible offer, risk band, fraud score, 3 reason codes + narrative, model versions stamped |
| ML | `GET /health` | ✅ `models_loaded: {risk: true, persona: true}` |

Toolchain used: Node 22, pnpm 8.15, Python 3.11, TensorFlow 2.16.1 (installed from
prebuilt wheels, no build-time compilation needed).

---

## 3. Deployment

The ML service is already deployed and live at
[`https://huggingface.co/spaces/Rishet11/loanwizard-ml`](https://huggingface.co/spaces/Rishet11/loanwizard-ml)
(health check: `https://rishet11-loanwizard-ml.hf.space/health`). This container has no network
route to HF or Neon, so the steps below are for deploying your own copy; see
**`docs/DEPLOYMENT.md`** for the full runbook plus details on the live Space above. Summary of the
recommended two-Space + Neon setup:

1. **Neon Postgres:** create a project, copy the pooled SSL connection string, then:
   ```bash
   DATABASE_URL='postgresql://...sslmode=require' pnpm --filter @loan-wizard/web db:push
   DATABASE_URL='postgresql://...sslmode=require' pnpm --filter @loan-wizard/web seed
   ```
2. **ML Space** (Docker, port 8000): deploy `apps/ml-service/`. Secrets:
   `DATABASE_URL`, `USE_MOCK_BUREAU=true`, `PERSONA_STRATEGY=rules_first`,
   `ENABLE_GEMINI_FALLBACK=false`. Smoke: `/health`, `/docs`, `/fairness/report`,
   `/drift/monthly_income/baseline`.
3. **Web Space** (Docker, port 3000): deploy the repo root. Secrets:
   `DATABASE_URL`, `ML_SERVICE_URL=https://<ml-space-host>`, `NEXT_PUBLIC_ML_MODE=mock`,
   `NEXT_PUBLIC_USE_MOCK_PERCEPTION=true`, `ADMIN_PASSWORD=<strong-secret>`.

`ADMIN_PASSWORD` is **required** on the web Space (the app throws on admin routes in
production without it). `DATABASE_URL` is required at runtime for both Spaces.

---

## 4. What is real vs mocked (demo honesty)

**Real:** the full ML decision pipeline (Keras risk MLP with model-derived permutation
importance, Keras fraud MLP, rules persona classifier, policy engine, bureau merge, reason
narrator), audit + frozen decision snapshots, decision replay **on the exact archived model
version**, the session state machine, the web UI, and the admin console (sessions, fairness,
drift, replay). Browser perception (TF.js liveness, OCR, real face-api age model, speech,
device fingerprint) is real and runs locally with `NEXT_PUBLIC_USE_MOCK_PERCEPTION=false`.
Speech-to-text falls back from the browser Web Speech API to a server-side Whisper
endpoint (`POST /transcribe`) when confidence is low.

**Mocked / optional by design:** the bureau pull (CIBIL/Experian behind an adapter, no
live credentials, intentional prototype scope), the LLM narration (deterministic template
by default, Gemini/Gemma optional), the Whisper STT model (opt-in deploy toggle, the
browser-to-server fallback is wired regardless), and the public judge link runs scripted
perception + a reliable mock offer so the end-to-end demo never depends on a webcam or a
cold ML Space.

**Browser caveat:** Web Speech API confidence is weaker on Safari and disabled by default
on Firefox, so use Chrome for the live camera demo (the Whisper fallback covers the rest).

---

## 5. Suggested demo-video run order (3–5 min)

1. Landing / Operator Console: one-line pitch, live gauges.
2. Start session → scripted interview fills the form by "voice" (no camera needed on the
   hosted link), liveness/fraud signals tick in the co-pilot panel.
3. Processing → **Offer card**: rate, EMI, weighted reason codes, plain-language narrative.
4. Accept → 3-day cool-off + downloadable Key Fact Statement.
5. `/admin` → session timeline + evidence, **fairness** and **drift** dashboards, and a
   one-click **decision replay** on the frozen snapshot.
6. (Optional) Local real-camera mode + the live ML Space `/docs` to prove the models are real.

---

## 6. Changes made during finalization

Observability & schema:
- ML: surfaced previously-silent failures in drift tracking and event emission as logged
  warnings (`apps/ml-service/app/routes/offer.py`); warn when the fraud model loads but
  its scaler is missing (`app/services/fraud_scorer.py`); documented `DATABASE_URL` as
  required for audit persistence (`apps/ml-service/README.md`).
- Web: `agentNotes` is now `@db.Text` and explicit `@@index([sessionId])` added to the
  child tables (`apps/web/prisma/schema.prisma`); added a runtime `DATABASE_URL` guard
  with a clear error on the session-start route (`apps/web/src/lib/env.ts`).

Correctness & de-gimmicking (full audit pass):
- ML: reason-code feature importance is now **real model permutation importance**
  (`risk_scorer.py`) instead of a raw-magnitude proxy, so explanations reflect what the
  model actually responds to; the heuristic remains only as a fallback.
- ML: fixed the decision-snapshot `policy_passed` field to store the actual policy result
  (`offer.py`); added a log when no age signal is present (`policy_engine.py`).
- ML: the mock bureaus are now genuinely deterministic via a stable SHA-256 seed
  (`bureau/base.py`), fixing a flaky test caused by Python's per-process `hash()` salting.
- Web: removed a dead "Interject (stub)" button (copilot); replaced a dead `href="#"`
  consent link with a real expandable DPDP disclosure; the offer page now shows an error
  state with retry instead of spinning forever; the admin "Fraud alerts" KPI is a real DB
  count; fixed a wrong replay-form placeholder; labelled the landing console's simulated
  metrics/preview so nothing reads as fake live data.
- Docs: added a "Known limitations" section to the README and softened an unbacked
  "under two minutes" claim to "in minutes, not days".

Known-limitation fixes (judge-hardening pass):
- ML: **decision replay now loads the exact archived model version** recorded on the
  decision (`app/services/model_loader.py`, `routes/decisions.py`); weights are archived
  per version under `app/models/*/archive/<version>/`, with `exact_model_match` reported
  in the response and training scripts auto-archiving future versions.
- ML: added a real **`POST /transcribe`** Whisper endpoint (`routes/transcribe.py`,
  `services/transcriber.py`, optional `audio` extra) with graceful 503 when disabled;
  unit-tested with a mocked backend.
- Web/perception: the browser STT **Whisper fallback is now wired** end-to-end via
  `NEXT_PUBLIC_TRANSCRIBE_URL` (`lib/config.ts`, `AgentCallUI.tsx`).
- Perception: the age estimator now runs a **real face-api model** with weights vendored
  under `models/face-api/` + `apps/web/public/models/face-api/` (`cv/age-estimator.ts`),
  with a graceful mock fallback.
- Bureau pull is left mocked on purpose (prototype scope; real adapter is a drop-in).
