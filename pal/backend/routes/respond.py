from fastapi import APIRouter
from pydantic import BaseModel

from services import session_service
from services.groq_service import get_pal_response

router = APIRouter()


class RespondRequest(BaseModel):
    transcript: str


# Generates PAL's response from a transcript and stores both turns in memory.
@router.post("/respond")
async def respond(request: RespondRequest):
    session_service.add_user_turn(request.transcript)
    previous_history = session_service.get_history()[:-1]
    reply = await get_pal_response(request.transcript, previous_history)
    session_service.add_pal_turn(reply)
    return {"reply": reply}


# Clears the current in-memory PAL practice session.
@router.post("/session/reset")
async def reset_session():
    session_service.clear_session()
    return {"status": "session cleared"}
