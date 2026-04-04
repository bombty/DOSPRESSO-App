import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useBreadcrumb } from "@/components/breadcrumb-navigation";
import { DndContext, DragEndEvent, DragOverlay, closestCenter, useSensor, useSensors, PointerSensor, TouchSensor } from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ListSkeleton } from "@/components/list-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ConfirmDeleteDialog, useConfirmDelete } from "@/components/confirm-delete-dialog";
import {
  ArrowLeft, Plus, Calendar, Users, CheckCircle2, Clock, AlertCircle,
  Send, UserPlus, X, ListTodo, Flag, LayoutDashboard,
  MessageSquare, FolderOpen, GanttChart, Trash2,
  AlertTriangle, TrendingUp, CircleDot, UserCheck, Eye, Edit2, UserCog
} from "lucide-react";
import { format, differenceInDays, isPast, addDays } from "date-fns";
import { tr } from "date-fns/locale";
import { ErrorState } from "../components/error-state";

// ─── Config Maps ────────────────────────────────────────────
const statusConfig: Record<string, { label: string; color: string; bgColor: string; dotColor: string }> = {
  todo: { label: "Yapılacak", color: "text-slate-600", bgColor: "bg-slate-100 dark:bg-slate-800", dotColor: "bg-slate-400" },
  in_progress: { label: "Devam Ediyor", color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900", dotColor: "bg-blue-500" },
  review: { label: "İnceleme", color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900", dotColor: "bg-amber-500" },
  done: { label: "Tamamlandı", color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900", dotColor: "bg-green-500" },
};

const projectStatusConfig: Record<string, { label: string; color: string }> = {
  planning: { label: "Planlama", color: "bg-slate-500" },
  in_progress: { label: "Devam Ediyor", color: "bg-blue-500" },
  completed: { label: "Tamamlandı", color: "bg-green-500" },
  on_hold: { label: "Beklemede", color: "bg-amber-500" },
  cancelled: { label: "İptal", color: "bg-red-500" },
};

const priorityConfig: Record<string, { label: string; dotColor: string }> = {
  low: { label: "Düşük", dotColor: "bg-slate-400" },
  medium: { label: "Orta", dotColor: "bg-blue-500" },
  high: { label: "Yüksek", dotColor: "bg-orange-500" },
  urgent: { label: "Acil", dotColor: "bg-red-500" },
};

const memberRoleConfig: Record<string, { label: string; icon: any; color: string }> = {
  owner: { label: "Proje Lideri", icon: UserCog, color: "text-purple-600" },
  editor: { label: "Editör", icon: Edit2, color: "text-blue-600" },
  contributor: { label: "Katkıda Bulunan", icon: UserCheck, color: "text-green-600" },
  viewer: { label: "İzleyici", icon: Eye, color: "text-slate-500" },
};

// ─── DnD Components ─────────────────────────────────────────
function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`space-y-2 min-h-[120px] p-2 rounded-lg transition-colors ${isOver ? "bg-primary/5 ring-2 ring-primary/20" : ""}`}
    >
      {children}
    </div>
  );
}

function DraggableTask({ task, children }: { task: any; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { task },
  });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing touch-none ${isDragging ? "opacity-50" : ""}`}
    >
      {children}
    </div>
  );
}

// ─── Helper Functions ───────────────────────────────────────
function getTrafficLight(tasks: any[]) {
  if (!tasks?.length) return { color: "🟢", label: "Görev yok", status: "ok" };
  const overdue = tasks.filter((t: any) => t.dueDate && isPast(new Date(t.dueDate)) && t.status !== "done");
  const total = tasks.length;
  const overdueRatio = overdue.length / total;
  if (overdueRatio > 0.3) return { color: "🔴", label: `${overdue.length} gecikmiş görev`, status: "danger" };
  if (overdueRatio > 0.1 || overdue.length > 0) return { color: "🟡", label: `${overdue.length} gecikmiş görev`, status: "warn" };
  return { color: "🟢", label: "Yolunda", status: "ok" };
}

function getProgressPercent(tasks: any[]) {
  if (!tasks?.length) return 0;
  const done = tasks.filter((t: any) => t.status === "done").length;
  return Math.round((done / tasks.length) * 100);
}

// ─── Main Component ─────────────────────────────────────────
export default function ProjeDetay() {
  const params = useParams();
  const projectId = params.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { deleteState, requestDelete, cancelDelete, confirmDelete } = useConfirmDelete();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isAddMilestoneOpen, setIsAddMilestoneOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [activeTask, setActiveTask] = useState<any>(null);
  const [newTask, setNewTask] = useState({
    title: "", description: "", priority: "medium", dueDate: "", assignedToId: "",
  });
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedMemberRole, setSelectedMemberRole] = useState("contributor");
  const [newMilestone, setNewMilestone] = useState({ title: "", description: "", dueDate: "" });
  const [memberSearch, setMemberSearch] = useState("");
  const [memberDeptFilter, setMemberDeptFilter] = useState("all");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  // ─── Queries ──────────────────────────────────────────────
  const { data: project, isLoading, isError, refetch } = useQuery<any>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: hqUsers } = useQuery<any[]>({
    queryKey: ["/api/hq-users"],
  });

  const { data: eligibleUsersData } = useQuery<{
    groups: { id: string; label: string; users: any[] }[];
    branches: { id: number; name: string; city: string }[];
    total: number;
  }>({
    queryKey: ["/api/project-eligible-users"],
  });

  useBreadcrumb(project?.title || '');

  // ─── Derived Data ─────────────────────────────────────────
  const tasks = useMemo(() => Array.isArray(project?.tasks) ? project.tasks : [], [project?.tasks]);
  const members = useMemo(() => Array.isArray(project?.members) ? project.members : [], [project?.members]);
  const comments = useMemo(() => Array.isArray(project?.comments) ? project.comments : [], [project?.comments]);
  const milestones = useMemo(() => Array.isArray(project?.milestones) ? project.milestones : [], [project?.milestones]);

  const tasksByStatus = useMemo(() => ({
    todo: tasks.filter((t: any) => t.status === "todo"),
    in_progress: tasks.filter((t: any) => t.status === "in_progress"),
    review: tasks.filter((t: any) => t.status === "review"),
    done: tasks.filter((t: any) => t.status === "done"),
  }), [tasks]);

  const overdueTasks = useMemo(() =>
    tasks.filter((t: any) => t.dueDate && isPast(new Date(t.dueDate)) && t.status !== "done"),
    [tasks]
  );

  const progressPercent = useMemo(() => getProgressPercent(tasks), [tasks]);
  const trafficLight = useMemo(() => getTrafficLight(tasks), [tasks]);

  const existingMemberIds = useMemo(() => new Set(members.map((m: any) => m.userId)), [members]);
  const availableUsers = useMemo(() => hqUsers?.filter((u: any) => !existingMemberIds.has(u.id)) || [], [hqUsers, existingMemberIds]);

  // Enhanced: all eligible users (HQ + Factory + Branch) minus existing members
  const allEligibleUsers = useMemo(() => {
    if (!eligibleUsersData?.groups) return [];
    return eligibleUsersData.groups.flatMap(g => g.users).filter((u: any) => !existingMemberIds.has(u.id));
  }, [eligibleUsersData, existingMemberIds]);

  const filteredMemberUsers = useMemo(() => {
    let users = allEligibleUsers;
    if (memberDeptFilter !== "all" && eligibleUsersData?.groups) {
      const group = eligibleUsersData.groups.find(g => g.id === memberDeptFilter);
      users = group ? group.users.filter((u: any) => !existingMemberIds.has(u.id)) : [];
    }
    if (memberSearch.trim()) {
      const search = memberSearch.toLowerCase();
      users = users.filter((u: any) => {
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
        return fullName.includes(search);
      });
    }
    return users;
  }, [allEligibleUsers, memberDeptFilter, memberSearch, eligibleUsersData, existingMemberIds]);

  // ─── Member workload ─────────────────────────────────────
  const memberWorkload = useMemo(() => {
    const workload: Record<string, { total: number; done: number; name: string }> = {};
    members.forEach((m: any) => {
      const uid = m.userId;
      const name = m.user ? `${m.user.firstName} ${m.user.lastName || ''}`.trim() : 'Bilinmeyen';
      const assigned = tasks.filter((t: any) => t.assignedToId === uid);
      const completed = assigned.filter((t: any) => t.status === "done");
      workload[uid] = { total: assigned.length, done: completed.length, name };
    });
    return workload;
  }, [members, tasks]);

  // ─── Mutations ────────────────────────────────────────────
  const invalidateProject = () => queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });

  const addTaskMutation = useMutation({
    mutationFn: async (data: typeof newTask) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/tasks`, data);
      return res.json();
    },
    onSuccess: () => {
      invalidateProject();
      setIsAddTaskOpen(false);
      setNewTask({ title: "", description: "", priority: "medium", dueDate: "", assignedToId: "" });
      toast({ title: "Görev oluşturuldu" });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/project-tasks/${id}`, data);
      return res.json();
    },
    onSuccess: invalidateProject,
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/members`, { userId, role });
      return res.json();
    },
    onSuccess: () => {
      invalidateProject();
      setIsAddMemberOpen(false);
      setSelectedMemberId("");
      setSelectedMemberRole("contributor");
      setMemberSearch("");
      setMemberDeptFilter("all");
      toast({ title: "Üye eklendi" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      const res = await apiRequest("DELETE", `/api/projects/${projectId}/members/${memberId}`);
      return res.json();
    },
    onSuccess: () => { invalidateProject(); toast({ title: "Üye çıkarıldı" }); },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/comments`, { content });
      return res.json();
    },
    onSuccess: () => { invalidateProject(); setNewComment(""); },
  });

  const addMilestoneMutation = useMutation({
    mutationFn: async (data: typeof newMilestone) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/milestones`, data);
      return res.json();
    },
    onSuccess: () => {
      invalidateProject();
      setIsAddMilestoneOpen(false);
      setNewMilestone({ title: "", description: "", dueDate: "" });
      toast({ title: "Kilometre taşı eklendi" });
    },
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/milestones/${id}`, data);
      return res.json();
    },
    onSuccess: () => { invalidateProject(); toast({ title: "Kilometre taşı güncellendi" }); },
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/milestones/${id}`);
      return res.json();
    },
    onSuccess: () => { invalidateProject(); toast({ title: "Kilometre taşı silindi" }); },
  });

  // ─── Handlers ─────────────────────────────────────────────
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;
    const overId = String(over.id);
    const validStatuses = ["todo", "in_progress", "review", "done"];
    if (!validStatuses.includes(overId)) return;
    const taskId = parseInt(String(active.id).replace("task-", ""));
    const task = tasks.find((t: any) => t.id === taskId);
    if (task && task.status !== overId && !updateTaskMutation.isPending) {
      updateTaskMutation.mutate({ id: taskId, status: overId });
    }
  };

  const handleDragStart = (event: any) => {
    const task = event.active.data?.current?.task;
    if (task) setActiveTask(task);
  };

  // ─── Loading / Error ──────────────────────────────────────
  if (isLoading) return <div className="p-4"><ListSkeleton count={4} variant="card" showHeader /></div>;
  if (isError) return <div className="p-4"><ErrorState onRetry={() => refetch()} /></div>;
  if (!project) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={() => navigate("/projeler")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Geri
        </Button>
        <div className="mt-8 text-center text-muted-foreground">Proje bulunamadı</div>
      </div>
    );
  }

  // ─── RENDER ───────────────────────────────────────────────
  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/projeler")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg sm:text-xl font-semibold flex-1 min-w-0 truncate">{project.title}</h1>
        <Badge className={`${projectStatusConfig[project.status]?.color || 'bg-slate-500'} text-white text-xs`}>
          {projectStatusConfig[project.status]?.label || project.status}
        </Badge>
        <span className="text-2xl" title={trafficLight.label}>{trafficLight.color}</span>
      </div>

      {project.description && (
        <p className="text-sm text-muted-foreground">{project.description}</p>
      )}

      {/* Quick Stats Row */}
      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
        {project.targetDate && (
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Hedef: {format(new Date(project.targetDate), "d MMM yyyy", { locale: tr })}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          <span>{members.length} üye</span>
        </div>
        <div className="flex items-center gap-1">
          <ListTodo className="h-4 w-4" />
          <span>{tasks.length} görev</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>%{progressPercent}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <Progress value={progressPercent} className="h-2" />

      {/* 6 Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1 w-full">
          <TabsTrigger value="dashboard" className="flex items-center gap-1 text-xs sm:text-sm">
            <LayoutDashboard className="h-3.5 w-3.5" /> <span className="hidden xs:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-1 text-xs sm:text-sm">
            <ListTodo className="h-3.5 w-3.5" /> Görevler
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-1 text-xs sm:text-sm">
            <GanttChart className="h-3.5 w-3.5" /> Timeline
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-1 text-xs sm:text-sm">
            <Users className="h-3.5 w-3.5" /> Ekip
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-1 text-xs sm:text-sm">
            <MessageSquare className="h-3.5 w-3.5" /> İletişim
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-1 text-xs sm:text-sm">
            <FolderOpen className="h-3.5 w-3.5" /> Dosyalar
          </TabsTrigger>
        </TabsList>

        {/* ═══════════ TAB 1: DASHBOARD ═══════════ */}
        <TabsContent value="dashboard" className="mt-4 space-y-4">
          {/* KPI Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("tasks")}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Toplam</p>
                    <p className="text-xl font-bold">{tasks.length}</p>
                  </div>
                  <ListTodo className="h-5 w-5 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("tasks")}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Tamamlanan</p>
                    <p className="text-xl font-bold text-green-600">{tasksByStatus.done.length}</p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("tasks")}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Devam Eden</p>
                    <p className="text-xl font-bold text-blue-600">{tasksByStatus.in_progress.length + tasksByStatus.review.length}</p>
                  </div>
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card className={`cursor-pointer hover:shadow-md transition-shadow ${overdueTasks.length > 0 ? 'ring-1 ring-red-300 dark:ring-red-800' : ''}`} onClick={() => setActiveTab("tasks")}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Gecikmiş</p>
                    <p className={`text-xl font-bold ${overdueTasks.length > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>{overdueTasks.length}</p>
                  </div>
                  <AlertTriangle className={`h-5 w-5 ${overdueTasks.length > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Critical Tasks + Milestones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Kritik / Gecikmiş Görevler
                </CardTitle>
              </CardHeader>
              <CardContent>
                {overdueTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Gecikmiş görev yok</p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {overdueTasks.slice(0, 8).map((task: any) => (
                      <div key={task.id} className="flex items-center justify-between p-2 rounded-md border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`h-2 w-2 rounded-full shrink-0 ${priorityConfig[task.priority]?.dotColor || 'bg-slate-400'}`} />
                          <span className="text-sm truncate">{task.title}</span>
                        </div>
                        <span className="text-xs text-red-500 shrink-0 ml-2">
                          {task.dueDate && `${differenceInDays(new Date(), new Date(task.dueDate))} gün`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Flag className="h-4 w-4 text-indigo-500" />
                  Kilometre Taşları
                </CardTitle>
              </CardHeader>
              <CardContent>
                {milestones.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Henüz milestone yok</p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {milestones.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between p-2 rounded-md border">
                        <div className="flex items-center gap-2 min-w-0">
                          <CircleDot className={`h-3 w-3 shrink-0 ${m.status === 'completed' ? 'text-green-500' : 'text-indigo-500'}`} />
                          <span className={`text-sm truncate ${m.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{m.title}</span>
                        </div>
                        {m.dueDate && (
                          <span className="text-xs text-muted-foreground shrink-0 ml-2">
                            {format(new Date(m.dueDate), "d MMM", { locale: tr })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Status Distribution Bar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Görev Dağılımı
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-0.5 h-6 rounded-full overflow-hidden bg-muted">
                {tasks.length > 0 && (
                  <>
                    {tasksByStatus.done.length > 0 && (
                      <div className="bg-green-500 transition-all" style={{ width: `${(tasksByStatus.done.length / tasks.length) * 100}%` }} title={`Tamamlandı: ${tasksByStatus.done.length}`} />
                    )}
                    {tasksByStatus.review.length > 0 && (
                      <div className="bg-amber-500 transition-all" style={{ width: `${(tasksByStatus.review.length / tasks.length) * 100}%` }} title={`İnceleme: ${tasksByStatus.review.length}`} />
                    )}
                    {tasksByStatus.in_progress.length > 0 && (
                      <div className="bg-blue-500 transition-all" style={{ width: `${(tasksByStatus.in_progress.length / tasks.length) * 100}%` }} title={`Devam: ${tasksByStatus.in_progress.length}`} />
                    )}
                    {tasksByStatus.todo.length > 0 && (
                      <div className="bg-slate-400 transition-all" style={{ width: `${(tasksByStatus.todo.length / tasks.length) * 100}%` }} title={`Yapılacak: ${tasksByStatus.todo.length}`} />
                    )}
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                {Object.entries(statusConfig).map(([key, cfg]) => (
                  <span key={key} className="flex items-center gap-1">
                    <div className={`h-2 w-2 rounded-full ${cfg.dotColor}`} />
                    {cfg.label}: {tasksByStatus[key as keyof typeof tasksByStatus]?.length || 0}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ TAB 2: GÖREVLER (Kanban) ═══════════ */}
        <TabsContent value="tasks" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold text-muted-foreground">{tasks.length} görev</h2>
            <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Görev Ekle</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Yeni Görev</DialogTitle></DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label>Görev Adı</Label>
                    <Input value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} placeholder="Görev adı" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Açıklama</Label>
                    <Textarea value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} placeholder="Açıklama (opsiyonel)" rows={3} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Öncelik</Label>
                      <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Düşük</SelectItem>
                          <SelectItem value="medium">Orta</SelectItem>
                          <SelectItem value="high">Yüksek</SelectItem>
                          <SelectItem value="urgent">Acil</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Bitiş Tarihi</Label>
                      <Input type="date" value={newTask.dueDate} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Atanan Kişi</Label>
                    <Select value={newTask.assignedToId} onValueChange={(v) => setNewTask({ ...newTask, assignedToId: v })}>
                      <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                      <SelectContent>
                        {members.map((m: any) => (
                          <SelectItem key={m.userId} value={m.userId}>
                            {m.user?.firstName} {m.user?.lastName || ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => {
                      if (newTask.title.trim()) addTaskMutation.mutate(newTask);
                      else toast({ title: "Görev adı gerekli", variant: "destructive" });
                    }}
                    disabled={addTaskMutation.isPending}
                  >
                    {addTaskMutation.isPending ? "Ekleniyor..." : "Ekle"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(["todo", "in_progress", "review", "done"] as const).map((status) => (
                <div key={status} className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`h-3 w-3 rounded-full ${statusConfig[status].dotColor}`} />
                    <h3 className="font-semibold text-sm">{statusConfig[status].label}</h3>
                    <Badge variant="secondary" className="text-xs h-5">{tasksByStatus[status].length}</Badge>
                  </div>
                  <DroppableColumn id={status}>
                    {tasksByStatus[status].map((task: any) => (
                      <DraggableTask key={task.id} task={task}>
                        <Card className="hover:shadow-md transition-shadow p-3 cursor-pointer" onClick={() => navigate(`/proje-gorev/${task.id}`)}>
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-medium text-sm flex-1 leading-tight">{task.title}</span>
                              <div className={`h-2.5 w-2.5 rounded-full shrink-0 mt-1 ${priorityConfig[task.priority]?.dotColor || 'bg-slate-400'}`} title={priorityConfig[task.priority]?.label} />
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              {task.assignee && (
                                <div className="flex items-center gap-1">
                                  <Avatar className="h-5 w-5">
                                    <AvatarImage src={task.assignee?.profileImageUrl} />
                                    <AvatarFallback className="text-[10px]">{task.assignee?.firstName?.[0]}</AvatarFallback>
                                  </Avatar>
                                  <span className="truncate max-w-[80px]">{task.assignee?.firstName}</span>
                                </div>
                              )}
                              {task.dueDate && (
                                <span className={`flex items-center gap-0.5 ${isPast(new Date(task.dueDate)) && task.status !== 'done' ? 'text-red-500 font-medium' : ''}`}>
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(task.dueDate), "d MMM", { locale: tr })}
                                </span>
                              )}
                            </div>
                          </div>
                        </Card>
                      </DraggableTask>
                    ))}
                    {tasksByStatus[status].length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-6">Görev yok</p>
                    )}
                  </DroppableColumn>
                </div>
              ))}
            </div>
            <DragOverlay>
              {activeTask && (
                <Card className="p-3 w-60 shadow-lg rotate-2">
                  <span className="font-medium text-sm">{activeTask.title}</span>
                </Card>
              )}
            </DragOverlay>
          </DndContext>
        </TabsContent>

        {/* ═══════════ TAB 3: TIMELINE (Gantt) ═══════════ */}
        <TabsContent value="timeline" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold text-muted-foreground">Proje Zaman Çizelgesi</h2>
            <Dialog open={isAddMilestoneOpen} onOpenChange={setIsAddMilestoneOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Milestone</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Yeni Kilometre Taşı</DialogTitle></DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label>Başlık</Label>
                    <Input value={newMilestone.title} onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })} placeholder="Milestone adı" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Açıklama</Label>
                    <Textarea value={newMilestone.description} onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })} placeholder="Açıklama" rows={2} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Hedef Tarih</Label>
                    <Input type="date" value={newMilestone.dueDate} onChange={(e) => setNewMilestone({ ...newMilestone, dueDate: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => {
                      if (newMilestone.title.trim()) addMilestoneMutation.mutate(newMilestone);
                      else toast({ title: "Başlık gerekli", variant: "destructive" });
                    }}
                    disabled={addMilestoneMutation.isPending}
                  >
                    {addMilestoneMutation.isPending ? "Ekleniyor..." : "Ekle"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <GanttChartView
            tasks={tasks}
            milestones={milestones}
            project={project}
            onDeleteMilestone={(id: number, name: string) => requestDelete(id, name)}
            onToggleMilestone={(id: number, completed: boolean) =>
              updateMilestoneMutation.mutate({ id, isCompleted: completed })
            }
          />
        </TabsContent>

        {/* ═══════════ TAB 4: EKİP ═══════════ */}
        <TabsContent value="team" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold text-muted-foreground">{members.length} üye</h2>
            <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><UserPlus className="h-4 w-4 mr-1" /> Üye Ekle</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Üye Ekle</DialogTitle></DialogHeader>
                <div className="space-y-3 py-2">
                  {/* Search & Department Filter */}
                  <Input
                    placeholder="İsim ara..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                  />
                  <Select value={memberDeptFilter} onValueChange={setMemberDeptFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Departman / Şube" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Departmanlar</SelectItem>
                      {eligibleUsersData?.groups?.map((g: any) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.label} ({g.users.filter((u: any) => !existingMemberIds.has(u.id)).length})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* User List */}
                  <div className="max-h-[250px] overflow-y-auto border rounded-md">
                    {filteredMemberUsers.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        {memberSearch ? "Sonuç bulunamadı" : "Eklenecek kullanıcı yok"}
                      </p>
                    ) : (
                      filteredMemberUsers.map((u: any) => (
                        <div
                          key={u.id}
                          className={`flex items-center gap-2 p-2 cursor-pointer transition-colors border-b last:border-b-0 ${selectedMemberId === u.id ? 'bg-primary/10' : 'hover:bg-muted'}`}
                          onClick={() => setSelectedMemberId(u.id)}
                        >
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarImage src={u.profileImageUrl} />
                            <AvatarFallback className="text-[10px]">{u.firstName?.[0]}{u.lastName?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{u.firstName} {u.lastName || ''}</p>
                            <p className="text-[11px] text-muted-foreground">{u.role}</p>
                          </div>
                          {selectedMemberId === u.id && (
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Proje Rolü</Label>
                    <Select value={selectedMemberRole} onValueChange={setSelectedMemberRole}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="editor">Editör</SelectItem>
                        <SelectItem value="contributor">Katkıda Bulunan</SelectItem>
                        <SelectItem value="viewer">İzleyici</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => {
                      if (selectedMemberId) addMemberMutation.mutate({ userId: selectedMemberId, role: selectedMemberRole });
                    }}
                    disabled={!selectedMemberId || addMemberMutation.isPending}
                  >
                    {addMemberMutation.isPending ? "Ekleniyor..." : "Ekle"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {/* Project Owner */}
            {project.ownerId && (() => {
              const ownerUser = hqUsers?.find((u: any) => u.id === project.ownerId);
              const ownerWl = memberWorkload[project.ownerId];
              return (
                <Card className="border-purple-200 dark:border-purple-900">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={ownerUser?.profileImageUrl} />
                        <AvatarFallback className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                          {ownerUser?.firstName?.[0] || 'P'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {ownerUser ? `${ownerUser.firstName} ${ownerUser.lastName || ''}` : 'Proje Sahibi'}
                        </p>
                        <p className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                          <UserCog className="h-3 w-3" /> Proje Lideri
                        </p>
                      </div>
                      {ownerWl && ownerWl.total > 0 && (
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">{ownerWl.done}/{ownerWl.total} görev</p>
                          <Progress value={(ownerWl.done / ownerWl.total) * 100} className="h-1.5 w-20 mt-1" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Members */}
            {members.map((member: any) => {
              const roleInfo = memberRoleConfig[member.role] || memberRoleConfig.contributor;
              const RoleIcon = roleInfo.icon;
              const wl = memberWorkload[member.userId];
              return (
                <Card key={member.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.user?.profileImageUrl} />
                        <AvatarFallback>{member.user?.firstName?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{member.user?.firstName} {member.user?.lastName || ''}</p>
                        <p className={`text-xs flex items-center gap-1 ${roleInfo.color}`}>
                          <RoleIcon className="h-3 w-3" /> {roleInfo.label}
                        </p>
                      </div>
                      {wl && wl.total > 0 && (
                        <div className="text-right mr-2">
                          <p className="text-xs text-muted-foreground">{wl.done}/{wl.total}</p>
                          <Progress value={(wl.done / wl.total) * 100} className="h-1.5 w-16 mt-1" />
                        </div>
                      )}
                      <Button
                        variant="ghost" size="sm"
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-600"
                        onClick={() => removeMemberMutation.mutate(member.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {members.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Henüz ekip üyesi eklenmemiş</p>
            )}
          </div>
        </TabsContent>

        {/* ═══════════ TAB 5: İLETİŞİM ═══════════ */}
        <TabsContent value="messages" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Proje Mesajları</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[400px] overflow-y-auto mb-4">
                {comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Henüz mesaj yok — ilk mesajı siz yazın!</p>
                ) : (
                  comments.map((c: any) => (
                    <div key={c.id} className={`flex gap-2 ${c.isSystemMessage ? 'opacity-60' : ''}`}>
                      <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                        <AvatarImage src={c.user?.profileImageUrl} />
                        <AvatarFallback className="text-[10px]">{c.user?.firstName?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium">{c.user?.firstName} {c.user?.lastName || ''}</span>
                          <span className="text-xs text-muted-foreground">
                            {c.createdAt && format(new Date(c.createdAt), "d MMM HH:mm", { locale: tr })}
                          </span>
                        </div>
                        <p className={`text-sm mt-0.5 ${c.isSystemMessage ? 'italic text-muted-foreground' : ''}`}>{c.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Mesaj yazın..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && newComment.trim()) {
                      e.preventDefault();
                      addCommentMutation.mutate(newComment);
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => { if (newComment.trim()) addCommentMutation.mutate(newComment); }}
                  disabled={!newComment.trim() || addCommentMutation.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ TAB 6: DOSYALAR ═══════════ */}
        <TabsContent value="files" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-8 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium text-sm mb-1">Proje Dosyaları</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Dosya paylaşım özelliği Sprint 2'de eklenecek.
                Şimdilik proje mesajlarında dosya bağlantıları paylaşabilirsiniz.
              </p>
              <Button variant="outline" size="sm" onClick={() => setActiveTab("messages")}>
                <MessageSquare className="h-4 w-4 mr-1" /> Mesajlara Git
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Milestone Dialog */}
      <ConfirmDeleteDialog
        open={deleteState.open}
        onOpenChange={(open) => !open && cancelDelete()}
        onConfirm={() => {
          const id = confirmDelete();
          if (id !== null) deleteMilestoneMutation.mutate(id as number);
        }}
        title="Kilometre Taşını Sil"
        description={`"${deleteState.itemName || ''}" kilometre taşını silmek istediğinize emin misiniz?`}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// GANTT CHART VIEW (CSS-based, no library needed)
// ═══════════════════════════════════════════════════════════════
function GanttChartView({
  tasks, milestones, project, onDeleteMilestone, onToggleMilestone,
}: {
  tasks: any[]; milestones: any[]; project: any;
  onDeleteMilestone: (id: number, name: string) => void;
  onToggleMilestone: (id: number, completed: boolean) => void;
}) {
  const allDates = [
    project.startDate && new Date(project.startDate),
    project.targetDate && new Date(project.targetDate),
    ...tasks.filter((t: any) => t.startDate).map((t: any) => new Date(t.startDate)),
    ...tasks.filter((t: any) => t.dueDate).map((t: any) => new Date(t.dueDate)),
    ...milestones.filter((m: any) => m.dueDate).map((m: any) => new Date(m.dueDate)),
  ].filter(Boolean) as Date[];

  if (allDates.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <GanttChart className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Görevlere başlangıç/bitiş tarihi ekleyin</p>
          <p className="text-xs text-muted-foreground mt-1">Timeline otomatik oluşturulacak</p>
        </CardContent>
      </Card>
    );
  }

  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
  minDate.setDate(minDate.getDate() - 3);
  maxDate.setDate(maxDate.getDate() + 7);
  const totalDays = Math.max(differenceInDays(maxDate, minDate), 14);

  const getPosition = (date: Date) => {
    const days = differenceInDays(date, minDate);
    return Math.max(0, Math.min(100, (days / totalDays) * 100));
  };

  const getWidth = (start: Date, end: Date) => {
    const days = differenceInDays(end, start);
    return Math.max(2, (days / totalDays) * 100);
  };

  const weeks: Date[] = [];
  let current = new Date(minDate);
  while (current <= maxDate) {
    weeks.push(new Date(current));
    current = addDays(current, 7);
  }

  const tasksWithDates = tasks.filter((t: any) => t.startDate || t.dueDate);
  const todayPos = getPosition(new Date());

  return (
    <Card>
      <CardContent className="p-3 overflow-x-auto">
        <div className="min-w-[600px] relative">
          {/* Week headers */}
          <div className="relative h-8 border-b mb-1">
            {weeks.map((w, i) => (
              <div key={i} className="absolute text-[10px] text-muted-foreground top-1" style={{ left: `${getPosition(w)}%` }}>
                {format(w, "d MMM", { locale: tr })}
              </div>
            ))}
          </div>

          {/* Today line */}
          {todayPos >= 0 && todayPos <= 100 && (
            <div className="absolute top-8 bottom-0 w-px bg-red-400 z-10 pointer-events-none" style={{ left: `${todayPos}%` }}>
              <div className="absolute -top-1 -left-1.5 w-3 h-3 rounded-full bg-red-500" />
            </div>
          )}

          {/* Milestones */}
          {milestones.filter((m: any) => m.dueDate).map((m: any) => (
            <div key={`ms-${m.id}`} className="relative h-8 flex items-center group">
              <div className="w-[140px] shrink-0 text-xs truncate pr-2 text-muted-foreground flex items-center gap-1">
                <Flag className="h-3 w-3 text-indigo-500 shrink-0" />
                <span className="truncate">{m.title}</span>
              </div>
              <div className="flex-1 relative h-full">
                <div
                  className="absolute top-1/2 -translate-y-1/2 cursor-pointer z-20"
                  style={{ left: `${getPosition(new Date(m.dueDate))}%` }}
                  onClick={() => onToggleMilestone(m.id, m.status !== 'completed')}
                  title={`${m.title} — ${format(new Date(m.dueDate), "d MMM yyyy", { locale: tr })}`}
                >
                  <div className={`w-3.5 h-3.5 rotate-45 border-2 ${m.status === 'completed' ? 'bg-green-500 border-green-600' : 'bg-indigo-500 border-indigo-600'}`} />
                </div>
                <Button
                  variant="ghost" size="sm"
                  className="absolute right-0 top-0 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onDeleteMilestone(m.id, m.title)}
                >
                  <Trash2 className="h-3 w-3 text-red-400" />
                </Button>
              </div>
            </div>
          ))}

          {/* Tasks as bars */}
          {tasksWithDates.map((task: any) => {
            const start = task.startDate ? new Date(task.startDate) : (task.dueDate ? addDays(new Date(task.dueDate), -3) : new Date());
            const end = task.dueDate ? new Date(task.dueDate) : addDays(start, 5);
            const left = getPosition(start);
            const width = getWidth(start, end);
            const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "done";

            return (
              <div key={`task-${task.id}`} className="relative h-8 flex items-center">
                <div className="w-[140px] shrink-0 text-xs truncate pr-2 flex items-center gap-1">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${statusConfig[task.status]?.dotColor || 'bg-slate-400'}`} />
                  <span className="truncate">{task.title}</span>
                </div>
                <div className="flex-1 relative h-full flex items-center">
                  <div
                    className={`absolute h-5 rounded-full transition-all ${
                      task.status === 'done' ? 'bg-green-400/80 dark:bg-green-600/60' :
                      isOverdue ? 'bg-red-400/80 dark:bg-red-600/60' :
                      task.status === 'in_progress' ? 'bg-blue-400/80 dark:bg-blue-600/60' :
                      task.status === 'review' ? 'bg-amber-400/80 dark:bg-amber-600/60' :
                      'bg-slate-300/80 dark:bg-slate-600/60'
                    }`}
                    style={{ left: `${left}%`, width: `${width}%`, minWidth: '12px' }}
                    title={`${task.title}${task.startDate ? ' — ' + format(new Date(task.startDate), "d MMM", { locale: tr }) : ''}${task.dueDate ? ' → ' + format(new Date(task.dueDate), "d MMM", { locale: tr }) : ''}`}
                  >
                    {task.assignee && width > 6 && (
                      <span className="text-[9px] text-white px-1.5 leading-5 truncate block">{task.assignee.firstName}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {tasksWithDates.length === 0 && milestones.filter((m: any) => m.dueDate).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Tarihli görev veya milestone ekleyin</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
