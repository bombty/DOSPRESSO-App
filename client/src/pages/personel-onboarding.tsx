import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission, type User, type EmployeeOnboarding } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CheckCircle2, Clock, AlertCircle, ArrowLeft, Plus, Edit, Trash2, Search } from "lucide-react";

const statusLabels: Record<string, string> = {
  pending: "Bekleniyor",
  in_progress: "Devam Ediyor",
  completed: "Tamamlandı",
};

const statusIcons: Record<string, any> = {
  pending: AlertCircle,
  in_progress: Clock,
  completed: CheckCircle2,
};

const onboardingSchema = z.object({
  userId: z.string().min(1, "Personel seçin"),
  startDate: z.string().min(1, "Başlangıç tarihi seçin"),
  orientationDate: z.string().optional().default(""),
  status: z.enum(["pending", "in_progress", "completed"]),
  notes: z.string().optional().default(""),
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
    queryKey: ["/api/employee-onboarding"],
    enabled: !!user && hasPermission(user, "hr_management"),
  });

  // Fetch employees for dropdown
  const { data: employees = [] } = useQuery<User[]>({
    queryKey: ["/api/employees"],
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
    pending: onboardingRecords.filter(r => r.status === "pending").length,
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
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Bekleniyor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
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
                  <SelectItem value="pending">Bekleniyor</SelectItem>
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
                  <TableHead>Oryantasyon Tarihi</TableHead>
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
                        {record.orientationDate ? format(new Date(record.orientationDate), "d MMM yyyy", { locale: tr }) : "-"}
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
                        {record.notes || "-"}
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
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRecord: EmployeeOnboarding | null;
  employees: User[];
  onSubmit: (data: OnboardingFormData) => void;
  isLoading: boolean;
}) {
  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      userId: editingRecord?.userId || "",
      startDate: editingRecord?.startDate || "",
      orientationDate: editingRecord?.orientationDate || "",
      status: (editingRecord?.status as any) || "pending",
      notes: editingRecord?.notes || "",
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
            className="space-y-4"
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
                name="orientationDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Oryantasyon Tarihi</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ""} data-testid="input-orientation-date" />
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
                      <SelectItem value="pending">Bekleniyor</SelectItem>
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notlar</FormLabel>
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                İptal
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                data-testid="button-submit-onboarding"
              >
                {isLoading ? "Kaydediliyor..." : editingRecord ? "Güncelle" : "Kayıt Oluştur"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
