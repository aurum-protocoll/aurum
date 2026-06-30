from datetime import datetime, timezone

from app.models.pricing import TradingSession
from app.services.sessions import current_session, to_wat


def test_new_york_session_detected():
    dt = datetime(2026, 6, 29, 14, 0, tzinfo=timezone.utc)  # 14:00 UTC
    assert current_session(dt) == TradingSession.NEW_YORK


def test_london_session_detected_before_ny_overlap():
    dt = datetime(2026, 6, 29, 8, 0, tzinfo=timezone.utc)  # 08:00 UTC
    assert current_session(dt) == TradingSession.LONDON


def test_asia_session_detected():
    dt = datetime(2026, 6, 29, 2, 0, tzinfo=timezone.utc)  # 02:00 UTC
    assert current_session(dt) == TradingSession.ASIA


def test_off_hours_detected():
    dt = datetime(2026, 6, 29, 22, 30, tzinfo=timezone.utc)  # 22:30 UTC
    assert current_session(dt) == TradingSession.OFF_HOURS


def test_to_wat_adds_one_hour_and_correct_offset():
    dt = datetime(2026, 6, 29, 18, 0, tzinfo=timezone.utc)
    result = to_wat(dt)
    assert result.hour == 19
    assert result.utcoffset().total_seconds() == 3600
