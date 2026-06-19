# ML Service — Integration Handoff (v4)

## 1. Endpoint URL and Port

```
Base URL: http://localhost:8000   (local dev)
          http://ml-service:8000  (Docker network)
```

| Endpoint | Method | Description |
|---|---|---|
| `/offer` | POST | Primary: Stream C calls this — now returns fraud_score + reason_narrative |
| `/decisions/{id}/replay` | POST | What-if replay on frozen snapshot |
| `/models` | GET | Model registry listing |
| `/drift/{feature}` | GET | Rolling stats for a feature |
| `/drift/{feature}/baseline` | GET | Training-set baseline for a feature |
| `/fairness/report` | GET | Approval rates + disparate impact ratio |
| `/mock/offer` | GET | Static mock for parallel dev |
| `/debug/risk-score` | POST | Dev only — raw risk score |
| `/debug/persona` | POST | Dev only — raw persona |
| `/health` | GET | Readiness probe |

## 2. Full `POST /offer` Response Shape (v4)

```json
{
  "session_id": "sess_abc",
  "eligible": true,
  "amount": 500000,
  "interest_rate": 12.5,
  "tenure_months": 36,
  "emi": 16961,
  "risk_band": "low",
  "persona": "salaried_prime",
  "reason_codes": [
    { "code": "STABLE_INCOME", "label": "Stable monthly income", "weight": 0.35 }
  ],
  "rejection_reason": null,
  "generated_at": "2026-04-19T10:00:00+00:00",
  "fraud_score": 0.08,
  "reason_narrative": "Approved. Salaried income of ₹75,000/mo and CIBIL 782. Rate 12.5% (low risk). EMI ₹16,961/mo over 36 months.",
  "model_versions": {
    "risk": "1.2.0",
    "fraud": "0.1.0",
    "persona_rules": "1.0.0"
  }
}
```

`eligible: false` responses include `rejection_reason` and `reason_narrative` explaining why.

## 3. `POST /decisions/{id}/replay` Contract

```bash
curl -X POST http://localhost:8000/decisions/42/replay \
  -H 'Content-Type: application/json' \
  -d '{
    "overrides": {
      "form_data": { "monthly_income": 90000 },
      "cv_signals_summary": { "min_liveness": 0.9 }
    }
  }'
```

Response:
```json
{
  "original": { "offer": {...}, "eligible": true, "risk_band": "low" },
  "replayed": { "offer": {...}, "eligible": true, "risk_band": "low" },
  "diff": [
    { "field": "interest_rate", "from": 13.0, "to": 12.0 },
    { "field": "emi", "from": 18200, "to": 16500 }
  ]
}
```

The `id` in the URL is the `decisions.id` primary key returned in the DB — Stream C can read it from the `decisions` table or store it alongside the session.

## 4. Ops Endpoints for Stream C Dashboard

### `GET /models`
```json
{
  "risk":    { "version": "1.2.0", "loaded_at": "...", "backend": "keras" },
  "fraud":   { "version": "0.1.0", "loaded_at": "...", "backend": "keras" },
  "persona": { "version": "1.0.0", "loaded_at": "...", "backend": "rules" }
}
```

### `GET /drift/{feature}`
Available features: `monthly_income`, `loan_amount_requested`, `avg_liveness`, `fraud_score`, `risk_score`
```json
{ "feature": "monthly_income", "n": 837, "mean": 48230, "std": 21004, "p50": 45000, "p99": 130000 }
```
Append `/baseline` for the training-set distribution.

### `GET /fairness/report`
```json
{
  "by_employment": { "salaried": 1.0, "self_employed": 1.0, "unemployed": 0.0 },
  "by_age_bucket": { "21-30": 1.0, "31-45": 1.0, "46-65": 1.0 },
  "disparate_impact_ratio": 0.85
}
```

## 5. Redis Stream Names + Payload Schema

Set `EVENT_STREAM_URL=redis://localhost:6379` to enable.

| Stream | Published when | Key fields |
|---|---|---|
| `decisions` | Every `POST /offer` | `session_id`, `tenant_id`, `request`, `offer`, `model_versions` |
| `frauds` | When `fraud_score > 0.7` | `session_id`, `fraud_score`, `signals` |
| `offers` | (reserved for future) | — |

If `EVENT_STREAM_URL` is unset, events log to stdout only.

## 6. All New Env Variables (v4)

| Variable | Default | Description |
|---|---|---|
| `BUREAU_ADAPTERS` | `cibil,experian` | Comma-separated bureau adapter names |
| `BUREAU_MERGE_STRATEGY` | `weighted` | `max`, `avg`, or `weighted` |
| `ENABLE_GEMMA` | `false` | Load Gemma 2B for LLM narration (+15s startup) |
| `ENABLE_GEMINI_FALLBACK` | `false` | Use Gemini API as LLM narrator |
| `GEMINI_API_KEY` | — | Required if ENABLE_GEMINI_FALLBACK=true |
| `REASON_NARRATOR_MODE` | `template` | `template` (deterministic) or `llm` |
| `EVENT_STREAM_URL` | — | Redis URL; stdout-only if unset |
| `DATABASE_URL` | `postgresql://loan:loan@db:5432/loan` | Postgres connection |
| `PERSONA_STRATEGY` | `rules_first` | `rules_first` or `rules_only` |
| `USE_MOCK_BUREAU` | `true` | Only option for demo |

## 7. Known Limits

- **Both ML models trained on synthetic data** — risk and fraud scores are directionally correct, not calibrated.
- **Reason narrative** uses the Jinja template by default — it mentions CIBIL score and rate. For production, enable Gemini for more natural language.
- **Drift stats are in-memory** — lost on restart in single-replica mode. Back by Redis for persistence.
- **Fairness cohort is synthetic** — all incomes above ₹15k pass policy, making disparate impact ratio = 1.0 for the demo.
- **Decision replay** uses the current in-memory model, not a versioned archive — if models retrain, replayed scores may differ slightly.
- **`decisions.id`** is the replay lookup key — Stream C should persist it alongside session_id for replay UX.
