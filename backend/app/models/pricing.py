"""Pydantic models for oracle price feeds and reconciliation reports."""

from enum import Enum

from pydantic import BaseModel, Field


class PriceSource(str, Enum):
    REFLECTOR = "reflector"
    DIA = "dia"
    SPOT_REFERENCE = "spot_reference"


class TradingSession(str, Enum):
    ASIA = "asia"
    LONDON = "london"
    NEW_YORK = "new_york"
    OFF_HOURS = "off_hours"


class PriceQuote(BaseModel):
    source: PriceSource
    price_usd: float = Field(..., gt=0, description="Price of 1 XAU in USD")
    as_of: str  # ISO timestamp


class AggregatedPrice(BaseModel):
    median_price_usd: float
    quotes: list[PriceQuote]
    aggregated_at: str


class ReconciliationReport(BaseModel):
    on_chain_price_usd: float
    spot_price_usd: float
    deviation_bps: float
    deviation_exceeds_threshold: bool
    trading_session: TradingSession
    checked_at: str
