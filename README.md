# PAL — Voice AI Speech Coach

PAL is a voice-driven AI speech coach with an animated face inspired by PAL from *The Mitchells vs. the Machines*. Speak into the mic, and PAL transcribes your words, coaches you on delivery, and talks back.

---

## Prerequisites

- Python 3.10+
- Node.js 18+
- [ffmpeg](https://ffmpeg.org/download.html) installed and on your PATH (required by Whisper for audio decoding)

---

## Setup

### 1. Clone and configure environment variables

Copy the example env file and fill in your API keys:

```bash
cp pal/.env.example pal/.env
```

Open `pal/.env` and set:

```
GROQ_API_KEY=your_groq_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here   # optional — browser TTS is used as fallback
```

### 2. Backend

```bash
cd pal/backend
```

Create and activate a virtual environment:

```bash
# Windows (PowerShell)
python -m venv venv
.\venv\Scripts\Activate.ps1

# macOS / Linux
python -m venv venv
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the server:

```bash
uvicorn main:app --reload --port 8000
```

### 3. Frontend (separate terminal)

```bash
cd pal/frontend
npm install
npm run dev
```

By default the frontend expects the backend at `http://localhost:8000`. If you run the backend on a different port or host, set the `VITE_BACKEND_URL` variable before starting:

```bash
# Windows (PowerShell)
$env:VITE_BACKEND_URL = "http://192.168.1.10:8000"
npm run dev

# macOS / Linux
VITE_BACKEND_URL=http://192.168.1.10:8000 npm run dev
```

---

## Verify the backend is running

Open http://localhost:8000/health — should return:

```json
{"status": "ok"}
```

---

## Testing transcription

1. Open http://localhost:5173
2. Click **Start speaking**, speak for a few seconds, click **Stop**
3. The transcript should appear within ~5 seconds

## Testing PAL responses

1. Open http://localhost:5173
2. Click **Start speaking**
3. Say: *"Today I want to talk about the importance of uh, you know, communication in teams"*
4. Click **Stop**
5. Wait for the transcript (~3–5 s) then PAL's reply (~1–2 s more)
6. PAL should comment on the filler words ("uh", "you know")
7. Click **Start speaking** again — PAL should remember the earlier exchange

## Testing TTS

**Browser voice (no ElevenLabs key needed)**

1. Start backend and frontend as normal
2. Speak into the mic and stop recording
3. PAL should speak its reply automatically
4. The mic button should be disabled while PAL speaks, then re-enable

**ElevenLabs voice**

1. Add your `ELEVENLABS_API_KEY` to `pal/.env`
2. Restart the backend
3. Repeat the test above — PAL's voice should sound more natural
4. The Python console should log `Using ElevenLabs TTS`

**Fallback**

1. Set `ELEVENLABS_API_KEY` to an invalid value in `pal/.env`
2. Restart the backend
3. PAL should still speak using browser TTS — no browser console errors
