"""
Reference FastAPI app with CORS configured for browser preflight (OPTIONS).

Merge this pattern into your Railway backend: register CORSMiddleware as early as
possible so OPTIONS /auth/register returns 200 + CORS headers instead of 405.

Multi-car lead links (`car_ids` + `car_id`): see `lead_car_ids_reference.py` for
normalize/serialize helpers to paste into your real lead CRUD (this stub has no DB).

Run locally:  uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


def _parse_cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "")
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    if origins:
        return origins
    # Sensible local defaults if env is unset (do not rely on this in production).
    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
    ]


app = FastAPI()

# Must be added before routes so OPTIONS preflight is handled by Starlette CORS
# instead of falling through to the router (which only has POST → 405).
app.add_middleware(
    CORSMiddleware,
    allow_origins=_parse_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "automia-api", "docs": "/docs"}


# Example only — replace with your real auth router / DB logic.
@app.post("/auth/register")
def register_stub() -> dict[str, str]:
    return {"detail": "Replace with your real register handler"}
