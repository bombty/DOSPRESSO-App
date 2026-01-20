import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, TrendingUp, TrendingDown, Minus, ListTodo, Zap, Wrench, Award, AlertTriangle, User, CheckCircle2, Clock, Download, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { createPDFWithHeader, addTable, addSection, addParagraph, savePDF, sanitizeText } from "@/lib/pdfHelper";

interface PerformerData {
  id: number;
  name: string;
  avatar?: string;
  score: number;
  completionRate: number;
  absences: number;
  lateArrivals: number;
}

interface DailyAnalytics {
  period: string;
  pendingTasks: number;
  completedTasks: number;
  activeFaults: number;
  overdueChecklists: number;
  criticalEquipment: number;
  avgHealth: number;
  summary: string;
}

interface WeeklyAnalytics {
  period: string;
  completedTasks: number;
  pendingTasks: number;
  activeFaults: number;
  overdueChecklists: number;
  checklistCompletionRate: number;
  avgHealth: number;
  criticalEquipment: number;
  topPerformers: PerformerData[];
  bottomPerformers: PerformerData[];
  summary: string;
}

interface MonthlyAnalytics {
  period: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueChecklists: number;
  totalFaults: number;
  resolvedFaults: number;
  activeFaults: number;
  avgHealth: number;
  criticalEquipment: number;
  topFaultyEquipment: { id: number; name: string; count: number }[];
  topPerformers: PerformerData[];
  bottomPerformers: PerformerData[];
  summary: string;
}

function TrendIcon({ value, threshold = 0 }: { value: number; threshold?: number }) {
  if (value > threshold) return <TrendingUp className="h-3 w-3 text-green-500" />;
  if (value < threshold) return <TrendingDown className="h-3 w-3 text-red-500" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
}

function PerformerCard({ performer, isTop }: { performer: PerformerData; isTop: boolean }) {
  const [, navigate] = useLocation();
  
  return (
    <div 
      className={`p-2 rounded border cursor-pointer hover-elevate ${
        isTop ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'
      }`}
      onClick={() => navigate(`/employees/${performer.id}`)}
      data-testid={`performer-card-${performer.id}`}
    >
      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6">
          <AvatarImage src={performer.avatar} />
          <AvatarFallback className="text-[10px]">
            {performer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{performer.name}</p>
          <div className="flex items-center gap-1">
            <span className={`text-[10px] ${isTop ? 'text-green-600' : 'text-red-600'}`}>
              %{performer.completionRate}
            </span>
            {performer.absences > 0 && (
              <Badge variant="outline" className="text-[8px] px-1 py-0 h-3">
                {performer.absences} devamsız
              </Badge>
            )}
          </div>
        </div>
        <div className={`text-sm font-bold ${isTop ? 'text-green-600' : 'text-red-600'}`}>
          {performer.score}
        </div>
      </div>
    </div>
  );
}

function CoreMetricsGrid({ 
  pendingTasks, 
  completedTasks, 
  activeFaults, 
  overdueChecklists,
  avgHealth,
  criticalEquipment,
  inModal = false,
  periodLabel = "",
  onNavigate
}: { 
  pendingTasks: number;
  completedTasks: number;
  activeFaults: number;
  overdueChecklists: number;
  avgHealth: number;
  criticalEquipment: number;
  inModal?: boolean;
  periodLabel?: string;
  onNavigate?: (path: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className={`grid ${inModal ? 'grid-cols-4' : 'grid-cols-2'} gap-2`}>
        <div 
          className="p-2 bg-yellow-500/10 rounded border border-yellow-500/20 cursor-pointer hover-elevate" 
          data-testid="card-pending-tasks"
          onClick={() => onNavigate?.('/gorevler')}
        >
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> Bekleyen
          </p>
          <p className="text-lg font-bold text-yellow-600 dark:text-yellow-500" data-testid="text-pending-tasks">
            {pendingTasks}
          </p>
        </div>

        <div 
          className="p-2 bg-green-500/10 rounded border border-green-500/20 cursor-pointer hover-elevate" 
          data-testid="card-completed-tasks"
          onClick={() => onNavigate?.('/gorevler')}
        >
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Tamamlanan
          </p>
          <p className="text-lg font-bold text-green-600 dark:text-green-500" data-testid="text-completed-tasks">
            {completedTasks}
          </p>
        </div>

        <div 
          className={`p-2 rounded border cursor-pointer hover-elevate ${
            activeFaults > 0 ? 'bg-destructive/10 border-destructive/20' : 'bg-green-500/10 border-green-500/20'
          }`}
          data-testid="card-active-faults"
          onClick={() => onNavigate?.('/ariza')}
        >
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Wrench className="h-3 w-3" /> Aktif Arıza
          </p>
          <p className={`text-lg font-bold ${activeFaults > 0 ? 'text-destructive' : 'text-green-600 dark:text-green-500'}`} data-testid="text-active-faults">
            {activeFaults}
          </p>
        </div>

        <div 
          className={`p-2 rounded border cursor-pointer hover-elevate ${
            overdueChecklists > 0 ? 'bg-orange-500/10 border-orange-500/20' : 'bg-green-500/10 border-green-500/20'
          }`}
          data-testid="card-overdue-checklists"
          onClick={() => onNavigate?.('/checklistler')}
        >
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Geciken
          </p>
          <p className={`text-lg font-bold ${overdueChecklists > 0 ? 'text-orange-600 dark:text-orange-500' : 'text-green-600 dark:text-green-500'}`} data-testid="text-overdue-checklists">
            {overdueChecklists}
          </p>
        </div>
      </div>

      <div 
        className="p-2 bg-background/50 rounded border border-primary/10 cursor-pointer hover-elevate" 
        data-testid="card-avg-health"
        onClick={() => onNavigate?.('/ekipman')}
      >
        <div className="flex justify-between items-center mb-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Wrench className="h-3 w-3" /> Ekipman Sağlığı
          </p>
          <div className="flex items-center gap-2">
            {criticalEquipment > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1 py-0">
                {criticalEquipment} kritik
              </Badge>
            )}
            <span className={`text-sm font-semibold ${
              avgHealth >= 80 ? 'text-green-600' : 
              avgHealth >= 50 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              %{avgHealth}
            </span>
          </div>
        </div>
        <Progress value={avgHealth} className="h-1.5" />
      </div>
    </div>
  );
}

export function EnhancedAnalyticsCard() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState<'daily' | 'weekly' | 'monthly' | null>(null);
  const [activePdfTab, setActivePdfTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const role = user?.role;

  const { data: daily, isLoading: dailyLoading, isError: dailyError } = useQuery<DailyAnalytics>({
    queryKey: ["/api/analytics/daily"],
  });

  const { data: weekly, isLoading: weeklyLoading, isError: weeklyError } = useQuery<WeeklyAnalytics>({
    queryKey: ["/api/analytics/weekly"],
  });

  const { data: monthly, isLoading: monthlyLoading, isError: monthlyError } = useQuery<MonthlyAnalytics>({
    queryKey: ["/api/analytics/monthly"],
  });

  // Check if any query is loading or has error
  const isAnyLoading = dailyLoading || weeklyLoading || monthlyLoading;
  const hasAnyError = dailyError || weeklyError || monthlyError;

  // PDF generation function
  const generatePDF = async (period: 'daily' | 'weekly' | 'monthly') => {
    const targetData = period === 'daily' ? daily : period === 'weekly' ? weekly : monthly;
    if (!targetData) {
      toast({
        title: "PDF olusturulamadi",
        description: "Rapor verileri henuz yuklenmedi. Lutfen sayfayi yenileyip tekrar deneyin.",
        variant: "destructive"
      });
      return;
    }

    setGeneratingPdf(period);
    
    try {
      const periodLabels = {
        daily: 'Gunluk Ozet Rapor',
        weekly: 'Haftalik Ozet Rapor',
        monthly: 'Aylik Ozet Rapor'
      };

      const branchName = (user as any)?.branch_name || (user as any)?.branchName || 'Genel Merkez';
      
      const { doc, yPos: startY } = await createPDFWithHeader({
        title: periodLabels[period],
        branchName,
        reportDate: new Date()
      });

      let yPos = startY;
      let data: any;
      let summaryText = '';
      
      if (period === 'daily' && daily) {
        data = daily;
        summaryText = daily.summary || '';
      } else if (period === 'weekly' && weekly) {
        data = weekly;
        summaryText = weekly.summary || '';
      } else if (period === 'monthly' && monthly) {
        data = monthly;
        summaryText = monthly.summary || '';
      }
      
      if (!data) {
        doc.text('Veri bulunamadi', 105, yPos, { align: 'center' });
        savePDF(doc, `DOSPRESSO_${period}_rapor.pdf`);
        return;
      }
      
      if (summaryText) {
        yPos = addSection(doc, 'AI Ozet', yPos);
        yPos = addParagraph(doc, sanitizeText(summaryText), yPos);
      }
      
      yPos = addSection(doc, 'Temel Metrikler', yPos);
      
      const metricsBody = [
        ['Bekleyen Gorevler', String(data.pendingTasks || 0)],
        ['Tamamlanan Gorevler', String(data.completedTasks || 0)],
        ['Aktif Arizalar', String(data.activeFaults || 0)],
        ['Geciken Checklistler', String(data.overdueChecklists || 0)],
        ['Kritik Ekipman', String(data.criticalEquipment || 0)],
        ['Ekipman Sagligi', `%${data.avgHealth || 0}`],
      ];
      
      if (period === 'monthly' && monthly) {
        metricsBody.push(
          ['Toplam Ariza', String(monthly.totalFaults || 0)],
          ['Cozulen Ariza', String(monthly.resolvedFaults || 0)],
          ['Toplam Gorev', String(monthly.totalTasks || 0)]
        );
      }
      
      if (period === 'weekly' && weekly) {
        metricsBody.push(['Tamamlanma Orani', `%${weekly.checklistCompletionRate || 0}`]);
      }
      
      yPos = addTable(doc, {
        head: [['Metrik', 'Deger']],
        body: metricsBody
      }, yPos);
      
      yPos += 10;
      
      const topPerformers = (period === 'weekly' ? weekly?.topPerformers : monthly?.topPerformers) || [];
      if (topPerformers.length > 0 && (role === 'supervisor' || role === 'admin' || role === 'coach')) {
        yPos = addSection(doc, 'En Iyi Performans Gosterenler', yPos);
        
        const perfData = topPerformers.map(p => [
          sanitizeText(p.name),
          `%${p.completionRate}`,
          String(p.score),
          `${p.absences} gun`
        ]);
        
        yPos = addTable(doc, {
          head: [['Isim', 'Tamamlama', 'Puan', 'Devamsizlik']],
          body: perfData
        }, yPos);
      }
      
      const now = new Date();
      const filename = `DOSPRESSO_${periodLabels[period].replace(/ /g, '_')}_${now.toISOString().split('T')[0]}.pdf`;
      savePDF(doc, filename);
      
    } catch (error) {
      console.error('PDF olusturma hatasi:', error);
      toast({
        title: "PDF olusturulamadi",
        description: "Rapor olusturulurken bir hata olustu. Lutfen tekrar deneyin.",
        variant: "destructive"
      });
    } finally {
      setGeneratingPdf(null);
    }
  };

  if (dailyLoading || weeklyLoading || monthlyLoading) {
    return (
      <Card className="border-primary/20 bg-primary/5 dark:bg-blue-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Özet Yükleniyor...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const renderContent = (inModal = false) => (
    <Tabs defaultValue="daily" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-4">
        <TabsTrigger value="daily" className="text-xs" data-testid="tab-daily">
          Günlük
        </TabsTrigger>
        <TabsTrigger value="weekly" className="text-xs" data-testid="tab-weekly">
          Haftalık
        </TabsTrigger>
        <TabsTrigger value="monthly" className="text-xs" data-testid="tab-monthly">
          Aylık
        </TabsTrigger>
      </TabsList>

      {/* DAILY */}
      <TabsContent value="daily" className="space-y-3">
        {daily && (
          <>
            {daily.summary && (
              <Alert className="bg-accent/10 border-accent/30">
                <AlertCircle className="h-3 w-3" />
                <AlertDescription className="text-xs font-semibold text-base" data-testid="text-daily-summary">
                  Günlük Özet: {daily.summary}
                </AlertDescription>
              </Alert>
            )}

            <CoreMetricsGrid
              pendingTasks={daily.pendingTasks}
              completedTasks={daily.completedTasks || 0}
              activeFaults={daily.activeFaults}
              overdueChecklists={daily.overdueChecklists}
              avgHealth={daily.avgHealth}
              criticalEquipment={daily.criticalEquipment}
              inModal={inModal}
              periodLabel="Bugün"
              onNavigate={navigate}
            />
          </>
        )}
      </TabsContent>

      {/* WEEKLY */}
      <TabsContent value="weekly" className="space-y-3">
        {weekly && (
          <>
            {weekly.summary && (
              <Alert className="bg-accent/10 border-accent/30">
                <AlertCircle className="h-3 w-3" />
                <AlertDescription className="text-xs font-semibold text-base" data-testid="text-weekly-summary">
                  Haftalık Özet: {weekly.summary}
                </AlertDescription>
              </Alert>
            )}

            <CoreMetricsGrid
              pendingTasks={weekly.pendingTasks}
              completedTasks={weekly.completedTasks}
              activeFaults={weekly.activeFaults}
              overdueChecklists={weekly.overdueChecklists}
              avgHealth={weekly.avgHealth}
              criticalEquipment={weekly.criticalEquipment}
              inModal={inModal}
              periodLabel="Bu Hafta"
              onNavigate={navigate}
            />

            {/* Checklist completion bar */}
            <div className="p-2 bg-background/50 rounded border border-primary/10 cursor-pointer hover-elevate" onClick={() => navigate('/checklistler')} data-testid="card-weekly-checklist-bar">
              <div className="flex justify-between items-center mb-1">
                <p className="text-xs text-muted-foreground">Tamamlanma Oranı</p>
                <span className={`text-xs font-medium ${
                  weekly.checklistCompletionRate >= 80 ? 'text-green-600' : 
                  weekly.checklistCompletionRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  %{weekly.checklistCompletionRate}
                </span>
              </div>
              <Progress 
                value={weekly.checklistCompletionRate} 
                className="h-1.5"
              />
            </div>

            {/* Top & Bottom Performers - Only for supervisors/HQ */}
            {(role === 'supervisor' || role === 'supervisor_buddy' || role === 'admin' || role === 'coach') && (
              <>
                {weekly.topPerformers?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Award className="h-3 w-3 text-green-500" /> En İyi Performans
                    </p>
                    <div className={`grid ${inModal ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                      {weekly.topPerformers.map((p) => (
                        <PerformerCard key={p.id} performer={p} isTop={true} />
                      ))}
                    </div>
                  </div>
                )}

                {weekly.bottomPerformers?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3 text-red-500" /> Gelişim Gerekli
                    </p>
                    <div className={`grid ${inModal ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                      {weekly.bottomPerformers.map((p) => (
                        <PerformerCard key={p.id} performer={p} isTop={false} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </TabsContent>

      {/* MONTHLY */}
      <TabsContent value="monthly" className="space-y-3">
        {monthly && (
          <>
            {monthly.summary && (
              <Alert className="bg-accent/10 border-accent/30">
                <AlertCircle className="h-3 w-3" />
                <AlertDescription className="text-xs font-semibold text-base" data-testid="text-monthly-summary">
                  Aylık Özet: {monthly.summary}
                </AlertDescription>
              </Alert>
            )}

            <CoreMetricsGrid
              pendingTasks={monthly.pendingTasks || 0}
              completedTasks={monthly.completedTasks}
              activeFaults={monthly.activeFaults}
              overdueChecklists={monthly.overdueChecklists || 0}
              avgHealth={monthly.avgHealth}
              criticalEquipment={monthly.criticalEquipment}
              inModal={inModal}
              periodLabel="Bu Ay"
              onNavigate={navigate}
            />

            {/* Fault Stats */}
            <div className={`grid ${inModal ? 'grid-cols-2' : 'grid-cols-2'} gap-2`}>
              <div className="p-2 bg-background/50 rounded border border-primary/10 cursor-pointer hover-elevate" onClick={() => navigate('/faults')} data-testid="card-monthly-total-faults">
                <p className="text-xs text-muted-foreground">Toplam Arıza</p>
                <p className="text-lg font-bold text-primary" data-testid="text-total-faults">
                  {monthly.totalFaults}
                </p>
              </div>

              <div className="p-2 bg-green-500/10 rounded border border-green-500/20 cursor-pointer hover-elevate" onClick={() => navigate('/faults')} data-testid="card-monthly-resolved">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  Çözülen <TrendIcon value={monthly.resolvedFaults} threshold={5} />
                </p>
                <p className="text-lg font-bold text-green-600 dark:text-green-500" data-testid="text-resolved-faults">
                  {monthly.resolvedFaults}
                </p>
              </div>
            </div>

            {/* Task Completion Rate */}
            <div className="p-2 bg-background/50 rounded border border-primary/10 cursor-pointer hover-elevate" onClick={() => navigate('/tasks')} data-testid="card-monthly-task-rate">
              <div className="flex justify-between items-center mb-1">
                <p className="text-xs text-muted-foreground">Görev Tamamlanma</p>
                <span className={`text-xs font-medium ${
                  monthly.totalTasks > 0 && (monthly.completedTasks / monthly.totalTasks * 100) >= 80 ? 'text-green-600' : 
                  monthly.totalTasks > 0 && (monthly.completedTasks / monthly.totalTasks * 100) >= 50 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  %{monthly.totalTasks > 0 ? Math.round((monthly.completedTasks / monthly.totalTasks) * 100) : 0}
                </span>
              </div>
              <Progress 
                value={monthly.totalTasks > 0 ? (monthly.completedTasks / monthly.totalTasks) * 100 : 0} 
                className="h-1.5"
              />
            </div>

            {/* Fault Resolution Rate */}
            <div className="p-2 bg-background/50 rounded border border-primary/10 cursor-pointer hover-elevate" onClick={() => navigate('/faults')} data-testid="card-monthly-resolution-rate">
              <div className="flex justify-between items-center mb-1">
                <p className="text-xs text-muted-foreground">Arıza Çözüm Oranı</p>
                <span className={`text-xs font-medium ${
                  monthly.totalFaults > 0 && (monthly.resolvedFaults / monthly.totalFaults * 100) >= 80 ? 'text-green-600' : 
                  monthly.totalFaults > 0 && (monthly.resolvedFaults / monthly.totalFaults * 100) >= 50 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  %{monthly.totalFaults > 0 ? Math.round((monthly.resolvedFaults / monthly.totalFaults) * 100) : 0}
                </span>
              </div>
              <Progress 
                value={monthly.totalFaults > 0 ? (monthly.resolvedFaults / monthly.totalFaults) * 100 : 0} 
                className="h-1.5"
              />
            </div>

            {/* Top & Bottom Performers - Only for supervisors/HQ */}
            {(role === 'supervisor' || role === 'supervisor_buddy' || role === 'admin' || role === 'coach') && (
              <>
                {monthly.topPerformers?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Award className="h-3 w-3 text-green-500" /> En İyi Performans
                    </p>
                    <div className={`grid ${inModal ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                      {monthly.topPerformers.map((p) => (
                        <PerformerCard key={p.id} performer={p} isTop={true} />
                      ))}
                    </div>
                  </div>
                )}

                {monthly.bottomPerformers?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3 text-red-500" /> Gelişim Gerekli
                    </p>
                    <div className={`grid ${inModal ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                      {monthly.bottomPerformers.map((p) => (
                        <PerformerCard key={p.id} performer={p} isTop={false} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Top Faulty Equipment */}
            {monthly.topFaultyEquipment?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-orange-500" /> En Çok Arıza Yapan Ekipman
                </p>
                <div className="space-y-1">
                  {monthly.topFaultyEquipment.map((eq, idx) => (
                    <div 
                      key={eq.id} 
                      className="flex items-center justify-between p-2 bg-orange-500/10 rounded border border-orange-500/20 cursor-pointer hover-elevate"
                      onClick={() => navigate(`/equipment`)}
                      data-testid={`faulty-equipment-${eq.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          #{idx + 1}
                        </Badge>
                        <span className="text-xs truncate">{eq.name}</span>
                      </div>
                      <Badge variant="destructive" className="text-[10px]">
                        {eq.count} arıza
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </TabsContent>
    </Tabs>
  );

  return (
    <>
      <Card 
        className="border-primary/20 bg-primary/5 dark:bg-blue-950/20 overflow-hidden"
        data-testid="analytics-card"
      >
        <CardHeader className="p-0 border-b border-primary/20">
          <div className="flex bg-primary/10 dark:bg-primary/5">
            <div className="px-4 py-2 flex items-center gap-2 bg-background border-r border-primary/20">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold whitespace-nowrap">Özet Rapor</span>
            </div>
            <div className="flex-1 flex justify-end items-center px-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-[10px] text-primary hover:bg-primary/10"
                onClick={() => setIsExpanded(true)}
                data-testid="button-expand-analytics"
              >
                Tıkla
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-primary">
                <Zap className="h-5 w-5" />
                Detaylı Özet Rapor
              </span>
            </DialogTitle>
          </DialogHeader>
          
          {/* PDF Download Buttons */}
          <div className="flex flex-wrap gap-2 pb-2 border-b">
            {hasAnyError && (
              <div className="w-full text-xs text-destructive mb-1">
                Bazı veriler yüklenemedi. Sayfayı yenileyip tekrar deneyin.
              </div>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => generatePDF('daily')}
              disabled={generatingPdf !== null || dailyLoading || !daily}
              className="flex-1 min-w-[100px]"
              data-testid="button-download-daily-pdf"
            >
              {generatingPdf === 'daily' || dailyLoading ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Download className="h-3 w-3 mr-1" />
              )}
              <span className="text-xs">Günlük PDF</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => generatePDF('weekly')}
              disabled={generatingPdf !== null || weeklyLoading || !weekly}
              className="flex-1 min-w-[100px]"
              data-testid="button-download-weekly-pdf"
            >
              {generatingPdf === 'weekly' || weeklyLoading ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Download className="h-3 w-3 mr-1" />
              )}
              <span className="text-xs">Haftalık PDF</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => generatePDF('monthly')}
              disabled={generatingPdf !== null || monthlyLoading || !monthly}
              className="flex-1 min-w-[100px]"
              data-testid="button-download-monthly-pdf"
            >
              {generatingPdf === 'monthly' || monthlyLoading ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Download className="h-3 w-3 mr-1" />
              )}
              <span className="text-xs">Aylık PDF</span>
            </Button>
          </div>
          
          {renderContent(true)}
        </DialogContent>
      </Dialog>
    </>
  );
}
