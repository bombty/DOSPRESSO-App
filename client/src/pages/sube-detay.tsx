import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useBreadcrumb } from "@/components/breadcrumb-navigation";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ROLE_LABELS } from "@/lib/turkish-labels";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, Users, CheckCircle2, Clock, Wrench, TrendingUp, 
  Star, Award, ClipboardCheck, ThumbsUp, QrCode, MapPin, 
  Wifi, Download, RefreshCw, Copy, CheckCircle, BarChart3, MessageSquare,
  Monitor, Scan, KeyRound
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { isHQRole } from "@shared/schema";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

function KioskModeCard({ branchId }: { branchId: number }) {
  const { toast } = useToast();
  const { data: kioskSettings, isError, refetch, isLoading } = useQuery<any>({
    queryKey: ['/api/branches', branchId, 'kiosk', 'settings'],
    queryFn: async () => {
      const res = await fetch(`/api/branches/${branchId}/kiosk/settings`);
      return res.json();
    },
  });

  const modeMutation = useMutation({
    mutationFn: async (mode: string) => {
      const res = await apiRequest('PATCH', `/api/branches/${branchId}/kiosk/mode`, { kioskMode: mode });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/branches', branchId, 'kiosk', 'settings'] });
      toast({ title: "Kiosk modu güncellendi", description: `Mod: ${data.kioskMode === 'qr' ? 'QR Kod' : 'PIN'}` });
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const currentMode = kioskSettings?.kioskMode || 'pin';

  
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-4 w-4" />
          Kiosk Giris Modu
        </CardTitle>
        <CardDescription>
          Sube kiosk tabletinde kullanilacak giris yontemini secin
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className={`flex flex-col items-center gap-2 h-auto py-4 toggle-elevate ${currentMode === 'pin' ? 'toggle-elevated' : ''}`}
            onClick={() => modeMutation.mutate('pin')}
            disabled={modeMutation.isPending}
            data-testid="button-kiosk-mode-pin"
          >
            <KeyRound className="h-6 w-6" />
            <span className="text-sm font-medium">PIN Giris</span>
            <span className="text-[10px] text-muted-foreground">4 haneli kisisel PIN</span>
          </Button>
          <Button
            variant="outline"
            className={`flex flex-col items-center gap-2 h-auto py-4 toggle-elevate ${currentMode === 'qr' ? 'toggle-elevated' : ''}`}
            onClick={() => modeMutation.mutate('qr')}
            disabled={modeMutation.isPending}
            data-testid="button-kiosk-mode-qr"
          >
            <Scan className="h-6 w-6" />
            <span className="text-sm font-medium">QR Giris</span>
            <span className="text-[10px] text-muted-foreground">Telefondan QR okutma</span>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {currentMode === 'qr'
            ? 'Personel telefonundan QR kod uretip kiosk tablette okutarak giris yapar'
            : 'Personel kiosk tablette PIN kodunu girerek giris yapar'}
        </p>
      </CardContent>
    </Card>
  );
}

type Branch = {
  id: number;
  name: string;
  address: string;
  city: string;
  phoneNumber: string;
  managerName: string;
  qrCodeToken?: string;
  geoRadius?: number;
  wifiSsid?: string;
  shiftCornerLatitude?: string;
  shiftCornerLongitude?: string;
  openingHours?: string;
  closingHours?: string;
};

type User = {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  branchId: number | null;
  hireDate: string | null;
  isActive: boolean;
  performanceScore?: number;
};

type BranchDetails = {
  branch: Branch;
  scores: {
    employeePerformanceScore: number;
    equipmentScore: number;
    qualityAuditScore: number;
    customerSatisfactionScore: number;
    compositeScore: number;
  };
  staff: User[];
  equipment: any[];
  recentTasks: any[];
  recentFaults: any[];
  recentFeedback: any[];
  recentComplaints: any[];
};

export default function SubeDetayPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const branchId = parseInt(id || "0");
  
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [geoRadius, setGeoRadius] = useState("50");
  const [wifiSsid, setWifiSsid] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("personel");
  const [openingHours, setOpeningHours] = useState("07:00");
  const [closingHours, setClosingHours] = useState("01:00");
  const [showCards, setShowCards] = useState(true);
  const [feedbackCopied, setFeedbackCopied] = useState(false);
  const [scorePeriod, setScorePeriod] = useState("30");
  
  const isAdmin = user?.role && isHQRole(user.role as any);

  // Fetch active check-ins for this branch
  const isSupervisor = user?.role === 'supervisor' || user?.role === 'supervisor_buddy';
  const canViewActive = isAdmin || isSupervisor;
  
  const { data: activeEmployees } = useQuery<any[]>({
    queryKey: ['/api/shift-attendance', 'active', branchId],
    enabled: !!branchId && canViewActive,
    refetchInterval: activeTab === 'canlı' ? 15000 : false,
    queryFn: async () => {
      const response = await fetch(`/api/shift-attendance?status=checked_in&branchId=${branchId}&date=${new Date().toISOString().split('T')[0]}`);
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Fetch comprehensive branch details with scores and staff
  const { data: branchData, isLoading: branchLoading, refetch } = useQuery<BranchDetails>({
    queryKey: [`/api/branches/${branchId}/detail`],
    enabled: !!branchId,
  });

  useBreadcrumb(branchData?.branch?.name || '');

  type StaffScore = {
    userId: string;
    firstName: string | null;
    lastName: string | null;
    username: string;
    averageScore: number;
    totalDays: number;
  };
  const { data: staffScores } = useQuery<StaffScore[]>({
    queryKey: ['/api/branches', branchId, 'staff-scores', scorePeriod],
    queryFn: async () => {
      const res = await fetch(`/api/branches/${branchId}/staff-scores?days=${scorePeriod}`, { credentials: "include" });
      if (!res.ok) throw new Error("Staff scores fetch failed");
      return res.json();
    },
    enabled: !!branchId,
  });
  const staffScoreMap = new Map(staffScores?.map(s => [s.userId, s]) || []);

  // Fetch branch audit scores (6-section breakdown)
  interface AuditScoreResponse {
    branchId: number;
    auditCount: number;
    overallScore: number | null;
    sections: {
      gida_guvenligi: number | null;
      urun_standardi: number | null;
      servis: number | null;
      operasyon: number | null;
      marka: number | null;
      ekipman: number | null;
    };
  }
  const { data: auditScoreData, isLoading: auditScoresLoading } = useQuery<AuditScoreResponse>({
    queryKey: ['/api/branch-audit-scores', branchId, 'latest'],
    enabled: !!branchId,
    queryFn: async () => {
      const response = await fetch(`/api/branch-audit-scores/${branchId}/latest`);
      if (!response.ok) return null;
      return response.json();
    }
  });

  // Generate QR token mutation (for shift check-in)
  const generateQrMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', `/api/branches/${branchId}/generate-qr`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/branches/${branchId}/detail`] });
      toast({ title: "Başarılı", description: "QR kod oluşturuldu" });
    },
    onError: () => {
      toast({ title: "Hata", description: "QR kod oluşturulamadı", variant: "destructive" });
    },
  });

  // Fetch customer feedback QR data
  const { data: feedbackQrData, refetch: refetchFeedbackQr } = useQuery({
    queryKey: ['/api/branches', branchId, 'feedback-qr'],
    enabled: !!branchId && !!isAdmin,
    queryFn: async (): Promise<{ token: string; url: string; qrCode: string } | null> => {
      const response = await fetch(`/api/branches/${branchId}/feedback-qr`);
      if (!response.ok) return null;
      return response.json();
    }
  });

  // Update location settings mutation
  const updateLocationMutation = useMutation({
    mutationFn: async (data: { shiftCornerLatitude?: string; shiftCornerLongitude?: string; geoRadius?: number; wifiSsid?: string }) => {
      await apiRequest('PATCH', `/api/branches/${branchId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/branches/${branchId}/detail`] });
      toast({ title: "Başarılı", description: "Lokasyon ayarları güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Ayarlar güncellenemedi", variant: "destructive" });
    },
  });

  // Update working hours mutation
  const updateWorkingHoursMutation = useMutation({
    mutationFn: async (data: { openingHours?: string; closingHours?: string }) => {
      await apiRequest('PATCH', `/api/branches/${branchId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/branches/${branchId}/detail`] });
      toast({ title: "Başarılı", description: "Çalışma saatleri güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Saatler güncellenemedi", variant: "destructive" });
    },
  });

  // Initialize form values when data loads
  useEffect(() => {
    if (branchData?.branch) {
      setLatitude(branchData.branch.shiftCornerLatitude || "");
      setLongitude(branchData.branch.shiftCornerLongitude || "");
      setGeoRadius(branchData.branch.geoRadius?.toString() || "50");
      setWifiSsid(branchData.branch.wifiSsid || "");
      setOpeningHours(branchData.branch.openingHours?.substring(0, 5) || "07:00");
      setClosingHours(branchData.branch.closingHours?.substring(0, 5) || "01:00");
    }
  }, [branchData]);

  if (user?.role === 'supervisor' && user?.branchId !== branchId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <p className="text-lg text-muted-foreground">Bu şubeye erişim yetkiniz yok</p>
        <Link href="/subeler">
          <Button variant="default" data-testid="button-back-branches">Şubelere Dön</Button>
        </Link>
      </div>
    );
  }

  if (branchLoading) {
    return <div className="flex items-center justify-center h-full">Yükleniyor...</div>;
  }

  if (!branchData) {
    return <div className="flex items-center justify-center h-full">Şube bulunamadı</div>;
  }

  const { branch, scores, staff, equipment, recentTasks } = branchData;
  const completedTasks = recentTasks.filter(t => t.status === 'tamamlandi').length;
  const pendingTasks = recentTasks.filter(t => t.status === 'bekliyor').length;
  const activeEquipment = equipment.filter(e => e.isActive).length;

  // QR code value - format: "branch:ID"
  const qrValue = branch.qrCodeToken ? `branch:${branchId}` : "";

  const handleSaveLocation = () => {
    updateLocationMutation.mutate({
      shiftCornerLatitude: latitude || undefined,
      shiftCornerLongitude: longitude || undefined,
      geoRadius: parseInt(geoRadius) || 50,
      wifiSsid: wifiSsid || undefined,
    });
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude.toFixed(7));
          setLongitude(position.coords.longitude.toFixed(7));
          toast({ title: "Konum Alındı", description: "GPS koordinatları güncellendi" });
        },
        (error) => {
          toast({ title: "Hata", description: "Konum alınamadı: " + error.message, variant: "destructive" });
        }
      );
    } else {
      toast({ title: "Hata", description: "Tarayıcınız konum özelliğini desteklemiyor", variant: "destructive" });
    }
  };

  const handleDownloadQr = () => {
    const svg = document.getElementById("branch-qr-code");
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        canvas.width = 400;
        canvas.height = 400;
        ctx?.drawImage(img, 0, 0, 400, 400);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `${branch.name.replace(/\s+/g, '_')}_QR.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    }
  };

  const handleCopyQrLink = () => {
    navigator.clipboard.writeText(qrValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Kopyalandı", description: "QR bağlantısı panoya kopyalandı" });
  };

  // Handle card click - hide cards and switch tab
  const handleCardClick = (tab: string) => {
    setActiveTab(tab);
    setShowCards(false);
  };

  // Handle tab change - hide cards when switching tabs
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setShowCards(false);
  };

  return (
    <div className="flex flex-col gap-2 sm:gap-3 p-3">
      {/* Header with Branch Name */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Link href="/subeler">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{branch.name}</h1>
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10">
              <Star className="h-4 w-4 text-primary" />
              <span className="text-lg font-bold text-primary" data-testid="composite-score">{scores.compositeScore.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{branch.city} • {branch.address}</p>
        </div>
      </div>

      {/* Tabs - directly under header */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full flex flex-wrap gap-1 h-auto p-1">
          {canViewActive && (
            <TabsTrigger value="canlı" data-testid="tab-active-employees">
              Canlı ({activeEmployees?.length || 0})
            </TabsTrigger>
          )}
          <TabsTrigger value="personel" data-testid="tab-personnel">Personel</TabsTrigger>
          <TabsTrigger value="gorevler" data-testid="tab-tasks">Görevler</TabsTrigger>
          <TabsTrigger value="ekipman" data-testid="tab-equipment">Ekipman</TabsTrigger>
          <TabsTrigger value="arizalar" data-testid="tab-faults">Arızalar</TabsTrigger>
          <TabsTrigger value="kalite" data-testid="tab-quality">Kalite Denetim</TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="qr-ayarlar" data-testid="tab-qr-settings">
              QR & Lokasyon
            </TabsTrigger>
          )}
        </TabsList>

        {/* Compact KPI Cards - 3 columns, clickable, hide on click */}
        {showCards && (
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
            <button 
              type="button"
              onClick={() => handleCardClick("personel")}
              className="text-left p-3 rounded-lg border bg-card hover-elevate active-elevate-2 cursor-pointer"
              data-testid="card-metric-employee"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-medium text-muted-foreground">Personel</span>
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold" data-testid="score-employee">{scores.employeePerformanceScore.toFixed(1)}</span>
                <Progress value={scores.employeePerformanceScore} className="h-1 flex-1" />
              </div>
            </button>

            <button 
              type="button"
              onClick={() => handleCardClick("ekipman")}
              className="text-left p-3 rounded-lg border bg-card hover-elevate active-elevate-2 cursor-pointer"
              data-testid="card-metric-equipment"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-medium text-muted-foreground">Ekipman</span>
                <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold" data-testid="score-equipment">{scores.equipmentScore.toFixed(1)}</span>
                <Progress value={scores.equipmentScore} className="h-1 flex-1" />
              </div>
            </button>

            <button 
              type="button"
              onClick={() => handleCardClick("kalite")}
              className="text-left p-3 rounded-lg border bg-card hover-elevate active-elevate-2 cursor-pointer"
              data-testid="card-metric-quality"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-medium text-muted-foreground">Kalite Denetim</span>
                <ClipboardCheck className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold" data-testid="score-quality">{scores.qualityAuditScore.toFixed(1)}</span>
                <Progress value={scores.qualityAuditScore} className="h-1 flex-1" />
              </div>
            </button>

            <button 
              type="button"
              onClick={() => handleCardClick("arizalar")}
              className="text-left p-3 rounded-lg border bg-card hover-elevate active-elevate-2 cursor-pointer"
              data-testid="card-metric-satisfaction"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-medium text-muted-foreground">Memnuniyet</span>
                <ThumbsUp className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold" data-testid="score-satisfaction">{scores.customerSatisfactionScore.toFixed(1)}</span>
                <Progress value={scores.customerSatisfactionScore} className="h-1 flex-1" />
              </div>
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mt-2 flex-wrap">
          {isAdmin && (
            <Link href={`/sube-gorevler/${branchId}`}>
              <Button variant="outline" size="sm" data-testid="button-task-performance">
                <BarChart3 className="w-4 h-4 mr-2" />
                Görev Performansı
              </Button>
            </Link>
          )}
          {(isAdmin || user?.role === 'mudur') && (
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                const kioskUrl = `${window.location.origin}/sube/kiosk/${branchId}`;
                const kioskWindow = window.open(kioskUrl, '_blank');
                if (kioskWindow) {
                  kioskWindow.addEventListener('load', () => {
                    try {
                      kioskWindow.document.documentElement.requestFullscreen?.();
                    } catch {}
                  });
                }
              }}
              data-testid="button-open-kiosk"
            >
              <Monitor className="w-4 h-4 mr-2" />
              Kiosk Aç
            </Button>
          )}
          {!showCards && (
            <Button variant="ghost" size="sm" onClick={() => setShowCards(true)} data-testid="button-show-cards">
              KPI Göster
            </Button>
          )}
        </div>

        <TabsContent value="canlı" className="w-full space-y-2 sm:space-y-3">
          <Card data-testid="card-active-employees">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🟢</span>
                Şu An Aktif Çalışanlar
              </CardTitle>
              <CardDescription>
                {activeEmployees?.length || 0} personel giriş yapmış durumda
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeEmployees && activeEmployees.length > 0 ? (
                <div className="flex flex-col gap-3 sm:gap-4">
                  {activeEmployees.map((attendance) => {
                    const emp = staff?.find(s => s.id === attendance.userId);
                    const checkInTime = attendance.checkInTime ? new Date(attendance.checkInTime) : null;
                    const duration = checkInTime ? Math.floor((Date.now() - checkInTime.getTime()) / (60 * 1000)) : 0;
                    const hours = Math.floor(duration / 60);
                    const minutes = duration % 60;
                    return (
                      <div 
                        key={attendance.id} 
                        className="flex items-center justify-between p-3 rounded-lg border bg-success/10 dark:bg-success/5/20"
                        data-testid={`active-emp-${emp?.id}`}
                      >
                        <div className="flex-1">
                          <p className="font-semibold">{emp?.fullName || 'Bilinmeyen'}</p>
                          <div className="flex gap-2 sm:gap-3 text-sm text-muted-foreground mt-1">
                            <span>Giriş: {checkInTime ? checkInTime.toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'}) : '-'}</span>
                            <span>⏱️ {hours > 0 ? `${hours}s ${minutes}d` : `${minutes}d`}</span>
                            {attendance.location_confidence && (
                              <span>📍 {Math.round(attendance.location_confidence)}%</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="w-3 h-3 rounded-full bg-success/100 animate-pulse mx-auto" />
                          <p className="text-xs text-success font-medium mt-1">Canlı</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Şu an hiç kimse giriş yapmamış</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personel" className="w-full space-y-2 sm:space-y-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <div>
                <CardTitle>Şube Personeli</CardTitle>
                <CardDescription>{staff.length} çalışan</CardDescription>
              </div>
              <Select value={scorePeriod} onValueChange={setScorePeriod}>
                <SelectTrigger className="w-36" data-testid="select-score-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Son 1 Hafta</SelectItem>
                  <SelectItem value="30">Son 1 Ay</SelectItem>
                  <SelectItem value="90">Son 3 Ay</SelectItem>
                  <SelectItem value="180">Son 6 Ay</SelectItem>
                  <SelectItem value="365">Son 1 Yıl</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {staff.length === 0 ? (
                <p className="text-muted-foreground">Henüz personel eklenmemiş</p>
              ) : (
                <div className="flex flex-col gap-3 sm:gap-4">
                  {staff.map((emp) => {
                    const displayName = [emp.firstName, emp.lastName].filter(Boolean).join(" ") || emp.username;
                    const periodScore = staffScoreMap.get(emp.id);
                    const scoreVal = periodScore?.averageScore ?? emp.performanceScore ?? 0;
                    const scoreColor = scoreVal > 70 ? "text-green-600 dark:text-green-400" : scoreVal > 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
                    return (
                    <Link key={emp.id} href={`/personel-detay/${emp.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg border hover-elevate active-elevate-2" data-testid={`employee-${emp.id}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold truncate" data-testid={`text-employee-name-${emp.id}`}>{displayName}</p>
                            <Badge variant="outline" className="flex-shrink-0" data-testid={`badge-role-${emp.id}`}>{ROLE_LABELS[emp.role] || emp.role}</Badge>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1" data-testid={`performance-${emp.id}`}>
                              <Award className="h-3.5 w-3.5 text-amber-500" />
                              {scoreVal === 0 ? (
                                <span className="text-xs font-medium text-muted-foreground">Henüz veri yok</span>
                              ) : (
                                <span className={`text-xs font-medium ${scoreColor}`}>{scoreVal}/100</span>
                              )}
                              {periodScore && (
                                <span className="text-xs text-muted-foreground">({periodScore.totalDays} gün)</span>
                              )}
                            </div>
                            {emp.hireDate && (
                              <span className="text-xs text-muted-foreground">
                                Başlangıç: {new Date(emp.hireDate).toLocaleDateString('tr-TR')}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant={emp.isActive ? "default" : "secondary"} className="flex-shrink-0 ml-2" data-testid={`badge-status-${emp.id}`}>
                          {emp.isActive ? "Aktif" : "Pasif"}
                        </Badge>
                      </div>
                    </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gorevler" className="w-full space-y-2 sm:space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Son Görevler</CardTitle>
              <CardDescription>
                {completedTasks} tamamlandı, {pendingTasks} bekliyor
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentTasks.length === 0 ? (
                <p className="text-muted-foreground">Henüz görev yok</p>
              ) : (
                <div className="flex flex-col gap-3 sm:gap-4">
                  {recentTasks.slice(0, 10).map((task) => (
                    <Link key={task.id} href={`/gorev-detay/${task.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg border hover-elevate active-elevate-2 cursor-pointer" data-testid={`task-${task.id}`}>
                        <div>
                          <p className="font-medium">{task.description}</p>
                          <p className="text-sm text-muted-foreground">{task.assignedTo}</p>
                        </div>
                        <Badge variant={task.status === 'tamamlandi' ? "default" : "secondary"}>
                          {task.status === 'tamamlandi' ? 'Tamamlandı' : 'Bekliyor'}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ekipman" className="w-full space-y-2 sm:space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Ekipman</CardTitle>
              <CardDescription>{activeEquipment} aktif ekipman</CardDescription>
            </CardHeader>
            <CardContent>
              {equipment.length === 0 ? (
                <p className="text-muted-foreground">Henüz ekipman eklenmemiş</p>
              ) : (
                <div className="flex flex-col gap-3 sm:gap-4">
                  {equipment.map((equip) => (
                    <Link key={equip.id} href={`/ekipman-detay/${equip.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg border hover-elevate active-elevate-2" data-testid={`equipment-${equip.id}`}>
                        <div>
                          <p className="font-medium">{equip.equipmentType}</p>
                          <p className="text-sm text-muted-foreground">{equip.serialNumber}</p>
                        </div>
                        <Badge variant={equip.isActive ? "default" : "secondary"}>
                          {equip.isActive ? "Aktif" : "Pasif"}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="arizalar" className="w-full space-y-2 sm:space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Son Arızalar</CardTitle>
              <CardDescription>Şubeye ait ekipman arızaları</CardDescription>
            </CardHeader>
            <CardContent>
              {branchData.recentFaults && branchData.recentFaults.length > 0 ? (
                <div className="flex flex-col gap-3 sm:gap-4">
                  {branchData.recentFaults.slice(0, 10).map((fault) => (
                    <Link key={fault.id} href={`/ariza-detay/${fault.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg border hover-elevate active-elevate-2" data-testid={`fault-${fault.id}`}>
                        <div>
                          <p className="font-medium">{fault.title || fault.description?.substring(0, 50) || `Arıza #${fault.id}`}</p>
                          <p className="text-sm text-muted-foreground">
                            {fault.equipmentType || "Ekipman"} • {new Date(fault.createdAt).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                        <Badge variant={fault.status === 'resolved' || fault.status === 'closed' ? "outline" : fault.priority === 'critical' ? "destructive" : "default"}>
                          {fault.status === 'open' ? 'Açık' : fault.status === 'in_progress' ? 'İşlemde' : fault.status === 'resolved' ? 'Çözüldü' : 'Kapatıldı'}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Wrench className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Aktif arıza bulunmuyor</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Kalite Denetim Tab */}
        <TabsContent value="kalite" className="w-full space-y-2 sm:space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Kalite Denetim Skorları
              </CardTitle>
              <CardDescription>
                6 bölümlü ağırlıklı değerlendirme sistemi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Overall Score - from audit data or fallback to branch scores */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Genel Kalite Skoru</p>
                    <p className="text-3xl font-bold text-primary" data-testid="quality-overall-score">
                      {auditScoreData?.overallScore !== null && auditScoreData?.overallScore !== undefined 
                        ? Math.round(auditScoreData.overallScore)
                        : scores.qualityAuditScore.toFixed(0)}
                    </p>
                  </div>
                  <Award className="h-12 w-12 text-primary opacity-20" />
                </div>

                {/* Section Scores - 6 weighted sections with real data */}
                {auditScoresLoading ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">Yükleniyor...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(() => {
                      const sectionConfig = [
                        { key: 'gida_guvenligi' as const, label: 'Gıda Güvenliği', weight: 25, bg: 'bg-red-50 dark:bg-red-950', dot: 'bg-red-500' },
                        { key: 'urun_standardi' as const, label: 'Ürün Standardı', weight: 25, bg: 'bg-orange-50 dark:bg-orange-950', dot: 'bg-orange-500' },
                        { key: 'servis' as const, label: 'Servis', weight: 15, bg: 'bg-blue-50 dark:bg-blue-950', dot: 'bg-blue-500' },
                        { key: 'operasyon' as const, label: 'Operasyon', weight: 15, bg: 'bg-green-50 dark:bg-green-950', dot: 'bg-green-500' },
                        { key: 'marka' as const, label: 'Marka', weight: 10, bg: 'bg-purple-50 dark:bg-purple-950', dot: 'bg-purple-500' },
                        { key: 'ekipman' as const, label: 'Ekipman', weight: 10, bg: 'bg-gray-50 dark:bg-gray-900', dot: 'bg-gray-500' }
                      ];
                      return sectionConfig.map(section => {
                        const sectionScore = auditScoreData?.sections?.[section.key];
                        return (
                          <div key={section.key} className={`flex items-center justify-between p-3 rounded-lg border ${section.bg}`}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${section.dot}`} />
                              <span className="font-medium">{section.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold" data-testid={`section-score-${section.key}`}>
                                {sectionScore !== null && sectionScore !== undefined ? `${Math.round(sectionScore)}/100` : '-'}
                              </span>
                              <Badge variant="outline" data-testid={`section-weight-${section.key}`}>%{section.weight}</Badge>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}

                {/* Audit Count and No data message */}
                {auditScoreData && auditScoreData.auditCount > 0 && (
                  <p className="text-sm text-muted-foreground text-center">
                    Son {auditScoreData.auditCount} denetimin ortalaması
                  </p>
                )}
                {(!auditScoreData || auditScoreData.auditCount === 0) && !auditScoresLoading && (
                  <div className="text-center py-4 text-muted-foreground">
                    <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Henüz denetim verisi bulunmuyor</p>
                  </div>
                )}

                {/* Link to Quality Control Page */}
                <div className="flex justify-center pt-4">
                  <Link href="/kalite-denetimi">
                    <Button variant="outline" data-testid="button-view-audits">
                      <ClipboardCheck className="h-4 w-4 mr-2" />
                      Tüm Denetimleri Görüntüle
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="qr-ayarlar" className="w-full space-y-2 sm:space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
              {/* QR Kod Üretici */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    Vardiya Giriş QR Kodu
                  </CardTitle>
                  <CardDescription>
                    Bu QR kodu şubeye asarak personelin vardiya girişi yapmasını sağlayın
                  </CardDescription>
                </CardHeader>
                <CardContent className="w-full space-y-2 sm:space-y-3">
                  {branch.qrCodeToken ? (
                    <div className="w-full space-y-2 sm:space-y-3">
                      <div className="flex flex-col items-center p-3 bg-white dark:bg-white rounded-lg">
                        <QRCodeSVG 
                          id="branch-qr-code"
                          value={qrValue} 
                          size={200}
                          level="H"
                          includeMargin
                        />
                        <p className="text-xs text-muted-foreground mt-2 font-mono">
                          QR İçeriği: {qrValue || "(QR oluşturulmamış)"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center">
                        <Button onClick={handleDownloadQr} variant="outline" data-testid="button-download-qr">
                          <Download className="h-4 w-4 mr-2" />
                          İndir
                        </Button>
                        <Button onClick={handleCopyQrLink} variant="outline" data-testid="button-copy-qr">
                          {copied ? <CheckCircle className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                          {copied ? "Kopyalandı" : "Kopyala"}
                        </Button>
                        <Button 
                          onClick={() => generateQrMutation.mutate()} 
                          variant="outline"
                          disabled={generateQrMutation.isPending}
                          data-testid="button-regenerate-qr"
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${generateQrMutation.isPending ? 'animate-spin' : ''}`} />
                          Yenile
                        </Button>
                      </div>
                      <p className="text-xs text-center text-muted-foreground">
                        Bu QR kodu şubede görünür bir yere asın. Personel bu kodu okutarak vardiya girişi yapabilir.
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <QrCode className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">Henüz QR kod oluşturulmamış</p>
                      <Button 
                        onClick={() => generateQrMutation.mutate()}
                        disabled={generateQrMutation.isPending}
                        data-testid="button-generate-qr"
                      >
                        {generateQrMutation.isPending ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Oluşturuluyor...
                          </>
                        ) : (
                          <>
                            <QrCode className="h-4 w-4 mr-2" />
                            QR Kod Oluştur
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* NFC/RFID Yönetimi */}
              {isAdmin && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <QrCode className="h-4 w-4" />
                      NFC/RFID Yönetimi
                    </CardTitle>
                    <CardDescription>
                      NFC etiketleri ve QR kodları yönetin
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href={`/subeler/${branchId}/nfc`}>
                      <Button className="w-full" data-testid="button-nfc-details">
                        NFC Linki ve QR Kod İle Git
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {/* Kiosk Modu Seçici */}
              {isAdmin && (
                <KioskModeCard branchId={branchId} />
              )}

              {/* Müşteri Geri Bildirim QR Kodu */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Müşteri Geri Bildirim QR Kodu
                  </CardTitle>
                  <CardDescription>
                    Müşteriler bu QR kodu okutarak geri bildirim ve puanlama yapabilir
                  </CardDescription>
                </CardHeader>
                <CardContent className="w-full space-y-2 sm:space-y-3">
                  {feedbackQrData?.qrCode ? (
                    <div className="w-full space-y-2 sm:space-y-3">
                      <div className="flex flex-col items-center p-3 bg-white dark:bg-white rounded-lg">
                        <img 
                          src={feedbackQrData.qrCode} 
                          alt="Müşteri Geri Bildirim QR Kodu"
                          className="w-48 h-48"
                          data-testid="img-feedback-qr"
                          loading="lazy"
                        />
                        <p className="text-xs text-muted-foreground mt-2 font-mono text-center break-all max-w-[200px]">
                          {feedbackQrData.url}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center">
                        <Button 
                          onClick={() => {
                            const link = document.createElement('a');
                            link.download = `musteri-qr-${branch.name}.png`;
                            link.href = feedbackQrData.qrCode;
                            link.click();
                          }} 
                          variant="outline" 
                          data-testid="button-download-feedback-qr"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          İndir
                        </Button>
                        <Button 
                          onClick={() => {
                            navigator.clipboard.writeText(feedbackQrData.url);
                            setFeedbackCopied(true);
                            setTimeout(() => setFeedbackCopied(false), 2000);
                            toast({ title: "Kopyalandı", description: "Link panoya kopyalandı" });
                          }} 
                          variant="outline" 
                          data-testid="button-copy-feedback-qr"
                        >
                          {feedbackCopied ? <CheckCircle className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                          {feedbackCopied ? "Kopyalandı" : "Linki Kopyala"}
                        </Button>
                        <Button 
                          onClick={() => refetchFeedbackQr()} 
                          variant="outline"
                          data-testid="button-refresh-feedback-qr"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Yenile
                        </Button>
                      </div>
                      <p className="text-xs text-center text-muted-foreground">
                        Bu QR kodu müşterilerin görebileceği bir yere koyun. Müşteriler bu kodu okutarak size geri bildirim bırakabilir.
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">Henüz müşteri geri bildirim QR kodu oluşturulmamış</p>
                      <Button 
                        onClick={() => refetchFeedbackQr()}
                        data-testid="button-generate-feedback-qr"
                      >
                        <QrCode className="h-4 w-4 mr-2" />
                        Müşteri QR Kodu Oluştur
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Lokasyon Ayarları */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Lokasyon Doğrulama Ayarları
                  </CardTitle>
                  <CardDescription>
                    Personelin şubede olduğunu doğrulamak için GPS koordinatlarını ayarlayın
                  </CardDescription>
                </CardHeader>
                <CardContent className="w-full space-y-2 sm:space-y-3">
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="flex flex-col gap-3 sm:gap-4">
                      <Label htmlFor="latitude">Enlem (Latitude)</Label>
                      <Input 
                        id="latitude"
                        type="text"
                        placeholder="örn: 41.0082"
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                        data-testid="input-latitude"
                      />
                    </div>
                    <div className="flex flex-col gap-3 sm:gap-4">
                      <Label htmlFor="longitude">Boylam (Longitude)</Label>
                      <Input 
                        id="longitude"
                        type="text"
                        placeholder="örn: 28.9784"
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                        data-testid="input-longitude"
                      />
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    onClick={handleGetCurrentLocation}
                    className="w-full"
                    data-testid="button-get-location"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Mevcut Konumu Al
                  </Button>

                  <div className="flex flex-col gap-3 sm:gap-4">
                    <Label htmlFor="radius">İzin Yarıçapı (metre)</Label>
                    <Input 
                      id="radius"
                      type="number"
                      placeholder="50"
                      value={geoRadius}
                      onChange={(e) => setGeoRadius(e.target.value)}
                      data-testid="input-radius"
                    />
                    <p className="text-xs text-muted-foreground">
                      Personel bu yarıçap içinde olmalıdır. Önerilen: 50-100 metre
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:gap-4">
                    <Label htmlFor="wifi" className="flex items-center gap-2">
                      <Wifi className="h-4 w-4" />
                      WiFi Ağ Adı (Opsiyonel)
                    </Label>
                    <Input 
                      id="wifi"
                      type="text"
                      placeholder="örn: DOSPRESSO-SUBE1"
                      value={wifiSsid}
                      onChange={(e) => setWifiSsid(e.target.value)}
                      data-testid="input-wifi"
                    />
                    <p className="text-xs text-muted-foreground">
                      GPS doğrulaması yanı sıra WiFi bağlantısı da kontrol edilir
                    </p>
                  </div>

                  <Button 
                    onClick={handleSaveLocation}
                    disabled={updateLocationMutation.isPending}
                    className="w-full"
                    data-testid="button-save-location"
                  >
                    {updateLocationMutation.isPending ? "Kaydediliyor..." : "Ayarları Kaydet"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Çalışma Saatleri Kartı */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Çalışma Saatleri
                </CardTitle>
                <CardDescription>
                  AI vardiya planlaması için şube açılış-kapanış saatlerini ayarlayın
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="openingHours">Açılış Saati</Label>
                    <Input 
                      id="openingHours"
                      type="time"
                      value={openingHours}
                      onChange={(e) => setOpeningHours(e.target.value)}
                      data-testid="input-opening-hours"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="closingHours">Kapanış Saati</Label>
                    <Input 
                      id="closingHours"
                      type="time"
                      value={closingHours}
                      onChange={(e) => setClosingHours(e.target.value)}
                      data-testid="input-closing-hours"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Bu saatler AI vardiya planlamasında slot oluşturmak için kullanılır
                </p>
                <Button 
                  onClick={() => updateWorkingHoursMutation.mutate({ 
                    openingHours: openingHours + ':00', 
                    closingHours: closingHours + ':00' 
                  })}
                  disabled={updateWorkingHoursMutation.isPending}
                  className="w-full"
                  data-testid="button-save-hours"
                >
                  {updateWorkingHoursMutation.isPending ? "Kaydediliyor..." : "Saatleri Kaydet"}
                </Button>
              </CardContent>
            </Card>

            {/* Bilgi Kartı */}
            <Card className="border-primary/30 bg-primary/10 dark:border-primary/40 dark:bg-blue-950/30">
              <CardContent className="pt-6">
                <div className="flex gap-2 sm:gap-3">
                  <div className="p-2 bg-primary/10 dark:bg-primary/5 rounded-lg h-fit">
                    <CheckCircle className="h-4 w-4 text-primary dark:text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-primary dark:text-primary">Nasıl Çalışır?</h4>
                    <ul className="mt-2 text-sm text-primary dark:text-blue-300 space-y-1">
                      <li>1. QR kodu oluşturun ve şubeye asın</li>
                      <li>2. GPS koordinatlarını ayarlayın (şubenin tam konumu)</li>
                      <li>3. Personel QR kodu okuttuğunda GPS kontrolü yapılır</li>
                      <li>4. Şube yarıçapı içindeyse giriş onaylanır</li>
                      <li>5. GPS doğrulanamıyorsa fotoğraf istenir</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
