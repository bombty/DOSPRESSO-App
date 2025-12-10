import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { 
  ArrowLeft, 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Send,
  Link2,
  GitBranch,
  ListTodo,
  MessageSquare,
  X
} from "lucide-react";

interface TaskUser {
  id: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
}

interface SubTask {
  id: number;
  title: string;
  status: string;
  assignee?: TaskUser | null;
}

interface Dependency {
  id: number;
  taskId: number;
  dependsOnTaskId: number;
  dependencyType: string;
  dependsOnTask: {
    id: number;
    title: string;
    status: string;
  };
}

interface TaskComment {
  id: number;
  content: string;
  createdAt: string;
  isSystemMessage: boolean;
  user: TaskUser;
}

interface TaskDetails {
  id: number;
  projectId: number;
  parentTaskId: number | null;
  milestoneId: number | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  startDate: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  tags: string[] | null;
  createdAt: string;
  assignee: TaskUser | null;
  subtasks: SubTask[];
  dependencies: Dependency[];
  comments: TaskComment[];
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  todo: { label: "Yapılacak", color: "text-slate-600", bgColor: "bg-slate-100 dark:bg-slate-800" },
  in_progress: { label: "Devam Ediyor", color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900" },
  review: { label: "İnceleme", color: "text-yellow-600", bgColor: "bg-yellow-100 dark:bg-yellow-900" },
  done: { label: "Tamamlandı", color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900" },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Düşük", color: "bg-slate-400" },
  medium: { label: "Orta", color: "bg-blue-400" },
  high: { label: "Yüksek", color: "bg-orange-400" },
  urgent: { label: "Acil", color: "bg-red-500" },
};

export default function ProjeGorevDetay() {
  const params = useParams();
  const taskId = params.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [isAddSubtaskOpen, setIsAddSubtaskOpen] = useState(false);
  const [isAddDependencyOpen, setIsAddDependencyOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [newSubtask, setNewSubtask] = useState({ title: "", priority: "medium" });
  const [selectedDependsOnTaskId, setSelectedDependsOnTaskId] = useState("");

  const { data: task, isLoading } = useQuery<TaskDetails>({
    queryKey: ["/api/project-tasks", taskId],
    enabled: !!taskId,
  });

  const { data: projectTasks } = useQuery<any[]>({
    queryKey: ["/api/projects", task?.projectId, "tasks-list"],
    enabled: !!task?.projectId,
    queryFn: async () => {
      const res = await fetch(`/api/projects/${task?.projectId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      return data.tasks || [];
    },
  });

  const { data: hqUsers } = useQuery<TaskUser[]>({
    queryKey: ["/api/hq-users"],
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (data: Partial<TaskDetails>) => {
      const res = await apiRequest("PATCH", `/api/project-tasks/${taskId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-tasks", taskId] });
      toast({ title: "Görev güncellendi" });
    },
  });

  const addSubtaskMutation = useMutation({
    mutationFn: async (data: typeof newSubtask) => {
      const res = await apiRequest("POST", `/api/project-tasks/${taskId}/subtasks`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-tasks", taskId] });
      setIsAddSubtaskOpen(false);
      setNewSubtask({ title: "", priority: "medium" });
      toast({ title: "Alt görev eklendi" });
    },
  });

  const addDependencyMutation = useMutation({
    mutationFn: async (dependsOnTaskId: number) => {
      const res = await apiRequest("POST", `/api/project-tasks/${taskId}/dependencies`, { dependsOnTaskId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-tasks", taskId] });
      setIsAddDependencyOpen(false);
      setSelectedDependsOnTaskId("");
      toast({ title: "Bağımlılık eklendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Bağımlılık eklenemedi", variant: "destructive" });
    },
  });

  const removeDependencyMutation = useMutation({
    mutationFn: async (dependencyId: number) => {
      const res = await apiRequest("DELETE", `/api/task-dependencies/${dependencyId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-tasks", taskId] });
      toast({ title: "Bağımlılık kaldırıldı" });
    },
  });

  const updateSubtaskMutation = useMutation({
    mutationFn: async ({ subtaskId, status }: { subtaskId: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/project-tasks/${subtaskId}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-tasks", taskId] });
      toast({ title: "Alt görev güncellendi" });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/project-tasks/${taskId}/comments`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-tasks", taskId] });
      setNewComment("");
      toast({ title: "Yorum eklendi" });
    },
  });

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment);
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="lg:col-span-2 h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-4">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">Görev bulunamadı</h3>
          <Button onClick={() => navigate("/projeler")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri Dön
          </Button>
        </Card>
      </div>
    );
  }

  const statusInfo = statusConfig[task.status] || statusConfig.todo;
  const priorityInfo = priorityConfig[task.priority] || priorityConfig.medium;
  const subtaskProgress = task.subtasks.length > 0
    ? Math.round((task.subtasks.filter(s => s.status === "done").length / task.subtasks.length) * 100)
    : 0;

  const availableTasksForDependency = projectTasks?.filter(
    t => t.id !== task.id && t.parentTaskId !== task.id
  ) || [];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/projeler/${task.projectId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{task.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={statusInfo.bgColor} variant="outline">
              {statusInfo.label}
            </Badge>
            <Badge className={`${priorityInfo.color} text-white`}>
              {priorityInfo.label}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Açıklama</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {task.description || "Açıklama eklenmemiş"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <ListTodo className="h-4 w-4" />
                <CardTitle className="text-base">Alt Görevler</CardTitle>
                {task.subtasks.length > 0 && (
                  <Badge variant="secondary">{task.subtasks.filter(s => s.status === "done").length}/{task.subtasks.length}</Badge>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={() => setIsAddSubtaskOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Ekle
              </Button>
            </CardHeader>
            <CardContent>
              {task.subtasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Alt görev yok</p>
              ) : (
                <div className="space-y-2">
                  {subtaskProgress > 0 && (
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
                      <div className="h-full bg-primary transition-all" style={{ width: `${subtaskProgress}%` }} />
                    </div>
                  )}
                  {task.subtasks.map((subtask) => {
                    const subStatus = statusConfig[subtask.status] || statusConfig.todo;
                    return (
                      <div 
                        key={subtask.id}
                        className="flex items-center justify-between p-2 rounded-md border hover:bg-muted/50 cursor-pointer"
                        onClick={() => navigate(`/proje-gorev/${subtask.id}`)}
                      >
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateSubtaskMutation.mutate({
                                subtaskId: subtask.id,
                                status: subtask.status === "done" ? "todo" : "done"
                              });
                            }}
                            className="p-0 hover-elevate flex items-center justify-center"
                          >
                            {subtask.status === "done" ? (
                              <div className="h-5 w-5 rounded-full bg-green-500" />
                            ) : (
                              <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                            )}
                          </button>
                          <span className={`text-sm ${subtask.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                            {subtask.title}
                          </span>
                        </div>
                        <Badge variant="outline" className={`text-xs ${subtask.status === "done" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700" : ""}`}>
                          {subtask.status === "done" ? "Tamamlandı" : subStatus.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                <CardTitle className="text-base">Bağımlılıklar</CardTitle>
                {task.dependencies.length > 0 && <Badge variant="secondary">{task.dependencies.length}</Badge>}
              </div>
              <Button size="sm" variant="outline" onClick={() => setIsAddDependencyOpen(true)}>
                <Link2 className="h-4 w-4 mr-1" />
                Ekle
              </Button>
            </CardHeader>
            <CardContent>
              {task.dependencies.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Bu görevin bağımlılığı yok</p>
              ) : (
                <div className="space-y-2">
                  {task.dependencies.map((dep) => {
                    const depStatus = statusConfig[dep.dependsOnTask.status] || statusConfig.todo;
                    const isBlocking = dep.dependsOnTask.status !== "done";
                    return (
                      <div 
                        key={dep.id}
                        className={`flex items-center justify-between p-2 rounded-md border ${isBlocking ? "border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10" : ""}`}
                      >
                        <div className="flex items-center gap-2">
                          {isBlocking ? <AlertCircle className="h-4 w-4 text-yellow-500" /> : <CheckCircle2 className="h-4 w-4 text-green-500" />}
                          <span className="text-sm">{dep.dependsOnTask.title}</span>
                          <Badge variant="outline" className="text-xs">{depStatus.label}</Badge>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeDependencyMutation.mutate(dep.id)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <CardTitle className="text-base">Yorumlar</CardTitle>
                {task.comments.length > 0 && <Badge variant="secondary">{task.comments.length}</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScrollArea className="h-[200px]">
                {task.comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Henüz yorum yok</p>
                ) : (
                  <div className="space-y-3 pr-4">
                    {task.comments.map((comment) => (
                      <div key={comment.id} className={`flex gap-3 ${comment.isSystemMessage ? "opacity-60" : ""}`}>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={comment.user.profileImageUrl} />
                          <AvatarFallback className="text-xs">{comment.user.firstName?.[0]}{comment.user.lastName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{comment.user.firstName} {comment.user.lastName}</span>
                            <span className="text-xs text-muted-foreground">{format(new Date(comment.createdAt), "d MMM HH:mm", { locale: tr })}</span>
                          </div>
                          <p className={`text-sm ${comment.isSystemMessage ? "italic" : ""}`}>{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <Separator />
              <div className="flex gap-2">
                <Input placeholder="Yorum ekle..." value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddComment()} data-testid="input-task-comment" />
                <Button size="icon" onClick={handleAddComment} disabled={addCommentMutation.isPending || !newComment.trim()} data-testid="button-add-task-comment">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Detaylar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Durum</Label>
                <Select value={task.status} onValueChange={(v) => updateTaskMutation.mutate({ status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Öncelik</Label>
                <Select value={task.priority} onValueChange={(v) => updateTaskMutation.mutate({ priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Atanan</Label>
                <Select value={task.assignee?.id || "unassigned"} onValueChange={(v) => updateTaskMutation.mutate({ assignedToId: v === "unassigned" ? null : v } as any)}>
                  <SelectTrigger><SelectValue placeholder="Atanmamış" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Atanmamış</SelectItem>
                    {hqUsers?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>{user.firstName} {user.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Bitiş Tarihi</Label>
                <Input type="date" value={task.dueDate || ""} onChange={(e) => updateTaskMutation.mutate({ dueDate: e.target.value || null })} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Tahmini Saat</Label>
                  <Input type="number" min={0} value={task.estimatedHours || ""} onChange={(e) => updateTaskMutation.mutate({ estimatedHours: e.target.value ? parseInt(e.target.value) : null })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Gerçek Saat</Label>
                  <Input type="number" min={0} value={task.actualHours || ""} onChange={(e) => updateTaskMutation.mutate({ actualHours: e.target.value ? parseInt(e.target.value) : null })} />
                </div>
              </div>

              <Separator />

              <div className="text-xs text-muted-foreground">
                Oluşturulma: {format(new Date(task.createdAt), "d MMM yyyy HH:mm", { locale: tr })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isAddSubtaskOpen} onOpenChange={setIsAddSubtaskOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Alt Görev Ekle</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Başlık</Label>
              <Input placeholder="Alt görev başlığı" value={newSubtask.title} onChange={(e) => setNewSubtask({ ...newSubtask, title: e.target.value })} data-testid="input-subtask-title" />
            </div>
            <div className="space-y-2">
              <Label>Öncelik</Label>
              <Select value={newSubtask.priority} onValueChange={(v) => setNewSubtask({ ...newSubtask, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSubtaskOpen(false)}>İptal</Button>
            <Button onClick={() => addSubtaskMutation.mutate(newSubtask)} disabled={addSubtaskMutation.isPending || !newSubtask.title.trim()} data-testid="button-create-subtask">Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddDependencyOpen} onOpenChange={setIsAddDependencyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Bağımlılık Ekle</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">Bu görevin başlaması için önce tamamlanması gereken görevi seçin.</p>
            <div className="space-y-2">
              <Label>Bağımlı Görev</Label>
              <Select value={selectedDependsOnTaskId} onValueChange={setSelectedDependsOnTaskId}>
                <SelectTrigger><SelectValue placeholder="Görev seçin" /></SelectTrigger>
                <SelectContent>
                  {availableTasksForDependency.map((t: any) => {
                    const tStatus = statusConfig[t.status] || statusConfig.todo;
                    return (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span>{t.title}</span>
                          <Badge variant="outline" className="text-xs">{tStatus.label}</Badge>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDependencyOpen(false)}>İptal</Button>
            <Button onClick={() => addDependencyMutation.mutate(parseInt(selectedDependsOnTaskId))} disabled={addDependencyMutation.isPending || !selectedDependsOnTaskId} data-testid="button-add-dependency">Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
