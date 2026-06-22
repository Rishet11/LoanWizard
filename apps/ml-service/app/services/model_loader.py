"""Load a scorer for a specific model version, for faithful decision replay.

Decisions are stamped with the model versions that produced them
(``DecisionSnapshot.model_versions_at_decision``). To replay a decision on the
*exact* model that made it — not whatever is currently deployed — we archive
each version's weights under ``models/<model>/archive/<version>/`` and load from
there. If a version isn't archived we fall back to the current production scorer
and flag the replay as not an exact-model match, so the caller stays honest.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from app.deps import get_fraud_scorer, get_risk_scorer
from app.services.fraud_scorer import VERSION as FRAUD_VERSION, FraudScorer
from app.services.risk_scorer import VERSION as RISK_VERSION, RiskScorer

_MODELS_DIR = Path(__file__).parent.parent / "models"
RISK_ARCHIVE = _MODELS_DIR / "risk_mlp" / "archive"
FRAUD_ARCHIVE = _MODELS_DIR / "fraud_mlp" / "archive"


@lru_cache(maxsize=8)
def _load_archived_risk(version: str) -> RiskScorer:
    scorer = RiskScorer(model_dir=RISK_ARCHIVE / version)
    scorer.load()
    return scorer


@lru_cache(maxsize=8)
def _load_archived_fraud(version: str) -> FraudScorer:
    scorer = FraudScorer(model_dir=FRAUD_ARCHIVE / version)
    scorer.load()
    return scorer


def risk_scorer_for_version(version: str | None) -> tuple[RiskScorer, bool]:
    """Return (scorer, exact_match). exact_match is False when we had to fall
    back to the current production model because the version wasn't archived."""
    if not version or version == RISK_VERSION:
        return get_risk_scorer(), version == RISK_VERSION
    if (RISK_ARCHIVE / version).exists():
        return _load_archived_risk(version), True
    return get_risk_scorer(), False


def fraud_scorer_for_version(version: str | None) -> tuple[FraudScorer, bool]:
    if not version or version == FRAUD_VERSION:
        return get_fraud_scorer(), version == FRAUD_VERSION
    if (FRAUD_ARCHIVE / version).exists():
        return _load_archived_fraud(version), True
    return get_fraud_scorer(), False
