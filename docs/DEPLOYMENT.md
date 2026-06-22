# Hugging Face Deployment Runbook

This repo is prepared for a two-Space Hugging Face deployment with Neon
Postgres as the durable database.

## 1. Neon

Create one Postgres project and copy the pooled connection string with SSL:

```bash
export DATABASE_URL='postgresql://...sslmode=require'
PATH=/opt/homebrew/bin:$PATH pnpm --filter @loan-wizard/web db:push
PATH=/opt/homebrew/bin:$PATH pnpm --filter @loan-wizard/web seed
```

## 2. ML Space

Create a Docker Space and upload `apps/ml-service/`.

Space config is declared in `apps/ml-service/README.md`:

```yaml
sdk: docker
app_port: 8000
```

Set Space secrets/variables:

```bash
DATABASE_URL=postgresql://...sslmode=require
USE_MOCK_BUREAU=true
PERSONA_STRATEGY=rules_first
ENABLE_GEMINI_FALLBACK=false
```

Smoke test:

```bash
curl https://<ml-space-host>/health
curl https://<ml-space-host>/docs
curl https://<ml-space-host>/fairness/report
curl https://<ml-space-host>/drift/monthly_income/baseline
```

Sample real offer request:

```bash
curl -X POST https://<ml-space-host>/offer \
  -H 'content-type: application/json' \
  -d '{
    "session_id":"hf-smoke",
    "tenant_id":"alpha",
    "form_data":{
      "name":"Rahul Sharma",
      "employment_type":"salaried",
      "monthly_income":85000,
      "loan_amount_requested":500000,
      "purpose":"home renovation",
      "declared_age":28
    },
    "cv_signals_summary":{
      "avg_age_estimate":29,
      "avg_liveness":0.94,
      "min_liveness":0.82,
      "face_present_ratio":1,
      "texture_score_avg":0.86
    },
    "transcript_snippets":["I work as a salaried software engineer"],
    "device_fingerprint":{
      "ua":"hf smoke",
      "canvas_hash":"demo",
      "timezone":"Asia/Kolkata",
      "session_age_sec":120,
      "form_mutations":4,
      "transcript_length":500,
      "canvas_hash_cohort_size":1
    }
  }'
```

## 3. Web Space

Create a separate Docker Space and upload the repository root. The root
`Dockerfile` builds and serves `apps/web` on port 3000.

Space config is declared in the root `README.md`:

```yaml
sdk: docker
app_port: 3000
```

Set Space secrets/variables:

```bash
DATABASE_URL=postgresql://...sslmode=require
ML_SERVICE_URL=https://<ml-space-host>
NEXT_PUBLIC_ML_MODE=mock
NEXT_PUBLIC_USE_MOCK_PERCEPTION=true
ADMIN_PASSWORD=<strong-secret>
```

Public smoke test:

1. Landing page opens.
2. Start a session.
3. Scripted video session fills the form without camera permission.
4. Processing page returns the reliable mock offer.
5. Accept the offer and download the Key Fact Statement.
6. Log in to `/admin`, then open sessions, fairness, drift, and replay.

## Notes

- Keep `NEXT_PUBLIC_ML_MODE=mock` on the public judge link for reliability.
- Use `NEXT_PUBLIC_USE_MOCK_PERCEPTION=false` locally when recording the real
  camera path.
- Hugging Face Spaces storage is ephemeral by default. Use Neon for audit and
  decision data; do not rely on local files for persistence.
