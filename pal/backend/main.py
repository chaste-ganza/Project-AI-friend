from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routes.respond import router as respond_router
from routes.speak import router as speak_router
from routes.transcribe import router as transcribe_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transcribe_router)
app.include_router(respond_router)
app.include_router(speak_router)


# Reports whether the API server is running.
@app.get("/health")
async def health():
    return {"status": "ok"}
