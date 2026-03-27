import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import type { ModuleCardConfig } from "./role-module-config";

interface BadgeInfo {
  label: string;
  color: "success" | "warning" | "danger" | "info" | "muted";
}

interface ModuleCardProps {
  config: ModuleCardConfig;
  badges?: BadgeInfo[];
  statusMessage?: string;
  className?: string;
}

const BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  success: { bg: "rgba(39,174,96,0.08)", text: "var(--dospresso-green, #27ae60)" },
  warning: { bg: "rgba(212,168,75,0.08)", text: "var(--dospresso-amber, #d4a84b)" },
  danger: { bg: "rgba(192,57,43,0.1)", text: "var(--dospresso-red, #c0392b)" },
  info: { bg: "rgba(41,128,185,0.06)", text: "var(--dospresso-blue, #2980b9)" },
  muted: { bg: "rgba(138,125,109,0.08)", text: "var(--dospresso-bej-muted, #8a7d6d)" },
};

export function ModuleCard({ config, badges, statusMessage, className }: ModuleCardProps) {
  const [, setLocation] = useLocation();
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={() => setLocation(config.path)}
      data-testid={`module-card-${config.id}`}
      className={cn(
        "w-full text-left rounded-[8px] border transition-all duration-150",
        "active:scale-[0.98] cursor-pointer",
        config.halfWidth && "col-span-1",
        className
      )}
      style={{
        padding: 10,
        backgroundColor: "var(--dospresso-bg2, #0f1d32)",
        borderColor: "var(--dospresso-border, #1e3250)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--dospresso-bg3, #152640)";
        e.currentTarget.style.transform = "scale(1.012)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "var(--dospresso-bg2, #0f1d32)";
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {/* Header: icon + title */}
      <div className="flex items-center gap-[7px] mb-[5px]">
        <div
          className="w-[28px] h-[28px] rounded-[6px] flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: config.iconBg, color: config.iconColor }}
        >
          <Icon className="w-[14px] h-[14px]" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium truncate" style={{ color: "var(--dospresso-bej, #f2e6d0)" }}>{config.title}</p>
          <p className="text-[8px] truncate" style={{ color: "var(--dospresso-bej-muted, #8a7d6d)" }}>{config.subtitle}</p>
        </div>
      </div>

      {/* Badges */}
      {badges && badges.length > 0 && (
        <div className="flex flex-wrap gap-[3px] mb-[2px]">
          {badges.map((badge, idx) => {
            const style = BADGE_STYLES[badge.color];
            return (
              <span
                key={idx}
                className="text-[7px] font-medium rounded-[3px]"
                style={{ backgroundColor: style.bg, color: style.text, padding: "1px 5px" }}
              >
                {badge.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Status message */}
      {statusMessage && (
        <p className="text-[8px] truncate" style={{ color: "var(--dospresso-bej-muted, #8a7d6d)" }}>{statusMessage}</p>
      )}
    </button>
  );
}
