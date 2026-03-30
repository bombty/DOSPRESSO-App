import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, AlertTriangle, CheckCircle2, RefreshCw, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function TrainerEgitimMerkezi() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [period, setPeriod] = useState("week");

  const { data: compliance, isLoading, isError } = useQuery<any>({
    queryKey: ["/api/agent/compliance-overview", period],
    queryFn: async () => {
      const res = await fetch(`/api/agent/compliance-overview?period=${period}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Gecikmiş eğitimler: agent actions üzerinden (training skill tarafından üretilir)
  const { data: overdueInsights = [] } = useQuery<any[]>({
    queryKey: ["/api/agent/insights", "training_overdue"],
    queryFn: async () => {
      const res = await fetch("/api/agent/actions?status=pending&limit=30", { credentials: "include" });
      if (!res.ok) return [];
      const d = await res.json();
      const all = Array.isArray(d) ? d : (d.actions || []);
      // Training overdue aksiyonlarını filtrele ve veri çıkar
      const trainingActions = all.filter((a: any) => {
        const meta = a.metadata || {};
        return ["training_overdue","critical_training_overdue","no_training_assigned"].includes(meta.type || "");
      });
      // Flatten assignments from metadata
      const assignments: any[] = [];
      trainingActions.forEach((a: any) => {
        const meta = a.metadata || {};
        if (meta.assignments) assignments.push(...meta.assignments.slice(0,5));
        else assignments.push({ userId: meta.userId, userName: meta.userName || a.title, materialTitle: a.description, dueDate: null, branchName: meta.branchName });
      });
      return assignments;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: pendingActions = [] } = useQuery<any[]>({
    queryKey: ["/api/agent/actions", "training"],
    queryFn: async () => {
      const res = await fetch("/api/agent/actions?status=pending&limit=10", { credentials: "include" });
      if (!res.ok) return [];
      const d = await res.json();
      const all = Array.isArray(d) ? d : (d.actions || []);
      return all.filter((a: any) => {
        const meta = a.metadata || {};
        return ["training_overdue", "critical_training_overdue", "no_training_assigned"].includes(meta.type || a.actionType);
      });
    },
    staleTime: 60000,
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/agent/actions/${id}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/agent/actions"] });
      toast({ title: "Eğitim aksiyonu onaylandı" });
    },
  });

  const branches = compliance?.branches || [];
  const summary = compliance?.summary;

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Eğitim Merkezi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Tüm şubelerde eğitim uyumu ve atama yönetimi</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Bu Hafta</SelectItem>
              <SelectItem value="month">Bu Ay</SelectItem>
            </SelectContent>
          </Select>
          <a href="/akademi" className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
            + Eğitim Ata
          </a>
        </div>
      </div>

      {/* KPI */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { l: "Toplam Şube", v: summary.total, c: "var(--color-text-primary)" },
            { l: "Sağlıklı Eğitim", v: summary.healthy, c: "#4ade80" },
            { l: "Uyarı", v: summary.warning, c: "#fbbf24" },
            { l: "Kritik", v: summary.critical, c: "#f87171" },
          ].map((k, i) => (
            <div key={i} className="rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">{k.l}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: k.c }}>{k.v}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Eğitim Uyum Heat Map */}
        <div className="rounded-xl border p-4">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <GraduationCap size={14} className="text-purple-400" />
            Şube Eğitim Uyum Skoru
          </h2>
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Yükleniyor...</p>
          ) : (
            <div className="space-y-1.5">
              {branches.map((b: any) => {
                const trainingScore = b.scores?.training || 0;
                const color = trainingScore >= 80 ? "#4ade80" : trainingScore >= 60 ? "#fbbf24" : "#f87171";
                return (
                  <div key={b.branchId} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-28 truncate">{b.branchName}</span>
                    <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${trainingScore}%`, background: color, opacity: 0.8 }} />
                    </div>
                    <span className="text-xs font-medium w-6 text-right" style={{ color }}>{trainingScore}</span>
                    {trainingScore < 60 && <AlertTriangle size={11} className="text-red-400 flex-shrink-0" />}
                  </div>
                );
              })}
              {branches.length === 0 && <p className="text-xs text-muted-foreground">Veri yok</p>}
            </div>
          )}
        </div>

        {/* Dobody Eğitim Aksiyonları */}
        <div className="rounded-xl border p-4">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <span>🤖</span> Dobody Eğitim Önerileri
            {pendingActions.length > 0 && (
              <Badge className="ml-auto text-xs" style={{ background: "rgba(139,92,246,0.2)", color: "#c4b5fd" }}>
                {pendingActions.length}
              </Badge>
            )}
          </h2>
          <div className="space-y-2">
            {pendingActions.slice(0, 5).map((a: any) => (
              <div key={a.id} className="flex items-start gap-2 p-2.5 rounded-lg border text-xs"
                style={{ borderColor: "rgba(139,92,246,0.2)", background: "rgba(139,92,246,0.05)" }}>
                <div className="flex-1">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2">{a.description}</p>
                </div>
                <button onClick={() => approveMutation.mutate(a.id)}
                  disabled={approveMutation.isPending}
                  className="flex-shrink-0 px-2 py-1 rounded bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 font-medium">
                  Onayla
                </button>
              </div>
            ))}
            {pendingActions.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-green-400 py-2">
                <CheckCircle2 size={13} /> Bekleyen eğitim aksiyonu yok
              </div>
            )}
          </div>
        </div>

        {/* Gecikmiş Eğitimler */}
        <div className="rounded-xl border p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Clock size={13} className="text-amber-400" />
            Gecikmiş Eğitimler
            {overdueInsights.length > 0 && (
              <span className="text-xs bg-amber-500/15 text-amber-500 px-2 py-0.5 rounded-full ml-1">{overdueInsights.length}</span>
            )}
          </h2>
          {overdueInsights.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-green-400">
              <CheckCircle2 size={13} /> Gecikmiş eğitim yok
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {overdueInsights.slice(0, 8).map((a: any) => (
                <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg border text-xs">
                  <div className="w-6 h-6 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={11} className="text-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{a.userName || a.userId}</p>
                    <p className="text-muted-foreground truncate">{a.materialTitle || a.materialId}</p>
                  </div>
                  {a.dueDate && (
                    <span className="ml-auto text-red-400 flex-shrink-0">
                      {Math.floor((Date.now() - new Date(a.dueDate).getTime()) / 864e5)}g geç
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
