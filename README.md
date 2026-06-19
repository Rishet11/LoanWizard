# LoanWizard

> Apply for a loan by talking to your camera. The model watches, listens, verifies, and prices the offer in under two minutes. No branch, no paperwork, no waiting room.

LoanWizard is an AI video loan origination platform. A customer starts a session, grants camera and mic, and answers a short spoken interview. In the browser, a perception layer transcribes speech, fills the application form, runs passive liveness checks, and reads ID documents. A Python service then scores risk and fraud, applies a policy engine, and returns an instant, explainable offer. Every decision is logged with a frozen feature snapshot so it can be replayed and audited. The flow is built to the RBI Video-KYC and DPDP 2023 playbook.

<p align="center">
  <code>Next.js 14</code> ·
  <code>FastAPI</code> ·
  <code>TensorFlow / Keras</code> ·
  <code>scikit-learn</code> ·
  <code>PostgreSQL</code> ·
  <code>Prisma</code> ·
  <code>TensorFlow.js</code> ·
  <code>pnpm + Turborepo</code>
</p>

---

## The problem

Personal loan origination in India still runs on branch visits, photocopied documents, manual data entry, and multi-day waits. Video-KYC made remote onboarding legal, but most implementations bolt a video call onto the same slow paper process. The decision stays a black box, and the audit trail is thin.

## What we built

A single continuous experience where the interview *is* the application:

- **You speak, the form fills itself.** Multilingual speech-to-text extracts name, employment, income, amount and purpose as you talk.
- **The camera verifies you live.** Passive liveness (blink, head-pose, texture) plus on-device document OCR for Aadhaar and PAN. No uploads.
- **The model prices you in real time.** A risk MLP, a fraud MLP, a persona classifier and a policy engine produce a rate, an EMI and weighted reason codes.
- **The decision is explainable and replayable.** Every offer ships with reason codes and a plain-language narrative, and the exact input snapshot is frozen so the decision can be re-run later.
- **Compliance is first class.** RBI Video-KYC retention, DPDP 2023 consent and right-to-forget, a 3-day cool-off, and a downloadable Key Fact Statement.

---

## Live demo flow

1. **Landing (Operator Console).** A single-screen lending terminal showing live perception gauges, the video feed, and the decision engine, with one Initiate control.
2. **Permission gate.** Plain-language reasons before camera, mic and location are requested.
3. **Video interview.** The agent asks; the customer speaks; the form fills; liveness and fraud signals tick live in a co-pilot panel.
4. **Decision.** An offer card with the rate, EMI, reason codes and an LLM-style narrated explanation.
5. **Admin.** Open `/admin` to see the session timeline, fraud and consent evidence, fairness and drift dashboards, and a one-click decision replay on frozen features.

---

## Architecture

```
                         BROWSER
  ┌───────────────────────────────────────────────────────┐
  │  packages/perception  (Stream A)                        │
  │  camera · mic · speech-to-text · TF.js liveness         │
  │  document OCR · device fingerprint  → PerceptionEvents  │
  └───────────────────────────────────────────────────────┘
                         │  events
                         ▼
  ┌───────────────────────────────────────────────────────┐
  │  apps/web  (Stream C)  ·  Next.js 14 App Router         │
  │  session state machine · Operator Console UI            │
  │  Prisma audit writes · admin dashboards · i18n · SSE    │
  └───────────────────────────────────────────────────────┘
                         │  POST /offer
                         ▼
  ┌───────────────────────────────────────────────────────┐
  │  apps/ml-service  (Stream B)  ·  FastAPI                │
  │  risk MLP · fraud MLP · persona classifier              │
  │  policy engine · bureau merge · reason narrator         │
  │  drift tracker · fairness · decision replay  → Offer    │
  └───────────────────────────────────────────────────────┘
                         │
                  PostgreSQL  (audit + frozen decision snapshots)

  packages/contracts — shared TypeScript types, Zod schemas, mocks
```

### Monorepo layout

| Path | Stream | Description |
|---|---|---|
| `packages/perception/` | A | Browser perception: camera, mic, STT, TF.js liveness, OCR, fingerprint |
| `apps/ml-service/` | B | Python FastAPI: risk scoring, fraud, persona, policy, bureau, narration |
| `apps/web/` | C | Next.js: Operator Console UI, session orchestrator, Prisma audit, admin |
| `packages/contracts/` | shared | Frozen TypeScript types, Zod schemas and mock data across all streams |

---

## The decision pipeline (real, not mocked)

Each `POST /offer` runs the full chain and persists the result:

1. **Bureau merge** combines mock CIBIL and Experian pulls into a single profile.
2. **Policy engine** checks hard eligibility rules (age, income floor, loan cap, liveness, face presence).
3. **Risk MLP** (Keras, `v1.2.0`) scores the applicant from form, CV summary, bureau data and geo tier.
4. **Fraud MLP** (Keras, `v0.1.0`) scores fraud from CV signals, device fingerprint and geo.
5. **Persona classifier** (rules, `v1.0.0`) labels the applicant (for example `salaried_prime`).
6. **Offer builder** turns risk band and policy into amount, rate, tenure and EMI.
7. **Reason narrator** produces weighted reason codes and a plain-language explanation (template by default, optional Gemini/Gemma).
8. **Audit + snapshot** writes the decision and a frozen input snapshot for replay, plus a drift sample.

Models are pre-trained and committed under `apps/ml-service/app/models/`. Synthetic training data and training scripts are included.

---

## Quick start

Requirements: Node 18+, pnpm 8, Python 3.11, and either Docker or a local PostgreSQL 16+.

```bash
# 1. Install JS dependencies
pnpm install

# 2. Bring up Postgres + the ML service
docker compose up -d

# 3. Create the web database tables
cd apps/web
DATABASE_URL=postgresql://loan:loan@localhost:5432/loan pnpm exec prisma db push

# 4. Start the web app
pnpm --filter @loan-wizard/web dev
```

Open http://localhost:3000

### Running without Docker (native)

If Docker is not available, run the pieces directly. Use a local PostgreSQL with a `loan` role and `loan` database, then:

```bash
# ML service
cd apps/ml-service
python -m venv .venv && ./.venv/Scripts/python -m pip install -e .   # use .venv/bin on macOS/Linux
DATABASE_URL=postgresql://loan:loan@localhost:5432/loan \
  ./.venv/Scripts/python -m uvicorn app.main:app --port 8000

# Web (in another shell)
pnpm --filter @loan-wizard/web dev
```

If port 8000 is taken, run uvicorn on another port (for example 8001) and set `ML_SERVICE_URL` to match.

### Standalone perception demo (no web app needed)

```bash
pnpm --filter @loan-wizard/perception dev   # http://localhost:5173
```

---

## Configuration (web)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | none | PostgreSQL connection string |
| `ML_SERVICE_URL` | `http://localhost:8000` | ML service base URL |
| `NEXT_PUBLIC_ML_MODE` | `mock` | set to `real` to call the live ML service |
| `USE_MOCK_PERCEPTION` | `true` | set to `false` to use the real camera and mic |

ML service: `PERSONA_STRATEGY`, `USE_MOCK_BUREAU`, `ENABLE_GEMINI_FALLBACK`, `CORS_ALLOWED_ORIGINS`.

---

## Feature highlights

- **Operator Console landing.** A single-screen lending terminal rather than a scrolling marketing page.
- **Voice form-fill** in English and Hindi, with text-to-speech responses.
- **Passive liveness v2** and on-device Aadhaar and PAN OCR.
- **Explainable offers** with weighted reason codes and a narrated rationale.
- **Admin dashboards** for sessions, fairness across cohorts, feature drift, and decision replay.
- **Multi-tenant theming** (for example NBFC Alpha vs NBFC Beta) and full dark mode.
- **Compliance built in:** DPDP consent banner, right-to-forget endpoint, RBI retention notice, 3-day cool-off, Key Fact Statement.

---

## Compliance posture

| Requirement | How it is handled |
|---|---|
| RBI Video-KYC | Live video interview, liveness, recording retention notice |
| DPDP Act 2023 | Consent capture, disclosed data use, right-to-forget endpoint |
| Explainability | Weighted reason codes plus a plain-language narrative on every offer |
| Auditability | Frozen decision snapshots, model versions, one-click replay |
| Fair lending | Cohort fairness report and feature drift tracking in admin |

---

## Tech stack

- **Frontend:** Next.js 14 (App Router), React 18, Tailwind v4 (CSS-variable design tokens), Framer Motion, next-intl.
- **Perception:** TensorFlow.js, BlazeFace, face-landmarks-detection, Tesseract.js, Web Speech API.
- **ML service:** FastAPI, TensorFlow/Keras, scikit-learn, pandas, SQLAlchemy.
- **Data:** PostgreSQL, Prisma (web), SQLAlchemy (ML service).
- **Tooling:** pnpm workspaces, Turborepo, TypeScript, Zod, pytest.

---

## Team and build model

Built as three parallel streams against a frozen shared contract package, so perception, ML and web could be developed independently and integrated through typed events and a single offer API. See `prds/` for the per-stream briefs and `docs/architecture-v4.pdf` for the target architecture.

## Roadmap

- Real bureau integrations behind the existing adapter interface.
- Deepfake-resistant liveness scoring with the optional texture model.
- Server-side speech-to-text fallback for low-end devices.
- Lender console for human-in-the-loop review on borderline decisions.

See [`QNA.md`](./QNA.md) for reviewer and judge questions.
