"""FastAPI application — routing only. v4."""
from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import health, mock, debug, offer
from app.routes import decisions, drift, fairness, models_route

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Loan Wizard ML Service", version="0.4.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(mock.router)
app.include_router(debug.router)
app.include_router(offer.router)
app.include_router(decisions.router)
app.include_router(drift.router)
app.include_router(fairness.router)
app.include_router(models_route.router)


@app.on_event("startup")
def _startup() -> None:
    from app.deps import get_risk_scorer, get_persona_classifier, get_fraud_scorer, get_narrator, get_policy_engine
    from app.db.session import engine
    from app.db.models import Base
    from app.services.drift_tracker import get_tracker

    try:
        Base.metadata.create_all(bind=engine)
        logging.getLogger(__name__).info("DB tables ready")
    except Exception as exc:
        logging.getLogger(__name__).warning("DB init failed: %s", exc)

    # Pre-load all models
    get_policy_engine()
    get_risk_scorer()
    get_fraud_scorer()
    get_persona_classifier()
    get_narrator()

    # Load drift baseline from training data
    get_tracker().load_baseline()
