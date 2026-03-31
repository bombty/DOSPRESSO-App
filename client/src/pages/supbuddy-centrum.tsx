import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { CentrumShell, Widget, MiniStats, ListItem, DobodySlot, FeedbackWidget, LostFoundBanner, type KpiVariant } from "@/components/centrum/CentrumShell";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

export default function SupBuddyCentrum() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const branchId = user?.branchId;

  const { data: briefing, isLoading } = useQuery<any>({
    queryKey: ["/api/me/dashboard-briefing"],
    refetchInterval: 60000,
  });

  const { data: feedbackData } = useQuery<any>({
    queryKey: ["/api/branch-feedback-summary", branchId],
    enabled: !!branchId,
  });

  const { data: lostFound } = useQuery<any>({
    queryKey: ["/api/lost-found", branchId],
    enabled: !!branchId,
  });

  if (isLoading) return <div className="p-4 space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-40 w-full" /></div>;

  const lostItem = lostFound?.items?.[0] ?? null;
  const feedbackItems = (feedbackData?.recent ?? []).slice(0, 3).map((f: any) => ({
    id: f.id, rating: f.rating, comment: f.comment, time: f.timeAgo, source: f.source,
    onClick: () => setLocation(`/misafir-geri-bildirim/${f.id}`),
  }));

  return (
    <CentrumShell
      title="Supervisor Buddy" subtitle="Personel takip · Onboarding · GB"
      roleLabel="Sup.Buddy" roleColor="#818cf8" roleBg="rgba(129,140,248,0.12)"
      kpis={[
        { label: "Sorumlu", value: briefing?.responsibleCount ?? 0, variant: "info" as KpiVariant },
        { label: "Onboarding", value: briefing?.onboardingCount ?? 0, variant: (briefing?.onboardingOverdue ?? 0) > 0 ? "alert" as KpiVariant : "info" as KpiVariant },
      ]}
      rightPanel={<DobodySlot actions={[
        { id: 1, title: "Onboarding hatırlatma", sub: "Hijyen modülü yarın son gün", mode: "auto" },
        { id: 2, title: "Personel iyi ilerliyor", sub: "Servis modülünü başlatabilir", mode: "info" },
      ]} />}
    >
      <LostFoundBanner item={lostItem ? { id: lostItem.id, description: lostItem.itemDescription, foundArea: lostItem.foundArea, foundTime: lostItem.foundTime } : null} onClick={() => setLocation("/kayip-esya")} />

      <Widget title="Sorumlu Personel">
        {(briefing?.responsibleStaff ?? []).map((s: any, i: number) => (
          <ListItem key={i} title={`${s.name} (${s.role})`} meta={s.status} onClick={() => setLocation(`/personel/${s.id}`)}
            priority={s.isOverdue ? "⚠" : "✓"} priorityColor={s.isOverdue ? "#f87171" : "#4ade80"} />
        ))}
      </Widget>

      <MiniStats title="Onboarding Takibi" rows={[
        { label: "Aktif", value: briefing?.onboardingCount ?? 0 },
        { label: "Gecikmiş", value: briefing?.onboardingOverdue ?? 0, color: "#f87171" },
        { label: "Tamamlanan (ay)", value: briefing?.onboardingCompleted ?? 0 },
      ]} />

      <FeedbackWidget items={feedbackItems} showSLA={false} />
    </CentrumShell>
  );
}
