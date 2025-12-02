import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Search,
  AlertCircle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { z } from "zod";
import type { User, EmployeeOnboarding } from "@shared/schema";

const statusLabels: Record<string, string> = {
  not_started: "Başlamadı",
  in_progress: "Devam Ediyor",
  completed: "Tamamlandı",
};

const statusIcons: Record<string, any> = {
  not_started: AlertCircle,
  in_progress: Clock,
  completed: CheckCircle2,
};

const onboardingSchema = z.object({
  userId: z.string().min(1, "Personel seçin"),
  branchId: z.string().min(1, "Şube seçin"),
  startDate: z.string().min(1, "Başlangıç tarihi seçin"),
  expectedCompletionDate: z.string().optional().default(""),
  status: z.enum(["not_started", "in_progress", "completed"]),
  supervisorNotes: z.string().optional().default(""),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

export default function PersonelOnboardingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchText, setSearchText] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EmployeeOnboarding | null>(null);

  // Fetch onboarding records
  const { data: onboardingRecords = [], isLoading } = useQuery<(EmployeeOnboarding & { user?: User })[]>({
    queryKey: ["/api/employee-onboarding", { filter: "all" }],
    enabled: !!user,
  });

  // Fetch employees for dropdown
  const { data: employees = [] } = useQuery<User[]>({
    queryKey: ["/api/employees"],
    enabled: !!user,
  });

  // Fetch branches
  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ["/api/branches"],
    enabled: !!user,
  });

  // Filter records
  const filteredRecords = useMemo(() => {
    return onboardingRecords.filter((record) => {
      if (statusFilter !== "all" && record.status !== statusFilter) return false;
      if (searchText) {
        const search = searchText.toLowerCase();
        const fullName = `${record.user?.firstName || ""} ${record.user?.lastName || ""}`.toLowerCase();
        if (!fullName.includes(search)) return false;
      }
      return true;
    });
  }, [onboardingRecords, statusFilter, searchText]);

  // Stats
  const stats = useMemo(() => ({
    total: onboardingRecords.length,
    notStarted: onboardingRecords.filter(r => r.status === "not_started").length,
    inProgress: onboardingRecords.filter(r => r.status === "in_progress").length,
    completed: onboardingRecords.filter(r => r.status === "completed").length,
  }), [onboardingRecords]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: OnboardingFormData) => {
      return apiRequest("/api/employee-onboarding", "POST", data);
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Onboarding kaydı oluşturuldu" });
      queryClient.invalidateQueries({ queryKey: ["/api/employee-onboarding"] });
      setDialogOpen(false);
      setEditingRecord(null);
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ recordId, data }: { recordId: number; data: OnboardingFormData }) => {
      return apiRequest(`/api/employee-onboarding/${recordId}`, "PATCH", data);
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Onboarding kaydı güncellendi" });
      queryClient.invalidateQueries({ queryKey: ["/api/employee-onboarding"] });
      setDialogOpen(false);
      setEditingRecord(null);
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (recordId: number) => {
      return apiRequest(`/api/employee-onboarding/${recordId}`, "DELETE");
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Onboarding kaydı silindi" });
      queryClient.invalidateQueries({ queryKey: ["/api/employee-onboarding"] });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const handleAddClick = () => {
    setEditingRecord(null);
    setDialogOpen(true);
  };

  const handleEditClick = (record: EmployeeOnboarding) => {
    setEditingRecord(record);
    setDialogOpen(true);
  };

  const handleDeleteClick = (recordId: number) => {
    if (confirm("Bu kaydı silmek istediğinizden emin misiniz?")) {
      deleteMutation.mutate(recordId);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            data-testid="button-back"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Yeni Personel Onboarding</h1>
            <p className="text-muted-foreground mt-1">Yeni personellerin işe alım ve oryantasyon süreçlerini yönet</p>
          </div>
        </div>
        <Button
          onClick={handleAddClick}
          data-testid="button-add-onboarding"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Yeni Kayıt
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Toplam</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Başlamadı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.notStarted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Devam Ediyor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tamamlandı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtreler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-col md:flex-row">
            <div className="flex-1">
              <label className="text-sm font-medium">Durum</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
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
            <div className="flex-1">
              <label className="text-sm font-medium">Ara</label>
              <div className="relative">
                <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Personel adı..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-8"
                  data-testid="input-search"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Onboarding Kayıtları
            <Badge variant="secondary" className="ml-2">
              {filteredRecords.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            {filteredRecords.length === 0 ? "Kayıt bulunamadı" : `${filteredRecords.length} kayıt`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Personel Adı</TableHead>
                  <TableHead>Başlangıç Tarihi</TableHead>
                  <TableHead>Tamamlanma Hedefi</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Notlar</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => {
                  const StatusIcon = statusIcons[record.status] || Clock;
                  return (
                    <TableRow key={record.id} data-testid={`row-onboarding-${record.id}`}>
                      <TableCell className="font-medium">
                        {record.user?.firstName} {record.user?.lastName}
                      </TableCell>
                      <TableCell>
                        {record.startDate ? format(new Date(record.startDate), "d MMM yyyy", { locale: tr }) : "-"}
                      </TableCell>
                      <TableCell>
                        {record.expectedCompletionDate ? format(new Date(record.expectedCompletionDate), "d MMM yyyy", { locale: tr }) : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StatusIcon className="h-4 w-4" />
                          <Badge variant={record.status === "completed" ? "default" : "secondary"}>
                            {statusLabels[record.status] || record.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {record.supervisorNotes || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            data-testid={`button-edit-${record.id}`}
                            onClick={() => handleEditClick(record)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            data-testid={`button-delete-${record.id}`}
                            onClick={() => handleDeleteClick(record.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {filteredRecords.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchText || statusFilter !== "all" ? "Seçili filtreler için kayıt bulunamadı" : "Henüz onboarding kaydı oluşturulmamış"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <OnboardingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingRecord={editingRecord}
        employees={employees}
        branches={branches}
        onSubmit={(data) => {
          if (editingRecord) {
            updateMutation.mutate({ recordId: editingRecord.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}

// Dialog Component
function OnboardingDialog({
  open,
  onOpenChange,
  editingRecord,
  employees,
  branches,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRecord: EmployeeOnboarding | null;
  employees: User[];
  branches: any[];
  onSubmit: (data: OnboardingFormData) => void;
  isLoading: boolean;
}) {
  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      userId: editingRecord?.userId || "",
      branchId: editingRecord?.branchId?.toString() || "",
      startDate: editingRecord?.startDate || "",
      expectedCompletionDate: editingRecord?.expectedCompletionDate || "",
      status: (editingRecord?.status as any) || "not_started",
      supervisorNotes: editingRecord?.supervisorNotes || "",
    },
  });

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingRecord ? "Onboarding Düzenle" : "Yeni Onboarding Kaydı"}
          </DialogTitle>
          <DialogDescription>
            {editingRecord
              ? "Personel onboarding detaylarını güncelleyin"
              : "Yeni personel için onboarding kaydı oluşturun"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid grid-cols-1 gap-4"
          >
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Personel</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-employee">
                        <SelectValue placeholder="Personel seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName}
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
                  <Select onValueChange={field.onChange} value={field.value}>
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Başlangıç Tarihi</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-start-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expectedCompletionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hedef Tamamlanma</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ""} data-testid="input-completion-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Durum</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-status">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="not_started">Başlamadı</SelectItem>
                      <SelectItem value="in_progress">Devam Ediyor</SelectItem>
                      <SelectItem value="completed">Tamamlandı</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="supervisorNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supervisor Notları</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ek notlar..."
                      {...field}
                      data-testid="textarea-notes"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isLoading}
              >
                İptal
              </Button>
              <Button type="submit" disabled={isLoading} data-testid="button-submit">
                {isLoading ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
