import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bot,
  Plus,
  Pencil,
  BarChart3,
  Trash2,
  Search,
  Bell,
  CheckCircle2,
  Clock,
  Users,
  TrendingUp,
  ListTodo,
} from "lucide-react";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

const ROLE_OPTIONS = [
  { value: "barista", label: "Barista" },
  { value: "bar_buddy", label: "Bar Buddy" },
  { value: "stajyer", label: "Stajyer" },
  { value: "supervisor", label: "Supervisor" },
  { value: "supervisor_buddy", label: "Supervisor Buddy" },
  { value: "mudur", label: "Şube Müdürü" },
  { value: "coach", label: "Koç" },
  { value: "trainer", label: "Eğitmen" },
  { value: "fabrika_operator", label: "Fabrika Operatör" },
  { value: "fabrika_sorumlu", label: "Fabrika Sorumlu" },
  { value: "fabrika_personel", label: "Fabrika Personel" },
  { value: "fabrika_mudur", label: "Fabrika Müdür" },
  { value: "kalite_kontrol", label: "Kalite Kontrol" },
  { value: "gida_muhendisi", label: "Gıda Mühendisi" },
  { value: "muhasebe_ik", label: "Muhasebe/İK" },
  { value: "muhasebe", label: "Muhasebe" },
  { value: "satinalma", label: "Satınalma" },
  { value: "marketing", label: "Pazarlama" },
  { value: "teknik", label: "Teknik" },
  { value: "destek", label: "Destek" },
];

const NAVIGATE_OPTIONS = [
  { value: "", label: "Yönlendirme yok" },
  { value: "/checklistler", label: "Checklist" },
  { value: "/akademi", label: "Eğitim Akademi" },
  { value: "/gorevler", label: "Görevler" },
  { value: "/raporlar", label: "Raporlar" },
  { value: "/fabrika/dashboard", label: "Fabrika" },
  { value: "/misafir-memnuniyeti", label: "Müşteri Memnuniyeti" },
  { value: "/stok-yonetimi", label: "Stok Yönetimi" },
  { value: "custom", label: "Özel URL..." },
];

const PRIORITY_OPTIONS = [
  { value: "high", label: "Yüksek", color: "text-red-500" },
  { value: "normal", label: "Normal", color: "text-yellow-500" },
  { value: "low", label: "Düşük", color: "text-green-500" },
];

interface FlowTask {
  id: number;
  title: string;
  description: string | null;
  navigateTo: string | null;
  estimatedMinutes: number | null;
  priority: string;
  targetRoles: string[] | null;
  targetBranches: number[] | null;
  targetUsers: string[] | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  creatorName?: string;
  completionCount?: number;
  targetCount?: number;
}

interface TaskStats {
  task: { id: number; title: string };
  totalTarget: number;
  totalCompleted: number;
  completionRate: number;
  completedUsers: { userId: string; firstName: string; lastName: string; role: string; branchName: string; completedAt: string }[];
  pendingUsers: { userId: string; firstName: string; lastName: string; role: string; branchName: string }[];
}

interface SummaryData {
  activeCount: number;
  weeklyCreated: number;
  avgCompletion: number;
  totalCompletions: number;
}

interface BranchOption {
  id: number;
  name: string;
}

const today = () => new Date().toISOString().split("T")[0];

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

function formatDateRange(start: string, end: string | null) {
  const s = formatDate(start);
  if (!end) return `${s}'den itibaren`;
  const e = formatDate(end);
  if (s === e) return s;
  return `${s} — ${e}`;
}

function roleLabel(role: string) {
  return ROLE_OPTIONS.find((r) => r.value === role)?.label || role;
}

export default function DobodyGorevYonetimi() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTask, setEditingTask] = useState<FlowTask | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [statsTaskId, setStatsTaskId] = useState<number | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);

  const { data: summary, isLoading: summaryLoading, isError, refetch } = useQuery<SummaryData>({
    queryKey: ["/api/admin/dobody-tasks/summary"],
  });

  const { data: tasksData, isLoading: tasksLoading } = useQuery<{ tasks: FlowTask[]; total: number }>({
    queryKey: ["/api/admin/dobody-tasks", statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/dobody-tasks?status=${statusFilter}&limit=100`);
      if (!res.ok) throw new Error("Görevler yüklenemedi");
      return res.json();
    },
  });

  const { data: branchList } = useQuery<BranchOption[]>({
    queryKey: ["/api/branches-list"],
    queryFn: async () => {
      const res = await fetch("/api/branches");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data.map((b: any) => ({ id: b.id, name: b.name })) : [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/dobody-tasks/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Görev silindi" });
      setDeleteTaskId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dobody-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dobody-tasks/summary"] });
    },
    onError: () => {
      toast({ title: "Hata", description: "Görev silinemedi", variant: "destructive" });
    },
  });

  const tasks = useMemo(() => {
    if (!tasksData?.tasks) return [];
    if (!searchQuery.trim()) return tasksData.tasks;
    const q = searchQuery.toLowerCase();
    return tasksData.tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }, [tasksData, searchQuery]);

  if (summaryLoading || tasksLoading) {
    
  if (summaryLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
      <div className="space-y-4" data-testid="dobody-tasks-loading">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="dobody-tasks-page">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard icon={ListTodo} label="Aktif Görevler" value={summary?.activeCount ?? 0} />
        <SummaryCard icon={Plus} label="Bu Hafta" value={summary?.weeklyCreated ?? 0} />
        <SummaryCard icon={TrendingUp} label="Ort. Tamamlama" value={`%${summary?.avgCompletion ?? 0}`} />
        <SummaryCard icon={CheckCircle2} label="Toplam Tamamlama" value={summary?.totalCompletions ?? 0} />
      </div>

      <Card data-testid="card-task-list">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Mr. Dobody Görevler
            </CardTitle>
            <Button size="sm" onClick={() => setShowCreateDialog(true)} data-testid="btn-create-task">
              <Plus className="h-4 w-4 mr-1" />
              Yeni Görev
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="select-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="expired">Süresi Dolmuş</SelectItem>
                <SelectItem value="all">Tümü</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Görev ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
                data-testid="input-search-tasks"
              />
            </div>
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-tasks">
              Henüz görev bulunmuyor
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onEdit={() => setEditingTask(task)}
                  onStats={() => setStatsTaskId(task.id)}
                  onDelete={() => setDeleteTaskId(task.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {(showCreateDialog || editingTask) && (
        <TaskFormDialog
          task={editingTask}
          branches={branchList || []}
          onClose={() => {
            setShowCreateDialog(false);
            setEditingTask(null);
          }}
        />
      )}

      {statsTaskId && (
        <StatsDialog
          taskId={statsTaskId}
          onClose={() => setStatsTaskId(null)}
        />
      )}

      <AlertDialog open={!!deleteTaskId} onOpenChange={(open) => { if (!open) setDeleteTaskId(null); }}>
        <AlertDialogContent data-testid="dialog-delete-task">
          <AlertDialogHeader>
            <AlertDialogTitle>Görevi Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu görevi silmek istediğinizden emin misiniz? Görev pasif hale getirilecek.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="btn-cancel-delete">Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTaskId && deleteMutation.mutate(deleteTaskId)}
              disabled={deleteMutation.isPending}
              data-testid="btn-confirm-delete"
            >
              {deleteMutation.isPending ? "Siliniyor..." : "Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        <div className="min-w-0">
          <div className="text-lg font-semibold truncate" data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>{value}</div>
          <div className="text-xs text-muted-foreground truncate">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function TaskRow({
  task,
  onEdit,
  onStats,
  onDelete,
}: {
  task: FlowTask;
  onEdit: () => void;
  onStats: () => void;
  onDelete: () => void;
}) {
  const targetLabel = task.targetRoles?.length
    ? task.targetRoles.map(roleLabel).join(", ")
    : task.targetUsers?.length
    ? `${task.targetUsers.length} kişi`
    : "Tümü";

  const completionRate =
    task.targetCount && task.targetCount > 0
      ? Math.round(((task.completionCount || 0) / task.targetCount) * 100)
      : 0;

  const priorityColor =
    task.priority === "high" ? "destructive" : task.priority === "low" ? "secondary" : "outline";

  return (
    <div
      className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/30"
      data-testid={`task-row-${task.id}`}
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{task.title}</span>
          <Badge variant={priorityColor as any} className="text-xs">
            {task.priority === "high" ? "Yüksek" : task.priority === "low" ? "Düşük" : "Normal"}
          </Badge>
          {!task.isActive && <Badge variant="secondary" className="text-xs">Pasif</Badge>}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {targetLabel}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDateRange(task.startDate, task.endDate)}
          </span>
          {task.targetCount != null && (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              %{completionRate} ({task.completionCount ?? 0}/{task.targetCount})
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button size="icon" variant="ghost" onClick={onEdit} data-testid={`btn-edit-${task.id}`}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onStats} data-testid={`btn-stats-${task.id}`}>
          <BarChart3 className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onDelete} data-testid={`btn-delete-${task.id}`}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function TaskFormDialog({
  task,
  branches,
  onClose,
}: {
  task: FlowTask | null;
  branches: BranchOption[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!task;

  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [navigateTo, setNavigateTo] = useState(task?.navigateTo || "");
  const [customUrl, setCustomUrl] = useState("");
  const [navSelect, setNavSelect] = useState(() => {
    if (!task?.navigateTo) return "";
    const found = NAVIGATE_OPTIONS.find((o) => o.value === task.navigateTo);
    return found ? found.value : "custom";
  });
  const [estimatedMinutes, setEstimatedMinutes] = useState(String(task?.estimatedMinutes ?? 5));
  const [priority, setPriority] = useState(task?.priority || "normal");
  const [selectedRoles, setSelectedRoles] = useState<string[]>(task?.targetRoles || []);
  const [allBranches, setAllBranches] = useState(!task?.targetBranches?.length);
  const [selectedBranches, setSelectedBranches] = useState<number[]>(task?.targetBranches || []);
  const [startDate, setStartDate] = useState(task?.startDate || today());
  const [endDate, setEndDate] = useState(task?.endDate || "");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const resolvedNav = navSelect === "custom" ? customUrl : navSelect === "none" || !navSelect ? null : navSelect;
      const body: any = {
        title: title.trim(),
        description: description.trim() || null,
        navigateTo: resolvedNav || null,
        estimatedMinutes: parseInt(estimatedMinutes) || 5,
        priority,
        targetRoles: selectedRoles.length > 0 ? selectedRoles : null,
        targetBranches: allBranches ? null : selectedBranches.length > 0 ? selectedBranches : null,
        targetUsers: null,
        startDate,
        endDate: endDate || null,
      };
      if (isEdit) {
        await apiRequest("PATCH", `/api/admin/dobody-tasks/${task!.id}`, body);
      } else {
        await apiRequest("POST", "/api/admin/dobody-tasks", body);
      }
    },
    onSuccess: () => {
      toast({ title: isEdit ? "Görev güncellendi" : "Görev oluşturuldu" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dobody-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dobody-tasks/summary"] });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err?.message || "İşlem başarısız", variant: "destructive" });
    },
  });

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const toggleAllRoles = () => {
    if (selectedRoles.length === ROLE_OPTIONS.length) {
      setSelectedRoles([]);
    } else {
      setSelectedRoles(ROLE_OPTIONS.map((r) => r.value));
    }
  };

  const toggleBranch = (branchId: number) => {
    setSelectedBranches((prev) =>
      prev.includes(branchId) ? prev.filter((b) => b !== branchId) : [...prev, branchId]
    );
  };

  const canSave = title.trim().length > 0 && startDate && (selectedRoles.length > 0 || allBranches || selectedBranches.length > 0);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-task-form">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            {isEdit ? "Görevi Düzenle" : "Yeni Mr. Dobody Görevi"}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? "Mevcut görevi güncelleyin" : "Hedef kitleye yeni bir görev atayın"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Başlık *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Yeni temizlik protokolünü okuyun"
              maxLength={255}
              data-testid="input-task-title"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Açıklama</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Görev detayları..."
              rows={3}
              data-testid="input-task-description"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Yönlendirme Sayfası</Label>
            <Select value={navSelect} onValueChange={(v) => { setNavSelect(v); if (v !== "custom") setNavigateTo(v); }}>
              <SelectTrigger data-testid="select-navigate-to">
                <SelectValue placeholder="Yönlendirme seçin" />
              </SelectTrigger>
              <SelectContent>
                {NAVIGATE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value || "none"} value={opt.value || "none"}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {navSelect === "custom" && (
              <Input
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="/sayfa/yol"
                data-testid="input-custom-url"
              />
            )}
          </div>

          <div className="flex gap-4">
            <div className="space-y-1.5 flex-1">
              <Label>Tahmini Süre (dk)</Label>
              <Input
                type="number"
                min={1}
                max={480}
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
                data-testid="input-estimated-minutes"
              />
            </div>
            <div className="space-y-1.5 flex-1">
              <Label>Öncelik</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger data-testid="select-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Hedef Roller</Label>
            <div className="flex items-center gap-2 mb-1">
              <Checkbox
                checked={selectedRoles.length === ROLE_OPTIONS.length}
                onCheckedChange={toggleAllRoles}
                data-testid="checkbox-all-roles"
              />
              <span className="text-sm">Tümü</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {ROLE_OPTIONS.map((r) => (
                <label key={r.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox
                    checked={selectedRoles.includes(r.value)}
                    onCheckedChange={() => toggleRole(r.value)}
                    data-testid={`checkbox-role-${r.value}`}
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Şubeler</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="radio"
                  checked={allBranches}
                  onChange={() => setAllBranches(true)}
                  name="branches"
                />
                Tüm Şubeler
              </label>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="radio"
                  checked={!allBranches}
                  onChange={() => setAllBranches(false)}
                  name="branches"
                />
                Seçili Şubeler
              </label>
            </div>
            {!allBranches && branches.length > 0 && (
              <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto border rounded-md p-2">
                {branches.map((b) => (
                  <label key={b.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <Checkbox
                      checked={selectedBranches.includes(b.id)}
                      onCheckedChange={() => toggleBranch(b.id)}
                      data-testid={`checkbox-branch-${b.id}`}
                    />
                    {b.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <div className="space-y-1.5 flex-1">
              <Label>Başlangıç *</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-start-date"
              />
            </div>
            <div className="space-y-1.5 flex-1">
              <Label>Bitiş</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                data-testid="input-end-date"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} data-testid="btn-cancel-form">
            İptal
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!canSave || saveMutation.isPending}
            data-testid="btn-save-task"
          >
            {saveMutation.isPending ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Kaydet ve Yayınla"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatsDialog({ taskId, onClose }: { taskId: number; onClose: () => void }) {
  const { toast } = useToast();

  const { data: stats, isLoading } = useQuery<TaskStats>({
    queryKey: ["/api/admin/dobody-tasks", taskId, "stats"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/dobody-tasks/${taskId}/stats`);
      if (!res.ok) throw new Error("İstatistikler yüklenemedi");
      return res.json();
    },
  });

  const remindMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/admin/dobody-tasks/${taskId}/remind`);
    },
    onSuccess: (_, __, ctx) => {
      toast({ title: "Hatırlatma gönderildi", description: `${stats?.pendingUsers?.length || 0} kişiye bildirim gönderildi` });
    },
    onError: () => {
      toast({ title: "Hata", description: "Hatırlatma gönderilemedi", variant: "destructive" });
    },
  });

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-task-stats">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Görev İstatistikleri
          </DialogTitle>
          {stats && (
            <DialogDescription>{stats.task?.title}</DialogDescription>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-32" />
          </div>
        ) : stats ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>%{stats.completionRate} tamamlandı</span>
                <span className="text-muted-foreground">
                  {stats.totalCompleted}/{stats.totalTarget}
                </span>
              </div>
              <Progress value={stats.completionRate} data-testid="progress-completion" />
            </div>

            {stats.completedUsers.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  Tamamlayanlar ({stats.completedUsers.length})
                </Label>
                <div className="max-h-40 overflow-y-auto space-y-1 border rounded-md p-2">
                  {stats.completedUsers.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-xs gap-2">
                      <span className="truncate">{[c.firstName, c.lastName].filter(Boolean).join(" ")}</span>
                      <span className="text-muted-foreground flex-shrink-0 flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{roleLabel(c.role)}</Badge>
                        {c.branchName && <span>{c.branchName}</span>}
                        <span>{new Date(c.completedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stats.pendingUsers.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-yellow-500" />
                  Bekleyenler ({stats.pendingUsers.length})
                </Label>
                <div className="max-h-40 overflow-y-auto space-y-1 border rounded-md p-2">
                  {stats.pendingUsers.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-xs gap-2">
                      <span className="truncate">{[p.firstName, p.lastName].filter(Boolean).join(" ")}</span>
                      <span className="text-muted-foreground flex-shrink-0 flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{roleLabel(p.role)}</Badge>
                        {p.branchName && <span>{p.branchName}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stats.pendingUsers.length > 0 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => remindMutation.mutate()}
                disabled={remindMutation.isPending}
                data-testid="btn-send-reminder"
              >
                <Bell className="h-4 w-4 mr-2" />
                {remindMutation.isPending ? "Gönderiliyor..." : "Bekleyenlere Hatırlatma Gönder"}
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">İstatistik bulunamadı</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
