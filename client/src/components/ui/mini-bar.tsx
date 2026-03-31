interface MiniBarProps {
  value: number;
  width?: number;
}

export function MiniBar({ value, width = 40 }: MiniBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const color = clamped >= 80
    ? "var(--dospresso-green, #22c55e)"
    : clamped >= 60
      ? "var(--dospresso-amber, #fbbf24)"
      : "var(--dospresso-red-light, #f87171)";

  return (
    <span
      className="inline-block rounded-sm overflow-hidden"
      style={{ width, height: 3, background: "var(--dospresso-bg3, #1a2030)" }}
      data-testid="mini-bar"
    >
      <span
        className="block h-full rounded-sm transition-all duration-300"
        style={{ width: `${clamped}%`, background: color }}
      />
    </span>
  );
}
