import type { ReactNode } from "react";

interface WidgetGridProps {
  columns?: 2 | 3;
  children: ReactNode;
}

export function WidgetGrid({ columns = 3, children }: WidgetGridProps) {
  return (
    <div
      data-testid="widget-grid"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: "var(--ds-gap-md)",
      }}
    >
      {children}
    </div>
  );
}
