from datetime import datetime, timezone

import pytest

from app.models.pricing import PriceQuote, PriceSource
from app.services.oracle import aggregate_median, reconcile_with_spot


def _quote(source: PriceSource, price: float) -> PriceQuote:
    return PriceQuote(source=source, price_usd=price, as_of=datetime.now(timezone.utc).isoformat())


def test_median_aggregation_with_two_sources():
    quotes = [
        _quote(PriceSource.REFLECTOR, 2000.0),
        _quote(PriceSource.DIA, 2010.0),
    ]
    result = aggregate_median(quotes)
    assert result.median_price_usd == 2005.0


def test_median_aggregation_resistant_to_outlier():
    quotes = [
        _quote(PriceSource.REFLECTOR, 2000.0),
        _quote(PriceSource.DIA, 2005.0),
        _quote(PriceSource.SPOT_REFERENCE, 9999.0),  # bad/stale feed
    ]
    result = aggregate_median(quotes)
    # Median of [2000, 2005, 9999] is 2005 — the outlier doesn't drag
    # the result the way a mean would.
    assert result.median_price_usd == 2005.0


def test_aggregate_median_raises_on_empty_list():
    with pytest.raises(ValueError):
        aggregate_median([])


def test_reconciliation_flags_deviation_above_threshold():
    report = reconcile_with_spot(
        on_chain_price_usd=2050.0,
        spot_price_usd=2000.0,
        deviation_alert_threshold_bps=50,  # 0.5%
    )
    # (2050-2000)/2000 * 10000 = 250 bps, well above 50 bps threshold
    assert report.deviation_bps == 250.0
    assert report.deviation_exceeds_threshold is True


def test_reconciliation_does_not_flag_small_deviation():
    report = reconcile_with_spot(
        on_chain_price_usd=2001.0,
        spot_price_usd=2000.0,
        deviation_alert_threshold_bps=50,
    )
    # (2001-2000)/2000 * 10000 = 5 bps, below 50 bps threshold
    assert report.deviation_bps == 5.0
    assert report.deviation_exceeds_threshold is False


def test_reconciliation_rejects_non_positive_spot_price():
    with pytest.raises(ValueError):
        reconcile_with_spot(
            on_chain_price_usd=2000.0,
            spot_price_usd=0.0,
            deviation_alert_threshold_bps=50,
        )
