import { Card, CardContent } from "@/components/ui/card";

export interface KPIItem {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  color?: "default" | "danger" | "warning" | "success" | "info" | "muted";
  onClick?: () => void;
  active?: boolean;
  testId?: string;
  subtitle?: string | React.ReactNode;
}

interface CompactKPIStripProps {
  items: KPIItem[];
  desktopColumns?: 2 | 3 | 4 | 5;
  className?: string;
  desktopRenderer?: React.ReactNode;
}

const colorMap: Record<string, string> = {
  default: "border-l-border",
  danger: "border-l-destructive",
  warning: "border-l-warning",
  success: "border-l-success",
  info: "border-l-primary",
  muted: "border-l-muted-foreground/40",
};

const valueFgMap: Record<string, string> = {
  default: "",
  danger: "text-destructive",
  warning: "text-warning",
  success: "text-success",
  info: "text-primary",
  muted: "text-muted-foreground",
};

export function CompactKPIStrip({
  items,
  desktopColumns = 4,
  className = "",
  desktopRenderer,
}: CompactKPIStripProps) {
  const colsClass: Record<number, string> = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
    5: "md:grid-cols-5",
  };

  return (
    <>
      <div
        className={`flex md:hidden gap-2 overflow-x-auto pb-1 scrollbar-hidden snap-x snap-mandatory ${className}`}
        data-testid="compact-kpi-strip-mobile"
      >
        {items.map((item, idx) => {
          const clr = item.color || "default";
          return (
            <div
              key={idx}
              className={`snap-start min-w-[110px] max-w-[160px] flex-shrink-0 h-14 rounded-lg border border-l-[3px] ${colorMap[clr]} bg-card flex items-center gap-2 px-3 ${item.onClick ? "cursor-pointer hover-elevate" : ""} ${item.active ? "ring-2 ring-primary" : ""}`}
              onClick={item.onClick}
              data-testid={item.testId ? `${item.testId}-mobile` : `kpi-item-${idx}`}
            >
              {item.icon && (
                <div className="flex-shrink-0">{item.icon}</div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-muted-foreground truncate leading-tight">
                  {item.label}
                </span>
                <span className={`text-sm font-bold leading-tight ${valueFgMap[clr]}`}>
                  {item.value}
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

      {desktopRenderer ? (
        <div className="hidden md:block">{desktopRenderer}</div>
      ) : (
        <div
          className={`hidden md:grid ${colsClass[desktopColumns] || "md:grid-cols-4"} gap-2 sm:gap-3 ${className}`}
          data-testid="compact-kpi-strip-desktop"
        >
          {items.map((item, idx) => {
            const clr = item.color || "default";
            return (
              <Card
                key={idx}
                className={`${item.onClick ? "cursor-pointer hover-elevate" : ""} ${item.active ? "ring-2 ring-primary" : ""} ${clr === "danger" ? "border-destructive/30 dark:border-destructive/40" : ""}`}
                onClick={item.onClick}
                data-testid={item.testId || `kpi-card-${idx}`}
              >
                <CardContent className="p-3">
                  <div className="flex flex-col items-center text-center gap-1">
                    {item.icon && <div className="flex-shrink-0">{item.icon}</div>}
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className={`text-lg font-bold ${valueFgMap[clr]}`}>{item.value}</p>
                    {item.subtitle && (
                      <div className="text-xs text-muted-foreground">{item.subtitle}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
