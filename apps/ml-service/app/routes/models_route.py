"""GET /models — model registry."""
from fastapi import APIRouter

from app.schemas import ModelInfo, ModelsResponse
from app.services.model_registry import get_registry

router = APIRouter()


@router.get("/models", response_model=ModelsResponse)
def list_models() -> ModelsResponse:
    reg = get_registry()
    defaults = {"version": "unknown", "loaded_at": "n/a", "backend": "unknown"}

    def _info(name: str) -> ModelInfo:
        data = reg.get(name) or defaults
        return ModelInfo(**data)

    return ModelsResponse(
        risk=_info("risk"),
        fraud=_info("fraud"),
        persona=_info("persona"),
    )
