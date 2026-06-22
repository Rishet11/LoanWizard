"""POST /offer — the single endpoint Stream C calls. v4 extended."""
from __future__ import annotations

import logging

from fastapi import APIRouter
from sqlalchemy.orm import Session

from app.db.models import Decision, DecisionSnapshot
from app.deps import (
    BureauDep,
    DbDep,
    FraudScorerDep,
    NarratorDep,
    OfferBuilderDep,
    PersonaDep,
    PolicyDep,
    RiskScorerDep,
)
from app.routes.debug import _infer_geo_tier
from app.schemas import ModelVersions, Offer, OfferRequest
from app.services import event_emitter
from app.services.drift_tracker import get_tracker
from app.services.model_registry import get_registry

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/offer", response_model=Offer)
def create_offer(
    req: OfferRequest,
    risk_scorer: RiskScorerDep,
    policy_engine: PolicyDep,
    persona_clf: PersonaDep,
    offer_builder: OfferBuilderDep,
    fraud_scorer: FraudScorerDep,
    narrator: NarratorDep,
    bureau: BureauDep,
    db: DbDep,
) -> Offer:
    bureau_data = bureau.get(req.form_data.name or "unknown")
    geo_tier = _infer_geo_tier(req)

    policy_result = policy_engine.evaluate(req.form_data, req.cv_signals_summary, bureau_data)
    risk_output = risk_scorer.score(req.form_data, req.cv_signals_summary, bureau_data, geo_tier)
    persona_output = persona_clf.classify(req.form_data, bureau_data, req.transcript_snippets)
    fraud_output = fraud_scorer.score(req.form_data, req.cv_signals_summary, req.device_fingerprint, geo_tier)

    versions_dict = get_registry().versions()
    model_versions = ModelVersions(
        risk=versions_dict.get("risk", "1.2.0"),
        fraud=versions_dict.get("fraud", "0.1.0"),
        persona_rules=versions_dict.get("persona", "1.0.0"),
    )

    offer = offer_builder.build(
        session_id=req.session_id,
        form=req.form_data,
        policy=policy_result,
        risk=risk_output,
        persona=persona_output,
        fraud=fraud_output,
        model_versions=model_versions,
    )

    # Narration (always set, template fallback guaranteed)
    offer.reason_narrative = narrator.narrate(offer, req.form_data, risk_output, policy_result, bureau_data)

    # Drift tracking
    try:
        tracker = get_tracker()
        tracker.push({
            "monthly_income": req.form_data.monthly_income or 0,
            "loan_amount_requested": req.form_data.loan_amount_requested or 0,
            "avg_liveness": req.cv_signals_summary.avg_liveness,
            "fraud_score": fraud_output.fraud_score,
            "risk_score": risk_output.risk_score,
        })
    except Exception as exc:
        logger.warning("Drift tracking failed for session %s: %s", req.session_id, exc)

    # Events (non-blocking)
    try:
        event_emitter.emit_decision(
            req.session_id, req.tenant_id,
            req.model_dump(), offer.model_dump(), model_versions.model_dump(),
        )
        event_emitter.emit_fraud_alert(req.session_id, fraud_output.fraud_score, fraud_output.fraud_signals)
    except Exception as exc:
        logger.warning("Event emit failed for session %s: %s", req.session_id, exc)

    decision_id = _audit(db, req, policy_result, risk_output, persona_output, fraud_output, offer, model_versions)
    _save_snapshot(db, decision_id, req, offer, policy_result.passed)

    return offer


def _audit(db: Session, req: OfferRequest, policy, risk, persona, fraud, offer: Offer, versions: ModelVersions) -> int:
    try:
        record = Decision(
            session_id=req.session_id,
            tenant_id=req.tenant_id,
            policy_passed=policy.passed,
            failed_rules=policy.failed_rules,
            risk_band=risk.risk_band,
            risk_score=risk.risk_score,
            fraud_score=fraud.fraud_score,
            persona=persona.persona,
            offer_amount=offer.amount,
            offer_rate=offer.interest_rate,
            offer_tenure=offer.tenure_months,
            offer_emi=offer.emi,
            reason_codes=[rc.model_dump() for rc in offer.reason_codes],
            reason_narrative=offer.reason_narrative,
            model_versions=versions.model_dump(),
        )
        existing = db.query(Decision).filter(Decision.session_id == req.session_id).first()
        if existing:
            db.delete(existing)
            db.flush()
        db.add(record)
        db.commit()
        db.refresh(record)
        return record.id
    except Exception as exc:
        logger.warning("Audit write failed for session %s: %s", req.session_id, exc)
        db.rollback()
        return -1


def _save_snapshot(db: Session, decision_id: int, req: OfferRequest, offer: Offer, policy_passed: bool) -> None:
    if decision_id < 0:
        return
    try:
        snap = DecisionSnapshot(
            decision_id=decision_id,
            session_id=req.session_id,
            tenant_id=req.tenant_id,
            input_snapshot=req.model_dump(),
            output_snapshot={
                "offer": offer.model_dump(),
                "risk_band": offer.risk_band,
                "eligible": offer.eligible,
                "policy_passed": policy_passed,
            },
            model_versions_at_decision=offer.model_versions.model_dump() if offer.model_versions else {},
        )
        existing = db.query(DecisionSnapshot).filter(DecisionSnapshot.session_id == req.session_id).first()
        if existing:
            db.delete(existing)
            db.flush()
        db.add(snap)
        db.commit()
    except Exception as exc:
        logger.warning("Snapshot write failed for session %s: %s", req.session_id, exc)
        db.rollback()
