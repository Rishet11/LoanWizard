FROM python:3.11-slim

WORKDIR /app

# Install build deps for psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
COPY app/ ./app/
COPY scripts/ ./scripts/
COPY data/ ./data/

# Install with all optional deps for demo. The package source is copied before
# install because hatchling expects the app package to exist.
RUN pip install --no-cache-dir ".[gemini]"

# Train model at build time if data exists (CI/CD path)
# For local dev: docker-compose will mount or train separately
ARG TRAIN_MODEL=false
RUN if [ "$TRAIN_MODEL" = "true" ]; then \
      python scripts/generate_synthetic_data.py && \
      python scripts/train_risk_model.py; \
    fi

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
