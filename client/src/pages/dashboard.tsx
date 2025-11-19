import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { CheckCircle, Clock, AlertTriangle, TrendingUp, Sparkles, RefreshCw, User, MapPin, Calendar, Image, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { useLocation } from "wouter";
import type { Task, EquipmentFault, PerformanceMetric, AISummaryResponse, SummaryCategoryType, User as UserType, Branch } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SummaryCategoryType | null>(null);
  const [currentSummary, setCurrentSummary] = useState<AISummaryResponse | null>(null);
  
  // Sheet state management
  const [taskSheetOpen, setTaskSheetOpen] = useState(false);
  const [faultSheetOpen, setFaultSheetOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedFault, setSelectedFault] = useState<EquipmentFault | null>(null);

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: faults, isLoading: faultsLoading } = useQuery<EquipmentFault[]>({
    queryKey: ["/api/faults"],
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery<PerformanceMetric[]>({
    queryKey: ["/api/performance/latest"],
  });

  // Fetch users and branches for detail views
  const { data: users } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const completedTasks = tasks?.filter(t => t.status === "tamamlandi").length || 0;
  const pendingTasks = tasks?.filter(t => t.status === "beklemede").length || 0;
  const overdueTasks = tasks?.filter(t => t.status === "gecikmiş").length || 0;
  const openFaults = faults?.filter(f => f.status === "acik").length || 0;

  const latestMetric = metrics?.[0];
  const completionRate = latestMetric?.completionRate || 0;

  // Check if user has access to AI summaries (HQ users or supervisors)
  const HQ_ROLES = ['admin', 'muhasebe', 'satinalma', 'coach', 'teknik', 'destek', 'fabrika', 'yatirimci_hq'];
  const canAccessAISummaries = user && (HQ_ROLES.includes(user.role) || user.role === 'supervisor' || user.role === 'supervisor_buddy');

  // AI Summary mutation
  const generateSummaryMutation = useMutation({
    mutationFn: async (category: SummaryCategoryType) => {
      const response = await apiRequest('POST', '/api/ai-summary', { category });
      return response.json() as Promise<AISummaryResponse>;
    },
    onSuccess: (data: AISummaryResponse) => {
      setCurrentSummary(data);
      setSummaryDialogOpen(true);
      if (data.cached) {
        toast({
          title: "Önbellekten Yüklendi",
          description: "Bu özet daha önce oluşturulmuştu ve önbellekten getirildi.",
        });
      } else {
        toast({
          title: "AI Özeti Oluşturuldu",
          description: "Özet başarıyla oluşturuldu ve 24 saat boyunca önbellekte saklanacak.",
        });
      }
    },
    onError: (error: any) => {
      console.error('AI summary error:', error);
      toast({
        title: "Hata",
        description: error.message || "AI özeti oluşturulamadı. Lütfen tekrar deneyin.",
        variant: "destructive",
      });
    },
  });

  // AI Dashboard Insights mutation (role-specific)
  const [dashboardInsights, setDashboardInsights] = useState<{
    insights: string[];
    cached: boolean;
    generatedAt: string;
    role: string;
  } | null>(null);

  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/ai-dashboard-insights', {});
      return response.json() as Promise<{
        insights: string[];
        cached: boolean;
        generatedAt: string;
        role: string;
        scope?: { branchId: number; branchName?: string };
      }>;
    },
    onSuccess: (data) => {
      setDashboardInsights(data);
      if (data.cached) {
        toast({
          title: "Önbellekten Yüklendi",
          description: "Bu içgörüler daha önce oluşturulmuştu ve önbellekten getirildi.",
        });
      } else {
        toast({
          title: "AI İçgörüler Oluşturuldu",
          description: `${data.insights.length} içgörü başarıyla oluşturuldu ve 24 saat boyunca önbellekte saklanacak.`,
        });
      }
    },
    onError: (error: any) => {
      console.error('AI insights error:', error);
      toast({
        title: "Hata",
        description: error.message || "AI içgörüleri oluşturulamadı. Lütfen tekrar deneyin.",
        variant: "destructive",
      });
    },
  });

  const handleGenerateSummary = (category: SummaryCategoryType) => {
    setSelectedCategory(category);
    generateSummaryMutation.mutate(category);
  };

  const getCategoryTitle = (category: SummaryCategoryType) => {
    switch (category) {
      case 'personel':
        return 'Personel Özeti';
      case 'cihazlar':
        return 'Cihaz Özeti';
      case 'gorevler':
        return 'Görev Özeti';
      default:
        return 'AI Özeti';
    }
  };

  const getCategoryDescription = (category: SummaryCategoryType, branchName?: string) => {
    const prefix = branchName || 'Tüm şubeler';
    switch (category) {
      case 'personel':
        return `${prefix} - Son 7 günlük personel verilerine dayalı AI analizi`;
      case 'cihazlar':
        return `${prefix} - Son 7 günlük cihaz verilerine dayalı AI analizi`;
      case 'gorevler':
        return `${prefix} - Son 7 günlük görev verilerine dayalı AI analizi`;
      default:
        return `${prefix} - Son 7 günlük verilere dayalı AI analizi`;
    }
  };

  // Helper functions for detail views
  const getUserName = (userId: string | null | undefined) => {
    if (!userId) return "Atanmadı";
    const user = users?.find(u => u.id === userId);
    return user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "Bilinmiyor" : "Bilinmiyor";
  };

  const getBranchName = (branchId: number | null | undefined) => {
    if (!branchId) return "Bilinmiyor";
    const branch = branches?.find(b => b.id === branchId);
    return branch?.name || "Bilinmiyor";
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setTaskSheetOpen(true);
  };

  const handleFaultClick = (fault: EquipmentFault) => {
    setSelectedFault(fault);
    setFaultSheetOpen(true);
  };

  const getTaskStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      "beklemede": "Beklemede",
      "devam_ediyor": "Devam Ediyor",
      "foto_bekleniyor": "Foto Bekleniyor",
      "incelemede": "İncelemede",
      "onaylandi": "Onaylandı",
      "reddedildi": "Reddedildi",
      "gecikmiş": "Gecikmiş",
      "tamamlandi": "Tamamlandı",
    };
    return statusMap[status] || status;
  };

  const getFaultStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      "acik": "Açık",
      "devam_ediyor": "Devam Ediyor",
      "cozuldu": "Çözüldü",
    };
    return statusMap[status] || status;
  };

  const getPriorityLabel = (priority: string | null | undefined) => {
    if (!priority) return "Orta";
    const priorityMap: Record<string, string> = {
      "düşük": "Düşük",
      "orta": "Orta",
      "yüksek": "Yüksek",
      "dusuk": "Düşük",
      "yuksek": "Yüksek",
    };
    return priorityMap[priority] || priority;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">Kontrol Paneli</h1>
        <p className="text-muted-foreground mt-1">DOSPRESSO operasyon özeti</p>
      </div>

      <AnnouncementBanner />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="cursor-pointer hover-elevate transition-all" 
          onClick={() => setLocation("/gorevler?status=onaylandi")}
          data-testid="card-completed-tasks"
        >
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tamamlanan Görevler
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-3xl font-bold" data-testid="text-completed-tasks">
                  {completedTasks}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Toplam {tasks?.length || 0} görevden
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover-elevate transition-all" 
          onClick={() => setLocation("/gorevler?status=beklemede")}
          data-testid="card-pending-tasks"
        >
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Bekleyen Görevler
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-3xl font-bold" data-testid="text-pending-tasks">
                  {pendingTasks}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {overdueTasks > 0 && `${overdueTasks} gecikmiş`}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover-elevate transition-all" 
          onClick={() => setLocation("/ekipman-arizalari?status=acik")}
          data-testid="card-open-faults"
        >
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Açık Arızalar
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {faultsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-3xl font-bold" data-testid="text-open-faults">
                  {openFaults}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Toplam {faults?.length || 0} arızadan
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tamamlanma Oranı
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-3xl font-bold" data-testid="text-completion-rate">
                  %{completionRate}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Bugünkü performans
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {canAccessAISummaries && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI Özetler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Son 7 günlük verilere dayalı AI destekli analizler (Günlük limit: 3 özet)
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => handleGenerateSummary('personel')}
                  disabled={generateSummaryMutation.isPending}
                  variant="outline"
                  data-testid="button-ai-summary-personel"
                >
                  {generateSummaryMutation.isPending && selectedCategory === 'personel' ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Personel Özeti
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => handleGenerateSummary('cihazlar')}
                  disabled={generateSummaryMutation.isPending}
                  variant="outline"
                  data-testid="button-ai-summary-cihazlar"
                >
                  {generateSummaryMutation.isPending && selectedCategory === 'cihazlar' ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Cihaz Özeti
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => handleGenerateSummary('gorevler')}
                  disabled={generateSummaryMutation.isPending}
                  variant="outline"
                  data-testid="button-ai-summary-gorevler"
                >
                  {generateSummaryMutation.isPending && selectedCategory === 'gorevler' ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Görev Özeti
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                AI İçgörüler
              </CardTitle>
              {!dashboardInsights && (
                <Button
                  onClick={() => generateInsightsMutation.mutate()}
                  disabled={generateInsightsMutation.isPending}
                  size="sm"
                  data-testid="button-generate-insights"
                >
                  {generateInsightsMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      İçgörü Oluştur
                    </>
                  )}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {dashboardInsights ? (
                dashboardInsights.insights && dashboardInsights.insights.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {HQ_ROLES.includes(user?.role || '')
                        ? 'Tüm şubeler için AI destekli performans analizi'
                        : 'Şubeniz için AI destekli performans analizi'}
                      {dashboardInsights.cached && ' (önbellekten)'}
                    </p>
                    <ul className="space-y-2">
                      {dashboardInsights.insights.map((insight, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm"
                          data-testid={`insight-item-${idx}`}
                        >
                          <TrendingUp className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      onClick={() => generateInsightsMutation.mutate()}
                      disabled={generateInsightsMutation.isPending}
                      variant="outline"
                      size="sm"
                      className="w-full"
                      data-testid="button-refresh-insights"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Yenile
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    AI içgörüleri oluşturulamadı. Lütfen tekrar deneyin.
                  </p>
                )
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Operasyonel AI içgörüleri oluşturmak için butona tıklayın. (Günlük limit: 3)
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Son Görevler</CardTitle>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                {tasks?.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0 cursor-pointer hover-elevate rounded-md p-2 -m-2"
                    onClick={() => handleTaskClick(task)}
                    data-testid={`task-item-clickable-${task.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {task.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(task.createdAt!).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                    <Badge
                      variant={
                        task.status === "onaylandi"
                          ? "default"
                          : task.status === "gecikmiş"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {getTaskStatusLabel(task.status)}
                    </Badge>
                  </div>
                ))}
                {(!tasks || tasks.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Henüz görev yok
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Son Arızalar</CardTitle>
          </CardHeader>
          <CardContent>
            {faultsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                {faults?.slice(0, 5).map((fault) => (
                  <div
                    key={fault.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0 cursor-pointer hover-elevate rounded-md p-2 -m-2"
                    onClick={() => handleFaultClick(fault)}
                    data-testid={`fault-item-clickable-${fault.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {fault.equipmentName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {fault.description}
                      </p>
                    </div>
                    <Badge
                      variant={
                        fault.status === "cozuldu"
                          ? "default"
                          : fault.priority === "yuksek"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {getFaultStatusLabel(fault.status)}
                    </Badge>
                  </div>
                ))}
                {(!faults || faults.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Henüz arıza yok
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={summaryDialogOpen} onOpenChange={setSummaryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              {currentSummary ? getCategoryTitle(currentSummary.category) : 'AI Özeti'}
            </DialogTitle>
            <DialogDescription>
              {currentSummary 
                ? getCategoryDescription(currentSummary.category, currentSummary.scope?.branchName)
                : 'Son 7 günlük verilere dayalı yapay zeka analizi'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {currentSummary && (
              <>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(currentSummary.generatedAt).toLocaleString('tr-TR')}
                    </span>
                    {currentSummary.cached && (
                      <Badge variant="secondary" className="text-xs">
                        Önbellekten
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleGenerateSummary(currentSummary.category)}
                    disabled={generateSummaryMutation.isPending}
                  >
                    {generateSummaryMutation.isPending ? (
                      <>
                        <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                        Yenileniyor...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-3 w-3" />
                        Yenile
                      </>
                    )}
                  </Button>
                </div>

                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {currentSummary.summary}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    💡 AI özetleri GPT-4o-mini ile oluşturulur ve 24 saat boyunca önbellekte saklanır. 
                    Günlük limit: 3 özet.
                  </p>
                </div>
              </>
            )}

            {generateSummaryMutation.isPending && (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={taskSheetOpen} onOpenChange={setTaskSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Görev Detayları</SheetTitle>
            <SheetDescription>
              Görev hakkında detaylı bilgi ve işlemler
            </SheetDescription>
          </SheetHeader>

          {selectedTask && (
            <div className="space-y-6 mt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Açıklama</h3>
                  <p className="text-sm" data-testid="task-detail-description">
                    {selectedTask.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Durum
                    </h3>
                    <Badge
                      variant={
                        selectedTask.status === "onaylandi"
                          ? "default"
                          : selectedTask.status === "gecikmiş"
                          ? "destructive"
                          : "secondary"
                      }
                      data-testid="task-detail-status"
                    >
                      {getTaskStatusLabel(selectedTask.status)}
                    </Badge>
                  </div>

                  {selectedTask.priority && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Öncelik
                      </h3>
                      <Badge
                        variant={
                          selectedTask.priority === "yüksek" || selectedTask.priority === "yuksek"
                            ? "destructive"
                            : selectedTask.priority === "düşük" || selectedTask.priority === "dusuk"
                            ? "secondary"
                            : "default"
                        }
                        data-testid="task-detail-priority"
                      >
                        {getPriorityLabel(selectedTask.priority)}
                      </Badge>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Atanan Kişi
                  </h3>
                  <p className="text-sm" data-testid="task-detail-assigned-to">
                    {getUserName(selectedTask.assignedToId)}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Şube
                  </h3>
                  <p className="text-sm" data-testid="task-detail-branch">
                    {getBranchName(selectedTask.branchId)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Oluşturma Tarihi
                    </h3>
                    <p className="text-sm" data-testid="task-detail-created-at">
                      {selectedTask.createdAt
                        ? new Date(selectedTask.createdAt).toLocaleString("tr-TR")
                        : "Bilinmiyor"}
                    </p>
                  </div>

                  {selectedTask.dueDate && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Bitiş Tarihi
                      </h3>
                      <p className="text-sm" data-testid="task-detail-due-date">
                        {new Date(selectedTask.dueDate).toLocaleString("tr-TR")}
                      </p>
                    </div>
                  )}
                </div>

                {selectedTask.photoUrl && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Fotoğraf
                    </h3>
                    <img
                      src={selectedTask.photoUrl}
                      alt="Görev fotoğrafı"
                      className="rounded-md w-full object-cover max-h-64"
                      data-testid="task-detail-photo"
                    />
                  </div>
                )}

                {selectedTask.aiAnalysis && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      AI Analizi
                    </h3>
                    <div className="text-sm bg-muted p-4 rounded-md" data-testid="task-detail-ai-analysis">
                      <p className="whitespace-pre-wrap">{selectedTask.aiAnalysis}</p>
                      {selectedTask.aiScore !== null && selectedTask.aiScore !== undefined && (
                        <div className="mt-2 pt-2 border-t">
                          <span className="text-xs font-medium">AI Skoru: </span>
                          <Badge variant={selectedTask.aiScore >= 70 ? "default" : "destructive"}>
                            {selectedTask.aiScore}/100
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setTaskSheetOpen(false);
                    setLocation(`/gorevler?id=${selectedTask.id}`);
                  }}
                  data-testid="button-view-task-full"
                >
                  Detaylı Görüntüle
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={faultSheetOpen} onOpenChange={setFaultSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Arıza Detayları</SheetTitle>
            <SheetDescription>
              Arıza hakkında detaylı bilgi ve işlemler
            </SheetDescription>
          </SheetHeader>

          {selectedFault && (
            <div className="space-y-6 mt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Ekipman
                  </h3>
                  <p className="text-sm font-medium" data-testid="fault-detail-equipment">
                    {selectedFault.equipmentName}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Açıklama</h3>
                  <p className="text-sm" data-testid="fault-detail-description">
                    {selectedFault.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Durum
                    </h3>
                    <Badge
                      variant={
                        selectedFault.status === "cozuldu"
                          ? "default"
                          : selectedFault.priority === "yuksek"
                          ? "destructive"
                          : "secondary"
                      }
                      data-testid="fault-detail-status"
                    >
                      {getFaultStatusLabel(selectedFault.status)}
                    </Badge>
                  </div>

                  {selectedFault.priority && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Öncelik
                      </h3>
                      <Badge
                        variant={
                          selectedFault.priority === "yüksek" || selectedFault.priority === "yuksek"
                            ? "destructive"
                            : selectedFault.priority === "düşük" || selectedFault.priority === "dusuk"
                            ? "secondary"
                            : "default"
                        }
                        data-testid="fault-detail-priority"
                      >
                        {getPriorityLabel(selectedFault.priority)}
                      </Badge>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Raporlayan
                  </h3>
                  <p className="text-sm" data-testid="fault-detail-reported-by">
                    {getUserName(selectedFault.reportedById)}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Şube
                  </h3>
                  <p className="text-sm" data-testid="fault-detail-branch">
                    {getBranchName(selectedFault.branchId)}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Oluşturma Tarihi
                  </h3>
                  <p className="text-sm" data-testid="fault-detail-created-at">
                    {selectedFault.createdAt
                      ? new Date(selectedFault.createdAt).toLocaleString("tr-TR")
                      : "Bilinmiyor"}
                  </p>
                </div>

                {selectedFault.photoUrl && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Fotoğraf
                    </h3>
                    <img
                      src={selectedFault.photoUrl}
                      alt="Arıza fotoğrafı"
                      className="rounded-md w-full object-cover max-h-64"
                      data-testid="fault-detail-photo"
                    />
                  </div>
                )}

                {selectedFault.aiAnalysis && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      AI Analizi
                    </h3>
                    <div className="text-sm bg-muted p-4 rounded-md" data-testid="fault-detail-ai-analysis">
                      <p className="whitespace-pre-wrap">{selectedFault.aiAnalysis}</p>
                      {selectedFault.aiSeverity && (
                        <div className="mt-2 pt-2 border-t">
                          <span className="text-xs font-medium">Önem Derecesi: </span>
                          <Badge>{selectedFault.aiSeverity}</Badge>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedFault.aiRecommendations && selectedFault.aiRecommendations.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      AI Önerileri
                    </h3>
                    <ul className="space-y-2" data-testid="fault-detail-ai-recommendations">
                      {selectedFault.aiRecommendations.map((rec, idx) => (
                        <li key={idx} className="text-sm flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setFaultSheetOpen(false);
                    setLocation(`/ekipman-arizalari?id=${selectedFault.id}`);
                  }}
                  data-testid="button-view-fault-full"
                >
                  Detaylı Görüntüle
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
