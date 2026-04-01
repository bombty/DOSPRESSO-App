import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { CentrumShell, KpiChip, Widget, MiniStats, ListItem, DobodySlot, TimeFilter, type TimePeriod, type KpiVariant } from "@/components/centrum/CentrumShell";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function MuhasebeCentrum() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<TimePeriod>("month");

  const { data: financeData, isLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/finance", period],
    refetchInterval: 120000,
  });

  const { data: ikData } = useQuery<any>({
    queryKey: ["/api/hr/ik-dashboard"],
    refetchInterval: 120000,
  });

  const { data: financialSummary } = useQuery<any[]>({
    queryKey: ["/api/branch-financial-summary"],
  });

  const { data: dobodyActions = [] } = useQuery<any[]>({
    queryKey: ["/api/agent/actions", "pending", "muhasebe"],
    queryFn: async () => { const r = await fetch("/api/agent/actions?status=pending&limit=5", { credentials: "include" }); if (!r.ok) return []; const d = await r.json(); return Array.isArray(d) ? d : (d.data || d.actions || []); },
  });

  if (isLoading) return <div className="p-4 space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-40 w-full" /></div>;

  const totalStaff = ikData?.totalEmployees ?? 0;
  const pendingLeave = ikData?.pendingLeaveRequests ?? 0;
  const payrollCompletion = financeData?.payrollCompletion ?? 0;

  return (
    <CentrumShell
      title="İK & Muhasebe Merkezi"
      subtitle="Personel · Bordro · Maliyet"
      roleLabel="İK/Muhasebe" roleColor="#fb923c" roleBg="rgba(251,146,60,0.12)"
      kpis={[
        { label: "Aktif Personel", value: totalStaff, variant: "ok" as KpiVariant },
        { label: "İzin Bekleyen", value: pendingLeave, variant: pendingLeave > 0 ? "warn" as KpiVariant : "ok" as KpiVariant },
        { label: "Bordro", value: `%${payrollCompletion}`, variant: payrollCompletion >= 80 ? "ok" as KpiVariant : "warn" as KpiVariant },
      ]}
      actions={<TimeFilter value={period} onChange={setPeriod} />}
      rightPanel={
        <DobodySlot actions={dobodyActions.length > 0 ? dobodyActions.map((a: any) => ({
          id: a.id, title: a.title || a.message, sub: a.description, mode: (a.actionType === "info" ? "info" : "action") as any,
        })) : [
          { id: 1, title: "Bordro onay bekliyor", sub: "3 şube — deadline 5 Nisan", mode: "info" },
        ]} />
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <MiniStats title="👷 Fabrika Personel" rows={[
          { label: "Aktif", value: ikData?.fabrikaActive ?? "—" },
          { label: "İzinli", value: ikData?.fabrikaLeave ?? 0 },
          { label: "Bordro", value: `₺${ikData?.fabrikaPayroll ?? "—"}` },
        ]} onLink={() => window.location.href = "/ik"} />
        <MiniStats title="🏢 HQ Personel" rows={[
          { label: "Aktif", value: ikData?.hqActive ?? "—" },
          { label: "İzinli", value: ikData?.hqLeave ?? 0 },
          { label: "Bordro", value: `₺${ikData?.hqPayroll ?? "—"}` },
        ]} onLink={() => window.location.href = "/ik"} />
        <MiniStats title="☕ Işıklar Personel" rows={[
          { label: "Aktif", value: ikData?.isiklarActive ?? "—" },
          { label: "İzinli", value: ikData?.isiklarLeave ?? 0 },
          { label: "Bordro", value: `₺${ikData?.isiklarPayroll ?? "—"}` },
        ]} onLink={() => window.location.href = "/ik"} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <MiniStats title="💰 Merkez Giderler" rows={[
          { label: "Toplam kira", value: financeData?.totalRent ?? "—" },
          { label: "Stok maliyeti", value: financeData?.stockCost ?? "—", color: "#fbbf24" },
          { label: "Satınalma raporu", value: "bağlantı →", color: "#60a5fa" },
        ]} linkText="Satınalma →" onLink={() => window.location.href = "/satinalma-centrum"} />
        <MiniStats title="📊 Diğer Şubeler Bordro" rows={[
          { label: "Toplam bordro", value: financeData?.totalBranchPayroll ?? "—" },
          { label: "Onay bekleyen", value: financeData?.pendingApproval ?? "—", color: "#fbbf24" },
          { label: "Sözleşme biten", value: financeData?.expiringContracts ?? "—", color: "#f87171" },
        ]} onLink={() => window.location.href = "/ik"} />
      </div>

      <Widget title="⚠ Dikkat Gerektiren">
        {(ikData?.alerts ?? []).length > 0 ? (ikData.alerts as any[]).map((a: any, i: number) => (
          <ListItem key={i} title={a.message} meta={a.detail} priority={a.severity === "critical" ? "!" : "⚠"} priorityColor={a.severity === "critical" ? "#f87171" : "#fbbf24"} />
        )) : <p className="text-[10px] text-muted-foreground px-3 py-3">Dikkat gerektiren konu yok</p>}
      </Widget>
    </CentrumShell>
  );
}
