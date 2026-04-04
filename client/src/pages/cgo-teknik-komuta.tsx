/**
 * CGO Control Centrum — Teknik & Operasyon dashboardı
 * Widget'lar: Canlı Arıza, Şube Sağlık, Uyum, CRM, Personel,
 *             Eskalasyon, Gelir-Gider + Sağ panel Teknik Sağlık + Dobody
 */
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { CentrumShell, Widget, MiniStats, ListItem, DobodySlot, TimeFilter, type TimePeriod, type KpiVariant } from "@/components/centrum/CentrumShell";
import { useState } from "react";
import { DobodyProposalWidget } from "@/components/DobodyProposalWidget";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function CGOTeknikKomuta() {
  const [, navigate] = useLocation();
  const [period, setPeriod] = useState<TimePeriod>("week");

  // /api/faults response: { data: [...], total, limit, offset }
  // Sunucu status parametresini desteklemiyor; client-side filtreleme uygulanır
  const { data: allFaults = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/faults", "all"],
    queryFn: async () => {
      const r = await fetch("/api/faults?limit=200", { credentials: "include" });
      if (!r.ok) return [];
      const d = await r.json();
      if (Array.isArray(d)) return d;
      return d.data ?? d.faults ?? [];
    },
  });

  // Açık arızalar: Türkçe DB status değerleri
  const faults = allFaults.filter((f: any) => f.status === "acik" || f.status === "devam_ediyor");

  // CRM teknik talepler — sla_breached alanı
  const { data: techTickets = [] } = useQuery<any[]>({
    queryKey: ["/api/iletisim/tickets", "teknik"],
    queryFn: async () => {
      const r = await fetch("/api/iletisim/tickets?department=teknik&status=acik", { credentials: "include" });
      if (!r.ok) return [];
      const d = await r.json();
      return Array.isArray(d) ? d : (d.tickets ?? []);
    },
  });

  const { data: healthData } = useQuery<any>({ queryKey: ["/api/agent/branch-health"] });

  const { data: livePersonnel } = useQuery<any>({ queryKey: ["/api/hq/kiosk/active-sessions"] });

  // Dobody — API format: { data: [...], total, limit }
  const { data: dobodyActions = [] } = useQuery<any[]>({
    queryKey: ["/api/agent/actions", "pending", "cgo"],
    queryFn: async () => {
      const r = await fetch("/api/agent/actions?status=pending&limit=8", { credentials: "include" });
      if (!r.ok) return [];
      const d = await r.json();
      return Array.isArray(d) ? d : (d.data ?? d.actions ?? []);
    },
  });

  if (isLoading) return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-40 w-full" />
    </div>
  );

  const branchScores: any[] = healthData?.branches ?? [];

  // Çözülen arızalar — Türkçe "cozuldu" status
  const resolvedFaults = allFaults.filter((f: any) =>
    f.status === "cozuldu" || f.currentStage === "cozuldu"
  );

  // SLA öncelikli arızalar — DB priority değerleri: "kritik", "yuksek"
  const slaFaults = faults.filter((f: any) =>
    f.priority === "kritik" || f.priority === "yuksek" || f.priority === "yüksek"
  );

  const activeSessions = livePersonnel?.activeSessions ?? livePersonnel?.sessions ?? [];

  // Uyum skorları — branch-health dimensions'tan hesaplanır
  const avgChecklistScore = branchScores.length > 0
    ? Math.round(
        branchScores.reduce((sum: number, b: any) => {
          const dim = b.dimensions?.find((d: any) => d.name === "checklist");
          return sum + (dim?.score ?? 0);
        }, 0) / branchScores.length
      )
    : null;
  const avgShiftScore = branchScores.length > 0
    ? Math.round(
        branchScores.reduce((sum: number, b: any) => {
          const dim = b.dimensions?.find((d: any) => d.name === "attendance");
          return sum + (dim?.score ?? 0);
        }, 0) / branchScores.length
      )
    : null;

  const totalFaults = healthData?.totalFaults ?? allFaults.length;
  const avgRating = healthData?.avgRating;
  const activeShifts = healthData?.totalActive ?? activeSessions.length;
  const maintenanceRequired = slaFaults.length;

  // Skor rengi: Tailwind sınıfları — inline hex yok
  function scoreColorClass(score: number) {
    return score >= 70 ? "text-green-500 dark:text-green-400"
         : score >= 50 ? "text-yellow-500 dark:text-yellow-400"
         : "text-destructive";
  }
  function barBgClass(score: number) {
    return score >= 70 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-destructive";
  }

  return (
    <CentrumShell
      title="CGO — Teknik" subtitle="Arıza·SLA·Finans"
      roleLabel="CGO" roleVariant="cgo"
      kpis={[
        { label: "Arıza", value: faults.length, variant: (faults.length > 5 ? "alert" : faults.length > 0 ? "warn" : "ok") as KpiVariant },
        { label: "SLA", value: slaFaults.length, variant: (slaFaults.length > 0 ? "alert" : "ok") as KpiVariant },
        { label: "Çözülen", value: resolvedFaults.length, variant: "ok" as KpiVariant },
        { label: "Personel", value: activeShifts || "—", variant: "ok" as KpiVariant },
        { label: "Dobody", value: dobodyActions.length, variant: "purple" as KpiVariant },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate("/ariza-yeni")}>+ Arıza</Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/crm?dept=teknik")}>Teknik Talep</Button>
          <TimeFilter value={period} onChange={setPeriod} />
        </div>
      }
      rightPanel={<>
        <Widget title="Teknik Sağlık" onClick={() => navigate("/sube-saglik-skoru")}>
          {branchScores.length === 0 && (
            <p className="text-xs px-3 py-2 text-muted-foreground">Veri yükleniyor…</p>
          )}
          {branchScores.slice(0, 5).map((b: any, i: number) => {
            const score = b.overallScore ?? b.totalScore ?? 0;
            return (
              <div key={i} className="flex items-center gap-2 px-3 py-1">
                <span className="text-[10px] w-16 shrink-0 truncate text-muted-foreground">{b.branchName ?? b.name}</span>
                <div className="flex-1 h-1.5 rounded-full bg-muted">
                  <div className={`h-full rounded-full transition-all ${barBgClass(score)}`} style={{ width: `${Math.min(score, 100)}%` }} />
                </div>
                <span className={`text-[10px] font-semibold w-7 text-right ${scoreColorClass(score)}`}>{score}</span>
              </div>
            );
          })}
        </Widget>
        <DobodyProposalWidget maxItems={4} />
      </>}
    >
      <div className="grid grid-cols-2 gap-2.5">
        <Widget
          title="Canlı Arıza"
          onClick={() => navigate("/ariza")}
          badge={
            faults.length > 0
              ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/20 text-destructive font-medium">{faults.length}</span>
              : undefined
          }
        >
          {faults.slice(0, 4).map((f: any, i: number) => (
            <ListItem
              key={i}
              title={`${f.branchName ?? f.branch_name ?? "—"} · ${f.equipmentName ?? f.equipment_name ?? f.equipmentType ?? "—"}`}
              meta={f.description ?? ""}
              priority={f.priority === "kritik" ? "SLA!" : f.priority}
              priorityColorClass={f.priority === "kritik" ? "text-destructive" : "text-yellow-500 dark:text-yellow-400"}
              onClick={() => navigate(`/ariza/${f.id}`)}
            />
          ))}
          {faults.length === 0 && (
            <p className="text-xs px-3 py-2 text-muted-foreground">Tüm ekipmanlar normal</p>
          )}
        </Widget>

        <Widget title="Şube Sağlık" onClick={() => navigate("/sube-saglik-skoru")}>
          {branchScores.length === 0 && (
            <p className="text-xs px-3 py-2 text-muted-foreground">Hesaplanıyor…</p>
          )}
          {branchScores.slice(0, 4).map((b: any, i: number) => {
            const score = b.overallScore ?? b.totalScore ?? 0;
            return (
              <div key={i} className="flex items-center gap-2 px-3 py-1">
                <span className="text-[10px] w-16 shrink-0 truncate text-muted-foreground">{b.branchName ?? b.name}</span>
                <div className="flex-1 h-1.5 rounded-full bg-muted">
                  <div className={`h-full rounded-full ${barBgClass(score)}`} style={{ width: `${Math.min(score, 100)}%` }} />
                </div>
                <span className={`text-[10px] font-semibold w-7 text-right ${scoreColorClass(score)}`}>{score}</span>
              </div>
            );
          })}
        </Widget>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <MiniStats title="Uyum" rows={[
          {
            label: "Vardiya",
            value: avgShiftScore !== null ? `%${avgShiftScore}` : "—",
            colorClass: avgShiftScore !== null && avgShiftScore < 70
              ? "text-yellow-500 dark:text-yellow-400"
              : undefined,
          },
          {
            label: "Checklist",
            value: avgChecklistScore !== null ? `%${avgChecklistScore}` : "—",
            colorClass: avgChecklistScore !== null && avgChecklistScore < 60
              ? "text-destructive"
              : undefined,
          },
        ]} onLink={() => navigate("/checklistler")} />

        <MiniStats title="CRM" rows={[
          { label: "Açık Talep", value: techTickets.length },
          {
            label: "SLA İhlali",
            value: techTickets.filter((t: any) => t.sla_breached || t.slaBreached).length,
            colorClass: "text-destructive",
          },
        ]} onLink={() => navigate("/crm")} />

        <MiniStats title="Personel" rows={[
          { label: "Aktif Vardiya", value: activeShifts || "—", colorClass: "text-green-500 dark:text-green-400" },
          { label: "Ort. Puan", value: avgRating != null ? `${avgRating}/5` : "—" },
        ]} onLink={() => navigate("/ik")} />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Widget title="Eskalasyon" onClick={() => navigate("/ariza")}>
          {(healthData?.escalations ?? []).length === 0 && (
            <p className="text-xs px-3 py-2 text-muted-foreground">Eskalasyon yok</p>
          )}
          {(healthData?.escalations ?? []).slice(0, 4).map((e: any, i: number) => {
            const isCritical = e.priority === "kritik";
            const level = isCritical ? 4 : 3;
            return (
              <ListItem
                key={i}
                title={e.title ?? e.equipment_name ?? e.branchName ?? "—"}
                meta={e.type === "fault" ? "Ekipman Arızası" : "Talep SLA"}
                priority={`K${level}`}
                priorityColorClass={isCritical ? "text-destructive" : "text-yellow-500 dark:text-yellow-400"}
                onClick={() => navigate(e.type === "fault" ? `/ariza/${e.id}` : "/crm")}
              />
            );
          })}
        </Widget>

        {/* Gelir-Gider: bakım sayısı gerçek; maliyet modülü henüz entegre değil */}
        <MiniStats title="Gelir-Gider" rows={[
          {
            label: "Bakım Gerekli",
            value: maintenanceRequired,
            colorClass: maintenanceRequired > 0 ? "text-yellow-500 dark:text-yellow-400" : undefined,
          },
          { label: "Toplam Arıza", value: totalFaults },
          { label: "Maliyet Analizi", value: "Yakında" },
        ]} onLink={() => navigate("/ekipman")} />
      </div>
    </CentrumShell>
  );
}
