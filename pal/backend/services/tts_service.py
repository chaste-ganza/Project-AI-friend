import os

import httpx

ELEVENLABS_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
VOICE_ID = "pNInz6obpgDQGcFmaJgB"


# Synthesises speech with ElevenLabs when configured, otherwise asks the frontend to use browser TTS.
async def synthesise_speech(text: str) -> bytes | None:
    api_key = os.getenv("ELEVENLABS_API_KEY")

    if not api_key:
        print("Using browser TTS")
        return None

    try:
        print("Using ElevenLabs TTS")
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                ELEVENLABS_URL.format(voice_id=VOICE_ID),
                headers={
                    "xi-api-key": api_key,
                    "Accept": "audio/mpeg",
                    "Content-Type": "application/json",
                },
                json={
                    "text": text,
                    "model_id": "eleven_monolingual_v1",
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.75,
                    },
                },
            )
            response.raise_for_status()
            return response.content
    except Exception as error:
        print(f"ElevenLabs TTS error: {error}")
        print("Using browser TTS")
        return None
