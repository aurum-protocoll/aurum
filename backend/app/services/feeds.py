"""Live DIA oracle price feed.

Calls the DIA Soroban oracle contract
(https://github.com/diadata-org/soroban-oracles) to fetch a live
XAU/USD price and construct the `PriceQuote` that
`app/services/oracle.py`'s `aggregate_median()` consumes (see
`docs/architecture.md` for where this plugs in).

Kept separate from `oracle.py` for the same reason that module is
pure: the aggregation math needs no network access to be fully unit
tested, while this module talks to Soroban RPC. Its tests exercise it
against a fake `SorobanServer` (see `tests/test_feeds.py`) rather than
requiring a live testnet contract in CI.

`get_value` is a read-only call, so the built transaction is only ever
simulated — never signed or submitted — and its source account never
needs to exist on-chain or hold a real sequence number.

Unlike Reflector's SEP-40 `Asset` enum + `decimals()` interface, DIA's
Soroban oracle is a plain key/value store: `get_value(key: String) ->
OracleValue`, where `OracleValue` is the tuple struct `(timestamp:
u128, price: u128)` and the price is always scaled to a fixed 8
decimals (see the DIA feeder that writes it:
https://github.com/diadata-org/soroban-oracle-feeders/blob/main/apps/oracle/src/oracles/soroban.ts).
There's no on-chain `decimals()` to query, so the scale is a constant
here rather than fetched per-call.
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from stellar_sdk import Account, SorobanServer, TransactionBuilder, scval

from app.core.config import settings
from app.models.pricing import PriceQuote, PriceSource

# DIA's Soroban oracle always scales prices to 8 decimals, fixed by the
# off-chain feeder that writes values — there is no on-chain decimals()
# to query (unlike Reflector's SEP-40 interface).
DIA_PRICE_DECIMALS = 8

_SIMULATION_ACCOUNT_ID = "GB2Y2725AYAPQGQKXVN2IAIL46MBMQJNPEQDDMEA4DUCB4DRPNUNPG2E"


class DIAFeedError(RuntimeError):
    """Raised when the DIA oracle contract is unconfigured, unreachable,
    or has no XAU/USD price recorded yet."""


def _simulate_read(
    server: SorobanServer,
    contract_id: str,
    function_name: str,
    parameters: list,
) -> Any:
    """Simulates a read-only contract call and decodes the result to a
    native Python value (see `stellar_sdk.scval.to_native`)."""
    source_account = Account(_SIMULATION_ACCOUNT_ID, 0)
    tx = (
        TransactionBuilder(
            source_account, settings.SOROBAN_NETWORK_PASSPHRASE, base_fee=100
        )
        .set_timeout(30)
        .append_invoke_contract_function_op(
            contract_id=contract_id,
            function_name=function_name,
            parameters=parameters,
        )
        .build()
    )

    try:
        response = server.simulate_transaction(tx)
    except Exception as exc:  # network/transport errors from the RPC client
        raise DIAFeedError(f"DIA `{function_name}` call failed: {exc}") from exc

    if response.error:
        raise DIAFeedError(f"DIA `{function_name}` simulation failed: {response.error}")
    if not response.results:
        raise DIAFeedError(f"DIA `{function_name}` returned no result")

    return scval.to_native(response.results[0].xdr)


def fetch_dia_price(server: SorobanServer | None = None) -> PriceQuote:
    """Fetches the latest XAU/USD price from the DIA oracle contract.

    Calls `get_value(key: String)` for `settings.DIA_XAU_USD_KEY`,
    scales the raw integer price by the fixed `DIA_PRICE_DECIMALS`, and
    returns it as a `PriceQuote(source=PriceSource.DIA, ...)`.

    :param server: Optional `SorobanServer` to use instead of one built
        from `settings.SOROBAN_RPC_URL` — primarily for tests.
    """
    contract_id = settings.DIA_ORACLE_CONTRACT_ID
    if not contract_id:
        raise DIAFeedError("DIA_ORACLE_CONTRACT_ID is not configured")

    server = server or SorobanServer(settings.SOROBAN_RPC_URL)

    key_param = scval.to_string(settings.DIA_XAU_USD_KEY)
    oracle_value = _simulate_read(server, contract_id, "get_value", [key_param])

    timestamp, raw_price = oracle_value
    if timestamp == 0 and raw_price == 0:
        # `read_oracle_value` returns `OracleValue::default()` — (0, 0)
        # — rather than an Option, when the key has no data yet.
        raise DIAFeedError(
            f"DIA has no price recorded yet for key {settings.DIA_XAU_USD_KEY!r}"
        )

    price_usd = Decimal(raw_price) / (Decimal(10) ** DIA_PRICE_DECIMALS)

    return PriceQuote(
        source=PriceSource.DIA,
        price_usd=float(price_usd),
        as_of=datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat(),
    )
