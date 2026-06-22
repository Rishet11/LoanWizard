from __future__ import annotations

import hashlib
from typing import Any, Protocol

from app.schemas import BureauResult, FormData


def stable_seed(name: str | None) -> int:
    """Process-independent seed derived from a name.

    Python's builtin ``hash()`` is salted per process (PYTHONHASHSEED), so it is
    not reproducible across restarts. The mock bureaus need a name -> score
    mapping that is genuinely deterministic, so we hash with SHA-256 instead.
    """
    digest = hashlib.sha256((name or "unknown").encode("utf-8")).hexdigest()
    return int(digest, 16) % 1_000_000


class BureauAdapter(Protocol):
    name: str
    priority: int

    def lookup(self, form: FormData) -> BureauResult:
        ...
