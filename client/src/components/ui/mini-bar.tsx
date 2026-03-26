interface MiniBarProps {
  value: number;
  width?: number;
}

export function MiniBar({ value, width = 40 }: MiniBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const color = clamped >= 80
    ? "var(--dospresso-green, #27ae60)"
    : clamped >= 60
      ? "var(--dospresso-amber, #d4a84b)"
      : "var(--dospresso-red-light, #e74c3c)";

  return (
    <span
      className="inline-block rounded-sm overflow-hidden"
      style={{ width, height: 3, background: "var(--dospresso-bg3, #152640)" }}
      data-testid="mini-bar"
    >
      <span
        className="block h-full rounded-sm transition-all duration-300"
        style={{ width: `${clamped}%`, background: color }}
      />
    </span>
  );
}
