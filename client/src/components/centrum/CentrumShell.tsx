/**
 * CentrumShell v4 — Dark + Light dual mode.
 * Dark: JSX prototype birebir. Light: Onaylanan v16.
 * useTheme() ile otomatik mod algılama.
 */
import { ReactNode, useState } from "react";
import { useTheme } from "@/contexts/theme-context";

// ═══ DUAL TOKEN SİSTEMİ ═══
const DARK = {
  bg:"#0c0f14", card:"#141820", border:"#1e2530", muted:"#6b7a8d", text:"#e8ecf1",
  alert:"#ef4444", warn:"#fbbf24", ok:"#22c55e", info:"#60a5fa", purple:"#a5a0f0",
  widgetHeaderBg:"rgba(30,37,48,0.25)", widgetHeaderText:"#e8ecf1",
  dobodyBg:"rgba(165,160,240,0.06)", dobodyBorder:"rgba(165,160,240,0.40)",
  dobodyBodyBg:"rgba(165,160,240,0.06)", dobodyHeaderBg:"rgba(165,160,240,0.06)",
  badgeBgAlpha:"20", badgeTextWhite:false,
  titleBarBg:"transparent", titleBarText:"#e8ecf1", titleBarMuted:"#6b7a8d",
  timeActiveBg:"rgba(96,165,250,0.15)", timeActiveText:"#60a5fa", timeInactiveText:"#6b7a8d",
  lostBg:"rgba(251,191,36,0.06)", lostBorder:"rgba(251,191,36,0.40)",
  hoverBg:"hover:bg-white/[0.02]", rowBorder:"#1e2530",
};

const LIGHT = {
  bg:"#edeae4", card:"#ffffff", border:"#ddd8d0", muted:"#3d3832", text:"#1c1b18",
  alert:"#dc2626", warn:"#d97706", ok:"#16a34a", info:"#2563eb", purple:"#7c3aed",
  widgetHeaderBg:"#1e2a3a", widgetHeaderText:"#ffffff",
  dobodyBg:"#dc2626", dobodyBorder:"#dc2626",
  dobodyBodyBg:"#dc2626", dobodyHeaderBg:"#1e2a3a",
  badgeBgAlpha:"FF", badgeTextWhite:true,
  titleBarBg:"#1e2a3a", titleBarText:"#ffffff", titleBarMuted:"rgba(255,255,255,0.85)",
  timeActiveBg:"#dc2626", timeActiveText:"#ffffff", timeInactiveText:"rgba(255,255,255,0.55)",
  lostBg:"rgba(217,119,6,0.06)", lostBorder:"rgba(217,119,6,0.40)",
  hoverBg:"hover:bg-black/[0.02]", rowBorder:"rgba(221,216,208,0.60)",
};

function useT() {
  try {
    const { effectiveTheme } = useTheme();
    return effectiveTheme === "dark" ? DARK : LIGHT;
  } catch {
    return DARK; // fallback
  }
}

// ═══ TYPES ═══
export type KpiVariant = "alert" | "warn" | "ok" | "info" | "purple" | "neutral";
export type DobodyMode = "auto" | "action" | "info";
export type TimePeriod = "today" | "week" | "month" | "quarter";

// ═══ KPI CHIP ═══
interface KpiChipProps { label: string; value: string | number; variant?: KpiVariant; sub?: string; onClick?: () => void; }
export function KpiChip({ label, value, variant = "neutral", sub, onClick }: KpiChipProps) {
  const T = useT();
  const V: Record<KpiVariant, string> = { alert:T.alert, warn:T.warn, ok:T.ok, info:T.info, purple:T.purple, neutral:T.muted };
  const c = V[variant];
  return (
    <div onClick={onClick} className={`flex flex-col px-2 py-1.5 rounded-xl border min-w-[80px] shrink-0 ${onClick?"cursor-pointer":""}`}
      style={{borderColor:`${c}30`,background:`${c}08`}}>
      <span className="text-base font-bold leading-none" style={{color:c}}>{value}</span>
      <span className="text-[8px] mt-0.5" style={{color:T.muted}}>{label}</span>
      {sub&&<span className="text-[8px]" style={{color:`${c}99`}}>{sub}</span>}
    </div>
  );
}

// ═══ WIDGET ═══
interface WidgetProps { title: string; badge?: ReactNode; children: ReactNode; onClick?: () => void; className?: string; noPadding?: boolean; action?: ReactNode; }
export function Widget({ title, badge, children, onClick, className="" }: WidgetProps) {
  const T = useT();
  return (
    <div className={`rounded-xl border overflow-hidden ${onClick?"cursor-pointer hover:border-blue-500/30":""} ${className}`}
      style={{borderColor:T.border,background:T.card}} onClick={onClick}>
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b"
        style={{borderColor:T===LIGHT?"rgba(255,255,255,0.10)":T.border, background:T.widgetHeaderBg}}>
        <span className="text-[10px] font-semibold flex-1" style={{color:T.widgetHeaderText}}>{title}</span>
        {badge}
        {onClick&&<span className="text-[8px]" style={{color:T===LIGHT?"rgba(255,255,255,0.60)":T.info}}>→</span>}
      </div>
      <div>{children}</div>
    </div>
  );
}

// ═══ CLICKABLE WIDGET ═══
export function ClickableWidget({ title, badge, onClick, children, className }: { title: ReactNode; badge?: ReactNode; onClick: () => void; children: ReactNode; className?: string }) {
  return <Widget title={typeof title==="string"?title:""} badge={badge} onClick={onClick} className={className}>{children}</Widget>;
}

// ═══ DOBODY SLOT ═══
interface DobodyAction { id: number|string; title: string; sub?: string; mode?: DobodyMode; onApprove?: () => void; approving?: boolean; btnLabel?: string; btnVariant?: string; }
export function DobodySlot({ actions }: { actions: DobodyAction[]; compact?: boolean }) {
  const T = useT();
  const isLight = T === LIGHT;
  return (
    <div className="rounded-xl overflow-hidden" style={isLight
      ? {background:T.dobodyBodyBg}
      : {border:"1px dashed",borderColor:T.dobodyBorder,background:T.dobodyBg}
    }>
      <div className="flex items-center gap-1 px-2.5 py-1.5"
        style={isLight
          ? {background:T.dobodyHeaderBg,borderBottom:"1px solid rgba(255,255,255,0.15)"}
          : {borderBottom:`1px solid ${T.purple}12`}
        }>
        <span className="text-[9px] font-bold" style={{color:isLight?"white":T.purple}}>◈ Mr. Dobody</span>
        {actions.length>0&&<span className="text-[8px] px-1 rounded-full font-bold"
          style={isLight?{background:"rgba(255,255,255,0.20)",color:"white"}:{background:`${T.purple}20`,color:T.purple}}>{actions.length}</span>}
      </div>
      {actions.length===0?(
        <p className="text-[9px] px-2.5 py-2" style={{color:isLight?"rgba(255,255,255,0.70)":T.muted}}>Bekleyen öneri yok</p>
      ):actions.map((a)=>{
        const mode=a.mode||(a.onApprove?"action":"info");
        return(
          <div key={a.id} className="flex items-start gap-1.5 px-2.5 py-1.5"
            style={{borderBottom:isLight?"1px solid rgba(255,255,255,0.10)":`1px solid ${T.purple}08`}}>
            <span className="w-1.5 h-1.5 rounded-full mt-1 shrink-0"
              style={{background:mode==="auto"?(isLight?"#4ade80":T.ok):mode==="action"?(isLight?"white":T.purple):(isLight?"rgba(255,255,255,0.5)":T.muted)}}/>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-medium" style={{color:isLight?"white":T.text}}>{a.title}</p>
              {a.sub&&<p className="text-[8px]" style={{color:isLight?"rgba(255,255,255,0.70)":T.muted}}>{a.sub}</p>}
            </div>
            {mode==="action"&&a.onApprove&&(
              <button onClick={(e)=>{e.stopPropagation();a.onApprove?.();}} disabled={a.approving}
                className="text-[8px] px-1.5 py-0.5 rounded shrink-0 font-semibold"
                style={isLight?{background:"rgba(255,255,255,0.20)",color:"white"}:{background:`${T.purple}15`,color:T.purple}}>
                {a.approving?"...":(a.btnLabel||"Onayla")}
              </button>
            )}
            {mode==="auto"&&<span className="text-[7px] px-1 rounded shrink-0 font-bold"
              style={isLight?{background:"rgba(255,255,255,0.20)",color:"#4ade80"}:{background:`${T.ok}15`,color:T.ok}}>✓</span>}
          </div>
        );
      })}
    </div>
  );
}

// ═══ MINISTATS ═══
interface MiniStatRow { label: string; value: string|number; color?: string; }
export function MiniStats({ title, rows, linkText, onLink }: { title: string; rows: MiniStatRow[]; linkText?: string; onLink?: () => void }) {
  const T = useT();
  return (
    <Widget title={title} onClick={onLink}>
      {rows.map((r,i)=>(
        <div key={i} className="flex justify-between text-[9px] px-2.5 py-0.5">
          <span style={{color:T.muted}}>{r.label}</span>
          <span className="font-semibold" style={{color:r.color||T.text}}>{r.value}</span>
        </div>
      ))}
    </Widget>
  );
}

// ═══ PROGRESS WIDGET ═══
interface ProgRow { label: string; value: number; max?: number; }
export function ProgressWidget({ title, rows }: { title: string; rows: ProgRow[]; linkText?: string; onLink?: () => void }) {
  const T = useT();
  return (
    <Widget title={title}>
      {rows.map((r,i)=>{
        const mx=r.max||100;const p=Math.min(100,Math.round((r.value/mx)*100));
        const c=p>=80?T.ok:p>=60?T.warn:T.alert;
        return(
          <div key={i} className="flex items-center gap-1.5 px-2.5 py-0.5">
            <span className="text-[8px] w-12 shrink-0 truncate" style={{color:T.muted}}>{r.label}</span>
            <div className="flex-1 h-1 rounded-full" style={{background:T.border}}>
              <div className="h-full rounded-full" style={{width:`${p}%`,background:c}}/>
            </div>
            <span className="text-[8px] font-semibold w-6 text-right" style={{color:c}}>{r.value}</span>
          </div>
        );
      })}
    </Widget>
  );
}

// ═══ LIST ITEM ═══
interface ListItemProps { title: string; meta?: string; priority?: string; priorityColor?: string; slaLabel?: string; slaColor?: string; slaPct?: number; action?: ReactNode; onClick?: () => void; }
export function ListItem({ title, meta, priority, priorityColor, onClick }: ListItemProps) {
  const T = useT();
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 border-b last:border-0 ${onClick?"cursor-pointer "+T.hoverBg:""}`}
      style={{borderColor:T.rowBorder}} onClick={onClick}>
      {priority&&<span className="w-1.5 h-1.5 rounded-full shrink-0" style={{background:priorityColor||T.muted}}/>}
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-medium truncate" style={{color:T.text}}>{title}</p>
        {meta&&<p className="text-[8px] truncate" style={{color:T.muted}}>{meta}</p>}
      </div>
      {priority&&<span className="text-[8px] font-semibold shrink-0" style={{color:priorityColor||T.muted}}>{priority}</span>}
    </div>
  );
}

// ═══ BADGE ═══
export function Badge({ text, color }: { text: string; color: string }) {
  const T = useT();
  const isLight = T === LIGHT;
  return <span className="text-[7px] px-1.5 py-0.5 rounded-full shrink-0 font-bold"
    style={isLight?{background:color,color:"white"}:{background:`${color}20`,color}}>{text}</span>;
}

// ═══ TIME FILTER ═══
const TIME_LABELS: Record<TimePeriod,string> = {today:"Bugün",week:"Bu Hafta",month:"Bu Ay",quarter:"Çeyrek"};
export function TimeFilter({ value, onChange }: { value: TimePeriod; onChange: (v: TimePeriod) => void; className?: string }) {
  const T = useT();
  return (
    <div className="flex gap-1">
      {(Object.keys(TIME_LABELS) as TimePeriod[]).map(k=>(
        <button key={k} onClick={()=>onChange(k)} className="text-[8px] px-1.5 py-0.5 rounded-md"
          style={{background:value===k?T.timeActiveBg:"transparent",color:value===k?T.timeActiveText:T.timeInactiveText}}>
          {TIME_LABELS[k]}
        </button>
      ))}
    </div>
  );
}

// ═══ ESCALATION BADGE ═══
interface EscalationItem { id: number|string; title: string; level: number; color?: string; }
export function EscalationBadge({ items, title="Eskalasyon" }: { items: EscalationItem[]; title?: string }) {
  const T = useT();
  return (
    <Widget title={title} onClick={()=>{}}>
      {items.map(e=><ListItem key={e.id} title={e.title} priority={`K${e.level}`} priorityColor={e.level>=4?T.alert:T.warn} onClick={()=>{}}/>)}
    </Widget>
  );
}

// ═══ TOP FLOP ═══
interface RankedBranch { id: number; name: string; score: number; }
export function TopFlop({ branches, onBranchClick, onViewAll }: { branches: RankedBranch[]; onBranchClick?: (id: number) => void; onViewAll?: () => void }) {
  const T = useT();
  const sorted=[...branches].sort((a,b)=>b.score-a.score);
  return (
    <Widget title="🏆Top3 / ⚠Flop3" onClick={onViewAll}>
      <div className="px-2.5 py-0.5"><span className="text-[8px]" style={{color:T.ok}}>EN İYİ</span></div>
      {sorted.slice(0,3).map((b,i)=><ListItem key={`t${i}`} title={`${i+1}. ${b.name}`} priority={`${b.score}`} priorityColor={T.ok} onClick={()=>onBranchClick?.(b.id)}/>)}
      <div className="px-2.5 py-0.5 border-t" style={{borderColor:T.border}}><span className="text-[8px]" style={{color:T.alert}}>EN ZAYIF</span></div>
      {sorted.slice(-3).reverse().map((b,i)=><ListItem key={`f${i}`} title={b.name} priority={`${b.score}`} priorityColor={T.alert} onClick={()=>onBranchClick?.(b.id)}/>)}
    </Widget>
  );
}

// ═══ DOBODY TASK PLAN ═══
interface TaskPlanItem { id: number|string; title: string; sub?: string; estimatedMinutes?: number; navigateTo?: string; }
export function DobodyTaskPlan({ tasks, onComplete, onNavigate }: { tasks: TaskPlanItem[]; onComplete?: (id: number|string) => void; onNavigate?: (path: string) => void }) {
  const T = useT();
  const [done,setDone]=useState<Set<number>>(new Set());
  return (
    <Widget title="📋 Dobody Plan" badge={<Badge text={`${done.size}/${tasks.length}`} color={done.size===tasks.length?T.ok:T.warn}/>}>
      {tasks.map((t,i)=>(
        <div key={t.id||i} className="flex items-center gap-1.5 px-2.5 py-1 border-b last:border-0" style={{borderColor:T.border}}>
          <button onClick={()=>{setDone(p=>{const n=new Set(p);n.has(i)?n.delete(i):n.add(i);return n;});onComplete?.(t.id);}}
            className="w-3.5 h-3.5 rounded flex items-center justify-center text-[7px] shrink-0"
            style={{background:done.has(i)?`${T.ok}25`:T.border,color:done.has(i)?T.ok:T.muted}}>
            {done.has(i)?"✓":i+1}
          </button>
          <div className="flex-1 cursor-pointer" style={{opacity:done.has(i)?0.4:1}} onClick={()=>t.navigateTo&&onNavigate?.(t.navigateTo)}>
            <p className="text-[9px] font-medium" style={{color:T.text,textDecoration:done.has(i)?"line-through":"none"}}>{t.title}</p>
            {t.sub&&<p className="text-[8px]" style={{color:T.muted}}>{t.sub}</p>}
          </div>
        </div>
      ))}
    </Widget>
  );
}

// ═══ FEEDBACK WIDGET ═══
interface FeedbackItem { id: number|string; rating?: number; comment?: string; time?: string; source?: string; customerName?: string; slaHoursLeft?: number; needsResponse?: boolean; onClick?: () => void; }
export function FeedbackWidget({ items, showSLA=true, title="⭐ Misafir Geri Bildirim", onViewAll }: { items: FeedbackItem[]; showSLA?: boolean; title?: string; onViewAll?: () => void }) {
  const T = useT();
  const slaCount=items.filter(f=>f.needsResponse).length;
  return (
    <Widget title={title} onClick={onViewAll} badge={items.length>0?<Badge text={`${items.length} yeni`} color={T.warn}/>:undefined}>
      {items.map((f)=>{
        const dot=(f.rating||5)<=2.5?T.alert:(f.rating||5)>=4?T.ok:T.warn;
        return(
          <div key={f.id} className={`flex items-center gap-1.5 px-2.5 py-1 border-b last:border-0 cursor-pointer ${T.hoverBg}`}
            style={{borderColor:T.rowBorder}} onClick={f.onClick}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{background:dot}}/>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-medium truncate" style={{color:T.text}}>{f.rating}★ {f.comment}</p>
              <p className="text-[8px] truncate" style={{color:T.muted}}>{f.time}·{f.source}·{f.customerName||"Anonim"}</p>
            </div>
            <span className="text-[8px] font-semibold shrink-0" style={{color:dot}}>
              {showSLA&&f.slaHoursLeft?`SLA ${f.slaHoursLeft}s!`:`${f.rating}★`}
            </span>
          </div>
        );
      })}
      {showSLA&&slaCount>0&&(
        <div className="px-2.5 py-1" style={{background:`${T.warn}08`}}>
          <span className="text-[8px]" style={{color:T.warn}}>⏰ {slaCount} yanıt bekliyor (SLA: 4 saat)</span>
        </div>
      )}
    </Widget>
  );
}

// ═══ LOST & FOUND BANNER ═══
interface LostFoundItem { id: number|string; description: string; foundArea?: string; foundTime?: string; foundByName?: string; }
export function LostFoundBanner({ item, onClick }: { item: LostFoundItem|null; onClick?: () => void }) {
  const T = useT();
  if (!item) return null;
  return (
    <div className="rounded-xl border overflow-hidden cursor-pointer hover:border-amber-500/30"
      style={{borderColor:T.lostBorder,background:T.lostBg}} onClick={onClick}>
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <span className="text-[10px]">🔍</span>
        <div className="flex-1">
          <p className="text-[9px] font-medium" style={{color:T.text}}>Kayıp Eşya Bulundu!</p>
          <p className="text-[8px]" style={{color:T.muted}}>{item.description} · {item.foundArea} · {item.foundTime}{item.foundByName?` · ${item.foundByName} buldu`:""}</p>
        </div>
        <span className="text-[8px]" style={{color:T.info}}>Detay →</span>
      </div>
    </div>
  );
}

// ═══ QC STATUS WIDGET ═══
interface QCStatusData { todayTotal: number; pending: number; approved: number; rejected: number; passRate: number; overdueCount: number; oldestPendingHours?: number; }
export function QCStatusWidget({ data, onViewAll }: { data: QCStatusData|null; onViewAll?: () => void }) {
  const T = useT();
  if (!data) return null;
  return (
    <Widget title="QC Durum" onClick={onViewAll}>
      <div className="flex justify-between text-[9px] px-2.5 py-0.5"><span style={{color:T.muted}}>Bekleyen</span><span className="font-semibold" style={{color:data.pending>0?T.warn:T.ok}}>{data.pending} lot</span></div>
      <div className="flex justify-between text-[9px] px-2.5 py-0.5"><span style={{color:T.muted}}>Onay</span><span className="font-semibold" style={{color:T.ok}}>{data.approved}</span></div>
      <div className="flex justify-between text-[9px] px-2.5 py-0.5"><span style={{color:T.muted}}>Red</span><span className="font-semibold" style={{color:data.rejected>0?T.alert:T.text}}>{data.rejected}</span></div>
      <div className="flex justify-between text-[9px] px-2.5 py-0.5"><span style={{color:T.muted}}>Geçiş</span><span className="font-semibold" style={{color:data.passRate>=90?T.ok:T.warn}}>%{data.passRate}</span></div>
    </Widget>
  );
}

// ═══ CENTRUM SHELL ═══
interface CentrumShellProps {
  title: string; subtitle?: string; roleLabel?: string; roleColor?: string; roleBg?: string;
  kpis?: { label: string; value: string|number; variant: KpiVariant; sub?: string }[];
  actions?: ReactNode; tabs?: { label: string }[];
  activeTab?: number; onTabChange?: (i: number) => void;
  children: ReactNode; rightPanel?: ReactNode; className?: string;
}
export function CentrumShell({ title, subtitle, roleLabel, roleColor, kpis, actions, tabs, activeTab=0, onTabChange, children, rightPanel }: CentrumShellProps) {
  const T = useT();
  const isLight = T === LIGHT;
  return (
    <div className="flex flex-col h-full overflow-hidden" style={{background:T.bg,color:T.text}}>
      <div className="flex items-center gap-2 px-3 py-1.5 shrink-0"
        style={isLight?{background:T.titleBarBg}:{borderBottom:`1px solid ${T.border}`}}>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold" style={{color:T.titleBarText}}>{title}</span>
            {roleLabel&&<span className="text-[8px] px-1.5 py-0.5 rounded-full font-semibold"
              style={isLight?{background:"rgba(255,255,255,0.15)",color:"white"}:{background:`${roleColor}18`,color:roleColor}}>{roleLabel}</span>}
          </div>
          {subtitle&&<p className="text-[8px]" style={{color:T.titleBarMuted}}>{subtitle}</p>}
        </div>
        {actions}
      </div>
      {kpis&&kpis.length>0&&(
        <div className="flex gap-1 px-2.5 py-1 border-b shrink-0 overflow-x-auto" style={{borderColor:T.border}}>
          {kpis.map((k,i)=><KpiChip key={i} label={k.label} value={k.value} variant={k.variant} sub={k.sub}/>)}
        </div>
      )}
      {tabs&&tabs.length>0&&(
        <div className="flex border-b px-2 overflow-x-auto shrink-0" style={{borderColor:T.border}}>
          {tabs.map((tab,i)=>(
            <button key={i} onClick={()=>onTabChange?.(i)} className="py-1 px-2 text-[9px] border-b-2 shrink-0"
              style={{borderColor:i===activeTab?T.ok:"transparent",color:i===activeTab?T.text:T.muted}}>
              {tab.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2 flex-1 overflow-hidden p-2">
        <div className="flex-1 overflow-y-auto space-y-2">{children}</div>
        {rightPanel&&(<div className="w-[170px] shrink-0 space-y-2 overflow-y-auto">{rightPanel}</div>)}
      </div>
    </div>
  );
}

export { DARK as DSTokensDark, LIGHT as DSTokensLight };
