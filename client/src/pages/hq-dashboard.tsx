import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { UnifiedHero } from "@/components/widgets/unified-hero";
import { ModuleCardsGrid } from "@/components/widgets/module-cards-grid";
import { CriticalAlerts } from "@/components/critical-alerts";
import { DailyTaskPanel } from "@/components/daily-task-panel";
import { motion } from "framer-motion";
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
  Lightbulb,
  ChevronRight,
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
  iconBgClass?: string;
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
  const isClickable = !!metric.onClick;
  
  return (
    <Card 
      className={isClickable ? "hover-elevate cursor-pointer" : ""} 
      onClick={metric.onClick} 
      data-testid={testId || `card-metric-${metric.title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md ${metric.iconBgClass || 'bg-primary/10'} [&>svg]:w-4 [&>svg]:h-4 shrink-0`}>
            {metric.icon ? metric.icon : <Store className="w-4 h-4 text-muted-foreground" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-muted-foreground truncate" data-testid="text-metric-title">{metric.title}</p>
            <div className="flex items-center gap-1.5">
              <p className="text-lg font-bold leading-tight" data-testid="text-metric-value">{metric.value}</p>
              {metric.trend && (
                <span className="shrink-0">{getTrendIcon(metric.trend)}</span>
              )}
              {metric.status && (
                <Badge variant={getRiskBadgeVariant(metric.status)} className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                  {metric.status === 'healthy' ? 'İyi' : metric.status === 'warning' ? 'Dikkat' : 'Kritik'}
                </Badge>
              )}
            </div>
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
      <CardHeader className="pb-1 pt-3 px-3">
        <CardTitle className="text-xs flex items-center gap-1.5">
          <AlertOctagon className="w-3.5 h-3.5" />
          Aktif Uyarılar
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-1.5">
        {alerts.map((alert, index) => (
          <div key={index} className="flex items-center gap-2 p-1.5 rounded-md bg-muted/50" data-testid={`alert-item-${index}`}>
            {getRiskIcon(alert.severity)}
            <span className="text-xs" data-testid="text-alert-message">{alert.message}</span>
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

  const fallbackMetrics: MetricCard[] = [
    { title: "Aktif Tedarikçi", value: 24, icon: <Truck className="w-5 h-5 text-blue-500" />, iconBgClass: "bg-blue-500/10", status: 'healthy', trend: 'stable' },
    { title: "Bekleyen Sipariş", value: 12, icon: <Package className="w-5 h-5 text-orange-500" />, iconBgClass: "bg-orange-500/10", status: 'warning' },
    { title: "Ortalama Teslimat", value: "2.4 gün", icon: <Clock className="w-5 h-5 text-green-500" />, iconBgClass: "bg-green-500/10", status: 'healthy' },
    { title: "Fiyat Uyarısı", value: 5, icon: <AlertTriangle className="w-5 h-5 text-red-500" />, iconBgClass: "bg-red-500/10", status: 'critical' },
  ];

  const fallbackAlerts = [
    { message: "Kahve çekirdeği stoğu kritik seviyede (3 gün)", severity: 'critical' as RiskStatus },
    { message: "Süt tedarikçisi fiyat artışı bildirdi (%8)", severity: 'warning' as RiskStatus },
  ];

  const metrics = data?.metrics ? data.metrics.map((m: any, index: number) => {
    const fallbackIcon = fallbackMetrics[index]?.icon || <Package className="w-5 h-5 text-muted-foreground" />;
    return {
      title: m.title,
      value: m.value,
      status: m.status,
      trend: m.trend,
      icon: fallbackIcon,
      iconBgClass: fallbackMetrics[index]?.iconBgClass,
      onClick: fallbackMetrics[index]?.onClick
    };
  }) : fallbackMetrics;
  
  const alerts = data?.alerts || fallbackAlerts;

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
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-border/50">
        <ShoppingCart className="w-4 h-4 text-primary" />
        <h2 className="text-base font-semibold" data-testid="text-dashboard-title">Satınalma</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {metrics.map((metric: MetricCard, index: number) => (
          <MetricCardComponent key={index} metric={metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-2" data-testid="chart-demand-forecast">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              Haftalık Talep Tahmini
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={demandData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} width={25} />
                <Tooltip contentStyle={{ fontSize: '12px' }} />
                <Bar dataKey="kahve" fill="hsl(var(--primary))" name="Kahve (kg)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="sut" fill="hsl(var(--secondary))" name="Süt (lt)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <AlertPanel alerts={alerts} />
      </div>

      <Card data-testid="card-moq-optimizer">
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-xs flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" />
            MOQ Optimizasyonu Önerileri
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/10">
              <div>
                <p className="text-xs font-medium">Kahve Çekirdeği Toplu Alım</p>
                <p className="text-[10px] text-muted-foreground">500kg siparişle %12 indirim</p>
              </div>
              <Badge variant="default" className="text-[10px]">₺18,000 tasarruf</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-blue-500/10">
              <div>
                <p className="text-xs font-medium">Süt Sözleşme Yenileme</p>
                <p className="text-[10px] text-muted-foreground">6 aylık anlaşma önerisi</p>
              </div>
              <Badge variant="secondary" className="text-[10px]">%5 fiyat sabitleme</Badge>
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

  const fallbackMetrics: MetricCard[] = [
    { title: "Günlük Üretim", value: "2,450 kg", icon: <Factory className="w-5 h-5 text-blue-500" />, iconBgClass: "bg-blue-500/10", status: 'healthy', trend: 'up' },
    { title: "Verimlilik", value: "94.2%", icon: <Gauge className="w-5 h-5 text-green-500" />, iconBgClass: "bg-green-500/10", status: 'healthy' },
    { title: "Fire Oranı", value: "1.8%", icon: <Flame className="w-5 h-5 text-orange-500" />, iconBgClass: "bg-orange-500/10", status: 'healthy' },
    { title: "Makine Uptime", value: "98.5%", icon: <Zap className="w-5 h-5 text-yellow-500" />, iconBgClass: "bg-yellow-500/10", status: 'healthy' },
  ];

  const fallbackAlerts = [
    { message: "Kavurma makinesi bakım zamanı yaklaşıyor", severity: 'warning' as RiskStatus },
  ];

  const metrics = data?.metrics ? data.metrics.map((m: any, index: number) => {
    const fallbackIcon = fallbackMetrics[index]?.icon || <Factory className="w-5 h-5 text-muted-foreground" />;
    return {
      title: m.title,
      value: m.value,
      status: m.status,
      trend: m.trend,
      icon: fallbackIcon,
      iconBgClass: fallbackMetrics[index]?.iconBgClass,
      onClick: fallbackMetrics[index]?.onClick
    };
  }) : fallbackMetrics;
  
  const alerts = data?.alerts || fallbackAlerts;

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
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-border/50">
        <Factory className="w-4 h-4 text-primary" />
        <h2 className="text-base font-semibold" data-testid="text-dashboard-title">Fabrika</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {metrics.map((metric: MetricCard, index: number) => (
          <MetricCardComponent key={index} metric={metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-2" data-testid="chart-production-tracking">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <LineChart className="w-3.5 h-3.5" />
              Saatlik Üretim Takibi
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={productionData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} width={25} />
                <Tooltip contentStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="uretim" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.3)" name="Üretim" />
                <Area type="monotone" dataKey="hedef" stroke="hsl(var(--muted-foreground))" fill="transparent" strokeDasharray="5 5" name="Hedef" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <AlertPanel alerts={alerts} />
      </div>

      <Card>
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-xs flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Reçete Sapma Uyarıları
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-lg bg-yellow-500/10">
              <span className="text-xs">Espresso Blend - Su oranı +2%</span>
              <Badge variant="secondary" className="text-[10px]">Düşük Risk</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/10">
              <span className="text-xs">Cold Brew - Tüm parametreler normal</span>
              <Badge variant="default" className="text-[10px]">OK</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

function IKDashboard() {
  const [, navigate] = useLocation();
  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/hq-dashboard/ik'],
  });

  const fallbackMetrics: MetricCard[] = [
    { title: "Toplam Personel", value: 156, icon: <Users className="w-5 h-5 text-blue-500" />, iconBgClass: "bg-blue-500/10", status: 'healthy', trend: 'up' },
    { title: "Yıllık Turnover", value: "12%", icon: <UserX className="w-5 h-5 text-red-500" />, iconBgClass: "bg-red-500/10", status: 'warning' },
    { title: "Ortalama Deneyim", value: "2.3 yıl", icon: <Calendar className="w-5 h-5 text-orange-500" />, iconBgClass: "bg-orange-500/10", status: 'healthy' },
    { title: "Eğitim Tamamlama", value: "85%", icon: <GraduationCap className="w-5 h-5 text-green-500" />, iconBgClass: "bg-green-500/10", status: 'healthy' },
  ];

  const fallbackAlerts = [
    { message: "3 personelin sözleşmesi bu ay sona eriyor", severity: 'warning' as RiskStatus },
    { message: "İbni Sina şubesinde devamsızlık artışı", severity: 'warning' as RiskStatus },
  ];

  const metrics = data?.metrics ? data.metrics.map((m: any, index: number) => {
    const fallbackIcon = fallbackMetrics[index]?.icon || <Users className="w-5 h-5 text-muted-foreground" />;
    return {
      title: m.title,
      value: m.value,
      status: m.status,
      trend: m.trend,
      icon: fallbackIcon,
      iconBgClass: fallbackMetrics[index]?.iconBgClass,
      onClick: fallbackMetrics[index]?.onClick
    };
  }) : fallbackMetrics;
  
  const alerts = data?.alerts || fallbackAlerts;

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
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/50 flex-wrap">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-primary" />
          <h2 className="text-base font-semibold" data-testid="text-dashboard-title">IK & Muhasebe</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="default" className="gap-1.5" onClick={() => navigate('/hq/kiosk')} data-testid="button-hq-kiosk">
            <Clock className="w-3.5 h-3.5" />
            HQ Kiosk
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate('/hq-personel-durum')} data-testid="button-hq-staff-status">
            <Eye className="w-3.5 h-3.5" />
            Personel Durum
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {metrics.map((metric: MetricCard, index: number) => (
          <MetricCardComponent key={index} metric={metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              Personel Giriş/Çıkış Trendi
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={turnoverData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} width={25} />
                <Tooltip contentStyle={{ fontSize: '12px' }} />
                <Bar dataKey="giren" fill="hsl(var(--primary))" name="Giren" radius={[2, 2, 0, 0]} />
                <Bar dataKey="cikan" fill="hsl(var(--destructive))" name="Çıkan" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <AlertPanel alerts={alerts} />

          <Card>
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-xs flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                Ayrılma Riski
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-1.5 rounded-md bg-red-500/10">
                  <div className="flex items-center gap-1.5">
                    <UserX className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span className="text-xs truncate">Ahmet Y. - Barista</span>
                  </div>
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 shrink-0">Yüksek</Badge>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded-md bg-yellow-500/10">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                    <span className="text-xs truncate">Zeynep K. - Barista</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0">Orta</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}

function CoachDashboard() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/hq-dashboard/coach'],
  });

  const fallbackMetrics: MetricCard[] = [
    { 
      title: "Ortalama Şube Puanı", 
      value: "4.2/5", 
      icon: <Star className="w-5 h-5 text-yellow-500" />, 
      iconBgClass: "bg-yellow-500/10",
      status: 'healthy', 
      trend: 'up',
      onClick: () => setLocation('/raporlar/performans')
    },
    { 
      title: "Ziyaret Bekleyen", 
      value: 8, 
      icon: <Eye className="w-5 h-5 text-purple-500" />, 
      iconBgClass: "bg-purple-500/10",
      status: 'warning',
      onClick: () => setLocation('/operasyon/subeler')
    },
    { 
      title: "Uyumluluk Oranı", 
      value: "91%", 
      icon: <ClipboardCheck className="w-5 h-5 text-green-500" />, 
      iconBgClass: "bg-green-500/10",
      status: 'healthy',
      onClick: () => setLocation('/operasyon/checklistler')
    },
    { 
      title: "İyileştirme Önerisi", 
      value: 15, 
      icon: <Lightbulb className="w-5 h-5 text-orange-500" />, 
      iconBgClass: "bg-orange-500/10",
      status: 'healthy',
      onClick: () => setLocation('/raporlar/ai-asistan')
    },
  ];

  const fallbackAlerts = [
    { message: "Gaziantep İbni Sina - 3 gündür checklist eksik", severity: 'critical' as RiskStatus },
    { message: "Merkez şube - Satış hedefinin %15 altında", severity: 'warning' as RiskStatus },
  ];

  const metrics = data?.metrics ? data.metrics.map((m: any, index: number) => {
    const fallbackIcon = fallbackMetrics[index]?.icon || <Store className="w-5 h-5 text-muted-foreground" />;
    return {
      title: m.title,
      value: m.value,
      status: m.status,
      trend: m.trend,
      icon: fallbackIcon,
      iconBgClass: fallbackMetrics[index]?.iconBgClass,
      onClick: fallbackMetrics[index]?.onClick
    };
  }) : fallbackMetrics;
  
  const alerts = data?.alerts || fallbackAlerts;

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
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-border/50">
        <Store className="w-4 h-4 text-primary" />
        <h2 className="text-base font-semibold" data-testid="text-dashboard-title">Coach</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {metrics.map((metric: MetricCard, index: number) => (
          <MetricCardComponent key={index} metric={metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card 
          className="hover-elevate cursor-pointer" 
          onClick={() => setLocation('/operasyon/subeler')}
          data-testid="card-branch-scores"
        >
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Şube Sağlık Skorları
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-2">
              {branchScores.map((branch, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-xs w-24">{branch.name}</span>
                  <Progress value={branch.score * 20} className="flex-1" />
                  <Badge variant={getRiskBadgeVariant(branch.status as RiskStatus)} className="text-[10px]">
                    {branch.score}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <AlertPanel alerts={alerts} />
      </div>

      <Card 
        className="hover-elevate cursor-pointer"
        onClick={() => setLocation('/raporlar/ai-asistan')}
        data-testid="card-recommendations"
      >
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-xs flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" />
            En İyi Uygulama Önerileri
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-lg bg-blue-500/10">
              <span className="text-xs">Forum şubesinin açılış rutinini tüm şubelere uygula</span>
              <Badge className="text-[10px]">Öneri</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/10">
              <span className="text-xs">Merkez şubesinin müşteri karşılama sistemi referans alındı</span>
              <Badge variant="default" className="text-[10px]">Aktif</Badge>
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

  const fallbackMetrics: MetricCard[] = [
    { title: "Aktif Kampanya", value: 4, icon: <Megaphone className="w-5 h-5 text-purple-500" />, iconBgClass: "bg-purple-500/10", status: 'healthy' },
    { title: "Sosyal Medya Erişimi", value: "125K", icon: <Users className="w-5 h-5 text-blue-500" />, iconBgClass: "bg-blue-500/10", trend: 'up' },
    { title: "Kampanya ROI", value: "3.2x", icon: <TrendingUp className="w-5 h-5 text-green-500" />, iconBgClass: "bg-green-500/10", status: 'healthy' },
    { title: "Müşteri Memnuniyeti", value: "4.5/5", icon: <Heart className="w-5 h-5 text-pink-500" />, iconBgClass: "bg-pink-500/10", status: 'healthy' },
  ];

  const fallbackAlerts = [
    { message: "Instagram etkileşim oranı düşüşte (%12)", severity: 'warning' as RiskStatus },
  ];

  const metrics = data?.metrics ? data.metrics.map((m: any, index: number) => {
    const fallbackIcon = fallbackMetrics[index]?.icon || <Megaphone className="w-5 h-5 text-muted-foreground" />;
    return {
      title: m.title,
      value: m.value,
      status: m.status,
      trend: m.trend,
      icon: fallbackIcon,
      iconBgClass: fallbackMetrics[index]?.iconBgClass,
      onClick: fallbackMetrics[index]?.onClick
    };
  }) : fallbackMetrics;
  
  const alerts = data?.alerts || fallbackAlerts;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const campaignData = [
    { name: 'Yaz Kampanyası', roi: 340, spend: 15000 },
    { name: 'Sadakat Programı', roi: 280, spend: 8000 },
    { name: 'Yeni Ürün Lansman', roi: 180, spend: 12000 },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-border/50">
        <Megaphone className="w-4 h-4 text-primary" />
        <h2 className="text-base font-semibold" data-testid="text-dashboard-title">Marketing</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {metrics.map((metric: MetricCard, index: number) => (
          <MetricCardComponent key={index} metric={metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5" />
              Kampanya ROI Karşılaştırma
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
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

        <AlertPanel alerts={alerts} />
      </div>

      <Card>
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-xs flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5" />
            Trend Radar
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg bg-green-500/10">
              <p className="text-xs text-muted-foreground">Yükselen</p>
              <p className="text-xs font-medium">Cold Brew</p>
              <p className="text-xs text-green-600">+45% arama</p>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <p className="text-xs text-muted-foreground">Popüler</p>
              <p className="text-xs font-medium">Oat Milk</p>
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

  const fallbackMetrics: MetricCard[] = [
    { title: "Eğitim Tamamlama", value: "78%", icon: <CheckCircle className="w-5 h-5 text-green-500" />, iconBgClass: "bg-green-500/10", status: 'warning', trend: 'up' },
    { title: "Ortalama Quiz Puanı", value: "82%", icon: <Award className="w-5 h-5 text-yellow-500" />, iconBgClass: "bg-yellow-500/10", status: 'healthy' },
    { title: "Sertifika Bekleyen", value: 12, icon: <GraduationCap className="w-5 h-5 text-purple-500" />, iconBgClass: "bg-purple-500/10", status: 'warning' },
    { title: "Aktif Öğrenci", value: 150, icon: <Users className="w-5 h-5 text-blue-500" />, iconBgClass: "bg-blue-500/10", status: 'healthy' },
  ];

  const fallbackAlerts = [
    { message: "5 personelin temel eğitimi eksik", severity: 'warning' as RiskStatus },
  ];

  const metrics = data?.metrics ? data.metrics.map((m: any, index: number) => {
    const fallbackIcon = fallbackMetrics[index]?.icon || <BookOpen className="w-5 h-5 text-muted-foreground" />;
    return {
      title: m.title,
      value: m.value,
      status: m.status,
      trend: m.trend,
      icon: fallbackIcon,
      iconBgClass: fallbackMetrics[index]?.iconBgClass,
      onClick: fallbackMetrics[index]?.onClick
    };
  }) : fallbackMetrics;
  
  const alerts = data?.alerts || fallbackAlerts;

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
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-border/50">
        <GraduationCap className="w-4 h-4 text-primary" />
        <h2 className="text-base font-semibold" data-testid="text-dashboard-title">Trainer</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {metrics.map((metric: MetricCard, index: number) => (
          <MetricCardComponent key={index} metric={metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              Ortalama Yetkinlik Haritası
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-2">
              {skillData.map((skill, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-xs w-32">{skill.name}</span>
                  <Progress value={skill.level} className="flex-1" />
                  <span className="text-[10px] text-muted-foreground w-12">{skill.level}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <AlertPanel alerts={alerts} />
      </div>

      <Card>
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-xs flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" />
            Eğitim → Performans Bağlantısı
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/10">
              <span className="text-xs">Latte Art eğitimi alan personelde satış +23%</span>
              <Badge variant="default" className="text-[10px]">Güçlü Korelasyon</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-blue-500/10">
              <span className="text-xs">Müşteri ilişkileri eğitimi → NPS +12 puan</span>
              <Badge className="text-[10px]">Pozitif</Badge>
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

  const fallbackMetrics: MetricCard[] = [
    { title: "Kalite Skoru", value: "94%", icon: <Star className="w-5 h-5 text-yellow-500" />, iconBgClass: "bg-yellow-500/10", status: 'healthy', trend: 'up' },
    { title: "Müşteri Puanı", value: "4.5/5", icon: <ThumbsUp className="w-5 h-5 text-green-500" />, iconBgClass: "bg-green-500/10", status: 'healthy' },
    { title: "Açık Şikayet", value: 3, icon: <MessageSquare className="w-5 h-5 text-red-500" />, iconBgClass: "bg-red-500/10", status: 'warning' },
    { title: "Denetim Puanı", value: "A+", icon: <ClipboardCheck className="w-5 h-5 text-emerald-500" />, iconBgClass: "bg-emerald-500/10", status: 'healthy' },
  ];

  const fallbackAlerts = [
    { message: "İbni Sina şubesinden 2 olumsuz feedback", severity: 'warning' as RiskStatus },
  ];

  const metrics = data?.metrics ? data.metrics.map((m: any, index: number) => {
    const fallbackIcon = fallbackMetrics[index]?.icon || <ClipboardCheck className="w-5 h-5 text-muted-foreground" />;
    return {
      title: m.title,
      value: m.value,
      status: m.status,
      trend: m.trend,
      icon: fallbackIcon,
      iconBgClass: fallbackMetrics[index]?.iconBgClass,
      onClick: fallbackMetrics[index]?.onClick
    };
  }) : fallbackMetrics;
  
  const alerts = data?.alerts || fallbackAlerts;

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
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-border/50">
        <ClipboardCheck className="w-4 h-4 text-primary" />
        <h2 className="text-base font-semibold" data-testid="text-dashboard-title">Kalite Kontrol</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {metrics.map((metric: MetricCard, index: number) => (
          <MetricCardComponent key={index} metric={metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <LineChart className="w-3.5 h-3.5" />
              Kalite Skoru Trendi
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
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

        <AlertPanel alerts={alerts} />
      </div>

      <Card>
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-xs flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            Son Müşteri Geri Bildirimleri
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/10">
              <div className="flex items-center gap-2">
                <ThumbsUp className="w-3.5 h-3.5 text-green-500" />
                <span className="text-xs">"Harika kahve, çok lezzetli!"</span>
              </div>
              <span className="text-[10px] text-muted-foreground">Forum Şubesi</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-red-500/10">
              <div className="flex items-center gap-2">
                <ThumbsDown className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs">"Servis yavaştı"</span>
              </div>
              <span className="text-[10px] text-muted-foreground">İbni Sina</span>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

const departmentOwnerMap: Record<string, string> = {
  "Satinalma": "Samet",
  "Fabrika": "Eren",
  "IK": "Mahmut",
  "Coach": "Yavuz",
  "Marketing": "Diana",
  "Trainer": "Ece",
  "Kalite": "Ümran",
};

function CGODashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/hq-dashboard/cgo'],
  });

  const departmentRouteMap: Record<string, string> = {
    'Satınalma': '/satinalma',
    'Fabrika': '/fabrika',
    'İK': '/ik',
    'Coach': '/raporlar/performans',
    'Marketing': '/admin/icerik-studyosu',
    'Trainer': '/akademi',
    'Kalite': '/fabrika',
    'Muhasebe': '/raporlar',
  };

  const hqQuickActions = [
    { icon: Store, label: "Operasyonlar", color: "text-blue-500", bgColor: "bg-blue-500/10", route: "/operasyon" },
    { icon: Users, label: "Personel", color: "text-green-500", bgColor: "bg-green-500/10", route: "/ik" },
    { icon: AlertTriangle, label: "Arızalar", color: "text-red-500", bgColor: "bg-red-500/10", route: "/ekipman/ariza" },
    { icon: ClipboardCheck, label: "Checklistler", color: "text-emerald-500", bgColor: "bg-emerald-500/10", route: "/operasyon/checklistler" },
    { icon: Factory, label: "Fabrika", color: "text-orange-500", bgColor: "bg-orange-500/10", route: "/fabrika" },
    { icon: ShoppingCart, label: "Satınalma", color: "text-cyan-500", bgColor: "bg-cyan-500/10", route: "/satinalma" },
    { icon: GraduationCap, label: "Akademi", color: "text-purple-500", bgColor: "bg-purple-500/10", route: "/akademi" },
  ];

  const fallbackMetrics = [
    { title: "Toplam Şube", value: 8, status: 'healthy' as RiskStatus, icon: <Store className="w-5 h-5 text-blue-500" /> },
    { title: "Aktif Personel", value: 156, trend: 'up' as Trend, icon: <Users className="w-5 h-5 text-green-500" /> },
    { title: "Açık Arızalar", value: 5, status: 'warning' as RiskStatus, icon: <AlertTriangle className="w-5 h-5 text-red-500" /> },
    { title: "Checklist Tamamlanma", value: "92%", status: 'healthy' as RiskStatus, icon: <CheckCircle className="w-5 h-5 text-emerald-500" /> },
  ];

  const fallbackDepartmentHealth = [
    { name: 'Satınalma', status: 'healthy', score: 88 },
    { name: 'Fabrika', status: 'healthy', score: 82 },
    { name: 'İK', status: 'healthy', score: 91 },
    { name: 'Coach', status: 'warning', score: 79 },
    { name: 'Marketing', status: 'healthy', score: 94 },
    { name: 'Trainer', status: 'healthy', score: 85 },
    { name: 'Kalite', status: 'healthy', score: 90 },
  ];

  const fallbackAlerts = [
    { message: "3 şubede SLA ihlali riski", severity: 'warning' as RiskStatus },
    { message: "Haftalık eğitim hedefi %15 altında", severity: 'critical' as RiskStatus },
  ];

  const metrics = data?.metrics || fallbackMetrics;
  const departmentHealth = data?.departmentHealth || fallbackDepartmentHealth;
  const alerts = data?.alerts || fallbackAlerts;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const departmentSummary = departmentHealth.map((dept: any) => ({
    ...dept,
    owner: departmentOwnerMap[dept.name] || 'HQ'
  }));

  const overallScore = Math.round(departmentHealth.reduce((sum: number, d: any) => sum + d.score, 0) / departmentHealth.length);

  return (
    <div className="space-y-3">
      {/* Genel Performans + Departman Sağlık */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5" />
              Genel Performans
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16 shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted/30" />
                  <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="none" strokeDasharray={`${(overallScore / 100) * 251.2} 251.2`} className={overallScore >= 80 ? 'text-green-500' : overallScore >= 60 ? 'text-yellow-500' : 'text-red-500'} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold">{overallScore}</span>
                </div>
              </div>
              <div className="flex-1 space-y-1">
                {fallbackMetrics.slice(0, 3).map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{m.title}</span>
                    <span className="font-medium">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5" />
              Departman Sağlık Özeti
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
              {departmentSummary.map((dept: any, index: number) => (
                <div 
                  key={index} 
                  className="flex items-center gap-1.5 p-1.5 rounded-md bg-muted/50 cursor-pointer hover-elevate"
                  onClick={() => {
                    const route = departmentRouteMap[dept.name];
                    if (route) setLocation(route);
                  }}
                  data-testid={`card-department-${dept.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {getRiskIcon(dept.status as RiskStatus)}
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium truncate">{dept.name}</p>
                    <div className="flex items-center gap-1">
                      <Progress value={dept.score} className="h-1 flex-1" />
                      <span className="text-[10px] text-muted-foreground">{dept.score}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <AlertOctagon className="w-3.5 h-3.5" />
              Cross-Department Uyarılar
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-1.5">
            <div 
              className="flex items-center gap-2 p-1.5 rounded-md bg-red-500/10 cursor-pointer hover-elevate"
              onClick={() => setLocation('/satinalma')}
              data-testid="alert-stok-uretim"
            >
              {getRiskIcon('critical')}
              <div className="min-w-0">
                <p className="text-xs font-medium">Stok-Üretim Uyumsuzluğu</p>
                <p className="text-[10px] text-muted-foreground truncate">Kahve stoğu 3 günlük, üretim planı 7 gün</p>
              </div>
            </div>
            <div 
              className="flex items-center gap-2 p-1.5 rounded-md bg-yellow-500/10 cursor-pointer hover-elevate"
              onClick={() => setLocation('/ik')}
              data-testid="alert-personel-sube"
            >
              {getRiskIcon('warning')}
              <div className="min-w-0">
                <p className="text-xs font-medium">Personel-Şube Dengesizliği</p>
                <p className="text-[10px] text-muted-foreground truncate">İbni Sina %20 eksik personel</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Hızlı Aksiyonlar
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-1.5">
            <div 
              className="p-1.5 rounded-md bg-primary/10 cursor-pointer hover-elevate"
              onClick={() => setLocation('/satinalma')}
              data-testid="action-acil-stok"
            >
              <p className="text-xs font-medium">Acil Stok Siparişi</p>
              <p className="text-[10px] text-muted-foreground">Kahve çekirdeği için onay bekliyor</p>
            </div>
            <div 
              className="p-1.5 rounded-md bg-secondary/10 cursor-pointer hover-elevate"
              onClick={() => setLocation('/ik')}
              data-testid="action-personel-takviye"
            >
              <p className="text-xs font-medium">Personel Takviyesi</p>
              <p className="text-[10px] text-muted-foreground">İbni Sina için 2 transfer önerisi</p>
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
  const { user } = useAuth();
  const userRole = user?.role || '';
  
  const cgoRoles = ['cgo', 'ceo', 'yatirimci_hq'];
  const isCGO = cgoRoles.includes(userRole);

  const roleToDashboard: Record<string, React.ComponentType> = {
    'cgo': CGODashboard,
    'ceo': CGODashboard,
    'satinalma': SatinalmaDashboard,
    'fabrika': FabrikaDashboard,
    'fabrika_mudur': FabrikaDashboard,
    'muhasebe': IKDashboard,
    'muhasebe_ik': IKDashboard,
    'coach': CoachDashboard,
    'marketing': MarketingDashboard,
    'trainer': TrainerDashboard,
    'kalite_kontrol': KaliteDashboard,
    'teknik': SatinalmaDashboard,
    'destek': CoachDashboard,
    'yatirimci_hq': CGODashboard,
  };

  const DepartmentComponent = roleToDashboard[userRole] || CGODashboard;

  return (
    <div className="container mx-auto p-3 max-w-7xl space-y-3">
      <UnifiedHero />
      {!isCGO && <CriticalAlerts />}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <DepartmentComponent />
        </div>
        <div className="lg:col-span-1">
          <DailyTaskPanel />
        </div>
      </div>
      <ModuleCardsGrid />
    </div>
  );
}
