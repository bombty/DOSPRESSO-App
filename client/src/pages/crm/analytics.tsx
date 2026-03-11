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
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

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

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/crm/analytics", queryParams],
  });

  const { data: branchList } = useQuery<Branch[]>({
    queryKey: ["/api/crm/branches"],
  });

  const sentiment = data?.sentiment ?? { positive: 0, neutral: 0, negative: 0 };
  const sentimentTotal = sentiment.positive + sentiment.neutral + sentiment.negative;

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

      <Card data-testid="ticket-trend-chart">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-base">Ticket / Talep Trendi</CardTitle>
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
                  tick={{ fontSize: 12 }}
                  label={{ value: "Adet", angle: -90, position: "insideLeft", style: { fontSize: 12 } }}
                />
                <Tooltip
                  labelFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                  }}
                />
                <Legend />
                <Bar
                  dataKey="count"
                  name="Ticket Sayısı"
                  fill="#3b82f6"
                  opacity={0.8}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-testid="sentiment-section">
        <Card data-testid="sentiment-positive">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Çözülenler</p>
                <p className="text-xl font-semibold text-green-600 dark:text-green-400">{sentiment.positive}</p>
              </div>
              <span className="text-sm text-muted-foreground">
                {sentimentTotal > 0 ? `%${((sentiment.positive / sentimentTotal) * 100).toFixed(0)}` : "%0"}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="sentiment-neutral">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Minus className="h-5 w-5 text-yellow-500" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">İşlemde</p>
                <p className="text-xl font-semibold text-yellow-600 dark:text-yellow-400">{sentiment.neutral}</p>
              </div>
              <span className="text-sm text-muted-foreground">
                {sentimentTotal > 0 ? `%${((sentiment.neutral / sentimentTotal) * 100).toFixed(0)}` : "%0"}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="sentiment-negative">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Açık / Bekleyen</p>
                <p className="text-xl font-semibold text-red-600 dark:text-red-400">{sentiment.negative}</p>
              </div>
              <span className="text-sm text-muted-foreground">
                {sentimentTotal > 0 ? `%${((sentiment.negative / sentimentTotal) * 100).toFixed(0)}` : "%0"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="branch-comparison">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-base">Şube Ticket Karşılaştırması</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ minHeight: 200 }}>
            <ResponsiveContainer width="100%" height={Math.max(300, branchChartData.length * 40)}>
              <BarChart data={branchChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="branchName"
                  tick={{ fontSize: 12 }}
                  width={120}
                />
                <Tooltip
                  formatter={(value: number) => [value, "Ticket Sayısı"]}
                />
                <Bar dataKey="feedbackCount" name="Ticket Sayısı">
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
