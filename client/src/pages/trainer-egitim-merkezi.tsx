/**
 * Trainer Eğitim Merkezi — Onaylanan JSX prototype birebir
 * 5 sekme: Genel, Detay, Uyumsuz, Sıralama, Plan
 * Coach paraleli + eğitim odaklı
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CentrumShell, KpiChip, Widget, MiniStats, ListItem, DobodySlot, DobodyTaskPlan, TopFlop, ProgressWidget, TimeFilter, Badge, type TimePeriod, type KpiVariant } from "@/components/centrum/CentrumShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function TrainerEgitimMerkezi() {
  const [period, setPeriod] = useState<TimePeriod>("week");
  const [tab, setTab] = useState(0);

  const { data: compliance, isLoading } = useQuery<any>({
    queryKey: ["/api/agent/compliance-overview", period],
    queryFn: async () => { const r = await fetch(`/api/agent/compliance-overview?period=${period}`, { credentials: "include" }); return r.ok ? r.json() : null; },
  });
  const { data: overdueInsights = [] } = useQuery<any[]>({
    queryKey: ["/api/agent/insights", "overdue"],
    queryFn: async () => { const r = await fetch("/api/agent/insights?type=overdue_training&limit=30", { credentials: "include" }); if (!r.ok) return []; const d = await r.json(); return Array.isArray(d) ? d : (d.insights || []); },
  });
  const { data: pendingActions = [] } = useQuery<any[]>({
    queryKey: ["/api/agent/actions", "pending", "trainer"],
    queryFn: async () => { const r = await fetch("/api/agent/actions?status=pending&limit=10", { credentials: "include" }); if (!r.ok) return []; const d = await r.json(); return Array.isArray(d) ? d : (d.actions || []); },
  });
  const { data: healthData } = useQuery<any>({ queryKey: ["/api/agent/branch-health"] });

  if (isLoading) return <div className="p-4 space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-40 w-full" /></div>;

  const branches = healthData?.branches || [];
  const overallScore = compliance?.overallScore || compliance?.avgScore || compliance?.overall?.overallScore || 0;

  return (
    <CentrumShell
      title="Eğitim Merkezi" subtitle="Eğitim·Arıza·CRM"
      roleLabel="Trainer" roleColor="#c084fc" roleBg="rgba(192,132,252,0.18)"
      kpis={[
        { label: "Gecikmiş", value: overdueInsights.length, variant: (overdueInsights.length > 5 ? "alert" : overdueInsights.length > 0 ? "warn" : "ok") as KpiVariant },
        { label: "Tamaml.", value: `%${Math.round(overallScore)}`, variant: (overallScore >= 80 ? "ok" : overallScore >= 60 ? "warn" : "alert") as KpiVariant },
        { label: "Onboard", value: "—", variant: "info" as KpiVariant },
        { label: "Akademi", value: `%${compliance?.academyScore || "—"}`, variant: "warn" as KpiVariant },
        { label: "Dobody", value: pendingActions.length, variant: "purple" as KpiVariant },
      ]}
      tabs={[{ label: "Genel" }, { label: "Detay" }, { label: "Uyumsuz" }, { label: "Sıralama" }, { label: "Plan" }]}
      activeTab={tab} onTabChange={setTab}
      actions={<div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => navigate("/akademi")} className="text-xs h-7">Akademi</Button>
        <Button size="sm" variant="outline" onClick={() => navigate("/task-atama")} className="text-xs h-7">+ Eğitim Görevi</Button>
        <TimeFilter value={period} onChange={setPeriod} />
      </div>}
      rightPanel={
        <DobodySlot actions={pendingActions.slice(0, 4).map((a: any) => ({
          id: a.id, title: a.title || a.summary || "Öneri", sub: a.description || "",
          mode: "action" as const, btnLabel: a.actionLabel || "Onayla", onApprove: () => {},
        }))} />
      }
    >
      {tab === 0 && <>
        <div className="grid grid-cols-3 gap-2.5">
          <Widget title="Sağlık" onClick={() => navigate("/sube-saglik-skoru")}>
            {branches.slice(0, 3).map((b: any, i: number) => {
              const score = b.totalScore || b.overallScore || 0;
              const c = score >= 70 ? "#22c55e" : score >= 50 ? "#fbbf24" : "#ef4444";
              return <div key={i} className="flex items-center gap-1.5 px-2.5 py-0.5">
                <span className="text-[8px] w-10 shrink-0 truncate" style={{ color: "#6b7a8d" }}>{(b.branchName || b.name || "").slice(0, 6)}</span>
                <div className="flex-1 h-1 rounded-full" style={{ background: "#1e2530" }}>
                  <div className="h-full rounded-full" style={{ width: `${score}%`, background: c }} />
                </div>
                <span className="text-[8px] font-semibold w-6 text-right" style={{ color: c }}>{score}</span>
              </div>;
            })}
          </Widget>
          <MiniStats title="Uyum" rows={[
            { label: "Eğitim", value: `%${compliance?.trainingCompletion || compliance?.egitim || "—"}`, color: (compliance?.trainingCompletion || 0) < 70 ? "#fbbf24" : undefined },
            { label: "Akademi", value: `%${compliance?.academyScore || "—"}`, color: "#fbbf24" },
            { label: "Checklist", value: `%${compliance?.checklistCompletion || "—"}`, color: (compliance?.checklistCompletion || 0) < 60 ? "#ef4444" : undefined },
          ]} onLink={() => navigate("/checklistler")} />
          <Widget title="Eskalasyon" onClick={() => navigate("/crm")}>
            {(healthData?.escalations || []).filter((e: any) => e.type === "training" || true).slice(0, 2).map((e: any, i: number) => (
              <ListItem key={i} title={`${e.branchName || "—"} eğitim`} priority={`K${e.level || 3}`} priorityColor={e.level >= 4 ? "#ef4444" : "#fbbf24"} />
            ))}
          </Widget>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          <MiniStats title="Arıza" rows={[
            { label: "Açık", value: healthData?.totalFaults || "—", color: "#ef4444" },
          ]} onLink={() => navigate("/ariza")} />
          <MiniStats title="CRM" rows={[
            { label: "Açık", value: "—" },
            { label: "Eğitim ilg.", value: "—", color: "#fbbf24" },
          ]} onLink={() => navigate("/crm")} />
          <MiniStats title="Personel" rows={[
            { label: "Aktif", value: healthData?.totalActive || "—", color: "#22c55e" },
            { label: "Gecikmiş", value: overdueInsights.length, color: "#ef4444" },
          ]} onLink={() => navigate("/ik")} />
        </div>
        <Widget title="☕Işıklar + Gecikmiş" onClick={() => navigate("/sube-saglik-skoru")}>
          <div className="grid grid-cols-2">
            <div>
              <div className="flex justify-between text-[9px] px-2.5 py-0.5"><span style={{ color: "#6b7a8d" }}>Eğitim</span><span className="font-semibold" style={{ color: "#22c55e" }}>%84</span></div>
              <div className="flex justify-between text-[9px] px-2.5 py-0.5"><span style={{ color: "#6b7a8d" }}>Onboard</span><span className="font-semibold" style={{ color: "#fbbf24" }}>—</span></div>
            </div>
            <div>
              <div className="flex justify-between text-[9px] px-2.5 py-0.5"><span style={{ color: "#6b7a8d" }}>Gecikmiş</span><span className="font-semibold" style={{ color: "#ef4444" }}>{overdueInsights.length} kişi</span></div>
              <div className="flex justify-between text-[9px] px-2.5 py-0.5"><span style={{ color: "#6b7a8d" }}>Sertifika</span><span className="font-semibold" style={{ color: "#fbbf24" }}>—</span></div>
            </div>
          </div>
        </Widget>
      </>}

      {tab === 1 && <Widget title="Şube Eğitim">
        {branches.map((b: any, i: number) => {
          const score = b.trainingScore || b.totalScore || b.overallScore || 0;
          const c = score >= 80 ? "#22c55e" : score >= 60 ? "#fbbf24" : "#ef4444";
          return <div key={i} className="flex items-center gap-1.5 px-2.5 py-0.5">
            <span className="text-[8px] w-16 shrink-0 truncate" style={{ color: "#6b7a8d" }}>{b.branchName || b.name}</span>
            <div className="flex-1 h-1 rounded-full" style={{ background: "#1e2530" }}>
              <div className="h-full rounded-full" style={{ width: `${score}%`, background: c }} />
            </div>
            <span className="text-[8px] font-semibold w-6 text-right" style={{ color: c }}>{score}</span>
          </div>;
        })}
      </Widget>}

      {tab === 2 && <Widget title="⚠Uyumsuz" badge={<Badge text="Agent" color="#c084fc" />}>
        {branches.filter((b: any) => (b.totalScore || b.overallScore || 0) < 60).map((b: any, i: number) => (
          <ListItem key={i} title={`${b.branchName || b.name}: eğitim düşük`} meta={(b.dimensions || []).filter((d: any) => (d.score || 0) < 60).map((d: any) => d.label || d.name).join("·")}
            priority="⚠" priorityColor="#ef4444" onClick={() => navigate("/sube-saglik-skoru")} />
        ))}
      </Widget>}

      {tab === 3 && <TopFlop
        branches={branches.map((b: any) => ({ id: b.branchId || b.id || 0, name: b.branchName || b.name || "—", score: b.trainingScore || b.totalScore || b.overallScore || 0 }))}
      />}

      {tab === 4 && <DobodyTaskPlan tasks={[
        { id: 1, title: "Gecikmiş eğitim kontrol", sub: `${overdueInsights.length} kişi` },
        { id: 2, title: "Quiz incele", sub: "Servis modülü" },
        { id: 3, title: "Toplu eğitim ata", sub: "Düşük şubelere" },
        { id: 4, title: "Sertifika yenileme", sub: "Yaklaşanlar" },
      ]} />}
    </CentrumShell>
  );
}
