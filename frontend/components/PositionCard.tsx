import type { PositionSummary } from "@/lib/types";

interface PositionCardProps {
  position: PositionSummary;
  minRatioBps: number;
  liquidationThresholdBps: number;
}

function statusFor(
  ratioBps: number | null,
  minRatioBps: number,
  liquidationThresholdBps: number,
): { label: string; className: string } {
  if (ratioBps === null) return { label: "No debt", className: "text-muted" };
  if (ratioBps < liquidationThresholdBps)
    return { label: "At risk of liquidation", className: "deviation-alert" };
  if (ratioBps < minRatioBps)
    return { label: "Below target ratio", className: "text-warn" };
  return { label: "Healthy", className: "deviation-ok" };
}

export function PositionCard({
  position,
  minRatioBps,
  liquidationThresholdBps,
}: PositionCardProps) {
  const status = statusFor(
    position.collateral_ratio_bps,
    minRatioBps,
    liquidationThresholdBps,
  );

  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <p className="font-mono text-xs uppercase tracking-wide text-muted">
        Position
      </p>
      <p className="mt-1 truncate font-mono text-sm text-ink">
        {position.address}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted">Collateral</p>
          <p className="font-mono text-lg text-ink">
            ${position.collateral_usd.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">Debt (sXAU)</p>
          <p className="font-mono text-lg text-ink">{position.debt_xau}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
        <p className="text-sm text-muted">
          {position.collateral_ratio_bps !== null
            ? `${(position.collateral_ratio_bps / 100).toFixed(1)}%`
            : "—"}
        </p>
        <p className={`font-mono text-xs font-medium ${status.className}`}>
          {status.label}
        </p>
      </div>
    </div>
  );
}
