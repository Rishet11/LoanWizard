"""Deterministic policy rules. No ML. If hard-fail → offer rejected regardless of risk."""
from __future__ import annotations

import logging
from dataclasses import dataclass, field

from app.schemas import FormData, CVSignalsSummary, PolicyResult

logger = logging.getLogger(__name__)


SOFT_FLAG_RATE_ADJUSTMENTS: dict[str, float] = {
    "age_mismatch": 1.5,
    "high_ltv": 1.0,
    "thin_file": 0.75,
}


@dataclass
class PolicyEngine:

    def evaluate(
        self,
        form: FormData,
        cv: CVSignalsSummary,
        bureau: dict,
    ) -> PolicyResult:
        failed: list[str] = []
        passed: list[str] = []

        # ---- Hard-fail rules ----

        declared_age = form.declared_age  # Optional[int]
        avg_age = cv.avg_age_estimate    # Optional[float]

        if declared_age is None and avg_age is None:
            logger.info("No age signal (declared or estimated) — skipping age eligibility checks")

        # Fail only when a known age signal is below 21; no signal → pass
        age_below = (declared_age is not None and declared_age < 21) or \
                    (avg_age is not None and avg_age < 21)
        if age_below:
            failed.append("age_below_21")
        else:
            passed.append("age_below_21")

        # Above-65 only applies when declared_age is actually provided
        if declared_age is not None and declared_age > 65:
            failed.append("age_above_65")
        else:
            passed.append("age_above_65")

        income = form.monthly_income or 0
        if income < 15_000:
            failed.append("no_income")
        else:
            passed.append("no_income")

        loan = form.loan_amount_requested or 0
        if loan > 2_000_000:
            failed.append("loan_above_cap")
        else:
            passed.append("loan_above_cap")

        if cv.face_present_ratio < 0.7:
            failed.append("face_missing")
        else:
            passed.append("face_missing")

        if cv.min_liveness < 0.3:
            failed.append("low_liveness")
        else:
            passed.append("low_liveness")

        # ---- Soft-flag rules (don't reject, just flag) ----

        if declared_age and avg_age and abs(declared_age - avg_age) > 10:
            passed.append("age_mismatch")

        annual_income = income * 12
        if annual_income > 0 and loan / annual_income > 0.5:
            passed.append("high_ltv")

        if not bureau.get("cibil_score_proxy"):
            passed.append("thin_file")

        return PolicyResult(
            passed=len(failed) == 0,
            failed_rules=failed,
            passed_rules=passed,
        )
