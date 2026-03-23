import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface KPIMetric {
  label: string;
  value: string | number;
  color?: string;
  icon?: React.ReactNode;
}

interface KPIStripProps {
  metrics: KPIMetric[];
  isLoading?: boolean;
}

export function KPIStrip({ metrics, isLoading }: KPIStripProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[72px] rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4" data-testid="kpi-strip">
      {metrics.map((m, idx) => (
        <div
          key={idx}
          className="bg-muted/30 rounded-lg p-3 text-center border border-border/40"
          data-testid={`kpi-metric-${idx}`}
        >
          <div className="flex items-center justify-center gap-1.5">
            {m.icon && <span className="text-muted-foreground">{m.icon}</span>}
            <span className={cn("text-xl font-semibold", m.color || "text-foreground")}>
              {m.value}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1 truncate">{m.label}</div>
        </div>
      ))}
    </div>
  );
}
