import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import { 
  ArrowLeft, Clock, User, Building2, Calendar, FileText,
  CheckCircle2, AlertTriangle, XCircle, Loader2, Camera,
  MessageSquare, PlusCircle, History, Shield, Send, AlertCircle
} from "lucide-react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { tr } from "date-fns/locale";

type CorrectiveActionUpdate = {
  id: number;
  correctiveActionId: number;
  oldStatus: string | null;
  newStatus: string;
  notes: string | null;
  evidence: { photos?: string[] } | null;
  updatedById: string;
  updatedBy?: { id: string; firstName: string; lastName: string };
  createdAt: string;
};

type CorrectiveAction = {
  id: number;
  auditInstanceId: number;
  auditItemId: number;
  priority: "low" | "medium" | "high" | "critical";
  status: "OPEN" | "IN_PROGRESS" | "PENDING_REVIEW" | "CLOSED" | "ESCALATED";
  actionType: string;
  description: string;
  actionSlaHours: number;
  dueDate: string;
  completedDate: string | null;
  closedDate: string | null;
  assignedToId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: { id: string; firstName: string; lastName: string };
  createdBy?: { id: string; firstName: string; lastName: string };
  auditInstance?: { 
    id: number; 
    auditDate: string;
    template?: { id: number; title: string };
    branch?: { id: number; name: string };
  };
  auditItem?: { id: number; itemText: string };
  updates?: CorrectiveActionUpdate[];
};

const STATUS_WORKFLOW: Record<string, string[]> = {
  OPEN: ["IN_PROGRESS", "ESCALATED"],
  IN_PROGRESS: ["PENDING_REVIEW", "ESCALATED"],
  PENDING_REVIEW: ["CLOSED", "IN_PROGRESS"],
  CLOSED: [],
  ESCALATED: ["IN_PROGRESS", "CLOSED"],
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Açık",
  IN_PROGRESS: "İşlemde",
  PENDING_REVIEW: "HQ İncelemesinde",
  CLOSED: "Kapatıldı",
  ESCALATED: "Eskalasyon",
};

const STATUS_COLORS: Record<string, { badge: string; icon: typeof AlertTriangle }> = {
  OPEN: { badge: "bg-blue-500 text-white", icon: AlertCircle },
  IN_PROGRESS: { badge: "bg-yellow-500 text-foreground", icon: Clock },
  PENDING_REVIEW: { badge: "bg-purple-500 text-white", icon: Shield },
  CLOSED: { badge: "bg-green-500 text-white", icon: CheckCircle2 },
  ESCALATED: { badge: "bg-red-500 text-white", icon: AlertTriangle },
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Düşük",
  medium: "Orta",
  high: "Yüksek",
  critical: "Kritik",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-500 text-white dark:bg-gray-600",
  medium: "bg-yellow-500 text-foreground",
  high: "bg-orange-500 text-white",
  critical: "bg-red-600 text-white",
};

export default function CapaDetayPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const capaId = parseInt(id || "0");
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [updateNotes, setUpdateNotes] = useState("");
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);

  // Check if user is HQ role (can approve/close)
  const isHQRole = user?.role === "hq_operations" || user?.role === "hq_quality" || 
                   user?.role === "hq_training" || user?.role === "hq_finance" ||
                   user?.role === "hq_admin" || user?.role === "admin";

  // Fetch CAPA details with updates
  const { data: capa, isLoading, error, isError, refetch } = useQuery<CorrectiveAction>({
    queryKey: ['/api/corrective-actions', capaId],
    queryFn: () => fetch(`/api/corrective-actions/${capaId}`, { credentials: 'include' }).then(res => {
      if (!res.ok) throw new Error('CAPA yüklenemedi');
      return res.json();
    }),
    enabled: !!capaId,
  });

  // Update CAPA status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (data: { status: string; notes?: string }) => {
      return await apiRequest('PUT', `/api/corrective-actions/${capaId}`, data);
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "CAPA durumu güncellendi" });
      queryClient.invalidateQueries({ queryKey: ['/api/corrective-actions', capaId] });
      setUpdateDialogOpen(false);
      setNewStatus("");
      setUpdateNotes("");
    },
    onError: (error) => {
      toast({ 
        title: "Hata", 
        description: error.message || "Durum güncellenemedi",
        variant: "destructive"
      });
    },
  });

  // Add update mutation
  const addUpdateMutation = useMutation({
    mutationFn: async (data: { newStatus: string; notes: string; evidence?: { photos: string[] } }) => {
      return await apiRequest('POST', `/api/corrective-actions/${capaId}/updates`, data);
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Güncelleme eklendi" });
      queryClient.invalidateQueries({ queryKey: ['/api/corrective-actions', capaId] });
      setUpdateDialogOpen(false);
      setNewStatus("");
      setUpdateNotes("");
      setUploadedPhotos([]);
    },
    onError: (error) => {
      toast({ 
        title: "Hata", 
        description: error.message || "Güncelleme eklenemedi",
        variant: "destructive"
      });
    },
  });

  const handleStatusUpdate = () => {
    if (!newStatus) return;
    
    // Use add update mutation with status change (backend handles status update atomically)
    addUpdateMutation.mutate({
      newStatus,
      notes: updateNotes,
      evidence: uploadedPhotos.length > 0 ? { photos: uploadedPhotos } : undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold">Bir hata oluştu</h3>
        <p className="text-muted-foreground mt-2">Veriler yüklenirken sorun oluştu.</p>
        <Button onClick={() => refetch()} className="mt-4" data-testid="button-retry">Tekrar Dene</Button>
      </div>
    );
  }

  if (error || !capa) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full gap-4">
        <XCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">CAPA bulunamadı</p>
        <Link href="/kalite-denetimi">
          <Button>Kalite Denetimine Dön</Button>
        </Link>
      </div>
    );
  }

  const statusInfo = STATUS_COLORS[capa.status] || STATUS_COLORS.OPEN;
  const StatusIcon = statusInfo.icon;
  const isOverdue = capa.dueDate && isPast(new Date(capa.dueDate)) && capa.status !== "CLOSED";
  const availableTransitions = STATUS_WORKFLOW[capa.status] || [];
  
  // Filter transitions based on role
  const allowedTransitions = availableTransitions.filter(status => {
    // Only HQ can close from any state
    if (status === "CLOSED" && !isHQRole) {
      return false;
    }
    return true;
  });

  const canModify = capa.status !== "CLOSED" && (
    isHQRole || 
    capa.assignedToId === user?.id ||
    capa.createdById === user?.id
  );

  return (
    <div className="p-3 sm:p-4 flex flex-col gap-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/kalite-denetimi">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">CAPA #{capa.id}</h1>
          <p className="text-sm text-muted-foreground truncate">{capa.actionType}</p>
        </div>
        <Badge className={statusInfo.badge} data-testid="badge-status">
          <StatusIcon className="h-3 w-3 mr-1" />
          {STATUS_LABELS[capa.status]}
        </Badge>
      </div>

      {/* Overdue Warning */}
      {isOverdue && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="font-medium text-destructive">Süre Aşımı!</p>
              <p className="text-sm text-muted-foreground">
                Bu aksiyon {formatDistanceToNow(new Date(capa.dueDate), { addSuffix: true, locale: tr })} teslim edilmeliydi.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Info Card */}
      <Card data-testid="card-capa-details">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Aksiyon Detayları
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Description */}
          <div>
            <Label className="text-muted-foreground text-xs">Açıklama</Label>
            <p className="mt-1 whitespace-pre-wrap" data-testid="text-description">{capa.description}</p>
          </div>

          <Separator />

          {/* Grid Info */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-muted-foreground text-xs flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Öncelik
              </Label>
              <Badge className={PRIORITY_COLORS[capa.priority]} data-testid="badge-priority">
                {PRIORITY_LABELS[capa.priority]}
              </Badge>
            </div>

            <div>
              <Label className="text-muted-foreground text-xs flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                Şube
              </Label>
              <p className="font-medium text-sm" data-testid="text-branch">
                {capa.auditInstance?.branch?.name || 'N/A'}
              </p>
            </div>

            <div>
              <Label className="text-muted-foreground text-xs flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Son Tarih
              </Label>
              <p className={`font-medium text-sm ${isOverdue ? 'text-destructive' : ''}`} data-testid="text-due-date">
                {format(new Date(capa.dueDate), "d MMM yyyy", { locale: tr })}
              </p>
            </div>

            <div>
              <Label className="text-muted-foreground text-xs flex items-center gap-1">
                <User className="h-3 w-3" />
                Atanan Kişi
              </Label>
              <p className="font-medium text-sm" data-testid="text-assigned">
                {capa.assignedTo ? `${capa.assignedTo.firstName} ${capa.assignedTo.lastName}` : 'Atanmadı'}
              </p>
            </div>

            <div>
              <Label className="text-muted-foreground text-xs flex items-center gap-1">
                <Clock className="h-3 w-3" />
                SLA
              </Label>
              <p className="font-medium text-sm">
                {capa.actionSlaHours} saat
              </p>
            </div>

            <div>
              <Label className="text-muted-foreground text-xs flex items-center gap-1">
                <User className="h-3 w-3" />
                Oluşturan
              </Label>
              <p className="font-medium text-sm">
                {capa.createdBy ? `${capa.createdBy.firstName} ${capa.createdBy.lastName}` : capa.createdById}
              </p>
            </div>
          </div>

          {/* Related Audit */}
          {capa.auditInstance && (
            <>
              <Separator />
              <div>
                <Label className="text-muted-foreground text-xs">İlgili Denetim</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Link href={`/denetim/${capa.auditInstanceId}`}>
                    <Button variant="outline" size="sm" data-testid="button-view-audit">
                      {capa.auditInstance.template?.title || `Denetim #${capa.auditInstanceId}`}
                    </Button>
                  </Link>
                  <span className="text-sm text-muted-foreground">
                    ({format(new Date(capa.auditInstance.auditDate), "d MMM yyyy", { locale: tr })})
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Related Audit Item */}
          {capa.auditItem && (
            <div>
              <Label className="text-muted-foreground text-xs">İlgili Denetim Maddesi</Label>
              <p className="mt-1 text-sm bg-muted p-2 rounded-md">{capa.auditItem.itemText}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {canModify && allowedTransitions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Durum Güncelle</CardTitle>
            <CardDescription>Bu aksiyonun durumunu değiştirin</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {allowedTransitions.map((status) => (
              <Dialog key={status} open={updateDialogOpen && newStatus === status} onOpenChange={(open) => {
                setUpdateDialogOpen(open);
                if (open) setNewStatus(status);
                else {
                  setNewStatus("");
                  setUpdateNotes("");
                  setUploadedPhotos([]);
                }
              }}>
                <DialogTrigger asChild>
                  <Button 
                    variant={status === "CLOSED" ? "default" : status === "ESCALATED" ? "destructive" : "outline"}
                    data-testid={`button-status-${status.toLowerCase()}`}
                  >
                    {STATUS_LABELS[status]}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Durumu "{STATUS_LABELS[status]}" olarak güncelle</DialogTitle>
                    <DialogDescription>
                      {status === "PENDING_REVIEW" && "Bu aksiyon HQ onayına gönderilecek."}
                      {status === "CLOSED" && "Bu aksiyonu kapatmak üzeresiniz."}
                      {status === "ESCALATED" && "Bu aksiyon eskalasyon olarak işaretlenecek."}
                      {status === "IN_PROGRESS" && "Bu aksiyon üzerinde çalışmaya başlayacaksınız."}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="update-notes">Notlar</Label>
                      <Textarea
                        id="update-notes"
                        value={updateNotes}
                        onChange={(e) => setUpdateNotes(e.target.value)}
                        placeholder="Güncelleme hakkında notlar..."
                        className="mt-1"
                        data-testid="textarea-update-notes"
                      />
                    </div>

                    <div>
                      <Label>Kanıt Fotoğrafları (Opsiyonel)</Label>
                      <ObjectUploader
                        onGetUploadParameters={async () => {
                          const res = await fetch('/api/objects/upload', { 
                            method: 'POST',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              fileName: `capa-${capaId}-evidence-${Date.now()}.jpg`,
                              contentType: 'image/jpeg',
                              path: '.private/capa'
                            })
                          });
                          const data = await res.json();
                          return { method: "PUT" as const, url: data.url };
                        }}
                        onComplete={(result) => {
                          const uploadURL = result.successful?.[0]?.uploadURL;
                          if (uploadURL) {
                            setUploadedPhotos(prev => [...prev, uploadURL]);
                            toast({ title: "Fotoğraf yüklendi" });
                          }
                        }}
                        buttonClassName="w-full mt-2"
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Fotoğraf Ekle
                      </ObjectUploader>
                      
                      {uploadedPhotos.length > 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {uploadedPhotos.map((photo, i) => (
                            <div key={i} className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Fotoğraf {i + 1}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
                      İptal
                    </Button>
                    <Button 
                      onClick={handleStatusUpdate}
                      disabled={addUpdateMutation.isPending || updateStatusMutation.isPending}
                      data-testid="button-confirm-status-update"
                    >
                      {(addUpdateMutation.isPending || updateStatusMutation.isPending) ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Kaydediliyor...</>
                      ) : (
                        <><Send className="mr-2 h-4 w-4" />Güncelle</>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ))}
          </CardContent>
        </Card>
      )}

      {/* HQ Approval Notice */}
      {capa.status === "PENDING_REVIEW" && !isHQRole && (
        <Card className="border-purple-500 bg-purple-50 dark:bg-purple-950/30">
          <CardContent className="flex items-center gap-3 py-3">
            <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0" />
            <div>
              <p className="font-medium text-purple-700 dark:text-purple-300">HQ Onayı Bekleniyor</p>
              <p className="text-sm text-muted-foreground">
                Bu aksiyon Genel Merkez tarafından incelenmektedir.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline / Updates */}
      <Card data-testid="card-timeline">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Güncelleme Geçmişi
          </CardTitle>
          <CardDescription>Bu aksiyonun zaman çizelgesi</CardDescription>
        </CardHeader>
        <CardContent>
          {capa.updates && capa.updates.length > 0 ? (
            <div className="relative pl-6 space-y-4">
              {/* Timeline line */}
              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" />
              
              {capa.updates.slice().reverse().map((update, i) => (
                <div key={update.id} className="relative" data-testid={`timeline-item-${i}`}>
                  {/* Timeline dot */}
                  <div className={`absolute -left-4 top-1 w-3 h-3 rounded-full border-2 border-background ${
                    update.newStatus === 'CLOSED' ? 'bg-green-500' :
                    update.newStatus === 'ESCALATED' ? 'bg-red-500' :
                    update.newStatus === 'PENDING_REVIEW' ? 'bg-purple-500' :
                    'bg-blue-500'
                  }`} />
                  
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {update.oldStatus && (
                          <Badge variant="outline" className="text-xs">
                            {STATUS_LABELS[update.oldStatus] || update.oldStatus}
                          </Badge>
                        )}
                        {update.oldStatus && <span className="text-xs">→</span>}
                        <Badge className={STATUS_COLORS[update.newStatus]?.badge || 'bg-muted text-muted-foreground'}>
                          {STATUS_LABELS[update.newStatus] || update.newStatus}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(update.createdAt), "d MMM yyyy HH:mm", { locale: tr })}
                      </span>
                    </div>
                    
                    {update.notes && (
                      <p className="text-sm mb-2">{update.notes}</p>
                    )}
                    
                    {update.updatedBy && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {update.updatedBy.firstName} {update.updatedBy.lastName}
                      </p>
                    )}

                    {/* Evidence Photos */}
                    {update.evidence?.photos && update.evidence.photos.length > 0 && (
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {update.evidence.photos.map((photo, pi) => (
                          <a 
                            key={pi} 
                            href={photo} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-primary underline flex items-center gap-1"
                          >
                            <Camera className="h-3 w-3" />
                            Kanıt {pi + 1}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Creation event */}
              <div className="relative" data-testid="timeline-item-created">
                <div className="absolute -left-4 top-1 w-3 h-3 rounded-full border-2 border-background bg-muted-foreground/40" />
                <div className="bg-muted/50 p-3 rounded-lg">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <Badge variant="outline">Oluşturuldu</Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(capa.createdAt), "d MMM yyyy HH:mm", { locale: tr })}
                    </span>
                  </div>
                  {capa.createdBy && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {capa.createdBy.firstName} {capa.createdBy.lastName}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Henüz güncelleme yok</p>
              <p className="text-xs">İlk güncellemeyi eklemek için yukarıdaki butonları kullanın</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Closed Status Info */}
      {capa.status === "CLOSED" && capa.closedDate && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950/30">
          <CardContent className="flex items-center gap-3 py-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
            <div>
              <p className="font-medium text-green-700 dark:text-green-300">Aksiyon Kapatıldı</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(capa.closedDate), "d MMMM yyyy 'saat' HH:mm", { locale: tr })} tarihinde kapatıldı.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
