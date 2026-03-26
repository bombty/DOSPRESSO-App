import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  good: "bg-[var(--dospresso-green-light,#2ecc71)]",
  warning: "bg-[var(--dospresso-amber,#d4a84b)]",
  critical: "bg-[var(--dospresso-red-light,#e74c3c)]",
};

interface StatusDotProps {
  status: "good" | "warning" | "critical";
  className?: string;
}

export function StatusDot({ status, className }: StatusDotProps) {
  return (
    <span
      className={cn("w-1.5 h-1.5 rounded-full inline-block flex-shrink-0", STATUS_COLORS[status], className)}
      data-testid={`status-dot-${status}`}
    />
  );
}
