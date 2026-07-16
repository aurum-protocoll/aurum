"use client";

import { useEffect, useState } from "react";
import {
  ReconciliationCard,
  ReconciliationCardSkeleton,
} from "@/components/ReconciliationCard";
import { PositionCard } from "@/components/PositionCard";
import { PositionHistoryChart } from "@/components/PositionHistoryChart";
import { reconcilePrice } from "@/lib/api";
import {
  checkFreighterInstalled,
  connectFreighterWallet,
  getConnectedAddress,
  shortenAddress,
} from "@/lib/freighter";
import { getTradingSession } from "@/lib/session";
import type {
  PositionHistoryPoint,
  PositionSummary,
  ReconciliationReport,
  TradingSession,
} from "@/lib/types";

const DEMO_POSITION: PositionSummary = {
  address: "GDEMO...PLACEHOLDER",
  collateral_usd: 3000,
  debt_xau: 1,
  collateral_ratio_bps: 15000,
};

const DEMO_POSITION_HISTORY: PositionHistoryPoint[] = [
  { timestamp: "2026-07-01T00:00:00Z", collateral_ratio_bps: 18200 },
  { timestamp: "2026-07-02T00:00:00Z", collateral_ratio_bps: 17600 },
  { timestamp: "2026-07-03T00:00:00Z", collateral_ratio_bps: 16950 },
  { timestamp: "2026-07-04T00:00:00Z", collateral_ratio_bps: 16350 },
  { timestamp: "2026-07-05T00:00:00Z", collateral_ratio_bps: 15820 },
  { timestamp: "2026-07-06T00:00:00Z", collateral_ratio_bps: 15410 },
  { timestamp: "2026-07-07T00:00:00Z", collateral_ratio_bps: 15000 },
];

const MIN_RATIO_BPS = 15000; // 150%
const LIQUIDATION_THRESHOLD_BPS = 12000; // 120%
const DEVIATION_ALERT_THRESHOLD_BPS = 50; // 0.5%, matches backend default

const SESSION_LABEL: Record<TradingSession, string> = {
  asia: "Asia session",
  london: "London session",
  new_york: "New York session",
  off_hours: "Off-hours",
};

function SessionBadge() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const session = getTradingSession(now);
  const timeString = now.toLocaleTimeString("en-GB", {
    timeZone: "Africa/Lagos",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return (
    <span className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-ink">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-gold" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold" />
      </span>
      <span suppressHydrationWarning>
        {SESSION_LABEL[session]} • {timeString} WAT
      </span>
    </span>
  );
}

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const [onChainPrice, setOnChainPrice] = useState("2005");
  const [spotPrice, setSpotPrice] = useState("2000");
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const liveSpotPrice = parseFloat(spotPrice);

  useEffect(() => {
    async function hydrateWallet() {
      const { installed, error: installError } = await checkFreighterInstalled();
      if (!installed) {
        setWalletError(installError ?? "Freighter extension not detected");
        return;
      }

      const { address, error: addressError } = await getConnectedAddress();
      if (addressError) {
        setWalletError(addressError);
        return;
      }

      if (address) {
        setWalletAddress(address);
      }
    }

    hydrateWallet();
  }, []);

  async function handleConnectWallet() {
    setWalletLoading(true);
    setWalletError(null);

    try {
      const { installed, error: installError } = await checkFreighterInstalled();
      if (!installed) {
        setWalletError(installError ?? "Install Freighter to continue");
        return;
      }

      const { address, error: connectError } = await connectFreighterWallet();
      if (connectError) {
        setWalletError(connectError);
        return;
      }

      setWalletAddress(address ?? null);
    } catch (err) {
      setWalletError(err instanceof Error ? err.message : "Wallet connection failed");
    } finally {
      setWalletLoading(false);
    }
  }

  function handleDisconnectWallet() {
    setWalletAddress(null);
    setWalletError(null);
  }

  async function handleReconcile() {
    setLoading(true);
    setError(null);
    try {
      const result = await reconcilePrice({
        on_chain_price_usd: parseFloat(onChainPrice),
        spot_price_usd: parseFloat(spotPrice),
      });
      setReport(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reconciliation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-10 flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-gold" />
            <p className="font-display text-lg font-bold uppercase tracking-[0.3em] text-ink">
              Aurum
            </p>
            <span className="rounded-full border border-gold/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-gold">
              sXAU
            </span>
          </div>
          <p className="mt-2 max-w-sm text-sm text-muted">
            Open-source, over-collateralized gold exposure on Soroban — with
            live reconciliation against real spot XAUUSD.
          </p>
        </div>

        <div className="flex flex-col items-end gap-3">
          <SessionBadge />

          {walletAddress ? (
            <div className="flex items-center gap-2">
              <p className="font-mono text-xs text-muted">
                {shortenAddress(walletAddress)}
              </p>
              <button
                onClick={handleDisconnectWallet}
                className="rounded-md border border-line bg-surface px-3 py-1.5 font-display text-xs font-medium text-ink transition-colors hover:border-gold/40"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnectWallet}
              disabled={walletLoading}
              className="rounded-md bg-gold px-3 py-1.5 font-display text-xs font-semibold text-base transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {walletLoading ? "Connecting…" : "Connect Freighter"}
            </button>
          )}

          {walletError && (
            <p className="max-w-xs text-right font-display text-xs text-critical">
              {walletError}
            </p>
          )}
        </div>
      </header>

      <section className="mb-6 space-y-4 rounded-xl border border-line bg-surface p-6">
        <h2 className="font-display text-xs font-medium uppercase tracking-[0.2em] text-muted">
          Check price deviation
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="onchain" className="mb-1.5 block text-xs text-muted">
              On-chain aggregated price (USD)
            </label>
            <input
              id="onchain"
              value={onChainPrice}
              onChange={(e) => setOnChainPrice(e.target.value)}
              inputMode="decimal"
              className="w-full rounded-md border border-line bg-base px-3 py-2.5 font-mono text-sm tabular-nums text-ink focus:border-gold focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="spot" className="mb-1.5 block text-xs text-muted">
              Real spot XAUUSD (USD)
            </label>
            <input
              id="spot"
              value={spotPrice}
              onChange={(e) => setSpotPrice(e.target.value)}
              inputMode="decimal"
              className="w-full rounded-md border border-line bg-base px-3 py-2.5 font-mono text-sm tabular-nums text-ink focus:border-gold focus:outline-none"
            />
          </div>
        </div>
        <button
          onClick={handleReconcile}
          disabled={loading}
          className="rounded-md bg-gold px-4 py-2.5 font-display text-sm font-semibold text-base transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Checking…" : "Check deviation"}
        </button>
        {error && <p className="font-display text-sm text-critical">{error}</p>}
      </section>

      {loading ? (
        <section className="mb-6">
          <ReconciliationCardSkeleton />
        </section>
      ) : (
        report && (
          <section className="mb-6">
            <ReconciliationCard
              report={report}
              thresholdBps={DEVIATION_ALERT_THRESHOLD_BPS}
            />
          </section>
        )
      )}

      <section>
        <h2 className="mb-3 font-display text-xs font-medium uppercase tracking-[0.2em] text-muted">
          Example position
        </h2>
        <PositionCard
          position={DEMO_POSITION}
          minRatioBps={MIN_RATIO_BPS}
          liquidationThresholdBps={LIQUIDATION_THRESHOLD_BPS}
          spotPriceUsd={liveSpotPrice > 0 ? liveSpotPrice : undefined}
        />
      </section>

      <section className="mt-6">
        <PositionHistoryChart
          points={DEMO_POSITION_HISTORY}
          minRatioBps={MIN_RATIO_BPS}
          liquidationThresholdBps={LIQUIDATION_THRESHOLD_BPS}
        />
      </section>
    </main>
  );
}
