import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DashboardModeToggle } from "./DashboardModeToggle";
import { DashboardAlertPills, type AlertPill } from "@/components/dashboard-alert-pills";
import { Link } from "wouter";
import {
  Factory,
  Users,
  Package,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Flame,
  TrendingUp,
  Target,
  UserCheck,
} from "lucide-react";
import { useMemo } from "react";

interface DashboardStats {
  activeWorkers: number;
  todayShifts: number;
  totalProduced: number;
  totalWaste: number;
  efficiency: string | number;
  stationProduction: Array<{ stationId: number; produced: number; waste: number }>;
}

interface Station {
  id: number;
  name: string;
  code: string;
  category: string | null;
  targetHourlyOutput: number | null;
  isActive: boolean;
}

interface ActiveWorker {
  sessionId: number;
  userId: string;
  stationId: number;
  checkInTime: string;
  firstName: string;
  lastName: string;
  stationName: string;
  stationCode: string;
}

interface QualityOverview {
  todayChecked: number;
  todayPassed: number;
  todayFailed: number;
  pendingCheck: number;
  qualityRate: number;
}

interface QCStats {
  today: { total: number; pending: number; approved: number; rejected: number; passRate: number };
  week: { total: number; pending: number; approved: number; rejected: number; passRate: number };
}

interface StockOverview {
  lowStockCount: number;
  totalRawMaterials: number;
  totalFinishedProducts: number;
}

interface WasteStats {
  avgWastePercent: number;
  totalWasteKg: number;
  overToleranceCount: number;
  totalBatches: number;
}

function MCKpiCard({ label, value, icon: Icon, color, subtext, link }: {
  label: string;
  value: string | number;
  icon: typeof Factory;
  color: string;
  subtext?: string;
  link?: string;
}) {
  const content = (
    <Card className={link ? "hover-elevate cursor-pointer" : ""} data-testid={`mc-fab-kpi-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-xl font-bold leading-tight">{value}</div>
          <div className="text-[11px] text-muted-foreground truncate">{label}</div>
          {subtext && <div className="text-[10px] text-muted-foreground/70">{subtext}</div>}
        </div>
      </CardContent>
    </Card>
  );
  if (link) return <Link href={link}>{content}</Link>;
  return content;
}

function StationStatusGrid({ stations, stationProduction }: {
  stations: Station[];
  stationProduction: DashboardStats["stationProduction"];
}) {
  const activeStations = stations.filter(s => s.isActive);

  if (activeStations.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          Aktif istasyon bulunamadı
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="mc-fab-stations">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
          <Factory className="w-4 h-4" />
          İstasyon Durumu
        </CardTitle>
        <Badge variant="outline" className="text-[10px] h-5">
          {activeStations.length} istasyon
        </Badge>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-1.5">
        {activeStations.map(station => {
          const prod = stationProduction.find(sp => sp.stationId === station.id);
          const produced = prod?.produced ?? 0;
          const waste = prod?.waste ?? 0;
          const target = station.targetHourlyOutput ?? 0;
          const pct = target > 0 ? Math.min(Math.round((produced / target) * 100), 100) : 0;

          return (
            <div key={station.id} className="p-2 rounded-md bg-muted/30" data-testid={`mc-fab-station-${station.id}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-medium truncate">{station.name}</span>
                  {station.code && (
                    <Badge variant="outline" className="text-[8px] h-4 px-1">{station.code}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[10px] font-bold">{produced}</span>
                  {target > 0 && (
                    <span className="text-[9px] text-muted-foreground">/ {target}</span>
                  )}
                  {waste > 0 && (
                    <Badge variant="destructive" className="text-[8px] h-4 px-1">{waste} fire</Badge>
                  )}
                </div>
              </div>
              {target > 0 && (
                <Progress value={pct} className="h-1.5" />
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ActiveWorkersCard({ workers }: { workers: ActiveWorker[] }) {
  if (workers.length === 0) {
    return (
      <Card data-testid="mc-fab-workers-empty">
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          Şu an aktif personel yok
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="mc-fab-workers">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
          <Users className="w-4 h-4" />
          Aktif Personel
        </CardTitle>
        <Badge variant="outline" className="text-[10px] h-5">
          {workers.length} kişi
        </Badge>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-1">
        {workers.slice(0, 10).map(w => {
          const elapsed = (() => {
            const start = new Date(w.checkInTime).getTime();
            const now = Date.now();
            const seconds = Math.floor((now - start) / 1000);
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            return `${h}s ${m}dk`;
          })();

          return (
            <div key={w.sessionId} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/30" data-testid={`mc-fab-worker-${w.sessionId}`}>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-3 h-3 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{w.firstName} {w.lastName}</p>
                  <p className="text-[10px] text-muted-foreground">{w.stationName}</p>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground flex-shrink-0">{elapsed}</span>
            </div>
          );
        })}
        {workers.length > 10 && (
          <p className="text-[10px] text-center text-muted-foreground">+{workers.length - 10} kişi daha</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function MissionControlFabrika() {
  const { user } = useAuth();

  const { data: stats, isLoading: loadingStats } = useQuery<DashboardStats>({
    queryKey: ["/api/factory/dashboard/stats"],
    refetchInterval: 30000,
    staleTime: 15 * 1000,
  });

  const { data: stations = [] } = useQuery<Station[]>({
    queryKey: ["/api/factory/stations"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: activeWorkers = [] } = useQuery<ActiveWorker[]>({
    queryKey: ["/api/factory/active-workers"],
    refetchInterval: 15000,
  });

  const { data: qcStats } = useQuery<QCStats>({
    queryKey: ["/api/factory/qc/stats"],
    staleTime: 3 * 60 * 1000,
  });

  const { data: qualityOverview } = useQuery<QualityOverview>({
    queryKey: ["/api/factory/quality-overview"],
    staleTime: 3 * 60 * 1000,
  });

  const { data: wasteStats } = useQuery<WasteStats>({
    queryKey: ["/api/factory/waste-dashboard-stats"],
    staleTime: 3 * 60 * 1000,
  });

  const { data: stockOverview } = useQuery<StockOverview>({
    queryKey: ["/api/factory/stock-overview"],
    staleTime: 3 * 60 * 1000,
  });

  const alertPills = useMemo((): AlertPill[] => {
    const pills: AlertPill[] = [];
    const pending = qcStats?.today?.pending ?? 0;
    const overTolerance = wasteStats?.overToleranceCount ?? 0;
    const lowStock = stockOverview?.lowStockCount ?? 0;
    const qRate = qualityOverview?.qualityRate ?? 100;

    if (pending > 0) pills.push({ label: `${pending} QC bekliyor`, variant: "orange", dot: true });
    if (overTolerance > 0) pills.push({ label: `${overTolerance} tolerans aşımı`, variant: "red", dot: true });
    if (lowStock > 0) pills.push({ label: `${lowStock} düşük stok`, variant: "orange", dot: true });
    if (qRate < 90) pills.push({ label: `Kalite %${qRate}`, variant: "red", dot: true });
    if (pills.length === 0) pills.push({ label: "Fabrika normal", variant: "green", dot: true });
    return pills;
  }, [qcStats, wasteStats, stockOverview, qualityOverview]);

  const efficiencyNum = Number(stats?.efficiency ?? 0);

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto overflow-y-auto h-full" data-testid="mission-control-fabrika">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Factory className="w-5 h-5" />
          Fabrika Mission Control
        </h1>
        <DashboardModeToggle />
      </div>

      <DashboardAlertPills pills={alertPills} />

      {loadingStats ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3" data-testid="mc-fab-kpis">
          <MCKpiCard
            label="Bugün Üretim"
            value={stats?.totalProduced ?? 0}
            icon={Package}
            color="bg-sky-500 dark:bg-sky-600"
            subtext={`${stats?.todayShifts ?? 0} vardiya`}
            link="/fabrika"
          />
          <MCKpiCard
            label="Verimlilik"
            value={efficiencyNum > 0 ? `%${efficiencyNum}` : "—"}
            icon={TrendingUp}
            color={efficiencyNum >= 80 ? "bg-emerald-500 dark:bg-emerald-600" : efficiencyNum >= 50 ? "bg-amber-500 dark:bg-amber-600" : "bg-destructive"}
          />
          <MCKpiCard
            label="Aktif Personel"
            value={stats?.activeWorkers ?? 0}
            icon={Users}
            color="bg-indigo-500 dark:bg-indigo-600"
          />
          <MCKpiCard
            label="QC Bekleyen"
            value={qcStats?.today?.pending ?? 0}
            icon={ShieldCheck}
            color={(qcStats?.today?.pending ?? 0) > 0 ? "bg-amber-500 dark:bg-amber-600" : "bg-emerald-500 dark:bg-emerald-600"}
            subtext={`${qcStats?.today?.total ?? 0} toplam kontrol`}
            link="/fabrika/kalite-kontrol"
          />
          <MCKpiCard
            label="Kalite Oranı"
            value={qualityOverview ? `%${qualityOverview.qualityRate}` : "—"}
            icon={Target}
            color={(qualityOverview?.qualityRate ?? 100) >= 90 ? "bg-emerald-500 dark:bg-emerald-600" : "bg-destructive"}
            subtext={qualityOverview ? `${qualityOverview.todayPassed} geçti · ${qualityOverview.todayFailed} kaldı` : undefined}
          />
          <MCKpiCard
            label="Fire Oranı"
            value={wasteStats ? `%${Number(wasteStats.avgWastePercent).toFixed(1)}` : "—"}
            icon={Flame}
            color={(wasteStats?.avgWastePercent ?? 0) > 5 ? "bg-destructive" : "bg-emerald-500 dark:bg-emerald-600"}
            subtext={wasteStats ? `${Number(wasteStats.totalWasteKg).toFixed(0)} kg toplam` : undefined}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <StationStatusGrid
          stations={stations}
          stationProduction={stats?.stationProduction ?? []}
        />
        <ActiveWorkersCard workers={activeWorkers} />
      </div>

      {(stockOverview?.lowStockCount ?? 0) > 0 && (
        <Card className="border-amber-500/30" data-testid="mc-fab-low-stock">
          <CardContent className="p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-xs font-medium">Düşük Stok Uyarısı</p>
                <p className="text-[10px] text-muted-foreground">
                  {stockOverview!.lowStockCount} hammadde minimum seviyenin altında
                </p>
              </div>
            </div>
            <Link href="/fabrika/stok-sayim">
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                Detay <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-2" data-testid="mc-fab-quick-nav">
        <Link href="/fabrika">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="p-3 flex flex-col items-center gap-1.5">
              <Factory className="w-6 h-6 text-indigo-500" />
              <span className="text-xs font-medium">Fabrika Paneli</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/fabrika/kalite-kontrol">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="p-3 flex flex-col items-center gap-1.5">
              <ShieldCheck className="w-6 h-6 text-emerald-500" />
              <span className="text-xs font-medium">Kalite Kontrol</span>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
