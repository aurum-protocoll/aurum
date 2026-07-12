# Contract reference

## Network

Stellar Testnet.

## Contract ID

```
CDDOQRCE5LNJQBELCCRWSQGZR6U2WM6SZDUAUABSURIKUVEEOKP7QW6F
```

View it on [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CDDOQRCE5LNJQBELCCRWSQGZR6U2WM6SZDUAUABSURIKUVEEOKP7QW6F).

## Building and deploying

```bash
cd contract

# Build a deployable WASM (uses the wasm32v1-none target):
stellar contract build

# Deploy to testnet
stellar contract deploy \
  --wasm target/wasm32v1-none/release/aurum_synthetic_xau.wasm \
  --source-account <YOUR_TESTNET_ACCOUNT> \
  --network testnet
```

## Invoking via stellar-cli

Every call follows the same shape — `stellar contract invoke --id
<CONTRACT_ID> --source-account <ACCOUNT> --network testnet -- <method>
[--<arg> <value> ...]`. Amounts are `i128`, scaled by `10_000_000` (7
decimal places), matching Stellar asset precision — `2000` XAU/USD is
passed as `20000000000`.

```bash
# initialize — one-time setup, called by the admin account
stellar contract invoke \
  --id CDDOQRCE5LNJQBELCCRWSQGZR6U2WM6SZDUAUABSURIKUVEEOKP7QW6F \
  --source-account <ADMIN_ACCOUNT> \
  --network testnet \
  -- \
  initialize \
  --admin <ADMIN_ADDRESS> \
  --collateral_token <USDC_CONTRACT_ID> \
  --price_pusher <PRICE_PUSHER_ADDRESS> \
  --min_collateral_ratio_bps 15000 \
  --liquidation_threshold_bps 12000

# push_price — called by the authorized price-pusher account
stellar contract invoke \
  --id CDDOQRCE5LNJQBELCCRWSQGZR6U2WM6SZDUAUABSURIKUVEEOKP7QW6F \
  --source-account <PRICE_PUSHER_ACCOUNT> \
  --network testnet \
  -- \
  push_price \
  --new_price 20000000000

# mint — called by the user opening or adding to a position
stellar contract invoke \
  --id CDDOQRCE5LNJQBELCCRWSQGZR6U2WM6SZDUAUABSURIKUVEEOKP7QW6F \
  --source-account <USER_ACCOUNT> \
  --network testnet \
  -- \
  mint \
  --user <USER_ADDRESS> \
  --collateral_amount 30000000000 \
  --mint_amount 10000000

# get_price — read-only
stellar contract invoke \
  --id CDDOQRCE5LNJQBELCCRWSQGZR6U2WM6SZDUAUABSURIKUVEEOKP7QW6F \
  --source-account <ANY_ACCOUNT> \
  --network testnet \
  -- \
  get_price

# get_position_health — read-only
stellar contract invoke \
  --id CDDOQRCE5LNJQBELCCRWSQGZR6U2WM6SZDUAUABSURIKUVEEOKP7QW6F \
  --source-account <ANY_ACCOUNT> \
  --network testnet \
  -- \
  get_position_health \
  --user <USER_ADDRESS>
```

## Methods

| Method | Description |
|---|---|
| `initialize` | One-time setup — sets the admin, the collateral token, the price-pusher address, and the minimum and liquidation collateral ratios. |
| `push_price` | Called by the authorized price-pusher to update the contract's on-chain XAU/USD reference price. |
| `mint` | Locks collateral from the caller and mints sXAU against it, provided the resulting position stays at or above the minimum collateral ratio. |
| `burn` | Burns sXAU debt and releases a proportional share of the caller's locked collateral. |
| `get_price` | Returns the last price pushed by the price-pusher. |
| `get_position_health` | Returns a user's current collateral ratio, in basis points. |
| `liquidate` | Closes an under-collateralized position, transferring its full remaining collateral to the caller. |
