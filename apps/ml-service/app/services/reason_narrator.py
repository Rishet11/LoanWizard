"""LLM-narrated reason codes. Template path is the always-available safety net."""
from __future__ import annotations

import logging
import os
import re
from pathlib import Path

from jinja2 import Template

from app.schemas import (
    FormData,
    Offer,
    PersonaClassificationOutput,
    PolicyResult,
    RiskScoreOutput,
)

logger = logging.getLogger(__name__)

NARRATOR_MODE = os.getenv("REASON_NARRATOR_MODE", "template")
ENABLE_GEMMA = os.getenv("ENABLE_GEMMA", "false").lower() == "true"
ENABLE_GEMINI_FALLBACK = os.getenv("ENABLE_GEMINI_FALLBACK", "false").lower() == "true"

_TEMPLATE_SRC = """\
{% if offer.eligible -%}
Approved. \
{% if form.employment_type %}{{ form.employment_type.replace('_', ' ').title() }} income{% endif %}\
{% if form.monthly_income %} of ₹{{ '{:,.0f}'.format(form.monthly_income) }}/mo{% endif %}\
{% if cibil %} and CIBIL {{ cibil }}{% endif %}. \
Rate {{ offer.interest_rate }}% ({{ risk.risk_band }} risk\
{% if soft_flags %}, +{{ '{:.2f}'.format(rate_adj) }}% for {{ soft_flags }}{% endif %}). \
EMI ₹{{ '{:,.0f}'.format(offer.emi) }}/mo over {{ offer.tenure_months }} months.
{%- else -%}
Rejected. {{ rejection_label }}.
{%- endif %}"""

_REJECTION_LABELS = {
    "age_below_21": "Applicant must be at least 21 years old",
    "age_above_65": "Applicant must be under 65 years old",
    "no_income": "Monthly income below minimum threshold of ₹15,000",
    "loan_above_cap": "Loan amount exceeds the ₹20,00,000 cap",
    "face_missing": "Face verification failed (face present ratio < 70%)",
    "low_liveness": "Liveness check failed",
}

_BASE_RATE = {"low": 12.5, "medium": 15.0, "high": 18.5}

_MAX_CHARS = 300


class ReasonNarrator:
    def __init__(self) -> None:
        self._template = Template(_TEMPLATE_SRC)
        self._gemma = None
        self._gemini = None

    def load(self) -> None:
        if ENABLE_GEMINI_FALLBACK:
            self._load_gemini()
        if ENABLE_GEMMA:
            self._load_gemma()

    def _load_gemma(self) -> None:
        try:
            import keras_nlp  # type: ignore
            self._gemma = keras_nlp.models.GemmaCausalLM.from_preset("gemma_2b_en")
            logger.info("Gemma loaded for narration")
        except Exception as exc:
            logger.warning("Gemma load failed for narrator: %s", exc)

    def _load_gemini(self) -> None:
        try:
            import google.generativeai as genai  # type: ignore
            key = os.getenv("GEMINI_API_KEY", "")
            if key:
                genai.configure(api_key=key)
                self._gemini = genai.GenerativeModel("gemini-1.5-flash")
                logger.info("Gemini loaded for narration")
        except Exception as exc:
            logger.warning("Gemini load failed for narrator: %s", exc)

    # ---- template path ----

    def _template_narrate(
        self,
        offer: Offer,
        form: FormData,
        risk: RiskScoreOutput,
        policy: PolicyResult,
        bureau: dict,
    ) -> str:
        soft_flags = [r for r in policy.passed_rules if r in ("age_mismatch", "high_ltv", "thin_file")]
        from app.services.policy_engine import SOFT_FLAG_RATE_ADJUSTMENTS
        rate_adj = sum(SOFT_FLAG_RATE_ADJUSTMENTS.get(r, 0) for r in soft_flags)
        cibil = bureau.get("cibil_score_proxy")
        rejection_label = _REJECTION_LABELS.get(
            offer.rejection_reason or "", offer.rejection_reason or "eligibility criteria not met"
        )
        text = self._template.render(
            offer=offer,
            form=form,
            risk=risk,
            soft_flags=", ".join(soft_flags),
            rate_adj=rate_adj,
            cibil=cibil,
            rejection_label=rejection_label,
        ).strip()
        return text[:_MAX_CHARS]

    # ---- LLM path ----

    def _build_llm_prompt(self, offer: Offer, form: FormData, risk: RiskScoreOutput) -> str:
        return (
            f"You are a loan officer. Write a ≤50 word explanation for this loan decision. "
            f"Start with 'Approved' or 'Rejected'. Include at least one concrete number. "
            f"Decision data: eligible={offer.eligible}, risk_band={risk.risk_band}, "
            f"risk_score={risk.risk_score:.2f}, rate={offer.interest_rate}, "
            f"amount={offer.amount}, income={form.monthly_income}, "
            f"employment={form.employment_type}. "
            f"Respond with only the explanation, nothing else."
        )

    def _validate_narrative(self, text: str, offer: Offer) -> bool:
        if len(text) > _MAX_CHARS:
            return False
        prefix = "approved" if offer.eligible else "rejected"
        if not text.lower().startswith(prefix):
            return False
        # must contain at least one number
        if not re.search(r"\d", text):
            return False
        return True

    def _llm_narrate(self, offer: Offer, form: FormData, risk: RiskScoreOutput) -> str | None:
        if self._gemma is None and self._gemini is None:
            return None
        prompt = self._build_llm_prompt(offer, form, risk)
        raw = None
        if self._gemma is not None:
            try:
                raw = self._gemma.generate(prompt, max_length=150)
            except Exception as exc:
                logger.warning("Gemma narration failed: %s", exc)
        if raw is None and self._gemini is not None:
            try:
                resp = self._gemini.generate_content(prompt)
                raw = resp.text.strip()
            except Exception as exc:
                logger.warning("Gemini narration failed: %s", exc)
        return raw

    # ---- public ----

    def narrate(
        self,
        offer: Offer,
        form: FormData,
        risk: RiskScoreOutput,
        policy: PolicyResult,
        bureau: dict,
    ) -> str:
        if NARRATOR_MODE != "template":
            llm_text = self._llm_narrate(offer, form, risk)
            if llm_text and self._validate_narrative(llm_text, offer):
                return llm_text[:_MAX_CHARS]
        return self._template_narrate(offer, form, risk, policy, bureau)
