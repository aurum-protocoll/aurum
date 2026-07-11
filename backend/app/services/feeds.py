"""Live oracle price feeds: Reflector and DIA.

Calls the Reflector and DIA Soroban oracle contracts to fetch live
XAU/USD prices and construct the `PriceQuote`s that
`app/services/oracle.py`'s `aggregate_median()` consumes (see
`docs/architecture.md` for where this plugs in).

Kept separate from `oracle.py` for the same reason that module is
pure: the aggregation math needs no network access to be fully unit
tested, while this module talks to Soroban RPC. Its tests exercise it
against a fake `SorobanServer` (see `tests/test_feeds.py`) rather than
requiring a live testnet contract in CI.

Both contracts' read methods (`lastprice`/`decimals` for Reflector,
`get_value` for DIA) are read-only, so the built transaction is only
ever simulated — never signed or submitted — and its source account
never needs to exist on-chain or hold a real sequence number.

The two oracles have materially different interfaces:

- **Reflector** is a SEP-40-compatible price oracle
  (https://github.com/reflector-network/reflector-contract). It
  represents non-Stellar-native assets (forex pairs, commodities) via
  the `Asset::Other(Symbol)` enum variant — gold is quoted under the
  ticker "XAU" — and exposes an on-chain `decimals()` to scale the
  raw integer price returned by `lastprice()`.
- **DIA** (https://github.com/diadata-org/soroban-oracles) is a plain
  key/value store: `get_value(key: String) -> OracleValue`, where
  `OracleValue` is the tuple struct `(timestamp: u128, price: u128)`
  and the price is always scaled to a fixed 8 decimals (see the DIA
  feeder that writes it:
  https://github.com/diadata-org/soroban-oracle-feeders/blob/main/apps/oracle/src/oracles/soroban.ts).
  There's no on-chain `decimals()` to query, so the scale is a
  constant here rather than fetched per-call.
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from stellar_sdk import Account, SorobanServer, TransactionBuilder, scval

from app.core.config import settings
from app.models.pricing import PriceQuote, PriceSource

# Reflector represents non-Stellar-native assets (forex pairs,
# commodities) via the SEP-40 `Asset::Other(Symbol)` variant. Gold is
# quoted under the ticker "XAU".
XAU_ASSET_SYMBOL = "XAU"

# DIA's Soroban oracle always scales prices to 8 decimals, fixed by the
# off-chain feeder that writes values — there is no on-chain decimals()
# to query (unlike Reflector's SEP-40 interface).
DIA_PRICE_DECIMALS = 8

# Any syntactically valid (checksummed) ed25519 public key works here —
# an arbitrary, unfunded keypair with no known secret. It's never
# signed or submitted, only used as the source account of a
# simulate-only transaction.
_SIMULATION_ACCOUNT_ID = "GB2Y2725AYAPQGQKXVN2IAIL46MBMQJNPEQDDMEA4DUCB4DRPNUNPG2E"


class ReflectorFeedError(RuntimeError):
    """Raised when the Reflector contract is unconfigured, unreachable,
    or has no XAU price recorded yet."""


class DIAFeedError(RuntimeError):
    """Raised when the DIA oracle contract is unconfigured, unreachable,
    or has no XAU/USD price recorded yet."""


def _simulate_read(
    server: SorobanServer,
    contract_id: str,
    function_name: str,
    parameters: list,
    feed_name: str,
    error_cls: type[Exception],
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
        raise error_cls(f"{feed_name} `{function_name}` call failed: {exc}") from exc

    if response.error:
        raise error_cls(
            f"{feed_name} `{function_name}` simulation failed: {response.error}"
        )
    if not response.results:
        raise error_cls(f"{feed_name} `{function_name}` returned no result")

    return scval.to_native(response.results[0].xdr)


def fetch_reflector_price(server: SorobanServer | None = None) -> PriceQuote:
    """Fetches the latest XAU/USD price from the Reflector contract.

    Calls the SEP-40 `decimals()` and `lastprice(Asset::Other("XAU"))`
    methods, scales the raw integer price by the contract's decimals,
    and returns it as a `PriceQuote(source=PriceSource.REFLECTOR, ...)`.

    :param server: Optional `SorobanServer` to use instead of one built
        from `settings.SOROBAN_RPC_URL` — primarily for tests.
    """
    contract_id = settings.REFLECTOR_CONTRACT_ID
    if not contract_id:
        raise ReflectorFeedError("REFLECTOR_CONTRACT_ID is not configured")

    server = server or SorobanServer(settings.SOROBAN_RPC_URL)

    decimals = _simulate_read(
        server, contract_id, "decimals", [], "Reflector", ReflectorFeedError
    )

    asset_param = scval.to_enum("Other", scval.to_symbol(XAU_ASSET_SYMBOL))
    price_data = _simulate_read(
        server,
        contract_id,
        "lastprice",
        [asset_param],
        "Reflector",
        ReflectorFeedError,
    )

    if price_data is None:
        raise ReflectorFeedError("Reflector has no XAU price recorded yet")

    price_usd = Decimal(price_data["price"]) / (Decimal(10) ** decimals)

    return PriceQuote(
        source=PriceSource.REFLECTOR,
        price_usd=float(price_usd),
        as_of=datetime.fromtimestamp(
            price_data["timestamp"], tz=timezone.utc
        ).isoformat(),
    )


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
    oracle_value = _simulate_read(
        server, contract_id, "get_value", [key_param], "DIA", DIAFeedError
    )

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
