"""Dev-only debug endpoints."""
from fastapi import APIRouter

from app.deps import (
    BureauDep,
    PersonaDep,
    RiskScorerDep,
)
from app.schemas import (
    DebugPersonaRequest,
    OfferRequest,
    PersonaClassificationOutput,
    RiskScoreOutput,
)

router = APIRouter(prefix="/debug")


@router.post("/risk-score", response_model=RiskScoreOutput)
def debug_risk_score(
    req: OfferRequest,
    risk_scorer: RiskScorerDep,
    bureau: BureauDep,
) -> RiskScoreOutput:
    bureau_data = bureau.get(req.form_data.name or "unknown")
    geo_tier = _infer_geo_tier(req)
    return risk_scorer.score(req.form_data, req.cv_signals_summary, bureau_data, geo_tier)


@router.post("/persona", response_model=PersonaClassificationOutput)
def debug_persona(
    req: DebugPersonaRequest,
    persona_clf: PersonaDep,
    bureau: BureauDep,
) -> PersonaClassificationOutput:
    bureau_data = bureau.get(req.form_data.name or "unknown")
    return persona_clf.classify(req.form_data, bureau_data, req.transcript_snippets)


def _infer_geo_tier(req: OfferRequest) -> int:
    """Rough geo tier from lat/lng: metros=1, tier-2=2, rest=3."""
    if req.geo is None:
        return 2
    lat, lng = req.geo.lat, req.geo.lng
    # Metro coords (rough bounding boxes)
    if (28.4 < lat < 28.9 and 76.8 < lng < 77.4) or \
       (12.8 < lat < 13.2 and 77.4 < lng < 77.8) or \
       (18.8 < lat < 19.3 and 72.7 < lng < 73.1) or \
       (22.4 < lat < 22.8 and 88.2 < lng < 88.5):
        return 1
    return 2
