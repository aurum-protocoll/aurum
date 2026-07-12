"use client";

import { useEffect, useState } from "react";
import type { TradingSession } from "./types";

// Mirrors backend/app/services/sessions.py's UTC windows exactly, so the
// header's live badge never disagrees with a reconciliation report's
// trading_session. Same caveats apply: approximate "core hours", no DST.
const ASIA_START = 0;
const ASIA_END = 8;
const LONDON_START = 7;
const LONDON_END = 16;
const NEW_YORK_START = 12;
const NEW_YORK_END = 21;

export function getTradingSession(now: Date = new Date()): TradingSession {
  const h = now.getUTCHours() + now.getUTCMinutes() / 60;

  if (h >= NEW_YORK_START && h < NEW_YORK_END) return "new_york";
  if (h >= LONDON_START && h < LONDON_END) return "london";
  if (h >= ASIA_START && h < ASIA_END) return "asia";
  return "off_hours";
}

const TICK_MS = 30_000;

/** Live-ticking trading session, re-evaluated every 30s against UTC time. */
export function useLiveTradingSession(): TradingSession {
  const [session, setSession] = useState<TradingSession>(() => getTradingSession());

  useEffect(() => {
    setSession(getTradingSession());
    const id = setInterval(() => setSession(getTradingSession()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  return session;
}
