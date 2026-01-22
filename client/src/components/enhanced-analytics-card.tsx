import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, TrendingUp, TrendingDown, Minus, Wrench, Award, AlertTriangle, User, CheckCircle2, Clock, Download, Loader2 } from "lucide-react";
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
  onNavigate
}: { 
  pendingTasks: number;
  completedTasks: number;
  activeFaults: number;
  overdueChecklists: number;
  avgHealth: number;
  criticalEquipment: number;
  inModal?: boolean;
  onNavigate?: (path: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className={`grid ${inModal ? 'grid-cols-4' : 'grid-cols-2'} gap-2`}>
        <div 
          className="p-2 bg-yellow-500/10 rounded border border-yellow-500/20 cursor-pointer hover-elevate" 
          onClick={() => onNavigate?.('/gorevler')}
        >
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> Bekleyen
          </p>
          <p className="text-lg font-bold text-yellow-600 dark:text-yellow-500">
            {pendingTasks}
          </p>
        </div>

        <div 
          className="p-2 bg-green-500/10 rounded border border-green-500/20 cursor-pointer hover-elevate" 
          onClick={() => onNavigate?.('/gorevler')}
        >
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Tamamlanan
          </p>
          <p className="text-lg font-bold text-green-600 dark:text-green-500">
            {completedTasks}
          </p>
        </div>

        <div 
          className={`p-2 rounded border cursor-pointer hover-elevate ${
            activeFaults > 0 ? 'bg-destructive/10 border-destructive/20' : 'bg-green-500/10 border-green-500/20'
          }`}
          onClick={() => onNavigate?.('/ariza')}
        >
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Wrench className="h-3 w-3" /> Aktif Arıza
          </p>
          <p className={`text-lg font-bold ${activeFaults > 0 ? 'text-destructive' : 'text-green-600 dark:text-green-500'}`}>
            {activeFaults}
          </p>
        </div>

        <div 
          className={`p-2 rounded border cursor-pointer hover-elevate ${
            overdueChecklists > 0 ? 'bg-orange-500/10 border-orange-500/20' : 'bg-green-500/10 border-green-500/20'
          }`}
          onClick={() => onNavigate?.('/checklistler')}
        >
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Geciken
          </p>
          <p className={`text-lg font-bold ${overdueChecklists > 0 ? 'text-orange-600 dark:text-orange-500' : 'text-green-600 dark:text-green-500'}`}>
            {overdueChecklists}
          </p>
        </div>
      </div>

      <div 
        className="p-2 bg-background/50 rounded border border-primary/10 cursor-pointer hover-elevate" 
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

  const { data: daily, isLoading: dailyLoading } = useQuery<DailyAnalytics>({
    queryKey: ["/api/analytics/daily"],
  });

  const { data: weekly, isLoading: weeklyLoading } = useQuery<WeeklyAnalytics>({
    queryKey: ["/api/analytics/weekly"],
  });

  const { data: monthly, isLoading: monthlyLoading } = useQuery<MonthlyAnalytics>({
    queryKey: ["/api/analytics/monthly"],
  });

  const generatePDF = async (period: 'daily' | 'weekly' | 'monthly') => {
    const targetData = period === 'daily' ? daily : period === 'weekly' ? weekly : monthly;
    if (!targetData) {
      toast({
        title: "PDF oluşturulamadı",
        description: "Rapor verileri henüz yüklenmedi.",
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
      let data: any = targetData;
      let summaryText = data.summary || '';
      
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
      
      yPos = addTable(doc, {
        head: [['Metrik', 'Deger']],
        body: metricsBody
      }, yPos);
      
      const now = new Date();
      const filename = `DOSPRESSO_${periodLabels[period].replace(/ /g, '_')}_${now.toISOString().split('T')[0]}.pdf`;
      savePDF(doc, filename);
      
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      toast({
        title: "PDF oluşturulamadı",
        description: "Rapor oluşturulurken bir hata oluştu.",
        variant: "destructive"
      });
    } finally {
      setGeneratingPdf(null);
    }
  };

  const renderContent = (inModal = false) => (
    <Tabs defaultValue="daily" className="w-full" onValueChange={(v) => setActivePdfTab(v as any)}>
      <TabsList className="grid w-full grid-cols-3 mb-4">
        <TabsTrigger value="daily" className="text-xs">Günlük</TabsTrigger>
        <TabsTrigger value="weekly" className="text-xs">Haftalık</TabsTrigger>
        <TabsTrigger value="monthly" className="text-xs">Aylık</TabsTrigger>
      </TabsList>

      <TabsContent value="daily" className="space-y-3">
        {dailyLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : daily ? (
          <>
            {daily.summary && (
              <Alert className="bg-primary/5 border-primary/20">
                <AlertCircle className="h-3 w-3" />
                <AlertDescription className="text-xs font-medium">
                  {daily.summary}
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
              onNavigate={navigate}
            />
          </>
        ) : null}
      </TabsContent>

      <TabsContent value="weekly" className="space-y-3">
        {weeklyLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : weekly ? (
          <>
            {weekly.summary && (
              <Alert className="bg-primary/5 border-primary/20">
                <AlertCircle className="h-3 w-3" />
                <AlertDescription className="text-xs font-medium">
                  {weekly.summary}
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
              onNavigate={navigate}
            />
            
            <div className="p-2 bg-background/50 rounded border border-primary/10">
              <div className="flex justify-between items-center mb-1">
                <p className="text-xs text-muted-foreground">Tamamlanma Oranı</p>
                <span className={`text-xs font-medium ${
                  weekly.checklistCompletionRate >= 80 ? 'text-green-600' : 
                  weekly.checklistCompletionRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  %{weekly.checklistCompletionRate}
                </span>
              </div>
              <Progress value={weekly.checklistCompletionRate} className="h-1.5" />
            </div>

            {(role === 'supervisor' || role === 'supervisor_buddy' || role === 'admin' || role === 'coach') && weekly.topPerformers?.length > 0 && (
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

            {(role === 'supervisor' || role === 'supervisor_buddy' || role === 'admin' || role === 'coach') && weekly.bottomPerformers?.length > 0 && (
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
        ) : null}
      </TabsContent>

      <TabsContent value="monthly" className="space-y-3">
        {monthlyLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : monthly ? (
          <>
            {monthly.summary && (
              <Alert className="bg-primary/5 border-primary/20">
                <AlertCircle className="h-3 w-3" />
                <AlertDescription className="text-xs font-medium">
                  {monthly.summary}
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
              onNavigate={navigate}
            />

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-background/50 rounded border border-primary/10">
                <p className="text-xs text-muted-foreground">Toplam Arıza</p>
                <p className="text-lg font-bold text-primary">{monthly.totalFaults}</p>
              </div>
              <div className="p-2 bg-green-500/10 rounded border border-green-500/20">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  Çözülen <TrendIcon value={monthly.resolvedFaults} threshold={5} />
                </p>
                <p className="text-lg font-bold text-green-600 dark:text-green-500">{monthly.resolvedFaults}</p>
              </div>
            </div>

            {(role === 'supervisor' || role === 'supervisor_buddy' || role === 'admin' || role === 'coach') && monthly.topPerformers?.length > 0 && (
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
          </>
        ) : null}
      </TabsContent>
    </Tabs>
  );

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className="h-11 bg-card text-[10px] font-medium px-1"
        onClick={() => setIsExpanded(true)}
        data-testid="button-special-report"
      >
        Özet Rapor
      </Button>

      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="text-base font-semibold">
              AI Özet Rapor
            </DialogTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => generatePDF(activePdfTab)}
              disabled={generatingPdf !== null}
            >
              {generatingPdf === activePdfTab ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              PDF
            </Button>
          </DialogHeader>
          
          {renderContent(true)}
        </DialogContent>
      </Dialog>
    </>
  );
}
