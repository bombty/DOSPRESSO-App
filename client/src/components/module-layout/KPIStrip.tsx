import { UnifiedKPI, type KPIItem } from "@/components/shared/UnifiedKPI";
import type { SemanticColor } from "@/lib/design-tokens";

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

const COLOR_TO_SEMANTIC: Record<string, SemanticColor> = {
  "text-red-500": "danger",
  "text-amber-500": "warning",
  "text-green-600 dark:text-green-400": "success",
  "text-blue-500": "info",
  "text-foreground": "default",
};

function resolveSemanticColor(color?: string): SemanticColor {
  if (!color) return "default";
  return COLOR_TO_SEMANTIC[color] || "default";
}

export function KPIStrip({ metrics, isLoading, variant = "pill" }: KPIStripProps) {
  const items: KPIItem[] = metrics.map((m) => ({
    label: m.label,
    value: m.value,
    color: resolveSemanticColor(m.color),
    icon: m.icon,
    onClick: m.onClick,
    active: m.active,
  }));

  return (
    <UnifiedKPI
      items={items}
      variant={variant}
      isLoading={isLoading}
    />
  );
}
