import { useState, useEffect, Suspense, lazy } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HQ_ROLES } from "@shared/schema";
import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import {
  BarChart3,
  MessageSquareHeart,
  AlertTriangle,
  Clock,
  Settings,
  TrendingUp,
  TrendingDown,
  Star,
  Building2,
  ShieldAlert,
  MessageSquare,
  Sparkles,
  Brush,
  Package,
  Users,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

const GuestFeedbackList = lazy(() => import("@/pages/crm/feedback"));
const GuestComplaints = lazy(() => import("@/pages/guest-complaints"));
const GuestSLATracking = lazy(() => import("@/pages/crm/sla-tracking"));
const GuestFormSettings = lazy(() => import("@/pages/guest-form-settings"));
const GuestAnalytics = lazy(() => import("@/pages/crm/analytics"));

interface TabConfig {
  id: string;
  labelTr: string;
  icon: React.ReactNode;
}

const TABS: TabConfig[] = [
  { id: "dashboard", labelTr: "Dashboard", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "geri-bildirimler", labelTr: "Geri Bildirimler", icon: <MessageSquareHeart className="h-4 w-4" /> },
  { id: "sikayetler", labelTr: "Misafir Şikayetleri", icon: <AlertTriangle className="h-4 w-4" /> },
  { id: "sla", labelTr: "SLA Takibi", icon: <Clock className="h-4 w-4" /> },
  { id: "form-ayarlari", labelTr: "Form Ayarları", icon: <Settings className="h-4 w-4" /> },
  { id: "analizler", labelTr: "Analizler", icon: <TrendingUp className="h-4 w-4" /> },
];

const TAB_URL_MAP: Record<string, string> = {
  dashboard: "/misafir-memnuniyeti",
  "geri-bildirimler": "/misafir-memnuniyeti/geri-bildirimler",
  sikayetler: "/misafir-memnuniyeti/sikayetler",
  sla: "/misafir-memnuniyeti/sla",
  "form-ayarlari": "/misafir-memnuniyeti/form-ayarlari",
  analizler: "/misafir-memnuniyeti/analizler",
};

function getTabFromUrl(pathname: string): string | null {
  if (pathname === "/misafir-memnuniyeti" || pathname === "/misafir-memnuniyeti/") return "dashboard";
  for (const [tabId, url] of Object.entries(TAB_URL_MAP)) {
    if (tabId !== "dashboard" && pathname.startsWith(url)) return tabId;
  }
  return null;
}

function TabSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

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

function CategoryRatingCard({ label, value, icon }: { label: string; value: number | null; icon: React.ReactNode }) {
  const safeVal = Number(value ?? 0);
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
      <div className="p-2 rounded-full bg-primary/10">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold" data-testid={`value-category-${label.toLowerCase()}`}>
          {safeVal > 0 ? Number(safeVal ?? 0).toFixed(1) : "-"}
        </p>
      </div>
    </div>
  );
}

function GuestDashboard() {
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
      </div>
    );
  }

  if (isError) return <ErrorState onRetry={() => refetch()} />;

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
    avgRating: Number(b.avgRating ?? 0),
    feedbackCount: Number(b.feedbackCount ?? 0),
  }));

  const sortedBranches = [...branchComparison].sort((a, b) => Number(b.avgRating ?? 0) - Number(a.avgRating ?? 0));
  const bestBranch = sortedBranches[0];
  const worstBranch = sortedBranches[sortedBranches.length - 1];

  const topBranches = new Set(branchComparison.slice(0, 3).map((b) => b.branchName));
  const bottomBranches = new Set(
    branchComparison.length > 3 ? branchComparison.slice(-3).map((b) => b.branchName) : []
  );

  const pieData = categoryDistribution.map((c) => ({
    name: CATEGORY_LABELS[c.category] || c.category,
    value: Number(c.count ?? 0),
    category: c.category,
  }));

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card data-testid="kpi-guest-avg-rating">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Genel Ortalama</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-2xl font-bold">{Number(kpis.avgRating ?? 0).toFixed(1)}</p>
                <span className="text-sm text-muted-foreground">/ 5</span>
              </div>
              <StarRating rating={Math.round(Number(kpis.avgRating ?? 0))} />
            </CardContent>
          </Card>

          <Card data-testid="kpi-guest-total">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Toplam Değerlendirme</p>
              <p className="text-2xl font-bold">{Number(kpis.totalFeedback30d ?? 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">Son 30 gün</p>
            </CardContent>
          </Card>

          <Card data-testid="kpi-guest-response-rate">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Memnuniyet Oranı</p>
              <div className="flex items-center gap-1">
                <p className="text-2xl font-bold">%{positiveRate}</p>
                {positiveRate >= 70 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-orange-500" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Olumlu geri bildirim</p>
            </CardContent>
          </Card>

          <Card data-testid="kpi-guest-sla">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">SLA İhlali</p>
              <p className={`text-2xl font-bold ${kpis.slaBreachCount > 0 ? "text-red-500" : ""}`}>
                {Number(kpis.slaBreachCount ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Yanıt süre aşımı</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <CategoryRatingCard
            label="Hizmet"
            value={kpis.avgServiceRating}
            icon={<Sparkles className="h-4 w-4 text-yellow-500" />}
          />
          <CategoryRatingCard
            label="Temizlik"
            value={kpis.avgCleanlinessRating}
            icon={<Brush className="h-4 w-4 text-blue-500" />}
          />
          <CategoryRatingCard
            label="Ürün"
            value={kpis.avgProductRating}
            icon={<Package className="h-4 w-4 text-green-500" />}
          />
          <CategoryRatingCard
            label="Personel"
            value={kpis.avgStaffRating}
            icon={<Users className="h-4 w-4 text-purple-500" />}
          />
        </div>

        {bestBranch && worstBranch && branchComparison.length > 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card data-testid="card-best-branch">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">En İyi Şube</p>
                    <p className="font-semibold">{bestBranch.branchName}</p>
                    <div className="flex items-center gap-1">
                      <StarRating rating={Math.round(Number(bestBranch.avgRating ?? 0))} />
                      <span className="text-sm">{Number(bestBranch.avgRating ?? 0).toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-worst-branch">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">En Düşük Şube</p>
                    <p className="font-semibold">{worstBranch.branchName}</p>
                    <div className="flex items-center gap-1">
                      <StarRating rating={Math.round(Number(worstBranch.avgRating ?? 0))} />
                      <span className="text-sm">{Number(worstBranch.avgRating ?? 0).toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card data-testid="guest-branch-comparison-chart">
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
                    <Tooltip formatter={(value: number) => [Number(value).toFixed(1), "Ort. Puan"]} />
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
          <Card data-testid="guest-recent-feedback">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Son Geri Bildirimler</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentInteractions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Henüz geri bildirim yok</p>
                ) : (
                  recentInteractions.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg bg-muted/30 space-y-1"
                      data-testid={`guest-feedback-item-${item.id}`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">{item.branchName}</Badge>
                          <StarRating rating={item.rating} />
                        </div>
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

          <Card data-testid="guest-category-distribution">
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
                        label={({ name, percent }) => `${name} ${(Number(percent) * 100).toFixed(0)}%`}
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

export default function MisafirMemnuniyetiModul() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  useEffect(() => {
    const tabFromUrl = getTabFromUrl(location);
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [location]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    const newUrl = TAB_URL_MAP[tabId] || `/misafir-memnuniyeti/${tabId}`;
    if (location !== newUrl) setLocation(newUrl);
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3 pb-2">
        <h1 className="text-xl font-semibold" data-testid="text-guest-satisfaction-title">
          Misafir Memnuniyeti
        </h1>
        <p className="text-sm text-muted-foreground">
          Şube misafir geri bildirimleri, şikayetler ve memnuniyet analizi
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
        <div className="px-4 border-b">
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="inline-flex h-10 w-max items-center justify-start gap-1 bg-transparent p-0">
              {TABS.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"
                  data-testid={`tab-guest-${tab.id}`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.labelTr}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        <div className="flex-1 overflow-auto">
          <TabsContent value="dashboard" className="h-full m-0 p-0 data-[state=inactive]:hidden">
            <GuestDashboard />
          </TabsContent>
          <TabsContent value="geri-bildirimler" className="h-full m-0 p-0 data-[state=inactive]:hidden">
            <Suspense fallback={<TabSkeleton />}>
              <GuestFeedbackList />
            </Suspense>
          </TabsContent>
          <TabsContent value="sikayetler" className="h-full m-0 p-0 data-[state=inactive]:hidden">
            <Suspense fallback={<TabSkeleton />}>
              <GuestComplaints />
            </Suspense>
          </TabsContent>
          <TabsContent value="sla" className="h-full m-0 p-0 data-[state=inactive]:hidden">
            <Suspense fallback={<TabSkeleton />}>
              <GuestSLATracking />
            </Suspense>
          </TabsContent>
          <TabsContent value="form-ayarlari" className="h-full m-0 p-0 data-[state=inactive]:hidden">
            <Suspense fallback={<TabSkeleton />}>
              <GuestFormSettings />
            </Suspense>
          </TabsContent>
          <TabsContent value="analizler" className="h-full m-0 p-0 data-[state=inactive]:hidden">
            <Suspense fallback={<TabSkeleton />}>
              <GuestAnalytics />
            </Suspense>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
