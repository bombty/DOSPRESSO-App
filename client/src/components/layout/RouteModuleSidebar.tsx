import { useLocation } from "wouter";
import { getModuleMenuForPath, getActiveMenuItemForPath } from "./module-menu-config";

/**
 * Route-aware module sidebar — automatically shows the correct module sub-menu
 * based on the current URL path. Returns null for home/control pages.
 * 
 * Desktop: vertical sidebar (140px)
 * Mobile: hidden (BottomNav handles navigation)
 */
export function RouteModuleSidebar() {
  const [location, setLocation] = useLocation();
  
  const config = getModuleMenuForPath(location);
  if (!config) return null;
  
  const activeId = getActiveMenuItemForPath(location);

  return (
    <div
      data-testid="module-sidebar"
      className="hidden md:block"
      style={{
        width: 160,
        flexShrink: 0,
        background: "var(--ds-bg-header)",
        borderRight: "1px solid var(--ds-border)",
        overflowY: "auto",
        padding: "8px 0",
      }}
    >
      {/* Module title */}
      <div style={{
        fontSize: 9,
        fontWeight: 600,
        color: "var(--ds-text-secondary)",
        textTransform: "uppercase" as const,
        letterSpacing: "0.5px",
        padding: "6px 14px 4px",
      }}>
        {config.title}
      </div>

      {/* Menu items */}
      {config.items.map((item) => {
        const isActive = item.id === activeId;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => setLocation(item.path)}
            data-testid={`module-menu-${item.id}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              width: "100%",
              padding: "7px 14px",
              fontSize: 12,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? "var(--ds-red)" : "var(--ds-text-secondary)",
              background: isActive ? "rgba(180,42,42,0.08)" : "transparent",
              borderLeft: isActive ? "2px solid var(--ds-red)" : "2px solid transparent",
              border: "none",
              borderLeftStyle: "solid" as const,
              borderLeftWidth: 2,
              borderLeftColor: isActive ? "var(--ds-red)" : "transparent",
              cursor: "pointer",
              textAlign: "left" as const,
              transition: "var(--ds-transition)",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.color = "var(--ds-text-mid)";
                (e.currentTarget as HTMLElement).style.background = "rgba(242,230,208,0.03)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.color = "var(--ds-text-secondary)";
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }
            }}
          >
            <Icon style={{ width: 13, height: 13, flexShrink: 0 }} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
