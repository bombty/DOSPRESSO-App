import { useQuery } from "@tanstack/react-query";
import { CentrumShell, Widget, MiniStats, ListItem, DobodySlot, type KpiVariant } from "@/components/centrum/CentrumShell";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

export default function YatirimciHQCentrum() {
  const [, navigate] = useLocation();

  const { data: healthData, isLoading } = useQuery<any>({ queryKey: ["/api/agent/branch-health"] });
  const { data: financialData } = useQuery<any[]>({ queryKey: ["/api/branch-financial-summary"] });

  if (isLoading) return <div className="p-4 space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-40 w-full" /></div>;

  const branches = healthData?.branches ?? [];
  const avgScore = healthData?.average ?? 0;
  const criticalCount = healthData?.criticalCount ?? 0;

  return (
    <CentrumShell
      title="Franchise Yatırımcı" subtitle="Şubelerim · Performans · Finans"
      roleLabel="Yatırımcı" roleColor="#6b7280"
      kpis={[
        { label: "Ort Sağlık", value: `${avgScore}/100`, variant: (avgScore >= 70 ? "ok" : avgScore >= 50 ? "warn" : "alert") as KpiVariant },
        { label: "Şube Sayısı", value: branches.length, variant: "info" as KpiVariant },
        { label: "Kritik", value: criticalCount, variant: (criticalCount > 0 ? "alert" : "ok") as KpiVariant },
        { label: "NPS", value: `${healthData?.avgRating ?? "—"}★`, variant: "info" as KpiVariant },
      ]}
    >
      <Widget title="Şube Sağlık Sıralaması" onClick={() => navigate("/sube-saglik-skoru")}>
        {branches.slice(0, 10).map((b: any, i: number) => {
          const score = b.overallScore ?? b.totalScore ?? 0;
          return (
            <ListItem key={i} title={b.branchName || b.name || `Şube ${b.branchId}`}
              meta={`Skor: ${score}/100`}
              priority={score >= 70 ? "İyi" : score >= 50 ? "Orta" : "Kritik"}
              priorityColor={score >= 70 ? "#22c55e" : score >= 50 ? "#fbbf24" : "#ef4444"}
              onClick={() => navigate(`/sube-saglik-skoru?branch=${b.branchId || b.id}`)} />
          );
        })}
        {branches.length === 0 && <p className="text-[10px] px-2 py-3" style={{color:"#6b7a8d"}}>Şube verisi yok</p>}
      </Widget>

      <div className="grid grid-cols-2 gap-2.5">
        <MiniStats title="Genel Performans" rows={[
          { label: "Sağlık Ort", value: `${avgScore}`, color: avgScore >= 70 ? "#22c55e" : "#fbbf24" },
          { label: "Sağlıklı", value: `${healthData?.healthyCount ?? 0}`, color: "#22c55e" },
          { label: "Uyarı", value: `${healthData?.warningCount ?? 0}`, color: "#fbbf24" },
          { label: "Kritik", value: `${criticalCount}`, color: criticalCount > 0 ? "#ef4444" : undefined },
        ]} onLink={() => navigate("/sube-saglik-skoru")} />

        <MiniStats title="Finansal Özet" rows={
          (financialData ?? []).slice(0, 4).map((f: any) => ({
            label: (f.branchName || "").slice(0, 10),
            value: `₺${f.revenue ?? f.totalRevenue ?? "—"}`,
            color: (f.profitMargin ?? 0) > 0 ? "#22c55e" : "#ef4444",
          }))
        } onLink={() => navigate("/raporlar")} />
      </div>
    </CentrumShell>
  );
}
