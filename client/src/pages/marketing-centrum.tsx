import { useQuery } from "@tanstack/react-query";
import { CentrumShell, Widget, MiniStats, ListItem, DobodySlot, TimeFilter, type TimePeriod, type KpiVariant } from "@/components/centrum/CentrumShell";
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function MarketingCentrum() {
  const [, navigate] = useLocation();
  const [period, setPeriod] = useState<TimePeriod>("month");

  const { data: feedbackStats, isLoading } = useQuery<any>({
    queryKey: ["/api/customer-feedback/stats/summary", period],
    queryFn: async () => { const r = await fetch(`/api/customer-feedback/stats/summary?period=${period}`, { credentials: "include" }); return r.ok ? r.json() : null; },
    refetchInterval: 120000,
  });
  const { data: healthData } = useQuery<any>({ queryKey: ["/api/agent/branch-health"] });
  const { data: dobodyActions = [] } = useQuery<any[]>({
    queryKey: ["/api/agent/actions", "pending", "marketing"],
    queryFn: async () => { const r = await fetch("/api/agent/actions?status=pending&limit=5", { credentials: "include" }); if (!r.ok) return []; const d = await r.json(); return Array.isArray(d) ? d : (d.data || d.actions || []); },
  });

  if (isLoading) return <div className="p-4 space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-40 w-full" /></div>;

  const avgRating = feedbackStats?.avgRating ?? healthData?.avgRating ?? 0;
  const totalFeedback = feedbackStats?.total ?? 0;
  const lowRatingCount = feedbackStats?.lowRating ?? 0;

  return (
    <CentrumShell
      title="Marketing Merkezi" subtitle="Müşteri · NPS · Kampanya · Marka"
      roleLabel="Marketing" roleColor="#ec4899"
      kpis={[
        { label: "NPS", value: `${avgRating}★`, variant: (avgRating >= 4 ? "ok" : avgRating >= 3 ? "warn" : "alert") as KpiVariant },
        { label: "Toplam GB", value: totalFeedback, variant: "info" as KpiVariant },
        { label: "Düşük Puan", value: lowRatingCount, variant: (lowRatingCount > 5 ? "alert" : "ok") as KpiVariant },
        { label: "Dobody", value: dobodyActions.length, variant: "purple" as KpiVariant },
      ]}
      actions={<TimeFilter value={period} onChange={setPeriod} />}
      rightPanel={<DobodySlot actions={dobodyActions.length > 0 ? dobodyActions.map((a: any) => ({
        id: a.id, title: a.title || a.message, sub: a.description,
        mode: (a.actionType === "info" ? "info" : "action") as any,
      })) : [
        { id: 1, title: "Sosyal medya analiz", sub: "Haftalık GB özeti hazırla", mode: "info" as const },
      ]} />}
    >
      <div className="grid grid-cols-2 gap-2.5">
        <MiniStats title="Müşteri Memnuniyet" rows={[
          { label: "Ortalama Puan", value: `${avgRating}★`, color: avgRating >= 4 ? "#22c55e" : "#fbbf24" },
          { label: "Toplam GB", value: `${totalFeedback}` },
          { label: "Düşük (1-2)", value: `${lowRatingCount}`, color: lowRatingCount > 0 ? "#ef4444" : "#22c55e" },
        ]} onLink={() => navigate("/crm?channel=misafir")} />

        <MiniStats title="Şube NPS Sıralaması" rows={
          (healthData?.branches ?? []).slice(0, 4).map((b: any) => ({
            label: (b.branchName || b.name || "").slice(0, 10),
            value: `${b.overallScore ?? b.totalScore ?? "—"}`,
            color: (b.overallScore ?? 0) >= 70 ? "#22c55e" : (b.overallScore ?? 0) >= 50 ? "#fbbf24" : "#ef4444",
          }))
        } onLink={() => navigate("/sube-saglik-skoru")} />
      </div>

      <Widget title="Son Müşteri Geri Bildirimleri" onClick={() => navigate("/crm?channel=misafir")}>
        {(feedbackStats?.recent ?? []).slice(0, 5).map((f: any, i: number) => (
          <ListItem key={i} title={`${f.branchName || "—"} — ${f.comment?.slice(0, 40) || "Yorum yok"}`}
            meta={`${f.rating}★ · ${f.timeAgo || f.date || ""}`}
            priority={f.rating <= 2 ? "!" : f.rating <= 3 ? "orta" : "iyi"}
            priorityColor={f.rating <= 2 ? "#ef4444" : f.rating <= 3 ? "#fbbf24" : "#22c55e"} />
        ))}
        {(feedbackStats?.recent ?? []).length === 0 && <p className="text-[10px] px-2 py-3" style={{color:"#6b7a8d"}}>Geri bildirim yok</p>}
      </Widget>

      <div className="grid grid-cols-2 gap-2.5">
        <MiniStats title="Kampanya Takip" rows={[
          { label: "Aktif kampanya", value: "—" },
          { label: "Bu ay etki", value: "—" },
        ]} />
        <MiniStats title="Marka Uyumu" rows={[
          { label: "Materyal uyum", value: "—" },
          { label: "Sosyal medya", value: "—" },
        ]} />
      </div>
    </CentrumShell>
  );
}
