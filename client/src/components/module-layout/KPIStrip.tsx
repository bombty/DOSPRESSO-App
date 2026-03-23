import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export interface KPIMetric {
  label: string;
  value: string | number;
  color?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}

interface KPIStripProps {
  metrics: KPIMetric[];
  isLoading?: boolean;
  variant?: "card" | "pill";
}

const PILL_COLORS: Record<string, string> = {
  "text-red-500": "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  "text-amber-500": "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  "text-green-600 dark:text-green-400": "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  "text-blue-500": "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  "text-foreground": "bg-muted text-muted-foreground border-border",
};

function resolvePillColor(color?: string): string {
  if (!color) return "bg-muted text-muted-foreground border-border";
  return PILL_COLORS[color] || "bg-muted text-muted-foreground border-border";
}

export function KPIStrip({ metrics, isLoading, variant = "pill" }: KPIStripProps) {
  if (isLoading) {
    return variant === "pill" ? (
      <div className="flex items-center gap-2 mb-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
    ) : (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[72px] rounded-lg" />
        ))}
      </div>
    );
  }

  if (variant === "pill") {
    return (
      <ScrollArea className="w-full mb-3" data-testid="kpi-strip">
        <div className="flex items-center gap-1.5 pb-1">
          {metrics.map((m, idx) => {
            const colorClass = m.active
              ? "bg-primary text-primary-foreground border-primary"
              : resolvePillColor(m.color);

            return (
              <button
                key={idx}
                onClick={m.onClick}
                disabled={!m.onClick}
                data-testid={`kpi-metric-${idx}`}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium whitespace-nowrap transition-all duration-150",
                  colorClass,
                  m.onClick && "cursor-pointer hover:opacity-80",
                  !m.onClick && "cursor-default"
                )}
              >
                {m.icon && <span className="flex-shrink-0">{m.icon}</span>}
                <span>{m.label}:</span>
                <span className="font-bold">{m.value}</span>
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
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
