import { useLocation } from "wouter";
import type { ModuleCardConfig } from "./role-module-config";

interface BadgeInfo { label: string; color: "success"|"warning"|"danger"|"info"|"muted"; }
interface ModuleCardProps { config: ModuleCardConfig; badges?: BadgeInfo[]; statusMessage?: string; }

const BADGE_COLORS: Record<string, string> = {
  success: "#22c55e", warning: "#fbbf24", danger: "#ef4444", info: "#60a5fa", muted: "#6b7a8d",
};

export function ModuleCard({ config, badges, statusMessage }: ModuleCardProps) {
  const [, setLocation] = useLocation();
  const Icon = config.icon;
  const alertCount = badges?.filter(b => b.color === "danger").length || 0;

  return (
    <button
      type="button"
      onClick={() => setLocation(config.path)}
      data-testid={`module-card-${config.id}`}
      className="w-full text-left p-3 md:p-3.5 rounded-xl border cursor-pointer transition-all duration-150 active:scale-[0.97]"
      style={{
        background: "hsl(var(--card))",
        borderColor: "hsl(var(--border))",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon — solid colored background + white icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: config.iconBg }}
        >
          <Icon style={{ width: 20, height: 20, color: config.iconColor }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-[13px] md:text-[14px] text-foreground">{config.title}</span>
            {alertCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "#ef4444", color: "white" }}>
                {alertCount}
              </span>
            )}
          </div>
          <p className="text-[11px] md:text-[12px] text-muted-foreground">{config.subtitle}</p>

          {/* Status badges */}
          {badges && badges.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {badges.map((b, i) => (
                <span key={i} className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                  style={{ background: `${BADGE_COLORS[b.color]}15`, color: BADGE_COLORS[b.color] }}>
                  {b.label}
                </span>
              ))}
            </div>
          )}

          {/* Status message */}
          {statusMessage && !badges?.length && (
            <p className="text-[11px] font-medium mt-0.5" style={{ color: "#22c55e" }}>{statusMessage}</p>
          )}
        </div>

        <span className="text-muted-foreground text-[12px] shrink-0">→</span>
      </div>
    </button>
  );
}
