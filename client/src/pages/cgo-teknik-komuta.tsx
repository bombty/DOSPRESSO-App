/**
 * CGO Teknik & Operasyonel Komuta Merkezi
 * Eski cgo-command-center.tsx'in iyi içerikleri + yeni tasarım birleştirildi
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Wrench, Clock, CheckCircle2, RefreshCw,
         ChevronRight, TrendingUp, TrendingDown, BarChart3, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PRI: Record<string, { label: string; color: string; bg: string; slaH: number }> = {
  kritik:  { label: "Kritik",  color: "#f87171", bg: "rgba(239,68,68,0.12)",  slaH: 4  },
  yüksek:  { label: "Yüksek", color: "#fbbf24", bg: "rgba(245,158,11,0.12)", slaH: 24 },
  orta:    { label: "Orta",   color: "#93c5fd", bg: "rgba(59,130,246,0.12)", slaH: 72 },
  düşük:   { label: "Düşük", color: "#86efac", bg: "rgba(34,197,94,0.08)",  slaH: 168 },
};

function slaStatus(createdAt: string, priority: string) {
  const ageH = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  const sla = PRI[priority?.toLowerCase()]?.slaH || 72;
  const pct = Math.min(100, Math.round((ageH / sla) * 100));
  if (pct >= 100) return { label: "SLA Aşıldı", color: "#f87171", pct: 100, breached: true };
  if (pct >= 80)  return { label: "SLA Risk",   color: "#fbbf24", pct, breached: false };
  return { label: `%${pct}`, color: "#4ade80", pct, breached: false };
}

function hoursAgo(d: string) {
  const h = Math.floor((Date.now() - new Date(d).getTime()) / 3600000);
  if (h < 1) return "Az önce";
  if (h < 24) return `${h} saat önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

function ScoreBar({ score }: { score: number }) {
  const c = score >= 80 ? "#4ade80" : score >= 60 ? "#fbbf24" : "#f87171";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: c }} />
      </div>
      <span className="text-xs font-bold w-6 text-right" style={{ color: c }}>{score}</span>
    </div>
  );
}

export default function CgoTeknikKomuta() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filterPri, setFilterPri] = useState("all");
  const [filterBranch, setFilterBranch] = useState("all");

  /* ── Queries ────────────────────────────────── */
  const { data: commandData, isLoading: cmdLoading, refetch } = useQuery<any>({
    queryKey: ["/api/cgo/command-center"],
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  const { data: faults = [], isLoading: faultsLoading } = useQuery<any[]>({
    queryKey: ["/api/faults"],
    queryFn: async () => {
      const res = await fetch("/api/faults?limit=100&status=open,in_progress", { credentials: "include" });
      if (!res.ok) return [];
      const d = await res.json();
      return Array.isArray(d) ? d : (d.faults || d.data || []);
    },
    staleTime: 3 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: techTickets = [] } = useQuery<any[]>({
    queryKey: ["/api/iletisim/tickets", "teknik-cgo"],
    queryFn: async () => {
      const res = await fetch("/api/iletisim/tickets?department=teknik&status=acik,islemde&limit=20", { credentials: "include" });
      if (!res.ok) return [];
      const d = await res.json();
      return Array.isArray(d) ? d : (d.tickets || d.data || []);
    },
    staleTime: 3 * 60 * 1000,
  });

  const { data: healthData } = useQuery<any>({
    queryKey: ["/api/agent/branch-health"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: slaActions = [] } = useQuery<any[]>({
    queryKey: ["/api/agent/actions", "cgo-sla"],
    queryFn: async () => {
      const res = await fetch("/api/agent/actions?status=pending&limit=8", { credentials: "include" });
      if (!res.ok) return [];
      const d = await res.json();
      return Array.isArray(d) ? d : (d.actions || []);
    },
    staleTime: 60000,
  });

  /* ── Mutation ───────────────────────────────── */
  const approveMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/agent/actions/${id}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/agent/actions"] });
      toast({ title: "Aksiyon onaylandı" });
    },
  });

  /* ── Derived ─────────────────────────────────── */
  const openFaults = faults.filter((f: any) => !["resolved","closed","cozuldu"].includes(f.status?.toLowerCase() || ""));
  const filtered = openFaults.filter((f: any) => {
    if (filterPri !== "all" && f.priority?.toLowerCase() !== filterPri) return false;
    if (filterBranch !== "all" && String(f.branchId) !== filterBranch) return false;
    return true;
  });
  const breached = openFaults.filter((f: any) => slaStatus(f.createdAt, f.priority).breached);
  const critical = openFaults.filter((f: any) => f.priority?.toLowerCase() === "kritik");

  const branchScores: Record<string, { count: number; name: string; critical: number }> = {};
  openFaults.forEach((f: any) => {
    const id = String(f.branchId || "?");
    if (!branchScores[id]) branchScores[id] = { count: 0, name: f.branchName || `#${id}`, critical: 0 };
    branchScores[id].count++;
    if (f.priority?.toLowerCase() === "kritik") branchScores[id].critical++;
  });
  const topBranches = Object.entries(branchScores).sort((a, b) => b[1].critical - a[1].critical || b[1].count - a[1].count).slice(0, 6);
  const allBranchNames = [...new Set(openFaults.map((f: any) => ({ id: String(f.branchId), name: f.branchName || `#${f.branchId}` })).filter((b: any) => b.id !== "undefined"))];

  // Summary from commandData
  const summary = commandData?.summary || commandData;
  const branchHealthList: any[] = healthData?.branches || commandData?.branchScores || [];

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold">Teknik & Operasyonel Komuta</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Canlı arıza · SLA · Şube sağlık · CRM</p>
        </div>
        <button onClick={() => refetch()} className="p-2 rounded-lg border hover:bg-muted/40">
          <RefreshCw size={14} className="text-muted-foreground" />
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Açık Arıza",    value: openFaults.length, color: openFaults.length > 10 ? "#f87171" : "var(--color-text-primary)", icon: Wrench },
          { label: "Kritik",        value: critical.length,   color: critical.length > 0   ? "#f87171" : "var(--color-text-primary)", icon: AlertTriangle },
          { label: "SLA İhlali",    value: breached.length,   color: breached.length > 0   ? "#f87171" : "#4ade80",               icon: Clock },
          { label: "CRM Teknik",    value: techTickets.length,color: techTickets.filter((t:any)=>t.slaBreached).length>0 ? "#fbbf24" : "var(--color-text-primary)", icon: BarChart3 },
          { label: "Dobody Öneri",  value: slaActions.length, color: "#a5a0f0",             icon: TrendingUp },
        ].map((k, i) => (
          <div key={i} className="rounded-xl border p-3">
            <div className="flex items-center gap-2 mb-1">
              <k.icon size={13} style={{ color: k.color }} />
              <span className="text-xs text-muted-foreground">{k.label}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="faults">
        <TabsList className="mb-1">
          <TabsTrigger value="faults">
            Arızalar
            {openFaults.length > 0 && <span className="ml-1.5 text-[10px] bg-red-500/15 text-red-400 px-1.5 rounded-full">{openFaults.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="tickets">
            CRM Teknik
            {techTickets.length > 0 && <span className="ml-1.5 text-[10px] bg-amber-500/15 text-amber-400 px-1.5 rounded-full">{techTickets.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="health">Şube Sağlık</TabsTrigger>
          <TabsTrigger value="dobody">
            Dobody
            {slaActions.length > 0 && <span className="ml-1.5 text-[10px] bg-purple-500/15 text-purple-400 px-1.5 rounded-full">{slaActions.length}</span>}
          </TabsTrigger>
        </TabsList>

        {/* TAB: Arızalar */}
        <TabsContent value="faults" className="m-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Select value={filterPri} onValueChange={setFilterPri}>
                  <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="Öncelik" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm öncelikler</SelectItem>
                    <SelectItem value="kritik">Kritik</SelectItem>
                    <SelectItem value="yüksek">Yüksek</SelectItem>
                    <SelectItem value="orta">Orta</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterBranch} onValueChange={setFilterBranch}>
                  <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Şube" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm şubeler</SelectItem>
                    {allBranchNames.slice(0, 15).map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground self-center ml-auto">{filtered.length} arıza</span>
              </div>
              <div className="space-y-2">
                {faultsLoading ? (
                  <div className="text-sm text-muted-foreground text-center py-8">Yükleniyor...</div>
                ) : filtered.length === 0 ? (
                  <div className="rounded-xl border p-8 text-center">
                    <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Açık arıza yok</p>
                  </div>
                ) : filtered.slice(0, 20).map((f: any) => {
                  const pri = PRI[f.priority?.toLowerCase()] || PRI.orta;
                  const sla = slaStatus(f.createdAt, f.priority);
                  return (
                    <div key={f.id} className="rounded-xl border p-3 hover:bg-muted/20 cursor-pointer"
                      onClick={() => navigate(`/arizalar/${f.id}`)}
                      style={{ borderLeft: `3px solid ${pri.color}` }}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-medium truncate">{f.title}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: pri.bg, color: pri.color }}>{pri.label}</span>
                            {sla.breached && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-red-500/15 text-red-400">SLA Aşıldı</span>}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                            <span>{f.branchName || `Şube #${f.branchId}`}</span>
                            <span>·</span><span>{f.equipmentName || f.location || "Ekipman"}</span>
                            <span>·</span><span>{hoursAgo(f.createdAt)}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <div className="flex items-center gap-1">
                            <div className="w-16 h-1.5 rounded-full bg-muted">
                              <div className="h-full rounded-full" style={{ width: `${sla.pct}%`, background: sla.color }} />
                            </div>
                            <span className="text-[10px]" style={{ color: sla.color }}>{sla.label}</span>
                          </div>
                          <ChevronRight size={12} className="text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Sağ: Top şubeler */}
            <div className="space-y-3">
              <div className="rounded-xl border p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><TrendingUp size={13} />En Çok Arıza Çıkaran</h3>
                {topBranches.map(([id, b]) => (
                  <div key={id} className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-muted-foreground flex-1 truncate">{b.name}</span>
                    {b.critical > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">{b.critical} kritik</span>}
                    <span className="text-xs font-medium">{b.count}</span>
                  </div>
                ))}
              </div>
              {/* Summary from command center API */}
              {summary && (
                <div className="rounded-xl border p-4">
                  <h3 className="text-sm font-semibold mb-3">Operasyonel Özet</h3>
                  <div className="space-y-2 text-sm">
                    {summary.totalBranches && <div className="flex justify-between"><span className="text-muted-foreground">Toplam Şube</span><span className="font-medium">{summary.totalBranches}</span></div>}
                    {summary.totalStaff && <div className="flex justify-between"><span className="text-muted-foreground">Toplam Personel</span><span className="font-medium">{summary.totalStaff}</span></div>}
                    {summary.avgHealthScore && <div className="flex justify-between"><span className="text-muted-foreground">Ort. Sağlık Skoru</span><span className="font-medium">{Math.round(summary.avgHealthScore)}</span></div>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* TAB: CRM Teknik */}
        <TabsContent value="tickets" className="m-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-2">
              {techTickets.length === 0 ? (
                <div className="rounded-xl border p-8 text-center">
                  <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Açık teknik talep yok</p>
                </div>
              ) : techTickets.map((t: any) => (
                <div key={t.id} className="rounded-xl border p-3 hover:bg-muted/20 cursor-pointer"
                  style={{ borderLeft: t.slaBreached ? "3px solid #ef4444" : "3px solid #f59e0b" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">{t.ticketNumber}</span>
                    <span className="text-sm font-medium flex-1 truncate">{t.title || t.subject}</span>
                    {t.slaBreached && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">SLA!</span>}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{t.branchName || "Şube"}</span><span>·</span>
                    <span>{t.status === 'acik' ? 'Açık' : t.status === 'islemde' ? 'İşlemde' : t.status || 'Açık'}</span>
                    <span>·</span><span>{hoursAgo(t.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold mb-3">Teknik CRM Özeti</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Açık</span><span className="font-medium">{techTickets.filter((t:any)=>t.status==='acik'||!t.status).length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">İşlemde</span><span className="font-medium">{techTickets.filter((t:any)=>t.status==='islemde').length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">SLA İhlali</span><span className="font-medium text-red-400">{techTickets.filter((t:any)=>t.slaBreached).length}</span></div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB: Şube Sağlık */}
        <TabsContent value="health" className="m-0">
          <div className="space-y-2">
            {branchHealthList.length === 0 && cmdLoading && (
              <div className="text-sm text-muted-foreground text-center py-8">Yükleniyor...</div>
            )}
            {[...branchHealthList]
              .sort((a: any, b: any) => (a.overallScore || a.score || 0) - (b.overallScore || b.score || 0))
              .map((b: any) => {
                const score = b.overallScore || b.score || 0;
                const name = b.branchName || b.name || "Şube";
                return (
                  <div key={b.branchId || b.id} className="rounded-xl border p-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium w-40 truncate">{name}</span>
                      <div className="flex-1">
                        <ScoreBar score={score} />
                      </div>
                      <span className="text-xs text-muted-foreground">{b.openFaults ?? ""} arıza</span>
                      <span className="text-xs text-muted-foreground">{b.staffCount ?? ""} kişi</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        score >= 80 ? "bg-green-500/15 text-green-400" :
                        score >= 60 ? "bg-amber-500/15 text-amber-400" : "bg-red-500/15 text-red-400"
                      }`}>{score >= 80 ? "Sağlıklı" : score >= 60 ? "Uyarı" : "Kritik"}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </TabsContent>

        {/* TAB: Dobody */}
        <TabsContent value="dobody" className="m-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {slaActions.length === 0 ? (
              <div className="rounded-xl border p-8 text-center col-span-2">
                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Bekleyen Dobody aksiyonu yok</p>
              </div>
            ) : slaActions.map((a: any) => (
              <div key={a.id} className="rounded-xl border p-4"
                style={{ borderColor: a.severity === "critical" ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.2)", background: a.severity === "critical" ? "rgba(239,68,68,0.03)" : "rgba(245,158,11,0.03)" }}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.description}</p>
                    {a.metadata?.branchName && (
                      <span className="text-[10px] mt-2 inline-block px-2 py-0.5 rounded bg-muted text-muted-foreground">{a.metadata.branchName}</span>
                    )}
                  </div>
                  <button
                    onClick={() => approveMutation.mutate(a.id)}
                    disabled={approveMutation.isPending}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 text-xs font-medium transition-colors disabled:opacity-50">
                    Onayla
                  </button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
