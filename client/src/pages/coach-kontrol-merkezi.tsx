import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Clock, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, RefreshCw, ChevronRight, Calendar, BarChart2, Shield, Plus, Send } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function ScoreRing({ score, size = 44 }: { score: number; size?: number }) {
  const r = size * 0.38;
  const c = 2 * Math.PI * r;
  const filled = (score / 100) * c;
  const color = score >= 80 ? "#4ade80" : score >= 60 ? "#fbbf24" : "#f87171";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={size*0.09} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={size*0.09}
        strokeDasharray={`${filled} ${c-filled}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={size*0.22} fontWeight={700}>{score}</text>
    </svg>
  );
}

export default function CoachKontrolMerkezi() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [taskTitle, setTaskTitle] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<any>(null);

  const { data: healthData, isLoading, isError } = useQuery<any>({
    queryKey: ["/api/agent/branch-health"],
    refetchInterval: 10 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });

  const { data: complianceData } = useQuery<any>({
    queryKey: ["/api/agent/compliance-overview", "week"],
    queryFn: async () => {
      const res = await fetch("/api/agent/compliance-overview?period=week", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: pendingActions = [] } = useQuery<any[]>({
    queryKey: ["/api/agent/actions", "pending", selectedBranch?.branchId],
    queryFn: async () => {
      const url = selectedBranch
        ? `/api/agent/actions?status=pending&branchId=${selectedBranch.branchId}&limit=5`
        : "/api/agent/actions?status=pending&limit=8";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return [];
      const d = await res.json();
      return Array.isArray(d) ? d : (d.actions || []);
    },
    enabled: true,
    staleTime: 60000,
  });

  const { data: kpiSignals = [] } = useQuery<any[]>({
    queryKey: ["/api/academy/kpi-signals"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: complianceTable } = useQuery<any>({
    queryKey: ["/api/agent/compliance-overview", "week"],
    queryFn: async () => {
      const res = await fetch("/api/agent/compliance-overview?period=week", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // P0: Coach'dan şubeye görev atama
  const createTaskMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/tasks", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Görev atandı", description: "Şube personeli bilgilendirildi" });
      setTaskTitle("");
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/agent/actions/${id}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/agent/actions"] });
      toast({ title: "Aksiyon onaylandı" });
    },
  });

  const branches = healthData?.branches || [];
  // Öncelik sırası: en düşük skor + en uzun ziyaret bekleyen
  const prioritized = [...branches].sort((a: any, b: any) => a.overallScore - b.overallScore);

  const summary = complianceData?.summary;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* Compact topbar — CentrumShell uyumlu */}
      <div className="border-b flex-shrink-0">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-[13px] font-semibold">Kontrol Merkezi</h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/12 text-blue-400">Coach</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Şube takip · Uyum · KPI Sinyaller</p>
          </div>
          <button className="text-[11px] px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium">+ Ziyaret Planla</button>
        </div>
        {/* KPI Strip */}
        <div className="flex gap-2 px-4 pb-2 overflow-x-auto">
          <KpiChip label="Kritik Şube" value={branchHealth.filter((b: any) => (b.totalScore || 0) < 50).length} variant="alert" />
          <KpiChip label="Uyarı" value={branchHealth.filter((b: any) => { const s = b.totalScore || 0; return s >= 50 && s < 70; }).length} variant="warn" />
          <KpiChip label="Sağlıklı" value={branchHealth.filter((b: any) => (b.totalScore || 0) >= 70).length} variant="ok" />
          <KpiChip label="Bekl. Görev" value={userTasks.filter((t: any) => ["beklemede","devam_ediyor"].includes(t.status || "")).length} variant="info" />
          <KpiChip label="Dobody Öneri" value={pendingActions.length} variant="purple" />
        </div>
      </div>
      <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="px-4 border-b rounded-none h-9 bg-transparent justify-start gap-0 flex-shrink-0">
          <TabsTrigger value="overview" className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-8 px-3">
            Şube Takip
          </TabsTrigger>
          <TabsTrigger value="compliance" className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-8 px-3">
            Uyum Tablosu
          </TabsTrigger>
          <TabsTrigger value="signals" className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-8 px-3">
            KPI Sinyaller
            {kpiSignals.length > 0 && <span className="ml-1.5 text-[9px] bg-amber-500/20 text-amber-500 px-1.5 rounded-full">{kpiSignals.length}</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex-1 overflow-hidden m-0">
          <div className="flex h-full overflow-hidden">
      {/* Sol: Öncelikli Şube Listesi */}
      <div className="w-72 flex-shrink-0 border-r flex flex-col overflow-hidden">
        <div className="p-4 border-b">
          <p className="text-xs text-muted-foreground mt-0 mb-3">Ziyaret öncelikleri ve aksiyon planları</p>
          {summary && (
            <div className="grid grid-cols-3 gap-1.5 mt-3">
              {[
                { l: "Sağlıklı", v: summary.healthy, c: "#22c55e" },
                { l: "Uyarı",   v: summary.warning,  c: "#f59e0b" },
                { l: "Kritik",  v: summary.critical,  c: "#ef4444" },
              ].map(s => (
                <div key={s.l} className="rounded-lg p-2 text-center border" style={{ borderColor: `${s.c}30`, background: `${s.c}10` }}>
                  <div className="text-lg font-bold" style={{ color: s.c }}>{s.v}</div>
                  <div className="text-[10px] text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground text-center mt-8">Yükleniyor...</div>
          ) : prioritized.map((b: any) => {
            const isSelected = selectedBranch?.branchId === b.branchId;
            const color = b.overallScore >= 80 ? "#4ade80" : b.overallScore >= 60 ? "#fbbf24" : "#f87171";
            const urgency = b.overallScore < 60 ? "Acil Ziyaret" : b.overallScore < 75 ? "Yakında Ziyaret" : null;
            return (
              <button key={b.branchId} onClick={() => setSelectedBranch(b)}
                className="w-full text-left px-4 py-3 border-b hover:bg-muted/30 transition-colors"
                style={{ borderLeft: isSelected ? "3px solid #c0392b" : "3px solid transparent", background: isSelected ? "rgba(192,57,43,0.05)" : undefined }}>
                <div className="flex items-center gap-2.5">
                  <ScoreRing score={b.overallScore} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{b.branchName}</p>
                    {urgency && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{ background: b.overallScore < 60 ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)", color }}>
                        {urgency}
                      </span>
                    )}
                  </div>
                  <ChevronRight size={13} className="text-muted-foreground flex-shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sağ: Detay + Aksiyon Planı */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {!selectedBranch ? (
          /* Genel özet */
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Franchise Genel Durumu</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Bekleyen Aksiyonlar */}
              <div className="rounded-xl border p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <span>🤖</span> Bekleyen Dobody Aksiyonları
                  {pendingActions.length > 0 && (
                    <span className="ml-auto text-xs bg-amber-500/15 text-amber-500 px-2 py-0.5 rounded-full">{pendingActions.length}</span>
                  )}
                </h3>
                <div className="space-y-2">
                  {pendingActions.slice(0, 5).map((a: any) => (
                    <div key={a.id} className="flex items-start gap-2 p-2 rounded-lg border text-xs">
                      <div className="flex-1">
                        <p className="font-medium">{a.title}</p>
                        <p className="text-muted-foreground mt-0.5 line-clamp-1">{a.description}</p>
                      </div>
                      <button
                        onClick={() => approveMutation.mutate(a.id)}
                        disabled={approveMutation.isPending}
                        className="flex-shrink-0 px-2 py-1 rounded bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors">
                        Onayla
                      </button>
                    </div>
                  ))}
                  {pendingActions.length === 0 && (
                    <p className="text-xs text-muted-foreground">Bekleyen aksiyon yok</p>
                  )}
                </div>
              </div>

              {/* En kritik şubeler */}
              <div className="rounded-xl border p-4">
                <h3 className="text-sm font-semibold mb-3">Acil Müdahale Gereken Şubeler</h3>
                <div className="space-y-2">
                  {prioritized.filter((b: any) => b.overallScore < 70).slice(0, 5).map((b: any) => (
                    <button key={b.branchId} onClick={() => setSelectedBranch(b)}
                      className="w-full text-left flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/30 transition-colors">
                      <ScoreRing score={b.overallScore} size={32} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{b.branchName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {b.dimensions?.filter((d: any) => d.score < 60).map((d: any) => d.nameTr).join(", ") || "Genel sorun"}
                        </p>
                      </div>
                      <ChevronRight size={12} className="text-muted-foreground" />
                    </button>
                  ))}
                  {prioritized.filter((b: any) => b.overallScore < 70).length === 0 && (
                    <div className="flex items-center gap-2 text-xs text-green-400">
                      <CheckCircle2 size={14} />
                      Tüm şubeler 70+ skor
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Şube Detayı */
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center gap-4">
              <ScoreRing score={selectedBranch.overallScore} size={56} />
              <div>
                <h2 className="text-lg font-bold">{selectedBranch.branchName}</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedBranch.overallScore < 60 ? "🔴 Acil müdahale gerekiyor" :
                   selectedBranch.overallScore < 75 ? "🟡 Yakın dönemde ziyaret planla" : "🟢 Sağlıklı"}
                </p>
              </div>
              <button onClick={() => navigate("/sube-uyum-merkezi")}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                Tam analiz <ChevronRight size={12} />
              </button>
            </div>

            {/* 6 Boyut */}
            {selectedBranch.dimensions && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {selectedBranch.dimensions.map((d: any) => {
                  const color = d.score >= 80 ? "#4ade80" : d.score >= 60 ? "#fbbf24" : "#f87171";
                  return (
                    <div key={d.name} className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground mb-1">{d.nameTr || d.name}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted">
                          <div className="h-full rounded-full" style={{ width: `${d.score}%`, background: color }} />
                        </div>
                        <span className="text-xs font-bold" style={{ color }}>{d.score}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* P0: Hızlı Görev Ata */}
            {selectedBranch && (
              <div className="rounded-xl border p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Plus size={13} className="text-primary" />
                  Hızlı Görev Ata — {selectedBranch.branchName}
                </h3>
                <div className="flex gap-2">
                  <input
                    value={taskTitle}
                    onChange={e => setTaskTitle(e.target.value)}
                    placeholder="Görev başlığı yaz, Enter ile gönder..."
                    className="flex-1 text-xs border rounded-lg px-3 py-2 bg-background outline-none"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && taskTitle.trim()) {
                        createTaskMutation.mutate({ description: taskTitle, branchId: selectedBranch.branchId, sourceType: 'hq_manual', status: 'beklemede', priority: 'orta' });
                      }
                    }}
                  />
                  <button
                    onClick={() => createTaskMutation.mutate({ description: taskTitle, branchId: selectedBranch.branchId, sourceType: 'hq_manual', status: 'beklemede', priority: 'orta' })}
                    disabled={!taskTitle.trim() || createTaskMutation.isPending}
                    className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50 flex items-center gap-1"
                  >
                    <Send size={11} /> Ata
                  </button>
                </div>
              </div>
            )}

            {/* Bekleyen Dobody Aksiyonları - Şube Bazlı */}
            {pendingActions.length > 0 && (
              <div className="rounded-xl border p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <span>🤖</span> Bu Şube İçin Bekleyen Aksiyonlar
                  <span className="ml-auto text-xs bg-amber-500/15 text-amber-500 px-2 py-0.5 rounded-full">{pendingActions.length}</span>
                </h3>
                <div className="space-y-2">
                  {pendingActions.map((a: any) => (
                    <div key={a.id} className="flex items-start gap-2 p-2.5 rounded-lg border text-xs"
                      style={{ borderColor: a.severity === "critical" ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.2)" }}>
                      <div className="flex-1">
                        <p className="font-medium">{a.title}</p>
                        <p className="text-muted-foreground mt-0.5">{a.description}</p>
                      </div>
                      <button onClick={() => approveMutation.mutate(a.id)}
                        disabled={approveMutation.isPending}
                        className="flex-shrink-0 px-2 py-1 rounded bg-green-500/15 text-green-400 hover:bg-green-500/25 font-medium">
                        Onayla
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => setSelectedBranch(null)}
              className="text-xs text-muted-foreground hover:text-foreground">
              ← Tüm şubelere dön
            </button>
          </div>
        )}
      </div>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="flex-1 overflow-auto p-4 m-0">
          {complianceTable?.branches ? (
            <div className="max-w-3xl space-y-4">
              <div className="rounded-xl border overflow-hidden">
                <div className="grid grid-cols-[180px_1fr_1fr_1fr_1fr_70px] gap-0 border-b bg-muted/20 px-4 py-2.5">
                  <div className="text-xs font-medium text-muted-foreground">Şube</div>
                  {["Vardiya", "Checklist", "Arıza", "Eğitim"].map(l => (
                    <div key={l} className="text-xs font-medium text-muted-foreground">{l}</div>
                  ))}
                  <div className="text-xs font-medium text-muted-foreground text-right">Genel</div>
                </div>
                {complianceTable.branches.map((b: any) => {
                  const overall = b.scores?.overall || 0;
                  const oc = overall >= 80 ? "#4ade80" : overall >= 60 ? "#fbbf24" : "#f87171";
                  return (
                    <div key={b.branchId} className="grid grid-cols-[180px_1fr_1fr_1fr_1fr_70px] gap-0 border-b last:border-0 px-4 py-2.5 hover:bg-muted/20">
                      <span className="text-xs font-medium truncate">{b.branchName}</span>
                      {(["shift","checklist","fault","training"] as const).map(dim => {
                        const s = b.scores?.[dim] || 0;
                        const c = s >= 80 ? "#4ade80" : s >= 60 ? "#fbbf24" : "#f87171";
                        return (
                          <div key={dim} className="flex items-center gap-1.5">
                            <div className="flex-1 h-1.5 rounded-full bg-muted max-w-[60px]">
                              <div className="h-full rounded-full" style={{ width: `${s}%`, background: c }} />
                            </div>
                            <span className="text-[10px] font-medium" style={{ color: c }}>{s}</span>
                          </div>
                        );
                      })}
                      <span className="text-xs font-bold text-right" style={{ color: oc }}>{overall}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">Uyum verisi yükleniyor...</div>
          )}
        </TabsContent>

        <TabsContent value="signals" className="flex-1 overflow-auto p-4 m-0">
          <div className="max-w-2xl space-y-3">
            {kpiSignals.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-green-400 p-4">
                <CheckCircle2 size={16} /> KPI sinyali yok — sistem normal çalışıyor
              </div>
            ) : kpiSignals.map((s: any, i: number) => (
              <div key={i} className="rounded-xl border p-3">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart2 size={13} className="text-amber-400" />
                  <span className="text-sm font-medium">{s.title || s.signalCode}</span>
                  {s.severity && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500">{s.severity}</span>}
                </div>
                <p className="text-xs text-muted-foreground">{s.description || s.message}</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}