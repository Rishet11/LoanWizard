"""Train the Keras MLP risk model and save artifact + scaler params."""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

DATA_PATH = ROOT / "data" / "synthetic.csv"
MODEL_DIR = ROOT / "app" / "models" / "risk_mlp"
MODEL_PATH = MODEL_DIR / "keras_model.h5"
SCALER_PATH = MODEL_DIR / "scaler_params.npz"

FEATURE_COLS = [
    "monthly_income",
    "loan_amount_requested",
    "loan_to_income_ratio",
    "declared_age",
    "employment_type_encoded",
    "cibil_score_proxy",
    "existing_loans",
    "has_default_history",
    "avg_liveness",
    "age_mismatch_flag",
    "geo_tier",
    "loan_purpose_risky",
]
TARGET_COL = "default_probability"


def run():
    if not DATA_PATH.exists():
        print(f"Data not found at {DATA_PATH}. Run generate_synthetic_data.py first.")
        sys.exit(1)

    import tensorflow as tf  # type: ignore

    df = pd.read_csv(DATA_PATH)
    X = df[FEATURE_COLS].values.astype(np.float32)
    y = df[TARGET_COL].values.astype(np.float32)

    # Standard scaling
    mean = X.mean(axis=0)
    scale = X.std(axis=0) + 1e-9
    X_scaled = (X - mean) / scale

    # Train/val split
    n = len(X_scaled)
    idx = np.random.permutation(n)
    split = int(0.85 * n)
    X_train, X_val = X_scaled[idx[:split]], X_scaled[idx[split:]]
    y_train, y_val = y[idx[:split]], y[idx[split:]]

    # MLP: 3 dense layers (64, 32, 1), sigmoid output
    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(len(FEATURE_COLS),)),
        tf.keras.layers.Dense(64, activation="relu"),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(32, activation="relu"),
        tf.keras.layers.Dropout(0.1),
        tf.keras.layers.Dense(1, activation="sigmoid"),
    ])

    model.compile(optimizer="adam", loss="mse", metrics=["mae"])
    model.summary()

    model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=20,
        batch_size=256,
        verbose=1,
    )

    val_loss, val_mae = model.evaluate(X_val, y_val, verbose=0)
    print(f"\nVal MSE: {val_loss:.4f}  Val MAE: {val_mae:.4f}")

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    # Save in native Keras format (preferred) and h5 (legacy compat)
    keras_path = MODEL_DIR / "keras_model.keras"
    model.save(str(keras_path))
    model.save(str(MODEL_PATH))  # h5 fallback
    np.savez(str(SCALER_PATH), mean=mean, scale=scale)
    print(f"Model saved to {keras_path} and {MODEL_PATH}")
    print(f"Scaler saved to {SCALER_PATH}")

    # Also archive under the current version so past decisions can be replayed on
    # the exact weights that produced them.
    from app.services.risk_scorer import VERSION as RISK_VERSION
    archive_dir = MODEL_DIR / "archive" / RISK_VERSION
    archive_dir.mkdir(parents=True, exist_ok=True)
    model.save(str(archive_dir / "keras_model.keras"))
    model.save(str(archive_dir / "keras_model.h5"))
    np.savez(str(archive_dir / "scaler_params.npz"), mean=mean, scale=scale)
    print(f"Archived risk model v{RISK_VERSION} to {archive_dir}")


if __name__ == "__main__":
    run()
