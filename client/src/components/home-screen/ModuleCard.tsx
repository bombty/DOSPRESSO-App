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
        "w-full text-left rounded-lg border border-dospresso-border bg-dospresso-bg2 p-3 transition-all duration-150",
        "hover:bg-dospresso-bg3 active:scale-[0.98] cursor-pointer",
        config.halfWidth && "col-span-1",
        className
      )}
    >
      {/* Header: icon + title */}
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: config.iconBg, color: config.iconColor }}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-dospresso-bej truncate">{config.title}</p>
          <p className="text-[9px] text-dospresso-bej-muted truncate">{config.subtitle}</p>
        </div>
      </div>

      {/* Badges */}
      {badges && badges.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-0.5">
          {badges.map((badge, idx) => {
            const style = BADGE_STYLES[badge.color];
            return (
              <span
                key={idx}
                className="text-[8px] font-medium px-1.5 py-0.5 rounded"
                style={{ backgroundColor: style.bg, color: style.text }}
              >
                {badge.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Status message */}
      {statusMessage && (
        <p className="text-[8px] text-dospresso-bej-muted truncate">{statusMessage}</p>
      )}
    </button>
  );
}
