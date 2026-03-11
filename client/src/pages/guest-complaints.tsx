import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ErrorState } from "@/components/error-state";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Timer,
  UserPlus,
  Eye,
  Building2,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface GuestComplaint {
  id: number;
  type: "misafir";
  branchId: number;
  branchName: string;
  status: string;
  priority: string;
  title: string;
  description: string | null;
  category: string | null;
  customerName: string | null;
  slaBreached: boolean;
  responseDeadline: string | null;
  assignedToId: number | null;
  createdAt: string;
  resolvedAt: string | null;
}

interface ComplaintDetail extends GuestComplaint {
  assignedUser?: { id: number; firstName: string; lastName: string } | null;
  resolutionNotes?: string | null;
  resolution?: string | null;
}

interface Branch {
  id: number;
  name: string;
}

interface UserItem {
  id: number;
  firstName: string;
  lastName: string;
}

export default function GuestComplaints() {
  const { toast } = useToast();
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedComplaint, setSelectedComplaint] = useState<GuestComplaint | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");

  const queryParams = new URLSearchParams();
  queryParams.set("type", "misafir");
  if (branchFilter !== "all") queryParams.set("branchId", branchFilter);
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  if (priorityFilter !== "all") queryParams.set("priority", priorityFilter);

  const queryString = queryParams.toString();
  const complaintsUrl = `/api/crm/complaints?${queryString}`;

  const { data: rawComplaints, isLoading, isError, refetch } = useQuery<GuestComplaint[]>({
    queryKey: ["/api/crm/complaints", "misafir", branchFilter, statusFilter, priorityFilter],
    queryFn: async () => {
      const res = await fetch(complaintsUrl, { credentials: "include" });
      if (!res.ok) throw new Error("Şikayetler yüklenemedi");
      return res.json();
    },
  });

  const complaints = useMemo(() => {
    const arr = Array.isArray(rawComplaints) ? rawComplaints : (rawComplaints as any)?.data || [];
    return arr.filter((c: GuestComplaint) => c.type === "misafir");
  }, [rawComplaints]);

  const { data: branches } = useQuery<Branch[]>({ queryKey: ["/api/crm/branches"] });

  const { data: detail, isLoading: detailLoading } = useQuery<ComplaintDetail>({
    queryKey: ["/api/crm/complaints", "misafir", selectedComplaint?.id],
    enabled: !!selectedComplaint && detailOpen,
    queryFn: async () => {
      const res = await fetch(`/api/crm/complaints/misafir/${selectedComplaint!.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Detay yüklenemedi");
      return res.json();
    },
  });

  const { data: usersList } = useQuery<UserItem[]>({
    queryKey: ["/api/users"],
    enabled: assignOpen,
  });

  const assignMutation = useMutation({
    mutationFn: async ({ id, assignedToId }: { id: number; assignedToId: number }) => {
      await apiRequest("PATCH", `/api/crm/complaints/misafir/${id}/assign`, { assignedToId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/complaints"] });
      toast({ title: "Başarılı", description: "Şikayet atandı" });
      setAssignOpen(false);
      setAssignUserId("");
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, resolutionNotes }: { id: number; resolutionNotes: string }) => {
      await apiRequest("PATCH", `/api/crm/complaints/misafir/${id}/resolve`, { resolutionNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/complaints"] });
      toast({ title: "Başarılı", description: "Şikayet çözümlendi" });
      setResolveOpen(false);
      setResolutionNotes("");
      setDetailOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "critical":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Kritik</Badge>;
      case "high":
        return <Badge className="bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300"><AlertTriangle className="w-3 h-3 mr-1" />Yüksek</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-300">Orta</Badge>;
      default:
        return <Badge className="bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-300">Düşük</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return <Badge className="bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-300"><CheckCircle2 className="w-3 h-3 mr-1" />Çözüldü</Badge>;
      case "in_progress":
      case "investigating":
        return <Badge className="bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300"><Timer className="w-3 h-3 mr-1" />İşlemde</Badge>;
      case "assigned":
        return <Badge className="bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300">Atandı</Badge>;
      case "closed":
        return <Badge variant="secondary">Kapalı</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Yeni</Badge>;
    }
  };

  const getSLAIndicator = (complaint: GuestComplaint) => {
    if (complaint.slaBreached) {
      return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />SLA</Badge>;
    }
    if (complaint.responseDeadline) {
      const hoursRemaining = (new Date(complaint.responseDeadline).getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursRemaining < 0) return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Süre Doldu</Badge>;
      if (hoursRemaining < 4) return <Badge className="bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-300">{Math.round(hoursRemaining)}s kaldı</Badge>;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="p-3 flex flex-col gap-3">
        <Skeleton className="h-8 w-64" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-40" />
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (isError) return <ErrorState onRetry={() => refetch()} />;

  const openCount = complaints.filter((c: GuestComplaint) => !["resolved", "closed"].includes(c.status)).length;

  return (
    <ScrollArea className="h-full">
      <div className="p-3 flex flex-col gap-3 sm:gap-4" data-testid="page-guest-complaints">
        <div>
          <h2 className="text-lg font-bold" data-testid="heading-guest-complaints">Misafir Şikayetleri</h2>
          <p className="text-sm text-muted-foreground">
            Düşük puanlı geri bildirimlerden otomatik oluşturulan şikayetler ({openCount} açık)
          </p>
        </div>

        <div className="flex flex-wrap gap-2" data-testid="guest-complaints-filters">
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-44" data-testid="select-guest-branch">
              <SelectValue placeholder="Şube Seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Şubeler</SelectItem>
              {(branches || []).map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36" data-testid="select-guest-status">
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Durumlar</SelectItem>
              <SelectItem value="new">Yeni</SelectItem>
              <SelectItem value="assigned">Atandı</SelectItem>
              <SelectItem value="in_progress">İşlemde</SelectItem>
              <SelectItem value="resolved">Çözüldü</SelectItem>
              <SelectItem value="closed">Kapalı</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-36" data-testid="select-guest-priority">
              <SelectValue placeholder="Öncelik" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Öncelikler</SelectItem>
              <SelectItem value="critical">Kritik</SelectItem>
              <SelectItem value="high">Yüksek</SelectItem>
              <SelectItem value="medium">Orta</SelectItem>
              <SelectItem value="low">Düşük</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {complaints.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Misafir şikayeti bulunamadı</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {complaints.map((complaint: GuestComplaint) => (
              <Card
                key={complaint.id}
                className="hover-elevate cursor-pointer"
                onClick={() => { setSelectedComplaint(complaint); setDetailOpen(true); }}
                data-testid={`card-guest-complaint-${complaint.id}`}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          <Building2 className="w-3 h-3 mr-1" />
                          {complaint.branchName}
                        </Badge>
                        {getStatusBadge(complaint.status)}
                        {getPriorityBadge(complaint.priority)}
                        {getSLAIndicator(complaint)}
                      </div>
                      <p className="font-medium text-sm truncate">{complaint.title}</p>
                      {complaint.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{complaint.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{format(new Date(complaint.createdAt), "dd MMM yyyy HH:mm", { locale: tr })}</span>
                        {complaint.customerName && <span>{complaint.customerName}</span>}
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" data-testid={`button-view-complaint-${complaint.id}`}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle data-testid="dialog-complaint-title">Şikayet Detayı</DialogTitle>
            <DialogDescription>Misafir şikayeti bilgileri</DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : detail ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {getStatusBadge(detail.status)}
                {getPriorityBadge(detail.priority)}
              </div>
              <div>
                <p className="font-medium">{detail.title}</p>
                {detail.description && <p className="text-sm text-muted-foreground mt-1">{detail.description}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Şube:</span> {detail.branchName}
                </div>
                <div>
                  <span className="text-muted-foreground">Tarih:</span>{" "}
                  {format(new Date(detail.createdAt), "dd MMM yyyy", { locale: tr })}
                </div>
                {detail.customerName && (
                  <div>
                    <span className="text-muted-foreground">Misafir:</span> {detail.customerName}
                  </div>
                )}
                {detail.assignedUser && (
                  <div>
                    <span className="text-muted-foreground">Atanan:</span>{" "}
                    {detail.assignedUser.firstName} {detail.assignedUser.lastName}
                  </div>
                )}
              </div>
              {detail.resolutionNotes && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Çözüm Notu</p>
                  <p className="text-sm">{detail.resolutionNotes}</p>
                </div>
              )}
            </div>
          ) : null}
          <DialogFooter className="gap-2">
            {detail && !["resolved", "closed"].includes(detail.status) && (
              <>
                <Button
                  variant="outline"
                  onClick={() => { setAssignUserId(""); setAssignOpen(true); }}
                  data-testid="button-assign-complaint"
                >
                  <UserPlus className="w-4 h-4 mr-1" /> Ata
                </Button>
                <Button
                  onClick={() => { setResolutionNotes(""); setResolveOpen(true); }}
                  data-testid="button-resolve-complaint"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Çöz
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Şikayeti Ata</DialogTitle>
            <DialogDescription>Bir personel seçin</DialogDescription>
          </DialogHeader>
          <Select value={assignUserId} onValueChange={setAssignUserId}>
            <SelectTrigger data-testid="select-assign-user">
              <SelectValue placeholder="Personel seçin" />
            </SelectTrigger>
            <SelectContent>
              {(usersList || []).map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.firstName} {u.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              onClick={() => {
                if (selectedComplaint && assignUserId) {
                  assignMutation.mutate({ id: selectedComplaint.id, assignedToId: Number(assignUserId) });
                }
              }}
              disabled={!assignUserId || assignMutation.isPending}
              data-testid="button-confirm-assign"
            >
              Ata
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Şikayeti Çöz</DialogTitle>
            <DialogDescription>Çözüm notunu girin</DialogDescription>
          </DialogHeader>
          <Textarea
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            placeholder="Çözüm detayları..."
            data-testid="textarea-resolution"
          />
          <DialogFooter>
            <Button
              onClick={() => {
                if (selectedComplaint && resolutionNotes.trim()) {
                  resolveMutation.mutate({ id: selectedComplaint.id, resolutionNotes });
                }
              }}
              disabled={!resolutionNotes.trim() || resolveMutation.isPending}
              data-testid="button-confirm-resolve"
            >
              Çözümle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
}
