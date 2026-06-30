# Seed Issues — Aurum

Copy each block below into a new GitHub issue.

---

### 1. [good first issue] Add a `get_price` read-only contract method
**Labels:** `good first issue`, `enhancement`, `contract`
**Body:** `push_price` updates `Config.xau_usd_price` but there's no public getter to read it without going through a position-dependent call. Add a simple `get_price(env: Env) -> Result<i128, AurumError>` method to `lib.rs` and a unit test confirming it returns the last pushed price.

---

### 2. [good first issue] Add input validation for `reconcile` endpoint negative prices
**Labels:** `good first issue`, `bug`, `backend`
**Body:** `app/api/routes/pricing.py`'s `/pricing/reconcile` already rejects non-positive `spot_price_usd` via `oracle.py`'s `ValueError`, but doesn't explicitly validate `on_chain_price_usd > 0`. Add that check with a clear error message and a test case.

---

### 3. [good first issue] Add a loading skeleton to the reconciliation card
**Labels:** `good first issue`, `enhancement`, `frontend`
**Body:** While `loading` is true in `app/page.tsx`, the button text changes but the reconciliation card area shows nothing. Add a simple skeleton placeholder so the layout doesn't jump when results arrive.

---

### 4. [medium] Wire up live Reflector oracle price reads
**Labels:** `enhancement`, `backend`
**Body:** Build `app/services/feeds.py` that calls the Reflector Soroban contract (SEP-40 interface) to fetch a live XAU/USD price and constructs a `PriceQuote(source=PriceSource.REFLECTOR, ...)`. See `docs/architecture.md` for where this plugs into `oracle.aggregate_median()`.

---

### 5. [medium] Wire up live DIA oracle price reads
**Labels:** `enhancement`, `backend`
**Body:** Same as #4 but for the DIA oracle contract. Once both #4 and #5 land, `/pricing/aggregate` can be called with real multi-source data instead of manually-supplied quotes.

---

### 6. [medium] Add Freighter wallet connection to the frontend
**Labels:** `enhancement`, `frontend`
**Body:** Add Freighter wallet connect/disconnect to the dashboard (button in the header, connected address display). This is a prerequisite for wiring up the actual mint/burn transaction flow (see issue #8).

---

### 7. [medium] Add position history chart
**Labels:** `enhancement`, `frontend`
**Body:** Once `/positions/` reads from chain (issue #9), add a chart showing a position's collateral ratio over time, with the maintenance and liquidation thresholds drawn as reference lines.

---

### 8. [high] Wire up real mint/burn transaction submission from the frontend
**Labels:** `enhancement`, `frontend`, `high-complexity`
**Body:** The dashboard currently shows a static example position. Build the actual mint/burn UI flow: collateral amount input, mint amount input, transaction building via `stellar-sdk`, signing via Freighter (depends on issue #6), and submission to the deployed `SyntheticXau` contract.

---

### 9. [high] Replace in-memory positions store with live Soroban RPC reads
**Labels:** `enhancement`, `backend`, `high-complexity`
**Body:** `app/api/routes/positions.py` is explicit that it's a placeholder. Replace it with real calls to `get_position_health` on the deployed `SyntheticXau` contract via Soroban RPC, removing the client-writable `POST /positions/` endpoint entirely once this lands.

---

### 10. [high] Design and implement partial liquidation
**Labels:** `enhancement`, `contract`, `high-complexity`
**Body:** `contract/synthetic-xau/src/lib.rs`'s `liquidate` function gives the liquidator 100% of a position's collateral. Design and implement a partial liquidation mechanism (liquidator repays a portion of debt, receives a proportional share of collateral plus a liquidation bonus) closer to production lending protocol design. This needs a design discussion in the issue before implementation — open a draft proposal first.
