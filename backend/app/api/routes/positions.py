"""Routes for reading synthetic XAU position state.

NOTE: this currently returns data from an in-memory placeholder, not a
live Soroban RPC read of the deployed contract. Wiring this up to call
`get_position_health` on the actual deployed `SyntheticXau` contract via
`stellar-sdk`'s Soroban RPC client is a concrete, well-scoped open issue
(see docs/seed-issues.md) — kept out of v0 so this API contract is
reviewable and testable without a live testnet deployment + funded
account as a prerequisite for running the test suite.
"""

from fastapi import APIRouter, HTTPException

from app.models.position import PositionSummary

router = APIRouter()

_POSITIONS: dict[str, PositionSummary] = {}


@router.get("/{address}", response_model=PositionSummary)
async def get_position(address: str) -> PositionSummary:
    position = _POSITIONS.get(address)
    if position is None:
        raise HTTPException(
            status_code=404, detail="No position found for this address"
        )
    return position


@router.post("/", response_model=PositionSummary, status_code=201)
async def upsert_position_placeholder(payload: PositionSummary) -> PositionSummary:
    """Temporary write path for local/demo use while live RPC reads are
    not yet wired up. This will be removed once positions are read
    directly from chain instead of being client-supplied."""
    _POSITIONS[payload.address] = payload
    return payload
