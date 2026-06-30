"""Trading session detection.

Gold (XAU), like forex pairs, trades around the clock but has
materially different volatility and liquidity characteristics
depending on which major session is active. This module exists because
the Aurum dashboard wants to show *why* a price deviation might be
happening — e.g. "this spread widened because we're in the London/NY
overlap, the most liquid and volatile window" — rather than presenting
deviation as context-free noise.

Session windows are in UTC. Approximate and deliberately simple (no
DST handling yet — see open issue) but directionally correct for the
purpose of dashboard context, not for precise settlement timing.
"""

from datetime import datetime, time, timedelta, timezone

from app.models.pricing import TradingSession

# UTC windows. These are approximate "core hours" rather than exact
# exchange open/close times, deliberately simplified for v0.
_ASIA_START = time(0, 0)
_ASIA_END = time(8, 0)
_LONDON_START = time(7, 0)
_LONDON_END = time(16, 0)
_NEW_YORK_START = time(12, 0)
_NEW_YORK_END = time(21, 0)


def current_session(now: datetime | None = None) -> TradingSession:
    """Returns the active trading session for a given UTC timestamp.

    When multiple sessions overlap (e.g. London/New York between
    12:00-16:00 UTC, historically the most liquid and volatile window
    for gold), this returns NEW_YORK as the dominant session — this is
    a simplification; a future improvement could return a list of
    overlapping sessions instead of a single value (see open issues).
    """
    now = now or datetime.now(timezone.utc)
    t = now.time()

    if _NEW_YORK_START <= t < _NEW_YORK_END:
        return TradingSession.NEW_YORK
    if _LONDON_START <= t < _LONDON_END:
        return TradingSession.LONDON
    if _ASIA_START <= t < _ASIA_END:
        return TradingSession.ASIA
    return TradingSession.OFF_HOURS


_WAT = timezone(timedelta(hours=1))


def to_wat(now: datetime | None = None) -> datetime:
    """Converts a timestamp to West Africa Time (UTC+1, no DST)."""
    now = now or datetime.now(timezone.utc)
    return now.astimezone(_WAT)
