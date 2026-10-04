"use client";

import { useState } from "react";
import type { ConnectedWallet } from "@/components/WalletConnect";
import { mint, parseContractError, stellarExpertTxUrl } from "@/lib/contract";

export interface MintFormProps {
  wallet: ConnectedWallet | null;
  isTestnet?: boolean;
}

export function MintForm({ wallet, isTestnet = true }: MintFormProps) {
  const [collateralAmount, setCollateralAmount] = useState("3000");
  const [mintAmount, setMintAmount] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const isWalletConnected = !!wallet;
  const isSubmitDisabled = !isWalletConnected || !isTestnet || loading || !collateralAmount || !mintAmount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet) {
      setError("Please connect a wallet first.");
      return;
    }
    if (!isTestnet) {
      setError("Minting is only supported on Stellar Testnet.");
      return;
    }

    setLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const result = await mint(wallet, collateralAmount, mintAmount);
      setTxHash(result.hash);
    } catch (err) {
      setError(parseContractError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold uppercase tracking-[0.15em] text-ink">
          Mint sXAU
        </h3>
        <span className="rounded-full border border-line bg-base px-2.5 py-0.5 font-mono text-[10px] text-muted">
          Deposit Collateral
        </span>
      </div>

      {!isTestnet && (
        <div className="rounded-md border border-critical/30 bg-critical/10 p-3 text-xs text-critical">
          ⚠️ Aurum is only deployed on Stellar Testnet. Please switch your wallet network to Testnet to mint.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="mint-collateral" className="mb-1.5 block text-xs text-muted">
            Collateral amount to lock (USD)
          </label>
          <input
            id="mint-collateral"
            type="number"
            min="0"
            step="any"
            placeholder="3000"
            value={collateralAmount}
            onChange={(e) => setCollateralAmount(e.target.value)}
            disabled={!isWalletConnected || loading}
            className="w-full rounded-md border border-line bg-base px-3 py-2.5 font-mono text-sm tabular-nums text-ink focus:border-gold focus:outline-none disabled:opacity-50"
          />
        </div>

        <div>
          <label htmlFor="mint-amount" className="mb-1.5 block text-xs text-muted">
            sXAU to mint
          </label>
          <input
            id="mint-amount"
            type="number"
            min="0"
            step="any"
            placeholder="1"
            value={mintAmount}
            onChange={(e) => setMintAmount(e.target.value)}
            disabled={!isWalletConnected || loading}
            className="w-full rounded-md border border-line bg-base px-3 py-2.5 font-mono text-sm tabular-nums text-ink focus:border-gold focus:outline-none disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="w-full rounded-md bg-gold px-4 py-2.5 font-display text-sm font-semibold text-base transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {!isWalletConnected
            ? "Connect wallet to mint"
            : !isTestnet
            ? "Testnet only"
            : loading
            ? "Signing & submitting transaction…"
            : "Mint sXAU"}
        </button>
      </form>

      {error && (
        <div className="rounded-md border border-critical/30 bg-critical/10 p-3 font-display text-xs text-critical">
          {error}
        </div>
      )}

      {txHash && (
        <div className="rounded-md border border-gold/30 bg-gold/10 p-3 space-y-1.5 text-xs">
          <p className="font-semibold text-ink">Transaction submitted successfully!</p>
          <div className="flex items-center gap-1.5 font-mono text-muted">
            <span>Tx:</span>
            <a
              href={stellarExpertTxUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold underline hover:opacity-80 break-all"
            >
              {txHash} ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
