import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { AlertTriangle, Wrench, Clock, CheckCircle2, RefreshCw, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PRIORITY_META: Record<string, { label: string; color: string; bg: string; slaHours: number }> = {
  kritik:  { label: "Kritik",  color: "#f87171", bg: "rgba(239,68,68,0.12)",  slaHours: 4  },
  yüksek: { label: "Yüksek", color: "#fbbf24", bg: "rgba(245,158,11,0.12)", slaHours: 24 },
  orta:    { label: "Orta",    color: "#93c5fd", bg: "rgba(59,130,246,0.12)", slaHours: 72 },
  düşük:  { label: "Düşük",  color: "#86efac", bg: "rgba(34,197,94,0.08)",  slaHours: 168 },
};

function getSLAStatus(createdAt: string, priority: string) {
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  const sla = PRIORITY_META[priority?.toLowerCase()]?.slaHours || 72;
  const pct = Math.min(100, Math.round((ageHours / sla) * 100));
  if (pct >= 100) return { label: "SLA Aşıldı", color: "#f87171", pct: 100, breached: true };
  if (pct >= 80)  return { label: "SLA Kritik", color: "#fbbf24", pct, breached: false };
  return { label: `%${pct}`, color: "#4ade80", pct, breached: false };
}

function hoursAgo(dateStr: string) {
  const h = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000);
  if (h < 1) return "Az önce";
  if (h < 24) return `${h} saat önce`;
  return `${Math.floor(h/24)} gün önce`;
}

export default function CgoTeknikKomuta() {
  const [, navigate] = useLocation();
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterBranch, setFilterBranch] = useState("all");

  const { data: faults = [], isLoading, isError, faultsLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/faults"],
    queryFn: async () => {
      const res = await fetch("/api/faults?limit=100&status=open,in_progress", { credentials: "include" });
      if (!res.ok) return [];
      const d = await res.json();
      return Array.isArray(d) ? d : (d.faults || d.data || []);
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  // Equipment critical: mevcut endpoint scope sorunu var, ileride aktif edilecek
  // const { data: equipment = [] } = useQuery<any[]>({ queryKey: ["/api/equipment/critical"] });

  // P0: CRM teknik talepler
  const { data: techTickets = [] } = useQuery<any[]>({
    queryKey: ["/api/iletisim/tickets", "teknik"],
    queryFn: async () => {
      const res = await fetch("/api/iletisim/tickets?department=teknik&status=acik,islemde&limit=15", { credentials: "include" });
      if (!res.ok) return [];
      const d = await res.json();
      return Array.isArray(d) ? d : (d.tickets || d.data || []);
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: slaInsights = [] } = useQuery<any>({
    queryKey: ["/api/agent/actions", "sla"],
    queryFn: async () => {
      const res = await fetch("/api/agent/actions?type=sla_breached&status=pending&limit=10", { credentials: "include" });
      if (!res.ok) return [];
      const d = await res.json();
      return Array.isArray(d) ? d : (d.actions || []);
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: healthData } = useQuery<any>({
    queryKey: ["/api/agent/branch-health"],
    staleTime: 5 * 60 * 1000,
  });

  const openFaults = faults.filter((f: any) => !["resolved", "closed", "cozuldu"].includes(f.status?.toLowerCase() || ""));
  const filtered = openFaults.filter((f: any) => {
    if (filterPriority !== "all" && f.priority?.toLowerCase() !== filterPriority) return false;
    if (filterBranch !== "all" && String(f.branchId) !== filterBranch) return false;
    return true;
  });

  const breached = openFaults.filter((f: any) => getSLAStatus(f.createdAt, f.priority).breached);
  const critical  = openFaults.filter((f: any) => f.priority?.toLowerCase() === "kritik");
  const branches  = [...new Set(openFaults.map((f: any) => f.branchId).filter(Boolean))];

  // Şube bazında arıza sayısı
  const byBranch: Record<string, { count: number; name: string; critical: number }> = {};
  openFaults.forEach((f: any) => {
    const id = String(f.branchId || "bilinmeyen");
    if (!byBranch[id]) byBranch[id] = { count: 0, name: f.branchName || `Şube #${id}`, critical: 0 };
    byBranch[id].count++;
    if (f.priority?.toLowerCase() === "kritik") byBranch[id].critical++;
  });
  const topBranches = Object.entries(byBranch).sort((a, b) => b[1].critical - a[1].critical || b[1].count - a[1].count).slice(0, 5);

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Teknik Komuta Merkezi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Tüm şubelerde canlı ekipman sağlığı ve arıza SLA takibi</p>
        </div>
        <button onClick={() => refetch()} className="p-2 rounded-lg border hover:bg-muted/40 transition-colors">
          <RefreshCw size={14} className="text-muted-foreground" />
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Açık Arıza", value: openFaults.length, color: openFaults.length > 10 ? "#f87171" : "#e2e8f0", icon: Wrench },
          { label: "Kritik",      value: critical.length,   color: critical.length > 0  ? "#f87171" : "#e2e8f0",  icon: AlertTriangle },
          { label: "SLA İhlali",  value: breached.length,   color: breached.length > 0  ? "#f87171" : "#4ade80",  icon: Clock },
          { label: "Şube Etkilenen", value: branches.length, color: "#93c5fd",           icon: TrendingUp },
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

      <Tabs defaultValue="faults">
        <TabsList className="mb-3">
          <TabsTrigger value="faults">Arızalar <span className="ml-1.5 text-[10px] bg-red-500/15 text-red-400 px-1.5 rounded-full">{openFaults.length}</span></TabsTrigger>
          <TabsTrigger value="tickets">CRM Teknik <span className="ml-1.5 text-[10px] bg-amber-500/15 text-amber-400 px-1.5 rounded-full">{techTickets.length}</span></TabsTrigger>
        </TabsList>
        <TabsContent value="faults" className="m-0">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sol: Arıza Listesi */}
        <div className="lg:col-span-2 space-y-3">
          {/* Filtreler */}
          <div className="flex gap-2">
            <Select value={filterPriority} onValueChange={setFilterPriority}>
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
                {topBranches.map(([id, b]) => (
                  <SelectItem key={id} value={id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground self-center ml-auto">{filtered.length} arıza</span>
          </div>

          {/* Arıza Kartları */}
          <div className="space-y-2">
            {faultsLoading ? (
              <div className="text-sm text-muted-foreground text-center py-8">Yükleniyor...</div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border p-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Açık arıza yok</p>
              </div>
            ) : filtered.slice(0, 15).map((fault: any) => {
              const pri = PRIORITY_META[fault.priority?.toLowerCase()] || PRIORITY_META.orta;
              const sla = getSLAStatus(fault.createdAt, fault.priority);
              return (
                <div key={fault.id} className="rounded-xl border p-3 hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => navigate(`/arizalar/${fault.id}`)}
                  style={{ borderLeft: `3px solid ${pri.color}` }}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-medium truncate">{fault.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: pri.bg, color: pri.color }}>{pri.label}</span>
                        {sla.breached && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-red-500/15 text-red-400">SLA Aşıldı</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span>{fault.branchName || `Şube #${fault.branchId}`}</span>
                        <span>·</span>
                        <span>{fault.equipmentName || fault.location || "Ekipman"}</span>
                        <span>·</span>
                        <span>{hoursAgo(fault.createdAt)}</span>
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

        {/* Sağ: Risk Paneli */}
        <div className="space-y-3">
          {/* Şube Bazında Arıza */}
          <div className="rounded-xl border p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp size={13} className="text-primary" />
              En Çok Arıza Çıkaran Şubeler
            </h3>
            <div className="space-y-2">
              {topBranches.map(([id, b]) => (
                <div key={id} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground flex-1 truncate">{b.name}</span>
                  {b.critical > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">{b.critical} kritik</span>
                  )}
                  <span className="text-xs font-medium">{b.count}</span>
                </div>
              ))}
              {topBranches.length === 0 && (
                <p className="text-xs text-muted-foreground">Arıza yok</p>
              )}
            </div>
          </div>

          {/* Dobody SLA Uyarıları */}
          {Array.isArray(slaInsights) && slaInsights.length > 0 && (
            <div className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span>🤖</span> Dobody — SLA Uyarıları
                <span className="ml-auto text-xs bg-amber-500/15 text-amber-500 px-2 py-0.5 rounded-full border border-amber-500/30">{slaInsights.length}</span>
              </h3>
              <div className="space-y-2">
                {slaInsights.slice(0, 4).map((a: any) => (
                  <div key={a.id} className="flex items-start gap-2 text-xs p-2 rounded-lg border border-amber-500/20 bg-amber-500/6">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{a.title}</p>
                      <p className="text-muted-foreground mt-0.5 line-clamp-2">{a.description}</p>
                    </div>
                    <button
                      onClick={() => approveSLA(a.id)}
                      className="flex-shrink-0 px-2 py-1 rounded text-[10px] font-medium bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors whitespace-nowrap">
                      Onayla
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Şube Sağlık Skoru - Ekipman boyutu */}
          {healthData?.branches && (
            <div className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Wrench size={13} />
                Ekipman Sağlık Skorları
              </h3>
              <div className="space-y-1.5">
                {healthData.branches
                  .map((b: any) => ({ ...b, eq: b.dimensions?.find((d: any) => d.name === "equipment")?.score || 0 }))
                  .sort((a: any, z: any) => a.eq - z.eq)
                  .slice(0, 6)
                  .map((b: any) => (
                    <div key={b.branchId} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground flex-1 truncate">{b.branchName}</span>
                      <div className="w-16 h-1.5 rounded-full bg-muted">
                        <div className="h-full rounded-full" style={{ width: `${b.eq}%`, background: b.eq < 60 ? "#ef4444" : b.eq < 80 ? "#f59e0b" : "#22c55e" }} />
                      </div>
                      <span className="text-xs font-medium w-5 text-right">{b.eq}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
      </TabsContent>

      <TabsContent value="tickets" className="m-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-2">
            {techTickets.length === 0 ? (
              <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">Açık teknik talep yok</div>
            ) : techTickets.map((t: any) => (
              <div key={t.id} className="rounded-xl border p-3 hover:bg-muted/20 transition-colors"
                style={{ borderLeft: t.slaBreached ? "3px solid #ef4444" : "3px solid #f59e0b" }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-muted-foreground">{t.ticketNumber}</span>
                  <span className="text-sm font-medium flex-1 truncate">{t.title || t.subject}</span>
                  {t.slaBreached && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">SLA!</span>}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{t.branchName || "Şube"}</span><span>·</span>
                  <span>{t.status === 'acik' ? 'Açık' : t.status === 'islemde' ? 'İşlemde' : t.status}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border p-4">
            <h3 className="text-sm font-semibold mb-3">Teknik Talep Özeti</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Açık</span><span className="font-medium">{techTickets.filter((t:any)=>t.status==='acik').length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">İşlemde</span><span className="font-medium">{techTickets.filter((t:any)=>t.status==='islemde').length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">SLA İhlali</span><span className="font-medium text-red-400">{techTickets.filter((t:any)=>t.slaBreached).length}</span></div>
            </div>
          </div>
        </div>
      </TabsContent>
      </Tabs>
    </div>
  );
}
