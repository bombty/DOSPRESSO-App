import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission, type User, type EmployeeOnboarding } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CheckCircle2, Clock, AlertCircle, ArrowLeft } from "lucide-react";

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

export default function PersonelOnboardingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch onboarding records
  const { data: onboardingRecords = [], isLoading } = useQuery<(EmployeeOnboarding & { user?: User })[]>({
    queryKey: ["/api/employee-onboarding"],
    enabled: !!user && hasPermission(user, "hr_management"),
  });

  // Filter records
  const filteredRecords = useMemo(() => {
    return onboardingRecords.filter((record) => {
      if (statusFilter !== "all" && record.status !== statusFilter) return false;
      return true;
    });
  }, [onboardingRecords, statusFilter]);

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ recordId, status }: { recordId: number; status: string }) => {
      return apiRequest(`/api/employee-onboarding/${recordId}`, "PATCH", { status });
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Onboarding durumu güncellendi",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/employee-onboarding"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Güncelleme sırasında hata oluştu",
        variant: "destructive",
      });
    },
  });

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
          <p className="text-muted-foreground mt-1">
            Yeni personellerin işe alım ve oryantasyon süreçlerini yönet
          </p>
        </div>
      </div>

      {/* Filter Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtreler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
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
                  <TableHead className="text-right">İşlem</TableHead>
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
                        {record.startDate ? format(new Date(record.startDate), "d MMMM yyyy", { locale: tr }) : "-"}
                      </TableCell>
                      <TableCell>
                        {record.orientationDate ? format(new Date(record.orientationDate), "d MMMM yyyy", { locale: tr }) : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StatusIcon className="h-4 w-4" />
                          <Badge variant={record.status === "completed" ? "default" : "secondary"}>
                            {statusLabels[record.status] || record.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {record.notes || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Select
                          value={record.status}
                          onValueChange={(status) => {
                            updateStatusMutation.mutate({ recordId: record.id, status });
                          }}
                        >
                          <SelectTrigger className="w-32" data-testid={`select-status-${record.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Bekleniyor</SelectItem>
                            <SelectItem value="in_progress">Devam Ediyor</SelectItem>
                            <SelectItem value="completed">Tamamlandı</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {filteredRecords.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Seçili filtreler için kayıt bulunamadı
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
