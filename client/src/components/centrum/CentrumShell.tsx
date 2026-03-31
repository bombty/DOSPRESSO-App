/**
 * CentrumShell — Tüm Control Centrum sayfalarının ortak layout ve widget bileşenleri.
 * 15 rol dashboard'u bu shell'i ve component'ları kullanır.
 *
 * Export'lar:
 *   Layout:   CentrumShell
 *   KPI:      KpiChip
 *   Widgets:  Widget, MiniStats, ProgressWidget, ListItem, DobodySlot
 *   New v5:   TimeFilter, EscalationBadge, TopFlop, DobodyTaskPlan,
 *             FeedbackWidget, LostFoundBanner, QCStatusWidget, ClickableWidget
 */
import { ReactNode, useState, useMemo } from "react";
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

// ─── DOBODY SLOT (3-Mod: auto / action / info) ─────────
export type DobodyMode = "auto" | "action" | "info";
interface DobodyAction {
  id: number | string;
  title: string;
  sub?: string;
  mode?: DobodyMode;
  onApprove?: () => void;
  approving?: boolean;
  btnLabel?: string;
  btnVariant?: "green" | "purple" | "blue";
}
const BTN_V = { green: "bg-green-500/15 text-green-400 hover:bg-green-500/25", purple: "bg-purple-500/15 text-purple-400 hover:bg-purple-500/25", blue: "bg-blue-500/15 text-blue-400 hover:bg-blue-500/25" };
const MODE_DOT = { auto: "bg-green-400", action: "bg-purple-400", info: "bg-muted-foreground" };

export function DobodySlot({ actions, compact }: { actions: DobodyAction[]; compact?: boolean; }) {
  return (
    <div className="rounded-xl border border-dashed border-purple-500/30 bg-purple-500/[0.04] overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-purple-500/[0.08]">
        <span className="text-[10px] font-semibold text-purple-400">◈ Mr. Dobody</span>
        {actions.length > 0 && <span className="text-[9px] bg-purple-500/15 text-purple-400 px-1.5 py-0.5 rounded-full">{actions.length}</span>}
      </div>
      {actions.length === 0 ? (
        <p className="text-[10px] text-muted-foreground px-3 py-2">Bekleyen öneri yok</p>
      ) : actions.map((a) => {
        const mode = a.mode || (a.onApprove ? "action" : "info");
        return (
          <div key={a.id} className={cn("flex items-start gap-2 px-3 border-b border-purple-500/[0.06] last:border-0", compact ? "py-1.5" : "py-2")}>
            <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0", MODE_DOT[mode])} />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-foreground leading-snug">{a.title}</p>
              {a.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{a.sub}</p>}
            </div>
            {mode === "auto" && (
              <span className="flex-shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded bg-green-500/15 text-green-400">✓</span>
            )}
            {mode === "action" && a.onApprove && (
              <button onClick={a.onApprove} disabled={a.approving} className={cn("flex-shrink-0 text-[10px] font-medium px-2 py-1 rounded-md transition-colors disabled:opacity-50", BTN_V[a.btnVariant || "purple"])}>
                {a.approving ? "..." : (a.btnLabel || "Onayla")}
              </button>
            )}
          </div>
        );
      })}
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

// ─── v5 COMPONENTS ──────────────────────────────────────

// ─── TIME FILTER ────────────────────────────────────────
export type TimePeriod = "today" | "week" | "month" | "quarter";
const TIME_LABELS: Record<TimePeriod, string> = { today: "Bugün", week: "Bu Hafta", month: "Bu Ay", quarter: "Bu Çeyrek" };

export function TimeFilter({ value, onChange, className }: { value: TimePeriod; onChange: (v: TimePeriod) => void; className?: string }) {
  return (
    <div className={cn("flex gap-1", className)}>
      {(Object.keys(TIME_LABELS) as TimePeriod[]).map((key) => (
        <button key={key} onClick={() => onChange(key)}
          className={cn("text-[10px] px-2.5 py-1 rounded-md transition-all border", value === key ? "bg-blue-500/10 text-blue-400 border-blue-500/25 font-medium" : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/30")}>
          {TIME_LABELS[key]}
        </button>
      ))}
    </div>
  );
}

// ─── ESCALATION BADGE ───────────────────────────────────
interface EscalationItem { id: number | string; title: string; meta?: string; level: number; maxLevel?: number; slaHours?: number; onClick?: () => void; }

export function EscalationBadge({ items, title = "Eskalasyon" }: { items: EscalationItem[]; title?: string }) {
  if (items.length === 0) return null;
  const levelColor = (lv: number) => lv >= 4 ? "text-red-400 bg-red-500/15" : lv >= 3 ? "text-amber-400 bg-amber-500/15" : "text-blue-400 bg-blue-500/15";
  return (
    <Widget title={title} badge={<span className="text-[9px] bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded-full">{items.length}</span>}>
      {items.map((item) => (
        <ListItem key={item.id} title={item.title} meta={item.meta} onClick={item.onClick}
          priority={`K${item.level}`} priorityColor={item.level >= 4 ? "#f87171" : item.level >= 3 ? "#fbbf24" : "#60a5fa"}
          slaLabel={item.slaHours ? `${item.slaHours}s` : undefined} slaColor={item.slaHours && item.slaHours <= 12 ? "#f87171" : "#fbbf24"}
          slaPct={item.slaHours ? Math.min(100, (item.slaHours / 72) * 100) : undefined} />
      ))}
    </Widget>
  );
}

// ─── TOP / FLOP SIRALAMA ────────────────────────────────
interface RankedBranch { id: number; name: string; score: number; }

export function TopFlop({ branches, onBranchClick, onViewAll }: { branches: RankedBranch[]; onBranchClick?: (id: number) => void; onViewAll?: () => void }) {
  const sorted = useMemo(() => [...branches].sort((a, b) => b.score - a.score), [branches]);
  const top3 = sorted.slice(0, 3);
  const flop3 = sorted.length > 3 ? sorted.slice(-3).reverse() : [];
  const scoreColor = (s: number) => s >= 70 ? "#4ade80" : s >= 50 ? "#fbbf24" : "#f87171";

  return (
    <Widget title="🏆 Top 3 / ⚠ Flop 3"
      badge={onViewAll && <button onClick={onViewAll} className="text-[9px] text-blue-400 hover:underline">Tüm şubeler →</button>}>
      <div className="px-3 py-1"><span className="text-[9px] font-medium text-green-400">EN İYİ</span></div>
      {top3.map((b, i) => (
        <ListItem key={b.id} title={`${i + 1}. ${b.name}`} onClick={onBranchClick ? () => onBranchClick(b.id) : undefined}
          priority={`${b.score}`} priorityColor={scoreColor(b.score)} />
      ))}
      {flop3.length > 0 && <>
        <div className="px-3 py-1 border-t"><span className="text-[9px] font-medium text-red-400">EN ZAYIF</span></div>
        {flop3.map((b, i) => (
          <ListItem key={b.id} title={`${sorted.length - 2 + i}. ${b.name}`} onClick={onBranchClick ? () => onBranchClick(b.id) : undefined}
            priority={`${b.score}`} priorityColor={scoreColor(b.score)} />
        ))}
      </>}
    </Widget>
  );
}

// ─── DOBODY STEP-BY-STEP GÖREV PLANI ────────────────────
interface TaskPlanItem { id: number | string; title: string; sub?: string; estimatedMinutes?: number; navigateTo?: string; }

export function DobodyTaskPlan({ tasks, onComplete, onNavigate }: { tasks: TaskPlanItem[]; onComplete?: (id: number | string) => void; onNavigate?: (path: string) => void }) {
  const [done, setDone] = useState<Set<number | string>>(new Set());
  const toggle = (id: number | string) => {
    setDone(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
    onComplete?.(id);
  };

  return (
    <Widget title="📋 Dobody Günlük Plan"
      badge={<span className={cn("text-[9px] px-1.5 py-0.5 rounded-full", done.size === tasks.length ? "bg-green-500/15 text-green-400" : "bg-amber-500/15 text-amber-400")}>{done.size}/{tasks.length}</span>}>
      {tasks.map((t, i) => (
        <div key={t.id} className="flex items-center gap-2 px-3 py-2 border-b last:border-0">
          <button onClick={() => toggle(t.id)}
            className={cn("w-5 h-5 rounded flex items-center justify-center text-[9px] flex-shrink-0 transition-all border", done.has(t.id) ? "bg-green-500/20 border-green-500/40 text-green-400" : "bg-muted/40 border-border text-muted-foreground")}>
            {done.has(t.id) ? "✓" : i + 1}
          </button>
          <div className="flex-1 min-w-0" style={{ opacity: done.has(t.id) ? 0.4 : 1 }}>
            <p className={cn("text-[11px] font-medium", done.has(t.id) && "line-through")}>{t.title}</p>
            {t.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{t.sub}</p>}
          </div>
          {t.estimatedMinutes && <span className="text-[9px] text-muted-foreground flex-shrink-0">{t.estimatedMinutes}dk</span>}
          {t.navigateTo && onNavigate && (
            <button onClick={() => onNavigate(t.navigateTo!)} className="text-[9px] text-blue-400 flex-shrink-0 hover:underline">→</button>
          )}
        </div>
      ))}
    </Widget>
  );
}

// ─── MİSAFİR GERİ BİLDİRİM + SLA WIDGET ───────────────
interface FeedbackItem { id: number; rating: number; comment?: string; time: string; source?: string; customerName?: string; slaHoursLeft?: number; needsResponse?: boolean; onClick?: () => void; }

export function FeedbackWidget({ items, showSLA = true, title = "⭐ Misafir Geri Bildirim", onViewAll }: { items: FeedbackItem[]; showSLA?: boolean; title?: string; onViewAll?: () => void }) {
  const pendingSLA = items.filter(f => f.needsResponse).length;
  const ratingColor = (r: number) => r >= 4 ? "#4ade80" : r >= 3 ? "#fbbf24" : "#f87171";

  return (
    <Widget title={title}
      badge={<>
        {pendingSLA > 0 && showSLA && <span className="text-[9px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-full">{pendingSLA} SLA bekliyor</span>}
        {onViewAll && <button onClick={onViewAll} className="text-[9px] text-blue-400 hover:underline ml-1">Tümü →</button>}
      </>}>
      {items.map((f) => (
        <ListItem key={f.id} title={`${f.rating}★ — ${f.comment || "Yorum yok"}`}
          meta={`${f.time} · ${f.source || "QR"} · ${f.customerName || "Anonim"}`}
          onClick={f.onClick}
          priority={`${f.rating}★`} priorityColor={ratingColor(f.rating)}
          slaLabel={showSLA && f.needsResponse && f.slaHoursLeft ? `${f.slaHoursLeft}s` : undefined}
          slaColor={f.slaHoursLeft && f.slaHoursLeft <= 6 ? "#f87171" : "#fbbf24"}
          slaPct={showSLA && f.slaHoursLeft ? Math.min(100, ((24 - f.slaHoursLeft) / 24) * 100) : undefined} />
      ))}
      {items.length === 0 && <p className="text-[10px] text-muted-foreground px-3 py-3">Yeni geri bildirim yok</p>}
    </Widget>
  );
}

// ─── LOST & FOUND BANNER ────────────────────────────────
interface LostFoundItem { id: number; description: string; foundArea: string; foundTime: string; foundByName?: string; }

export function LostFoundBanner({ item, onClick }: { item: LostFoundItem | null; onClick?: () => void }) {
  if (!item) return null;
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-blue-500/25 bg-blue-500/[0.06] text-left hover:bg-blue-500/10 transition-colors">
      <span className="text-sm flex-shrink-0">🔍</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-blue-400">Kayıp Eşya Bulundu!</p>
        <p className="text-[10px] text-muted-foreground truncate">
          {item.description} — {item.foundArea} · {item.foundTime}{item.foundByName ? ` · ${item.foundByName} buldu` : ""}
        </p>
      </div>
      <span className="text-[10px] text-blue-400 flex-shrink-0">detay →</span>
    </button>
  );
}

// ─── QC STATUS WIDGET ───────────────────────────────────
interface QCStatusData { todayTotal: number; pending: number; approved: number; rejected: number; passRate: number; overdueCount?: number; oldestPendingHours?: number; }

export function QCStatusWidget({ data, onViewAll }: { data: QCStatusData | null; onViewAll?: () => void }) {
  if (!data) return null;
  return (
    <Widget title="🔬 Kalite Kontrol"
      badge={<>
        {data.pending > 0 && <span className="text-[9px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-full">{data.pending} bekleyen</span>}
        {(data.overdueCount ?? 0) > 0 && <span className="text-[9px] bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded-full ml-1">{data.overdueCount} yapılmamış!</span>}
        {onViewAll && <button onClick={onViewAll} className="text-[9px] text-blue-400 hover:underline ml-1">QC →</button>}
      </>}>
      <div className="grid grid-cols-4 gap-2 p-3">
        {[
          { label: "Toplam", value: data.todayTotal, color: undefined },
          { label: "Geçme %", value: `%${data.passRate}`, color: data.passRate >= 90 ? "text-green-400" : "text-amber-400" },
          { label: "Onaylı", value: data.approved, color: "text-green-400" },
          { label: "Red", value: data.rejected, color: data.rejected > 0 ? "text-red-400" : undefined },
        ].map((item, i) => (
          <div key={i} className="text-center">
            <div className={cn("text-sm font-bold", item.color)}>{item.value}</div>
            <div className="text-[9px] text-muted-foreground">{item.label}</div>
          </div>
        ))}
      </div>
      {data.oldestPendingHours && data.oldestPendingHours > 2 && (
        <div className="px-3 py-1.5 border-t bg-amber-500/5">
          <span className="text-[10px] text-amber-400">⚠ En eski bekleyen: {data.oldestPendingHours} saat önce üretildi</span>
        </div>
      )}
    </Widget>
  );
}

// ─── CLICKABLE WIDGET (tıklanabilir wrapper) ────────────
export function ClickableWidget({ title, badge, onClick, children, className }: { title: ReactNode; badge?: ReactNode; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <div onClick={onClick} className={cn("rounded-xl border overflow-hidden cursor-pointer hover:border-blue-500/25 transition-colors", className)}>
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
        <span className="text-[11px] font-medium flex-1">{title}</span>
        {badge}
        <span className="text-[9px] text-blue-400">→</span>
      </div>
      <div>{children}</div>
    </div>
  );
}
