import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  ArrowLeft,
  Plus,
  Calendar,
  MapPin,
  Building2,
  FileSignature,
  Hammer,
  Coffee,
  Wallet,
  Users,
  GraduationCap,
  CheckCircle2,
  Clock,
  Ban,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Phone,
  Mail,
  Edit2,
  Trash2,
  Eye,
  Target,
  ShieldAlert,
  Activity,
  ChevronDown,
  ChevronUp,
  Store,
  DollarSign,
  Truck,
  FileWarning,
  LayoutList
} from "lucide-react";
import type { ProjectPhase, ProjectBudgetLine, ProjectVendor, ProjectRisk } from "@shared/schema";

interface ProjectWithDetails {
  id: number;
  title: string;
  cityName: string;
  locationAddress?: string;
  status: string;
  targetOpeningDate?: string;
  estimatedBudget?: number;
  franchiseeName?: string;
  franchiseePhone?: string;
  franchiseeEmail?: string;
  createdAt: string;
  phases: ProjectPhase[];
  budgetLines: ProjectBudgetLine[];
  vendors: ProjectVendor[];
  risks: ProjectRisk[];
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
  };
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

const budgetCategoryLabels: Record<string, string> = {
  franchise_fee: "Franchise Ücreti",
  rent_deposit: "Kira & Depozito",
  construction: "İnşaat",
  decoration: "Dekorasyon",
  furniture: "Mobilya",
  equipment: "Ekipman",
  signage: "Tabela & Reklam",
  permits: "İzin & Ruhsat",
  staffing: "Personel",
  training: "Eğitim",
  marketing: "Pazarlama",
  inventory: "Stok",
  contingency: "Beklenmedik Giderler",
  other: "Diğer",
};

const vendorTypeLabels: Record<string, string> = {
  contractor: "Müteahhit",
  architect: "Mimar",
  interior_designer: "İç Mimar",
  furniture_supplier: "Mobilya Tedarikçisi",
  equipment_supplier: "Ekipman Tedarikçisi",
  signage_company: "Tabela Firması",
  marketing_agency: "Reklam Ajansı",
  legal_advisor: "Hukuk Danışmanı",
  accountant: "Mali Müşavir",
  consultant: "Danışman",
  other: "Diğer",
};

const riskStatusLabels: Record<string, { label: string; color: string }> = {
  identified: { label: "Belirlendi", color: "bg-yellow-500" },
  mitigating: { label: "Azaltılıyor", color: "bg-blue-500" },
  resolved: { label: "Çözüldü", color: "bg-green-500" },
  occurred: { label: "Gerçekleşti", color: "bg-red-500" },
};

function formatCurrency(amount: number | null | undefined): string {
  if (!amount) return "₺0";
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(amount);
}

function PhaseCard({ phase, onEdit }: { phase: ProjectPhase; onEdit: (phase: ProjectPhase) => void }) {
  const Icon = phaseIcons[phase.phaseType as string] || Building2;
  const statusConfig = phaseStatusConfig[phase.status || "not_started"];
  const StatusIcon = phase.status === "completed" ? CheckCircle2 : 
                     phase.status === "in_progress" ? Clock : 
                     phase.status === "blocked" ? Ban : Clock;

  return (
    <Card 
      className="cursor-pointer hover-elevate transition-all"
      onClick={() => onEdit(phase)}
      data-testid={`phase-card-${phase.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: phase.colorHex || "#6366f1" }}
          >
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{phase.title}</h4>
            <Badge variant="outline" className={`${statusConfig.color} text-xs gap-1 mt-1`}>
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </Badge>
          </div>
        </div>
        
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>İlerleme</span>
            <span className="font-medium">{phase.progress || 0}%</span>
          </div>
          <Progress value={phase.progress || 0} className="h-2" />
        </div>

        {phase.targetDate && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{format(new Date(phase.targetDate), "d MMM yyyy", { locale: tr })}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RiskScoreBadge({ probability, impact }: { probability: number; impact: number }) {
  const score = probability * impact;
  let color = "bg-green-500";
  let label = "Düşük";
  
  if (score > 15) {
    color = "bg-red-500";
    label = "Kritik";
  } else if (score > 9) {
    color = "bg-orange-500";
    label = "Yüksek";
  } else if (score > 4) {
    color = "bg-yellow-500";
    label = "Orta";
  }

  return (
    <Badge className={`${color} text-white`}>
      {score} - {label}
    </Badge>
  );
}

export default function YeniSubeDetay() {
  const params = useParams();
  const projectId = params.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [editingPhase, setEditingPhase] = useState<ProjectPhase | null>(null);
  const [isPhaseDialogOpen, setIsPhaseDialogOpen] = useState(false);
  
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<ProjectBudgetLine | null>(null);
  const [budgetForm, setBudgetForm] = useState({
    category: "",
    title: "",
    description: "",
    plannedAmount: "",
    actualAmount: "",
  });

  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<ProjectVendor | null>(null);
  const [vendorForm, setVendorForm] = useState({
    vendorType: "",
    companyName: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    contractStatus: "pending",
    contractAmount: "",
  });
  const [vendorFilter, setVendorFilter] = useState<string>("all");

  const [isRiskDialogOpen, setIsRiskDialogOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<ProjectRisk | null>(null);
  const [riskForm, setRiskForm] = useState({
    title: "",
    description: "",
    probability: "3",
    impact: "3",
    status: "identified",
    mitigationPlan: "",
  });

  const { data: project, isLoading } = useQuery<ProjectWithDetails>({
    queryKey: ["/api/new-shop-projects", projectId],
    enabled: !!projectId,
  });

  const updatePhaseMutation = useMutation({
    mutationFn: async (data: Partial<ProjectPhase> & { id: number }) => {
      const { id, ...updates } = data;
      const res = await apiRequest("PATCH", `/api/project-phases/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/new-shop-projects", projectId] });
      setIsPhaseDialogOpen(false);
      setEditingPhase(null);
      toast({ title: "Faz güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Faz güncellenemedi", variant: "destructive" });
    },
  });

  const addBudgetMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/budget`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/new-shop-projects", projectId] });
      setIsBudgetDialogOpen(false);
      setBudgetForm({ category: "", title: "", description: "", plannedAmount: "", actualAmount: "" });
      toast({ title: "Bütçe kalemi eklendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Bütçe kalemi eklenemedi", variant: "destructive" });
    },
  });

  const updateBudgetMutation = useMutation({
    mutationFn: async (data: any) => {
      const { id, ...updates } = data;
      const res = await apiRequest("PATCH", `/api/budget-lines/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/new-shop-projects", projectId] });
      setIsBudgetDialogOpen(false);
      setEditingBudget(null);
      toast({ title: "Bütçe kalemi güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Bütçe kalemi güncellenemedi", variant: "destructive" });
    },
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/budget-lines/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/new-shop-projects", projectId] });
      toast({ title: "Bütçe kalemi silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Bütçe kalemi silinemedi", variant: "destructive" });
    },
  });

  const addVendorMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/vendors`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/new-shop-projects", projectId] });
      setIsVendorDialogOpen(false);
      setVendorForm({ vendorType: "", companyName: "", contactName: "", contactPhone: "", contactEmail: "", contractStatus: "pending", contractAmount: "" });
      toast({ title: "Tedarikçi eklendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Tedarikçi eklenemedi", variant: "destructive" });
    },
  });

  const updateVendorMutation = useMutation({
    mutationFn: async (data: any) => {
      const { id, ...updates } = data;
      const res = await apiRequest("PATCH", `/api/vendors/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/new-shop-projects", projectId] });
      setIsVendorDialogOpen(false);
      setEditingVendor(null);
      toast({ title: "Tedarikçi güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Tedarikçi güncellenemedi", variant: "destructive" });
    },
  });

  const deleteVendorMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/vendors/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/new-shop-projects", projectId] });
      toast({ title: "Tedarikçi silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Tedarikçi silinemedi", variant: "destructive" });
    },
  });

  const addRiskMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/risks`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/new-shop-projects", projectId] });
      setIsRiskDialogOpen(false);
      setRiskForm({ title: "", description: "", probability: "3", impact: "3", status: "identified", mitigationPlan: "" });
      toast({ title: "Risk eklendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Risk eklenemedi", variant: "destructive" });
    },
  });

  const updateRiskMutation = useMutation({
    mutationFn: async (data: any) => {
      const { id, ...updates } = data;
      const res = await apiRequest("PATCH", `/api/risks/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/new-shop-projects", projectId] });
      setIsRiskDialogOpen(false);
      setEditingRisk(null);
      toast({ title: "Risk güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Risk güncellenemedi", variant: "destructive" });
    },
  });

  const deleteRiskMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/risks/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/new-shop-projects", projectId] });
      toast({ title: "Risk silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Risk silinemedi", variant: "destructive" });
    },
  });

  const handleEditPhase = (phase: ProjectPhase) => {
    setEditingPhase(phase);
    setIsPhaseDialogOpen(true);
  };

  const handleSavePhase = () => {
    if (!editingPhase) return;
    updatePhaseMutation.mutate({
      id: editingPhase.id,
      status: editingPhase.status,
      progress: editingPhase.progress,
      targetDate: editingPhase.targetDate,
    });
  };

  const handleEditBudget = (budget: ProjectBudgetLine) => {
    setEditingBudget(budget);
    setBudgetForm({
      category: budget.category,
      title: budget.title,
      description: budget.description || "",
      plannedAmount: budget.plannedAmount?.toString() || "",
      actualAmount: budget.actualAmount?.toString() || "",
    });
    setIsBudgetDialogOpen(true);
  };

  const handleSaveBudget = () => {
    const data = {
      category: budgetForm.category,
      title: budgetForm.title,
      description: budgetForm.description,
      plannedAmount: parseInt(budgetForm.plannedAmount) || 0,
      actualAmount: parseInt(budgetForm.actualAmount) || 0,
    };

    if (editingBudget) {
      updateBudgetMutation.mutate({ id: editingBudget.id, ...data });
    } else {
      addBudgetMutation.mutate(data);
    }
  };

  const handleEditVendor = (vendor: ProjectVendor) => {
    setEditingVendor(vendor);
    setVendorForm({
      vendorType: vendor.vendorType,
      companyName: vendor.companyName,
      contactName: vendor.contactName || "",
      contactPhone: vendor.contactPhone || "",
      contactEmail: vendor.contactEmail || "",
      contractStatus: vendor.contractStatus || "pending",
      contractAmount: vendor.contractAmount?.toString() || "",
    });
    setIsVendorDialogOpen(true);
  };

  const handleSaveVendor = () => {
    const data = {
      vendorType: vendorForm.vendorType,
      companyName: vendorForm.companyName,
      contactName: vendorForm.contactName,
      contactPhone: vendorForm.contactPhone,
      contactEmail: vendorForm.contactEmail,
      contractStatus: vendorForm.contractStatus,
      contractAmount: parseInt(vendorForm.contractAmount) || undefined,
    };

    if (editingVendor) {
      updateVendorMutation.mutate({ id: editingVendor.id, ...data });
    } else {
      addVendorMutation.mutate(data);
    }
  };

  const handleEditRisk = (risk: ProjectRisk) => {
    setEditingRisk(risk);
    setRiskForm({
      title: risk.title,
      description: risk.description || "",
      probability: risk.probability?.toString() || "3",
      impact: risk.impact?.toString() || "3",
      status: risk.status || "identified",
      mitigationPlan: risk.mitigationPlan || "",
    });
    setIsRiskDialogOpen(true);
  };

  const handleSaveRisk = () => {
    const data = {
      title: riskForm.title,
      description: riskForm.description,
      probability: parseInt(riskForm.probability),
      impact: parseInt(riskForm.impact),
      status: riskForm.status,
      mitigationPlan: riskForm.mitigationPlan,
    };

    if (editingRisk) {
      updateRiskMutation.mutate({ id: editingRisk.id, ...data });
    } else {
      addRiskMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container max-w-6xl mx-auto p-4">
        <Card>
          <CardContent className="p-8 text-center">
            <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Proje Bulunamadı</h2>
            <p className="text-muted-foreground mb-4">Bu proje mevcut değil veya erişim yetkiniz yok.</p>
            <Button onClick={() => navigate("/yeni-sube-projeler")} data-testid="button-back-to-projects">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Projelere Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPlanned = project.budgetLines?.reduce((sum, bl) => sum + (bl.plannedAmount || 0), 0) || 0;
  const totalActual = project.budgetLines?.reduce((sum, bl) => sum + (bl.actualAmount || 0), 0) || 0;
  const totalVariance = totalPlanned - totalActual;
  const overallProgress = project.phases?.length 
    ? Math.round(project.phases.reduce((sum, p) => sum + (p.progress || 0), 0) / project.phases.length)
    : 0;
  const completedPhases = project.phases?.filter(p => p.status === "completed").length || 0;

  const filteredVendors = vendorFilter === "all" 
    ? project.vendors 
    : project.vendors?.filter(v => v.vendorType === vendorFilter);

  const sortedPhases = [...(project.phases || [])].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

  return (
    <div className="container max-w-6xl mx-auto p-4 space-y-4">
      <Button 
        variant="ghost" 
        onClick={() => navigate("/yeni-sube-projeler")}
        className="mb-2"
        data-testid="button-back"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Tüm Projeler
      </Button>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Store className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl" data-testid="text-project-title">{project.title}</CardTitle>
                <Badge className={projectStatusConfig[project.status]?.color || "bg-slate-500"}>
                  {projectStatusConfig[project.status]?.label || project.status}
                </Badge>
              </div>
              <CardDescription className="flex flex-wrap items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {project.cityName}{project.locationAddress && ` - ${project.locationAddress}`}
                </span>
                {project.targetOpeningDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Hedef: {format(new Date(project.targetOpeningDate), "d MMM yyyy", { locale: tr })}
                  </span>
                )}
                {project.franchiseeName && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {project.franchiseeName}
                  </span>
                )}
              </CardDescription>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Genel İlerleme</p>
                <p className="text-2xl font-bold" data-testid="text-overall-progress">{overallProgress}%</p>
              </div>
              <Progress value={overallProgress} className="w-32 h-2" />
              <p className="text-xs text-muted-foreground">
                {completedPhases}/{project.phases?.length || 0} Faz Tamamlandı
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-1" data-testid="tab-overview">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Genel Bakış</span>
          </TabsTrigger>
          <TabsTrigger value="budget" className="gap-1" data-testid="tab-budget">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Bütçe</span>
          </TabsTrigger>
          <TabsTrigger value="vendors" className="gap-1" data-testid="tab-vendors">
            <Truck className="h-4 w-4" />
            <span className="hidden sm:inline">Tedarikçiler</span>
          </TabsTrigger>
          <TabsTrigger value="risks" className="gap-1" data-testid="tab-risks">
            <ShieldAlert className="h-4 w-4" />
            <span className="hidden sm:inline">Riskler</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1" data-testid="tab-activity">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Aktiviteler</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Proje Fazları</h3>
            <p className="text-sm text-muted-foreground">Düzenlemek için faza tıklayın</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedPhases.map((phase) => (
              <PhaseCard key={phase.id} phase={phase} onEdit={handleEditPhase} />
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Wallet className="h-4 w-4" />
                  <span className="text-sm">Tahmini Bütçe</span>
                </div>
                <p className="text-2xl font-bold" data-testid="text-estimated-budget">
                  {formatCurrency(project.estimatedBudget)}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Truck className="h-4 w-4" />
                  <span className="text-sm">Tedarikçiler</span>
                </div>
                <p className="text-2xl font-bold" data-testid="text-vendor-count">
                  {project.vendors?.length || 0}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">Aktif Riskler</span>
                </div>
                <p className="text-2xl font-bold" data-testid="text-risk-count">
                  {project.risks?.filter(r => r.status !== "resolved").length || 0}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="budget" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Target className="h-4 w-4" />
                  <span className="text-sm">Planlanan</span>
                </div>
                <p className="text-xl font-bold" data-testid="text-budget-planned">{formatCurrency(totalPlanned)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">Gerçekleşen</span>
                </div>
                <p className="text-xl font-bold" data-testid="text-budget-actual">{formatCurrency(totalActual)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  {totalVariance >= 0 ? <TrendingDown className="h-4 w-4 text-green-500" /> : <TrendingUp className="h-4 w-4 text-red-500" />}
                  <span className="text-sm">Fark</span>
                </div>
                <p className={`text-xl font-bold ${totalVariance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-budget-variance">
                  {totalVariance >= 0 ? "+" : ""}{formatCurrency(totalVariance)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Bütçe Kalemleri</h3>
            <Button 
              size="sm" 
              onClick={() => {
                setEditingBudget(null);
                setBudgetForm({ category: "", title: "", description: "", plannedAmount: "", actualAmount: "" });
                setIsBudgetDialogOpen(true);
              }}
              data-testid="button-add-budget"
            >
              <Plus className="h-4 w-4 mr-1" />
              Kalem Ekle
            </Button>
          </div>

          <Card>
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead className="text-right">Planlanan</TableHead>
                    <TableHead className="text-right">Gerçekleşen</TableHead>
                    <TableHead className="text-right">Fark</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.budgetLines?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Henüz bütçe kalemi eklenmemiş
                      </TableCell>
                    </TableRow>
                  )}
                  {project.budgetLines?.map((line) => {
                    const variance = (line.plannedAmount || 0) - (line.actualAmount || 0);
                    return (
                      <TableRow key={line.id} data-testid={`budget-row-${line.id}`}>
                        <TableCell>
                          <Badge variant="outline">{budgetCategoryLabels[line.category] || line.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{line.title}</p>
                          {line.description && <p className="text-xs text-muted-foreground">{line.description}</p>}
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(line.plannedAmount)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(line.actualAmount)}</TableCell>
                        <TableCell className={`text-right font-medium ${variance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          {variance >= 0 ? "+" : ""}{formatCurrency(variance)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditBudget(line)} data-testid={`button-edit-budget-${line.id}`}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteBudgetMutation.mutate(line.id)} data-testid={`button-delete-budget-${line.id}`}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="vendors" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-vendor-filter">
                <SelectValue placeholder="Tüm Kategoriler" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kategoriler</SelectItem>
                {Object.entries(vendorTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              size="sm"
              onClick={() => {
                setEditingVendor(null);
                setVendorForm({ vendorType: "", companyName: "", contactName: "", contactPhone: "", contactEmail: "", contractStatus: "pending", contractAmount: "" });
                setIsVendorDialogOpen(true);
              }}
              data-testid="button-add-vendor"
            >
              <Plus className="h-4 w-4 mr-1" />
              Tedarikçi Ekle
            </Button>
          </div>

          <Card>
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Firma</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>İletişim</TableHead>
                    <TableHead>Sözleşme</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendors?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        {vendorFilter === "all" ? "Henüz tedarikçi eklenmemiş" : "Bu kategoride tedarikçi yok"}
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredVendors?.map((vendor) => (
                    <TableRow key={vendor.id} data-testid={`vendor-row-${vendor.id}`}>
                      <TableCell>
                        <p className="font-medium">{vendor.companyName}</p>
                        {vendor.contactName && <p className="text-xs text-muted-foreground">{vendor.contactName}</p>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{vendorTypeLabels[vendor.vendorType] || vendor.vendorType}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm">
                          {vendor.contactPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {vendor.contactPhone}
                            </span>
                          )}
                          {vendor.contactEmail && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="h-3 w-3" /> {vendor.contactEmail}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={vendor.contractStatus === "signed" ? "default" : vendor.contractStatus === "completed" ? "default" : "outline"}
                          className={vendor.contractStatus === "signed" ? "bg-green-500" : vendor.contractStatus === "completed" ? "bg-blue-500" : ""}
                        >
                          {vendor.contractStatus === "pending" ? "Beklemede" :
                           vendor.contractStatus === "signed" ? "İmzalandı" :
                           vendor.contractStatus === "completed" ? "Tamamlandı" :
                           vendor.contractStatus === "cancelled" ? "İptal" : vendor.contractStatus}
                        </Badge>
                        {vendor.contractAmount && (
                          <p className="text-xs mt-1 text-muted-foreground">{formatCurrency(vendor.contractAmount)}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditVendor(vendor)} data-testid={`button-edit-vendor-${vendor.id}`}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteVendorMutation.mutate(vendor.id)} data-testid={`button-delete-vendor-${vendor.id}`}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="risks" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Risk Değerlendirmeleri</h3>
            <Button 
              size="sm"
              onClick={() => {
                setEditingRisk(null);
                setRiskForm({ title: "", description: "", probability: "3", impact: "3", status: "identified", mitigationPlan: "" });
                setIsRiskDialogOpen(true);
              }}
              data-testid="button-add-risk"
            >
              <Plus className="h-4 w-4 mr-1" />
              Risk Ekle
            </Button>
          </div>

          <Card>
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Risk</TableHead>
                    <TableHead>Olasılık</TableHead>
                    <TableHead>Etki</TableHead>
                    <TableHead>Skor</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.risks?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Henüz risk eklenmemiş
                      </TableCell>
                    </TableRow>
                  )}
                  {project.risks?.map((risk) => (
                    <TableRow key={risk.id} data-testid={`risk-row-${risk.id}`}>
                      <TableCell>
                        <p className="font-medium">{risk.title}</p>
                        {risk.description && <p className="text-xs text-muted-foreground line-clamp-1">{risk.description}</p>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div 
                              key={i} 
                              className={`w-2 h-4 rounded-sm ${i < (risk.probability || 0) ? "bg-yellow-500" : "bg-muted"}`}
                            />
                          ))}
                          <span className="text-xs ml-1">{risk.probability}/5</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div 
                              key={i} 
                              className={`w-2 h-4 rounded-sm ${i < (risk.impact || 0) ? "bg-red-500" : "bg-muted"}`}
                            />
                          ))}
                          <span className="text-xs ml-1">{risk.impact}/5</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <RiskScoreBadge probability={risk.probability || 1} impact={risk.impact || 1} />
                      </TableCell>
                      <TableCell>
                        <Badge className={riskStatusLabels[risk.status || "identified"]?.color}>
                          {riskStatusLabels[risk.status || "identified"]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditRisk(risk)} data-testid={`button-edit-risk-${risk.id}`}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteRiskMutation.mutate(risk.id)} data-testid={`button-delete-risk-${risk.id}`}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Aktivite Geçmişi
              </CardTitle>
              <CardDescription>Proje üzerindeki son değişiklikler</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {project.createdAt && (
                  <div className="flex items-start gap-3 pb-4 border-b last:border-0">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                      <Store className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Proje oluşturuldu</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(project.createdAt), "d MMMM yyyy, HH:mm", { locale: tr })}
                      </p>
                    </div>
                  </div>
                )}
                
                {sortedPhases.filter(p => p.status === "completed").map((phase) => (
                  <div key={`completed-${phase.id}`} className="flex items-start gap-3 pb-4 border-b last:border-0">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{phase.title} tamamlandı</p>
                      {phase.completedAt && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(phase.completedAt), "d MMMM yyyy, HH:mm", { locale: tr })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {sortedPhases.filter(p => p.status === "in_progress").map((phase) => (
                  <div key={`progress-${phase.id}`} className="flex items-start gap-3 pb-4 border-b last:border-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{phase.title} devam ediyor</p>
                      <p className="text-xs text-muted-foreground">İlerleme: {phase.progress}%</p>
                    </div>
                  </div>
                ))}

                {project.vendors?.slice(0, 3).map((vendor) => (
                  <div key={`vendor-${vendor.id}`} className="flex items-start gap-3 pb-4 border-b last:border-0">
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center shrink-0">
                      <Truck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Tedarikçi eklendi: {vendor.companyName}</p>
                      {vendor.createdAt && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(vendor.createdAt), "d MMMM yyyy", { locale: tr })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {project.risks?.filter(r => r.status === "occurred").map((risk) => (
                  <div key={`risk-${risk.id}`} className="flex items-start gap-3 pb-4 border-b last:border-0">
                    <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Risk gerçekleşti: {risk.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(risk.createdAt!), "d MMMM yyyy", { locale: tr })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isPhaseDialogOpen} onOpenChange={setIsPhaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Faz Düzenle</DialogTitle>
            <DialogDescription>Faz durumunu ve ilerlemesini güncelleyin</DialogDescription>
          </DialogHeader>
          {editingPhase && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Durum</Label>
                <Select
                  value={editingPhase.status || "not_started"}
                  onValueChange={(val) => setEditingPhase({ ...editingPhase, status: val })}
                >
                  <SelectTrigger data-testid="select-phase-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Başlamadı</SelectItem>
                    <SelectItem value="in_progress">Devam Ediyor</SelectItem>
                    <SelectItem value="completed">Tamamlandı</SelectItem>
                    <SelectItem value="blocked">Engelli</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>İlerleme ({editingPhase.progress || 0}%)</Label>
                <Input
                  type="range"
                  min="0"
                  max="100"
                  value={editingPhase.progress || 0}
                  onChange={(e) => setEditingPhase({ ...editingPhase, progress: parseInt(e.target.value) })}
                  data-testid="input-phase-progress"
                />
              </div>

              <div className="space-y-2">
                <Label>Hedef Tarih</Label>
                <Input
                  type="date"
                  value={editingPhase.targetDate || ""}
                  onChange={(e) => setEditingPhase({ ...editingPhase, targetDate: e.target.value })}
                  data-testid="input-phase-target-date"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPhaseDialogOpen(false)}>İptal</Button>
            <Button onClick={handleSavePhase} disabled={updatePhaseMutation.isPending} data-testid="button-save-phase">
              {updatePhaseMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBudget ? "Bütçe Kalemi Düzenle" : "Yeni Bütçe Kalemi"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Kategori *</Label>
              <Select value={budgetForm.category} onValueChange={(val) => setBudgetForm({ ...budgetForm, category: val })}>
                <SelectTrigger data-testid="select-budget-category">
                  <SelectValue placeholder="Kategori seçin" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(budgetCategoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Başlık *</Label>
              <Input
                value={budgetForm.title}
                onChange={(e) => setBudgetForm({ ...budgetForm, title: e.target.value })}
                placeholder="Bütçe kalemi adı"
                data-testid="input-budget-title"
              />
            </div>

            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Textarea
                value={budgetForm.description}
                onChange={(e) => setBudgetForm({ ...budgetForm, description: e.target.value })}
                placeholder="Detaylı açıklama"
                data-testid="input-budget-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Planlanan (₺)</Label>
                <Input
                  type="number"
                  value={budgetForm.plannedAmount}
                  onChange={(e) => setBudgetForm({ ...budgetForm, plannedAmount: e.target.value })}
                  placeholder="0"
                  data-testid="input-budget-planned"
                />
              </div>
              <div className="space-y-2">
                <Label>Gerçekleşen (₺)</Label>
                <Input
                  type="number"
                  value={budgetForm.actualAmount}
                  onChange={(e) => setBudgetForm({ ...budgetForm, actualAmount: e.target.value })}
                  placeholder="0"
                  data-testid="input-budget-actual"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBudgetDialogOpen(false)}>İptal</Button>
            <Button 
              onClick={handleSaveBudget} 
              disabled={!budgetForm.category || !budgetForm.title || addBudgetMutation.isPending || updateBudgetMutation.isPending}
              data-testid="button-save-budget"
            >
              {addBudgetMutation.isPending || updateBudgetMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isVendorDialogOpen} onOpenChange={setIsVendorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVendor ? "Tedarikçi Düzenle" : "Yeni Tedarikçi"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Kategori *</Label>
              <Select value={vendorForm.vendorType} onValueChange={(val) => setVendorForm({ ...vendorForm, vendorType: val })}>
                <SelectTrigger data-testid="select-vendor-type">
                  <SelectValue placeholder="Kategori seçin" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(vendorTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Firma Adı *</Label>
              <Input
                value={vendorForm.companyName}
                onChange={(e) => setVendorForm({ ...vendorForm, companyName: e.target.value })}
                placeholder="Firma adı"
                data-testid="input-vendor-company"
              />
            </div>

            <div className="space-y-2">
              <Label>Yetkili Kişi</Label>
              <Input
                value={vendorForm.contactName}
                onChange={(e) => setVendorForm({ ...vendorForm, contactName: e.target.value })}
                placeholder="İletişim kurulacak kişi"
                data-testid="input-vendor-contact"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input
                  value={vendorForm.contactPhone}
                  onChange={(e) => setVendorForm({ ...vendorForm, contactPhone: e.target.value })}
                  placeholder="+90 5xx xxx xx xx"
                  data-testid="input-vendor-phone"
                />
              </div>
              <div className="space-y-2">
                <Label>E-posta</Label>
                <Input
                  type="email"
                  value={vendorForm.contactEmail}
                  onChange={(e) => setVendorForm({ ...vendorForm, contactEmail: e.target.value })}
                  placeholder="email@firma.com"
                  data-testid="input-vendor-email"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sözleşme Durumu</Label>
                <Select value={vendorForm.contractStatus} onValueChange={(val) => setVendorForm({ ...vendorForm, contractStatus: val })}>
                  <SelectTrigger data-testid="select-vendor-contract-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Beklemede</SelectItem>
                    <SelectItem value="signed">İmzalandı</SelectItem>
                    <SelectItem value="completed">Tamamlandı</SelectItem>
                    <SelectItem value="cancelled">İptal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sözleşme Tutarı (₺)</Label>
                <Input
                  type="number"
                  value={vendorForm.contractAmount}
                  onChange={(e) => setVendorForm({ ...vendorForm, contractAmount: e.target.value })}
                  placeholder="0"
                  data-testid="input-vendor-amount"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVendorDialogOpen(false)}>İptal</Button>
            <Button 
              onClick={handleSaveVendor} 
              disabled={!vendorForm.vendorType || !vendorForm.companyName || addVendorMutation.isPending || updateVendorMutation.isPending}
              data-testid="button-save-vendor"
            >
              {addVendorMutation.isPending || updateVendorMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRiskDialogOpen} onOpenChange={setIsRiskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRisk ? "Risk Düzenle" : "Yeni Risk"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Risk Başlığı *</Label>
              <Input
                value={riskForm.title}
                onChange={(e) => setRiskForm({ ...riskForm, title: e.target.value })}
                placeholder="Risk tanımı"
                data-testid="input-risk-title"
              />
            </div>

            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Textarea
                value={riskForm.description}
                onChange={(e) => setRiskForm({ ...riskForm, description: e.target.value })}
                placeholder="Riskin detaylı açıklaması"
                data-testid="input-risk-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Olasılık (1-5)</Label>
                <Select value={riskForm.probability} onValueChange={(val) => setRiskForm({ ...riskForm, probability: val })}>
                  <SelectTrigger data-testid="select-risk-probability">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Çok Düşük</SelectItem>
                    <SelectItem value="2">2 - Düşük</SelectItem>
                    <SelectItem value="3">3 - Orta</SelectItem>
                    <SelectItem value="4">4 - Yüksek</SelectItem>
                    <SelectItem value="5">5 - Çok Yüksek</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Etki (1-5)</Label>
                <Select value={riskForm.impact} onValueChange={(val) => setRiskForm({ ...riskForm, impact: val })}>
                  <SelectTrigger data-testid="select-risk-impact">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Önemsiz</SelectItem>
                    <SelectItem value="2">2 - Küçük</SelectItem>
                    <SelectItem value="3">3 - Orta</SelectItem>
                    <SelectItem value="4">4 - Büyük</SelectItem>
                    <SelectItem value="5">5 - Kritik</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Durum</Label>
              <Select value={riskForm.status} onValueChange={(val) => setRiskForm({ ...riskForm, status: val })}>
                <SelectTrigger data-testid="select-risk-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="identified">Belirlendi</SelectItem>
                  <SelectItem value="mitigating">Azaltılıyor</SelectItem>
                  <SelectItem value="resolved">Çözüldü</SelectItem>
                  <SelectItem value="occurred">Gerçekleşti</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Risk Azaltma Planı</Label>
              <Textarea
                value={riskForm.mitigationPlan}
                onChange={(e) => setRiskForm({ ...riskForm, mitigationPlan: e.target.value })}
                placeholder="Bu riski azaltmak için alınacak önlemler"
                data-testid="input-risk-mitigation"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRiskDialogOpen(false)}>İptal</Button>
            <Button 
              onClick={handleSaveRisk} 
              disabled={!riskForm.title || addRiskMutation.isPending || updateRiskMutation.isPending}
              data-testid="button-save-risk"
            >
              {addRiskMutation.isPending || updateRiskMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
