import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ListSkeleton } from "@/components/list-skeleton";
import { EmptyState } from "@/components/empty-state";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ObjectUploader } from "@/components/ObjectUploader";
import { EmployeeOfMonthBadge } from "@/components/widgets/employee-of-month-widget";
import { 
  User, Calendar, Award, ClipboardCheck, Users,
  Clock, TrendingUp, AlertCircle, CheckCircle2, XCircle, LogOut, Camera, Trash2, Wallet, Banknote, 
  Timer, Plus, Loader2, Shield, Star, BookOpen, Target, Eye, Sparkles
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useBreadcrumb } from "@/components/breadcrumb-navigation";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type PersonnelProfile = {
  id: string;
  username: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phoneNumber: string | null;
  role: string;
  branchId: number | null;
  branchName: string | null;
  hireDate: string | null;
  probationEndDate: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  isActive: boolean;
  accountStatus: string;
  performanceScore: number | null;
  attendanceRate: number | null;
  latenessCount: number | null;
  absenceCount: number | null;
  totalShifts: number | null;
  completedShifts: number | null;
  profileImageUrl: string | null;
};

const roleLabels: Record<string, string> = {
  admin: "Admin",
  ceo: "CEO",
  cgo: "CGO",
  muhasebe_ik: "Muhasebe & İK",
  satinalma: "Satın Alma",
  coach: "Coach",
  marketing: "Marketing",
  trainer: "Trainer (Eğitmen)",
  kalite_kontrol: "Kalite Kontrol",
  fabrika_mudur: "Fabrika Müdürü",
  muhasebe: "Muhasebe",
  teknik: "Teknik",
  destek: "Destek",
  fabrika: "Fabrika",
  yatirimci_hq: "Yatırımcı HQ",
  stajyer: "Stajyer",
  bar_buddy: "Bar Buddy",
  barista: "Barista",
  supervisor_buddy: "Supervisor Buddy",
  supervisor: "Supervisor",
  mudur: "Müdür",
  yatirimci_branch: "Yatırımcı",
  fabrika_operator: "Fabrika Operatör",
  fabrika_sorumlu: "Fabrika Sorumlu",
  fabrika_personel: "Fabrika Personel",
};

export default function PersonelProfilPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const isOwnProfile = user?.id === id;

  const updatePhotoMutation = useMutation({
    mutationFn: async (profileImageUrl: string | null) => {
      return apiRequest("PUT", `/api/employees/${id}`, { profileImageUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/personnel', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: "Başarılı",
        description: "Profil fotoğrafı güncellendi",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message || "Fotoğraf güncellenemedi",
        variant: "destructive",
      });
    },
  });

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include' 
      });
      // Clear all queries and redirect
      window.location.href = '/';
    } catch (error) {
      window.location.href = '/';
    }
  };

  // Fetch personnel profile
  const { data: profile, isLoading } = useQuery<PersonnelProfile>({
    queryKey: ['/api/personnel', id],
    queryFn: async () => {
      const res = await fetch(`/api/personnel/${id}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      return res.json();
    },
    enabled: !!id,
  });

  useBreadcrumb(profile?.fullName || (profile?.firstName ? `${profile.firstName} ${profile.lastName}` : ''));

  // Check if user can view salary info (admin, muhasebe, yatirimci_branch for their branch)
  const canViewSalary = user?.role === 'admin' || user?.role === 'muhasebe' || 
    (user?.role === 'yatirimci_branch' && profile?.branchId === user?.branchId);

  // Fetch salary info if user has permission
  const { data: salary } = useQuery({
    queryKey: ['/api/salary/employee', id],
    queryFn: async () => {
      const res = await fetch(`/api/salary/employee/${id}`, {
        credentials: 'include',
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!id && canViewSalary,
  });

  // Performance summary
  type PerformanceSummary = {
    attendanceRate: number;
    taskCompletion: number;
    checklistScore: number;
    trainingProgress: number;
    inspectionScore: number;
    roleKpi: number;
    roleKpiLabel: string;
    evaluationScore: number;
    overallScore: number;
    isHQ: boolean;
  };

  const { data: perfSummary } = useQuery<PerformanceSummary>({
    queryKey: ['/api/personnel', id, 'performance-summary'],
    queryFn: async () => {
      const res = await fetch(`/api/personnel/${id}/performance-summary`, { credentials: 'include' });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!id && !!profile,
  });

  // Evaluations
  type StaffEvaluation = {
    id: number;
    employeeId: string;
    evaluatorId: string;
    evaluatorRole: string;
    evaluatorName: string;
    customerBehavior: number;
    friendliness: number;
    knowledgeExperience: number;
    dressCode: number;
    cleanliness: number;
    teamwork: number;
    punctuality: number;
    initiative: number;
    overallScore: number;
    notes: string | null;
    evaluationType: string;
    createdAt: string;
  };

  type EvaluationResponse = {
    evaluations: StaffEvaluation[];
    averageScore: number;
  };

  const { data: evalData } = useQuery<EvaluationResponse>({
    queryKey: ['/api/staff-evaluations', id],
    queryFn: async () => {
      const res = await fetch(`/api/staff-evaluations/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!id,
  });

  const canEvaluateRole = user?.role === 'coach' || user?.role === 'admin' || user?.role === 'supervisor' || user?.role === 'yatirimci_hq';

  const { data: evalLimitInfo } = useQuery<{ thisMonthCount: number; lastEvalDate: string | null; canEvaluateToday: boolean }>({
    queryKey: [`/api/staff-evaluations/${id}/limit-status`],
    enabled: !!id && canEvaluateRole && !isOwnProfile,
  });

  const [evalDialogOpen, setEvalDialogOpen] = useState(false);
  const [evalForm, setEvalForm] = useState({
    customerBehavior: 3,
    friendliness: 3,
    knowledgeExperience: 3,
    dressCode: 3,
    cleanliness: 3,
    teamwork: 3,
    punctuality: 3,
    initiative: 3,
    notes: "",
    evaluationType: "standard",
  });

  const createEvalMutation = useMutation({
    mutationFn: async (data: typeof evalForm & { employeeId: string }) => {
      return apiRequest("POST", "/api/staff-evaluations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff-evaluations', id] });
      queryClient.invalidateQueries({ queryKey: [`/api/staff-evaluations/${id}/limit-status`] });
      queryClient.invalidateQueries({ queryKey: ['/api/personnel', id, 'performance-summary'] });
      setEvalDialogOpen(false);
      setEvalForm({
        customerBehavior: 3, friendliness: 3, knowledgeExperience: 3, dressCode: 3,
        cleanliness: 3, teamwork: 3, punctuality: 3, initiative: 3, notes: "", evaluationType: "standard",
      });
      toast({ title: "Değerlendirme kaydedildi" });
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  // Overtime request state
  const [overtimeMinutes, setOvertimeMinutes] = useState<string>("");
  const [overtimeReason, setOvertimeReason] = useState<string>("");

  // Fetch user's overtime requests (only for own profile)
  const { data: overtimeRequests = [], isLoading: isLoadingOvertime } = useQuery<{
    id: number;
    requestedMinutes: number;
    reason: string;
    status: string;
    approvedMinutes: number | null;
    rejectionReason: string | null;
    createdAt: string;
    appliedToPeriod: string | null;
  }[]>({
    queryKey: ['/api/overtime-requests', id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/overtime-requests?userId=${id}`);
      return res.json();
    },
    enabled: !!id && isOwnProfile,
  });

  // Create overtime request mutation
  const createOvertimeMutation = useMutation({
    mutationFn: async (data: { requestedMinutes: number; reason: string }) => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const res = await apiRequest("POST", "/api/overtime-requests", {
        requestedMinutes: data.requestedMinutes,
        reason: data.reason,
        appliedToPeriod: currentMonth,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/overtime-requests', id] });
      setOvertimeMinutes("");
      setOvertimeReason("");
      toast({
        title: "Mesai talebi oluşturuldu",
        description: "Talebiniz onay için gönderildi",
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Mesai talebi oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  const handleCreateOvertimeRequest = () => {
    const minutes = parseInt(overtimeMinutes);
    if (isNaN(minutes) || minutes <= 0) {
      toast({ title: "Geçersiz süre", variant: "destructive" });
      return;
    }
    if (!overtimeReason.trim()) {
      toast({ title: "Açıklama gerekli", variant: "destructive" });
      return;
    }
    createOvertimeMutation.mutate({ requestedMinutes: minutes, reason: overtimeReason.trim() });
  };

  type AIRecommendations = {
    weakAreas: string[];
    recommendations: string[];
    targetPlan: string[];
    overallAdvice: string;
    levelRisk: boolean;
  };

  const [aiRecsRequested, setAiRecsRequested] = useState(false);
  const { data: aiRecs, isLoading: isLoadingAiRecs, error: aiRecsError } = useQuery<AIRecommendations>({
    queryKey: ['/api/personnel', id, 'ai-recommendations'],
    queryFn: async () => {
      const res = await fetch(`/api/personnel/${id}/ai-recommendations`, { credentials: 'include' });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!id && aiRecsRequested,
  });

  type LeaveSalarySummary = {
    annualLeaveTotal: number;
    usedLeave: number;
    remainingLeave: number;
    renewalDate: string;
    unpaidLeaveDays: number;
    latenessCount: number;
    baseSalary: number | null;
    canViewSalary: boolean;
  };

  const { data: leaveSalary } = useQuery<LeaveSalarySummary>({
    queryKey: ['/api/personnel', id, 'leave-salary-summary'],
    queryFn: async () => {
      const res = await fetch(`/api/personnel/${id}/leave-salary-summary`, { credentials: 'include' });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!id && !!profile,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 sm:gap-4 p-3">
        <ListSkeleton count={4} variant="card" showHeader />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-3">
        <EmptyState
          icon={User}
          title="Personel bulunamadı"
          description="İstediğiniz personel bilgisi bulunamadı."
          actionLabel="İK Yönetimine Dön"
          onAction={() => setLocation("/ik")}
          data-testid="empty-state-profile"
        />
      </div>
    );
  }

  const performanceScore = profile.performanceScore || 0;
  const attendanceRate = profile.attendanceRate || 0;

  const canEvaluate = user?.role === 'coach' || user?.role === 'admin' || user?.role === 'supervisor' || user?.role === 'yatirimci_hq';

  return (
    <div className="min-h-screen pb-20">
      <div className="p-3 flex flex-col gap-3 sm:gap-4">
        {/* Profile Header with Photo */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative">
            <Avatar className="w-20 h-20 border-2 border-border">
              {profile.profileImageUrl ? (
                <AvatarImage src={profile.profileImageUrl} alt="Profil" className="object-cover" />
              ) : (
                <AvatarFallback className="text-xl">
                  {(profile.firstName?.[0] || "") + (profile.lastName?.[0] || "")}
                </AvatarFallback>
              )}
            </Avatar>
            {isOwnProfile && profile.profileImageUrl && (
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full"
                onClick={() => updatePhotoMutation.mutate(null)}
                disabled={updatePhotoMutation.isPending}
                data-testid="button-remove-profile-photo"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate" data-testid="text-fullname">{profile.fullName}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{roleLabels[profile.role] || profile.role}</Badge>
              {profile.branchName && (
                <Badge variant="secondary">{profile.branchName}</Badge>
              )}
              <EmployeeOfMonthBadge userId={profile.id} />
            </div>
            {isOwnProfile && (
              <div className="mt-2">
                <ObjectUploader
                  onGetUploadParameters={async () => {
                    const res = await fetch("/api/objects/upload", {
                      method: "POST",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" }
                    });
                    if (!res.ok) throw new Error("Yükleme URL'si alınamadı");
                    return res.json();
                  }}
                  onComplete={(result) => {
                    if (result.successful?.[0]?.uploadURL) {
                      updatePhotoMutation.mutate(result.successful[0].uploadURL);
                    }
                  }}
                  maxFileSize={3 * 1024 * 1024}
                  buttonClassName="h-8"
                >
                  <Camera className="w-3 h-3 mr-1" />
                  Fotoğraf Değiştir
                </ObjectUploader>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={profile.isActive ? "default" : "secondary"} data-testid="personnel-status">
              {profile.isActive ? "Aktif" : "Pasif"}
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation("/gizlilik-politikasi")}
              data-testid="button-privacy-policy"
            >
              <Shield className="h-4 w-4 mr-2" />
              KVKK
            </Button>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Çıkış
            </Button>
          </div>
        </div>

      {/* Performance Overview Card */}
      {(() => {
        const overall = perfSummary?.overallScore ?? performanceScore;
        const scoreColor = overall >= 75 ? "text-emerald-500" : overall >= 65 ? "text-amber-500" : "text-red-500";
        const ringColor = overall >= 75 ? "stroke-emerald-500" : overall >= 65 ? "stroke-amber-500" : "stroke-red-500";
        const isHQProfile = perfSummary?.isHQ ?? false;
        const metrics = [
          { label: "Devam Oranı", value: perfSummary?.attendanceRate ?? attendanceRate, weight: "15%", icon: Clock },
          { label: "Görev Tamamlama", value: perfSummary?.taskCompletion ?? 0, weight: "20%", icon: Target },
          { label: "Checklist Skoru", value: perfSummary?.checklistScore ?? 0, weight: isHQProfile ? "15%" : "20%", icon: ClipboardCheck },
          { label: "Eğitim İlerlemesi", value: perfSummary?.trainingProgress ?? 0, weight: "10%", icon: BookOpen },
          { label: perfSummary?.roleKpiLabel || "Denetim Puanı", value: perfSummary?.roleKpi ?? perfSummary?.inspectionScore ?? 0, weight: isHQProfile ? "20%" : "15%", icon: Eye },
          { label: "Değerlendirme Puanı", value: perfSummary?.evaluationScore ?? 0, weight: "20%", icon: Star },
        ];
        const circumference = 2 * Math.PI * 54;
        const strokeDashoffset = circumference - (overall / 100) * circumference;

        return (
          <Card className="border-2" data-testid="card-performance-overview">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                Genel Performans
              </CardTitle>
              <CardDescription>Son 30 günlük performans özeti</CardDescription>
            </CardHeader>
            <CardContent className="w-full space-y-4">
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" strokeWidth="8" className="stroke-muted/30" />
                    <circle cx="60" cy="60" r="54" fill="none" strokeWidth="8" className={ringColor}
                      strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                      style={{ transition: "stroke-dashoffset 0.5s ease" }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-3xl font-bold ${scoreColor}`} data-testid="performance-score">
                      {overall.toFixed(0)}
                    </span>
                    <span className="text-xs text-muted-foreground">Genel Skor</span>
                  </div>
                </div>

                {overall < 65 && (
                  <Badge variant="destructive" data-testid="badge-critical-warning">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Kritik: Seviye düşüşü riski!
                  </Badge>
                )}
                {overall >= 65 && overall < 75 && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" data-testid="badge-warning">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Dikkat: Skorunuz düşük, iyileştirme gerekli
                  </Badge>
                )}
              </div>

              <div className="w-full space-y-3">
                {metrics.map((m) => {
                  const mColor = m.value >= 75 ? "text-emerald-600" : m.value >= 65 ? "text-amber-600" : "text-red-600";
                  return (
                    <div key={m.label} data-testid={`metric-${m.label.toLowerCase().replace(/\s+/g, '-')}`}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 text-sm">
                          <m.icon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{m.label}</span>
                          <span className="text-xs text-muted-foreground">({m.weight})</span>
                        </div>
                        <span className={`text-sm font-semibold ${mColor}`}>{m.value.toFixed(0)}%</span>
                      </div>
                      <Progress value={m.value} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* AI Performance Coach Card */}
      <Card data-testid="card-ai-performance-coach">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Performans Koçu
          </CardTitle>
          <CardDescription>Yapay zeka destekli kişisel performans analizi ve öneriler</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!aiRecs && !isLoadingAiRecs && (
            <Button
              onClick={() => setAiRecsRequested(true)}
              data-testid="button-get-ai-recommendations"
              className="w-full"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Öneriler Al
            </Button>
          )}

          {isLoadingAiRecs && (
            <div className="flex items-center justify-center gap-2 py-6" data-testid="ai-recommendations-loading">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">AI analiz yapıyor...</span>
            </div>
          )}

          {aiRecsError && (
            <div className="text-sm text-destructive text-center py-4" data-testid="ai-recommendations-error">
              Öneriler yüklenirken hata oluştu. Lütfen tekrar deneyin.
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => {
                  setAiRecsRequested(false);
                  setTimeout(() => setAiRecsRequested(true), 100);
                }}
                data-testid="button-retry-ai-recommendations"
              >
                Tekrar Dene
              </Button>
            </div>
          )}

          {aiRecs && (
            <div className="space-y-4" data-testid="ai-recommendations-content">
              {aiRecs.levelRisk && (
                <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800" data-testid="ai-level-risk-warning">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-700 dark:text-red-400">Kritik Uyarı</p>
                      <p className="text-sm text-red-600 dark:text-red-300">
                        Seviye düşüşü riski! Bir sonraki ayda seviyeniz düşebilir ve priminiz azalabilir.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!aiRecs.levelRisk && perfSummary && perfSummary.overallScore < 75 && (
                <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800" data-testid="ai-score-warning">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Performans skorunuz düşük. Aşağıdaki önerilere dikkat ederek seviyenizi koruyabilirsiniz.
                    </p>
                  </div>
                </div>
              )}

              {aiRecs.weakAreas.length > 0 && (
                <div data-testid="ai-weak-areas">
                  <p className="text-sm font-semibold mb-2">Zayıf Alanlar</p>
                  <div className="flex flex-wrap gap-1.5">
                    {aiRecs.weakAreas.map((area, i) => (
                      <Badge key={i} variant="destructive" data-testid={`badge-weak-area-${i}`}>
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {aiRecs.recommendations.length > 0 && (
                <div data-testid="ai-recommendations-list">
                  <p className="text-sm font-semibold mb-2">İyileştirme Önerileri</p>
                  <ol className="space-y-1.5 pl-4 list-decimal">
                    {aiRecs.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-muted-foreground" data-testid={`text-recommendation-${i}`}>
                        {rec}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {aiRecs.targetPlan.length > 0 && (
                <div data-testid="ai-target-plan">
                  <p className="text-sm font-semibold mb-2">Hedef Plan</p>
                  <ul className="space-y-1.5">
                    {aiRecs.targetPlan.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm" data-testid={`text-target-plan-${i}`}>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {aiRecs.overallAdvice && (
                <div className="p-3 rounded-md bg-muted/50" data-testid="ai-overall-advice">
                  <p className="text-sm font-medium mb-1">Genel Tavsiye</p>
                  <p className="text-sm text-muted-foreground">{aiRecs.overallAdvice}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Vardiya</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="total-shifts">
              {profile.totalShifts || 0}
            </div>
            <p className="text-xs text-muted-foreground">Bu ay</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tamamlanan</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="completed-shifts">
              {profile.completedShifts || 0}
            </div>
            <p className="text-xs text-muted-foreground">Vardiya</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Geç Kalma</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="lateness-count">
              {profile.latenessCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">Kez</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Devamsızlık</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="absence-count">
              {profile.absenceCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">Gün</p>
          </CardContent>
        </Card>
      </div>

      {/* Salary Information - Only visible to authorized roles */}
      {canViewSalary && salary && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                Maaş Bilgileri
              </CardTitle>
              <CardDescription>Personelin maaş ve ödeme detayları</CardDescription>
            </div>
            {(user?.role === 'admin' || user?.role === 'muhasebe') && (
              <Link href={`/personel-duzenle/${id}`}>
                <Button variant="outline" size="sm" data-testid="button-edit-salary">
                  Düzenle
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Çalışma Tipi</p>
                <p className="text-base font-medium" data-testid="salary-employment-type">
                  {salary.employmentType === 'fulltime' ? 'Tam Zamanlı' : 'Yarı Zamanlı'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Haftalık Saat</p>
                <p className="text-base font-medium" data-testid="salary-weekly-hours">
                  {salary.weeklyHours || 45} saat
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Brüt Maaş</p>
                <p className="text-base font-medium" data-testid="salary-base">
                  {((salary.baseSalary || 0) / 100).toLocaleString('tr-TR')} TL
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Maaş</p>
                <p className="text-base font-medium" data-testid="salary-net">
                  {((salary.netSalary || 0) / 100).toLocaleString('tr-TR')} TL
                </p>
              </div>
              {salary.employmentType === 'parttime' && salary.hourlyRate > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Saatlik Ücret</p>
                  <p className="text-base font-medium" data-testid="salary-hourly">
                    {((salary.hourlyRate || 0) / 100).toLocaleString('tr-TR')} TL
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ödeme Günü</p>
                <p className="text-base font-medium" data-testid="salary-payment-day">
                  Her ayın {salary.paymentDay || 1}. günü
                </p>
              </div>
              {salary.bankName && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Banka</p>
                  <p className="text-base font-medium" data-testid="salary-bank">
                    {salary.bankName}
                  </p>
                </div>
              )}
              {salary.iban && (
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">IBAN</p>
                  <p className="text-base font-mono" data-testid="salary-iban">
                    {salary.iban}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs className="w-full flex flex-col gap-3 sm:gap-4">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="bilgiler" data-testid="tab-info" className="flex-1 min-w-fit">Kişisel Bilgiler</TabsTrigger>
          <TabsTrigger value="performans" data-testid="tab-performance" className="flex-1 min-w-fit">Performans</TabsTrigger>
          <TabsTrigger value="denetimler" data-testid="tab-audits" className="flex-1 min-w-fit">Denetimler</TabsTrigger>
          <TabsTrigger value="vardiyalar" data-testid="tab-shifts" className="flex-1 min-w-fit">Vardiyalar</TabsTrigger>
          {isOwnProfile && (
            <TabsTrigger value="mesai" data-testid="tab-overtime" className="flex-1 min-w-fit">Mesai Talepleri</TabsTrigger>
          )}
          <TabsTrigger value="akademi" data-testid="tab-academy" className="flex-1 min-w-fit">Akademi</TabsTrigger>
          <TabsTrigger value="degerlendirmeler" data-testid="tab-evaluations" className="flex-1 min-w-fit">Değerlendirmeler</TabsTrigger>
        </TabsList>

        <TabsContent value="bilgiler" className="flex flex-col gap-3">
          <Card>
            <CardHeader>
              <CardTitle>Personel Bilgileri</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Kullanıcı Adı</p>
                  <p className="text-base" data-testid="info-username">{profile.username}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">E-posta</p>
                  <p className="text-base" data-testid="info-email">{profile.email || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Telefon</p>
                  <p className="text-base" data-testid="info-phone">{profile.phoneNumber || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">İşe Başlama</p>
                  <p className="text-base" data-testid="info-hire-date">
                    {profile.hireDate 
                      ? format(new Date(profile.hireDate), "d MMMM yyyy", { locale: tr })
                      : "-"
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Deneme Süresi Bitiş</p>
                  <p className="text-base" data-testid="info-probation-end">
                    {profile.probationEndDate 
                      ? format(new Date(profile.probationEndDate), "d MMMM yyyy", { locale: tr })
                      : "-"
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Acil Durum İletişim</p>
                  <p className="text-base" data-testid="info-emergency-contact">
                    {profile.emergencyContact || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Acil Durum Telefon</p>
                  <p className="text-base" data-testid="info-emergency-phone">
                    {profile.emergencyPhone || "-"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leave & Salary Card */}
          {leaveSalary && (
            <Card data-testid="card-leave-salary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  İzin & Maaş Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div data-testid="leave-info-section">
                  <p className="text-sm font-semibold mb-3">İzin Durumu</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Yıllık İzin Hakkı</p>
                      <p className="text-base font-medium" data-testid="text-annual-leave-total">{leaveSalary.annualLeaveTotal} gün</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Kullanılan İzin</p>
                      <p className="text-base font-medium" data-testid="text-used-leave">{leaveSalary.usedLeave} gün</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Kalan İzin</p>
                      <p className="text-base font-medium" data-testid="text-remaining-leave">
                        <Badge variant={leaveSalary.remainingLeave <= 3 ? "destructive" : "secondary"}>
                          {leaveSalary.remainingLeave} gün
                        </Badge>
                      </p>
                    </div>
                    {leaveSalary.renewalDate && (
                      <div>
                        <p className="text-sm text-muted-foreground">Yıllık İzin Yenilenme</p>
                        <p className="text-base font-medium" data-testid="text-renewal-date">{leaveSalary.renewalDate}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Ücretsiz İzin Günleri</p>
                      <p className="text-base font-medium" data-testid="text-unpaid-leave">{leaveSalary.unpaidLeaveDays} gün</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm text-muted-foreground">İzin Kullanım Oranı</span>
                      <span className="text-sm font-medium">{leaveSalary.annualLeaveTotal > 0 ? Math.round((leaveSalary.usedLeave / leaveSalary.annualLeaveTotal) * 100) : 0}%</span>
                    </div>
                    <Progress value={leaveSalary.annualLeaveTotal > 0 ? (leaveSalary.usedLeave / leaveSalary.annualLeaveTotal) * 100 : 0} className="h-2" />
                  </div>
                </div>

                {leaveSalary.canViewSalary && leaveSalary.baseSalary !== null && (
                  <div data-testid="salary-info-section">
                    <p className="text-sm font-semibold mb-3">Maaş Özeti</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Temel Maaş</p>
                        <p className="text-base font-medium" data-testid="text-base-salary">
                          {leaveSalary.baseSalary > 0 ? `${leaveSalary.baseSalary.toLocaleString('tr-TR')} ₺` : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Prim</p>
                        <p className="text-base font-medium" data-testid="text-bonus">
                          {leaveSalary.baseSalary > 0 && perfSummary
                            ? `${Math.round(leaveSalary.baseSalary * (perfSummary.overallScore >= 85 ? 0.15 : perfSummary.overallScore >= 70 ? 0.10 : 0.05)).toLocaleString('tr-TR')} ₺`
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Ücretsiz İzin Kesintisi</p>
                        <p className="text-base font-medium" data-testid="text-unpaid-deduction">
                          {leaveSalary.baseSalary > 0 && leaveSalary.unpaidLeaveDays > 0
                            ? `-${Math.round((leaveSalary.baseSalary / 30) * leaveSalary.unpaidLeaveDays).toLocaleString('tr-TR')} ₺`
                            : '0 ₺'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Geç Kalma Kesintisi</p>
                        <p className="text-base font-medium" data-testid="text-lateness-deduction">
                          {leaveSalary.latenessCount > 0
                            ? `-${(leaveSalary.latenessCount * 50).toLocaleString('tr-TR')} ₺`
                            : '0 ₺'}
                        </p>
                      </div>
                    </div>
                    {leaveSalary.baseSalary > 0 && (
                      <div className="mt-3 p-3 rounded-md bg-muted/50">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold">Tahmini Net</span>
                          <span className="text-base font-bold" data-testid="text-estimated-net">
                            {(() => {
                              const bonus = perfSummary
                                ? leaveSalary.baseSalary * (perfSummary.overallScore >= 85 ? 0.15 : perfSummary.overallScore >= 70 ? 0.10 : 0.05)
                                : 0;
                              const unpaidDeduction = (leaveSalary.baseSalary / 30) * leaveSalary.unpaidLeaveDays;
                              const latenessDeduction = leaveSalary.latenessCount * 50;
                              const estimated = leaveSalary.baseSalary + bonus - unpaidDeduction - latenessDeduction;
                              return `${Math.round(estimated).toLocaleString('tr-TR')} ₺`;
                            })()}
                          </span>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2" data-testid="text-salary-note">
                      Detaylı maaş bilgileri için İK departmanına başvurunuz.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="performans" className="flex flex-col gap-3">
          <Card>
            <CardHeader>
              <CardTitle>Performans Metrikleri</CardTitle>
              <CardDescription>Detaylı performans analizi yakında eklenecek</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Bu bölümde haftalık performans trendleri, görev tamamlama oranları ve gelişim grafikleri görüntülenecek.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="denetimler" className="flex flex-col gap-3">
          <Card>
            <CardHeader>
              <CardTitle>Personel Denetimleri</CardTitle>
              <CardDescription>Bilgi testleri ve davranış değerlendirmeleri</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Henüz denetim kaydı bulunmuyor. Personel denetimleri eklendiğinde burada görüntülenecek.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vardiyalar" className="flex flex-col gap-3">
          <Card>
            <CardHeader>
              <CardTitle>Vardiya Geçmişi</CardTitle>
              <CardDescription>Son 30 günlük vardiya kayıtları</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Vardiya detayları ve katılım bilgileri yakında eklenecek.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overtime Requests Tab - Only for own profile */}
        {isOwnProfile && (
          <TabsContent value="mesai" className="flex flex-col gap-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  Yeni Mesai Talebi Oluştur
                </CardTitle>
                <CardDescription>Fazla mesai talebinizi buradan oluşturabilirsiniz</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="overtime-minutes">Mesai Süresi (dakika)</Label>
                    <Input
                      id="overtime-minutes"
                      type="number"
                      placeholder="Örn: 60"
                      value={overtimeMinutes}
                      onChange={(e) => setOvertimeMinutes(e.target.value)}
                      min="1"
                      data-testid="input-overtime-minutes"
                    />
                  </div>
                  <div className="flex items-end">
                    <span className="text-sm text-muted-foreground mb-2">
                      = {Math.floor(parseInt(overtimeMinutes) / 60 || 0)} saat {parseInt(overtimeMinutes) % 60 || 0} dakika
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="overtime-reason">Açıklama</Label>
                  <Textarea
                    id="overtime-reason"
                    placeholder="Mesai sebebinizi açıklayın..."
                    value={overtimeReason}
                    onChange={(e) => setOvertimeReason(e.target.value)}
                    rows={3}
                    data-testid="input-overtime-reason"
                  />
                </div>
                <Button 
                  onClick={handleCreateOvertimeRequest}
                  disabled={createOvertimeMutation.isPending || !overtimeMinutes || !overtimeReason.trim()}
                  className="w-full"
                  data-testid="button-create-overtime"
                >
                  {createOvertimeMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gönderiliyor...</>
                  ) : (
                    <><Plus className="h-4 w-4 mr-2" /> Talep Oluştur</>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mesai Talep Geçmişi</CardTitle>
                <CardDescription>Oluşturduğunuz mesai talepleri</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingOvertime ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : overtimeRequests.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Henüz mesai talebi oluşturmadınız.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {overtimeRequests.map((req) => (
                      <div 
                        key={req.id} 
                        className="flex items-center justify-between p-3 border rounded-lg"
                        data-testid={`overtime-request-${req.id}`}
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{Math.floor(req.requestedMinutes / 60)} saat {req.requestedMinutes % 60} dk</span>
                            <Badge 
                              variant={req.status === 'approved' ? 'default' : req.status === 'rejected' ? 'destructive' : 'secondary'}
                            >
                              {req.status === 'approved' ? 'Onaylandı' : req.status === 'rejected' ? 'Reddedildi' : 'Bekliyor'}
                            </Badge>
                            {req.appliedToPeriod && (
                              <Badge variant="outline">{req.appliedToPeriod}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{req.reason}</p>
                          {req.status === 'approved' && req.approvedMinutes !== null && (
                            <p className="text-sm text-green-600">Onaylanan: {Math.floor(req.approvedMinutes / 60)} saat {req.approvedMinutes % 60} dk</p>
                          )}
                          {req.status === 'rejected' && req.rejectionReason && (
                            <p className="text-sm text-red-600">Red sebebi: {req.rejectionReason}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(req.createdAt), "d MMM yyyy HH:mm", { locale: tr })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="akademi" className="flex flex-col gap-3">
          {/* HQ Rolleri için Özel Akademi */}
          {(['admin', 'muhasebe', 'satinalma', 'coach', 'teknik', 'destek', 'fabrika', 'yatirimci_hq'].includes(profile?.role || '')) ? (
            <>
              {/* HQ Gelişim Merkezi Başlık */}
              <Card className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20" data-testid="card-hq-academy-header">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                      <Award className="w-8 h-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">HQ Gelişim Merkezi</h3>
                      <p className="text-sm text-muted-foreground">
                        {profile?.role === 'coach' && 'Franchise koçluğu ve şube yönetimi eğitimleri'}
                        {profile?.role === 'satinalma' && 'Tedarik zinciri ve maliyet yönetimi eğitimleri'}
                        {profile?.role === 'muhasebe' && 'Finansal analiz ve raporlama eğitimleri'}
                        {profile?.role === 'teknik' && 'Teknik ekipman ve bakım eğitimleri'}
                        {profile?.role === 'fabrika' && 'Üretim ve kalite kontrol eğitimleri'}
                        {profile?.role === 'destek' && 'Müşteri ilişkileri ve destek eğitimleri'}
                        {(profile?.role === 'admin' || profile?.role === 'yatirimci_hq') && 'Tüm departman eğitimlerine erişim'}
                      </p>
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <Badge variant="secondary" className="cursor-pointer" data-testid="badge-hq-role">
                          {roleLabels[profile?.role || ''] || profile?.role}
                        </Badge>
                        <Badge variant="outline" data-testid="badge-hq-level">
                          Merkez Personeli
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Role Özel Eğitim Kategorileri */}
              <Card data-testid="card-hq-training-categories">
                <CardHeader>
                  <CardTitle>Mesleki Gelişim Eğitimleri</CardTitle>
                  <CardDescription>Rolünüze özel eğitim modülleri</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Coach Eğitimleri */}
                    {(profile?.role === 'coach' || profile?.role === 'admin' || profile?.role === 'yatirimci_hq') && (
                      <>
                        <Card className="hover-elevate cursor-pointer border-blue-200 dark:border-blue-800" onClick={() => setLocation("/egitim-programi/franchise-yonetimi")} data-testid="card-training-franchise">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <Users className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-sm">Franchise Yönetimi</h4>
                                <p className="text-xs text-muted-foreground">Şube koçluğu teknikleri</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="hover-elevate cursor-pointer border-green-200 dark:border-green-800" onClick={() => setLocation("/egitim-programi/performans-analizi")} data-testid="card-training-performance">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <TrendingUp className="w-4 h-4 text-green-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-sm">Performans Analizi</h4>
                                <p className="text-xs text-muted-foreground">Veri odaklı karar verme</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="hover-elevate cursor-pointer border-red-200 dark:border-red-800" onClick={() => setLocation("/egitim-programi/kriz-yonetimi")} data-testid="card-training-crisis">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <AlertCircle className="w-4 h-4 text-red-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-sm">Kriz Yönetimi</h4>
                                <p className="text-xs text-muted-foreground">Çözüm stratejileri</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </>
                    )}

                    {/* Satınalma Eğitimleri */}
                    {(profile?.role === 'satinalma' || profile?.role === 'admin' || profile?.role === 'yatirimci_hq') && (
                      <>
                        <Card className="hover-elevate cursor-pointer border-purple-200 dark:border-purple-800" onClick={() => setLocation("/egitim-programi/tedarik-zinciri")} data-testid="card-training-supply-chain">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                <Clock className="w-4 h-4 text-purple-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-sm">Tedarik Zinciri</h4>
                                <p className="text-xs text-muted-foreground">Optimizasyon teknikleri</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="hover-elevate cursor-pointer border-orange-200 dark:border-orange-800" onClick={() => setLocation("/egitim-programi/maliyet-analizi")} data-testid="card-training-cost-analysis">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                <Wallet className="w-4 h-4 text-orange-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-sm">Maliyet Analizi</h4>
                                <p className="text-xs text-muted-foreground">Bütçeleme yöntemleri</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="hover-elevate cursor-pointer border-teal-200 dark:border-teal-800" onClick={() => setLocation("/egitim-programi/tedarikci-iliskileri")} data-testid="card-training-supplier">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                                <Users className="w-4 h-4 text-teal-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-sm">Tedarikçi İlişkileri</h4>
                                <p className="text-xs text-muted-foreground">Müzakere ve sözleşme</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </>
                    )}

                    {/* Muhasebe Eğitimleri */}
                    {(profile?.role === 'muhasebe' || profile?.role === 'admin' || profile?.role === 'yatirimci_hq') && (
                      <>
                        <Card className="hover-elevate cursor-pointer border-emerald-200 dark:border-emerald-800" onClick={() => setLocation("/egitim-programi/finansal-raporlama")} data-testid="card-training-financial">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <Banknote className="w-4 h-4 text-emerald-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-sm">Finansal Raporlama</h4>
                                <p className="text-xs text-muted-foreground">Standartlar ve uygulamalar</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="hover-elevate cursor-pointer border-amber-200 dark:border-amber-800" onClick={() => setLocation("/egitim-programi/vergi-mevzuat")} data-testid="card-training-tax">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <ClipboardCheck className="w-4 h-4 text-amber-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-sm">Vergi & Mevzuat</h4>
                                <p className="text-xs text-muted-foreground">Güncel düzenlemeler</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="hover-elevate cursor-pointer border-cyan-200 dark:border-cyan-800" onClick={() => setLocation("/egitim-programi/butce-planlama")} data-testid="card-training-budget">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                                <Calendar className="w-4 h-4 text-cyan-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-sm">Bütçe Planlama</h4>
                                <p className="text-xs text-muted-foreground">Tahminleme teknikleri</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </>
                    )}

                    {/* Teknik Eğitimleri */}
                    {(profile?.role === 'teknik' || profile?.role === 'admin' || profile?.role === 'yatirimci_hq') && (
                      <>
                        <Card className="hover-elevate cursor-pointer border-slate-200 dark:border-slate-700" onClick={() => setLocation("/egitim-programi/ekipman-bakim")} data-testid="card-training-equipment">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <Clock className="w-4 h-4 text-slate-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-sm">Ekipman Bakım</h4>
                                <p className="text-xs text-muted-foreground">Sertifikasyon programı</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="hover-elevate cursor-pointer border-indigo-200 dark:border-indigo-800" onClick={() => setLocation("/egitim-programi/yeni-teknolojiler")} data-testid="card-training-tech">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                <TrendingUp className="w-4 h-4 text-indigo-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-sm">Yeni Teknolojiler</h4>
                                <p className="text-xs text-muted-foreground">Güncel ekipman eğitimi</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="hover-elevate cursor-pointer border-rose-200 dark:border-rose-800" onClick={() => setLocation("/egitim-programi/problem-cozme")} data-testid="card-training-troubleshoot">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                                <AlertCircle className="w-4 h-4 text-rose-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-sm">Problem Çözme</h4>
                                <p className="text-xs text-muted-foreground">Arıza teşhis metodları</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </>
                    )}

                    {/* Fabrika Eğitimleri */}
                    {(profile?.role === 'fabrika' || profile?.role === 'admin' || profile?.role === 'yatirimci_hq') && (
                      <>
                        <Card className="hover-elevate cursor-pointer border-yellow-200 dark:border-yellow-800" onClick={() => setLocation("/egitim-programi/uretim-planlama")} data-testid="card-training-production">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                                <Clock className="w-4 h-4 text-yellow-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-sm">Üretim Planlama</h4>
                                <p className="text-xs text-muted-foreground">Verimlilik optimizasyonu</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="hover-elevate cursor-pointer border-lime-200 dark:border-lime-800" onClick={() => setLocation("/egitim-programi/kalite-kontrol")} data-testid="card-training-quality">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded bg-lime-100 dark:bg-lime-900/30 flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4 text-lime-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-sm">Kalite Kontrol</h4>
                                <p className="text-xs text-muted-foreground">ISO standartları</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* AI Kariyer Danışmanı */}
              <Card className="border-dashed border-2 border-primary/30 bg-primary/5" data-testid="card-ai-career-advisor">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Award className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold" data-testid="text-ai-advisor-title">AI Kariyer Danışmanı</h4>
                      <p className="text-sm text-muted-foreground" data-testid="text-ai-advisor-description">
                        Rolünüze özel gelişim önerileri ve kariyer yol haritası
                      </p>
                    </div>
                    <Link href="/akademi-ai-assistant">
                      <Button size="sm" data-testid="button-ai-advisor">Danışman</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* HQ Ortak Modüller */}
              <Card>
                <CardHeader>
                  <CardTitle>Ortak Gelişim Modülleri</CardTitle>
                  <CardDescription>Tüm HQ personeli için genel eğitimler</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Link href="/akademi-badges">
                      <Button variant="outline" className="w-full" data-testid="link-hq-badges">Rozetler</Button>
                    </Link>
                    <Link href="/akademi-certificates">
                      <Button variant="outline" className="w-full" data-testid="link-hq-certificates">Sertifikalar</Button>
                    </Link>
                    <Link href="/akademi-leaderboard">
                      <Button variant="outline" className="w-full" data-testid="link-hq-leaderboard">Sıralama</Button>
                    </Link>
                    <Link href="/akademi-ai-assistant">
                      <Button variant="outline" className="w-full" data-testid="link-hq-ai">AI Asistan</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              {/* Şube Personeli için Mevcut Akademi */}
              <Card className="bg-gradient-to-r from-primary/10 to-blue-500/5 border-primary/20" data-testid="card-academy-progress-summary">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                      <Award className="w-8 h-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">Akademi İlerleme Özeti</h3>
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <div className="text-center p-2 bg-background/60 rounded-lg">
                          <div className="text-xl font-bold text-primary" data-testid="text-performance-score">
                            {profile?.performanceScore !== null && profile?.performanceScore !== undefined 
                              ? `${profile.performanceScore}%` 
                              : <span className="text-muted-foreground text-sm">Hesaplanıyor...</span>
                            }
                          </div>
                          <div className="text-xs text-muted-foreground">Performans</div>
                        </div>
                        <div className="text-center p-2 bg-background/60 rounded-lg">
                          <div className="text-xl font-bold text-green-600" data-testid="text-attendance-rate">
                            {profile?.attendanceRate !== null && profile?.attendanceRate !== undefined 
                              ? `${profile.attendanceRate}%` 
                              : <span className="text-muted-foreground text-sm">Hesaplanıyor...</span>
                            }
                          </div>
                          <div className="text-xs text-muted-foreground">Devam</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <Link href="/akademi-badges">
                          <Badge variant="secondary" className="cursor-pointer hover-elevate" data-testid="link-badges-quick">Rozetler</Badge>
                        </Link>
                        <Link href="/akademi-streak-tracker">
                          <Badge variant="secondary" className="cursor-pointer hover-elevate" data-testid="link-streak-quick">Seri Takip</Badge>
                        </Link>
                        <Link href="/akademi-achievements">
                          <Badge variant="secondary" className="cursor-pointer hover-elevate" data-testid="link-achievements-quick">Başarılar</Badge>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {isOwnProfile && (
                <Card className="border-dashed border-2 border-orange-300/30 bg-orange-50/5 dark:bg-orange-900/5" data-testid="card-recommended-next-step">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm" data-testid="text-recommended-title">Önerilen Sonraki Adım</h4>
                        <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-recommended-description">Kariyer yolculuğuna devam etmek için Akademi sayfasını ziyaret edin</p>
                      </div>
                      <Link href="/akademi">
                        <Button size="sm" data-testid="button-go-akademi">Başla</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!isOwnProfile && (
                <Card className="border-dashed border-2 border-blue-300/30 bg-blue-50/5 dark:bg-blue-900/5" data-testid="card-readonly-notice">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm" data-testid="text-readonly-title">Görüntüleme Modu</h4>
                        <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-readonly-description">Bu personelin eğitim ilerlemesini görüntülüyorsunuz. Eğitim ilerletme yalnızca personelin kendisi tarafından yapılabilir.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {isOwnProfile && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Hızlı Erişim</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-1.5">
                      <Link href="/akademi">
                        <Button variant="outline" size="sm" className="w-full text-xs" data-testid="link-akademi">Akademi</Button>
                      </Link>
                      <Link href="/akademi-badges">
                        <Button variant="outline" size="sm" className="w-full text-xs" data-testid="link-akademi-badges">Rozetler</Button>
                      </Link>
                      <Link href="/akademi-leaderboard">
                        <Button variant="outline" size="sm" className="w-full text-xs" data-testid="link-akademi-leaderboard">Sıralama</Button>
                      </Link>
                      <Link href="/akademi-learning-paths">
                        <Button variant="outline" size="sm" className="w-full text-xs" data-testid="link-akademi-paths">Yollar</Button>
                      </Link>
                      <Link href="/akademi-certificates">
                        <Button variant="outline" size="sm" className="w-full text-xs" data-testid="link-akademi-certificates">Sertifikalar</Button>
                      </Link>
                      <Link href="/akademi-streak-tracker">
                        <Button variant="outline" size="sm" className="w-full text-xs" data-testid="link-akademi-streak">Seri</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="degerlendirmeler" className="flex flex-col gap-3">
          {/* Kategori Ortalama Radar Chart + Ozet */}
          {evalData?.evaluations?.length ? (() => {
            const evals = evalData.evaluations;
            const avgCat = (key: string) => Math.round(evals.reduce((s: number, e: any) => s + (e[key] || 0), 0) / evals.length * 10) / 10;
            const radarData = [
              { cat: "Müşteri", val: avgCat("customerBehavior") },
              { cat: "Güler Yüz", val: avgCat("friendliness") },
              { cat: "Bilgi", val: avgCat("knowledgeExperience") },
              { cat: "Dress Code", val: avgCat("dressCode") },
              { cat: "Temizlik", val: avgCat("cleanliness") },
              { cat: "Takım", val: avgCat("teamwork") },
              { cat: "Dakiklik", val: avgCat("punctuality") },
              { cat: "İnisiyatif", val: avgCat("initiative") },
            ];
            const scoreHistory = evals
              .slice().reverse()
              .map((e: any) => ({
                date: e.createdAt ? format(new Date(e.createdAt), "dd MMM", { locale: tr }) : "",
                puan: Math.round(e.overallScore),
              }));
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Card data-testid="card-eval-radar">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Kategori Ortalamaları</CardTitle>
                    <CardDescription>Tüm değerlendirmelerin ortalaması (5 üzerinden)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="cat" tick={{ fontSize: 10 }} />
                        <Radar name="Ortalama" dataKey="val" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card data-testid="card-eval-history-chart">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Puan Gelişimi</CardTitle>
                    <CardDescription>{evals.length} değerlendirme - Ort: {evalData.averageScore?.toFixed(0)}/100</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={scoreHistory}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="puan" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            );
          })() : null}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary" />
                  Personel Değerlendirmeleri
                </CardTitle>
                <CardDescription>
                  Ortalama Puan: {evalData?.averageScore?.toFixed(1) ?? "—"}/100
                  {evalData?.evaluations?.length ? ` | Toplam: ${evalData.evaluations.length} değerlendirme` : ""}
                </CardDescription>
              </div>
              {canEvaluate && !isOwnProfile && (
                <div className="flex flex-col items-end gap-1">
                  {evalLimitInfo && (
                    <span className="text-xs text-muted-foreground" data-testid="text-eval-limit">
                      Bu ay: {evalLimitInfo.thisMonthCount}/2 değerlendirme
                    </span>
                  )}
                <Dialog open={evalDialogOpen} onOpenChange={setEvalDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm" 
                      data-testid="button-new-evaluation"
                      disabled={evalLimitInfo ? (!evalLimitInfo.canEvaluateToday || evalLimitInfo.thisMonthCount >= 2) : false}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {evalLimitInfo && !evalLimitInfo.canEvaluateToday 
                        ? "Bugün Değerlendirme Yapıldı" 
                        : evalLimitInfo && evalLimitInfo.thisMonthCount >= 2 
                          ? "Aylık Limit Doldu" 
                          : "Yeni Değerlendirme"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Personel Değerlendirme Formu</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      {[
                        { key: "customerBehavior" as const, label: "Müşteri Davranışı" },
                        { key: "friendliness" as const, label: "Güler Yüz" },
                        { key: "knowledgeExperience" as const, label: "Bilgi & Deneyim" },
                        { key: "dressCode" as const, label: "Dress Code" },
                        { key: "cleanliness" as const, label: "Temizlik" },
                        { key: "teamwork" as const, label: "Takım Çalışması" },
                        { key: "punctuality" as const, label: "Dakiklik" },
                        { key: "initiative" as const, label: "İnisiyatif" },
                      ].map(({ key, label }) => (
                        <div key={key} data-testid={`eval-criteria-${key}`}>
                          <Label className="text-sm font-medium">{label}</Label>
                          <div className="flex items-center gap-1 mt-1">
                            {[1, 2, 3, 4, 5].map((v) => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => setEvalForm((f) => ({ ...f, [key]: v }))}
                                className="p-0.5"
                                data-testid={`star-${key}-${v}`}
                              >
                                <Star
                                  className={`h-6 w-6 transition-colors ${v <= evalForm[key] ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                                />
                              </button>
                            ))}
                            <span className="ml-2 text-sm text-muted-foreground">{evalForm[key]}/5</span>
                          </div>
                        </div>
                      ))}

                      <div>
                        <Label className="text-sm font-medium">Notlar</Label>
                        <Textarea
                          value={evalForm.notes}
                          onChange={(e) => setEvalForm((f) => ({ ...f, notes: e.target.value }))}
                          placeholder="Ek yorumlarınızı buraya yazabilirsiniz..."
                          className="mt-1"
                          data-testid="input-eval-notes"
                        />
                      </div>

                      <Button
                        className="w-full"
                        disabled={createEvalMutation.isPending}
                        onClick={() => {
                          if (!id) return;
                          createEvalMutation.mutate({ ...evalForm, employeeId: id });
                        }}
                        data-testid="button-submit-evaluation"
                      >
                        {createEvalMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Değerlendirmeyi Kaydet
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {!evalData?.evaluations?.length ? (
                <p className="text-muted-foreground text-sm" data-testid="text-no-evaluations">
                  Henüz değerlendirme kaydı bulunmuyor.
                </p>
              ) : (
                <div className="space-y-3">
                  {evalData.evaluations.map((ev) => {
                    const evColor = ev.overallScore >= 75 ? "text-emerald-600" : ev.overallScore >= 65 ? "text-amber-600" : "text-red-600";
                    return (
                      <Card key={ev.id} data-testid={`eval-card-${ev.id}`}>
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{roleLabels[ev.evaluatorRole] || ev.evaluatorRole}</Badge>
                              <span className="text-sm text-muted-foreground">{ev.evaluatorName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${evColor}`} data-testid={`eval-score-${ev.id}`}>
                                {ev.overallScore.toFixed(0)}/100
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {ev.createdAt ? format(new Date(ev.createdAt), "dd MMM yyyy", { locale: tr }) : ""}
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                            {[
                              { l: "Müşteri", v: ev.customerBehavior },
                              { l: "Güler Yüz", v: ev.friendliness },
                              { l: "Bilgi", v: ev.knowledgeExperience },
                              { l: "Dress Code", v: ev.dressCode },
                              { l: "Temizlik", v: ev.cleanliness },
                              { l: "Takım", v: ev.teamwork },
                              { l: "Dakiklik", v: ev.punctuality },
                              { l: "İnisiyatif", v: ev.initiative },
                            ].map((c) => (
                              <div key={c.l} className="flex items-center gap-1">
                                <span className="text-muted-foreground">{c.l}:</span>
                                <div className="flex">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Star key={s} className={`h-3 w-3 ${s <= c.v ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`} />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                          {ev.notes && (
                            <p className="text-sm text-muted-foreground italic">"{ev.notes}"</p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
