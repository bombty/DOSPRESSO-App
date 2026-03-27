import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface CompactKPIItem {
  label: string;
  value: string | number | null | undefined;
  icon?: ReactNode;
  color?: "success" | "warning" | "danger" | "info" | "muted" | "default";
  onClick?: () => void;
  suffix?: string;
  "data-testid"?: string;
}

interface CompactKPIProps {
  items: CompactKPIItem[];
  className?: string;
}

const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  success: {
    bg: "rgba(39, 174, 96, 0.1)",
    text: "var(--dospresso-green, #27ae60)",
    border: "rgba(39, 174, 96, 0.25)",
  },
  warning: {
    bg: "rgba(212, 168, 75, 0.1)",
    text: "var(--dospresso-amber, #d4a84b)",
    border: "rgba(212, 168, 75, 0.25)",
  },
  danger: {
    bg: "rgba(192, 57, 43, 0.1)",
    text: "var(--dospresso-red, #c0392b)",
    border: "rgba(192, 57, 43, 0.25)",
  },
  info: {
    bg: "rgba(41, 128, 185, 0.1)",
    text: "var(--dospresso-blue, #2980b9)",
    border: "rgba(41, 128, 185, 0.25)",
  },
  muted: {
    bg: "rgba(138, 125, 109, 0.08)",
    text: "var(--dospresso-bej-muted, #8a7d6d)",
    border: "rgba(138, 125, 109, 0.2)",
  },
  default: {
    bg: "rgba(242, 230, 208, 0.05)",
    text: "var(--dospresso-bej, #f2e6d0)",
    border: "var(--dospresso-border, #1e3250)",
  },
};

function displayVal(v: CompactKPIItem["value"], suffix?: string): string {
  if (v == null || v === "") return "—";
  return suffix ? `${v}${suffix}` : String(v);
}

export function CompactKPI({ items, className }: CompactKPIProps) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)} data-testid="compact-kpi-strip">
      {items.map((item, idx) => {
        const colors = COLOR_MAP[item.color || "default"];
        return (
          <button
            key={idx}
            type="button"
            onClick={item.onClick}
            disabled={!item.onClick}
            data-testid={item["data-testid"] || `compact-kpi-${idx}`}
            className={cn(
              "inline-flex items-center gap-1 h-7 px-2 rounded-md border text-[11px] whitespace-nowrap transition-opacity duration-150",
              item.onClick ? "cursor-pointer hover:opacity-80" : "cursor-default"
            )}
            style={{
              backgroundColor: colors.bg,
              borderColor: colors.border,
            }}
          >
            {item.icon && (
              <span className="flex-shrink-0 w-3.5 h-3.5 flex items-center justify-center" style={{ color: colors.text }}>
                {item.icon}
              </span>
            )}
            <span className="font-bold tabular-nums" style={{ color: colors.text }}>
              {displayVal(item.value, item.suffix)}
            </span>
            <span style={{ color: "var(--dospresso-bej-mid, #c8b698)" }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
