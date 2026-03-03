import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Factory,
  AlertTriangle,
  Award,
  Clock,
  RefreshCw,
  Trash2,
  Target,
  Zap,
  Package,
  Percent,
  Timer,
  Medal,
  Settings,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ProductionSummary {
  totalProducts: number;
  totalProduced: number;
  totalWaste: number;
  avgWastePercent: number;
  totalHours: number;
  avgProductionPerHour: number;
}

interface ProductStat {
  productId: number;
  productName: string;
  category: string;
  totalProduced: number;
  totalWaste: number;
  wastePercent: number;
  totalBatches: number;
  avgBatchSize: number;
  totalHours: number;
  avgProductionPerHour: number;
  trend: string;
}

interface DailyTrend {
  date: string;
  produced: number;
  waste: number;
}

interface ProductionStatsResponse {
  summary: ProductionSummary;
  productStats: ProductStat[];
  dailyTrend: DailyTrend[];
}

interface WorkerPerformance {
  userId: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string | null;
  totalProduced: number;
  totalWaste: number;
  totalHours: number;
  efficiency: number;
  avgProductionPerHour: number;
  qualityApproved: number;
  qualityRejected: number;
  stationsWorked: string[];
}

interface WorkerScoreBreakdown {
  speedScore: number;
  qualityScore: number;
  consistencyScore: number;
  attendanceScore: number;
  improvementScore: number;
}

interface WorkerScoreDetail {
  userId: string;
  firstName: string;
  lastName: string;
  currentScore: number;
  scoreHistory: { month: string; score: number; produced?: number; waste?: number }[];
  breakdown: WorkerScoreBreakdown;
  productBreakdown: { productName: string; produced: number; waste: number; wastePercent: number }[];
  peakHours: { hour: number; avgProduction: number }[];
  monthlyDataPoints: number;
}

interface ComparisonWorker {
  userId: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string | null;
  totalProduced: number;
  totalWaste: number;
  wastePercent: number;
  avgProductionPerHour: number;
  totalHours: number;
  batchCount: number;
  avgBatchDuration: number;
  consistencyScore: number;
  speedScore: number;
  qualityScore: number;
  overallScore: number;
}

interface ComparisonResponse {
  productName: string;
  workers: ComparisonWorker[];
}

interface WasteAnalysis {
  reasonId: number;
  reasonName: string;
  category: string;
  count: number;
  percentage: number;
}

interface FactoryProduct {
  id: number;
  name: string;
  category: string;
  sku: string;
  unit: string;
}

interface ScoreUpdateResult {
  updated: number;
  workers: { userId: string; firstName: string; lastName: string; oldScore: number; newScore: number }[];
}

const CHART_COLORS = ["#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

const PERIOD_OPTIONS = [
  { value: "daily", label: "Bugun" },
  { value: "weekly", label: "Bu Hafta" },
  { value: "monthly", label: "Bu Ay" },
  { value: "yearly", label: "Bu Yil" },
];

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12 text-muted-foreground">
      Yukleniyor...
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: typeof Factory; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Icon className="h-12 w-12 mb-2 opacity-50" />
      <p>{message}</p>
    </div>
  );
}

function TrendBadge({ trend }: { trend: string }) {
  if (trend === "up") {
    return (
      <Badge className="bg-green-600 text-white">
        <ArrowUpRight className="h-3 w-3 mr-1" />
        Yükseliş
      </Badge>
    );
  }
  if (trend === "down") {
    return (
      <Badge className="bg-red-600 text-white">
        <ArrowDownRight className="h-3 w-3 mr-1" />
        Düşüş
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      <Minus className="h-3 w-3 mr-1" />
      Sabit
    </Badge>
  );
}

function MaturityBadge({ monthlyDataPoints }: { monthlyDataPoints: number }) {
  if (monthlyDataPoints < 3) {
    return <Badge className="bg-blue-600 text-white">Yeni</Badge>;
  }
  if (monthlyDataPoints <= 6) {
    return <Badge className="bg-amber-600 text-white">Gelişen</Badge>;
  }
  return <Badge className="bg-green-600 text-white">Olgun</Badge>;
}

export default function FabrikaPerformans() {
  const [period, setPeriod] = useState("weekly");
  const [activeTab, setActiveTab] = useState("production");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [comparisonProductId, setComparisonProductId] = useState<string>("");
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [workerDialogOpen, setWorkerDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: products = [] } = useQuery<FactoryProduct[]>({
    queryKey: ["/api/factory/products"],
    queryFn: async () => {
      const res = await fetch("/api/factory/products", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  const { data: productionStats, isLoading: loadingProduction } = useQuery<ProductionStatsResponse>({
    queryKey: ["/api/factory/analytics/production-stats", period, selectedProductId],
    queryFn: async () => {
      const params = new URLSearchParams({ period });
      if (selectedProductId) params.set("productId", selectedProductId);
      const res = await fetch(`/api/factory/analytics/production-stats?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch production stats");
      return res.json();
    },
  });

  const { data: workerStats = [], isLoading: loadingWorkers } = useQuery<WorkerPerformance[]>({
    queryKey: ["/api/factory/analytics/workers", period],
    queryFn: async () => {
      const res = await fetch(`/api/factory/analytics/workers?period=${period}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch worker stats");
      return res.json();
    },
  });

  const { data: workerScore, isLoading: loadingWorkerScore } = useQuery<WorkerScoreDetail>({
    queryKey: ["/api/factory/analytics/worker-score", selectedWorkerId],
    queryFn: async () => {
      const res = await fetch(`/api/factory/analytics/worker-score/${selectedWorkerId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch worker score");
      return res.json();
    },
    enabled: !!selectedWorkerId,
  });

  const { data: comparisonData, isLoading: loadingComparison } = useQuery<ComparisonResponse>({
    queryKey: ["/api/factory/analytics/worker-comparison", period, comparisonProductId],
    queryFn: async () => {
      const params = new URLSearchParams({ period, productId: comparisonProductId });
      const res = await fetch(`/api/factory/analytics/worker-comparison?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch comparison");
      return res.json();
    },
    enabled: !!comparisonProductId,
  });

  const { data: wasteAnalysis = [], isLoading: loadingWaste } = useQuery<WasteAnalysis[]>({
    queryKey: ["/api/factory/analytics/waste", period],
    queryFn: async () => {
      const res = await fetch(`/api/factory/analytics/waste?period=${period}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch waste analysis");
      return res.json();
    },
  });

  const updateScoresMutation = useMutation<ScoreUpdateResult>({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/factory/analytics/update-scores");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Skorlar guncellendi", description: `${data.updated} personelin skoru guncellendi.` });
      queryClient.invalidateQueries({ queryKey: ["/api/factory/analytics/workers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/factory/analytics/worker-comparison"] });
    },
    onError: () => {
      toast({ title: "Hata", description: "Skorlar guncellenirken bir hata olustu.", variant: "destructive" });
    },
  });

  const handleWorkerClick = (userId: string) => {
    setSelectedWorkerId(userId);
    setWorkerDialogOpen(true);
  };

  const summary = productionStats?.summary;
  const prodStats = productionStats?.productStats || [];
  const dailyTrend = productionStats?.dailyTrend || [];

  const sortedProducts = [...prodStats].sort((a, b) => b.totalProduced - a.totalProduced);
  const mostProducedId = sortedProducts[0]?.productId;
  const leastProducedId = sortedProducts.length > 1 ? sortedProducts[sortedProducts.length - 1]?.productId : null;

  const sortedComparison = comparisonData?.workers
    ? [...comparisonData.workers].sort((a, b) => b.overallScore - a.overallScore)
    : [];
  const topPerformerId = sortedComparison[0]?.userId;

  const radarData = workerScore
    ? [
        { subject: "Hız", value: workerScore.breakdown.speedScore, fullMark: 100 },
        { subject: "Kalite", value: workerScore.breakdown.qualityScore, fullMark: 100 },
        { subject: "Tutarlılık", value: workerScore.breakdown.consistencyScore, fullMark: 100 },
        { subject: "Devam", value: workerScore.breakdown.attendanceScore, fullMark: 100 },
        { subject: "Gelişim", value: workerScore.breakdown.improvementScore, fullMark: 100 },
      ]
    : [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-amber-500" />
          <div>
            <h1 className="text-2xl font-bold">Fabrika Performans Analitigi</h1>
            <p className="text-muted-foreground">Üretim istatistikleri ve personel performansı</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40" data-testid="select-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="production" data-testid="tab-production">Üretim Raporu</TabsTrigger>
          <TabsTrigger value="workers" data-testid="tab-workers">Personel Performans</TabsTrigger>
          <TabsTrigger value="comparison" data-testid="tab-comparison">Karsilastirma</TabsTrigger>
          <TabsTrigger value="waste" data-testid="tab-waste">Zaiyat Analizi</TabsTrigger>
          <TabsTrigger value="scores" data-testid="tab-scores">Skor Yonetimi</TabsTrigger>
        </TabsList>

        {/* Tab 1: Üretim Raporu */}
        <TabsContent value="production" className="space-y-6">
          <div className="flex items-center gap-3">
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger className="w-56" data-testid="select-product-filter">
                <SelectValue placeholder="Tum Urunler" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tum Urunler</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loadingProduction ? (
            <LoadingState />
          ) : summary ? (
            <>
              {summary.totalProduced === 0 && summary.totalWaste === 0 && (
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Seçilen dönemde üretim verisi bulunamadı</p>
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Üretim Planlama sayfasından üretim tamamlayın veya farklı bir dönem seçin.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <Card className="hover-elevate">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/20 rounded-lg">
                        <Package className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Toplam Üretim</p>
                        <p className="text-xl font-bold" data-testid="text-total-produced">{summary.totalProduced}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover-elevate">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-500/20 rounded-lg">
                        <Trash2 className="h-5 w-5 text-red-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Toplam Zaiyat</p>
                        <p className="text-xl font-bold" data-testid="text-total-waste">{summary.totalWaste}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover-elevate">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/20 rounded-lg">
                        <Percent className="h-5 w-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Zaiyat Orani</p>
                        <p className="text-xl font-bold" data-testid="text-waste-percent">%{summary.avgWastePercent.toFixed(1)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover-elevate">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Zap className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Üretim/Saat</p>
                        <p className="text-xl font-bold" data-testid="text-production-per-hour">{summary.avgProductionPerHour.toFixed(1)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover-elevate">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <Timer className="h-5 w-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Toplam Saat</p>
                        <p className="text-xl font-bold" data-testid="text-total-hours">{summary.totalHours.toFixed(1)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {dailyTrend.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Üretim Trendi</CardTitle>
                    <CardDescription>Günlük üretim ve zaiyat değişimi</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dailyTrend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Area type="monotone" dataKey="produced" name="Üretim" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                          <Area type="monotone" dataKey="waste" name="Zaiyat" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Ürün Bazlı Üretim</CardTitle>
                  <CardDescription>Üretim miktarına göre sıralanmış</CardDescription>
                </CardHeader>
                <CardContent>
                  {sortedProducts.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ürün Adı</TableHead>
                          <TableHead>Kategori</TableHead>
                          <TableHead>Toplam Üretim</TableHead>
                          <TableHead>Zaiyat</TableHead>
                          <TableHead>Zaiyat %</TableHead>
                          <TableHead>Batch Sayısı</TableHead>
                          <TableHead>Ort. Batch</TableHead>
                          <TableHead>Üretim/Saat</TableHead>
                          <TableHead>Trend</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedProducts.map((p) => (
                          <TableRow key={p.productId} data-testid={`row-product-${p.productId}`}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{p.productName}</span>
                                {p.productId === mostProducedId && (
                                  <Badge className="bg-green-600 text-white">En Cok</Badge>
                                )}
                                {p.productId === leastProducedId && (
                                  <Badge className="bg-red-600 text-white">En Az</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{p.category}</Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold text-green-600">{p.totalProduced}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-red-500">{p.totalWaste}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={p.wastePercent < 5 ? "secondary" : p.wastePercent < 10 ? "outline" : "destructive"}>
                                %{p.wastePercent.toFixed(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>{p.totalBatches}</TableCell>
                            <TableCell>{p.avgBatchSize.toFixed(1)}</TableCell>
                            <TableCell>{p.avgProductionPerHour.toFixed(1)}</TableCell>
                            <TableCell>
                              <TrendBadge trend={p.trend} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <EmptyState icon={Package} message="Henuz veri yok" />
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <EmptyState icon={Factory} message="Henuz veri yok" />
          )}
        </TabsContent>

        {/* Tab 2: Personel Performans */}
        <TabsContent value="workers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personel Performans Tablosu</CardTitle>
              <CardDescription>Bir personele tiklayarak detayli skoru gorebilirsiniz</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingWorkers ? (
                <LoadingState />
              ) : workerStats.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Personel</TableHead>
                      <TableHead>Üretim</TableHead>
                      <TableHead>Zaiyat</TableHead>
                      <TableHead>Verimlilik</TableHead>
                      <TableHead>Üretim/Saat</TableHead>
                      <TableHead>Kalite</TableHead>
                      <TableHead>Istasyonlar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workerStats.map((worker) => (
                      <TableRow
                        key={worker.userId}
                        className="cursor-pointer"
                        onClick={() => handleWorkerClick(worker.userId)}
                        data-testid={`row-worker-${worker.userId}`}
                      >
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
                          <span className="font-semibold text-green-600">{worker.totalProduced}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-red-500">{worker.totalWaste}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={worker.efficiency} className="w-16 h-2" />
                            <span className={worker.efficiency >= 80 ? "text-green-600" : worker.efficiency >= 60 ? "text-amber-600" : "text-red-600"}>
                              %{worker.efficiency.toFixed(0)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{worker.avgProductionPerHour.toFixed(1)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Badge className="bg-green-600 text-white">{worker.qualityApproved}</Badge>
                            {worker.qualityRejected > 0 && (
                              <Badge variant="destructive">{worker.qualityRejected}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {worker.stationsWorked.slice(0, 3).map((station, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{station}</Badge>
                            ))}
                            {worker.stationsWorked.length > 3 && (
                              <Badge variant="outline" className="text-xs">+{worker.stationsWorked.length - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState icon={Users} message="Secilen donemde veri yok" />
              )}
            </CardContent>
          </Card>

          <Dialog open={workerDialogOpen} onOpenChange={setWorkerDialogOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500" />
                  {workerScore ? `${workerScore.firstName} ${workerScore.lastName} - Performans Detayi` : "Personel Detayi"}
                </DialogTitle>
              </DialogHeader>
              {loadingWorkerScore ? (
                <LoadingState />
              ) : workerScore ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl font-bold" data-testid="text-current-score">
                        {workerScore.currentScore.toFixed(0)}
                      </div>
                      <span className="text-muted-foreground">Genel Skor</span>
                    </div>
                    <MaturityBadge monthlyDataPoints={workerScore.monthlyDataPoints} />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Yetkinlik Dagilimi</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={radarData}>
                              <PolarGrid />
                              <PolarAngleAxis dataKey="subject" />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} />
                              <Radar name="Skor" dataKey="value" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {workerScore.scoreHistory.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Aylik Skor Trendi</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={workerScore.scoreHistory}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis domain={[0, 100]} />
                                <Tooltip />
                                <Line type="monotone" dataKey="score" name="Skor" stroke="#3b82f6" strokeWidth={2} dot />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {workerScore.peakHours.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Yoğun Calisma Saatleri</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={workerScore.peakHours}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} />
                              <YAxis />
                              <Tooltip labelFormatter={(h) => `${h}:00`} />
                              <Bar dataKey="avgProduction" name="Ort. Üretim" fill="#8b5cf6" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {workerScore.productBreakdown.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Urun Bazli Dagilim</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Ürün</TableHead>
                              <TableHead>Üretim</TableHead>
                              <TableHead>Zaiyat</TableHead>
                              <TableHead>Zaiyat %</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {workerScore.productBreakdown.map((pb, i) => (
                              <TableRow key={i}>
                                <TableCell className="font-medium">{pb.productName}</TableCell>
                                <TableCell>{pb.produced}</TableCell>
                                <TableCell className="text-red-500">{pb.waste}</TableCell>
                                <TableCell>
                                  <Badge variant={(pb.wastePercent || 0) < 5 ? "secondary" : (pb.wastePercent || 0) < 10 ? "outline" : "destructive"}>
                                    %{(pb.wastePercent || 0).toFixed(1)}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <EmptyState icon={Users} message="Henuz veri yok" />
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Tab 3: Karsilastirma */}
        <TabsContent value="comparison" className="space-y-6">
          <div className="flex items-center gap-3">
            <Select value={comparisonProductId} onValueChange={setComparisonProductId}>
              <SelectTrigger className="w-56" data-testid="select-comparison-product">
                <SelectValue placeholder="Ürün Seçin" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!comparisonProductId ? (
            <EmptyState icon={Target} message="Karsilastirma icin bir urun secin" />
          ) : loadingComparison ? (
            <LoadingState />
          ) : sortedComparison.length > 0 ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{comparisonData?.productName} - Personel Karsilastirmasi</CardTitle>
                  <CardDescription>Genel skora gore siralanmis</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sortedComparison} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="firstName" type="category" width={80} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="totalProduced" name="Toplam Üretim" fill="#10b981" />
                        <Bar dataKey="avgProductionPerHour" name="Üretim/Saat" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Skor Karsilastirmasi</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Personel</TableHead>
                        <TableHead>Hiz Skoru</TableHead>
                        <TableHead>Kalite Skoru</TableHead>
                        <TableHead>Tutarlilik Skoru</TableHead>
                        <TableHead>Genel Skor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedComparison.map((w) => (
                        <TableRow key={w.userId} data-testid={`row-comparison-${w.userId}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={w.profileImageUrl || undefined} />
                                <AvatarFallback className="bg-amber-600 text-white text-xs">
                                  {w.firstName[0]}{w.lastName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{w.firstName} {w.lastName}</span>
                              {w.userId === topPerformerId && (
                                <Badge className="bg-amber-500 text-white">
                                  <Medal className="h-3 w-3 mr-1" />
                                  En Iyi
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={w.speedScore} className="w-16 h-2" />
                              <span>{w.speedScore.toFixed(0)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={w.qualityScore} className="w-16 h-2" />
                              <span>{w.qualityScore.toFixed(0)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={w.consistencyScore} className="w-16 h-2" />
                              <span>{w.consistencyScore.toFixed(0)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={w.overallScore >= 80 ? "bg-green-600 text-white" : w.overallScore >= 60 ? "bg-amber-600 text-white" : "bg-red-600 text-white"}>
                              {w.overallScore.toFixed(0)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <EmptyState icon={Users} message="Bu ürün için veri bulunamadı" />
          )}
        </TabsContent>

        {/* Tab 4: Zaiyat Analizi */}
        <TabsContent value="waste" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Zaiyat Nedenleri Dagilimi</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingWaste ? (
                  <LoadingState />
                ) : wasteAnalysis.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={wasteAnalysis}
                          dataKey="count"
                          nameKey="reasonName"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }: { name: string; percent: number }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {wasteAnalysis.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState icon={Trash2} message="Zaiyat kaydi yok" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Zaiyat Detaylari</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingWaste ? (
                  <LoadingState />
                ) : wasteAnalysis.length > 0 ? (
                  <div className="space-y-4">
                    {wasteAnalysis.map((reason, index) => (
                      <div key={reason.reasonId} className="flex items-center gap-3" data-testid={`waste-reason-${reason.reasonId}`}>
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{reason.reasonName}</p>
                          <p className="text-sm text-muted-foreground">{reason.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{reason.count}</p>
                          <p className="text-sm text-muted-foreground">%{reason.percentage.toFixed(1)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Trash2} message="Zaiyat kaydi yok" />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 5: Skor Yonetimi */}
        <TabsContent value="scores" className="space-y-6">
          <Card className="hover-elevate">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                Skorlama Algoritmasi
              </CardTitle>
              <CardDescription>Personel performans skorlari asagidaki agirliklarla hesaplanir</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Her personelin genel performans skoru, 5 farkli bilesenin agirlikli ortalamasiyla hesaplanir.
                  Skorlar 0-100 arasinda deger alir ve duzenlı olarak guncellenebilir.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Zap className="h-6 w-6 mx-auto mb-2 text-amber-500" />
                      <p className="font-semibold">Hiz</p>
                      <p className="text-2xl font-bold text-amber-500">%25</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Target className="h-6 w-6 mx-auto mb-2 text-green-500" />
                      <p className="font-semibold">Kalite</p>
                      <p className="text-2xl font-bold text-green-500">%30</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <BarChart3 className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                      <p className="font-semibold">Tutarlilik</p>
                      <p className="text-2xl font-bold text-blue-500">%20</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Clock className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                      <p className="font-semibold">Devam</p>
                      <p className="text-2xl font-bold text-purple-500">%15</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <TrendingUp className="h-6 w-6 mx-auto mb-2 text-red-500" />
                      <p className="font-semibold">Gelişim</p>
                      <p className="text-2xl font-bold text-red-500">%10</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Skor Güncelleme
              </CardTitle>
              <CardDescription>Tum personel skorlarini yeniden hesapla</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => updateScoresMutation.mutate()}
                disabled={updateScoresMutation.isPending}
                data-testid="button-update-scores"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${updateScoresMutation.isPending ? "animate-spin" : ""}`} />
                {updateScoresMutation.isPending ? "Hesaplanıyor..." : "Skorları Güncelle"}
              </Button>

              {updateScoresMutation.data && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {updateScoresMutation.data.updated} personelin skoru guncellendi
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Personel</TableHead>
                        <TableHead>Eski Skor</TableHead>
                        <TableHead>Yeni Skor</TableHead>
                        <TableHead>Degisim</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {updateScoresMutation.data.workers.map((w) => {
                        const diff = w.newScore - w.oldScore;
                        return (
                          <TableRow key={w.userId} data-testid={`row-score-update-${w.userId}`}>
                            <TableCell className="font-medium">{w.firstName} {w.lastName}</TableCell>
                            <TableCell>{w.oldScore.toFixed(0)}</TableCell>
                            <TableCell className="font-semibold">{w.newScore.toFixed(0)}</TableCell>
                            <TableCell>
                              {diff > 0 ? (
                                <Badge className="bg-green-600 text-white">
                                  <ArrowUpRight className="h-3 w-3 mr-1" />+{diff.toFixed(0)}
                                </Badge>
                              ) : diff < 0 ? (
                                <Badge className="bg-red-600 text-white">
                                  <ArrowDownRight className="h-3 w-3 mr-1" />{diff.toFixed(0)}
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  <Minus className="h-3 w-3 mr-1" />0
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
