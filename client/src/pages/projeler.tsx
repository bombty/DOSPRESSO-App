import { useState, useMemo } from "react";
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
import { ListSkeleton } from "@/components/list-skeleton";
import { EmptyState } from "@/components/empty-state";
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
import { ROLE_LABELS } from "@/lib/turkish-labels";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

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
  planning: { label: "Planlama", color: "bg-muted", icon: Target },
  in_progress: { label: "Devam Ediyor", color: "bg-blue-500", icon: Clock },
  completed: { label: "Tamamlandı", color: "bg-green-500", icon: CheckCircle2 },
  on_hold: { label: "Beklemede", color: "bg-yellow-500", icon: AlertCircle },
  cancelled: { label: "İptal", color: "bg-red-500", icon: AlertCircle },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Düşük", color: "bg-muted" },
  medium: { label: "Orta", color: "bg-blue-400" },
  high: { label: "Yüksek", color: "bg-orange-400" },
  urgent: { label: "Acil", color: "bg-red-500" },
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
const BUDGET_VISIBLE_ROLES = ["admin", "muhasebe", "muhasebe_ik", "genel_mudur"];

export default function Projeler() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Check if current user can see budget info
  const canSeeBudget = user?.role && BUDGET_VISIBLE_ROLES.includes(user.role);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isNewShopCreateOpen, setIsNewShopCreateOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    priority: "medium",
    targetDate: "",
    startDate: "",
    category: "operational",
  });
  const [selectedTeam, setSelectedTeam] = useState<{ userId: string; role: string }[]>([]);
  const [teamSearch, setTeamSearch] = useState("");
  const [teamDeptFilter, setTeamDeptFilter] = useState("all");

  const newShopForm = useForm<NewShopFormValues>({
    resolver: zodResolver(newShopFormSchema),
    defaultValues: {
      title: "", cityName: "", locationAddress: "", targetOpeningDate: "",
      estimatedBudget: "", franchiseOwnerName: "", franchiseOwnerPhone: "", franchiseOwnerEmail: "",
    },
  });

  const { data: projects, isLoading, isError, refetch } = useQuery<ProjectWithStats[]>({
    queryKey: ["/api/projects"],
  });

  const { data: newShopProjects, isLoading: isLoadingNewShop } = useQuery<NewShopProjectWithDetails[]>({
    queryKey: ["/api/new-shop-projects"],
  });

  const { data: hqUsers } = useQuery<HQUser[]>({
    queryKey: ["/api/hq-users"],
  });

  // Enhanced user list with department grouping
  const { data: eligibleUsersData } = useQuery<{
    groups: { id: string; label: string; users: HQUser[] }[];
    branches: { id: number; name: string; city: string }[];
    total: number;
  }>({
    queryKey: ["/api/project-eligible-users"],
  });

  // Flatten and filter team users
  const allEligibleUsers = useMemo(() => {
    if (!eligibleUsersData?.groups) return [];
    return eligibleUsersData.groups.flatMap(g => g.users);
  }, [eligibleUsersData]);

  const filteredTeamUsers = useMemo(() => {
    let users = allEligibleUsers;
    // Department filter
    if (teamDeptFilter !== "all" && eligibleUsersData?.groups) {
      const group = eligibleUsersData.groups.find(g => g.id === teamDeptFilter);
      users = group ? group.users : [];
    }
    // Search filter
    if (teamSearch.trim()) {
      const search = teamSearch.toLowerCase();
      users = users.filter(u => {
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
        return fullName.includes(search);
      });
    }
    return users;
  }, [allEligibleUsers, teamDeptFilter, teamSearch, eligibleUsersData]);

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    if (statusFilter === "all") return projects;
    if (statusFilter === "active") return projects.filter(p => p.status === 'in_progress' || p.status === 'planning');
    if (statusFilter === "completed") return projects.filter(p => p.status === 'completed');
    if (statusFilter === "held") return projects.filter(p => p.status === 'on_hold' || p.status === 'cancelled');
    return projects;
  }, [projects, statusFilter]);

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
      setNewProject({ title: "", description: "", priority: "medium", targetDate: "", startDate: "", category: "operational" });
      setSelectedTeam([]);
      setTeamSearch("");
      setTeamDeptFilter("all");
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
        <ListSkeleton count={6} variant="card" showHeader />
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
                        placeholder="Proje amacı, hedefleri ve kapsamı..."
                        value={newProject.description}
                        onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Kategori</Label>
                        <Select
                          value={newProject.category}
                          onValueChange={(v) => setNewProject({ ...newProject, category: v })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="operational">Operasyonel</SelectItem>
                            <SelectItem value="it">IT / Teknoloji</SelectItem>
                            <SelectItem value="marketing">Pazarlama</SelectItem>
                            <SelectItem value="hr">İK / Eğitim</SelectItem>
                            <SelectItem value="finance">Finans / Muhasebe</SelectItem>
                            <SelectItem value="equipment">Ekipman / Bakım</SelectItem>
                            <SelectItem value="other">Diğer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Öncelik</Label>
                        <Select
                          value={newProject.priority}
                          onValueChange={(v) => setNewProject({ ...newProject, priority: v })}
                        >
                          <SelectTrigger data-testid="select-project-priority"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Düşük</SelectItem>
                            <SelectItem value="medium">Orta</SelectItem>
                            <SelectItem value="high">Yüksek</SelectItem>
                            <SelectItem value="urgent">Acil</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Başlangıç Tarihi</Label>
                        <Input type="date" value={newProject.startDate} onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Hedef Bitiş Tarihi</Label>
                        <Input data-testid="input-project-target-date" type="date" value={newProject.targetDate} onChange={(e) => setNewProject({ ...newProject, targetDate: e.target.value })} />
                      </div>
                    </div>

                    <div className="space-y-3 border-t pt-4">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <UserPlus className="h-4 w-4" />
                          Ekip Üyeleri
                        </Label>
                        {selectedTeam.length > 0 && (
                          <Badge variant="secondary">{selectedTeam.length} kişi seçili</Badge>
                        )}
                      </div>
                      
                      {/* Search & Department Filter */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="İsim ara..."
                          value={teamSearch}
                          onChange={(e) => setTeamSearch(e.target.value)}
                          className="flex-1"
                        />
                        <Select value={teamDeptFilter} onValueChange={setTeamDeptFilter}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Departman" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tüm Departmanlar</SelectItem>
                            {eligibleUsersData?.groups?.map((g) => (
                              <SelectItem key={g.id} value={g.id}>
                                {g.label} ({g.users.length})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Card className="border-dashed">
                        <ScrollArea className="h-[220px]">
                          <div className="p-3 space-y-1">
                            {filteredTeamUsers.map((teamUser) => {
                              const isSelected = selectedTeam.some(m => m.userId === teamUser.id);
                              const memberData = selectedTeam.find(m => m.userId === teamUser.id);
                              const roleLabel = ROLE_LABELS[teamUser.role] || teamUser.role;
                              
                              return (
                                <div 
                                  key={teamUser.id}
                                  className={`flex items-center gap-3 p-2 rounded-md transition-colors cursor-pointer ${isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"}`}
                                  onClick={() => toggleTeamMember(teamUser.id)}
                                >
                                  <Checkbox checked={isSelected} className="shrink-0" />
                                  <Avatar className="h-8 w-8 shrink-0">
                                    <AvatarImage src={teamUser.profileImageUrl} />
                                    <AvatarFallback className="text-xs">{teamUser.firstName?.[0]}{teamUser.lastName?.[0]}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{teamUser.firstName} {teamUser.lastName || ''}</p>
                                    <p className="text-xs text-muted-foreground">{roleLabel}</p>
                                  </div>
                                  {isSelected && memberData && (
                                    <Select
                                      value={memberData.role}
                                      onValueChange={(v) => updateMemberRole(teamUser.id, v)}
                                    >
                                      <SelectTrigger className="w-[120px] h-7 text-xs" onClick={(e) => e.stopPropagation()}>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="editor">Editör</SelectItem>
                                        <SelectItem value="contributor">Katkıda Bulunan</SelectItem>
                                        <SelectItem value="viewer">Görüntüleyici</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                              );
                            })}
                            {filteredTeamUsers.length === 0 && (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                {teamSearch ? "Aramayla eşleşen kullanıcı bulunamadı" : "Kullanıcı bulunamadı"}
                              </p>
                            )}
                          </div>
                        </ScrollArea>
                      </Card>

                      {selectedTeam.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedTeam.map((member) => {
                            const memberUser = allEligibleUsers.find((u: any) => u.id === member.userId) || hqUsers?.find((u: any) => u.id === member.userId);
                            if (!memberUser) return null;
                            return (
                              <Badge key={member.userId} variant="outline" className="flex items-center gap-1 pr-1">
                                <Avatar className="h-4 w-4">
                                  <AvatarImage src={memberUser.profileImageUrl} />
                                  <AvatarFallback className="text-[8px]">{memberUser.firstName?.[0]}{memberUser.lastName?.[0]}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs">{memberUser.firstName}</span>
                                <span className="text-xs text-muted-foreground">({memberRoleConfig[member.role]?.label})</span>
                                <Button variant="ghost" size="icon" className="ml-1 h-4 w-4" onClick={() => toggleTeamMember(member.userId)}>
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
          {/* Portfolio Mini Dashboard */}
          {projects && projects.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <Card className="cursor-pointer" onClick={() => setStatusFilter("all")}>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Toplam</p>
                  <p className="text-xl font-bold">{projects.length}</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer" onClick={() => setStatusFilter("active")}>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Aktif</p>
                  <p className="text-xl font-bold text-blue-600">{projects.filter(p => p.status === 'in_progress' || p.status === 'planning').length}</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer" onClick={() => setStatusFilter("completed")}>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Tamamlanan</p>
                  <p className="text-xl font-bold text-green-600">{projects.filter(p => p.status === 'completed').length}</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer" onClick={() => setStatusFilter("held")}>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Beklemede</p>
                  <p className="text-xl font-bold text-amber-600">{projects.filter(p => p.status === 'on_hold' || p.status === 'cancelled').length}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Status Filter Chips */}
          {projects && projects.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { key: "all", label: "Tümü", count: projects.length },
                { key: "active", label: "Aktif", count: projects.filter(p => p.status === 'in_progress' || p.status === 'planning').length },
                { key: "completed", label: "Tamamlanan", count: projects.filter(p => p.status === 'completed').length },
                { key: "held", label: "Arşiv/Beklemede", count: projects.filter(p => p.status === 'on_hold' || p.status === 'cancelled').length },
              ].map(f => (
                <Badge
                  key={f.key}
                  variant={statusFilter === f.key ? "default" : "outline"}
                  className="cursor-pointer px-3 py-1"
                  onClick={() => setStatusFilter(f.key)}
                >
                  {f.label} ({f.count})
                </Badge>
              ))}
            </div>
          )}

          {filteredProjects?.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="Proje bulunamadı"
              description={statusFilter !== "all" ? "Bu filtrede proje yok. Filtre değiştirin." : "Yeni bir proje oluşturarak başlayın."}
              actionLabel={statusFilter === "all" ? "Proje Oluştur" : undefined}
              onAction={statusFilter === "all" ? () => setIsCreateOpen(true) : undefined}
              data-testid="empty-state-projects"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects?.map((project) => {
                const statusInfo = statusConfig[project.status || "planning"];
                const priorityInfo = priorityConfig[project.priority || "medium"];
                const progress = getTaskProgress(project.taskStats);
                const totalTasks = Object.values(project.taskStats).reduce((a, b) => a + Number(b), 0);
                const doneTasks = Number(project.taskStats.done || 0);
                const todoTasks = Number(project.taskStats.todo || 0);
                const overdueCount = totalTasks - doneTasks; // simplified — real overdue requires task dates
                
                // Traffic light
                const trafficColor = project.status === 'completed' ? '🟢' :
                  project.status === 'cancelled' ? '🔴' :
                  project.status === 'on_hold' ? '🟡' :
                  progress >= 80 ? '🟢' :
                  progress >= 40 ? '🟡' : 
                  totalTasks === 0 ? '⚪' : '🔴';

                return (
                  <Card 
                    key={project.id} 
                    className="hover-elevate cursor-pointer group"
                    onClick={() => navigate(`/projeler/${project.id}`)}
                    data-testid={`card-project-${project.id}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-lg shrink-0" title={`Proje durumu: ${statusInfo.label}`}>{trafficColor}</span>
                          <CardTitle className="text-base line-clamp-1">{project.title}</CardTitle>
                        </div>
                        <Badge className={`${priorityInfo.color} text-white text-xs shrink-0`}>{priorityInfo.label}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          <statusInfo.icon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                        {todoTasks > 0 && project.status !== 'completed' && (
                          <Badge variant="secondary" className="text-xs text-amber-600 dark:text-amber-400">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {todoTasks} bekliyor
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {project.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                      )}
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">İlerleme</span>
                          <span className="font-medium">{doneTasks}/{totalTasks} görev — %{progress}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full transition-all rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${progress}%` }} />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3.5 w-3.5" />
                            <span>{project.memberCount}</span>
                          </div>
                          {project.targetDate && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>{format(new Date(project.targetDate), "d MMM", { locale: tr })}</span>
                            </div>
                          )}
                          {project.updatedAt && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                              <Clock className="h-3 w-3" />
                              <span>{format(new Date(project.updatedAt), "d MMM", { locale: tr })}</span>
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
            <ListSkeleton count={3} variant="card" />
          ) : newShopProjects?.length === 0 ? (
            <EmptyState
              icon={Store}
              title="Şube projesi yok"
              description="Yeni bir franchise açılış projesi oluşturarak başlayın."
              actionLabel="İlk Projeyi Oluştur"
              onAction={() => setIsNewShopCreateOpen(true)}
              data-testid="empty-state-new-shop-projects"
            />
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
