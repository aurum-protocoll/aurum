"""Oracle price aggregation and spot-price reconciliation.

v0 scope, stated explicitly: this module defines the aggregation math
(median across sources, deviation-vs-spot calculation) against
`PriceQuote` inputs. It does NOT yet call live Reflector/DIA contracts
or a real spot-price API — those are wired in `app/services/feeds.py`
(tracked as an open issue) which will construct the `PriceQuote` list
this module consumes. Keeping the math and the data-fetching separate
means the aggregation logic can be fully unit tested without live
network calls or API keys.
"""

from __future__ import annotations

from datetime import datetime, timezone
from statistics import median

from app.models.pricing import (
    AggregatedPrice,
    PriceQuote,
    ReconciliationReport,
)
from app.services.sessions import current_session


def aggregate_median(quotes: list[PriceQuote]) -> AggregatedPrice:
    """Computes the median price across all provided quotes.

    Median (not mean) is used deliberately: it's robust to a single
    misbehaving or stale oracle reporting an outlier price, which mean
    aggregation would not protect against.
    """
    if not quotes:
        raise ValueError("Cannot aggregate an empty list of quotes")

    prices = [q.price_usd for q in quotes]
    return AggregatedPrice(
        median_price_usd=median(prices),
        quotes=quotes,
        aggregated_at=datetime.now(timezone.utc).isoformat(),
    )


def reconcile_with_spot(
    on_chain_price_usd: float,
    spot_price_usd: float,
    deviation_alert_threshold_bps: int,
    now: datetime | None = None,
) -> ReconciliationReport:
    """Compares the aggregated on-chain price against a real spot XAUUSD
    reference and flags whether the deviation exceeds the configured
    alert threshold.
    """
    now = now or datetime.now(timezone.utc)

    if on_chain_price_usd <= 0:
        raise ValueError("on_chain_price_usd must be positive")

    if spot_price_usd <= 0:
        raise ValueError("spot_price_usd must be positive")

    deviation_bps = abs(on_chain_price_usd - spot_price_usd) / spot_price_usd * 10_000

    return ReconciliationReport(
        on_chain_price_usd=on_chain_price_usd,
        spot_price_usd=spot_price_usd,
        deviation_bps=round(deviation_bps, 2),
        deviation_exceeds_threshold=deviation_bps > deviation_alert_threshold_bps,
        trading_session=current_session(now),
        checked_at=now.isoformat(),
    )
