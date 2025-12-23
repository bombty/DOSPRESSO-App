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
import { useLocation } from "wouter";
import jsPDF from "jspdf";
import "jspdf-autotable";
import dospressoLogo from "@assets/IMG_5044_1766485101341.jpeg";

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
  periodLabel = ""
}: { 
  pendingTasks: number;
  completedTasks: number;
  activeFaults: number;
  overdueChecklists: number;
  avgHealth: number;
  criticalEquipment: number;
  inModal?: boolean;
  periodLabel?: string;
}) {
  return (
    <div className="space-y-3">
      <div className={`grid ${inModal ? 'grid-cols-4' : 'grid-cols-2'} gap-2`}>
        <div 
          className="p-2 bg-yellow-500/10 rounded border border-yellow-500/20" 
          data-testid="card-pending-tasks"
        >
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> Bekleyen
          </p>
          <p className="text-lg font-bold text-yellow-600 dark:text-yellow-500" data-testid="text-pending-tasks">
            {pendingTasks}
          </p>
        </div>

        <div 
          className="p-2 bg-green-500/10 rounded border border-green-500/20" 
          data-testid="card-completed-tasks"
        >
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Tamamlanan
          </p>
          <p className="text-lg font-bold text-green-600 dark:text-green-500" data-testid="text-completed-tasks">
            {completedTasks}
          </p>
        </div>

        <div 
          className={`p-2 rounded border ${
            activeFaults > 0 ? 'bg-destructive/10 border-destructive/20' : 'bg-green-500/10 border-green-500/20'
          }`}
          data-testid="card-active-faults"
        >
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Wrench className="h-3 w-3" /> Aktif Arıza
          </p>
          <p className={`text-lg font-bold ${activeFaults > 0 ? 'text-destructive' : 'text-green-600 dark:text-green-500'}`} data-testid="text-active-faults">
            {activeFaults}
          </p>
        </div>

        <div 
          className={`p-2 rounded border ${
            overdueChecklists > 0 ? 'bg-orange-500/10 border-orange-500/20' : 'bg-green-500/10 border-green-500/20'
          }`}
          data-testid="card-overdue-checklists"
        >
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Geciken
          </p>
          <p className={`text-lg font-bold ${overdueChecklists > 0 ? 'text-orange-600 dark:text-orange-500' : 'text-green-600 dark:text-green-500'}`} data-testid="text-overdue-checklists">
            {overdueChecklists}
          </p>
        </div>
      </div>

      <div className="p-2 bg-background/50 rounded border border-primary/10" data-testid="card-avg-health">
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

  // PDF generation function
  const generatePDF = async (period: 'daily' | 'weekly' | 'monthly') => {
    setGeneratingPdf(period);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 15;
      
      // Load and add logo
      const img = new Image();
      img.src = dospressoLogo;
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
      
      try {
        doc.addImage(img, 'JPEG', pageWidth / 2 - 25, yPos, 50, 20);
        yPos += 28;
      } catch {
        // Logo yüklenemezse devam et
        yPos += 5;
      }
      
      // Company header
      doc.setFontSize(18);
      doc.setTextColor(44, 62, 80);
      doc.text('DOSPRESSO Donut Coffee', pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;
      
      // Branch name
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      const branchName = (user as any)?.branch_name || (user as any)?.branchName || 'Genel Merkez';
      doc.text(`Şube: ${branchName}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 12;
      
      // Report title and date
      const periodLabels = {
        daily: 'Günlük Özet Rapor',
        weekly: 'Haftalık Özet Rapor',
        monthly: 'Aylık Özet Rapor'
      };
      
      doc.setFontSize(16);
      doc.setTextColor(52, 73, 94);
      doc.text(periodLabels[period], pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      const now = new Date();
      const dateStr = now.toLocaleDateString('tr-TR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.text(`Rapor Tarihi: ${dateStr}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 12;
      
      // Divider line
      doc.setDrawColor(200, 200, 200);
      doc.line(20, yPos, pageWidth - 20, yPos);
      yPos += 10;
      
      // Get data based on period
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
        doc.text('Veri bulunamadı', pageWidth / 2, yPos, { align: 'center' });
        doc.save(`DOSPRESSO_${period}_rapor_${now.toISOString().split('T')[0]}.pdf`);
        return;
      }
      
      // AI Summary Section
      if (summaryText) {
        doc.setFontSize(11);
        doc.setTextColor(52, 73, 94);
        doc.text('AI Özet:', 20, yPos);
        yPos += 6;
        
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        const summaryLines = doc.splitTextToSize(summaryText, pageWidth - 40);
        doc.text(summaryLines, 20, yPos);
        yPos += summaryLines.length * 5 + 8;
      }
      
      // Main metrics table
      doc.setFontSize(12);
      doc.setTextColor(52, 73, 94);
      doc.text('Temel Metrikler', 20, yPos);
      yPos += 6;
      
      const metricsData = [
        ['Metrik', 'Değer'],
        ['Bekleyen Görevler', String(data.pendingTasks || 0)],
        ['Tamamlanan Görevler', String(data.completedTasks || 0)],
        ['Aktif Arızalar', String(data.activeFaults || 0)],
        ['Geciken Checklistler', String(data.overdueChecklists || 0)],
        ['Kritik Ekipman', String(data.criticalEquipment || 0)],
        ['Ekipman Sağlığı', `%${data.avgHealth || 0}`],
      ];
      
      if (period === 'monthly' && monthly) {
        metricsData.push(
          ['Toplam Arıza', String(monthly.totalFaults || 0)],
          ['Çözülen Arıza', String(monthly.resolvedFaults || 0)],
          ['Toplam Görev', String(monthly.totalTasks || 0)]
        );
      }
      
      if (period === 'weekly' && weekly) {
        metricsData.push(['Tamamlanma Oranı', `%${weekly.checklistCompletionRate || 0}`]);
      }
      
      (doc as any).autoTable({
        startY: yPos,
        head: [metricsData[0]],
        body: metricsData.slice(1),
        theme: 'striped',
        headStyles: { fillColor: [52, 73, 94], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 3 },
        margin: { left: 20, right: 20 },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 10;
      
      // Top performers (for weekly/monthly)
      const topPerformers = (period === 'weekly' ? weekly?.topPerformers : monthly?.topPerformers) || [];
      if (topPerformers.length > 0 && (role === 'supervisor' || role === 'admin' || role === 'coach')) {
        doc.setFontSize(12);
        doc.setTextColor(52, 73, 94);
        doc.text('En İyi Performans Gösterenler', 20, yPos);
        yPos += 6;
        
        const perfData = topPerformers.map(p => [
          p.name,
          `%${p.completionRate}`,
          String(p.score),
          `${p.absences} gün`
        ]);
        
        (doc as any).autoTable({
          startY: yPos,
          head: [['İsim', 'Tamamlama', 'Puan', 'Devamsızlık']],
          body: perfData,
          theme: 'striped',
          headStyles: { fillColor: [39, 174, 96], textColor: 255 },
          styles: { fontSize: 9, cellPadding: 2 },
          margin: { left: 20, right: 20 },
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }
      
      // Footer
      const pageCount = doc.internal.pages.length - 1;
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `DOSPRESSO Franchise Yönetim Sistemi - Sayfa 1/${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
      
      // Save PDF
      const filename = `DOSPRESSO_${periodLabels[period].replace(/ /g, '_')}_${now.toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
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
            />

            {/* Checklist completion bar */}
            <div className="p-2 bg-background/50 rounded border border-primary/10 cursor-pointer hover-elevate" onClick={() => navigate('/checklists')} data-testid="card-weekly-checklist-bar">
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
        className="border-primary/20 bg-primary/5 dark:bg-blue-950/20 cursor-pointer hover-elevate p-2"
        onClick={() => setIsExpanded(true)}
        data-testid="analytics-card"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-primary font-medium">
            <Zap className="h-4 w-4" />
            Özet Rapor
          </div>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0.5">
            Tıkla
          </Badge>
        </div>
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
            <Button
              size="sm"
              variant="outline"
              onClick={() => generatePDF('daily')}
              disabled={generatingPdf !== null}
              className="flex-1 min-w-[100px]"
              data-testid="button-download-daily-pdf"
            >
              {generatingPdf === 'daily' ? (
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
              disabled={generatingPdf !== null}
              className="flex-1 min-w-[100px]"
              data-testid="button-download-weekly-pdf"
            >
              {generatingPdf === 'weekly' ? (
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
              disabled={generatingPdf !== null}
              className="flex-1 min-w-[100px]"
              data-testid="button-download-monthly-pdf"
            >
              {generatingPdf === 'monthly' ? (
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
