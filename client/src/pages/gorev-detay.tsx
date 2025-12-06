import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, User, Calendar, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Task, User as UserType } from "@shared/schema";

export default function GorevDetay() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

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

  const completeTaskMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/tasks/${id}`, { status: "onaylandi" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Başarılı", description: "Görev tamamlandı" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "İşlem başarısız", variant: "destructive" });
    },
  });

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
    onaylandi: "Onaylandı",
    reddedildi: "Reddedildi",
    "gecikmiş": "Gecikmiş",
  };

  const priorityLabels: Record<string, string> = {
    "düşük": "Düşük",
    orta: "Orta",
    "yüksek": "Yüksek",
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-4 p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
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
            <h1 className="text-2xl font-bold" data-testid="text-task-title">{task.description || `Görev #${task.id}`}</h1>
            <p className="text-sm text-muted-foreground">ID: {task.id}</p>
          </div>
        </div>
        {task.status !== "onaylandi" && (
          <Button
            onClick={() => completeTaskMutation.mutate()}
            disabled={completeTaskMutation.isPending}
            data-testid="button-complete-task"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {completeTaskMutation.isPending ? "Kaydediliyor..." : "Tamamla"}
          </Button>
        )}
      </div>

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
              <Badge variant={task.status === "onaylandi" ? "outline" : "default"} className="mt-1">
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

        {/* Assigned User */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Atanan Kişi</CardTitle>
          </CardHeader>
          <CardContent>
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
                </div>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">Atanmamış</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Geçmiş</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="flex items-start gap-3">
            <Clock className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Görev oluşturuldu</p>
              <p className="text-xs text-muted-foreground">
                {task.createdAt ? new Date(task.createdAt).toLocaleString("tr-TR") : "-"}
              </p>
            </div>
          </div>

          {task.updatedAt && task.updatedAt !== task.createdAt && (
            <div className="flex items-start gap-3">
              <AlertCircle className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Son güncelleme</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(task.updatedAt).toLocaleString("tr-TR")}
                </p>
              </div>
            </div>
          )}

          {task.status === "onaylandi" && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-success/10">
              <CheckCircle className="h-4 w-4 mt-1 text-success flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-success">Görev tamamlandı</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
