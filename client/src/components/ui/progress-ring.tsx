import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ProgressRingProps {
  value?: number;
  progress?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  showPercentage?: boolean;
  label?: string;
  className?: string;
  children?: ReactNode;
}

export function ProgressRing({
  value,
  progress,
  size = 32,
  strokeWidth = 3,
  color,
  showPercentage,
  label,
  className,
  children,
}: ProgressRingProps) {
  const pct = Math.max(0, Math.min(100, value ?? progress ?? 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  const autoColor = color
    ? color
    : pct >= 75
      ? "var(--dospresso-green, #27ae60)"
      : pct >= 50
        ? "var(--dospresso-amber, #d4a84b)"
        : "var(--dospresso-red-light, #e74c3c)";

  return (
    <div
      className={cn("relative inline-flex items-center justify-center flex-shrink-0", className)}
      style={{ width: size, height: size }}
      data-testid="progress-ring"
    >
      <svg width={size} height={size} className="progress-ring">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-muted"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={autoColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="progress-ring-circle"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showPercentage && (
          <span className="font-bold text-foreground" style={{ fontSize: size > 60 ? 18 : size > 40 ? 12 : 8 }}>
            {Math.round(pct)}%
          </span>
        )}
        {label && (
          <span className="text-[10px] text-muted-foreground mt-0.5">{label}</span>
        )}
        {children && (
          <span className="font-bold" style={{ fontSize: 8, color: autoColor }}>
            {children}
          </span>
        )}
      </div>
    </div>
  );
}
