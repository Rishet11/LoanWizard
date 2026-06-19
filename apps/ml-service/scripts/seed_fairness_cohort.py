"""Generate fairness cohort data for demo — saves to data/fairness_cohort.json."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from app.schemas import FormData, CVSignalsSummary
from app.services.policy_engine import PolicyEngine
from app.services.risk_scorer import RiskScorer
from app.services.persona_classifier import PersonaClassifier
from app.services.offer_builder import OfferBuilder
from app.services.bureau_mock import BureauMock

GOOD_CV = CVSignalsSummary(avg_age_estimate=30, avg_liveness=0.93, min_liveness=0.8, face_present_ratio=0.97)

policy = PolicyEngine()
risk_scorer = RiskScorer()
risk_scorer.load()
persona_clf = PersonaClassifier()
bureau = BureauMock()
offer_builder = OfferBuilder()


def run():
    emp_types = ["salaried", "self_employed", "business_owner", "unemployed", "retired"]
    age_buckets = [(21, 30), (31, 45), (46, 65)]
    incomes = [25_000, 50_000, 80_000, 150_000]

    records = []
    for emp in emp_types:
        for income in incomes:
            for age_lo, age_hi in age_buckets:
                age = (age_lo + age_hi) // 2
                form = FormData(
                    name=f"seed_{emp}_{income}_{age}",
                    employment_type=emp,
                    monthly_income=float(income),
                    loan_amount_requested=float(income * 8),
                    purpose="home",
                    declared_age=age,
                )
                bureau_data = bureau.get(form.name or "x")
                pol = policy.evaluate(form, GOOD_CV, bureau_data)
                risk = risk_scorer.score(form, GOOD_CV, bureau_data)
                persona = persona_clf.classify(form, bureau_data)
                offer = offer_builder.build("seed", form, pol, risk, persona)

                records.append({
                    "employment_type": emp,
                    "monthly_income": income,
                    "age": age,
                    "eligible": offer.eligible,
                    "risk_band": risk.risk_band,
                    "persona": persona.persona,
                })

    out = ROOT / "data" / "fairness_cohort.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(records, indent=2))
    print(f"Saved {len(records)} cohort rows to {out}")

    by_emp = {}
    for r in records:
        by_emp.setdefault(r["employment_type"], []).append(r["eligible"])
    for emp, vals in by_emp.items():
        rate = sum(vals) / len(vals)
        print(f"  {emp}: {rate:.0%}")


if __name__ == "__main__":
    run()
