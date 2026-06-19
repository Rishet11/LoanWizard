"""Pydantic mirrors of @loan-wizard/contracts TypeScript types — v4 extended."""
from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


# ---- primitives ----

EmploymentType = Literal["salaried", "self_employed", "business_owner", "unemployed", "retired"]
RiskBand = Literal["low", "medium", "high"]
PersonaType = Literal[
    "salaried_prime", "self_employed_thin_file", "high_aspiration", "cautious_saver", "risky"
]


class FormData(BaseModel):
    name: Optional[str] = None
    employment_type: Optional[EmploymentType] = None
    monthly_income: Optional[float] = None
    loan_amount_requested: Optional[float] = None
    purpose: Optional[str] = None
    declared_age: Optional[int] = None


class CVSignalsSummary(BaseModel):
    avg_age_estimate: Optional[float] = None
    avg_liveness: float
    min_liveness: float
    face_present_ratio: float
    texture_score_avg: float = 0.85


class GeoPoint(BaseModel):
    lat: float
    lng: float


class BureauData(BaseModel):
    cibil_score_proxy: int
    existing_loans: int
    default_history: bool


class DeviceFingerprint(BaseModel):
    ua: str = ""
    canvas_hash: str = ""
    timezone: str = ""
    session_age_sec: float = 120.0
    form_mutations: int = 3
    transcript_length: int = 500
    canvas_hash_cohort_size: int = 1


# ---- request / response types ----

class OfferRequest(BaseModel):
    session_id: str
    tenant_id: str = "default"
    form_data: FormData
    cv_signals_summary: CVSignalsSummary
    geo: Optional[GeoPoint] = None
    transcript_snippets: list[str] = Field(default_factory=list)
    device_fingerprint: Optional[DeviceFingerprint] = None


class ReasonCode(BaseModel):
    code: str
    label: str
    weight: float


class ModelVersions(BaseModel):
    model_config = {"protected_namespaces": ()}

    risk: str = "1.2.0"
    fraud: str = "0.1.0"
    persona_rules: str = "1.0.0"


class Offer(BaseModel):
    model_config = {"protected_namespaces": ()}

    session_id: str
    eligible: bool
    amount: Optional[int] = None
    interest_rate: Optional[float] = None
    tenure_months: Optional[int] = None
    emi: Optional[int] = None
    risk_band: RiskBand
    persona: str
    reason_codes: list[ReasonCode]
    rejection_reason: Optional[str] = None
    generated_at: str
    # v4 additions
    fraud_score: Optional[float] = None
    reason_narrative: Optional[str] = None
    model_versions: Optional[ModelVersions] = None


class RiskScoreOutput(BaseModel):
    risk_band: RiskBand
    risk_score: float = Field(ge=0.0, le=1.0)
    feature_importance: dict[str, float]


class FraudScoreOutput(BaseModel):
    fraud_score: float = Field(ge=0.0, le=1.0)
    fraud_signals: list[str]


class PersonaClassificationOutput(BaseModel):
    persona: PersonaType
    confidence: float = Field(ge=0.0, le=1.0)
    context_notes: list[str]


class PolicyResult(BaseModel):
    passed: bool
    failed_rules: list[str]
    passed_rules: list[str]


# ---- bureau v4 ----

class BureauResult(BaseModel):
    bureau: str
    credit_score: int
    existing_loans: int
    default_history: bool
    thin_file: bool
    raw: dict[str, Any] = Field(default_factory=dict)


# ---- debug / misc ----

class DebugPersonaRequest(BaseModel):
    transcript_snippets: list[str]
    form_data: FormData


class HealthResponse(BaseModel):
    status: str
    models_loaded: dict[str, bool]


# ---- replay ----

class ReplayOverrides(BaseModel):
    form_data: Optional[dict[str, Any]] = None
    cv_signals_summary: Optional[dict[str, Any]] = None
    device_fingerprint: Optional[dict[str, Any]] = None


class ReplayRequest(BaseModel):
    overrides: ReplayOverrides = Field(default_factory=ReplayOverrides)


class DiffEntry(BaseModel):
    field: str
    from_: Any = Field(alias="from")
    to: Any

    model_config = {"populate_by_name": True}


class ReplayResponse(BaseModel):
    original: dict[str, Any]
    replayed: dict[str, Any]
    diff: list[DiffEntry]


# ---- model registry ----

class ModelInfo(BaseModel):
    version: str
    loaded_at: str
    backend: str


class ModelsResponse(BaseModel):
    risk: ModelInfo
    fraud: ModelInfo
    persona: ModelInfo


# ---- drift ----

class DriftStats(BaseModel):
    feature: str
    n: int
    mean: float
    std: float
    p50: float
    p99: float


class DriftBaseline(BaseModel):
    feature: str
    n: int
    mean: float
    std: float
    p50: float
    p99: float
    source: str = "training"


# ---- fairness ----

class FairnessReport(BaseModel):
    by_employment: dict[str, float]
    by_age_bucket: dict[str, float]
    disparate_impact_ratio: float
