import { cn } from "@/lib/utils";

type StatusType = "success" | "warning" | "danger" | "info" | "muted" | "offline";

interface StatusDotProps {
  status: StatusType;
  size?: number;
  pulse?: boolean;
  label?: string;
  className?: string;
  "data-testid"?: string;
}

const STATUS_COLORS: Record<StatusType, string> = {
  success: "var(--dospresso-green, #27ae60)",
  warning: "var(--dospresso-amber, #d4a84b)",
  danger: "var(--dospresso-red, #c0392b)",
  info: "var(--dospresso-blue, #2980b9)",
  muted: "var(--dospresso-bej-muted, #8a7d6d)",
  offline: "var(--dospresso-border, #1e3250)",
};

export function StatusDot({
  status,
  size = 5,
  pulse = false,
  label,
  className,
  "data-testid": testId,
}: StatusDotProps) {
  const color = STATUS_COLORS[status];

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)} data-testid={testId}>
      <span
        className={cn("rounded-full flex-shrink-0", pulse && status !== "muted" && status !== "offline" && "animate-pulse")}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: color,
        }}
      />
      {label && (
        <span className="text-[10px] truncate" style={{ color: "var(--dospresso-bej-mid, #c8b698)" }}>
          {label}
        </span>
      )}
    </div>
  );
}
