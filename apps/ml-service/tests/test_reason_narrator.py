"""Tests for the reason narrator template path."""
import pytest

from app.schemas import (
    FormData,
    ModelVersions,
    Offer,
    PersonaClassificationOutput,
    PolicyResult,
    ReasonCode,
    RiskScoreOutput,
)
from app.services.reason_narrator import ReasonNarrator

_RISK = RiskScoreOutput(risk_band="low", risk_score=0.15, feature_importance={"monthly_income": 0.4})
_PERSONA = PersonaClassificationOutput(persona="salaried_prime", confidence=0.88, context_notes=[])
_POLICY_PASS = PolicyResult(passed=True, failed_rules=[], passed_rules=[])
_POLICY_FAIL = PolicyResult(passed=False, failed_rules=["age_below_21"], passed_rules=[])
_BUREAU = {"cibil_score_proxy": 782, "existing_loans": 1, "default_history": False}

_FORM = FormData(name="Rahul", employment_type="salaried", monthly_income=75_000, loan_amount_requested=500_000, declared_age=28)

def _make_offer(eligible=True, rejection_reason=None):
    return Offer(
        session_id="s1", eligible=eligible,
        amount=500_000 if eligible else None,
        interest_rate=12.5 if eligible else None,
        tenure_months=36 if eligible else None,
        emi=16_961 if eligible else None,
        risk_band="low", persona="salaried_prime",
        reason_codes=[ReasonCode(code="X", label="X", weight=0.3)],
        rejection_reason=rejection_reason,
        generated_at="2024-01-01T00:00:00+00:00",
    )


def test_narrator_approved_starts_with_approved():
    n = ReasonNarrator()
    offer = _make_offer(eligible=True)
    text = n.narrate(offer, _FORM, _RISK, _POLICY_PASS, _BUREAU)
    assert text.startswith("Approved")


def test_narrator_rejected_starts_with_rejected():
    n = ReasonNarrator()
    offer = _make_offer(eligible=False, rejection_reason="age_below_21")
    text = n.narrate(offer, _FORM, _RISK, _POLICY_FAIL, _BUREAU)
    assert text.startswith("Rejected")


def test_narrator_output_under_300_chars():
    n = ReasonNarrator()
    offer = _make_offer()
    text = n.narrate(offer, _FORM, _RISK, _POLICY_PASS, _BUREAU)
    assert len(text) <= 300


def test_narrator_mentions_a_number():
    import re
    n = ReasonNarrator()
    offer = _make_offer()
    text = n.narrate(offer, _FORM, _RISK, _POLICY_PASS, _BUREAU)
    assert re.search(r"\d", text), "Narrative must contain at least one number"


def test_narrator_includes_rate():
    n = ReasonNarrator()
    offer = _make_offer()
    text = n.narrate(offer, _FORM, _RISK, _POLICY_PASS, _BUREAU)
    assert "12.5" in text or "%" in text


def test_narrator_rejected_includes_reason_label():
    n = ReasonNarrator()
    offer = _make_offer(eligible=False, rejection_reason="no_income")
    text = n.narrate(offer, _FORM, _RISK, _POLICY_FAIL, _BUREAU)
    assert "15,000" in text or "income" in text.lower()


def test_narrator_soft_flag_mentions_rate_adjustment():
    n = ReasonNarrator()
    policy = PolicyResult(passed=True, failed_rules=[], passed_rules=["high_ltv"])
    offer = _make_offer()
    text = n.narrate(offer, _FORM, _RISK, policy, _BUREAU)
    assert "high_ltv" in text or "%" in text


def test_narrator_template_never_raises():
    n = ReasonNarrator()
    # Sparse form data
    form = FormData(name=None)
    offer = _make_offer(eligible=False, rejection_reason="face_missing")
    # Should not raise even with missing fields
    text = n.narrate(offer, form, _RISK, _POLICY_FAIL, {})
    assert isinstance(text, str)
    assert len(text) > 0
