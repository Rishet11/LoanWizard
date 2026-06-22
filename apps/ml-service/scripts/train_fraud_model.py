"""Train Keras MLP fraud micro-model on synthetic velocity/device data."""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

MODEL_DIR = ROOT / "app" / "models" / "fraud_mlp"
MODEL_PATH = MODEL_DIR / "fraud_model.keras"
SCALER_PATH = MODEL_DIR / "fraud_scaler.npz"

N = 10_000


def run():
    import tensorflow as tf  # type: ignore

    rng = np.random.default_rng(99)

    canvas_hash_cohort_size = rng.integers(1, 20, size=N)
    session_age_sec = rng.exponential(scale=300, size=N).clip(10, 3600)
    transcript_length = rng.integers(100, 2000, size=N)
    form_mutations = rng.integers(1, 15, size=N)
    min_liveness = rng.beta(15, 1.5, size=N).clip(0.05, 1.0)
    avg_liveness = (min_liveness + rng.beta(20, 1.2, size=N)) / 2
    face_present_ratio = rng.beta(18, 1.2, size=N).clip(0.1, 1.0)
    texture_score_avg = rng.beta(12, 2, size=N).clip(0.1, 1.0)
    ua_entropy = rng.normal(3.8, 0.5, size=N).clip(0, 6)
    income_to_loan_ratio = rng.lognormal(mean=-0.3, sigma=0.5, size=N).clip(0.01, 5.0)
    declared_age_minus_cv_age = rng.normal(0, 3, size=N)
    geo_tier = rng.choice([1, 2, 3], size=N, p=[0.3, 0.5, 0.2])

    # Fraud labels from 4 rules + noise
    fraud_multi_account = (canvas_hash_cohort_size > 3).astype(float)
    fraud_deepfake = ((min_liveness < 0.2) & (face_present_ratio > 0.9)).astype(float)
    fraud_rushed = (session_age_sec < 60).astype(float)
    fraud_age_mismatch = (declared_age_minus_cv_age > 15).astype(float)

    base_prob = (
        0.45 * fraud_multi_account
        + 0.25 * fraud_deepfake
        + 0.20 * fraud_rushed
        + 0.10 * fraud_age_mismatch
    )
    noise = rng.normal(0, 0.05, size=N)
    fraud_prob = np.clip(base_prob + noise, 0.0, 1.0)
    fraud_label = (fraud_prob > 0.4).astype(np.float32)

    X = np.column_stack([
        canvas_hash_cohort_size, session_age_sec, transcript_length, form_mutations,
        min_liveness, avg_liveness, face_present_ratio, texture_score_avg,
        ua_entropy, income_to_loan_ratio, declared_age_minus_cv_age, geo_tier,
    ]).astype(np.float32)

    mean = X.mean(axis=0)
    scale = X.std(axis=0) + 1e-9
    X_scaled = (X - mean) / scale

    idx = np.random.permutation(N)
    split = int(0.85 * N)
    X_train, X_val = X_scaled[idx[:split]], X_scaled[idx[split:]]
    y_train, y_val = fraud_label[idx[:split]], fraud_label[idx[split:]]

    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(12,)),
        tf.keras.layers.Dense(32, activation="relu"),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(16, activation="relu"),
        tf.keras.layers.Dense(1, activation="sigmoid"),
    ])
    model.compile(optimizer="adam", loss="binary_crossentropy", metrics=["accuracy"])
    model.summary()

    model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=15,
        batch_size=256,
        verbose=1,
    )

    val_loss, val_acc = model.evaluate(X_val, y_val, verbose=0)
    print(f"\nVal loss: {val_loss:.4f}  Val acc: {val_acc:.4f}")

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    model.save(str(MODEL_PATH))
    np.savez(str(SCALER_PATH), mean=mean, scale=scale)
    print(f"Fraud model saved to {MODEL_PATH}")
    print(f"Fraud scaler saved to {SCALER_PATH}")

    # Archive under the current version for faithful decision replay.
    from app.services.fraud_scorer import VERSION as FRAUD_VERSION
    archive_dir = MODEL_DIR / "archive" / FRAUD_VERSION
    archive_dir.mkdir(parents=True, exist_ok=True)
    model.save(str(archive_dir / "fraud_model.keras"))
    np.savez(str(archive_dir / "fraud_scaler.npz"), mean=mean, scale=scale)
    print(f"Archived fraud model v{FRAUD_VERSION} to {archive_dir}")


if __name__ == "__main__":
    run()
