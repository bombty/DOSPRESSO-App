import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  type SemanticColor,
  type KPIVariant,
  COLORS,
  BORDER_COLORS,
  PILL_SEMANTIC,
} from "@/lib/design-tokens";

export interface KPIItem {
  label: string;
  value: string | number | null | undefined;
  color?: SemanticColor;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  onClick?: () => void;
  suffix?: string;
  active?: boolean;
  testId?: string;
  subtitle?: string | React.ReactNode;
}

interface UnifiedKPIProps {
  items: KPIItem[];
  variant?: KPIVariant;
  isLoading?: boolean;
  className?: string;
  desktopColumns?: 2 | 3 | 4 | 5 | 6;
  desktopGridClass?: string;
  desktopRenderer?: React.ReactNode;
}

function displayValue(value: KPIItem["value"], suffix?: string): string {
  if (value == null || value === "") return "—";
  const str = String(value);
  return suffix ? `${str}${suffix}` : str;
}

function PillView({ items, className }: { items: KPIItem[]; className?: string }) {
  return (
    <ScrollArea className={cn("w-full mb-3", className)} data-testid="unified-kpi-pills">
      <div className="flex items-center gap-1.5 pb-1">
        {items.map((item, idx) => {
          const colorClass = item.active
            ? "bg-primary text-primary-foreground border-primary"
            : PILL_SEMANTIC[item.color || "default"];
          return (
            <button
              key={idx}
              onClick={item.onClick}
              disabled={!item.onClick}
              data-testid={item.testId || `kpi-pill-${idx}`}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium whitespace-nowrap transition-all duration-150",
                colorClass,
                item.onClick && "cursor-pointer hover:opacity-80",
                !item.onClick && "cursor-default"
              )}
            >
              {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
              <span>{item.label}:</span>
              <span className="font-bold">{displayValue(item.value, item.suffix)}</span>
            </button>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

function CardView({ items, className }: { items: KPIItem[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-3 mb-4", className)} data-testid="unified-kpi-cards">
      {items.map((item, idx) => (
        <div
          key={idx}
          className={cn(
            "bg-muted/30 rounded-lg p-3 text-center border border-border/40",
            item.onClick && "cursor-pointer hover-elevate"
          )}
          onClick={item.onClick}
          data-testid={item.testId || `kpi-card-${idx}`}
        >
          <div className="flex items-center justify-center gap-1.5">
            {item.icon && <span className="text-muted-foreground">{item.icon}</span>}
            <span className={cn("text-xl font-bold tabular-nums", COLORS[item.color || "default"])}>
              {displayValue(item.value, item.suffix)}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1 truncate">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

function CompactView({ items, desktopColumns = 4, desktopGridClass, className }: {
  items: KPIItem[];
  desktopColumns?: number;
  desktopGridClass?: string;
  className?: string;
}) {
  const colsClass: Record<number, string> = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
    5: "md:grid-cols-5",
    6: "md:grid-cols-6",
  };
  const gridClass = desktopGridClass || colsClass[desktopColumns] || "md:grid-cols-4";

  return (
    <>
      <div
        className={cn("flex md:hidden gap-2 overflow-x-auto pb-1 scrollbar-hidden snap-x snap-mandatory", className)}
        data-testid="unified-kpi-compact-mobile"
      >
        {items.map((item, idx) => {
          const clr = item.color || "default";
          return (
            <div
              key={idx}
              className={cn(
                "snap-start min-w-[110px] max-w-[160px] flex-shrink-0 h-14 rounded-lg border bg-card flex items-center gap-2 px-3",
                `border-l-[3px] ${BORDER_COLORS[clr]}`,
                item.onClick && "cursor-pointer hover-elevate",
                item.active && "ring-2 ring-primary"
              )}
              onClick={item.onClick}
              data-testid={item.testId ? `${item.testId}-mobile` : `kpi-compact-${idx}`}
            >
              {item.icon && <div className="flex-shrink-0">{item.icon}</div>}
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-muted-foreground truncate leading-tight">
                  {item.label}
                </span>
                <span className={cn("text-sm font-bold leading-tight", COLORS[clr])}>
                  {displayValue(item.value, item.suffix)}
                </span>
                {item.subtitle && (
                  <span className="text-[9px] text-muted-foreground truncate leading-tight">
                    {item.subtitle}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div
        className={cn("hidden md:grid gap-2 sm:gap-3", gridClass, className)}
        data-testid="unified-kpi-compact-desktop"
      >
        {items.map((item, idx) => {
          const clr = item.color || "default";
          return (
            <Card
              key={idx}
              className={cn(
                item.onClick && "cursor-pointer hover-elevate",
                item.active && "ring-2 ring-primary",
                clr === "danger" && "border-destructive/30 dark:border-destructive/40"
              )}
              onClick={item.onClick}
              data-testid={item.testId || `kpi-compact-card-${idx}`}
            >
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center gap-1">
                  {item.icon && <div className="flex-shrink-0">{item.icon}</div>}
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className={cn("text-lg font-bold tabular-nums", COLORS[clr])}>
                    {displayValue(item.value, item.suffix)}
                  </p>
                  {item.subtitle && (
                    <div className="text-xs text-muted-foreground">{item.subtitle}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

function LoadingSkeleton({ variant }: { variant: KPIVariant }) {
  if (variant === "pill") {
    return (
      <div className="flex items-center gap-2 mb-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
    );
  }
  if (variant === "card") {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[72px] rounded-lg" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Skeleton key={i} className="h-14 rounded-lg" />
      ))}
    </div>
  );
}

export function UnifiedKPI({
  items,
  variant = "compact",
  isLoading,
  className,
  desktopColumns,
  desktopGridClass,
  desktopRenderer,
}: UnifiedKPIProps) {
  if (isLoading) return <LoadingSkeleton variant={variant} />;

  if (desktopRenderer && variant === "compact") {
    return (
      <>
        <div className="md:hidden">
          <CompactView items={items} desktopColumns={desktopColumns} desktopGridClass={desktopGridClass} className={className} />
        </div>
        <div className="hidden md:block">{desktopRenderer}</div>
      </>
    );
  }

  switch (variant) {
    case "pill":
      return <PillView items={items} className={className} />;
    case "card":
      return <CardView items={items} className={className} />;
    case "compact":
      return <CompactView items={items} desktopColumns={desktopColumns} desktopGridClass={desktopGridClass} className={className} />;
    default:
      return <CompactView items={items} desktopColumns={desktopColumns} desktopGridClass={desktopGridClass} className={className} />;
  }
}

export { UnifiedKPI as CompactKPIStrip };
