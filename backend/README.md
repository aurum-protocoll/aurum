# Aurum — Backend

FastAPI service for oracle price aggregation, spot-price reconciliation, and position data.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/` | Service info |
| GET | `/health/` | Liveness check |
| POST | `/pricing/aggregate` | Aggregate multiple oracle quotes into a median price |
| POST | `/pricing/reconcile` | Compare on-chain price vs. real spot XAUUSD, flag deviation |
| GET | `/positions/{address}` | Get a tracked position summary |
| POST | `/positions/` | Upsert a position (placeholder until live RPC reads are wired) |

Interactive docs at `/docs` once running.

## Local development

```bash
pip install -r requirements.txt -r requirements-dev.txt --break-system-packages
cp .env.example .env
uvicorn app.main:app --reload
pytest
ruff check .
black --check .
```

## Project layout

```
app/
  api/routes/    — pricing, positions, health routers
  core/          — settings/config
  models/        — Pydantic models (pricing.py, position.py)
  services/
    oracle.py    — median aggregation + spot reconciliation math (pure, fully unit tested)
    sessions.py  — trading session detection (Asia/London/NY) + WAT conversion
tests/           — pytest suite
```

## Known gaps (good first issues!)

- No live Reflector/DIA contract calls yet — `oracle.py`'s aggregation math is fully tested, but the actual fetching of live `PriceQuote`s from on-chain oracle contracts (`app/services/feeds.py`) doesn't exist yet.
- No real spot-price API integration — `SPOT_PRICE_PROVIDER=manual` is a placeholder.
- `/positions/` is in-memory and client-writable, not a live Soroban RPC read of the deployed `SyntheticXau` contract.
- No Upstash Redis caching wired up yet despite the dependency being included — see `docs/architecture.md`.
