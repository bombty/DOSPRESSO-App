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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  UserPlus,
  X
} from "lucide-react";
import type { Project } from "@shared/schema";

interface HQUser {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  profileImageUrl?: string;
}

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

const roleLabels: Record<string, string> = {
  admin: "Admin",
  muhasebe: "Muhasebe",
  satinalma: "Satınalma",
  coach: "Coach",
  teknik: "Teknik",
  destek: "Destek",
  fabrika: "Fabrika",
  yatirimci_hq: "Yatırımcı HQ",
};

const memberRoleConfig: Record<string, { label: string; description: string }> = {
  editor: { label: "Editör", description: "Tam düzenleme yetkisi" },
  contributor: { label: "Katkıda Bulunan", description: "Görev ekleyebilir" },
  viewer: { label: "Görüntüleyici", description: "Sadece okuma" },
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
  const [selectedTeam, setSelectedTeam] = useState<{ userId: string; role: string }[]>([]);

  const { data: projects, isLoading } = useQuery<ProjectWithStats[]>({
    queryKey: ["/api/projects"],
  });

  const { data: hqUsers } = useQuery<HQUser[]>({
    queryKey: ["/api/hq-users"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { project: typeof newProject; team: typeof selectedTeam }) => {
      const res = await apiRequest("POST", "/api/projects", {
        ...data.project,
        teamMembers: data.team,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsCreateOpen(false);
      setNewProject({ title: "", description: "", priority: "medium", targetDate: "" });
      setSelectedTeam([]);
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
    createMutation.mutate({ project: newProject, team: selectedTeam });
  };

  const toggleTeamMember = (userId: string) => {
    const existing = selectedTeam.find(m => m.userId === userId);
    if (existing) {
      setSelectedTeam(selectedTeam.filter(m => m.userId !== userId));
    } else {
      setSelectedTeam([...selectedTeam, { userId, role: "contributor" }]);
    }
  };

  const updateMemberRole = (userId: string, role: string) => {
    setSelectedTeam(selectedTeam.map(m => 
      m.userId === userId ? { ...m, role } : m
    ));
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Yeni Proje Oluştur</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Proje Adı *</Label>
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

              {/* Team Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Ekip Üyeleri
                  </Label>
                  {selectedTeam.length > 0 && (
                    <Badge variant="secondary">{selectedTeam.length} kişi seçili</Badge>
                  )}
                </div>
                
                <Card className="border-dashed">
                  <ScrollArea className="h-[200px]">
                    <div className="p-3 space-y-2">
                      {hqUsers?.map((user) => {
                        const isSelected = selectedTeam.some(m => m.userId === user.id);
                        const memberData = selectedTeam.find(m => m.userId === user.id);
                        
                        return (
                          <div 
                            key={user.id}
                            className={`flex items-center justify-between p-2 rounded-md border transition-colors ${
                              isSelected ? "bg-primary/5 border-primary/20" : "hover:bg-muted/50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleTeamMember(user.id)}
                                data-testid={`checkbox-team-${user.id}`}
                              />
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.profileImageUrl} />
                                <AvatarFallback className="text-xs">
                                  {user.firstName?.[0]}{user.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">
                                  {user.firstName} {user.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {roleLabels[user.role] || user.role}
                                </p>
                              </div>
                            </div>
                            
                            {isSelected && (
                              <Select
                                value={memberData?.role || "contributor"}
                                onValueChange={(v) => updateMemberRole(user.id, v)}
                              >
                                <SelectTrigger className="w-32 h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(memberRoleConfig).map(([key, config]) => (
                                    <SelectItem key={key} value={key}>
                                      <div>
                                        <p className="text-sm">{config.label}</p>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        );
                      })}
                      {(!hqUsers || hqUsers.length === 0) && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          HQ kullanıcısı bulunamadı
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </Card>

                {/* Selected Team Preview */}
                {selectedTeam.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedTeam.map((member) => {
                      const user = hqUsers?.find(u => u.id === member.userId);
                      if (!user) return null;
                      
                      return (
                        <Badge
                          key={member.userId}
                          variant="outline"
                          className="flex items-center gap-1 pr-1"
                        >
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={user.profileImageUrl} />
                            <AvatarFallback className="text-[8px]">
                              {user.firstName?.[0]}{user.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs">{user.firstName}</span>
                          <span className="text-xs text-muted-foreground">
                            ({memberRoleConfig[member.role]?.label})
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 ml-1"
                            onClick={() => toggleTeamMember(member.userId)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
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
