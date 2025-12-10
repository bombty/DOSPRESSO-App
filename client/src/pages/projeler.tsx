import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  FolderKanban, 
  Plus, 
  Calendar, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Target,
  ArrowRight
} from "lucide-react";
import type { Project } from "@shared/schema";

interface ProjectWithStats extends Project {
  memberRole: string | null;
  taskStats: Record<string, number>;
  memberCount: number;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  } | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  planning: { label: "Planlama", color: "bg-slate-500", icon: Target },
  in_progress: { label: "Devam Ediyor", color: "bg-blue-500", icon: Clock },
  completed: { label: "Tamamlandı", color: "bg-green-500", icon: CheckCircle2 },
  on_hold: { label: "Beklemede", color: "bg-yellow-500", icon: AlertCircle },
  cancelled: { label: "İptal", color: "bg-red-500", icon: AlertCircle },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Düşük", color: "bg-slate-400" },
  medium: { label: "Orta", color: "bg-blue-400" },
  high: { label: "Yüksek", color: "bg-orange-400" },
  urgent: { label: "Acil", color: "bg-red-500" },
};

export default function Projeler() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    priority: "medium",
    targetDate: "",
  });

  const { data: projects, isLoading } = useQuery<ProjectWithStats[]>({
    queryKey: ["/api/projects"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newProject) => {
      const res = await apiRequest("POST", "/api/projects", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsCreateOpen(false);
      setNewProject({ title: "", description: "", priority: "medium", targetDate: "" });
      toast({ title: "Proje oluşturuldu" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Proje oluşturulamadı", variant: "destructive" });
    },
  });

  const handleCreate = () => {
    if (!newProject.title.trim()) {
      toast({ title: "Proje adı gerekli", variant: "destructive" });
      return;
    }
    createMutation.mutate(newProject);
  };

  const getTaskProgress = (stats: Record<string, number>) => {
    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    const done = stats.done || 0;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">Projeler</h1>
          <Badge variant="secondary">{projects?.length || 0}</Badge>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-project">
              <Plus className="h-4 w-4 mr-2" />
              Yeni Proje
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Yeni Proje Oluştur</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Proje Adı</Label>
                <Input
                  data-testid="input-project-title"
                  placeholder="Proje adı girin"
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Açıklama</Label>
                <Textarea
                  data-testid="input-project-description"
                  placeholder="Proje açıklaması"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Öncelik</Label>
                  <Select
                    value={newProject.priority}
                    onValueChange={(v) => setNewProject({ ...newProject, priority: v })}
                  >
                    <SelectTrigger data-testid="select-project-priority">
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
                  <Label>Hedef Tarih</Label>
                  <Input
                    data-testid="input-project-target-date"
                    type="date"
                    value={newProject.targetDate}
                    onChange={(e) => setNewProject({ ...newProject, targetDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                İptal
              </Button>
              <Button 
                data-testid="button-create-project"
                onClick={handleCreate} 
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {projects?.length === 0 ? (
        <Card className="p-8 text-center">
          <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">Henüz proje yok</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Yeni bir proje oluşturarak başlayın
          </p>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Proje Oluştur
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects?.map((project) => {
            const statusInfo = statusConfig[project.status || "planning"];
            const priorityInfo = priorityConfig[project.priority || "medium"];
            const progress = getTaskProgress(project.taskStats);
            const totalTasks = Object.values(project.taskStats).reduce((a, b) => a + b, 0);
            const doneTasks = project.taskStats.done || 0;
            
            return (
              <Card 
                key={project.id} 
                className="hover-elevate cursor-pointer"
                onClick={() => navigate(`/projeler/${project.id}`)}
                data-testid={`card-project-${project.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-1">{project.title}</CardTitle>
                    <Badge className={`${priorityInfo.color} text-white text-xs`}>
                      {priorityInfo.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      <statusInfo.icon className="h-3 w-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">İlerleme</span>
                      <span className="font-medium">{doneTasks}/{totalTasks} görev</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        <span>{project.memberCount}</span>
                      </div>
                      {project.targetDate && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{new Date(project.targetDate).toLocaleDateString('tr-TR')}</span>
                        </div>
                      )}
                    </div>
                    {project.owner && (
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={project.owner.profileImageUrl} />
                        <AvatarFallback className="text-xs">
                          {project.owner.firstName?.[0]}{project.owner.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
