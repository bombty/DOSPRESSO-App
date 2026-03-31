import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { CentrumShell, Widget, MiniStats, ProgressWidget, ListItem, DobodySlot, FeedbackWidget, LostFoundBanner, type KpiVariant } from "@/components/centrum/CentrumShell";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

const ROLE_CONFIG: Record<string, { title: string; label: string; color: string; bg: string }> = {
  barista:   { title: "Benim Günüm",  label: "Barista",   color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  bar_buddy: { title: "Bar Buddy",    label: "BarBuddy",  color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  stajyer:   { title: "Onboarding",   label: "Stajyer",   color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
};

export default function PersonelCentrum() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const role = user?.role || "barista";
  const branchId = user?.branchId;
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.barista;

  const { data: briefing, isLoading } = useQuery<any>({
    queryKey: ["/api/me/dashboard-briefing"],
    refetchInterval: 60000,
  });

  const { data: streakData } = useQuery<any>({
    queryKey: ["/api/academy/streak-tracker", user?.id],
    enabled: !!user?.id,
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
  const streak = streakData?.currentStreak ?? 0;
  const score = briefing?.performanceScore ?? 0;
  const tasks = briefing?.todayTasks ?? [];
  const trainings = briefing?.trainings ?? [];

  const feedbackItems = (feedbackData?.recent ?? []).slice(0, 3).map((f: any) => ({
    id: f.id, rating: f.rating, comment: f.comment, time: f.timeAgo, source: f.source,
    onClick: () => setLocation(`/misafir-geri-bildirim/${f.id}`),
  }));

  const isStajyer = role === "stajyer";
  const isBarBuddy = role === "bar_buddy";

  return (
    <CentrumShell
      title={config.title}
      subtitle={isStajyer ? "Onboarding · Eğitim · Mentor" : isBarBuddy ? "Görev · Eğitim · Mentörlük" : "Görev · Eğitim · Performans"}
      roleLabel={config.label} roleColor={config.color} roleBg={config.bg}
      kpis={[
        { label: "Vardiya", value: briefing?.shiftStatus ?? "—", variant: briefing?.shiftStatus === "Aktif" ? "ok" as KpiVariant : "neutral" as KpiVariant },
        ...(isStajyer ? [
          { label: "Onboarding", value: `%${briefing?.onboardingProgress ?? 0}`, variant: (briefing?.onboardingProgress ?? 0) < 50 ? "alert" as KpiVariant : "warn" as KpiVariant },
        ] : [
          { label: "Görev", value: `${tasks.filter((t: any) => t.done).length}/${tasks.length}`, variant: "info" as KpiVariant },
          { label: "Performans", value: score, variant: score >= 70 ? "ok" as KpiVariant : "warn" as KpiVariant },
        ]),
        { label: "Seri", value: `${streak} gün`, variant: streak > 0 ? "ok" as KpiVariant : "neutral" as KpiVariant },
      ]}
      rightPanel={<>
        {!isStajyer && (
          <MiniStats title="Performans" rows={[
            { label: "Skor", value: `${score}/100`, color: score >= 70 ? "#4ade80" : "#fbbf24" },
            { label: "Geçen hafta", value: briefing?.lastWeekScore ?? "—" },
          ]} />
        )}
        <DobodySlot actions={isStajyer ? [
          { id: 1, title: "Onboarding hatırlatma", sub: "Temizlik protokolünü tamamla", mode: "auto" as const },
          { id: 2, title: "Hijyen modülüne başla", sub: "Mentoruna sor", mode: "auto" as const },
        ] : isBarBuddy ? [
          { id: 1, title: "Hijyen modülü hatırlat", sub: "3 gün kaldı", mode: "auto" as const },
          { id: 2, title: "Mentorunla çalış", sub: "Latte art dikkat", mode: "auto" as const },
        ] : [
          { id: 1, title: "Latte art pratik", sub: "Quiz'e hazırlan", mode: "auto" as const },
          { id: 2, title: "Performans yükseliyor", sub: "Hijyen bitir → rozet", mode: "auto" as const },
        ]} />
      </>}
    >
      <LostFoundBanner item={lostItem ? { id: lostItem.id, description: lostItem.itemDescription, foundArea: lostItem.foundArea, foundTime: lostItem.foundTime } : null} onClick={() => setLocation("/kayip-esya")} />

      {isStajyer ? (
        <>
          <MiniStats title="Onboarding İlerleme" rows={[
            { label: "Tamamlanan", value: `${briefing?.onboardingDone ?? 0}/${briefing?.onboardingTotal ?? 0} görev` },
            { label: "Bugün", value: briefing?.todayTask ?? "—" },
            { label: "Mentor", value: briefing?.mentorName ?? "—" },
          ]} />
          <ProgressWidget title="Eğitim" rows={trainings.map((t: any) => ({ label: t.name, value: t.progress, max: 100 }))} />
        </>
      ) : (
        <>
          <Widget title={isBarBuddy ? "Bugün Görevlerim" : "Bu Hafta Görevlerim"}>
            {tasks.map((t: any, i: number) => (
              <ListItem key={i} title={t.title} meta={t.detail}
                priority={t.done ? "✓" : ""} priorityColor={t.done ? "#4ade80" : "#6b7a8d"} />
            ))}
            {tasks.length === 0 && <p className="text-[10px] text-muted-foreground px-3 py-3">Atanmış görev yok</p>}
          </Widget>
          <ProgressWidget title="Eğitim İlerleme" rows={trainings.map((t: any) => ({ label: t.name, value: t.progress, max: 100 }))} />
        </>
      )}

      <FeedbackWidget items={feedbackItems} showSLA={false} />
    </CentrumShell>
  );
}
