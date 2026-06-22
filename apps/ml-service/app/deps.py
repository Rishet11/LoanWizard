"""Dependency injection for FastAPI routes — v4."""
from __future__ import annotations

from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.risk_scorer import RiskScorer
from app.services.policy_engine import PolicyEngine
from app.services.persona_classifier import PersonaClassifier
from app.services.offer_builder import OfferBuilder
from app.services.bureau_mock import BureauMock
from app.services.fraud_scorer import FraudScorer
from app.services.reason_narrator import ReasonNarrator
from app.services.transcriber import WhisperTranscriber
from app.services.model_registry import get_registry


@lru_cache(maxsize=1)
def get_risk_scorer() -> RiskScorer:
    from app.services.risk_scorer import VERSION as RISK_VERSION
    scorer = RiskScorer()
    scorer.load()
    get_registry().register("risk", RISK_VERSION, "keras" if scorer.is_loaded else "heuristic")
    return scorer


@lru_cache(maxsize=1)
def get_policy_engine() -> PolicyEngine:
    get_registry().register("persona", "1.0.0", "rules")
    return PolicyEngine()


@lru_cache(maxsize=1)
def get_persona_classifier() -> PersonaClassifier:
    clf = PersonaClassifier()
    clf.load()
    return clf


@lru_cache(maxsize=1)
def get_offer_builder() -> OfferBuilder:
    return OfferBuilder()


@lru_cache(maxsize=1)
def get_bureau_mock() -> BureauMock:
    return BureauMock()


@lru_cache(maxsize=1)
def get_fraud_scorer() -> FraudScorer:
    from app.services.fraud_scorer import VERSION as FRAUD_VERSION
    scorer = FraudScorer()
    scorer.load()
    get_registry().register("fraud", FRAUD_VERSION, "keras" if scorer.is_loaded else "heuristic")
    return scorer


@lru_cache(maxsize=1)
def get_narrator() -> ReasonNarrator:
    narrator = ReasonNarrator()
    narrator.load()
    return narrator


@lru_cache(maxsize=1)
def get_transcriber() -> WhisperTranscriber:
    transcriber = WhisperTranscriber()
    transcriber.load()
    return transcriber


DbDep = Annotated[Session, Depends(get_db)]
RiskScorerDep = Annotated[RiskScorer, Depends(get_risk_scorer)]
PolicyDep = Annotated[PolicyEngine, Depends(get_policy_engine)]
PersonaDep = Annotated[PersonaClassifier, Depends(get_persona_classifier)]
OfferBuilderDep = Annotated[OfferBuilder, Depends(get_offer_builder)]
BureauDep = Annotated[BureauMock, Depends(get_bureau_mock)]
FraudScorerDep = Annotated[FraudScorer, Depends(get_fraud_scorer)]
NarratorDep = Annotated[ReasonNarrator, Depends(get_narrator)]
TranscriberDep = Annotated[WhisperTranscriber, Depends(get_transcriber)]
