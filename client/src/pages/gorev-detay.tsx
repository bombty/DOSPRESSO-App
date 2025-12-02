import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  ListTodo,
  User,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  MessageSquare,
  History,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function GorevDetay() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [note, setNote] = useState("");

  const { data: task, isLoading } = useQuery<any>({
    queryKey: ["/api/tasks", id],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${id}`);
      if (!response.ok) throw new Error("Failed to fetch task");
      return response.json();
    },
    enabled: !!id,
  });

  const { data: checklist } = useQuery<any>({
    queryKey: ["/api/checklists", task?.checklistId],
    queryFn: async () => {
      const response = await fetch(`/api/checklists/${task!.checklistId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!task?.checklistId,
  });

  const { data: checklistTasks } = useQuery<any[]>({
    queryKey: ["/api/checklist-tasks", task?.checklistId],
    queryFn: async () => {
      const response = await fetch(`/api/checklist-tasks?checklistId=${task!.checklistId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!task?.checklistId,
  });

  const { data: assignedUser } = useQuery<any>({
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
      return apiRequest("PATCH", `/api/tasks/${id}`, { status: "completed" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      toast({ title: "Başarılı", description: "Görev tamamlandı olarak işaretlendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "İşlem başarısız", variant: "destructive" });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/tasks/${id}/notes`, { content: note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      setNote("");
      toast({ title: "Başarılı", description: "Not eklendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Not eklenemedi", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 grid grid-cols-1 gap-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="container mx-auto p-6">
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
    pending: "Bekliyor",
    in_progress: "Devam Ediyor",
    completed: "Tamamlandı",
    cancelled: "İptal",
  };

  const priorityLabels: Record<string, string> = {
    low: "Düşük",
    medium: "Orta",
    high: "Yüksek",
    critical: "Kritik",
  };

  return (
    <div className="container mx-auto p-6 grid grid-cols-1 gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            data-testid="button-back"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{task.title || `Görev #${task.id}`}</h1>
            <p className="text-muted-foreground mt-1">Görev Detayı</p>
          </div>
        </div>
        {task.status !== "completed" && (
          <Button
            onClick={() => completeTaskMutation.mutate()}
            disabled={completeTaskMutation.isPending}
            data-testid="button-complete-task"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Tamamla
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5" />
              Görev Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Durum</p>
                <Badge variant={task.status === "completed" ? "outline" : "default"} className="mt-1">
                  {statusLabels[task.status] || task.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Öncelik</p>
                <Badge
                  variant={task.priority === "critical" ? "destructive" : task.priority === "high" ? "destructive" : "outline"}
                  className="mt-1"
                >
                  {priorityLabels[task.priority] || task.priority}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Oluşturulma</p>
                <p className="font-medium mt-1">
                  {task.createdAt ? new Date(task.createdAt).toLocaleDateString("tr-TR") : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bitiş Tarihi</p>
                <p className="font-medium mt-1">
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString("tr-TR") : "-"}
                </p>
              </div>
            </div>
            {task.description && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Açıklama</p>
                <p className="text-sm">{task.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Atanan Kişi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assignedUser ? (
              <Link href={`/personel-detay/${assignedUser.id}`}>
                <div className="flex items-center gap-3 p-3 rounded-lg border hover-elevate cursor-pointer">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-600 hover:underline">
                      {assignedUser.firstName} {assignedUser.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{assignedUser.role}</p>
                  </div>
                </div>
              </Link>
            ) : (
              <p className="text-muted-foreground">Atanmamış</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="checklist" className="w-full">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          <TabsTrigger value="checklist" className="text-xs px-3 py-1.5">
            <CheckCircle className="h-3 w-3 mr-1" />
            Checklist
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-xs px-3 py-1.5">
            <MessageSquare className="h-3 w-3 mr-1" />
            Notlar
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs px-3 py-1.5">
            <History className="h-3 w-3 mr-1" />
            Geçmiş
          </TabsTrigger>
        </TabsList>

        <TabsContent value="temp" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Checklist Öğeleri</CardTitle>
              <CardDescription>
                {checklist?.title || "Bu görevin bağlı olduğu kontrol listesi"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {checklistTasks && checklistTasks.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {checklistTasks.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-lg border"
                      data-testid={`checklist-item-${item.id}`}
                    >
                      <div
                        className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                          item.isCompleted ? "bg-green-500 border-green-500" : "border-gray-300"
                        }`}
                      >
                        {item.isCompleted && <CheckCircle className="h-3 w-3 text-white" />}
                      </div>
                      <span className={item.isCompleted ? "line-through text-muted-foreground" : ""}>
                        {item.title || item.description}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Checklist öğesi bulunmuyor</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="temp" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Görev Notları</CardTitle>
              <CardDescription>Bu göreve ait notlar ve yorumlar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Textarea
                    placeholder="Not ekle..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="min-h-24"
                    data-testid="textarea-note"
                  />
                  <Button
                    className="mt-2"
                    onClick={() => addNoteMutation.mutate()}
                    disabled={!note || addNoteMutation.isPending}
                    data-testid="button-add-note"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Not Ekle
                  </Button>
                </div>
                {task.notes && task.notes.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 pt-4 border-t">
                    {task.notes.map((n: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-lg bg-muted">
                        <p className="text-sm">{n.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(n.createdAt).toLocaleString("tr-TR")}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">Henüz not eklenmemiş</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="temp" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Görev Geçmişi</CardTitle>
              <CardDescription>Görev durum değişiklikleri ve aktivite</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-start gap-3 p-3 rounded-lg border">
                  <Clock className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Görev oluşturuldu</p>
                    <p className="text-xs text-muted-foreground">
                      {task.createdAt ? new Date(task.createdAt).toLocaleString("tr-TR") : "-"}
                    </p>
                  </div>
                </div>
                {task.updatedAt && task.updatedAt !== task.createdAt && (
                  <div className="flex items-start gap-3 p-3 rounded-lg border">
                    <AlertCircle className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Son güncelleme</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(task.updatedAt).toLocaleString("tr-TR")}
                      </p>
                    </div>
                  </div>
                )}
                {task.status === "completed" && (
                  <div className="flex items-start gap-3 p-3 rounded-lg border bg-green-50 dark:bg-green-950/20">
                    <CheckCircle className="h-4 w-4 mt-1 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-700 dark:text-green-400">Görev tamamlandı</p>
                      <p className="text-xs text-green-600/80">
                        {task.completedAt ? new Date(task.completedAt).toLocaleString("tr-TR") : "-"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
