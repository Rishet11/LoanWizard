"""Experian mock bureau — different score distribution (600-900), extra fields."""
from __future__ import annotations

import random

from app.schemas import BureauResult, FormData


class ExperianMock:
    name = "experian"
    priority = 2

    def lookup(self, form: FormData) -> BureauResult:
        # Offset seed so scores differ from CIBIL for the same name
        seed = (hash(form.name or "unknown") + 42) % 1000
        rng = random.Random(seed)
        score = rng.randint(600, 900)
        loans = rng.randint(0, 4)
        default_h = rng.random() < 0.06
        return BureauResult(
            bureau="experian",
            credit_score=score,
            existing_loans=loans,
            default_history=default_h,
            thin_file=score < 650 or loans == 0,
            raw={
                "experian_score": score,
                "credit_utilisation_pct": rng.randint(10, 80),
                "delinquencies_2y": rng.randint(0, 2),
                "oldest_account_months": rng.randint(6, 120),
            },
        )
