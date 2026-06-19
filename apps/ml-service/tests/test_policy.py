"""Policy engine tests — every rule has positive, negative, and edge cases."""
import pytest

from app.schemas import FormData, CVSignalsSummary
from app.services.policy_engine import PolicyEngine

engine = PolicyEngine()

GOOD_CV = CVSignalsSummary(
    avg_age_estimate=30.0,
    avg_liveness=0.95,
    min_liveness=0.85,
    face_present_ratio=0.97,
)

GOOD_BUREAU = {"cibil_score_proxy": 750, "existing_loans": 1, "default_history": False}

GOOD_FORM = FormData(
    name="Test User",
    employment_type="salaried",
    monthly_income=60_000,
    loan_amount_requested=500_000,
    purpose="home renovation",
    declared_age=30,
)


def _eval(form=None, cv=None, bureau=None):
    return engine.evaluate(form or GOOD_FORM, cv or GOOD_CV, bureau or GOOD_BUREAU)


# ──────────────────────── age_below_21 ────────────────────────

def test_age_below_21_fails_when_declared_too_young():
    form = GOOD_FORM.model_copy(update={"declared_age": 18})
    result = _eval(form=form)
    assert not result.passed
    assert "age_below_21" in result.failed_rules


def test_age_below_21_fails_when_estimated_too_young():
    cv = GOOD_CV.model_copy(update={"avg_age_estimate": 19.0})
    result = _eval(cv=cv)
    assert not result.passed
    assert "age_below_21" in result.failed_rules


def test_age_below_21_passes_at_21():
    form = GOOD_FORM.model_copy(update={"declared_age": 21})
    cv = GOOD_CV.model_copy(update={"avg_age_estimate": 21.0})
    result = _eval(form=form, cv=cv)
    assert "age_below_21" not in result.failed_rules


def test_age_below_21_edge_exactly_21():
    form = GOOD_FORM.model_copy(update={"declared_age": 21})
    result = _eval(form=form)
    assert "age_below_21" not in result.failed_rules


# ──────────────────────── age_above_65 ────────────────────────

def test_age_above_65_fails():
    form = GOOD_FORM.model_copy(update={"declared_age": 66})
    result = _eval(form=form)
    assert not result.passed
    assert "age_above_65" in result.failed_rules


def test_age_above_65_passes_at_65():
    form = GOOD_FORM.model_copy(update={"declared_age": 65})
    result = _eval(form=form)
    assert "age_above_65" not in result.failed_rules


def test_age_above_65_edge_exactly_66():
    form = GOOD_FORM.model_copy(update={"declared_age": 66})
    result = _eval(form=form)
    assert "age_above_65" in result.failed_rules


# ──────────────────────── no_income ────────────────────────

def test_no_income_fails_when_none():
    form = GOOD_FORM.model_copy(update={"monthly_income": None})
    result = _eval(form=form)
    assert not result.passed
    assert "no_income" in result.failed_rules


def test_no_income_fails_when_below_15k():
    form = GOOD_FORM.model_copy(update={"monthly_income": 14_999})
    result = _eval(form=form)
    assert "no_income" in result.failed_rules


def test_no_income_passes_at_15k():
    form = GOOD_FORM.model_copy(update={"monthly_income": 15_000})
    result = _eval(form=form)
    assert "no_income" not in result.failed_rules


def test_no_income_edge_exactly_15k():
    form = GOOD_FORM.model_copy(update={"monthly_income": 15_000})
    result = _eval(form=form)
    assert "no_income" not in result.failed_rules


# ──────────────────────── loan_above_cap ────────────────────────

def test_loan_above_cap_fails():
    form = GOOD_FORM.model_copy(update={"loan_amount_requested": 2_000_001})
    result = _eval(form=form)
    assert not result.passed
    assert "loan_above_cap" in result.failed_rules


def test_loan_above_cap_passes_at_cap():
    form = GOOD_FORM.model_copy(update={"loan_amount_requested": 2_000_000})
    result = _eval(form=form)
    assert "loan_above_cap" not in result.failed_rules


def test_loan_above_cap_edge_one_above():
    form = GOOD_FORM.model_copy(update={"loan_amount_requested": 2_000_001})
    result = _eval(form=form)
    assert "loan_above_cap" in result.failed_rules


# ──────────────────────── face_missing ────────────────────────

def test_face_missing_fails_when_low_ratio():
    cv = GOOD_CV.model_copy(update={"face_present_ratio": 0.65})
    result = _eval(cv=cv)
    assert not result.passed
    assert "face_missing" in result.failed_rules


def test_face_missing_passes_at_threshold():
    cv = GOOD_CV.model_copy(update={"face_present_ratio": 0.70})
    result = _eval(cv=cv)
    assert "face_missing" not in result.failed_rules


def test_face_missing_edge_exactly_0_7():
    cv = GOOD_CV.model_copy(update={"face_present_ratio": 0.7})
    result = _eval(cv=cv)
    assert "face_missing" not in result.failed_rules


# ──────────────────────── low_liveness ────────────────────────

def test_low_liveness_fails():
    cv = GOOD_CV.model_copy(update={"min_liveness": 0.29})
    result = _eval(cv=cv)
    assert not result.passed
    assert "low_liveness" in result.failed_rules


def test_low_liveness_passes_at_threshold():
    cv = GOOD_CV.model_copy(update={"min_liveness": 0.30})
    result = _eval(cv=cv)
    assert "low_liveness" not in result.failed_rules


def test_low_liveness_edge_exactly_0_3():
    cv = GOOD_CV.model_copy(update={"min_liveness": 0.30})
    result = _eval(cv=cv)
    assert "low_liveness" not in result.failed_rules


# ──────────────────────── soft-flag: age_mismatch ────────────────────────

def test_soft_age_mismatch_flagged_when_diff_above_10():
    form = GOOD_FORM.model_copy(update={"declared_age": 35})
    cv = GOOD_CV.model_copy(update={"avg_age_estimate": 46.0})
    result = _eval(form=form, cv=cv)
    assert result.passed  # soft flag should NOT cause rejection
    assert "age_mismatch" in result.passed_rules


def test_soft_age_mismatch_not_flagged_within_tolerance():
    form = GOOD_FORM.model_copy(update={"declared_age": 30})
    cv = GOOD_CV.model_copy(update={"avg_age_estimate": 35.0})
    result = _eval(form=form, cv=cv)
    assert "age_mismatch" not in result.passed_rules


# ──────────────────────── soft-flag: high_ltv ────────────────────────

def test_soft_high_ltv_flagged():
    # loan = 500k, monthly income 30k → annual 360k → LTV = 1.38 > 0.5
    form = GOOD_FORM.model_copy(update={"monthly_income": 30_000, "loan_amount_requested": 500_000})
    result = _eval(form=form)
    assert result.passed
    assert "high_ltv" in result.passed_rules


def test_soft_high_ltv_not_flagged():
    # loan = 100k, income 100k → annual 1.2M → LTV = 0.083
    form = GOOD_FORM.model_copy(update={"monthly_income": 100_000, "loan_amount_requested": 100_000})
    result = _eval(form=form)
    assert "high_ltv" not in result.passed_rules


# ──────────────────────── all-good passes ────────────────────────

def test_all_good_form_passes():
    result = _eval()
    assert result.passed
    assert result.failed_rules == []


# ──────────────────────── multiple failures ────────────────────────

def test_multiple_hard_fail_rules():
    form = GOOD_FORM.model_copy(update={"declared_age": 16, "monthly_income": 5_000})
    result = _eval(form=form)
    assert not result.passed
    assert "age_below_21" in result.failed_rules
    assert "no_income" in result.failed_rules
