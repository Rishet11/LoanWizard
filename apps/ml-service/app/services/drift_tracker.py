"""Rolling in-memory drift tracker + training-set baseline."""
from __future__ import annotations

import logging
from collections import deque
from pathlib import Path
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

_WINDOW = 1000
DATA_PATH = Path(__file__).parent.parent.parent / "data" / "synthetic.csv"


class FeatureWindow:
    """Online stats for a single feature using Welford's algorithm."""

    def __init__(self, maxlen: int = _WINDOW) -> None:
        self._buf: deque[float] = deque(maxlen=maxlen)
        self._n = 0
        self._mean = 0.0
        self._M2 = 0.0

    def push(self, value: float) -> None:
        if len(self._buf) == self._buf.maxlen:
            # Evict old — approximate: just rebuild stats periodically
            pass
        self._buf.append(value)
        self._n += 1
        delta = value - self._mean
        self._mean += delta / self._n
        self._M2 += delta * (value - self._mean)

    def stats(self) -> dict:
        arr = np.array(self._buf)
        n = len(arr)
        if n == 0:
            return {"n": 0, "mean": 0.0, "std": 0.0, "p50": 0.0, "p99": 0.0}
        return {
            "n": n,
            "mean": float(np.mean(arr)),
            "std": float(np.std(arr)),
            "p50": float(np.percentile(arr, 50)),
            "p99": float(np.percentile(arr, 99)),
        }


class DriftTracker:
    def __init__(self) -> None:
        self._windows: dict[str, FeatureWindow] = {}
        self._baseline: dict[str, dict] = {}

    def push(self, features: dict[str, float]) -> None:
        for k, v in features.items():
            if k not in self._windows:
                self._windows[k] = FeatureWindow()
            try:
                self._windows[k].push(float(v))
            except (TypeError, ValueError):
                pass

    def stats(self, feature: str) -> Optional[dict]:
        w = self._windows.get(feature)
        if w is None:
            return None
        return w.stats()

    def known_features(self) -> list[str]:
        return list(self._windows.keys())

    def load_baseline(self) -> None:
        """Compute training distribution from synthetic CSV."""
        if not DATA_PATH.exists():
            logger.warning("Synthetic data not found at %s — no baseline", DATA_PATH)
            return
        try:
            import pandas as pd  # type: ignore
            df = pd.read_csv(DATA_PATH)
            for col in df.select_dtypes(include="number").columns:
                arr = df[col].dropna().values
                self._baseline[col] = {
                    "n": int(len(arr)),
                    "mean": float(np.mean(arr)),
                    "std": float(np.std(arr)),
                    "p50": float(np.percentile(arr, 50)),
                    "p99": float(np.percentile(arr, 99)),
                    "source": "training",
                }
            logger.info("Drift baseline loaded from %s (%d features)", DATA_PATH, len(self._baseline))
        except Exception as exc:
            logger.warning("Baseline load failed: %s", exc)

    def baseline(self, feature: str) -> Optional[dict]:
        return self._baseline.get(feature)


_tracker = DriftTracker()


def get_tracker() -> DriftTracker:
    return _tracker
