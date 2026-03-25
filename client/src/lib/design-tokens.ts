export type SemanticColor = "success" | "danger" | "warning" | "info" | "muted" | "default";

export const COLORS: Record<SemanticColor, string> = {
  success: "text-emerald-600 dark:text-emerald-400",
  danger: "text-destructive",
  warning: "text-amber-600 dark:text-amber-400",
  info: "text-blue-600 dark:text-blue-400",
  muted: "text-muted-foreground",
  default: "text-foreground",
};

export const BG_COLORS: Record<SemanticColor, string> = {
  success: "bg-emerald-500/10",
  danger: "bg-destructive/10",
  warning: "bg-amber-500/10",
  info: "bg-blue-500/10",
  muted: "bg-muted",
  default: "bg-muted/30",
};

export const BORDER_COLORS: Record<SemanticColor, string> = {
  success: "border-emerald-500/30",
  danger: "border-destructive/30",
  warning: "border-amber-500/30",
  info: "border-blue-500/30",
  muted: "border-border",
  default: "border-border/40",
};

export const PILL_SEMANTIC: Record<SemanticColor, string> = {
  success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  danger: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  info: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  muted: "bg-muted text-muted-foreground border-border",
  default: "bg-muted text-muted-foreground border-border",
};

export type KPIVariant = "card" | "pill" | "compact";

export const KPI_VARIANTS: KPIVariant[] = ["card", "pill", "compact"];
