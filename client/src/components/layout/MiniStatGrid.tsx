interface MiniStat {
  value: string | number;
  label: string;
  color: string;
}

interface MiniStatGridProps {
  items: MiniStat[];
  columns?: 2 | 3 | 4;
}

export function MiniStatGrid({ items, columns = 2 }: MiniStatGridProps) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: "var(--ds-gap-xs)",
    }}>
      {items.map((item, idx) => (
        <div
          key={idx}
          style={{
            background: "var(--ds-bg-widget-inner)",
            borderRadius: 6,
            padding: "6px 8px",
            textAlign: "center",
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
            fontSize: "var(--ds-font-tiny)",
            color: "var(--ds-text-secondary)",
            marginTop: 1,
          }}>
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}

interface ProgressBarProps {
  label: string;
  value: number;
  color: string;
}

export function ProgressBar({ label, value, color }: ProgressBarProps) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 6,
      marginTop: 4,
    }}>
      <span style={{
        fontSize: "var(--ds-font-small)",
        color: "var(--ds-text-secondary)",
        minWidth: 50,
      }}>
        {label}
      </span>
      <div style={{
        flex: 1,
        height: 5,
        background: "var(--ds-border)",
        borderRadius: 3,
        overflow: "hidden",
      }}>
        <div style={{
          width: `${Math.min(value, 100)}%`,
          height: "100%",
          borderRadius: 3,
          background: color,
          transition: "width 0.3s ease",
        }} />
      </div>
      <span style={{
        fontSize: "var(--ds-font-tiny)",
        color: "var(--ds-text-secondary)",
        minWidth: 30,
        textAlign: "right",
      }}>
        %{value}
      </span>
    </div>
  );
}

interface AlertBoxProps {
  message: string;
  color?: string;
}

export function AlertBox({ message, color = "var(--ds-red-light)" }: AlertBoxProps) {
  return (
    <div style={{
      background: "rgba(180,42,42,0.10)",
      borderLeft: `3px solid ${color}`,
      borderRadius: "0 6px 6px 0",
      padding: "5px 10px",
      marginTop: 6,
      fontSize: "var(--ds-font-small)",
      color: color,
    }}>
      {message}
    </div>
  );
}
