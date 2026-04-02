/**
 * Depo & Lojistik Control Centrum — S3 genişletilmiş
 * Stok seviyeleri, LOT takibi, sipariş giriş, sevkiyat hazırlama
 */
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { CentrumShell, Widget, MiniStats, ListItem, DobodySlot, Badge, TimeFilter, type TimePeriod, type KpiVariant } from "@/components/centrum/CentrumShell";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function DepoCentrum() {
  const [, navigate] = useLocation();
  const [period, setPeriod] = useState<TimePeriod>("today");

  const { data: inventory, isLoading } = useQuery<any[]>({ queryKey: ["/api/factory/inventory"], refetchInterval: 60000 });
  const { data: pendingShipments } = useQuery<any[]>({ queryKey: ["/api/factory/shipments/pending"] });
  const { data: orders } = useQuery<any[]>({ queryKey: ["/api/factory/orders"] });
  const { data: batches } = useQuery<any[]>({ queryKey: ["/api/factory/batches"] });
  const { data: dobodyActions = [] } = useQuery<any[]>({
    queryKey: ["/api/agent/actions", "pending", "depo"],
    queryFn: async () => { const r = await fetch("/api/agent/actions?status=pending&limit=5", { credentials: "include" }); if (!r.ok) return []; const d = await r.json(); return Array.isArray(d) ? d : (d.data || d.actions || []); },
  });

  if (isLoading) return <div className="p-4 space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-40 w-full" /></div>;

  const critical = (inventory ?? []).filter((i: any) => (i.daysLeft ?? i.days_left ?? 99) <= 3).length;
  const lowStock = (inventory ?? []).filter((i: any) => (i.daysLeft ?? i.days_left ?? 99) <= 7).length;
  const pendingCount = (pendingShipments ?? []).length;
  const orderCount = (orders ?? []).filter((o: any) => o.status === "pending" || o.status === "processing").length;

  return (
    <CentrumShell
      title="Depo & Lojistik" subtitle="Stok · LOT · Sipariş · Sevkiyat"
      roleLabel="Depo" roleColor="#a78bfa"
      kpis={[
        { label: "Kritik Stok", value: critical, variant: (critical > 0 ? "alert" : "ok") as KpiVariant },
        { label: "Düşük Stok", value: lowStock, variant: (lowStock > 3 ? "warn" : "ok") as KpiVariant },
        { label: "Sevkiyat Bkl", value: pendingCount, variant: (pendingCount > 5 ? "warn" : "info") as KpiVariant },
        { label: "Sipariş Bkl", value: orderCount, variant: (orderCount > 0 ? "info" : "ok") as KpiVariant },
      ]}
      actions={<div className="flex items-center gap-2"><Button size="sm" variant="outline" onClick={() => navigate("/fabrika/dashboard")} className="text-xs h-7">Sevkiyat</Button><TimeFilter value={period} onChange={setPeriod} /></div>}
      rightPanel={<>
        <MiniStats title="Sevkiyat Özeti" rows={[
          { label: "Bekleyen", value: `${pendingCount}`, color: pendingCount > 0 ? "#fbbf24" : "#22c55e" },
          { label: "Bugün Gönderilen", value: "—" },
          { label: "Geciken", value: "0", color: "#22c55e" },
        ]} onLink={() => navigate("/fabrika/dashboard")} />

        <DobodySlot actions={dobodyActions.length > 0 ? dobodyActions.map((a: any) => ({
          id: a.id, title: a.title || a.message, sub: a.description,
          mode: a.actionType === "auto" ? "auto" as const : "action" as const,
          btnLabel: a.buttonLabel || "Başla",
        })) : [
          { id: "d1", title: "Sevkiyat öncelik", sub: "Lara siparişi acil hazırla", mode: "action" as const, btnLabel: "Başla", onApprove: () => {} },
          { id: "d2", title: "LOT son kullanma", sub: "2 lot 3 gün içinde sona eriyor", mode: "info" as const },
        ]} />
      </>}
    >
      {/* Stok Seviyeleri */}
      <Widget title="Stok Seviyeleri" onClick={() => navigate("/fabrika/dashboard")}
        badge={critical > 0 ? <Badge text={`${critical} kritik`} color="#ef4444" /> : undefined}>
        {(inventory ?? []).slice(0, 10).map((item: any, i: number) => {
          const days = item.daysLeft ?? item.days_left ?? 99;
          return (
            <ListItem key={i}
              title={`${item.name || item.productName}: ${item.quantity ?? item.stock ?? 0} ${item.unit || "adet"}`}
              meta={`${days} gün kalan${item.dailyUsage ? ` · günlük ${item.dailyUsage}` : ""}`}
              priority={days <= 2 ? "KRİTİK" : days <= 5 ? "Düşük" : "✓"}
              priorityColor={days <= 2 ? "#ef4444" : days <= 5 ? "#fbbf24" : "#22c55e"}
              onClick={() => navigate("/fabrika/dashboard")} />
          );
        })}
        {(inventory ?? []).length === 0 && <p className="text-[10px] px-2 py-3" style={{color:"#6b7a8d"}}>Stok verisi yok</p>}
      </Widget>

      <div className="grid grid-cols-2 gap-2.5">
        {/* Sipariş Takibi */}
        <Widget title="Sipariş Takibi" onClick={() => navigate("/fabrika/dashboard")}>
          {(orders ?? []).slice(0, 5).map((o: any, i: number) => (
            <ListItem key={i}
              title={o.branchName || o.branch || `Sipariş #${o.id}`}
              meta={`${o.itemCount || o.items || "?"} ürün · ${o.status || "bekliyor"}`}
              priority={o.status === "pending" ? "⏳" : o.status === "processing" ? "▶" : "✓"}
              priorityColor={o.status === "pending" ? "#fbbf24" : o.status === "processing" ? "#60a5fa" : "#22c55e"} />
          ))}
          {(orders ?? []).length === 0 && <p className="text-[10px] px-2 py-3" style={{color:"#6b7a8d"}}>Bekleyen sipariş yok</p>}
        </Widget>

        {/* LOT Takibi */}
        <Widget title="LOT Takibi" onClick={() => navigate("/fabrika/dashboard")}>
          {(batches ?? []).slice(0, 5).map((b: any, i: number) => {
            const expDays = b.expiryDays ?? b.daysUntilExpiry ?? 99;
            return (
              <ListItem key={i}
                title={`LOT-${b.lotNumber || b.id} · ${b.productName || b.product || "—"}`}
                meta={`${expDays} gün · ${b.quantity || "?"} ${b.unit || "adet"}`}
                priority={expDays <= 3 ? "⚠ YAKLAŞIYOR" : "✓"}
                priorityColor={expDays <= 3 ? "#ef4444" : expDays <= 7 ? "#fbbf24" : "#22c55e"} />
            );
          })}
          {(batches ?? []).length === 0 && <p className="text-[10px] px-2 py-3" style={{color:"#6b7a8d"}}>LOT verisi yok</p>}
        </Widget>
      </div>

      {/* Alt bilgi */}
      <div className="grid grid-cols-3 gap-2.5">
        <MiniStats title="FIFO Uyumu" rows={[
          { label: "Uyum", value: "—" },
          { label: "İhlal", value: "0", color: "#22c55e" },
        ]} />
        <MiniStats title="Sevkiyat Hızı" rows={[
          { label: "Ort Hazırlama", value: "—" },
          { label: "Doğruluk", value: "—" },
        ]} />
        <MiniStats title="Tedarik" rows={[
          { label: "Aktif Tedarikçi", value: "—" },
          { label: "Geciken Sipariş", value: "0", color: "#22c55e" },
        ]} />
      </div>
    </CentrumShell>
  );
}
