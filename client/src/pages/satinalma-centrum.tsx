import { useQuery } from "@tanstack/react-query";
import { CentrumShell, Widget, MiniStats, ListItem, DobodySlot, TimeFilter, type TimePeriod, type KpiVariant } from "@/components/centrum/CentrumShell";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function SatinalmaCentrum() {
  const [period, setPeriod] = useState<TimePeriod>("week");

  const { data: dashData, isLoading } = useQuery<any>({
    queryKey: ["/api/me/dashboard-data"],
    refetchInterval: 120000,
  });

  const { data: stockAlerts } = useQuery<any[]>({
    queryKey: ["/api/inventory/alerts"],
  });

  const { data: orders } = useQuery<any[]>({
    queryKey: ["/api/purchase-orders/active"],
  });

  const { data: dobodyActions = [] } = useQuery<any[]>({
    queryKey: ["/api/agent/actions", "pending", "satinalma"],
    queryFn: async () => { const r = await fetch("/api/agent/actions?status=pending&limit=5", { credentials: "include" }); if (!r.ok) return []; const d = await r.json(); return Array.isArray(d) ? d : (d.data || d.actions || []); },
  });

  if (isLoading) return <div className="p-4 space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-40 w-full" /></div>;

  const criticalStock = (stockAlerts ?? []).filter((s: any) => s.daysLeft <= 3).length;

  return (
    <CentrumShell
      title="Satınalma Merkezi" subtitle="Stok · Fiyat · Tedarikçi · Sipariş"
      roleLabel="Satınalma" roleColor="#f472b6" roleBg="rgba(244,114,182,0.12)"
      kpis={[
        { label: "Kritik Stok", value: criticalStock, variant: criticalStock > 0 ? "alert" as KpiVariant : "ok" as KpiVariant },
        { label: "Açık Sipariş", value: (orders ?? []).length, variant: "info" as KpiVariant },
      ]}
      actions={<TimeFilter value={period} onChange={setPeriod} />}
      rightPanel={
        <DobodySlot actions={dobodyActions.length > 0 ? dobodyActions.map((a: any) => ({
          id: a.id, title: a.title || a.message, sub: a.description, mode: (a.actionType === "info" ? "info" : "action") as any,
        })) : [
          { id: 1, title: "Stok sipariş hatırlatma", sub: "Kritik seviye kontrolü", mode: "info" },
        ]} />
      }
    >
      <Widget title="📦 Kritik Stok Uyarıları" badge={criticalStock > 0 ? <span className="text-[9px] bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded-full">{criticalStock} ürün</span> : undefined}>
        {(stockAlerts ?? []).slice(0, 5).map((s: any, i: number) => (
          <ListItem key={i} title={`${s.productName} — ${s.branchName}`} meta={`${s.daysLeft} gün kaldı · ${s.dailyUsage}/gün`}
            priority={s.daysLeft <= 2 ? "ACİL" : "Yakın"} priorityColor={s.daysLeft <= 2 ? "#f87171" : "#fbbf24"} />
        ))}
        {(stockAlerts ?? []).length === 0 && <p className="text-[10px] text-muted-foreground px-3 py-3">Kritik stok yok</p>}
      </Widget>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <MiniStats title="💲 Fiyat Güncelleme (Aylık)" rows={[
          { label: "Güncellenen", value: dashData?.priceUpdated ?? "—" },
          { label: "Artış olan", value: dashData?.priceIncreased ?? "—", color: "#f87171" },
          { label: "Stoktaki fark", value: dashData?.priceDiff ?? "—", color: "#f87171" },
        ]} />
        <MiniStats title="📋 Sipariş Giriş-Çıkış" rows={[
          { label: "Bu ay sipariş", value: dashData?.totalOrders ?? "—" },
          { label: "Giriş yapılan", value: dashData?.receivedOrders ?? "—" },
          { label: "Giriş bekleyen", value: dashData?.pendingReceipt ?? "—", color: "#fbbf24" },
        ]} />
      </div>

      <Widget title="Tedarikçi Performans">
        {(dashData?.suppliers ?? []).slice(0, 5).map((s: any, i: number) => (
          <ListItem key={i} title={`${s.name}: %${s.onTimeRate} zamanında`}
            priority={s.onTimeRate >= 85 ? "✓" : "⚠"} priorityColor={s.onTimeRate >= 85 ? "#4ade80" : "#fbbf24"} />
        ))}
      </Widget>
    </CentrumShell>
  );
}
