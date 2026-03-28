interface KPIItem {
  value: string | number;
  label: string;
  color: string;
}

interface KPIBarProps {
  items: KPIItem[];
}

export function KPIBar({ items }: KPIBarProps) {
  return (
    <div
      data-testid="kpi-bar"
      style={{
        display: "flex",
        gap: "var(--ds-gap-sm)",
        marginBottom: "var(--ds-gap-lg)",
      }}
    >
      {items.map((item, idx) => (
        <div
          key={idx}
          style={{
            background: "var(--ds-bg-card)",
            border: "var(--ds-card-border)",
            borderRadius: "var(--ds-kpi-radius)",
            padding: "var(--ds-kpi-padding)",
            textAlign: "center",
            flex: 1,
          }}
        >
          <div style={{
            fontSize: "var(--ds-font-kpi-value)",
            fontWeight: 600,
            color: item.color,
          }}>
            {item.value}
          </div>
          <div style={{
            fontSize: "var(--ds-font-kpi-label)",
            color: "var(--ds-text-secondary)",
            marginTop: 2,
          }}>
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}
