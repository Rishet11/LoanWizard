"""POST /decisions/{id}/replay — re-run pipeline on frozen snapshot with overrides."""
from __future__ import annotations

import copy
import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session

from app.db.models import DecisionSnapshot
from app.deps import (
    DbDep,
    OfferBuilderDep,
    PersonaDep,
    PolicyDep,
    BureauDep,
)
from app.services.model_loader import risk_scorer_for_version
from app.services.risk_scorer import VERSION as RISK_VERSION
from app.routes.debug import _infer_geo_tier
from app.schemas import (
    CVSignalsSummary,
    DeviceFingerprint,
    DiffEntry,
    FormData,
    GeoPoint,
    OfferRequest,
    ReplayRequest,
    ReplayResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/decisions")


def _deep_merge(base: dict, overrides: dict) -> dict:
    result = copy.deepcopy(base)
    for k, v in overrides.items():
        if isinstance(v, dict) and isinstance(result.get(k), dict):
            result[k] = _deep_merge(result[k], v)
        else:
            result[k] = v
    return result


def _compute_diff(original: dict, replayed: dict) -> list[DiffEntry]:
    diffs = []
    keys = set(original.keys()) | set(replayed.keys())
    for k in sorted(keys):
        ov = original.get(k)
        rv = replayed.get(k)
        if ov != rv:
            diffs.append(DiffEntry(**{"from": ov, "to": rv, "field": k}))
    return diffs


def _run_pipeline(
    req: OfferRequest,
    risk_scorer, policy_engine, persona_clf, offer_builder, bureau,
) -> dict:
    bureau_data = bureau.get(req.form_data.name or "unknown")
    geo_tier = _infer_geo_tier(req)
    policy = policy_engine.evaluate(req.form_data, req.cv_signals_summary, bureau_data)
    risk = risk_scorer.score(req.form_data, req.cv_signals_summary, bureau_data, geo_tier)
    persona = persona_clf.classify(req.form_data, bureau_data, req.transcript_snippets)
    offer = offer_builder.build(
        session_id=req.session_id, form=req.form_data,
        policy=policy, risk=risk, persona=persona,
    )
    return {
        "offer": offer.model_dump(),
        "risk_band": risk.risk_band,
        "risk_score": risk.risk_score,
        "eligible": offer.eligible,
        "policy_passed": policy.passed,
        "failed_rules": policy.failed_rules,
    }


@router.post("/{decision_id}/replay", response_model=ReplayResponse)
def replay_decision(
    decision_id: int,
    body: ReplayRequest,
    db: DbDep,
    policy_engine: PolicyDep,
    persona_clf: PersonaDep,
    offer_builder: OfferBuilderDep,
    bureau: BureauDep,
) -> ReplayResponse:
    snap = db.query(DecisionSnapshot).filter(DecisionSnapshot.decision_id == decision_id).first()
    if not snap:
        raise HTTPException(status_code=404, detail=f"Decision {decision_id} not found")

    frozen = snap.input_snapshot
    overrides_dict: dict[str, Any] = {}
    if body.overrides.form_data:
        overrides_dict["form_data"] = body.overrides.form_data
    if body.overrides.cv_signals_summary:
        overrides_dict["cv_signals_summary"] = body.overrides.cv_signals_summary
    if body.overrides.device_fingerprint:
        overrides_dict["device_fingerprint"] = body.overrides.device_fingerprint

    merged = _deep_merge(frozen, overrides_dict)

    def _build_req(data: dict) -> OfferRequest:
        return OfferRequest(
            session_id=data.get("session_id", "replay"),
            tenant_id=data.get("tenant_id", "default"),
            form_data=FormData(**data.get("form_data", {})),
            cv_signals_summary=CVSignalsSummary(**data.get("cv_signals_summary", {})),
            geo=GeoPoint(**data["geo"]) if data.get("geo") else None,
            transcript_snippets=data.get("transcript_snippets", []),
            device_fingerprint=DeviceFingerprint(**data["device_fingerprint"]) if data.get("device_fingerprint") else None,
        )

    original_req = _build_req(frozen)
    replayed_req = _build_req(merged)

    # Replay on the EXACT risk model version that produced the decision, falling
    # back to the current production model (flagged) if it isn't archived.
    recorded_versions = snap.model_versions_at_decision or {}
    recorded_risk_version = recorded_versions.get("risk")
    versioned_scorer, exact_model_match = risk_scorer_for_version(recorded_risk_version)
    model_version_used = recorded_risk_version if exact_model_match else RISK_VERSION

    original_result = snap.output_snapshot
    replayed_result = _run_pipeline(replayed_req, versioned_scorer, policy_engine, persona_clf, offer_builder, bureau)

    diff = _compute_diff(
        {k: v for k, v in original_result.get("offer", {}).items() if k not in ("generated_at", "reason_codes")},
        {k: v for k, v in replayed_result.get("offer", {}).items() if k not in ("generated_at", "reason_codes")},
    )

    return ReplayResponse(
        original=original_result,
        replayed=replayed_result,
        diff=diff,
        model_version_used=model_version_used,
        exact_model_match=exact_model_match,
    )
