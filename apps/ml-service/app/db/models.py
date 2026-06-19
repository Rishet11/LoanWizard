from sqlalchemy import Boolean, Column, DateTime, Float, Integer, JSON, String, Text
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


class Decision(Base):
    __tablename__ = "decisions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True, nullable=False)
    tenant_id = Column(String, nullable=False, default="default")
    policy_passed = Column(Boolean, nullable=False)
    failed_rules = Column(JSON, default=list)
    risk_band = Column(String, nullable=True)
    risk_score = Column(Float, nullable=True)
    fraud_score = Column(Float, nullable=True)
    persona = Column(String, nullable=True)
    offer_amount = Column(Integer, nullable=True)
    offer_rate = Column(Float, nullable=True)
    offer_tenure = Column(Integer, nullable=True)
    offer_emi = Column(Integer, nullable=True)
    reason_codes = Column(JSON, default=list)
    reason_narrative = Column(Text, nullable=True)
    model_versions = Column(JSON, default=dict)
    decided_at = Column(DateTime, server_default=func.now())


class DecisionSnapshot(Base):
    """Full frozen input snapshot for replay."""
    __tablename__ = "decision_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    decision_id = Column(Integer, index=True, nullable=False)
    session_id = Column(String, unique=True, index=True, nullable=False)
    tenant_id = Column(String, nullable=False, default="default")
    input_snapshot = Column(JSON, nullable=False)
    output_snapshot = Column(JSON, nullable=False)
    model_versions_at_decision = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, server_default=func.now())
