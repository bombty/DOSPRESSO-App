import { cn } from '@/lib/utils';

export interface KpiItem {
  value: string;
  label: string;
  color?: string;
}

interface Props {
  items: KpiItem[];
  className?: string;
}

export function DashboardKpiStrip({ items, className }: Props) {
  return (
    <div
      className={cn('grid gap-1.5', className)}
      style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, 1fr)` }}
    >
      {items.map((kpi, i) => (
        <div
          key={i}
          className="bg-card border border-border rounded-lg px-2.5 py-2 text-center"
          data-testid={`kpi-item-${i}`}
        >
          <div
            className="text-xl font-black leading-none"
            style={{ color: kpi.color ?? 'var(--foreground)' }}
          >
            {kpi.value}
          </div>
          <div className="text-[9px] text-muted-foreground mt-1 leading-tight">
            {kpi.label}
          </div>
        </div>
      ))}
    </div>
  );
}
