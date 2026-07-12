import type { PositionSummary } from "@/lib/types";

interface PositionCardProps {
  position: PositionSummary;
  minRatioBps: number;
  liquidationThresholdBps: number;
  /** When provided (and debt_xau > 0), the ratio is recomputed live from
   * this price instead of the static position.collateral_ratio_bps —
   * mirrors contract/synthetic-xau/src/pricing.rs's collateral_ratio_bps. */
  spotPriceUsd?: number;
}

function statusFor(
  ratioBps: number | null,
  minRatioBps: number,
  liquidationThresholdBps: number,
): { label: string; className: string; dotClassName: string } {
  if (ratioBps === null)
    return { label: "No debt", className: "text-muted", dotClassName: "bg-muted" };
  if (ratioBps < liquidationThresholdBps)
    return {
      label: "At risk of liquidation",
      className: "text-critical",
      dotClassName: "bg-critical animate-pulse-glow",
    };
  if (ratioBps < minRatioBps)
    return { label: "Below target ratio", className: "text-warn", dotClassName: "bg-warn" };
  return { label: "Healthy", className: "text-signal", dotClassName: "bg-signal" };
}

export function PositionCard({
  position,
  minRatioBps,
  liquidationThresholdBps,
  spotPriceUsd,
}: PositionCardProps) {
  const isLive = typeof spotPriceUsd === "number" && spotPriceUsd > 0 && position.debt_xau > 0;
  const ratioBps = isLive
    ? Math.round((position.collateral_usd / (position.debt_xau * spotPriceUsd!)) * 10_000)
    : position.collateral_ratio_bps;

  const status = statusFor(ratioBps, minRatioBps, liquidationThresholdBps);

  return (
    <div className="rounded-xl border border-line bg-surface p-6">
      <div className="flex items-center justify-between">
        <p className="font-display text-xs font-medium uppercase tracking-[0.2em] text-muted">
          Position
        </p>
        {isLive && (
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-signal animate-pulse" />
            live
          </span>
        )}
      </div>
      <p className="mt-1 truncate font-mono text-sm text-muted">{position.address}</p>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <p className="font-display text-xs text-muted">Collateral</p>
          <p className="mt-1 font-mono text-xl font-medium tabular-nums text-ink">
            ${position.collateral_usd.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="font-display text-xs text-muted">Debt (sXAU)</p>
          <p className="mt-1 font-mono text-xl font-medium tabular-nums text-ink">
            {position.debt_xau}
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between border-t border-line pt-5">
        <div>
          <p className="font-mono text-2xl font-semibold tabular-nums text-ink">
            {ratioBps !== null ? `${(ratioBps / 100).toFixed(1)}%` : "—"}
          </p>
          {isLive && (
            <p className="mt-0.5 font-mono text-[10px] text-muted">
              @ ${spotPriceUsd!.toFixed(2)}/oz
            </p>
          )}
        </div>
        <p
          className={`flex items-center gap-1.5 font-display text-xs font-medium ${status.className}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${status.dotClassName}`} />
          {status.label}
        </p>
      </div>
    </div>
  );
}
