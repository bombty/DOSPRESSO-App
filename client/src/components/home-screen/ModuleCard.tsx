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
  success: { bg: "rgba(39,174,96,0.12)", text: "#27ae60" },
  warning: { bg: "rgba(212,168,75,0.12)", text: "#d4a84b" },
  danger: { bg: "rgba(192,57,43,0.14)", text: "#e74c3c" },
  info: { bg: "rgba(41,128,185,0.10)", text: "#5dade2" },
  muted: { bg: "rgba(138,125,109,0.10)", text: "#8a7d6d" },
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
        "w-full text-left transition-all duration-150 active:scale-[0.97] cursor-pointer group",
        config.halfWidth && "col-span-1",
        className
      )}
      style={{
        padding: "14px 16px",
        backgroundColor: "#0f1d32",
        border: "1px solid #1e3250",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "#152640";
        e.currentTarget.style.transform = "translateY(-2px) scale(1.01)";
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.15)";
        e.currentTarget.style.borderColor = "#2a4060";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "#0f1d32";
        e.currentTarget.style.transform = "translateY(0) scale(1)";
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)";
        e.currentTarget.style.borderColor = "#1e3250";
      }}
    >
      {/* Header: icon + title */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
        <div
          style={{
            width: 36, height: 36, borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            backgroundColor: config.iconBg, color: config.iconColor,
          }}
        >
          <Icon style={{ width: 18, height: 18 }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{
            fontSize: 14, fontWeight: 600, color: "#f2e6d0", margin: 0,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{config.title}</p>
          <p style={{
            fontSize: 11, color: "#8a7d6d", margin: "1px 0 0",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{config.subtitle}</p>
        </div>
      </div>

      {/* Badges */}
      {badges && badges.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "4px" }}>
          {badges.map((badge, idx) => {
            const style = BADGE_STYLES[badge.color];
            return (
              <span
                key={idx}
                style={{
                  fontSize: 10, fontWeight: 600, borderRadius: 4,
                  padding: "2px 8px",
                  backgroundColor: style.bg, color: style.text,
                }}
              >
                {badge.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Status message */}
      {statusMessage && (
        <p style={{
          fontSize: 11, color: "#6a7d6d", margin: 0,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{statusMessage}</p>
      )}
    </button>
  );
}
