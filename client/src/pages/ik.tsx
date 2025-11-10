import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission, isHQRole, type User, type EmployeeWarning, insertUserSchema, insertEmployeeWarningSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

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

  // Filters
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [probationFilter, setProbationFilter] = useState<string>("all");
  const [trainingFilter, setTrainingFilter] = useState<string>("all");

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

  // Fetch employees (with branch filtering for non-HQ users)
  const { data: employees = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/employees", branchFilter, user?.branchId],
    queryFn: async () => {
      const token = localStorage.getItem('dospresso_token');
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      // Branch users can only see their own branch employees
      // HQ users can see all or filter by branch
      let url = '/api/employees';
      
      if (user?.role && !isHQRole(user.role as any)) {
        // Branch user: force filter to their branch
        if (user.branchId) {
          url = `/api/employees?branchId=${user.branchId}`;
        }
      } else {
        // HQ user: respect the branch filter dropdown
        if (branchFilter !== "all") {
          url = `/api/employees?branchId=${branchFilter}`;
        }
      }
      
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(res.statusText);
      return res.json();
    },
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

  // Check permissions
  const canCreate = user?.role && hasPermission(user.role as any, "employees", "create");
  const canEdit = user?.role && hasPermission(user.role as any, "employees", "edit");
  const canWarn = user?.role && hasPermission(user.role as any, "employees", "approve");

  // Filter employees
  const filteredEmployees = employees.filter((emp) => {
    if (branchFilter !== "all" && emp.branchId !== parseInt(branchFilter)) return false;
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

  return (
    <div className="container mx-auto p-6 space-y-6">
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

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtreler
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
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

      {/* Employee List */}
      <Card>
        <CardHeader>
          <CardTitle>Personel Listesi ({filteredEmployees.length})</CardTitle>
          <CardDescription>
            Tüm personellerin listesi ve deneme süresi durumları
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
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
      </Card>

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
      branchId: userRole === "supervisor" ? (userBranchId || undefined) : undefined,
      hireDate: undefined,
      probationEndDate: undefined,
      birthDate: undefined,
      phoneNumber: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      notes: "",
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
    onError: (error: any) => {
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ad *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-first-name" />
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
                      <Input {...field} data-testid="input-last-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kullanıcı Adı *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-username" />
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
                      <Input type="password" {...field} data-testid="input-password" />
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

            <div className="grid grid-cols-2 gap-4">
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
                      value={field.value?.toString()}
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

            <div className="grid grid-cols-3 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
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
    mutationFn: async (data: any) => {
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
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Güncelleme sırasında hata oluştu",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {userRole === "admin" && (
              <>
                <div className="grid grid-cols-2 gap-4">
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

                <div className="grid grid-cols-2 gap-4">
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

                <div className="grid grid-cols-3 gap-4">
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

                <div className="grid grid-cols-2 gap-4">
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

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
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
    onError: (error: any) => {
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
    onError: (error: any) => {
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
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
