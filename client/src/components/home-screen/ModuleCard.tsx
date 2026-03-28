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
      style={{
        width: "100%",
        textAlign: "left" as const,
        padding: "var(--ds-card-padding)",
        background: "var(--ds-bg-card)",
        border: "var(--ds-card-border)",
        borderRadius: "var(--ds-card-radius)",
        boxShadow: "var(--ds-card-shadow)",
        cursor: "pointer",
        transition: "var(--ds-transition)",
      }}
      onMouseEnter={(e) => {
        const t = e.currentTarget;
        t.style.background = "var(--ds-bg-card-hover)";
        t.style.transform = "translateY(-2px) scale(1.01)";
        t.style.boxShadow = "var(--ds-card-shadow-hover)";
        t.style.borderColor = "var(--ds-border-hover)";
      }}
      onMouseLeave={(e) => {
        const t = e.currentTarget;
        t.style.background = "var(--ds-bg-card)";
        t.style.transform = "translateY(0) scale(1)";
        t.style.boxShadow = "var(--ds-card-shadow)";
        t.style.borderColor = "var(--ds-border)";
      }}
    >
      {/* Icon + Title */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--ds-gap-md)", marginBottom: "var(--ds-gap-sm)" }}>
        <div style={{
          width: "var(--ds-icon-container)",
          height: "var(--ds-icon-container)",
          borderRadius: "var(--ds-icon-container-radius)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
          background: config.iconBg,
          color: config.iconColor,
        }}>
          <Icon style={{ width: "var(--ds-icon-svg)", height: "var(--ds-icon-svg)" }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{
            fontSize: "var(--ds-font-card-title)", fontWeight: 600,
            color: "var(--ds-text-primary)", margin: 0,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{config.title}</p>
          <p style={{
            fontSize: "var(--ds-font-card-subtitle)",
            color: "var(--ds-text-secondary)", margin: "1px 0 0",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{config.subtitle}</p>
        </div>
      </div>

      {/* Badges */}
      {badges && badges.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--ds-gap-xs)", marginBottom: 4 }}>
          {badges.map((badge, idx) => {
            const s = BADGE_MAP[badge.color];
            return (
              <span key={idx} style={{
                fontSize: "var(--ds-font-badge)", fontWeight: 600,
                padding: "3px 10px", borderRadius: 5,
                background: s.bg, color: s.text,
              }}>
                {badge.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Status */}
      {statusMessage && (
        <p style={{
          fontSize: "var(--ds-font-status)",
          color: "var(--ds-text-muted)", margin: 0,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{statusMessage}</p>
      )}
    </button>
  );
}
