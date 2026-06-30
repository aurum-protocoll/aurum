# Aurum

> An open-source, fully on-chain synthetic gold (XAU) exposure protocol on Stellar Soroban — with a live price-reconciliation dashboard built from real forex/gold market trading practice.

[![CI](https://github.com/aurum-protocol/aurum/actions/workflows/ci.yml/badge.svg)](https://github.com/aurum-protocol/aurum/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Network: Soroban Testnet](https://img.shields.io/badge/network-testnet-orange)](https://developers.stellar.org/docs/networks)

## The problem

Gold is having a moment on Stellar. Institutional, custody-backed tokenized gold (e.g. Matrixdock's XAUm) launched on Stellar in mid-2026, and Stellar's tokenized RWA base has grown into the billions. But every gold-on-chain option today is **custodial**: a real bar sits in a vault, and the token is a claim on it, issued and controlled by a centralized entity.

There is no open-source, fully on-chain, over-collateralized synthetic gold instrument on Soroban — the model that DeFi users on other chains (e.g. synthetic assets on Ethereum) take for granted. Aurum fills that gap: a permissionless contract where anyone can mint synthetic XAU exposure against locked collateral, with no custodian and no vault.

It also solves a quieter, equally real problem: **gold oracle feeds disagree with each other and with the real spot market**, sometimes by enough to matter for traders. Aurum's dashboard treats this as a first-class feature, not an edge case — it shows live deviation between Stellar-native oracle feeds (Reflector, DIA) and reports the spread the way a forex trader actually watches it during London/New York sessions.

## What it does

1. **`SyntheticXAU` Soroban contract** — lets a user lock USDC as collateral and mint a synthetic XAU-pegged token at a configurable collateral ratio (e.g. 150%). Includes burn/redeem and a liquidation path if the collateral ratio falls below the maintenance threshold.
2. **Oracle aggregation service** (FastAPI) — pulls gold price feeds from multiple Stellar-native oracle sources (Reflector, DIA), computes a median/TWAP price, and feeds it to the contract.
3. **Reconciliation dashboard** (Next.js) — shows the on-chain aggregated price next to real XAUUSD spot, flags deviation beyond a configurable threshold, and includes session-aware context (London / New York trading hours in WAT) that's directly informed by live forex/gold trading practice rather than generic DeFi UX.

## Architecture

```
┌────────────────┐   ┌────────────────┐
│   Reflector      │   │      DIA         │
│   Oracle (SEP-40) │   │   Oracle (SEP-40) │
└────────┬────────┘   └────────┬────────┘
         │ price feeds          │
         ▼                      ▼
   ┌──────────────────────────────────┐
   │     FastAPI Oracle Aggregator      │
   │     median / TWAP computation       │
   │     deviation vs. real spot XAUUSD  │
   └────────────┬───────────────────────┘
                │ price push
                ▼
   ┌──────────────────────────────────┐
   │   SyntheticXAU Soroban Contract    │
   │   mint / burn / liquidate           │
   │   collateral ratio tracking          │
   └────────────┬───────────────────────┘
                │ contract calls / events
                ▼
   ┌──────────────────────────────────┐
   │   Next.js Dashboard                 │
   │   mint/redeem UI, Freighter wallet   │
   │   reconciliation chart, alerts       │
   └──────────────────────────────────┘
```

| Layer | Stack |
|---|---|
| Frontend | Next.js 14, TypeScript, TailwindCSS, Freighter wallet integration |
| Backend | Python 3.12, FastAPI |
| Contract | Rust, Soroban SDK |
| Database | Supabase (Postgres) for price history |
| Cache | Upstash Redis for live price cache |
| Network | Stellar Soroban (Testnet → Mainnet) |

## ⚠️ Disclaimer

This is an open-source educational/research protocol exploring synthetic asset design on Soroban. It is **not audited**, **not financial advice**, and should not be used to mint real value-bearing positions on mainnet without a professional security audit. See [`docs/risks.md`](docs/risks.md).

## Getting started

### Prerequisites
- Node.js 20+
- Python 3.12+
- Rust + `stellar-cli`
- Supabase project + Upstash Redis instance (free tiers are enough)

### Contract
```bash
cd contract
cargo build --target wasm32-unknown-unknown --release
cargo test
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/aurum_synthetic_xau.wasm \
  --source-account <YOUR_TESTNET_ACCOUNT> \
  --network testnet
```

### Backend
```bash
cd backend
pip install -r requirements.txt --break-system-packages
cp .env.example .env
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## Project status

Early and active — see [open issues](https://github.com/aurum-protocol/aurum/issues), many tagged `good first issue`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Apache-2.0, see [LICENSE](LICENSE).
