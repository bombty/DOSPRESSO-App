import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Factory, 
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Target,
  BarChart3,
  RefreshCw,
  Calendar
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

interface ProductionStats {
  totalProduced: number;
  totalWaste: number;
  approvalRate: number;
  rejectionRate: number;
  avgEfficiency: number;
}

interface StationPerformance {
  stationName: string;
  produced: number;
  waste: number;
  efficiency: number;
}

interface QualityBreakdown {
  name: string;
  value: number;
  color: string;
}

export default function HQFabrikaAnalitik() {
  const [periodFilter, setPeriodFilter] = useState("week");
  const [activeTab, setActiveTab] = useState("overview");

  const { data: stats, isLoading: loadingStats, refetch } = useQuery<ProductionStats>({
    queryKey: [`/api/factory/analytics/stats?period=${periodFilter}`],
  });

  const { data: stationPerformance = [] } = useQuery<StationPerformance[]>({
    queryKey: [`/api/factory/analytics/station-performance?period=${periodFilter}`],
  });

  const { data: dailyProduction = [] } = useQuery<any[]>({
    queryKey: [`/api/factory/analytics/daily-production?period=${periodFilter}`],
  });

  const qualityBreakdown: QualityBreakdown[] = [
    { name: 'Onaylanan', value: stats?.approvalRate || 96.2, color: '#22c55e' },
    { name: 'Reddedilen', value: stats?.rejectionRate || 3.8, color: '#ef4444' },
  ];

  const wasteReasonData = [
    { reason: 'Kabukta çatlama', count: 45 },
    { reason: 'Yanlış gramaj', count: 38 },
    { reason: 'Yanmış ürün', count: 32 },
    { reason: 'Süsleme hatası', count: 28 },
    { reason: 'Şekil bozukluğu', count: 22 },
  ];

  const getPeriodLabel = () => {
    switch (periodFilter) {
      case 'today': return 'Bugün';
      case 'week': return 'Bu Hafta';
      case 'month': return 'Bu Ay';
      default: return 'Bu Hafta';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Factory className="h-8 w-8 text-amber-500" />
          <div>
            <h1 className="text-2xl font-bold">Fabrika Analitik</h1>
            <p className="text-muted-foreground">HQ üretim ve kalite istatistikleri</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-[150px]" data-testid="select-period">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Bugün</SelectItem>
              <SelectItem value="week">Bu Hafta</SelectItem>
              <SelectItem value="month">Bu Ay</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="hover-elevate">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Package className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Toplam Üretim</p>
                <p className="text-xl font-bold" data-testid="text-total-produced">
                  {stats?.totalProduced?.toLocaleString('tr-TR') || '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Toplam Fire</p>
                <p className="text-xl font-bold" data-testid="text-total-waste">
                  {stats?.totalWaste?.toLocaleString('tr-TR') || '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Onay Oranı</p>
                <p className="text-xl font-bold text-green-600" data-testid="text-approval-rate">
                  %{stats?.approvalRate || '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Red Oranı</p>
                <p className="text-xl font-bold text-red-600" data-testid="text-rejection-rate">
                  %{stats?.rejectionRate || '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Verimlilik</p>
                <p className="text-xl font-bold text-blue-600" data-testid="text-efficiency">
                  %{stats?.avgEfficiency || '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="quality" data-testid="tab-quality">Kalite Analizi</TabsTrigger>
          <TabsTrigger value="stations" data-testid="tab-stations">İstasyon Performansı</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Günlük Üretim - {getPeriodLabel()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyProduction}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Bar dataKey="produced" fill="#22c55e" name="Üretim" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="waste" fill="#ef4444" name="Fire" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  İstasyon Verimliliği
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stationPerformance} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" domain={[0, 100]} className="text-xs" />
                    <YAxis dataKey="stationName" type="category" width={100} className="text-xs" />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Bar dataKey="efficiency" fill="#3b82f6" name="Verimlilik %" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Kalite Dağılımı
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={qualityBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {qualityBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Fire Nedenleri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={wasteReasonData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="reason" type="category" width={120} className="text-xs" />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Bar dataKey="count" fill="#f97316" name="Adet" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stations" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stationPerformance.map((station, idx) => (
              <Card key={idx} className="hover-elevate">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between gap-2">
                    {station.stationName}
                    <Badge 
                      variant={station.efficiency >= 90 ? "default" : station.efficiency >= 80 ? "secondary" : "destructive"}
                      className={station.efficiency >= 90 ? "bg-green-600" : ""}
                    >
                      %{station.efficiency}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Üretim</span>
                      <span className="font-medium text-green-600">{station.produced.toLocaleString('tr-TR')} adet</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Fire</span>
                      <span className="font-medium text-red-500">{station.waste} adet</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${station.efficiency >= 90 ? 'bg-green-500' : station.efficiency >= 80 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${station.efficiency}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
