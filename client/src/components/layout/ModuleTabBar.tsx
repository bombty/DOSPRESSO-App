import type { LucideIcon } from "lucide-react";

interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface ModuleTabBarProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  accentColor?: string;
}

export function ModuleTabBar({ tabs, activeTab, onChange, accentColor = "var(--ds-red)" }: ModuleTabBarProps) {
  return (
    <div
      data-testid="module-tab-bar"
      style={{
        display: "flex",
        gap: 2,
        padding: "0 4px",
        borderBottom: "1px solid var(--ds-border)",
        marginBottom: "var(--ds-gap-lg)",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            data-testid={`tab-${tab.id}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 14px",
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? accentColor : "var(--ds-text-secondary)",
              background: "none",
              border: "none",
              borderBottom: isActive ? `2px solid ${accentColor}` : "2px solid transparent",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "var(--ds-transition)",
            }}
          >
            <Icon style={{ width: 14, height: 14 }} />
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span style={{
                fontSize: 9,
                fontWeight: 600,
                padding: "1px 6px",
                borderRadius: 4,
                background: isActive ? `${accentColor}20` : "var(--ds-badge-muted-bg)",
                color: isActive ? accentColor : "var(--ds-text-secondary)",
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
