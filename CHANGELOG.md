# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Dashboard redesign — live trading-session badge (Asia/London/New York, ticking off UTC time), a pulsing deviation meter, and a position card that recalculates collateral ratio live from the entered spot price
- Backend deployed to Render; frontend deployed to Vercel

### Changed
- Rewrote `docs/architecture.md` as factual, present-tense documentation with a `## Roadmap` section; added `docs/contract.md` as a method-by-method contract reference

### Fixed
- Resolved an `httpx`/`supabase` dependency conflict that blocked backend installs and CI
- Pinned the backend's Python version to 3.12.7 (Render's default had no prebuilt wheel for `pydantic-core`)
- Committed `contract/Cargo.lock` to pin dependency versions, fixing a CI-only `cargo test` failure caused by an incompatible transitive dependency
- Fixed `black`/`cargo fmt` violations that were blocking CI

### Removed
- Internal setup scripts (`scripts/git-stage-setup.sh`) and seed-issue scaffolding notes (`docs/seed-issues.md`)

### Planned
- Wire the live Reflector/DIA oracle feeds into `POST /pricing/aggregate` (both feeds exist in `app/services/feeds.py` but the route still runs on manually-supplied quotes)
- Real spot price API integration, replacing the `SPOT_PRICE_PROVIDER=manual` placeholder
- On-chain `mint`/`burn`/`liquidate` transaction submission from the frontend via Freighter (wallet connect/disconnect is already implemented)
- Soroban RPC reads for `/positions/`, replacing the in-memory store
- Partial liquidation mechanism in the contract

## [0.2.0] - 2026-07-11

### Added
- Collateral ratio history chart
- Freighter wallet connect/disconnect in the dashboard header
- Live Reflector oracle price reads
- Live DIA oracle price reads
- `get_price` read-only contract method
- Loading skeleton for the reconciliation card while a check is in flight

### Fixed
- Explicit validation for non-positive on-chain price in `POST /pricing/reconcile`

## [0.1.0] - 2026-06-30

### Added
- `SyntheticXau` Soroban contract: `mint`, `burn`, `liquidate`, `push_price`, `get_position_health`
- Over-collateralized position model at 150% minimum ratio, 120% liquidation threshold
- FastAPI oracle aggregation service with median-of-sources pricing
- Trading session detection (Asia/London/New York) in WAT
- Price deviation reconciliation against real spot XAUUSD
- Next.js dashboard with a price reconciliation card and position health card
- Deployed to Stellar testnet: `CDDOQRCE5LNJQBELCCRWSQGZR6U2WM6SZDUAUABSURIKUVEEOKP7QW6F`
- Full CI pipeline (Rust + Python + TypeScript)
