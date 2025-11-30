import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { Html5Qrcode } from "html5-qrcode";
import { useState, useRef, useEffect } from "react";
import { CheckCircle, Clock, AlertTriangle, TrendingUp, Sparkles, RefreshCw, User, MapPin, Calendar, Image, Wrench, BarChart3, LineChart as LineChartIcon, Trophy, Award, Users, BookOpen, GraduationCap, QrCode, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useMemo } from "react";
import { useLocation } from "wouter";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { Task, EquipmentFault, PerformanceMetric, AISummaryResponse, SummaryCategoryType, User as UserType, Branch, TrainingModule, UserTrainingProgress } from "@shared/schema";
import { isBranchRole, isHQRole, UserRole } from "@shared/schema";
import { AdminDashboard } from "@/components/dashboards/admin-dashboard";
import { ManagerDashboard } from "@/components/dashboards/manager-dashboard";
import { BaristaDashboard } from "@/components/dashboards/barista-dashboard";
import { TeknikDashboard } from "@/components/dashboards/teknik-dashboard";
import { MuhasebeDashboard } from "@/components/dashboards/muhasebe-dashboard";

export default function Dashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SummaryCategoryType | null>(null);
  const [currentSummary, setCurrentSummary] = useState<AISummaryResponse | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  
  // Sheet state management
  const [taskSheetOpen, setTaskSheetOpen] = useState(false);
  const [faultSheetOpen, setFaultSheetOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedFault, setSelectedFault] = useState<EquipmentFault | null>(null);
  const [branchDetailOpen, setBranchDetailOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<any | null>(null);
  const [aiEvaluation, setAiEvaluation] = useState<any | null>(null);
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [branchScoresTimeRange, setBranchScoresTimeRange] = useState<'7d' | '30d' | '180d' | '365d'>('30d');
  const [checkInLoading, setCheckInLoading] = useState(false);

  // Fetch shifts for current user (supervisors/HQ only)
  const { data: myShifts } = useQuery<any[]>({
    queryKey: ["/api/shifts/my"],
    enabled: !!user && (user.role === 'supervisor' || user.role === 'supervisor_buddy' || isHQRole(user.role as any)),
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: faults = [], isLoading: faultsLoading } = useQuery<EquipmentFault[]>({
    queryKey: ["/api/faults"],
    queryFn: async () => {
      const response = await fetch("/api/faults");
      if (!response.ok) throw new Error("Failed to fetch faults");
      const data = await response.json();
      return Array.isArray(data) ? data : (data.data || []);
    },
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

  // Fetch performance scores for current user
  const { data: userPerformanceScores, isLoading: performanceLoading } = useQuery<any[]>({
    queryKey: ["/api/performance", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await fetch(`/api/performance/${user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch performance scores');
      const data = await response.json();
      // Map snake_case to camelCase
      return data.map((score: any) => ({
        ...score,
        dailyScore: score.daily_total_score || 0,
        weeklyScore: score.weekly_total_score || 0,
      }));
    },
  });

  // Fetch team performance aggregates (supervisor/branch manager only)
  const { data: teamPerformance, isLoading: teamPerformanceLoading } = useQuery<Array<{
    userId: string;
    firstName: string | null;
    lastName: string | null;
    username: string;
    averageScore: number;
    totalDays: number;
  }>>({
    queryKey: ["/api/performance/team"],
    enabled: !!user && isBranchRole(user.role as any),
  });

  // Fetch composite branch scores (HQ only)
  const { data: compositeBranchScores, isLoading: compositeScoresLoading } = useQuery<Array<{
    branchId: number;
    branchName: string;
    employeePerformanceScore: number;
    equipmentScore: number;
    qualityAuditScore: number;
    customerSatisfactionScore: number;
    compositeScore: number;
    lastUpdated: Date;
  }>>({
    queryKey: ["/api/performance/branches/composite", branchScoresTimeRange],
    enabled: !!user && isHQRole(user.role as any),
    queryFn: async () => {
      const response = await fetch(`/api/performance/branches/composite?timeRange=${branchScoresTimeRange}`);
      if (!response.ok) throw new Error('Failed to fetch composite branch scores');
      return response.json();
    },
  });

  // Fetch training modules
  const { data: trainingModules, isLoading: modulesLoading } = useQuery<TrainingModule[]>({
    queryKey: ["/api/training/modules"],
    enabled: !!user,
  });

  // Fetch user training progress
  const { data: userProgress, isLoading: progressLoading } = useQuery<any>({
    queryKey: ["/api/training/progress", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const response = await fetch(`/api/training/progress/${user.id}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Fetch user Academy dashboard data
  const { data: academyData, isLoading: academyLoading } = useQuery<any>({
    queryKey: ["/api/academy/user-dashboard"],
    enabled: !!user?.id,
  });

  // Fetch HQ Support tickets (for Admin dashboard)
  const { data: hqSupportTickets = [], isLoading: hqTicketsLoading } = useQuery<any[]>({
    queryKey: ["/api/hq-support/tickets"],
    enabled: !!user && isHQRole(user.role as any),
  });

  // Calculate weekly performance score from daily scores (not double-averaging)
  const weeklyPerformanceScore = useMemo(() => {
    if (!userPerformanceScores || userPerformanceScores.length === 0) return null;
    
    // Explicitly sort by date descending to ensure latest 7 days
    const sortedScores = [...userPerformanceScores].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    // Get last 7 days of DAILY scores and average them
    const last7Days = sortedScores.slice(0, 7);
    const totalScore = last7Days.reduce((sum, score) => sum + (score.dailyScore || 0), 0);
    return Math.round(totalScore / last7Days.length);
  }, [userPerformanceScores]);

  // Calculate training statistics from training progress summary
  const trainingStats = useMemo(() => {
    if (!userProgress) return { mandatory: 0, inProgress: 0, completed: 0 };
    
    // userProgress is now an object with summary stats
    return {
      mandatory: userProgress.summary?.total || 0,
      inProgress: userProgress.summary?.inProgress || 0,
      completed: userProgress.summary?.completed || 0,
    };
  }, [userProgress]);

  const completedTasks = tasks?.filter(t => t.status === "tamamlandi").length || 0;
  const pendingTasks = tasks?.filter(t => t.status === "beklemede").length || 0;
  const overdueTasks = tasks?.filter(t => t.status === "gecikmiş").length || 0;
  const openFaults = faults?.filter((f: EquipmentFault) => f.currentStage !== "kapatildi").length || 0;

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
    setLocation(`/ariza-detay/${fault.id}`);
  };

  const handleBranchClick = async (branch: any) => {
    setSelectedBranch(branch);
    setBranchDetailOpen(true);
    setAiEvaluation(null);
    
    // Fetch AI evaluation
    setEvaluationLoading(true);
    try {
      const response = await apiRequest("POST", `/api/performance/branches/${branch.branchId}/evaluation`, {});
      setAiEvaluation(response);
    } catch (error) {
      console.error("AI evaluation error:", error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "AI değerlendirmesi oluşturulamadı",
      });
    } finally {
      setEvaluationLoading(false);
    }
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

  // QR Scanner effect - direkt kamera açar
  useEffect(() => {
    if (!scannerActive) {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
      return;
    }

    const startScanner = async () => {
      const container = document.getElementById("dashboard-qr-scanner-container");
      if (!container) return;

      try {
        const html5QrCode = new Html5Qrcode("dashboard-qr-scanner-container");
        
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            handleQRData(decodedText);
            html5QrCode.stop().catch(() => {});
            scannerRef.current = null;
          },
          () => {}
        );

        scannerRef.current = html5QrCode;
      } catch (error) {
        console.error("[QR Scanner] Error:", error);
        toast({
          title: "Kamera Hatası",
          description: "Kameraya erişilemedi. Lütfen kamera izinlerini kontrol edin.",
          variant: "destructive",
        });
        setScannerActive(false);
      }
    };

    const timer = setTimeout(startScanner, 100);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [scannerActive]);

  const handleQRData = async (qrData: string) => {
    console.log("[Dashboard QR] Scanned:", qrData);
    setScannerActive(false);
    
    let pathname = qrData;
    
    // Handle absolute URLs
    try {
      const url = new URL(qrData);
      pathname = url.pathname;
    } catch {
      // Relative URL or path - use as is
    }
    
    console.log("[Dashboard QR] Parsed path:", pathname);
    
    // Match /ekipman/{id} or /equipment/{id} format
    if (pathname.startsWith('/ekipman/') || pathname.startsWith('/equipment/')) {
      const equipmentId = pathname.split(/\/ekipman\/|\/equipment\//)[1];
      if (equipmentId && !isNaN(parseInt(equipmentId))) {
        console.log("[Dashboard QR] Routing to equipment:", equipmentId);
        setLocation(`/ekipman/${equipmentId}`);
        return;
      }
    }
    
    // Match legacy format equipment:123 and branch:123
    const colonParts = qrData.split(':');
    if (colonParts.length === 2) {
      const type = colonParts[0]?.toLowerCase();
      const id = colonParts[1];
      
      if (type === 'branch' && user && (user.role === 'supervisor' || user.role === 'supervisor_buddy' || isHQRole(user.role as any))) {
        // Handle shift check-in for supervisors/HQ admins
        setCheckInLoading(true);
        try {
          if (myShifts && myShifts.length > 0) {
            await apiRequest('POST', '/api/shift-attendance/manual-check-in', {
              shiftId: myShifts[0].id,
              checkInMethod: 'qr_code'
            });
            toast({
              title: "Başarılı",
              description: "Vardiya girişi yapıldı",
            });
            // Refresh shifts
            return;
          }
        } catch (error: any) {
          console.error("Check-in error:", error);
          toast({
            title: "Hata",
            description: error.message || "Giriş yapılamadı",
            variant: "destructive",
          });
        } finally {
          setCheckInLoading(false);
        }
        return;
      } else if (type === 'shift' || type === 'branch') {
        setLocation('/vardiyalar');
        return;
      } else if (type === 'equipment' && id && !isNaN(parseInt(id))) {
        setLocation(`/ekipman/${id}`);
        return;
      }
    }
    
    // Legacy DOSPRESSO-EQ-123 format
    if (qrData.match(/^DOSPRESSO-EQ-\d+$/)) {
      const match = qrData.match(/DOSPRESSO-EQ-(\d+)$/);
      if (match && match[1]) {
        console.log("[Dashboard QR] Legacy format, equipment:", match[1]);
        setLocation(`/ekipman/${match[1]}`);
        return;
      }
    }
    
    console.error("[Dashboard QR] Unknown format:", qrData);
    toast({
      title: "Hata",
      description: "QR kod formatı tanınamadı",
      variant: "destructive",
    });
  };

  // Role-based dashboard selection
  const getRoleBasedDashboard = () => {
    if (!user?.role) return null;
    const role = user.role.toLowerCase();
    
    if (role === 'admin' || role === 'muhasebe' || role === 'satinalma') {
      return (
        <AdminDashboard
          compositeBranchScores={compositeBranchScores || []}
          isLoading={compositeScoresLoading}
          totalBranches={branches?.length || 0}
          totalFaults={faults?.length || 0}
          openFaults={openFaults}
          branchScoresTimeRange={branchScoresTimeRange}
          onTimeRangeChange={setBranchScoresTimeRange}
          hqSupportTickets={hqSupportTickets}
          hqTicketsLoading={hqTicketsLoading}
        />
      );
    } else if (role === 'supervisor' || role === 'supervisor_buddy' || role === 'coach') {
      return (
        <ManagerDashboard
          completedTasks={completedTasks}
          pendingTasks={pendingTasks}
          openFaults={openFaults}
          completionRate={completionRate}
          teamPerformance={teamPerformance}
          isLoading={teamPerformanceLoading || tasksLoading}
        />
      );
    } else if (role === 'barista' || role === 'bar_buddy' || role === 'stajyer') {
      return (
        <BaristaDashboard
          completedTasks={completedTasks}
          pendingTasks={pendingTasks}
          tasks={tasks}
          isLoading={tasksLoading}
          academyData={academyData}
          academyLoading={academyLoading}
        />
      );
    } else if (role === 'teknik') {
      return (
        <TeknikDashboard
          openFaults={openFaults}
          totalFaults={faults?.length || 0}
          faults={faults}
          isLoading={faultsLoading}
        />
      );
    }
    
    return null;
  };

  return (
    <div className="space-y-3 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-blue-900" data-testid="text-page-title">Kontrol Paneli</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">Operasyonel Özet</p>
        </div>
        {!scannerActive && (
          <Button 
            onClick={() => setScannerActive(true)}
            variant="outline"
            size="icon"
            title="QR Kod Tara"
            data-testid="button-open-qr-scanner"
          >
            <QrCode className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Inline QR Scanner */}
      {scannerActive && (
        <Card className="border-primary/50 bg-card/80 backdrop-blur-sm" data-testid="card-qr-scan-inline">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                QR Kod Tara
              </CardTitle>
              <CardDescription className="mt-1">
                QR kodu kameraya gösterin
              </CardDescription>
            </div>
            <Button
              onClick={() => setScannerActive(false)}
              variant="ghost"
              size="icon"
              data-testid="button-close-scanner"
            >
              <AlertCircle className="h-5 w-5 opacity-50" />
            </Button>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="border rounded-lg overflow-hidden bg-black/5">
              <div id="dashboard-qr-scanner-container" style={{ width: '100%' }} />
            </div>

            <Button 
              variant="outline" 
              onClick={() => setScannerActive(false)} 
              data-testid="button-close-qr-scanner"
              className="w-full"
            >
              Kapat
            </Button>
          </CardContent>
        </Card>
      )}

      <AnnouncementBanner />

      {/* Role-Based Dashboard Content */}
      {getRoleBasedDashboard()}

      {/* Legacy Dashboard Below (Hidden on Role-Specific Views) */}
      {(!user?.role || (user?.role && !['admin', 'muhasebe', 'satinalma', 'supervisor', 'supervisor_buddy', 'coach', 'barista', 'bar_buddy', 'stajyer', 'teknik'].includes(user.role.toLowerCase()))) && (
      <div className="grid gap-2 grid-cols-3 sm:gap-3 md:grid-cols-5">
        <Card 
          className="cursor-pointer hover-elevate transition-all border-l-4 border-l-green-500" 
          onClick={() => setLocation("/gorevler?status=onaylandi")}
          data-testid="card-completed-tasks"
        >
          <CardContent className="pt-2 pb-2 text-center">
            {tasksLoading ? (
              <Skeleton className="h-10 w-10 mx-auto" />
            ) : (
              <>
                <div className="flex justify-center mb-1">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-xl font-bold text-green-700" data-testid="text-completed-tasks">
                  {completedTasks}
                </div>
                <p className="text-xs text-muted-foreground">Tamamlandı</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover-elevate transition-all border-l-4 border-l-blue-600" 
          onClick={() => setLocation("/gorevler?status=beklemede")}
          data-testid="card-pending-tasks"
        >
          <CardContent className="pt-2 pb-2 text-center">
            {tasksLoading ? (
              <Skeleton className="h-10 w-10 mx-auto" />
            ) : (
              <>
                <div className="flex justify-center mb-1">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-xl font-bold text-blue-700" data-testid="text-pending-tasks">
                  {pendingTasks}
                </div>
                <p className="text-xs text-muted-foreground">Beklemede</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover-elevate transition-all border-l-4 border-l-red-600" 
          onClick={() => setLocation("/ekipman-arizalar")}
          data-testid="card-open-faults"
        >
          <CardContent className="pt-2 pb-2 text-center">
            {faultsLoading ? (
              <Skeleton className="h-10 w-10 mx-auto" />
            ) : (
              <>
                <div className="flex justify-center mb-1">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div className="text-xl font-bold text-red-700" data-testid="text-open-faults">
                  {openFaults}
                </div>
                <p className="text-xs text-muted-foreground">Arızalar</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-2 pb-2 text-center">
            {metricsLoading ? (
              <Skeleton className="h-10 w-10 mx-auto" />
            ) : (
              <>
                <div className="flex justify-center mb-1">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-xl font-bold text-blue-700" data-testid="text-completion-rate">
                  %{completionRate}
                </div>
                <p className="text-xs text-muted-foreground">Oran</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-performance-score" className="border-l-4 border-l-amber-500">
          <CardContent className="pt-2 pb-2 text-center">
            {performanceLoading ? (
              <Skeleton className="h-10 w-10 mx-auto" />
            ) : (
              <>
                <div className="flex justify-center mb-1">
                  <Award className="h-5 w-5 text-amber-600" />
                </div>
                <div className="text-xl font-bold text-amber-700" data-testid="text-performance-score">
                  {weeklyPerformanceScore !== null ? weeklyPerformanceScore : "-"}
                </div>
                <p className="text-xs text-muted-foreground">Performans</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      )}

      {canAccessAISummaries && (
        <>
          <Card className="hidden lg:block">
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

          <Card className="hidden lg:block">
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

      {/* Performance Details Section - Hidden on Mobile */}
      <Card data-testid="card-performance-details" className="hidden md:block">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Performans Detayları
          </CardTitle>
        </CardHeader>
        <CardContent>
          {performanceLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" data-testid="skeleton-performance-details-loading" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : weeklyPerformanceScore !== null ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Haftalık Ortalama</p>
                  <p className="text-2xl font-bold">{weeklyPerformanceScore}/100</p>
                </div>
                <Badge variant={weeklyPerformanceScore >= 80 ? "default" : weeklyPerformanceScore >= 60 ? "secondary" : "destructive"}>
                  {weeklyPerformanceScore >= 80 ? "Mükemmel" : weeklyPerformanceScore >= 60 ? "İyi" : "Gelişmeli"}
                </Badge>
              </div>
              
              {userPerformanceScores && userPerformanceScores.length > 0 && (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={userPerformanceScores.slice(0, 7).reverse()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                      />
                      <YAxis domain={[0, 100]} />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString('tr-TR')}
                        formatter={(value: number) => [value, "Skor"]}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="dailyScore" stroke="#8884d8" name="Günlük Skor" />
                      <Line type="monotone" dataKey="weeklyScore" stroke="#82ca9d" name="Haftalık Skor" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8" data-testid="empty-performance-details">
              Henüz performans verisi yok. Performans verileri günlük olarak hesaplanır.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Team Performance Section - Supervisor/Branch Manager Only - Hidden on Mobile */}
      {user && isBranchRole(user.role as any) && (
        <Card data-testid="card-team-performance" className="hidden md:block">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Takım Performansı (Son 7 Gün)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {teamPerformanceLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" data-testid="skeleton-team-loading" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : !teamPerformance ? (
              <p className="text-sm text-destructive text-center py-4" data-testid="error-team-performance">
                Takım performansı yüklenirken hata oluştu
              </p>
            ) : teamPerformance.length > 0 ? (
              <div className="space-y-2">
                {teamPerformance.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between border-b pb-2 last:border-0"
                    data-testid={`team-member-${member.userId}`}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {member.firstName && member.lastName 
                          ? `${member.firstName} ${member.lastName}` 
                          : member.username}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.totalDays} gün veri
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold" data-testid={`score-${member.userId}`}>
                        {member.averageScore}/100
                      </p>
                      <Badge 
                        variant={member.averageScore >= 80 ? "default" : member.averageScore >= 60 ? "secondary" : "destructive"}
                        className="mt-1"
                      >
                        {member.averageScore >= 80 ? "Mükemmel" : member.averageScore >= 60 ? "İyi" : "Gelişmeli"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4" data-testid="empty-team-performance">
                Henüz takım performans verisi yok
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Branch Performance Table - HQ Only - Hidden on Mobile */}
      {user && isHQRole(user.role as any) && (
        <Card data-testid="card-branches-performance" className="hidden lg:block">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Şube Performans Tablosu
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Tüm şubelerin kompozit performans skorları
                </p>
              </div>
              <Select value={branchScoresTimeRange} onValueChange={(value: any) => setBranchScoresTimeRange(value)}>
                <SelectTrigger className="w-[160px]" data-testid="select-timerange">
                  <SelectValue placeholder="Zaman Aralığı" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d" data-testid="option-7d">Son 7 Gün</SelectItem>
                  <SelectItem value="30d" data-testid="option-30d">Son 30 Gün</SelectItem>
                  <SelectItem value="180d" data-testid="option-180d">Son 6 Ay</SelectItem>
                  <SelectItem value="365d" data-testid="option-365d">Son 1 Yıl</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {/* Legend */}
            <div className="mb-4 p-3 bg-muted/50 rounded-md">
              <p className="text-xs font-medium mb-2">Skor Bileşenleri:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span>Personel: Çalışan performansı</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span>Ekipman: Cihaz durumu</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <span>Kalite: Denetim skorları</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                  <span>Misafir: Müşteri memnuniyeti</span>
                </div>
              </div>
            </div>

            {compositeScoresLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" data-testid="skeleton-branches-loading" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : !compositeBranchScores ? (
              <p className="text-sm text-destructive text-center py-4" data-testid="error-branches-performance">
                Şube performansları yüklenirken hata oluştu
              </p>
            ) : compositeBranchScores.length > 0 ? (
              <div className="space-y-3">
                {compositeBranchScores.map((branch) => (
                  <div
                    key={branch.branchId}
                    className="border rounded-md p-4 cursor-pointer hover-elevate transition-all"
                    onClick={() => handleBranchClick(branch)}
                    data-testid={`branch-clickable-${branch.branchId}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium mb-2">{branch.branchName}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span className="text-muted-foreground">Personel:</span>
                            <span className="font-medium">{Math.round(branch.employeePerformanceScore)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-muted-foreground">Ekipman:</span>
                            <span className="font-medium">{Math.round(branch.equipmentScore)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                            <span className="text-muted-foreground">Kalite:</span>
                            <span className="font-medium">{Math.round(branch.qualityAuditScore)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                            <span className="text-muted-foreground">Misafir:</span>
                            <span className="font-medium">{Math.round(branch.customerSatisfactionScore)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <div>
                          <p className="text-2xl font-bold" data-testid={`branch-score-${branch.branchId}`}>
                            {Math.round(branch.compositeScore)}
                          </p>
                          <p className="text-xs text-muted-foreground">Toplam Skor</p>
                        </div>
                        <Badge 
                          variant={branch.compositeScore >= 80 ? "default" : branch.compositeScore >= 60 ? "secondary" : "destructive"}
                        >
                          {branch.compositeScore >= 80 ? "Mükemmel" : branch.compositeScore >= 60 ? "İyi" : "Gelişmeli"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4" data-testid="empty-branches-performance">
                Henüz şube performans verisi yok
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Son Görevler</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {tasksLoading ? (
              <div className="space-y-1">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="space-y-1 text-sm">
                {tasks?.slice(0, 2).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between border-b pb-1 last:border-0 cursor-pointer hover-elevate rounded-md p-1 -m-1"
                    onClick={() => handleTaskClick(task)}
                    data-testid={`task-item-clickable-${task.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {task.description}
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
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Son Arızalar</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {faultsLoading ? (
              <div className="space-y-1">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="space-y-1 text-sm">
                {faults?.slice(0, 2).map((fault) => (
                  <div
                    key={fault.id}
                    className="flex items-center justify-between border-b pb-1 last:border-0 cursor-pointer hover-elevate rounded-md p-1 -m-1"
                    onClick={() => handleFaultClick(fault)}
                    data-testid={`fault-item-clickable-${fault.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {fault.equipmentName}
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
                    setLocation(`/yonetim/ekipman-yonetimi?equipmentId=${selectedFault.equipmentId}`);
                  }}
                  data-testid="button-view-fault-full"
                >
                  Ekipmanı Yönetim Sayfasında Aç
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Branch Performance Detail Sheet */}
      <Sheet open={branchDetailOpen} onOpenChange={setBranchDetailOpen}>
        <SheetContent className="overflow-y-auto w-[500px]">
          <SheetHeader>
            <SheetTitle>Şube Performans Detayları</SheetTitle>
            <SheetDescription>
              {selectedBranch?.branchName} - Kompozit performans analizi
            </SheetDescription>
          </SheetHeader>

          {selectedBranch && (
            <div className="space-y-6 mt-6">
              {/* Overall Composite Score */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-md">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Kompozit Skor</p>
                  <p className="text-3xl font-bold mt-1">{Math.round(selectedBranch.compositeScore)}/100</p>
                </div>
                <Badge 
                  variant={selectedBranch.compositeScore >= 80 ? "default" : selectedBranch.compositeScore >= 60 ? "secondary" : "destructive"}
                  className="text-lg px-4 py-2"
                  data-testid="badge-composite-score"
                >
                  {selectedBranch.compositeScore >= 80 ? "Mükemmel" : selectedBranch.compositeScore >= 60 ? "İyi" : "Gelişmeli"}
                </Badge>
              </div>

              {/* 4 Main Metrics */}
              <div>
                <h3 className="text-sm font-medium mb-3">Ana Performans Metrikleri</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm font-medium">Personel Performansı</span>
                    </div>
                    <span className="text-sm font-bold" data-testid="score-employee">{Math.round(selectedBranch.employeePerformanceScore)}/100</span>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium">Ekipman Durumu</span>
                    </div>
                    <span className="text-sm font-bold" data-testid="score-equipment">{Math.round(selectedBranch.equipmentScore)}/100</span>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                      <span className="text-sm font-medium">Kalite Denetimleri</span>
                    </div>
                    <span className="text-sm font-bold" data-testid="score-quality">{Math.round(selectedBranch.qualityAuditScore)}/100</span>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span className="text-sm font-medium">Misafir Memnuniyeti</span>
                    </div>
                    <span className="text-sm font-bold" data-testid="score-customer">{Math.round(selectedBranch.customerSatisfactionScore)}/100</span>
                  </div>
                </div>
              </div>

              {/* Metric Weights Info */}
              <div className="p-4 bg-muted/50 rounded-md">
                <p className="text-xs font-medium mb-2">Skor Ağırlıklandırması:</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>Personel: %40</div>
                  <div>Ekipman: %25</div>
                  <div>Kalite: %20</div>
                  <div>Misafir: %15</div>
                </div>
              </div>

              {/* AI Evaluation */}
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI Değerlendirme Raporu
                </h3>
                {evaluationLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                ) : aiEvaluation ? (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="p-4 bg-muted rounded-md">
                      <p className="text-sm">{aiEvaluation.summary}</p>
                    </div>

                    {/* Trend */}
                    <div className="flex items-center gap-2">
                      <Badge variant={aiEvaluation.trend === "improving" ? "default" : aiEvaluation.trend === "stable" ? "secondary" : "destructive"}>
                        {aiEvaluation.trend === "improving" ? "İyileşiyor" : aiEvaluation.trend === "stable" ? "Stabil" : "Azalıyor"}
                      </Badge>
                    </div>

                    {/* Strengths */}
                    {aiEvaluation.strengths && aiEvaluation.strengths.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-green-600 mb-2">Güçlü Yönler</h4>
                        <ul className="space-y-1">
                          {aiEvaluation.strengths.map((strength: string, idx: number) => (
                            <li key={idx} className="text-sm flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                              <span>{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Weaknesses */}
                    {aiEvaluation.weaknesses && aiEvaluation.weaknesses.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-amber-600 mb-2">Gelişme Alanları</h4>
                        <ul className="space-y-1">
                          {aiEvaluation.weaknesses.map((weakness: string, idx: number) => (
                            <li key={idx} className="text-sm flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                              <span>{weakness}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommendations */}
                    {aiEvaluation.recommendations && aiEvaluation.recommendations.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-primary mb-2">AI Önerileri</h4>
                        <ul className="space-y-1">
                          {aiEvaluation.recommendations.map((rec: string, idx: number) => (
                            <li key={idx} className="text-sm flex items-start gap-2">
                              <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">AI değerlendirmesi yüklenemedi</p>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

    </div>
  );
}
