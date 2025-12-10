import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  Store,
  Plus,
  Calendar,
  MapPin,
  Eye,
  Trash2,
  Building2,
  FileSignature,
  Hammer,
  Coffee,
  Wallet,
  Users,
  GraduationCap,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Ban,
  Phone,
  Mail,
  User
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { Project, ProjectPhase, Branch } from "@shared/schema";

interface NewShopProjectWithDetails extends Project {
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  } | null;
  phases: ProjectPhase[];
  overallProgress: number;
  currentPhase: string;
  currentPhaseType?: string;
  completedPhases: number;
  totalPhases: number;
}

const phaseStatusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  not_started: { label: "Başlamadı", color: "text-muted-foreground", bgColor: "bg-muted" },
  in_progress: { label: "Devam Ediyor", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-500" },
  completed: { label: "Tamamlandı", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-500" },
  blocked: { label: "Engelli", color: "text-red-600 dark:text-red-400", bgColor: "bg-red-500" },
};

const projectStatusConfig: Record<string, { label: string; color: string }> = {
  planning: { label: "Planlama", color: "bg-slate-500" },
  in_progress: { label: "Devam Ediyor", color: "bg-blue-500" },
  completed: { label: "Tamamlandı", color: "bg-green-500" },
  on_hold: { label: "Beklemede", color: "bg-yellow-500" },
  cancelled: { label: "İptal", color: "bg-red-500" },
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

function PhaseStatusBadge({ status }: { status: string }) {
  const config = phaseStatusConfig[status] || phaseStatusConfig.not_started;
  const Icon = status === "completed" ? CheckCircle2 : 
               status === "in_progress" ? Clock : 
               status === "blocked" ? Ban : Clock;
  
  return (
    <Badge variant="outline" className={`${config.color} text-xs gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function PhaseSwimlanesPreview({ phases }: { phases: ProjectPhase[] }) {
  return (
    <div className="flex items-center gap-1 mt-3">
      {phases.map((phase, index) => {
        const Icon = phaseIcons[phase.phaseType as string] || Building2;
        const statusConfig = phaseStatusConfig[phase.status || "not_started"];
        
        return (
          <div
            key={phase.id}
            className="flex-1 relative group"
            title={`${phase.title}: ${statusConfig.label}`}
          >
            <div
              className={`h-2 rounded-full transition-all ${
                phase.status === "completed" ? "bg-green-500" :
                phase.status === "in_progress" ? "bg-blue-500" :
                phase.status === "blocked" ? "bg-red-500" :
                "bg-muted"
              }`}
            />
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Icon 
                className={`h-4 w-4 ${
                  phase.status === "completed" ? "text-green-500" :
                  phase.status === "in_progress" ? "text-blue-500" :
                  phase.status === "blocked" ? "text-red-500" :
                  "text-muted-foreground"
                }`} 
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function YeniSubeProjeler() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteProjectId, setDeleteProjectId] = useState<number | null>(null);
  const [newProject, setNewProject] = useState({
    title: "",
    cityName: "",
    locationAddress: "",
    targetOpeningDate: "",
    estimatedBudget: "",
    franchiseeName: "",
    franchiseePhone: "",
    franchiseeEmail: "",
    branchId: "",
  });

  const { data: projects, isLoading } = useQuery<NewShopProjectWithDetails[]>({
    queryKey: ["/api/new-shop-projects"],
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newProject) => {
      const payload = {
        title: data.title,
        cityName: data.cityName,
        locationAddress: data.locationAddress,
        targetOpeningDate: data.targetOpeningDate || undefined,
        estimatedBudget: data.estimatedBudget ? parseInt(data.estimatedBudget) : undefined,
        franchiseeName: data.franchiseeName || undefined,
        franchiseePhone: data.franchiseePhone || undefined,
        franchiseeEmail: data.franchiseeEmail || undefined,
        branchId: data.branchId ? parseInt(data.branchId) : undefined,
      };
      const res = await apiRequest("POST", "/api/new-shop-projects", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/new-shop-projects"] });
      setIsCreateOpen(false);
      setNewProject({
        title: "",
        cityName: "",
        locationAddress: "",
        targetOpeningDate: "",
        estimatedBudget: "",
        franchiseeName: "",
        franchiseePhone: "",
        franchiseeEmail: "",
        branchId: "",
      });
      toast({ title: "Yeni şube projesi oluşturuldu", description: "7 faz otomatik olarak eklendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Proje oluşturulamadı", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (projectId: number) => {
      await apiRequest("DELETE", `/api/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/new-shop-projects"] });
      setDeleteProjectId(null);
      toast({ title: "Proje silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Proje silinemedi", variant: "destructive" });
    },
  });

  const handleCreate = () => {
    if (!newProject.title.trim()) {
      toast({ title: "Proje adı gerekli", variant: "destructive" });
      return;
    }
    if (!newProject.cityName.trim()) {
      toast({ title: "Şehir adı gerekli", variant: "destructive" });
      return;
    }
    createMutation.mutate(newProject);
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Store className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-xl font-semibold" data-testid="text-page-title">Yeni Şube Açılış Projeleri</h1>
            <p className="text-sm text-muted-foreground">Franchise açılış süreçlerini yönetin</p>
          </div>
          <Badge variant="secondary" data-testid="badge-project-count">{projects?.length || 0}</Badge>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-project">
              <Plus className="h-4 w-4 mr-2" />
              Yeni Şube Projesi
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Yeni Şube Açılış Projesi</DialogTitle>
              <DialogDescription>
                7 fazlı açılış süreci otomatik oluşturulacak
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Proje Adı *</Label>
                <Input
                  id="title"
                  placeholder="Örn: DOSPRESSO Kadıköy"
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  data-testid="input-project-title"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cityName">Şehir *</Label>
                  <Input
                    id="cityName"
                    placeholder="İstanbul"
                    value={newProject.cityName}
                    onChange={(e) => setNewProject({ ...newProject, cityName: e.target.value })}
                    data-testid="input-city-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch">Mevcut Şube (İsteğe Bağlı)</Label>
                  <Select
                    value={newProject.branchId}
                    onValueChange={(v) => setNewProject({ ...newProject, branchId: v })}
                  >
                    <SelectTrigger data-testid="select-branch">
                      <SelectValue placeholder="Şube seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches?.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id.toString()}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adres</Label>
                <Input
                  id="address"
                  placeholder="Tam adres"
                  value={newProject.locationAddress}
                  onChange={(e) => setNewProject({ ...newProject, locationAddress: e.target.value })}
                  data-testid="input-address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetDate">Hedef Açılış Tarihi</Label>
                  <Input
                    id="targetDate"
                    type="date"
                    value={newProject.targetOpeningDate}
                    onChange={(e) => setNewProject({ ...newProject, targetOpeningDate: e.target.value })}
                    data-testid="input-target-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget">Tahmini Bütçe (₺)</Label>
                  <Input
                    id="budget"
                    type="number"
                    placeholder="1500000"
                    value={newProject.estimatedBudget}
                    onChange={(e) => setNewProject({ ...newProject, estimatedBudget: e.target.value })}
                    data-testid="input-budget"
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-medium mb-3">Franchise Sahibi Bilgileri</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="franchiseeName">Franchise Sahibi Adı</Label>
                    <Input
                      id="franchiseeName"
                      placeholder="Ad Soyad"
                      value={newProject.franchiseeName}
                      onChange={(e) => setNewProject({ ...newProject, franchiseeName: e.target.value })}
                      data-testid="input-franchisee-name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="franchiseePhone">Telefon</Label>
                      <Input
                        id="franchiseePhone"
                        placeholder="+90 5XX XXX XX XX"
                        value={newProject.franchiseePhone}
                        onChange={(e) => setNewProject({ ...newProject, franchiseePhone: e.target.value })}
                        data-testid="input-franchisee-phone"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="franchiseeEmail">E-posta</Label>
                      <Input
                        id="franchiseeEmail"
                        type="email"
                        placeholder="email@example.com"
                        value={newProject.franchiseeEmail}
                        onChange={(e) => setNewProject({ ...newProject, franchiseeEmail: e.target.value })}
                        data-testid="input-franchisee-email"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} data-testid="button-cancel-create">
                İptal
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-submit-create">
                {createMutation.isPending ? "Oluşturuluyor..." : "Proje Oluştur"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {projects?.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Henüz Şube Projesi Yok</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Yeni bir franchise açılış projesi oluşturarak başlayın
            </p>
            <Button onClick={() => setIsCreateOpen(true)} data-testid="button-empty-create">
              <Plus className="h-4 w-4 mr-2" />
              İlk Projeyi Oluştur
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects?.map((project) => {
            const statusConfig = projectStatusConfig[project.status || "planning"];
            
            return (
              <Card 
                key={project.id} 
                className="hover-elevate cursor-pointer transition-all"
                data-testid={`card-project-${project.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base line-clamp-1" data-testid={`text-project-title-${project.id}`}>
                        {project.title}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        <span className="line-clamp-1" data-testid={`text-project-location-${project.id}`}>
                          {project.cityName || "Konum belirtilmedi"}
                        </span>
                      </CardDescription>
                    </div>
                    <Badge className={`${statusConfig.color} text-white shrink-0`} data-testid={`badge-project-status-${project.id}`}>
                      {statusConfig.label}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">İlerleme</span>
                      <span className="font-medium" data-testid={`text-project-progress-${project.id}`}>
                        {project.overallProgress}%
                      </span>
                    </div>
                    <Progress value={project.overallProgress} className="h-2" data-testid={`progress-project-${project.id}`} />
                    <div className="text-xs text-muted-foreground">
                      {project.completedPhases} / {project.totalPhases} faz tamamlandı
                    </div>
                  </div>

                  <PhaseSwimlanesPreview phases={project.phases || []} />

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span data-testid={`text-target-date-${project.id}`}>
                        {project.targetOpeningDate 
                          ? format(new Date(project.targetOpeningDate), "d MMM yyyy", { locale: tr })
                          : "Belirlenmedi"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Wallet className="h-4 w-4" />
                      <span data-testid={`text-budget-${project.id}`}>
                        {formatCurrency(project.estimatedBudget)}
                      </span>
                    </div>
                  </div>

                  {project.franchiseeName && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span data-testid={`text-franchisee-${project.id}`}>{project.franchiseeName}</span>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                    Aktif Faz: <span className="font-medium">{project.currentPhase}</span>
                  </div>
                </CardContent>

                <CardFooter className="border-t pt-3 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => navigate(`/yeni-sube-detay/${project.id}`)}
                    data-testid={`button-view-project-${project.id}`}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Görüntüle
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteProjectId(project.id);
                    }}
                    data-testid={`button-delete-project-${project.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteProjectId} onOpenChange={() => setDeleteProjectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Projeyi Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu şube açılış projesini silmek istediğinizden emin misiniz? 
              Tüm fazlar, bütçe bilgileri ve notlar da silinecektir.
              Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">İptal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteProjectId && deleteMutation.mutate(deleteProjectId)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Siliniyor..." : "Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
