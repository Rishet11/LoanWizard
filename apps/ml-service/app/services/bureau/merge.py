"""Bureau merge strategies."""
from __future__ import annotations

from typing import Callable

from app.schemas import BureauResult


def _merge_max(results: list[BureauResult], weights: dict[str, float] | None = None) -> dict:
    """Higher score wins; union existing_loans; OR default_history."""
    best = max(results, key=lambda r: r.credit_score)
    return {
        "cibil_score_proxy": best.credit_score,
        "existing_loans": max(r.existing_loans for r in results),
        "default_history": any(r.default_history for r in results),
        "thin_file": all(r.thin_file for r in results),
        "_sources": [r.bureau for r in results],
        "_strategy": "max",
    }


def _merge_avg(results: list[BureauResult], weights: dict[str, float] | None = None) -> dict:
    """Mean score; sum existing_loans; any default_history."""
    score = int(sum(r.credit_score for r in results) / len(results))
    return {
        "cibil_score_proxy": score,
        "existing_loans": sum(r.existing_loans for r in results),
        "default_history": any(r.default_history for r in results),
        "thin_file": all(r.thin_file for r in results),
        "_sources": [r.bureau for r in results],
        "_strategy": "avg",
    }


def _merge_weighted(results: list[BureauResult], weights: dict[str, float] | None = None) -> dict:
    """Weighted mean by adapter priority (or explicit weights dict)."""
    if not weights:
        total_priority = sum(getattr(r, "_priority", 1) for r in results)
        w = {r.bureau: getattr(r, "_priority", 1) / max(total_priority, 1) for r in results}
    else:
        total = sum(weights.values()) or 1
        w = {k: v / total for k, v in weights.items()}

    score = int(sum(r.credit_score * w.get(r.bureau, 1 / len(results)) for r in results))
    return {
        "cibil_score_proxy": score,
        "existing_loans": max(r.existing_loans for r in results),
        "default_history": any(r.default_history for r in results),
        "thin_file": all(r.thin_file for r in results),
        "_sources": [r.bureau for r in results],
        "_strategy": "weighted",
    }


MERGE_STRATEGIES: dict[str, Callable] = {
    "max": _merge_max,
    "avg": _merge_avg,
    "weighted": _merge_weighted,
}


def merge_results(
    results: list[BureauResult],
    strategy: str = "weighted",
    weights: dict[str, float] | None = None,
) -> dict:
    if not results:
        return {"cibil_score_proxy": 700, "existing_loans": 0, "default_history": False, "thin_file": True}
    if len(results) == 1:
        r = results[0]
        return {
            "cibil_score_proxy": r.credit_score,
            "existing_loans": r.existing_loans,
            "default_history": r.default_history,
            "thin_file": r.thin_file,
            "_sources": [r.bureau],
            "_strategy": "single",
        }
    fn = MERGE_STRATEGIES.get(strategy, _merge_weighted)
    return fn(results, weights)
