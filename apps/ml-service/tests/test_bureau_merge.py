"""Tests for multi-bureau adapter pattern and merge strategies."""
import pytest

from app.schemas import FormData
from app.services.bureau.cibil_mock import CIBILMock
from app.services.bureau.experian_mock import ExperianMock
from app.services.bureau.merge import merge_results, MERGE_STRATEGIES

FORM = FormData(name="Rahul Sharma")


# ---- CIBIL adapter ----

def test_cibil_returns_bureau_result():
    result = CIBILMock().lookup(FORM)
    assert result.bureau == "cibil"
    assert 650 <= result.credit_score <= 850
    assert result.existing_loans >= 0
    assert isinstance(result.default_history, bool)


def test_cibil_deterministic_same_name():
    r1 = CIBILMock().lookup(FORM)
    r2 = CIBILMock().lookup(FORM)
    assert r1.credit_score == r2.credit_score


def test_cibil_different_names_differ():
    r1 = CIBILMock().lookup(FormData(name="Alice"))
    r2 = CIBILMock().lookup(FormData(name="Bob"))
    # Very unlikely to collide
    assert r1.credit_score != r2.credit_score or r1.existing_loans != r2.existing_loans


# ---- Experian adapter ----

def test_experian_returns_bureau_result():
    result = ExperianMock().lookup(FORM)
    assert result.bureau == "experian"
    assert 600 <= result.credit_score <= 900


def test_experian_differs_from_cibil():
    c = CIBILMock().lookup(FORM)
    e = ExperianMock().lookup(FORM)
    assert c.credit_score != e.credit_score  # different seeds


def test_experian_raw_has_extra_fields():
    result = ExperianMock().lookup(FORM)
    assert "experian_score" in result.raw
    assert "credit_utilisation_pct" in result.raw


# ---- Merge strategies ----

def _results():
    return [CIBILMock().lookup(FORM), ExperianMock().lookup(FORM)]


def test_merge_max_picks_highest_score():
    results = _results()
    merged = merge_results(results, strategy="max")
    assert merged["cibil_score_proxy"] == max(r.credit_score for r in results)
    assert merged["_strategy"] == "max"


def test_merge_avg_uses_mean_score():
    results = _results()
    merged = merge_results(results, strategy="avg")
    expected = int(sum(r.credit_score for r in results) / 2)
    assert merged["cibil_score_proxy"] == expected
    assert merged["_strategy"] == "avg"


def test_merge_weighted_bounded():
    results = _results()
    merged = merge_results(results, strategy="weighted")
    lo = min(r.credit_score for r in results)
    hi = max(r.credit_score for r in results)
    assert lo <= merged["cibil_score_proxy"] <= hi


def test_merge_default_history_or():
    from app.schemas import BureauResult
    r1 = BureauResult(bureau="a", credit_score=700, existing_loans=1, default_history=True, thin_file=False)
    r2 = BureauResult(bureau="b", credit_score=750, existing_loans=0, default_history=False, thin_file=False)
    merged = merge_results([r1, r2], strategy="max")
    assert merged["default_history"] is True


def test_merge_single_result_passthrough():
    results = [CIBILMock().lookup(FORM)]
    merged = merge_results(results, strategy="max")
    assert merged["cibil_score_proxy"] == results[0].credit_score
    assert merged["_strategy"] == "single"


def test_merge_empty_returns_default():
    merged = merge_results([], strategy="max")
    assert merged["cibil_score_proxy"] == 700


def test_all_strategies_present():
    assert "max" in MERGE_STRATEGIES
    assert "avg" in MERGE_STRATEGIES
    assert "weighted" in MERGE_STRATEGIES


# ---- BureauMock shim ----

def test_bureau_mock_shim_returns_dict():
    from app.services.bureau_mock import BureauMock
    bureau = BureauMock()
    result = bureau.get("Test User")
    assert "cibil_score_proxy" in result
    assert "existing_loans" in result
    assert "default_history" in result
