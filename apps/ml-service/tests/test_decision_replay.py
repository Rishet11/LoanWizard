"""Tests for decision replay logic."""
import pytest

from app.routes.decisions import _deep_merge, _compute_diff
from app.schemas import DiffEntry


def test_deep_merge_simple():
    base = {"a": 1, "b": 2}
    overrides = {"b": 99}
    result = _deep_merge(base, overrides)
    assert result == {"a": 1, "b": 99}


def test_deep_merge_nested():
    base = {"form_data": {"monthly_income": 50_000, "name": "Alice"}}
    overrides = {"form_data": {"monthly_income": 90_000}}
    result = _deep_merge(base, overrides)
    assert result["form_data"]["monthly_income"] == 90_000
    assert result["form_data"]["name"] == "Alice"


def test_deep_merge_does_not_mutate_base():
    base = {"form_data": {"monthly_income": 50_000}}
    overrides = {"form_data": {"monthly_income": 90_000}}
    _deep_merge(base, overrides)
    assert base["form_data"]["monthly_income"] == 50_000


def test_deep_merge_adds_new_key():
    base = {"a": 1}
    overrides = {"b": 2}
    result = _deep_merge(base, overrides)
    assert result == {"a": 1, "b": 2}


def test_compute_diff_detects_change():
    original = {"interest_rate": 13.0, "amount": 150_000}
    replayed = {"interest_rate": 12.0, "amount": 200_000}
    diff = _compute_diff(original, replayed)
    assert len(diff) == 2
    fields = {d.field for d in diff}
    assert "interest_rate" in fields
    assert "amount" in fields


def test_compute_diff_no_change():
    d = {"eligible": True, "interest_rate": 13.0}
    diff = _compute_diff(d, d.copy())
    assert diff == []


def test_compute_diff_entry_values():
    original = {"interest_rate": 13.0}
    replayed = {"interest_rate": 12.0}
    diff = _compute_diff(original, replayed)
    entry = diff[0]
    assert entry.field == "interest_rate"
    assert entry.from_ == 13.0
    assert entry.to == 12.0


def test_compute_diff_new_field():
    original = {"a": 1}
    replayed = {"a": 1, "b": 2}
    diff = _compute_diff(original, replayed)
    assert any(d.field == "b" for d in diff)


def test_compute_diff_type_change():
    original = {"eligible": True}
    replayed = {"eligible": False}
    diff = _compute_diff(original, replayed)
    assert diff[0].from_ is True
    assert diff[0].to is False
