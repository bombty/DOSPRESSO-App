import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { CheckCircle, Clock, AlertTriangle, TrendingUp, Sparkles, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import type { Task, EquipmentFault, PerformanceMetric, AISummaryResponse, SummaryCategoryType } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SummaryCategoryType | null>(null);
  const [currentSummary, setCurrentSummary] = useState<AISummaryResponse | null>(null);

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: faults, isLoading: faultsLoading } = useQuery<EquipmentFault[]>({
    queryKey: ["/api/faults"],
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery<PerformanceMetric[]>({
    queryKey: ["/api/performance/latest"],
  });

  const completedTasks = tasks?.filter(t => t.status === "tamamlandi").length || 0;
  const pendingTasks = tasks?.filter(t => t.status === "beklemede").length || 0;
  const overdueTasks = tasks?.filter(t => t.status === "gecikmiş").length || 0;
  const openFaults = faults?.filter(f => f.status === "acik").length || 0;

  const latestMetric = metrics?.[0];
  const completionRate = latestMetric?.completionRate || 0;

  // Check if user has access to AI summaries (HQ users or supervisors)
  const HQ_ROLES = ['admin', 'muhasebe', 'satinalma', 'coach', 'teknik', 'destek', 'fabrika', 'yatirimci_hq'];
  const canAccessAISummaries = user && (HQ_ROLES.includes(user.role) || user.role === 'supervisor');

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">Gösterge Paneli</h1>
        <p className="text-muted-foreground mt-1">DOSPRESSO operasyon özeti</p>
      </div>

      <AnnouncementBanner />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
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

        <Card>
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

        <Card>
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
                    className="flex items-center justify-between border-b pb-2 last:border-0"
                    data-testid={`task-item-${task.id}`}
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
                        task.status === "tamamlandi"
                          ? "default"
                          : task.status === "gecikmiş"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {task.status === "tamamlandi"
                        ? "Tamamlandı"
                        : task.status === "gecikmiş"
                        ? "Gecikmiş"
                        : "Beklemede"}
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
                    className="flex items-center justify-between border-b pb-2 last:border-0"
                    data-testid={`fault-item-${fault.id}`}
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
                      {fault.status === "cozuldu"
                        ? "Çözüldü"
                        : fault.status === "devam_ediyor"
                        ? "Devam Ediyor"
                        : "Açık"}
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
    </div>
  );
}
