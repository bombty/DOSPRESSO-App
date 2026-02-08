import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
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
  Target
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from "recharts";

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

export default function FabrikaDashboard() {
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

  const { data: costStats } = useQuery<CostStats>({
    queryKey: ['/api/cost-dashboard/stats'],
    refetchInterval: 60000,
  });

  const { data: wasteStats } = useQuery<any>({
    queryKey: ['/api/waste-stats/dashboard'],
    refetchInterval: 60000,
  });

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
    <div className="container mx-auto p-3 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Factory className="h-4 w-4 text-amber-500" />
          <div>
            <h1 className="text-base font-semibold">Fabrika Dashboard</h1>
            <p className="text-xs text-muted-foreground">Üretim takip ve performans izleme</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
          <Link href="/fabrika/kiosk">
            <Button className="bg-amber-600 hover:bg-amber-700" data-testid="link-kiosk">
              <ExternalLink className="h-4 w-4 mr-2" />
              Kiosk Modu
            </Button>
          </Link>
        </div>
      </div>

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

          {costStats && (
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
                  <div className="text-center p-2 bg-red-500/10 rounded-lg">
                    <p className="text-sm font-bold text-red-600" data-testid="text-waste-total-cost">₺{new Intl.NumberFormat('tr-TR').format(Number(wasteStats.totalWasteCostTl || 0))}</p>
                    <p className="text-xs text-muted-foreground">Toplam Fire Maliyeti</p>
                  </div>
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

          <Card>
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-xs">Hızlı Erişim</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
                <Link href="/fabrika/kiosk">
                  <Button variant="outline" className="w-full h-auto p-2 flex flex-col items-center gap-1" data-testid="link-kiosk-quick">
                    <Factory className="h-4 w-4 text-amber-500" />
                    <span className="text-xs">Kiosk</span>
                  </Button>
                </Link>
                <Link href="/fabrika/kalite-kontrol">
                  <Button variant="outline" className="w-full h-auto p-2 flex flex-col items-center gap-1" data-testid="link-quality-control">
                    <ClipboardCheck className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs">Kalite</span>
                  </Button>
                </Link>
                <Link href="/fabrika/performans">
                  <Button variant="outline" className="w-full h-auto p-2 flex flex-col items-center gap-1" data-testid="link-performance">
                    <BarChart3 className="h-4 w-4 text-purple-500" />
                    <span className="text-xs">Performans</span>
                  </Button>
                </Link>
                <Link href="/fabrika/vardiya-planlama">
                  <Button variant="outline" className="w-full h-auto p-2 flex flex-col items-center gap-1" data-testid="link-shift-planning">
                    <Clock className="h-4 w-4 text-indigo-500" />
                    <span className="text-xs">Vardiya</span>
                  </Button>
                </Link>
                <Link href="/fabrika/uretim-planlama">
                  <Button variant="outline" className="w-full h-auto p-2 flex flex-col items-center gap-1" data-testid="link-factory">
                    <Package className="h-4 w-4 text-blue-500" />
                    <span className="text-xs">Üretim</span>
                  </Button>
                </Link>
                <Link href="/fabrika/ai-raporlar">
                  <Button variant="outline" className="w-full h-auto p-2 flex flex-col items-center gap-1" data-testid="link-reports">
                    <TrendingUp className="h-4 w-4 text-purple-500" />
                    <span className="text-xs">AI Rapor</span>
                  </Button>
                </Link>
                <Link href="/ik">
                  <Button variant="outline" className="w-full h-auto p-2 flex flex-col items-center gap-1" data-testid="link-hr">
                    <Users className="h-4 w-4 text-green-500" />
                    <span className="text-xs">İK</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
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
  );
}
