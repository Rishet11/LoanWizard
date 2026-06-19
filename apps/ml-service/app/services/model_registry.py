"""Model registry — tracks loaded models, versions, load timestamps."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


class ModelRegistry:
    def __init__(self) -> None:
        self._registry: dict[str, dict[str, Any]] = {}

    def register(self, name: str, version: str, backend: str) -> None:
        self._registry[name] = {
            "version": version,
            "loaded_at": datetime.now(timezone.utc).isoformat(),
            "backend": backend,
        }

    def get(self, name: str) -> dict[str, Any] | None:
        return self._registry.get(name)

    def all(self) -> dict[str, dict[str, Any]]:
        return dict(self._registry)

    def versions(self) -> dict[str, str]:
        return {k: v["version"] for k, v in self._registry.items()}


_registry = ModelRegistry()


def get_registry() -> ModelRegistry:
    return _registry
