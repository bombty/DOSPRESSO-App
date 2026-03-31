import { cn } from "@/lib/utils";

interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  className?: string;
  autoColor?: boolean;
  color?: string;
  "data-testid"?: string;
}

function getAutoColor(pct: number): string {
  if (pct >= 80) return "var(--dospresso-green, #22c55e)";
  if (pct >= 50) return "var(--dospresso-amber, #fbbf24)";
  return "var(--dospresso-red, #ef4444)";
}

export function ProgressRing({
  value,
  max = 100,
  size = 32,
  strokeWidth = 3,
  label,
  sublabel,
  className,
  autoColor = true,
  color,
  "data-testid": testId,
}: ProgressRingProps) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const ringColor = color || (autoColor ? getAutoColor(pct) : "var(--dospresso-red, #ef4444)");

  return (
    <div className={cn("flex items-center gap-2", className)} data-testid={testId}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="flex-shrink-0 -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--dospresso-border, #1e2530)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      {(label || sublabel) && (
        <div className="min-w-0">
          {label && (
            <span className="text-xs font-bold leading-tight block truncate" style={{ color: "var(--dospresso-bej, #e8ecf1)" }}>
              {label}
            </span>
          )}
          {sublabel && (
            <span className="text-[9px] leading-tight block truncate" style={{ color: "var(--dospresso-bej-muted, #6b7a8d)" }}>
              {sublabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
