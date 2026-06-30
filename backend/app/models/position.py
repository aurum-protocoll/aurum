"""Pydantic models for synthetic XAU positions, mirroring the contract's
`Position` struct (see contract/synthetic-xau/src/types.rs)."""

from pydantic import BaseModel, Field


class PositionSummary(BaseModel):
    address: str
    collateral_usd: float
    debt_xau: float
    collateral_ratio_bps: int | None = Field(
        default=None,
        description="None if the position has no debt (infinitely healthy) "
        "or has not yet been read from chain.",
    )
