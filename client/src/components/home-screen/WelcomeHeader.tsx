import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

interface WelcomeHeaderProps {
  firstName?: string;
  role: string;
  branchName?: string | null;
  alerts?: { criticalCount: number; pendingTasks: number; pendingApprovals: number };
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin:{ label:"Admin", color:"#fbbf24" }, ceo:{ label:"CEO", color:"#fbbf24" },
  cgo:{ label:"CGO", color:"#60a5fa" }, coach:{ label:"Coach", color:"#22c55e" },
  trainer:{ label:"Trainer", color:"#c084fc" },
  muhasebe_ik:{ label:"İK-Muhasebe", color:"#60a5fa" }, muhasebe:{ label:"Muhasebe", color:"#60a5fa" },
  satinalma:{ label:"Satınalma", color:"#f59e0b" },
  supervisor:{ label:"Supervisor", color:"#a5a0f0" }, supervisor_buddy:{ label:"Sup.Buddy", color:"#a5a0f0" },
  mudur:{ label:"Müdür", color:"#d97706" },
  barista:{ label:"Barista", color:"#6b7a8d" }, bar_buddy:{ label:"BarBuddy", color:"#6b7a8d" },
  stajyer:{ label:"Stajyer", color:"#6b7a8d" },
  fabrika_mudur:{ label:"Fabrika Md.", color:"#f59e0b" }, uretim_sefi:{ label:"Üretim Şefi", color:"#f59e0b" },
  yatirimci_branch:{ label:"Yatırımcı", color:"#d97706" }, yatirimci_hq:{ label:"Yatırımcı", color:"#d97706" },
};

type KpiVariant = "alert"|"warn"|"ok"|"info"|"neutral";
interface KpiItem { label:string; value:string|number; variant:KpiVariant; trend?:"up"|"down"|"flat"; }

function KpiChip({ label, value, variant, trend, compact }: KpiItem & { compact?:boolean }) {
  const COLORS: Record<KpiVariant,string> = { alert:"#ef4444", warn:"#fbbf24", ok:"#22c55e", info:"#60a5fa", neutral:"#6b7a8d" };
  const c = COLORS[variant];
  const arrow = trend==="up"?"▲":trend==="down"?"▼":trend==="flat"?"—":null;
  const ac = trend==="up"?"#22c55e":trend==="down"?"#ef4444":"#6b7a8d";
  if (compact) return (
    <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg border shrink-0" style={{borderColor:`${c}30`,background:`${c}08`}}>
      <span className="font-bold" style={{color:c,fontSize:13}}>{value}</span>
      {arrow&&<span style={{color:ac,fontSize:9}}>{arrow}</span>}
      <span className="font-semibold" style={{color:c,fontSize:10}}>{label}</span>
    </div>
  );
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border shrink-0" style={{borderColor:`${c}30`,background:`${c}08`}}>
      <span className="font-bold leading-none" style={{color:c,fontSize:18}}>{value}</span>
      {arrow&&<span style={{color:ac,fontSize:11}}>{arrow}</span>}
      <span className="font-semibold" style={{color:c,fontSize:12}}>{label}</span>
    </div>
  );
}

export function WelcomeHeader({ role, alerts }: WelcomeHeaderProps) {
  const { user } = useAuth();
  const { data: healthData } = useQuery<any>({ queryKey: ["/api/agent/branch-health"], staleTime: 60000, retry: false });

  const firstName = user?.fullName?.split(" ")[0] || user?.username || "";
  const roleInfo = ROLE_LABELS[role] || { label: role, color: "#6b7a8d" };
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";
  const today = new Date().toLocaleDateString("tr-TR", { day:"numeric", month:"long", year:"numeric", weekday:"long" });

  const branches = healthData?.branches || [];
  const criticalCount = branches.filter((b:any) => (b.totalScore||b.overallScore||0) < 50).length;
  const healthAvg = branches.length > 0 ? Math.round(branches.reduce((s:number,b:any) => s+(b.totalScore||b.overallScore||0),0)/branches.length) : 0;

  const kpis: KpiItem[] = [];
  if (branches.length > 0) kpis.push({ label:"Sağlık", value:healthAvg, variant: healthAvg>=70?"ok":healthAvg>=50?"warn":"alert" });
  if ((alerts?.criticalCount||criticalCount) > 0) kpis.push({ label:"Kritik", value:alerts?.criticalCount||criticalCount, variant:"alert", trend:"up" });
  if ((alerts?.pendingTasks||0) > 0) kpis.push({ label:"Görev", value:alerts.pendingTasks, variant:"info" });
  if ((alerts?.pendingApprovals||0) > 0) kpis.push({ label:"Onay", value:alerts.pendingApprovals, variant:"warn" });

  const isMobile = typeof window !== "undefined" && window.innerWidth < 480;

  return (
    <div className="space-y-2.5 mb-3">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-foreground" style={{fontSize: isMobile ? 17 : 20}}>{greet}, {firstName}</span>
          <span className="px-2 py-0.5 rounded-full font-semibold" style={{background:`${roleInfo.color}20`,color:roleInfo.color,fontSize:isMobile?11:12}}>{roleInfo.label}</span>
        </div>
        <p className="text-muted-foreground" style={{fontSize: isMobile ? 12 : 13}}>{today}</p>
      </div>
      {/* Sprint 50.1 hotfix (Aslan 13 May 2026): AiAlertsBell AppHeader'a taşındı,
          her sayfada görünür. Bu duplicate'i kaldırdık. */}
      {kpis.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {kpis.map((k,i) => <KpiChip key={i} label={k.label} value={k.value} variant={k.variant} trend={k.trend} compact={isMobile}/>)}
        </div>
      )}
    </div>
  );
}
