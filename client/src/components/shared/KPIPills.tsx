import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export interface KPIPill {
  label: string;
  value: number | string;
  color?: "danger" | "warning" | "success" | "info" | "default";
  onClick?: () => void;
  active?: boolean;
}

interface KPIPillsProps {
  pills: KPIPill[];
  className?: string;
}

const COLOR_MAP: Record<string, string> = {
  danger: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  info: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  default: "bg-muted text-muted-foreground border-border",
};

const ACTIVE_COLOR_MAP: Record<string, string> = {
  danger: "bg-red-500 text-white border-red-600",
  warning: "bg-amber-500 text-white border-amber-600",
  success: "bg-emerald-500 text-white border-emerald-600",
  info: "bg-blue-500 text-white border-blue-600",
  default: "bg-primary text-primary-foreground border-primary",
};

export function KPIPills({ pills, className }: KPIPillsProps) {
  if (pills.length === 0) return null;

  return (
    <ScrollArea className={cn("w-full", className)} data-testid="kpi-pills">
      <div className="flex items-center gap-1.5 pb-1">
        {pills.map((pill, i) => {
          const colorClass = pill.active
            ? ACTIVE_COLOR_MAP[pill.color || "default"]
            : COLOR_MAP[pill.color || "default"];

          return (
            <button
              key={i}
              onClick={pill.onClick}
              disabled={!pill.onClick}
              data-testid={`kpi-pill-${i}`}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium whitespace-nowrap transition-all duration-150",
                colorClass,
                pill.onClick && "cursor-pointer hover:opacity-80",
                !pill.onClick && "cursor-default"
              )}
            >
              <span>{pill.label}:</span>
              <span className="font-bold">{pill.value}</span>
            </button>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
