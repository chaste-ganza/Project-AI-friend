"""
WebSocket endpoint: /ws/converse

Frame protocol (server → client):
  JSON frames  (text):   {"type": "sentence",   "text": "..."}
                         {"type": "expression",  "value": "pleased"|"concerned"|"idle"}
                         {"type": "fallback",    "text": "<full reply>"}
                         {"type": "done"}
                         {"type": "error",       "message": "..."}
  Binary frames:         raw MP3 bytes belonging to the most-recently-announced sentence,
                         streamed as they arrive from ElevenLabs.

Client → server (on connect, single JSON message):
  {"transcript": "..."}

Ordering guarantee:
  Sentence N's audio bytes are fully flushed before sentence N+1's text frame is sent,
  so the frontend can play chunks in arrival order with no interleaving.
"""

import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from services import session_service
from services.groq_service import stream_pal_sentences
from services.tts_service import synthesise_speech_stream

router = APIRouter()

# Words that map to a named PalFace expression.
# Mirrors the keyword lists in the frontend's detectToneFromReply so the
# backend-sent "expression" frame matches what the old client-side logic did.
_PLEASED_WORDS = {"good", "great", "well done", "strong", "excellent", "nice"}
_CONCERNED_WORDS = {"watch", "careful", "too many", "filler", "slow", "avoid", "losing"}


def _detect_expression(text: str) -> str:
    lower = text.lower()
    if any(w in lower for w in _PLEASED_WORDS):
        return "pleased"
    if any(w in lower for w in _CONCERNED_WORDS):
        return "concerned"
    return "idle"


async def _send_json(ws: WebSocket, payload: dict) -> None:
    await ws.send_text(json.dumps(payload))


async def _pipe_tts_to_ws(ws: WebSocket, sentence: str) -> None:
    """Stream ElevenLabs audio bytes for *sentence* directly to the WebSocket.

    If ElevenLabs is unavailable the function returns without sending any
    binary frames; the caller is responsible for sending a 'fallback' frame
    instead.  Returns True when audio was streamed, False on fallback.
    """
    generator = await synthesise_speech_stream(sentence)
    if generator is None:
        return False

    try:
        async for chunk in generator:
            await ws.send_bytes(chunk)
        return True
    except Exception as exc:
        print(f"TTS stream error mid-send: {exc}")
        return False


@router.websocket("/ws/converse")
async def converse(ws: WebSocket) -> None:
    await ws.accept()

    try:
        # ── 1. Receive the transcript from the client ──────────────────────
        raw = await asyncio.wait_for(ws.receive_text(), timeout=10.0)
        data = json.loads(raw)
        transcript = data.get("transcript", "").strip()

        if not transcript:
            await _send_json(ws, {"type": "error", "message": "Empty transcript."})
            return

        # ── 2. Update session history (mirrors respond.py pattern exactly) ─
        session_service.add_user_turn(transcript)
        # Pass history *without* the turn we just added, same as /respond.
        history_for_llm = session_service.get_history()[:-1]

        # ── 3. Stream LLM sentences, TTS each one sequentially ─────────────
        full_reply = ""
        tts_available = True   # flips to False on first ElevenLabs failure
        fallback_triggered = False

        async for sentence, is_final in stream_pal_sentences(transcript, history_for_llm):
            if is_final:
                # Last yield carries the complete assembled reply — store it.
                full_reply = sentence
                break

            # Send sentence text to the frontend immediately so the UI can
            # update incrementally while TTS is still in-flight.
            await _send_json(ws, {"type": "sentence", "text": sentence})

            if tts_available:
                streamed = await _pipe_tts_to_ws(ws, sentence)
                if not streamed:
                    # ElevenLabs unavailable — signal browser fallback once,
                    # then stop attempting TTS for subsequent sentences.
                    tts_available = False
                    fallback_triggered = True

        # ── 4. If ElevenLabs was never available, send single fallback frame ─
        if fallback_triggered or not tts_available:
            # full_reply may be empty if the stream errored before is_final.
            # Fall back to whatever we assembled.
            await _send_json(ws, {"type": "fallback", "text": full_reply})

        # ── 5. Store PAL's reply in session history ─────────────────────────
        if full_reply:
            session_service.add_pal_turn(full_reply)

        # ── 6. Send expression frame based on full reply ────────────────────
        expression = _detect_expression(full_reply)
        await _send_json(ws, {"type": "expression", "value": expression})

        # ── 7. Signal completion ─────────────────────────────────────────────
        await _send_json(ws, {"type": "done"})

    except asyncio.TimeoutError:
        await _send_json(ws, {"type": "error", "message": "Timed out waiting for transcript."})
    except WebSocketDisconnect:
        print("Client disconnected during /ws/converse")
    except Exception as exc:
        print(f"/ws/converse unhandled error: {exc}")
        try:
            await _send_json(ws, {"type": "error", "message": "Internal server error."})
        except Exception:
            pass
