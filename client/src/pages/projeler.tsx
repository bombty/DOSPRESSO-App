import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
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
  X,
  Store,
  MapPin,
  Eye,
  Building2,
  FileSignature,
  Hammer,
  Coffee,
  Wallet,
  GraduationCap,
  User
} from "lucide-react";
import type { Project, ProjectPhase } from "@shared/schema";

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

interface NewShopProjectWithDetails extends Project {
  owner: { id: string; firstName: string; lastName: string; profileImageUrl?: string } | null;
  phases: ProjectPhase[];
  overallProgress: number;
  currentPhase: string;
  completedPhases: number;
  totalPhases: number;
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

const phaseIcons: Record<string, any> = {
  company_setup: Building2,
  contract_legal: FileSignature,
  construction: Hammer,
  equipment: Coffee,
  payments: Wallet,
  staffing: Users,
  training_opening: GraduationCap,
};

const phaseStatusConfig: Record<string, { label: string; bgColor: string }> = {
  not_started: { label: "Başlamadı", bgColor: "bg-muted" },
  in_progress: { label: "Devam Ediyor", bgColor: "bg-blue-500" },
  completed: { label: "Tamamlandı", bgColor: "bg-green-500" },
  blocked: { label: "Engelli", bgColor: "bg-red-500" },
};

const newShopFormSchema = z.object({
  title: z.string().min(1, "Proje adı zorunludur"),
  cityName: z.string().min(1, "Şehir adı zorunludur"),
  locationAddress: z.string().optional(),
  targetOpeningDate: z.string().optional(),
  estimatedBudget: z.string().optional(),
  franchiseOwnerName: z.string().optional(),
  franchiseOwnerPhone: z.string().optional(),
  franchiseOwnerEmail: z.string().email("Geçerli bir e-posta adresi giriniz").optional().or(z.literal("")),
});

type NewShopFormValues = z.infer<typeof newShopFormSchema>;

function PhaseSwimlanesPreview({ phases }: { phases: ProjectPhase[] }) {
  return (
    <div className="flex items-center gap-1 mt-3">
      {phases.map((phase) => {
        const Icon = phaseIcons[phase.phaseType as string] || Building2;
        const config = phaseStatusConfig[phase.status || "not_started"];
        return (
          <div key={phase.id} className="flex-1 relative group" title={`${phase.title}: ${config.label}`}>
            <div className={`h-2 rounded-full transition-all ${
              phase.status === "completed" ? "bg-green-500" :
              phase.status === "in_progress" ? "bg-blue-500" :
              phase.status === "blocked" ? "bg-red-500" : "bg-muted"
            }`} />
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Icon className={`h-4 w-4 ${
                phase.status === "completed" ? "text-green-500" :
                phase.status === "in_progress" ? "text-blue-500" :
                phase.status === "blocked" ? "text-red-500" : "text-muted-foreground"
              }`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Roles that can see budget information
const BUDGET_VISIBLE_ROLES = ["admin", "muhasebe", "genel_mudur"];

export default function Projeler() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  
  // Check if current user can see budget info
  const canSeeBudget = user?.role && BUDGET_VISIBLE_ROLES.includes(user.role);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isNewShopCreateOpen, setIsNewShopCreateOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    priority: "medium",
    targetDate: "",
  });
  const [selectedTeam, setSelectedTeam] = useState<{ userId: string; role: string }[]>([]);

  const newShopForm = useForm<NewShopFormValues>({
    resolver: zodResolver(newShopFormSchema),
    defaultValues: {
      title: "", cityName: "", locationAddress: "", targetOpeningDate: "",
      estimatedBudget: "", franchiseOwnerName: "", franchiseOwnerPhone: "", franchiseOwnerEmail: "",
    },
  });

  const { data: projects, isLoading } = useQuery<ProjectWithStats[]>({
    queryKey: ["/api/projects"],
  });

  const { data: newShopProjects, isLoading: isLoadingNewShop } = useQuery<NewShopProjectWithDetails[]>({
    queryKey: ["/api/new-shop-projects"],
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

  const createNewShopMutation = useMutation({
    mutationFn: async (data: NewShopFormValues) => {
      const payload = {
        title: data.title,
        cityName: data.cityName,
        locationAddress: data.locationAddress || undefined,
        targetOpeningDate: data.targetOpeningDate || undefined,
        estimatedBudget: data.estimatedBudget ? parseInt(data.estimatedBudget) : undefined,
        franchiseeName: data.franchiseOwnerName || undefined,
        franchiseePhone: data.franchiseOwnerPhone || undefined,
        franchiseeEmail: data.franchiseOwnerEmail || undefined,
      };
      const res = await apiRequest("POST", "/api/new-shop-projects", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/new-shop-projects"] });
      setIsNewShopCreateOpen(false);
      newShopForm.reset();
      toast({ title: "Yeni şube projesi oluşturuldu", description: "7 faz otomatik olarak eklendi" });
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

  const handleNewShopSubmit = (data: NewShopFormValues) => {
    createNewShopMutation.mutate(data);
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

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(amount);
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
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="all">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all-projects" className="gap-2">
              <FolderKanban className="h-4 w-4" />
              Tüm Projeler
              <Badge variant="secondary" className="ml-1">{projects?.length || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="new-shop" data-testid="tab-new-shop" className="gap-2">
              <Store className="h-4 w-4" />
              Yeni Şube Açılış
              <Badge variant="secondary" className="ml-1">{newShopProjects?.length || 0}</Badge>
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            {activeTab === "all" && (
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
                                      <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                                      <p className="text-xs text-muted-foreground">{roleLabels[user.role] || user.role}</p>
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
                                            <p className="text-sm">{config.label}</p>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                              );
                            })}
                            {(!hqUsers || hqUsers.length === 0) && (
                              <p className="text-sm text-muted-foreground text-center py-4">HQ kullanıcısı bulunamadı</p>
                            )}
                          </div>
                        </ScrollArea>
                      </Card>

                      {selectedTeam.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedTeam.map((member) => {
                            const user = hqUsers?.find(u => u.id === member.userId);
                            if (!user) return null;
                            return (
                              <Badge key={member.userId} variant="outline" className="flex items-center gap-1 pr-1">
                                <Avatar className="h-4 w-4">
                                  <AvatarImage src={user.profileImageUrl} />
                                  <AvatarFallback className="text-[8px]">{user.firstName?.[0]}{user.lastName?.[0]}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs">{user.firstName}</span>
                                <span className="text-xs text-muted-foreground">({memberRoleConfig[member.role]?.label})</span>
                                <Button variant="ghost" size="icon" className="h-4 w-4 ml-1" onClick={() => toggleTeamMember(member.userId)}>
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
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>İptal</Button>
                    <Button data-testid="button-create-project" onClick={handleCreate} disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {activeTab === "new-shop" && (
              <Dialog open={isNewShopCreateOpen} onOpenChange={(open) => { setIsNewShopCreateOpen(open); if (!open) newShopForm.reset(); }}>
                <DialogTrigger asChild>
                  <Button data-testid="button-new-shop-project">
                    <Plus className="h-4 w-4 mr-2" />
                    Yeni Şube Projesi
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Yeni Şube Açılış Projesi</DialogTitle>
                    <DialogDescription>7 fazlı açılış süreci otomatik oluşturulacak</DialogDescription>
                  </DialogHeader>
                  <Form {...newShopForm}>
                    <form onSubmit={newShopForm.handleSubmit(handleNewShopSubmit)} className="space-y-4 py-4">
                      <FormField control={newShopForm.control} name="title" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Proje Adı *</FormLabel>
                          <FormControl><Input placeholder="Örn: DOSPRESSO Kadıköy" data-testid="input-new-shop-title" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={newShopForm.control} name="cityName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Şehir *</FormLabel>
                          <FormControl><Input placeholder="İstanbul" data-testid="input-new-shop-city" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={newShopForm.control} name="locationAddress" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adres</FormLabel>
                          <FormControl><Input placeholder="Tam adres" data-testid="input-new-shop-address" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <div className={`grid ${canSeeBudget ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                        <FormField control={newShopForm.control} name="targetOpeningDate" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hedef Açılış Tarihi</FormLabel>
                            <FormControl><Input type="date" data-testid="input-new-shop-target-date" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        {canSeeBudget && (
                          <FormField control={newShopForm.control} name="estimatedBudget" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tahmini Bütçe (₺)</FormLabel>
                              <FormControl><Input type="number" placeholder="1500000" data-testid="input-new-shop-budget" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        )}
                      </div>

                      <div className="border-t pt-4 mt-4">
                        <h4 className="text-sm font-medium mb-3">Franchise Sahibi Bilgileri</h4>
                        <div className="space-y-4">
                          <FormField control={newShopForm.control} name="franchiseOwnerName" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Franchise Sahibi Adı</FormLabel>
                              <FormControl><Input placeholder="Ad Soyad" data-testid="input-new-shop-owner-name" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <div className="grid grid-cols-2 gap-4">
                            <FormField control={newShopForm.control} name="franchiseOwnerPhone" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Telefon</FormLabel>
                                <FormControl><Input placeholder="+90 5XX XXX XX XX" data-testid="input-new-shop-owner-phone" {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={newShopForm.control} name="franchiseOwnerEmail" render={({ field }) => (
                              <FormItem>
                                <FormLabel>E-posta</FormLabel>
                                <FormControl><Input type="email" placeholder="email@example.com" data-testid="input-new-shop-owner-email" {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                        </div>
                      </div>

                      <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsNewShopCreateOpen(false)}>İptal</Button>
                        <Button type="submit" disabled={createNewShopMutation.isPending} data-testid="button-submit-new-shop">
                          {createNewShopMutation.isPending ? "Oluşturuluyor..." : "Proje Oluştur"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <TabsContent value="all">
          {projects?.length === 0 ? (
            <Card className="p-8 text-center">
              <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">Henüz proje yok</h3>
              <p className="text-sm text-muted-foreground mb-4">Yeni bir proje oluşturarak başlayın</p>
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
                        <Badge className={`${priorityInfo.color} text-white text-xs`}>{priorityInfo.label}</Badge>
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
                        <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                      )}
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">İlerleme</span>
                          <span className="font-medium">{doneTasks}/{totalTasks} görev</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
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
                            <AvatarFallback className="text-xs">{project.owner.firstName?.[0]}{project.owner.lastName?.[0]}</AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="new-shop">
          {isLoadingNewShop ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64" />)}
            </div>
          ) : newShopProjects?.length === 0 ? (
            <Card className="py-12">
              <CardContent className="text-center">
                <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Henüz Şube Projesi Yok</h3>
                <p className="text-sm text-muted-foreground mb-4">Yeni bir franchise açılış projesi oluşturarak başlayın</p>
                <Button onClick={() => setIsNewShopCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  İlk Projeyi Oluştur
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {newShopProjects?.map((project) => {
                const projectStatus = statusConfig[project.status || "planning"];
                return (
                  <Card key={project.id} className="hover-elevate" data-testid={`card-new-shop-${project.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base line-clamp-1">{project.title}</CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            <span className="line-clamp-1">{project.cityName || "Konum belirtilmedi"}</span>
                          </CardDescription>
                        </div>
                        <Badge className={`${projectStatus.color} text-white shrink-0`}>{projectStatus.label}</Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">İlerleme</span>
                          <span className="font-medium">{project.overallProgress}%</span>
                        </div>
                        <Progress value={project.overallProgress} className="h-2" />
                        <div className="text-xs text-muted-foreground">{project.completedPhases} / {project.totalPhases} faz tamamlandı</div>
                      </div>

                      <PhaseSwimlanesPreview phases={project.phases || []} />

                      <div className={`grid ${canSeeBudget ? 'grid-cols-2' : 'grid-cols-1'} gap-2 text-sm`}>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{project.targetOpeningDate ? format(new Date(project.targetOpeningDate), "d MMM yyyy", { locale: tr }) : "Belirlenmedi"}</span>
                        </div>
                        {canSeeBudget && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Wallet className="h-4 w-4" />
                            <span>{formatCurrency(project.estimatedBudget)}</span>
                          </div>
                        )}
                      </div>

                      {project.franchiseeName && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>{project.franchiseeName}</span>
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                        Aktif Faz: <span className="font-medium">{project.currentPhase}</span>
                      </div>

                      <Button 
                        className="w-full" 
                        variant="outline" 
                        onClick={() => navigate(`/yeni-sube-detay/${project.id}`)}
                        data-testid={`button-view-new-shop-${project.id}`}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Görüntüle
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
