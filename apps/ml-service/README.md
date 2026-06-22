---
title: LoanWizard ML Service
sdk: docker
app_port: 8000
---

# ml-service

**Owned by Stream B.**

FastAPI service for ML risk scoring and persona classification.

Do not modify this app from Stream A or Stream C.

## Hugging Face Space

Deploy this folder as a Docker Space. Configure these Space secrets/variables:

- `DATABASE_URL`: Neon Postgres URL with SSL. Required for audit persistence:
  `/offer` still returns a valid offer without it, but the decision row and
  frozen replay snapshot will not be written (a warning is logged instead).
- `USE_MOCK_BUREAU=true`
- `PERSONA_STRATEGY=rules_first`
- `ENABLE_GEMINI_FALLBACK=false`

Smoke test after the Space is live:

```bash
curl https://<space-host>/health
curl https://<space-host>/docs
curl https://<space-host>/fairness/report
curl https://<space-host>/drift/monthly_income/baseline
```

## Decision replay on the exact model version

Each decision is stamped with the model versions that produced it, and the
weights for each version are archived under `app/models/*/archive/<version>/`.
`POST /decisions/{id}/replay` loads the archived risk model matching the
decision's recorded version (response field `exact_model_match`), so a replay
reflects the model as it was, not whatever is currently deployed.

## Optional: server-side speech-to-text (`POST /transcribe`)

The browser perception layer falls back to this endpoint when the Web Speech API
is low-confidence (Safari/Firefox). It is **off by default** to keep the image
light. To enable on a Space:

1. Install the audio extra in the `Dockerfile` (`pip install ".[gemini,audio]"`).
2. Set `ENABLE_WHISPER=true` (optionally `WHISPER_MODEL=base`).

Without these, `/transcribe` returns `503` and the browser simply uses Web Speech.
