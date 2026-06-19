"""Generate ~10k rows of synthetic loan applicant data and save to data/synthetic.csv."""
from __future__ import annotations

import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

np.random.seed(42)
N = 10_000

def run():
    rng = np.random.default_rng(42)

    monthly_income = rng.lognormal(mean=10.7, sigma=0.5, size=N).clip(10_000, 500_000)
    loan_amount = rng.lognormal(mean=13.0, sigma=0.6, size=N).clip(50_000, 2_000_000)
    annual_income = monthly_income * 12
    loan_to_income_ratio = (loan_amount / annual_income).clip(0, 5)

    declared_age = rng.integers(18, 70, size=N)
    employment_type_encoded = rng.choice([0, 1, 2, 3, 4], size=N, p=[0.55, 0.25, 0.10, 0.05, 0.05])
    cibil_score_proxy = rng.normal(700, 80, size=N).clip(300, 900).astype(int)
    existing_loans = rng.integers(0, 6, size=N)
    has_default_history = (rng.random(N) < 0.08).astype(int)

    avg_liveness = rng.beta(15, 1.5, size=N).clip(0.3, 1.0)
    age_noise = rng.normal(0, 3, size=N)
    age_mismatch_flag = (np.abs(age_noise) > 5).astype(int)

    geo_tier = rng.choice([1, 2, 3], size=N, p=[0.3, 0.5, 0.2])
    loan_purpose_risky = (rng.random(N) < 0.2).astype(int)

    # Synthesize default_probability from a rule-based formula
    lti_risk = np.clip(loan_to_income_ratio / 3, 0, 1)
    cibil_risk = np.clip((750 - cibil_score_proxy) / 450, 0, 1)
    emp_risk = np.where(employment_type_encoded == 0, 0.1,
               np.where(employment_type_encoded == 4, 0.25,
               np.where(employment_type_encoded == 1, 0.3,
               np.where(employment_type_encoded == 2, 0.35, 0.75))))
    liveness_risk = 1.0 - avg_liveness

    base = (
        0.30 * lti_risk
        + 0.30 * cibil_risk
        + 0.20 * emp_risk
        + 0.10 * liveness_risk
        + 0.05 * has_default_history
        + 0.03 * age_mismatch_flag
        + 0.02 * loan_purpose_risky
    )
    noise = rng.normal(0, 0.03, size=N)
    default_probability = np.clip(base + noise, 0.0, 1.0)

    df = pd.DataFrame({
        "monthly_income": monthly_income,
        "loan_amount_requested": loan_amount,
        "loan_to_income_ratio": loan_to_income_ratio,
        "declared_age": declared_age,
        "employment_type_encoded": employment_type_encoded,
        "cibil_score_proxy": cibil_score_proxy,
        "existing_loans": existing_loans,
        "has_default_history": has_default_history,
        "avg_liveness": avg_liveness,
        "age_mismatch_flag": age_mismatch_flag,
        "geo_tier": geo_tier,
        "loan_purpose_risky": loan_purpose_risky,
        "default_probability": default_probability,
    })

    out_dir = ROOT / "data"
    out_dir.mkdir(exist_ok=True)
    out_path = out_dir / "synthetic.csv"
    df.to_csv(out_path, index=False)
    print(f"Saved {len(df)} rows to {out_path}")
    print(df.describe())


if __name__ == "__main__":
    run()
