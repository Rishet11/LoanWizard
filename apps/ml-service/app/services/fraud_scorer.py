"""Fraud micro-model wrapper — inline Keras load, heuristic fallback."""
from __future__ import annotations

import logging
from pathlib import Path

import numpy as np

from app.schemas import CVSignalsSummary, DeviceFingerprint, FormData, FraudScoreOutput
from app.models.fraud_mlp.features import build_fraud_features, FRAUD_FEATURE_NAMES

logger = logging.getLogger(__name__)

VERSION = "0.1.0"

# Default location of the production fraud model. A specific archived version can
# be loaded by passing model_dir=.../models/fraud_mlp/archive/<version>.
DEFAULT_MODEL_DIR = Path(__file__).parent.parent / "models" / "fraud_mlp"


class FraudScorer:
    def __init__(self, model_dir: Path | str | None = None) -> None:
        self._dir = Path(model_dir) if model_dir else DEFAULT_MODEL_DIR
        self._model = None
        self._mean: np.ndarray | None = None
        self._scale: np.ndarray | None = None

    def load(self) -> None:
        try:
            import tensorflow as tf  # type: ignore

            model_path = self._dir / "fraud_model.keras"
            scaler_path = self._dir / "fraud_scaler.npz"
            if model_path.exists():
                self._model = tf.keras.models.load_model(str(model_path), compile=False)
                logger.info("Fraud model loaded from %s", model_path)

            if scaler_path.exists():
                data = np.load(str(scaler_path))
                self._mean = data["mean"]
                self._scale = data["scale"]
            elif self._model is not None:
                logger.warning(
                    "Fraud model loaded but scaler missing at %s — scoring on raw features",
                    scaler_path,
                )
        except Exception as exc:
            logger.warning("Fraud model failed to load (%s) — using heuristic", exc)

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    def _heuristic(self, form: FormData, cv: CVSignalsSummary, fp: DeviceFingerprint | None) -> float:
        fp = fp or DeviceFingerprint()
        score = 0.0
        if fp.canvas_hash_cohort_size > 3:
            score += 0.45
        if cv.min_liveness < 0.2 and cv.face_present_ratio > 0.9:
            score += 0.25
        if fp.session_age_sec < 60:
            score += 0.20
        declared = form.declared_age or 30
        cv_age = cv.avg_age_estimate or float(declared)
        if abs(declared - cv_age) > 15:
            score += 0.10
        return float(min(score, 1.0))

    def _signals(self, form: FormData, cv: CVSignalsSummary, fp: DeviceFingerprint | None) -> list[str]:
        fp = fp or DeviceFingerprint()
        signals = []
        if fp.canvas_hash_cohort_size > 3:
            signals.append(f"multi_account_signal (cohort={fp.canvas_hash_cohort_size})")
        if cv.min_liveness < 0.2:
            signals.append(f"low_liveness ({cv.min_liveness:.2f})")
        if fp.session_age_sec < 60:
            signals.append(f"rushed_submission ({fp.session_age_sec:.0f}s)")
        declared = form.declared_age or 30
        cv_age = cv.avg_age_estimate or float(declared)
        if abs(declared - cv_age) > 15:
            signals.append(f"age_mismatch ({declared} vs {cv_age:.0f})")
        return signals

    def score(
        self,
        form: FormData,
        cv: CVSignalsSummary,
        fp: DeviceFingerprint | None,
        geo_tier: int = 2,
    ) -> FraudScoreOutput:
        signals = self._signals(form, cv, fp)
        raw_vec = build_fraud_features(form, cv, fp, geo_tier)

        if self._model is not None:
            try:
                if self._mean is not None:
                    norm = (raw_vec - self._mean) / (self._scale + 1e-9)
                else:
                    norm = raw_vec
                pred = self._model.predict(norm.reshape(1, -1), verbose=0)
                fraud_score = float(pred[0][0])
            except Exception as exc:
                logger.warning("Fraud inference failed (%s) — using heuristic", exc)
                fraud_score = self._heuristic(form, cv, fp)
        else:
            fraud_score = self._heuristic(form, cv, fp)

        return FraudScoreOutput(
            fraud_score=round(min(max(fraud_score, 0.0), 1.0), 4),
            fraud_signals=signals,
        )
