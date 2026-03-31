import { useQuery } from "@tanstack/react-query";
import { CentrumShell, Widget, MiniStats, ProgressWidget, ListItem, DobodySlot, QCStatusWidget, TimeFilter, type TimePeriod, type KpiVariant } from "@/components/centrum/CentrumShell";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function FabrikaCentrum() {
  const [period, setPeriod] = useState<TimePeriod>("today");

  const { data: stats, isLoading } = useQuery<any>({
    queryKey: ["/api/factory/production-stats"],
    refetchInterval: 60000,
  });

  const { data: qcStats } = useQuery<any>({
    queryKey: ["/api/factory/qc/stats"],
    refetchInterval: 60000,
  });

  const { data: qualityOverview } = useQuery<any>({
    queryKey: ["/api/factory/quality-overview"],
  });

  const { data: shipments } = useQuery<any[]>({
    queryKey: ["/api/factory/shipments/pending"],
  });

  if (isLoading) return <div className="p-4 space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-40 w-full" /></div>;

  const efficiency = stats?.efficiency ?? 0;
  const pending = qcStats?.today?.pending ?? 0;

  return (
    <CentrumShell
      title="Fabrika Kontrol Merkezi" subtitle="Üretim · QC · Sevkiyat · Personel"
      roleLabel="Fabrika" roleColor="#38bdf8" roleBg="rgba(56,189,248,0.12)"
      kpis={[
        { label: "Hedef Uyum", value: `%${efficiency}`, variant: efficiency >= 80 ? "ok" as KpiVariant : "warn" as KpiVariant },
        { label: "QC Bekleyen", value: pending, variant: pending > 0 ? "warn" as KpiVariant : "ok" as KpiVariant },
        { label: "Aktif Personel", value: stats?.activeWorkers ?? 0, variant: "ok" as KpiVariant },
        { label: "Sevkiyat", value: (shipments ?? []).length, variant: "info" as KpiVariant },
      ]}
      actions={<TimeFilter value={period} onChange={setPeriod} />}
      rightPanel={<>
        <MiniStats title="Vardiya" rows={[
          { label: "Aktif", value: `${stats?.activeWorkers ?? 0} kişi` },
          { label: "Verim", value: `%${efficiency}`, color: efficiency >= 80 ? "#4ade80" : "#fbbf24" },
        ]} />
        <DobodySlot actions={[
          { id: 1, title: "Bakım planla", sub: "Kavurma makinesi 5 gün", mode: "action", btnLabel: "Planla", onApprove: () => {} },
          { id: 2, title: "Sevkiyat öncelik", sub: "Lara siparişi acil", mode: "info" },
        ]} />
      </>}
    >
      <ProgressWidget title="Üretim Plan vs Gerçek" rows={
        (stats?.products ?? []).slice(0, 6).map((p: any) => ({
          label: p.name,
          value: p.actual,
          max: p.target || 100,
        }))
      } />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <QCStatusWidget data={qcStats?.today ? {
          todayTotal: qcStats.today.total,
          pending: qcStats.today.pending,
          approved: qcStats.today.approved,
          rejected: qcStats.today.rejected,
          passRate: qcStats.today.passRate,
          overdueCount: qualityOverview?.overdueQC ?? 0,
          oldestPendingHours: qualityOverview?.oldestPendingHours,
        } : null} onViewAll={() => window.location.href = "/kalite-kontrol-dashboard"} />

        <Widget title="Sevkiyat">
          {(shipments ?? []).slice(0, 4).map((s: any, i: number) => (
            <ListItem key={i} title={`${s.branchName} — ${s.status}`} meta={`${s.itemCount} ürün · ${s.deadline}`}
              priority={s.status === "hazırlanıyor" ? "⏳" : "✓"} priorityColor={s.status === "hazırlanıyor" ? "#fbbf24" : "#4ade80"} />
          ))}
          {(shipments ?? []).length === 0 && <p className="text-[10px] text-muted-foreground px-3 py-3">Bekleyen sevkiyat yok</p>}
        </Widget>
      </div>
    </CentrumShell>
  );
}
