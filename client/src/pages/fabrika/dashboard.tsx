import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { 
  Factory, 
  Users, 
  Package, 
  AlertTriangle, 
  TrendingUp,
  Clock,
  Settings,
  ExternalLink,
  RefreshCw,
  Timer,
  ClipboardCheck,
  BarChart3,
  Calculator,
  DollarSign,
  Flame,
  Target,
  LogOut,
  Monitor,
  CheckCircle2,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from "recharts";
import logoUrl from "@assets/IMG_6637_1765138781125.png";
import { DailyTaskPanel } from "@/components/daily-task-panel";

interface DashboardStats {
  activeWorkers: number;
  todayShifts: number;
  totalProduced: number;
  totalWaste: number;
  efficiency: string;
  stationProduction: Array<{
    stationId: number;
    produced: number;
    waste: number;
  }>;
}

interface Station {
  id: number;
  name: string;
  code: string;
  category: string | null;
  targetHourlyOutput: number | null;
}

interface ActiveWorker {
  sessionId: number;
  userId: string;
  stationId: number;
  checkInTime: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string | null;
  stationName: string;
  stationCode: string;
}

interface CostStats {
  productCount: number;
  recipeCount: number;
  materialCount: number;
  totalFixedCosts: number;
  avgProfitMargin: number;
  calculationsThisMonth: number;
}

interface QualityOverview {
  todayChecked: number;
  todayPassed: number;
  todayFailed: number;
  pendingCheck: number;
  qualityRate: number;
}

interface StockOverview {
  lowStockCount: number;
  totalRawMaterials: number;
  totalFinishedProducts: number;
  lastCountDate: string | null;
}

export default function FabrikaDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: stats, isLoading: loadingStats, refetch } = useQuery<DashboardStats>({
    queryKey: ['/api/factory/dashboard/stats'],
    refetchInterval: 30000,
  });

  const { data: stations = [] } = useQuery<Station[]>({
    queryKey: ['/api/factory/stations'],
  });

  const { data: activeWorkers = [], isLoading: loadingWorkers } = useQuery<ActiveWorker[]>({
    queryKey: ['/api/factory/active-workers'],
    refetchInterval: 15000,
  });

  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'fabrika_mudur';
  const isCostRole = user?.role === 'admin' || user?.role === 'muhasebe' || user?.role === 'muhasebe_ik' || user?.role === 'satinalma';

  const { data: costStats } = useQuery<CostStats>({
    queryKey: ['/api/factory/cost-dashboard-stats'],
    refetchInterval: 60000,
    enabled: isCostRole,
  });

  const { data: wasteStats } = useQuery<any>({
    queryKey: ['/api/factory/waste-dashboard-stats'],
    refetchInterval: 60000,
  });

  const { data: qualityOverview } = useQuery<QualityOverview>({
    queryKey: ['/api/factory/quality-overview'],
    refetchInterval: 60000,
    enabled: isManagerOrAdmin,
  });

  const { data: stockOverview } = useQuery<StockOverview>({
    queryKey: ['/api/factory/stock-overview'],
    refetchInterval: 60000,
    enabled: isManagerOrAdmin,
  });

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  const today = new Date();

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/login");
    }
  }, [authLoading, user, setLocation]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const getStationName = (stationId: number) => {
    const station = stations.find(s => s.id === stationId);
    return station?.name || `İstasyon ${stationId}`;
  };

  const getStationTarget = (stationId: number) => {
    const station = stations.find(s => s.id === stationId);
    return station?.targetHourlyOutput || 0;
  };

  const formatElapsedTime = (checkInTime: string) => {
    const start = new Date(checkInTime).getTime();
    const now = Date.now();
    const seconds = Math.floor((now - start) / 1000);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}s ${m}dk`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-3 py-2">
        <div className="container mx-auto flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <img src={logoUrl} alt="DOSPRESSO" className="h-8" data-testid="img-logo" />
            <div>
              <h1 className="text-sm font-bold" data-testid="text-dashboard-title">Fabrika Yonetim Paneli</h1>
              <p className="text-[10px] text-muted-foreground">
                {today.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="default" size="sm" onClick={() => setLocation("/fabrika/kiosk")} className="gap-1.5" data-testid="button-kiosk-mode">
              <Monitor className="h-3.5 w-3.5" />
              Kiosk
            </Button>
            <Button variant="outline" size="icon" onClick={() => refetch()} data-testid="button-refresh">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1.5" data-testid="button-logout">
              <LogOut className="h-3.5 w-3.5" />
              Cikis
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-3 space-y-3">

      {loadingStats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="px-3 pb-3">
                <div className="h-10 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Card className="hover-elevate">
              <CardContent className="px-3 pb-3 pt-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Users className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Aktif Çalışan</p>
                    <p className="text-lg font-bold" data-testid="text-active-workers">{stats.activeWorkers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardContent className="px-3 pb-3 pt-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Package className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Bugünkü Üretim</p>
                    <p className="text-lg font-bold" data-testid="text-total-produced">{stats.totalProduced}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardContent className="px-3 pb-3 pt-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Zaiyat</p>
                    <p className="text-lg font-bold" data-testid="text-total-waste">{stats.totalWaste}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardContent className="px-3 pb-3 pt-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Verimlilik</p>
                    <p className="text-lg font-bold" data-testid="text-efficiency">%{stats.efficiency}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {costStats && isCostRole && (
            <Card>
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="flex items-center gap-2 text-xs">
                  <Calculator className="h-3.5 w-3.5 text-purple-500" />
                  Maliyet Özeti
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="text-center">
                    <p className="text-sm font-bold text-purple-600" data-testid="text-cost-products">{costStats.productCount}</p>
                    <p className="text-xs text-muted-foreground">Ürün</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-blue-600" data-testid="text-cost-materials">{costStats.materialCount}</p>
                    <p className="text-xs text-muted-foreground">Hammadde</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-green-600" data-testid="text-cost-margin">%{costStats.avgProfitMargin.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">Ort. Kar Marjı</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-red-600" data-testid="text-cost-fixed">
                      ₺{new Intl.NumberFormat('tr-TR').format(costStats.totalFixedCosts)}
                    </p>
                    <p className="text-xs text-muted-foreground">Aylık Sabit Gider</p>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Link href="/fabrika">
                    <Button variant="outline" size="sm" data-testid="link-cost-management">
                      <DollarSign className="h-4 w-4 mr-1" />
                      Maliyet Yönetimi
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {isManagerOrAdmin && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {stockOverview && (
                <Card className="hover-elevate">
                  <CardHeader className="pb-1 pt-3 px-3">
                    <CardTitle className="flex items-center gap-2 text-xs">
                      <Package className="h-3.5 w-3.5 text-indigo-500" />
                      Stok Durumu
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center p-2 bg-indigo-500/10 rounded-lg">
                        <p className="text-sm font-bold text-indigo-600" data-testid="text-raw-materials">{stockOverview.totalRawMaterials}</p>
                        <p className="text-xs text-muted-foreground">Hammadde</p>
                      </div>
                      <div className="text-center p-2 bg-teal-500/10 rounded-lg">
                        <p className="text-sm font-bold text-teal-600" data-testid="text-finished-products">{stockOverview.totalFinishedProducts}</p>
                        <p className="text-xs text-muted-foreground">Bitmiş Ürün</p>
                      </div>
                    </div>
                    {stockOverview.lowStockCount > 0 && (
                      <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-200 dark:border-amber-800 rounded-lg mt-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-400" data-testid="text-low-stock-warning">
                          {stockOverview.lowStockCount} üründe düşük stok uyarısı
                        </p>
                      </div>
                    )}
                    {stockOverview.lastCountDate && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Son sayım: {new Date(stockOverview.lastCountDate).toLocaleDateString('tr-TR')}
                      </p>
                    )}
                    <div className="mt-2 flex justify-end">
                      <Link href="/fabrika?tab=stok-sayim">
                        <Button variant="outline" size="sm" data-testid="link-stock-count">
                          <ClipboardCheck className="h-3.5 w-3.5 mr-1" />
                          Stok Sayımı
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}

              {qualityOverview && (
                <Card className="hover-elevate">
                  <CardHeader className="pb-1 pt-3 px-3">
                    <CardTitle className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      Kalite Kontrol Özeti
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center p-2 bg-emerald-500/10 rounded-lg">
                        <p className="text-sm font-bold text-emerald-600" data-testid="text-quality-passed">{qualityOverview.todayPassed}</p>
                        <p className="text-xs text-muted-foreground">Onaylanan</p>
                      </div>
                      <div className="text-center p-2 bg-red-500/10 rounded-lg">
                        <p className="text-sm font-bold text-red-600" data-testid="text-quality-failed">{qualityOverview.todayFailed}</p>
                        <p className="text-xs text-muted-foreground">Reddedilen</p>
                      </div>
                    </div>
                    {qualityOverview.pendingCheck > 0 && (
                      <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-200 dark:border-amber-800 rounded-lg mt-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-400" data-testid="text-pending-quality">
                          {qualityOverview.pendingCheck} ürün kalite kontrolü bekliyor
                        </p>
                      </div>
                    )}
                    {qualityOverview.todayChecked > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <Progress value={qualityOverview.qualityRate} className="h-2 flex-1" />
                        <span className="text-xs font-medium text-muted-foreground">%{qualityOverview.qualityRate.toFixed(0)}</span>
                      </div>
                    )}
                    <div className="mt-2 flex justify-end">
                      <Link href="/fabrika?tab=kalite-kontrol">
                        <Button variant="outline" size="sm" data-testid="link-quality-control">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Kalite Kontrol
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DailyTaskPanel />

          {wasteStats && (
            <Card>
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="flex items-center gap-2 text-xs">
                  <Flame className="h-3.5 w-3.5 text-red-500" />
                  Fire Takip Raporu
                </CardTitle>
                <CardDescription>Son 30 gün fire istatistikleri</CardDescription>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                  <div className="text-center p-2 bg-red-500/10 rounded-lg">
                    <p className="text-sm font-bold text-red-600" data-testid="text-waste-total-batches">{wasteStats.totalBatches || 0}</p>
                    <p className="text-xs text-muted-foreground">Toplam Batch</p>
                  </div>
                  <div className="text-center p-2 bg-amber-500/10 rounded-lg">
                    <p className="text-sm font-bold text-amber-600" data-testid="text-waste-avg-percent">%{Number(wasteStats.avgWastePercent || 0).toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">Ort. Fire Oranı</p>
                  </div>
                  <div className="text-center p-2 bg-orange-500/10 rounded-lg">
                    <p className="text-sm font-bold text-orange-600" data-testid="text-waste-total-weight">{Number(wasteStats.totalWasteKg || 0).toFixed(1)} kg</p>
                    <p className="text-xs text-muted-foreground">Toplam Fire</p>
                  </div>
                  {isManagerOrAdmin && (
                    <div className="text-center p-2 bg-red-500/10 rounded-lg">
                      <p className="text-sm font-bold text-red-600" data-testid="text-waste-total-cost">₺{new Intl.NumberFormat('tr-TR').format(Number(wasteStats.totalWasteCostTl || 0))}</p>
                      <p className="text-xs text-muted-foreground">Toplam Fire Maliyeti</p>
                    </div>
                  )}
                </div>

                {wasteStats.overToleranceCount > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-200 dark:border-red-800 rounded-lg mb-3">
                    <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-red-700 dark:text-red-400" data-testid="text-tolerance-breaches">
                        {wasteStats.overToleranceCount} batch tolerans aşımı tespit edildi
                      </p>
                      <p className="text-xs text-red-600/70 dark:text-red-400/70">Tolerans aşım oranı: %{wasteStats.overToleranceRate}</p>
                    </div>
                  </div>
                )}

                {wasteStats.trend && wasteStats.trend.length > 0 && (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={wasteStats.trend}>
                        <defs>
                          <linearGradient id="wasteGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                        <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px' }}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                          formatter={(value: any) => [`%${Number(value).toFixed(1)}`, 'Fire Oranı']}
                        />
                        <Area type="monotone" dataKey="wastePercent" stroke="hsl(var(--destructive))" fill="url(#wasteGradient)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {wasteStats.productRanking && wasteStats.productRanking.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium mb-2">En Yüksek Fireli Ürünler</p>
                    <div className="space-y-2">
                      {wasteStats.productRanking.slice(0, 5).map((p: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{p.name || `Ürün #${p.productId}`}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={Number(p.wastePercent) > 10 ? "destructive" : "secondary"} className="text-[10px]">
                              %{Number(p.wastePercent).toFixed(1)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{p.batchCount} batch</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="flex items-center gap-2 text-xs">
                <Users className="h-3.5 w-3.5 text-blue-500" />
                Aktif Çalışanlar
              </CardTitle>
              <CardDescription>Şu anda vardiyada olan personel</CardDescription>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              {loadingWorkers ? (
                <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
              ) : activeWorkers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Personel</TableHead>
                      <TableHead>İstasyon</TableHead>
                      <TableHead>Giriş Saati</TableHead>
                      <TableHead>Geçen Süre</TableHead>
                      <TableHead>Durum</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeWorkers.map((worker) => (
                      <TableRow key={worker.sessionId} data-testid={`row-worker-${worker.sessionId}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={worker.profileImageUrl || undefined} />
                              <AvatarFallback className="bg-amber-600 text-white text-xs">
                                {worker.firstName[0]}{worker.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{worker.firstName} {worker.lastName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">{worker.stationName}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(worker.checkInTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-amber-600">
                            <Timer className="h-4 w-4" />
                            {formatElapsedTime(worker.checkInTime)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-600 text-[10px]">Çalışıyor</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Şu anda aktif çalışan yok</p>
                  <p className="text-xs mt-1">Kiosk modundan giriş yapılabilir</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="flex items-center gap-2 text-xs">
                  <Settings className="h-3.5 w-3.5" />
                  İstasyon Bazlı Üretim
                </CardTitle>
                <CardDescription>Bugünkü istasyon performansları</CardDescription>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-2">
                {stats.stationProduction && stats.stationProduction.length > 0 ? (
                  stats.stationProduction.map((sp) => {
                    const target = getStationTarget(sp.stationId) * 8;
                    const progress = target > 0 ? Math.min(100, (sp.produced / target) * 100) : 0;
                    const wastePercent = sp.produced > 0 ? ((sp.waste / sp.produced) * 100).toFixed(1) : 0;
                    
                    return (
                      <div key={sp.stationId} className="space-y-1">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="font-medium text-xs">{getStationName(sp.stationId)}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px]">{sp.produced} adet</Badge>
                            {sp.waste > 0 && (
                              <Badge variant="destructive" className="text-[10px]">
                                {wastePercent}% zaiyat
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Progress value={progress} className="h-2" />
                        {target > 0 && (
                          <p className="text-xs text-muted-foreground text-right">
                            Hedef: {target} adet ({progress.toFixed(0)}%)
                          </p>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Bugün henüz üretim kaydı yok</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="flex items-center gap-2 text-xs">
                  <Clock className="h-3.5 w-3.5" />
                  Vardiya Özeti
                </CardTitle>
                <CardDescription>Bugünkü vardiya istatistikleri</CardDescription>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <span className="text-xs text-muted-foreground">Toplam Vardiya</span>
                    <span className="font-bold text-sm" data-testid="text-today-shifts">{stats.todayShifts}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <span className="text-xs text-muted-foreground">Şu An Aktif</span>
                    <Badge className="bg-green-600 text-[10px]">{stats.activeWorkers} kişi</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <span className="text-xs text-muted-foreground">Ortalama Verimlilik</span>
                    <span className="font-bold text-sm text-amber-500">%{stats.efficiency}</span>
                  </div>
                </div>

                <Separator className="my-3" />

                <div className="text-center text-xs text-muted-foreground">
                  <p>Son güncelleme: {new Date().toLocaleTimeString('tr-TR')}</p>
                  <p className="text-xs mt-1">Her 30 saniyede otomatik yenilenir</p>
                </div>
              </CardContent>
            </Card>
          </div>

        </>
      ) : (
        <Card>
          <CardContent className="p-3 text-center text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Dashboard verileri yüklenemedi</p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Tekrar Dene
            </Button>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}
