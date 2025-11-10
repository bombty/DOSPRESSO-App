import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { isHQRole } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTaskSchema, type Task, type InsertTask, type Branch, type User, isHQRole as checkIsHQRole } from "@shared/schema";
import { Camera, Check, Clock, AlertCircle, CheckCircle2, PlayCircle, Search } from "lucide-react";

export default function Tasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

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
      branchId: user?.branchId || undefined,
      assignedToId: undefined,
    },
  });

  const selectedBranchId = form.watch("branchId");
  const isHQ = user?.role && checkIsHQRole(user.role as any);

  const { data: employees, isLoading: isEmployeesLoading } = useQuery<User[]>({
    queryKey: ["/api/employees", isHQ ? { branchId: selectedBranchId } : {}],
    enabled: isHQ ? !!selectedBranchId : true,
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

  const stats = useMemo(() => {
    if (!tasks) return { beklemede: 0, devamEden: 0, tamamlanmayan: 0, tamamlanan: 0 };
    
    return {
      beklemede: tasks.filter(t => t.status === 'beklemede').length,
      devamEden: tasks.filter(t => t.status === 'devam ediyor').length,
      tamamlanmayan: tasks.filter(t => t.status === 'gecikmiş').length,
      tamamlanan: tasks.filter(t => t.status === 'tamamlandi').length,
    };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    
    let filtered = tasks;
    
    // Branch-level filtering: non-HQ users only see their branch tasks
    if (user?.role && !isHQRole(user.role as any)) {
      if (user.branchId) {
        filtered = filtered.filter(task => task.branchId === user.branchId);
      }
    }
    
    if (searchQuery) {
      filtered = filtered.filter(task => 
        task.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (activeTab !== 'all') {
      const categoryMap: Record<string, string> = {
        'acilis': 'açılış',
        'kapanis': 'kapanış',
        'gunluk': 'günlük kontrol'
      };
      const category = categoryMap[activeTab];
      if (category) {
        filtered = filtered.filter(task => 
          task.description.toLowerCase().includes(category)
        );
      }
    }
    
    return filtered;
  }, [tasks, searchQuery, activeTab, user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Açılış Çizelgeleri</h1>
          <p className="text-muted-foreground mt-1">İşte bugünün operasyonel özeti</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-stat-beklemede">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bekleyen</p>
                <p className="text-3xl font-bold mt-1">{stats.beklemede}</p>
                <p className="text-xs text-muted-foreground mt-1">Oran %12</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-devam-eden">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Devam Eden</p>
                <p className="text-3xl font-bold mt-1">{stats.devamEden}</p>
                <p className="text-xs text-muted-foreground mt-1">Oran %1</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <PlayCircle className="h-6 w-6 text-blue-600 dark:text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-tamamlanmayan">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tamamlanmayan</p>
                <p className="text-3xl font-bold mt-1">{stats.tamamlanmayan}</p>
                <p className="text-xs text-muted-foreground mt-1">Oran %60</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-tamamlanan">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tamamlanan</p>
                <p className="text-3xl font-bold mt-1">{stats.tamamlanan}</p>
                <p className="text-xs text-muted-foreground mt-1">Oran %30</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <TabsList data-testid="tabs-task-filter">
            <TabsTrigger value="all" data-testid="tab-all">Tümü</TabsTrigger>
            <TabsTrigger value="acilis" data-testid="tab-acilis">Açılış</TabsTrigger>
            <TabsTrigger value="kapanis" data-testid="tab-kapanis">Kapanış</TabsTrigger>
            <TabsTrigger value="gunluk" data-testid="tab-gunluk">Günlük Kontrol</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Çizelge veya personel ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-tasks"
              />
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-task">Yeni Çizelge Ekle</Button>
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
                {isHQ && (
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
                )}
                <FormField
                  control={form.control}
                  name="assignedToId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Atanan Kişi</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || undefined}
                        disabled={isEmployeesLoading || (isHQ && !selectedBranchId) || false}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-assignee">
                            <SelectValue 
                              placeholder={
                                isEmployeesLoading ? "Yükleniyor..." : 
                                (isHQ && !selectedBranchId) ? "Önce şube seçin" : 
                                "Çalışan seçin"
                              } 
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {!employees || employees.length === 0 ? (
                            <SelectItem value="no-employees" disabled>
                              Henüz çalışan yok
                            </SelectItem>
                          ) : (
                            employees.map((emp) => {
                              const roleLabels: Record<string, string> = {
                                admin: "Yönetici",
                                muhasebe: "Muhasebe",
                                satinalma: "Satın Alma",
                                coach: "Koç",
                                teknik: "Teknik",
                                destek: "Destek",
                                fabrika: "Fabrika",
                                yatirimci_hq: "Yatırımcı HQ",
                                stajyer: "Stajyer",
                                bar_buddy: "Bar Buddy",
                                barista: "Barista",
                                supervisor_buddy: "Supervisor Buddy",
                                supervisor: "Süpervizör",
                                yatirimci: "Yatırımcı",
                              };
                              return (
                                <SelectItem key={emp.id} value={emp.id}>
                                  {emp.firstName} {emp.lastName} - {roleLabels[emp.role] || emp.role}
                                </SelectItem>
                              );
                            })
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
        </div>

        {["all", "acilis", "kapanis", "gunluk"].map((tabValue) => (
          <TabsContent key={tabValue} value={tabValue} className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredTasks?.map((task) => (
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
                {(!filteredTasks || filteredTasks.length === 0) && !isLoading && (
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
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
