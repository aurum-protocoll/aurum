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
    """Fake SorobanServer returning queued canned responses in call order."""

    def __init__(self, responses: list[_FakeResponse]):
        self._responses = list(responses)

    def simulate_transaction(self, _tx):
        return self._responses.pop(0)


def _oracle_value_response(timestamp: int, price: int) -> _FakeResponse:
    oracle_value = scval.to_tuple_struct(
        [scval.to_uint128(timestamp), scval.to_uint128(price)]
    )
    return _FakeResponse(results=[_FakeResult(xdr=oracle_value.to_xdr())])


# A syntactically valid (checksummed) contract strkey — not a real DIA
# deployment, just a well-formed placeholder id so `TransactionBuilder`
# accepts it while building the (never-submitted) simulation transaction.
_FAKE_CONTRACT_ID = "CDDOQRCE5LNJQBELCCRWSQGZR6U2WM6SZDUAUABSURIKUVEEOKP7QW6F"


@pytest.fixture(autouse=True)
def _configure_contract_id(monkeypatch):
    monkeypatch.setattr(feeds.settings, "DIA_ORACLE_CONTRACT_ID", _FAKE_CONTRACT_ID)


def test_fetch_dia_price_returns_price_quote():
    server = _QueuedServer(
        [_oracle_value_response(timestamp=1_751_000_000, price=2000_00000000)]
    )

    quote = feeds.fetch_dia_price(server=server)

    assert quote.source == PriceSource.DIA
    assert quote.price_usd == pytest.approx(2000.0)
    assert quote.as_of == "2025-06-27T04:53:20+00:00"


def test_fetch_dia_price_raises_when_no_price_recorded():
    # OracleValue::default() == (0, 0) when the key has no data yet.
    server = _QueuedServer([_oracle_value_response(timestamp=0, price=0)])

    with pytest.raises(feeds.DIAFeedError, match="no price recorded"):
        feeds.fetch_dia_price(server=server)


def test_fetch_dia_price_raises_on_simulation_error():
    server = _QueuedServer([_FakeResponse(results=[], error="host invocation failed")])

    with pytest.raises(feeds.DIAFeedError, match="simulation failed"):
        feeds.fetch_dia_price(server=server)


def test_fetch_dia_price_raises_when_contract_not_configured(monkeypatch):
    monkeypatch.setattr(feeds.settings, "DIA_ORACLE_CONTRACT_ID", "")

    with pytest.raises(feeds.DIAFeedError, match="not configured"):
        feeds.fetch_dia_price(server=_QueuedServer([]))
