from dataclasses import dataclass, field

import pytest
from stellar_sdk import scval

from app.models.pricing import PriceSource
from app.services import feeds


@dataclass
class _FakeResult:
    xdr: str


@dataclass
class _FakeResponse:
    results: list[_FakeResult] = field(default_factory=list)
    error: str | None = None


class _QueuedServer:
    """Fake SorobanServer returning queued canned responses in call order.

    `fetch_reflector_price` always calls `decimals()` then `lastprice()`,
    so tests queue responses in that order instead of inspecting the
    simulated transaction.
    """

    def __init__(self, responses: list[_FakeResponse]):
        self._responses = list(responses)

    def simulate_transaction(self, _tx):
        return self._responses.pop(0)


def _decimals_response(decimals: int) -> _FakeResponse:
    return _FakeResponse(results=[_FakeResult(xdr=scval.to_uint32(decimals).to_xdr())])


def _lastprice_response(price: int, timestamp: int) -> _FakeResponse:
    price_data = scval.to_struct(
        {"price": scval.to_int128(price), "timestamp": scval.to_uint64(timestamp)}
    )
    return _FakeResponse(results=[_FakeResult(xdr=price_data.to_xdr())])


def _no_price_response() -> _FakeResponse:
    return _FakeResponse(results=[_FakeResult(xdr=scval.to_void().to_xdr())])


# A syntactically valid (checksummed) contract strkey — not a real
# Reflector deployment, just a well-formed placeholder id so
# `TransactionBuilder` accepts it while building the (never-submitted)
# simulation transaction.
_FAKE_CONTRACT_ID = "CDDOQRCE5LNJQBELCCRWSQGZR6U2WM6SZDUAUABSURIKUVEEOKP7QW6F"


@pytest.fixture(autouse=True)
def _configure_contract_id(monkeypatch):
    monkeypatch.setattr(feeds.settings, "REFLECTOR_CONTRACT_ID", _FAKE_CONTRACT_ID)


def test_fetch_reflector_price_returns_price_quote():
    server = _QueuedServer(
        [
            _decimals_response(14),
            _lastprice_response(price=2000_00000000000000, timestamp=1_751_000_000),
        ]
    )

    quote = feeds.fetch_reflector_price(server=server)

    assert quote.source == PriceSource.REFLECTOR
    assert quote.price_usd == pytest.approx(2000.0)
    assert quote.as_of == "2025-06-27T04:53:20+00:00"


def test_fetch_reflector_price_raises_when_no_price_recorded():
    server = _QueuedServer([_decimals_response(14), _no_price_response()])

    with pytest.raises(feeds.ReflectorFeedError, match="no XAU price recorded"):
        feeds.fetch_reflector_price(server=server)


def test_fetch_reflector_price_raises_on_simulation_error():
    server = _QueuedServer([_FakeResponse(results=[], error="host invocation failed")])

    with pytest.raises(feeds.ReflectorFeedError, match="simulation failed"):
        feeds.fetch_reflector_price(server=server)


def test_fetch_reflector_price_raises_when_contract_not_configured(monkeypatch):
    monkeypatch.setattr(feeds.settings, "REFLECTOR_CONTRACT_ID", "")

    with pytest.raises(feeds.ReflectorFeedError, match="not configured"):
        feeds.fetch_reflector_price(server=_QueuedServer([]))
