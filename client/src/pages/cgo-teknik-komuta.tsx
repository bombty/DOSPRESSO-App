/**
 * CGO Control Centrum — Onaylanan JSX prototype birebir
 * Widget'lar: Canlı Arıza, Şube Sağlık, Uyum, CRM, Personel,
 *             Eskalasyon, Gelir-Gider + Sağ panel Teknik Sağlık + Dobody
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { CentrumShell, KpiChip, Widget, MiniStats, ListItem, DobodySlot, ProgressWidget, TimeFilter, type TimePeriod, type KpiVariant } from "@/components/centrum/CentrumShell";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function CGOTeknikKomuta() {
  const [, navigate] = useLocation();
  const [period, setPeriod] = useState<TimePeriod>("week");

  const { data: faults = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/faults"],
    queryFn: async () => {
      const r = await fetch("/api/faults?limit=50&status=open,in_progress", { credentials: "include" });
      if (!r.ok) return [];
      const d = await r.json();
      return Array.isArray(d) ? d : (d.faults || []);
    },
  });

  const { data: techTickets = [] } = useQuery<any[]>({
    queryKey: ["/api/iletisim/tickets"],
    queryFn: async () => {
      const r = await fetch("/api/iletisim/tickets?department=teknik&status=acik,islemde&limit=20", { credentials: "include" });
      if (!r.ok) return [];
      const d = await r.json();
      return Array.isArray(d) ? d : (d.tickets || []);
    },
  });

  const { data: healthData } = useQuery<any>({ queryKey: ["/api/agent/branch-health"] });
  const { data: complianceData } = useQuery<any>({
    queryKey: ["/api/agent/compliance-overview", "week"],
    queryFn: async () => { const r = await fetch("/api/agent/compliance-overview?period=week", { credentials: "include" }); return r.ok ? r.json() : null; },
  });
  const { data: livePersonnel } = useQuery<any>({ queryKey: ["/api/hq/kiosk/active-sessions"] });
  const { data: dobodyActions = [] } = useQuery<any[]>({
    queryKey: ["/api/agent/actions", "pending", "cgo"],
    queryFn: async () => { const r = await fetch("/api/agent/actions?status=pending&limit=8", { credentials: "include" }); if (!r.ok) return []; const d = await r.json(); return Array.isArray(d) ? d : (d.actions || []); },
  });

  if (isLoading) return <div className="p-4 space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-40 w-full" /></div>;

  const branchScores: any[] = healthData?.branches || [];
  const slaFaults = faults.filter((f: any) => f.priority === "kritik" || f.priority === "yüksek");
  const compliance = complianceData?.overall || complianceData;
  const activeSessions = livePersonnel?.activeSessions || livePersonnel?.sessions || [];

  return (
    <CentrumShell
      title="CGO — Teknik" subtitle="Arıza·SLA·Finans"
      roleLabel="CGO" roleColor="#60a5fa" roleBg="rgba(96,165,250,0.18)"
      kpis={[
        { label: "Arıza", value: faults.length, variant: (faults.length > 5 ? "alert" : faults.length > 0 ? "warn" : "ok") as KpiVariant },
        { label: "SLA", value: slaFaults.length, variant: (slaFaults.length > 0 ? "alert" : "ok") as KpiVariant },
        { label: "Çözülen", value: faults.filter((f: any) => f.status === "resolved").length, variant: "ok" as KpiVariant },
        { label: "Personel", value: activeSessions.length || "—", variant: "ok" as KpiVariant },
        { label: "Dobody", value: dobodyActions.length, variant: "purple" as KpiVariant },
      ]}
      actions={<TimeFilter value={period} onChange={setPeriod} />}
      rightPanel={<>
        <Widget title="Teknik Sağlık">
          {branchScores.slice(0, 4).map((b: any, i: number) => {
            const score = b.totalScore || b.overallScore || 0;
            const c = score >= 70 ? "#22c55e" : score >= 50 ? "#fbbf24" : "#ef4444";
            return <div key={i} className="flex items-center gap-1.5 px-2.5 py-0.5">
              <span className="text-[8px] w-12 shrink-0 truncate" style={{ color: "#6b7a8d" }}>{b.branchName || b.name}</span>
              <div className="flex-1 h-1 rounded-full" style={{ background: "#1e2530" }}>
                <div className="h-full rounded-full" style={{ width: `${score}%`, background: c }} />
              </div>
              <span className="text-[8px] font-semibold w-6 text-right" style={{ color: c }}>{score}</span>
            </div>;
          })}
        </Widget>
        <DobodySlot actions={dobodyActions.slice(0, 4).map((a: any) => ({
          id: a.id, title: a.title || a.summary || "Öneri", sub: a.description || "",
          mode: "action" as const, btnLabel: a.actionLabel || "Onayla", onApprove: () => {},
        }))} />
      </>}
    >
      <div className="grid grid-cols-2 gap-2.5">
        <Widget title="Canlı Arıza" onClick={() => navigate("/ariza")}
          badge={faults.length > 0 ? <span className="text-[7px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.20)", color: "#ef4444" }}>{faults.length}</span> : undefined}>
          {faults.slice(0, 4).map((f: any, i: number) => (
            <ListItem key={i} title={`${f.branchName || "—"}·${f.equipmentType || f.equipment || "—"}`} meta={f.description || ""}
              priority={f.priority === "kritik" ? "SLA!" : f.priority} priorityColor={f.priority === "kritik" ? "#ef4444" : "#fbbf24"} onClick={() => navigate(`/ariza/${f.id}`)} />
          ))}
          {faults.length === 0 && <p className="text-[9px] px-2.5 py-2" style={{ color: "#6b7a8d" }}>Açık arıza yok</p>}
        </Widget>
        <Widget title="Şube Sağlık" onClick={() => navigate("/sube-saglik-skoru")}>
          {branchScores.slice(0, 4).map((b: any, i: number) => {
            const score = b.totalScore || b.overallScore || 0;
            const c = score >= 70 ? "#22c55e" : score >= 50 ? "#fbbf24" : "#ef4444";
            return <div key={i} className="flex items-center gap-1.5 px-2.5 py-0.5">
              <span className="text-[8px] w-12 shrink-0 truncate" style={{ color: "#6b7a8d" }}>{b.branchName || b.name}</span>
              <div className="flex-1 h-1 rounded-full" style={{ background: "#1e2530" }}>
                <div className="h-full rounded-full" style={{ width: `${score}%`, background: c }} />
              </div>
              <span className="text-[8px] font-semibold w-6 text-right" style={{ color: c }}>{score}</span>
            </div>;
          })}
        </Widget>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <MiniStats title="Uyum" rows={[
          { label: "Vardiya", value: `%${compliance?.shiftCompliance || compliance?.vardiya || "—"}`, color: (compliance?.shiftCompliance || 0) < 70 ? "#fbbf24" : undefined },
          { label: "Checklist", value: `%${compliance?.checklistCompletion || compliance?.checklist || "—"}`, color: (compliance?.checklistCompletion || 0) < 60 ? "#ef4444" : undefined },
        ]} onLink={() => {}} />
        <MiniStats title="CRM" rows={[
          { label: "Açık", value: techTickets.length },
          { label: "SLA", value: techTickets.filter((t: any) => t.isOverdue).length, color: "#ef4444" },
        ]} onLink={() => navigate("/crm")} />
        <MiniStats title="Personel" rows={[
          { label: "Aktif", value: activeSessions.length || "—", color: "#22c55e" },
          { label: "Devamsız", value: "—", color: "#ef4444" },
        ]} onLink={() => {}} />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Widget title="Eskalasyon" onClick={() => {}}>
          {(healthData?.escalations || []).slice(0, 3).map((e: any, i: number) => (
            <ListItem key={i} title={e.title || e.branchName || "—"} priority={`K${e.level || 3}`} priorityColor={e.level >= 4 ? "#ef4444" : "#fbbf24"} onClick={() => {}} />
          ))}
        </Widget>
        <MiniStats title="Gelir-Gider" rows={[
          { label: "Gelir", value: "₺1.2M", color: "#22c55e" },
          { label: "Gider", value: "₺890K" },
          { label: "Kâr", value: "₺310K", color: "#22c55e" },
        ]} onLink={() => {}} />
      </div>
    </CentrumShell>
  );
}
