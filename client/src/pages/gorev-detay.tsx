import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog,
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  User, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  PlayCircle,
  XCircle,
  History,
  AlertTriangle,
  MessageSquare,
  Send,
  Image as ImageIcon,
  Star
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import { StarRating } from "@/components/star-rating";
import type { Task, User as UserType, TaskStatusHistory, TaskRating } from "@shared/schema";

interface RatingResponse extends TaskRating {}

export default function GorevDetay() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [failureNote, setFailureNote] = useState("");
  const [showFailureDialog, setShowFailureDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState("");
  const [showRatingDialog, setShowRatingDialog] = useState(false);

  const { data: task, isLoading } = useQuery<Task>({
    queryKey: ["/api/tasks", id],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${id}`);
      if (!response.ok) throw new Error("Failed to fetch task");
      return response.json();
    },
    enabled: !!id,
  });

  const { data: assignedUser } = useQuery<UserType>({
    queryKey: ["/api/users", task?.assignedToId],
    queryFn: async () => {
      const response = await fetch(`/api/users/${task!.assignedToId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!task?.assignedToId,
  });

  const { data: assignedByUser } = useQuery<UserType>({
    queryKey: ["/api/users", task?.assignedById],
    queryFn: async () => {
      const response = await fetch(`/api/users/${task!.assignedById}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!task?.assignedById,
  });


  const { data: taskHistory } = useQuery<TaskStatusHistory[]>({
    queryKey: ["/api/tasks", id, "history"],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${id}/history`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!id,
  });

  const { data: ratingData } = useQuery<RatingResponse | undefined>({
    queryKey: ["/api/tasks", id, "rating"],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${id}/rating`);
      if (!response.ok) return undefined;
      return response.json();
    },
    enabled: !!id,
  });

  const ratingMutation = useMutation({
    mutationFn: async ({ rating, feedback }: { rating: number; feedback?: string }) => {
      return apiRequest("POST", `/api/tasks/${id}/rating`, { rating, feedback });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "rating"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      setShowRatingDialog(false);
      setRatingValue(0);
      setRatingFeedback("");
      toast({ title: "Başarılı", description: "Görev puanlandı" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Puanlama başarısız", variant: "destructive" });
    },
  });

  const handleSubmitRating = () => {
    if (ratingValue < 1) {
      toast({ title: "Hata", description: "Lütfen bir puan seçin (1-5)", variant: "destructive" });
      return;
    }
    ratingMutation.mutate({ rating: ratingValue, feedback: ratingFeedback || undefined });
  };

  const acknowledgeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/tasks/${id}/acknowledge`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Başarılı", description: "Görev görüldü olarak işaretlendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "İşlem başarısız", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, note }: { status: string; note?: string }) => {
      return apiRequest("POST", `/api/tasks/${id}/status`, { status, note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setShowFailureDialog(false);
      setFailureNote("");
      toast({ title: "Başarılı", description: "Görev durumu güncellendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "İşlem başarısız", variant: "destructive" });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      return apiRequest("POST", `/api/tasks/${id}/note`, { note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "history"] });
      setNewNote("");
      toast({ title: "Başarılı", description: "Not eklendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Not eklenemedi", variant: "destructive" });
    },
  });

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    addNoteMutation.mutate(newNote);
  };

  const handleMarkFailed = () => {
    if (!failureNote.trim()) {
      toast({ title: "Hata", description: "Başarısızlık nedeni girilmelidir", variant: "destructive" });
      return;
    }
    updateStatusMutation.mutate({ status: "basarisiz", note: failureNote });
  };

  // Auto-acknowledge task when opened
  useEffect(() => {
    if (task && currentUser) {
      const isAssignee = currentUser.id === task.assignedToId;
      const canAutoAck = isAssignee && !task.acknowledgedAt && task.status !== "onaylandi" && task.status !== "basarisiz";
      
      if (canAutoAck) {
        acknowledgeMutation.mutate();
      }
    }
  }, [task?.id, currentUser?.id]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 sm:gap-4 p-3">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col gap-3 sm:gap-4 p-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Görev bulunamadı</p>
            <Link href="/gorevler">
              <Button className="mt-4">Geri Dön</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    beklemede: "Bekliyor",
    goruldu: "Görüldü",
    devam_ediyor: "Devam Ediyor",
    foto_bekleniyor: "Fotoğraf Bekleniyor",
    tamamlandi: "Tamamlandı - Onay Bekliyor",
    incelemede: "İncelemede",
    onaylandi: "Onaylandı",
    reddedildi: "Reddedildi",
    basarisiz: "Başarısız",
    "gecikmiş": "Gecikmiş",
  };

  const priorityLabels: Record<string, string> = {
    "düşük": "Düşük",
    orta: "Orta",
    "yüksek": "Yüksek",
  };

  const isAssignee = currentUser?.id === task.assignedToId;
  const isAssigner = currentUser?.id === task.assignedById;
  const isHQ = currentUser?.role && !['barista', 'senior_barista', 'supervisor', 'supervisor_buddy'].includes(currentUser.role);
  
  const canAcknowledge = isAssignee && !task.acknowledgedAt && task.status !== "onaylandi" && task.status !== "basarisiz";
  const canStartProgress = isAssignee && (task.status === "beklemede" || task.status === "goruldu");
  const canMarkFailed = isAssignee && task.status !== "onaylandi" && task.status !== "basarisiz";
  const canComplete = isAssignee && (task.status === "devam_ediyor" || task.status === "beklemede");
  
  // Assigner/HQ can approve or reject completed tasks
  const canApprove = (isAssigner || isHQ) && (task.status === "tamamlandi" || task.status === "incelemede");
  const canReject = (isAssigner || isHQ) && (task.status === "tamamlandi" || task.status === "incelemede");
  const canRate = (isAssigner || isHQ) && task.status === "onaylandi";

  return (
    <div className="flex flex-col gap-3 sm:gap-4 p-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="icon"
            data-testid="button-back"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-task-title">
              {task.description || `Görev #${task.id}`}
            </h1>
            <p className="text-sm text-muted-foreground">ID: {task.id}</p>
          </div>
        </div>
        
        {/* Acknowledgment indicator */}
        {task.acknowledgedAt ? (
          <Badge variant="outline" className="gap-1">
            <Eye className="h-3 w-3" />
            Görüldü
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1">
            Görülmedi
          </Badge>
        )}
      </div>

      {/* Compact Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-2 rounded-lg border bg-card">
          <span className="text-muted-foreground">Durum</span>
          <div className="mt-1">
            <Badge variant={task.status === "onaylandi" ? "default" : task.status === "basarisiz" ? "destructive" : "secondary"} className="text-xs">
              {statusLabels[task.status] || task.status}
            </Badge>
          </div>
        </div>
        <div className="p-2 rounded-lg border bg-card">
          <span className="text-muted-foreground">Atanan</span>
          <p className="font-medium mt-1 truncate">
            {assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : "-"}
          </p>
        </div>
        {task.status === "onaylandi" && task.completedAt ? (
          <>
            <div className="p-2 rounded-lg border bg-card">
              <span className="text-muted-foreground">Tamamlandı</span>
              <p className="font-medium mt-1">
                {new Date(task.completedAt).toLocaleDateString("tr-TR")}
              </p>
            </div>
            <div className="p-2 rounded-lg border bg-card">
              <span className="text-muted-foreground">Atayan</span>
              <p className="font-medium mt-1 truncate">
                {assignedByUser ? `${assignedByUser.firstName} ${assignedByUser.lastName}` : "-"}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="p-2 rounded-lg border bg-card">
              <span className="text-muted-foreground">Son Tarih</span>
              <p className="font-medium mt-1">
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString("tr-TR") : "-"}
              </p>
            </div>
            <div className="p-2 rounded-lg border bg-card">
              <span className="text-muted-foreground">Öncelik</span>
              <div className="mt-1">
                <Badge variant="outline" className="text-xs">
                  {priorityLabels[task.priority || "orta"] || task.priority}
                </Badge>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Preview & Action Section */}
      {isAssignee && task.status !== "onaylandi" && task.status !== "basarisiz" && (
        <>
          {/* Gördüm / Başladım Buttons */}
          {(canAcknowledge || canStartProgress) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <PlayCircle className="h-4 w-4" />
                  Ön İzleme
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {canStartProgress && (
                  <Button
                    variant="outline"
                    onClick={() => updateStatusMutation.mutate({ status: "devam_ediyor" })}
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-start-progress"
                  >
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Başladım
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Note & Photo Section - shows after task is started */}
          {task.status === "devam_ediyor" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Not ve Fotoğraf</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Not Ekle</label>
                  <Textarea
                    placeholder="Görev hakkında bir not yazın..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="resize-none min-h-[60px]"
                    data-testid="input-preview-note"
                  />
                  <Button
                    onClick={handleAddNote}
                    disabled={addNoteMutation.isPending || !newNote.trim()}
                    className="w-full mt-2"
                    size="sm"
                    data-testid="button-add-preview-note"
                  >
                    <Send className="h-3 w-3 mr-2" />
                    {addNoteMutation.isPending ? "Kaydediliyor..." : "Not Ekle"}
                  </Button>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Fotoğraf Yükle</label>
                  <ObjectUploader 
                    maxNumberOfFiles={1}
                    maxFileSize={10485760}
                    onGetUploadParameters={async () => {
                      const response = await fetch("/api/objects/upload", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                      });
                      if (!response.ok) throw new Error("Upload başarısız");
                      return response.json();
                    }}
                    onComplete={() => {
                      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
                      toast({ title: "Başarılı", description: "Fotoğraf yüklendi" });
                    }}
                  >
                    <Button variant="outline" size="sm" type="button" className="w-full">
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Fotoğraf Yükle
                    </Button>
                  </ObjectUploader>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completion Section */}
          {task.status === "devam_ediyor" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Görev Tamamla
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setShowCompleteDialog(true)}
                  disabled={updateStatusMutation.isPending}
                  data-testid="button-complete-task"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Tamamlandı
                </Button>
                
                <Button
                  variant="destructive"
                  onClick={() => setShowFailureDialog(true)}
                  disabled={updateStatusMutation.isPending}
                  data-testid="button-mark-failed"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Tamamlanamadı
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Assigner/HQ Approval Section - Shows when task is completed */}
      {(canApprove || canReject) && (
        <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Onay Bekliyor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Atanan kişi görevi tamamladı. Onaylamanız veya düzeltme için reddetmeniz gerekiyor.
            </p>
            <div className="flex flex-wrap gap-2">
              {canApprove && (
                <Button
                  onClick={() => updateStatusMutation.mutate({ status: "onaylandi", note: "Görev onaylandı" })}
                  disabled={updateStatusMutation.isPending}
                  data-testid="button-approve-task"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Onayla
                </Button>
              )}
              {canReject && (
                <Button
                  variant="destructive"
                  onClick={() => updateStatusMutation.mutate({ status: "reddedildi", note: "Görev reddedildi, düzeltme gerekli" })}
                  disabled={updateStatusMutation.isPending}
                  data-testid="button-reject-task"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reddet
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failure Note Display */}
      {task.failureNote && (
        <Card className="border-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Başarısızlık Nedeni
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{task.failureNote}</p>
          </CardContent>
        </Card>
      )}

      {/* Task Details - Compact 2-column grid */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {/* Durum */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Durum</p>
              <Badge 
                variant={
                  task.status === "onaylandi" ? "outline" : 
                  task.status === "basarisiz" ? "destructive" : 
                  "default"
                }
              >
                {statusLabels[task.status] || task.status}
              </Badge>
            </div>

            {/* Öncelik */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Öncelik</p>
              <Badge variant={task.priority === "yüksek" ? "destructive" : "outline"}>
                {task.priority ? (priorityLabels[task.priority] || task.priority) : "-"}
              </Badge>
            </div>

            {/* Oluşturulma Tarihi */}
            <div>
              <p className="text-xs text-muted-foreground">Oluşturulma</p>
              <p className="font-medium text-sm">
                {task.createdAt ? new Date(task.createdAt).toLocaleDateString("tr-TR") : "-"}
              </p>
            </div>

            {/* Teslim Tarihi */}
            <div>
              <p className="text-xs text-muted-foreground">Teslim</p>
              <p className="font-medium text-sm">
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString("tr-TR") : "-"}
              </p>
            </div>

            {/* Atanan Kişi */}
            <div>
              <p className="text-xs text-muted-foreground">Atanan</p>
              {assignedUser ? (
                <Link href={`/personel-detay/${assignedUser.id}`}>
                  <p className="font-medium text-sm hover:underline cursor-pointer text-primary">
                    {assignedUser.firstName} {assignedUser.lastName}
                  </p>
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">-</p>
              )}
            </div>

            {/* Atayan Kişi */}
            <div>
              <p className="text-xs text-muted-foreground">Atayan</p>
              {assignedByUser ? (
                <Link href={`/personel-detay/${assignedByUser.id}`}>
                  <p className="font-medium text-sm hover:underline cursor-pointer text-primary">
                    {assignedByUser.firstName} {assignedByUser.lastName}
                  </p>
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">-</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status History & Notes - Compact Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Durum Geçmişi & Notlar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {/* Creation */}
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span>Oluşturuldu</span>
            <span className="text-muted-foreground">
              {task.createdAt ? new Date(task.createdAt).toLocaleDateString("tr-TR") : "-"}
            </span>
          </div>

          {/* Acknowledgment */}
          {task.acknowledgedAt && (
            <div className="flex items-center gap-2">
              <Eye className="h-3 w-3 text-primary flex-shrink-0" />
              <span>Görüldü</span>
              <span className="text-muted-foreground">
                {new Date(task.acknowledgedAt).toLocaleDateString("tr-TR")}
              </span>
            </div>
          )}

          {/* History from API with notes */}
          {taskHistory && taskHistory.length > 0 && taskHistory.map((entry, idx) => (
            <div key={entry.id || idx} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span>
                  {entry.previousStatus && entry.previousStatus !== entry.newStatus 
                    ? `${statusLabels[entry.newStatus] || entry.newStatus}`
                    : entry.note || "Güncelleme"
                  }
                </span>
                <span className="text-muted-foreground">
                  {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString("tr-TR") : "-"}
                </span>
              </div>
              {entry.note && entry.previousStatus && entry.previousStatus !== entry.newStatus && (
                <div className="ml-5 text-xs text-muted-foreground italic border-l border-muted-foreground/30 pl-2 py-0.5">
                  "{entry.note}"
                </div>
              )}
            </div>
          ))}

          {/* Completion status */}
          {task.status === "onaylandi" && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-success/10 border-t border-muted mt-2 pt-2">
              <CheckCircle className="h-3 w-3 text-success flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-success font-medium">Tamamlandı</span>
                  {task.completedAt && (
                    <span className="text-muted-foreground">
                      {new Date(task.completedAt).toLocaleDateString("tr-TR")}
                    </span>
                  )}
                </div>
                
                {/* Rating section - Compact */}
                {ratingData?.rawRating ? (
                  <div className="mt-1 flex items-center gap-1">
                    <span className="text-muted-foreground">Puan:</span>
                    <StarRating 
                      value={ratingData.finalRating} 
                      readonly 
                      size="sm"
                    />
                    <span className="font-medium">{ratingData.finalRating}/5</span>
                    {ratingData.penaltyApplied === 1 && (
                      <span className="text-orange-500">⚠️</span>
                    )}
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRatingDialog(true)}
                    className="mt-1 h-6 px-2 text-[10px]"
                    data-testid="button-rate-task"
                  >
                    <Star className="h-3 w-3 mr-1" />
                    Puanla
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Failure status */}
          {task.status === "basarisiz" && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-destructive/10 border-t border-muted mt-2 pt-2">
              <XCircle className="h-3 w-3 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-destructive">Tamamlanamadı</span>
                {task.failureNote && (
                  <p className="text-muted-foreground mt-0.5 break-words">{task.failureNote}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photos Section */}
      {task.photoUrl && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Yüklenen Fotoğraf
            </CardTitle>
          </CardHeader>
          <CardContent>
            <img 
              src={task.photoUrl} 
              alt="Görev fotoğrafı" 
              className="w-full h-auto rounded-md border"
              data-testid="img-task-photo"
            />
          </CardContent>
        </Card>
      )}

      {/* Complete Confirmation Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Görevi Tamamlamak Emin misin?</DialogTitle>
            <DialogDescription>
              Görev tamamlandı olarak işaretlenecek ve atayan kişinin onayına gönderilecek.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCompleteDialog(false)}
              data-testid="button-cancel-complete"
            >
              İptal
            </Button>
            <Button 
              onClick={() => {
                updateStatusMutation.mutate({ status: "tamamlandi", note: "Görev tamamlandı, onay bekleniyor" });
                setShowCompleteDialog(false);
              }}
              disabled={updateStatusMutation.isPending}
              data-testid="button-confirm-complete"
            >
              {updateStatusMutation.isPending ? "Kaydediliyor..." : "Tamamlandı"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Failure Dialog */}
      <Dialog open={showFailureDialog} onOpenChange={setShowFailureDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Görev Neden Tamamlanamadı?</DialogTitle>
            <DialogDescription>
              Lütfen görevin neden tamamlanamadığını açıklayın. Bu bilgi atayan kişiye bildirilecektir.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Başarısızlık nedeni..."
            value={failureNote}
            onChange={(e) => setFailureNote(e.target.value)}
            className="min-h-[100px]"
            data-testid="input-failure-note"
          />
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowFailureDialog(false)}
              data-testid="button-cancel-failure"
            >
              İptal
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleMarkFailed}
              disabled={updateStatusMutation.isPending || !failureNote.trim()}
              data-testid="button-confirm-failure"
            >
              {updateStatusMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rating Dialog */}
      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-400" />
              Görevi Puanla
            </DialogTitle>
            <DialogDescription>
              Görevin tamamlanma kalitesini değerlendirin (1-5 yıldız).
              {ratingData?.isLate && (
                <span className="block mt-2 text-orange-500 text-sm">
                  ⚠️ Görev geç teslim edildi.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-4 py-4">
            <StarRating
              value={ratingValue}
              onChange={setRatingValue}
              maxRating={5}
              size="lg"
              showValue
            />
            
            <Textarea
              placeholder="Yorum ekle (isteğe bağlı)..."
              value={ratingFeedback}
              onChange={(e) => setRatingFeedback(e.target.value)}
              className="min-h-[80px]"
              data-testid="input-rating-feedback"
            />
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowRatingDialog(false);
                setRatingValue(0);
                setRatingFeedback("");
              }}
              data-testid="button-cancel-rating"
            >
              İptal
            </Button>
            <Button 
              onClick={handleSubmitRating}
              disabled={ratingMutation.isPending || ratingValue < 1}
              data-testid="button-confirm-rating"
            >
              {ratingMutation.isPending ? "Kaydediliyor..." : "Puanla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
