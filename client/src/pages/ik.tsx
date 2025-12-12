import { useState, useMemo } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
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
  ChevronLeft,
  ChevronRight,
  Star,
  Building2,
  MapPin,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useLocation } from "wouter";
import { CreateDisciplinaryDialog } from "@/components/hr/DisciplinaryDialogs";
import { EmployeeTermination, insertEmployeeTerminationSchema } from "@shared/schema";

const roleLabels: Record<string, string> = {
  admin: "Admin",
  muhasebe: "Muhasebe",
  satinalma: "Satınalma",
  coach: "Coach",
  teknik: "Teknik",
  destek: "Destek",
  fabrika: "Fabrika",
  yatirimci_hq: "Yatırımcı (HQ)",
  supervisor: "Supervisor",
  supervisor_buddy: "Supervisor Buddy",
  barista: "Barista",
  bar_buddy: "Bar Buddy",
  stajyer: "Stajyer",
  yatirimci: "Yatırımcı",
};

const warningTypeLabels: Record<string, string> = {
  verbal: "Sözlü Uyarı",
  written: "Yazılı Uyarı",
  final: "Son Uyarı",
};

const branchRoles = ["supervisor", "supervisor_buddy", "barista", "bar_buddy", "stajyer"];

export default function IKPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Filters - Section 1: Employee List
  const [categoryFilter, setCategoryFilter] = useState<string>("all"); // Şubeler, HQ, Fabrika
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [probationFilter, setProbationFilter] = useState<string>("all");
  const [trainingFilter, setTrainingFilter] = useState<string>("all");

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
          {canCreate && (
            <Button onClick={() => setAddDialogOpen(true)} data-testid="button-add-employee">
              <UserPlus className="mr-2 h-4 w-4" />
              Yeni Personel Ekle
            </Button>
          )}
        </div>

      {/* Main Tabs Navigation */}
      <Tabs defaultValue="personel" className="w-full space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-muted/50 rounded-lg" data-testid="ik-main-tabs">
          <TabsTrigger value="personel" className="flex items-center gap-2 px-4 py-2" data-testid="tab-personel">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Personel</span>
            <Badge variant="secondary" className="ml-1">{filteredEmployees.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="disiplin" className="flex items-center gap-2 px-4 py-2" data-testid="tab-disiplin">
            <FileWarning className="h-4 w-4" />
            <span className="hidden sm:inline">Disiplin</span>
          </TabsTrigger>
          <TabsTrigger value="onboarding" className="flex items-center gap-2 px-4 py-2" data-testid="tab-onboarding">
            <UserCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Onboarding</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2 px-4 py-2" data-testid="tab-documents">
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Özlük</span>
          </TabsTrigger>
          {canViewAttendance && (
            <TabsTrigger value="mesai" className="flex items-center gap-2 px-4 py-2" data-testid="tab-mesai">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Mesai</span>
            </TabsTrigger>
          )}
          {(isHQRole(user?.role as any) || user?.role === 'supervisor') && (
            <TabsTrigger value="ise-alim" className="flex items-center gap-2 px-4 py-2" data-testid="tab-ise-alim">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">İşe Alım</span>
            </TabsTrigger>
          )}
          {isHQRole(user?.role as any) && (
            <TabsTrigger value="istten-cikis" className="flex items-center gap-2 px-4 py-2" data-testid="tab-istten-cikis">
              <UserMinus className="h-4 w-4" />
              <span className="hidden sm:inline">İşten Çıkış</span>
            </TabsTrigger>
          )}
          {user?.role === 'admin' && (
            <TabsTrigger value="izinler" className="flex items-center gap-2 px-4 py-2" data-testid="tab-izinler">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">İzinler</span>
            </TabsTrigger>
          )}
        </TabsList>

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
                    {/* Filters Card */}
                    <Card className="bg-muted/30 border-dashed">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Filter className="h-4 w-4" />
                          Filtreler
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {/* Category filter - Şubeler/HQ/Fabrika */}
                        <div>
                          <label className="text-sm font-medium">Kategori *</label>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full rounded-lg" />
                    ))}
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">Personel Bulunamadı</p>
                    <p className="text-sm text-muted-foreground">Filtrelere uygun personel yok.</p>
                  </Card>
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {[...Array(6)].map((_, i) => (
                          <Skeleton key={i} className="h-24 w-full rounded-lg" />
                        ))}
                      </div>
                    ) : terminatedEmployees.length === 0 ? (
                      <Card className="p-8 text-center">
                        <UserMinus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">Ayrılan Personel Yok</p>
                        <p className="text-sm text-muted-foreground">İşten ayrılan personel kaydı bulunmuyor.</p>
                      </Card>
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
                <CreateDisciplinaryDialog 
                  userId={user.id} 
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
                  <div className="flex flex-col gap-3 sm:gap-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
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
                  <div className="flex flex-col gap-3 sm:gap-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
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
                  <div className="flex flex-col gap-3 sm:gap-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
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
                    <div className="flex flex-col gap-2 sm:gap-3">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : attendanceSummaries.length === 0 ? (
                    <Card>
                      <CardContent className="py-10 text-center text-muted-foreground">
                        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Bu dönem için mesai kaydı bulunamadı</p>
                      </CardContent>
                    </Card>
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

        {/* Tab 8: İzin Bakiyeleri ve Resmi Tatiller (sadece admin) */}
        {user?.role === 'admin' && (
          <TabsContent value="izinler" data-testid="content-izinler">
            <LeaveManagementSection employees={employees} />
          </TabsContent>
        )}
      </Tabs>

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

  const form = useForm<z.infer<typeof createEmployeeSchema>>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      username: "",
      hashedPassword: "",
      email: "",
      firstName: "",
      lastName: "",
      role: "barista",
      branchId: userRole === "supervisor" ? userBranchId : undefined,
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
    mutationFn: async (data: z.infer<typeof createEmployeeSchema>) => {
      return apiRequest("POST", "/api/employees", data);
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

  const onSubmit = (data: z.infer<typeof createEmployeeSchema>) => {
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

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-role">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(roleLabels)
                          .filter(([key]) => branchRoles.includes(key))
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
                    <FormLabel>Şube {userRole === "supervisor" && "(otomatik)"}</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value ? field.value.toString() : ""}
                      disabled={userRole === "supervisor"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-branch">
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
    mutationFn: async (data) => {
      return apiRequest(`/api/employees/${employee.id}`, "PUT", data);
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

  const onSubmit = (data) => {
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
                              .filter(([key]) => branchRoles.includes(key))
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
      return apiRequest(`/api/employees/${employee.id}/warnings`, "POST", data);
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
      return apiRequest(`/api/employees/${employee.id}/reset-password`, "POST", data);
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

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="hover-elevate">
          <CardContent className="p-3 space-y-1 text-center">
            <p className="text-xs text-muted-foreground">Açık Pozisyon</p>
            <p className="text-xl sm:text-2xl font-bold text-blue-600">{stats?.openPositions || 0}</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate">
          <CardContent className="p-3 space-y-1 text-center">
            <p className="text-xs text-muted-foreground">Yeni Başvuru</p>
            <p className="text-xl sm:text-2xl font-bold text-orange-600">{stats?.newApplications || 0}</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate">
          <CardContent className="p-3 space-y-1 text-center">
            <p className="text-xs text-muted-foreground">Planlı Mülakat</p>
            <p className="text-xl sm:text-2xl font-bold text-purple-600">{stats?.scheduledInterviews || 0}</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate">
          <CardContent className="p-3 space-y-1 text-center">
            <p className="text-xs text-muted-foreground">Bu Ay İşe Alım</p>
            <p className="text-xl sm:text-2xl font-bold text-green-600">{stats?.hiredThisMonth || 0}</p>
          </CardContent>
        </Card>
      </div>

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))}
            </div>
          ) : positions.length === 0 ? (
            <Card className="p-8 text-center">
              <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Açık Pozisyon Yok</p>
              <p className="text-sm text-muted-foreground">Yeni bir pozisyon ekleyerek başlayın.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {positions.map((position: any) => (
                <Card 
                  key={position.id}
                  className="hover-elevate cursor-pointer"
                  onClick={() => setSelectedPosition(position)}
                  data-testid={`card-position-${position.id}`}
                >
                  <CardContent className="p-4">
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
                    <div className="mt-3 text-sm text-muted-foreground">
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
                      <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Son: {format(new Date(position.deadline), "dd.MM.yyyy")}
                      </div>
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

          {applications.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Başvuru Yok</p>
              <p className="text-sm text-muted-foreground">Henüz başvuru kaydı bulunmuyor.</p>
            </Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aday</TableHead>
                  <TableHead>Pozisyon</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app: any) => {
                  const position = positions.find((p: any) => p.id === app.positionId);
                  return (
                    <TableRow key={app.id} data-testid={`row-application-${app.id}`}>
                      <TableCell className="font-medium">
                        {app.firstName} {app.lastName}
                      </TableCell>
                      <TableCell>
                        {position?.title || `Pozisyon #${app.positionId}`}
                      </TableCell>
                      <TableCell>{app.phone}</TableCell>
                      <TableCell>
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
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Planlı Mülakatlar</h3>
          </div>

          {interviewsData.length === 0 ? (
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
                {interviewsData.map((interview: any) => {
                  const app = applications.find((a: any) => a.id === interview.applicationId);
                  const position = positions.find((p: any) => p.id === app?.positionId);
                  return (
                    <TableRow key={interview.id} data-testid={`row-interview-${interview.id}`}>
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
                            'secondary'
                          }
                        >
                          {interview.status === 'scheduled' ? 'Planlandı' :
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
    </div>
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
      terminationDate,
      reason: reason || undefined,
      totalPayment: totalPayment || undefined,
      processedById: undefined,
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
            <label className="text-sm font-medium">Ayrılış Türü</label>
            <Select value={terminationType} onValueChange={setTerminationType}>
              <SelectTrigger data-testid="select-termination-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resignation">İstifa</SelectItem>
                <SelectItem value="termination">Fesih</SelectItem>
                <SelectItem value="retirement">Emeklilik</SelectItem>
                <SelectItem value="mutual_agreement">Karşılıklı Anlaşma</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Ayrılış Tarihi</label>
            <Input type="date" value={terminationDate} onChange={(e) => setTerminationDate(e.target.value)} data-testid="input-termination-date" />
          </div>
          <div>
            <label className="text-sm font-medium">Sebep (Opsiyonel)</label>
            <Textarea placeholder="Ayrılış sebebini yazın" value={reason} onChange={(e) => setReason(e.target.value)} className="resize-none" />
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
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : leaveBalances.length === 0 ? (
            <div className="text-center p-8">
              <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">İzin bakiyesi bulunamadı</p>
            </div>
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
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : holidays.length === 0 ? (
            <div className="text-center p-8">
              <Star className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">{selectedYear} için tatil tanımlı değil</p>
            </div>
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
