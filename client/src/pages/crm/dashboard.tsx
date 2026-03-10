import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Star,
  MessageSquare,
  AlertTriangle,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";

interface DashboardKpis {
  todayFeedbackCount: number;
  avgRating: number;
  openComplaintsCount: number;
  slaBreachCount: number;
  totalFeedback30d: number;
  negativeCount: number;
  avgServiceRating: number | null;
  avgCleanlinessRating: number | null;
  avgProductRating: number | null;
  avgStaffRating: number | null;
}

interface BranchComparison {
  branchId: number;
  branchName: string;
  avgRating: number;
  feedbackCount: number;
}

interface RecentInteraction {
  id: number;
  branchId: number;
  branchName: string;
  rating: number;
  comment: string | null;
  status: string;
  feedbackType: string | null;
  source: string | null;
  createdAt: string;
}

interface CategoryDistItem {
  category: string;
  count: number;
}

interface DashboardData {
  kpis: DashboardKpis;
  branchComparison: BranchComparison[];
  recentInteractions: RecentInteraction[];
  categoryDistribution: CategoryDistItem[];
}

const CATEGORY_LABELS: Record<string, string> = {
  cleanliness: "Temizlik",
  service: "Hizmet",
  product: "Ürün",
  staff: "Personel",
  other: "Diğer",
};

const CATEGORY_COLORS: Record<string, string> = {
  cleanliness: "#3b82f6",
  service: "#f59e0b",
  product: "#10b981",
  staff: "#8b5cf6",
  other: "#6b7280",
};

function StarRating({ rating }: { rating: number }) {
  

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3 w-3 ${star <= rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    new: { label: "Yeni", variant: "default" },
    in_progress: { label: "İşlemde", variant: "secondary" },
    resolved: { label: "Çözüldü", variant: "outline" },
    closed: { label: "Kapatıldı", variant: "outline" },
    awaiting_response: { label: "Yanıt Bekliyor", variant: "destructive" },
  };
  const entry = map[status] || { label: status, variant: "secondary" as const };
  return (
    <Badge variant={entry.variant} data-testid={`badge-status-${status}`}>
      {entry.label}
    </Badge>
  );
}

export default function CRMDashboard() {
  const { data, isLoading, isError, refetch } = useQuery<DashboardData>({
    queryKey: ["/api/crm/dashboard-stats"],
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Dashboard verileri yüklenemedi
      </div>
    );
  }

  const { kpis, branchComparison, recentInteractions, categoryDistribution } = data;

  const positiveRate = kpis.totalFeedback30d > 0
    ? Math.round(((kpis.totalFeedback30d - kpis.negativeCount) / kpis.totalFeedback30d) * 100)
    : 0;

  const barData = branchComparison.map((b) => ({
    name: b.branchName,
    avgRating: b.avgRating,
    feedbackCount: b.feedbackCount,
  }));

  const topBranches = new Set(branchComparison.slice(0, 3).map((b) => b.branchName));
  const bottomBranches = new Set(
    branchComparison.length > 3
      ? branchComparison.slice(-3).map((b) => b.branchName)
      : []
  );

  const pieData = categoryDistribution.map((c) => ({
    name: CATEGORY_LABELS[c.category] || c.category,
    value: c.count,
    category: c.category,
  }));

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card data-testid="kpi-today-feedback">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Bugün Geri Bildirim</p>
                  <p className="text-2xl font-bold" data-testid="value-today-feedback">
                    {kpis.todayFeedbackCount}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <StarRating rating={Math.round(kpis.avgRating ?? 0)} />
                    <span className="text-sm font-medium" data-testid="value-avg-rating">
                      {(Number(kpis.avgRating) || 0).toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="kpi-open-complaints">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Açık Şikayetler</p>
                  <p className="text-2xl font-bold" data-testid="value-open-complaints">
                    {kpis.openComplaintsCount}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Çözüm bekliyor</p>
                </div>
                <div className={`p-3 rounded-full ${kpis.openComplaintsCount > 0 ? "bg-orange-100 dark:bg-orange-900/30" : "bg-green-100 dark:bg-green-900/30"}`}>
                  <AlertTriangle className={`h-5 w-5 ${kpis.openComplaintsCount > 0 ? "text-orange-600" : "text-green-600"}`} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="kpi-sla-breaches">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">SLA İhlalleri</p>
                  <p className="text-2xl font-bold" data-testid="value-sla-breaches">
                    {kpis.slaBreachCount}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Süre aşımı</p>
                </div>
                <div className={`p-3 rounded-full ${kpis.slaBreachCount > 0 ? "bg-red-100 dark:bg-red-900/30" : "bg-green-100 dark:bg-green-900/30"}`}>
                  <ShieldAlert className={`h-5 w-5 ${kpis.slaBreachCount > 0 ? "text-red-600" : "text-green-600"}`} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="kpi-satisfaction">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Memnuniyet Trendi</p>
                  <p className="text-2xl font-bold" data-testid="value-satisfaction">
                    %{positiveRate}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Son 30 gün ({kpis.totalFeedback30d} bildirim)
                  </p>
                </div>
                <div className={`p-3 rounded-full ${positiveRate >= 70 ? "bg-green-100 dark:bg-green-900/30" : "bg-orange-100 dark:bg-orange-900/30"}`}>
                  {positiveRate >= 70 ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-orange-600" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="branch-comparison-chart">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Şube Karşılaştırması</CardTitle>
          </CardHeader>
          <CardContent>
            {barData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Şube verisi yok</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" margin={{ left: 80, right: 20, top: 5, bottom: 5 }}>
                    <XAxis type="number" domain={[0, 5]} tickCount={6} />
                    <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number) => [value.toFixed(1), "Ort. Puan"]}
                      labelFormatter={(label: string) => label}
                    />
                    <Bar dataKey="avgRating" radius={[0, 4, 4, 0]}>
                      {barData.map((entry) => {
                        let fill = "#6b7280";
                        if (topBranches.has(entry.name)) fill = "#22c55e";
                        else if (bottomBranches.has(entry.name)) fill = "#ef4444";
                        return <Cell key={entry.name} fill={fill} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card data-testid="recent-interactions">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Son Etkileşimler</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentInteractions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Henüz etkileşim yok</p>
                ) : (
                  recentInteractions.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg bg-muted/30 space-y-1"
                      data-testid={`interaction-item-${item.id}`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {item.branchName}
                          </Badge>
                          <StarRating rating={item.rating} />
                          <StatusBadge status={item.status} />
                        </div>
                        <span className="text-xs text-muted-foreground" data-testid={`interaction-date-${item.id}`}>
                          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: tr })}
                        </span>
                      </div>
                      {item.comment && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.comment}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="category-distribution-chart">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Kategori Dağılımı</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Kategori verisi yok</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={80}
                        paddingAngle={2}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] || "#6b7280"} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [value, "Adet"]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}
