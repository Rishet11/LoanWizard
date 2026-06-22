"""TF Keras MLP risk model wrapper with inline loading."""
from __future__ import annotations

import logging
import os
from pathlib import Path

import numpy as np

from app.schemas import FormData, CVSignalsSummary, RiskScoreOutput
from app.models.risk_mlp.features import build_feature_vector, get_feature_importance, FEATURE_NAMES

logger = logging.getLogger(__name__)

VERSION = "1.2.0"

# Default location of the production risk model. A specific archived version can
# be loaded by passing model_dir=.../models/risk_mlp/archive/<version>.
DEFAULT_MODEL_DIR = Path(__file__).parent.parent / "models" / "risk_mlp"


class RiskScorer:
    def __init__(self, model_dir: Path | str | None = None) -> None:
        self._dir = Path(model_dir) if model_dir else DEFAULT_MODEL_DIR
        self._model = None
        self._scaler_mean: np.ndarray | None = None
        self._scaler_scale: np.ndarray | None = None
        self._loaded = False

    def load(self) -> None:
        try:
            import tensorflow as tf  # type: ignore

            keras_path = self._dir / "keras_model.keras"
            h5_path = self._dir / "keras_model.h5"
            load_path = keras_path if keras_path.exists() else h5_path if h5_path.exists() else None
            if load_path:
                self._model = tf.keras.models.load_model(str(load_path), compile=False)
                logger.info("Risk model loaded from %s", load_path)
            else:
                logger.warning("No risk model found in %s — using fallback heuristic", self._dir)

            scaler_path = self._dir / "scaler_params.npz"
            if scaler_path.exists():
                data = np.load(str(scaler_path))
                self._scaler_mean = data["mean"]
                self._scaler_scale = data["scale"]
        except Exception as exc:
            logger.warning("Risk model failed to load (%s) — using fallback heuristic", exc)
        finally:
            self._loaded = True

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    def _normalize(self, vec: np.ndarray) -> np.ndarray:
        if self._scaler_mean is not None and self._scaler_scale is not None:
            return (vec - self._scaler_mean) / (self._scaler_scale + 1e-9)
        return vec

    def _compute_importance(self, raw_vec: np.ndarray) -> dict[str, float]:
        """Permutation importance from the trained model: how far the risk score
        moves when each feature is reset to its training mean (0 in scaled space).
        Falls back to the magnitude heuristic when the model isn't loaded."""
        if self._model is None:
            return get_feature_importance(raw_vec)
        try:
            norm = self._normalize(raw_vec).astype(np.float32)
            n = norm.shape[0]
            # Row 0 is the baseline; row i+1 zeroes feature i (its scaled mean).
            batch = np.repeat(norm.reshape(1, -1), n + 1, axis=0)
            for i in range(n):
                batch[i + 1, i] = 0.0
            preds = self._model.predict(batch, verbose=0).reshape(-1)
            deltas = np.abs(preds[1:] - preds[0])
            total = float(deltas.sum()) + 1e-9
            return {name: float(deltas[i] / total) for i, name in enumerate(FEATURE_NAMES)}
        except Exception as exc:
            logger.warning("Permutation importance failed (%s) — using heuristic", exc)
            return get_feature_importance(raw_vec)

    def _heuristic_score(self, form: FormData, cv: CVSignalsSummary, bureau: dict) -> float:
        """Deterministic fallback when model not available."""
        income = form.monthly_income or 1.0
        loan = form.loan_amount_requested or 0.0
        cibil = bureau.get("cibil_score_proxy", 700)
        default_h = 1.0 if bureau.get("default_history", False) else 0.0
        emp = form.employment_type or "unemployed"

        ltv_risk = min(loan / (income * 24 + 1e-9), 1.0)
        cibil_risk = max(0.0, (750 - cibil) / 450)
        emp_risk = {"salaried": 0.1, "self_employed": 0.3, "business_owner": 0.35, "retired": 0.25, "unemployed": 0.8}.get(emp, 0.5)
        liveness_risk = max(0.0, 1.0 - cv.avg_liveness)

        score = 0.35 * ltv_risk + 0.3 * cibil_risk + 0.2 * emp_risk + 0.1 * liveness_risk + 0.05 * default_h
        return float(min(max(score, 0.0), 1.0))

    def score(
        self,
        form: FormData,
        cv: CVSignalsSummary,
        bureau: dict,
        geo_tier: int = 2,
    ) -> RiskScoreOutput:
        raw_vec = build_feature_vector(form, cv, bureau, geo_tier)
        importance = self._compute_importance(raw_vec)

        if self._model is not None:
            try:
                normalized = self._normalize(raw_vec)
                pred = self._model.predict(normalized.reshape(1, -1), verbose=0)
                risk_score = float(pred[0][0])
            except Exception as exc:
                logger.warning("Model inference failed (%s) — using heuristic", exc)
                risk_score = self._heuristic_score(form, cv, bureau)
        else:
            risk_score = self._heuristic_score(form, cv, bureau)

        risk_score = min(max(risk_score, 0.0), 1.0)

        if risk_score < 0.2:
            band = "low"
        elif risk_score < 0.5:
            band = "medium"
        else:
            band = "high"

        top_features = dict(sorted(importance.items(), key=lambda x: x[1], reverse=True)[:5])

        return RiskScoreOutput(
            risk_band=band,
            risk_score=round(risk_score, 4),
            feature_importance=top_features,
        )
