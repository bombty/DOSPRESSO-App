import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTaskSchema, type Task, type InsertTask, type Branch } from "@shared/schema";
import { Camera, Check } from "lucide-react";

export default function Tasks() {
  const { toast } = useToast();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: branches, isLoading: isBranchesLoading } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const form = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      description: "",
      status: "beklemede",
      branchId: undefined,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      await apiRequest("/api/tasks", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Başarılı", description: "Görev oluşturuldu" });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Yetkisiz",
          description: "Oturumunuz sonlandı. Tekrar giriş yapılıyor...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Hata",
        description: "Görev oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async ({ taskId, photoUrl }: { taskId: number; photoUrl?: string }) => {
      await apiRequest(`/api/tasks/${taskId}/complete`, "POST", { photoUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Başarılı", description: "Görev tamamlandı olarak işaretlendi" });
      setSelectedTask(null);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Yetkisiz",
          description: "Oturumunuz sonlandı. Tekrar giriş yapılıyor...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Hata",
        description: "Görev tamamlanamadı",
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParams = async () => {
    const response = await fetch("/api/objects/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await response.json();
    return { method: "PUT" as const, url: data.uploadURL };
  };

  const handleUploadComplete = (taskId: number) => (result: { successful: Array<{ uploadURL: string }> }) => {
    if (result.successful && result.successful[0]) {
      const photoUrl = result.successful[0].uploadURL;
      completeMutation.mutate({ taskId, photoUrl });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Görevler</h1>
          <p className="text-muted-foreground mt-1">Günlük görevleri yönetin ve fotoğraflarla doğrulayın</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-task">Yeni Görev Ekle</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Görev Ekle</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Görev Açıklaması</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Görev açıklamasını girin" data-testid="input-task-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Şube</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={field.value?.toString()}
                        disabled={isBranchesLoading}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-branch">
                            <SelectValue placeholder={isBranchesLoading ? "Yükleniyor..." : "Şube seçin"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {!branches || branches.length === 0 ? (
                            <SelectItem value="no-branches" disabled>
                              Henüz şube yok
                            </SelectItem>
                          ) : (
                            branches.map((branch) => (
                              <SelectItem key={branch.id} value={branch.id.toString()}>
                                {branch.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    İptal
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-task">
                    {createMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {tasks?.map((task) => (
            <Card key={task.id} data-testid={`card-task-${task.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{task.description}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(task.createdAt!).toLocaleDateString("tr-TR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <Badge
                    variant={
                      task.status === "tamamlandi"
                        ? "default"
                        : task.status === "gecikmiş"
                        ? "destructive"
                        : "secondary"
                    }
                    data-testid={`badge-task-status-${task.id}`}
                  >
                    {task.status === "tamamlandi"
                      ? "Tamamlandı"
                      : task.status === "gecikmiş"
                      ? "Gecikmiş"
                      : "Beklemede"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {task.photoUrl && (
                  <div>
                    <img
                      src={task.photoUrl}
                      alt="Görev fotoğrafı"
                      className="rounded-md max-h-48 object-cover"
                      data-testid={`img-task-photo-${task.id}`}
                    />
                  </div>
                )}
                {task.aiAnalysis && (
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm font-medium mb-1">AI Analizi:</p>
                    <p className="text-sm text-muted-foreground">{task.aiAnalysis}</p>
                    {task.aiScore !== null && (
                      <p className="text-sm font-medium mt-2">
                        Skor: <span className="text-primary">{task.aiScore}/100</span>
                      </p>
                    )}
                  </div>
                )}
                {task.status !== "tamamlandi" && (
                  <div className="flex gap-2">
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={10485760}
                      onGetUploadParameters={handleGetUploadParams}
                      onComplete={handleUploadComplete(task.id)}
                      buttonClassName="flex-1"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Fotoğraf Yükle ve Tamamla
                    </ObjectUploader>
                    <Button
                      variant="outline"
                      onClick={() => completeMutation.mutate({ taskId: task.id })}
                      disabled={completeMutation.isPending}
                      data-testid={`button-complete-task-${task.id}`}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Fotoğrafsız Tamamla
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {(!tasks || tasks.length === 0) && (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  Henüz görev yok. Yeni görev eklemek için yukarıdaki butonu kullanın.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
