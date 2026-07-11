// Mirrors backend/app/models/{pricing,position}.py — keep in sync
// manually for now; generating from the FastAPI OpenAPI schema is a
// good "medium" complexity issue.

export type PriceSource = "reflector" | "dia" | "spot_reference";

export type TradingSession = "asia" | "london" | "new_york" | "off_hours";

export interface PriceQuote {
  source: PriceSource;
  price_usd: number;
  as_of: string;
}

export interface AggregatedPrice {
  median_price_usd: number;
  quotes: PriceQuote[];
  aggregated_at: string;
}

export interface ReconciliationReport {
  on_chain_price_usd: number;
  spot_price_usd: number;
  deviation_bps: number;
  deviation_exceeds_threshold: boolean;
  trading_session: TradingSession;
  checked_at: string;
}

export interface PositionSummary {
  address: string;
  collateral_usd: number;
  debt_xau: number;
  collateral_ratio_bps: number | null;
}

export interface PositionHistoryPoint {
  timestamp: string;
  collateral_ratio_bps: number | null;
}
