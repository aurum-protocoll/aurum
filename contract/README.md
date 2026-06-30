# Aurum — SyntheticXAU Contract

Over-collateralized synthetic gold (XAU) exposure on Soroban.

## ⚠️ Not audited

This contract has not been professionally audited. See [`docs/risks.md`](../docs/risks.md) before using it beyond testnet. Known simplifications in this reference implementation (tracked as open issues, not hidden):

- **Single collateral type** (USDC-equivalent) — no multi-collateral support yet.
- **Off-chain price push** rather than a direct on-chain oracle contract call (Reflector/DIA integration is a tracked "high" complexity issue).
- **Full liquidation only** — a liquidator takes 100% of a position's collateral rather than a partial, proportional liquidation. Partial liquidation (closer to production lending protocol design) is a tracked issue.
- **No liquidation bonus parameter yet** — the liquidator currently receives all collateral with no separate "repay debt, keep bonus" step modeled on-chain; this is a simplification flagged for follow-up.

## Layout

| File | Responsibility |
|---|---|
| `src/lib.rs` | Contract entrypoints: `initialize`, `push_price`, `mint`, `burn`, `get_position_health`, `liquidate` |
| `src/types.rs` | Storage structs (`Config`, `Position`) and storage helpers (note: writes extend TTL — see comment in `set_position`) |
| `src/errors.rs` | Typed `AurumError` enum |
| `src/pricing.rs` | Pure collateral-ratio math, unit tested independently of the contract env |
| `src/test.rs` | Integration tests covering mint/burn/liquidate flows against a mock Stellar Asset Contract |

## ⚠️ Build verification status

Written against the public `soroban-sdk` 21.x API. The pure math in
`pricing.rs` was independently cross-checked against a Python
reimplementation of the same formula (see PR description / commit
history), but **the contract as a whole has not yet been compiled in a
sandboxed environment with network access to crates.io / rustup.**

Before your first commit:

```bash
rustup target add wasm32-unknown-unknown
cargo build --target wasm32-unknown-unknown --release
cargo test
cargo clippy --target wasm32-unknown-unknown -- -D warnings
```

The most likely sources of small mismatches are exact `testutils` API
signatures (`register_stellar_asset_contract_v2`, `StellarAssetClient`,
`mock_all_auths`) across SDK minor versions — these are correct as of
the documented 21.x API but should be confirmed against whatever exact
version you pin in `Cargo.toml`. Delete this warning once verified —
a reviewer seeing "not yet verified" undercuts confidence in a contract
that handles collateral.

## Deploying to testnet

```bash
cargo build --target wasm32-unknown-unknown --release
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/aurum_synthetic_xau.wasm \
  --source-account <YOUR_TESTNET_ACCOUNT> \
  --network testnet
```
