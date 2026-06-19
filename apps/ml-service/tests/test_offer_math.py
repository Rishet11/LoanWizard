"""Offer math tests: EMI formula and reject path."""
import math
import pytest

from app.schemas import (
    FormData,
    CVSignalsSummary,
    PersonaClassificationOutput,
    PolicyResult,
    RiskScoreOutput,
)
from app.services.offer_builder import OfferBuilder, _calculate_emi

builder = OfferBuilder()

GOOD_RISK = RiskScoreOutput(
    risk_band="low",
    risk_score=0.15,
    feature_importance={"monthly_income": 0.4, "cibil_score_proxy": 0.3, "loan_to_income_ratio": 0.3},
)

GOOD_PERSONA = PersonaClassificationOutput(
    persona="salaried_prime",
    confidence=0.88,
    context_notes=[],
)

GOOD_POLICY = PolicyResult(passed=True, failed_rules=[], passed_rules=[])

GOOD_FORM = FormData(
    name="Test",
    employment_type="salaried",
    monthly_income=75_000,
    loan_amount_requested=500_000,
    purpose="home",
    declared_age=30,
)


# ──────────────────────── EMI formula ────────────────────────

def test_emi_known_value_1():
    # P=500000, r=12.5%, n=36  → monthly_r = 0.125/12 = 0.010417
    # EMI = 500000 * 0.010417 * (1.010417^36) / ((1.010417^36) - 1)
    emi = _calculate_emi(500_000, 12.5, 36)
    assert abs(emi - 16_733) < 50  # within ₹50 tolerance


def test_emi_known_value_2():
    # P=1000000, r=15%, n=36
    emi = _calculate_emi(1_000_000, 15.0, 36)
    assert abs(emi - 34_665) < 100


def test_emi_known_value_3():
    # P=200000, r=18.5%, n=36
    emi = _calculate_emi(200_000, 18.5, 36)
    assert abs(emi - 7_270) < 50


def test_emi_zero_rate():
    emi = _calculate_emi(360_000, 0.0, 36)
    assert abs(emi - 10_000) < 1


# ──────────────────────── reject path ────────────────────────

def test_hard_fail_produces_ineligible_offer():
    policy = PolicyResult(passed=False, failed_rules=["age_below_21"], passed_rules=[])
    offer = builder.build(
        session_id="s1",
        form=GOOD_FORM,
        policy=policy,
        risk=GOOD_RISK,
        persona=GOOD_PERSONA,
    )
    assert offer.eligible is False
    assert offer.rejection_reason == "age_below_21"
    assert offer.amount is None
    assert offer.emi is None


def test_no_income_rejection():
    policy = PolicyResult(passed=False, failed_rules=["no_income"], passed_rules=[])
    offer = builder.build("s2", GOOD_FORM, policy, GOOD_RISK, GOOD_PERSONA)
    assert offer.eligible is False
    assert offer.rejection_reason == "no_income"


def test_face_missing_rejection():
    policy = PolicyResult(passed=False, failed_rules=["face_missing"], passed_rules=[])
    offer = builder.build("s3", GOOD_FORM, policy, GOOD_RISK, GOOD_PERSONA)
    assert offer.eligible is False
    assert offer.rejection_reason == "face_missing"


# ──────────────────────── eligible path ────────────────────────

def test_eligible_offer_has_required_fields():
    offer = builder.build("s4", GOOD_FORM, GOOD_POLICY, GOOD_RISK, GOOD_PERSONA)
    assert offer.eligible is True
    assert offer.amount is not None and offer.amount > 0
    assert offer.interest_rate is not None
    assert offer.emi is not None and offer.emi > 0
    assert offer.tenure_months == 36
    assert offer.rejection_reason is None


def test_salaried_prime_persona_lowers_rate():
    offer_prime = builder.build("s5", GOOD_FORM, GOOD_POLICY, GOOD_RISK, GOOD_PERSONA)
    risky_persona = GOOD_PERSONA.model_copy(update={"persona": "risky"})
    offer_risky = builder.build("s6", GOOD_FORM, GOOD_POLICY, GOOD_RISK, risky_persona)
    assert offer_prime.interest_rate < offer_risky.interest_rate


def test_high_risk_band_caps_amount():
    high_risk = GOOD_RISK.model_copy(update={"risk_band": "high", "risk_score": 0.7})
    offer = builder.build("s7", GOOD_FORM, GOOD_POLICY, high_risk, GOOD_PERSONA)
    assert offer.eligible is True
    assert offer.amount <= 750_000


def test_amount_capped_at_2x_annual_income():
    form = GOOD_FORM.model_copy(update={"monthly_income": 10_000, "loan_amount_requested": 2_000_000})
    # 2x annual = 240_000 — should cap there
    offer = builder.build("s8", form, GOOD_POLICY, GOOD_RISK, GOOD_PERSONA)
    assert offer.eligible is True
    assert offer.amount <= 240_000


def test_soft_flag_rate_increase():
    policy_with_soft = PolicyResult(passed=True, failed_rules=[], passed_rules=["high_ltv"])
    offer = builder.build("s9", GOOD_FORM, policy_with_soft, GOOD_RISK, GOOD_PERSONA)
    # low band base=12.5, salaried_prime -0.5, high_ltv +1.0 → 13.0
    assert offer.interest_rate > 12.5
