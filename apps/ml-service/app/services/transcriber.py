"""Server-side speech-to-text, used as a fallback when the browser's Web Speech
API is unavailable or low-confidence (Safari/Firefox, noisy audio).

The Whisper model is heavy, so it is optional and lazy-loaded: the service stays
importable and the app starts fine without it. When `faster-whisper` and a model
aren't available, `available` is False and the route returns a clear 503 instead
of crashing. Enable on deploy with the `audio` extra and WHISPER_MODEL set.
"""
from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)


class WhisperTranscriber:
    def __init__(self) -> None:
        self._model = None
        self._available = False
        self._model_name = os.getenv("WHISPER_MODEL", "base")

    def load(self) -> None:
        """Best-effort load. Never raises — absence is a supported state."""
        if os.getenv("ENABLE_WHISPER", "false").lower() not in ("1", "true", "yes"):
            logger.info("Whisper transcription disabled (set ENABLE_WHISPER=true to enable)")
            return
        try:
            from faster_whisper import WhisperModel  # type: ignore

            compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
            self._model = WhisperModel(self._model_name, device="cpu", compute_type=compute_type)
            self._available = True
            logger.info("Whisper model '%s' loaded", self._model_name)
        except Exception as exc:  # ImportError or model download failure
            logger.warning("Whisper unavailable (%s) — /transcribe will return 503", exc)
            self._available = False

    @property
    def available(self) -> bool:
        return self._available

    def transcribe(self, audio_bytes: bytes, language: str = "en") -> dict:
        """Return {text, confidence, language}. Caller must check `available` first."""
        if not self._available or self._model is None:
            raise RuntimeError("Whisper transcriber is not available")

        import io

        segments, info = self._model.transcribe(
            io.BytesIO(audio_bytes), language=language or None, beam_size=1
        )
        seg_list = list(segments)
        text = " ".join(s.text.strip() for s in seg_list).strip()
        # faster-whisper exposes per-segment avg_logprob; map to a rough 0-1 confidence.
        if seg_list:
            import math

            avg_logprob = sum(s.avg_logprob for s in seg_list) / len(seg_list)
            confidence = max(0.0, min(1.0, math.exp(avg_logprob)))
        else:
            confidence = 0.0
        return {
            "text": text,
            "confidence": round(confidence, 4),
            "language": getattr(info, "language", language) or language,
        }
