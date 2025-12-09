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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  UserPlus,
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
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useLocation } from "wouter";
import { CreateDisciplinaryDialog } from "@/components/hr/DisciplinaryDialogs";

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

  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [warningsDialogOpen, setWarningsDialogOpen] = useState(false);
  const [addWarningDialogOpen, setAddWarningDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
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
    <div className="container mx-auto p-3 grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">İK Yönetimi</h1>
          <p className="text-muted-foreground">Personel yönetimi ve deneme süresi takibi</p>
        </div>
        {canCreate && (
          <Button onClick={() => setAddDialogOpen(true)} data-testid="button-add-employee">
            <UserPlus className="mr-2 h-4 w-4" />
            Yeni Personel Ekle
          </Button>
        )}
      </div>

      {/* Accordion Sections */}
      <Accordion type="multiple" defaultValue={["personel", "disiplin", "onboarding", "documents"]} className="w-full space-y-2 sm:space-y-3">
        {/* Section 1: Personel Listesi */}
        <AccordionItem value="personel" data-testid="accordion-personel">
          <Card>
            <AccordionTrigger className="px-6 hover:no-underline" data-testid="accordion-trigger-personel">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="text-lg font-semibold">Personel Listesi</span>
                <Badge variant="secondary" className="ml-2">{filteredEmployees.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="w-full space-y-2 sm:space-y-3">
                {/* Filters */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Filtreler
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2 sm:gap-3">
                    {/* Category filter - Şubeler/HQ/Fabrika */}
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-sm font-medium">Kategori</label>
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger data-testid="select-category-filter">
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
                      <div className="flex-1 min-w-[200px]">
                        <label className="text-sm font-medium">Şube</label>
                        <Select value={branchFilter} onValueChange={setBranchFilter}>
                          <SelectTrigger data-testid="select-branch-filter">
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

                    <div className="flex-1 min-w-[200px]">
                      <label className="text-sm font-medium">Rol</label>
                      <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger data-testid="select-role-filter">
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

                    <div className="flex-1 min-w-[200px]">
                      <label className="text-sm font-medium">Deneme Süresi</label>
                      <Select value={probationFilter} onValueChange={setProbationFilter}>
                        <SelectTrigger data-testid="select-probation-filter">
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

                    <div className="flex-1 min-w-[200px]">
                      <label className="text-sm font-medium">Eğitim Durumu</label>
                      <Select value={trainingFilter} onValueChange={setTrainingFilter}>
                        <SelectTrigger data-testid="select-training-filter">
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

                {/* Employee Table */}
                {isLoading ? (
                  <div className="flex flex-col gap-3 sm:gap-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ad Soyad</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Şube</TableHead>
                        <TableHead>İşe Giriş</TableHead>
                        <TableHead>Deneme Süresi</TableHead>
                        <TableHead>Eğitim</TableHead>
                        <TableHead>İletişim</TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground">
                            Personel bulunamadı
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredEmployees.map((employee) => {
                          const probationStatus = getProbationStatus(employee.probationEndDate);
                          const branch = branches.find((b) => b.id === employee.branchId);
                          const trainingStats = userTrainingCompletion.get(employee.id);
                          
                          return (
                            <TableRow key={employee.id} data-testid={`row-employee-${employee.id}`}>
                              <TableCell className="font-medium">
                                {employee.firstName} {employee.lastName}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{roleLabels[employee.role] || employee.role}</Badge>
                              </TableCell>
                              <TableCell>{branch?.name || "-"}</TableCell>
                              <TableCell>
                                {employee.hireDate ? (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    {format(new Date(employee.hireDate), "dd.MM.yyyy")}
                                  </div>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {probationStatus ? (
                                  <Badge variant={probationStatus.variant}>
                                    {probationStatus.label}
                                  </Badge>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {trainingStats && trainingStats.total > 0 ? (
                                  <Badge
                                    variant={
                                      trainingStats.completed === trainingStats.total
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {trainingStats.completed}/{trainingStats.total}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">
                                <div>{employee.phoneNumber || "-"}</div>
                                <div className="text-muted-foreground">{employee.email || "-"}</div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                  {canEdit && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedEmployee(employee);
                                        setEditDialogOpen(true);
                                      }}
                                      data-testid={`button-edit-${employee.id}`}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Link href={`/personel-detay/${employee.id}`}>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      data-testid={`button-detail-${employee.id}`}
                                    >
                                      <FileText className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedEmployee(employee);
                                      setWarningsDialogOpen(true);
                                    }}
                                    data-testid={`button-warnings-${employee.id}`}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {canWarn && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedEmployee(employee);
                                        setAddWarningDialogOpen(true);
                                      }}
                                      data-testid={`button-add-warning-${employee.id}`}
                                    >
                                      <AlertTriangle className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {(user?.role === 'admin' || user?.role === 'coach') && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedEmployee(employee);
                                        setNewPassword("");
                                        setResetPasswordDialogOpen(true);
                                      }}
                                      data-testid={`button-reset-password-${employee.id}`}
                                    >
                                      <Key className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Section 2: Disiplin Yönetimi */}
        <AccordionItem value="disiplin" data-testid="accordion-disiplin">
          <Card>
            <AccordionTrigger className="px-6 hover:no-underline" data-testid="accordion-trigger-disiplin">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <FileWarning className="h-4 w-4" />
                  <span className="text-lg font-semibold">Disiplin Yönetimi</span>
                  <Badge variant="secondary" className="ml-2">{filteredDisciplinaryReports.length}</Badge>
                </div>
                {canWarn && user?.id && user?.branchId && (
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <CreateDisciplinaryDialog 
                      userId={user.id} 
                      branchId={user.branchId} 
                    />
                  </div>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
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
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Section 3: Yeni Personel Onboarding */}
        <AccordionItem value="onboarding" data-testid="accordion-onboarding">
          <Card>
            <AccordionTrigger className="px-6 hover:no-underline" data-testid="accordion-trigger-onboarding">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                <span className="text-lg font-semibold">Yeni Personel Onboarding</span>
                <Badge variant="secondary" className="ml-2">{filteredOnboardingRecords.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
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
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Section 4: Özlük Dosyaları */}
        <AccordionItem value="documents" data-testid="accordion-documents">
          <Card>
            <AccordionTrigger className="px-6 hover:no-underline" data-testid="accordion-trigger-documents">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                <span className="text-lg font-semibold">Özlük Dosyaları</span>
                <Badge variant="secondary" className="ml-2">{filteredEmployeeDocuments.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
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
            </AccordionContent>
          </Card>
        </AccordionItem>
      </Accordion>

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
