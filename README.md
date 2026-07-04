This is a project of a chatbot with a UI that make the chatbot feel real and comfortable to chat with. 
This is a project that was inspired by pal from mitchells vs the machines movie. 
The UI is not very far from the one of pal from the movie and that is the best part because users can talk with the chatbot while observing its reactions.

## Run PAL voice transcription

Prerequisite: local Whisper needs `ffmpeg` installed and available on PATH.

Backend:

From the `pal` directory:

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

Frontend (separate terminal):

```bash
cd frontend
npm run dev
```

Test the backend is alive:

Open http://localhost:8000/health in the browser.
Should return: `{"status": "ok"}`

Test transcription works:

Open http://localhost:5173
Click "Start speaking", speak for a few seconds, click "Stop"
The transcript should appear below the button within ~5 seconds
