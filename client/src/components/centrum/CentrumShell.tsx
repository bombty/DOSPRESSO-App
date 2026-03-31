/**
 * CentrumShell — HQ Centrum ortak layout bileşeni
 * Tüm HQ Control sayfaları bu shell'i kullanır.
 */
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type KpiVariant = "alert" | "warn" | "ok" | "info" | "purple" | "neutral";

const VARIANT_STYLES: Record<KpiVariant, { dot: string; val: string; bg: string; border: string }> = {
  alert:   { dot: "bg-red-400",    val: "text-red-400",    bg: "bg-red-500/5",    border: "border-red-500/25" },
  warn:    { dot: "bg-amber-400",  val: "text-amber-400",  bg: "bg-amber-500/5",  border: "border-amber-500/20" },
  ok:      { dot: "bg-green-400",  val: "text-green-400",  bg: "bg-green-500/5",  border: "border-green-500/20" },
  info:    { dot: "bg-blue-400",   val: "text-blue-400",   bg: "bg-blue-500/5",   border: "border-blue-500/20" },
  purple:  { dot: "bg-purple-400", val: "text-purple-400", bg: "bg-purple-500/5", border: "border-purple-500/20" },
  neutral: { dot: "bg-muted-foreground", val: "text-muted-foreground", bg: "bg-muted/40", border: "border-border" },
};

interface KpiChipProps { label: string; value: string | number; variant?: KpiVariant; onClick?: () => void; }

export function KpiChip({ label, value, variant = "neutral", onClick }: KpiChipProps) {
  const s = VARIANT_STYLES[variant];
  return (
    <button onClick={onClick} className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all whitespace-nowrap hover:brightness-105", s.bg, s.border)}>
      <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", s.dot)} />
      <span className={cn("text-[13px] font-bold leading-none", s.val)}>{value}</span>
      <span className="text-[10px] text-muted-foreground leading-none">{label}</span>
    </button>
  );
}

interface DobodyAction { id: number | string; title: string; sub?: string; onApprove?: () => void; approving?: boolean; btnLabel?: string; btnVariant?: "green" | "purple" | "blue"; }
const BTN_V = { green: "bg-green-500/15 text-green-400 hover:bg-green-500/25", purple: "bg-purple-500/15 text-purple-400 hover:bg-purple-500/25", blue: "bg-blue-500/15 text-blue-400 hover:bg-blue-500/25" };

export function DobodySlot({ actions, compact }: { actions: DobodyAction[]; compact?: boolean; }) {
  return (
    <div className="rounded-xl border border-dashed border-purple-500/30 bg-purple-500/[0.04] overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-purple-500/[0.08]">
        <span className="text-[10px] font-semibold text-purple-400">◈ Dobody</span>
        {actions.length > 0 && <span className="text-[9px] bg-purple-500/15 text-purple-400 px-1.5 py-0.5 rounded-full">{actions.length}</span>}
      </div>
      {actions.length === 0 ? (
        <p className="text-[10px] text-muted-foreground px-3 py-2">Bekleyen öneri yok</p>
      ) : actions.map((a) => (
        <div key={a.id} className={cn("flex items-start gap-2 px-3 border-b border-purple-500/[0.06] last:border-0", compact ? "py-1.5" : "py-2")}>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-foreground leading-snug">{a.title}</p>
            {a.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{a.sub}</p>}
          </div>
          {a.onApprove && (
            <button onClick={a.onApprove} disabled={a.approving} className={cn("flex-shrink-0 text-[10px] font-medium px-2 py-1 rounded-md transition-colors disabled:opacity-50", BTN_V[a.btnVariant || "green"])}>
              {a.approving ? "..." : (a.btnLabel || "Onayla")}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

interface MiniStatRow { label: string; value: string | number; color?: string; }
export function MiniStats({ title, rows, linkText, onLink }: { title: string; rows: MiniStatRow[]; linkText?: string; onLink?: () => void; }) {
  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="px-3 py-2 border-b bg-muted/30 text-[11px] font-medium">{title}</div>
      <div className="px-3 py-2 space-y-1.5">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">{r.label}</span>
            <span className="font-semibold" style={{ color: r.color }}>{r.value}</span>
          </div>
        ))}
        {linkText && onLink && <button onClick={onLink} className="text-[10px] text-blue-400 mt-1 hover:underline block">{linkText} →</button>}
      </div>
    </div>
  );
}

interface ProgRow { label: string; value: number; max?: number; color?: string; }
export function ProgressWidget({ title, rows, linkText, onLink }: { title: string; rows: ProgRow[]; linkText?: string; onLink?: () => void; }) {
  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="px-3 py-2 border-b bg-muted/30 text-[11px] font-medium">{title}</div>
      <div className="px-3 py-2 space-y-2">
        {rows.map((r, i) => {
          const pct = Math.min(100, Math.round((r.value / (r.max || 100)) * 100));
          const color = r.color || (pct >= 80 ? "#4ade80" : pct >= 60 ? "#fbbf24" : "#f87171");
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-[52px] flex-shrink-0 truncate">{r.label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-border"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} /></div>
              <span className="text-[10px] font-semibold w-7 text-right" style={{ color }}>{r.max ? r.value : `%${pct}`}</span>
            </div>
          );
        })}
        {linkText && onLink && <button onClick={onLink} className="text-[10px] text-blue-400 mt-0.5 hover:underline block">{linkText} →</button>}
      </div>
    </div>
  );
}

interface WidgetProps { title: ReactNode; badge?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; noPadding?: boolean; }
export function Widget({ title, badge, action, children, className, noPadding }: WidgetProps) {
  return (
    <div className={cn("rounded-xl border overflow-hidden", className)}>
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
        <span className="text-[11px] font-medium flex-1">{title}</span>
        {badge}{action}
      </div>
      <div className={noPadding ? "" : "p-0"}>{children}</div>
    </div>
  );
}

interface ListItemProps { priority?: string; priorityColor?: string; title: string; meta?: string; slaLabel?: string; slaColor?: string; slaPct?: number; action?: ReactNode; onClick?: () => void; }
export function ListItem({ priority, priorityColor, title, meta, slaLabel, slaColor, slaPct, action, onClick }: ListItemProps) {
  return (
    <div onClick={onClick} className={cn("flex items-center gap-2 px-3 py-2 border-b last:border-0 text-[11px]", onClick && "cursor-pointer hover:bg-muted/30 transition-colors")}>
      {priority && <span className="text-[9px] font-semibold flex-shrink-0 w-9 text-center px-1 py-0.5 rounded" style={{ color: priorityColor, background: `${priorityColor}20` }}>{priority}</span>}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{title}</div>
        {meta && <div className="text-[10px] text-muted-foreground truncate mt-0.5">{meta}</div>}
      </div>
      {slaPct !== undefined && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-border"><div className="h-full rounded-full" style={{ width: `${slaPct}%`, background: slaColor }} /></div>
          <span className="text-[9px] font-medium" style={{ color: slaColor }}>{slaLabel}</span>
        </div>
      )}
      {action}
    </div>
  );
}

interface CentrumShellProps {
  title: string; subtitle?: string; roleLabel: string; roleColor: string; roleBg: string;
  kpis: KpiChipProps[]; actions?: ReactNode;
  tabs?: { label: string; badge?: string | number }[];
  activeTab?: number; onTabChange?: (i: number) => void;
  children: ReactNode; rightPanel?: ReactNode; className?: string;
}

export function CentrumShell({ title, subtitle, roleLabel, roleColor, roleBg, kpis, actions, tabs, activeTab = 0, onTabChange, children, rightPanel, className }: CentrumShellProps) {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center gap-3 px-4 py-2.5 border-b flex-shrink-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-[13px] font-semibold">{title}</h1>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: roleBg, color: roleColor }}>{roleLabel}</span>
          </div>
          {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {kpis.length > 0 && (
        <div className="flex gap-2 px-4 py-2 border-b flex-shrink-0 overflow-x-auto">
          {kpis.map((kpi, i) => <KpiChip key={i} {...kpi} />)}
        </div>
      )}
      {tabs && (
        <div className="flex border-b flex-shrink-0 px-4 bg-muted/20">
          {tabs.map((tab, i) => (
            <button key={i} onClick={() => onTabChange?.(i)} className={cn("py-2 px-3 text-[11px] border-b-2 transition-colors whitespace-nowrap", i === activeTab ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground")}>
              {tab.label}
              {tab.badge !== undefined && <span className="ml-1.5 text-[9px] bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded-full">{tab.badge}</span>}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">{children}</div>
        {rightPanel && <div className="w-[200px] flex-shrink-0 border-l overflow-y-auto p-3 space-y-3">{rightPanel}</div>}
      </div>
    </div>
  );
}
