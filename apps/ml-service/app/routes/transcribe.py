"""POST /transcribe — server-side Whisper STT fallback for the browser perception
layer. Accepts a short audio clip and returns a transcript + confidence."""
from __future__ import annotations

import logging

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.deps import TranscriberDep
from app.schemas import TranscribeResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(
    transcriber: TranscriberDep,
    file: UploadFile = File(...),
    language: str = Form("en"),
) -> TranscribeResponse:
    if not transcriber.available:
        raise HTTPException(
            status_code=503,
            detail="Speech-to-text is not enabled on this server. "
            "Install the 'audio' extra and set ENABLE_WHISPER=true.",
        )
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=422, detail="Empty audio upload")
    try:
        result = transcriber.transcribe(audio_bytes, language=language)
    except Exception as exc:
        logger.warning("Transcription failed: %s", exc)
        raise HTTPException(status_code=500, detail="Transcription failed")
    return TranscribeResponse(**result)
