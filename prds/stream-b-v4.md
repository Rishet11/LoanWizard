# Stream B v4 — Decision Platform

**Owner:** 1 Claude instance
**Path:** `apps/ml-service/`
**Duration:** ~22-26 hrs
**Prereq:** Contract bump landed (see `prds/README.md`)

**Do not touch:**
- `packages/contracts/` (READ-ONLY, but you mirror the new types in Pydantic)
- `packages/perception/` — not your problem
- `apps/web/` — not your problem
- Root `package.json`, `turbo.json`

---

## Your Job

Turn the current FastAPI service (policy + risk MLP + rules-based persona + offer builder) into a proper **decision platform** that is honest-to-goodness v4-flavored: second-opinion fraud model, multi-bureau merge, LLM-narrated explainability, decision replay, event emission onto a lightweight spine, and drift/fairness scaffolding.

Everything stays inside one FastAPI process for now. No Kafka. We use **Redis Streams** as a stand-in event bus — 1-line change to Kafka later.

The rule: the public `POST /offer` endpoint stays backward compatible. New fields appear on the response (already approved via contract bump). Streams A and C do not need to change to keep working.

---

## Deliverables

1. **Fraud micro-model** — second TF Keras head trained on device/velocity signals, returns `fraud_score ∈ [0,1]`.
2. **Multi-bureau adapter pattern** — abstract `BureauAdapter` interface, ≥ 2 mock implementations (CIBIL, Experian), configurable merge strategy.
3. **LLM-narrated reason codes** — human-readable `reason_narrative` string on every Offer. Works without external API (use local template LLM or Gemma; fall back to deterministic template if both unavailable).
4. **Decision replay endpoint** — `POST /decisions/{id}/replay` re-runs the pipeline on the frozen feature snapshot; returns what-if diff.
5. **Model registry** — `GET /models` lists loaded models + versions + load timestamps.
6. **Event emission** — every decision publishes to Redis Streams with the frozen snapshot.
7. **Drift detection scaffolding** — per-request feature hash + rolling population distribution endpoint.
8. **Fairness audit harness** — pytest fixture that runs the pipeline across a synthetic cohort and asserts bounded disparate impact.
9. **Multi-tenant support** — `tenant_id` threaded through request → decision record → event.
10. **Tests** — additive, no regressions on existing policy + offer math suites.

---

## API contract (additions)

All additive. Existing callers keep working.

### `POST /offer` (unchanged shape, richer response)

**Request** adds optional `tenant_id`:
```json
{
  "session_id": "sess_abc",
  "tenant_id": "nbfc_alpha",
  "form_data": { ... },
  "cv_signals_summary": { ... },
  "transcript_snippets": [ ... ],
  "device_fingerprint": { "ua": "...", "canvas_hash": "...", "timezone": "..." }
}
```

**Response** adds:
```json
{
  ...existing Offer fields...,
  "fraud_score": 0.12,
  "reason_narrative": "Approved. Stable salaried income of ₹75,000/mo and strong CIBIL (782). Low loan-to-income (0.4x). Rate is +0.5% to account for thin bureau file.",
  "model_versions": { "risk": "1.2.0", "fraud": "0.1.0", "persona_rules": "1.0.0" }
}
```

### `POST /decisions/{decision_id}/replay`
**Body:**
```json
{
  "overrides": {
    "form_data": { "monthly_income": 90000 },
    "cv_signals_summary": { "min_liveness": 0.9 }
  }
}
```
**Response:**
```json
{
  "original": { "offer": {...}, "risk_band": "low", "eligible": true },
  "replayed": { "offer": {...}, "risk_band": "low", "eligible": true },
  "diff": [
    { "field": "interest_rate", "from": 13.0, "to": 12.0 },
    { "field": "amount", "from": 150000, "to": 200000 }
  ]
}
```

### `GET /models`
```json
{
  "risk":    { "version": "1.2.0", "loaded_at": "2026-04-19T10:00:00Z", "backend": "keras" },
  "fraud":   { "version": "0.1.0", "loaded_at": "2026-04-19T10:00:00Z", "backend": "keras" },
  "persona": { "version": "1.0.0", "loaded_at": "2026-04-19T10:00:00Z", "backend": "rules" }
}
```

### `GET /drift/{feature}`
Returns rolling stats for the named feature across the last N decisions — for ops dashboards.
```json
{ "feature": "monthly_income", "n": 837, "mean": 48230, "std": 21004, "p50": 45000, "p99": 130000 }
```

### `GET /fairness/report`
Runs the synthetic cohort and returns approval-rate buckets:
```json
{
  "by_employment": { "salaried": 0.78, "self_employed": 0.66, "unemployed": 0.04 },
  "by_age_bucket": { "21-30": 0.71, "31-45": 0.74, "46-65": 0.68 },
  "disparate_impact_ratio": 0.85  // must be ≥ 0.8 (4/5ths rule)
}
```

---

## Feature specs

### 1. Fraud micro-model

Train a **second Keras MLP** on synthetic fraud labels.

**Features** (12):
- `canvas_hash_cohort_size` — count of prior sessions with same canvas_hash (velocity signal)
- `session_age_sec` — time between `session_start` and `offer_request`
- `transcript_length` — total chars
- `form_mutations` — count of `form_field_extracted` events (more edits = more suspicious)
- `min_liveness`, `avg_liveness`, `face_present_ratio`, `texture_score_avg` — from CV summary
- `ua_entropy` — Shannon entropy of the UA string (very low or very high = bot)
- `income_to_loan_ratio` — sanity
- `declared_age_minus_cv_age` — mismatch
- `geo_tier` — 1/2/3 if geo provided else -1

**Target:** synthesized from 4 rules with noise:
- fraud if `canvas_hash_cohort_size > 3` (multi-account signal)
- fraud if `min_liveness < 0.2` AND `face_present_ratio > 0.9` (deepfake signal)
- fraud if `session_age_sec < 60` (rushed submission)
- fraud if `declared_age_minus_cv_age > 15`

**Arch:** Keras `Sequential([Dense(32, relu), Dropout(0.2), Dense(16, relu), Dense(1, sigmoid)])`. Train 15 epochs on ~10k synthetic rows. Commit `fraud_model.keras` and `fraud_scaler.npz`.

**Serve:** inline load, same pattern as risk model. Version string in `__init__`.

### 2. Multi-bureau adapter pattern

```
services/
  bureau/
    __init__.py
    base.py           # BureauAdapter interface
    cibil_mock.py     # deterministic by name-hash
    experian_mock.py  # different score distribution, different feature set
    merge.py          # merge strategies
```

`base.BureauAdapter`:
```python
class BureauAdapter(Protocol):
    name: str
    def lookup(self, form: FormData) -> BureauResult: ...
```

`BureauResult`:
```python
class BureauResult(BaseModel):
    bureau: str
    credit_score: int
    existing_loans: int
    default_history: bool
    thin_file: bool
    raw: dict  # bureau-specific fields
```

`merge.py` exposes `merge_strategies: dict[str, Callable]`:
- `"max"`: take the higher score; union existing_loans; OR default_history
- `"avg"`: mean score; sum existing_loans; any default_history
- `"weighted"`: weight by adapter priority in config

Configurable via env: `BUREAU_ADAPTERS="cibil,experian"`, `BUREAU_MERGE_STRATEGY="weighted"`.

`bureau_mock.py` at the old path becomes a thin shim that calls the new merged adapter. Keep the existing function signature so nothing upstream breaks.

### 3. LLM reason narration

New service: `services/reason_narrator.py`.

Two paths:
- **`template`** (default, always available): deterministic Jinja template that stitches risk_band + top feature importances + policy flags + persona into a natural sentence. This is the safety net.
- **`gemma`**: if `ENABLE_GEMMA=true` AND Gemma loads successfully, prompt it with a structured JSON of the decision inputs and ask for a ≤ 50-word narration. Parse, validate length, sanitize. Fall back to template on any failure.
- **`gemini`**: if `ENABLE_GEMINI_FALLBACK=true` AND `GEMINI_API_KEY` set, same contract.

**Strict output contract:**
- Max 300 chars.
- Must start with "Approved" or "Rejected".
- Must mention at least one concrete number from the decision (rate, amount, or score).
- A post-processor enforces these; any violation triggers template fallback.

Wire into `offer_builder.build_offer()` — set `offer.reason_narrative` before return.

### 4. Decision replay

- Every `POST /offer` call persists the full input snapshot to a new `decision_snapshots` table (JSONB column).
- `POST /decisions/{id}/replay`:
  1. Load snapshot.
  2. Apply `overrides` (deep-merge into snapshot inputs).
  3. Re-run the full pipeline with **frozen model versions** (record which versions were used at original decision time; re-load them from disk if they've changed — ship a `models_archive/` directory).
  4. Compute JSON diff between original offer and replayed offer.
  5. Return `{ original, replayed, diff }`.
- If model versions have rolled forward since original decision, return both original's and current's outputs to let the operator compare.

### 5. Event emission (Redis Streams)

- New env: `EVENT_STREAM_URL=redis://localhost:6379`.
- If unset, events go to stdout only (dev mode).
- Stream names: `decisions`, `offers`, `frauds`.
- Payload: the full request + full response + model versions + timestamp.
- Use `redis-py` async client; non-blocking — a failure to emit must never fail the HTTP response.

### 6. Drift detection

- Maintain a rolling in-memory window of the last 1000 requests (or backed by Redis if available).
- For each numeric feature: keep count, sum, sum-of-squares, reservoir sample for quantiles.
- `GET /drift/{feature}` returns the stats.
- On boot, compute the "training distribution" from the synthetic training set and expose `GET /drift/{feature}/baseline`.
- Nothing here is auto-alerting; Stream C's admin dashboard will poll it.

### 7. Fairness harness

`tests/test_fairness.py`:
- Build a synthetic cohort of 200 customers stratified by employment × age bucket × income bucket.
- Run `POST /offer` against each.
- Assert: four-fifths rule — min_group_approval / max_group_approval ≥ 0.8 across employment types and age buckets.
- Exposed at runtime via `GET /fairness/report` using the same fixture.

### 8. Multi-tenant

- `tenant_id` optional on request, default `"default"`.
- Included in audit row + emitted event.
- Future: adapter selection could vary by tenant; for now just carry through.

---

## Directory additions

```
apps/ml-service/
  app/
    routes/
      offer.py                 ← extend response; add replay handler
      decisions.py             NEW (POST /decisions/{id}/replay)
      models.py                NEW (GET /models)
      drift.py                 NEW (GET /drift/*)
      fairness.py              NEW (GET /fairness/report)
    services/
      bureau/
        __init__.py            NEW
        base.py                NEW
        cibil_mock.py          NEW (port bureau_mock.py logic)
        experian_mock.py       NEW
        merge.py               NEW
      fraud_scorer.py          NEW
      reason_narrator.py       NEW
      model_registry.py        NEW
      event_emitter.py         NEW
      drift_tracker.py         NEW
    models/
      fraud_mlp/
        train.py               NEW
        fraud_model.keras      NEW (committed)
        features.py            NEW
      models_archive/          NEW (frozen model versions for replay)
    db/
      models.py                ← add decision_snapshots, tenant_id
  scripts/
    train_fraud_model.py       NEW
    seed_fairness_cohort.py    NEW
  tests/
    test_fraud_features.py     NEW
    test_bureau_merge.py       NEW
    test_reason_narrator.py    NEW
    test_decision_replay.py    NEW
    test_fairness.py           NEW
```

---

## Dependencies to add

```toml
[project]
dependencies = [
  ...existing...,
  "redis==5.0.4",
  "jinja2==3.1.4",
]
```

---

## Performance targets

- `POST /offer` p95 ≤ **400 ms** with all new features enabled (no LLM call in template mode).
- `POST /offer` p95 ≤ **1.5 s** with Gemini narration on.
- `POST /decisions/{id}/replay` ≤ **600 ms**.
- Redis emit adds ≤ **5 ms** overhead.
- Fraud model inference ≤ **20 ms**.

---

## Milestones

| Hours | Milestone |
|---|---|
| 0-2   | Contract bump mirrored in Pydantic; existing tests green |
| 2-6   | Fraud synthetic data generator + trained fraud_model.keras committed |
| 6-10  | Fraud scorer wired into offer pipeline; `fraud_score` in response |
| 10-14 | Multi-bureau adapter pattern: 2 adapters + 3 merge strategies, all tested |
| 14-17 | Reason narrator (template path) + integration into offer builder |
| 17-19 | Decision snapshots + `/decisions/{id}/replay` with diff output |
| 19-21 | `/models`, `/drift/*`, `/fairness/report` endpoints + fairness test passing |
| 21-23 | Redis event emitter, model registry, multi-tenant threaded through |
| 23-25 | LLM narration path (Gemma or Gemini), guarded with safety post-processor |
| 25-26 | TODO_INTEGRATION.md, perf verification, demo seed data |

---

## Cut order if time slips

1. Drop LLM narration entirely — keep template-based narration. The `reason_narrative` field stays populated and reads natural.
2. Drop drift/fairness endpoints — keep the collectors running but no public routes.
3. Drop Redis event emission — stdout only; Stream C polls DB instead.
4. Drop multi-bureau to CIBIL-only but keep the adapter interface (so it's trivial to add Experian later).

**Never cut:** fraud_score, reason_narrative (even template), decision snapshots, `/decisions/{id}/replay`. These are the v4 demo centerpieces.

---

## Handoff to integration (`TODO_INTEGRATION.md` additions)

Document:
1. Full response shape of `POST /offer` with all new fields.
2. `POST /decisions/{id}/replay` contract with example curl.
3. `GET /models`, `/drift/*`, `/fairness/report` — what Stream C can render.
4. Redis stream names + payload schema (for future consumer services).
5. All new env vars: `BUREAU_ADAPTERS`, `BUREAU_MERGE_STRATEGY`, `ENABLE_GEMMA`, `ENABLE_GEMINI_FALLBACK`, `GEMINI_API_KEY`, `EVENT_STREAM_URL`, `REASON_NARRATOR_MODE`.
6. Known limits: fraud model trained on synthetic labels; narration is illustrative; drift stats are in-memory in single-replica mode.

Commit tag: `stream-b-v4-complete`
