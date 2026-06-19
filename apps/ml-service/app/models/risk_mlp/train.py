"""Alias — run from repo root via scripts/train_risk_model.py instead."""
import subprocess, sys, pathlib
subprocess.run([sys.executable, str(pathlib.Path(__file__).parent.parent.parent.parent / "scripts" / "train_risk_model.py")], check=True)
