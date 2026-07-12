import type { ReconciliationReport } from "@/lib/types";

const SESSION_LABEL: Record<ReconciliationReport["trading_session"], string> = {
  asia: "Asia",
  london: "London",
  new_york: "New York",
  off_hours: "Off-hours",
};

interface ReconciliationCardProps {
  report: ReconciliationReport;
  thresholdBps?: number;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function ReconciliationCard({
  report,
  thresholdBps = 50,
}: ReconciliationCardProps) {
  const alert = report.deviation_exceeds_threshold;

  // Meter scale grows past the threshold so an out-of-range deviation
  // never pins the fill at 100% and hides how far over it actually is.
  const meterMax = Math.max(thresholdBps * 4, report.deviation_bps * 1.25);
  const fillPct = clamp((report.deviation_bps / meterMax) * 100, 1.5, 100);
  const thresholdPct = clamp((thresholdBps / meterMax) * 100, 0, 100);

  return (
    <div
      className={`rounded-xl border p-6 transition-colors ${
        alert
          ? "border-critical/40 bg-surface"
          : "border-line bg-surface"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="font-display text-xs font-medium uppercase tracking-[0.2em] text-muted">
          Price reconciliation
        </p>
        <span className="rounded-full border border-line bg-base px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-muted">
          {SESSION_LABEL[report.trading_session]} at check
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <p className="font-display text-xs text-muted">On-chain (aggregated)</p>
          <p className="mt-1 font-mono text-2xl font-medium tabular-nums text-ink">
            ${report.on_chain_price_usd.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="font-display text-xs text-muted">Spot XAUUSD</p>
          <p className="mt-1 font-mono text-2xl font-medium tabular-nums text-ink">
            ${report.spot_price_usd.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <div className="flex items-baseline justify-between">
          <p className="font-display text-xs uppercase tracking-wide text-muted">
            Deviation
          </p>
          <p
            className={`font-mono text-lg font-semibold tabular-nums ${
              alert ? "text-critical" : "text-signal"
            }`}
          >
            {report.deviation_bps.toFixed(1)}{" "}
            <span className="text-xs font-normal text-muted">bps</span>
          </p>
        </div>

        {/* Deviation meter: fill carries severity, track is a lighter
            step of the same dark ramp so state reads across the whole
            bar, not just the fill color. */}
        <div className="relative mt-3">
          <div
            role="meter"
            aria-label="Price deviation in basis points"
            aria-valuenow={report.deviation_bps}
            aria-valuemin={0}
            aria-valuemax={meterMax}
            className="h-2.5 w-full overflow-hidden rounded-full bg-line"
          >
            <div
              className={`relative h-full rounded-full transition-[width] duration-500 ease-out ${
                alert ? "bg-critical animate-pulse-glow" : "bg-signal"
              }`}
              style={{ width: `${fillPct}%` }}
            >
              {alert && (
                <span className="absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-critical animate-ping-slow" />
              )}
            </div>
          </div>

          {/* Threshold tick */}
          <div
            className="absolute top-0 h-2.5 w-px bg-ink/40"
            style={{ left: `${thresholdPct}%` }}
            title={`Alert threshold: ${thresholdBps} bps`}
          />
        </div>

        <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] text-muted">
          <span>0</span>
          <span style={{ marginLeft: `${thresholdPct}%` }} className="-translate-x-1/2">
            {thresholdBps} bps threshold
          </span>
        </div>

        <p
          className={`mt-3 font-display text-xs font-medium ${
            alert ? "text-critical" : "text-signal"
          }`}
        >
          {alert
            ? "Above threshold — feeds are diverging"
            : "Within threshold — feeds agree"}
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
      className="animate-pulse rounded-xl border border-line bg-surface p-6"
    >
      <div className="flex items-center justify-between">
        <div className="h-3 w-32 rounded bg-line" />
        <div className="h-5 w-20 rounded-full bg-line" />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <div className="h-3 w-28 rounded bg-line" />
          <div className="mt-2 h-7 w-24 rounded bg-line" />
        </div>
        <div>
          <div className="h-3 w-20 rounded bg-line" />
          <div className="mt-2 h-7 w-24 rounded bg-line" />
        </div>
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <div className="flex items-center justify-between">
          <div className="h-3 w-16 rounded bg-line" />
          <div className="h-5 w-16 rounded bg-line" />
        </div>
        <div className="mt-3 h-2.5 w-full rounded-full bg-line" />
      </div>
    </div>
  );
}
