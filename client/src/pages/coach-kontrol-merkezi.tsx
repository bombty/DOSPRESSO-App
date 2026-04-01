/**
 * Coach Control Centrum — Onaylanan JSX prototype birebir
 * 5 sekme: Genel, Şubeler, Uyumsuz, Sıralama, Plan
 * Widget'lar: Sağlık, Uyum, Eskalasyon, Arıza, CRM, Personel,
 *             Işıklar Canlı, Eğitim + Sağ panel Dobody
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { CentrumShell, KpiChip, Widget, MiniStats, ListItem, DobodySlot, DobodyTaskPlan, TopFlop, ProgressWidget, TimeFilter, Badge, type TimePeriod, type KpiVariant } from "@/components/centrum/CentrumShell";
import { Skeleton } from "@/components/ui/skeleton";

export default function CoachKontrolMerkezi() {
  const [, navigate] = useLocation();
  const [period, setPeriod] = useState<TimePeriod>("week");
  const [tab, setTab] = useState(0);

  const { data: healthData, isLoading } = useQuery<any>({ queryKey: ["/api/agent/branch-health"] });
  const { data: complianceData } = useQuery<any>({
    queryKey: ["/api/agent/compliance-overview", period],
    queryFn: async () => { const r = await fetch(`/api/agent/compliance-overview?period=${period}`, { credentials: "include" }); return r.ok ? r.json() : null; },
  });
  const { data: pendingActions = [] } = useQuery<any[]>({
    queryKey: ["/api/agent/actions", "pending", "coach"],
    queryFn: async () => { const r = await fetch("/api/agent/actions?status=pending&limit=8", { credentials: "include" }); if (!r.ok) return []; const d = await r.json(); return Array.isArray(d) ? d : (d.actions || []); },
  });

  if (isLoading) return <div className="p-4 space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-40 w-full" /></div>;

  const branches = healthData?.branches || [];
  const summary = complianceData?.summary || complianceData?.overall || complianceData;
  const criticalBranches = branches.filter((b: any) => (b.totalScore || b.overallScore || 0) < 50);
  const warnBranches = branches.filter((b: any) => { const s = b.totalScore || b.overallScore || 0; return s >= 50 && s < 70; });
  const healthyBranches = branches.filter((b: any) => (b.totalScore || b.overallScore || 0) >= 70);

  return (
    <CentrumShell
      title="Coach — Kontrol" subtitle="Şube·Arıza·CRM·Uyum"
      roleLabel="Coach" roleColor="#4ade80" roleBg="rgba(74,222,128,0.18)"
      kpis={[
        { label: "Kritik", value: criticalBranches.length, variant: (criticalBranches.length > 0 ? "alert" : "ok") as KpiVariant },
        { label: "Uyarı", value: warnBranches.length, variant: (warnBranches.length > 0 ? "warn" : "ok") as KpiVariant },
        { label: "Sağlıklı", value: healthyBranches.length, variant: "ok" as KpiVariant },
        { label: "Uyum", value: `%${summary?.overallScore || summary?.avgScore || "—"}`, variant: ((summary?.overallScore || 0) >= 70 ? "ok" : "warn") as KpiVariant },
        { label: "Dobody", value: pendingActions.length, variant: "purple" as KpiVariant },
      ]}
      tabs={[{ label: "Genel" }, { label: "Şubeler" }, { label: "Uyumsuz" }, { label: "Sıralama" }, { label: "Plan" }]}
      activeTab={tab} onTabChange={setTab}
      actions={<TimeFilter value={period} onChange={setPeriod} />}
      rightPanel={
        <DobodySlot actions={pendingActions.slice(0, 4).map((a: any) => ({
          id: a.id, title: a.title || a.summary || "Öneri", sub: a.description || "",
          mode: "action" as const, btnLabel: a.actionLabel || "Onayla", onApprove: () => {},
        }))} />
      }
    >
      {tab === 0 && <>
        <div className="grid grid-cols-3 gap-2.5">
          <Widget title="Sağlık" onClick={() => setTab(1)}>
            {branches.slice(0, 4).map((b: any, i: number) => {
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
            { label: "Vardiya", value: `%${summary?.shiftCompliance || summary?.vardiya || "—"}`, color: (summary?.shiftCompliance || 0) < 70 ? "#fbbf24" : undefined },
            { label: "Checklist", value: `%${summary?.checklistCompletion || summary?.checklist || "—"}`, color: (summary?.checklistCompletion || 0) < 60 ? "#ef4444" : undefined },
            { label: "Eğitim", value: `%${summary?.trainingCompletion || summary?.egitim || "—"}`, color: "#22c55e" },
          ]} onLink={() => navigate("/checklistler")} />
          <Widget title="Eskalasyon" onClick={() => navigate("/crm")}
            badge={<Badge text={`${(healthData?.escalations || []).length}`} color="#ef4444" />}>
            {(healthData?.escalations || []).slice(0, 3).map((e: any, i: number) => (
              <ListItem key={i} title={e.title || e.branchName || "—"} priority={`K${e.level || 5}`} priorityColor={e.level >= 4 ? "#ef4444" : "#fbbf24"} onClick={() => navigate("/crm")} />
            ))}
          </Widget>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          <MiniStats title="Arıza" rows={[
            { label: "Açık", value: healthData?.totalFaults || "—", color: "#ef4444" },
          ]} onLink={() => navigate("/ariza")} />
          <MiniStats title="CRM" rows={[
            { label: "Açık", value: "—" },
            { label: "GB", value: `${healthData?.avgRating || "—"}★`, color: "#fbbf24" },
          ]} onLink={() => navigate("/crm")} />
          <MiniStats title="Personel" rows={[
            { label: "Aktif", value: healthData?.totalActive || "—", color: "#22c55e" },
            { label: "Geç", value: healthData?.lateCount || "—", color: "#fbbf24" },
          ]} onLink={() => navigate("/ik")} />
        </div>
      </>}

      {tab === 1 && <div className="grid grid-cols-2 gap-2.5">
        {branches.map((b: any, i: number) => {
          const score = b.totalScore || b.overallScore || 0;
          const c = score >= 70 ? "#22c55e" : score >= 50 ? "#fbbf24" : "#ef4444";
          return <div key={i} className="rounded-xl border p-2 cursor-pointer" style={{ borderColor: "#1e2530", background: "#141820" }}
            onClick={() => navigate(`/sube-saglik-skoru?branch=${b.branchId || b.id}`)}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `${c}20`, color: c }}>{score}</div>
              <span className="text-[9px] font-semibold" style={{ color: "#e8ecf1" }}>{b.branchName || b.name}</span>
            </div>
            {(b.dimensions || []).slice(0, 3).map((d: any, j: number) => (
              <div key={j} className="flex items-center gap-1.5 px-1 py-0.5">
                <span className="text-[8px] w-12 shrink-0" style={{ color: "#6b7a8d" }}>{d.label || d.name}</span>
                <div className="flex-1 h-1 rounded-full" style={{ background: "#1e2530" }}>
                  <div className="h-full rounded-full" style={{ width: `${d.score || 0}%`, background: (d.score || 0) >= 70 ? "#22c55e" : (d.score || 0) >= 50 ? "#fbbf24" : "#ef4444" }} />
                </div>
              </div>
            ))}
          </div>;
        })}
      </div>}

      {tab === 2 && <Widget title="⚠Uyumsuz" badge={<Badge text="Agent" color="#ef4444" />}>
        {criticalBranches.map((b: any, i: number) => (
          <div key={i} className="px-2.5 py-1.5 border-b last:border-0 cursor-pointer" style={{ borderColor: "#1e2530" }}
            onClick={() => navigate(`/sube-saglik-skoru?branch=${b.branchId || b.id}`)}>
            <span className="text-[9px] font-bold" style={{ color: "#ef4444" }}>{b.branchName || b.name}: </span>
            <span className="text-[8px]" style={{ color: "#ef4444cc" }}>
              {(b.dimensions || []).filter((d: any) => (d.score || 0) < 60).map((d: any) => `${d.label || d.name}%${d.score || 0}`).join("·") || "Skor düşük"}
            </span>
          </div>
        ))}
        {criticalBranches.length === 0 && <p className="text-[9px] px-2.5 py-2" style={{ color: "#6b7a8d" }}>Uyumsuz şube yok</p>}
      </Widget>}

      {tab === 3 && <TopFlop
        branches={branches.map((b: any) => ({ id: b.branchId || b.id || 0, name: b.branchName || b.name || "—", score: b.totalScore || b.overallScore || 0 }))}
        onBranchClick={(id) => navigate(`/sube-saglik-skoru?branch=${id}`)}
      />}

      {tab === 4 && <DobodyTaskPlan tasks={[
        { id: 1, title: "Kritik şube kontrol", sub: `${criticalBranches.length} şube skor düşük` },
        { id: 2, title: "Uyumsuz şubeler incele", sub: "Aksiyon planı oluştur" },
        { id: 3, title: "Ziyaret planla", sub: "Dobody önerisi" },
        { id: 4, title: "Haftalık rapor", sub: "CEO'ya gönder" },
      ]} onNavigate={navigate} />}
    </CentrumShell>
  );
}
