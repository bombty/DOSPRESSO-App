/**
 * DOSPRESSO Design Tokens v3
 * JSX prototype'dan birebir — CentrumShell.tsx DSTokens ile senkron
 */

export type SemanticColor = "success" | "danger" | "warning" | "info" | "muted" | "default";

// JSX birebir hex renkleri
export const DS = {
  bg: "#0c0f14",
  card: "#141820",
  border: "#1e2530",
  text: "#e8ecf1",
  muted: "#6b7a8d",
  alert: "#ef4444",
  warn: "#fbbf24",
  ok: "#22c55e",
  info: "#60a5fa",
  purple: "#a5a0f0",
} as const;

// Tailwind class mapping (eski API uyumluluğu)
export const COLORS: Record<SemanticColor, string> = {
  success: "text-green-400",
  danger: "text-red-400",
  warning: "text-amber-400",
  info: "text-blue-400",
  muted: "text-[#6b7a8d]",
  default: "text-[#e8ecf1]",
};

export const BG_COLORS: Record<SemanticColor, string> = {
  success: "bg-[#22c55e]/[0.08]",
  danger: "bg-[#ef4444]/[0.08]",
  warning: "bg-[#fbbf24]/[0.08]",
  info: "bg-[#60a5fa]/[0.08]",
  muted: "bg-[#1e2530]",
  default: "bg-[#1e2530]/40",
};

export const BORDER_COLORS: Record<SemanticColor, string> = {
  success: "border-[#22c55e]/30",
  danger: "border-[#ef4444]/30",
  warning: "border-[#fbbf24]/30",
  info: "border-[#60a5fa]/30",
  muted: "border-[#1e2530]",
  default: "border-[#1e2530]",
};

export const PILL_SEMANTIC: Record<SemanticColor, string> = {
  success: "bg-[#22c55e]/[0.20] text-[#22c55e] border-[#22c55e]/30",
  danger: "bg-[#ef4444]/[0.20] text-[#ef4444] border-[#ef4444]/30",
  warning: "bg-[#fbbf24]/[0.20] text-[#fbbf24] border-[#fbbf24]/30",
  info: "bg-[#60a5fa]/[0.20] text-[#60a5fa] border-[#60a5fa]/30",
  muted: "bg-[#1e2530] text-[#6b7a8d] border-[#1e2530]",
  default: "bg-[#1e2530] text-[#6b7a8d] border-[#1e2530]",
};

export type KPIVariant = "card" | "pill" | "compact";
export const KPI_VARIANTS: KPIVariant[] = ["card", "pill", "compact"];
