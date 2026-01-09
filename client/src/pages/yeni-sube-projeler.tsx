import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListSkeleton } from "@/components/list-skeleton";
import { EmptyState } from "@/components/empty-state";
import { Progress } from "@/components/ui/progress";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
  Clock,
  CheckCircle2,
  Ban,
  User
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { Project, ProjectPhase, Branch } from "@shared/schema";

const createProjectSchema = z.object({
  title: z.string().min(1, "Proje adı zorunludur"),
  cityName: z.string().min(1, "Şehir adı zorunludur"),
  locationAddress: z.string().optional(),
  targetOpeningDate: z.string().optional(),
  estimatedBudget: z.string().optional(),
  franchiseeName: z.string().optional(),
  franchiseePhone: z.string().optional(),
  franchiseeEmail: z.string().email("Geçerli bir e-posta adresi giriniz").optional().or(z.literal("")),
  branchId: z.string().optional(),
});

type CreateProjectFormValues = z.infer<typeof createProjectSchema>;

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
      {phases.map((phase) => {
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

  const form = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      title: "",
      cityName: "",
      locationAddress: "",
      targetOpeningDate: "",
      estimatedBudget: "",
      franchiseeName: "",
      franchiseePhone: "",
      franchiseeEmail: "",
      branchId: "",
    },
  });

  const { data: projects, isLoading } = useQuery<NewShopProjectWithDetails[]>({
    queryKey: ["/api/new-shop-projects"],
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateProjectFormValues) => {
      const payload = {
        title: data.title,
        cityName: data.cityName,
        locationAddress: data.locationAddress || undefined,
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
      form.reset();
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

  const onSubmit = (data: CreateProjectFormValues) => {
    createMutation.mutate(data);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsCreateOpen(open);
    if (!open) {
      form.reset();
    }
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
        <ListSkeleton count={6} variant="card" showHeader data-testid="loading-projects" />
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
        
        <Dialog open={isCreateOpen} onOpenChange={handleDialogOpenChange}>
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
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proje Adı *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Örn: DOSPRESSO Kadıköy"
                          data-testid="input-title"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cityName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Şehir *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="İstanbul"
                            data-testid="input-city"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="branchId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mevcut Şube (İsteğe Bağlı)</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-branch">
                              <SelectValue placeholder="Şube seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {branches?.map((branch) => (
                              <SelectItem 
                                key={branch.id} 
                                value={branch.id.toString()}
                                data-testid={`select-branch-option-${branch.id}`}
                              >
                                {branch.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="locationAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adres</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Tam adres"
                          data-testid="input-address"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="targetOpeningDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hedef Açılış Tarihi</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            data-testid="input-target-date"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="estimatedBudget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tahmini Bütçe (₺)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="1500000"
                            data-testid="input-budget"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-medium mb-3">Franchise Sahibi Bilgileri</h4>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="franchiseeName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Franchise Sahibi Adı</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ad Soyad"
                              data-testid="input-owner-name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="franchiseePhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefon</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="+90 5XX XXX XX XX"
                                data-testid="input-owner-phone"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="franchiseeEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E-posta</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="email@example.com"
                                data-testid="input-owner-email"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter className="pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => handleDialogOpenChange(false)} 
                    data-testid="button-cancel-create"
                  >
                    İptal
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending} 
                    data-testid="button-submit-project"
                  >
                    {createMutation.isPending ? "Oluşturuluyor..." : "Proje Oluştur"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {projects?.length === 0 ? (
        <Card className="py-12" data-testid="card-empty-state">
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
                    <div className="text-xs text-muted-foreground" data-testid={`text-phases-completed-${project.id}`}>
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

                  <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1" data-testid={`text-active-phase-${project.id}`}>
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
        <AlertDialogContent data-testid="dialog-delete-confirm">
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
