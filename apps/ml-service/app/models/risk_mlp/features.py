"""Feature engineering for the risk MLP."""
from __future__ import annotations

import numpy as np

from app.schemas import FormData, CVSignalsSummary

EMPLOYMENT_TYPE_MAP = {
    "salaried": 0,
    "self_employed": 1,
    "business_owner": 2,
    "unemployed": 3,
    "retired": 4,
}

FEATURE_NAMES = [
    "monthly_income",
    "loan_amount_requested",
    "loan_to_income_ratio",
    "declared_age",
    "employment_type_encoded",
    "cibil_score_proxy",
    "existing_loans",
    "has_default_history",
    "avg_liveness",
    "age_mismatch_flag",
    "geo_tier",
    "loan_purpose_risky",
]

RISKY_PURPOSES = {"business", "investment", "gambling", "crypto"}


def build_feature_vector(
    form: FormData,
    cv: CVSignalsSummary,
    bureau: dict,
    geo_tier: int = 2,
) -> np.ndarray:
    income = form.monthly_income or 0.0
    loan = form.loan_amount_requested or 0.0
    annual_income = income * 12
    lti = loan / annual_income if annual_income > 0 else 1.0

    declared_age = form.declared_age or 30
    avg_age = cv.avg_age_estimate or declared_age
    age_mismatch = 1 if abs(declared_age - avg_age) > 5 else 0

    emp_encoded = EMPLOYMENT_TYPE_MAP.get(form.employment_type or "unemployed", 3)

    purpose = (form.purpose or "").lower()
    loan_purpose_risky = 1 if any(p in purpose for p in RISKY_PURPOSES) else 0

    vec = np.array(
        [
            income,
            loan,
            lti,
            float(declared_age),
            float(emp_encoded),
            float(bureau.get("cibil_score_proxy", 700)),
            float(bureau.get("existing_loans", 0)),
            1.0 if bureau.get("default_history", False) else 0.0,
            cv.avg_liveness,
            float(age_mismatch),
            float(geo_tier),
            float(loan_purpose_risky),
        ],
        dtype=np.float32,
    )
    return vec


def get_feature_importance(raw_vec: np.ndarray) -> dict[str, float]:
    """Heuristic importance: abs-normalized feature values as proxy."""
    total = np.abs(raw_vec).sum() + 1e-9
    importances = np.abs(raw_vec) / total
    return {name: float(importances[i]) for i, name in enumerate(FEATURE_NAMES)}
