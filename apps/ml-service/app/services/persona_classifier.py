"""Persona classifier: rules-first, LLM fallback (Gemma or Gemini)."""
from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Optional

from app.schemas import FormData, PersonaClassificationOutput

logger = logging.getLogger(__name__)

PERSONA_STRATEGY = os.getenv("PERSONA_STRATEGY", "rules_first")
ENABLE_GEMINI_FALLBACK = os.getenv("ENABLE_GEMINI_FALLBACK", "false").lower() == "true"

PROMPT_PATH = Path(__file__).parent.parent / "models" / "prompts" / "persona_prompt.txt"


class PersonaClassifier:
    def __init__(self) -> None:
        self._gemma = None
        self._gemini = None
        self._gemma_loaded = False

    def load(self) -> None:
        if ENABLE_GEMINI_FALLBACK:
            self._load_gemini()
        # Gemma loading is skipped by default; rules_first rarely needs it.
        # Uncomment to warm up Gemma on boot (adds ~15s startup):
        # self._load_gemma()

    def _load_gemma(self) -> None:
        try:
            import keras_nlp  # type: ignore
            self._gemma = keras_nlp.models.GemmaCausalLM.from_preset("gemma_2b_en")
            self._gemma_loaded = True
            logger.info("Gemma 2B loaded")
        except Exception as exc:
            logger.warning("Gemma failed to load (%s) — LLM persona unavailable", exc)

    def _load_gemini(self) -> None:
        try:
            import google.generativeai as genai  # type: ignore
            api_key = os.getenv("GEMINI_API_KEY", "")
            if api_key:
                genai.configure(api_key=api_key)
                self._gemini = genai.GenerativeModel("gemini-1.5-flash")
                logger.info("Gemini fallback loaded")
        except Exception as exc:
            logger.warning("Gemini failed to load (%s)", exc)

    @property
    def is_loaded(self) -> bool:
        return True  # rules path always works

    # ---- rule-based classification ----

    def _rules_classify(self, form: FormData, bureau: dict) -> Optional[PersonaClassificationOutput]:
        income = form.monthly_income or 0
        loan = form.loan_amount_requested or 0
        emp = form.employment_type or "unemployed"
        cibil = bureau.get("cibil_score_proxy", 0)
        default_h = bureau.get("default_history", False)
        has_bureau = bool(bureau.get("cibil_score_proxy"))

        if default_h or (income > 0 and loan > income * 10):
            return PersonaClassificationOutput(
                persona="risky",
                confidence=0.9,
                context_notes=["default history detected" if default_h else "loan > 10x monthly income"],
            )

        if emp == "salaried" and income >= 50_000 and cibil >= 750:
            return PersonaClassificationOutput(
                persona="salaried_prime",
                confidence=0.88,
                context_notes=["salaried employment", f"income {income}", f"CIBIL {cibil}"],
            )

        if emp in ("self_employed", "business_owner") and not has_bureau:
            return PersonaClassificationOutput(
                persona="self_employed_thin_file",
                confidence=0.82,
                context_notes=["self-employed", "no bureau history"],
            )

        if income > 0 and loan > income * 5:
            return PersonaClassificationOutput(
                persona="high_aspiration",
                confidence=0.85,
                context_notes=[f"loan {loan} > 5x income {income}"],
            )

        if emp == "salaried" and income > 0 and loan <= income:
            return PersonaClassificationOutput(
                persona="cautious_saver",
                confidence=0.80,
                context_notes=["salaried", "loan within monthly income"],
            )

        return None

    # ---- LLM classification ----

    def _llm_classify(
        self, form: FormData, transcript_snippets: list[str]
    ) -> Optional[PersonaClassificationOutput]:
        # Nothing to do if no LLM backend is wired up. Skip before touching
        # the prompt template, whose JSON examples confuse str.format().
        if self._gemma is None and self._gemini is None:
            return None

        prompt_template = PROMPT_PATH.read_text()
        form_summary = (
            f"employment={form.employment_type}, income={form.monthly_income}, "
            f"loan={form.loan_amount_requested}, age={form.declared_age}, purpose={form.purpose}"
        )
        # Use a lenient substitution that tolerates literal braces in the template
        prompt = (
            prompt_template
            .replace("{transcript_snippets}", "\n".join(transcript_snippets[:5]))
            .replace("{form_summary}", form_summary)
        )

        raw = None
        if self._gemma is not None:
            try:
                raw = self._gemma.generate(prompt, max_length=200)
            except Exception as exc:
                logger.warning("Gemma inference failed: %s", exc)

        if raw is None and self._gemini is not None:
            try:
                resp = self._gemini.generate_content(prompt)
                raw = resp.text
            except Exception as exc:
                logger.warning("Gemini inference failed: %s", exc)

        if raw is None:
            return None

        try:
            start = raw.index("{")
            end = raw.rindex("}") + 1
            data = json.loads(raw[start:end])
            valid_personas = {
                "salaried_prime", "self_employed_thin_file",
                "high_aspiration", "cautious_saver", "risky",
            }
            persona = data.get("persona", "cautious_saver")
            if persona not in valid_personas:
                persona = "cautious_saver"
            return PersonaClassificationOutput(
                persona=persona,
                confidence=float(data.get("confidence", 0.6)),
                context_notes=data.get("notes", []),
            )
        except Exception as exc:
            logger.warning("LLM response parse failed: %s | raw=%s", exc, raw[:200])
            return None

    def classify(
        self,
        form: FormData,
        bureau: dict,
        transcript_snippets: list[str] | None = None,
    ) -> PersonaClassificationOutput:
        snippets = transcript_snippets or []

        result = self._rules_classify(form, bureau)
        if result is not None:
            return result

        if PERSONA_STRATEGY != "rules_only":
            llm_result = self._llm_classify(form, snippets)
            if llm_result is not None:
                return llm_result

        # final default
        return PersonaClassificationOutput(
            persona="cautious_saver",
            confidence=0.5,
            context_notes=["no strong signal — defaulted to cautious_saver"],
        )
