import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, Users, CheckCircle2, Clock, Wrench, TrendingUp, 
  Star, Award, ClipboardCheck, ThumbsUp, QrCode, MapPin, 
  Wifi, Download, RefreshCw, Copy, CheckCircle, BarChart3
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { isHQRole } from "@shared/schema";

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
  fullName: string;
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

  // Authorization: Supervisor can only view their own branch
  if (user?.role === 'supervisor' && user?.branchId !== branchId) {
    return (
      <div className="flex flex-col items-center justify-center h-full grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
        <p className="text-lg text-muted-foreground">Bu şubeye erişim yetkiniz yok</p>
        <Link href="/subeler">
          <Button variant="default">Şubelere Dön</Button>
        </Link>
      </div>
    );
  }

  // Fetch comprehensive branch details with scores and staff
  const { data: branchData, isLoading: branchLoading, refetch } = useQuery<BranchDetails>({
    queryKey: [`/api/branches/${branchId}/detail`],
    enabled: !!branchId,
  });

  // Generate QR token mutation
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

  return (
    <div className="flex flex-col gap-3 sm:gap-4 p-3">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Link href="/subeler">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{branch.name}</h1>
          <p className="text-muted-foreground">{branch.city} • {branch.address}</p>
        </div>
      </div>

      {/* Composite Performance Score */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" />
            Genel Performans Skoru
          </CardTitle>
          <CardDescription>4 ana kategorinin ağırlıklı ortalaması</CardDescription>
        </CardHeader>
        <CardContent className="w-full space-y-2 sm:space-y-3">
          <div className="text-center">
            <div className="text-5xl font-bold text-primary" data-testid="composite-score">
              {scores.compositeScore.toFixed(1)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">100 üzerinden</p>
          </div>
          <Progress value={scores.compositeScore} className="h-2" data-testid="progress-composite" />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
          {isAdmin && (
            <TabsTrigger value="qr-ayarlar" data-testid="tab-qr-settings">
              QR & Lokasyon
            </TabsTrigger>
          )}
        </TabsList>

        {/* KPI Cards */}
        {showCards && (
          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <Card 
              onClick={() => { setActiveTab("personel"); setShowCards(false); }} 
              className="hover-elevate active-elevate-2 cursor-pointer"
              data-testid="card-metric-employee"
            >
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Personel Performansı</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="score-employee">{scores.employeePerformanceScore.toFixed(1)}</div>
                <Progress value={scores.employeePerformanceScore} className="h-1 mt-2" />
                <p className="text-xs text-muted-foreground mt-1">Ağırlık: %40</p>
              </CardContent>
            </Card>

            <Card 
              onClick={() => { setActiveTab("ekipman"); setShowCards(false); }} 
              className="hover-elevate active-elevate-2 cursor-pointer"
              data-testid="card-metric-equipment"
            >
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ekipman Durumu</CardTitle>
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="score-equipment">{scores.equipmentScore.toFixed(1)}</div>
                <Progress value={scores.equipmentScore} className="h-1 mt-2" />
                <p className="text-xs text-muted-foreground mt-1">Ağırlık: %25</p>
              </CardContent>
            </Card>

            <Card 
              onClick={() => { setActiveTab("gorevler"); setShowCards(false); }} 
              className="hover-elevate active-elevate-2 cursor-pointer"
              data-testid="card-metric-quality"
            >
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Kalite Denetimi</CardTitle>
                <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="score-quality">{scores.qualityAuditScore.toFixed(1)}</div>
                <Progress value={scores.qualityAuditScore} className="h-1 mt-2" />
                <p className="text-xs text-muted-foreground mt-1">Ağırlık: %20</p>
              </CardContent>
            </Card>

            <Card 
              onClick={() => { setActiveTab("arizalar"); setShowCards(false); }} 
              className="hover-elevate active-elevate-2 cursor-pointer"
              data-testid="card-metric-satisfaction"
            >
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Müşteri Memnuniyeti</CardTitle>
                <ThumbsUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="score-satisfaction">{scores.customerSatisfactionScore.toFixed(1)}</div>
                <Progress value={scores.customerSatisfactionScore} className="h-1 mt-2" />
                <p className="text-xs text-muted-foreground mt-1">Ağırlık: %15</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Action Buttons */}
        {isAdmin && (
          <div className="flex gap-2">
            <Link href={`/sube-gorevler/${branchId}`}>
              <Button variant="outline" size="sm" data-testid="button-task-performance">
                <BarChart3 className="w-4 h-4 mr-2" />
                Görev Performansı
              </Button>
            </Link>
          </div>
        )}

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
            <CardHeader>
              <CardTitle>Şube Personeli</CardTitle>
              <CardDescription>{staff.length} çalışan</CardDescription>
            </CardHeader>
            <CardContent>
              {staff.length === 0 ? (
                <p className="text-muted-foreground">Henüz personel eklenmemiş</p>
              ) : (
                <div className="flex flex-col gap-3 sm:gap-4">
                  {staff.map((emp) => (
                    <Link key={emp.id} href={`/personel-detay/${emp.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg border hover-elevate active-elevate-2" data-testid={`employee-${emp.id}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold truncate">{emp.fullName}</p>
                            <Badge variant="outline" className="flex-shrink-0">{emp.role}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            {emp.performanceScore !== undefined && (
                              <div className="flex items-center gap-1" data-testid={`performance-${emp.id}`}>
                                <Award className="h-3.5 w-3.5 text-amber-500" />
                                <span className="text-xs font-medium">Skor: {emp.performanceScore.toFixed(1)}</span>
                              </div>
                            )}
                            {emp.hireDate && (
                              <span className="text-xs text-muted-foreground">
                                Başlangıç: {new Date(emp.hireDate).toLocaleDateString('tr-TR')}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant={emp.isActive ? "default" : "secondary"} className="flex-shrink-0 ml-2">
                          {emp.isActive ? "Aktif" : "Pasif"}
                        </Badge>
                      </div>
                    </Link>
                  ))}
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
                    <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border" data-testid={`task-${task.id}`}>
                      <div>
                        <p className="font-medium">{task.description}</p>
                        <p className="text-sm text-muted-foreground">{task.assignedTo}</p>
                      </div>
                      <Badge variant={task.status === 'tamamlandi' ? "default" : "secondary"}>
                        {task.status === 'tamamlandi' ? 'Tamamlandı' : 'Bekliyor'}
                      </Badge>
                    </div>
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
                    <Link key={equip.id} href={`/ekipman/${equip.id}`}>
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
                      <div className="flex flex-col items-center p-3 bg-white rounded-lg">
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
