import { useQuery } from "@tanstack/react-query";
import { CentrumShell, Widget, MiniStats, ListItem, DobodySlot, TimeFilter, type TimePeriod, type KpiVariant } from "@/components/centrum/CentrumShell";
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function DestekCentrum() {
  const [, navigate] = useLocation();
  const [period, setPeriod] = useState<TimePeriod>("week");

  const { data: ticketStats, isLoading } = useQuery<any>({
    queryKey: ["/api/iletisim/dashboard", period],
    queryFn: async () => { const r = await fetch(`/api/iletisim/dashboard?period=${period}`, { credentials: "include" }); return r.ok ? r.json() : null; },
    refetchInterval: 60000,
  });
  const { data: dobodyActions = [] } = useQuery<any[]>({
    queryKey: ["/api/agent/actions", "pending", "destek"],
    queryFn: async () => { const r = await fetch("/api/agent/actions?status=pending&limit=5", { credentials: "include" }); if (!r.ok) return []; const d = await r.json(); return Array.isArray(d) ? d : (d.data || d.actions || []); },
  });

  if (isLoading) return <div className="p-4 space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-40 w-full" /></div>;

  const openTickets = ticketStats?.openTickets ?? 0;
  const slaBreaches = ticketStats?.slaBreaches ?? 0;
  const resolvedThisWeek = ticketStats?.resolvedThisWeek ?? 0;

  return (
    <CentrumShell
      title="Destek Merkezi" subtitle="Talep · SLA · Çözüm Süresi"
      roleLabel="Destek" roleColor="#06b6d4"
      kpis={[
        { label: "Açık Talep", value: openTickets, variant: (openTickets > 10 ? "alert" : openTickets > 5 ? "warn" : "ok") as KpiVariant },
        { label: "SLA Aşım", value: slaBreaches, variant: (slaBreaches > 0 ? "alert" : "ok") as KpiVariant },
        { label: "Çözülen", value: resolvedThisWeek, variant: "ok" as KpiVariant },
        { label: "Dobody", value: dobodyActions.length, variant: "purple" as KpiVariant },
      ]}
      actions={<TimeFilter value={period} onChange={setPeriod} />}
      rightPanel={<DobodySlot actions={dobodyActions.length > 0 ? dobodyActions.map((a: any) => ({
        id: a.id, title: a.title || a.message, sub: a.description,
        mode: (a.actionType === "info" ? "info" : "action") as any,
      })) : [
        { id: 1, title: "SLA yaklaşan talepler", sub: "2 talep 4 saat içinde aşılacak", mode: "action" as const, btnLabel: "İncele" },
      ]} />}
    >
      <Widget title="Açık Talepler" onClick={() => navigate("/crm")}>
        {(ticketStats?.recentTickets ?? []).slice(0, 6).map((t: any, i: number) => (
          <ListItem key={i} title={t.title || t.subject || `Talep #${t.id}`}
            meta={`${t.department || "—"} · ${t.branchName || "—"} · ${t.timeAgo || ""}`}
            priority={t.slaBreached ? "SLA!" : t.priority === "acil" ? "Acil" : ""}
            priorityColor={t.slaBreached ? "#ef4444" : t.priority === "acil" ? "#fbbf24" : "#6b7a8d"} />
        ))}
        {(ticketStats?.recentTickets ?? []).length === 0 && <p className="text-[10px] px-2 py-3" style={{color:"#6b7a8d"}}>Açık talep yok</p>}
      </Widget>

      <div className="grid grid-cols-2 gap-2.5">
        <MiniStats title="Departman Dağılımı" rows={[
          { label: "Teknik", value: `${ticketStats?.byDept?.teknik ?? "—"}` },
          { label: "Lojistik", value: `${ticketStats?.byDept?.lojistik ?? "—"}` },
          { label: "Muhasebe", value: `${ticketStats?.byDept?.muhasebe ?? "—"}` },
          { label: "Eğitim", value: `${ticketStats?.byDept?.trainer ?? "—"}` },
        ]} onLink={() => navigate("/crm")} />

        <MiniStats title="Performans" rows={[
          { label: "Ort Çözüm", value: `${ticketStats?.avgResolveHours ?? "—"}s` },
          { label: "SLA Uyum", value: `%${ticketStats?.slaCompliance ?? "—"}`, color: (ticketStats?.slaCompliance ?? 100) < 80 ? "#fbbf24" : "#22c55e" },
          { label: "Bu hafta çözülen", value: `${resolvedThisWeek}`, color: "#22c55e" },
        ]} onLink={() => navigate("/crm")} />
      </div>

      <MiniStats title="Şube Talep Dağılımı" rows={
        (ticketStats?.byBranch ?? []).slice(0, 5).map((b: any) => ({
          label: (b.branchName || "").slice(0, 12), value: `${b.count ?? 0}`,
          color: (b.count ?? 0) > 5 ? "#ef4444" : undefined,
        }))
      } onLink={() => navigate("/crm")} />
    </CentrumShell>
  );
}
