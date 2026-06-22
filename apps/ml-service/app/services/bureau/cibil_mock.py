"""CIBIL mock bureau — deterministic by name hash, score range 650-850."""
from __future__ import annotations

import random

from app.schemas import BureauResult, FormData
from app.services.bureau.base import stable_seed


class CIBILMock:
    name = "cibil"
    priority = 1

    def lookup(self, form: FormData) -> BureauResult:
        seed = stable_seed(form.name)
        rng = random.Random(seed)
        score = rng.randint(650, 850)
        loans = rng.randint(0, 3)
        default_h = rng.random() < 0.05
        return BureauResult(
            bureau="cibil",
            credit_score=score,
            existing_loans=loans,
            default_history=default_h,
            thin_file=score < 680,
            raw={
                "cibil_score_proxy": score,
                "payment_history_score": rng.randint(70, 100),
                "enquiries_6m": rng.randint(0, 5),
            },
        )
