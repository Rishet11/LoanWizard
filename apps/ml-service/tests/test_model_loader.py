"""Tests for versioned model loading used by decision replay."""
from app.schemas import CVSignalsSummary, FormData
from app.services.fraud_scorer import VERSION as FRAUD_VERSION
from app.services.risk_scorer import VERSION as RISK_VERSION
from app.services.model_loader import (
    RISK_ARCHIVE,
    fraud_scorer_for_version,
    risk_scorer_for_version,
)

FORM = FormData(
    name="Rahul Sharma",
    employment_type="salaried",
    monthly_income=85_000,
    loan_amount_requested=500_000,
    purpose="home renovation",
    declared_age=28,
)
CV = CVSignalsSummary(avg_age_estimate=29, avg_liveness=0.94, min_liveness=0.82, face_present_ratio=1.0)
BUREAU = {"cibil_score_proxy": 760, "existing_loans": 0, "default_history": False}


def test_current_version_is_exact_match():
    scorer, exact = risk_scorer_for_version(RISK_VERSION)
    assert exact is True
    assert scorer is not None


def test_unknown_version_falls_back_and_flags():
    scorer, exact = risk_scorer_for_version("9.9.9-does-not-exist")
    assert exact is False  # fell back to current production model
    assert scorer is not None


def test_none_version_is_not_exact():
    _scorer, exact = risk_scorer_for_version(None)
    assert exact is False


def test_current_risk_version_is_archived_on_disk():
    # The shipped version must be archived so its decisions stay replayable.
    assert (RISK_ARCHIVE / RISK_VERSION).exists()


def test_archived_risk_model_loads_and_scores():
    # Load straight from the archive dir and confirm it produces a valid score.
    from app.services.risk_scorer import RiskScorer

    scorer = RiskScorer(model_dir=RISK_ARCHIVE / RISK_VERSION)
    scorer.load()
    out = scorer.score(FORM, CV, BUREAU, geo_tier=2)
    assert 0.0 <= out.risk_score <= 1.0
    assert out.risk_band in ("low", "medium", "high")
    assert out.feature_importance  # non-empty


def test_fraud_current_version_exact():
    scorer, exact = fraud_scorer_for_version(FRAUD_VERSION)
    assert exact is True
    assert scorer is not None


def test_fraud_unknown_version_fallback():
    _scorer, exact = fraud_scorer_for_version("0.0.0-nope")
    assert exact is False
