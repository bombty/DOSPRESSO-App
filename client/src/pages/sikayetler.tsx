import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle2, Clock, AlertTriangle, MessageSquare, Timer } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface GuestComplaint {
  id: number;
  branchId: number;
  priority: "critical" | "high" | "medium" | "low";
  status: "open" | "assigned" | "in_progress" | "resolved" | "closed";
  customerName: string | null;
  customerEmail: string | null;
  rating: number;
  comment: string | null;
  complaintDate: string;
  responseDeadline: string | null;
  slaBreached: boolean;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  assignedTo: string | null;
}

interface ComplaintStats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  slaBreachCount: number;
  avgResolutionTimeHours: number;
}

export default function Sikayetler() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [resolvingComplaint, setResolvingComplaint] = useState<GuestComplaint | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [customerSatisfaction, setCustomerSatisfaction] = useState<number | undefined>();
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: complaints, isLoading: complaintsLoading } = useQuery<GuestComplaint[]>({
    queryKey: ["/api/guest-complaints"],
  });

  const { data: stats } = useQuery<ComplaintStats>({
    queryKey: ["/api/guest-complaints/stats", user?.branchId],
    enabled: !!user?.branchId,
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ 
      id, 
      resolutionNotes, 
      customerSatisfaction 
    }: { 
      id: number; 
      resolutionNotes: string; 
      customerSatisfaction?: number;
    }) => {
      await apiRequest("POST", `/api/guest-complaints/${id}/resolve`, { 
        resolutionNotes,
        customerSatisfaction 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guest-complaints"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guest-complaints/stats"] });
      toast({ title: "Başarılı", description: "Şikayet çözüldü olarak işaretlendi" });
      setResolvingComplaint(null);
      setResolutionNotes("");
      setCustomerSatisfaction(undefined);
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Şikayet çözümlenirken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const getPriorityBadge = (priority: string, complaintId?: number) => {
    const testId = complaintId ? `badge-priority-${complaintId}` : "badge-priority";
    switch (priority) {
      case "critical":
        return <Badge variant="destructive" data-testid={testId}><AlertCircle className="w-3 h-3 mr-1" />Kritik</Badge>;
      case "high":
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100" data-testid={testId}><AlertTriangle className="w-3 h-3 mr-1" />Yüksek</Badge>;
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100" data-testid={testId}>Orta</Badge>;
      default:
        return <Badge variant="outline" data-testid={testId}>Düşük</Badge>;
    }
  };

  const getStatusBadge = (status: string, complaintId?: number) => {
    const testId = complaintId ? `badge-status-${complaintId}` : "badge-status";
    switch (status) {
      case "resolved":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" data-testid={testId}><CheckCircle2 className="w-3 h-3 mr-1" />Çözüldü</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" data-testid={testId}><Timer className="w-3 h-3 mr-1" />İşlemde</Badge>;
      case "assigned":
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100" data-testid={testId}><MessageSquare className="w-3 h-3 mr-1" />Atandı</Badge>;
      case "closed":
        return <Badge variant="secondary" data-testid={testId}>Kapalı</Badge>;
      default:
        return <Badge variant="outline" data-testid={testId}><Clock className="w-3 h-3 mr-1" />Açık</Badge>;
    }
  };

  const getSLABadge = (complaint: GuestComplaint) => {
    if (!complaint.responseDeadline) return null;
    
    const now = new Date();
    const deadline = new Date(complaint.responseDeadline);
    const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (complaint.slaBreached) {
      return (
        <Badge variant="destructive" data-testid={`badge-sla-${complaint.id}`}>
          <AlertCircle className="w-3 h-3 mr-1" />
          SLA İhlali
        </Badge>
      );
    }
    
    if (hoursRemaining < 4) {
      return (
        <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100" data-testid={`badge-sla-${complaint.id}`}>
          <AlertTriangle className="w-3 h-3 mr-1" />
          Süre Azalıyor ({Math.max(0, Math.round(hoursRemaining))}s)
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" data-testid={`badge-sla-${complaint.id}`}>
        <Clock className="w-3 h-3 mr-1" />
        {Math.round(hoursRemaining)} saat kaldı
      </Badge>
    );
  };

  const renderStars = (rating: number, size: "sm" | "md" = "sm") => {
    const starSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`${starSize} ${
              star <= rating
                ? "text-yellow-400"
                : "text-gray-200 dark:text-gray-700"
            }`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const filteredComplaints = complaints?.filter(complaint => {
    const priorityMatch = filterPriority === "all" || complaint.priority === filterPriority;
    const statusMatch = filterStatus === "all" || complaint.status === filterStatus;
    return priorityMatch && statusMatch;
  });

  if (complaintsLoading) {
    return (
      <div className="p-6 grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
      <div>
        <h1 className="text-3xl font-bold" data-testid="heading-sikayetler">Misafir Şikayetleri</h1>
        <p className="text-muted-foreground mt-1">SLA takipli şikayet yönetim sistemi</p>
      </div>

      {stats && (
        <div className="grid gap-2 sm:gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Toplam Şikayet</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-complaints">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">SLA İhlali</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive" data-testid="text-sla-breaches">
                {stats.slaBreachCount}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Kritik/Yüksek Öncelik</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600" data-testid="text-high-priority">
                {(stats.byPriority?.critical || 0) + (stats.byPriority?.high || 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Ort. Çözüm Süresi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-avg-resolution">
                {stats.avgResolutionTimeHours > 0 
                  ? `${Math.round(stats.avgResolutionTimeHours)}s`
                  : "—"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex gap-2 sm:gap-3">
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-48" data-testid="select-priority-filter">
            <SelectValue placeholder="Öncelik Filtrele" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Öncelikler</SelectItem>
            <SelectItem value="critical">Kritik</SelectItem>
            <SelectItem value="high">Yüksek</SelectItem>
            <SelectItem value="medium">Orta</SelectItem>
            <SelectItem value="low">Düşük</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48" data-testid="select-status-filter">
            <SelectValue placeholder="Durum Filtrele" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            <SelectItem value="open">Açık</SelectItem>
            <SelectItem value="assigned">Atandı</SelectItem>
            <SelectItem value="in_progress">İşlemde</SelectItem>
            <SelectItem value="resolved">Çözüldü</SelectItem>
            <SelectItem value="closed">Kapalı</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2 sm:gap-3">
        {filteredComplaints && filteredComplaints.length > 0 ? (
          filteredComplaints.map((complaint) => (
            <Card key={complaint.id} data-testid={`card-complaint-${complaint.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                    <CardTitle className="text-lg">
                      {complaint.customerName || "Anonim Misafir"}
                    </CardTitle>
                    <CardDescription>
                      {format(new Date(complaint.complaintDate), "d MMMM yyyy HH:mm", { locale: tr })}
                      {complaint.customerEmail && ` • ${complaint.customerEmail}`}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {getPriorityBadge(complaint.priority, complaint.id)}
                    {getStatusBadge(complaint.status, complaint.id)}
                    {getSLABadge(complaint)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium">Misafir Memnuniyeti:</span>
                    {renderStars(complaint.rating)}
                  </div>
                  {complaint.comment && (
                    <p className="text-sm text-muted-foreground" data-testid={`text-comment-${complaint.id}`}>
                      {complaint.comment}
                    </p>
                  )}
                </div>

                {complaint.responseDeadline && (
                  <div className="text-sm">
                    <span className="font-medium">Yanıt Tarihi: </span>
                    <span className={complaint.slaBreached ? "text-destructive font-semibold" : ""}>
                      {format(new Date(complaint.responseDeadline), "d MMMM yyyy HH:mm", { locale: tr })}
                    </span>
                  </div>
                )}

                {complaint.resolvedAt && complaint.resolutionNotes && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm font-medium mb-1">Çözüm Notları:</div>
                    <p className="text-sm">{complaint.resolutionNotes}</p>
                    <div className="text-xs text-muted-foreground mt-2">
                      Çözüldü: {format(new Date(complaint.resolvedAt), "d MMMM yyyy HH:mm", { locale: tr })}
                    </div>
                  </div>
                )}

                {complaint.status !== "resolved" && complaint.status !== "closed" && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={() => {
                          setResolvingComplaint(complaint);
                          setResolutionNotes("");
                          setCustomerSatisfaction(undefined);
                        }}
                        data-testid={`button-resolve-${complaint.id}`}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Şikayeti Çöz
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Şikayeti Çöz</DialogTitle>
                        <DialogDescription>
                          Şikayetin nasıl çözüldüğünü açıklayın
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-1 gap-2 sm:gap-3 py-3">
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Çözüm Notları
                          </label>
                          <Textarea
                            value={resolutionNotes}
                            onChange={(e) => setResolutionNotes(e.target.value)}
                            placeholder="Şikayetin nasıl çözüldüğünü açıklayın..."
                            rows={4}
                            data-testid="textarea-resolution-notes"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Misafir Memnuniyeti (Opsiyonel)
                          </label>
                          <Select 
                            value={customerSatisfaction?.toString()} 
                            onValueChange={(val) => setCustomerSatisfaction(parseInt(val))}
                          >
                            <SelectTrigger data-testid="select-satisfaction">
                              <SelectValue placeholder="Memnuniyet seviyesi seçin" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">⭐⭐⭐⭐⭐ Çok Memnun</SelectItem>
                              <SelectItem value="4">⭐⭐⭐⭐ Memnun</SelectItem>
                              <SelectItem value="3">⭐⭐⭐ Orta</SelectItem>
                              <SelectItem value="2">⭐⭐ Az Memnun</SelectItem>
                              <SelectItem value="1">⭐ Memnun Değil</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={() => {
                            if (!resolvingComplaint) return;
                            if (!resolutionNotes.trim()) {
                              toast({
                                title: "Hata",
                                description: "Lütfen çözüm notları girin",
                                variant: "destructive",
                              });
                              return;
                            }
                            resolveMutation.mutate({
                              id: resolvingComplaint.id,
                              resolutionNotes: resolutionNotes.trim(),
                              customerSatisfaction,
                            });
                          }}
                          disabled={resolveMutation.isPending}
                          data-testid="button-submit-resolve"
                        >
                          {resolveMutation.isPending ? "Kaydediliyor..." : "Çözüldü Olarak İşaretle"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Henüz şikayet bulunmamaktadır
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
