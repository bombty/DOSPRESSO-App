import { useState } from "react";
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
  Image as ImageIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { Task, User as UserType, TaskStatusHistory } from "@shared/schema";

export default function GorevDetay() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [failureNote, setFailureNote] = useState("");
  const [showFailureDialog, setShowFailureDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [newNote, setNewNote] = useState("");

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
    devam_ediyor: "Devam Ediyor",
    foto_bekleniyor: "Fotoğraf Bekleniyor",
    incelemede: "İncelemede",
    onaylandi: "Tamamlandı",
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
  const canAcknowledge = isAssignee && !task.acknowledgedAt && task.status !== "onaylandi" && task.status !== "basarisiz";
  const canStartProgress = isAssignee && task.acknowledgedAt && task.status === "beklemede";
  const canMarkFailed = isAssignee && task.status !== "onaylandi" && task.status !== "basarisiz";
  const canComplete = isAssignee && task.status !== "onaylandi" && task.status !== "basarisiz";

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
                {canAcknowledge && (
                  <Button
                    variant="outline"
                    onClick={() => acknowledgeMutation.mutate()}
                    disabled={acknowledgeMutation.isPending}
                    data-testid="button-acknowledge-task"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {acknowledgeMutation.isPending ? "İşleniyor..." : "Gördüm"}
                  </Button>
                )}
                
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

      {/* Task Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* Main Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Durum</p>
              <Badge 
                variant={
                  task.status === "onaylandi" ? "outline" : 
                  task.status === "basarisiz" ? "destructive" : 
                  "default"
                } 
                className="mt-1"
              >
                {statusLabels[task.status] || task.status}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Öncelik</p>
              <Badge variant={task.priority === "yüksek" ? "destructive" : "outline"} className="mt-1">
                {task.priority ? (priorityLabels[task.priority] || task.priority) : "Belirtilmemiş"}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Oluşturulma Tarihi</p>
              <p className="font-medium text-sm mt-1">
                {task.createdAt ? new Date(task.createdAt).toLocaleDateString("tr-TR") : "-"}
              </p>
            </div>
            {task.dueDate && (
              <div>
                <p className="text-xs text-muted-foreground">Teslim Tarihi</p>
                <p className="font-medium text-sm mt-1">
                  {new Date(task.dueDate).toLocaleDateString("tr-TR")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assignment Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Atama Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Assigned To */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Atanan Kişi</p>
              {assignedUser ? (
                <Link href={`/personel-detay/${assignedUser.id}`}>
                  <div className="flex items-center gap-3 p-3 rounded-lg border hover-elevate cursor-pointer">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {assignedUser.firstName} {assignedUser.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{assignedUser.role}</p>
                    </div>
                    {isAssignee && <Badge variant="outline" className="ml-auto">Siz</Badge>}
                  </div>
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">Atanmamış</p>
              )}
            </div>

            {/* Assigned By */}
            {assignedByUser && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Atayan Kişi</p>
                <Link href={`/personel-detay/${assignedByUser.id}`}>
                  <div className="flex items-center gap-3 p-3 rounded-lg border hover-elevate cursor-pointer">
                    <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {assignedByUser.firstName} {assignedByUser.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{assignedByUser.role}</p>
                    </div>
                    {isAssigner && <Badge variant="outline" className="ml-auto">Siz</Badge>}
                  </div>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status History Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-4 w-4" />
            Durum Geçmişi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          {/* Creation */}
          <div className="flex items-start gap-3">
            <Clock className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Görev oluşturuldu</p>
              <p className="text-xs text-muted-foreground">
                {task.createdAt ? new Date(task.createdAt).toLocaleString("tr-TR") : "-"}
              </p>
            </div>
          </div>

          {/* Acknowledgment */}
          {task.acknowledgedAt && (
            <div className="flex items-start gap-3">
              <Eye className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Görev görüldü</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(task.acknowledgedAt).toLocaleString("tr-TR")}
                </p>
              </div>
            </div>
          )}

          {/* History from API */}
          {taskHistory && taskHistory.length > 0 && taskHistory.map((entry, idx) => (
            <div key={entry.id || idx} className="flex items-start gap-3">
              <AlertCircle className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">
                  {entry.previousStatus && entry.previousStatus !== entry.newStatus 
                    ? `Durum: ${statusLabels[entry.previousStatus] || entry.previousStatus} → ${statusLabels[entry.newStatus] || entry.newStatus}`
                    : entry.note || "Güncelleme"
                  }
                </p>
                {entry.note && entry.previousStatus && entry.previousStatus !== entry.newStatus && (
                  <p className="text-xs text-muted-foreground mt-1">Not: {entry.note}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {entry.createdAt ? new Date(entry.createdAt).toLocaleString("tr-TR") : "-"}
                </p>
              </div>
            </div>
          ))}

          {/* Completion status */}
          {task.status === "onaylandi" && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-success/10">
              <CheckCircle className="h-4 w-4 mt-1 text-success flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-success">Görev tamamlandı</p>
                {task.completedAt && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(task.completedAt).toLocaleString("tr-TR")}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Failure status */}
          {task.status === "basarisiz" && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10">
              <XCircle className="h-4 w-4 mt-1 text-destructive flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">Görev tamamlanamadı</p>
                {task.failureNote && (
                  <p className="text-xs text-muted-foreground mt-1">Neden: {task.failureNote}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Complete Confirmation Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Görevi Tamamlamak Emin misin?</DialogTitle>
            <DialogDescription>
              Görevin tamamlandı olarak işaretlenecek. Bu işlem geri alınamaz.
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
                updateStatusMutation.mutate({ status: "onaylandi" });
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
    </div>
  );
}
