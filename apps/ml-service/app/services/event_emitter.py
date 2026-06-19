"""Event emitter to Redis Streams. Falls back to stdout if Redis unavailable."""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

EVENT_STREAM_URL = os.getenv("EVENT_STREAM_URL", "")

_redis_client = None


def _get_redis():
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    if not EVENT_STREAM_URL:
        return None
    try:
        import redis  # type: ignore
        _redis_client = redis.from_url(EVENT_STREAM_URL, decode_responses=True, socket_connect_timeout=2)
        _redis_client.ping()
        logger.info("Redis event bus connected at %s", EVENT_STREAM_URL)
    except Exception as exc:
        logger.warning("Redis unavailable (%s) — events go to stdout only", exc)
        _redis_client = None
    return _redis_client


def emit(stream: str, payload: dict[str, Any]) -> None:
    """Fire-and-forget. Never raises."""
    try:
        payload["_emitted_at"] = datetime.now(timezone.utc).isoformat()
        client = _get_redis()
        if client is not None:
            # Redis XADD requires str values
            flat = {k: json.dumps(v) if not isinstance(v, str) else v for k, v in payload.items()}
            client.xadd(stream, flat, maxlen=10_000, approximate=True)
        else:
            logger.info("EVENT[%s] %s", stream, json.dumps(payload, default=str)[:400])
    except Exception as exc:
        logger.warning("Event emit to %s failed: %s", stream, exc)


def emit_decision(session_id: str, tenant_id: str, request_dict: dict, offer_dict: dict, model_versions: dict) -> None:
    emit("decisions", {
        "session_id": session_id,
        "tenant_id": tenant_id,
        "request": request_dict,
        "offer": offer_dict,
        "model_versions": model_versions,
    })


def emit_fraud_alert(session_id: str, fraud_score: float, signals: list[str]) -> None:
    if fraud_score > 0.7:
        emit("frauds", {"session_id": session_id, "fraud_score": fraud_score, "signals": signals})
