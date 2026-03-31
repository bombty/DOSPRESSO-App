import { cn } from "@/lib/utils";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
  "data-testid"?: string;
}

export function Sparkline({
  data,
  width = 48,
  height = 16,
  color,
  className,
  "data-testid": testId,
}: SparklineProps) {
  if (!data || data.length < 2) return null;

  const points = data.slice(-6);
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const padding = 2;

  const trend = points[points.length - 1] - points[0];
  const trendColor = color || (
    trend > 0
      ? "var(--dospresso-green, #22c55e)"
      : trend < 0
        ? "var(--dospresso-red, #ef4444)"
        : "var(--dospresso-bej-muted, #6b7a8d)"
  );

  const coords = points.map((val, i) => ({
    x: padding + (i / (points.length - 1)) * (width - padding * 2),
    y: padding + ((max - val) / range) * (height - padding * 2),
  }));

  const pathD = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("flex-shrink-0", className)}
      data-testid={testId}
    >
      <path
        d={pathD}
        fill="none"
        stroke={trendColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={coords[coords.length - 1].x}
        cy={coords[coords.length - 1].y}
        r="2"
        fill={trendColor}
      />
    </svg>
  );
}
