/**
 * Fabrika Control Centrum — S3 genişletilmiş versiyon
 * Üretim planı, QC, sevkiyat, personel skor, fire takip, vardiya
 */
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { CentrumShell, Widget, MiniStats, ProgressWidget, ListItem, DobodySlot, Badge, TimeFilter, type TimePeriod, type KpiVariant } from "@/components/centrum/CentrumShell";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function FabrikaCentrum() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const role = user?.role || "";
  const [period, setPeriod] = useState<TimePeriod>("today");

  const { data: stats, isLoading } = useQuery<any>({ queryKey: ["/api/factory/production-stats"], refetchInterval: 60000 });
  const { data: qcStats } = useQuery<any>({ queryKey: ["/api/factory/qc/stats"], refetchInterval: 60000 });
  const { data: qualityOverview } = useQuery<any>({ queryKey: ["/api/factory/quality-overview"] });
  const { data: shipments } = useQuery<any[]>({ queryKey: ["/api/factory/shipments/pending"] });
  const { data: inventory } = useQuery<any[]>({ queryKey: ["/api/factory/inventory"] });
  const { data: wasteData } = useQuery<any>({ queryKey: ["/api/waste/insights/weekly"] });
  const { data: sessions } = useQuery<any[]>({ queryKey: ["/api/factory/kiosk/active-sessions"] });
  const { data: dobodyActions = [] } = useQuery<any[]>({
    queryKey: ["/api/agent/actions", "pending", "fabrika"],
    queryFn: async () => { const r = await fetch("/api/agent/actions?status=pending&limit=5", { credentials: "include" }); if (!r.ok) return []; const d = await r.json(); return Array.isArray(d) ? d : (d.data || d.actions || []); },
  });

  // MRP — bugünkü malzeme planı
  const today = new Date().toISOString().split("T")[0];
  const { data: mrpPlan } = useQuery<any>({ queryKey: ["/api/mrp/daily-plan", today], queryFn: async () => {
    const r = await fetch(`/api/mrp/daily-plan/${today}`, { credentials: "include" }); if (!r.ok) return null; return r.json();
  }, staleTime: 60000 });

  // Reçete versiyonları (son değişiklikler)
  const { data: recipes = [] } = useQuery<any[]>({ queryKey: ["/api/factory/recipes"], staleTime: 300000 });

  // Artan malzeme (gıda mühendisi doğrulama bekleyenler)
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const { data: leftovers = [] } = useQuery<any[]>({
    queryKey: ["/api/mrp/leftovers", yesterday],
    queryFn: async () => { const r = await fetch(`/api/mrp/leftovers/${yesterday}`, { credentials: "include" }); if (!r.ok) return []; return r.json(); },
    enabled: ["gida_muhendisi", "recete_gm", "admin"].includes(role),
    staleTime: 120000,
  });
  const unverifiedLeftovers = leftovers.filter((l: any) => !l.verified_by && !l.verifiedBy);

  // Stale fiyat uyarısı (satınalma, RGM, fabrika müdür)
  const { data: priceSummary } = useQuery<any>({
    queryKey: ["/api/inventory/price-summary"],
    enabled: ["satinalma", "recete_gm", "fabrika_mudur", "admin"].includes(role),
    staleTime: 300000,
  });

  if (isLoading) return <div className="p-4 space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-40 w-full" /></div>;

  const efficiency = stats?.efficiency ?? 0;
  const pending = qcStats?.today?.pending ?? 0;
  const rejected = qcStats?.today?.rejected ?? 0;
  const fireRate = wasteData?.wasteRate ?? stats?.wasteRate ?? 0;
  const activeWorkers = sessions?.length ?? stats?.activeWorkers ?? 0;
  const criticalStock = (inventory ?? []).filter((i: any) => (i.daysLeft ?? 99) <= 3).length;

  return (
    <CentrumShell
      title="Fabrika Kontrol Merkezi" subtitle="Üretim · QC · Sevkiyat · Personel"
      roleLabel="Fabrika" roleColor="#f59e0b"
      kpis={[
        { label: "Verimlilik", value: `%${efficiency}`, variant: (efficiency >= 80 ? "ok" : efficiency >= 60 ? "warn" : "alert") as KpiVariant },
        { label: "QC Bekleyen", value: pending, variant: (pending > 3 ? "alert" : pending > 0 ? "warn" : "ok") as KpiVariant },
        { label: "Red", value: rejected, variant: (rejected > 0 ? "alert" : "ok") as KpiVariant },
        { label: "Fire", value: `%${fireRate}`, variant: (fireRate > 5 ? "alert" : fireRate > 3 ? "warn" : "ok") as KpiVariant },
        { label: "Personel", value: activeWorkers, variant: "info" as KpiVariant },
        { label: "Kritik Stok", value: criticalStock, variant: (criticalStock > 0 ? "alert" : "ok") as KpiVariant },
      ]}
      actions={<div className="flex items-center gap-2"><Button size="sm" variant="outline" onClick={() => navigate("/fabrika")} className="text-xs h-7">Üretim</Button><Button size="sm" variant="outline" onClick={() => navigate("/kalite-kontrol-dashboard")} className="text-xs h-7">QC</Button><TimeFilter value={period} onChange={setPeriod} /></div>}
      rightPanel={<>
        {/* Vardiya */}
        <MiniStats title="Vardiya" rows={[
          { label: "Aktif", value: `${activeWorkers} kişi`, color: activeWorkers > 0 ? "#22c55e" : undefined },
          { label: "Verimlilik", value: `%${efficiency}`, color: efficiency >= 80 ? "#22c55e" : "#fbbf24" },
          { label: "Bugün Üretim", value: `${stats?.todayTotal ?? 0} adet` },
        ]} onLink={() => navigate("/fabrika/dashboard")} />

        {/* Fire/Atık */}
        <MiniStats title="Fire & Atık" rows={[
          { label: "Fire Oranı", value: `%${fireRate}`, color: fireRate > 5 ? "#ef4444" : fireRate > 3 ? "#fbbf24" : "#22c55e" },
          { label: "Bu Hafta", value: `${wasteData?.totalWaste ?? 0} kg` },
          { label: "Hedef", value: "<%5", color: "#6b7a8d" },
        ]} onLink={() => navigate("/waste-executive")} />

        {/* Dobody */}
        <DobodySlot actions={dobodyActions.length > 0 ? dobodyActions.map((a: any) => ({
          id: a.id, title: a.title || a.message, sub: a.description || a.detail,
          mode: a.actionType === "auto" ? "auto" as const : "action" as const,
          btnLabel: a.buttonLabel || "Onayla",
        })) : [
          { id: "d1", title: "Bakım planı kontrol et", sub: "Kavurma makinesi 5 gün", mode: "info" as const },
        ]} />
      </>}
    >
      {/* Üretim Plan vs Gerçek */}
      <ProgressWidget title="Üretim Plan vs Gerçek" rows={
        (stats?.products ?? []).slice(0, 8).map((p: any) => ({
          label: p.name || p.productName,
          value: p.actual ?? p.produced ?? 0,
          max: p.target || 100,
        }))
      } />

      <div className="grid grid-cols-2 gap-2.5">
        {/* QC Durumu */}
        <Widget title="Kalite Kontrol" onClick={() => navigate("/kalite-kontrol-dashboard")}
          badge={pending > 0 ? <Badge text={`${pending} bekliyor`} color="#fbbf24" /> : undefined}>
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] px-1"><span style={{color:"#6b7a8d"}}>Bugün Toplam</span><span className="font-semibold" style={{color:"#e8ecf1"}}>{qcStats?.today?.total ?? 0}</span></div>
            <div className="flex justify-between text-[11px] px-1"><span style={{color:"#6b7a8d"}}>Onaylanan</span><span className="font-semibold" style={{color:"#22c55e"}}>{qcStats?.today?.approved ?? 0}</span></div>
            <div className="flex justify-between text-[11px] px-1"><span style={{color:"#6b7a8d"}}>Reddedilen</span><span className="font-semibold" style={{color:"#ef4444"}}>{rejected}</span></div>
            <div className="flex justify-between text-[11px] px-1"><span style={{color:"#6b7a8d"}}>Geçiş Oranı</span><span className="font-semibold" style={{color:qcStats?.today?.passRate >= 90 ? "#22c55e" : "#fbbf24"}}>%{qcStats?.today?.passRate ?? 0}</span></div>
            {(qualityOverview?.overdueQC ?? 0) > 0 && <div className="flex justify-between text-[11px] px-1"><span style={{color:"#ef4444"}}>⚠ Geciken QC</span><span className="font-semibold" style={{color:"#ef4444"}}>{qualityOverview.overdueQC}</span></div>}
          </div>
        </Widget>

        {/* Sevkiyat */}
        <Widget title="Sevkiyat" onClick={() => navigate("/fabrika/dashboard")}
          badge={<Badge text={`${(shipments ?? []).length}`} color="#60a5fa" />}>
          {(shipments ?? []).slice(0, 4).map((s: any, i: number) => (
            <ListItem key={i} title={`${s.branchName || s.branch} — ${s.status || "Bekliyor"}`}
              meta={`${s.itemCount || s.items || "?"} ürün`}
              priority={s.status === "hazırlanıyor" ? "⏳" : "✓"}
              priorityColor={s.status === "hazırlanıyor" ? "#fbbf24" : "#22c55e"} />
          ))}
          {(shipments ?? []).length === 0 && <p className="text-[10px] px-2 py-2" style={{color:"#6b7a8d"}}>Bekleyen sevkiyat yok</p>}
        </Widget>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {/* Malzeme Çekme (MRP) */}
        <MiniStats title="Malzeme Çekme" rows={[
          { label: "Bugün Plan", value: mrpPlan?.plan ? `${mrpPlan.items?.length ?? 0} kalem` : "Plan yok" },
          { label: "Çekilen", value: mrpPlan?.plan ? `${mrpPlan.items?.filter((i: any) => i.status === "picked" || i.status === "verified").length ?? 0}` : "—", color: "#22c55e" },
          { label: "Bekleyen", value: mrpPlan?.plan ? `${mrpPlan.items?.filter((i: any) => i.status === "pending").length ?? 0}` : "—", color: mrpPlan?.items?.some((i: any) => i.status === "pending") ? "#fbbf24" : undefined },
        ]} onLink={() => navigate("/satinalma/stok-yonetimi")} />

        {/* Stok Durumu */}
        <MiniStats title="Ham Madde Stok" rows={[
          { label: "Toplam Ürün", value: `${(inventory ?? []).length}` },
          { label: "Kritik", value: `${criticalStock}`, color: criticalStock > 0 ? "#ef4444" : "#22c55e" },
          { label: "Sipariş Bkl", value: "—" },
        ]} onLink={() => navigate("/satinalma/stok-yonetimi")} />

        {/* Reçete */}
        <MiniStats title="Reçete & Versiyon" rows={[
          { label: "Aktif Reçete", value: `${recipes.length || stats?.activeRecipes || "—"}` },
          { label: "Son Güncelleme", value: recipes[0]?.updatedAt ? new Date(recipes[0].updatedAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }) : "—" },
          { label: "Versiyon", value: recipes[0]?.version ? `v${recipes[0].version}` : "—" },
        ]} onLink={() => navigate("/fabrika/receteler")} />
      </div>

      {/* ── Rol Bazlı Widgetlar ────────────────────────────── */}

      {/* Gıda Mühendisi: Artan malzeme doğrulama */}
      {["gida_muhendisi", "recete_gm", "admin"].includes(role) && unverifiedLeftovers.length > 0 && (
        <Widget title="Artan Malzeme Doğrulama" badge={<Badge text={`${unverifiedLeftovers.length} bekliyor`} color="#fbbf24" />}
          onClick={() => navigate("/fabrika/malzeme-cekme")}>
          {unverifiedLeftovers.slice(0, 4).map((lo: any, i: number) => (
            <ListItem key={i}
              title={lo.inventory_name || lo.inventoryName || "Malzeme"}
              meta={`${Number(lo.remaining_quantity || lo.remainingQuantity || 0).toLocaleString("tr-TR")} ${lo.unit}`}
              priority={lo.condition === "good" ? "✓" : lo.condition === "marginal" ? "⚠" : "✗"}
              priorityColor={lo.condition === "good" ? "#22c55e" : lo.condition === "marginal" ? "#fbbf24" : "#ef4444"} />
          ))}
        </Widget>
      )}

      {/* Depocu: Bugünkü çekme özeti */}
      {["fabrika_depo", "admin"].includes(role) && mrpPlan?.plan && (
        <MiniStats title="Bugünkü Çekme" rows={[
          { label: "Toplam", value: `${mrpPlan.items?.length ?? 0} kalem` },
          { label: "Çekilen", value: `${mrpPlan.items?.filter((i: any) => i.status === "picked" || i.status === "verified").length ?? 0}`, color: "#22c55e" },
          { label: "Bekleyen", value: `${mrpPlan.items?.filter((i: any) => i.status === "pending").length ?? 0}`, color: "#fbbf24" },
        ]} onLink={() => navigate("/fabrika/malzeme-cekme")} />
      )}

      {/* Fiyat Uyarısı (satınalma, RGM, fabrika müdür) */}
      {priceSummary && priceSummary.stale_price_count > 0 && ["satinalma", "recete_gm", "fabrika_mudur", "admin"].includes(role) && (
        <MiniStats title="⚠ Fiyat Güncelleme" rows={[
          { label: "Güncellenecek", value: `${priceSummary.stale_price_count} malzeme`, color: "#fbbf24" },
          { label: "Toplam HM", value: `${priceSummary.hammadde_count}` },
          { label: "Fiyatlı", value: `${priceSummary.with_price}/${priceSummary.total}` },
        ]} onLink={() => navigate("/satinalma/stok-yonetimi")} />
      )}
    </CentrumShell>
  );
}
