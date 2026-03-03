import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { MuhasebeIKDashboard } from "@/components/dashboards/muhasebe-ik-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UnifiedHero } from "@/components/widgets/unified-hero";
import { CriticalAlerts } from "@/components/critical-alerts";
import { DailyTaskPanel } from "@/components/daily-task-panel";
import { MrDobody } from "@/components/mr-dobody";
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
  Wrench,
  Settings,
  Download,
  Mail,
  Check,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
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

  const metricConfig: Record<string, { icon: JSX.Element; iconBgClass: string; onClick: () => void }> = {
    "Ortalama Şube Puanı": { icon: <Star className="w-5 h-5 text-yellow-500" />, iconBgClass: "bg-yellow-500/10", onClick: () => setLocation('/sube-saglik-skoru') },
    "Ziyaret Bekleyen": { icon: <Eye className="w-5 h-5 text-purple-500" />, iconBgClass: "bg-purple-500/10", onClick: () => setLocation('/sube-saglik-skoru') },
    "Uyumluluk Oranı": { icon: <ClipboardCheck className="w-5 h-5 text-green-500" />, iconBgClass: "bg-green-500/10", onClick: () => setLocation('/operasyon?tab=checklistler') },
    "İyileştirme Önerisi": { icon: <Lightbulb className="w-5 h-5 text-orange-500" />, iconBgClass: "bg-orange-500/10", onClick: () => setLocation('/raporlar/ai-asistan') },
  };
  const defaultIcon = <Store className="w-5 h-5 text-muted-foreground" />;

  const metrics: MetricCard[] = data?.metrics ? data.metrics.map((m: any) => {
    const cfg = metricConfig[m.title];
    return {
      title: m.title,
      value: m.value,
      status: m.status,
      trend: m.trend,
      icon: cfg?.icon || defaultIcon,
      iconBgClass: cfg?.iconBgClass,
      onClick: cfg?.onClick,
    };
  }) : Object.entries(metricConfig).map(([title, cfg]) => ({
    title,
    value: "—",
    status: 'healthy' as RiskStatus,
    icon: cfg.icon,
    iconBgClass: cfg.iconBgClass,
    onClick: cfg.onClick,
  }));

  const alerts = data?.alerts || [];
  const branchScores: { id: number; name: string; score: number; level: string; trend: string; delta: number; status: string; riskFlags: any[] }[] = data?.branchScores || [];
  const summary = data?.summary;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

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

      {summary && (
        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
          <span>{summary.totalBranches} şube</span>
          <span>·</span>
          <Badge variant="default" className="text-[10px]">{summary.green} yeşil</Badge>
          <Badge variant="secondary" className="text-[10px]">{summary.yellow} sarı</Badge>
          {summary.red > 0 && <Badge variant="destructive" className="text-[10px]">{summary.red} kırmızı</Badge>}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card 
          className="cursor-pointer" 
          onClick={() => setLocation('/sube-saglik-skoru')}
          data-testid="card-branch-scores"
        >
          <CardHeader className="pb-1 pt-3 px-3 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Şube Sağlık Skorları ({branchScores.length})
            </CardTitle>
            <span className="text-[10px] text-muted-foreground">Detay için tıkla</span>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {branchScores.map((branch) => (
                <div key={branch.id} className="flex items-center gap-2" data-testid={`row-branch-${branch.id}`}>
                  <span className="text-xs w-28 truncate">{branch.name}</span>
                  <Progress value={branch.score} className="flex-1" />
                  <Badge 
                    variant={branch.status === 'healthy' ? 'default' : branch.status === 'warning' ? 'secondary' : 'destructive'} 
                    className="text-[10px] min-w-[3rem] justify-center"
                  >
                    {branch.score}
                  </Badge>
                  {branch.trend === 'down' && <span className="text-destructive text-[10px]">↓</span>}
                  {branch.trend === 'up' && <span className="text-green-500 text-[10px]">↑</span>}
                </div>
              ))}
              {branchScores.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Şube verisi bulunamadı</p>
              )}
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
  "Satınalma": "Samet",
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
  const { toast } = useToast();
  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/hq-dashboard/cgo'],
  });

  const { data: pendingOrders } = useQuery<any[]>({
    queryKey: ['/api/purchase-orders', 'onay_bekliyor'],
    queryFn: async () => {
      const res = await fetch('/api/purchase-orders?status=onay_bekliyor');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const approveOrderMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("PATCH", `/api/purchase-orders/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders', 'onay_bekliyor'] });
      queryClient.invalidateQueries({ predicate: (query) => (query.queryKey[0] as string).startsWith("/api/purchase-orders") });
      toast({ title: "Sipariş onaylandı" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Onaylama başarısız", variant: "destructive" });
    }
  });

  const rejectOrderMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("PATCH", `/api/purchase-orders/${id}/status`, { status: "iptal" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders', 'onay_bekliyor'] });
      queryClient.invalidateQueries({ predicate: (query) => (query.queryKey[0] as string).startsWith("/api/purchase-orders") });
      toast({ title: "Sipariş reddedildi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Reddetme başarısız", variant: "destructive" });
    }
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

      {pendingOrders && pendingOrders.length > 0 && (
        <Card data-testid="card-pending-orders">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <ShoppingCart className="w-3.5 h-3.5" />
              Onay Bekleyen Satınalma Siparişleri
              <Badge variant="secondary" className="ml-1" data-testid="badge-pending-count">{pendingOrders.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Siparis No</TableHead>
                  <TableHead className="text-xs">Tedarikci</TableHead>
                  <TableHead className="text-xs text-right">Tutar</TableHead>
                  <TableHead className="text-xs">Tarih</TableHead>
                  <TableHead className="text-xs text-right">Islem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingOrders.map((order: any) => (
                  <TableRow key={order.id} data-testid={`row-pending-order-${order.id}`}>
                    <TableCell className="text-xs font-medium" data-testid={`text-order-number-${order.id}`}>{order.orderNumber}</TableCell>
                    <TableCell className="text-xs" data-testid={`text-supplier-${order.id}`}>{order.supplierName || order.supplier?.name || "-"}</TableCell>
                    <TableCell className="text-xs text-right" data-testid={`text-amount-${order.id}`}>
                      {new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(Number(order.totalAmount || 0))}
                    </TableCell>
                    <TableCell className="text-xs" data-testid={`text-date-${order.id}`}>
                      {order.orderDate ? new Date(order.orderDate).toLocaleDateString("tr-TR") : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => approveOrderMutation.mutate(order.id)}
                          disabled={approveOrderMutation.isPending}
                          data-testid={`button-approve-pending-${order.id}`}
                        >
                          <Check className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => rejectOrderMutation.mutate(order.id)}
                          disabled={rejectOrderMutation.isPending}
                          data-testid={`button-reject-pending-${order.id}`}
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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

const sanitizeTurkishPDF = (text: string): string => {
  return text
    .replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G');
};

function HQEscalatedFaults({ faults, onNavigate }: { faults: any[]; onNavigate: (path: string) => void }) {
  const hqFaults = faults.filter(f =>
    (f.responsibleParty === 'hq' || f.faultProtocol === 'hq_teknik') &&
    f.currentStage !== 'kapatildi' && f.status !== 'resolved' && f.status !== 'closed'
  );

  const generateFaultPDF = (fault: any) => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    doc.setFontSize(22);
    doc.setTextColor(139, 69, 19);
    doc.text("DOSPRESSO", pw / 2, 20, { align: "center" });
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text(sanitizeTurkishPDF("Ariza Raporu - Merkez Servis"), pw / 2, 28, { align: "center" });
    doc.setDrawColor(139, 69, 19);
    doc.setLineWidth(0.5);
    doc.line(14, 35, pw - 14, 35);
    let y = 45;
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(sanitizeTurkishPDF(`Ariza #${fault.id}`), 14, y); y += 10;
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    const addField = (l: string, v: string) => {
      doc.setFont("helvetica", "bold");
      doc.text(sanitizeTurkishPDF(l) + ":", 14, y);
      doc.setFont("helvetica", "normal");
      doc.text(sanitizeTurkishPDF(v || "-"), 65, y);
      y += 8;
    };
    addField("Ekipman", fault.equipmentName || "-");
    addField("Şube", fault.branchName || `Şube #${fault.branchId}`);
    addField("Öncelik", fault.priority === 'yuksek' ? 'Yüksek' : fault.priority === 'kritik' ? 'Kritik' : fault.priority === 'orta' ? 'Orta' : 'Düşük');
    addField("Durum", fault.currentStage || fault.status);
    addField("Rapor Tarihi", fault.createdAt ? format(new Date(fault.createdAt), "dd MMM yyyy HH:mm", { locale: tr }) : "-");
    addField("Raporlayan", fault.reportedByName || "-");
    y += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, y, pw - 14, y); y += 10;
    doc.setFont("helvetica", "bold");
    doc.text(sanitizeTurkishPDF("Aciklama:"), 14, y); y += 7;
    doc.setFont("helvetica", "normal");
    const desc = fault.description || "Aciklama girilmedi";
    const splitDesc = doc.splitTextToSize(sanitizeTurkishPDF(desc), pw - 28);
    doc.text(splitDesc, 14, y);
    y += splitDesc.length * 6 + 10;
    doc.setFont("helvetica", "bold");
    doc.text(sanitizeTurkishPDF("Servis Ileti Bilgisi:"), 14, y); y += 7;
    doc.setFont("helvetica", "normal");
    doc.text(sanitizeTurkishPDF("Bu ariza raporu teknik servise iletilmek uzere hazirlanmistir."), 14, y); y += 7;
    doc.text(sanitizeTurkishPDF("Lutfen gerekli islemi baslatin ve sisteme bildirim tarihi girin."), 14, y);
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(`DOSPRESSO - ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pw / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
    doc.save(`DOSPRESSO_Ariza_Servis_${fault.id}_${format(new Date(), "yyyyMMdd")}.pdf`);
  };

  if (hqFaults.length === 0) return null;

  return (
    <Card data-testid="panel-hq-escalated-faults" className="border-primary/30">
      <CardHeader className="pb-1 pt-3 px-3">
        <CardTitle className="text-xs flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-primary" />
          Merkeze İletilen Arızalar - PDF Hazır
          <Badge variant="default" className="text-[10px] ml-auto">{hqFaults.length} kayıt</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        {hqFaults.slice(0, 8).map((fault: any) => (
          <div
            key={fault.id}
            className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/10"
            data-testid={`card-hq-fault-${fault.id}`}
          >
            <div
              className="flex-1 min-w-0 cursor-pointer hover-elevate rounded p-1"
              onClick={() => onNavigate(`/ariza-detay/${fault.id}`)}
            >
              <span className="text-xs font-medium truncate block">{fault.equipmentName || `Cihaz #${fault.equipmentId}`}</span>
              <span className="text-[11px] text-muted-foreground truncate block">{fault.description?.substring(0, 60)}</span>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {fault.branchName && <span className="text-[10px] text-muted-foreground">{fault.branchName}</span>}
                {fault.createdAt && (
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(fault.createdAt), "dd.MM.yyyy HH:mm", { locale: tr })}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Badge variant={fault.priority === 'kritik' ? 'destructive' : fault.priority === 'yuksek' ? 'default' : 'secondary'} className="text-[10px]">
                {fault.priority === 'kritik' ? 'KRT' : fault.priority === 'yuksek' ? 'YKS' : 'ORT'}
              </Badge>
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  generateFaultPDF(fault);
                }}
                data-testid={`button-download-fault-pdf-${fault.id}`}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TeknikDashboard() {
  const [, setLocation] = useLocation();
  const { data: faultsRaw, isLoading } = useQuery<any>({
    queryKey: ['/api/faults'],
  });

  const faults: any[] = Array.isArray(faultsRaw) ? faultsRaw : (faultsRaw?.data || []);
  const openFaults = faults.filter(f => f.status !== 'resolved' && f.status !== 'closed' && f.currentStage !== 'kapatildi');
  const criticalFaults = openFaults.filter(f => f.priority === 'kritik');
  const highFaults = openFaults.filter(f => f.priority === 'yuksek');
  const resolvedCount = faults.filter(f => f.status === 'resolved' || f.status === 'closed' || f.currentStage === 'kapatildi').length;
  const resolutionRate = faults.length > 0 ? Math.round((resolvedCount / faults.length) * 100) : 0;

  const metrics: MetricCard[] = [
    {
      title: "Açık Arıza",
      value: openFaults.length,
      icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
      iconBgClass: "bg-red-500/10",
      status: openFaults.length > 10 ? 'critical' : openFaults.length > 5 ? 'warning' : 'healthy',
      onClick: () => setLocation('/operasyon/ariza')
    },
    {
      title: "Kritik Arıza",
      value: criticalFaults.length,
      icon: <Flame className="w-5 h-5 text-orange-500" />,
      iconBgClass: "bg-orange-500/10",
      status: criticalFaults.length > 0 ? 'critical' : 'healthy',
      onClick: () => setLocation('/operasyon/ariza')
    },
    {
      title: "Çözüm Oranı",
      value: `${resolutionRate}%`,
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      iconBgClass: "bg-green-500/10",
      status: resolutionRate >= 70 ? 'healthy' : resolutionRate >= 40 ? 'warning' : 'critical',
      trend: resolutionRate >= 70 ? 'up' : 'down',
      onClick: () => setLocation('/operasyon/ariza')
    },
    {
      title: "Toplam Kayıt",
      value: faults?.length || 0,
      icon: <Wrench className="w-5 h-5 text-blue-500" />,
      iconBgClass: "bg-blue-500/10",
      status: 'healthy',
      onClick: () => setLocation('/operasyon/ariza')
    },
  ];

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-border/50">
        <Settings className="w-4 h-4 text-primary" />
        <h2 className="text-base font-semibold" data-testid="text-dashboard-title">Teknik Servis</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {metrics.map((metric, index) => (
          <MetricCardComponent key={index} metric={metric} />
        ))}
      </div>

      {criticalFaults.length > 0 && (
        <Card data-testid="panel-critical-faults">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              Kritik Arızalar
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-1.5">
            {criticalFaults.slice(0, 5).map((fault: any) => (
              <div
                key={fault.id}
                className="flex items-center justify-between gap-2 p-2 rounded-md bg-red-500/10 hover-elevate cursor-pointer"
                onClick={() => setLocation(`/ariza-detay/${fault.id}`)}
                data-testid={`card-critical-fault-${fault.id}`}
              >
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium truncate block">{fault.equipmentName || `Cihaz #${fault.equipmentId}`}</span>
                  <span className="text-[11px] text-muted-foreground truncate block">{fault.description}</span>
                  {fault.branchName && <span className="text-[10px] text-muted-foreground">{fault.branchName}</span>}
                </div>
                <Badge variant="destructive" className="text-[10px] shrink-0">KRİTİK</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {highFaults.length > 0 && (
        <Card data-testid="panel-high-faults">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-yellow-500" />
              Yüksek Öncelikli Arızalar
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-1.5">
            {highFaults.slice(0, 5).map((fault: any) => (
              <div
                key={fault.id}
                className="flex items-center justify-between gap-2 p-2 rounded-md bg-yellow-500/10 hover-elevate cursor-pointer"
                onClick={() => setLocation(`/ariza-detay/${fault.id}`)}
                data-testid={`card-high-fault-${fault.id}`}
              >
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium truncate block">{fault.equipmentName || `Cihaz #${fault.equipmentId}`}</span>
                  <span className="text-[11px] text-muted-foreground truncate block">{fault.description}</span>
                  {fault.branchName && <span className="text-[10px] text-muted-foreground">{fault.branchName}</span>}
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">YÜKSEK</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <HQEscalatedFaults faults={faults || []} onNavigate={setLocation} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card
          className="hover-elevate cursor-pointer"
          onClick={() => setLocation('/operasyon/ariza')}
          data-testid="card-all-faults"
        >
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5" />
              Son Arızalar
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-1.5">
            {openFaults.slice(0, 4).map((fault: any) => (
              <div key={fault.id} className="flex items-center justify-between gap-2 p-1.5 rounded bg-muted/50" data-testid={`card-recent-fault-${fault.id}`}>
                <span className="text-xs truncate flex-1">{fault.equipmentName || `Cihaz #${fault.equipmentId}`}</span>
                <Badge variant={fault.priority === 'kritik' ? 'destructive' : 'secondary'} className="text-[10px]">
                  {fault.priority === 'kritik' ? 'KRİTİK' : fault.priority === 'yuksek' ? 'YÜKSEK' : fault.priority === 'orta' ? 'ORTA' : 'DÜŞÜK'}
                </Badge>
              </div>
            ))}
            {openFaults.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Açık arıza bulunmuyor</p>
            )}
          </CardContent>
        </Card>

        <AlertPanel alerts={[
          ...(criticalFaults.length > 0 ? [{ message: `${criticalFaults.length} kritik arıza bekliyor`, severity: 'critical' as RiskStatus }] : []),
          ...(highFaults.length > 0 ? [{ message: `${highFaults.length} yüksek öncelikli arıza mevcut`, severity: 'warning' as RiskStatus }] : []),
          ...(openFaults.length > 10 ? [{ message: `Toplam ${openFaults.length} açık arıza`, severity: 'warning' as RiskStatus }] : []),
        ]} />
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
    'muhasebe_ik': MuhasebeIKDashboard,
    'coach': CoachDashboard,
    'marketing': MarketingDashboard,
    'trainer': TrainerDashboard,
    'kalite_kontrol': KaliteDashboard,
    'teknik': TeknikDashboard,
    'destek': CoachDashboard,
    'yatirimci_hq': CGODashboard,
  };

  const DepartmentComponent = roleToDashboard[userRole] || CGODashboard;

  return (
    <div className="container mx-auto p-3 max-w-7xl space-y-3">
        <UnifiedHero />
      <DailyTaskPanel />
      {!isCGO && <CriticalAlerts />}
      <DepartmentComponent />
    </div>
  );
}
