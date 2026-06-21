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

- `DATABASE_URL`: Neon Postgres URL with SSL.
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
