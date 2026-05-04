/**
 * CEO Control Centrum — Onaylanan JSX prototype birebir
 * Widget'lar: Şube Sağlık, Eskalasyon, Merkez Bordro, Diğer Şubeler,
 *             Merkez Gider, Franchise KPI + Sağ panel Dobody
 */
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { CentrumShell, KpiChip, Widget, MiniStats, ListItem, DobodySlot, ProgressWidget, TimeFilter, type TimePeriod, type KpiVariant } from "@/components/centrum/CentrumShell";
import { useState } from "react";
import { DobodyProposalWidget } from "@/components/DobodyProposalWidget";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function CEOCommandCenter() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [period, setPeriod] = useState<TimePeriod>("month");

  const { data: healthData } = useQuery<any>({
    queryKey: ["/api/agent/branch-health"],
    refetchInterval: 60000,
  });

  const { data: escalationData } = useQuery<any[]>({
    queryKey: ["/api/agent/actions", "escalated", "ceo"],
    queryFn: async () => {
      const res = await fetch("/api/agent/actions?status=escalated&limit=10", { credentials: "include" });
      if (!res.ok) return [];
      const d = await res.json();
      return Array.isArray(d) ? d : (d.actions || []);
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: dobodyActions = [] } = useQuery<any[]>({
    queryKey: ["/api/agent/actions", "pending"],
    queryFn: async () => {
      const res = await fetch("/api/agent/actions?status=pending&limit=10", { credentials: "include" });
      if (!res.ok) return [];
      const d = await res.json();
      return Array.isArray(d) ? d : (d.actions || []);
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: dashData, isLoading } = useQuery<any>({
    queryKey: ["/api/hq/command-center"],
    refetchInterval: 60000,
  });

  const { data: financialData } = useQuery<any[]>({
    queryKey: ["/api/branch-financial-summary"],
  });

  if (isLoading) return <div className="p-4 space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-40 w-full" /></div>;

  const branches = healthData?.branches || [];
  const escalations = Array.isArray(escalationData) ? escalationData : [];
  const criticalCount = branches.filter((b: any) => (b.totalScore || b.overallScore || 0) < 50).length;
  const healthAvg = branches.length > 0 ? Math.round(branches.reduce((s: number, b: any) => s + (b.totalScore || b.overallScore || 0), 0) / branches.length) : 0;

  return (
    <CentrumShell
      title="CEO — Komuta" subtitle="Franchise·Finans"
      roleLabel="CEO" roleColor="#fbbf24" roleBg="rgba(251,191,36,0.18)"
      kpis={[
        { label: "Sağlık", value: healthAvg, variant: (healthAvg >= 70 ? "ok" : healthAvg >= 50 ? "warn" : "alert") as KpiVariant },
        { label: "Kritik", value: criticalCount, variant: (criticalCount > 0 ? "alert" : "ok") as KpiVariant },
        { label: "Eskalasyon", value: escalations.length, variant: (escalations.length > 0 ? "warn" : "ok") as KpiVariant },
        { label: "Personel", value: Number(dashData?.kpiSummary?.totalEmployees ?? 0), variant: "info" as KpiVariant },
        { label: "Dobody", value: dobodyActions.length, variant: "purple" as KpiVariant },
      ]}
      actions={<div className="flex items-center gap-2"><Button size="sm" variant="outline" onClick={() => setLocation("/task-atama")} className="text-xs h-7">+ Görev</Button><Button size="sm" variant="outline" onClick={() => setLocation("/raporlar")} className="text-xs h-7">Raporlar</Button><TimeFilter value={period} onChange={setPeriod} /></div>}
      rightPanel={<DobodyProposalWidget maxItems={5} />}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <Widget title="Şube Sağlık" onClick={() => setLocation("/sube-saglik-skoru")}
          badge={criticalCount > 0 ? <span className="text-[7px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.20)", color: "#ef4444" }}>{criticalCount}kritik</span> : undefined}>
          {[...branches].sort((a: any, b: any) => (b.totalScore || b.overallScore || 0) - (a.totalScore || a.overallScore || 0)).slice(0, 6).map((b: any, i: number) => {
            const score = b.totalScore || b.overallScore || 0;
            const c = score >= 70 ? "#22c55e" : score >= 50 ? "#fbbf24" : "#ef4444";
            return <div key={i} className="flex items-center gap-1.5 px-2.5 py-0.5">
              <span className="text-[8px] w-16 shrink-0 truncate" style={{ color: "#6b7a8d" }}>{b.branchName || b.name}</span>
              <div className="flex-1 h-1 rounded-full" style={{ background: "#1e2530" }}>
                <div className="h-full rounded-full" style={{ width: `${score}%`, background: c }} />
              </div>
              <span className="text-[8px] font-semibold w-6 text-right" style={{ color: c }}>{score}</span>
            </div>;
          })}
        </Widget>

        <Widget title="Eskalasyon" onClick={() => setLocation("/crm")}>
          {escalations.slice(0, 4).map((a: any, i: number) => (
            <ListItem key={i} title={a.title || a.summary || "Eskalasyon"} meta={a.description || ""}
              priority={`K${a.level || 5}`} priorityColor={a.level >= 4 ? "#ef4444" : "#fbbf24"} onClick={() => setLocation("/crm")} />
          ))}
          {escalations.length === 0 && <p className="text-[9px] px-2.5 py-2" style={{ color: "#6b7a8d" }}>Açık eskalasyon yok</p>}
        </Widget>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <MiniStats title="📈 KPI Özeti" rows={[
          { label: "Şube", value: `${Number(dashData?.kpiSummary?.totalBranches ?? 0)}` },
          { label: "Personel", value: `${Number(dashData?.kpiSummary?.totalEmployees ?? 0)}` },
          { label: "Açık arıza", value: `${Number(dashData?.kpiSummary?.activeFaults ?? 0)}`, color: "#ef4444" },
          { label: "Şube ort. skor", value: `${Number(dashData?.kpiSummary?.branchAvgScore ?? 0)}`, color: "#60a5fa" },
        ]} onLink={() => setLocation("/raporlar")} />
        <MiniStats title="🛠 Ekipman" rows={[
          { label: "Çalışıyor (uptime)", value: `%${Number(dashData?.kpiSummary?.equipmentUptime ?? 0)}`, color: "#22c55e" },
          { label: "Şube finansal", value: `${(financialData || []).length} şube` },
          { label: "Veri girişi yok", value: `${(financialData || []).filter((f: any) => !f.fixedCosts?.some((c: any) => c.amount)).length} şube⚠`, color: "#ef4444" },
        ]} onLink={() => setLocation("/teknik-arızalar")} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <Widget title="🚨 Acil Uyarılar">
          {(dashData?.urgentAlerts || []).slice(0, 4).map((u: any, i: number) => (
            <ListItem key={i} title={u.message || ""} meta={u.type || ""}
              priority={u.severity === 'critical' ? 'K1' : 'K3'}
              priorityColor={u.severity === 'critical' ? '#ef4444' : '#fbbf24'} />
          ))}
          {(!dashData?.urgentAlerts || dashData.urgentAlerts.length === 0) && (
            <p className="text-[9px] px-2.5 py-2" style={{ color: "#6b7a8d" }}>Acil uyarı yok</p>
          )}
        </Widget>
        <Widget title="⬇️ Düşük Performanslı 3 Yönetici" onClick={() => setLocation("/ik")}>
          {(dashData?.bottomManagers || []).slice(0, 3).map((m: any, i: number) => (
            <div key={i} className="flex items-center justify-between px-2.5 py-1">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] truncate" style={{ color: "#cbd5e1" }}>{m.name || "—"}</span>
                <span className="text-[8px]" style={{ color: "#6b7a8d" }}>{m.department || ""}</span>
              </div>
              <span className="text-[10px] font-semibold shrink-0 ml-2"
                style={{ color: m.score < 50 ? "#ef4444" : m.score < 70 ? "#fbbf24" : "#22c55e" }}>
                {Number(m.score ?? 0)}
              </span>
            </div>
          ))}
          {(!dashData?.bottomManagers || dashData.bottomManagers.length === 0) && (
            <p className="text-[9px] px-2.5 py-2" style={{ color: "#6b7a8d" }}>Veri yok</p>
          )}
        </Widget>
      </div>
    </CentrumShell>
  );
}
