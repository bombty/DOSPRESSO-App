import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Filter, CheckCircle2, Clock, AlertTriangle, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";

const SOURCE_META: Record<string, { label: string; color: string; bg: string }> = {
  hq_manual:      { label: "HQ", color: "#93c5fd", bg: "rgba(59,130,246,0.1)" },
  dobody:          { label: "Dobody", color: "#a5a0f0", bg: "rgba(127,119,221,0.1)" },
  periodic:        { label: "Periyodik", color: "#fbbf24", bg: "rgba(245,158,11,0.1)" },
  shift_bound:     { label: "Vardiya", color: "#9ca3af", bg: "rgba(107,114,128,0.1)" },
  branch_internal: { label: "Şube-İçi", color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending:    { label: "Bekleyen",   color: "#fbbf24" },
  in_progress:{ label: "Devam",      color: "#93c5fd" },
  completed:  { label: "Tamamlandı", color: "#22c55e" },
  overdue:    { label: "Gecikmiş",   color: "#f87171" },
  beklemede:  { label: "Bekleyen",   color: "#fbbf24" },
  devam:      { label: "Devam",      color: "#93c5fd" },
  tamamlandi: { label: "Tamamlandı", color: "#22c55e" },
  gecikti:    { label: "Gecikmiş",   color: "#f87171" },
};

function getStatusFromDueDate(task: any): string {
  if (task.status && STATUS_META[task.status]) return task.status;
  if (!task.dueDate) return "pending";
  const due = new Date(task.dueDate);
  const now = new Date();
  if (task.completedAt) return "completed";
  if (due < now) return "overdue";
  return "pending";
}

export default function TaskTakip() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [filterSource, setFilterSource] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterBranch, setFilterBranch] = useState("all");

  const { data: tasks = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/tasks", filterSource, filterStatus, filterBranch],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "100" });
      if (filterSource !== "all") params.set("sourceType", filterSource);
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterBranch !== "all") params.set("branchId", filterBranch);
      const res = await fetch(`/api/tasks?${params}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60000,
  });

  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ["/api/branches"],
    staleTime: 5 * 60 * 1000,
  });

  const taskList = Array.isArray(tasks) ? tasks : [];

  const stats = {
    overdue:    taskList.filter(t => getStatusFromDueDate(t) === "overdue").length,
    pending:    taskList.filter(t => ["pending","beklemede"].includes(t.status || "pending")).length,
    in_progress:taskList.filter(t => ["in_progress","devam"].includes(t.status || "")).length,
    completed:  taskList.filter(t => ["completed","tamamlandi"].includes(t.status || "")).length,
  };

  // Group by sourceType
  const bySource: Record<string, any[]> = {};
  taskList.forEach(t => {
    const s = t.sourceType || "hq_manual";
    if (!bySource[s]) bySource[s] = [];
    bySource[s].push(t);
  });

  const canCreateTask = ["ceo","cgo","coach","trainer","admin","mudur","supervisor"].includes(user?.role || "");

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Görev Takip</h1>
          <p className="text-sm text-muted-foreground mt-0.5">HQ'dan atanan tüm görevler — kaynak etiketiyle</p>
        </div>
        {canCreateTask && (
          <button onClick={() => navigate("/task-atama")}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
            <Plus size={14} /> Görev Oluştur
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Gecikmiş", val: stats.overdue, color: "#f87171" },
          { label: "Bekleyen", val: stats.pending, color: "#fbbf24" },
          { label: "Devam", val: stats.in_progress, color: "#93c5fd" },
          { label: "Tamamlanan", val: stats.completed, color: "#22c55e" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border p-3" style={{ borderTop: `2px solid ${s.color}` }}>
            <div className="text-xl font-bold" style={{ color: s.color }}>{s.val}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtreler */}
      <div className="flex gap-2 flex-wrap items-center">
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="Kaynak" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm kaynaklar</SelectItem>
            {Object.entries(SOURCE_META).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="Durum" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm durumlar</SelectItem>
            <SelectItem value="overdue">Gecikmiş</SelectItem>
            <SelectItem value="pending">Bekleyen</SelectItem>
            <SelectItem value="in_progress">Devam</SelectItem>
            <SelectItem value="completed">Tamamlanan</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterBranch} onValueChange={setFilterBranch}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Şube" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm şubeler</SelectItem>
            {(branches as any[]).map((b: any) => (
              <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{taskList.length} görev</span>
      </div>

      {/* Görev Listesi — Kaynak bazlı gruplu */}
      {isLoading ? (
        <div className="text-sm text-center py-8 text-muted-foreground">Yükleniyor...</div>
      ) : taskList.length === 0 ? (
        <div className="rounded-xl border p-8 text-center">
          <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Görev bulunamadı</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <div className="grid grid-cols-[1fr_80px_100px_90px_90px] gap-2 px-4 py-2.5 text-xs text-muted-foreground border-b bg-muted/20 font-medium">
            <span>Görev</span><span>Kaynak</span><span>Hedef</span><span>Son Tarih</span><span>Durum</span>
          </div>
          {taskList.slice(0, 50).map((task: any) => {
            const src = SOURCE_META[task.sourceType || "hq_manual"] || SOURCE_META.hq_manual;
            const statusKey = getStatusFromDueDate(task);
            const status = STATUS_META[statusKey] || { label: statusKey, color: "#9ca3af" };
            const isOverdue = statusKey === "overdue";

            return (
              <div key={task.id}
                className="grid grid-cols-[1fr_80px_100px_90px_90px] gap-2 px-4 py-3 border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer text-xs items-center"
                onClick={() => navigate(`/gorev-detay/${task.id}`)}>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{task.description || task.title || "—"}</div>
                  <div className="text-muted-foreground truncate mt-0.5">
                    {task.branchName || `Şube #${task.branchId}`}
                    {task.assignedToName && ` · ${task.assignedToName}`}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-center font-medium"
                  style={{ background: src.bg, color: src.color }}>
                  {src.label}
                </span>
                <span className="text-muted-foreground truncate">
                  {task.targetRole || "Atanan kişi"}
                </span>
                <span style={{ color: isOverdue ? "#f87171" : undefined }}>
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : "—"}
                </span>
                <span className="font-medium" style={{ color: status.color }}>{status.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
