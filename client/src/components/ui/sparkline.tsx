interface SparklineProps {
  data: number[];
  height?: number;
}

export function Sparkline({ data, height = 12 }: SparklineProps) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  const lastTwo = data.slice(-2);
  const trend = lastTwo.length >= 2
    ? lastTwo[1] > lastTwo[0] ? "up" : lastTwo[1] < lastTwo[0] ? "down" : "stable"
    : "stable";
  const color = trend === "up"
    ? "var(--dospresso-green, #22c55e)"
    : trend === "down"
      ? "var(--dospresso-red-light, #f87171)"
      : "var(--dospresso-bej-muted, #6b7a8d)";

  return (
    <span className="inline-flex items-end gap-px" style={{ height }} data-testid="sparkline">
      {data.map((v, i) => (
        <span
          key={i}
          className="rounded-sm"
          style={{
            width: 2,
            height: Math.max(1, (v / max) * height),
            background: color,
            display: "block",
          }}
        />
      ))}
    </span>
  );
}
