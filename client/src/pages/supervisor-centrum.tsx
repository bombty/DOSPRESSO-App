import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { CentrumShell, Widget, MiniStats, ListItem, DobodySlot, FeedbackWidget, LostFoundBanner, TimeFilter, type TimePeriod, type KpiVariant } from "@/components/centrum/CentrumShell";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { DobodyProposalWidget } from "@/components/DobodyProposalWidget";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

export default function SupervisorCentrum() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [period, setPeriod] = useState<TimePeriod>("today");
  const branchId = user?.branchId;

  const { data: branchSummary, isLoading } = useQuery<any>({
    queryKey: ["/api/branch-summary", branchId],
    enabled: !!branchId,
    refetchInterval: 30000,
  });

  const { data: feedbackData } = useQuery<any>({
    queryKey: ["/api/branch-feedback-summary", branchId],
    enabled: !!branchId,
  });

  const { data: lostFound } = useQuery<any>({
    queryKey: ["/api/lost-found", branchId],
    enabled: !!branchId,
  });

  const { data: dobodyActions = [] } = useQuery<any[]>({ queryKey: ["/api/agent/actions", "pending"], queryFn: async () => { const r = await fetch("/api/agent/actions?status=pending&limit=5", { credentials: "include" }); if (!r.ok) return []; const d = await r.json(); return Array.isArray(d) ? d : (d.data || d.actions || []); } });
  if (isLoading) return <div className="p-4 space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-40 w-full" /></div>;

  const kpis = branchSummary?.kpis;
  const lostItem = lostFound?.items?.[0] ?? null;
  const evalDone = kpis?.evaluationsDone ?? 0;

  const feedbackItems = (feedbackData?.recent ?? []).map((f: any) => ({
    id: f.id, rating: f.rating, comment: f.comment, time: f.timeAgo, source: f.source,
    needsResponse: f.needsResponse, slaHoursLeft: f.slaHoursLeft,
    onClick: () => setLocation(`/misafir-geri-bildirim/${f.id}`),
  }));

  return (
    <CentrumShell
      title="Operasyon Kontrol" subtitle="Ekip · Görev · GB · Değerlendirme"
      roleLabel="Supervisor" roleColor="#818cf8" roleBg="rgba(129,140,248,0.12)"
      kpis={[
        { label: "Ekip", value: `${kpis?.activeStaff ?? 0}/${kpis?.totalStaff ?? 0}`, variant: "ok" as KpiVariant },
        { label: "Değerl.", value: `${evalDone}/2`, variant: evalDone < 2 ? "alert" as KpiVariant : "ok" as KpiVariant },
        { label: "Checklist", value: `%${kpis?.checklistCompletion ?? 0}`, variant: (kpis?.checklistCompletion ?? 0) >= 80 ? "ok" as KpiVariant : "warn" as KpiVariant },
      ]}
      actions={<div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setLocation("/gorevler")} className="text-xs h-7">+ Görev</Button>
        <Button size="sm" variant="outline" onClick={() => setLocation("/checklistler")} className="text-xs h-7">Checklist</Button>
        <TimeFilter value={period} onChange={setPeriod} />
      </div>}
      rightPanel={<DobodyProposalWidget maxItems={4} />}
    >
      <LostFoundBanner item={lostItem ? { id: lostItem.id, description: lostItem.itemDescription, foundArea: lostItem.foundArea, foundTime: lostItem.foundTime } : null} onClick={() => setLocation("/kayip-esya")} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Widget title="👥 Ekip Canlı Takip">
          {(branchSummary?.activeStaff ?? []).slice(0, 5).map((s: any, i: number) => (
            <ListItem key={i} title={`${s.name} — ${s.status}`} meta={s.detail} onClick={() => setLocation(`/personel/${s.id}`)}
              priority={s.isLate ? "⚠" : s.onBreak ? "☕" : "✓"} priorityColor={s.isLate ? "#fbbf24" : s.onBreak ? "#60a5fa" : "#4ade80"} />
          ))}
        </Widget>
        <Widget title="🔧 Ekipman Sağlık">
          {(branchSummary?.equipment ?? []).slice(0, 4).map((e: any, i: number) => (
            <ListItem key={i} title={`${e.name} — ${e.status}`} meta={e.detail}
              priority={e.status === "ARIZA" ? "!" : "✓"} priorityColor={e.status === "ARIZA" ? "#f87171" : "#4ade80"} />
          ))}
        </Widget>
      </div>

      <FeedbackWidget items={feedbackItems} showSLA={true} onViewAll={() => setLocation("/misafir-geri-bildirim")} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Widget title="📋 Görevler + Periyodik">
          {(branchSummary?.tasks ?? []).slice(0, 4).map((t: any, i: number) => (
            <ListItem key={i} title={t.title} meta={`${t.assignedBy} · ${t.deadline}`}
              priority={t.isOverdue ? "!" : t.isPeriodic ? "↻" : "○"} priorityColor={t.isOverdue ? "#f87171" : "#60a5fa"} />
          ))}
        </Widget>
        <MiniStats title="📅 Vardiya & İzin" rows={[
          { label: "Yarın raporlu", value: kpis?.tomorrowAbsent ?? "0" },
          { label: "İzin yaklaşan", value: kpis?.upcomingLeave ?? "—" },
          { label: "Kendi performans", value: `${kpis?.myScore ?? "—"}/100`, color: (kpis?.myScore ?? 0) >= 80 ? "#4ade80" : "#fbbf24" },
        ]} />
      </div>
    </CentrumShell>
  );
}
