from pathlib import Path
from uuid import uuid4

import whisper
from fastapi import APIRouter, UploadFile

router = APIRouter()
TMP_DIR = Path(__file__).resolve().parent.parent / "tmp"
TMP_DIR.mkdir(exist_ok=True)
model = whisper.load_model("base")


# Saves uploaded audio, runs local Whisper, and returns the transcript.
@router.post("/transcribe")
async def transcribe_audio(file: UploadFile):
    temp_path = TMP_DIR / f"{uuid4()}.webm"

    try:
        content = await file.read()
        temp_path.write_bytes(content)
        result = model.transcribe(str(temp_path))
        return {"transcript": result.get("text", "").strip()}
    finally:
        if temp_path.exists():
            temp_path.unlink()
