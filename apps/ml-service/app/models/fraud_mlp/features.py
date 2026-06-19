"""Feature engineering for the fraud micro-model."""
from __future__ import annotations

import math

import numpy as np

from app.schemas import FormData, CVSignalsSummary, DeviceFingerprint

FRAUD_FEATURE_NAMES = [
    "canvas_hash_cohort_size",
    "session_age_sec",
    "transcript_length",
    "form_mutations",
    "min_liveness",
    "avg_liveness",
    "face_present_ratio",
    "texture_score_avg",
    "ua_entropy",
    "income_to_loan_ratio",
    "declared_age_minus_cv_age",
    "geo_tier",
]


def _ua_entropy(ua: str) -> float:
    if not ua:
        return 0.0
    freq = {}
    for ch in ua:
        freq[ch] = freq.get(ch, 0) + 1
    n = len(ua)
    return -sum((c / n) * math.log2(c / n) for c in freq.values())


def build_fraud_features(
    form: FormData,
    cv: CVSignalsSummary,
    fp: DeviceFingerprint | None,
    geo_tier: int = 2,
) -> np.ndarray:
    fp = fp or DeviceFingerprint()
    income = form.monthly_income or 1.0
    loan = form.loan_amount_requested or 1.0
    declared_age = form.declared_age or 30
    cv_age = cv.avg_age_estimate or float(declared_age)

    vec = np.array(
        [
            float(fp.canvas_hash_cohort_size),
            float(fp.session_age_sec),
            float(fp.transcript_length),
            float(fp.form_mutations),
            cv.min_liveness,
            cv.avg_liveness,
            cv.face_present_ratio,
            cv.texture_score_avg,
            _ua_entropy(fp.ua),
            income / max(loan, 1.0),
            float(declared_age) - float(cv_age),
            float(geo_tier),
        ],
        dtype=np.float32,
    )
    return vec
