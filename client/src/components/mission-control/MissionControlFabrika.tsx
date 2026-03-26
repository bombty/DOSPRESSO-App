import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DashboardModeToggle } from "./DashboardModeToggle";
import { UnifiedKPI, type KPIItem } from "@/components/shared/UnifiedKPI";
import { DashboardAlertPills, type AlertPill } from "@/components/dashboard-alert-pills";
import { StationCard, type StationInfo } from "./shared/StationCard";
import { StaffCard, type StaffMember } from "./shared/StaffCard";
import { QCSummary, type QCData } from "./shared/QCSummary";
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
  Activity,
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

interface QCStats {
  today: { total: number; pending: number; approved: number; rejected: number; passRate: number };
  week: { total: number; pending: number; approved: number; rejected: number; passRate: number };
}

interface WasteStats {
  avgWastePercent: number;
  totalWasteKg: number;
  overToleranceCount: number;
  totalBatches: number;
}

interface StockOverview {
  lowStockCount: number;
  totalRawMaterials: number;
  totalFinishedProducts: number;
}

interface QualityOverview {
  todayChecked: number;
  todayPassed: number;
  todayFailed: number;
  pendingCheck: number;
  qualityRate: number;
}

export default function MissionControlFabrika() {
  const { user } = useAuth();
  const firstName = user?.firstName || user?.username?.split(" ")[0] || "Kullanıcı";

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
  const wastePercent = Number(wasteStats?.avgWastePercent ?? 0);

  const kpiItems = useMemo((): KPIItem[] => [
    { value: stats?.totalProduced?.toString() ?? "0", label: "Bugün Üretim", color: "info" as const },
    { value: wastePercent > 0 ? `%${wastePercent.toFixed(1)}` : "—", label: "Fire Oranı", color: wastePercent > 2 ? "danger" as const : "success" as const },
    { value: stats?.activeWorkers?.toString() ?? "0", label: "Aktif Personel", color: "info" as const },
    { value: (qcStats?.today?.pending ?? 0).toString(), label: "QC Bekleyen", color: (qcStats?.today?.pending ?? 0) > 0 ? "warning" as const : "success" as const },
    { value: qcStats?.today?.passRate != null ? `%${qcStats.today.passRate}` : "—", label: "QC Onay Oranı", color: (qcStats?.today?.passRate ?? 100) >= 95 ? "success" as const : "danger" as const },
    { value: efficiencyNum > 0 ? `%${efficiencyNum}` : "—", label: "Hedef Tamamlama", color: efficiencyNum >= 80 ? "success" as const : efficiencyNum >= 50 ? "warning" as const : "danger" as const },
  ], [stats, wastePercent, qcStats, efficiencyNum]);

  const stationInfos = useMemo((): StationInfo[] => {
    const activeStations = stations.filter((s) => s.isActive);
    return activeStations.map((s) => {
      const prod = stats?.stationProduction?.find((sp) => sp.stationId === s.id);
      const worker = activeWorkers.find((w) => w.stationId === s.id);
      return {
        id: s.id,
        name: s.name,
        code: s.code,
        status: worker ? "active" as const : "idle" as const,
        operatorName: worker ? `${worker.firstName} ${worker.lastName}` : undefined,
        produced: prod?.produced ?? 0,
        target: s.targetHourlyOutput ?? 0,
        waste: prod?.waste,
      };
    });
  }, [stations, stats, activeWorkers]);

  const workerStaff = useMemo((): StaffMember[] => {
    return activeWorkers.slice(0, 12).map((w) => ({
      id: w.userId,
      name: `${w.firstName} ${w.lastName}`,
      role: "fabrika_personel",
      status: "active",
      stationName: w.stationName,
    }));
  }, [activeWorkers]);

  const qcData = useMemo((): QCData => ({
    pendingCount: qcStats?.today?.pending ?? 0,
    todayTotal: qcStats?.today?.total ?? 0,
    todayApproved: qcStats?.today?.approved ?? 0,
    todayRejected: qcStats?.today?.rejected ?? 0,
    passRate: qcStats?.today?.passRate ?? 0,
  }), [qcStats]);

  const now = new Date();
  const dateStr = now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="p-3 md:p-4 space-y-3 max-w-3xl mx-auto overflow-y-auto h-full" data-testid="mission-control-fabrika">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
            <Factory className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold truncate" data-testid="mc-fab-greeting">Merhaba, {firstName}</h1>
            <p className="text-[10px] text-muted-foreground">{dateStr}</p>
          </div>
        </div>
        <DashboardModeToggle />
      </div>

      <DashboardAlertPills pills={alertPills} />

      {loadingStats ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
      ) : (
        <UnifiedKPI items={kpiItems} variant="compact" desktopColumns={3} />
      )}

      {stationInfos.length > 0 && (
        <Card data-testid="mc-fab-stations">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Factory className="w-4 h-4" />
              İstasyon Durumu
            </CardTitle>
            <Badge variant="outline" className="text-[10px] h-5">{stationInfos.length} istasyon</Badge>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {stationInfos.map((s) => (
                <StationCard key={s.id} station={s} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <QCSummary data={qcData} />

      {workerStaff.length > 0 && (
        <Card data-testid="mc-fab-workers">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              Aktif Personel
            </CardTitle>
            <Badge variant="outline" className="text-[10px] h-5">{activeWorkers.length} kişi</Badge>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {workerStaff.map((w) => (
                <StaffCard key={w.id} member={w} />
              ))}
            </div>
            {activeWorkers.length > 12 && (
              <p className="text-[10px] text-center text-muted-foreground mt-2">+{activeWorkers.length - 12} kişi daha</p>
            )}
          </CardContent>
        </Card>
      )}

      {(stockOverview?.lowStockCount ?? 0) > 0 && (
        <Card className="border-amber-500/30" data-testid="mc-fab-low-stock">
          <CardContent className="p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-xs font-medium">Düşük Stok Uyarısı</p>
                <p className="text-[10px] text-muted-foreground">{stockOverview!.lowStockCount} hammadde minimum seviyenin altında</p>
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
