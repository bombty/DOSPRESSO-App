import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Users,
  Store,
  Factory,
  ShoppingCart,
  GraduationCap,
  Megaphone,
  ClipboardCheck,
  DollarSign,
  Package,
  Truck,
  BarChart3,
  Target,
  Zap,
  Heart,
  Clock,
  Star,
  Award,
  BookOpen,
  Calendar,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Activity,
  Gauge,
  FileText,
  PieChart,
  LineChart,
  Building2,
  Briefcase,
  UserCheck,
  UserX,
  Coffee,
  Flame,
  Timer,
  AlertOctagon,
  Eye,
  MousePointer,
  Share2,
  TrendingUpIcon,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type RiskStatus = 'healthy' | 'warning' | 'critical';
type Trend = 'up' | 'down' | 'stable';

interface MetricCard {
  title: string;
  value: string | number;
  subValue?: string;
  trend?: Trend;
  trendValue?: string;
  status?: RiskStatus;
  icon: React.ReactNode;
  onClick?: () => void;
}

interface DepartmentData {
  metrics: MetricCard[];
  charts?: any[];
  alerts?: Array<{ message: string; severity: RiskStatus }>;
}

function getRiskBadgeVariant(status: RiskStatus): "default" | "secondary" | "destructive" {
  switch (status) {
    case 'healthy': return 'default';
    case 'warning': return 'secondary';
    case 'critical': return 'destructive';
  }
}

function getRiskIcon(status: RiskStatus) {
  switch (status) {
    case 'healthy': return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    case 'critical': return <AlertTriangle className="w-4 h-4 text-red-500" />;
  }
}

function getTrendIcon(trend: Trend) {
  switch (trend) {
    case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
    case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />;
    case 'stable': return <Minus className="w-4 h-4 text-muted-foreground" />;
  }
}

function MetricCardComponent({ metric, testId }: { metric: MetricCard; testId?: string }) {
  return (
    <Card className="hover-elevate cursor-pointer" onClick={metric.onClick} data-testid={testId || `card-metric-${metric.title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              {metric.icon}
            </div>
            <div>
              <p className="text-xs text-muted-foreground" data-testid="text-metric-title">{metric.title}</p>
              <p className="text-xl font-bold" data-testid="text-metric-value">{metric.value}</p>
              {metric.subValue && (
                <p className="text-xs text-muted-foreground">{metric.subValue}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {metric.status && (
              <Badge variant={getRiskBadgeVariant(metric.status)} className="text-xs">
                {metric.status === 'healthy' ? 'İyi' : metric.status === 'warning' ? 'Dikkat' : 'Kritik'}
              </Badge>
            )}
            {metric.trend && (
              <div className="flex items-center gap-1">
                {getTrendIcon(metric.trend)}
                {metric.trendValue && (
                  <span className="text-xs text-muted-foreground">{metric.trendValue}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AlertPanel({ alerts }: { alerts: Array<{ message: string; severity: RiskStatus }> }) {
  if (!alerts || alerts.length === 0) return null;
  
  return (
    <Card data-testid="panel-alerts">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertOctagon className="w-4 h-4" />
          Aktif Uyarılar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((alert, index) => (
          <div key={index} className="flex items-center gap-2 p-2 rounded-md bg-muted/50" data-testid={`alert-item-${index}`}>
            {getRiskIcon(alert.severity)}
            <span className="text-sm" data-testid="text-alert-message">{alert.message}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SatinalmaDashboard() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/hq-dashboard/satinalma'],
  });

  const mockData: DepartmentData = {
    metrics: [
      { title: "Aktif Tedarikçi", value: 24, icon: <Truck className="w-5 h-5 text-blue-500" />, status: 'healthy', trend: 'stable' },
      { title: "Bekleyen Sipariş", value: 12, icon: <Package className="w-5 h-5 text-orange-500" />, status: 'warning', subValue: "₺145,000" },
      { title: "Stok Kritik Ürün", value: 3, icon: <AlertTriangle className="w-5 h-5 text-red-500" />, status: 'critical', trend: 'up', trendValue: "+2" },
      { title: "Tedarikçi Skoru", value: "87%", icon: <Star className="w-5 h-5 text-yellow-500" />, status: 'healthy', trend: 'up', trendValue: "+3%" },
      { title: "Ortalama Teslimat", value: "2.4 gün", icon: <Clock className="w-5 h-5 text-green-500" />, status: 'healthy', trend: 'down', trendValue: "-0.2 gün" },
      { title: "Bu Ay Harcama", value: "₺892K", icon: <DollarSign className="w-5 h-5 text-emerald-500" />, trend: 'up', trendValue: "+12%" },
    ],
    alerts: [
      { message: "Kahve çekirdeği stoğu kritik seviyede (3 gün)", severity: 'critical' },
      { message: "Süt tedarikçisi fiyat artışı bildirdi (%8)", severity: 'warning' },
    ]
  };

  const displayData = data || mockData;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const demandData = [
    { name: 'Pzt', kahve: 120, sut: 80, seker: 40 },
    { name: 'Sal', kahve: 140, sut: 90, seker: 45 },
    { name: 'Çar', kahve: 130, sut: 85, seker: 42 },
    { name: 'Per', kahve: 150, sut: 95, seker: 50 },
    { name: 'Cum', kahve: 180, sut: 110, seker: 60 },
    { name: 'Cmt', kahve: 200, sut: 130, seker: 70 },
    { name: 'Paz', kahve: 170, sut: 100, seker: 55 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <ShoppingCart className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Satınalma Dashboard</h1>
        <Badge>Samet</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {displayData.metrics.map((metric: MetricCard, index: number) => (
          <MetricCardComponent key={index} metric={metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Haftalık Talep Tahmini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={demandData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="kahve" fill="hsl(var(--primary))" name="Kahve (kg)" />
                <Bar dataKey="sut" fill="hsl(var(--secondary))" name="Süt (lt)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <AlertPanel alerts={displayData.alerts} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4" />
            MOQ Optimizasyonu Önerileri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10">
              <div>
                <p className="font-medium">Kahve Çekirdeği Toplu Alım</p>
                <p className="text-sm text-muted-foreground">500kg siparişle %12 indirim</p>
              </div>
              <Badge variant="default">₺18,000 tasarruf</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10">
              <div>
                <p className="font-medium">Süt Sözleşme Yenileme</p>
                <p className="text-sm text-muted-foreground">6 aylık anlaşma önerisi</p>
              </div>
              <Badge variant="secondary">%5 fiyat sabitleme</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FabrikaDashboard() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/hq-dashboard/fabrika'],
  });

  const mockData: DepartmentData = {
    metrics: [
      { title: "Günlük Üretim", value: "2,450", icon: <Factory className="w-5 h-5 text-blue-500" />, subValue: "ürün", status: 'healthy', trend: 'up', trendValue: "+8%" },
      { title: "Verim Oranı", value: "94.2%", icon: <Gauge className="w-5 h-5 text-green-500" />, status: 'healthy', trend: 'up', trendValue: "+1.2%" },
      { title: "Fire Oranı", value: "2.1%", icon: <Flame className="w-5 h-5 text-orange-500" />, status: 'healthy', trend: 'down', trendValue: "-0.3%" },
      { title: "Ekipman Durumu", value: "96%", icon: <Zap className="w-5 h-5 text-yellow-500" />, status: 'healthy' },
      { title: "Vardiya Performans", value: "A+", icon: <Award className="w-5 h-5 text-purple-500" />, status: 'healthy' },
      { title: "Bekleyen İş Emri", value: 8, icon: <ClipboardCheck className="w-5 h-5 text-red-500" />, status: 'warning' },
    ],
    alerts: [
      { message: "Kavurma makinesi bakım zamanı yaklaşıyor (3 gün)", severity: 'warning' },
    ]
  };

  const displayData = data || mockData;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const productionData = [
    { name: '06:00', uretim: 180, hedef: 200 },
    { name: '08:00', uretim: 220, hedef: 200 },
    { name: '10:00', uretim: 195, hedef: 200 },
    { name: '12:00', uretim: 180, hedef: 200 },
    { name: '14:00', uretim: 210, hedef: 200 },
    { name: '16:00', uretim: 230, hedef: 200 },
    { name: '18:00', uretim: 200, hedef: 200 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Factory className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Fabrika Yönetim Dashboard</h1>
        <Badge>Eren</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {displayData.metrics.map((metric: MetricCard, index: number) => (
          <MetricCardComponent key={index} metric={metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <LineChart className="w-4 h-4" />
              Saatlik Üretim Takibi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={productionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Area type="monotone" dataKey="uretim" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.3)" name="Üretim" />
                <Area type="monotone" dataKey="hedef" stroke="hsl(var(--muted-foreground))" fill="transparent" strokeDasharray="5 5" name="Hedef" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <AlertPanel alerts={displayData.alerts} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Reçete Sapma Uyarıları
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-lg bg-yellow-500/10">
              <span className="text-sm">Espresso Blend - Su oranı +2%</span>
              <Badge variant="secondary">Düşük Risk</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/10">
              <span className="text-sm">Cold Brew - Tüm parametreler normal</span>
              <Badge variant="default">OK</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function IKDashboard() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/hq-dashboard/ik'],
  });

  const mockData: DepartmentData = {
    metrics: [
      { title: "Toplam Personel", value: 156, icon: <Users className="w-5 h-5 text-blue-500" />, status: 'healthy', trend: 'up', trendValue: "+4" },
      { title: "Aktif İzin", value: 8, icon: <Calendar className="w-5 h-5 text-orange-500" />, status: 'warning' },
      { title: "Bekleyen Başvuru", value: 12, icon: <FileText className="w-5 h-5 text-purple-500" />, trend: 'up', trendValue: "+3" },
      { title: "Devamsızlık", value: "2.4%", icon: <UserX className="w-5 h-5 text-red-500" />, status: 'healthy', trend: 'down', trendValue: "-0.5%" },
      { title: "Eğitim Tamamlama", value: "87%", icon: <GraduationCap className="w-5 h-5 text-green-500" />, status: 'healthy' },
      { title: "Moral Skoru", value: "4.2/5", icon: <Heart className="w-5 h-5 text-pink-500" />, status: 'healthy', trend: 'up' },
    ],
    alerts: [
      { message: "3 personelin sözleşmesi bu ay sona eriyor", severity: 'warning' },
      { message: "İbni Sina şubesinde devamsızlık artışı", severity: 'warning' },
    ]
  };

  const displayData = data || mockData;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const turnoverData = [
    { name: 'Oca', giren: 5, cikan: 2 },
    { name: 'Şub', giren: 3, cikan: 1 },
    { name: 'Mar', giren: 4, cikan: 3 },
    { name: 'Nis', giren: 6, cikan: 2 },
    { name: 'May', giren: 4, cikan: 4 },
    { name: 'Haz', giren: 7, cikan: 1 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Briefcase className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">İK & Muhasebe Dashboard</h1>
        <Badge>Mahmut</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {displayData.metrics.map((metric: MetricCard, index: number) => (
          <MetricCardComponent key={index} metric={metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Personel Giriş/Çıkış Trendi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={turnoverData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="giren" fill="hsl(var(--primary))" name="Giren" />
                <Bar dataKey="cikan" fill="hsl(var(--destructive))" name="Çıkan" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <AlertPanel alerts={displayData.alerts} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Ayrılma Riski Yüksek Personel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-lg bg-red-500/10">
              <div className="flex items-center gap-2">
                <UserX className="w-4 h-4 text-red-500" />
                <span className="text-sm">Ahmet Y. - Barista (İbni Sina)</span>
              </div>
              <Badge variant="destructive">Yüksek Risk</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-yellow-500/10">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                <span className="text-sm">Zeynep K. - Barista (Merkez)</span>
              </div>
              <Badge variant="secondary">Orta Risk</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CoachDashboard() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/hq-dashboard/coach'],
  });

  const mockData: DepartmentData = {
    metrics: [
      { title: "Toplam Şube", value: 8, icon: <Store className="w-5 h-5 text-blue-500" />, status: 'healthy' },
      { title: "Ortalama Skor", value: "4.3/5", icon: <Star className="w-5 h-5 text-yellow-500" />, status: 'healthy', trend: 'up', trendValue: "+0.2" },
      { title: "Uyum Oranı", value: "92%", icon: <ClipboardCheck className="w-5 h-5 text-green-500" />, status: 'healthy' },
      { title: "Kritik Şube", value: 1, icon: <AlertTriangle className="w-5 h-5 text-red-500" />, status: 'critical' },
      { title: "Checklist Tamamlama", value: "88%", icon: <CheckCircle className="w-5 h-5 text-emerald-500" />, status: 'healthy' },
      { title: "Haftalık Ziyaret", value: 12, icon: <Eye className="w-5 h-5 text-purple-500" />, trend: 'up', trendValue: "+2" },
    ],
    alerts: [
      { message: "Gaziantep İbni Sina - 3 gündür checklist eksik", severity: 'critical' },
      { message: "Merkez şube - Satış hedefinin %15 altında", severity: 'warning' },
    ]
  };

  const displayData = data || mockData;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const branchScores = [
    { name: 'Merkez', score: 4.5, status: 'healthy' },
    { name: 'İbni Sina', score: 3.2, status: 'critical' },
    { name: 'Forum', score: 4.3, status: 'healthy' },
    { name: 'AVM', score: 4.1, status: 'healthy' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Store className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Coach Dashboard</h1>
        <Badge>Yavuz</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {displayData.metrics.map((metric: MetricCard, index: number) => (
          <MetricCardComponent key={index} metric={metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Şube Sağlık Skorları
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {branchScores.map((branch, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-sm w-24">{branch.name}</span>
                  <Progress value={branch.score * 20} className="flex-1" />
                  <Badge variant={getRiskBadgeVariant(branch.status as RiskStatus)}>
                    {branch.score}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <AlertPanel alerts={displayData.alerts} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4" />
            En İyi Uygulama Önerileri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-lg bg-blue-500/10">
              <span className="text-sm">Forum şubesinin açılış rutinini tüm şubelere uygula</span>
              <Badge>Öneri</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/10">
              <span className="text-sm">Merkez şubesinin müşteri karşılama sistemi referans alındı</span>
              <Badge variant="default">Aktif</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MarketingDashboard() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/hq-dashboard/marketing'],
  });

  const mockData: DepartmentData = {
    metrics: [
      { title: "Aktif Kampanya", value: 3, icon: <Megaphone className="w-5 h-5 text-purple-500" />, status: 'healthy' },
      { title: "Sosyal Takipçi", value: "24.5K", icon: <Users className="w-5 h-5 text-blue-500" />, trend: 'up', trendValue: "+1.2K" },
      { title: "Kampanya ROI", value: "340%", icon: <TrendingUp className="w-5 h-5 text-green-500" />, status: 'healthy' },
      { title: "Marka Algısı", value: "4.6/5", icon: <Heart className="w-5 h-5 text-pink-500" />, status: 'healthy', trend: 'up' },
      { title: "İçerik Üretim", value: 28, icon: <FileText className="w-5 h-5 text-orange-500" />, subValue: "bu ay" },
      { title: "Web Trafik", value: "45K", icon: <MousePointer className="w-5 h-5 text-cyan-500" />, trend: 'up', trendValue: "+18%" },
    ],
    alerts: [
      { message: "Instagram etkileşim oranı düşüşte (%12)", severity: 'warning' },
    ]
  };

  const displayData = data || mockData;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const campaignData = [
    { name: 'Yaz Kampanyası', roi: 340, spend: 15000 },
    { name: 'Sadakat Programı', roi: 280, spend: 8000 },
    { name: 'Yeni Ürün Lansman', roi: 180, spend: 12000 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Megaphone className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Marketing Dashboard</h1>
        <Badge>Diana</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {displayData.metrics.map((metric: MetricCard, index: number) => (
          <MetricCardComponent key={index} metric={metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              Kampanya ROI Karşılaştırma
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={campaignData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={12} />
                <YAxis dataKey="name" type="category" fontSize={10} width={100} />
                <Tooltip />
                <Bar dataKey="roi" fill="hsl(var(--primary))" name="ROI %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <AlertPanel alerts={displayData.alerts} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Trend Radar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg bg-green-500/10">
              <p className="text-xs text-muted-foreground">Yükselen</p>
              <p className="font-medium">Cold Brew</p>
              <p className="text-xs text-green-600">+45% arama</p>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <p className="text-xs text-muted-foreground">Popüler</p>
              <p className="font-medium">Oat Milk</p>
              <p className="text-xs text-blue-600">Sabit talep</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TrainerDashboard() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/hq-dashboard/trainer'],
  });

  const mockData: DepartmentData = {
    metrics: [
      { title: "Aktif Eğitim", value: 5, icon: <BookOpen className="w-5 h-5 text-blue-500" />, status: 'healthy' },
      { title: "Tamamlama Oranı", value: "78%", icon: <CheckCircle className="w-5 h-5 text-green-500" />, status: 'healthy', trend: 'up', trendValue: "+5%" },
      { title: "Ortalama Quiz", value: "82/100", icon: <Award className="w-5 h-5 text-yellow-500" />, status: 'healthy' },
      { title: "Eğitim İhtiyacı", value: 12, icon: <AlertCircle className="w-5 h-5 text-orange-500" />, subValue: "personel" },
      { title: "Reçete Uyum", value: "95%", icon: <Coffee className="w-5 h-5 text-amber-500" />, status: 'healthy' },
      { title: "Sertifika Bekleyen", value: 8, icon: <GraduationCap className="w-5 h-5 text-purple-500" />, trend: 'stable' },
    ],
    alerts: [
      { message: "5 personelin temel eğitimi eksik", severity: 'warning' },
    ]
  };

  const displayData = data || mockData;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const skillData = [
    { name: 'Espresso', level: 85 },
    { name: 'Latte Art', level: 72 },
    { name: 'Cold Brew', level: 90 },
    { name: 'Müşteri İlişkileri', level: 88 },
    { name: 'Temizlik', level: 95 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <GraduationCap className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Trainer Dashboard</h1>
        <Badge>Ece</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {displayData.metrics.map((metric: MetricCard, index: number) => (
          <MetricCardComponent key={index} metric={metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Ortalama Yetkinlik Haritası
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {skillData.map((skill, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-sm w-32">{skill.name}</span>
                  <Progress value={skill.level} className="flex-1" />
                  <span className="text-sm text-muted-foreground w-12">{skill.level}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <AlertPanel alerts={displayData.alerts} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4" />
            Eğitim → Performans Bağlantısı
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/10">
              <span className="text-sm">Latte Art eğitimi alan personelde satış +23%</span>
              <Badge variant="default">Güçlü Korelasyon</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-blue-500/10">
              <span className="text-sm">Müşteri ilişkileri eğitimi → NPS +12 puan</span>
              <Badge>Pozitif</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KaliteDashboard() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/hq-dashboard/kalite'],
  });

  const mockData: DepartmentData = {
    metrics: [
      { title: "Kalite Skoru", value: "4.5/5", icon: <Star className="w-5 h-5 text-yellow-500" />, status: 'healthy', trend: 'up' },
      { title: "Açık Şikayet", value: 3, icon: <MessageSquare className="w-5 h-5 text-red-500" />, status: 'warning' },
      { title: "Fabrika Denetim", value: "98%", icon: <ClipboardCheck className="w-5 h-5 text-green-500" />, status: 'healthy' },
      { title: "Ürün Ret", value: "0.8%", icon: <ThumbsDown className="w-5 h-5 text-orange-500" />, status: 'healthy', trend: 'down' },
      { title: "Müşteri Memnun", value: "92%", icon: <ThumbsUp className="w-5 h-5 text-emerald-500" />, status: 'healthy' },
      { title: "Bekleyen Feedback", value: 15, icon: <FileText className="w-5 h-5 text-blue-500" />, trend: 'down', trendValue: "-5" },
    ],
    alerts: [
      { message: "İbni Sina şubesinden 2 olumsuz feedback", severity: 'warning' },
    ]
  };

  const displayData = data || mockData;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const qualityTrend = [
    { name: 'Hafta 1', skor: 4.2 },
    { name: 'Hafta 2', skor: 4.3 },
    { name: 'Hafta 3', skor: 4.1 },
    { name: 'Hafta 4', skor: 4.5 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardCheck className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Kalite Kontrol Dashboard</h1>
        <Badge>Ümran</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {displayData.metrics.map((metric: MetricCard, index: number) => (
          <MetricCardComponent key={index} metric={metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <LineChart className="w-4 h-4" />
              Kalite Skoru Trendi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={qualityTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis domain={[3.5, 5]} fontSize={12} />
                <Tooltip />
                <Area type="monotone" dataKey="skor" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.3)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <AlertPanel alerts={displayData.alerts} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Son Müşteri Geri Bildirimleri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/10">
              <div className="flex items-center gap-2">
                <ThumbsUp className="w-4 h-4 text-green-500" />
                <span className="text-sm">"Harika kahve, çok lezzetli!"</span>
              </div>
              <span className="text-xs text-muted-foreground">Forum Şubesi</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-red-500/10">
              <div className="flex items-center gap-2">
                <ThumbsDown className="w-4 h-4 text-red-500" />
                <span className="text-sm">"Servis yavaştı"</span>
              </div>
              <span className="text-xs text-muted-foreground">İbni Sina</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CGODashboard() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/hq-dashboard/cgo'],
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const departmentSummary = [
    { name: 'Satınalma', status: 'warning', score: 78, owner: 'Samet' },
    { name: 'Fabrika', status: 'healthy', score: 94, owner: 'Eren' },
    { name: 'İK', status: 'healthy', score: 87, owner: 'Mahmut' },
    { name: 'Coach', status: 'warning', score: 82, owner: 'Yavuz' },
    { name: 'Marketing', status: 'healthy', score: 91, owner: 'Diana' },
    { name: 'Trainer', status: 'healthy', score: 88, owner: 'Ece' },
    { name: 'Kalite', status: 'healthy', score: 92, owner: 'Ümran' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">CGO Command Center</h1>
        <Badge>Utku</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCardComponent metric={{ title: "Toplam Şube", value: 8, icon: <Store className="w-5 h-5 text-blue-500" />, status: 'healthy' }} />
        <MetricCardComponent metric={{ title: "Toplam Personel", value: 156, icon: <Users className="w-5 h-5 text-green-500" />, trend: 'up', trendValue: "+4" }} />
        <MetricCardComponent metric={{ title: "Operasyonel Skor", value: "87%", icon: <Gauge className="w-5 h-5 text-yellow-500" />, status: 'healthy' }} />
        <MetricCardComponent metric={{ title: "Kritik Uyarı", value: 2, icon: <AlertTriangle className="w-5 h-5 text-red-500" />, status: 'warning' }} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            Departman Sağlık Özeti
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {departmentSummary.map((dept, index) => (
              <Card key={index} className="hover-elevate cursor-pointer">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{dept.name}</span>
                    {getRiskIcon(dept.status as RiskStatus)}
                  </div>
                  <Progress value={dept.score} className="h-2 mb-1" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{dept.owner}</span>
                    <span className="text-xs font-medium">{dept.score}%</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertOctagon className="w-4 h-4" />
              Cross-Department Uyarılar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10">
              {getRiskIcon('critical')}
              <div>
                <p className="text-sm font-medium">Stok-Üretim Uyumsuzluğu</p>
                <p className="text-xs text-muted-foreground">Kahve stoğu 3 günlük, üretim planı 7 gün</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10">
              {getRiskIcon('warning')}
              <div>
                <p className="text-sm font-medium">Personel-Şube Dengesizliği</p>
                <p className="text-xs text-muted-foreground">İbni Sina %20 eksik personel</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Hızlı Aksiyonlar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="p-2 rounded-lg bg-primary/10 cursor-pointer hover-elevate">
              <p className="text-sm font-medium">Acil Stok Siparişi</p>
              <p className="text-xs text-muted-foreground">Kahve çekirdeği için onay bekliyor</p>
            </div>
            <div className="p-2 rounded-lg bg-secondary/10 cursor-pointer hover-elevate">
              <p className="text-sm font-medium">Personel Takviyesi</p>
              <p className="text-xs text-muted-foreground">İbni Sina için 2 transfer önerisi</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="w-6 h-6 rounded" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function HQDashboard() {
  const [, params] = useRoute("/hq-dashboard/:department");
  const department = params?.department || 'cgo';

  const departmentComponents: Record<string, React.ComponentType> = {
    'cgo': CGODashboard,
    'satinalma': SatinalmaDashboard,
    'fabrika': FabrikaDashboard,
    'ik': IKDashboard,
    'coach': CoachDashboard,
    'marketing': MarketingDashboard,
    'trainer': TrainerDashboard,
    'kalite': KaliteDashboard,
  };

  const DepartmentComponent = departmentComponents[department] || CGODashboard;

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <DepartmentComponent />
    </div>
  );
}
