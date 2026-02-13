import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListSkeleton } from "@/components/list-skeleton";
import { EmptyState } from "@/components/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Store, Plus, CheckCircle2, Clock, AlertCircle,
  FileText, ArrowLeft, Users, CalendarDays, MapPin,
  Phone, Mail, ChevronRight, Wrench, GraduationCap,
  Building2, ClipboardCheck, AlertTriangle, UserPlus,
  Briefcase, Send, MessageSquare, Loader2, Target,
  CheckCircle, Circle, ArrowRight
} from "lucide-react";

const CreateProjectSchema = z.object({
  name: z.string().min(1, "Proje adi gerekli"),
  franchiseeName: z.string().min(1, "Franchise sahibi adi gerekli"),
  contactPerson: z.string().min(1, "Iletisim kisisi gerekli"),
  contactPhone: z.string().min(1, "Telefon gerekli"),
  contactEmail: z.string().email("Gecerli email girin"),
  location: z.string().optional(),
  city: z.string().optional(),
  estimatedBudget: z.string().optional(),
  startDate: z.string().optional(),
  expectedEndDate: z.string().optional(),
  notes: z.string().optional(),
});
type CreateProjectValues = z.infer<typeof CreateProjectSchema>;

const CreateTaskSchema = z.object({
  title: z.string().min(1, "Gorev adi gerekli"),
  description: z.string().optional(),
  priority: z.string().default("normal"),
  assignedToUserId: z.string().optional(),
  assignedToCollaboratorId: z.coerce.number().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});
type CreateTaskValues = z.infer<typeof CreateTaskSchema>;

const CreateCollaboratorSchema = z.object({
  name: z.string().min(1, "Ad Soyad gerekli"),
  role: z.string().min(1, "Rol gerekli"),
  company: z.string().optional(),
  email: z.string().email("Gecerli email girin").optional().or(z.literal("")),
  phone: z.string().optional(),
  specialty: z.string().optional(),
  notes: z.string().optional(),
});
type CreateCollaboratorValues = z.infer<typeof CreateCollaboratorSchema>;

interface FranchiseProjectData {
  id: number;
  name: string;
  franchiseeName: string;
  contactPerson: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  location: string | null;
  city: string | null;
  status: string;
  currentPhase: number | null;
  totalPhases: number | null;
  completionPercentage: number | null;
  estimatedBudget: string | null;
  actualBudget: string | null;
  startDate: string | null;
  expectedEndDate: string | null;
  actualEndDate: string | null;
  branchId: number | null;
  managerId: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface PhaseData {
  id: number;
  projectId: number;
  phaseNumber: number;
  name: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  completionPercentage: number | null;
  dependsOnPhaseId: number | null;
}

interface TaskData {
  id: number;
  projectId: number;
  phaseId: number;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  assignedToUserId: string | null;
  assignedToCollaboratorId: number | null;
  dueDate: string | null;
  completedAt: string | null;
  notes: string | null;
}

interface CollaboratorData {
  id: number;
  projectId: number;
  name: string;
  role: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  specialty: string | null;
  isActive: boolean;
}

interface CommentData {
  id: number;
  projectId: number;
  taskId: number | null;
  authorUserId: string | null;
  authorCollaboratorId: number | null;
  content: string;
  createdAt: string;
}

interface ProjectDetailData extends FranchiseProjectData {
  phases: PhaseData[];
  tasks: TaskData[];
  collaborators: CollaboratorData[];
  comments: CommentData[];
  users: Array<{ id: string; firstName: string | null; lastName: string | null; username: string | null; role: string; profileImageUrl: string | null }>;
}

function getPhaseIcon(phaseNumber: number) {
  const icons: Record<number, any> = {
    1: <FileText className="w-4 h-4" />,
    2: <MapPin className="w-4 h-4" />,
    3: <Building2 className="w-4 h-4" />,
    4: <Wrench className="w-4 h-4" />,
    5: <ClipboardCheck className="w-4 h-4" />,
    6: <GraduationCap className="w-4 h-4" />,
    7: <Store className="w-4 h-4" />,
  };
  return icons[phaseNumber] || <Circle className="w-4 h-4" />;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "completed": return <Badge variant="default">Tamamlandi</Badge>;
    case "in_progress": return <Badge variant="secondary">Devam Ediyor</Badge>;
    case "pending": return <Badge variant="outline">Bekliyor</Badge>;
    case "blocked": return <Badge variant="destructive">Engellendi</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

function getPriorityBadge(priority: string | null) {
  switch (priority) {
    case "critical": return <Badge variant="destructive">Kritik</Badge>;
    case "high": return <Badge variant="secondary">Yuksek</Badge>;
    case "normal": return <Badge variant="outline">Normal</Badge>;
    case "low": return <Badge variant="outline">Dusuk</Badge>;
    default: return null;
  }
}

function ProjectList({ onSelectProject }: { onSelectProject: (id: number) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const isHQ = user?.role && isHQRole(user.role as any);

  const { data: projects, isLoading } = useQuery<FranchiseProjectData[]>({
    queryKey: ["/api/franchise-projects"],
  });

  const form = useForm<CreateProjectValues>({
    resolver: zodResolver(CreateProjectSchema),
    defaultValues: { name: "", franchiseeName: "", contactPerson: "", contactPhone: "", contactEmail: "", location: "", city: "", estimatedBudget: "", startDate: "", expectedEndDate: "", notes: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateProjectValues) => {
      await apiRequest("POST", "/api/franchise-projects", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/franchise-projects"] });
      toast({ title: "Basarili", description: "Franchise projesi olusturuldu" });
      setIsCreateOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) return <ListSkeleton count={3} variant="card" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" data-testid="heading-franchise">
            <Store className="w-6 h-6 text-primary" />
            Franchise Acilis Yonetimi
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Yeni sube acilis projelerini takip edin</p>
        </div>
        {isHQ && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-project"><Plus className="w-4 h-4 mr-2" />Yeni Proje</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Yeni Franchise Acilis Projesi</DialogTitle>
                <DialogDescription>Sozlesmeden acilisa kadar tum sureci takip edin</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-3">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Proje Adi</FormLabel><FormControl><Input {...field} placeholder="DOSPRESSO Kadikoy" data-testid="input-project-name" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="franchiseeName" render={({ field }) => (
                    <FormItem><FormLabel>Franchise Sahibi</FormLabel><FormControl><Input {...field} placeholder="Ad Soyad" data-testid="input-franchisee" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="contactPerson" render={({ field }) => (
                      <FormItem><FormLabel>Iletisim Kisisi</FormLabel><FormControl><Input {...field} placeholder="Ad Soyad" data-testid="input-contact" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="contactPhone" render={({ field }) => (
                      <FormItem><FormLabel>Telefon</FormLabel><FormControl><Input {...field} placeholder="0555 123 45 67" data-testid="input-phone" /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="contactEmail" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} type="email" placeholder="ornek@email.com" data-testid="input-email" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="location" render={({ field }) => (
                      <FormItem><FormLabel>Lokasyon</FormLabel><FormControl><Input {...field} placeholder="Adres" data-testid="input-location" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="city" render={({ field }) => (
                      <FormItem><FormLabel>Sehir</FormLabel><FormControl><Input {...field} placeholder="Istanbul" data-testid="input-city" /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="startDate" render={({ field }) => (
                      <FormItem><FormLabel>Baslangic Tarihi</FormLabel><FormControl><Input type="date" {...field} data-testid="input-start-date" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="expectedEndDate" render={({ field }) => (
                      <FormItem><FormLabel>Hedef Acilis Tarihi</FormLabel><FormControl><Input type="date" {...field} data-testid="input-end-date" /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="estimatedBudget" render={({ field }) => (
                    <FormItem><FormLabel>Tahmini Butce (TL)</FormLabel><FormControl><Input {...field} placeholder="500000" data-testid="input-budget" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem><FormLabel>Notlar</FormLabel><FormControl><Textarea {...field} placeholder="Onemli notlar..." rows={2} data-testid="textarea-notes" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Iptal</Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-project">
                      {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                      Olustur
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!projects || projects.length === 0 ? (
        <EmptyState
          icon={Store}
          title="Acilis projesi yok"
          description="Henuz bir franchise acilis projesi baslatilmamis."
          actionLabel={isHQ ? "Ilk Projeyi Baslat" : undefined}
          onAction={isHQ ? () => setIsCreateOpen(true) : undefined}
        />
      ) : (
        <div className="grid gap-3">
          {projects.map((p) => (
            <Card key={p.id} className="hover-elevate cursor-pointer" onClick={() => onSelectProject(p.id)} data-testid={`card-project-${p.id}`}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Store className="w-5 h-5 text-primary shrink-0" />
                      <h3 className="font-semibold text-sm" data-testid={`text-project-name-${p.id}`}>{p.name}</h3>
                      {getStatusBadge(p.status)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{p.franchiseeName} {p.city && `- ${p.city}`}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Faz {p.currentPhase || 1}/{p.totalPhases || 7}</span>
                    <span className="font-medium">{p.completionPercentage || 0}%</span>
                  </div>
                  <Progress value={p.completionPercentage || 0} className="h-2" />
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {p.startDate && <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{format(new Date(p.startDate), "dd.MM.yyyy")}</span>}
                    {p.expectedEndDate && <span className="flex items-center gap-1"><Target className="w-3 h-3" />{format(new Date(p.expectedEndDate), "dd.MM.yyyy")}</span>}
                    {p.contactPerson && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{p.contactPerson}</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectDetail({ projectId, onBack }: { projectId: number; onBack: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isCollabDialogOpen, setIsCollabDialogOpen] = useState(false);
  const [selectedPhaseId, setSelectedPhaseId] = useState<number | null>(null);
  const [newComment, setNewComment] = useState("");

  const isHQ = user?.role && isHQRole(user.role as any);

  const { data: project, isLoading } = useQuery<ProjectDetailData>({
    queryKey: ["/api/franchise-projects", projectId],
  });

  const taskForm = useForm<CreateTaskValues>({
    resolver: zodResolver(CreateTaskSchema),
    defaultValues: { title: "", description: "", priority: "normal", assignedToUserId: "", dueDate: "", notes: "" },
  });

  const collabForm = useForm<CreateCollaboratorValues>({
    resolver: zodResolver(CreateCollaboratorSchema),
    defaultValues: { name: "", role: "", company: "", email: "", phone: "", specialty: "", notes: "" },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: CreateTaskValues) => {
      if (!selectedPhaseId) throw new Error("Faz secimi gerekli");
      await apiRequest("POST", "/api/franchise-project-tasks", { ...data, projectId, phaseId: selectedPhaseId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/franchise-projects", projectId] });
      toast({ title: "Basarili", description: "Gorev eklendi" });
      setIsTaskDialogOpen(false);
      taskForm.reset();
    },
    onError: (error) => toast({ title: "Hata", description: error.message, variant: "destructive" }),
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: number; updates: any }) => {
      await apiRequest("PATCH", `/api/franchise-project-tasks/${taskId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/franchise-projects", projectId] });
    },
  });

  const updatePhaseMutation = useMutation({
    mutationFn: async ({ phaseId, updates }: { phaseId: number; updates: any }) => {
      await apiRequest("PATCH", `/api/franchise-project-phases/${phaseId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/franchise-projects", projectId] });
      toast({ title: "Faz guncellendi" });
    },
  });

  const createCollabMutation = useMutation({
    mutationFn: async (data: CreateCollaboratorValues) => {
      await apiRequest("POST", "/api/franchise-collaborators", { ...data, projectId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/franchise-projects", projectId] });
      toast({ title: "Basarili", description: "Dis paydas eklendi" });
      setIsCollabDialogOpen(false);
      collabForm.reset();
    },
    onError: (error) => toast({ title: "Hata", description: error.message, variant: "destructive" }),
  });

  const removeCollabMutation = useMutation({
    mutationFn: async (collabId: number) => {
      await apiRequest("DELETE", `/api/franchise-collaborators/${collabId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/franchise-projects", projectId] });
      toast({ title: "Paydas cikarildi" });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/franchise-project-comments", { projectId, content: newComment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/franchise-projects", projectId] });
      setNewComment("");
      toast({ title: "Yorum eklendi" });
    },
  });

  if (isLoading) return <ListSkeleton count={4} variant="card" />;
  if (!project) return <EmptyState icon={AlertCircle} title="Proje bulunamadi" description="Bu proje mevcut degil veya erisim yetkiniz yok" />;

  const getUserName = (userId: string | null) => {
    if (!userId) return "Atanmamis";
    const u = project.users?.find(u => u.id === userId);
    return u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || "Bilinmiyor" : "Bilinmiyor";
  };

  const getCollabName = (collabId: number | null) => {
    if (!collabId) return null;
    const c = project.collaborators?.find(c => c.id === collabId);
    return c?.name || null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="icon" onClick={onBack} data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate" data-testid="text-project-title">{project.name}</h1>
          <p className="text-xs text-muted-foreground">{project.franchiseeName} {project.city && `- ${project.city}`}</p>
        </div>
        {getStatusBadge(project.status)}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card data-testid="card-progress">
          <CardContent className="pt-3 pb-2 px-3 text-center">
            <p className="text-xs text-muted-foreground">Ilerleme</p>
            <p className="text-xl font-bold text-primary">{project.completionPercentage || 0}%</p>
          </CardContent>
        </Card>
        <Card data-testid="card-phase">
          <CardContent className="pt-3 pb-2 px-3 text-center">
            <p className="text-xs text-muted-foreground">Aktif Faz</p>
            <p className="text-xl font-bold">{project.currentPhase || 1}/{project.totalPhases || 7}</p>
          </CardContent>
        </Card>
        <Card data-testid="card-tasks-count">
          <CardContent className="pt-3 pb-2 px-3 text-center">
            <p className="text-xs text-muted-foreground">Gorevler</p>
            <p className="text-xl font-bold">{project.tasks?.filter(t => t.status === 'completed').length || 0}/{project.tasks?.length || 0}</p>
          </CardContent>
        </Card>
        <Card data-testid="card-team-count">
          <CardContent className="pt-3 pb-2 px-3 text-center">
            <p className="text-xs text-muted-foreground">Ekip</p>
            <p className="text-xl font-bold">{project.collaborators?.filter(c => c.isActive).length || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="phases" className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="phases" className="text-xs" data-testid="tab-phases">
            <ClipboardCheck className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">Fazlar</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs" data-testid="tab-tasks">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">Gorevler</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="text-xs" data-testid="tab-team">
            <Users className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">Ekip</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs" data-testid="tab-activity">
            <MessageSquare className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">Aktivite</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="phases" className="mt-4">
          <div className="space-y-3">
            {project.phases?.sort((a, b) => a.phaseNumber - b.phaseNumber).map((phase) => {
              const phaseTasks = project.tasks?.filter(t => t.phaseId === phase.id) || [];
              const completedTasks = phaseTasks.filter(t => t.status === 'completed');
              const phaseProgress = phaseTasks.length > 0 ? Math.round((completedTasks.length / phaseTasks.length) * 100) : phase.completionPercentage || 0;
              const isActive = phase.status === 'in_progress';
              const isPending = phase.status === 'pending';
              const isCompleted = phase.status === 'completed';

              return (
                <Card key={phase.id} className={`${isActive ? 'border-primary/50' : ''}`} data-testid={`card-phase-${phase.id}`}>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`p-1.5 rounded ${isCompleted ? 'bg-green-500/10 text-green-600' : isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {isCompleted ? <CheckCircle className="w-4 h-4" /> : getPhaseIcon(phase.phaseNumber)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm">Faz {phase.phaseNumber}: {phase.name}</p>
                          {phase.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{phase.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {getStatusBadge(phase.status)}
                        {isHQ && isPending && (
                          <Button size="sm" variant="outline" onClick={() => updatePhaseMutation.mutate({ phaseId: phase.id, updates: { status: 'in_progress', actualStartDate: new Date().toISOString().split('T')[0] } })} data-testid={`button-start-phase-${phase.id}`}>
                            Baslat
                          </Button>
                        )}
                        {isHQ && isActive && (
                          <Button size="sm" onClick={() => updatePhaseMutation.mutate({ phaseId: phase.id, updates: { status: 'completed', completionPercentage: 100, actualEndDate: new Date().toISOString().split('T')[0] } })} data-testid={`button-complete-phase-${phase.id}`}>
                            Tamamla
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{completedTasks.length}/{phaseTasks.length} gorev tamamlandi</span>
                        <span className="font-medium">{phaseProgress}%</span>
                      </div>
                      <Progress value={phaseProgress} className="h-1.5" />
                    </div>
                    {phaseTasks.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {phaseTasks.slice(0, 3).map(task => (
                          <div key={task.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted/30">
                            {task.status === 'completed' ? <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" /> : <Circle className="w-3 h-3 text-muted-foreground shrink-0" />}
                            <span className={`flex-1 truncate ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</span>
                            {task.assignedToUserId && <span className="text-muted-foreground shrink-0">{getUserName(task.assignedToUserId)}</span>}
                            {task.assignedToCollaboratorId && <Badge variant="outline" className="text-[10px] shrink-0">{getCollabName(task.assignedToCollaboratorId)}</Badge>}
                          </div>
                        ))}
                        {phaseTasks.length > 3 && <p className="text-xs text-muted-foreground pl-6">+{phaseTasks.length - 3} daha...</p>}
                      </div>
                    )}
                    {isHQ && isActive && (
                      <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => { setSelectedPhaseId(phase.id); setIsTaskDialogOpen(true); }} data-testid={`button-add-task-${phase.id}`}>
                        <Plus className="w-3 h-3 mr-1" />Gorev Ekle
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <div className="space-y-3">
            {(!project.tasks || project.tasks.length === 0) ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Henuz gorev eklenmemis</CardContent></Card>
            ) : (
              project.tasks.map(task => {
                const phase = project.phases?.find(p => p.id === task.phaseId);
                return (
                  <Card key={task.id} data-testid={`card-task-${task.id}`}>
                    <CardContent className="pt-3 pb-2 px-4">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          {task.status === 'completed' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          ) : (
                            <button onClick={() => updateTaskMutation.mutate({ taskId: task.id, updates: { status: 'completed' } })} className="mt-0.5 shrink-0" data-testid={`button-complete-task-${task.id}`}>
                              <Circle className="w-4 h-4 text-muted-foreground hover:text-primary" />
                            </button>
                          )}
                          <div className="min-w-0">
                            <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                              {phase && <span className="text-[10px] text-muted-foreground">Faz {phase.phaseNumber}</span>}
                              {task.dueDate && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><CalendarDays className="w-2.5 h-2.5" />{format(new Date(task.dueDate), "dd.MM.yyyy")}</span>}
                              {task.assignedToUserId && <span className="text-[10px] text-muted-foreground">{getUserName(task.assignedToUserId)}</span>}
                              {task.assignedToCollaboratorId && <Badge variant="outline" className="text-[10px]">{getCollabName(task.assignedToCollaboratorId)}</Badge>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {getPriorityBadge(task.priority)}
                          {getStatusBadge(task.status)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold" data-testid="heading-team">Dis Paydas ve Ekip Uyeleri</h3>
              {isHQ && (
                <Dialog open={isCollabDialogOpen} onOpenChange={setIsCollabDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-add-collaborator"><UserPlus className="w-4 h-4 mr-1" />Paydas Ekle</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Dis Paydas Ekle</DialogTitle>
                      <DialogDescription>Mimar, usta, muteahhit gibi dis ekip uyelerini projeye dahil edin</DialogDescription>
                    </DialogHeader>
                    <Form {...collabForm}>
                      <form onSubmit={collabForm.handleSubmit((data) => createCollabMutation.mutate(data))} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <FormField control={collabForm.control} name="name" render={({ field }) => (
                            <FormItem><FormLabel>Ad Soyad</FormLabel><FormControl><Input {...field} placeholder="Ahmet Yilmaz" data-testid="input-collab-name" /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={collabForm.control} name="role" render={({ field }) => (
                            <FormItem><FormLabel>Rol</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger data-testid="select-collab-role"><SelectValue placeholder="Rol secin" /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="mimar">Mimar</SelectItem>
                                  <SelectItem value="muteahhit">Muteahhit</SelectItem>
                                  <SelectItem value="usta">Usta</SelectItem>
                                  <SelectItem value="elektrikci">Elektrikci</SelectItem>
                                  <SelectItem value="tesisatci">Tesisatci</SelectItem>
                                  <SelectItem value="dekoratör">Dekorator</SelectItem>
                                  <SelectItem value="mobilyaci">Mobilyaci</SelectItem>
                                  <SelectItem value="ekipman_tedarikci">Ekipman Tedarikci</SelectItem>
                                  <SelectItem value="avukat">Avukat</SelectItem>
                                  <SelectItem value="diger">Diger</SelectItem>
                                </SelectContent>
                              </Select>
                            <FormMessage /></FormItem>
                          )} />
                        </div>
                        <FormField control={collabForm.control} name="company" render={({ field }) => (
                          <FormItem><FormLabel>Sirket</FormLabel><FormControl><Input {...field} placeholder="Sirket adi" data-testid="input-collab-company" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-3">
                          <FormField control={collabForm.control} name="email" render={({ field }) => (
                            <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} type="email" placeholder="email@sirket.com" data-testid="input-collab-email" /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={collabForm.control} name="phone" render={({ field }) => (
                            <FormItem><FormLabel>Telefon</FormLabel><FormControl><Input {...field} placeholder="0555 123 45 67" data-testid="input-collab-phone" /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                        <FormField control={collabForm.control} name="specialty" render={({ field }) => (
                          <FormItem><FormLabel>Uzmanlik Alani</FormLabel><FormControl><Input {...field} placeholder="Orn: Ic mekan tasarim, elektrik tesisat..." data-testid="input-collab-specialty" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setIsCollabDialogOpen(false)}>Iptal</Button>
                          <Button type="submit" disabled={createCollabMutation.isPending} data-testid="button-submit-collaborator">
                            {createCollabMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <UserPlus className="w-4 h-4 mr-1" />}
                            Ekle
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {(!project.collaborators || project.collaborators.filter(c => c.isActive).length === 0) ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Henuz dis paydas eklenmemis</CardContent></Card>
            ) : (
              <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                {project.collaborators.filter(c => c.isActive).map(collab => (
                  <Card key={collab.id} data-testid={`card-collaborator-${collab.id}`}>
                    <CardContent className="pt-3 pb-2 px-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-xs">{collab.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate" data-testid={`text-collab-name-${collab.id}`}>{collab.name}</p>
                              <div className="flex items-center gap-1 flex-wrap">
                                <Badge variant="outline" className="text-[10px]">{collab.role}</Badge>
                                {collab.company && <span className="text-[10px] text-muted-foreground">{collab.company}</span>}
                              </div>
                            </div>
                            {isHQ && (
                              <Button variant="outline" size="sm" onClick={() => removeCollabMutation.mutate(collab.id)} data-testid={`button-remove-collab-${collab.id}`}>
                                Cikar
                              </Button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-muted-foreground">
                            {collab.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{collab.phone}</span>}
                            {collab.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{collab.email}</span>}
                            {collab.specialty && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{collab.specialty}</span>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {project.contactPerson && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Franchise Sahibi Iletisim</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p className="flex items-center gap-2"><Users className="w-4 h-4 text-muted-foreground" />{project.contactPerson}</p>
                  {project.contactPhone && <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" />{project.contactPhone}</p>}
                  {project.contactEmail && <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" />{project.contactEmail}</p>}
                  {project.location && <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" />{project.location}</p>}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <div className="space-y-3">
            {isHQ && (
              <Card>
                <CardContent className="pt-3 pb-2 px-4">
                  <div className="flex gap-2">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Yorum veya guncelleme yazin..."
                      className="flex-1"
                      rows={2}
                      data-testid="textarea-comment"
                    />
                    <Button
                      size="icon"
                      onClick={() => addCommentMutation.mutate()}
                      disabled={!newComment.trim() || addCommentMutation.isPending}
                      data-testid="button-send-comment"
                    >
                      {addCommentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {(!project.comments || project.comments.length === 0) ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Henuz aktivite yok</CardContent></Card>
            ) : (
              project.comments.map(comment => (
                <Card key={comment.id} data-testid={`card-comment-${comment.id}`}>
                  <CardContent className="pt-3 pb-2 px-4">
                    <div className="flex items-start gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-[10px]">
                          {comment.authorUserId ? getUserName(comment.authorUserId).split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium">{comment.authorUserId ? getUserName(comment.authorUserId) : 'Anonim'}</span>
                          <span className="text-[10px] text-muted-foreground">{format(new Date(comment.createdAt), "dd.MM.yyyy HH:mm")}</span>
                        </div>
                        <p className="text-sm mt-0.5">{comment.content}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gorev Ekle</DialogTitle>
            <DialogDescription>Bu faza yeni bir gorev atayin</DialogDescription>
          </DialogHeader>
          <Form {...taskForm}>
            <form onSubmit={taskForm.handleSubmit((data) => createTaskMutation.mutate(data))} className="space-y-3">
              <FormField control={taskForm.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Gorev Adi</FormLabel><FormControl><Input {...field} placeholder="Orn: Mimari proje cizimi" data-testid="input-task-title" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={taskForm.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Aciklama</FormLabel><FormControl><Textarea {...field} placeholder="Gorev detaylari..." rows={2} data-testid="textarea-task-desc" /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={taskForm.control} name="priority" render={({ field }) => (
                  <FormItem><FormLabel>Oncelik</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-priority"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="low">Dusuk</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">Yuksek</SelectItem>
                        <SelectItem value="critical">Kritik</SelectItem>
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
                <FormField control={taskForm.control} name="dueDate" render={({ field }) => (
                  <FormItem><FormLabel>Teslim Tarihi</FormLabel><FormControl><Input type="date" {...field} data-testid="input-task-due" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={taskForm.control} name="assignedToUserId" render={({ field }) => (
                <FormItem><FormLabel>Atanan Kisi (HQ)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger data-testid="select-assignee"><SelectValue placeholder="Kisi secin" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="">Atanmamis</SelectItem>
                      {project.users?.filter(u => ['admin', 'cgo', 'muhasebe_ik', 'satinalma', 'coach', 'marketing', 'trainer', 'kalite_kontrol', 'fabrika_mudur'].includes(u.role)).map(u => (
                        <SelectItem key={u.id} value={u.id}>{`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                <FormMessage /></FormItem>
              )} />
              {project.collaborators && project.collaborators.filter(c => c.isActive).length > 0 && (
                <FormField control={taskForm.control} name="assignedToCollaboratorId" render={({ field }) => (
                  <FormItem><FormLabel>Atanan Dis Paydas</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v ? parseInt(v) : undefined)} value={field.value?.toString()}>
                      <FormControl><SelectTrigger data-testid="select-collaborator-assign"><SelectValue placeholder="Paydas secin" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="">Yok</SelectItem>
                        {project.collaborators.filter(c => c.isActive).map(c => (
                          <SelectItem key={c.id} value={c.id.toString()}>{c.name} ({c.role})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsTaskDialogOpen(false)}>Iptal</Button>
                <Button type="submit" disabled={createTaskMutation.isPending} data-testid="button-submit-task">
                  {createTaskMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                  Ekle
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function FranchiseAcilis() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  return (
    <div className="p-3 flex flex-col gap-3 sm:gap-4">
      {selectedProjectId ? (
        <ProjectDetail projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} />
      ) : (
        <ProjectList onSelectProject={setSelectedProjectId} />
      )}
    </div>
  );
}
