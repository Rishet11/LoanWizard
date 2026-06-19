"""GET /fairness/report — approval rates across demographic segments."""
from __future__ import annotations

import logging

from fastapi import APIRouter

from app.schemas import FairnessReport, FormData, CVSignalsSummary, OfferRequest
from app.services.policy_engine import PolicyEngine
from app.services.risk_scorer import RiskScorer
from app.services.persona_classifier import PersonaClassifier
from app.services.offer_builder import OfferBuilder
from app.services.bureau_mock import BureauMock
from app.deps import get_risk_scorer, get_policy_engine, get_persona_classifier, get_offer_builder, get_bureau_mock

logger = logging.getLogger(__name__)
router = APIRouter()


def _run_cohort() -> FairnessReport:
    risk_scorer = get_risk_scorer()
    policy_engine = get_policy_engine()
    persona_clf = get_persona_classifier()
    offer_builder = get_offer_builder()
    bureau = get_bureau_mock()

    good_cv = CVSignalsSummary(avg_age_estimate=30, avg_liveness=0.93, min_liveness=0.8, face_present_ratio=0.97)

    emp_types = ["salaried", "self_employed", "business_owner", "unemployed", "retired"]
    age_buckets = [(21, 30), (31, 45), (46, 65)]
    incomes = [20_000, 40_000, 75_000, 150_000]

    by_employment: dict[str, list[bool]] = {e: [] for e in emp_types}
    by_age: dict[str, list[bool]] = {}

    for emp in emp_types:
        for income in incomes:
            for age_lo, age_hi in age_buckets:
                age = (age_lo + age_hi) // 2
                bucket_label = f"{age_lo}-{age_hi}"
                if bucket_label not in by_age:
                    by_age[bucket_label] = []

                form = FormData(
                    name=f"test_{emp}_{income}_{age}",
                    employment_type=emp,
                    monthly_income=float(income),
                    loan_amount_requested=float(income * 8),
                    purpose="home",
                    declared_age=age,
                )
                bureau_data = bureau.get(form.name or "x")
                policy = policy_engine.evaluate(form, good_cv, bureau_data)
                risk = risk_scorer.score(form, good_cv, bureau_data)
                persona = persona_clf.classify(form, bureau_data)
                offer = offer_builder.build("fairness", form, policy, risk, persona)

                eligible = offer.eligible
                by_employment[emp].append(eligible)
                by_age[bucket_label].append(eligible)

    emp_rates = {e: (sum(v) / len(v) if v else 0.0) for e, v in by_employment.items()}
    age_rates = {b: (sum(v) / len(v) if v else 0.0) for b, v in by_age.items()}

    all_rates = list(emp_rates.values()) + list(age_rates.values())
    non_zero = [r for r in all_rates if r > 0]
    disparate_impact = min(non_zero) / max(non_zero) if non_zero else 1.0

    return FairnessReport(
        by_employment=emp_rates,
        by_age_bucket=age_rates,
        disparate_impact_ratio=round(disparate_impact, 4),
    )


@router.get("/fairness/report", response_model=FairnessReport)
def fairness_report() -> FairnessReport:
    return _run_cohort()
