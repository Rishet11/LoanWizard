from fastapi import APIRouter

from app.deps import get_risk_scorer, get_persona_classifier
from app.schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    risk = get_risk_scorer()
    persona = get_persona_classifier()
    return HealthResponse(
        status="ok",
        models_loaded={"risk": risk.is_loaded, "persona": persona.is_loaded},
    )
