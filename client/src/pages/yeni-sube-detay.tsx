import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ListSkeleton } from "@/components/list-skeleton";
import { EmptyState } from "@/components/empty-state";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ConfirmDeleteDialog, useConfirmDelete } from "@/components/confirm-delete-dialog";
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
  Store,
  DollarSign,
  Truck,
  ChevronDown,
  ChevronRight,
  ListTodo,
  UserPlus,
  ShoppingCart,
  Check,
  X,
  FileText,
  Tag,
  Award,
} from "lucide-react";
import type { ProjectPhase, ProjectBudgetLine, ProjectVendor, ProjectRisk, PhaseSubTask, PhaseAssignment, ProcurementItem, ProcurementProposal } from "@shared/schema";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

const phaseFormSchema = z.object({
  title: z.string().min(1, "Faz adı zorunludur"),
  colorHex: z.string().default("#6366f1"),
  status: z.string().min(1, "Durum seçilmelidir"),
  progress: z.number().min(0).max(100),
  targetDate: z.string().optional(),
});

type PhaseFormValues = z.infer<typeof phaseFormSchema>;

const newPhaseFormSchema = z.object({
  title: z.string().min(1, "Faz adı zorunludur"),
  phaseType: z.string().min(1, "Faz tipi seçilmelidir"),
  colorHex: z.string().default("#6366f1"),
  targetDate: z.string().optional(),
});

type NewPhaseFormValues = z.infer<typeof newPhaseFormSchema>;

const phaseTypeLabels: Record<string, string> = {
  company_setup: "Şirket Kurulumu",
  contract_legal: "Sözleşme & Hukuki",
  construction: "İnşaat",
  equipment: "Ekipman",
  payments: "Ödemeler",
  staffing: "Kadro",
  training_opening: "Eğitim & Açılış",
  custom: "Özel",
};

const colorPresets = [
  { value: "#6366f1", label: "Indigo" },
  { value: "#3b82f6", label: "Mavi" },
  { value: "#10b981", label: "Yeşil" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#ef4444", label: "Kırmızı" },
  { value: "#8b5cf6", label: "Mor" },
  { value: "#ec4899", label: "Pembe" },
];

const budgetFormSchema = z.object({
  category: z.string().min(1, "Kategori seçilmelidir"),
  title: z.string().min(1, "Başlık zorunludur"),
  description: z.string().optional(),
  plannedAmount: z.number().min(0, "Planlanan tutar 0 veya daha büyük olmalı"),
  actualAmount: z.number().min(0, "Gerçekleşen tutar 0 veya daha büyük olmalı"),
});

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

const vendorFormSchema = z.object({
  vendorType: z.string().min(1, "Kategori seçilmelidir"),
  companyName: z.string().min(1, "Firma adı zorunludur"),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
  contractStatus: z.string().min(1, "Sözleşme durumu seçilmelidir"),
  contractAmount: z.number().optional(),
});

type VendorFormValues = z.infer<typeof vendorFormSchema>;

const riskFormSchema = z.object({
  title: z.string().min(1, "Risk başlığı zorunludur"),
  description: z.string().optional(),
  probability: z.number().min(1).max(5),
  impact: z.number().min(1).max(5),
  status: z.string().min(1, "Durum seçilmelidir"),
  mitigationPlan: z.string().optional(),
});

type RiskFormValues = z.infer<typeof riskFormSchema>;

const subTaskFormSchema = z.object({
  title: z.string().min(1, "Görev adı zorunludur"),
  description: z.string().optional(),
  isCategory: z.boolean().default(false),
  parentId: z.number().optional().nullable(),
  dueDate: z.string().optional(),
  requiresBidding: z.boolean().default(false),
  assigneeType: z.enum(["none", "internal", "external"]).default("none"),
  assigneeUserId: z.string().optional().nullable(),
  assigneeExternalId: z.number().optional().nullable(),
});

type SubTaskFormValues = z.infer<typeof subTaskFormSchema>;

const assignmentFormSchema = z.object({
  assigneeType: z.enum(["internal", "external"]),
  userId: z.string().optional().nullable(),
  externalUserId: z.number().optional().nullable(),
  raciRole: z.enum(["responsible", "accountable", "consulted", "informed"]),
});

type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;

const proposalFormSchema = z.object({
  vendorId: z.number().min(1, "Tedarikçi seçilmelidir"),
  proposedPrice: z.number().min(0, "Fiyat 0 veya daha büyük olmalı"),
  deliveryDays: z.number().min(1, "Teslimat süresi en az 1 gün olmalı").optional(),
  warrantyMonths: z.number().min(0).optional(),
  notes: z.string().optional(),
});

type ProposalFormValues = z.infer<typeof proposalFormSchema>;

const subTaskStatusConfig: Record<string, { label: string; color: string }> = {
  not_started: { label: "Başlamadı", color: "bg-muted text-muted-foreground" },
  in_progress: { label: "Devam Ediyor", color: "bg-blue-500 text-white" },
  blocked: { label: "Engelli", color: "bg-red-500 text-white" },
  done: { label: "Tamamlandı", color: "bg-green-500 text-white" },
};

const procurementStatusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Taslak", color: "bg-muted text-muted-foreground" },
  open: { label: "Açık", color: "bg-blue-500 text-white" },
  under_review: { label: "İnceleniyor", color: "bg-yellow-500 text-white" },
  awarded: { label: "Atandı", color: "bg-green-500 text-white" },
  closed: { label: "Kapatıldı", color: "bg-muted text-muted-foreground" },
  cancelled: { label: "İptal", color: "bg-red-500 text-white" },
};

const raciLabels: Record<string, { short: string; full: string }> = {
  responsible: { short: "R", full: "Sorumlu" },
  accountable: { short: "A", full: "Hesap Verir" },
  consulted: { short: "C", full: "Danışılan" },
  informed: { short: "I", full: "Bilgilendirilen" },
};

interface User {
  id: string;
  firstName: string;
  lastName: string;
  role?: string;
}

interface ExternalUser {
  id: number;
  firstName?: string;
  lastName?: string;
  email: string;
  companyName?: string;
  specialty?: string;
}

interface AssignmentWithUser extends PhaseAssignment {
  user?: User | null;
  externalUser?: ExternalUser | null;
}

interface ProcurementItemWithSubTask {
  item: ProcurementItem;
  subTask: PhaseSubTask;
}

interface PhaseWithAssignments extends ProjectPhase {
  assignments?: (PhaseAssignment & { user?: { id: string; firstName: string; lastName: string } })[];
}

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
  phases: PhaseWithAssignments[];
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

function PhaseCard({ phase, onEdit, canEdit = true }: { 
  phase: PhaseWithAssignments; 
  onEdit: (phase: ProjectPhase) => void;
  canEdit?: boolean;
}) {
  const Icon = phaseIcons[phase.phaseType as string] || Building2;
  const statusConfig = phaseStatusConfig[phase.status || "not_started"];
  const StatusIcon = phase.status === "completed" ? CheckCircle2 : 
                     phase.status === "in_progress" ? Clock : 
                     phase.status === "blocked" ? Ban : Clock;

  return (
    <Card 
      className={`${canEdit ? 'cursor-pointer hover-elevate' : ''} transition-all`}
      onClick={() => canEdit && onEdit(phase)}
      data-testid={`card-phase-${phase.id}`}
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
            <h4 className="font-medium text-sm truncate" data-testid={`text-phase-title-${phase.id}`}>{phase.title}</h4>
            <Badge variant="outline" className={`${statusConfig.color} text-xs gap-1 mt-1`} data-testid={`badge-phase-status-${phase.id}`}>
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </Badge>
          </div>
        </div>
        
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>İlerleme</span>
            <span className="font-medium" data-testid={`text-phase-progress-${phase.id}`}>{phase.progress || 0}%</span>
          </div>
          <Progress value={phase.progress || 0} className="h-2" data-testid={`progress-phase-${phase.id}`} />
        </div>

        {phase.targetDate && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span data-testid={`text-phase-date-${phase.id}`}>{format(new Date(phase.targetDate), "d MMM yyyy", { locale: tr })}</span>
          </div>
        )}

        {phase.assignments && phase.assignments.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border">
            <div className="flex flex-wrap gap-1">
              {phase.assignments
                .filter(a => a.raciRole === 'responsible' || a.raciRole === 'accountable')
                .slice(0, 3)
                .map(a => (
                  <Badge 
                    key={a.id} 
                    variant="outline" 
                    className="text-xs"
                    data-testid={`badge-assignment-${a.id}`}
                  >
                    <span className={`font-bold mr-1 ${a.raciRole === 'responsible' ? 'text-blue-500' : 'text-green-500'}`}>
                      {a.raciRole === 'responsible' ? 'R' : 'A'}
                    </span>
                    {a.user ? `${a.user.firstName} ${a.user.lastName}` : 'Atanmamış'}
                  </Badge>
                ))}
              {phase.assignments.filter(a => a.raciRole === 'responsible' || a.raciRole === 'accountable').length > 3 && (
                <Badge variant="outline" className="text-xs" data-testid={`badge-assignment-overflow-${phase.id}`}>
                  +{phase.assignments.filter(a => a.raciRole === 'responsible' || a.raciRole === 'accountable').length - 3}
                </Badge>
              )}
            </div>
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
  const { user } = useAuth();
  const { deleteState: budgetDeleteState, requestDelete: requestBudgetDelete, cancelDelete: cancelBudgetDelete, confirmDelete: confirmBudgetDelete } = useConfirmDelete();
  const { deleteState: vendorDeleteState, requestDelete: requestVendorDelete, cancelDelete: cancelVendorDelete, confirmDelete: confirmVendorDelete } = useConfirmDelete();
  const { deleteState: riskDeleteState, requestDelete: requestRiskDelete, cancelDelete: cancelRiskDelete, confirmDelete: confirmRiskDelete } = useConfirmDelete();
  const { deleteState: subTaskDeleteState, requestDelete: requestSubTaskDelete, cancelDelete: cancelSubTaskDelete, confirmDelete: confirmSubTaskDelete } = useConfirmDelete();
  const { deleteState: assignmentDeleteState, requestDelete: requestAssignmentDelete, cancelDelete: cancelAssignmentDelete, confirmDelete: confirmAssignmentDelete } = useConfirmDelete();

  // Authorization: Admin and HQ roles have full access
  const isHQRole = (role: string | undefined) => {
    const hqRoles = ['admin', 'hq_manager', 'hq_operations', 'hq_hr', 'hq_finance', 'hq_training', 'hq_quality', 'hq_marketing', 'hq_it'];
    return hqRoles.includes(role || '');
  };
  
  const [activeTab, setActiveTab] = useState("overview");
  const [editingPhase, setEditingPhase] = useState<ProjectPhase | null>(null);
  const [isPhaseDialogOpen, setIsPhaseDialogOpen] = useState(false);
  const [isAddPhaseDialogOpen, setIsAddPhaseDialogOpen] = useState(false);
  
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<ProjectBudgetLine | null>(null);

  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<ProjectVendor | null>(null);
  const [vendorFilter, setVendorFilter] = useState<string>("all");

  const [isRiskDialogOpen, setIsRiskDialogOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<ProjectRisk | null>(null);

  const [phaseDetailTab, setPhaseDetailTab] = useState("general");
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [isSubTaskDialogOpen, setIsSubTaskDialogOpen] = useState(false);
  const [editingSubTask, setEditingSubTask] = useState<PhaseSubTask | null>(null);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false);
  const [selectedProcurementItem, setSelectedProcurementItem] = useState<ProcurementItem | null>(null);
  const [isAddExternalUserDialogOpen, setIsAddExternalUserDialogOpen] = useState(false);

  const phaseForm = useForm<PhaseFormValues>({
    resolver: zodResolver(phaseFormSchema),
    defaultValues: {
      title: "",
      colorHex: "#6366f1",
      status: "not_started",
      progress: 0,
      targetDate: "",
    },
  });

  const newPhaseForm = useForm<NewPhaseFormValues>({
    resolver: zodResolver(newPhaseFormSchema),
    defaultValues: {
      title: "",
      phaseType: "",
      colorHex: "#6366f1",
      targetDate: "",
    },
  });

  const budgetForm = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      category: "",
      title: "",
      description: "",
      plannedAmount: 0,
      actualAmount: 0,
    },
  });

  const vendorForm = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      vendorType: "",
      companyName: "",
      contactName: "",
      contactPhone: "",
      contactEmail: "",
      contractStatus: "pending",
      contractAmount: undefined,
    },
  });

  const riskForm = useForm<RiskFormValues>({
    resolver: zodResolver(riskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      probability: 3,
      impact: 3,
      status: "identified",
      mitigationPlan: "",
    },
  });

  const subTaskForm = useForm<SubTaskFormValues>({
    resolver: zodResolver(subTaskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      isCategory: false,
      parentId: null,
      dueDate: "",
      requiresBidding: false,
      assigneeType: "none",
      assigneeUserId: null,
      assigneeExternalId: null,
    },
  });

  const assignmentForm = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: {
      assigneeType: "internal",
      userId: null,
      externalUserId: null,
      raciRole: "responsible",
    },
  });

  const externalUserForm = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      companyName: "",
      specialty: "",
    },
  });

  const proposalForm = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalFormSchema),
    defaultValues: {
      vendorId: 0,
      proposedPrice: 0,
      deliveryDays: undefined,
      warrantyMonths: undefined,
      notes: "",
    },
  });

  useEffect(() => {
    if (editingPhase) {
      phaseForm.reset({
        title: editingPhase.title || "",
        colorHex: editingPhase.colorHex || "#6366f1",
        status: editingPhase.status || "not_started",
        progress: editingPhase.progress || 0,
        targetDate: editingPhase.targetDate || "",
      });
    }
  }, [editingPhase, phaseForm]);

  useEffect(() => {
    if (editingBudget) {
      budgetForm.reset({
        category: editingBudget.category,
        title: editingBudget.title,
        description: editingBudget.description || "",
        plannedAmount: editingBudget.plannedAmount || 0,
        actualAmount: editingBudget.actualAmount || 0,
      });
    } else {
      budgetForm.reset({
        category: "",
        title: "",
        description: "",
        plannedAmount: 0,
        actualAmount: 0,
      });
    }
  }, [editingBudget, budgetForm]);

  useEffect(() => {
    if (editingVendor) {
      vendorForm.reset({
        vendorType: editingVendor.vendorType,
        companyName: editingVendor.companyName,
        contactName: editingVendor.contactName || "",
        contactPhone: editingVendor.contactPhone || "",
        contactEmail: editingVendor.contactEmail || "",
        contractStatus: editingVendor.contractStatus || "pending",
        contractAmount: editingVendor.contractAmount || undefined,
      });
    } else {
      vendorForm.reset({
        vendorType: "",
        companyName: "",
        contactName: "",
        contactPhone: "",
        contactEmail: "",
        contractStatus: "pending",
        contractAmount: undefined,
      });
    }
  }, [editingVendor, vendorForm]);

  useEffect(() => {
    if (editingRisk) {
      riskForm.reset({
        title: editingRisk.title,
        description: editingRisk.description || "",
        probability: editingRisk.probability || 3,
        impact: editingRisk.impact || 3,
        status: editingRisk.status || "identified",
        mitigationPlan: editingRisk.mitigationPlan || "",
      });
    } else {
      riskForm.reset({
        title: "",
        description: "",
        probability: 3,
        impact: 3,
        status: "identified",
        mitigationPlan: "",
      });
    }
  }, [editingRisk, riskForm]);

  const { data: project, isLoading, isError, refetch } = useQuery<ProjectWithDetails>({
    queryKey: ["/api/new-shop-projects", projectId],
    enabled: !!projectId,
  });

  const { data: subTasks = [], isLoading: isSubTasksLoading } = useQuery<PhaseSubTask[]>({
    queryKey: ["/api/new-shop-projects", projectId, "phases", editingPhase?.id, "subtasks"],
    enabled: !!projectId && !!editingPhase?.id,
  });

  const { data: assignments = [], isLoading: isAssignmentsLoading } = useQuery<AssignmentWithUser[]>({
    queryKey: ["/api/new-shop-projects", projectId, "phases", editingPhase?.id, "assignments"],
    enabled: !!projectId && !!editingPhase?.id,
  });

  const { data: procurementItems = [] } = useQuery<ProcurementItemWithSubTask[]>({
    queryKey: ["/api/new-shop-projects", projectId, "procurement", "items"],
    enabled: !!projectId && !!editingPhase?.id,
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: externalUsersList = [] } = useQuery<{ user: ExternalUser }[]>({
    queryKey: ["/api/projects", projectId, "external-users"],
    enabled: !!projectId,
  });

  const { data: procurementProposals = [] } = useQuery<ProcurementProposal[]>({
    queryKey: ["/api/new-shop-projects", projectId, "procurement", "items", selectedProcurementItem?.id],
    enabled: !!selectedProcurementItem?.id,
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

  const addPhaseMutation = useMutation({
    mutationFn: async (data: NewPhaseFormValues) => {
      const res = await apiRequest("POST", `/api/new-shop-projects/${projectId}/phases`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/new-shop-projects", projectId] });
      setIsAddPhaseDialogOpen(false);
      newPhaseForm.reset();
      toast({ title: "Faz eklendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Faz eklenemedi", variant: "destructive" });
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
      setEditingBudget(null);
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
      setEditingVendor(null);
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
      setEditingRisk(null);
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

  const addSubTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/new-shop-projects/${projectId}/phases/${editingPhase?.id}/subtasks`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/new-shop-projects", projectId, "phases", editingPhase?.id, "subtasks"] });
      setIsSubTaskDialogOpen(false);
      setEditingSubTask(null);
      subTaskForm.reset();
      toast({ title: "Alt görev eklendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Alt görev eklenemedi", variant: "destructive" });
    },
  });

  const updateSubTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      const { id, ...updates } = data;
      const res = await apiRequest("PATCH", `/api/new-shop-projects/${projectId}/phases/${editingPhase?.id}/subtasks/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/new-shop-projects", projectId, "phases", editingPhase?.id, "subtasks"] });
      setIsSubTaskDialogOpen(false);
      setEditingSubTask(null);
      subTaskForm.reset();
      toast({ title: "Alt görev güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Alt görev güncellenemedi", variant: "destructive" });
    },
  });

  const deleteSubTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/new-shop-projects/${projectId}/phases/${editingPhase?.id}/subtasks/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/new-shop-projects", projectId, "phases", editingPhase?.id, "subtasks"] });
      toast({ title: "Alt görev silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Alt görev silinemedi", variant: "destructive" });
    },
  });

  const addAssignmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/new-shop-projects/${projectId}/phases/${editingPhase?.id}/assignments`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/new-shop-projects", projectId, "phases", editingPhase?.id, "assignments"] });
      setIsAssignmentDialogOpen(false);
      assignmentForm.reset();
      toast({ title: "Ekip üyesi atandı" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Atama yapılamadı", variant: "destructive" });
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/new-shop-projects/${projectId}/phases/${editingPhase?.id}/assignments/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/new-shop-projects", projectId, "phases", editingPhase?.id, "assignments"] });
      toast({ title: "Atama kaldırıldı" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Atama kaldırılamadı", variant: "destructive" });
    },
  });

  const addProposalMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/new-shop-projects/${projectId}/procurement/items/${selectedProcurementItem?.id}/proposals`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/new-shop-projects", projectId, "procurement", "items", selectedProcurementItem?.id] });
      setIsProposalDialogOpen(false);
      proposalForm.reset();
      toast({ title: "Teklif eklendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Teklif eklenemedi", variant: "destructive" });
    },
  });

  const selectProposalMutation = useMutation({
    mutationFn: async (proposalId: number) => {
      const res = await apiRequest("PATCH", `/api/new-shop-projects/${projectId}/procurement/items/${selectedProcurementItem?.id}/proposals/${proposalId}/select`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/new-shop-projects", projectId, "procurement", "items", selectedProcurementItem?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/new-shop-projects", projectId, "procurement", "items"] });
      toast({ title: "Teklif seçildi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Teklif seçilemedi", variant: "destructive" });
    },
  });

  const handleEditPhase = (phase: ProjectPhase) => {
    setEditingPhase(phase);
    setIsPhaseDialogOpen(true);
  };

  const onSubmitPhase = (data: PhaseFormValues) => {
    if (!editingPhase) return;
    updatePhaseMutation.mutate({
      id: editingPhase.id,
      title: data.title,
      colorHex: data.colorHex,
      status: data.status,
      progress: data.progress,
      targetDate: data.targetDate || undefined,
    });
  };

  const onSubmitNewPhase = (data: NewPhaseFormValues) => {
    addPhaseMutation.mutate(data);
  };

  const handleEditBudget = (budget: ProjectBudgetLine) => {
    setEditingBudget(budget);
    setIsBudgetDialogOpen(true);
  };

  const onSubmitBudget = (data: BudgetFormValues) => {
    if (editingBudget) {
      updateBudgetMutation.mutate({ id: editingBudget.id, ...data });
    } else {
      addBudgetMutation.mutate(data);
    }
  };

  const handleEditVendor = (vendor: ProjectVendor) => {
    setEditingVendor(vendor);
    setIsVendorDialogOpen(true);
  };

  const onSubmitVendor = (data: VendorFormValues) => {
    if (editingVendor) {
      updateVendorMutation.mutate({ id: editingVendor.id, ...data });
    } else {
      addVendorMutation.mutate(data);
    }
  };

  const handleEditRisk = (risk: ProjectRisk) => {
    setEditingRisk(risk);
    setIsRiskDialogOpen(true);
  };

  const onSubmitRisk = (data: RiskFormValues) => {
    if (editingRisk) {
      updateRiskMutation.mutate({ id: editingRisk.id, ...data });
    } else {
      addRiskMutation.mutate(data);
    }
  };

  const handleOpenSubTaskDialog = (parentId?: number | null, isCategory: boolean = false) => {
    setEditingSubTask(null);
    subTaskForm.reset({
      title: "",
      description: "",
      isCategory,
      parentId: parentId ?? null,
      dueDate: "",
      requiresBidding: false,
      assigneeType: "none",
      assigneeUserId: null,
      assigneeExternalId: null,
    });
    setIsSubTaskDialogOpen(true);
  };

  const handleEditSubTask = (subTask: PhaseSubTask) => {
    setEditingSubTask(subTask);
    subTaskForm.reset({
      title: subTask.title,
      description: subTask.description || "",
      isCategory: subTask.isCategory || false,
      parentId: subTask.parentId,
      dueDate: subTask.dueDate || "",
      requiresBidding: subTask.requiresBidding || false,
      assigneeType: subTask.assigneeUserId ? "internal" : subTask.assigneeExternalId ? "external" : "none",
      assigneeUserId: subTask.assigneeUserId,
      assigneeExternalId: subTask.assigneeExternalId,
    });
    setIsSubTaskDialogOpen(true);
  };

  const onSubmitSubTask = (data: SubTaskFormValues) => {
    const payload = {
      ...data,
      assigneeUserId: data.assigneeType === "internal" ? data.assigneeUserId : null,
      assigneeExternalId: data.assigneeType === "external" ? data.assigneeExternalId : null,
      phaseId: editingPhase?.id,
    };
    if (editingSubTask) {
      updateSubTaskMutation.mutate({ id: editingSubTask.id, ...payload });
    } else {
      addSubTaskMutation.mutate(payload);
    }
  };

  const toggleSubTaskStatus = (subTask: PhaseSubTask) => {
    const nextStatus = subTask.status === "done" ? "not_started" : "done";
    updateSubTaskMutation.mutate({ id: subTask.id, status: nextStatus });
  };

  const toggleCategoryExpansion = (categoryId: number) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const onSubmitAssignment = (data: AssignmentFormValues) => {
    const payload = {
      userId: data.assigneeType === "internal" ? data.userId : null,
      externalUserId: data.assigneeType === "external" ? data.externalUserId : null,
      raciRole: data.raciRole,
      phaseId: editingPhase?.id,
    };
    addAssignmentMutation.mutate(payload);
  };

  const onSubmitProposal = (data: ProposalFormValues) => {
    addProposalMutation.mutate(data);
  };

  const categories = subTasks.filter(st => st.isCategory);
  const getChildTasks = (parentId: number) => subTasks.filter(st => st.parentId === parentId && !st.isCategory);
  const orphanTasks = subTasks.filter(st => !st.isCategory && !st.parentId);
  
  const phaseProcurementItems = procurementItems.filter(pi => {
    const subTask = subTasks.find(st => st.id === pi.subTask?.id || st.id === (pi.item as any)?.subTaskId);
    return subTask !== undefined;
  });

  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto p-4 space-y-4" data-testid="loading-state">
        <ListSkeleton count={4} variant="card" showHeader />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container max-w-6xl mx-auto p-4" data-testid="not-found-state">
        <EmptyState
          icon={Store}
          title="Proje Bulunamadı"
          description="Bu proje mevcut değil veya erişim yetkiniz yok."
          actionLabel="Projelere Dön"
          onAction={() => navigate("/yeni-sube-projeler")}
          data-testid="empty-state-project"
        />
      </div>
    );
  }

  // Project owner also has full access
  const isProjectOwner = project?.owner?.id === user?.id;
  const canManageProject = isHQRole(user?.role) || isProjectOwner;
  const isAdmin = user?.role === 'admin';
  
  // Roles that can see budget information
  const BUDGET_VISIBLE_ROLES = ["admin", "muhasebe", "muhasebe_ik", "genel_mudur"];
  const canSeeBudget = user?.role && BUDGET_VISIBLE_ROLES.includes(user.role);

  const FULL_ACCESS_ROLES = ['admin', 'ceo', 'cgo'];
  const hasFullTabAccess = FULL_ACCESS_ROLES.includes(user?.role || '') || isProjectOwner;
  const canSeeVendors = hasFullTabAccess || canManageProject;
  const canSeeRisks = hasFullTabAccess || canManageProject;
  const canSeeActivities = hasFullTabAccess || canManageProject;

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
    <div className="container max-w-6xl mx-auto p-4 space-y-4" data-testid="page-yeni-sube-detay">
      <Button 
        variant="ghost" 
        onClick={() => navigate("/yeni-sube-projeler")}
        className="mb-2"
        data-testid="button-back"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Tüm Projeler
      </Button>

      <Card data-testid="card-project-header">
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Store className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl" data-testid="text-project-title">{project.title}</CardTitle>
                <Badge className={projectStatusConfig[project.status]?.color || "bg-slate-500"} data-testid="badge-project-status">
                  {projectStatusConfig[project.status]?.label || project.status}
                </Badge>
              </div>
              <CardDescription className="flex flex-wrap items-center gap-4 text-sm">
                <span className="flex items-center gap-1" data-testid="text-project-location">
                  <MapPin className="h-3.5 w-3.5" />
                  {project.cityName}{project.locationAddress && ` - ${project.locationAddress}`}
                </span>
                {project.targetOpeningDate && (
                  <span className="flex items-center gap-1" data-testid="text-project-target-date">
                    <Calendar className="h-3.5 w-3.5" />
                    Hedef: {format(new Date(project.targetOpeningDate), "d MMM yyyy", { locale: tr })}
                  </span>
                )}
                {project.franchiseeName && (
                  <span className="flex items-center gap-1" data-testid="text-franchisee-name">
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
              <Progress value={overallProgress} className="w-32 h-2" data-testid="progress-overall" />
              <p className="text-xs text-muted-foreground" data-testid="text-phases-completed">
                {completedPhases}/{project.phases?.length || 0} Faz Tamamlandı
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4" data-testid="tabs-container">
        <TabsList className="w-full" data-testid="tabs-list">
          <TabsTrigger value="overview" className="gap-1" data-testid="tab-overview">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Genel Bakış</span>
          </TabsTrigger>
          {canSeeBudget && (
            <TabsTrigger value="budget" className="gap-1" data-testid="tab-budget">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Bütçe</span>
            </TabsTrigger>
          )}
          {canSeeVendors && (
          <TabsTrigger value="vendors" className="gap-1" data-testid="tab-vendors">
            <Truck className="h-4 w-4" />
            <span className="hidden sm:inline">Tedarikçiler</span>
          </TabsTrigger>
          )}
          {canSeeRisks && (
          <TabsTrigger value="risks" className="gap-1" data-testid="tab-risks">
            <ShieldAlert className="h-4 w-4" />
            <span className="hidden sm:inline">Riskler</span>
          </TabsTrigger>
          )}
          {canSeeActivities && (
          <TabsTrigger value="activities" className="gap-1" data-testid="tab-activities">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Aktiviteler</span>
          </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-4" data-testid="tab-content-overview">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Proje Fazları</h3>
            <div className="flex items-center gap-2">
              {canManageProject && <p className="text-sm text-muted-foreground">Düzenlemek için faza tıklayın</p>}
              {canManageProject && (
                <Button size="sm" onClick={() => setIsAddPhaseDialogOpen(true)} data-testid="button-add-phase">
                  <Plus className="h-4 w-4 mr-1" />
                  Faz Ekle
                </Button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="grid-phases">
            {sortedPhases.map((phase) => (
              <PhaseCard key={phase.id} phase={phase} onEdit={handleEditPhase} canEdit={canManageProject} />
            ))}
          </div>

          <div className={`grid grid-cols-1 ${canSeeBudget ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4 mt-6`}>
            {canSeeBudget && (
              <Card data-testid="card-estimated-budget">
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
            )}
            
            <Card data-testid="card-vendor-count">
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
            
            <Card data-testid="card-risk-count">
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

        {canSeeBudget && (
        <TabsContent value="budget" className="space-y-4" data-testid="tab-content-budget">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card data-testid="card-budget-planned">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Target className="h-4 w-4" />
                  <span className="text-sm">Planlanan</span>
                </div>
                <p className="text-xl font-bold" data-testid="text-budget-planned">{formatCurrency(totalPlanned)}</p>
              </CardContent>
            </Card>
            <Card data-testid="card-budget-actual">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">Gerçekleşen</span>
                </div>
                <p className="text-xl font-bold" data-testid="text-budget-actual">{formatCurrency(totalActual)}</p>
              </CardContent>
            </Card>
            <Card data-testid="card-budget-variance">
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
            {canManageProject && (
              <Button 
                size="sm" 
                onClick={() => {
                  setEditingBudget(null);
                  setIsBudgetDialogOpen(true);
                }}
                data-testid="button-add-budget"
              >
                <Plus className="h-4 w-4 mr-1" />
                Kalem Ekle
              </Button>
            )}
          </div>

          <Card data-testid="card-budget-table">
            <ScrollArea className="w-full">
              <Table data-testid="table-budget">
                <TableHeader>
                  <TableRow>
                    <TableHead data-testid="table-head-category">Kategori</TableHead>
                    <TableHead data-testid="table-head-description">Açıklama</TableHead>
                    <TableHead className="text-right" data-testid="table-head-planned">Planlanan</TableHead>
                    <TableHead className="text-right" data-testid="table-head-actual">Gerçekleşen</TableHead>
                    <TableHead className="text-right" data-testid="table-head-diff">Fark</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.budgetLines?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8" data-testid="text-no-budget">
                        Henüz bütçe kalemi eklenmemiş
                      </TableCell>
                    </TableRow>
                  )}
                  {project.budgetLines?.map((line) => {
                    const variance = (line.plannedAmount || 0) - (line.actualAmount || 0);
                    return (
                      <TableRow key={line.id} data-testid={`row-budget-${line.id}`}>
                        <TableCell>
                          <Badge variant="outline" data-testid={`badge-budget-category-${line.id}`}>{budgetCategoryLabels[line.category] || line.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium" data-testid={`text-budget-title-${line.id}`}>{line.title}</p>
                          {line.description && <p className="text-xs text-muted-foreground">{line.description}</p>}
                        </TableCell>
                        <TableCell className="text-right font-medium" data-testid={`text-budget-planned-${line.id}`}>{formatCurrency(line.plannedAmount)}</TableCell>
                        <TableCell className="text-right font-medium" data-testid={`text-budget-actual-${line.id}`}>{formatCurrency(line.actualAmount)}</TableCell>
                        <TableCell className={`text-right font-medium ${variance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} data-testid={`text-budget-variance-${line.id}`}>
                          {variance >= 0 ? "+" : ""}{formatCurrency(variance)}
                        </TableCell>
                        <TableCell>
                          {canManageProject && (
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEditBudget(line)} data-testid={`button-edit-budget-${line.id}`}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => requestBudgetDelete(line.id, line.description || "Bütçe kalemi")} data-testid={`button-delete-budget-${line.id}`}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>
        )}

        <TabsContent value="vendors" className="space-y-4" data-testid="tab-content-vendors">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-vendor-filter">
                <SelectValue placeholder="Tüm Kategoriler" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="select-item-vendor-all">Tüm Kategoriler</SelectItem>
                {Object.entries(vendorTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key} data-testid={`select-item-vendor-${key}`}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canManageProject && (
              <Button 
                size="sm"
                onClick={() => {
                  setEditingVendor(null);
                  setIsVendorDialogOpen(true);
                }}
                data-testid="button-add-vendor"
              >
                <Plus className="h-4 w-4 mr-1" />
                Tedarikçi Ekle
              </Button>
            )}
          </div>

          <Card data-testid="card-vendor-table">
            <ScrollArea className="w-full">
              <Table data-testid="table-vendors">
                <TableHeader>
                  <TableRow>
                    <TableHead data-testid="table-head-vendor-company">Firma</TableHead>
                    <TableHead data-testid="table-head-vendor-category">Kategori</TableHead>
                    <TableHead data-testid="table-head-vendor-contact">İletişim</TableHead>
                    <TableHead data-testid="table-head-vendor-contract">Sözleşme</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendors?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8" data-testid="text-no-vendors">
                        {vendorFilter === "all" ? "Henüz tedarikçi eklenmemiş" : "Bu kategoride tedarikçi yok"}
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredVendors?.map((vendor) => (
                    <TableRow key={vendor.id} data-testid={`row-vendor-${vendor.id}`}>
                      <TableCell>
                        <p className="font-medium" data-testid={`text-vendor-company-${vendor.id}`}>{vendor.companyName}</p>
                        {vendor.contactName && <p className="text-xs text-muted-foreground">{vendor.contactName}</p>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" data-testid={`badge-vendor-type-${vendor.id}`}>{vendorTypeLabels[vendor.vendorType] || vendor.vendorType}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm">
                          {vendor.contactPhone && (
                            <span className="flex items-center gap-1" data-testid={`text-vendor-phone-${vendor.id}`}>
                              <Phone className="h-3 w-3" /> {vendor.contactPhone}
                            </span>
                          )}
                          {vendor.contactEmail && (
                            <span className="flex items-center gap-1 text-muted-foreground" data-testid={`text-vendor-email-${vendor.id}`}>
                              <Mail className="h-3 w-3" /> {vendor.contactEmail}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={vendor.contractStatus === "signed" ? "default" : vendor.contractStatus === "completed" ? "default" : "outline"}
                          className={vendor.contractStatus === "signed" ? "bg-green-500" : vendor.contractStatus === "completed" ? "bg-blue-500" : ""}
                          data-testid={`badge-vendor-contract-${vendor.id}`}
                        >
                          {vendor.contractStatus === "pending" ? "Beklemede" :
                           vendor.contractStatus === "signed" ? "İmzalandı" :
                           vendor.contractStatus === "completed" ? "Tamamlandı" :
                           vendor.contractStatus === "cancelled" ? "İptal" : vendor.contractStatus}
                        </Badge>
                        {vendor.contractAmount && (
                          <p className="text-xs mt-1 text-muted-foreground" data-testid={`text-vendor-amount-${vendor.id}`}>{formatCurrency(vendor.contractAmount)}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {canManageProject && (
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditVendor(vendor)} data-testid={`button-edit-vendor-${vendor.id}`}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => requestVendorDelete(vendor.id, vendor.companyName || "Tedarikçi")} data-testid={`button-delete-vendor-${vendor.id}`}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="risks" className="space-y-4" data-testid="tab-content-risks">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Risk Değerlendirmeleri</h3>
            {canManageProject && (
              <Button 
                size="sm"
                onClick={() => {
                  setEditingRisk(null);
                  setIsRiskDialogOpen(true);
                }}
                data-testid="button-add-risk"
              >
                <Plus className="h-4 w-4 mr-1" />
                Risk Ekle
              </Button>
            )}
          </div>

          <Card data-testid="card-risk-table">
            <ScrollArea className="w-full">
              <Table data-testid="table-risks">
                <TableHeader>
                  <TableRow>
                    <TableHead data-testid="table-head-risk-title">Risk</TableHead>
                    <TableHead data-testid="table-head-risk-probability">Olasılık</TableHead>
                    <TableHead data-testid="table-head-risk-impact">Etki</TableHead>
                    <TableHead data-testid="table-head-risk-score">Skor</TableHead>
                    <TableHead data-testid="table-head-risk-status">Durum</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.risks?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8" data-testid="text-no-risks">
                        Henüz risk eklenmemiş
                      </TableCell>
                    </TableRow>
                  )}
                  {project.risks?.map((risk) => (
                    <TableRow key={risk.id} data-testid={`row-risk-${risk.id}`}>
                      <TableCell>
                        <p className="font-medium" data-testid={`text-risk-title-${risk.id}`}>{risk.title}</p>
                        {risk.description && <p className="text-xs text-muted-foreground line-clamp-1">{risk.description}</p>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" data-testid={`indicator-risk-probability-${risk.id}`}>
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
                        <div className="flex items-center gap-1" data-testid={`indicator-risk-impact-${risk.id}`}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div 
                              key={i} 
                              className={`w-2 h-4 rounded-sm ${i < (risk.impact || 0) ? "bg-red-500" : "bg-muted"}`}
                            />
                          ))}
                          <span className="text-xs ml-1">{risk.impact}/5</span>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`badge-risk-score-${risk.id}`}>
                        <RiskScoreBadge probability={risk.probability || 1} impact={risk.impact || 1} />
                      </TableCell>
                      <TableCell>
                        <Badge className={riskStatusLabels[risk.status || "identified"]?.color} data-testid={`badge-risk-status-${risk.id}`}>
                          {riskStatusLabels[risk.status || "identified"]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {canManageProject && (
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditRisk(risk)} data-testid={`button-edit-risk-${risk.id}`}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => requestRiskDelete(risk.id, risk.description || "Risk")} data-testid={`button-delete-risk-${risk.id}`}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="space-y-4" data-testid="tab-content-activities">
          <Card data-testid="card-activity-history">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Aktivite Geçmişi
              </CardTitle>
              <CardDescription>Proje üzerindeki son değişiklikler</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4" data-testid="list-activities">
                {project.createdAt && (
                  <div className="flex items-start gap-3 pb-4 border-b last:border-0" data-testid="activity-project-created">
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
                  <div key={`completed-${phase.id}`} className="flex items-start gap-3 pb-4 border-b last:border-0" data-testid={`activity-phase-completed-${phase.id}`}>
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
                  <div key={`progress-${phase.id}`} className="flex items-start gap-3 pb-4 border-b last:border-0" data-testid={`activity-phase-progress-${phase.id}`}>
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
                  <div key={`vendor-${vendor.id}`} className="flex items-start gap-3 pb-4 border-b last:border-0" data-testid={`activity-vendor-added-${vendor.id}`}>
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
                  <div key={`risk-${risk.id}`} className="flex items-start gap-3 pb-4 border-b last:border-0" data-testid={`activity-risk-occurred-${risk.id}`}>
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

      <Dialog open={isPhaseDialogOpen} onOpenChange={(open) => {
        setIsPhaseDialogOpen(open);
        if (!open) {
          setPhaseDetailTab("general");
          setEditingPhase(null);
        }
      }} data-testid="dialog-phase-edit">
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="dialog-content-phase-edit">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="dialog-title-phase-edit">
              {editingPhase?.title || "Faz Detayları"}
              {editingPhase?.status && (
                <Badge className={phaseStatusConfig[editingPhase.status]?.bgColor}>
                  {phaseStatusConfig[editingPhase.status]?.label}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>Faz detaylarını görüntüleyin ve yönetin</DialogDescription>
          </DialogHeader>

          <Tabs value={phaseDetailTab} onValueChange={setPhaseDetailTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full" data-testid="tabs-phase-detail">
              <TabsTrigger value="general" className="gap-1" data-testid="tab-phase-general">
                <Eye className="h-4 w-4" />
                Genel
              </TabsTrigger>
              <TabsTrigger value="tasks" className="gap-1" data-testid="tab-phase-tasks">
                <ListTodo className="h-4 w-4" />
                Görevler
              </TabsTrigger>
              <TabsTrigger value="team" className="gap-1" data-testid="tab-phase-team">
                <Users className="h-4 w-4" />
                Ekip
              </TabsTrigger>
              <TabsTrigger value="procurement" className="gap-1" data-testid="tab-phase-procurement">
                <ShoppingCart className="h-4 w-4" />
                Tedarik
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-4">
              <TabsContent value="general" className="space-y-4 m-0" data-testid="tab-content-phase-general">
                <Form {...phaseForm}>
                  <form onSubmit={phaseForm.handleSubmit(onSubmitPhase)} className="space-y-4" data-testid="form-phase-edit">
                    <FormField
                      control={phaseForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Faz Adı</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Faz adını girin" data-testid="input-phase-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={phaseForm.control}
                      name="colorHex"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Renk</FormLabel>
                          <div className="flex gap-2">
                            {colorPresets.map((color) => (
                              <button
                                key={color.value}
                                type="button"
                                className={`w-8 h-8 rounded-md border-2 ${field.value === color.value ? 'border-foreground' : 'border-transparent'}`}
                                style={{ backgroundColor: color.value }}
                                onClick={() => field.onChange(color.value)}
                                title={color.label}
                                data-testid={`color-preset-${color.value.replace('#', '')}`}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={phaseForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Durum</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-phase-status">
                                <SelectValue placeholder="Durum seçin" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="not_started" data-testid="select-item-phase-not-started">Başlamadı</SelectItem>
                              <SelectItem value="in_progress" data-testid="select-item-phase-in-progress">Devam Ediyor</SelectItem>
                              <SelectItem value="completed" data-testid="select-item-phase-completed">Tamamlandı</SelectItem>
                              <SelectItem value="blocked" data-testid="select-item-phase-blocked">Engelli</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={phaseForm.control}
                      name="progress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>İlerleme ({field.value}%)</FormLabel>
                          <FormControl>
                            <Input
                              type="range"
                              min="0"
                              max="100"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              data-testid="input-phase-progress"
                            />
                          </FormControl>
                          <Progress value={field.value} className="h-2 mt-2" />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={phaseForm.control}
                      name="targetDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hedef Tarih</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-phase-target-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button type="submit" disabled={updatePhaseMutation.isPending} data-testid="button-save-phase">
                        {updatePhaseMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="tasks" className="space-y-4 m-0" data-testid="tab-content-phase-tasks">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-medium">Alt Görevler</h4>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleOpenSubTaskDialog(null, true)} data-testid="button-add-category">
                      <Plus className="h-4 w-4 mr-1" />
                      Kategori Ekle
                    </Button>
                    <Button size="sm" onClick={() => handleOpenSubTaskDialog(null, false)} data-testid="button-add-subtask">
                      <Plus className="h-4 w-4 mr-1" />
                      Görev Ekle
                    </Button>
                  </div>
                </div>

                {isSubTasksLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <div className="space-y-2" data-testid="subtasks-tree">
                    {((subTasks || []).filter(st => st.isCategory)).map((category) => (
                      <Collapsible
                        key={category.id}
                        open={expandedCategories.has(category.id)}
                        onOpenChange={() => toggleCategoryExpansion(category.id)}
                      >
                        <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 hover-elevate" data-testid={`category-${category.id}`}>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon">
                              {expandedCategories.has(category.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                          <span className="font-medium flex-1" data-testid={`text-category-title-${category.id}`}>{category.title}</span>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleOpenSubTaskDialog(category.id, false); }} data-testid={`button-add-task-to-${category.id}`}>
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEditSubTask(category); }} data-testid={`button-edit-category-${category.id}`}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); requestSubTaskDelete(category.id, category.title || "Kategori"); }} data-testid={`button-delete-category-${category.id}`}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                        <CollapsibleContent className="pl-8 space-y-1 mt-1">
                          {((subTasks || []).filter(st => st.parentId === category.id && !st.isCategory)).map((task) => (
                            <div key={task.id} className="flex items-center gap-2 p-2 rounded-md hover-elevate" data-testid={`subtask-${task.id}`}>
                              <Checkbox
                                checked={task.status === "done"}
                                onCheckedChange={() => toggleSubTaskStatus(task)}
                                data-testid={`checkbox-subtask-${task.id}`}
                              />
                              <span className={`flex-1 text-sm ${task.status === "done" ? "line-through text-muted-foreground" : ""}`} data-testid={`text-subtask-title-${task.id}`}>
                                {task.title}
                              </span>
                              {task.requiresBidding && (
                                <Badge variant="outline" className="text-xs gap-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300" data-testid={`badge-bidding-${task.id}`}>
                                  <Tag className="h-3 w-3" />
                                  Teklif Gerekli
                                </Badge>
                              )}
                              <Badge className={subTaskStatusConfig[task.status || "not_started"]?.color} data-testid={`badge-subtask-status-${task.id}`}>
                                {subTaskStatusConfig[task.status || "not_started"]?.label}
                              </Badge>
                              {task.dueDate && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(task.dueDate), "d MMM", { locale: tr })}
                                </span>
                              )}
                              <Button variant="ghost" size="icon" onClick={() => handleEditSubTask(task)} data-testid={`button-edit-subtask-${task.id}`}>
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => requestSubTaskDelete(task.id, task.title || "Görev")} data-testid={`button-delete-subtask-${task.id}`}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          ))}
                          {((subTasks || []).filter(st => st.parentId === category.id && !st.isCategory)).length === 0 && (
                            <p className="text-sm text-muted-foreground py-2">Bu kategoride görev yok</p>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    ))}

                    {((subTasks || []).filter(st => !st.isCategory && !st.parentId)).length > 0 && (
                      <div className="space-y-1 mt-2">
                        <p className="text-xs text-muted-foreground font-medium mb-1">Kategorisiz Görevler</p>
                        {((subTasks || []).filter(st => !st.isCategory && !st.parentId)).map((task) => (
                          <div key={task.id} className="flex items-center gap-2 p-2 rounded-md hover-elevate" data-testid={`subtask-${task.id}`}>
                            <Checkbox
                              checked={task.status === "done"}
                              onCheckedChange={() => toggleSubTaskStatus(task)}
                              data-testid={`checkbox-subtask-${task.id}`}
                            />
                            <span className={`flex-1 text-sm ${task.status === "done" ? "line-through text-muted-foreground" : ""}`} data-testid={`text-subtask-title-${task.id}`}>
                              {task.title}
                            </span>
                            {task.requiresBidding && (
                              <Badge variant="outline" className="text-xs gap-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300" data-testid={`badge-bidding-${task.id}`}>
                                <Tag className="h-3 w-3" />
                                Teklif Gerekli
                              </Badge>
                            )}
                            <Badge className={subTaskStatusConfig[task.status || "not_started"]?.color} data-testid={`badge-subtask-status-${task.id}`}>
                              {subTaskStatusConfig[task.status || "not_started"]?.label}
                            </Badge>
                            {task.dueDate && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(task.dueDate), "d MMM", { locale: tr })}
                              </span>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => handleEditSubTask(task)} data-testid={`button-edit-subtask-${task.id}`}>
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => requestSubTaskDelete(task.id, task.title || "Görev")} data-testid={`button-delete-subtask-${task.id}`}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {(subTasks || []).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground" data-testid="text-no-subtasks">
                        <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Henüz alt görev eklenmemiş</p>
                        <p className="text-sm">Yukarıdaki butonları kullanarak kategori veya görev ekleyebilirsiniz</p>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="team" className="space-y-4 m-0" data-testid="tab-content-phase-team">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-medium">RACI Matrisi</h4>
                  <Button size="sm" onClick={() => { assignmentForm.reset(); setIsAssignmentDialogOpen(true); }} data-testid="button-add-assignment">
                    <UserPlus className="h-4 w-4 mr-1" />
                    Üye Ekle
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground mb-2">
                  <span className="font-medium">R</span> = Sorumlu, <span className="font-medium">A</span> = Hesap Verir, <span className="font-medium">C</span> = Danışılan, <span className="font-medium">I</span> = Bilgilendirilen
                </div>

                {isAssignmentsLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : (
                  <Table data-testid="table-raci">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kişi</TableHead>
                        <TableHead className="text-center w-16">R</TableHead>
                        <TableHead className="text-center w-16">A</TableHead>
                        <TableHead className="text-center w-16">C</TableHead>
                        <TableHead className="text-center w-16">I</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8" data-testid="text-no-assignments">
                            Henüz ekip üyesi atanmamış
                          </TableCell>
                        </TableRow>
                      )}
                      {assignments.map((assignment) => {
                        const displayName = assignment.user
                          ? `${assignment.user.firstName} ${assignment.user.lastName}`
                          : assignment.externalUser
                          ? `${assignment.externalUser.firstName || ""} ${assignment.externalUser.lastName || ""} (${assignment.externalUser.companyName || assignment.externalUser.specialty || "Dış"})`
                          : "Bilinmeyen";
                        return (
                          <TableRow key={assignment.id} data-testid={`row-assignment-${assignment.id}`}>
                            <TableCell>
                              <span className="font-medium" data-testid={`text-assignment-name-${assignment.id}`}>{displayName}</span>
                              {assignment.user?.role && (
                                <Badge variant="outline" className="ml-2 text-xs">{assignment.user.role}</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {assignment.raciRole === "responsible" && <Check className="h-4 w-4 mx-auto text-green-600" />}
                            </TableCell>
                            <TableCell className="text-center">
                              {assignment.raciRole === "accountable" && <Check className="h-4 w-4 mx-auto text-blue-600" />}
                            </TableCell>
                            <TableCell className="text-center">
                              {assignment.raciRole === "consulted" && <Check className="h-4 w-4 mx-auto text-yellow-600" />}
                            </TableCell>
                            <TableCell className="text-center">
                              {assignment.raciRole === "informed" && <Check className="h-4 w-4 mx-auto text-muted-foreground" />}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => requestAssignmentDelete(assignment.id, "Atama")} data-testid={`button-delete-assignment-${assignment.id}`}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
                <div className="mt-8 border-t pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-medium">Dış Kullanıcılar</h4>
                    <Button size="sm" variant="outline" onClick={() => setIsAddExternalUserDialogOpen(true)} data-testid="button-add-external-user">
                      <UserPlus className="h-4 w-4 mr-1" />
                      Dış Kullanıcı Ekle
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {externalUsersList.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Henüz dış kullanıcı eklenmemiş</p>
                    ) : (
                      externalUsersList.map((eu) => (
                        <Badge key={eu.user.id} variant="secondary" data-testid={`badge-external-user-${eu.user.id}`}>
                          {eu.user.firstName} {eu.user.lastName} - {eu.user.companyName || eu.user.specialty}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="procurement" className="space-y-4 m-0" data-testid="tab-content-phase-procurement">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-medium">Tedarik Kalemleri</h4>
                </div>

                <div className="text-sm text-muted-foreground mb-2">
                  "Teklif Gerekli" işaretli görevlerin tedarik süreçlerini buradan yönetebilirsiniz.
                </div>

                {(subTasks || []).filter(st => st.requiresBidding).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground" data-testid="text-no-procurement">
                    <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Teklif gerektiren görev bulunmuyor</p>
                    <p className="text-sm">Görevler sekmesinden "Teklif Gerekli" işaretli görev ekleyebilirsiniz</p>
                  </div>
                ) : (
                  <div className="space-y-3" data-testid="procurement-items-list">
                    {(subTasks || []).filter(st => st.requiresBidding).map((task) => {
                      const item = phaseProcurementItems.find(pi => pi.subTask?.id === task.id || (pi.item as any)?.subTaskId === task.id);
                      const itemStatus = item?.item?.status || "draft";
                      return (
                        <Card key={task.id} className="hover-elevate" data-testid={`procurement-item-${task.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1">
                                <p className="font-medium" data-testid={`text-procurement-title-${task.id}`}>{task.title}</p>
                                {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                              </div>
                              <Badge className={procurementStatusConfig[itemStatus]?.color} data-testid={`badge-procurement-status-${task.id}`}>
                                {procurementStatusConfig[itemStatus]?.label}
                              </Badge>
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  if (item?.item) {
                                    setSelectedProcurementItem(item.item);
                                    setIsProposalDialogOpen(true);
                                  } else {
                                    toast({ title: "Bilgi", description: "Önce tedarik kalemi oluşturulmalı" });
                                  }
                                }}
                                data-testid={`button-add-proposal-${task.id}`}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Teklif Gir
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={isSubTaskDialogOpen} onOpenChange={setIsSubTaskDialogOpen} data-testid="dialog-subtask">
        <DialogContent data-testid="dialog-content-subtask">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-subtask">
              {editingSubTask 
                ? (editingSubTask.isCategory ? "Kategori Düzenle" : "Görev Düzenle")
                : (subTaskForm.watch("isCategory") ? "Yeni Kategori" : "Yeni Görev")}
            </DialogTitle>
          </DialogHeader>
          <Form {...subTaskForm}>
            <form onSubmit={subTaskForm.handleSubmit(onSubmitSubTask)} className="space-y-4" data-testid="form-subtask">
              <FormField
                control={subTaskForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Başlık *</FormLabel>
                    <FormControl>
                      <Input placeholder="Görev adı" {...field} data-testid="input-subtask-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!subTaskForm.watch("isCategory") && (
                <>
                  <FormField
                    control={subTaskForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Açıklama</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Detaylı açıklama" {...field} data-testid="input-subtask-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={subTaskForm.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bitiş Tarihi</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-subtask-duedate" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={subTaskForm.control}
                    name="requiresBidding"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-subtask-bidding" />
                        </FormControl>
                        <FormLabel className="font-normal">Teklif Gerektirir</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={subTaskForm.control}
                    name="assigneeType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Atama Türü</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-subtask-assignee-type">
                              <SelectValue placeholder="Seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Atama Yok</SelectItem>
                            <SelectItem value="internal">Dahili Kullanıcı</SelectItem>
                            <SelectItem value="external">Dış Kullanıcı</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {subTaskForm.watch("assigneeType") === "internal" && (
                    <FormField
                      control={subTaskForm.control}
                      name="assigneeUserId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kullanıcı</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-subtask-user">
                                <SelectValue placeholder="Kullanıcı seçin" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {allUsers.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.firstName} {user.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {subTaskForm.watch("assigneeType") === "external" && (
                    <FormField
                      control={subTaskForm.control}
                      name="assigneeExternalId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dış Kullanıcı</FormLabel>
                          <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value?.toString() || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-subtask-external">
                                <SelectValue placeholder="Dış kullanıcı seçin" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {externalUsersList.map((eu) => (
                                <SelectItem key={eu.user.id} value={eu.user.id.toString()}>
                                  {eu.user.firstName} {eu.user.lastName} ({eu.user.companyName || eu.user.specialty || eu.user.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsSubTaskDialogOpen(false)} data-testid="button-cancel-subtask">
                  İptal
                </Button>
                <Button type="submit" disabled={addSubTaskMutation.isPending || updateSubTaskMutation.isPending} data-testid="button-save-subtask">
                  {addSubTaskMutation.isPending || updateSubTaskMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAssignmentDialogOpen} onOpenChange={setIsAssignmentDialogOpen} data-testid="dialog-assignment">
        <DialogContent data-testid="dialog-content-assignment">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-assignment">Ekip Üyesi Ekle</DialogTitle>
            <DialogDescription>Faza yeni bir RACI ataması ekleyin</DialogDescription>
          </DialogHeader>
          <Form {...assignmentForm}>
            <form onSubmit={assignmentForm.handleSubmit(onSubmitAssignment)} className="space-y-4" data-testid="form-assignment">
              <FormField
                control={assignmentForm.control}
                name="assigneeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kullanıcı Türü</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-assignment-type">
                          <SelectValue placeholder="Seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="internal">Dahili Kullanıcı</SelectItem>
                        <SelectItem value="external">Dış Kullanıcı</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {assignmentForm.watch("assigneeType") === "internal" && (
                <FormField
                  control={assignmentForm.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kullanıcı</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-assignment-user">
                            <SelectValue placeholder="Kullanıcı seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.firstName} {user.lastName} {user.role ? `(${user.role})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {assignmentForm.watch("assigneeType") === "external" && (
                <FormField
                  control={assignmentForm.control}
                  name="externalUserId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dış Kullanıcı</FormLabel>
                      <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value?.toString() || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-assignment-external">
                            <SelectValue placeholder="Dış kullanıcı seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {externalUsersList.map((eu) => (
                            <SelectItem key={eu.user.id} value={eu.user.id.toString()}>
                              {eu.user.firstName} {eu.user.lastName} ({eu.user.companyName || eu.user.specialty || eu.user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={assignmentForm.control}
                name="raciRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RACI Rolü</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-assignment-raci">
                          <SelectValue placeholder="Rol seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="responsible">R - Sorumlu (Responsible)</SelectItem>
                        <SelectItem value="accountable">A - Hesap Verir (Accountable)</SelectItem>
                        <SelectItem value="consulted">C - Danışılan (Consulted)</SelectItem>
                        <SelectItem value="informed">I - Bilgilendirilen (Informed)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAssignmentDialogOpen(false)} data-testid="button-cancel-assignment">
                  İptal
                </Button>
                <Button type="submit" disabled={addAssignmentMutation.isPending} data-testid="button-save-assignment">
                  {addAssignmentMutation.isPending ? "Kaydediliyor..." : "Ekle"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddExternalUserDialogOpen} onOpenChange={setIsAddExternalUserDialogOpen} data-testid="dialog-add-external-user">
        <DialogContent data-testid="dialog-content-add-external-user">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-add-external-user">Dış Kullanıcı Ekle</DialogTitle>
            <DialogDescription>Projeye yeni bir dış kullanıcı ekleyin</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const data = externalUserForm.getValues();
            fetch(`/api/projects/${projectId}/external-users`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            }).then(() => {
              queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "external-users"] });
              externalUserForm.reset();
              setIsAddExternalUserDialogOpen(false);
              toast({ title: "Dış kullanıcı eklendi" });
            }).catch(() => toast({ title: "Hata", description: "Eklenemedi", variant: "destructive" }));
          }} className="space-y-4" data-testid="form-add-external-user">
            <div className="space-y-2">
              <label className="text-sm font-medium">Adı</label>
              <input type="text" placeholder="Ad" {...externalUserForm.register("firstName")} className="w-full px-3 py-2 border rounded-md" data-testid="input-external-first-name" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Soyadı</label>
              <input type="text" placeholder="Soyad" {...externalUserForm.register("lastName")} className="w-full px-3 py-2 border rounded-md" data-testid="input-external-last-name" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <input type="email" placeholder="Email" {...externalUserForm.register("email")} className="w-full px-3 py-2 border rounded-md" data-testid="input-external-email" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Telefon</label>
              <input type="tel" placeholder="Telefon" {...externalUserForm.register("phone")} className="w-full px-3 py-2 border rounded-md" data-testid="input-external-phone" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Şirket</label>
              <input type="text" placeholder="Şirket Adı" {...externalUserForm.register("companyName")} className="w-full px-3 py-2 border rounded-md" data-testid="input-external-company" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Uzmanlık</label>
              <input type="text" placeholder="Uzmanlık" {...externalUserForm.register("specialty")} className="w-full px-3 py-2 border rounded-md" data-testid="input-external-specialty" />
            </div>
            <DialogFooter>
              <button type="button" variant="outline" onClick={() => setIsAddExternalUserDialogOpen(false)} className="px-4 py-2 border rounded-md" data-testid="button-cancel-external">İptal</button>
              <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-md" data-testid="button-save-external">Ekle</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isProposalDialogOpen} onOpenChange={setIsProposalDialogOpen} data-testid="dialog-proposal">
        <DialogContent className="max-w-2xl" data-testid="dialog-content-proposal">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-proposal">Teklif Yönetimi</DialogTitle>
            <DialogDescription>
              {selectedProcurementItem?.title || "Tedarik kalemi için teklifleri yönetin"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Mevcut Teklifler</h4>
              <Button size="sm" variant="outline" onClick={() => proposalForm.reset()} data-testid="button-new-proposal">
                <Plus className="h-4 w-4 mr-1" />
                Yeni Teklif
              </Button>
            </div>

            {procurementProposals.length > 0 ? (
              <Table data-testid="table-proposals">
                <TableHeader>
                  <TableRow>
                    <TableHead>Tedarikçi</TableHead>
                    <TableHead className="text-right">Fiyat</TableHead>
                    <TableHead className="text-center">Teslimat (Gün)</TableHead>
                    <TableHead className="text-center">Garanti (Ay)</TableHead>
                    <TableHead className="text-center">Durum</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {procurementProposals.map((proposal) => {
                    const vendor = project?.vendors?.find(v => v.id === proposal.vendorId);
                    return (
                      <TableRow key={proposal.id} data-testid={`row-proposal-${proposal.id}`}>
                        <TableCell className="font-medium">{vendor?.companyName || "Bilinmeyen"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(proposal.proposedPrice)}</TableCell>
                        <TableCell className="text-center">{proposal.deliveryDays || "-"}</TableCell>
                        <TableCell className="text-center">{proposal.warrantyMonths || "-"}</TableCell>
                        <TableCell className="text-center">
                          {proposal.status === "selected" ? (
                            <Badge className="bg-green-500"><Award className="h-3 w-3 mr-1" />Seçildi</Badge>
                          ) : proposal.status === "rejected" ? (
                            <Badge variant="outline" className="text-muted-foreground">Reddedildi</Badge>
                          ) : (
                            <Badge variant="outline">Beklemede</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {proposal.status !== "selected" && (
                            <Button
                              size="sm"
                              onClick={() => selectProposalMutation.mutate(proposal.id)}
                              disabled={selectProposalMutation.isPending}
                              data-testid={`button-select-proposal-${proposal.id}`}
                            >
                              Seç
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-4">Henüz teklif girilmemiş</p>
            )}

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Yeni Teklif Ekle</h4>
              <Form {...proposalForm}>
                <form onSubmit={proposalForm.handleSubmit(onSubmitProposal)} className="space-y-4" data-testid="form-proposal">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={proposalForm.control}
                      name="vendorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tedarikçi *</FormLabel>
                          <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value?.toString() || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-proposal-vendor">
                                <SelectValue placeholder="Tedarikçi seçin" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {project?.vendors?.map((vendor) => (
                                <SelectItem key={vendor.id} value={vendor.id.toString()}>
                                  {vendor.companyName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={proposalForm.control}
                      name="proposedPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fiyat (₺) *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              data-testid="input-proposal-price"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={proposalForm.control}
                      name="deliveryDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teslimat Süresi (Gün)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                              data-testid="input-proposal-delivery"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={proposalForm.control}
                      name="warrantyMonths"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Garanti Süresi (Ay)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                              data-testid="input-proposal-warranty"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={proposalForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notlar</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Ek bilgiler" {...field} data-testid="input-proposal-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsProposalDialogOpen(false)} data-testid="button-cancel-proposal">
                      Kapat
                    </Button>
                    <Button type="submit" disabled={addProposalMutation.isPending} data-testid="button-save-proposal">
                      {addProposalMutation.isPending ? "Kaydediliyor..." : "Teklif Ekle"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen} data-testid="dialog-budget">
        <DialogContent data-testid="dialog-content-budget">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-budget">{editingBudget ? "Bütçe Kalemi Düzenle" : "Yeni Bütçe Kalemi"}</DialogTitle>
          </DialogHeader>
          <Form {...budgetForm}>
            <form onSubmit={budgetForm.handleSubmit(onSubmitBudget)} className="space-y-4" data-testid="form-budget">
              <FormField
                control={budgetForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-budget-category">
                          <SelectValue placeholder="Kategori seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(budgetCategoryLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key} data-testid={`select-item-budget-${key}`}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={budgetForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Başlık *</FormLabel>
                    <FormControl>
                      <Input placeholder="Bütçe kalemi adı" {...field} data-testid="input-budget-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={budgetForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Açıklama</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Detaylı açıklama" {...field} data-testid="input-budget-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={budgetForm.control}
                  name="plannedAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Planlanan (₺)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-budget-planned" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={budgetForm.control}
                  name="actualAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gerçekleşen (₺)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-budget-actual" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsBudgetDialogOpen(false)} data-testid="button-cancel-budget">
                  İptal
                </Button>
                <Button 
                  type="submit" 
                  disabled={addBudgetMutation.isPending || updateBudgetMutation.isPending}
                  data-testid="button-save-budget"
                >
                  {addBudgetMutation.isPending || updateBudgetMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isVendorDialogOpen} onOpenChange={setIsVendorDialogOpen} data-testid="dialog-vendor">
        <DialogContent data-testid="dialog-content-vendor">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-vendor">{editingVendor ? "Tedarikçi Düzenle" : "Yeni Tedarikçi"}</DialogTitle>
          </DialogHeader>
          <Form {...vendorForm}>
            <form onSubmit={vendorForm.handleSubmit(onSubmitVendor)} className="space-y-4" data-testid="form-vendor">
              <FormField
                control={vendorForm.control}
                name="vendorType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-vendor-type">
                          <SelectValue placeholder="Kategori seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(vendorTypeLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key} data-testid={`select-item-vendor-type-${key}`}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={vendorForm.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Firma Adı *</FormLabel>
                    <FormControl>
                      <Input placeholder="Firma adı" {...field} data-testid="input-vendor-company" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={vendorForm.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Yetkili Kişi</FormLabel>
                    <FormControl>
                      <Input placeholder="İletişim kurulacak kişi" {...field} data-testid="input-vendor-contact" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={vendorForm.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefon</FormLabel>
                      <FormControl>
                        <Input placeholder="+90 5xx xxx xx xx" {...field} data-testid="input-vendor-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={vendorForm.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-posta</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@firma.com" {...field} data-testid="input-vendor-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={vendorForm.control}
                  name="contractStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sözleşme Durumu</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-vendor-contract-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending" data-testid="select-item-contract-pending">Beklemede</SelectItem>
                          <SelectItem value="signed" data-testid="select-item-contract-signed">İmzalandı</SelectItem>
                          <SelectItem value="completed" data-testid="select-item-contract-completed">Tamamlandı</SelectItem>
                          <SelectItem value="cancelled" data-testid="select-item-contract-cancelled">İptal</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={vendorForm.control}
                  name="contractAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sözleşme Tutarı (₺)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          data-testid="input-vendor-amount" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsVendorDialogOpen(false)} data-testid="button-cancel-vendor">
                  İptal
                </Button>
                <Button 
                  type="submit" 
                  disabled={addVendorMutation.isPending || updateVendorMutation.isPending}
                  data-testid="button-save-vendor"
                >
                  {addVendorMutation.isPending || updateVendorMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isRiskDialogOpen} onOpenChange={setIsRiskDialogOpen} data-testid="dialog-risk">
        <DialogContent data-testid="dialog-content-risk">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-risk">{editingRisk ? "Risk Düzenle" : "Yeni Risk"}</DialogTitle>
          </DialogHeader>
          <Form {...riskForm}>
            <form onSubmit={riskForm.handleSubmit(onSubmitRisk)} className="space-y-4" data-testid="form-risk">
              <FormField
                control={riskForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Risk Başlığı *</FormLabel>
                    <FormControl>
                      <Input placeholder="Risk tanımı" {...field} data-testid="input-risk-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={riskForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Açıklama</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Riskin detaylı açıklaması" {...field} data-testid="input-risk-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={riskForm.control}
                  name="probability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Olasılık (1-5)</FormLabel>
                      <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value.toString()}>
                        <FormControl>
                          <SelectTrigger data-testid="select-risk-probability">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1" data-testid="select-item-probability-1">1 - Çok Düşük</SelectItem>
                          <SelectItem value="2" data-testid="select-item-probability-2">2 - Düşük</SelectItem>
                          <SelectItem value="3" data-testid="select-item-probability-3">3 - Orta</SelectItem>
                          <SelectItem value="4" data-testid="select-item-probability-4">4 - Yüksek</SelectItem>
                          <SelectItem value="5" data-testid="select-item-probability-5">5 - Çok Yüksek</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={riskForm.control}
                  name="impact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Etki (1-5)</FormLabel>
                      <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value.toString()}>
                        <FormControl>
                          <SelectTrigger data-testid="select-risk-impact">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1" data-testid="select-item-impact-1">1 - Önemsiz</SelectItem>
                          <SelectItem value="2" data-testid="select-item-impact-2">2 - Küçük</SelectItem>
                          <SelectItem value="3" data-testid="select-item-impact-3">3 - Orta</SelectItem>
                          <SelectItem value="4" data-testid="select-item-impact-4">4 - Büyük</SelectItem>
                          <SelectItem value="5" data-testid="select-item-impact-5">5 - Kritik</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={riskForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durum</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-risk-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="identified" data-testid="select-item-risk-identified">Belirlendi</SelectItem>
                        <SelectItem value="mitigating" data-testid="select-item-risk-mitigating">Azaltılıyor</SelectItem>
                        <SelectItem value="resolved" data-testid="select-item-risk-resolved">Çözüldü</SelectItem>
                        <SelectItem value="occurred" data-testid="select-item-risk-occurred">Gerçekleşti</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={riskForm.control}
                name="mitigationPlan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Risk Azaltma Planı</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Bu riski azaltmak için alınacak önlemler" {...field} data-testid="input-risk-mitigation" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsRiskDialogOpen(false)} data-testid="button-cancel-risk">
                  İptal
                </Button>
                <Button 
                  type="submit" 
                  disabled={addRiskMutation.isPending || updateRiskMutation.isPending}
                  data-testid="button-save-risk"
                >
                  {addRiskMutation.isPending || updateRiskMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddPhaseDialogOpen} onOpenChange={setIsAddPhaseDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-add-phase">
          <DialogHeader>
            <DialogTitle>Yeni Faz Ekle</DialogTitle>
            <DialogDescription>Projeye yeni bir faz ekleyin</DialogDescription>
          </DialogHeader>
          <Form {...newPhaseForm}>
            <form onSubmit={newPhaseForm.handleSubmit(onSubmitNewPhase)} className="space-y-4" data-testid="form-add-phase">
              <FormField
                control={newPhaseForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Faz Adı</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Faz adını girin" data-testid="input-new-phase-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={newPhaseForm.control}
                name="phaseType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Faz Tipi</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-new-phase-type">
                          <SelectValue placeholder="Faz tipi seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(phaseTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value} data-testid={`select-item-phase-type-${value}`}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={newPhaseForm.control}
                name="colorHex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Renk</FormLabel>
                    <div className="flex gap-2">
                      {colorPresets.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          className={`w-8 h-8 rounded-md border-2 ${field.value === color.value ? 'border-foreground' : 'border-transparent'}`}
                          style={{ backgroundColor: color.value }}
                          onClick={() => field.onChange(color.value)}
                          title={color.label}
                          data-testid={`new-phase-color-preset-${color.value.replace('#', '')}`}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={newPhaseForm.control}
                name="targetDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hedef Tarih</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-new-phase-target-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddPhaseDialogOpen(false)} data-testid="button-cancel-add-phase">
                  İptal
                </Button>
                <Button type="submit" disabled={addPhaseMutation.isPending} data-testid="button-save-new-phase">
                  {addPhaseMutation.isPending ? "Ekleniyor..." : "Ekle"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={budgetDeleteState.open}
        onOpenChange={(open) => !open && cancelBudgetDelete()}
        onConfirm={() => {
          const id = confirmBudgetDelete();
          if (id !== null) deleteBudgetMutation.mutate(id as number);
        }}
        title="Bütçe Kalemini Sil"
        description={`"${budgetDeleteState.itemName || ''}" bütçe kalemini silmek istediğinize emin misiniz?`}
      />

      <ConfirmDeleteDialog
        open={vendorDeleteState.open}
        onOpenChange={(open) => !open && cancelVendorDelete()}
        onConfirm={() => {
          const id = confirmVendorDelete();
          if (id !== null) deleteVendorMutation.mutate(id as number);
        }}
        title="Tedarikçiyi Sil"
        description={`"${vendorDeleteState.itemName || ''}" tedarikçisini silmek istediğinize emin misiniz?`}
      />

      <ConfirmDeleteDialog
        open={riskDeleteState.open}
        onOpenChange={(open) => !open && cancelRiskDelete()}
        onConfirm={() => {
          const id = confirmRiskDelete();
          if (id !== null) deleteRiskMutation.mutate(id as number);
        }}
        title="Riski Sil"
        description={`"${riskDeleteState.itemName || ''}" riskini silmek istediğinize emin misiniz?`}
      />

      <ConfirmDeleteDialog
        open={subTaskDeleteState.open}
        onOpenChange={(open) => !open && cancelSubTaskDelete()}
        onConfirm={() => {
          const id = confirmSubTaskDelete();
          if (id !== null) deleteSubTaskMutation.mutate(id as number);
        }}
        title="Görevi Sil"
        description={`"${subTaskDeleteState.itemName || ''}" görevini silmek istediğinize emin misiniz?`}
      />

      <ConfirmDeleteDialog
        open={assignmentDeleteState.open}
        onOpenChange={(open) => !open && cancelAssignmentDelete()}
        onConfirm={() => {
          const id = confirmAssignmentDelete();
          if (id !== null) deleteAssignmentMutation.mutate(id as number);
        }}
        title="Atamayı Kaldır"
        description="Bu atamayı kaldırmak istediğinize emin misiniz?"
      />
    </div>
  );
}
