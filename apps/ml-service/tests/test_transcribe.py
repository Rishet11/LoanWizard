"""Tests for the /transcribe endpoint using a mocked Whisper backend (no model
download, so the suite stays fast and offline)."""
from unittest.mock import Mock

from fastapi.testclient import TestClient

from app.deps import get_transcriber
from app.main import app
from app.services.transcriber import WhisperTranscriber


def _client_with(transcriber) -> TestClient:
    app.dependency_overrides[get_transcriber] = lambda: transcriber
    return TestClient(app)


def test_transcribe_happy_path():
    mock = Mock(spec=WhisperTranscriber)
    mock.available = True
    mock.transcribe.return_value = {
        "text": "i earn eighty five thousand a month",
        "confidence": 0.91,
        "language": "en",
    }
    client = _client_with(mock)
    try:
        r = client.post(
            "/transcribe",
            files={"file": ("clip.webm", b"fake-audio-bytes", "audio/webm")},
            data={"language": "en"},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["text"].startswith("i earn")
        assert body["confidence"] == 0.91
        assert body["language"] == "en"
    finally:
        app.dependency_overrides.clear()


def test_transcribe_unavailable_returns_503():
    mock = Mock(spec=WhisperTranscriber)
    mock.available = False
    client = _client_with(mock)
    try:
        r = client.post(
            "/transcribe",
            files={"file": ("clip.webm", b"fake-audio-bytes", "audio/webm")},
            data={"language": "en"},
        )
        assert r.status_code == 503
    finally:
        app.dependency_overrides.clear()


def test_transcribe_empty_audio_returns_422():
    mock = Mock(spec=WhisperTranscriber)
    mock.available = True
    client = _client_with(mock)
    try:
        r = client.post(
            "/transcribe",
            files={"file": ("clip.webm", b"", "audio/webm")},
            data={"language": "en"},
        )
        assert r.status_code == 422
    finally:
        app.dependency_overrides.clear()
