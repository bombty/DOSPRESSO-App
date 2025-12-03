import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  User, Calendar, Award, ClipboardCheck, 
  Clock, TrendingUp, AlertCircle, CheckCircle2, XCircle, LogOut
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

type PersonnelProfile = {
  id: string;
  username: string;
  fullName: string;
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

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 sm:gap-4 p-3">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-3">
        <p className="text-lg text-muted-foreground">Personel bulunamadı</p>
        <Link href="/ik">
          <Button variant="default" data-testid="button-back-ik">İK Yönetimine Dön</Button>
        </Link>
      </div>
    );
  }

  const performanceScore = profile.performanceScore || 0;
  const attendanceRate = profile.attendanceRate || 0;

  return (
    <div className="min-h-screen pb-20">
      <div className="p-3 flex flex-col gap-3 sm:gap-4">
        {/* Status badges */}
        <div className="flex items-center gap-2 flex-wrap justify-between">
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

      {/* Tabs */}
      <Tabs className="w-full flex flex-col gap-3 sm:gap-4">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="bilgiler" data-testid="tab-info" className="flex-1 min-w-fit">Kişisel Bilgiler</TabsTrigger>
          <TabsTrigger value="performans" data-testid="tab-performance" className="flex-1 min-w-fit">Performans</TabsTrigger>
          <TabsTrigger value="denetimler" data-testid="tab-audits" className="flex-1 min-w-fit">Denetimler</TabsTrigger>
          <TabsTrigger value="vardiyalar" data-testid="tab-shifts" className="flex-1 min-w-fit">Vardiyalar</TabsTrigger>
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

        <TabsContent value="akademi" className="flex flex-col gap-3">
          <Card>
            <CardHeader>
              <CardTitle>Akademi Modülleri</CardTitle>
              <CardDescription>Tüm akademi eğitim ve gelişim programlarına erişim</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                <Link href="/akademi">
                  <Button variant="outline" className="w-full" data-testid="link-akademi">Akademi</Button>
                </Link>
                <Link href="/akademi-hq">
                  <Button variant="outline" className="w-full" data-testid="link-akademi-hq">Yönetim</Button>
                </Link>
                <Link href="/akademi-supervisor">
                  <Button variant="outline" className="w-full" data-testid="link-akademi-supervisor">Supervisor</Button>
                </Link>
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
                <Link href="/akademi-progress-overview">
                  <Button variant="outline" className="w-full" data-testid="link-akademi-progress">İlerleme</Button>
                </Link>
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
