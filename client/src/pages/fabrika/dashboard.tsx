import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
  RefreshCw
} from "lucide-react";

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

export default function FabrikaDashboard() {
  const { data: stats, isLoading: loadingStats, refetch } = useQuery<DashboardStats>({
    queryKey: ['/api/factory/dashboard/stats'],
    refetchInterval: 30000,
  });

  const { data: stations = [] } = useQuery<Station[]>({
    queryKey: ['/api/factory/stations'],
  });

  const getStationName = (stationId: number) => {
    const station = stations.find(s => s.id === stationId);
    return station?.name || `İstasyon ${stationId}`;
  };

  const getStationTarget = (stationId: number) => {
    const station = stations.find(s => s.id === stationId);
    return station?.targetHourlyOutput || 0;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Factory className="h-8 w-8 text-amber-500" />
          <div>
            <h1 className="text-2xl font-bold">Fabrika Dashboard</h1>
            <p className="text-muted-foreground">Üretim takip ve performans izleme</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-10 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="hover-elevate">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <Users className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Aktif Çalışan</p>
                    <p className="text-2xl font-bold" data-testid="text-active-workers">{stats.activeWorkers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-500/20 rounded-lg">
                    <Package className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bugünkü Üretim</p>
                    <p className="text-2xl font-bold" data-testid="text-total-produced">{stats.totalProduced}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-500/20 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Zaiyat</p>
                    <p className="text-2xl font-bold" data-testid="text-total-waste">{stats.totalWaste}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-500/20 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Verimlilik</p>
                    <p className="text-2xl font-bold" data-testid="text-efficiency">%{stats.efficiency}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  İstasyon Bazlı Üretim
                </CardTitle>
                <CardDescription>Bugünkü istasyon performansları</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats.stationProduction && stats.stationProduction.length > 0 ? (
                  stats.stationProduction.map((sp) => {
                    const target = getStationTarget(sp.stationId) * 8;
                    const progress = target > 0 ? Math.min(100, (sp.produced / target) * 100) : 0;
                    const wastePercent = sp.produced > 0 ? ((sp.waste / sp.produced) * 100).toFixed(1) : 0;
                    
                    return (
                      <div key={sp.stationId} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{getStationName(sp.stationId)}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{sp.produced} adet</Badge>
                            {sp.waste > 0 && (
                              <Badge variant="destructive" className="text-xs">
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
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Vardiya Özeti
                </CardTitle>
                <CardDescription>Bugünkü vardiya istatistikleri</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <span className="text-muted-foreground">Toplam Vardiya</span>
                    <span className="font-bold text-lg" data-testid="text-today-shifts">{stats.todayShifts}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <span className="text-muted-foreground">Şu An Aktif</span>
                    <Badge className="bg-green-600">{stats.activeWorkers} kişi</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <span className="text-muted-foreground">Ortalama Verimlilik</span>
                    <span className="font-bold text-lg text-amber-500">%{stats.efficiency}</span>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="text-center text-sm text-muted-foreground">
                  <p>Son güncelleme: {new Date().toLocaleTimeString('tr-TR')}</p>
                  <p className="text-xs mt-1">Her 30 saniyede otomatik yenilenir</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Hızlı Erişim</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/fabrika/kiosk">
                  <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2" data-testid="link-kiosk-quick">
                    <Factory className="h-8 w-8 text-amber-500" />
                    <span>Kiosk Modu</span>
                  </Button>
                </Link>
                <Link href="/fabrika">
                  <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2" data-testid="link-factory">
                    <Package className="h-8 w-8 text-blue-500" />
                    <span>Ürün Yönetimi</span>
                  </Button>
                </Link>
                <Link href="/ik">
                  <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2" data-testid="link-hr">
                    <Users className="h-8 w-8 text-green-500" />
                    <span>İK Yönetimi</span>
                  </Button>
                </Link>
                <Link href="/raporlar">
                  <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2" data-testid="link-reports">
                    <TrendingUp className="h-8 w-8 text-purple-500" />
                    <span>Raporlar</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
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
