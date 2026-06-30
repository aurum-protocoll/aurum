"""Routes for price aggregation and spot reconciliation."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.config import settings
from app.models.pricing import AggregatedPrice, PriceQuote, ReconciliationReport
from app.services.oracle import aggregate_median, reconcile_with_spot

router = APIRouter()


class AggregateRequest(BaseModel):
    quotes: list[PriceQuote]


@router.post("/aggregate", response_model=AggregatedPrice)
async def aggregate_price(payload: AggregateRequest) -> AggregatedPrice:
    if not payload.quotes:
        raise HTTPException(status_code=400, detail="At least one quote is required")
    return aggregate_median(payload.quotes)


class ReconcileRequest(BaseModel):
    on_chain_price_usd: float
    spot_price_usd: float


@router.post("/reconcile", response_model=ReconciliationReport)
async def reconcile_price(payload: ReconcileRequest) -> ReconciliationReport:
    try:
        return reconcile_with_spot(
            on_chain_price_usd=payload.on_chain_price_usd,
            spot_price_usd=payload.spot_price_usd,
            deviation_alert_threshold_bps=settings.DEVIATION_ALERT_THRESHOLD_BPS,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
