from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.transcribe import router as transcribe_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transcribe_router)


# Reports whether the API server is running.
@app.get("/health")
async def health():
    return {"status": "ok"}
