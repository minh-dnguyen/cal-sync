from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import auth, users, events, calendar_sources

app = FastAPI(
    title="CalSync API",
    version="1.0.0",
    description="Calendar synchronization backend for CalSync PWA",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(events.router, prefix="/api/v1")
app.include_router(calendar_sources.router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok", "service": "calsync-api"}
