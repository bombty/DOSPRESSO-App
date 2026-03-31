import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, CheckCircle2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CentrumShell, KpiChip, DobodySlot, MiniStats, ProgressWidget, Widget, ListItem } from "@/components/centrum/CentrumShell";

function hoursAgo(d: string) {
  const h = Math.floor((Date.now() - new Date(d).getTime()) / 3600000);
  return h < 1 ? "Az önce" : h < 24 ? `${h}s önce` : `${Math.floor(h / 24)}g önce`;
}
function slaInfo(createdAt: string, priority: string) {
  const h = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  const max = priority === "kritik" ? 4 : priority === "yüksek" ? 24 : 72;
  const pct = Math.min(100, Math.round((h / max) * 100));
  const color = pct >= 100 ? "#f87171" : pct >= 80 ? "#fbbf24" : "#4ade80";
  return { pct, label: pct >= 100 ? "SLA!" : `%${pct}`, color, breached: pct >= 100 };
}
const PRI_COLOR: Record<string, string> = { kritik: "#f87171", yüksek: "#fbbf24", orta: "#93c5fd", düşük: "#86efac" };

export default function CgoTeknikKomuta() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filterBranch, setFilterBranch] = useState("all");

  const { data: faults = [], isLoading: faultsLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/faults"],
    queryFn: async () => {
      const r = await fetch("/api/faults?limit=50&status=open,in_progress", { credentials: "include" });
      if (!r.ok) return [];
      const d = await r.json();
      return Array.isArray(d) ? d : (d.faults || d.data || []);
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: techTickets = [] } = useQuery<any[]>({
    queryKey: ["/api/iletisim/tickets", "cgo-teknik"],
    queryFn: async () => {
      const r = await fetch("/api/iletisim/tickets?department=teknik&status=acik,islemde&limit=20", { credentials: "include" });
      if (!r.ok) return [];
      const d = await r.json();
      return Array.isArray(d) ? d : (d.tickets || d.data || []);
    },
    staleTime: 3 * 60 * 1000,
  });

  const { data: healthData } = useQuery<any>({
    queryKey: ["/api/agent/branch-health"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: complianceData } = useQuery<any>({
    queryKey: ["/api/agent/compliance-overview", "week"],
    queryFn: async () => {
      const r = await fetch("/api/agent/compliance-overview?period=week", { credentials: "include" });
      if (!r.ok) return null;
      return r.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: livePersonnel } = useQuery<any>({
    queryKey: ["/api/hq/kiosk/active-sessions"],
    staleTime: 2 * 60 * 1000,
    refetchInterval: 3 * 60 * 1000,
  });

  const { data: dobodyActions = [] } = useQuery<any[]>({
    queryKey: ["/api/agent/actions", "cgo-pending"],
    queryFn: async () => {
      const r = await fetch("/api/agent/actions?status=pending&limit=8", { credentials: "include" });
      if (!r.ok) return [];
      const d = await r.json();
      return Array.isArray(d) ? d : (d.actions || []);
    },
    staleTime: 60 * 1000,
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/agent/actions/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/agent/actions"] }); toast({ title: "Aksiyon onaylandı" }); },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/tasks", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/tasks"] }); toast({ title: "Görev oluşturuldu" }); },
  });

  // Derived
  const openFaults = faults.filter(f => !["resolved","closed","cozuldu"].includes(f.status?.toLowerCase() || ""));
  const breached = openFaults.filter(f => slaInfo(f.createdAt, f.priority).breached);
  const critical = openFaults.filter(f => f.priority?.toLowerCase() === "kritik");
  const filtered = openFaults.filter(f => filterBranch === "all" || String(f.branchId) === filterBranch);

  const branchScores: any[] = healthData?.branches || [];
  const allBranches = [...new Set(openFaults.map(f => ({ id: String(f.branchId), name: f.branchName || `#${f.branchId}` })))];

  // Uyum verileri
  const compliance = complianceData?.overall || complianceData;
  const shiftPct = compliance?.shiftCompliance ?? compliance?.vardiyaUyum ?? 72;
  const checklistPct = compliance?.checklistCompliance ?? compliance?.checklistUyum ?? 58;
  const trainingPct = compliance?.trainingCompliance ?? compliance?.egitimUyum ?? 84;

  // Canlı personel
  const activeSessions = livePersonnel?.activeSessions || livePersonnel?.sessions || [];
  const activeCount = Array.isArray(activeSessions) ? activeSessions.filter((s: any) => s.status === "active").length : 0;
  const breakCount = Array.isArray(activeSessions) ? activeSessions.filter((s: any) => s.status === "on_break").length : 0;

  const kpis = [
    { label: "Açık Arıza", value: openFaults.length, variant: (openFaults.length > 10 ? "alert" : openFaults.length > 5 ? "warn" : "ok") as any },
    { label: "SLA İhlali", value: breached.length, variant: (breached.length > 0 ? "alert" : "ok") as any },
    { label: "Kritik", value: critical.length, variant: (critical.length > 0 ? "alert" : "ok") as any },
    { label: "CRM Teknik", value: techTickets.length, variant: (techTickets.filter((t: any) => t.slaBreached).length > 0 ? "warn" : "info") as any },
    { label: "Dobody", value: dobodyActions.length, variant: "purple" as any },
  ];

  const rightPanel = (
    <>
      <MiniStats
        title="Şube Sağlık"
        rows={[...branchScores].sort((a, b) => (a.totalScore || 0) - (b.totalScore || 0)).slice(0, 5).map((b: any) => ({
          label: b.branchName?.split(' ')[0] || `#${b.branchId}`,
          value: Math.round(b.totalScore || 0),
          color: (b.totalScore || 0) >= 80 ? "#4ade80" : (b.totalScore || 0) >= 60 ? "#fbbf24" : "#f87171",
        }))}
        linkText="Tüm şubeler"
        onLink={() => navigate("/sube-uyum-merkezi")}
      />
      <DobodySlot
        actions={dobodyActions.slice(0, 4).map((a: any) => ({
          id: a.id, title: a.title, sub: a.metadata?.branchName || a.description?.substring(0, 50),
          onApprove: () => approveMutation.mutate(a.id),
          approving: approveMutation.isPending,
        }))}
        compact
      />
    </>
  );

  return (
    <CentrumShell
      title="Teknik & Operasyonel Komuta"
      subtitle="Canlı arıza · SLA · Uyum · Personel"
      roleLabel="CGO"
      roleColor="#f87171"
      roleBg="rgba(239,68,68,0.12)"
      kpis={kpis}
      actions={
        <>
          <button onClick={() => refetch()} className="p-1.5 rounded-lg border hover:bg-muted/40 text-muted-foreground"><RefreshCw size={13} /></button>
          <button className="text-[11px] px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium">+ Arıza Aç</button>
        </>
      }
      rightPanel={rightPanel}
    >
      <Tabs defaultValue="faults">
        <TabsList className="h-8">
          <TabsTrigger value="faults" className="text-[11px]">Arızalar {openFaults.length > 0 && <span className="ml-1 text-[9px] bg-red-500/15 text-red-400 px-1 rounded-full">{openFaults.length}</span>}</TabsTrigger>
          <TabsTrigger value="tickets" className="text-[11px]">CRM Teknik {techTickets.length > 0 && <span className="ml-1 text-[9px] bg-amber-500/15 text-amber-400 px-1 rounded-full">{techTickets.length}</span>}</TabsTrigger>
          <TabsTrigger value="overview" className="text-[11px]">Genel Bakış</TabsTrigger>
        </TabsList>

        <TabsContent value="faults" className="mt-3 space-y-3">
          <div className="flex gap-2 items-center">
            <Select value={filterBranch} onValueChange={setFilterBranch}>
              <SelectTrigger className="h-7 text-[11px] w-36"><SelectValue placeholder="Tüm şubeler" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm şubeler</SelectItem>
                {allBranches.slice(0, 15).map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-[10px] text-muted-foreground">{filtered.length} arıza</span>
          </div>
          {faultsLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Yükleniyor...</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border p-8 text-center"><CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" /><p className="text-sm text-muted-foreground">Açık arıza yok</p></div>
          ) : (
            <Widget title="Canlı Arıza Listesi" badge={<span className="text-[9px] bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded-full">{filtered.length} açık</span>} noPadding>
              {filtered.slice(0, 15).map((f: any) => {
                const sla = slaInfo(f.createdAt, f.priority);
                const priKey = f.priority?.toLowerCase() || "orta";
                const priColor = PRI_COLOR[priKey] || "#93c5fd";
                return (
                  <ListItem
                    key={f.id}
                    priority={priKey.charAt(0).toUpperCase() + priKey.slice(1, 4)}
                    priorityColor={priColor}
                    title={f.title}
                    meta={`${f.branchName || `#${f.branchId}`} · ${f.equipmentName || "Ekipman"} · ${hoursAgo(f.createdAt)}`}
                    slaPct={sla.pct}
                    slaLabel={sla.label}
                    slaColor={sla.color}
                    onClick={() => navigate(`/arizalar/${f.id}`)}
                    action={
                      <button
                        onClick={e => { e.stopPropagation(); createTaskMutation.mutate({ description: `Arıza atama: ${f.title}`, branchId: f.branchId, sourceType: "hq_manual", status: "beklemede", priority: "yüksek" }); }}
                        className="text-[10px] px-2 py-1 rounded-md bg-primary text-primary-foreground font-medium flex-shrink-0"
                      >Ata</button>
                    }
                  />
                );
              })}
            </Widget>
          )}
        </TabsContent>

        <TabsContent value="tickets" className="mt-3">
          {techTickets.length === 0 ? (
            <div className="rounded-xl border p-8 text-center"><CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" /><p className="text-sm text-muted-foreground">Açık teknik talep yok</p></div>
          ) : (
            <Widget title="CRM Teknik Talepler" noPadding>
              {techTickets.map((t: any) => (
                <ListItem
                  key={t.id}
                  title={t.title || t.subject || "Talep"}
                  meta={`${t.ticketNumber || ""} · ${t.branchName || "Şube"} · ${t.status === "acik" ? "Açık" : t.status === "islemde" ? "İşlemde" : t.status}`}
                  slaLabel={t.slaBreached ? "SLA!" : undefined}
                  slaColor={t.slaBreached ? "#f87171" : undefined}
                  slaPct={t.slaBreached ? 100 : undefined}
                />
              ))}
            </Widget>
          )}
        </TabsContent>

        <TabsContent value="overview" className="mt-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ProgressWidget
              title="Uyum Özeti"
              rows={[
                { label: "Vardiya", value: shiftPct },
                { label: "Checklist", value: checklistPct },
                { label: "Eğitim", value: trainingPct },
              ]}
              linkText="Uyum Merkezi"
              onLink={() => navigate("/sube-uyum-merkezi")}
            />
            <MiniStats
              title="CRM Franchise Talep"
              rows={[
                { label: "Açık talep", value: techTickets.length },
                { label: "SLA ihlali", value: techTickets.filter((t: any) => t.slaBreached).length, color: "#f87171" },
                { label: "İşlemde", value: techTickets.filter((t: any) => t.status === "islemde").length },
              ]}
              linkText="CRM"
              onLink={() => navigate("/crm")}
            />
            <MiniStats
              title="Canlı Personel"
              rows={[
                { label: "Aktif vardiya", value: `${activeCount || "—"} kişi`, color: "#4ade80" },
                { label: "Molada", value: `${breakCount || "—"} kişi`, color: "#fbbf24" },
                { label: "Toplam şube", value: branchScores.length },
              ]}
              linkText="Canlı Takip"
              onLink={() => navigate("/canli-takip")}
            />
          </div>
          <div className="mt-3">
            <Widget title="Şube Sağlık Sıralaması" noPadding>
              {[...branchScores].sort((a: any, b: any) => (a.totalScore || 0) - (b.totalScore || 0)).slice(0, 8).map((b: any) => {
                const score = Math.round(b.totalScore || 0);
                const color = score >= 80 ? "#4ade80" : score >= 60 ? "#fbbf24" : "#f87171";
                return (
                  <div key={b.branchId} className="flex items-center gap-3 px-3 py-2 border-b last:border-0 text-[11px]">
                    <span className="text-muted-foreground w-28 truncate">{b.branchName}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-border"><div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} /></div>
                    <span className="font-semibold w-8 text-right" style={{ color }}>{score}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${score >= 80 ? "bg-green-500/15 text-green-400" : score >= 60 ? "bg-amber-500/15 text-amber-400" : "bg-red-500/15 text-red-400"}`}>
                      {score >= 80 ? "Sağlıklı" : score >= 60 ? "Uyarı" : "Kritik"}
                    </span>
                  </div>
                );
              })}
            </Widget>
          </div>
        </TabsContent>
      </Tabs>
    </CentrumShell>
  );
}
