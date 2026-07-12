import type { PositionHistoryPoint } from "@/lib/types";

interface PositionHistoryChartProps {
  points: PositionHistoryPoint[];
  minRatioBps: number;
  liquidationThresholdBps: number;
}

const CHART_WIDTH = 720;
const CHART_HEIGHT = 240;
const PADDING = { top: 20, right: 20, bottom: 36, left: 52 };

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function formatRatioLabel(bps: number) {
  return `${(bps / 100).toFixed(1)}%`;
}

function formatPointDate(ts: string) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function PositionHistoryChart({
  points,
  minRatioBps,
  liquidationThresholdBps,
}: PositionHistoryChartProps) {
  const validPoints = points.filter((point) => point.collateral_ratio_bps !== null);

  if (validPoints.length < 2) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6">
        <p className="font-display text-xs font-medium uppercase tracking-[0.2em] text-muted">
          Position history
        </p>
        <p className="mt-3 text-sm text-muted">
          Not enough historical data to render the collateral ratio chart yet.
        </p>
      </div>
    );
  }

  const ratios = validPoints.map((point) => point.collateral_ratio_bps as number);
  const domainMin = Math.min(...ratios, liquidationThresholdBps);
  const domainMax = Math.max(...ratios, minRatioBps);
  const span = Math.max(1, domainMax - domainMin);
  const paddedMin = Math.max(0, domainMin - span * 0.12);
  const paddedMax = domainMax + span * 0.12;

  const innerWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const xForIndex = (index: number) =>
    PADDING.left + (index / (validPoints.length - 1)) * innerWidth;
  const yForRatio = (ratioBps: number) => {
    const ratio = (ratioBps - paddedMin) / (paddedMax - paddedMin || 1);
    return clamp(PADDING.top + innerHeight - ratio * innerHeight, PADDING.top, PADDING.top + innerHeight);
  };

  const trendPath = validPoints
    .map((point, index) => {
      const x = xForIndex(index);
      const y = yForRatio(point.collateral_ratio_bps as number);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const minLineY = yForRatio(minRatioBps);
  const liquidationLineY = yForRatio(liquidationThresholdBps);

  return (
    <div className="rounded-xl border border-line bg-surface p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-display text-xs font-medium uppercase tracking-[0.2em] text-muted">
          Position history
        </p>
        <p className="font-mono text-xs text-muted">Collateral ratio over time</p>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="h-auto min-w-[640px] w-full"
          role="img"
          aria-label="Collateral ratio history chart"
        >
          <line
            x1={PADDING.left}
            y1={PADDING.top + innerHeight}
            x2={PADDING.left + innerWidth}
            y2={PADDING.top + innerHeight}
            stroke="#2A2016"
            strokeWidth="1"
          />

          <line
            x1={PADDING.left}
            y1={minLineY}
            x2={PADDING.left + innerWidth}
            y2={minLineY}
            stroke="#E8A33D"
            strokeWidth="1"
            strokeDasharray="6 4"
          />
          <line
            x1={PADDING.left}
            y1={liquidationLineY}
            x2={PADDING.left + innerWidth}
            y2={liquidationLineY}
            stroke="#E2574C"
            strokeWidth="1"
            strokeDasharray="6 4"
          />

          <path d={trendPath} fill="none" stroke="#D4AF37" strokeWidth="3" />

          {validPoints.map((point, index) => {
            const x = xForIndex(index);
            const y = yForRatio(point.collateral_ratio_bps as number);
            return <circle key={point.timestamp} cx={x} cy={y} r="4" fill="#3DDC97" />;
          })}

          <text
            x={PADDING.left + 4}
            y={minLineY - 6}
            fill="#E8A33D"
            fontSize="11"
            style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}
          >
            Target {formatRatioLabel(minRatioBps)}
          </text>
          <text
            x={PADDING.left + 4}
            y={liquidationLineY - 6}
            fill="#E2574C"
            fontSize="11"
            style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}
          >
            Liquidation {formatRatioLabel(liquidationThresholdBps)}
          </text>

          <text
            x={PADDING.left}
            y={PADDING.top + innerHeight + 22}
            fill="#9C9183"
            fontSize="11"
            style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}
          >
            {formatPointDate(validPoints[0].timestamp)}
          </text>
          <text
            x={PADDING.left + innerWidth}
            y={PADDING.top + innerHeight + 22}
            textAnchor="end"
            fill="#9C9183"
            fontSize="11"
            style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}
          >
            {formatPointDate(validPoints[validPoints.length - 1].timestamp)}
          </text>
        </svg>
      </div>
    </div>
  );
}