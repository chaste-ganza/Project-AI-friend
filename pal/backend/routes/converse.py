"""
WebSocket endpoint: /ws/converse

═══════════════════════════════════════════════════════════════════
 FRAME PROTOCOL  (server → client)
═══════════════════════════════════════════════════════════════════
  JSON text frames:
    {"type": "sentence",    "text": "..."}
    {"type": "expression",  "value": "pleased"|"concerned"|"idle"}
    {"type": "fallback",    "text": "<full reply>"}
    {"type": "done"}
    {"type": "error",       "message": "..."}
  Binary frames:
    Raw MP3 bytes for the most-recently announced sentence,
    streamed as they arrive from ElevenLabs.

═══════════════════════════════════════════════════════════════════
 FRAME PROTOCOL  (client → server)  — TWO SUPPORTED PATHS
═══════════════════════════════════════════════════════════════════

  PATH A — Phase 1 / manual / REST-fallback (unchanged):
    Single JSON text frame on connect:
      {"transcript": "..."}
    Backend runs Phase-1 Groq→TTS pipeline immediately.

  PATH B — Phase 2 / VAD auto-turn:
    1. Zero or more binary frames — raw Int16 PCM audio at 16 kHz mono,
       streamed frame-by-frame from the VAD's onFrameProcessed callback.
    2. One JSON text frame signalling end-of-turn:
       {"type": "end_of_turn"}
    Backend wraps the PCM chunks in a WAV container, runs Whisper on it,
    then proceeds with the same Phase-1 pipeline.

═══════════════════════════════════════════════════════════════════
 ORDERING GUARANTEE
═══════════════════════════════════════════════════════════════════
  Sentence N's audio bytes are fully flushed before sentence N+1's
  text frame is sent, so the frontend plays chunks in order.
"""

import asyncio
import io
import json
import struct
import wave

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from services import session_service
from services.groq_service import stream_pal_sentences
from services.tts_service import synthesise_speech_stream
from routes.transcribe import model as whisper_model   # reuse loaded model

router = APIRouter()

# ── Expression keyword sets (mirrors frontend palExpressions.js) ────────────
_PLEASED_WORDS   = {"good", "great", "well done", "strong", "excellent", "nice"}
_CONCERNED_WORDS = {"watch", "careful", "too many", "filler", "slow", "avoid", "losing"}

# ── Minimum audio size before we bother running Whisper ─────────────────────
# Float32 @ 16 kHz: 0.3 s ≈ 4 800 samples ≈ 19 200 bytes of raw PCM.
# VAD already filters short noises client-side; this is a server-side safety net.
_MIN_AUDIO_BYTES = 8_000


def _detect_expression(text: str) -> str:
    lower = text.lower()
    if any(w in lower for w in _PLEASED_WORDS):
        return "pleased"
    if any(w in lower for w in _CONCERNED_WORDS):
        return "concerned"
    return "idle"


async def _send_json(ws: WebSocket, payload: dict) -> None:
    await ws.send_text(json.dumps(payload))


async def _pipe_tts_to_ws(ws: WebSocket, sentence: str) -> bool:
    """Stream ElevenLabs MP3 bytes for *sentence* to the WebSocket.

    Returns True if audio was sent, False if ElevenLabs was unavailable
    (caller should send a 'fallback' frame instead).
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


def _pcm_to_wav(raw_pcm: bytes, sample_rate: int = 16_000, n_channels: int = 1,
                sampwidth: int = 2) -> bytes:
    """Wrap raw PCM bytes in a WAV container so Whisper can read them."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(n_channels)
        wf.setsampwidth(sampwidth)
        wf.setframerate(sample_rate)
        wf.writeframes(raw_pcm)
    return buf.getvalue()


async def _run_pipeline(ws: WebSocket, transcript: str, isMuted: bool = False) -> None:
    """Shared Phase-1 pipeline: Groq stream → TTS → send frames."""
    session_service.add_user_turn(transcript)
    history_for_llm = session_service.get_history()[:-1]

    full_reply = ""
    tts_available = True
    fallback_triggered = False

    async for sentence, is_final in stream_pal_sentences(transcript, history_for_llm):
        if is_final:
            full_reply = sentence
            break

        await _send_json(ws, {"type": "sentence", "text": sentence})

        if tts_available:
            streamed = await _pipe_tts_to_ws(ws, sentence)
            if not streamed:
                tts_available = False
                fallback_triggered = True

    if fallback_triggered or not tts_available:
        await _send_json(ws, {"type": "fallback", "text": full_reply})

    if full_reply:
        session_service.add_pal_turn(full_reply)

    await _send_json(ws, {"type": "expression", "value": _detect_expression(full_reply)})
    await _send_json(ws, {"type": "done"})


@router.websocket("/ws/converse")
async def converse(ws: WebSocket) -> None:
    await ws.accept()

    try:
        # ── Peek at the first frame to decide which path we're on ────────────
        first = await asyncio.wait_for(ws.receive(), timeout=15.0)

        # ── PATH A: first frame is text → must be {"transcript": "..."} ─────
        if "text" in first:
            data = json.loads(first["text"])

            # Gracefully handle a stray end_of_turn with no preceding audio.
            if data.get("type") == "end_of_turn":
                await _send_json(ws, {"type": "error", "message": "No audio received before end_of_turn."})
                return

            transcript = data.get("transcript", "").strip()
            if not transcript:
                await _send_json(ws, {"type": "error", "message": "Empty transcript."})
                return

            await _run_pipeline(ws, transcript)
            return

        # ── PATH B: first frame is binary → VAD audio streaming ─────────────
        audio_chunks: list[bytes] = []

        if first.get("bytes"):
            audio_chunks.append(first["bytes"])

        # Collect further frames until end_of_turn text frame arrives.
        while True:
            frame = await asyncio.wait_for(ws.receive(), timeout=30.0)

            if "bytes" in frame and frame["bytes"]:
                audio_chunks.append(frame["bytes"])
                continue

            if "text" in frame:
                msg = json.loads(frame["text"])
                if msg.get("type") == "end_of_turn":
                    break
                # Any other text frame here is unexpected — ignore and keep buffering.

        # ── Validate buffered audio ──────────────────────────────────────────
        total_bytes = sum(len(c) for c in audio_chunks)
        if total_bytes < _MIN_AUDIO_BYTES:
            print(f"/ws/converse: audio too short ({total_bytes} B), skipping transcription.")
            await _send_json(ws, {"type": "done"})
            return

        # ── Transcribe with Whisper ──────────────────────────────────────────
        # The frontend streams raw Int16 PCM frames at 16 kHz mono.
        # Wrap in a WAV container before passing to Whisper/ffmpeg.
        raw_pcm = b"".join(audio_chunks)
        wav_bytes = _pcm_to_wav(raw_pcm, sample_rate=16_000, n_channels=1, sampwidth=2)

        # Run Whisper in a thread so we don't block the event loop.
        loop = asyncio.get_event_loop()
        import tempfile, os
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(wav_bytes)
            tmp_path = tmp.name

        try:
            result = await loop.run_in_executor(
                None, lambda: whisper_model.transcribe(tmp_path)
            )
            transcript = result.get("text", "").strip()
        finally:
            os.unlink(tmp_path)

        if not transcript:
            print("/ws/converse: Whisper returned empty transcript, skipping.")
            await _send_json(ws, {"type": "done"})
            return

        print(f"/ws/converse VAD transcript: {transcript!r}")
        await _run_pipeline(ws, transcript)

    except asyncio.TimeoutError:
        await _send_json(ws, {"type": "error", "message": "Timed out waiting for audio/transcript."})
    except WebSocketDisconnect:
        print("Client disconnected during /ws/converse")
    except Exception as exc:
        print(f"/ws/converse unhandled error: {exc}")
        try:
            await _send_json(ws, {"type": "error", "message": "Internal server error."})
        except Exception:
            pass
