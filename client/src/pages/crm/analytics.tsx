import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

interface DailyTrend {
  date: string;
  avgRating: number;
  count: number;
  avgService: number | null;
  avgCleanliness: number | null;
  avgProduct: number | null;
  avgStaff: number | null;
}

interface Sentiment {
  positive: number;
  neutral: number;
  negative: number;
}

interface BranchComparison {
  branchId: number;
  branchName: string;
  avgRating: number;
  avgService: number | null;
  avgCleanliness: number | null;
  avgProduct: number | null;
  avgStaff: number | null;
  feedbackCount: number;
}

interface AnalyticsData {
  dailyTrend: DailyTrend[];
  sentiment: Sentiment;
  branchComparison: BranchComparison[];
}

interface Branch {
  id: number;
  name: string;
}

export default function CRMAnalytics() {
  const [days, setDays] = useState<number>(30);
  const [branchId, setBranchId] = useState<string>("all");

  const queryParams: Record<string, any> = { days };
  if (branchId !== "all") queryParams.branchId = Number(branchId);

  const { data, isLoading, isError, refetch } = useQuery<AnalyticsData>({
    queryKey: ["/api/crm/analytics", queryParams],
  });

  const { data: branchList } = useQuery<Branch[]>({
    queryKey: ["/api/crm/branches"],
  });

  const sentiment = data?.sentiment ?? { positive: 0, neutral: 0, negative: 0 };
  const sentimentTotal = sentiment.positive + sentiment.neutral + sentiment.negative;

  const sentimentPieData = [
    { name: "Pozitif", value: sentiment.positive, color: "#22c55e" },
    { name: "Nötr", value: sentiment.neutral, color: "#eab308" },
    { name: "Negatif", value: sentiment.negative, color: "#ef4444" },
  ];

  const branchComparison = data?.branchComparison ?? [];
  const branchChartData = [...branchComparison]
    .sort((a, b) => a.avgRating - b.avgRating)
    .map((b, idx, arr) => {
      let fill = "hsl(var(--muted-foreground))";
      if (arr.length >= 3 && idx >= arr.length - 3) fill = "#22c55e";
      if (arr.length >= 3 && idx < 3) fill = "#ef4444";
      if (arr.length < 3) {
        if (idx === arr.length - 1) fill = "#22c55e";
        if (idx === 0 && arr.length > 1) fill = "#ef4444";
      }
      return { ...b, fill };
    });

  if (isLoading) {
    
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
      <div className="space-y-4 p-4" data-testid="analytics-loading">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4" data-testid="analytics-page">
      <div className="flex flex-wrap items-center gap-3" data-testid="analytics-filters">
        <Select
          value={String(days)}
          onValueChange={(v) => setDays(Number(v))}
        >
          <SelectTrigger className="w-[160px]" data-testid="select-period">
            <SelectValue placeholder="Dönem seçin" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Son 30 Gün</SelectItem>
            <SelectItem value="60">Son 60 Gün</SelectItem>
            <SelectItem value="90">Son 90 Gün</SelectItem>
          </SelectContent>
        </Select>

        <Select value={branchId} onValueChange={setBranchId}>
          <SelectTrigger className="w-[200px]" data-testid="select-branch">
            <SelectValue placeholder="Şube seçin" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Şubeler</SelectItem>
            {branchList?.map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card data-testid="trend-chart">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-base">Geri Bildirim Trendi</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ minHeight: 200 }}>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={data?.dailyTrend ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                />
                <YAxis
                  yAxisId="left"
                  domain={[0, 5]}
                  tick={{ fontSize: 12 }}
                  label={{ value: "Puan", angle: -90, position: "insideLeft", style: { fontSize: 12 } }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  label={{ value: "Adet", angle: 90, position: "insideRight", style: { fontSize: 12 } }}
                />
                <Tooltip
                  labelFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                  }}
                />
                <Legend />
                <Bar
                  yAxisId="right"
                  dataKey="count"
                  name="Geri Bildirim Sayısı"
                  fill="#9ca3af"
                  opacity={0.6}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="avgRating"
                  name="Ort. Puan"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="category-trends">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-base">Kategori Trendleri</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ minHeight: 200 }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data?.dailyTrend ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                />
                <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
                <Tooltip
                  labelFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="avgService" name="Hizmet" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="avgCleanliness" name="Temizlik" stroke="#22c55e" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="avgProduct" name="Ürün" stroke="#f97316" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="avgStaff" name="Personel" stroke="#a855f7" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="sentiment-section">
        <Card data-testid="sentiment-cards">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-base">Duygu Analizi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 rounded-md border p-3" data-testid="sentiment-positive">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Pozitif (4-5 Yıldız)</p>
                <p className="text-xl font-semibold text-green-600 dark:text-green-400">{sentiment.positive}</p>
              </div>
              <span className="text-sm text-muted-foreground">
                {sentimentTotal > 0 ? `%${((sentiment.positive / sentimentTotal) * 100).toFixed(0)}` : "%0"}
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-md border p-3" data-testid="sentiment-neutral">
              <Minus className="h-5 w-5 text-yellow-500" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Nötr (3 Yıldız)</p>
                <p className="text-xl font-semibold text-yellow-600 dark:text-yellow-400">{sentiment.neutral}</p>
              </div>
              <span className="text-sm text-muted-foreground">
                {sentimentTotal > 0 ? `%${((sentiment.neutral / sentimentTotal) * 100).toFixed(0)}` : "%0"}
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-md border p-3" data-testid="sentiment-negative">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Negatif (1-2 Yıldız)</p>
                <p className="text-xl font-semibold text-red-600 dark:text-red-400">{sentiment.negative}</p>
              </div>
              <span className="text-sm text-muted-foreground">
                {sentimentTotal > 0 ? `%${((sentiment.negative / sentimentTotal) * 100).toFixed(0)}` : "%0"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="sentiment-pie">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-base">Duygu Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={sentimentPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  label={({ name, percent }) => `${name} %${(percent * 100).toFixed(0)}`}
                >
                  {sentimentPieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [value, "Adet"]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="branch-comparison">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-base">Şube Karşılaştırması</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ minHeight: 200 }}>
            <ResponsiveContainer width="100%" height={Math.max(300, branchChartData.length * 40)}>
              <BarChart data={branchChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="branchName"
                  tick={{ fontSize: 12 }}
                  width={120}
                />
                <Tooltip
                  formatter={(value: number) => [value.toFixed(1), "Ort. Puan"]}
                />
                <Bar dataKey="avgRating" name="Ort. Puan">
                  {branchChartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
