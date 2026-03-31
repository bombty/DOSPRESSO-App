import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { CentrumShell, MiniStats, ProgressWidget, FeedbackWidget, type KpiVariant } from "@/components/centrum/CentrumShell";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

export default function YatirimciCentrum() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const branchId = user?.branchId;

  const { data: branchSummary, isLoading } = useQuery<any>({
    queryKey: ["/api/branch-summary", branchId],
    enabled: !!branchId,
    refetchInterval: 120000,
  });

  const { data: feedbackData } = useQuery<any>({
    queryKey: ["/api/branch-feedback-summary", branchId],
    enabled: !!branchId,
  });

  const { data: hqSummary } = useQuery<any>({
    queryKey: ["/api/hq-summary"],
  });

  if (isLoading) return <div className="p-4 space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-40 w-full" /></div>;

  const kpis = branchSummary?.kpis;
  const health = kpis?.healthScore ?? 0;

  const feedbackItems = (feedbackData?.recent ?? []).slice(0, 3).map((f: any) => ({
    id: f.id, rating: f.rating, comment: f.comment, time: f.timeAgo, source: f.source,
    onClick: () => setLocation(`/misafir-geri-bildirim/${f.id}`),
  }));

  return (
    <CentrumShell
      title="Yatırım Özet" subtitle="Read-only · GB · Finans"
      roleLabel="Yatırımcı" roleColor="#6b7280" roleBg="rgba(107,114,128,0.12)"
      kpis={[
        { label: "Sağlık", value: health, variant: health >= 70 ? "ok" as KpiVariant : health >= 50 ? "warn" as KpiVariant : "alert" as KpiVariant },
        { label: "Müşteri", value: `${feedbackData?.avgRating ?? "—"}★`, variant: (feedbackData?.avgRating ?? 5) >= 4 ? "ok" as KpiVariant : "warn" as KpiVariant },
        { label: "Personel", value: kpis?.activeStaff ?? 0, variant: "ok" as KpiVariant },
      ]}
    >
      <MiniStats title="Şube Performans" rows={[
        { label: "Sağlık skoru", value: `${health}/100`, color: health >= 70 ? "#4ade80" : health >= 50 ? "#fbbf24" : "#f87171" },
        { label: "Müşteri memnuniyet", value: `${feedbackData?.avgRating ?? "—"}★` },
        { label: "Personel sayısı", value: `${kpis?.activeStaff ?? "—"} aktif` },
        { label: "Uyum skoru", value: `%${kpis?.complianceScore ?? "—"}` },
        { label: "Franchise ort.", value: `${hqSummary?.franchiseAvgHealth ?? "—"}/100` },
      ]} />

      <ProgressWidget title="Uyum Detay" rows={[
        { label: "Vardiya", value: kpis?.shiftCompliance ?? 0 },
        { label: "Checklist", value: kpis?.checklistCompletion ?? 0 },
        { label: "Eğitim", value: kpis?.trainingCompletion ?? 0 },
        { label: "Müşteri", value: (feedbackData?.avgRating ?? 0) * 20 },
      ]} />

      <FeedbackWidget items={feedbackItems} showSLA={false} title="⭐ Misafir Geri Bildirim" />

      <MiniStats title="💰 Son 3 Ay Kâr" rows={
        (branchSummary?.last3MonthsProfit ?? []).map((m: any) => ({
          label: m.month, value: `₺${m.profit}`, color: (m.profit ?? 0) > 0 ? "#4ade80" : "#f87171",
        }))
      } />
    </CentrumShell>
  );
}
