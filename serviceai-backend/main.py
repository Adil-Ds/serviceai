import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from app.api.streaming import router as streaming_router
from app.api.caller_routes import router as caller_router
from app.database.db import init_db

app = FastAPI(
    title="ServiceAI Backend",
    description="Agentic Service Provider Matching & Booking API — powered by Groq (llama-3.3-70b-versatile)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(streaming_router)
app.include_router(caller_router)


@app.on_event("startup")  # noqa: deprecated in FastAPI 0.95+ but still works
async def startup():
    init_db()


@app.get("/")
async def root():
    return {
        "project": "ServiceAI",
        "challenge": "Challenge 2 — Service Provider Matching & Agentic Booking",
        "hackathon": "Google Antigravity — Al Seekho Phase II",
        "status": "running",
        "docs": "/docs",
        "endpoints": {
            "parse_intent": "POST /api/parse-intent",
            "search": "POST /api/search-providers",
            "rank": "POST /api/rank-providers",
            "book": "POST /api/book",
            "followups": "POST /api/schedule-followups",
            "full_pipeline": "POST /api/analyze",
            "providers": "GET /api/providers",
            "bookings": "GET /api/bookings",
        }
    }


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "architecture": "real-agentic",
        "orchestration": "groq-function-calling",
        "model": "llama-3.3-70b-versatile",
        "registered_tools": ["parse_intent", "search_providers", "rank_providers", "ask_clarification"],
        "pipeline": "dynamic — Groq decides tool order and retries",
    }
