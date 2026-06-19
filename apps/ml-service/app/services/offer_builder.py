"""Combines policy + risk + persona + fraud + narration into a final Offer."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from app.schemas import (
    FormData,
    FraudScoreOutput,
    ModelVersions,
    Offer,
    PersonaClassificationOutput,
    PolicyResult,
    ReasonCode,
    RiskScoreOutput,
)
from app.services.policy_engine import SOFT_FLAG_RATE_ADJUSTMENTS

BASE_RATE_BY_BAND = {"low": 12.5, "medium": 15.0, "high": 18.5}
AMOUNT_CAP_BY_BAND = {"low": 2_000_000, "medium": 1_500_000, "high": 750_000}

REASON_CODE_LABELS = {
    "monthly_income": ("STABLE_INCOME", "Stable monthly income"),
    "cibil_score_proxy": ("GOOD_CREDIT", "Strong credit profile"),
    "loan_to_income_ratio": ("LOW_LTV", "Healthy loan-to-income ratio"),
    "loan_amount_requested": ("LOAN_SIZE", "Loan amount consideration"),
    "avg_liveness": ("LIVENESS_OK", "Good liveness signal"),
    "has_default_history": ("DEFAULT_RISK", "Default history factor"),
    "employment_type_encoded": ("EMP_TYPE", "Employment type"),
    "declared_age": ("AGE_FACTOR", "Age profile"),
    "existing_loans": ("EXISTING_LOANS", "Existing loan burden"),
    "age_mismatch_flag": ("AGE_MISMATCH", "Age verification signal"),
    "geo_tier": ("GEO_TIER", "Geographic tier"),
    "loan_purpose_risky": ("PURPOSE_RISK", "Loan purpose risk"),
}


def _calculate_emi(principal: float, annual_rate_pct: float, tenure_months: int) -> float:
    if annual_rate_pct == 0:
        return principal / tenure_months
    r = annual_rate_pct / 100 / 12
    return principal * r * (1 + r) ** tenure_months / ((1 + r) ** tenure_months - 1)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _build_reason_codes(risk: RiskScoreOutput) -> list[ReasonCode]:
    codes = []
    for feature, weight in list(risk.feature_importance.items())[:3]:
        code, label = REASON_CODE_LABELS.get(feature, (feature.upper(), feature.replace("_", " ").title()))
        codes.append(ReasonCode(code=code, label=label, weight=round(weight, 3)))
    return codes


class OfferBuilder:
    def build(
        self,
        session_id: str,
        form: FormData,
        policy: PolicyResult,
        risk: RiskScoreOutput,
        persona: PersonaClassificationOutput,
        fraud: Optional[FraudScoreOutput] = None,
        model_versions: Optional[ModelVersions] = None,
    ) -> Offer:
        base = Offer(
            session_id=session_id,
            eligible=False,
            amount=None,
            interest_rate=None,
            tenure_months=None,
            emi=None,
            risk_band=risk.risk_band,
            persona=persona.persona,
            reason_codes=[],
            rejection_reason=None,
            generated_at=_now_iso(),
            fraud_score=fraud.fraud_score if fraud else None,
            model_versions=model_versions,
        )

        if not policy.passed:
            base.rejection_reason = policy.failed_rules[0]
            return base

        # Base rate
        rate = BASE_RATE_BY_BAND[risk.risk_band]

        # Soft-flag adjustments
        for rule in policy.passed_rules:
            rate += SOFT_FLAG_RATE_ADJUSTMENTS.get(rule, 0.0)

        # Fraud surcharge
        if fraud and fraud.fraud_score > 0.6:
            rate += 1.5
        elif fraud and fraud.fraud_score > 0.4:
            rate += 0.75

        # Persona tweaks
        if persona.persona == "salaried_prime":
            rate -= 0.5
        elif persona.persona == "risky":
            rate += 1.0

        income = form.monthly_income or 0
        loan = form.loan_amount_requested or 0

        max_eligible = min(
            loan,
            income * 24,
            AMOUNT_CAP_BY_BAND[risk.risk_band],
        )
        max_eligible = max(max_eligible, 0)

        tenure = 36
        emi = _calculate_emi(max_eligible, rate, tenure) if max_eligible > 0 else 0

        base.eligible = True
        base.amount = int(round(max_eligible))
        base.interest_rate = round(rate, 2)
        base.tenure_months = tenure
        base.emi = int(round(emi))
        base.reason_codes = _build_reason_codes(risk)

        return base
