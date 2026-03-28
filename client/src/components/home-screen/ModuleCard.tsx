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
}

const BADGE_MAP: Record<string, { bg: string; text: string }> = {
  success: { bg: "var(--ds-badge-success-bg)", text: "var(--ds-badge-success-text)" },
  warning: { bg: "var(--ds-badge-warning-bg)", text: "var(--ds-badge-warning-text)" },
  danger: { bg: "var(--ds-badge-danger-bg)", text: "var(--ds-badge-danger-text)" },
  info: { bg: "var(--ds-badge-info-bg)", text: "var(--ds-badge-info-text)" },
  muted: { bg: "var(--ds-badge-muted-bg)", text: "var(--ds-badge-muted-text)" },
};

export function ModuleCard({ config, badges, statusMessage }: ModuleCardProps) {
  const [, setLocation] = useLocation();
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={() => setLocation(config.path)}
      data-testid={`module-card-${config.id}`}
      className="w-full text-left p-3 md:p-[18px_20px] rounded-xl md:rounded-[14px] border cursor-pointer transition-all duration-150 active:scale-[0.97] hover:translate-y-[-2px]"
      style={{
        background: "var(--ds-bg-card)",
        borderColor: "var(--ds-border)",
        boxShadow: "var(--ds-card-shadow)",
      }}
      onMouseEnter={(e) => {
        const t = e.currentTarget;
        t.style.background = "var(--ds-bg-card-hover)";
        t.style.boxShadow = "var(--ds-card-shadow-hover)";
        t.style.borderColor = "var(--ds-border-hover)";
      }}
      onMouseLeave={(e) => {
        const t = e.currentTarget;
        t.style.background = "var(--ds-bg-card)";
        t.style.boxShadow = "var(--ds-card-shadow)";
        t.style.borderColor = "var(--ds-border)";
      }}
    >
      {/* Icon + Title */}
      <div className="flex items-center gap-2.5 md:gap-3 mb-2 md:mb-2.5">
        <div
          className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{ background: config.iconBg, color: config.iconColor }}
        >
          <Icon className="w-4 h-4 md:w-5 md:h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] md:text-[16px] font-semibold truncate"
            style={{ color: "var(--ds-text-primary)" }}>{config.title}</p>
          <p className="text-[10px] md:text-[12px] truncate"
            style={{ color: "var(--ds-text-secondary)" }}>{config.subtitle}</p>
        </div>
      </div>

      {/* Badges */}
      {badges && badges.length > 0 && (
        <div className="flex flex-wrap gap-1 md:gap-1.5 mb-1">
          {badges.map((badge, idx) => {
            const s = BADGE_MAP[badge.color];
            return (
              <span key={idx}
                className="text-[9px] md:text-[11px] font-semibold px-1.5 md:px-2.5 py-0.5 rounded md:rounded-[5px]"
                style={{ background: s.bg, color: s.text }}>
                {badge.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Status */}
      {statusMessage && (
        <p className="text-[10px] md:text-[12px] truncate"
          style={{ color: "var(--ds-text-muted)" }}>{statusMessage}</p>
      )}
    </button>
  );
}
