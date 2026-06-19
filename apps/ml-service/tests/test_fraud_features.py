"""Tests for fraud feature engineering and fraud scorer heuristic."""
import math

import numpy as np
import pytest

from app.schemas import CVSignalsSummary, DeviceFingerprint, FormData
from app.models.fraud_mlp.features import build_fraud_features, FRAUD_FEATURE_NAMES, _ua_entropy
from app.services.fraud_scorer import FraudScorer

GOOD_FORM = FormData(name="Test", employment_type="salaried", monthly_income=60_000, loan_amount_requested=500_000, declared_age=30)
GOOD_CV = CVSignalsSummary(avg_age_estimate=30.0, avg_liveness=0.95, min_liveness=0.85, face_present_ratio=0.97)
GOOD_FP = DeviceFingerprint(ua="Mozilla/5.0", canvas_hash="abc", session_age_sec=300, form_mutations=3, transcript_length=600, canvas_hash_cohort_size=1)


def test_feature_vector_shape():
    vec = build_fraud_features(GOOD_FORM, GOOD_CV, GOOD_FP)
    assert vec.shape == (len(FRAUD_FEATURE_NAMES),)


def test_feature_vector_no_nans():
    vec = build_fraud_features(GOOD_FORM, GOOD_CV, GOOD_FP)
    assert not np.any(np.isnan(vec))


def test_ua_entropy_empty():
    assert _ua_entropy("") == 0.0


def test_ua_entropy_nonzero():
    assert _ua_entropy("Mozilla/5.0") > 0


def test_ua_entropy_uniform_string():
    # "aaaa" → entropy = 0
    assert _ua_entropy("aaaa") == pytest.approx(0.0)


def test_income_to_loan_ratio():
    vec = build_fraud_features(GOOD_FORM, GOOD_CV, GOOD_FP)
    itl_idx = FRAUD_FEATURE_NAMES.index("income_to_loan_ratio")
    assert abs(vec[itl_idx] - (60_000 / 500_000)) < 0.01


def test_age_mismatch_in_features():
    form = GOOD_FORM.model_copy(update={"declared_age": 50})
    cv = GOOD_CV.model_copy(update={"avg_age_estimate": 30.0})
    vec = build_fraud_features(form, cv, GOOD_FP)
    idx = FRAUD_FEATURE_NAMES.index("declared_age_minus_cv_age")
    assert abs(vec[idx] - 20.0) < 0.1


def test_none_fingerprint_uses_defaults():
    vec = build_fraud_features(GOOD_FORM, GOOD_CV, None)
    assert vec.shape == (len(FRAUD_FEATURE_NAMES),)
    assert not np.any(np.isnan(vec))


# ---- heuristic scorer ----

def test_heuristic_low_risk_normal_session():
    scorer = FraudScorer()
    result = scorer.score(GOOD_FORM, GOOD_CV, GOOD_FP)
    assert result.fraud_score < 0.5


def test_heuristic_flags_multi_account():
    fp = GOOD_FP.model_copy(update={"canvas_hash_cohort_size": 5})
    scorer = FraudScorer()
    result = scorer.score(GOOD_FORM, GOOD_CV, fp)
    assert result.fraud_score >= 0.45
    assert any("multi_account" in s for s in result.fraud_signals)


def test_heuristic_flags_rushed_submission():
    fp = GOOD_FP.model_copy(update={"session_age_sec": 30.0})
    scorer = FraudScorer()
    result = scorer.score(GOOD_FORM, GOOD_CV, fp)
    assert result.fraud_score >= 0.20
    assert any("rushed" in s for s in result.fraud_signals)


def test_heuristic_flags_age_mismatch():
    form = GOOD_FORM.model_copy(update={"declared_age": 60})
    cv = GOOD_CV.model_copy(update={"avg_age_estimate": 30.0})
    scorer = FraudScorer()
    result = scorer.score(form, cv, GOOD_FP)
    assert result.fraud_score >= 0.10
    assert any("age_mismatch" in s for s in result.fraud_signals)


def test_fraud_score_bounded():
    fp = GOOD_FP.model_copy(update={"canvas_hash_cohort_size": 10, "session_age_sec": 10})
    scorer = FraudScorer()
    result = scorer.score(GOOD_FORM, GOOD_CV, fp)
    assert 0.0 <= result.fraud_score <= 1.0
