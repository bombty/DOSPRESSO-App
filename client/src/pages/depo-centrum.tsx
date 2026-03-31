import { useQuery } from "@tanstack/react-query";
import { CentrumShell, Widget, MiniStats, ListItem, DobodySlot, TimeFilter, type TimePeriod, type KpiVariant } from "@/components/centrum/CentrumShell";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DepoCentrum() {
  const [period, setPeriod] = useState<TimePeriod>("today");

  const { data: inventory, isLoading } = useQuery<any[]>({
    queryKey: ["/api/factory/inventory"],
    refetchInterval: 60000,
  });

  const { data: pendingShipments } = useQuery<any[]>({
    queryKey: ["/api/factory/shipments/pending"],
  });

  if (isLoading) return <div className="p-4 space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-40 w-full" /></div>;

  const critical = (inventory ?? []).filter((i: any) => i.daysLeft <= 3).length;

  return (
    <CentrumShell
      title="Depo & Lojistik" subtitle="Stok · LOT · Sevkiyat"
      roleLabel="Depo" roleColor="#a78bfa" roleBg="rgba(167,139,250,0.12)"
      kpis={[
        { label: "Kritik Stok", value: critical, variant: critical > 0 ? "alert" as KpiVariant : "ok" as KpiVariant },
        { label: "Bekleyen Sevk", value: (pendingShipments ?? []).length, variant: "info" as KpiVariant },
      ]}
      actions={<TimeFilter value={period} onChange={setPeriod} />}
      rightPanel={<DobodySlot actions={[
        { id: 1, title: "Sevkiyat öncelik", sub: "Lara acil hazırla", mode: "action", btnLabel: "Başla", onApprove: () => {} },
        { id: 2, title: "LOT son kullanma", sub: "2 lot yaklaşıyor", mode: "info" },
      ]} />}
    >
      <Widget title="Stok Seviyeleri" badge={critical > 0 ? <span className="text-[9px] bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded-full">{critical} kritik</span> : undefined}>
        {(inventory ?? []).slice(0, 8).map((item: any, i: number) => (
          <ListItem key={i} title={`${item.name}: ${item.quantity} ${item.unit}`} meta={`${item.daysLeft} gün · günlük ${item.dailyUsage}`}
            priority={item.daysLeft <= 2 ? "KRİTİK" : item.daysLeft <= 5 ? "Düşük" : "✓"} priorityColor={item.daysLeft <= 2 ? "#f87171" : item.daysLeft <= 5 ? "#fbbf24" : "#4ade80"} />
        ))}
      </Widget>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <MiniStats title="Sipariş Takibi" rows={[
          { label: "Giriş bekleyen", value: "—" },
          { label: "Geciken", value: "—" },
        ]} />
        <MiniStats title="LOT Sistemi" rows={[
          { label: "Aktif lot", value: "—" },
          { label: "Son kullanma yakın", value: "—", color: "#fbbf24" },
          { label: "FIFO uyum", value: "—" },
        ]} />
      </div>
    </CentrumShell>
  );
}
