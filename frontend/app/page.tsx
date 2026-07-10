"use client";

import { useEffect, useState } from "react";
import {
  ReconciliationCard,
  ReconciliationCardSkeleton,
} from "@/components/ReconciliationCard";
import { PositionCard } from "@/components/PositionCard";
import { reconcilePrice } from "@/lib/api";
import {
  checkFreighterInstalled,
  connectFreighterWallet,
  getConnectedAddress,
  shortenAddress,
} from "@/lib/freighter";
import type { PositionSummary, ReconciliationReport } from "@/lib/types";

const DEMO_POSITION: PositionSummary = {
  address: "GDEMO...PLACEHOLDER",
  collateral_usd: 3000,
  debt_xau: 1,
  collateral_ratio_bps: 15000,
};

const MIN_RATIO_BPS = 15000; // 150%
const LIQUIDATION_THRESHOLD_BPS = 12000; // 120%

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const [onChainPrice, setOnChainPrice] = useState("2005");
  const [spotPrice, setSpotPrice] = useState("2000");
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <header className="mb-10 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-gold">
            Aurum
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">
            Synthetic XAU dashboard
          </h1>
          <p className="mt-2 text-sm text-muted">
            Open-source, over-collateralized gold exposure on Soroban — with
            live reconciliation against real spot XAUUSD.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          {walletAddress ? (
            <>
              <p className="font-mono text-xs text-muted">
                Connected: {shortenAddress(walletAddress)}
              </p>
              <button
                onClick={handleDisconnectWallet}
                className="rounded-md border border-line bg-base px-3 py-2 text-xs font-medium text-ink"
              >
                Disconnect wallet
              </button>
            </>
          ) : (
            <button
              onClick={handleConnectWallet}
              disabled={walletLoading}
              className="rounded-md bg-accent px-3 py-2 text-xs font-medium text-base disabled:cursor-not-allowed disabled:opacity-50"
            >
              {walletLoading ? "Connecting..." : "Connect Freighter"}
            </button>
          )}

          {walletError && (
            <p className="max-w-xs text-right font-mono text-xs deviation-alert">
              {walletError}
            </p>
          )}
        </div>
      </header>

      <section className="mb-10 space-y-4 rounded-lg border border-line bg-surface p-6">
        <h2 className="font-mono text-xs uppercase tracking-wide text-muted">
          Check price deviation
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="onchain"
              className="mb-1 block text-xs text-muted"
            >
              On-chain aggregated price (USD)
            </label>
            <input
              id="onchain"
              value={onChainPrice}
              onChange={(e) => setOnChainPrice(e.target.value)}
              className="w-full rounded-md border border-line bg-base px-3 py-2 font-mono text-sm text-ink focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="spot" className="mb-1 block text-xs text-muted">
              Real spot XAUUSD (USD)
            </label>
            <input
              id="spot"
              value={spotPrice}
              onChange={(e) => setSpotPrice(e.target.value)}
              className="w-full rounded-md border border-line bg-base px-3 py-2 font-mono text-sm text-ink focus:border-accent focus:outline-none"
            />
          </div>
        </div>
        <button
          onClick={handleReconcile}
          disabled={loading}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-base disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Checking..." : "Check deviation"}
        </button>
        {error && <p className="font-mono text-sm deviation-alert">{error}</p>}
      </section>

      {loading ? (
        <section className="mb-10">
          <ReconciliationCardSkeleton />
        </section>
      ) : (
        report && (
          <section className="mb-10">
            <ReconciliationCard report={report} />
          </section>
        )
      )}

      <section>
        <h2 className="mb-3 font-mono text-xs uppercase tracking-wide text-muted">
          Example position
        </h2>
        <PositionCard
          position={DEMO_POSITION}
          minRatioBps={MIN_RATIO_BPS}
          liquidationThresholdBps={LIQUIDATION_THRESHOLD_BPS}
        />
      </section>
    </main>
  );
}
