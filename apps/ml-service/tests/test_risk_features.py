"""Tests for risk feature engineering."""
import numpy as np
import pytest

from app.schemas import FormData, CVSignalsSummary
from app.models.risk_mlp.features import build_feature_vector, FEATURE_NAMES

GOOD_FORM = FormData(
    name="Test",
    employment_type="salaried",
    monthly_income=60_000,
    loan_amount_requested=500_000,
    purpose="home",
    declared_age=30,
)

GOOD_CV = CVSignalsSummary(
    avg_age_estimate=30.0,
    avg_liveness=0.95,
    min_liveness=0.85,
    face_present_ratio=0.97,
)

GOOD_BUREAU = {"cibil_score_proxy": 750, "existing_loans": 1, "default_history": False}


def test_feature_vector_shape():
    vec = build_feature_vector(GOOD_FORM, GOOD_CV, GOOD_BUREAU)
    assert vec.shape == (len(FEATURE_NAMES),)


def test_feature_vector_no_nans():
    vec = build_feature_vector(GOOD_FORM, GOOD_CV, GOOD_BUREAU)
    assert not np.any(np.isnan(vec))


def test_loan_to_income_ratio_derived():
    vec = build_feature_vector(GOOD_FORM, GOOD_CV, GOOD_BUREAU)
    # loan=500k, annual income=720k → LTI = 0.694
    lti_idx = FEATURE_NAMES.index("loan_to_income_ratio")
    assert abs(vec[lti_idx] - (500_000 / 720_000)) < 0.01


def test_age_mismatch_flag_not_set_within_tolerance():
    # diff = |30 - 33| = 3, not > 5, so flag should be 0
    cv = GOOD_CV.model_copy(update={"avg_age_estimate": 33.0})
    form = GOOD_FORM.model_copy(update={"declared_age": 30})
    vec = build_feature_vector(form, cv, GOOD_BUREAU)
    mismatch_idx = FEATURE_NAMES.index("age_mismatch_flag")
    assert vec[mismatch_idx] == 0.0


def test_age_mismatch_flag_set_large_diff():
    cv = GOOD_CV.model_copy(update={"avg_age_estimate": 42.0})  # 12-year diff
    form = GOOD_FORM.model_copy(update={"declared_age": 30})
    vec = build_feature_vector(form, cv, GOOD_BUREAU)
    mismatch_idx = FEATURE_NAMES.index("age_mismatch_flag")
    assert vec[mismatch_idx] == 1.0


def test_default_history_encoded():
    bureau = {**GOOD_BUREAU, "default_history": True}
    vec = build_feature_vector(GOOD_FORM, GOOD_CV, bureau)
    dh_idx = FEATURE_NAMES.index("has_default_history")
    assert vec[dh_idx] == 1.0


def test_risky_purpose_flagged():
    form = GOOD_FORM.model_copy(update={"purpose": "business expansion"})
    vec = build_feature_vector(form, GOOD_CV, GOOD_BUREAU)
    rp_idx = FEATURE_NAMES.index("loan_purpose_risky")
    assert vec[rp_idx] == 1.0


def test_none_income_defaults_to_zero():
    form = GOOD_FORM.model_copy(update={"monthly_income": None})
    vec = build_feature_vector(form, GOOD_CV, GOOD_BUREAU)
    assert vec[FEATURE_NAMES.index("monthly_income")] == 0.0
