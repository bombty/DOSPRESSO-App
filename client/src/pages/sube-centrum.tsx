import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { CentrumShell, Widget, MiniStats, ProgressWidget, ListItem, DobodySlot, DobodyTaskPlan, FeedbackWidget, LostFoundBanner, TimeFilter, type TimePeriod, type KpiVariant } from "@/components/centrum/CentrumShell";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

export default function SubeCentrum() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [period, setPeriod] = useState<TimePeriod>("week");
  const [tab, setTab] = useState(0);
  const branchId = user?.branchId;

  const { data: branchSummary, isLoading } = useQuery<any>({
    queryKey: ["/api/branch-summary", branchId],
    enabled: !!branchId,
    refetchInterval: 60000,
  });

  const { data: feedbackData } = useQuery<any>({
    queryKey: ["/api/branch-feedback-summary", branchId],
    enabled: !!branchId,
  });

  const { data: financialData } = useQuery<any>({
    queryKey: ["/api/branch-financial-summary", branchId],
    enabled: !!branchId,
  });

  const { data: lostFound } = useQuery<any>({
    queryKey: ["/api/lost-found", branchId],
    enabled: !!branchId,
  });

  const { data: dobodyActions = [] } = useQuery<any[]>({ queryKey: ["/api/agent/actions", "pending"], queryFn: async () => { const r = await fetch("/api/agent/actions?status=pending&limit=5", { credentials: "include" }); if (!r.ok) return []; const d = await r.json(); return Array.isArray(d) ? d : (d.data || d.actions || []); } });
  if (isLoading) return <div className="p-4 space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-40 w-full" /></div>;

  const kpis = branchSummary?.kpis;
  const health = kpis?.healthScore ?? 0;
  const lostItem = lostFound?.items?.[0] ?? null;

  const feedbackItems = (feedbackData?.recent ?? []).map((f: any) => ({
    id: f.id, rating: f.rating, comment: f.comment, time: f.timeAgo, source: f.source,
    customerName: f.customerName, slaHoursLeft: f.slaHoursLeft, needsResponse: f.needsResponse,
    onClick: () => setLocation(`/misafir-geri-bildirim/${f.id}`),
  }));

  return (
    <CentrumShell
      title={`Şube Kontrol — ${branchSummary?.branchName ?? ""}`}
      subtitle="Ekip · Finans · GB · Görev"
      roleLabel="Müdür/Yatırımcı" roleColor="#f59e0b" roleBg="rgba(245,158,11,0.12)"
      kpis={[
        { label: "Sağlık", value: health, variant: health >= 70 ? "ok" as KpiVariant : health >= 50 ? "warn" as KpiVariant : "alert" as KpiVariant },
        { label: "Müşteri", value: `${feedbackData?.avgRating ?? "—"}★`, variant: (feedbackData?.avgRating ?? 5) >= 4 ? "ok" as KpiVariant : "warn" as KpiVariant },
        { label: "Görev", value: kpis?.openTasks ?? 0, variant: "info" as KpiVariant },
      ]}
      tabs={[{ label: "Genel" }, { label: "Finans" }, { label: "Personel" }, { label: "Görev Planı" }]}
      activeTab={tab} onTabChange={setTab}
      actions={<TimeFilter value={period} onChange={setPeriod} />}
      rightPanel={<>
        <DobodySlot actions={[
          { id: 1, title: "Fiks gider girilmemiş!", sub: "Elektrik, su eksik", mode: "action", btnLabel: "Gir", btnVariant: "purple", onApprove: () => setLocation("/muhasebe") },
          { id: 2, title: "Müşteri feedback cevapla", sub: "2 SLA bekliyor", mode: "action", btnLabel: "Cevapla", onApprove: () => {} },
        ]} />
      </>}
    >
      <LostFoundBanner item={lostItem ? { id: lostItem.id, description: lostItem.itemDescription, foundArea: lostItem.foundArea, foundTime: lostItem.foundTime, foundByName: lostItem.foundByName } : null} onClick={() => setLocation("/kayip-esya")} />

      {tab === 0 && <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Widget title="Bugün Ekip">
            {(branchSummary?.activeStaff ?? []).slice(0, 5).map((s: any, i: number) => (
              <ListItem key={i} title={`${s.name} — ${s.role}`} meta={s.status} onClick={() => setLocation(`/personel/${s.id}`)}
                priority={s.isLate ? "⚠" : "✓"} priorityColor={s.isLate ? "#fbbf24" : "#4ade80"} />
            ))}
          </Widget>
          <MiniStats title="Franchise Karşılaştırma" rows={[
            { label: "Sağlık", value: `${health} (ort:${branchSummary?.franchiseAvg ?? "—"})`, color: health < (branchSummary?.franchiseAvg ?? 100) * 0.8 ? "#f87171" : undefined },
            { label: "Müşteri", value: `${feedbackData?.avgRating ?? "—"}★` },
            { label: "Eğitim", value: `%${kpis?.trainingCompletion ?? "—"}` },
          ]} />
        </div>
        <FeedbackWidget items={feedbackItems} showSLA={true} onViewAll={() => setLocation("/misafir-geri-bildirim")} />
      </>}

      {tab === 1 && <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <MiniStats title="💰 Gelir-Gider (Son 3 Ay)" rows={
            (financialData?.last3Months ?? []).map((m: any) => ({
              label: m.month, value: `₺${m.revenue} / ₺${m.cost}`,
            }))
          } />
          <Widget title="📊 Fiks Gider GİRİŞ" badge={<span className="text-[9px] bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded-full">Zorunlu</span>}>
            {(financialData?.fixedCosts ?? []).map((c: any, i: number) => (
              <ListItem key={i} title={c.category} meta={c.amount ? `₺${c.amount}` : "GİRİLMEMİŞ"} priority={c.amount ? "✓" : "!"} priorityColor={c.amount ? "#4ade80" : "#f87171"} />
            ))}
          </Widget>
        </div>
      </>}

      {tab === 2 && <>
        <Widget title="Personel Performans">
          {(branchSummary?.staffPerformance ?? []).map((s: any, i: number) => (
            <ListItem key={i} title={`${s.name} — ${s.score}/100`} meta={s.role} onClick={() => setLocation(`/personel/${s.id}`)}
              priority={s.score >= 80 ? "⭐" : s.score < 50 ? "⚠" : ""} priorityColor={s.score >= 80 ? "#4ade80" : "#f87171"} />
          ))}
        </Widget>
      </>}

      {tab === 3 && <DobodyTaskPlan tasks={[
        { id: 1, title: "Fiks gider gir", sub: "Elektrik, su, diğer eksik", estimatedMinutes: 10, navigateTo: "/muhasebe" },
        { id: 2, title: "Ekip durumu kontrol", sub: "Geç kalma, mola", estimatedMinutes: 2 },
        { id: 3, title: "Müşteri feedback cevapla", sub: "2 SLA bekliyor", estimatedMinutes: 5, navigateTo: "/misafir-geri-bildirim" },
      ]} onNavigate={setLocation} />}
    </CentrumShell>
  );
}
