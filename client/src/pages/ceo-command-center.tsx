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
        { label: "Bordro", value: `₺${dashData?.totalPayroll || "—"}`, variant: "info" as KpiVariant },
        { label: "Dobody", value: dobodyActions.length, variant: "purple" as KpiVariant },
      ]}
      actions={<TimeFilter value={period} onChange={setPeriod} />}
      rightPanel={
        <DobodySlot actions={dobodyActions.slice(0, 5).map((a: any) => ({
          id: a.id, title: a.title || a.summary || "Öneri", sub: a.description || a.detail || "",
          mode: "action" as const, btnLabel: "Onayla",
          onApprove: () => {},
        }))} />
      }
    >
      <div className="grid grid-cols-2 gap-2.5">
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

      <div className="grid grid-cols-2 gap-2.5">
        <MiniStats title="💰Merkez Bordro" rows={[
          { label: "Fabrika", value: "₺128K" },
          { label: "HQ", value: "₺95K" },
          { label: "Işıklar", value: "₺42K" },
          { label: "Toplam", value: `₺${dashData?.totalPayroll || "265K"}`, color: "#60a5fa" },
        ]} onLink={() => {}} />
        <MiniStats title="💰Diğer Şubeler" rows={[
          { label: "Toplam", value: "₺310K" },
          { label: "Girilmemiş", value: `${(financialData || []).filter((f: any) => !f.fixedCosts?.some((c: any) => c.amount)).length} şube⚠`, color: "#ef4444" },
        ]} onLink={() => {}} />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <MiniStats title="📊Merkez Gider" rows={[
          { label: "Kira+gider", value: "₺91K" },
          { label: "Stok", value: "₺142K", color: "#fbbf24" },
          { label: "Toplam", value: "₺233K" },
        ]} onLink={() => {}} />
        <MiniStats title="Franchise KPI" rows={[
          { label: "Müşteri", value: `${dashData?.avgRating || "—"}★`, color: "#fbbf24" },
          { label: "Eğitim", value: `%${dashData?.trainingCompletion || "—"}`, color: "#ef4444" },
          { label: "Uyum", value: `${dashData?.complianceScore || "—"}`, color: "#22c55e" },
        ]} onLink={() => {}} />
      </div>
    </CentrumShell>
  );
}
