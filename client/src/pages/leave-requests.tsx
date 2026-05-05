import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole, insertLeaveRequestSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { offlineErrorHandler } from "@/hooks/useOfflineMutation";
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
import { Plus, Check, X, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

const leaveTypeLabels: Record<string, string> = {
  annual: "Yıllık İzin",
  sick: "Hastalık İzni",
  personal: "Kişisel İzin",
  unpaid: "Ücretsiz İzin",
};

const statusLabels: Record<string, string> = {
  pending: "Beklemede",
  approved: "Onaylandı",
  rejected: "Reddedildi",
};

export default function LeaveRequestsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");  // Sprint 6 / Mahmut Bey önerisi
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>("all");  // Sprint 6 / Mahmut Bey önerisi
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: leaveRequests = [], isLoading, isError, refetch } = useQuery<any[]>({
    queryKey: ["/api/leave-requests", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      
      const res = await fetch(`/api/leave-requests?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error(res.statusText);
      return res.json();
    },
    enabled: !!user,
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/employees"],
    staleTime: 600000,
    enabled: !!user && (user.role === "supervisor" || user.role === "supervisor_buddy" || isHQRole(user.role as any)),
  });

  const { data: branches = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/branches"],
    staleTime: 300000,
    enabled: !!user && isHQRole(user.role as any),
  });

  const canApprove = user?.role && (user.role === "supervisor" || user.role === "supervisor_buddy" || isHQRole(user.role as any));

  const getUserName = (userId: string) => {
    const foundUser = users.find((u) => u.id === userId);
    return foundUser ? `${foundUser.firstName} ${foundUser.lastName}` : "Kullanıcı";
  };

  // Get branch ID for a leave request via user lookup
  const getRequestBranchId = (req: any): number | null => {
    const reqUser = users.find((u) => u.id === req.userId);
    return reqUser?.branchId ?? null;
  };

  const filteredRequests = leaveRequests.filter((req) => {
    if (statusFilter !== "all" && req.status !== statusFilter) return false;
    if (branchFilter !== "all" && getRequestBranchId(req) !== parseInt(branchFilter)) return false;
    if (leaveTypeFilter !== "all" && req.leaveType !== leaveTypeFilter) return false;
    return true;
  });

  // Aktif filtre sayısı
  const activeFilterCount = [statusFilter, branchFilter, leaveTypeFilter].filter(f => f !== "all").length;

  
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="container mx-auto p-3 space-y-3 sm:space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">İzin Talepleri</h1>
          <p className="text-muted-foreground">İzin taleplerinizi oluşturun ve yönetin</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-leave">
          <Plus className="mr-2 h-4 w-4" />
          Yeni İzin Talebi
        </Button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* QUICK FILTER CHIPS — Sprint 6 / Mahmut Bey önerisi (5 May 2026)  */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {canApprove && (
        <Card className="bg-muted/20 border-dashed">
          <CardContent className="p-3 space-y-3">
            {/* Durum Filtreleri */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground mr-1">Durum:</span>
              {[
                { value: "all", label: "Tümü", emoji: "📋" },
                { value: "pending", label: "Bekleyen", emoji: "⏳" },
                { value: "approved", label: "Onaylı", emoji: "✅" },
                { value: "rejected", label: "Red", emoji: "❌" },
              ].map((s) => {
                const count = s.value === "all" 
                  ? leaveRequests.length 
                  : leaveRequests.filter(r => r.status === s.value).length;
                return (
                  <button
                    key={s.value}
                    onClick={() => setStatusFilter(s.value)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                      statusFilter === s.value
                        ? "bg-primary text-primary-foreground border-primary font-semibold"
                        : "bg-background hover:bg-muted border-border"
                    }`}
                    data-testid={`chip-status-${s.value}`}
                  >
                    {s.emoji} {s.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Şube Filtreleri (sadece HQ) */}
            {isHQRole(user?.role as any) && branches.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground mr-1">Şube:</span>
                <button
                  onClick={() => setBranchFilter("all")}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                    branchFilter === "all"
                      ? "bg-primary text-primary-foreground border-primary font-semibold"
                      : "bg-background hover:bg-muted border-border"
                  }`}
                >
                  🌐 Tüm Şubeler
                </button>
                {branches.map((b) => {
                  const count = leaveRequests.filter(r => getRequestBranchId(r) === b.id).length;
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
                    >
                      {icon} {b.name} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            {/* İzin Tipi Filtreleri */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground mr-1">Tip:</span>
              {[
                { value: "all", label: "Tümü", emoji: "🗂️" },
                { value: "annual", label: "Yıllık", emoji: "🏖️" },
                { value: "sick", label: "Hastalık", emoji: "🤒" },
                { value: "excuse", label: "Mazeret", emoji: "📝" },
                { value: "unpaid", label: "Ücretsiz", emoji: "💸" },
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => setLeaveTypeFilter(t.value)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                    leaveTypeFilter === t.value
                      ? "bg-primary text-primary-foreground border-primary font-semibold"
                      : "bg-background hover:bg-muted border-border"
                  }`}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>

            {/* Aktif filtre sayısı + reset */}
            {activeFilterCount > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-dashed">
                <span className="text-xs text-muted-foreground">
                  {activeFilterCount} aktif filtre • {filteredRequests.length} sonuç
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatusFilter("all");
                    setBranchFilter("all");
                    setLeaveTypeFilter("all");
                  }}
                  className="h-7 text-xs"
                >
                  Filtreleri Temizle
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>İzin Talepleri ({filteredRequests.length})</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="pending">Bekleyen</SelectItem>
                <SelectItem value="approved">Onaylanan</SelectItem>
                <SelectItem value="rejected">Reddedilen</SelectItem>
              </SelectContent>
            </Select>
          </CardTitle>
          <CardDescription>
            {canApprove
              ? "Şube personelinin izin talepleri"
              : "İzin talep geçmişiniz"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ListSkeleton count={5} variant="row" />
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {canApprove && <TableHead>Personel</TableHead>}
                  <TableHead>İzin Türü</TableHead>
                  <TableHead>Başlangıç</TableHead>
                  <TableHead>Bitiş</TableHead>
                  <TableHead>Gün Sayısı</TableHead>
                  <TableHead>Sebep</TableHead>
                  <TableHead>Durum</TableHead>
                  {canApprove && <TableHead className="text-right">İşlemler</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canApprove ? 8 : 7} className="text-center text-muted-foreground">
                      İzin talebi bulunamadı
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => (
                    <TableRow key={request.id} data-testid={`row-leave-${request.id}`}>
                      {canApprove && <TableCell className="font-medium">{getUserName(request.userId)}</TableCell>}
                      <TableCell>
                        <Badge variant="secondary">{leaveTypeLabels[request.leaveType] || request.leaveType}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(request.startDate), "dd.MM.yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(request.endDate), "dd.MM.yyyy")}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{request.totalDays} gün</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {request.reason || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            request.status === "approved"
                              ? "default"
                              : request.status === "rejected"
                              ? "destructive"
                              : "secondary"
                          }
                          data-testid={`badge-status-${request.id}`}
                        >
                          {statusLabels[request.status] || request.status}
                        </Badge>
                      </TableCell>
                      {canApprove && (
                        <TableCell className="text-right">
                          {request.status === "pending" && (
                            <div className="flex gap-2 justify-end">
                              <ApproveButton requestId={request.id} />
                              <RejectButton requestId={request.id} />
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateLeaveRequestDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  );
}

function CreateLeaveRequestDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();

  const createSchema = insertLeaveRequestSchema.pick({
    leaveType: true,
    startDate: true,
    endDate: true,
    reason: true,
  }).extend({
    startDate: z.string().min(1, "Başlangıç tarihi zorunludur"),
    endDate: z.string().min(1, "Bitiş tarihi zorunludur"),
  });

  const form = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      leaveType: "annual",
      startDate: "",
      endDate: "",
      reason: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createSchema>) => {
      return apiRequest("POST", "/api/leave-requests", data);
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "İzin talebiniz oluşturuldu",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any, variables: any) => {
      offlineErrorHandler(error, { url: "/api/leave-requests", method: "POST", body: variables }, "İzin talebi oluşturma", toast) ||
        toast({
          title: "Hata",
          description: error.message || "İzin talebi oluşturulamadı",
          variant: "destructive",
        });
    },
  });

  const onSubmit = (data: z.infer<typeof createSchema>) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yeni İzin Talebi</DialogTitle>
          <DialogDescription>İzin talebi bilgilerini girin</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-2 sm:space-y-3">
            <FormField
              control={form.control}
              name="leaveType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>İzin Türü</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-leave-type">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="annual">Yıllık İzin</SelectItem>
                      <SelectItem value="sick">Hastalık İzni</SelectItem>
                      <SelectItem value="personal">Kişisel İzin</SelectItem>
                      <SelectItem value="unpaid">Ücretsiz İzin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
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
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bitiş Tarihi</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-end-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sebep (Opsiyonel)</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ""} rows={3} data-testid="textarea-reason" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="w-full sm:w-auto" data-testid="button-submit-leave">
                {createMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ApproveButton({ requestId }: { requestId: number }) {
  const { toast } = useToast();

  const approveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/leave-requests/${requestId}/status`, { status: "approved" });
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "İzin talebi onaylandı",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
    },
    onError: (error: Error) => {
      offlineErrorHandler(
        error,
        {
          url: `/api/leave-requests/${requestId}/status`,
          method: "PATCH",
          body: { status: "approved" },
        },
        "Izin talebi onaylama",
        toast
      );
    },
  });

  return (
    <Button
      size="sm"
      variant="default"
      onClick={() => approveMutation.mutate()}
      disabled={approveMutation.isPending}
      data-testid={`button-approve-${requestId}`}
    >
      <Check className="h-4 w-4" />
    </Button>
  );
}

function RejectButton({ requestId }: { requestId: number }) {
  const { toast } = useToast();

  const rejectMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/leave-requests/${requestId}/status`, { status: "rejected" });
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "İzin talebi reddedildi",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
    },
    onError: (error: Error) => {
      offlineErrorHandler(
        error,
        {
          url: `/api/leave-requests/${requestId}/status`,
          method: "PATCH",
          body: { status: "rejected" },
        },
        "Izin talebi reddetme",
        toast
      );
    },
  });

  return (
    <Button
      size="sm"
      variant="destructive"
      onClick={() => rejectMutation.mutate()}
      disabled={rejectMutation.isPending}
      data-testid={`button-reject-${requestId}`}
    >
      <X className="h-4 w-4" />
    </Button>
  );
}
