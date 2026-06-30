"""Aurum API entrypoint."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health, pricing, positions
from app.core.config import settings

app = FastAPI(
    title="Aurum API",
    description="Oracle aggregation, spot-price reconciliation, and "
    "position data for the Aurum synthetic XAU protocol on Soroban.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(pricing.router, prefix="/pricing", tags=["pricing"])
app.include_router(positions.router, prefix="/positions", tags=["positions"])


@app.get("/")
async def root() -> dict[str, str]:
    return {"service": "aurum-api", "status": "ok"}
