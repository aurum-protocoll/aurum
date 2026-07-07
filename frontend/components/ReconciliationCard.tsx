import type { ReconciliationReport } from "@/lib/types";

const SESSION_LABEL: Record<ReconciliationReport["trading_session"], string> = {
  asia: "Asia session",
  london: "London session",
  new_york: "New York session",
  off_hours: "Off-hours",
};

interface ReconciliationCardProps {
  report: ReconciliationReport;
}

export function ReconciliationCard({ report }: ReconciliationCardProps) {
  const deviationClass = report.deviation_exceeds_threshold
    ? "deviation-alert"
    : "deviation-ok";

  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-wide text-muted">
          Price reconciliation
        </p>
        <span className="font-mono text-xs text-muted">
          {SESSION_LABEL[report.trading_session]}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted">On-chain (aggregated)</p>
          <p className="font-mono text-xl text-ink">
            ${report.on_chain_price_usd.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">Spot XAUUSD</p>
          <p className="font-mono text-xl text-ink">
            ${report.spot_price_usd.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
        <p className="text-sm text-muted">Deviation</p>
        <p className={`font-mono text-sm font-medium ${deviationClass}`}>
          {report.deviation_bps.toFixed(1)} bps
          {report.deviation_exceeds_threshold ? " — above threshold" : " — normal"}
        </p>
      </div>
    </div>
  );
}

// Mirrors the layout of ReconciliationCard above so the section doesn't
// jump in height once results replace the placeholder.
export function ReconciliationCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading price reconciliation"
      className="animate-pulse rounded-lg border border-line bg-surface p-6"
    >
      <div className="flex items-center justify-between">
        <div className="h-3 w-32 rounded bg-line" />
        <div className="h-3 w-20 rounded bg-line" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <div className="h-3 w-28 rounded bg-line" />
          <div className="mt-2 h-6 w-20 rounded bg-line" />
        </div>
        <div>
          <div className="h-3 w-20 rounded bg-line" />
          <div className="mt-2 h-6 w-20 rounded bg-line" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
        <div className="h-3 w-16 rounded bg-line" />
        <div className="h-3 w-28 rounded bg-line" />
      </div>
    </div>
  );
}
