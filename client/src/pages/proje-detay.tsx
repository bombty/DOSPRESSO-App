import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Plus, 
  Calendar, 
  Users, 
  CheckCircle2, 
  Check,
  Clock, 
  AlertCircle,
  Target,
  Send,
  UserPlus,
  X,
  MoreVertical,
  ListTodo,
  MessageSquare,
  Edit2,
  Flag,
  CalendarDays,
  Milestone,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, isSameMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Trash2 } from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  todo: { label: "Yapılacak", color: "text-slate-600", bgColor: "bg-slate-100 dark:bg-slate-800" },
  in_progress: { label: "Devam Ediyor", color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900" },
  review: { label: "İnceleme", color: "text-yellow-600", bgColor: "bg-yellow-100 dark:bg-yellow-900" },
  done: { label: "Tamamlandı", color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900" },
};

const projectStatusConfig: Record<string, { label: string; color: string }> = {
  planning: { label: "Planlama", color: "bg-slate-500" },
  in_progress: { label: "Devam Ediyor", color: "bg-blue-500" },
  completed: { label: "Tamamlandı", color: "bg-green-500" },
  on_hold: { label: "Beklemede", color: "bg-yellow-500" },
  cancelled: { label: "İptal", color: "bg-red-500" },
};

const priorityColors: Record<string, string> = {
  low: "bg-slate-400",
  medium: "bg-blue-400",
  high: "bg-orange-400",
  urgent: "bg-red-500",
};

function DroppableColumn({ id, children, status }: { id: string; children: React.ReactNode; status: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div 
      ref={setNodeRef}
      className={`space-y-2 min-h-[100px] p-2 rounded-md transition-colors ${isOver ? "bg-primary/5 ring-2 ring-primary/20" : ""}`}
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

export default function ProjeDetay() {
  const params = useParams();
  const projectId = params.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [activeTask, setActiveTask] = useState<any>(null);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
    assignedToId: "",
  });
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [isAddMilestoneOpen, setIsAddMilestoneOpen] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ title: "", description: "", dueDate: "" });
  const [isEditMilestoneOpen, setIsEditMilestoneOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const { data: project, isLoading } = useQuery<any>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: hqUsers } = useQuery<any[]>({
    queryKey: ["/api/hq-users"],
  });

  const addTaskMutation = useMutation({
    mutationFn: async (data: typeof newTask) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/tasks`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/members`, { userId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setIsAddMemberOpen(false);
      setSelectedMemberId("");
      toast({ title: "Üye eklendi" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      const res = await apiRequest("DELETE", `/api/projects/${projectId}/members/${memberId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: "Üye çıkarıldı" });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/comments`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setNewComment("");
    },
  });

  const addMilestoneMutation = useMutation({
    mutationFn: async (data: typeof newMilestone) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/milestones`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setIsAddMilestoneOpen(false);
      setNewMilestone({ title: "", description: "", dueDate: "" });
      toast({ title: "Milestone eklendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Milestone eklenemedi", variant: "destructive" });
    },
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; isCompleted?: boolean; title?: string; description?: string; dueDate?: string }) => {
      const res = await apiRequest("PATCH", `/api/milestones/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: "Milestone güncellendi" });
    },
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/milestones/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: "Milestone silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Milestone silinemedi", variant: "destructive" });
    },
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/project-tasks/${taskId}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
    },
  });

  const handleAddMilestone = () => {
    if (!newMilestone.title.trim()) {
      toast({ title: "Milestone adı gerekli", variant: "destructive" });
      return;
    }
    addMilestoneMutation.mutate(newMilestone);
  };

  const handleEditMilestone = () => {
    if (!editingMilestone.title.trim()) {
      toast({ title: "Milestone adı gerekli", variant: "destructive" });
      return;
    }
    updateMilestoneMutation.mutate({ id: editingMilestone.id, title: editingMilestone.title, description: editingMilestone.description, dueDate: editingMilestone.dueDate });
    setIsEditMilestoneOpen(false);
  };

  const handleAddTask = () => {
    if (!newTask.title.trim()) {
      toast({ title: "Görev adı gerekli", variant: "destructive" });
      return;
    }
    addTaskMutation.mutate(newTask);
  };

  const handleSendComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment);
  };

  const handleTaskStatusChange = (taskId: number, newStatus: string) => {
    updateTaskMutation.mutate({ id: taskId, status: newStatus });
  };

  const validStatuses = ["todo", "in_progress", "review", "done"];

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;
    
    const overId = String(over.id);
    if (!validStatuses.includes(overId)) return;
    
    const taskId = parseInt(String(active.id).replace("task-", ""));
    const newStatus = overId;
    const task = project?.tasks?.find((t: any) => t.id === taskId);
    
    if (task && task.status !== newStatus && !updateTaskMutation.isPending) {
      handleTaskStatusChange(taskId, newStatus);
    }
  };

  const handleDragStart = (event: any) => {
    const task = event.active.data?.current?.task;
    if (task) setActiveTask(task);
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={() => navigate("/projeler")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Geri
        </Button>
        <div className="mt-8 text-center text-muted-foreground">Proje bulunamadı</div>
      </div>
    );
  }

  const tasksByStatus = {
    todo: project.tasks?.filter((t: any) => t.status === "todo") || [],
    in_progress: project.tasks?.filter((t: any) => t.status === "in_progress") || [],
    review: project.tasks?.filter((t: any) => t.status === "review") || [],
    done: project.tasks?.filter((t: any) => t.status === "done") || [],
  };

  const existingMemberIds = new Set(project.members?.map((m: any) => m.userId) || []);
  const availableUsers = hqUsers?.filter(u => !existingMemberIds.has(u.id)) || [];

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/projeler")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold flex-1">{project.title}</h1>
        <Badge className={`${projectStatusConfig[project.status]?.color} text-white`}>
          {projectStatusConfig[project.status]?.label}
        </Badge>
      </div>

      {project.description && (
        <p className="text-sm text-muted-foreground">{project.description}</p>
      )}

      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        {project.targetDate && (
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Hedef: {new Date(project.targetDate).toLocaleDateString('tr-TR')}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          <span>{project.members?.length || 0} üye</span>
        </div>
        <div className="flex items-center gap-1">
          <ListTodo className="h-4 w-4" />
          <span>{project.tasks?.length || 0} görev</span>
        </div>
      </div>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          <TabsTrigger value="tasks" className="flex items-center gap-1">
            <ListTodo className="h-4 w-4" />
            Görevler
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            Ekip
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="milestones" className="flex items-center gap-1">
            <Flag className="h-4 w-4" />
            Milestones
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-1">
            <CalendarDays className="h-4 w-4" />
            Takvim
          </TabsTrigger>
          <TabsTrigger value="kanban" className="flex items-center gap-1">
            <ListTodo className="h-4 w-4" />
            Kanban
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-task">
                  <Plus className="h-4 w-4 mr-1" />
                  Görev Ekle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Yeni Görev</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Görev Adı</Label>
                    <Input
                      data-testid="input-task-title"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      placeholder="Görev adı"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Açıklama</Label>
                    <Textarea
                      data-testid="input-task-description"
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      placeholder="Görev açıklaması"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Öncelik</Label>
                      <Select
                        value={newTask.priority}
                        onValueChange={(v) => setNewTask({ ...newTask, priority: v })}
                      >
                        <SelectTrigger data-testid="select-task-priority">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Düşük</SelectItem>
                          <SelectItem value="medium">Orta</SelectItem>
                          <SelectItem value="high">Yüksek</SelectItem>
                          <SelectItem value="urgent">Acil</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Bitiş Tarihi</Label>
                      <Input
                        data-testid="input-task-due-date"
                        type="date"
                        value={newTask.dueDate}
                        onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Atanan Kişi</Label>
                    <Select
                      value={newTask.assignedToId}
                      onValueChange={(v) => setNewTask({ ...newTask, assignedToId: v })}
                    >
                      <SelectTrigger data-testid="select-task-assignee">
                        <SelectValue placeholder="Kişi seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {project.members?.map((m: any) => (
                          <SelectItem key={m.userId} value={m.userId}>
                            {m.user.firstName} {m.user.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddTaskOpen(false)}>İptal</Button>
                  <Button 
                    data-testid="button-create-task"
                    onClick={handleAddTask} 
                    disabled={addTaskMutation.isPending}
                  >
                    {addTaskMutation.isPending ? "..." : "Oluştur"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(tasksByStatus).map(([status, tasks]) => (
                <div key={status} className="space-y-2">
                  <div className={`p-2 rounded-md ${statusConfig[status].bgColor}`}>
                    <h3 className={`text-sm font-medium ${statusConfig[status].color}`}>
                      {statusConfig[status].label} ({(tasks as any[]).length})
                    </h3>
                  </div>
                  <DroppableColumn id={status} status={status}>
                    {(tasks as any[]).map((task) => (
                      <DraggableTask key={task.id} task={task}>
                        <Card className="p-3" data-testid={`card-task-${task.id}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium line-clamp-2">{task.title}</p>
                              {task.dueDate && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  <Calendar className="h-3 w-3 inline mr-1" />
                                  {new Date(task.dueDate).toLocaleDateString('tr-TR')}
                                </p>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {Object.entries(statusConfig).map(([s, info]) => (
                                  <DropdownMenuItem
                                    key={s}
                                    onClick={() => handleTaskStatusChange(task.id, s)}
                                    disabled={s === status}
                                  >
                                    {info.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <Badge className={`${priorityColors[task.priority]} text-white text-xs`}>
                              {task.priority === "low" ? "Düşük" : task.priority === "medium" ? "Orta" : task.priority === "high" ? "Yüksek" : "Acil"}
                            </Badge>
                            {task.assignee && (
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={task.assignee.profileImageUrl} />
                                <AvatarFallback className="text-xs">
                                  {task.assignee.firstName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        </Card>
                      </DraggableTask>
                    ))}
                  </DroppableColumn>
                </div>
              ))}
            </div>
            <DragOverlay>
              {activeTask && (
                <Card className="p-3 shadow-lg opacity-90">
                  <p className="text-sm font-medium">{activeTask.title}</p>
                </Card>
              )}
            </DragOverlay>
          </DndContext>
        </TabsContent>

        <TabsContent value="team" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-member">
                  <UserPlus className="h-4 w-4 mr-1" />
                  Üye Ekle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Üye Ekle</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                    <SelectTrigger data-testid="select-new-member">
                      <SelectValue placeholder="Kullanıcı seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.firstName} {u.lastName} - {u.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>İptal</Button>
                  <Button
                    data-testid="button-confirm-add-member"
                    onClick={() => selectedMemberId && addMemberMutation.mutate(selectedMemberId)}
                    disabled={!selectedMemberId || addMemberMutation.isPending}
                  >
                    Ekle
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {project.members?.map((member: any) => (
              <Card key={member.id} className="p-3" data-testid={`card-member-${member.id}`}>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={member.user.profileImageUrl} />
                    <AvatarFallback>
                      {member.user.firstName?.[0]}{member.user.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {member.user.firstName} {member.user.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                  </div>
                  {member.role !== "owner" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removeMemberMutation.mutate(member.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-2">
                <Textarea
                  data-testid="input-comment"
                  placeholder="Yorum yazın..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="resize-none"
                  rows={2}
                />
                <Button 
                  size="icon" 
                  onClick={handleSendComment}
                  disabled={!newComment.trim() || addCommentMutation.isPending}
                  data-testid="button-send-comment"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {project.comments?.map((comment: any) => (
                <Card key={comment.id} className={comment.isSystemMessage ? "bg-muted/50" : ""}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.user.profileImageUrl} />
                        <AvatarFallback className="text-xs">
                          {comment.user.firstName?.[0]}{comment.user.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {comment.user.firstName} {comment.user.lastName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleString('tr-TR')}
                          </span>
                        </div>
                        <p className={`text-sm mt-1 ${comment.isSystemMessage ? "text-muted-foreground italic" : ""}`}>
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!project.comments || project.comments.length === 0) && (
                <div className="text-center text-muted-foreground py-8">
                  Henüz yorum yok
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="milestones" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Dialog open={isAddMilestoneOpen} onOpenChange={setIsAddMilestoneOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-milestone">
                  <Plus className="h-4 w-4 mr-1" />
                  Milestone Ekle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Yeni Milestone</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Milestone Adı</Label>
                    <Input
                      data-testid="input-milestone-title"
                      value={newMilestone.title}
                      onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                      placeholder="Milestone adı"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Açıklama</Label>
                    <Textarea
                      data-testid="input-milestone-description"
                      value={newMilestone.description}
                      onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                      placeholder="Milestone açıklaması"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hedef Tarih</Label>
                    <Input
                      data-testid="input-milestone-due-date"
                      type="date"
                      value={newMilestone.dueDate}
                      onChange={(e) => setNewMilestone({ ...newMilestone, dueDate: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddMilestoneOpen(false)}>İptal</Button>
                  <Button 
                    data-testid="button-create-milestone"
                    onClick={handleAddMilestone} 
                    disabled={addMilestoneMutation.isPending}
                  >
                    {addMilestoneMutation.isPending ? "..." : "Oluştur"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {project.milestones?.length > 0 ? (
              project.milestones.map((milestone: any) => (
                <Card 
                  key={milestone.id} 
                  data-testid={`card-milestone-${milestone.id}`} 
                  className={`relative overflow-visible ${milestone.isCompleted ? "border-2 border-green-500 bg-green-50 dark:bg-green-950/20" : ""}`}
                >
                  {milestone.isCompleted && (
                    <div className="absolute -top-3 -right-3 bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full rotate-12 shadow-lg border-2 border-green-600 z-10">
                      OK
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <button
                        className="mt-0.5 shrink-0 hover-elevate"
                        disabled={updateMilestoneMutation.isPending}
                        onClick={() => updateMilestoneMutation.mutate({ id: milestone.id, isCompleted: !milestone.isCompleted })}
                      >
                        {updateMilestoneMutation.isPending ? (
                          <div className="h-6 w-6 rounded-full border-2 border-muted-foreground animate-spin" />
                        ) : milestone.isCompleted ? (
                          <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        ) : (
                          <div className="h-6 w-6 rounded-full border-2 border-muted-foreground" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={`font-medium ${milestone.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                            {milestone.title}
                          </h3>
                        </div>
                        {milestone.description && (
                          <p className="text-sm text-muted-foreground mt-1">{milestone.description}</p>
                        )}
                        <div className="flex flex-wrap gap-3 mt-2">
                          {milestone.dueDate && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              Hedef: {format(new Date(milestone.dueDate), "d MMMM yyyy", { locale: tr })}
                            </div>
                          )}
                          {milestone.isCompleted && milestone.completedAt && (
                            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                              <CheckCircle2 className="h-3 w-3" />
                              Tamamlandı: {format(new Date(milestone.completedAt), "d MMMM yyyy", { locale: tr })}
                            </div>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingMilestone({ ...milestone }); setIsEditMilestoneOpen(true); }}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Düzenle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteMilestoneMutation.mutate(milestone.id)} className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Sil
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="p-8 text-center">
                <Flag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Henüz milestone yok</h3>
                <p className="text-sm text-muted-foreground">Projenin önemli aşamalarını belirlemek için milestone ekleyin.</p>
              </Card>
            )}
          </div>

          <Dialog open={isEditMilestoneOpen} onOpenChange={setIsEditMilestoneOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Milestone Düzenle</DialogTitle>
              </DialogHeader>
              {editingMilestone && (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Milestone Adı</Label>
                    <Input
                      value={editingMilestone.title}
                      onChange={(e) => setEditingMilestone({ ...editingMilestone, title: e.target.value })}
                      placeholder="Milestone adı"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Açıklama</Label>
                    <Textarea
                      value={editingMilestone.description || ""}
                      onChange={(e) => setEditingMilestone({ ...editingMilestone, description: e.target.value })}
                      placeholder="Milestone açıklaması"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hedef Tarih</Label>
                    <Input
                      type="date"
                      value={editingMilestone.dueDate?.split('T')[0] || ""}
                      onChange={(e) => setEditingMilestone({ ...editingMilestone, dueDate: e.target.value })}
                    />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditMilestoneOpen(false)}>İptal</Button>
                <Button onClick={handleEditMilestone} disabled={updateMilestoneMutation.isPending}>
                  {updateMilestoneMutation.isPending ? "..." : "Kaydet"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="calendar" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  {format(calendarDate, "MMMM yyyy", { locale: tr })}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setCalendarDate(subMonths(calendarDate, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCalendarDate(new Date())}>Bugün</Button>
                  <Button variant="ghost" size="icon" onClick={() => setCalendarDate(addMonths(calendarDate, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-px bg-muted rounded-md overflow-hidden">
                {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((day) => (
                  <div key={day} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
                {(() => {
                  const monthStart = startOfMonth(calendarDate);
                  const monthEnd = endOfMonth(calendarDate);
                  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
                  const startDayOfWeek = (monthStart.getDay() + 6) % 7;
                  const paddingDays = Array(startDayOfWeek).fill(null);
                  
                  return [...paddingDays, ...days].map((day, index) => {
                    if (!day) {
                      return <div key={`empty-${index}`} className="bg-background p-2 min-h-[60px]" />;
                    }
                    
                    const dayTasks = project.tasks?.filter((t: any) => 
                      t.dueDate && isSameDay(new Date(t.dueDate), day)
                    ) || [];
                    const dayMilestones = project.milestones?.filter((m: any) => 
                      m.dueDate && isSameDay(new Date(m.dueDate), day)
                    ) || [];
                    
                    const hasItems = dayTasks.length > 0 || dayMilestones.length > 0;
                    
                    return (
                      <div 
                        key={day.toISOString()} 
                        className={`bg-background p-1 min-h-[60px] ${isToday(day) ? "ring-2 ring-primary ring-inset" : ""} ${!isSameMonth(day, calendarDate) ? "opacity-50" : ""}`}
                      >
                        <div className={`text-xs font-medium mb-1 ${isToday(day) ? "text-primary" : ""}`}>
                          {format(day, "d")}
                        </div>
                        <div className="space-y-0.5">
                          {dayMilestones.slice(0, 1).map((m: any) => (
                            <div key={m.id} className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded px-1 truncate flex items-center gap-0.5">
                              <Flag className="h-2 w-2 shrink-0" />
                              {m.title}
                            </div>
                          ))}
                          {dayTasks.slice(0, 2).map((t: any) => (
                            <div 
                              key={t.id} 
                              className={`text-[10px] rounded px-1 truncate ${statusConfig[t.status]?.bgColor}`}
                            >
                              {t.title}
                            </div>
                          ))}
                          {(dayTasks.length + dayMilestones.length > 3) && (
                            <div className="text-[10px] text-muted-foreground">
                              +{dayTasks.length + dayMilestones.length - 3} daha
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Bu Ay Bitenler
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {project.tasks?.filter((t: any) => {
                    if (!t.dueDate) return false;
                    const dueDate = new Date(t.dueDate);
                    return isSameMonth(dueDate, calendarDate);
                  }).slice(0, 5).map((task: any) => (
                    <div 
                      key={task.id} 
                      className="flex items-center justify-between p-2 rounded-md border hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/proje-gorev/${task.id}`)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`h-2 w-2 rounded-full ${priorityColors[task.priority]}`} />
                        <span className="text-sm truncate">{task.title}</span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {task.dueDate && format(new Date(task.dueDate), "d MMM", { locale: tr })}
                      </span>
                    </div>
                  ))}
                  {!project.tasks?.some((t: any) => t.dueDate && isSameMonth(new Date(t.dueDate), calendarDate)) && (
                    <p className="text-sm text-muted-foreground text-center py-2">Bu ay için görev yok</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Flag className="h-4 w-4" />
                  Yaklaşan Milestones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {project.milestones?.filter((m: any) => !m.isCompleted).slice(0, 5).map((milestone: any) => (
                    <div key={milestone.id} className="flex items-center justify-between p-2 rounded-md border">
                      <span className="text-sm truncate">{milestone.title}</span>
                      {milestone.dueDate && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {format(new Date(milestone.dueDate), "d MMM", { locale: tr })}
                        </span>
                      )}
                    </div>
                  ))}
                  {!project.milestones?.some((m: any) => !m.isCompleted) && (
                    <p className="text-sm text-muted-foreground text-center py-2">Tamamlanmamış milestone yok</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="kanban" className="mt-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {["todo", "in_progress", "review", "done"].map((status) => (
                <div key={status} className="space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${statusConfig[status]?.bgColor}`} />
                    {statusConfig[status]?.label}
                  </h3>
                  <DroppableColumn id={status} status={status}>
                    {project.tasks?.filter((t: any) => t.status === status).map((task: any) => (
                      <DraggableTask key={task.id} task={task}>
                        <div onClick={() => navigate(`/proje-gorev/${task.id}`)} className="cursor-pointer">
                          <Card className="hover:shadow-md transition-shadow p-3">
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-medium text-sm flex-1">{task.title}</span>
                                <div className={`h-2 w-2 rounded-full shrink-0 ${priorityColors[task.priority]}`} />
                              </div>
                              {task.assignedToId && (
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={task.assignee?.profileImageUrl} />
                                    <AvatarFallback className="text-xs">{task.assignee?.firstName?.[0]}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs text-muted-foreground">{task.assignee?.firstName}</span>
                                </div>
                              )}
                              {task.dueDate && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(task.dueDate), "d MMM", { locale: tr })}
                                </div>
                              )}
                            </div>
                          </Card>
                        </div>
                      </DraggableTask>
                    ))}
                  </DroppableColumn>
                </div>
              ))}
            </div>
            <DragOverlay>
              {activeTask && (
                <Card className="p-3 w-64 shadow-lg">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-sm flex-1">{activeTask.title}</span>
                      <div className={`h-2 w-2 rounded-full shrink-0 ${priorityColors[activeTask.priority]}`} />
                    </div>
                  </div>
                </Card>
              )}
            </DragOverlay>
          </DndContext>
        </TabsContent>
      </Tabs>
    </div>
  );
}
