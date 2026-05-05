import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { 
  isHQRole, 
  type User, 
  type EmployeeWarning, 
  type DisciplinaryReport,
  type EmployeeOnboarding,
  type EmployeeDocument,
} from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link, useParams } from "wouter";
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
import { ModuleLayout, type KPIMetric } from "@/components/module-layout/ModuleLayout";
import type { SidebarSection } from "@/components/module-layout/ModuleSidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState, EmptyStatePreset } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import {
  UserPlus,
  UserMinus,
  Edit,
  AlertTriangle,
  Eye,
  Calendar,
  Filter,
  Users,
  FileWarning,
  UserCheck,
  FolderOpen,
  Clock,
  Download,
  Upload,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Star,
  Landmark,
  MapPin,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useLocation } from "wouter";
import { CreateDisciplinaryDialog, CreateDisciplinaryDialogWithSelector } from "@/components/hr/DisciplinaryDialogs";
import { ROLE_LABELS } from "@/lib/turkish-labels";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";
// Extracted components (Sprint 3 — ik.tsx decomposition)
import { AddEmployeeDialog, EditEmployeeDialog, WarningsDialog, AddWarningDialog, ResetPasswordDialog } from "@/components/hr/dialogs/EmployeeDialogs";
import { AddTerminationDialog } from "@/components/hr/dialogs/TerminationDialog";
import { ExportEmployeesDialog, ImportEmployeesDialog } from "@/components/hr/dialogs/ImportExportDialogs";
import RecruitmentSection from "@/components/hr/RecruitmentSection";
import LeaveManagementSection from "@/components/hr/tabs/LeaveManagementSection";
import SalaryManagementSection from "@/components/hr/tabs/SalaryManagementSection";
import { useIKScope } from "@/hooks/useIKScope";


const VALID_IK_TABS = ["personel", "disiplin", "onboarding", "documents", "mesai", "ise-alim", "istten-cikis", "izinler", "maas"];

type TabGroupKey = "personel" | "izin-mesai" | "maas-bordro" | "disiplin-islemler" | "vardiya";

interface TabGroupDef {
  key: TabGroupKey;
  label: string;
  icon: typeof Users;
  tabs: string[];
}

const TAB_GROUPS: TabGroupDef[] = [
  { key: "personel", label: "Personel", icon: Users, tabs: ["personel", "documents"] },
  { key: "izin-mesai", label: "İzin & Mesai", icon: Calendar, tabs: ["izinler", "mesai"] },
  { key: "maas-bordro", label: "Maaş & Bordro", icon: Star, tabs: ["maas", "onboarding"] },
  { key: "disiplin-islemler", label: "Disiplin & İşlemler", icon: FileWarning, tabs: ["disiplin", "ise-alim", "istten-cikis"] },
  { key: "vardiya", label: "Vardiya", icon: Clock, tabs: [] },
];

const TAB_LABELS: Record<string, { label: string; icon: typeof Users }> = {
  personel: { label: "Personel", icon: Users },
  documents: { label: "Özlük", icon: FolderOpen },
  izinler: { label: "İzinler", icon: Calendar },
  mesai: { label: "Mesai", icon: Clock },
  maas: { label: "Maaş", icon: Star },
  onboarding: { label: "Onboarding", icon: UserCheck },
  disiplin: { label: "Disiplin", icon: FileWarning },
  "ise-alim": { label: "İşe Alım", icon: UserPlus },
  "istten-cikis": { label: "Çıkış", icon: UserMinus },
};

function getGroupForTab(tab: string): TabGroupKey {
  for (const group of TAB_GROUPS) {
    if (group.tabs.includes(tab)) return group.key;
  }
  return "personel";
}

function getTabVisibility(role: string | undefined): Set<string> {
  const visible = new Set(["personel", "documents", "disiplin", "onboarding"]);
  if (!role) return visible;
  const hq = isHQRole(role as any) || role === "admin";
  if (hq) {
    ["izinler", "mesai", "maas", "ise-alim", "istten-cikis"].forEach(t => visible.add(t));
  }
  if (role === "supervisor" || role === "supervisor_buddy") {
    visible.add("mesai");
  }
  if (role === "supervisor") {
    visible.add("ise-alim");
  }
  if (role === "muhasebe") {
    visible.add("maas");
  }
  return visible;
}

function getVisibleGroups(role: string | undefined): TabGroupKey[] {
  if (!role) return ["personel"];
  if (role === "admin" || role === "muhasebe_ik") {
    return ["personel", "izin-mesai", "maas-bordro", "disiplin-islemler", "vardiya"];
  }
  const branchRoleList = ["mudur", "supervisor", "supervisor_buddy", "barista", "bar_buddy", "stajyer"];
  if (branchRoleList.includes(role)) {
    return ["personel", "izin-mesai"];
  }
  if (role === "muhasebe") {
    return ["personel", "maas-bordro"];
  }
  return ["personel"];
}

export default function IKPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const ikScope = useIKScope();
  const params = useParams<{ tab?: string }>();
  const [, navigate] = useLocation();
  const activeTab = VALID_IK_TABS.includes(params.tab || "") ? params.tab! : "personel";

  const visibleGroupKeys = useMemo(() => getVisibleGroups(user?.role), [user?.role]);
  const tabVisibility = useMemo(() => getTabVisibility(user?.role), [user?.role]);
  const visibleGroups = useMemo(() => TAB_GROUPS.filter(g => visibleGroupKeys.includes(g.key) && g.tabs.some(t => tabVisibility.has(t))), [visibleGroupKeys, tabVisibility]);
  const [activeGroup, setActiveGroup] = useState<TabGroupKey>(() => getGroupForTab(activeTab));

  // Supervisor için şube rolü kontrolü
  const isBranchRole = !ikScope.isHQ;

  // Filters - Section 1: Employee List
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  // Auth yüklendikten sonra şube kullanıcıları için categoryFilter'ı "subeler" olarak ayarla
  useEffect(() => {
    if (!ikScope.isHQ) {
      setCategoryFilter("subeler");
    }
  }, [ikScope.isHQ]);
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [probationFilter, setProbationFilter] = useState<string>("all");
  const [trainingFilter, setTrainingFilter] = useState<string>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = [
    ...(ikScope.showBranchFilter ? [categoryFilter, branchFilter] : []),
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
  const { data: branches = [], isError, refetch, isLoading } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/branches"],
    staleTime: 300000,
  });

  // Fetch employees (backend handles branch filtering automatically)
  const employeesQueryKey = useMemo(() => {
    const baseUrl = '/api/employees';
    return [ikScope.buildQueryUrl(baseUrl, branchFilter)];
  }, [ikScope.scopeType, branchFilter]);

  const { data: employees = [], isLoading: employeesLoading } = useQuery<User[]>({
    queryKey: employeesQueryKey,
    enabled: !!user,
  });

  // Fetch terminated employees (ayrılan personeller)
  const terminatedQueryKey = useMemo(() => {
    const baseUrl = '/api/employees/terminated';
    return [ikScope.buildQueryUrl(baseUrl, branchFilter)];
  }, [ikScope.scopeType, branchFilter]);

  const { data: terminatedEmployees = [], isLoading: isTerminatedLoading } = useQuery<User[]>({
    queryKey: terminatedQueryKey,
    enabled: !!user && ikScope.isHQ,
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
    if (ikScope.showBranchFilter && branchFilter !== "all") {
      return ["/api/disciplinary-reports", { branchId: branchFilter }];
    }
    return ["/api/disciplinary-reports"];
  }, [ikScope.scopeType, branchFilter]);

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
    return [ikScope.buildQueryUrl(baseUrl, branchFilter)];
  }, [ikScope.scopeType, branchFilter]);

  const { data: onboardingRecords = [], isLoading: isOnboardingLoading } = useQuery<(EmployeeOnboarding & { user?: User })[]>({
    queryKey: onboardingQueryKey,
    enabled: !!user,
  });

  // Fetch employee documents (backend handles branch filtering automatically)
  const documentsQueryKey = useMemo(() => {
    const baseUrl = '/api/employee-documents';
    return [ikScope.buildQueryUrl(baseUrl, branchFilter)];
  }, [ikScope.scopeType, branchFilter]);

  const { data: employeeDocuments = [], isLoading: isDocumentsLoading } = useQuery<(EmployeeDocument & { user?: User })[]>({
    queryKey: documentsQueryKey,
    enabled: !!user,
  });

  // Fetch termination records
  const { data: terminationRecords = [] } = useQuery<any[]>({
    queryKey: ["/api/employee-terminations"],
    enabled: ikScope.isHQ && ikScope.scopeType !== 'own_data',
  });

  // Fetch IK Dashboard KPIs
  interface IKDashboardData {
    documents: { total: number; verified: number; completionRate: number; expiringSoon: number };
    disciplinary: { total: number; open: number };
  }
  const { data: ikDashboard } = useQuery<IKDashboardData>({
    queryKey: ["/api/hr/ik-dashboard"],
    enabled: !!user && ikScope.isHQ,
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

  const canViewAttendance = ikScope.isHQ || ikScope.userRole === 'supervisor' || ikScope.userRole === 'supervisor_buddy';

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
  // Check permissions (from scope hook)
  const canCreate = ikScope.canCreate;
  const canEdit = ikScope.canEdit;
  const canWarn = ikScope.canApprove;

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

  
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const ikKpiMetrics: KPIMetric[] = ikDashboard && (ikScope.isHQ) ? [
    { label: "Aktif Personel", value: employees.length, icon: <Users className="h-4 w-4" /> },
    { label: "Özlük Dosyaları", value: ikDashboard.documents.total, icon: <FolderOpen className="h-4 w-4" /> },
    { label: "Süresi Dolan Belge", value: ikDashboard.documents.expiringSoon, color: ikDashboard.documents.expiringSoon > 0 ? "text-orange-500" : undefined, icon: <AlertTriangle className="h-4 w-4" /> },
    { label: "Açık Tutanak", value: ikDashboard.disciplinary.open, color: ikDashboard.disciplinary.open > 0 ? "text-red-500" : undefined, icon: <FileWarning className="h-4 w-4" /> },
  ] : [];

  const ikSidebarSections: SidebarSection[] = visibleGroups.map((group) => {
    const GroupIcon = group.icon;
    return {
      title: group.label.toUpperCase(),
      items: group.tabs
        .filter((t) => tabVisibility.has(t))
        .map((tabValue) => {
          const tabDef = TAB_LABELS[tabValue];
          const TabIcon = tabDef?.icon || Users;
          return {
            id: tabValue,
            label: tabDef?.label || tabValue,
            icon: <TabIcon className="h-4 w-4" />,
            badge: tabValue === "personel" ? filteredEmployees.length : undefined,
          };
        }),
    };
  }).filter(s => s.items.length > 0);

  const handleSidebarViewChange = (viewId: string) => {
    navigate(`/ik/${viewId}`, { replace: true });
    setActiveGroup(getGroupForTab(viewId));
  };

  return (
    <ModuleLayout
      title="İK Yönetimi"
      description={`Personel yönetimi ve deneme süresi takibi — ${ikScope.scopeLabel}`}
      icon={<Users className="h-6 w-6" />}
      kpiMetrics={ikKpiMetrics}
      sidebarSections={ikSidebarSections}
      activeView={activeTab}
      onViewChange={handleSidebarViewChange}
    >
      <div className="space-y-4">
        {/* Scope Badge + Read-Only Indicator */}
        <div className="flex gap-2 flex-wrap items-center">
          {ikScope.showReadOnlyBadge && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 dark:border-amber-700">
              <Eye className="mr-1 h-3 w-3" />
              Salt Okunur
            </Badge>
          )}
          {ikScope.scopeType === 'managed_branches' && (
            <Badge variant="outline" className="text-blue-600 border-blue-300 dark:border-blue-700">
              Merkez + Fabrika + Işıklar
            </Badge>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {(ikScope.isHQ) && (
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
          {canCreate ? (
            <Button onClick={() => setAddDialogOpen(true)} data-testid="button-add-employee">
              <UserPlus className="mr-2 h-4 w-4" />
              Yeni Personel Ekle
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button disabled data-testid="button-add-employee-disabled">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Yeni Personel Ekle
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Yetkiniz yok</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

      <Tabs value={activeTab} onValueChange={(v) => {
        navigate(`/ik/${v}`, { replace: true });
        setActiveGroup(getGroupForTab(v));
      }} className="w-full space-y-4">
        <div className="hidden"></div>

        {/* Tab 1: Personel Listesi */}
        <TabsContent value="personel" data-testid="content-personel">
          <Card>
              <CardContent className="w-full space-y-3 sm:space-y-4">
                {/* Tabs for Active/Terminated Employees */}
                <Tabs defaultValue="active" className="w-full">
                  <TabsList className="w-full max-w-md">
                    <TabsTrigger value="active" data-testid="tab-active-employees" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Aktif Personel
                      <Badge variant="secondary" className="ml-1">{filteredEmployees.length}</Badge>
                    </TabsTrigger>
                    {(ikScope.isHQ) && (
                      <TabsTrigger value="terminated" data-testid="tab-terminated-employees" className="flex items-center gap-2">
                        <UserMinus className="h-4 w-4" />
                        Ayrılan Personel
                        <Badge variant="outline" className="ml-1">{terminatedEmployees.length}</Badge>
                      </TabsTrigger>
                    )}
                  </TabsList>

                  {/* Active Employees Tab */}
                  <TabsContent value="active" className="space-y-4 mt-4">
                    {/* ═══════════════════════════════════════════════════════════════ */}
                    {/* QUICK FILTER CHIPS — Mahmut Bey önerisi (5 May 2026)             */}
                    {/* Tek tıkla şube filtreleme — uzun listeler kafa karıştırıcı       */}
                    {/* ═══════════════════════════════════════════════════════════════ */}
                    {ikScope.showBranchFilter && branches.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/20 rounded-lg border border-dashed">
                        <span className="text-xs font-semibold text-muted-foreground mr-1">Hızlı Filtre:</span>
                        <button
                          onClick={() => setBranchFilter("all")}
                          className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                            branchFilter === "all"
                              ? "bg-primary text-primary-foreground border-primary font-semibold"
                              : "bg-background hover:bg-muted border-border"
                          }`}
                          data-testid="chip-all-branches"
                        >
                          🌐 Tümü ({employees.length})
                        </button>
                        {branches.map((b) => {
                          const count = employees.filter(e => e.branchId === b.id).length;
                          if (count === 0) return null;
                          const icon = b.id === 24 ? "🏭" : b.id === 23 ? "🏢" : "☕";
                          return (
                            <button
                              key={b.id}
                              onClick={() => setBranchFilter(String(b.id))}
                              className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                                branchFilter === String(b.id)
                                  ? "bg-primary text-primary-foreground border-primary font-semibold"
                                  : "bg-background hover:bg-muted border-border"
                              }`}
                              data-testid={`chip-branch-${b.id}`}
                            >
                              {icon} {b.name} ({count})
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Filters Card - Collapsible */}
                    <Card className="bg-muted/30 border-dashed">
                      <CardHeader className="pb-0 cursor-pointer" onClick={() => setFiltersOpen(!filtersOpen)}>
                        <CardTitle className="text-sm flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            Detaylı Filtreler
                            {activeFilterCount > 0 && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{activeFilterCount} aktif</Badge>
                            )}
                          </span>
                          <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
                        </CardTitle>
                      </CardHeader>
                      {filtersOpen && (
                      <CardContent className="grid grid-cols-2 lg:grid-cols-3 gap-3 pt-3">
                        {/* Category filter - Şubeler/HQ/Fabrika - only for all_branches scope */}
                        {ikScope.canSelectAllBranches && (
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

                    {/* Branch filter - scope-aware: all_branches sees all, managed sees [5,23,24] */}
                    {ikScope.showBranchFilter && (
                      <div>
                        <label className="text-sm font-medium">Şube</label>
                        <Select value={branchFilter} onValueChange={setBranchFilter}>
                          <SelectTrigger data-testid="select-branch-filter" className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ikScope.canSelectAllBranches && (
                              <SelectItem value="all">Tüm Şubeler</SelectItem>
                            )}
                            {ikScope.filterBranches(branches).map((branch) => (
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
                          {Object.entries(ROLE_LABELS).map(([key, label]) => (
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
                      <p className="text-xl font-bold">{filteredEmployees.length}</p>
                    </CardContent>
                  </Card>
                  <Card className="hover-elevate">
                    <CardContent className="p-3 space-y-1">
                      <p className="text-xs text-muted-foreground">Deneme Süresinde</p>
                      <p className="text-xl font-bold">
                        {filteredEmployees.filter(e => e.probationEndDate && differenceInDays(new Date(e.probationEndDate), new Date()) >= 0).length}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="hover-elevate">
                    <CardContent className="p-3 space-y-1">
                      <p className="text-xs text-muted-foreground">Eğitim Tamamlı</p>
                      <p className="text-xl font-bold">
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
                      <p className="text-xl font-bold">
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
                        <Card 
                          key={employee.id}
                          className="hover-elevate transition-all h-full"
                          data-testid={`card-employee-${employee.id}`}
                        >
                          <CardContent className="p-4">
                            <Link href={`/personel-detay/${employee.id}`} className="block cursor-pointer">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold truncate">
                                    {employee.firstName} {employee.lastName}
                                  </h3>
                                  <Badge variant="secondary" className="mt-1">
                                    {ROLE_LABELS[employee.role] || employee.role}
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
                                    <Landmark className="h-3 w-3" />
                                    <span className="truncate">{(employee as any).department}</span>
                                  </div>
                                ) : (
                                  <span>HQ</span>
                                )}
                              </div>
                            </Link>
                            {/* Sprint 6 Bölüm 4 (5 May 2026 - Mahmut feedback): Hızlı Eylemler */}
                            {ikScope.isHQ && (
                              <div className="mt-3 pt-3 border-t flex gap-1.5 flex-wrap">
                                <Link href={`/personel-detay/${employee.id}?tab=attendance`}>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs"
                                    data-testid={`button-quick-pdks-${employee.id}`}
                                  >
                                    📊 PDKS
                                  </Button>
                                </Link>
                                <Link href={`/personel-detay/${employee.id}?tab=leave`}>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs"
                                    data-testid={`button-quick-leave-${employee.id}`}
                                  >
                                    🏖️ İzin
                                  </Button>
                                </Link>
                                <Link href={`/personel-detay/${employee.id}?tab=disciplinary`}>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs"
                                    data-testid={`button-quick-disciplinary-${employee.id}`}
                                  >
                                    📝 Tutanak
                                  </Button>
                                </Link>
                              </div>
                            )}
                          </CardContent>
                        </Card>
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
                                        {ROLE_LABELS[employee.role] || employee.role}
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
                                        <Landmark className="h-3 w-3" />
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
                  <div className="overflow-x-auto">
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
                  </div>
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
                  <div className="overflow-x-auto">
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
                  </div>
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
                  <div className="overflow-x-auto">
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
                          <TableCell colSpan={6} className="text-center py-8">
                            <div className="flex flex-col items-center gap-2">
                              <Upload className="w-8 h-8 text-muted-foreground" />
                              <p className="font-medium">Belge bulunamadı</p>
                              <p className="text-sm text-muted-foreground">Personel belgelerini yükleyin ve buradan takip edin</p>
                            </div>
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
                  </div>
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
                        {ikScope.showBranchFilter && (attendanceCategoryFilter === 'subeler' || attendanceCategoryFilter === 'all') && (
                          <div>
                            <label className="text-sm font-medium">Şube</label>
                            <Select value={branchFilter} onValueChange={setBranchFilter}>
                              <SelectTrigger data-testid="select-attendance-branch" className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ikScope.canSelectAllBranches && (
                                  <SelectItem value="all">Tüm Şubeler</SelectItem>
                                )}
                                {ikScope.filterBranches(branches).map((branch) => (
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
                              {(Array.isArray(employees) ? employees : []).map((emp) => (
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
                          <p className="text-xl font-bold">{attendanceTotals.totalEmployees}</p>
                        </CardContent>
                      </Card>
                      <Card className="hover-elevate cursor-pointer" data-testid="stat-total-hours">
                        <CardContent className="p-3 space-y-1 text-center">
                          <p className="text-xs text-muted-foreground">Toplam Saat</p>
                          <p className="text-xl font-bold">{(attendanceTotals.totalWorkedHours ?? 0).toFixed(1)}</p>
                        </CardContent>
                      </Card>
                      <Card className="hover-elevate cursor-pointer" data-testid="stat-overtime-hours">
                        <CardContent className="p-3 space-y-1 text-center">
                          <p className="text-xs text-muted-foreground">Fazla Mesai</p>
                          <p className="text-xl font-bold text-orange-600">{(attendanceTotals.totalOvertimeHours ?? 0).toFixed(1)}s</p>
                        </CardContent>
                      </Card>
                      <Card className="hover-elevate cursor-pointer" data-testid="stat-late-arrivals">
                        <CardContent className="p-3 space-y-1 text-center">
                          <p className="text-xs text-muted-foreground">Geç Kalma</p>
                          <p className="text-xl font-bold text-red-600">{attendanceTotals.totalLateArrivals}</p>
                        </CardContent>
                      </Card>
                      <Card className="hover-elevate cursor-pointer" data-testid="stat-absences">
                        <CardContent className="p-3 space-y-1 text-center">
                          <p className="text-xs text-muted-foreground">Devamsızlık</p>
                          <p className="text-xl font-bold">{attendanceTotals.totalAbsences}</p>
                        </CardContent>
                      </Card>
                      <Card className="hover-elevate cursor-pointer" data-testid="stat-compliance">
                        <CardContent className="p-3 space-y-1 text-center">
                          <p className="text-xs text-muted-foreground">Uyum Skoru</p>
                          <p className="text-xl font-bold text-green-600">{attendanceTotals.avgComplianceScore}%</p>
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
                                <span className="text-xs text-muted-foreground">{ROLE_LABELS[summary.role] || summary.role}</span>
                              </TableCell>
                              <TableCell>{summary.branchName}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="secondary">{summary.totalShifts}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {(summary.totalWorkedHours ?? 0).toFixed(1)}s
                              </TableCell>
                              <TableCell className="text-right">
                                {summary.overtimeHours > 0 ? (
                                  <Badge variant="default" className="bg-orange-600">{(summary.overtimeHours ?? 0).toFixed(1)}s</Badge>
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
        {(ikScope.isHQ || ikScope.userRole === 'supervisor') && (
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
        {ikScope.isHQ && (
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
                          <Badge>{record.employee_terminations?.totalPayment ? `${Number(record.employee_terminations.totalPayment ?? 0).toLocaleString('tr-TR')} ₺` : "Ödeme Yapılmadı"}</Badge>
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
        {(ikScope.isHQ) && (
          <TabsContent value="izinler" data-testid="content-izinler">
            <LeaveManagementSection employees={employees} />
          </TabsContent>
        )}

        {/* Tab 9: Maaş & Yan Haklar (HQ + admin + muhasebe) */}
        {(ikScope.isHQ || user?.role === 'muhasebe') && (
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
      {ikScope.isHQ && (
        <AddTerminationDialog
          open={addTerminationOpen}
          onOpenChange={setAddTerminationOpen}
          employees={employees}
        />
      )}
      </div>
    </ModuleLayout>
  );
}
