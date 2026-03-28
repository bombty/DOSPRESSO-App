import type { LucideIcon } from "lucide-react";
import type { ReactNode, CSSProperties } from "react";

interface BadgeProps {
  label: string;
  color: "success" | "warning" | "danger" | "info" | "muted";
}

interface WidgetCardProps {
  title: string;
  icon?: LucideIcon;
  badge?: BadgeProps;
  span?: 1 | 2 | 3;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  success: { bg: "var(--ds-badge-success-bg)", text: "var(--ds-badge-success-text)" },
  warning: { bg: "var(--ds-badge-warning-bg)", text: "var(--ds-badge-warning-text)" },
  danger: { bg: "var(--ds-badge-danger-bg)", text: "var(--ds-badge-danger-text)" },
  info: { bg: "var(--ds-badge-info-bg)", text: "var(--ds-badge-info-text)" },
  muted: { bg: "var(--ds-badge-muted-bg)", text: "var(--ds-badge-muted-text)" },
};

export function WidgetCard({ title, icon: Icon, badge, span = 1, onClick, children, className, style }: WidgetCardProps) {
  const badgeStyle = badge ? BADGE_COLORS[badge.color] : null;

  return (
    <div
      data-testid={`widget-${title.toLowerCase().replace(/\s/g, "-")}`}
      onClick={onClick}
      className={className}
      style={{
        background: "var(--ds-bg-card)",
        border: "var(--ds-widget-border)",
        borderRadius: "var(--ds-widget-radius)",
        padding: "var(--ds-widget-padding)",
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        transition: "var(--ds-transition)",
        gridColumn: span > 1 ? `span ${span}` : undefined,
        ...style,
      }}
      onMouseEnter={onClick ? (e) => {
        (e.currentTarget as HTMLElement).style.background = "var(--ds-bg-card-hover)";
      } : undefined}
      onMouseLeave={onClick ? (e) => {
        (e.currentTarget as HTMLElement).style.background = "var(--ds-bg-card)";
      } : undefined}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{
          fontSize: "var(--ds-font-widget-title)",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "var(--ds-text-primary)",
        }}>
          {Icon && <Icon style={{ width: 14, height: 14, color: "var(--ds-text-secondary)" }} />}
          {title}
        </span>
        {badge && badgeStyle && (
          <span style={{
            fontSize: "var(--ds-font-tiny)",
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 4,
            background: badgeStyle.bg,
            color: badgeStyle.text,
          }}>
            {badge.label}
          </span>
        )}
      </div>
      {/* Content */}
      {children}
    </div>
  );
}
