import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { CentrumShell, Widget, MiniStats, ListItem, DobodySlot, FeedbackWidget, LostFoundBanner, type KpiVariant } from "@/components/centrum/CentrumShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

export default function SupBuddyCentrum() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const branchId = user?.branchId;

  const { data: briefing, isLoading } = useQuery<any>({ queryKey: ["/api/me/dashboard-briefing"], refetchInterval: 60000 });
  const { data: feedbackData } = useQuery<any>({ queryKey: ["/api/branch-feedback-summary", branchId], enabled: !!branchId });
  const { data: lostFound } = useQuery<any>({ queryKey: ["/api/lost-found", branchId], enabled: !!branchId });
  const { data: branchSummary } = useQuery<any>({ queryKey: ["/api/branch-summary", branchId], enabled: !!branchId });
  const { data: dobodyActions = [] } = useQuery<any[]>({
    queryKey: ["/api/agent/actions", "pending"],
    queryFn: async () => { const r = await fetch("/api/agent/actions?status=pending&limit=5", { credentials: "include" }); if (!r.ok) return []; const d = await r.json(); return Array.isArray(d) ? d : (d.data || d.actions || []); },
  });

  if (isLoading) return <div className="p-4 space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-40 w-full" /></div>;

  const lostItem = lostFound?.items?.[0] ?? null;
  const kpis = branchSummary?.kpis;
  const feedbackItems = (feedbackData?.recent ?? []).slice(0, 3).map((f: any) => ({
    id: f.id, rating: f.rating, comment: f.comment, time: f.timeAgo, source: f.source,
    onClick: () => navigate(`/misafir-geri-bildirim/${f.id}`),
  }));

  return (
    <CentrumShell
      title="Supervisor Buddy" subtitle="Ekip · Checklist · Görev · GB"
      roleLabel="Sup.Buddy" roleColor="#818cf8"
      kpis={[
        { label: "Sorumlu", value: briefing?.responsibleCount ?? 0, variant: "info" as KpiVariant },
        { label: "Onboarding", value: briefing?.onboardingCount ?? 0, variant: (briefing?.onboardingOverdue ?? 0) > 0 ? "alert" as KpiVariant : "info" as KpiVariant },
        { label: "Checklist", value: `%${kpis?.checklistCompletion ?? "—"}`, variant: (kpis?.checklistCompletion ?? 100) < 70 ? "warn" as KpiVariant : "ok" as KpiVariant },
        { label: "Görev", value: briefing?.pendingTasks ?? 0, variant: (briefing?.pendingTasks ?? 0) > 3 ? "warn" as KpiVariant : "ok" as KpiVariant },
      ]}
      rightPanel={<DobodySlot actions={dobodyActions.length > 0 ? dobodyActions.map((a: any) => ({
        id: a.id, title: a.title || a.message, sub: a.description,
        mode: (a.actionType === "info" ? "info" : "action") as any,
      })) : [
        { id: 1, title: "Onboarding hatırlatma", sub: "Hijyen modülü yarın son gün", mode: "auto" as const },
      ]} />}
    >
      <LostFoundBanner item={lostItem ? { id: lostItem.id, description: lostItem.itemDescription, foundArea: lostItem.foundArea, foundTime: lostItem.foundTime } : null} onClick={() => navigate("/kayip-esya")} />

      <Widget title="Sorumlu Personel" onClick={() => navigate("/ik")}>
        {(briefing?.responsibleStaff ?? []).map((s: any, i: number) => (
          <ListItem key={i} title={`${s.name} (${s.role})`} meta={s.status} onClick={() => navigate(`/personel/${s.id}`)}
            priority={s.isOverdue ? "!" : "ok"} priorityColor={s.isOverdue ? "#f87171" : "#4ade80"} />
        ))}
        {(briefing?.responsibleStaff ?? []).length === 0 && <p className="text-[10px] px-2 py-3" style={{color:"#6b7a8d"}}>Sorumlu personel yok</p>}
      </Widget>

      <div className="grid grid-cols-2 gap-2.5">
        <MiniStats title="Checklist" rows={[
          { label: "Uyum", value: `%${kpis?.checklistCompletion ?? "—"}`, color: (kpis?.checklistCompletion ?? 100) < 70 ? "#fbbf24" : "#22c55e" },
          { label: "Bugün kalan", value: `${kpis?.checklistRemainingToday ?? "—"}`, color: "#fbbf24" },
        ]} onLink={() => navigate("/checklistler")} />
        <MiniStats title="Görevlerim" rows={[
          { label: "Bekleyen", value: `${briefing?.pendingTasks ?? "—"}` },
          { label: "Geciken", value: `${briefing?.overdueTasks ?? 0}`, color: (briefing?.overdueTasks ?? 0) > 0 ? "#ef4444" : undefined },
        ]} onLink={() => navigate("/gorevler")} />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <MiniStats title="Ekipman" rows={[
          { label: "Arıza", value: `${kpis?.openFaults ?? "—"}`, color: (kpis?.openFaults ?? 0) > 0 ? "#ef4444" : "#22c55e" },
        ]} onLink={() => navigate("/ekipman")} />
        <MiniStats title="Vardiya" rows={[
          { label: "Aktif", value: `${kpis?.activeStaff ?? "—"}` },
          { label: "Geç", value: `${kpis?.lateCount ?? 0}`, color: (kpis?.lateCount ?? 0) > 0 ? "#fbbf24" : undefined },
        ]} onLink={() => navigate("/vardiyalarim")} />
      </div>

      <MiniStats title="Onboarding" rows={[
        { label: "Aktif", value: briefing?.onboardingCount ?? 0 },
        { label: "Gecikmiş", value: briefing?.onboardingOverdue ?? 0, color: "#f87171" },
        { label: "Tamamlanan", value: briefing?.onboardingCompleted ?? 0, color: "#22c55e" },
      ]} onLink={() => navigate("/ik")} />

      <FeedbackWidget items={feedbackItems} showSLA={false} onViewAll={() => navigate("/crm?channel=misafir")} />
    </CentrumShell>
  );
}
