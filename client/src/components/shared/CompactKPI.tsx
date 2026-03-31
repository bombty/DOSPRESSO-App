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
    bg: "rgba(34, 197, 94, 0.08)",
    text: "var(--dospresso-green, #22c55e)",
    border: "rgba(34, 197, 94, 0.30)",
  },
  warning: {
    bg: "rgba(251, 191, 36, 0.08)",
    text: "var(--dospresso-amber, #fbbf24)",
    border: "rgba(251, 191, 36, 0.30)",
  },
  danger: {
    bg: "rgba(239, 68, 68, 0.08)",
    text: "var(--dospresso-red, #ef4444)",
    border: "rgba(239, 68, 68, 0.30)",
  },
  info: {
    bg: "rgba(96, 165, 250, 0.08)",
    text: "var(--dospresso-blue, #60a5fa)",
    border: "rgba(96, 165, 250, 0.30)",
  },
  muted: {
    bg: "rgba(107, 122, 141, 0.08)",
    text: "var(--dospresso-bej-muted, #6b7a8d)",
    border: "rgba(107, 122, 141, 0.20)",
  },
  default: {
    bg: "rgba(232, 236, 241, 0.05)",
    text: "var(--dospresso-bej, #e8ecf1)",
    border: "var(--dospresso-border, #1e2530)",
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
            <span style={{ color: "var(--dospresso-bej-mid, #a0aab8)" }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
