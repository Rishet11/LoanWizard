"""GET /drift/{feature} — rolling feature stats."""
from fastapi import APIRouter, HTTPException

from app.schemas import DriftBaseline, DriftStats
from app.services.drift_tracker import get_tracker

router = APIRouter(prefix="/drift")


@router.get("/{feature}", response_model=DriftStats)
def drift_stats(feature: str) -> DriftStats:
    tracker = get_tracker()
    stats = tracker.stats(feature)
    if stats is None:
        raise HTTPException(status_code=404, detail=f"Feature '{feature}' not tracked yet")
    return DriftStats(feature=feature, **stats)


@router.get("/{feature}/baseline", response_model=DriftBaseline)
def drift_baseline(feature: str) -> DriftBaseline:
    tracker = get_tracker()
    b = tracker.baseline(feature)
    if b is None:
        raise HTTPException(status_code=404, detail=f"No baseline for '{feature}'")
    return DriftBaseline(feature=feature, **b)
