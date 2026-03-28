import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Calendar } from "lucide-react";

interface PageShellProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  showDateFilter?: boolean;
  onDateFilterClick?: () => void;
  dateFilterLabel?: string;
  rightActions?: ReactNode;
  children: ReactNode;
}

export function PageShell({
  title,
  subtitle,
  showBackButton = true,
  showDateFilter = false,
  onDateFilterClick,
  dateFilterLabel = "Bu hafta",
  rightActions,
  children,
}: PageShellProps) {
  const [, setLocation] = useLocation();

  return (
    <div
      data-testid="page-shell"
      style={{
        maxWidth: "var(--ds-max-width)",
        margin: "0 auto",
        padding: `var(--ds-page-padding-y) var(--ds-page-padding-x)`,
        overflowY: "auto",
        height: "100%",
      }}
    >
      {/* Page header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "var(--ds-gap-lg)",
      }}>
        <div>
          {showBackButton && (
            <button
              onClick={() => setLocation("/")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                color: "var(--ds-text-secondary)",
                fontSize: 13,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                marginBottom: 4,
              }}
            >
              <ChevronLeft style={{ width: 16, height: 16 }} />
              Ana Sayfa
            </button>
          )}
          <h1 style={{
            fontSize: "var(--ds-font-page-title)",
            fontWeight: 600,
            color: "var(--ds-text-primary)",
            margin: 0,
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{
              fontSize: "var(--ds-font-card-subtitle)",
              color: "var(--ds-text-secondary)",
              margin: "2px 0 0",
            }}>
              {subtitle}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: "var(--ds-gap-sm)", alignItems: "center" }}>
          {showDateFilter && (
            <button
              onClick={onDateFilterClick}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                padding: "6px 14px",
                borderRadius: 8,
                border: "1px solid var(--ds-border)",
                color: "var(--ds-text-secondary)",
                cursor: "pointer",
                background: "rgba(30,50,80,0.2)",
              }}
            >
              <Calendar style={{ width: 13, height: 13 }} />
              {dateFilterLabel}
            </button>
          )}
          {rightActions}
        </div>
      </div>

      {/* Page content */}
      {children}
    </div>
  );
}
