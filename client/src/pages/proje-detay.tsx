import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
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
  Clock, 
  AlertCircle,
  Target,
  Send,
  UserPlus,
  X,
  MoreVertical,
  ListTodo,
  MessageSquare,
  Edit2
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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

export default function ProjeDetay() {
  const params = useParams();
  const projectId = params.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
    assignedToId: "",
  });
  const [selectedMemberId, setSelectedMemberId] = useState("");

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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(tasksByStatus).map(([status, tasks]) => (
              <div key={status} className="space-y-2">
                <div className={`p-2 rounded-md ${statusConfig[status].bgColor}`}>
                  <h3 className={`text-sm font-medium ${statusConfig[status].color}`}>
                    {statusConfig[status].label} ({(tasks as any[]).length})
                  </h3>
                </div>
                <div className="space-y-2 min-h-[100px]">
                  {(tasks as any[]).map((task) => (
                    <Card key={task.id} className="p-3" data-testid={`card-task-${task.id}`}>
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
                  ))}
                </div>
              </div>
            ))}
          </div>
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
      </Tabs>
    </div>
  );
}
