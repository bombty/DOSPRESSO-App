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
import { 
  User, Calendar, Award, ClipboardCheck, 
  Clock, TrendingUp, AlertCircle, CheckCircle2, XCircle, LogOut, Camera, Trash2, Wallet, Banknote, 
  Timer, Plus, Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  muhasebe: "Muhasebe",
  satinalma: "Satınalma",
  coach: "Coach",
  teknik: "Teknik",
  destek: "Destek",
  fabrika: "Fabrika",
  yatirimci_hq: "Yatırımcı (HQ)",
  supervisor: "Supervisor",
  supervisor_buddy: "Supervisor Buddy",
  barista: "Barista",
  bar_buddy: "Bar Buddy",
  stajyer: "Stajyer",
  yatirimci: "Yatırımcı",
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
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            Genel Performans
          </CardTitle>
          <CardDescription>Son 30 günlük performans özeti</CardDescription>
        </CardHeader>
        <CardContent className="w-full space-y-2 sm:space-y-3">
          <div className="w-full space-y-2 sm:space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Performans Skoru</span>
                <span className="text-2xl font-bold" data-testid="performance-score">
                  {performanceScore.toFixed(1)}
                </span>
              </div>
              <Progress value={performanceScore} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Devam Oranı</span>
                <span className="text-2xl font-bold" data-testid="attendance-rate">
                  {attendanceRate.toFixed(0)}%
                </span>
              </div>
              <Progress value={attendanceRate} className="h-2" />
            </div>
          </div>
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
          {/* İlerleme Özeti */}
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

          {/* Önerilen Sonraki Adım */}
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

          {/* Akademi Modülleri */}
          <Card>
            <CardHeader>
              <CardTitle>Hızlı Erişim</CardTitle>
              <CardDescription>Akademi bölümlerine hızlı erişim</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                <Link href="/akademi">
                  <Button variant="outline" className="w-full" data-testid="link-akademi">Akademi</Button>
                </Link>
                {(user?.role === 'admin' || user?.role === 'yatirimci_hq') && (
                  <Link href="/akademi-hq">
                    <Button variant="outline" className="w-full" data-testid="link-akademi-hq">Yönetim</Button>
                  </Link>
                )}
                {(user?.role === 'supervisor' || user?.role === 'supervisor_buddy' || user?.role === 'admin' || user?.role === 'yatirimci_hq') && (
                  <Link href="/akademi-supervisor">
                    <Button variant="outline" className="w-full" data-testid="link-akademi-supervisor">Supervisor</Button>
                  </Link>
                )}
                <Link href="/akademi-analytics">
                  <Button variant="outline" className="w-full" data-testid="link-akademi-analytics">Analitik</Button>
                </Link>
                <Link href="/akademi-badges">
                  <Button variant="outline" className="w-full" data-testid="link-akademi-badges">Rozetler</Button>
                </Link>
                <Link href="/akademi-leaderboard">
                  <Button variant="outline" className="w-full" data-testid="link-akademi-leaderboard">Sıralama</Button>
                </Link>
                <Link href="/akademi-learning-paths">
                  <Button variant="outline" className="w-full" data-testid="link-akademi-paths">Yollar</Button>
                </Link>
                <Link href="/akademi-certificates">
                  <Button variant="outline" className="w-full" data-testid="link-akademi-certificates">Sertifikalar</Button>
                </Link>
                <Link href="/akademi-achievements">
                  <Button variant="outline" className="w-full" data-testid="link-akademi-achievements">Başarılar</Button>
                </Link>
                {(user?.role === 'admin' || user?.role === 'yatirimci_hq') && (
                  <Link href="/akademi-progress-overview">
                    <Button variant="outline" className="w-full" data-testid="link-akademi-progress">İlerleme</Button>
                  </Link>
                )}
                <Link href="/akademi-streak-tracker">
                  <Button variant="outline" className="w-full" data-testid="link-akademi-streak">Seri</Button>
                </Link>
                <Link href="/akademi-ai-assistant">
                  <Button variant="outline" className="w-full" data-testid="link-akademi-ai">AI Asistan</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
