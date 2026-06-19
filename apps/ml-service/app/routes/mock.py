"""Mock endpoints for Stream C to develop against before real ML is wired."""
from fastapi import APIRouter

from app.schemas import Offer, ReasonCode

router = APIRouter(prefix="/mock")

MOCK_OFFER = Offer(
    session_id="mock-session-001",
    eligible=True,
    amount=500000,
    interest_rate=13.5,
    tenure_months=36,
    emi=16961,
    risk_band="low",
    persona="salaried_prime",
    reason_codes=[
        ReasonCode(code="STABLE_INCOME", label="Stable monthly income", weight=0.35),
        ReasonCode(code="GOOD_CREDIT", label="Strong credit profile", weight=0.28),
        ReasonCode(code="LOW_LTV", label="Healthy loan-to-income ratio", weight=0.22),
    ],
    rejection_reason=None,
    generated_at="2024-01-01T00:00:00+00:00",
)


@router.get("/offer", response_model=Offer)
def mock_offer() -> Offer:
    """Returns a static MOCK_OFFER. Stream C should point here during parallel dev."""
    return MOCK_OFFER
