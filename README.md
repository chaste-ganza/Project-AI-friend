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

## Testing PAL responses

1. Start the backend: `uvicorn main:app --reload --port 8000`
2. Start the frontend: `npm run dev`
3. Open http://localhost:5173
4. Click "Start speaking"
5. Say: "Today I want to talk about the importance of uh, you know, communication in teams"
6. Click "Stop"
7. Wait for transcript to appear (~3-5 seconds)
8. Wait for PAL's reply to appear (~1-2 seconds more)
9. PAL should comment on the filler words ("uh", "you know")
10. Click "Start speaking" again and continue — PAL should remember what you said before
