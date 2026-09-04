import os
from collections.abc import AsyncGenerator

import httpx

ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
ELEVENLABS_STREAM_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream"
VOICE_ID = "pNInz6obpgDQGcFmaJgB"

# eleven_flash_v2_5 is ElevenLabs' lowest-latency model as of 2025.
STREAMING_MODEL = "eleven_flash_v2_5"
BLOCKING_MODEL = "eleven_monolingual_v1"

_VOICE_SETTINGS = {"stability": 0.5, "similarity_boost": 0.75}


def _api_key() -> str | None:
    return os.getenv("ELEVENLABS_API_KEY")


def _headers(api_key: str) -> dict:
    return {
        "xi-api-key": api_key,
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
    }


# Non-streaming path — kept for /speak rollback endpoint.
async def synthesise_speech(text: str) -> bytes | None:
    api_key = _api_key()

    if not api_key:
        print("Using browser TTS")
        return None

    try:
        print("Using ElevenLabs TTS")
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                ELEVENLABS_TTS_URL.format(voice_id=VOICE_ID),
                headers=_headers(api_key),
                json={
                    "text": text,
                    "model_id": BLOCKING_MODEL,
                    "voice_settings": _VOICE_SETTINGS,
                },
            )
            response.raise_for_status()
            return response.content
    except Exception as error:
        print(f"ElevenLabs TTS error: {error}")
        print("Using browser TTS")
        return None


# Streaming path — yields raw audio bytes (MP3) as they arrive from ElevenLabs.
# Returns None from the async generator (i.e. yields nothing) if ElevenLabs is
# not configured or the request fails, signalling the caller to use browser TTS.
async def synthesise_speech_stream(text: str) -> AsyncGenerator[bytes, None] | None:
    api_key = _api_key()

    if not api_key:
        return None

    try:
        print(f"ElevenLabs streaming TTS: {text[:60]!r}...")

        async def _stream() -> AsyncGenerator[bytes, None]:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    ELEVENLABS_STREAM_URL.format(voice_id=VOICE_ID),
                    headers=_headers(api_key),
                    json={
                        "text": text,
                        "model_id": STREAMING_MODEL,
                        "voice_settings": _VOICE_SETTINGS,
                    },
                ) as response:
                    response.raise_for_status()
                    async for chunk in response.aiter_bytes(chunk_size=4096):
                        if chunk:
                            yield chunk

        return _stream()

    except Exception as error:
        print(f"ElevenLabs streaming TTS setup error: {error}")
        return None
