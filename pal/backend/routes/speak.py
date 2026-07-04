from io import BytesIO

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.tts_service import synthesise_speech

router = APIRouter()


class SpeakRequest(BaseModel):
    text: str


# Returns ElevenLabs audio bytes or signals the frontend to use browser TTS.
@router.post("/speak")
async def speak(request: SpeakRequest):
    audio = await synthesise_speech(request.text)

    if audio is None:
        return {"use_browser_tts": True}

    return StreamingResponse(BytesIO(audio), media_type="audio/mpeg")
