import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole, insertOvertimeRequestSchema } from "@shared/schema";
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
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
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
import { ListSkeleton } from "@/components/list-skeleton";
import { EmptyState } from "@/components/empty-state";
import { Plus, Check, X, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

const statusLabels: Record<string, string> = {
  pending: "Beklemede",
  approved: "Onaylandı",
  rejected: "Reddedildi",
};

const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

const createOvertimeSchema = insertOvertimeRequestSchema.pick({
  shiftAttendanceId: true,
  requestedMinutes: true,
  reason: true,
});

type CreateOvertimeFormData = z.infer<typeof createOvertimeSchema>;

export default function OvertimeRequestsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: overtimeRequests = [], isLoading, isError, refetch } = useQuery<any[]>({
    queryKey: ["/api/overtime-requests", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      
      const res = await fetch(`/api/overtime-requests?${params}`);
      if (!res.ok) throw new Error(res.statusText);
      return res.json();
    },
    enabled: !!user,
  });

  const { data: shiftAttendances = [] } = useQuery<any[]>({
    queryKey: ["/api/shift-attendances/my-recent"],
    enabled: !!user,
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/employees"],
    enabled: !!user && (user.role === "supervisor" || user.role === "supervisor_buddy" || isHQRole(user.role as any)),
  });

  const canApprove = user?.role && (user.role === "supervisor" || user.role === "supervisor_buddy" || isHQRole(user.role as any));

  const getUserName = (userId: string) => {
    const foundUser = users.find((u) => u.id === userId);
    return foundUser ? `${foundUser.firstName} ${foundUser.lastName}` : "Kullanıcı";
  };

  const createForm = useForm<CreateOvertimeFormData>({
    resolver: zodResolver(createOvertimeSchema),
    defaultValues: {
      requestedMinutes: 0,
      reason: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateOvertimeFormData) => {
      return apiRequest("POST", "/api/overtime-requests", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/overtime-requests"] });
      toast({ title: "Mesai talebi oluşturuldu" });
      setCreateDialogOpen(false);
      createForm.reset();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Hata", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, approvedMinutes }: { id: number; approvedMinutes: number }) => {
      return apiRequest("PATCH", `/api/overtime-requests/${id}/approve`, { approvedMinutes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/overtime-requests"] });
      toast({ title: "Mesai talebi onaylandı" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Hata", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      return apiRequest("PATCH", `/api/overtime-requests/${id}/reject`, { rejectionReason: reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/overtime-requests"] });
      toast({ title: "Mesai talebi reddedildi" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Hata", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleCreateSubmit = createForm.handleSubmit((data) => {
    createMutation.mutate(data);
  });

  const filteredRequests = overtimeRequests.filter((req) => {
    if (statusFilter !== "all" && req.status !== statusFilter) return false;
    return true;
  });

  
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="container mx-auto p-3 grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Mesai Talepleri</h1>
          <p className="text-muted-foreground">Fazla mesai taleplerinizi oluşturun ve yönetin</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-overtime">
          <Plus className="mr-2 h-4 w-4" />
          Yeni Mesai Talebi
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Mesai Talepleri ({filteredRequests.length})</CardTitle>
              <CardDescription>Haftalık 45 saati aşan çalışmalar için mesai talebi oluşturabilirsiniz</CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="pending">Beklemede</SelectItem>
                <SelectItem value="approved">Onaylandı</SelectItem>
                <SelectItem value="rejected">Reddedildi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ListSkeleton count={3} variant="row" />
          ) : filteredRequests.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="Mesai talebi yok"
              description="Henüz mesai talebi bulunmuyor."
              data-testid="empty-state-overtime"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {canApprove && <TableHead>Çalışan</TableHead>}
                    <TableHead>Talep Edilen Süre</TableHead>
                    <TableHead>Onaylanan Süre</TableHead>
                    <TableHead>Sebep</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Tarih</TableHead>
                    {canApprove && <TableHead className="text-right">İşlemler</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id} data-testid={`row-overtime-${request.id}`}>
                      {canApprove && (
                        <TableCell data-testid={`text-employee-${request.id}`}>
                          {getUserName(request.userId)}
                        </TableCell>
                      )}
                      <TableCell data-testid={`text-requested-${request.id}`}>
                        {Math.floor(request.requestedMinutes / 60)}s {request.requestedMinutes % 60}dk
                      </TableCell>
                      <TableCell data-testid={`text-approved-${request.id}`}>
                        {request.approvedMinutes ? (
                          `${Math.floor(request.approvedMinutes / 60)}s ${request.approvedMinutes % 60}dk`
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate" data-testid={`text-reason-${request.id}`}>
                        {request.reason}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[request.status]} data-testid={`badge-status-${request.id}`}>
                          {statusLabels[request.status]}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-date-${request.id}`}>
                        {format(new Date(request.createdAt), "dd.MM.yyyy HH:mm")}
                      </TableCell>
                      {canApprove && (
                        <TableCell className="text-right">
                          {request.status === "pending" && (
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => approveMutation.mutate({ 
                                  id: request.id, 
                                  approvedMinutes: request.requestedMinutes 
                                })}
                                disabled={approveMutation.isPending}
                                data-testid={`button-approve-${request.id}`}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Onayla
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  const reason = prompt("Red nedeni:");
                                  if (reason) {
                                    rejectMutation.mutate({ id: request.id, reason });
                                  }
                                }}
                                disabled={rejectMutation.isPending}
                                data-testid={`button-reject-${request.id}`}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Reddet
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent data-testid="dialog-create-overtime">
          <DialogHeader>
            <DialogTitle>Yeni Mesai Talebi</DialogTitle>
            <DialogDescription>
              Fazla mesai yaptığınız süre için talep oluşturun. Administratorniz tarafından onaylanmalıdır.
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={handleCreateSubmit} className="w-full space-y-2 sm:space-y-3">
              <FormField
                control={createForm.control}
                name="shiftAttendanceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vardiya</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger data-testid="select-shift">
                          <SelectValue placeholder="Vardiya seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {shiftAttendances.map((attendance) => (
                          <SelectItem key={attendance.id} value={attendance.id.toString()}>
                            {format(new Date(attendance.checkInTime), "dd.MM.yyyy HH:mm")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="requestedMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Talep Edilen Süre (dakika)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={15}
                        placeholder="60"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-minutes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sebep</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Mesai sebebini açıklayın..."
                        {...field}
                        data-testid="textarea-reason"
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
                  onClick={() => setCreateDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-submit"
                >
                  {createMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
