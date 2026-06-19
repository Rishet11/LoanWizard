"""Thin shim — preserves old interface while delegating to the new bureau adapter stack."""
from __future__ import annotations

import os

from app.schemas import FormData
from app.services.bureau.cibil_mock import CIBILMock
from app.services.bureau.experian_mock import ExperianMock
from app.services.bureau.merge import merge_results

_CIBIL = CIBILMock()
_EXPERIAN = ExperianMock()

_ADAPTER_MAP = {"cibil": _CIBIL, "experian": _EXPERIAN}

_ENABLED = [a.strip() for a in os.getenv("BUREAU_ADAPTERS", "cibil,experian").split(",")]
_STRATEGY = os.getenv("BUREAU_MERGE_STRATEGY", "weighted")


class BureauMock:
    """Backward-compatible façade. Callers use `.get(name)` as before."""

    def get(self, name: str) -> dict:
        form = FormData(name=name)
        results = [_ADAPTER_MAP[a].lookup(form) for a in _ENABLED if a in _ADAPTER_MAP]
        return merge_results(results, strategy=_STRATEGY)
