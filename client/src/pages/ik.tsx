import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { 
  hasPermission, 
  isHQRole, 
  type User, 
  type EmployeeWarning, 
  type DisciplinaryReport,
  type EmployeeOnboarding,
  type EmployeeDocument,
  insertUserSchema, 
  insertEmployeeWarningSchema 
} from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, EmptyStatePreset } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  UserPlus,
  UserMinus,
  Edit,
  AlertTriangle,
  Eye,
  Calendar,
  Filter,
  Key,
  FileText,
  Users,
  FileWarning,
  UserCheck,
  FolderOpen,
  Clock,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  SkipForward,
  AlertCircle,
  RotateCcw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Star,
  Building2,
  MapPin,
  UserX,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useLocation } from "wouter";
import { CreateDisciplinaryDialog, CreateDisciplinaryDialogWithSelector } from "@/components/hr/DisciplinaryDialogs";
import { EmployeeTermination, insertEmployeeTerminationSchema } from "@shared/schema";

const roleLabels: Record<string, string> = {
  admin: "Admin",
  ceo: "CEO",
  cgo: "CGO",
  muhasebe_ik: "Muhasebe & İK",
  satinalma: "Satın Alma",
  coach: "Coach",
  marketing: "Marketing",
  trainer: "Trainer (Eğitmen)",
  kalite_kontrol: "Kalite Kontrol",
  fabrika_mudur: "Fabrika Müdürü",
  muhasebe: "Muhasebe",
  teknik: "Teknik",
  destek: "Destek",
  fabrika: "Fabrika",
  yatirimci_hq: "Yatırımcı HQ",
  stajyer: "Stajyer",
  bar_buddy: "Bar Buddy",
  barista: "Barista",
  supervisor_buddy: "Supervisor Buddy",
  supervisor: "Supervisor",
  mudur: "Müdür",
  yatirimci_branch: "Yatırımcı",
  fabrika_operator: "Fabrika Operatör",
  fabrika_sorumlu: "Fabrika Sorumlu",
  fabrika_personel: "Fabrika Personel",
};

const warningTypeLabels: Record<string, string> = {
  verbal: "Sözlü Uyarı",
  written: "Yazılı Uyarı",
  final: "Son Uyarı",
};

const branchRoles = ["mudur", "supervisor", "supervisor_buddy", "barista", "bar_buddy", "stajyer"];

const hqRoles = ["ceo", "cgo", "muhasebe_ik", "muhasebe", "satinalma", "coach", "marketing", "trainer", "kalite_kontrol", "gida_muhendisi", "fabrika_mudur", "teknik", "destek", "yatirimci_hq"];

const factoryRoles = ["fabrika_operator", "fabrika_sorumlu", "fabrika_personel"];

const HQ_BRANCH_ID = 23;
const FACTORY_BRANCH_ID = 24;

function getRolesForBranch(branchId: number | undefined): string[] {
  if (branchId === HQ_BRANCH_ID) return hqRoles;
  if (branchId === FACTORY_BRANCH_ID) return factoryRoles;
  return branchRoles;
}

export default function IKPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Supervisor için şube rolü kontrolü
  const isBranchRole = user?.role && !isHQRole(user.role as any) && user.role !== 'admin';

  // Filters - Section 1: Employee List
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  // Auth yüklendikten sonra şube kullanıcıları için categoryFilter'ı "subeler" olarak ayarla
  useEffect(() => {
    if (user?.role && !isHQRole(user.role as any) && user.role !== 'admin') {
      setCategoryFilter("subeler");
    }
  }, [user?.role]);
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [probationFilter, setProbationFilter] = useState<string>("all");
  const [trainingFilter, setTrainingFilter] = useState<string>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = [
    ...(user?.role && isHQRole(user.role as any) ? [categoryFilter, branchFilter] : []),
    roleFilter, probationFilter, trainingFilter
  ].filter(f => f !== "all").length;

  // Filters - Section 2: Disciplinary
  const [disciplinaryStatusFilter, setDisciplinaryStatusFilter] = useState<string>("all");

  // Filters - Section 3: Onboarding
  const [onboardingStatusFilter, setOnboardingStatusFilter] = useState<string>("all");

  // Filters - Section 4: Documents
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>("all");

  // Filters - Section 5: Monthly Attendance Summary
  const [attendanceMonth, setAttendanceMonth] = useState<number>(new Date().getMonth() + 1);
  const [attendanceYear, setAttendanceYear] = useState<number>(new Date().getFullYear());
  const [attendanceCategoryFilter, setAttendanceCategoryFilter] = useState<string>("all");
  const [attendanceUserFilter, setAttendanceUserFilter] = useState<string>("all");

  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [warningsDialogOpen, setWarningsDialogOpen] = useState(false);
  const [addWarningDialogOpen, setAddWarningDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [addTerminationOpen, setAddTerminationOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");

  // Fetch branches
  const { data: branches = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/branches"],
  });

  // Fetch employees (backend handles branch filtering automatically)
  const employeesQueryKey = useMemo(() => {
    const baseUrl = '/api/employees';
    // HQ users can filter by branch via query param
    if (user?.role && isHQRole(user.role as any) && branchFilter !== "all") {
      return [`${baseUrl}?branchId=${branchFilter}`];
    }
    // Branch users get auto-filtered by backend
    return [baseUrl];
  }, [user?.role, branchFilter]);

  const { data: employees = [], isLoading } = useQuery<User[]>({
    queryKey: employeesQueryKey,
    enabled: !!user,
  });

  // Fetch terminated employees (ayrılan personeller)
  const terminatedQueryKey = useMemo(() => {
    const baseUrl = '/api/employees/terminated';
    if (user?.role && isHQRole(user.role as any) && branchFilter !== "all") {
      return [`${baseUrl}?branchId=${branchFilter}`];
    }
    return [baseUrl];
  }, [user?.role, branchFilter]);

  const { data: terminatedEmployees = [], isLoading: isTerminatedLoading } = useQuery<User[]>({
    queryKey: terminatedQueryKey,
    enabled: !!user && (isHQRole(user.role as any) || user.role === 'admin'),
  });

  // Fetch training progress summary for all users
  const { data: trainingProgressSummary = [] } = useQuery<Array<{ userId: string; totalModules: number; completedModules: number }>>({
    queryKey: ["/api/training/progress/summary"],
    enabled: !!user,
  });

  // Create user training completion map
  const userTrainingCompletion = useMemo(() => {
    const completionMap = new Map<string, { total: number; completed: number }>();
    
    trainingProgressSummary.forEach((summary) => {
      completionMap.set(summary.userId, {
        total: summary.totalModules,
        completed: summary.completedModules,
      });
    });
    
    return completionMap;
  }, [trainingProgressSummary]);

  // Fetch employee warnings
  const { data: employeeWarnings = [] } = useQuery<EmployeeWarning[]>({
    queryKey: [`/api/employees/${selectedEmployee?.id}/warnings`],
    enabled: !!selectedEmployee?.id,
  });

  // Fetch disciplinary reports (backend handles branch filtering automatically)
  const disciplinaryQueryKey = useMemo(() => {
    // Structured query keys for proper cache invalidation
    if (user?.role && isHQRole(user.role as any) && branchFilter !== "all") {
      return ["/api/disciplinary-reports", { branchId: branchFilter }];
    }
    return ["/api/disciplinary-reports"];
  }, [user?.role, branchFilter]);

  const { data: disciplinaryReports = [], isLoading: isDisciplinaryLoading } = useQuery<DisciplinaryReport[]>({
    queryKey: disciplinaryQueryKey,
    // Wrapper fetcher: params object → query string
    queryFn: async ({ queryKey }) => {
      const [path, params] = queryKey;
      const queryString = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : "";
      const url = `${path}${queryString}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    enabled: !!user,
  });

  // Fetch onboarding records (backend handles branch filtering automatically)
  const onboardingQueryKey = useMemo(() => {
    const baseUrl = '/api/employee-onboarding';
    // HQ users can filter by branch via query param
    if (user?.role && isHQRole(user.role as any) && branchFilter !== "all") {
      return [`${baseUrl}?branchId=${branchFilter}`];
    }
    // Branch users get auto-filtered by backend
    return [baseUrl];
  }, [user?.role, branchFilter]);

  const { data: onboardingRecords = [], isLoading: isOnboardingLoading } = useQuery<(EmployeeOnboarding & { user?: User })[]>({
    queryKey: onboardingQueryKey,
    enabled: !!user,
  });

  // Fetch employee documents (backend handles branch filtering automatically)
  const documentsQueryKey = useMemo(() => {
    const baseUrl = '/api/employee-documents';
    // HQ users can filter by branch via query param
    if (user?.role && isHQRole(user.role as any) && branchFilter !== "all") {
      return [`${baseUrl}?branchId=${branchFilter}`];
    }
    // Branch users get auto-filtered by backend
    return [baseUrl];
  }, [user?.role, branchFilter]);

  const { data: employeeDocuments = [], isLoading: isDocumentsLoading } = useQuery<(EmployeeDocument & { user?: User })[]>({
    queryKey: documentsQueryKey,
    enabled: !!user,
  });

  // Fetch termination records
  const { data: terminationRecords = [] } = useQuery<any[]>({
    queryKey: ["/api/employee-terminations"],
    enabled: isHQRole(user?.role as any),
  });

  // Monthly Attendance Summary Query
  interface AttendanceSummary {
    userId: string;
    firstName: string;
    lastName: string;
    role: string;
    branchId: number | null;
    branchName: string;
    totalShifts: number;
    totalWorkedHours: number;
    overtimeHours: number;
    approvedOvertimeMinutes: number;
    lateCount: number;
    totalLatenessMinutes: number;
    earlyLeaveCount: number;
    totalEarlyLeaveMinutes: number;
    absences: number;
    avgComplianceScore: number;
  }

  interface AttendanceTotals {
    totalEmployees: number;
    totalWorkedHours: number;
    totalOvertimeHours: number;
    totalLateArrivals: number;
    totalLatenessMinutes: number;
    totalAbsences: number;
    avgComplianceScore: number;
  }

  const canViewAttendance = user?.role && (isHQRole(user.role as any) || user.role === 'supervisor' || user.role === 'supervisor_buddy');

  const attendanceQueryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.append('month', attendanceMonth.toString());
    params.append('year', attendanceYear.toString());
    if (branchFilter !== 'all') params.append('branchId', branchFilter);
    if (attendanceCategoryFilter !== 'all') params.append('category', attendanceCategoryFilter);
    if (attendanceUserFilter !== 'all') params.append('userId', attendanceUserFilter);
    return params.toString();
  }, [attendanceMonth, attendanceYear, branchFilter, attendanceCategoryFilter, attendanceUserFilter]);

  const { data: attendanceSummaryData, isLoading: isAttendanceLoading } = useQuery<{
    month: number;
    year: number;
    summaries: AttendanceSummary[];
    totals: AttendanceTotals;
  }>({
    queryKey: ['/api/hr/monthly-attendance-summary', attendanceQueryParams],
    queryFn: async () => {
      const res = await fetch(`/api/hr/monthly-attendance-summary?${attendanceQueryParams}`);
      if (!res.ok) throw new Error('Failed to fetch attendance summary');
      return res.json();
    },
    enabled: !!user && !!canViewAttendance,
  });

  const attendanceSummaries = attendanceSummaryData?.summaries || [];
  const attendanceTotals = attendanceSummaryData?.totals;

  // Overtime requests for approval (managers/admin)
  type OvertimeRequest = {
    id: number;
    userId: string;
    requestedMinutes: number;
    reason: string;
    status: string;
    appliedToPeriod: string | null;
    createdAt: string;
    firstName: string;
    lastName: string;
  };
  
  const { data: overtimeRequests = [], isLoading: isOvertimeLoading } = useQuery<OvertimeRequest[]>({
    queryKey: ['/api/overtime-requests'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/overtime-requests");
      return res.json();
    },
    enabled: !!user && !!canViewAttendance,
  });

  const pendingOvertimeRequests = overtimeRequests.filter(r => r.status === 'pending');
  
  // Overtime approval mutation
  const approveOvertimeMutation = useMutation({
    mutationFn: async ({ id, approvedMinutes }: { id: number; approvedMinutes: number }) => {
      const res = await apiRequest("PATCH", `/api/overtime-requests/${id}/approve`, { approvedMinutes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/overtime-requests'] });
      toast({ title: "Mesai talebi onaylandı" });
    },
    onError: () => {
      toast({ title: "Onaylama başarısız", variant: "destructive" });
    },
  });
  
  // Overtime reject mutation
  const rejectOvertimeMutation = useMutation({
    mutationFn: async ({ id, rejectionReason }: { id: number; rejectionReason: string }) => {
      const res = await apiRequest("PATCH", `/api/overtime-requests/${id}/reject`, { rejectionReason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/overtime-requests'] });
      toast({ title: "Mesai talebi reddedildi" });
    },
    onError: () => {
      toast({ title: "Reddetme başarısız", variant: "destructive" });
    },
  });

  const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

  const handlePrevMonth = () => {
    if (attendanceMonth === 1) {
      setAttendanceMonth(12);
      setAttendanceYear(attendanceYear - 1);
    } else {
      setAttendanceMonth(attendanceMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (attendanceMonth === 12) {
      setAttendanceMonth(1);
      setAttendanceYear(attendanceYear + 1);
    } else {
      setAttendanceMonth(attendanceMonth + 1);
    }
  };

  // Check permissions
  const canCreate = user?.role && hasPermission(user.role as any, "employees", "create");
  const canEdit = user?.role && hasPermission(user.role as any, "employees", "edit");
  const canWarn = user?.role && hasPermission(user.role as any, "employees", "approve");

  // Filter employees (branchFilter handled by backend via query params)
  const filteredEmployees = employees.filter((emp) => {
    // GÜVENLİK: Şube kullanıcıları sadece şube personelini görebilir (HQ/Fabrika değil)
    // Backend zaten şube filtresi yapıyor ama ek güvenlik katmanı olarak frontend'de de kontrol ediyoruz
    if (isBranchRole) {
      const empIsHQ = isHQRole(emp.role as any);
      const empIsFabrika = emp.role === "fabrika";
      if (empIsHQ || empIsFabrika) return false;
    }
    
    // Category filter (Şubeler/HQ/Fabrika)
    if (categoryFilter !== "all") {
      const isHQ = isHQRole(emp.role as any);
      const isFabrika = emp.role === "fabrika";
      const isSubeler = !isHQ && !isFabrika;
      
      if (categoryFilter === "hq" && !isHQ) return false;
      if (categoryFilter === "fabrika" && !isFabrika) return false;
      if (categoryFilter === "subeler" && !isSubeler) return false;
    }
    
    // Role filter
    if (roleFilter !== "all" && emp.role !== roleFilter) return false;
    
    if (probationFilter !== "all") {
      if (!emp.probationEndDate) return probationFilter === "no_probation";
      
      const daysLeft = differenceInDays(new Date(emp.probationEndDate), new Date());
      
      if (probationFilter === "ending_soon" && daysLeft > 30) return false;
      if (probationFilter === "active" && (daysLeft < 0 || daysLeft > 90)) return false;
      if (probationFilter === "ended" && daysLeft >= 0) return false;
    }
    
    if (trainingFilter !== "all") {
      const trainingStats = userTrainingCompletion.get(emp.id);
      if (trainingFilter === "completed") {
        // Has training modules and all are completed
        if (!trainingStats || trainingStats.total === 0 || trainingStats.completed < trainingStats.total) {
          return false;
        }
      } else if (trainingFilter === "incomplete") {
        // Either has no training or has incomplete training
        if (trainingStats && trainingStats.total > 0 && trainingStats.completed === trainingStats.total) {
          return false;
        }
      } else if (trainingFilter === "none") {
        // Has no training assigned
        if (trainingStats && trainingStats.total > 0) return false;
      }
    }
    
    return true;
  });

  const getProbationStatus = (probationEndDate: string | null) => {
    if (!probationEndDate) return null;
    
    const daysLeft = differenceInDays(new Date(probationEndDate), new Date());
    
    if (daysLeft < 0) return { label: "Bitti", variant: "secondary" as const };
    if (daysLeft <= 7) return { label: `${daysLeft} gün kaldı`, variant: "destructive" as const };
    if (daysLeft <= 30) return { label: `${daysLeft} gün kaldı`, variant: "default" as const };
    return { label: `${daysLeft} gün kaldı`, variant: "secondary" as const };
  };

  // Filter disciplinary reports
  const filteredDisciplinaryReports = disciplinaryReports.filter((report) => {
    if (disciplinaryStatusFilter !== "all") {
      if (disciplinaryStatusFilter === "open" && report.status !== "open") return false;
      if (disciplinaryStatusFilter === "resolved" && report.status !== "resolved") return false;
    }
    return true;
  });

  // Filter onboarding records
  const filteredOnboardingRecords = onboardingRecords.filter((record) => {
    if (onboardingStatusFilter !== "all" && record.status !== onboardingStatusFilter) return false;
    return true;
  });

  // Filter employee documents (latest 20)
  const filteredEmployeeDocuments = employeeDocuments
    .filter((doc) => {
      if (documentTypeFilter !== "all" && doc.documentType !== documentTypeFilter) return false;
      return true;
    })
    .slice(0, 20);

  // Helper function to get employee name from userId
  const getEmployeeName = (userId: string) => {
    const employee = employees.find((emp) => emp.id === userId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Bilinmiyor";
  };

  // Helper function to get severity label
  const getSeverityLabel = (severity: string) => {
    const labels: Record<string, string> = {
      low: "Düşük",
      medium: "Orta",
      high: "Yüksek",
      critical: "Kritik",
    };
    return labels[severity] || severity;
  };

  // Helper function to get report type label
  const getReportTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      verbal_warning: "Sözlü Uyarı",
      written_warning: "Yazılı Uyarı",
      suspension: "Uzaklaştırma",
      termination: "Fesih",
      other: "Diğer",
    };
    return labels[type] || type;
  };

  // Helper function to get status label
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      not_started: "Başlamadı",
      in_progress: "Devam Ediyor",
      completed: "Tamamlandı",
      open: "Açık",
      under_review: "İnceleniyor",
      resolved: "Çözüldü",
      closed: "Kapalı",
    };
    return labels[status] || status;
  };

  // Helper function to get document type label
  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      id_card: "Kimlik",
      diploma: "Diploma",
      contract: "Sözleşme",
      health_report: "Sağlık Raporu",
    };
    return labels[type] || type;
  };

  return (
    <div className="w-full min-h-screen bg-background p-3 sm:p-4">
      <div className="max-w-full mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-page-title">İK Yönetimi</h1>
            <p className="text-sm text-muted-foreground">Personel yönetimi ve deneme süresi takibi</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(isHQRole(user?.role as any) || user?.role === 'admin') && (
              <>
                <Button variant="outline" onClick={() => setExportDialogOpen(true)} data-testid="button-export-employees">
                  <Download className="mr-2 h-4 w-4" />
                  Excel Dışa Aktar
                </Button>
                <Button variant="outline" onClick={() => setImportDialogOpen(true)} data-testid="button-import-employees">
                  <Upload className="mr-2 h-4 w-4" />
                  Excel İçe Aktar
                </Button>
              </>
            )}
            {canCreate && (
              <Button onClick={() => setAddDialogOpen(true)} data-testid="button-add-employee">
                <UserPlus className="mr-2 h-4 w-4" />
                Yeni Personel Ekle
              </Button>
            )}
          </div>
        </div>

      {/* Main Tabs Navigation */}
      <Tabs defaultValue="personel" className="w-full space-y-4">
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="inline-flex h-auto gap-1 p-1 bg-muted/50 rounded-lg whitespace-nowrap" data-testid="ik-main-tabs">
            <TabsTrigger value="personel" className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm" data-testid="tab-personel">
              <Users className="h-3.5 w-3.5 flex-shrink-0" />
              Personel
              <Badge variant="secondary" className="ml-0.5 text-[10px] px-1.5 py-0">{filteredEmployees.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="disiplin" className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm" data-testid="tab-disiplin">
              <FileWarning className="h-3.5 w-3.5 flex-shrink-0" />
              Disiplin
            </TabsTrigger>
            <TabsTrigger value="onboarding" className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm" data-testid="tab-onboarding">
              <UserCheck className="h-3.5 w-3.5 flex-shrink-0" />
              Onboarding
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm" data-testid="tab-documents">
              <FolderOpen className="h-3.5 w-3.5 flex-shrink-0" />
              Özlük
            </TabsTrigger>
            {canViewAttendance && (
              <TabsTrigger value="mesai" className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm" data-testid="tab-mesai">
                <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                Mesai
              </TabsTrigger>
            )}
            {(isHQRole(user?.role as any) || user?.role === 'supervisor') && (
              <TabsTrigger value="ise-alim" className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm" data-testid="tab-ise-alim">
                <UserPlus className="h-3.5 w-3.5 flex-shrink-0" />
                İşe Alım
              </TabsTrigger>
            )}
            {isHQRole(user?.role as any) && (
              <TabsTrigger value="istten-cikis" className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm" data-testid="tab-istten-cikis">
                <UserMinus className="h-3.5 w-3.5 flex-shrink-0" />
                Çıkış
              </TabsTrigger>
            )}
            {(isHQRole(user?.role as any) || user?.role === 'admin' || user?.role === 'supervisor') && (
              <TabsTrigger value="izinler" className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm" data-testid="tab-izinler">
                <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                İzinler
              </TabsTrigger>
            )}
            {(isHQRole(user?.role as any) || user?.role === 'admin' || user?.role === 'muhasebe') && (
              <TabsTrigger value="maas" className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm" data-testid="tab-maas">
                <Star className="h-3.5 w-3.5 flex-shrink-0" />
                Maaş
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* Tab 1: Personel Listesi */}
        <TabsContent value="personel" data-testid="content-personel">
          <Card>
              <CardContent className="w-full space-y-3 sm:space-y-4">
                {/* Tabs for Active/Terminated Employees */}
                <Tabs defaultValue="active" className="w-full">
                  <TabsList className={`grid w-full max-w-md ${(isHQRole(user?.role as any) || user?.role === 'admin') ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <TabsTrigger value="active" data-testid="tab-active-employees" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Aktif Personel
                      <Badge variant="secondary" className="ml-1">{filteredEmployees.length}</Badge>
                    </TabsTrigger>
                    {(isHQRole(user?.role as any) || user?.role === 'admin') && (
                      <TabsTrigger value="terminated" data-testid="tab-terminated-employees" className="flex items-center gap-2">
                        <UserMinus className="h-4 w-4" />
                        Ayrılan Personel
                        <Badge variant="outline" className="ml-1">{terminatedEmployees.length}</Badge>
                      </TabsTrigger>
                    )}
                  </TabsList>

                  {/* Active Employees Tab */}
                  <TabsContent value="active" className="space-y-4 mt-4">
                    {/* Filters Card - Collapsible */}
                    <Card className="bg-muted/30 border-dashed">
                      <CardHeader className="pb-0 cursor-pointer" onClick={() => setFiltersOpen(!filtersOpen)}>
                        <CardTitle className="text-sm flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            Filtreler
                            {activeFilterCount > 0 && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{activeFilterCount} aktif</Badge>
                            )}
                          </span>
                          <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
                        </CardTitle>
                      </CardHeader>
                      {filtersOpen && (
                      <CardContent className="grid grid-cols-2 lg:grid-cols-3 gap-3 pt-3">
                        {/* Category filter - Şubeler/HQ/Fabrika - only for HQ users */}
                        {user?.role && isHQRole(user.role as any) && (
                        <div>
                          <label className="text-sm font-medium">Kategori</label>
                          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger data-testid="select-category-filter" className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Tümü</SelectItem>
                              <SelectItem value="subeler">Şubeler</SelectItem>
                              <SelectItem value="hq">HQ</SelectItem>
                              <SelectItem value="fabrika">Fabrika</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        )}

                    {/* Branch filter - only for HQ users */}
                    {user?.role && isHQRole(user.role as any) && (
                      <div>
                        <label className="text-sm font-medium">Şube</label>
                        <Select value={branchFilter} onValueChange={setBranchFilter}>
                          <SelectTrigger data-testid="select-branch-filter" className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tüm Şubeler</SelectItem>
                            {branches.map((branch) => (
                              <SelectItem key={branch.id} value={branch.id.toString()}>
                                {branch.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium">Rol</label>
                      <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger data-testid="select-role-filter" className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tüm Roller</SelectItem>
                          {Object.entries(roleLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Deneme Süresi</label>
                      <Select value={probationFilter} onValueChange={setProbationFilter}>
                        <SelectTrigger data-testid="select-probation-filter" className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tümü</SelectItem>
                          <SelectItem value="ending_soon">Yakında Bitenler (30 gün)</SelectItem>
                          <SelectItem value="active">Devam Edenler</SelectItem>
                          <SelectItem value="ended">Bitenler</SelectItem>
                          <SelectItem value="no_probation">Deneme Süresi Yok</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Eğitim Durumu</label>
                      <Select value={trainingFilter} onValueChange={setTrainingFilter}>
                        <SelectTrigger data-testid="select-training-filter" className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tümü</SelectItem>
                          <SelectItem value="completed">Tamamlanmış</SelectItem>
                          <SelectItem value="incomplete">Tamamlanmamış</SelectItem>
                          <SelectItem value="none">Eğitim Atanmamış</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                      )}
                </Card>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                  <Card className="hover-elevate">
                    <CardContent className="p-3 space-y-1">
                      <p className="text-xs text-muted-foreground">Toplam Personel</p>
                      <p className="text-xl sm:text-2xl font-bold">{filteredEmployees.length}</p>
                    </CardContent>
                  </Card>
                  <Card className="hover-elevate">
                    <CardContent className="p-3 space-y-1">
                      <p className="text-xs text-muted-foreground">Deneme Süresinde</p>
                      <p className="text-xl sm:text-2xl font-bold">
                        {filteredEmployees.filter(e => e.probationEndDate && differenceInDays(new Date(e.probationEndDate), new Date()) >= 0).length}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="hover-elevate">
                    <CardContent className="p-3 space-y-1">
                      <p className="text-xs text-muted-foreground">Eğitim Tamamlı</p>
                      <p className="text-xl sm:text-2xl font-bold">
                        {filteredEmployees.filter(e => {
                          const stats = userTrainingCompletion.get(e.id);
                          return stats && stats.total > 0 && stats.completed === stats.total;
                        }).length}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="hover-elevate hidden sm:block">
                    <CardContent className="p-3 space-y-1">
                      <p className="text-xs text-muted-foreground">HQ Personel</p>
                      <p className="text-xl sm:text-2xl font-bold">
                        {filteredEmployees.filter(e => isHQRole(e.role as any)).length}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Simplified Employee List */}
                {isLoading ? (
                  <ListSkeleton count={6} variant="card" showHeader={false} />
                ) : filteredEmployees.length === 0 ? (
                  <EmptyStatePreset preset="employees" variant="filter" />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredEmployees.map((employee) => {
                      const branch = branches.find((b) => b.id === employee.branchId);
                      const trainingStats = userTrainingCompletion.get(employee.id);
                      
                      return (
                        <Link key={employee.id} href={`/personel-detay/${employee.id}`}>
                          <Card 
                            className="hover-elevate cursor-pointer transition-all h-full"
                            data-testid={`card-employee-${employee.id}`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold truncate">
                                    {employee.firstName} {employee.lastName}
                                  </h3>
                                  <Badge variant="secondary" className="mt-1">
                                    {roleLabels[employee.role] || employee.role}
                                  </Badge>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  {trainingStats && trainingStats.total > 0 ? (
                                    <Badge 
                                      variant={trainingStats.completed === trainingStats.total ? "default" : "outline"}
                                      className={trainingStats.completed === trainingStats.total ? "bg-green-600" : ""}
                                    >
                                      <Star className="h-3 w-3 mr-1" />
                                      {trainingStats.completed}/{trainingStats.total}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-muted-foreground">
                                      Eğitim Yok
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="mt-3 text-sm text-muted-foreground">
                                {branch ? (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    <span className="truncate">{branch.name}</span>
                                  </div>
                                ) : (employee as any).department ? (
                                  <div className="flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    <span className="truncate">{(employee as any).department}</span>
                                  </div>
                                ) : (
                                  <span>HQ</span>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                )}
                  </TabsContent>

                  {/* Terminated Employees Tab */}
                  <TabsContent value="terminated" className="space-y-4 mt-4">
                    {isTerminatedLoading ? (
                      <ListSkeleton count={6} variant="card" />
                    ) : terminatedEmployees.length === 0 ? (
                      <EmptyState
                        icon={UserMinus}
                        title="Ayrılan Personel Yok"
                        description="İşten ayrılan personel kaydı bulunmuyor."
                        data-testid="empty-state-terminated"
                      />
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {terminatedEmployees.map((employee) => {
                          const branch = branches.find((b) => b.id === employee.branchId);
                          return (
                            <Link key={employee.id} href={`/personel-detay/${employee.id}`}>
                              <Card 
                                className="hover-elevate cursor-pointer transition-all h-full bg-muted/30 border-dashed"
                                data-testid={`card-terminated-${employee.id}`}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-semibold truncate text-muted-foreground">
                                        {employee.firstName} {employee.lastName}
                                      </h3>
                                      <Badge variant="outline" className="mt-1">
                                        {roleLabels[employee.role] || employee.role}
                                      </Badge>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                      {(employee as any).leaveStartDate && (
                                        <div className="flex items-center gap-1 text-xs text-destructive">
                                          <Calendar className="h-3 w-3" />
                                          {format(new Date((employee as any).leaveStartDate), "dd.MM.yyyy")}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="mt-3 text-sm text-muted-foreground">
                                    {branch ? (
                                      <div className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        <span className="truncate">{branch.name}</span>
                                      </div>
                                    ) : (employee as any).department ? (
                                      <div className="flex items-center gap-1">
                                        <Building2 className="h-3 w-3" />
                                        <span className="truncate">{(employee as any).department}</span>
                                      </div>
                                    ) : (
                                      <span>HQ</span>
                                    )}
                                  </div>
                                  {(employee as any).leaveReason && (
                                    <p className="mt-2 text-xs text-muted-foreground truncate" title={(employee as any).leaveReason}>
                                      {(employee as any).leaveReason}
                                    </p>
                                  )}
                                </CardContent>
                              </Card>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Disiplin Yönetimi */}
        <TabsContent value="disiplin" data-testid="content-disiplin">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
              <div className="flex items-center gap-2">
                <FileWarning className="h-5 w-5" />
                <CardTitle>Disiplin Yönetimi</CardTitle>
                <Badge variant="secondary">{filteredDisciplinaryReports.length}</Badge>
              </div>
              {canWarn && user?.id && user?.branchId && (
                <CreateDisciplinaryDialogWithSelector 
                  
                  branchId={user.branchId} 
                />
              )}
            </CardHeader>
              <CardContent className="w-full space-y-2 sm:space-y-3">
                {/* Disciplinary Filter */}
                <div className="flex justify-between items-center">
                  <div className="flex gap-2 sm:gap-3">
                    <div className="w-[200px]">
                      <label className="text-sm font-medium">Durum</label>
                      <Select value={disciplinaryStatusFilter} onValueChange={setDisciplinaryStatusFilter}>
                        <SelectTrigger data-testid="select-disciplinary-status-filter">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tümü</SelectItem>
                          <SelectItem value="open">Açık</SelectItem>
                          <SelectItem value="resolved">Çözüldü</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Disciplinary Table */}
                {isDisciplinaryLoading ? (
                  <ListSkeleton count={5} variant="row" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Personel</TableHead>
                        <TableHead>Kayıt Türü</TableHead>
                        <TableHead>Önem</TableHead>
                        <TableHead>Olay Tarihi</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDisciplinaryReports.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            Disiplin kaydı bulunamadı
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDisciplinaryReports.map((report) => (
                          <TableRow key={report.id} data-testid={`row-disciplinary-${report.id}`}>
                            <TableCell className="font-medium">
                              {getEmployeeName(report.userId)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{getReportTypeLabel(report.reportType)}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  report.severity === 'critical' ? 'destructive' : 
                                  report.severity === 'high' ? 'default' : 
                                  'secondary'
                                }
                              >
                                {getSeverityLabel(report.severity)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(report.incidentDate), "dd.MM.yyyy")}
                            </TableCell>
                            <TableCell>
                              <Badge variant={report.status === 'resolved' ? 'default' : 'secondary'}>
                                {getStatusLabel(report.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Link href={`/personel-detay/${report.userId}`}>
                                <Button size="sm" variant="outline" data-testid={`button-disciplinary-detail-${report.id}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Detaylar
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Yeni Personel Onboarding */}
        <TabsContent value="onboarding" data-testid="content-onboarding">
          <Card>
            <CardHeader className="flex flex-row items-center gap-4 pb-4">
              <UserCheck className="h-5 w-5" />
              <CardTitle>Yeni Personel Onboarding</CardTitle>
              <Badge variant="secondary">{filteredOnboardingRecords.length}</Badge>
            </CardHeader>
              <CardContent className="w-full space-y-2 sm:space-y-3">
                {/* Onboarding Filter */}
                <div className="flex gap-2 sm:gap-3">
                  <div className="w-[200px]">
                    <label className="text-sm font-medium">Durum</label>
                    <Select value={onboardingStatusFilter} onValueChange={setOnboardingStatusFilter}>
                      <SelectTrigger data-testid="select-onboarding-status-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tümü</SelectItem>
                        <SelectItem value="not_started">Başlamadı</SelectItem>
                        <SelectItem value="in_progress">Devam Ediyor</SelectItem>
                        <SelectItem value="completed">Tamamlandı</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Onboarding Table */}
                {isOnboardingLoading ? (
                  <ListSkeleton count={5} variant="row" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Personel</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>Başlangıç</TableHead>
                        <TableHead>Tamamlanma %</TableHead>
                        <TableHead>Mentor</TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOnboardingRecords.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            Onboarding kaydı bulunamadı
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredOnboardingRecords.map((record) => (
                          <TableRow key={record.id} data-testid={`row-onboarding-${record.id}`}>
                            <TableCell className="font-medium">
                              {getEmployeeName(record.userId)}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  record.status === 'completed' ? 'default' : 
                                  record.status === 'in_progress' ? 'secondary' : 
                                  'outline'
                                }
                              >
                                {getStatusLabel(record.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(record.startDate), "dd.MM.yyyy")}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{record.completionPercentage}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {record.assignedMentorId ? getEmployeeName(record.assignedMentorId) : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Link href={`/personel-detay/${record.userId}`}>
                                <Button size="sm" variant="outline" data-testid={`button-onboarding-detail-${record.id}`}>
                                  Detayları Gör
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Özlük Dosyaları */}
        <TabsContent value="documents" data-testid="content-documents">
          <Card>
            <CardHeader className="flex flex-row items-center gap-4 pb-4">
              <FolderOpen className="h-5 w-5" />
              <CardTitle>Özlük Dosyaları</CardTitle>
              <Badge variant="secondary">{filteredEmployeeDocuments.length}</Badge>
            </CardHeader>
              <CardContent className="w-full space-y-2 sm:space-y-3">
                {/* Documents Filter */}
                <div className="flex gap-2 sm:gap-3">
                  <div className="w-[200px]">
                    <label className="text-sm font-medium">Belge Türü</label>
                    <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
                      <SelectTrigger data-testid="select-document-type-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tümü</SelectItem>
                        <SelectItem value="id_card">Kimlik</SelectItem>
                        <SelectItem value="diploma">Diploma</SelectItem>
                        <SelectItem value="contract">Sözleşme</SelectItem>
                        <SelectItem value="health_report">Sağlık Raporu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Documents Table */}
                {isDocumentsLoading ? (
                  <ListSkeleton count={5} variant="row" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Personel</TableHead>
                        <TableHead>Belge Türü</TableHead>
                        <TableHead>Belge Adı</TableHead>
                        <TableHead>Yükleme Tarihi</TableHead>
                        <TableHead>Doğrulandı</TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployeeDocuments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            Belge bulunamadı
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredEmployeeDocuments.map((doc) => (
                          <TableRow key={doc.id} data-testid={`row-document-${doc.id}`}>
                            <TableCell className="font-medium">
                              {getEmployeeName(doc.userId)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{getDocumentTypeLabel(doc.documentType)}</Badge>
                            </TableCell>
                            <TableCell>{doc.documentName}</TableCell>
                            <TableCell>
                              {doc.uploadedAt && format(new Date(doc.uploadedAt), "dd.MM.yyyy")}
                            </TableCell>
                            <TableCell>
                              <Badge variant={doc.isVerified ? 'default' : 'secondary'}>
                                {doc.isVerified ? 'Evet' : 'Hayır'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Link href={`/personel-detay/${doc.userId}`}>
                                <Button size="sm" variant="outline" data-testid={`button-document-detail-${doc.id}`}>
                                  Tüm Belgeler
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Aylık Mesai Özeti - Only for HQ and Supervisors */}
        {canViewAttendance && (
          <TabsContent value="mesai" data-testid="content-mesai">
            <Card>
              <CardHeader className="flex flex-row items-center gap-4 pb-4">
                <Clock className="h-5 w-5" />
                <CardTitle>Aylık Mesai Özeti</CardTitle>
                <Badge variant="secondary">{attendanceSummaries.length}</Badge>
              </CardHeader>
                <CardContent className="w-full space-y-3 sm:space-y-4">
                  {/* Month Navigation and Filters */}
                  <Card className="bg-muted/30 border-dashed">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        Dönem ve Filtreler
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Month Navigation */}
                      <div className="flex items-center justify-center gap-4">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handlePrevMonth}
                          data-testid="button-prev-month"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="text-center min-w-[150px]">
                          <p className="text-lg font-semibold">{monthNames[attendanceMonth - 1]} {attendanceYear}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleNextMonth}
                          disabled={attendanceMonth === new Date().getMonth() + 1 && attendanceYear === new Date().getFullYear()}
                          data-testid="button-next-month"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                      {/* Filters Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                          <label className="text-sm font-medium">Kategori</label>
                          <Select 
                            value={attendanceCategoryFilter} 
                            onValueChange={(val) => {
                              setAttendanceCategoryFilter(val);
                              // HQ veya Fabrika seçildiğinde şube filtresini sıfırla
                              if (val === 'hq' || val === 'fabrika') {
                                setBranchFilter('all');
                              }
                            }}
                          >
                            <SelectTrigger data-testid="select-attendance-category" className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Tümü</SelectItem>
                              <SelectItem value="subeler">Şubeler</SelectItem>
                              <SelectItem value="hq">HQ (Merkez)</SelectItem>
                              <SelectItem value="fabrika">Fabrika</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {/* Şube dropdown - Sadece Kategori "Şubeler" veya "Tümü" seçiliyse göster */}
                        {user?.role && isHQRole(user.role as any) && (attendanceCategoryFilter === 'subeler' || attendanceCategoryFilter === 'all') && (
                          <div>
                            <label className="text-sm font-medium">Şube</label>
                            <Select value={branchFilter} onValueChange={setBranchFilter}>
                              <SelectTrigger data-testid="select-attendance-branch" className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Tüm Şubeler</SelectItem>
                                {branches.map((branch) => (
                                  <SelectItem key={branch.id} value={branch.id.toString()}>
                                    {branch.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div>
                          <label className="text-sm font-medium">Personel</label>
                          <Select value={attendanceUserFilter} onValueChange={setAttendanceUserFilter}>
                            <SelectTrigger data-testid="select-attendance-user" className="h-9">
                              <SelectValue placeholder="Kişi Seçin" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Tüm Personel</SelectItem>
                              {employees.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                  {emp.firstName} {emp.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Stats Cards */}
                  {attendanceTotals && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
                      <Card className="hover-elevate cursor-pointer" data-testid="stat-total-employees">
                        <CardContent className="p-3 space-y-1 text-center">
                          <p className="text-xs text-muted-foreground">Personel</p>
                          <p className="text-xl sm:text-2xl font-bold">{attendanceTotals.totalEmployees}</p>
                        </CardContent>
                      </Card>
                      <Card className="hover-elevate cursor-pointer" data-testid="stat-total-hours">
                        <CardContent className="p-3 space-y-1 text-center">
                          <p className="text-xs text-muted-foreground">Toplam Saat</p>
                          <p className="text-xl sm:text-2xl font-bold">{attendanceTotals.totalWorkedHours.toFixed(1)}</p>
                        </CardContent>
                      </Card>
                      <Card className="hover-elevate cursor-pointer" data-testid="stat-overtime-hours">
                        <CardContent className="p-3 space-y-1 text-center">
                          <p className="text-xs text-muted-foreground">Fazla Mesai</p>
                          <p className="text-xl sm:text-2xl font-bold text-orange-600">{attendanceTotals.totalOvertimeHours.toFixed(1)}s</p>
                        </CardContent>
                      </Card>
                      <Card className="hover-elevate cursor-pointer" data-testid="stat-late-arrivals">
                        <CardContent className="p-3 space-y-1 text-center">
                          <p className="text-xs text-muted-foreground">Geç Kalma</p>
                          <p className="text-xl sm:text-2xl font-bold text-red-600">{attendanceTotals.totalLateArrivals}</p>
                        </CardContent>
                      </Card>
                      <Card className="hover-elevate cursor-pointer" data-testid="stat-absences">
                        <CardContent className="p-3 space-y-1 text-center">
                          <p className="text-xs text-muted-foreground">Devamsızlık</p>
                          <p className="text-xl sm:text-2xl font-bold">{attendanceTotals.totalAbsences}</p>
                        </CardContent>
                      </Card>
                      <Card className="hover-elevate cursor-pointer" data-testid="stat-compliance">
                        <CardContent className="p-3 space-y-1 text-center">
                          <p className="text-xs text-muted-foreground">Uyum Skoru</p>
                          <p className="text-xl sm:text-2xl font-bold text-green-600">{attendanceTotals.avgComplianceScore}%</p>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Attendance Table */}
                  {isAttendanceLoading ? (
                    <ListSkeleton count={5} variant="row" />
                  ) : attendanceSummaries.length === 0 ? (
                    <EmptyState
                      icon={Clock}
                      title="Mesai kaydı yok"
                      description="Bu dönem için mesai kaydı bulunamadı."
                      data-testid="empty-state-attendance"
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Personel</TableHead>
                            <TableHead>Şube</TableHead>
                            <TableHead className="text-right">Vardiya</TableHead>
                            <TableHead className="text-right">Çalışma (saat)</TableHead>
                            <TableHead className="text-right">Fazla Mesai</TableHead>
                            <TableHead className="text-right">Geç Kalma</TableHead>
                            <TableHead className="text-right">Uyum</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {attendanceSummaries.map((summary) => (
                            <TableRow 
                              key={summary.userId} 
                              className="cursor-pointer hover-elevate"
                              data-testid={`row-attendance-${summary.userId}`}
                            >
                              <TableCell className="font-medium">
                                {summary.firstName} {summary.lastName}
                                <br />
                                <span className="text-xs text-muted-foreground">{roleLabels[summary.role] || summary.role}</span>
                              </TableCell>
                              <TableCell>{summary.branchName}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="secondary">{summary.totalShifts}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {summary.totalWorkedHours.toFixed(1)}s
                              </TableCell>
                              <TableCell className="text-right">
                                {summary.overtimeHours > 0 ? (
                                  <Badge variant="default" className="bg-orange-600">{summary.overtimeHours.toFixed(1)}s</Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {summary.lateCount > 0 ? (
                                  <Badge variant="destructive">{summary.lateCount}x ({summary.totalLatenessMinutes}dk)</Badge>
                                ) : (
                                  <span className="text-green-600">✓</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge 
                                  variant={summary.avgComplianceScore >= 80 ? "default" : summary.avgComplianceScore >= 60 ? "secondary" : "destructive"}
                                >
                                  {summary.avgComplianceScore}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
            </Card>

            {/* Overtime Requests Approval Section */}
            <Card className="mt-4">
              <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <CardTitle>Mesai Talepleri</CardTitle>
                  {pendingOvertimeRequests.length > 0 && (
                    <Badge variant="destructive">{pendingOvertimeRequests.length} Bekliyor</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isOvertimeLoading ? (
                  <ListSkeleton count={3} variant="row" />
                ) : pendingOvertimeRequests.length === 0 ? (
                  <EmptyState
                    icon={Clock}
                    title="Mesai talebi yok"
                    description="Bekleyen mesai talebi bulunmuyor."
                    data-testid="empty-state-overtime"
                  />
                ) : (
                  <div className="space-y-3">
                    {pendingOvertimeRequests.map((req) => (
                      <div 
                        key={req.id}
                        className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg gap-3"
                        data-testid={`overtime-approval-${req.id}`}
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{req.firstName} {req.lastName}</span>
                            <Badge variant="secondary">{Math.floor(req.requestedMinutes / 60)} saat {req.requestedMinutes % 60} dk</Badge>
                            {req.appliedToPeriod && (
                              <Badge variant="outline">{req.appliedToPeriod}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{req.reason}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(req.createdAt), "d MMM yyyy HH:mm")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => approveOvertimeMutation.mutate({ id: req.id, approvedMinutes: req.requestedMinutes })}
                            disabled={approveOvertimeMutation.isPending}
                            data-testid={`button-approve-overtime-${req.id}`}
                          >
                            Onayla
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => rejectOvertimeMutation.mutate({ id: req.id, rejectionReason: "Talep reddedildi" })}
                            disabled={rejectOvertimeMutation.isPending}
                            data-testid={`button-reject-overtime-${req.id}`}
                          >
                            Reddet
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Tab 6: İşe Alım Yönetimi */}
        {(isHQRole(user?.role as any) || user?.role === 'supervisor') && (
          <TabsContent value="ise-alim" data-testid="content-ise-alim">
            <Card>
              <CardHeader className="flex flex-row items-center gap-4 pb-4">
                <UserPlus className="h-5 w-5" />
                <CardTitle>İşe Alım Yönetimi</CardTitle>
              </CardHeader>
              <CardContent className="w-full space-y-4">
                <RecruitmentSection />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Tab 7: İşten Çıkış Kayıtları */}
        {isHQRole(user?.role as any) && (
          <TabsContent value="istten-cikis" data-testid="content-istten-cikis">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
                <div className="flex items-center gap-2">
                  <UserMinus className="h-5 w-5" />
                  <CardTitle>İşten Çıkış Kayıtları</CardTitle>
                </div>
                <Button onClick={() => setAddTerminationOpen(true)} size="sm" data-testid="button-add-termination">
                  <UserMinus className="mr-2 h-4 w-4" />
                  Ayrılış Ekle
                </Button>
              </CardHeader>
              <CardContent className="w-full space-y-4">
                {terminationRecords.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-sm text-muted-foreground">Ayrılış kaydı bulunmuyor</p>
                  </Card>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {terminationRecords.map((record: any) => (
                      <Card key={record.employee_terminations?.id} className="p-4 hover-elevate">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{record.user?.firstName} {record.user?.lastName}</p>
                            <p className="text-sm text-muted-foreground">{record.employee_terminations?.terminationType === 'resignation' ? 'İstifa' : 'Fesih'}</p>
                            <p className="text-xs text-muted-foreground">{record.employee_terminations?.terminationDate ? format(new Date(record.employee_terminations.terminationDate), "dd.MM.yyyy") : "-"}</p>
                          </div>
                          <Badge>{record.employee_terminations?.totalPayment ? `${record.employee_terminations.totalPayment.toLocaleString('tr-TR')} ₺` : "Ödeme Yapılmadı"}</Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Tab 8: İzin Bakiyeleri ve Resmi Tatiller (HQ + admin) */}
        {(isHQRole(user?.role as any) || user?.role === 'admin') && (
          <TabsContent value="izinler" data-testid="content-izinler">
            <LeaveManagementSection employees={employees} />
          </TabsContent>
        )}

        {/* Tab 9: Maaş & Yan Haklar (HQ + admin + muhasebe) */}
        {(isHQRole(user?.role as any) || user?.role === 'admin' || user?.role === 'muhasebe') && (
          <TabsContent value="maas" data-testid="content-maas">
            <SalaryManagementSection employees={employees} branches={branches} />
          </TabsContent>
        )}
      </Tabs>

      {/* Export Dialog */}
      <ExportEmployeesDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        branches={branches}
      />

      {/* Import Dialog */}
      <ImportEmployeesDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />

      {/* Add Employee Dialog */}
      {canCreate && (
        <AddEmployeeDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          branches={branches}
          userRole={user?.role}
          userBranchId={user?.branchId ?? undefined}
        />
      )}

      {/* Edit Employee Dialog */}
      {canEdit && selectedEmployee && (
        <EditEmployeeDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          employee={selectedEmployee}
          branches={branches}
          userRole={user?.role}
        />
      )}

      {/* Warnings Dialog */}
      {selectedEmployee && (
        <WarningsDialog
          open={warningsDialogOpen}
          onOpenChange={setWarningsDialogOpen}
          employee={selectedEmployee}
          warnings={employeeWarnings}
        />
      )}

      {/* Add Warning Dialog */}
      {canWarn && selectedEmployee && (
        <AddWarningDialog
          open={addWarningDialogOpen}
          onOpenChange={setAddWarningDialogOpen}
          employee={selectedEmployee}
        />
      )}

      {/* Reset Password Dialog */}
      {(user?.role === 'admin' || user?.role === 'coach') && selectedEmployee && (
        <ResetPasswordDialog
          open={resetPasswordDialogOpen}
          onOpenChange={setResetPasswordDialogOpen}
          employee={selectedEmployee}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
        />
      )}

      {/* Add Termination Dialog */}
      {isHQRole(user?.role as any) && (
        <AddTerminationDialog
          open={addTerminationOpen}
          onOpenChange={setAddTerminationOpen}
          employees={employees}
        />
      )}
      </div>
    </div>
  );
}

// Add Employee Dialog Component
function AddEmployeeDialog({
  open,
  onOpenChange,
  branches,
  userRole,
  userBranchId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: { id: number; name: string }[];
  userRole?: string;
  userBranchId?: number;
}) {
  const { toast } = useToast();

  const createEmployeeSchema = insertUserSchema.extend({
    username: z.string().min(3, "Kullanıcı adı en az 3 karakter olmalı"),
    hashedPassword: z.string().min(6, "Şifre en az 6 karakter olmalı"),
    firstName: z.string().min(1, "Ad zorunludur"),
    lastName: z.string().min(1, "Soyad zorunludur"),
  });

  type CreateEmployeeForm = {
    username: string;
    hashedPassword: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    branchId?: number | null;
    hireDate: string;
    probationEndDate: string;
    birthDate: string;
    phoneNumber: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    notes: string;
    employmentType: string;
    weeklyHours: number;
  };

  const isSupervisor = userRole === "supervisor";
  const defaultCategory = isSupervisor ? "branch" : "hq";
  const [personnelCategory, setPersonnelCategory] = useState<"hq" | "factory" | "branch">(defaultCategory);

  const availableRoles = useMemo(() => {
    if (personnelCategory === "hq") return hqRoles;
    if (personnelCategory === "factory") return factoryRoles;
    return branchRoles;
  }, [personnelCategory]);

  const regularBranches = useMemo(() => {
    return branches.filter(b => b.id !== HQ_BRANCH_ID && b.id !== FACTORY_BRANCH_ID);
  }, [branches]);

  const form = useForm<CreateEmployeeForm>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      username: "",
      hashedPassword: "",
      email: "",
      firstName: "",
      lastName: "",
      role: isSupervisor ? "barista" : hqRoles[0] || "barista",
      branchId: isSupervisor ? userBranchId : undefined,
      hireDate: "",
      probationEndDate: "",
      birthDate: "",
      phoneNumber: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      notes: "",
      employmentType: "fulltime",
      weeklyHours: 45,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateEmployeeForm) => {
      const payload = { ...data };
      if (personnelCategory === "hq") {
        payload.branchId = HQ_BRANCH_ID;
      } else if (personnelCategory === "factory") {
        payload.branchId = FACTORY_BRANCH_ID;
      }
      return apiRequest("POST", "/api/employees", payload);
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Personel eklendi",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Personel eklenirken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const handleCategoryChange = (cat: "hq" | "factory" | "branch") => {
    setPersonnelCategory(cat);
    const roles = cat === "hq" ? hqRoles : cat === "factory" ? factoryRoles : branchRoles;
    form.setValue("role", roles[0] || "barista");
    if (cat === "branch") {
      form.setValue("branchId", regularBranches[0]?.id || undefined);
    } else {
      form.setValue("branchId", undefined);
    }
  };

  const onSubmit = (data: CreateEmployeeForm) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Yeni Personel Ekle</DialogTitle>
          <DialogDescription>
            Yeni personel bilgilerini girin
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-2 sm:space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ad *</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-first-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Soyad *</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-last-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kullanıcı Adı *</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-username" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hashedPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şifre *</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} value={field.value || ""} data-testid="input-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-posta</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} value={field.value || ""} data-testid="input-email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isSupervisor && (
              <div>
                <FormLabel>Personel Kategorisi *</FormLabel>
                <div className="flex gap-2 mt-1">
                  <Button
                    type="button"
                    variant={personnelCategory === "hq" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => handleCategoryChange("hq")}
                    data-testid="button-category-hq"
                  >
                    <Building2 className="w-4 h-4 mr-1" />
                    Merkez (HQ)
                  </Button>
                  <Button
                    type="button"
                    variant={personnelCategory === "factory" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => handleCategoryChange("factory")}
                    data-testid="button-category-factory"
                  >
                    <Building2 className="w-4 h-4 mr-1" />
                    Fabrika
                  </Button>
                  <Button
                    type="button"
                    variant={personnelCategory === "branch" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => handleCategoryChange("branch")}
                    data-testid="button-category-branch"
                  >
                    <MapPin className="w-4 h-4 mr-1" />
                    Şube
                  </Button>
                </div>
              </div>
            )}

            <div className={`grid gap-2 sm:gap-3 ${personnelCategory === "branch" && !isSupervisor ? "grid-cols-2" : "grid-cols-1"}`}>
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-role">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(roleLabels)
                          .filter(([key]) => availableRoles.includes(key))
                          .map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {personnelCategory === "branch" && !isSupervisor && (
                <FormField
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Şube *</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value ? field.value.toString() : ""}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-branch">
                            <SelectValue placeholder="Şube seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {regularBranches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id.toString()}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {isSupervisor && (
                <input type="hidden" value={userBranchId || ""} />
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <FormField
                control={form.control}
                name="hireDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>İşe Giriş Tarihi</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ""} data-testid="input-hire-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="probationEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deneme Süresi Bitiş</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ""} data-testid="input-probation-end" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Doğum Tarihi</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ""} data-testid="input-birth-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefon</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} data-testid="input-phone" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <FormField
                control={form.control}
                name="employmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Çalışma Tipi</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || "fulltime"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-employment-type">
                          <SelectValue placeholder="Çalışma tipi seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="fulltime">Tam Zamanlı (45 saat)</SelectItem>
                        <SelectItem value="parttime">Yarı Zamanlı</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="weeklyHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Haftalık Saat</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={10} 
                        max={45}
                        {...field} 
                        value={field.value || 45}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 45)}
                        data-testid="input-weekly-hours" 
                        disabled={form.watch("employmentType") === "fulltime"}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Tam zamanlı: 45 saat, Yarı zamanlı: 10-30 saat
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <FormField
                control={form.control}
                name="emergencyContactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Acil Durum Kişisi</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-emergency-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emergencyContactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Acil Durum Telefonu</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-emergency-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notlar</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ""} data-testid="textarea-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-employee">
                {createMutation.isPending ? "Ekleniyor..." : "Personel Ekle"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Employee Dialog Component (continued in next message due to length)
function EditEmployeeDialog({
  open,
  onOpenChange,
  employee,
  branches,
  userRole,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: User;
  branches: { id: number; name: string }[];
  userRole?: string;
}) {
  const { toast } = useToast();

  const form = useForm({
    defaultValues: {
      firstName: employee.firstName || "",
      lastName: employee.lastName || "",
      email: employee.email || "",
      role: employee.role,
      branchId: employee.branchId,
      hireDate: employee.hireDate || "",
      probationEndDate: employee.probationEndDate || "",
      birthDate: employee.birthDate || "",
      phoneNumber: employee.phoneNumber || "",
      emergencyContactName: employee.emergencyContactName || "",
      emergencyContactPhone: employee.emergencyContactPhone || "",
      notes: employee.notes || "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return apiRequest("PUT", `/api/employees/${employee.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Personel bilgileri güncellendi",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Güncelleme sırasında hata oluştu",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: Record<string, unknown>) => {
    updateMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Personel Düzenle</DialogTitle>
          <DialogDescription>
            {employee.firstName} {employee.lastName} - Bilgileri Güncelle
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-2 sm:space-y-3">
            {userRole === "admin" && (
              <>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ad</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Soyad</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rol</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(roleLabels)
                              .filter(([key]) => key !== "admin")
                              .map(([key, label]) => (
                                <SelectItem key={key} value={key}>
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
                    control={form.control}
                    name="branchId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Şube</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Şube seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {branches.map((branch) => (
                              <SelectItem key={branch.id} value={branch.id.toString()}>
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

                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <FormField
                    control={form.control}
                    name="hireDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>İşe Giriş Tarihi</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="probationEndDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deneme Süresi Bitiş</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="birthDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Doğum Tarihi</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {(userRole === "supervisor" || userRole === "coach") && (
              <>
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefon</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <FormField
                    control={form.control}
                    name="emergencyContactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Acil Durum Kişisi</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emergencyContactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Acil Durum Telefonu</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notlar</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormDescription>
                    {userRole === "coach" && "Eğitim ve gelişim notları"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Güncelleniyor..." : "Güncelle"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Warnings Dialog Component
function WarningsDialog({
  open,
  onOpenChange,
  employee,
  warnings,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: User;
  warnings: EmployeeWarning[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Uyarı Geçmişi</DialogTitle>
          <DialogDescription>
            {employee.firstName} {employee.lastName} - Uyarı Kayıtları
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-2 sm:gap-3 max-h-[60vh] overflow-y-auto">
          {warnings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Uyarı kaydı bulunmuyor
            </p>
          ) : (
            warnings.map((warning) => (
              <Card key={warning.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {warningTypeLabels[warning.warningType] || warning.warningType}
                      </CardTitle>
                      <CardDescription>
                        {format(new Date(warning.issuedAt), "dd MMMM yyyy HH:mm")}
                      </CardDescription>
                    </div>
                    {warning.resolvedAt && (
                      <Badge variant="secondary">Çözüldü</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{warning.description}</p>
                  {warning.notes && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Not: {warning.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Add Warning Dialog Component
function AddWarningDialog({
  open,
  onOpenChange,
  employee,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: User;
}) {
  const { toast } = useToast();

  const warningSchema = z.object({
    warningType: z.enum(["verbal", "written", "final"]),
    description: z.string().min(10, "Açıklama en az 10 karakter olmalı"),
    notes: z.string().optional(),
  });

  const form = useForm<z.infer<typeof warningSchema>>({
    resolver: zodResolver(warningSchema),
    defaultValues: {
      warningType: "verbal",
      description: "",
      notes: "",
    },
  });

  const createWarningMutation = useMutation({
    mutationFn: async (data: z.infer<typeof warningSchema>) => {
      return apiRequest("POST", `/api/employees/${employee.id}/warnings`, data);
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Uyarı kaydedildi",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/employees", employee.id, "warnings"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Uyarı eklenirken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof warningSchema>) => {
    createWarningMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Uyarı Ekle</DialogTitle>
          <DialogDescription>
            {employee.firstName} {employee.lastName} - Yeni Uyarı
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-2 sm:space-y-3">
            <FormField
              control={form.control}
              name="warningType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Uyarı Türü</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-warning-type">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="verbal">Sözlü Uyarı</SelectItem>
                      <SelectItem value="written">Yazılı Uyarı</SelectItem>
                      <SelectItem value="final">Son Uyarı</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Açıklama</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} data-testid="textarea-warning-description" />
                  </FormControl>
                  <FormDescription>
                    Uyarının nedeni ve detayları
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ek Notlar (Opsiyonel)</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ""} rows={2} data-testid="textarea-warning-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={createWarningMutation.isPending} data-testid="button-submit-warning">
                {createWarningMutation.isPending ? "Kaydediliyor..." : "Uyarı Ekle"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


// Reset Password Dialog Component
function ResetPasswordDialog({
  open,
  onOpenChange,
  employee,
  newPassword,
  setNewPassword,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: User;
  newPassword: string;
  setNewPassword: (password: string) => void;
}) {
  const { toast } = useToast();

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { newPassword: string }) => {
      return apiRequest("POST", `/api/employees/${employee.id}/reset-password`, data);
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Şifre başarıyla sıfırlandı",
      });
      onOpenChange(false);
      setNewPassword("");
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Şifre sıfırlanırken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast({
        title: "Hata",
        description: "Şifre en az 8 karakter olmalıdır",
        variant: "destructive",
      });
      return;
    }
    if (!/[A-Za-z]/.test(newPassword)) {
      toast({
        title: "Hata",
        description: "Şifre en az bir harf içermelidir",
        variant: "destructive",
      });
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      toast({
        title: "Hata",
        description: "Şifre en az bir rakam içermelidir",
        variant: "destructive",
      });
      return;
    }
    resetPasswordMutation.mutate({ newPassword });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Şifre Sıfırla</DialogTitle>
          <DialogDescription>
            {employee.firstName} {employee.lastName} - Yeni Şifre Belirle
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="w-full space-y-2 sm:space-y-3">
          <div className="flex flex-col gap-3 sm:gap-4">
            <label className="text-sm font-medium">Yeni Şifre</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="En az 8 karakter (harf ve rakam)"
              data-testid="input-new-password"
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">
              Şifre en az 8 karakter olmalı, en az bir harf ve bir rakam içermelidir
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button 
              type="submit" 
              disabled={resetPasswordMutation.isPending || newPassword.length < 8}
              data-testid="button-submit-reset-password"
            >
              {resetPasswordMutation.isPending ? "Sıfırlanıyor..." : "Şifreyi Sıfırla"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Recruitment Section Component
function RecruitmentSection() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [addPositionOpen, setAddPositionOpen] = useState(false);
  const [addApplicationOpen, setAddApplicationOpen] = useState(false);
  const [addInterviewOpen, setAddInterviewOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [selectedPosition, setSelectedPosition] = useState<any>(null);
  const [selectedInterview, setSelectedInterview] = useState<any>(null);
  const [interviewDetailOpen, setInterviewDetailOpen] = useState(false);
  const [positionClosingOpen, setPositionClosingOpen] = useState(false);
  const [branchFilterId, setBranchFilterId] = useState<string>("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [interviewStatusFilter, setInterviewStatusFilter] = useState<string>("all");
  const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);

  // Fetch job positions
  const { data: positions = [], isLoading: isPositionsLoading } = useQuery<any[]>({
    queryKey: ["/api/job-positions"],
    enabled: !!user,
  });

  // Fetch recruitment stats
  const { data: stats } = useQuery<{
    openPositions: number;
    newApplications: number;
    scheduledInterviews: number;
    hiredThisMonth: number;
  }>({
    queryKey: ["/api/hr/recruitment-stats"],
    enabled: !!user,
  });

  // Fetch applications
  const { data: applications = [] } = useQuery<any[]>({
    queryKey: ["/api/job-applications"],
    enabled: !!user,
  });

  // Fetch branches
  const { data: branches = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/branches"],
  });

  // Fetch interviews
  const { data: interviewsData = [] } = useQuery<any[]>({
    queryKey: ["/api/interviews"],
    enabled: !!user,
  });

  const statusLabels: Record<string, string> = {
    open: "Açık",
    paused: "Durduruldu",
    filled: "Dolduruldu",
    cancelled: "İptal",
    new: "Yeni",
    screening: "Ön Değerlendirme",
    interview_scheduled: "Mülakat Planlandı",
    interview_completed: "Mülakat Tamamlandı",
    offered: "Teklif Yapıldı",
    hired: "İşe Alındı",
    rejected: "Reddedildi",
    withdrawn: "Çekildi",
  };

  const priorityLabels: Record<string, string> = {
    low: "Düşük",
    normal: "Normal",
    high: "Yüksek",
    urgent: "Acil",
  };

  const filteredApplications = branchFilterId === "all" 
    ? applications 
    : applications.filter((app: any) => {
        const position = positions.find((p: any) => p.id === app.positionId);
        return position?.branchId?.toString() === branchFilterId;
      });

  const filteredInterviews = interviewsData.filter((interview: any) => {
    const app = applications.find((a: any) => a.id === interview.applicationId);
    const position = positions.find((p: any) => p.id === app?.positionId);
    
    // Branch filter
    if (branchFilterId !== "all" && position?.branchId?.toString() !== branchFilterId) {
      return false;
    }
    
    // Position filter
    if (positionFilter !== "all" && position?.id?.toString() !== positionFilter) {
      return false;
    }
    
    // Status filter
    if (interviewStatusFilter !== "all" && interview.status !== interviewStatusFilter) {
      return false;
    }
    
    return true;
  });

  const hiredCount = applications.filter((a: any) => a.status === 'hired').length;

  const toggleCandidateSelection = (appId: number) => {
    setSelectedCandidates(prev => 
      prev.includes(appId) 
        ? prev.filter(id => id !== appId)
        : [...prev, appId]
    );
  };

  return (
    <div className="space-y-4">
      {/* Stats - Compact Inline */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Açık Pozisyon:</span>
              <span className="text-sm font-bold text-blue-600">{stats?.openPositions || 0}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Yeni Başvuru:</span>
              <span className="text-sm font-bold text-orange-600">{stats?.newApplications || 0}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Planlı Mülakat:</span>
              <span className="text-sm font-bold text-purple-600">{stats?.scheduledInterviews || 0}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Bu Ay:</span>
              <span className="text-sm font-bold text-green-600">{stats?.hiredThisMonth || 0}</span>
            </div>
            <div className="flex items-center gap-1.5" data-testid="card-hired-candidates">
              <span className="text-xs text-muted-foreground">Kabul:</span>
              <span className="text-sm font-bold text-emerald-600">{hiredCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* HQ Branch Filter */}
      {isHQRole(user?.role as any) && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-medium">Şube Filtresi:</label>
          </div>
          <Select value={branchFilterId} onValueChange={setBranchFilterId}>
            <SelectTrigger className="w-[200px]" data-testid="select-branch-filter">
              <SelectValue placeholder="Tüm Şubeler" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Şubeler</SelectItem>
              {branches.map((branch: any) => (
                <SelectItem key={branch.id} value={branch.id.toString()}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedCandidates.length >= 2 && (
            <Button 
              variant="outline"
              onClick={() => setComparisonOpen(true)}
              data-testid="button-compare-candidates"
            >
              <Users className="mr-2 h-4 w-4" />
              Karşılaştır ({selectedCandidates.length})
            </Button>
          )}
        </div>
      )}

      {/* Tabs for Positions, Applications and Interviews */}
      <Tabs defaultValue="positions" className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="positions" data-testid="tab-positions">
            Pozisyonlar
            <Badge variant="secondary" className="ml-2">{positions.filter(p => p.status === 'open').length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="applications" data-testid="tab-applications">
            Başvurular
            <Badge variant="secondary" className="ml-2">{applications.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="interviews" data-testid="tab-interviews">
            Mülakatlar
            <Badge variant="secondary" className="ml-2">{interviewsData.filter(i => i.status === 'scheduled').length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Positions Tab */}
        <TabsContent value="positions" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Açık Pozisyonlar</h3>
            {isHQRole(user?.role as any) && (
              <Button onClick={() => setAddPositionOpen(true)} data-testid="button-add-position">
                <UserPlus className="mr-2 h-4 w-4" />
                Yeni Pozisyon
              </Button>
            )}
          </div>

          {isPositionsLoading ? (
            <ListSkeleton count={3} variant="card" />
          ) : positions.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title="Açık Pozisyon Yok"
              description="Yeni bir pozisyon ekleyerek başlayın."
              data-testid="empty-state-positions"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {positions.map((position: any) => (
                <Card 
                  key={position.id}
                  className="hover-elevate"
                  data-testid={`card-position-${position.id}`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{position.title}</h3>
                        <Badge 
                          variant={position.status === 'open' ? 'default' : 'secondary'}
                          className={position.status === 'open' ? 'bg-green-600' : ''}
                        >
                          {statusLabels[position.status] || position.status}
                        </Badge>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline">
                          {position.applicationCount || 0} başvuru
                        </Badge>
                        {position.priority !== 'normal' && (
                          <Badge 
                            variant={position.priority === 'urgent' ? 'destructive' : 'secondary'}
                          >
                            {priorityLabels[position.priority] || position.priority}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {position.branchName ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{position.branchName}</span>
                        </div>
                      ) : (
                        <span>HQ</span>
                      )}
                    </div>
                    {position.deadline && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Son: {format(new Date(position.deadline), "dd.MM.yyyy")}
                      </div>
                    )}
                    {position.status === 'open' && isHQRole(user?.role as any) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedPosition(position);
                          setPositionClosingOpen(true);
                        }}
                        data-testid={`button-close-position-${position.id}`}
                        className="w-full"
                      >
                        Pozisyonu Kapat
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Başvurular</h3>
            {(isHQRole(user?.role as any) || user?.role === 'supervisor') && positions.length > 0 && (
              <Button onClick={() => setAddApplicationOpen(true)} data-testid="button-add-application">
                <UserPlus className="mr-2 h-4 w-4" />
                Başvuru Ekle
              </Button>
            )}
          </div>

          {filteredApplications.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Başvuru Yok</p>
              <p className="text-sm text-muted-foreground">Henüz başvuru kaydı bulunmuyor.</p>
            </Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <span className="sr-only">Seç</span>
                  </TableHead>
                  <TableHead>Aday</TableHead>
                  <TableHead>Pozisyon</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.map((app: any) => {
                  const position = positions.find((p: any) => p.id === app.positionId);
                  return (
                    <TableRow key={app.id} data-testid={`row-application-${app.id}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedCandidates.includes(app.id)}
                          onCheckedChange={() => toggleCandidateSelection(app.id)}
                          data-testid={`checkbox-candidate-${app.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {app.firstName} {app.lastName}
                      </TableCell>
                      <TableCell>
                        {position?.title || `Pozisyon #${app.positionId}`}
                      </TableCell>
                      <TableCell>{app.phone}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge 
                            variant={
                              app.status === 'hired' ? 'default' :
                              app.status === 'rejected' ? 'destructive' :
                              'secondary'
                            }
                            className={app.status === 'hired' ? 'bg-green-600' : ''}
                          >
                            {statusLabels[app.status] || app.status}
                          </Badge>
                          {app.interviewResult && (
                            <Badge 
                              variant={
                                app.interviewResult === 'positive' ? 'default' :
                                app.interviewResult === 'finalist' ? 'default' :
                                app.interviewResult === 'negative' ? 'destructive' :
                                'secondary'
                              }
                              className={
                                app.interviewResult === 'positive' ? 'bg-green-600' :
                                app.interviewResult === 'finalist' ? 'bg-blue-600' :
                                app.interviewResult === 'negative' ? '' :
                                ''
                              }
                              data-testid={`badge-result-${app.id}`}
                            >
                              {app.interviewResult === 'positive' ? 'Pozitif' :
                               app.interviewResult === 'finalist' ? 'Finalist' :
                               app.interviewResult === 'negative' ? 'Negatif' :
                               'Beklemede'}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {app.createdAt ? format(new Date(app.createdAt), "dd.MM.yyyy") : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {app.status !== 'hired' && app.status !== 'rejected' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedApplication(app);
                              setAddInterviewOpen(true);
                            }}
                            data-testid={`button-schedule-interview-${app.id}`}
                          >
                            <Calendar className="h-3 w-3 mr-1" />
                            Mülakat
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        {/* Interviews Tab */}
        <TabsContent value="interviews" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="text-lg font-medium">Mülakatlar</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={positionFilter} onValueChange={setPositionFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-position-filter">
                  <SelectValue placeholder="Tüm Pozisyonlar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Pozisyonlar</SelectItem>
                  {positions.map((pos: any) => (
                    <SelectItem key={pos.id} value={pos.id.toString()}>
                      {pos.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={interviewStatusFilter} onValueChange={setInterviewStatusFilter}>
                <SelectTrigger className="w-[160px]" data-testid="select-interview-status-filter">
                  <SelectValue placeholder="Tüm Durumlar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Durumlar</SelectItem>
                  <SelectItem value="scheduled">Planlandı</SelectItem>
                  <SelectItem value="in_progress">Devam Ediyor</SelectItem>
                  <SelectItem value="completed">Tamamlandı</SelectItem>
                  <SelectItem value="cancelled">İptal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredInterviews.length === 0 ? (
            <Card className="p-8 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Mülakat Yok</p>
              <p className="text-sm text-muted-foreground">
                Başvuru listesinden aday seçerek mülakat planlayabilirsiniz.
              </p>
            </Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aday</TableHead>
                  <TableHead>Pozisyon</TableHead>
                  <TableHead>Tarih/Saat</TableHead>
                  <TableHead>Görüşmeci</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInterviews.map((interview: any) => {
                  const app = applications.find((a: any) => a.id === interview.applicationId);
                  const position = positions.find((p: any) => p.id === app?.positionId);
                  return (
                    <TableRow 
                      key={interview.id} 
                      data-testid={`row-interview-${interview.id}`}
                      className="cursor-pointer hover-elevate"
                      onClick={() => {
                        setSelectedInterview({ ...interview, application: app, position });
                        setInterviewDetailOpen(true);
                      }}
                    >
                      <TableCell className="font-medium">
                        {app ? `${app.firstName} ${app.lastName}` : `Başvuru #${interview.applicationId}`}
                      </TableCell>
                      <TableCell>
                        {position?.title || '-'}
                      </TableCell>
                      <TableCell>
                        {interview.scheduledDate ? format(new Date(interview.scheduledDate), "dd.MM.yyyy HH:mm") : "-"}
                      </TableCell>
                      <TableCell>{interview.notes?.split('|')[0]?.trim() || '-'}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            interview.status === 'completed' ? 'default' :
                            interview.status === 'cancelled' ? 'destructive' :
                            interview.status === 'in_progress' ? 'default' :
                            'secondary'
                          }
                          className={interview.status === 'in_progress' ? 'bg-blue-600' : ''}
                        >
                          {interview.status === 'scheduled' ? 'Planlandı' :
                           interview.status === 'in_progress' ? 'Devam Ediyor' :
                           interview.status === 'completed' ? 'Tamamlandı' :
                           interview.status === 'cancelled' ? 'İptal' : interview.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Position Dialog */}
      <AddPositionDialog 
        open={addPositionOpen} 
        onOpenChange={setAddPositionOpen} 
        branches={branches}
      />

      {/* Add Application Dialog */}
      <AddApplicationDialog 
        open={addApplicationOpen} 
        onOpenChange={setAddApplicationOpen} 
        positions={positions}
      />

      {/* Schedule Interview Dialog */}
      {selectedApplication && (
        <ScheduleInterviewDialog
          open={addInterviewOpen}
          onOpenChange={setAddInterviewOpen}
          application={selectedApplication}
        />
      )}

      {/* Interview Detail Modal */}
      {selectedInterview && (
        <InterviewDetailModal
          open={interviewDetailOpen}
          onOpenChange={setInterviewDetailOpen}
          interview={selectedInterview}
        />
      )}

      {/* Position Closing Modal */}
      {selectedPosition && (
        <PositionClosingModal
          open={positionClosingOpen}
          onOpenChange={setPositionClosingOpen}
          position={selectedPosition}
          applications={applications}
        />
      )}

      {/* Candidate Comparison Modal */}
      <CandidateComparisonModal
        open={comparisonOpen}
        onOpenChange={setComparisonOpen}
        candidates={filteredApplications.filter((app: any) => selectedCandidates.includes(app.id))}
        positions={positions}
        interviews={filteredInterviews}
        onClearSelection={() => setSelectedCandidates([])}
      />
    </div>
  );
}

// Candidate Comparison Modal
function CandidateComparisonModal({
  open,
  onOpenChange,
  candidates,
  positions,
  interviews,
  onClearSelection,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: any[];
  positions: any[];
  interviews: any[];
  onClearSelection: () => void;
}) {
  const getPosition = (positionId: number) => positions.find((p: any) => p.id === positionId);
  const getInterview = (applicationId: number) => interviews.find((i: any) => i.applicationId === applicationId);
  
  const statusLabels: Record<string, string> = {
    new: "Yeni",
    screening: "Ön Değerlendirme",
    interview_scheduled: "Mülakat Planlandı",
    interview_completed: "Mülakat Tamamlandı",
    offered: "Teklif Yapıldı",
    hired: "İşe Alındı",
    rejected: "Reddedildi",
    withdrawn: "Çekildi",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Aday Karşılaştırma ({candidates.length} aday)
          </DialogTitle>
          <DialogDescription>
            Seçilen adayları yan yana karşılaştırın
          </DialogDescription>
        </DialogHeader>

        {candidates.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">Karşılaştırılacak aday seçilmedi</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px] bg-muted/50">Özellik</TableHead>
                  {candidates.map((candidate: any) => (
                    <TableHead key={candidate.id} className="min-w-[160px] text-center">
                      {candidate.firstName} {candidate.lastName}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium bg-muted/30">Pozisyon</TableCell>
                  {candidates.map((c: any) => (
                    <TableCell key={c.id} className="text-center">
                      {getPosition(c.positionId)?.title || '-'}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/30">Durum</TableCell>
                  {candidates.map((c: any) => (
                    <TableCell key={c.id} className="text-center">
                      <Badge 
                        variant={c.status === 'hired' ? 'default' : c.status === 'rejected' ? 'destructive' : 'secondary'}
                        className={c.status === 'hired' ? 'bg-green-600' : ''}
                      >
                        {statusLabels[c.status] || c.status}
                      </Badge>
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/30">Telefon</TableCell>
                  {candidates.map((c: any) => (
                    <TableCell key={c.id} className="text-center">{c.phone || '-'}</TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/30">E-posta</TableCell>
                  {candidates.map((c: any) => (
                    <TableCell key={c.id} className="text-center text-sm">{c.email || '-'}</TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/30">Başvuru Tarihi</TableCell>
                  {candidates.map((c: any) => (
                    <TableCell key={c.id} className="text-center text-sm">
                      {c.createdAt ? format(new Date(c.createdAt), "dd.MM.yyyy") : '-'}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/30">Mülakat Durumu</TableCell>
                  {candidates.map((c: any) => {
                    const interview = getInterview(c.id);
                    return (
                      <TableCell key={c.id} className="text-center">
                        {interview ? (
                          <Badge variant={interview.status === 'completed' ? 'default' : 'secondary'}>
                            {interview.status === 'scheduled' ? 'Planlandı' :
                             interview.status === 'completed' ? 'Tamamlandı' :
                             interview.status === 'in_progress' ? 'Devam Ediyor' : '-'}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">Mülakat yok</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/30">Mülakat Puanı</TableCell>
                  {candidates.map((c: any) => {
                    const interview = getInterview(c.id);
                    return (
                      <TableCell key={c.id} className="text-center">
                        {interview?.overallRating ? (
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            <span className="font-bold">{interview.overallRating}/5</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/30">Güçlü Yönler</TableCell>
                  {candidates.map((c: any) => {
                    const interview = getInterview(c.id);
                    return (
                      <TableCell key={c.id} className="text-center text-sm">
                        {interview?.strengths || '-'}
                      </TableCell>
                    );
                  })}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/30">Zayıf Yönler</TableCell>
                  {candidates.map((c: any) => {
                    const interview = getInterview(c.id);
                    return (
                      <TableCell key={c.id} className="text-center text-sm">
                        {interview?.weaknesses || '-'}
                      </TableCell>
                    );
                  })}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/30">Notlar</TableCell>
                  {candidates.map((c: any) => (
                    <TableCell key={c.id} className="text-center text-sm">
                      {c.notes || '-'}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => {
            onClearSelection();
            onOpenChange(false);
          }}>
            Seçimi Temizle
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Add Position Dialog
function AddPositionDialog({
  open,
  onOpenChange,
  branches,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: { id: number; name: string }[];
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [targetRole, setTargetRole] = useState("barista");
  const [branchId, setBranchId] = useState<string>("hq");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [headcount, setHeadcount] = useState(1);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/job-positions", data);
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Pozisyon oluşturuldu" });
      queryClient.invalidateQueries({ queryKey: ["/api/job-positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/recruitment-stats"] });
      onOpenChange(false);
      setTitle("");
      setDescription("");
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Pozisyon oluşturulurken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Hata", description: "Pozisyon adı gerekli", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      title,
      targetRole,
      branchId: branchId === "hq" || branchId === "" ? null : parseInt(branchId),
      description,
      priority,
      headcount,
      status: "open",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni Pozisyon Ekle</DialogTitle>
          <DialogDescription>
            Açık pozisyon bilgilerini girin
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Pozisyon Adı *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: Barista"
              data-testid="input-position-title"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Rol</label>
              <Select value={targetRole} onValueChange={setTargetRole}>
                <SelectTrigger data-testid="select-target-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="barista">Barista</SelectItem>
                  <SelectItem value="bar_buddy">Bar Buddy</SelectItem>
                  <SelectItem value="stajyer">Stajyer</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="supervisor_buddy">Supervisor Buddy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Öncelik</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger data-testid="select-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Düşük</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">Yüksek</SelectItem>
                  <SelectItem value="urgent">Acil</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Şube</label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger data-testid="select-branch">
                <SelectValue placeholder="HQ (Merkez)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hq">HQ (Merkez)</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id.toString()}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Alınacak Kişi Sayısı</label>
            <Input
              type="number"
              min={1}
              value={headcount}
              onChange={(e) => setHeadcount(parseInt(e.target.value) || 1)}
              data-testid="input-headcount"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Açıklama</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Pozisyon gereksinimleri..."
              rows={3}
              data-testid="input-description"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-position">
              {createMutation.isPending ? "Kaydediliyor..." : "Oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Add Application Dialog
function AddApplicationDialog({
  open,
  onOpenChange,
  positions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  positions: any[];
}) {
  const { toast } = useToast();
  const [positionId, setPositionId] = useState<string>("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState("");

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/job-applications", data);
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Başvuru eklendi" });
      queryClient.invalidateQueries({ queryKey: ["/api/job-applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/recruitment-stats"] });
      onOpenChange(false);
      setFirstName("");
      setLastName("");
      setPhone("");
      setEmail("");
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Başvuru eklenirken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!positionId || !firstName.trim() || !lastName.trim() || !phone.trim()) {
      toast({ title: "Hata", description: "Lütfen zorunlu alanları doldurun", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      positionId: parseInt(positionId),
      firstName,
      lastName,
      phone,
      email: email || undefined,
      source: source || undefined,
      status: "new",
    });
  };

  const openPositions = positions.filter(p => p.status === 'open');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni Başvuru Ekle</DialogTitle>
          <DialogDescription>
            Aday bilgilerini girin
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Pozisyon *</label>
            <Select value={positionId} onValueChange={setPositionId}>
              <SelectTrigger data-testid="select-position">
                <SelectValue placeholder="Pozisyon seçin" />
              </SelectTrigger>
              <SelectContent>
                {openPositions.map((position: any) => (
                  <SelectItem key={position.id} value={position.id.toString()}>
                    {position.title} {position.branchName ? `(${position.branchName})` : '(HQ)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Ad *</label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                data-testid="input-first-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Soyad *</label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                data-testid="input-last-name"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Telefon *</label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05XX XXX XX XX"
              data-testid="input-phone"
            />
          </div>

          <div>
            <label className="text-sm font-medium">E-posta</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="input-email"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Kaynak</label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger data-testid="select-source">
                <SelectValue placeholder="Nereden geldi?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="referans">Personel Referansı</SelectItem>
                <SelectItem value="kariyer_net">Kariyer.net</SelectItem>
                <SelectItem value="indeed">Indeed</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="yuruyen">Yürüyen (Direkt Başvuru)</SelectItem>
                <SelectItem value="diger">Diğer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-application">
              {createMutation.isPending ? "Kaydediliyor..." : "Başvuru Ekle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Schedule Interview Dialog
function ScheduleInterviewDialog({
  open,
  onOpenChange,
  application,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: any;
}) {
  const { toast } = useToast();
  const [scheduledAt, setScheduledAt] = useState("");
  const [scheduledTime, setScheduledTime] = useState("10:00");
  const [interviewerName, setInterviewerName] = useState("");
  const [interviewType, setInterviewType] = useState("in_person");
  const [notes, setNotes] = useState("");

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/interviews", data);
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Mülakat planlandı" });
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/job-applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/recruitment-stats"] });
      onOpenChange(false);
      setScheduledAt("");
      setInterviewerName("");
      setNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Mülakat oluşturulurken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const { user } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledAt || !interviewerName.trim()) {
      toast({ title: "Hata", description: "Tarih ve görüşmeci adı gerekli", variant: "destructive" });
      return;
    }
    const dateTime = new Date(`${scheduledAt}T${scheduledTime}`);
    createMutation.mutate({
      applicationId: application.id,
      scheduledDate: dateTime.toISOString(),
      interviewerId: user?.id,
      interviewType,
      notes: interviewerName + (notes ? ` | ${notes}` : ''),
      status: "scheduled",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mülakat Planla</DialogTitle>
          <DialogDescription>
            {application.firstName} {application.lastName} için mülakat planla
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Tarih *</label>
              <Input
                type="date"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                data-testid="input-interview-date"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Saat *</label>
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                data-testid="input-interview-time"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Görüşmeci *</label>
            <Input
              value={interviewerName}
              onChange={(e) => setInterviewerName(e.target.value)}
              placeholder="Görüşmeyi yapacak kişi"
              data-testid="input-interviewer"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Mülakat Tipi</label>
            <Select value={interviewType} onValueChange={setInterviewType}>
              <SelectTrigger data-testid="select-interview-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_person">Yüz Yüze</SelectItem>
                <SelectItem value="phone">Telefon</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Notlar</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Mülakat hakkında notlar..."
              rows={2}
              data-testid="input-interview-notes"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-interview">
              {createMutation.isPending ? "Kaydediliyor..." : "Planla"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Position Closing Modal - Pozisyon kapatma ve ret maili gönderme
function PositionClosingModal({
  open,
  onOpenChange,
  position,
  applications,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: any;
  applications: any[];
}) {
  const { toast } = useToast();
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>("");
  const [closedReason, setClosedReason] = useState<string>("hired");
  const [confirmRejectionEmails, setConfirmRejectionEmails] = useState(false);

  const closeMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/job-positions/${position.id}/close`, data);
    },
    onSuccess: (response: any) => {
      toast({ 
        title: "Başarılı", 
        description: response.message || "Pozisyon kapatıldı ve ret mailleri gönderildi"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/job-positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/job-applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/recruitment-stats"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Pozisyon kapatılırken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmRejectionEmails) {
      toast({ 
        title: "Uyarı", 
        description: "Ret mailleri gönderileceğini onaylamalısınız",
        variant: "destructive"
      });
      return;
    }
    closeMutation.mutate({
      selectedApplicationId: selectedApplicationId ? parseInt(selectedApplicationId) : undefined,
      closedReason,
    });
  };

  const positionApplications = applications.filter((app: any) => app.positionId === position.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pozisyonu Kapat</DialogTitle>
          <DialogDescription>
            {position.title} pozisyonunu kapatın ve başvurucuları bilgilendirin
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Kapatma Sebebi *</label>
            <Select value={closedReason} onValueChange={setClosedReason}>
              <SelectTrigger data-testid="select-closed-reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hired">İşe Alındı</SelectItem>
                <SelectItem value="no_candidates">Uygun Aday Yok</SelectItem>
                <SelectItem value="cancelled">İptal Edildi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {closedReason === "hired" && (
            <div>
              <label className="text-sm font-medium">İşe Alınan Aday</label>
              <Select value={selectedApplicationId} onValueChange={setSelectedApplicationId}>
                <SelectTrigger data-testid="select-hired-candidate">
                  <SelectValue placeholder="Aday seçin" />
                </SelectTrigger>
                <SelectContent>
                  {positionApplications.map((app: any) => (
                    <SelectItem key={app.id} value={app.id.toString()}>
                      {app.firstName} {app.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="confirm-emails"
              checked={confirmRejectionEmails}
              onCheckedChange={(checked) => setConfirmRejectionEmails(!!checked)}
              data-testid="checkbox-confirm-rejection-emails"
            />
            <label htmlFor="confirm-emails" className="text-sm cursor-pointer">
              Ret mailleri gönderileceğini onaylıyorum
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button 
              type="submit" 
              disabled={closeMutation.isPending || !confirmRejectionEmails}
              data-testid="button-submit-close-position"
            >
              {closeMutation.isPending ? "Kapatılıyor..." : "Pozisyonu Kapat"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Interview Detail Modal - Mülakat detay görüntüleme ve değerlendirme
function InterviewDetailModal({
  open,
  onOpenChange,
  interview,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interview: any;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [rating, setRating] = useState(interview.rating || 0);
  const [strengths, setStrengths] = useState(interview.strengths || "");
  const [weaknesses, setWeaknesses] = useState(interview.weaknesses || "");
  const [feedback, setFeedback] = useState(interview.feedback || "");
  const [interviewResult, setInterviewResult] = useState(interview.result || "pending");
  const [questionRatings, setQuestionRatings] = useState<Record<number, { rating: number; notes: string }>>({});
  const [savingResponse, setSavingResponse] = useState<number | null>(null);

  // Fetch interview questions
  const { data: interviewQuestions = [] } = useQuery<any[]>({
    queryKey: ["/api/interview-questions"],
    enabled: open,
  });

  // Fetch existing responses for this interview
  const { data: existingResponses = [] } = useQuery<any[]>({
    queryKey: ["/api/interviews", interview.id, "responses"],
    enabled: open && !!interview.id,
  });

  // Load existing responses into questionRatings state
  useEffect(() => {
    if (existingResponses.length > 0) {
      const loaded: Record<number, { rating: number; notes: string }> = {};
      existingResponses.forEach((resp: any) => {
        loaded[resp.questionId] = {
          rating: resp.score || 0,
          notes: resp.answer || '',
        };
      });
      setQuestionRatings(loaded);
    }
  }, [existingResponses]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PATCH", `/api/interviews/${interview.id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Mülakat güncellendi" });
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/job-applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/recruitment-stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Mülakat güncellenirken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const resultMutation = useMutation({
    mutationFn: async (result: string) => {
      return apiRequest("PATCH", `/api/interviews/${interview.id}/result`, { result });
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Mülakat sonucu güncellendi" });
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/job-applications"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Sonuç güncellenirken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const handleStartInterview = async () => {
    try {
      await apiRequest("POST", `/api/interviews/${interview.id}/start`, {});
      toast({ title: "Başarılı", description: "Mülakat başlatıldı" });
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    }
  };

  const handleCompleteInterview = async () => {
    try {
      // Save all question responses first
      await saveAllResponses();
      // Then complete the interview
      await apiRequest("POST", `/api/interviews/${interview.id}/complete`, {
        result: interviewResult,
        overallNotes: feedback,
        overallScore: rating,
      });
      toast({ title: "Başarılı", description: "Mülakat tamamlandı" });
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/job-applications"] });
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    }
  };

  const handleHire = async () => {
    try {
      // Save all responses before hiring
      await saveAllResponses();
      // Call the hire endpoint - handles rejection emails for other candidates automatically
      const response = await apiRequest("POST", `/api/interviews/${interview.id}/hire`, {});
      const data = await response.json();
      toast({ title: "Başarılı", description: data?.message || "Aday işe alındı" });
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/job-applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/job-positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/recruitment-stats"] });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    }
  };

  const handleReject = async () => {
    try {
      await saveAllResponses();
      // First update interview with negative result
      const rejectMutation = await apiRequest("PATCH", `/api/interviews/${interview.id}/result`, { result: 'negative' });
      // Update interview details
      updateMutation.mutate({
        status: 'completed',
        rating,
        strengths,
        weaknesses,
        feedback,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/job-applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/recruitment-stats"] });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    }
  };

  // Save a single question response to backend
  const saveQuestionResponse = async (questionId: number, answer: string, score: number) => {
    setSavingResponse(questionId);
    try {
      await apiRequest("POST", `/api/interviews/${interview.id}/respond`, {
        questionId,
        answer,
        score,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/interviews", interview.id, "responses"] });
    } catch (error: any) {
      toast({ title: "Hata", description: "Cevap kaydedilemedi", variant: "destructive" });
    } finally {
      setSavingResponse(null);
    }
  };

  // Save all question responses
  const saveAllResponses = async () => {
    const promises = Object.entries(questionRatings).map(([qId, data]) =>
      apiRequest("POST", `/api/interviews/${interview.id}/respond`, {
        questionId: parseInt(qId),
        answer: data.notes,
        score: data.rating,
      })
    );
    await Promise.all(promises);
  };

  const handleSave = async () => {
    try {
      await saveAllResponses();
      updateMutation.mutate({
        rating,
        strengths,
        weaknesses,
        feedback,
      });
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    }
  };

  const renderStars = (currentRating: number, onChange: (value: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="focus:outline-none"
            data-testid={`star-${star}`}
          >
            <Star
              className={`h-5 w-5 ${star <= currentRating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
            />
          </button>
        ))}
      </div>
    );
  };

  const interviewStatusLabels: Record<string, string> = {
    scheduled: "Planlandı",
    in_progress: "Devam Ediyor",
    completed: "Tamamlandı",
    cancelled: "İptal Edildi",
  };

  const resultLabels: Record<string, string> = {
    pending: "Beklemede",
    hired: "İşe Alındı",
    rejected: "Reddedildi",
    on_hold: "Bekletiliyor",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Mülakat Detayı
          </DialogTitle>
          <DialogDescription>
            {interview.application?.firstName} {interview.application?.lastName} - {interview.position?.title || 'Pozisyon'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Interview Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Tarih/Saat</p>
              <p className="font-medium">
                {interview.scheduledDate ? format(new Date(interview.scheduledDate), "dd.MM.yyyy HH:mm") : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Durum</p>
              <Badge 
                variant={interview.status === 'completed' ? 'default' : interview.status === 'in_progress' ? 'default' : 'secondary'}
                className={interview.status === 'in_progress' ? 'bg-blue-600' : ''}
              >
                {interviewStatusLabels[interview.status] || interview.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tip</p>
              <p className="font-medium">
                {interview.interviewType === 'in_person' ? 'Yüz Yüze' : 
                 interview.interviewType === 'phone' ? 'Telefon' : 
                 interview.interviewType === 'video' ? 'Video' : interview.interviewType}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sonuç</p>
              <Select value={interviewResult} onValueChange={(value) => {
                setInterviewResult(value);
                resultMutation.mutate(value);
              }}>
                <SelectTrigger data-testid="select-interview-result">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Beklemede</SelectItem>
                  <SelectItem value="positive">Pozitif</SelectItem>
                  <SelectItem value="finalist">Finalist</SelectItem>
                  <SelectItem value="negative">Negatif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Interview Questions */}
          {interviewQuestions.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Mülakat Soruları
              </h3>
              <div className="space-y-3">
                {interviewQuestions.map((question: any, index: number) => (
                  <Card key={question.id} className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <Badge variant="outline" className="mb-2">
                            {question.category}
                          </Badge>
                          <p className="font-medium">{index + 1}. {question.question}</p>
                        </div>
                        {renderStars(
                          questionRatings[question.id]?.rating || 0,
                          (value) => setQuestionRatings(prev => ({
                            ...prev,
                            [question.id]: { ...prev[question.id], rating: value }
                          }))
                        )}
                      </div>
                      <Textarea
                        placeholder="Aday cevabı ve notlar..."
                        value={questionRatings[question.id]?.notes || ''}
                        onChange={(e) => setQuestionRatings(prev => ({
                          ...prev,
                          [question.id]: { ...prev[question.id], notes: e.target.value }
                        }))}
                        rows={2}
                        className="text-sm"
                        data-testid={`textarea-question-${question.id}`}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Overall Rating */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Genel Değerlendirme</h3>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Genel Puan:</span>
              {renderStars(rating, setRating)}
              <span className="text-sm text-muted-foreground">({rating}/5)</span>
            </div>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-green-600">Güçlü Yönler</label>
              <Textarea
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                placeholder="Adayın güçlü yönleri..."
                rows={3}
                data-testid="textarea-strengths"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-orange-600">Gelişim Alanları</label>
              <Textarea
                value={weaknesses}
                onChange={(e) => setWeaknesses(e.target.value)}
                placeholder="Geliştirilmesi gereken alanlar..."
                rows={3}
                data-testid="textarea-weaknesses"
              />
            </div>
          </div>

          {/* Feedback */}
          <div>
            <label className="text-sm font-medium">Genel Değerlendirme Notları</label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Mülakat hakkında genel geri bildirim..."
              rows={3}
              data-testid="textarea-feedback"
            />
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2 sm:gap-0">
          {interview.status === 'scheduled' && (
            <Button 
              onClick={handleStartInterview} 
              disabled={updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-start-interview"
            >
              Mülakatı Başlat
            </Button>
          )}
          
          {(interview.status === 'in_progress' || interview.status === 'scheduled') && (
            <>
              <Button 
                variant="outline" 
                onClick={handleSave}
                disabled={updateMutation.isPending}
                data-testid="button-save-interview"
              >
                Kaydet
              </Button>
              <Button 
                onClick={handleCompleteInterview}
                disabled={updateMutation.isPending}
                data-testid="button-complete-interview"
              >
                Tamamla
              </Button>
            </>
          )}

          {interview.status === 'completed' && !interview.result && (
            <>
              <Button 
                variant="destructive"
                onClick={handleReject}
                disabled={updateMutation.isPending}
                data-testid="button-reject"
              >
                Reddet
              </Button>
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={handleHire}
                disabled={updateMutation.isPending}
                data-testid="button-hire"
              >
                İşe Al
              </Button>
            </>
          )}

          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Add Termination Dialog Component
function AddTerminationDialog({
  open,
  onOpenChange,
  employees,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: User[];
}) {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [terminationType, setTerminationType] = useState("resignation");
  const [terminationSubReason, setTerminationSubReason] = useState("");
  const [terminationDate, setTerminationDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState("");
  const [totalPayment, setTotalPayment] = useState(0);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/employee-terminations", data);
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Ayrılış kaydı oluşturuldu" });
      queryClient.invalidateQueries({ queryKey: ["/api/employee-terminations"] });
      onOpenChange(false);
      setSelectedUserId("");
      setTerminationDate(new Date().toISOString().split('T')[0]);
      setReason("");
      setTotalPayment(0);
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Ayrılış kaydı oluşturulurken hata oluştu", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !terminationDate) {
      toast({ title: "Hata", description: "Personel ve tarih zorunludur", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      userId: selectedUserId,
      terminationType,
      terminationSubReason: terminationSubReason || undefined,
      terminationDate,
      terminationReason: reason || undefined,
      totalPayment: totalPayment || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ayrılış Kaydı Ekle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Personel</label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger data-testid="select-user-termination">
                <SelectValue placeholder="Personel seçin" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Ayrilik Turu</label>
            <Select value={terminationType} onValueChange={(v) => { setTerminationType(v); setTerminationSubReason(""); }}>
              <SelectTrigger data-testid="select-termination-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resignation">Istifa</SelectItem>
                <SelectItem value="termination">Fesih / Isten Cikarma</SelectItem>
                <SelectItem value="retirement">Emeklilik</SelectItem>
                <SelectItem value="mutual_agreement">Karsilikli Anlasma</SelectItem>
                <SelectItem value="contract_end">Sozlesme Sonu</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Alt Neden</label>
            <Select value={terminationSubReason} onValueChange={setTerminationSubReason}>
              <SelectTrigger data-testid="select-termination-sub-reason">
                <SelectValue placeholder="Alt neden secin" />
              </SelectTrigger>
              <SelectContent>
                {terminationType === "resignation" && (
                  <>
                    <SelectItem value="resigned_voluntarily">Gonullu Istifa</SelectItem>
                    <SelectItem value="resigned_better_offer">Daha Iyi Teklif</SelectItem>
                    <SelectItem value="resigned_personal">Kisisel Nedenler</SelectItem>
                    <SelectItem value="resigned_relocation">Tasinma</SelectItem>
                    <SelectItem value="resigned_health">Saglik Nedenleri</SelectItem>
                  </>
                )}
                {terminationType === "termination" && (
                  <>
                    <SelectItem value="fired_performance">Performans Yetersizligi</SelectItem>
                    <SelectItem value="fired_misconduct">Disiplin Ihlali</SelectItem>
                    <SelectItem value="fired_restructuring">Yapisal Degisiklik</SelectItem>
                    <SelectItem value="fired_probation">Deneme Suresi Basarisiz</SelectItem>
                    <SelectItem value="fired_attendance">Devamsizlik</SelectItem>
                  </>
                )}
                {terminationType === "mutual_agreement" && (
                  <>
                    <SelectItem value="mutual_downsizing">Kadro Daraltma</SelectItem>
                    <SelectItem value="mutual_restructuring">Yeniden Yapilanma</SelectItem>
                    <SelectItem value="mutual_other">Diger</SelectItem>
                  </>
                )}
                {(terminationType === "retirement" || terminationType === "contract_end") && (
                  <>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="other">Diger</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Ayrilik Tarihi</label>
            <Input type="date" value={terminationDate} onChange={(e) => setTerminationDate(e.target.value)} data-testid="input-termination-date" />
          </div>
          <div>
            <label className="text-sm font-medium">Ayrilik Nedeni (Acik Metin)</label>
            <Textarea placeholder="Ayrilik ile ilgili detaylari yazin..." value={reason} onChange={(e) => setReason(e.target.value)} className="resize-none" />
          </div>
          <div>
            <label className="text-sm font-medium">Toplam Ödeme (₺) (Opsiyonel)</label>
            <Input type="number" min="0" value={totalPayment} onChange={(e) => setTotalPayment(parseInt(e.target.value) || 0)} data-testid="input-payment" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-termination">
              {createMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// İzin Yönetimi Bileşeni
function LeaveManagementSection({ employees }: { employees: User[] }) {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // İzin bakiyeleri
  const { data: leaveBalances = [], isLoading: isLoadingLeaves } = useQuery<any[]>({
    queryKey: ['/api/employee-leaves', selectedYear],
  });

  // Resmi tatiller
  const { data: holidays = [], isLoading: isLoadingHolidays } = useQuery<any[]>({
    queryKey: ['/api/public-holidays', selectedYear],
  });

  const leaveTypeLabels: Record<string, string> = {
    annual: "Yıllık İzin",
    sick: "Hastalık",
    maternity: "Doğum",
    paternity: "Babalık",
    marriage: "Evlilik",
    bereavement: "Vefat",
    unpaid: "Ücretsiz",
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {/* İzin Bakiyeleri */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <CardTitle>İzin Bakiyeleri</CardTitle>
          </div>
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[120px]" data-testid="select-leave-year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={(currentYear - 1).toString()}>{currentYear - 1}</SelectItem>
              <SelectItem value={currentYear.toString()}>{currentYear}</SelectItem>
              <SelectItem value={(currentYear + 1).toString()}>{currentYear + 1}</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoadingLeaves ? (
            <ListSkeleton count={3} variant="row" />
          ) : leaveBalances.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="İzin bakiyesi yok"
              description="İzin bakiyesi bulunamadı."
              data-testid="empty-state-leaves"
            />
          ) : (
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {leaveBalances.map((item: any) => {
                const emp = item.users || {};
                const leave = item.employee_leaves || {};
                const usedPercent = leave.totalDays > 0 ? Math.round((leave.usedDays / leave.totalDays) * 100) : 0;
                return (
                  <Card key={leave.id || `${emp.id}-${leave.leaveType}`} className="p-3 hover-elevate" data-testid={`leave-card-${leave.id}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{emp.firstName} {emp.lastName}</p>
                        <p className="text-xs text-muted-foreground">{leaveTypeLabels[leave.leaveType] || leave.leaveType}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <Badge variant={leave.remainingDays > 5 ? "default" : leave.remainingDays > 0 ? "secondary" : "destructive"}>
                            {leave.remainingDays} gün kaldı
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {leave.usedDays}/{leave.totalDays} kullanıldı
                          {leave.carriedOver > 0 && ` (+${leave.carriedOver} devir)`}
                        </p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${usedPercent > 80 ? 'bg-destructive' : usedPercent > 50 ? 'bg-amber-500' : 'bg-primary'}`}
                        style={{ width: `${usedPercent}%` }}
                      />
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resmi Tatiller */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            <CardTitle>Resmi Tatiller - {selectedYear}</CardTitle>
          </div>
          <Badge variant="outline">{holidays.length} tatil</Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoadingHolidays ? (
            <ListSkeleton count={3} variant="row" />
          ) : holidays.length === 0 ? (
            <EmptyState
              icon={Star}
              title="Tatil tanımlı değil"
              description={`${selectedYear} için resmi tatil tanımlı değil.`}
              data-testid="empty-state-holidays"
            />
          ) : (
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {holidays.map((holiday: any) => {
                const holidayDate = new Date(holiday.date);
                const today = new Date();
                const isPast = holidayDate < today;
                const daysUntil = Math.ceil((holidayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <Card 
                    key={holiday.id} 
                    className={`p-3 hover-elevate ${isPast ? 'opacity-60' : ''}`}
                    data-testid={`holiday-card-${holiday.id}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">{holiday.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(holidayDate, "dd MMMM yyyy")}
                          {holiday.isHalfDay && " (Yarım Gün)"}
                        </p>
                      </div>
                      <div>
                        {isPast ? (
                          <Badge variant="outline" className="text-muted-foreground">Geçti</Badge>
                        ) : daysUntil === 0 ? (
                          <Badge>Bugün!</Badge>
                        ) : daysUntil <= 7 ? (
                          <Badge variant="secondary">{daysUntil} gün kaldı</Badge>
                        ) : (
                          <Badge variant="outline">{daysUntil} gün</Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Maaş & Yan Haklar Yönetimi Bileşeni
function SalaryManagementSection({ employees, branches }: { employees: User[]; branches: { id: number; name: string }[] }) {
  const { toast } = useToast();
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Personel maaş ve yan hak verileri
  const { data: employeesWithSalary = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/employees-with-salary'],
  });

  // Bordro parametreleri
  const { data: payrollParams } = useQuery<any[]>({
    queryKey: ['/api/payroll/parameters'],
  });

  const currentParams = payrollParams?.find((p: any) => p.isActive) || payrollParams?.[0];

  // Filtreleme
  const filteredEmployees = employeesWithSalary.filter((emp: any) => {
    if (branchFilter !== "all" && emp.branch_id?.toString() !== branchFilter) return false;
    if (searchQuery && !`${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Maaş güncelleme mutation
  const updateSalaryMutation = useMutation({
    mutationFn: async ({ userId, netSalary }: { userId: string; netSalary: number }) => {
      return apiRequest("PATCH", `/api/users/${userId}/salary`, { netSalary });
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Maaş güncellendi" });
      queryClient.invalidateQueries({ queryKey: ['/api/employees-with-salary'] });
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  // Yan hak güncelleme mutation
  const updateBenefitsMutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.benefitId) {
        return apiRequest("PATCH", `/api/employee-benefits/${data.benefitId}`, data);
      } else {
        return apiRequest("POST", "/api/employee-benefits", data);
      }
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Yan haklar güncellendi" });
      queryClient.invalidateQueries({ queryKey: ['/api/employees-with-salary'] });
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const mealBenefitLabels: Record<string, string> = {
    none: "Yok",
    card: "Yemek Kartı",
    cash: "Nakit",
    workplace: "İşyerinde Yemek",
  };

  const transportBenefitLabels: Record<string, string> = {
    none: "Yok",
    card: "Ulaşım Kartı",
    cash: "Nakit",
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    return (value / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + " TL";
  };

  return (
    <div className="space-y-4">
      {/* Özet Kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Toplam Personel</p>
            <p className="text-2xl font-bold">{employeesWithSalary.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Maaş Tanımlı</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {employeesWithSalary.filter((e: any) => e.net_salary > 0).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Yemek Yardımı</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {employeesWithSalary.filter((e: any) => e.meal_benefit_type && e.meal_benefit_type !== 'none').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Asgari Ücret</p>
            <p className="text-2xl font-bold">{currentParams ? formatCurrency(currentParams.minimumWageNet) : "-"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtreler */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium">Ara</label>
              <Input
                placeholder="İsim ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-salary-search"
              />
            </div>
            <div className="w-[200px]">
              <label className="text-sm font-medium">Şube</label>
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger data-testid="select-salary-branch">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Şubeler</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personel Listesi */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Personel Maaş & Yan Haklar
          </CardTitle>
          <CardDescription>Personel bazlı maaş ve yan hak bilgileri</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ListSkeleton count={3} variant="row" />
          ) : filteredEmployees.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Personel bulunamadı"
              description="Bu kriterlere uyan personel bulunamadı."
              data-testid="empty-state-salary-employees"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Personel</TableHead>
                    <TableHead>Şube</TableHead>
                    <TableHead className="text-right">Net Maaş</TableHead>
                    <TableHead>Yemek</TableHead>
                    <TableHead>Ulaşım</TableHead>
                    <TableHead>Prim</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp: any) => (
                    <TableRow key={emp.id} data-testid={`salary-row-${emp.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{emp.first_name} {emp.last_name}</p>
                          <p className="text-xs text-muted-foreground">{roleLabels[emp.role] || emp.role}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{emp.branch_name || "HQ"}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {emp.net_salary > 0 ? formatCurrency(emp.net_salary) : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {emp.meal_benefit_type && emp.meal_benefit_type !== 'none' ? (
                          <div>
                            <Badge variant="secondary">{mealBenefitLabels[emp.meal_benefit_type]}</Badge>
                            {emp.meal_benefit_amount > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatCurrency(emp.meal_benefit_amount)}/gün
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {emp.transport_benefit_type && emp.transport_benefit_type !== 'none' ? (
                          <div>
                            <Badge variant="secondary">{transportBenefitLabels[emp.transport_benefit_type]}</Badge>
                            {emp.transport_benefit_amount > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatCurrency(emp.transport_benefit_amount)}/gün
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {emp.bonus_eligible ? (
                          <Badge variant="default">{emp.bonus_percentage || 0}%</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setIsEditDialogOpen(true);
                          }}
                          data-testid={`button-edit-salary-${emp.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <SalaryEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        employee={selectedEmployee}
        currentParams={currentParams}
        onUpdateSalary={(data) => updateSalaryMutation.mutate(data)}
        onUpdateBenefits={(data) => updateBenefitsMutation.mutate(data)}
        isPending={updateSalaryMutation.isPending || updateBenefitsMutation.isPending}
      />
    </div>
  );
}

// Maaş Düzenleme Dialog
function SalaryEditDialog({
  open,
  onOpenChange,
  employee,
  currentParams,
  onUpdateSalary,
  onUpdateBenefits,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: any;
  currentParams: any;
  onUpdateSalary: (data: { userId: string; netSalary: number }) => void;
  onUpdateBenefits: (data: any) => void;
  isPending: boolean;
}) {
  const [netSalary, setNetSalary] = useState("");
  const [mealBenefitType, setMealBenefitType] = useState("none");
  const [mealBenefitAmount, setMealBenefitAmount] = useState("");
  const [transportBenefitType, setTransportBenefitType] = useState("none");
  const [transportBenefitAmount, setTransportBenefitAmount] = useState("");
  const [bonusEligible, setBonusEligible] = useState(true);
  const [bonusPercentage, setBonusPercentage] = useState("");

  useEffect(() => {
    if (employee) {
      setNetSalary(employee.net_salary ? (employee.net_salary / 100).toString() : "");
      setMealBenefitType(employee.meal_benefit_type || "none");
      setMealBenefitAmount(employee.meal_benefit_amount ? (employee.meal_benefit_amount / 100).toString() : "");
      setTransportBenefitType(employee.transport_benefit_type || "none");
      setTransportBenefitAmount(employee.transport_benefit_amount ? (employee.transport_benefit_amount / 100).toString() : "");
      setBonusEligible(employee.bonus_eligible !== false);
      setBonusPercentage(employee.bonus_percentage?.toString() || "0");
    }
  }, [employee]);

  const handleSaveSalary = () => {
    const salary = Math.round(parseFloat(netSalary || "0") * 100);
    onUpdateSalary({ userId: employee.id, netSalary: salary });
  };

  const handleSaveBenefits = () => {
    onUpdateBenefits({
      userId: employee.id,
      benefitId: employee.benefit_id,
      mealBenefitType,
      mealBenefitAmount: Math.round(parseFloat(mealBenefitAmount || "0") * 100),
      transportBenefitType,
      transportBenefitAmount: Math.round(parseFloat(transportBenefitAmount || "0") * 100),
      bonusEligible,
      bonusPercentage,
      effectiveFrom: new Date().toISOString().split('T')[0],
    });
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Maaş & Yan Haklar</DialogTitle>
          <DialogDescription>
            {employee.first_name} {employee.last_name} - {roleLabels[employee.role] || employee.role}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Maaş Bilgisi */}
          <div className="p-4 border rounded-lg space-y-3">
            <h4 className="font-medium">Maaş Bilgisi</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Net Maaş (TL)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={netSalary}
                  onChange={(e) => setNetSalary(e.target.value)}
                  placeholder="0.00"
                  data-testid="input-edit-net-salary"
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={handleSaveSalary} 
                  disabled={isPending}
                  data-testid="button-save-salary"
                >
                  Maaş Kaydet
                </Button>
              </div>
            </div>
            {currentParams && (
              <p className="text-xs text-muted-foreground">
                Asgari Ücret: {((currentParams.minimumWageNet || 0) / 100).toLocaleString('tr-TR')} TL
              </p>
            )}
          </div>

          {/* Yemek Yardımı */}
          <div className="p-4 border rounded-lg space-y-3">
            <h4 className="font-medium">Yemek Yardımı</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Tip</label>
                <Select value={mealBenefitType} onValueChange={setMealBenefitType}>
                  <SelectTrigger data-testid="select-meal-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Yok</SelectItem>
                    <SelectItem value="card">Yemek Kartı</SelectItem>
                    <SelectItem value="cash">Nakit</SelectItem>
                    <SelectItem value="workplace">İşyerinde</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Günlük Tutar (TL)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={mealBenefitAmount}
                  onChange={(e) => setMealBenefitAmount(e.target.value)}
                  disabled={mealBenefitType === "none" || mealBenefitType === "workplace"}
                  placeholder="0.00"
                  data-testid="input-meal-amount"
                />
              </div>
            </div>
          </div>

          {/* Ulaşım Yardımı */}
          <div className="p-4 border rounded-lg space-y-3">
            <h4 className="font-medium">Ulaşım Yardımı</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Tip</label>
                <Select value={transportBenefitType} onValueChange={setTransportBenefitType}>
                  <SelectTrigger data-testid="select-transport-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Yok</SelectItem>
                    <SelectItem value="card">Ulaşım Kartı</SelectItem>
                    <SelectItem value="cash">Nakit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Günlük Tutar (TL)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={transportBenefitAmount}
                  onChange={(e) => setTransportBenefitAmount(e.target.value)}
                  disabled={transportBenefitType === "none"}
                  placeholder="0.00"
                  data-testid="input-transport-amount"
                />
              </div>
            </div>
          </div>

          {/* Prim */}
          <div className="p-4 border rounded-lg space-y-3">
            <h4 className="font-medium">Prim/Bonus</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="bonus-eligible"
                  checked={bonusEligible}
                  onCheckedChange={(checked) => setBonusEligible(checked === true)}
                  data-testid="checkbox-bonus-eligible"
                />
                <label htmlFor="bonus-eligible" className="text-sm">Prim hakkı var</label>
              </div>
              <div>
                <label className="text-sm font-medium">Prim Oranı (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={bonusPercentage}
                  onChange={(e) => setBonusPercentage(e.target.value)}
                  disabled={!bonusEligible}
                  placeholder="0"
                  data-testid="input-bonus-percentage"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button 
            onClick={handleSaveBenefits} 
            disabled={isPending}
            data-testid="button-save-benefits"
          >
            {isPending ? "Kaydediliyor..." : "Yan Hakları Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExportEmployeesDialog({
  open,
  onOpenChange,
  branches,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: { id: number; name: string }[];
}) {
  const { toast } = useToast();
  const [scope, setScope] = useState("all");
  const [selectedBranches, setSelectedBranches] = useState<number[]>([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [titleFilter, setTitleFilter] = useState("");
  const [hireDateFrom, setHireDateFrom] = useState("");
  const [hireDateTo, setHireDateTo] = useState("");
  const [exportType, setExportType] = useState("list");
  const [isExporting, setIsExporting] = useState(false);

  const regularBranches = branches.filter(b => b.id !== 23 && b.id !== 24);

  const { data: titlesData } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/admin/titles"],
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/hr/employees/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          scope,
          branchIds: scope === "branch" ? selectedBranches : undefined,
          roleFilter: roleFilter || undefined,
          statusFilter: statusFilter || undefined,
          titleFilter: titleFilter || undefined,
          hireDateFrom: hireDateFrom || undefined,
          hireDateTo: hireDateTo || undefined,
          exportType,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Export hatası");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dospresso_personel_${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({ title: "Başarılı", description: "Excel dosyası indirildi" });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Excel Dışa Aktar
          </DialogTitle>
          <DialogDescription>Personel verilerini Excel olarak indirin</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Kapsam</label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger data-testid="select-export-scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="hq">Merkez (HQ)</SelectItem>
                <SelectItem value="factory">Fabrika</SelectItem>
                <SelectItem value="branch">Şubeler</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scope === "branch" && (
            <div>
              <label className="text-sm font-medium">Şubeler</label>
              <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1 mt-1">
                {regularBranches.map((branch) => (
                  <label key={branch.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={selectedBranches.includes(branch.id)}
                      onCheckedChange={(checked) => {
                        setSelectedBranches(prev =>
                          checked ? [...prev, branch.id] : prev.filter(id => id !== branch.id)
                        );
                      }}
                    />
                    {branch.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Rol Filtre</label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger data-testid="select-export-role">
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_roles">Tümü</SelectItem>
                  {Object.entries(roleLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Durum</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-export-status">
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_statuses">Tümü</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Pasif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Unvan Filtre</label>
            <Select value={titleFilter} onValueChange={setTitleFilter}>
              <SelectTrigger data-testid="select-export-title">
                <SelectValue placeholder="Tümü" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_titles">Tümü</SelectItem>
                {titlesData?.map((t) => (
                  <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">İşe Giriş Başlangıç</label>
              <Input
                type="date"
                value={hireDateFrom}
                onChange={(e) => setHireDateFrom(e.target.value)}
                data-testid="input-hire-date-from"
              />
            </div>
            <div>
              <label className="text-sm font-medium">İşe Giriş Bitiş</label>
              <Input
                type="date"
                value={hireDateTo}
                onChange={(e) => setHireDateTo(e.target.value)}
                data-testid="input-hire-date-to"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Export Tipi</label>
            <Select value={exportType} onValueChange={setExportType}>
              <SelectTrigger data-testid="select-export-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="list">Liste Export (tek sayfa)</SelectItem>
                <SelectItem value="detailed">Tam Detay (7 sayfa)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {exportType === "detailed" ? "Personel, istihdam, izinler, maaş, disiplin, özlük belgeleri ve ayrılışlar ayrı sayfalarda" : "Tüm personel bilgileri tek sayfada"}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={handleExport} disabled={isExporting} data-testid="button-do-export">
            {isExporting ? "İndiriliyor..." : "Excel İndir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportBatchHistory({ onDownloadErrorReport }: { onDownloadErrorReport: (batchId: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const { data: batches, isLoading } = useQuery<any[]>({
    queryKey: ["/api/hr/employees/import/batches"],
    enabled: expanded,
  });

  const modeLabels: Record<string, string> = {
    upsert: "Upsert",
    append: "Sadece Ekle",
    update: "Sadece Güncelle",
    deactivate_missing: "Eksikleri Deaktif Et",
  };

  const statusBadge = (status: string) => {
    if (status === "completed") return <Badge variant="default" className="text-[10px]">Tamamlandı</Badge>;
    if (status === "failed") return <Badge variant="destructive" className="text-[10px]">Hata</Badge>;
    if (status === "rolled_back") return <Badge variant="outline" className="text-[10px]">Geri Alındı</Badge>;
    return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
  };

  return (
    <div className="border rounded-md">
      <button
        type="button"
        className="flex items-center justify-between gap-2 w-full p-3 text-sm font-medium text-left hover-elevate rounded-md"
        onClick={() => setExpanded(!expanded)}
        data-testid="button-toggle-batch-history"
      >
        <span className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Import Geçmişi
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (
        <div className="px-3 pb-3">
          {isLoading ? (
            <p className="text-xs text-muted-foreground py-2">Yükleniyor...</p>
          ) : !batches || batches.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Henüz import geçmişi yok.</p>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Tarih</TableHead>
                    <TableHead className="text-xs">Mod</TableHead>
                    <TableHead className="text-xs">Eşleşme</TableHead>
                    <TableHead className="text-xs">Durum</TableHead>
                    <TableHead className="text-xs">Satır</TableHead>
                    <TableHead className="text-xs">Sonuç</TableHead>
                    <TableHead className="text-xs"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((b: any) => {
                    let summary: any = {};
                    try { summary = b.summaryJson ? (typeof b.summaryJson === "string" ? JSON.parse(b.summaryJson) : b.summaryJson) : {}; } catch {}
                    return (
                      <TableRow key={b.id}>
                        <TableCell className="text-xs py-1 whitespace-nowrap">
                          {b.createdAt ? new Date(b.createdAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "-"}
                        </TableCell>
                        <TableCell className="text-xs py-1">
                          <Badge variant="outline" className="text-[10px]">{modeLabels[b.mode] || b.mode}</Badge>
                        </TableCell>
                        <TableCell className="text-xs py-1">
                          <span className="text-[10px] text-muted-foreground">{b.matchKey || "username"}</span>
                        </TableCell>
                        <TableCell className="text-xs py-1">{statusBadge(b.status)}</TableCell>
                        <TableCell className="text-xs py-1">{b.totalRows || "-"}</TableCell>
                        <TableCell className="text-xs py-1 whitespace-nowrap">
                          {summary.created != null && <span className="text-green-600 mr-1">+{summary.created}</span>}
                          {summary.updated != null && <span className="text-blue-600 mr-1">~{summary.updated}</span>}
                          {summary.errors != null && summary.errors > 0 && <span className="text-red-600">!{summary.errors}</span>}
                          {b.deactivatedCount > 0 && <span className="text-orange-600 ml-1">-{b.deactivatedCount}</span>}
                        </TableCell>
                        <TableCell className="text-xs py-1">
                          {(b.status === "completed" || b.status === "failed") && summary.errors > 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs px-2"
                              onClick={() => onDownloadErrorReport(b.id)}
                              data-testid={`button-download-error-${b.id}`}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ImportEmployeesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState<"upload" | "preview" | "config" | "dryrun" | "result">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState("upsert");
  const [matchKey, setMatchKey] = useState("username");
  const [dryRunResult, setDryRunResult] = useState<any>(null);
  const [applyResult, setApplyResult] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deactivateConfirmation, setDeactivateConfirmation] = useState("");
  const [continueWithValid, setContinueWithValid] = useState(false);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  const resetState = () => {
    setStep("upload");
    setFile(null);
    setMode("upsert");
    setMatchKey("username");
    setDryRunResult(null);
    setApplyResult(null);
    setPreviewData(null);
    setDeactivateConfirmation("");
    setContinueWithValid(false);
    setColumnMapping({});
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", f);
      const response = await fetch("/api/hr/employees/import/preview", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Dosya okunamadı");
      }
      const data = await response.json();
      setPreviewData(data);
      const initialMapping: Record<string, string> = {};
      data.headers?.forEach((h: any) => {
        initialMapping[h.header] = h.mappedTo;
      });
      setColumnMapping(initialMapping);
      setStep("preview");
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDryRun = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", mode);
      formData.append("matchKey", matchKey);
      if (Object.keys(columnMapping).length > 0) {
        formData.append("columnMapping", JSON.stringify(columnMapping));
      }

      const response = await fetch("/api/hr/employees/import/dry-run", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Simülasyon hatası");
      }

      const result = await response.json();
      setDryRunResult(result);
      setStep("dryrun");
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", mode);
      formData.append("matchKey", matchKey);
      formData.append("continueWithValid", String(continueWithValid));
      if (Object.keys(columnMapping).length > 0) {
        formData.append("columnMapping", JSON.stringify(columnMapping));
      }
      if (mode === "deactivate_missing") {
        formData.append("deactivateConfirmation", deactivateConfirmation);
      }

      const response = await fetch("/api/hr/employees/import/apply", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Import hatası");
      }

      const result = await response.json();

      if (result.blocked) {
        toast({
          title: "Hatalı Satırlar",
          description: result.message,
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      setApplyResult(result);
      setStep("result");
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch("/api/hr/employees/import/template", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Şablon indirilemedi");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "dospresso_import_sablonu.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    }
  };

  const handleDownloadErrorReport = async (batchId: number) => {
    try {
      const response = await fetch(`/api/hr/employees/import/batches/${batchId}/error-report`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Rapor indirilemedi");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `import_hata_raporu_${batchId}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetState(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Excel İçe Aktar
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Excel dosyası seçin veya şablon indirin"}
            {step === "preview" && "Dosya önizleme ve kolon eşleştirme"}
            {step === "config" && "Import ayarlarını yapılandırın"}
            {step === "dryrun" && "Simülasyon sonuçlarını inceleyin"}
            {step === "result" && "Import tamamlandı"}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3">Excel dosyanızı (.xlsx) seçin</p>
              <Input
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                className="max-w-xs mx-auto"
                data-testid="input-import-file"
                disabled={isProcessing}
              />
              {isProcessing && <p className="text-xs text-muted-foreground mt-2">Dosya okunuyor...</p>}
            </div>
            <Button variant="outline" onClick={handleDownloadTemplate} className="w-full" data-testid="button-download-template">
              <Download className="mr-2 h-4 w-4" />
              Import Şablonu İndir
            </Button>
            <ImportBatchHistory onDownloadErrorReport={handleDownloadErrorReport} />
          </div>
        )}

        {step === "preview" && previewData && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">{file?.name}</span>
              <Badge variant="secondary">{previewData.totalRows} satır</Badge>
            </div>

            <div>
              <label className="text-sm font-medium">Kolon Eşleştirme</label>
              <p className="text-xs text-muted-foreground mb-1">Otomatik eşleşme yanlışsa, listeden doğru alanı seçebilirsiniz.</p>
              <div className="max-h-48 overflow-y-auto border rounded-md mt-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Excel Kolonu</TableHead>
                      <TableHead className="text-xs">Sistem Alanı</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.headers?.map((h: any, i: number) => {
                      const currentValue = columnMapping[h.header] || h.mappedTo;
                      const isAutoMapped = previewData.systemFields?.includes(currentValue);
                      return (
                        <TableRow key={i}>
                          <TableCell className="text-xs py-1">{h.header}</TableCell>
                          <TableCell className="text-xs py-1">
                            <Select
                              value={currentValue}
                              onValueChange={(val) => {
                                setColumnMapping(prev => ({ ...prev, [h.header]: val }));
                              }}
                            >
                              <SelectTrigger className="h-7 text-xs" data-testid={`select-column-map-${i}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__skip__">
                                  <span className="text-muted-foreground">Atla (import etme)</span>
                                </SelectItem>
                                {previewData.systemFields?.map((sf: string) => (
                                  <SelectItem key={sf} value={sf}>{sf}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {!isAutoMapped && currentValue !== "__skip__" && (
                              <Badge variant="outline" className="ml-1 text-[10px]">manuel</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {previewData.previewRows?.length > 0 && (
              <div>
                <label className="text-sm font-medium">Veri Önizleme (ilk 5 satır)</label>
                <div className="max-h-32 overflow-auto border rounded-md mt-1">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {previewData.headers?.map((h: any, i: number) => (
                          <TableHead key={i} className="text-xs whitespace-nowrap">{h.header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.previewRows.map((row: any, ri: number) => (
                        <TableRow key={ri}>
                          {previewData.headers?.map((h: any, ci: number) => (
                            <TableCell key={ci} className="text-xs py-1 whitespace-nowrap max-w-[120px] truncate">
                              {row[h.header]?.toString() || ""}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => { setStep("upload"); setPreviewData(null); setFile(null); }}>Geri</Button>
              <Button onClick={() => setStep("config")} data-testid="button-continue-to-config">
                Devam
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "config" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">{file?.name}</span>
              {previewData && <Badge variant="secondary">{previewData.totalRows} satır</Badge>}
            </div>

            <div>
              <label className="text-sm font-medium">Import Modu</label>
              <Select value={mode} onValueChange={(v) => { setMode(v); if (v !== "deactivate_missing") setDeactivateConfirmation(""); }}>
                <SelectTrigger data-testid="select-import-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upsert">Ekle + Güncelle (Upsert) - Varsayılan</SelectItem>
                  <SelectItem value="append">Sadece Ekle (Append)</SelectItem>
                  <SelectItem value="update">Sadece Güncelle (Update)</SelectItem>
                  <SelectItem value="deactivate_missing">Eksikleri Deaktif Et (YÜKSEK RİSK)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {mode === "append" && "Sadece yeni personel ekler, mevcut olanları atlar"}
                {mode === "update" && "Sadece mevcut personelleri günceller, yeni kayıt eklemez"}
                {mode === "upsert" && "Yeni ekler, mevcut olanları günceller (varsayılan)"}
                {mode === "deactivate_missing" && "Dosyada bulunmayan tüm aktif personelleri deaktif eder + upsert uygular"}
              </p>
            </div>

            {mode === "deactivate_missing" && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs">
                    <p className="font-medium text-red-600">YÜKSEK RİSKLİ İŞLEM</p>
                    <p className="text-muted-foreground">Dosyada yer almayan tüm aktif personeller deaktif edilecektir. Admin kullanıcılar korunur.</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium">Onaylamak için "DEACTIVATE" yazın:</label>
                  <Input
                    value={deactivateConfirmation}
                    onChange={(e) => setDeactivateConfirmation(e.target.value)}
                    placeholder="DEACTIVATE"
                    className="mt-1"
                    data-testid="input-deactivate-confirmation"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Eşleştirme Anahtarı</label>
              <Select value={matchKey} onValueChange={setMatchKey}>
                <SelectTrigger data-testid="select-match-key">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="username">Kullanıcı Adı</SelectItem>
                  <SelectItem value="email">E-posta</SelectItem>
                  <SelectItem value="employeeId">Personel ID</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Mevcut kullanıcıların hangi alana göre eşleştirileceğini belirler
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="continueWithValid"
                checked={continueWithValid}
                onChange={(e) => setContinueWithValid(e.target.checked)}
                className="h-4 w-4 rounded border-input"
                data-testid="checkbox-continue-with-valid"
              />
              <label htmlFor="continueWithValid" className="text-sm">
                Hatalı satırları atlayarak geçerli satırlarla devam et
              </label>
            </div>

            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Admin koruması aktif</p>
                  <p>Admin kullanıcılar import ile asla değiştirilemez veya silinemez.</p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("preview")}>Geri</Button>
              <Button
                onClick={handleDryRun}
                disabled={isProcessing || (mode === "deactivate_missing" && deactivateConfirmation !== "DEACTIVATE")}
                data-testid="button-dry-run"
              >
                {isProcessing ? "Simüle ediliyor..." : "Simülasyon Çalıştır"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "dryrun" && dryRunResult && (
          <div className="space-y-4">
            <div className={`grid grid-cols-2 ${dryRunResult.toDeactivate > 0 ? "sm:grid-cols-5" : "sm:grid-cols-4"} gap-3`}>
              <Card>
                <CardContent className="p-3 text-center">
                  <CheckCircle className="h-5 w-5 mx-auto text-green-500 mb-1" />
                  <div className="text-lg font-bold">{dryRunResult.toCreate}</div>
                  <div className="text-xs text-muted-foreground">Eklenecek</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <Edit className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                  <div className="text-lg font-bold">{dryRunResult.toUpdate}</div>
                  <div className="text-xs text-muted-foreground">Güncellenecek</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <SkipForward className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
                  <div className="text-lg font-bold">{dryRunResult.toSkip}</div>
                  <div className="text-xs text-muted-foreground">Atlanacak</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <XCircle className="h-5 w-5 mx-auto text-red-500 mb-1" />
                  <div className="text-lg font-bold">{dryRunResult.toError}</div>
                  <div className="text-xs text-muted-foreground">Hatalı</div>
                </CardContent>
              </Card>
              {dryRunResult.toDeactivate > 0 && (
                <Card>
                  <CardContent className="p-3 text-center">
                    <UserX className="h-5 w-5 mx-auto text-orange-500 mb-1" />
                    <div className="text-lg font-bold text-orange-600">{dryRunResult.toDeactivate}</div>
                    <div className="text-xs text-muted-foreground">Deaktif</div>
                  </CardContent>
                </Card>
              )}
            </div>

            {dryRunResult.toDeactivate > 0 && dryRunResult.deactivateTargets?.length > 0 && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                <p className="text-xs font-medium text-red-600 mb-1">Deaktif Edilecek Personeller ({dryRunResult.toDeactivate} kişi):</p>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                  {dryRunResult.deactivateTargets.map((t: any, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs">{t.username}</Badge>
                  ))}
                  {dryRunResult.toDeactivate > 50 && (
                    <Badge variant="secondary" className="text-xs">+{dryRunResult.toDeactivate - 50} daha</Badge>
                  )}
                </div>
              </div>
            )}

            {dryRunResult.columnMapping?.length > 0 && (
              <details className="border rounded-md">
                <summary className="p-2 text-sm font-medium cursor-pointer">Kolon Eşleştirme Detayı</summary>
                <div className="px-3 pb-3">
                  <div className="flex flex-wrap gap-1">
                    {dryRunResult.columnMapping.map((cm: any, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">{cm.header} → {cm.mappedTo}</Badge>
                    ))}
                  </div>
                </div>
              </details>
            )}

            <div className="max-h-48 overflow-y-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Satır</TableHead>
                    <TableHead className="w-20">Durum</TableHead>
                    <TableHead>Açıklama</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dryRunResult.results?.map((r: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{r.rowNumber}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "create" ? "default" : r.status === "update" ? "secondary" : r.status === "error" ? "destructive" : "outline"}>
                          {r.status === "create" ? "Ekle" : r.status === "update" ? "Güncelle" : r.status === "skip" ? "Atla" : r.status === "deactivate" ? "Deaktif" : "Hata"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{r.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DialogFooter className="flex-wrap gap-2">
              <Button variant="outline" onClick={() => setStep("config")}>Geri</Button>
              <Button
                onClick={handleApply}
                disabled={isProcessing || (dryRunResult.toCreate === 0 && dryRunResult.toUpdate === 0 && dryRunResult.toDeactivate === 0)}
                variant={dryRunResult.toDeactivate > 0 ? "destructive" : "default"}
                data-testid="button-apply-import"
              >
                {isProcessing ? "Uygulanıyor..." : dryRunResult.toDeactivate > 0 ? "Deaktif Et ve Uygula" : "Onayla ve Uygula"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "result" && applyResult && (
          <div className="space-y-4">
            <div className="text-center p-4">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
              <h3 className="text-lg font-semibold">Import Tamamlandı</h3>
              <p className="text-sm text-muted-foreground">Batch ID: {applyResult.batchId}</p>
            </div>

            <div className={`grid grid-cols-2 ${applyResult.deactivatedCount > 0 ? "sm:grid-cols-5" : "sm:grid-cols-4"} gap-3`}>
              <div className="text-center p-2 bg-green-500/10 rounded-md">
                <div className="text-lg font-bold text-green-600">{applyResult.createdCount}</div>
                <div className="text-xs text-muted-foreground">Eklendi</div>
              </div>
              <div className="text-center p-2 bg-blue-500/10 rounded-md">
                <div className="text-lg font-bold text-blue-600">{applyResult.updatedCount}</div>
                <div className="text-xs text-muted-foreground">Güncellendi</div>
              </div>
              <div className="text-center p-2 bg-yellow-500/10 rounded-md">
                <div className="text-lg font-bold text-yellow-600">{applyResult.skippedCount}</div>
                <div className="text-xs text-muted-foreground">Atlandı</div>
              </div>
              <div className="text-center p-2 bg-red-500/10 rounded-md">
                <div className="text-lg font-bold text-red-600">{applyResult.errorCount}</div>
                <div className="text-xs text-muted-foreground">Hata</div>
              </div>
              {applyResult.deactivatedCount > 0 && (
                <div className="text-center p-2 bg-orange-500/10 rounded-md">
                  <div className="text-lg font-bold text-orange-600">{applyResult.deactivatedCount}</div>
                  <div className="text-xs text-muted-foreground">Deaktif</div>
                </div>
              )}
            </div>

            {applyResult.errorCount > 0 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleDownloadErrorReport(applyResult.batchId)}
                data-testid="button-download-error-report"
              >
                <Download className="mr-2 h-4 w-4" />
                Hata Raporu İndir (Excel)
              </Button>
            )}

            <p className="text-xs text-muted-foreground text-center">
              Bu importu 7 gün içinde geri alabilirsiniz.
            </p>

            <DialogFooter>
              <Button onClick={() => { resetState(); onOpenChange(false); }} data-testid="button-close-import">
                Kapat
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
