"""Live Reflector oracle price feed.

Calls the Reflector Soroban contract — a SEP-40-compatible price
oracle (https://github.com/reflector-network/reflector-contract) — to
fetch a live XAU/USD price and construct the `PriceQuote` that
`app/services/oracle.py`'s `aggregate_median()` consumes (see
`docs/architecture.md` for where this plugs in).

Kept separate from `oracle.py` for the same reason that module is
pure: the aggregation math needs no network access to be fully unit
tested, while this module talks to Soroban RPC. Its tests exercise it
against a fake `SorobanServer` (see `tests/test_feeds.py`) rather than
requiring a live testnet contract in CI.

`lastprice`/`decimals` are read-only SEP-40 methods, so the built
transaction is only ever simulated — never signed or submitted — and
its source account never needs to exist on-chain or hold a real
sequence number.
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

# Any syntactically valid (checksummed) ed25519 public key works here —
# an arbitrary, unfunded keypair with no known secret. It's never
# signed or submitted, only used as the source account of a
# simulate-only transaction.
_SIMULATION_ACCOUNT_ID = "GB2Y2725AYAPQGQKXVN2IAIL46MBMQJNPEQDDMEA4DUCB4DRPNUNPG2E"


class ReflectorFeedError(RuntimeError):
    """Raised when the Reflector contract is unconfigured, unreachable,
    or has no XAU price recorded yet."""


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
        raise ReflectorFeedError(
            f"Reflector `{function_name}` call failed: {exc}"
        ) from exc

    if response.error:
        raise ReflectorFeedError(
            f"Reflector `{function_name}` simulation failed: {response.error}"
        )
    if not response.results:
        raise ReflectorFeedError(f"Reflector `{function_name}` returned no result")

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

    decimals = _simulate_read(server, contract_id, "decimals", [])

    asset_param = scval.to_enum("Other", scval.to_symbol(XAU_ASSET_SYMBOL))
    price_data = _simulate_read(server, contract_id, "lastprice", [asset_param])

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
