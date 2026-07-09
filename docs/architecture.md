# Architecture

## Overview

Aurum has three pieces:

1. **Contract** (`contract/synthetic-xau/`) — the `SyntheticXau` Soroban
   contract: mint, burn, liquidate, and a price-pusher mechanism. See
   `contract/README.md` for the explicit list of known simplifications.
2. **Backend** (`backend/`) — FastAPI service with:
   - `app/services/oracle.py` — median price aggregation across sources,
     and deviation reconciliation vs. real spot XAUUSD. Fully unit
     tested with no live network dependency.
   - `app/services/sessions.py` — trading session detection (Asia /
     London / New York) used to add context to deviation readings.
   - `app/api/routes/` — `/pricing`, `/positions`, `/health`.
3. **Frontend** (`frontend/`) — Next.js dashboard: reconciliation card,
   position health card, mint/redeem flow (UI scaffolded, on-chain wiring
   tracked as an open issue).

## Data flow (current state)

```
User enters on-chain price + spot price in dashboard
        │
        ▼
POST /pricing/reconcile
        │
        ▼
oracle.reconcile_with_spot()
  - computes deviation in bps
  - flags if above DEVIATION_ALERT_THRESHOLD_BPS
  - tags the current trading session (sessions.py)
        │
        ▼
ReconciliationReport → ReconciliationCard renders it
```

## What's NOT wired up yet (by design, tracked as issues)

- **Live oracle contract calls: DIA done, Reflector outstanding.**
  `oracle.aggregate_median()` takes a list of `PriceQuote` objects.
  `app/services/feeds.py` now calls the real DIA Soroban oracle
  (`get_value`) to produce one; a Reflector equivalent is still needed
  before `/pricing/aggregate` can run on live multi-source data
  end-to-end.
- **No real spot-price API.** `SPOT_PRICE_PROVIDER=manual` in config is
  a placeholder.
- **No live contract reads.** `/positions/` is a client-writable
  in-memory store, not a Soroban RPC read of `get_position_health` on
  the deployed contract.
- **No wallet integration in the frontend yet.** Freighter wallet
  connect + actual `mint`/`burn`/`liquidate` transaction submission is
  scaffolded conceptually in the README but not implemented in
  `app/page.tsx` yet — see open issues.
- **Frontend price inputs are manual**, not live-fetched, in the v0
  dashboard. Wiring `/pricing/aggregate` + `/pricing/reconcile` into an
  auto-refreshing flow (rather than a manual "Check deviation" button)
  is a good medium-complexity issue.

## Why these design choices

- **Aggregation math separated from data fetching:** `oracle.py` is
  pure and fully testable without hitting any live oracle or needing
  API keys in CI. The "fetch real quotes" piece is isolated so it can
  be built and reviewed independently.
- **Off-chain price push in the contract, not on-chain oracle reads:**
  keeps the v0 contract surface small and auditable. Direct on-chain
  oracle integration is a clearly scoped "high" complexity follow-up,
  not hidden scope creep.
