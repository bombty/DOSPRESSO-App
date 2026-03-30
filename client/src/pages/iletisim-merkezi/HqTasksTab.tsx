import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PRIORITIES } from "./categoryConfig";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface HqTask {
  id: number;
  task_number: string;
  title: string;
  description: string | null;
  assigned_by_user_id: string;
  assigned_to_user_id: string;
  assigned_by_name: string;
  assigned_to_name: string;
  priority: string;
  status: string;
  due_date: string | null;
  progress_percent: number;
  created_at: string;
}

interface HqUser {
  id: string;
  name: string;
  role: string;
}

export default function HqTasksTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newPriority, setNewPriority] = useState("normal");
  const [newDueDate, setNewDueDate] = useState("");

  const backendFilters = ["all", "assigned_to_me", "i_assigned", "overdue"];
  const backendFilter = backendFilters.includes(filter) ? filter : "all";

  const { data: rawTasks = [], isLoading } = useQuery<HqTask[]>({
    queryKey: ["/api/iletisim/hq-tasks", backendFilter],
    queryFn: async () => {
      const res = await fetch(`/api/iletisim/hq-tasks?filter=${backendFilter}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const safeTasks = Array.isArray(rawTasks) ? rawTasks : [];
  const tasks = !backendFilters.includes(filter)
    ? safeTasks.filter(t => t.status === filter)
    : safeTasks;

  const { data: hqUsers = [] } = useQuery<HqUser[]>({
    queryKey: ["/api/users/hq"],
    queryFn: async () => {
      const res = await fetch("/api/users?hqOnly=true", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/iletisim/hq-tasks", {
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      assignedToUserId: newAssignee,
      priority: newPriority,
      dueDate: newDueDate || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/iletisim/hq-tasks"] });
      qc.invalidateQueries({ queryKey: ["/api/iletisim/dashboard"] });
      setShowNew(false);
      setNewTitle("");
      setNewDesc("");
      setNewAssignee("");
      setNewPriority("normal");
      setNewDueDate("");
    },
  });

  const progressMutation = useMutation({
    mutationFn: async ({ id, progress }: { id: number; progress: number }) =>
      apiRequest("PATCH", `/api/iletisim/hq-tasks/${id}`, {
        progressPercent: progress,
        ...(progress === 100 ? { status: "tamamlandi" } : { status: "devam_ediyor" }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/iletisim/hq-tasks"] }),
  });

  const statusLabels: Record<string, string> = {
    beklemede: "Beklemede",
    devam_ediyor: "Devam Ediyor",
    tamamlandi: "Tamamlandı",
    iptal: "İptal",
  };

  const statusColors: Record<string, string> = {
    beklemede: "text-muted-foreground",
    devam_ediyor: "text-blue-500",
    tamamlandi: "text-green-500",
    iptal: "text-red-500",
  };

  return (
    <div className="space-y-4" data-testid="hq-tasks-tab">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "all", label: "Tümü" },
            { key: "beklemede", label: "Beklemede" },
            { key: "devam_ediyor", label: "Devam Ediyor" },
            { key: "tamamlandi", label: "Tamamlandı" },
            { key: "assigned_to_me", label: "Bana Atanan" },
            { key: "overdue", label: "Gecikmiş" },
          ].map(f => (
            <Button
              key={f.key}
              size="sm"
              variant={filter === f.key ? "default" : "outline"}
              onClick={() => setFilter(f.key)}
              className="toggle-elevate"
              data-testid={`hq-filter-${f.key}`}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowNew(true)} data-testid="button-new-hq-task">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Yeni Görev
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Yükleniyor...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Görev bulunamadı</div>
      ) : (
        <div className="grid gap-3">
          {(Array.isArray(tasks) ? tasks : []).map((task) => {
            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "tamamlandi";
            return (
              <Card key={task.id} className={cn("transition-all", isOverdue && "border-red-200 dark:border-red-900")} data-testid={`hq-task-${task.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-medium" data-testid={`text-task-number-${task.id}`}>{task.task_number}</span>
                        <Badge variant="outline" className="text-xs">
                          {PRIORITIES.find(p => p.key === task.priority)?.label}
                        </Badge>
                        <span className={cn("text-xs", statusColors[task.status])}>
                          {statusLabels[task.status] ?? task.status}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {task.assigned_by_name} → {task.assigned_to_name}
                        {task.due_date && (
                          <span className={cn("ml-2", isOverdue ? "text-red-500" : "")}>
                            · Son: {formatDistanceToNow(new Date(task.due_date), { addSuffix: true, locale: tr })}
                          </span>
                        )}
                      </p>
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>İlerleme</span>
                          <span>%{task.progress_percent}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${task.progress_percent}%` }}
                          />
                        </div>
                        {(task.assigned_to_user_id === user?.id || task.assigned_by_user_id === user?.id) && task.status !== "tamamlandi" && (
                          <div className="flex gap-1 mt-2">
                            {[25, 50, 75, 100].map(pct => (
                              <Button
                                key={pct}
                                size="sm"
                                variant={task.progress_percent === pct ? "default" : "outline"}
                                onClick={() => progressMutation.mutate({ id: task.id, progress: pct })}
                                className="flex-1 text-xs toggle-elevate"
                                data-testid={`progress-btn-${task.id}-${pct}`}
                              >
                                %{pct}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-md" data-testid="new-hq-task-dialog">
          <DialogHeader>
            <DialogTitle>Yeni HQ Görevi</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Görev başlığı"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="text-sm"
              data-testid="input-task-title"
            />
            <Textarea
              placeholder="Açıklama (opsiyonel)"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              rows={3}
              className="text-sm resize-none"
              data-testid="input-task-desc"
            />
            <Select value={newAssignee} onValueChange={setNewAssignee}>
              <SelectTrigger className="text-sm" data-testid="select-assignee">
                <SelectValue placeholder="Kişi Seç" />
              </SelectTrigger>
              <SelectContent>
                {hqUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              {PRIORITIES.map(p => (
                <Button
                  key={p.key}
                  size="sm"
                  variant={newPriority === p.key ? "default" : "outline"}
                  onClick={() => setNewPriority(p.key)}
                  className="flex-1 toggle-elevate"
                  data-testid={`new-task-priority-${p.key}`}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <Input
              type="datetime-local"
              value={newDueDate}
              onChange={e => setNewDueDate(e.target.value)}
              className="text-sm"
              data-testid="input-task-due-date"
            />
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!newTitle.trim() || !newAssignee || createMutation.isPending}
              className="w-full"
              data-testid="submit-new-task-btn"
            >
              {createMutation.isPending ? "Oluşturuluyor..." : "Görevi Oluştur"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
