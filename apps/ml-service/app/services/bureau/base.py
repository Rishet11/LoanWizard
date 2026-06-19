from __future__ import annotations

from typing import Any, Protocol

from app.schemas import BureauResult, FormData


class BureauAdapter(Protocol):
    name: str
    priority: int

    def lookup(self, form: FormData) -> BureauResult:
        ...
