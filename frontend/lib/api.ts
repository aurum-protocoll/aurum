import type {
  AggregatedPrice,
  PositionSummary,
  PriceQuote,
  ReconciliationReport,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

export function aggregatePrice(quotes: PriceQuote[]): Promise<AggregatedPrice> {
  return request<AggregatedPrice>("/pricing/aggregate", {
    method: "POST",
    body: JSON.stringify({ quotes }),
  });
}

export function reconcilePrice(input: {
  on_chain_price_usd: number;
  spot_price_usd: number;
}): Promise<ReconciliationReport> {
  return request<ReconciliationReport>("/pricing/reconcile", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getPosition(address: string): Promise<PositionSummary> {
  return request<PositionSummary>(`/positions/${address}`);
}
