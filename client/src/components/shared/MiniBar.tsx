import { cn } from "@/lib/utils";

interface MiniBarProps {
  value: number;
  max?: number;
  width?: number;
  height?: number;
  showLabel?: boolean;
  className?: string;
  color?: string;
  autoColor?: boolean;
  "data-testid"?: string;
}

function getBarColor(pct: number): string {
  if (pct >= 80) return "var(--dospresso-green, #22c55e)";
  if (pct >= 50) return "var(--dospresso-amber, #fbbf24)";
  return "var(--dospresso-red, #ef4444)";
}

export function MiniBar({
  value,
  max = 100,
  width = 40,
  height = 6,
  showLabel = false,
  className,
  color,
  autoColor = true,
  "data-testid": testId,
}: MiniBarProps) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  const barColor = color || (autoColor ? getBarColor(pct) : "var(--dospresso-red, #ef4444)");

  return (
    <div className={cn("flex items-center gap-1.5", className)} data-testid={testId}>
      <div
        className="rounded-full overflow-hidden flex-shrink-0"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          backgroundColor: "var(--dospresso-border, #1e2530)",
        }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            backgroundColor: barColor,
            transition: "width 0.3s ease",
          }}
        />
      </div>
      {showLabel && (
        <span className="text-[9px] font-medium tabular-nums" style={{ color: "var(--dospresso-bej-mid, #a0aab8)" }}>
          {pct}%
        </span>
      )}
    </div>
  );
}
