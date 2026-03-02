import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Percent,
  Users,
  Star,
  AlertTriangle,
  Package,
  ArrowUpDown,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  PieChartIcon,
  Building2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface TrendData {
  topOrderedProducts: Array<{
    product_name: string;
    total_quantity: string;
    total_cost: string;
  }>;
  priceChanges: Array<{
    product_name: string;
    old_price: string | null;
    new_price: string;
    change_percent: string | null;
    date: string;
  }>;
  monthlySpending: Array<{
    month: string;
    total_spending: string;
    order_count: string;
  }>;
  stockMovementTrends: Array<{
    date: string;
    movement_type: string;
    count: string;
  }>;
  categoryDistribution: Array<{
    category: string;
    total_cost: string;
  }>;
  summary: {
    totalSpending: number;
    orderCount: number;
    avgOrderAmount: number;
    priceIncreaseRate: number;
  };
}

interface SupplierPerformanceData {
  suppliers: Array<{
    id: number;
    name: string;
    code: string;
    qualityScore: number;
    deliveryRate: number;
    orderCount: number;
    totalValue: number;
    avgDeliveryDays: number;
    activeProductCount: number;
    recentIssuesCount: number;
  }>;
  summary: {
    totalSuppliers: number;
    totalOrders: number;
    totalValue: number;
    avgQuality: number;
    totalIssues: number;
  };
}

interface StockMovementReportData {
  monthlyMovements: Array<{
    month: string;
    movement_type: string;
    count: number;
    total_quantity: string;
  }>;
  topMovingItems: Array<{
    product_name: string;
    category: string;
    movement_count: number;
    total_quantity: string;
  }>;
  categoryBreakdown: Array<{
    category: string;
    movement_type: string;
    count: number;
    total_quantity: string;
  }>;
  summary: {
    totalMovements: number;
    totalIn: number;
    totalOut: number;
  };
}

interface CostAnalysisData {
  monthlySpending: Array<{
    month: string;
    total_spending: string;
    order_count: number;
  }>;
  topCostItems: Array<{
    product_name: string;
    category: string;
    total_cost: string;
    total_quantity: string;
    avg_unit_price: string;
  }>;
  categorySpending: Array<{
    category: string;
    total_cost: string;
    product_count: number;
  }>;
  summary: {
    totalSpending: number;
    totalOrders: number;
    avgMonthlySpending: number;
    changePercent: number;
  };
}

const MONTH_LABELS: Record<string, string> = {
  "01": "Oca",
  "02": "Şub",
  "03": "Mar",
  "04": "Nis",
  "05": "May",
  "06": "Haz",
  "07": "Tem",
  "08": "Ağu",
  "09": "Eyl",
  "10": "Eki",
  "11": "Kas",
  "12": "Ara",
};

const CATEGORY_LABELS: Record<string, string> = {
  hammadde: "Hammadde",
  yarimamul: "Yari Mamul",
  mamul: "Mamul",
  ambalaj: "Ambalaj",
  ekipman: "Ekipman",
  sube_ekipman: "Sube Ekipman",
  sube_malzeme: "Sube Malzeme",
  konsantre: "Konsantre",
  donut: "Donut",
  tatli: "Tatli",
  tuzlu: "Tuzlu",
  cay_grubu: "Cay Grubu",
  kahve: "Kahve",
  toz_topping: "Toz/Topping",
  sarf_malzeme: "Sarf Malzeme",
  temizlik: "Temizlik",
  diger: "Diger",
};

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  giris: "Giriş",
  cikis: "Çıkış",
  fire: "Fire",
  mal_kabul: "Mal Kabul",
  iade: "İade",
  uretim_giris: "Üretim Giriş",
  uretim_cikis: "Üretim Çıkış",
  sayim_duzeltme: "Sayım Düzeltme",
  transfer: "Transfer",
};

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(210, 70%, 50%)",
  "hsl(150, 60%, 45%)",
  "hsl(35, 80%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(190, 70%, 45%)",
  "hsl(0, 60%, 55%)",
  "hsl(60, 70%, 45%)",
  "hsl(320, 60%, 50%)",
];

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "6px",
  color: "hsl(var(--foreground))",
};

function formatCurrency(value: number): string {
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatMonthLabel(monthStr: string): string {
  const parts = monthStr.split("-");
  if (parts.length === 2) {
    return MONTH_LABELS[parts[1]] || parts[1];
  }
  return monthStr;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4" data-testid="trend-loading">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-1 pt-3 px-3">
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <Skeleton className="h-7 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-1 pt-3 px-3">
              <Skeleton className="h-4 w-36" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, color, bgColor, testId }: {
  title: string;
  value: string;
  icon: any;
  color: string;
  bgColor: string;
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3 gap-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon className={`h-3.5 w-3.5 ${color}`} />
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="text-lg font-bold" data-testid={`${testId}-value`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function GenelTrendTab({ data }: { data: TrendData | undefined }) {
  const summary = data?.summary || {
    totalSpending: 0,
    orderCount: 0,
    avgOrderAmount: 0,
    priceIncreaseRate: 0,
  };

  const monthlyData = (data?.monthlySpending || []).map((m) => ({
    month: formatMonthLabel(m.month),
    spending: parseFloat(m.total_spending),
  }));

  const topProducts = (data?.topOrderedProducts || []).map((p) => ({
    name:
      p.product_name.length > 25
        ? p.product_name.substring(0, 25) + "..."
        : p.product_name,
    fullName: p.product_name,
    quantity: parseFloat(p.total_quantity),
    cost: parseFloat(p.total_cost),
  }));

  const allMovementTypes = new Set<string>();
  (data?.stockMovementTrends || []).forEach((m) => {
    allMovementTypes.add(m.movement_type);
  });

  const movementDatesMap = new Map<string, Record<string, number>>();
  (data?.stockMovementTrends || []).forEach((m) => {
    const dateKey = m.date.substring(5);
    if (!movementDatesMap.has(dateKey)) {
      movementDatesMap.set(dateKey, {});
    }
    const entry = movementDatesMap.get(dateKey)!;
    entry[m.movement_type] = parseInt(m.count);
  });

  const movementData = Array.from(movementDatesMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, types]) => ({
      date,
      ...types,
    }));

  const movementColors: Record<string, string> = {
    giris: "hsl(150, 60%, 45%)",
    cikis: "hsl(0, 70%, 55%)",
    mal_kabul: "hsl(210, 70%, 50%)",
    fire: "hsl(35, 80%, 55%)",
    iade: "hsl(280, 60%, 55%)",
    uretim_giris: "hsl(160, 50%, 50%)",
    uretim_cikis: "hsl(10, 60%, 50%)",
    sayim_duzeltme: "hsl(190, 70%, 45%)",
    transfer: "hsl(60, 70%, 45%)",
  };

  const categoryData = (data?.categoryDistribution || [])
    .filter((c) => parseFloat(c.total_cost) > 0)
    .map((c) => ({
      name: CATEGORY_LABELS[c.category] || c.category,
      value: parseFloat(c.total_cost),
    }));

  const summaryCards = [
    {
      title: "Son 90 Gun Toplam Harcama",
      value: formatCurrency(summary.totalSpending) + " TL",
      icon: DollarSign,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Toplam Siparis Sayisi",
      value: summary.orderCount.toString(),
      icon: ShoppingCart,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Ortalama Siparis Tutari",
      value: formatCurrency(summary.avgOrderAmount) + " TL",
      icon: TrendingUp,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Fiyat Artisi Orani",
      value: "%" + summary.priceIncreaseRate.toFixed(1),
      icon: Percent,
      color:
        summary.priceIncreaseRate > 50 ? "text-red-500" : "text-orange-500",
      bgColor:
        summary.priceIncreaseRate > 50
          ? "bg-red-500/10"
          : "bg-orange-500/10",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryCards.map((card, index) => (
          <SummaryCard
            key={index}
            title={card.title}
            value={card.value}
            icon={card.icon}
            color={card.color}
            bgColor={card.bgColor}
            testId={`trend-summary-card-${index}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card data-testid="chart-top-products">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs">
              En Cok Siparis Verilen Urunler
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={topProducts}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      value.toLocaleString("tr-TR"),
                      "Miktar",
                    ]}
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Bar
                    dataKey="quantity"
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                Siparis verisi bulunamadi
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="chart-monthly-spending">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs">Aylik Harcama Trendi</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={monthlyData}
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) =>
                      (v / 1000).toLocaleString("tr-TR") + "K"
                    }
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      formatCurrency(value) + " TL",
                      "Harcama",
                    ]}
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Line
                    type="monotone"
                    dataKey="spending"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "hsl(var(--primary))" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                Harcama verisi bulunamadi
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="chart-stock-movements">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs">Stok Hareket Trendi</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {movementData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={movementData}
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value: number, name: string) => [
                      value,
                      MOVEMENT_TYPE_LABELS[name] || name,
                    ]}
                  />
                  <Legend
                    formatter={(value: string) =>
                      MOVEMENT_TYPE_LABELS[value] || value
                    }
                  />
                  {Array.from(allMovementTypes).map((type) => (
                    <Area
                      key={type}
                      type="monotone"
                      dataKey={type}
                      stackId="1"
                      stroke={movementColors[type] || "hsl(var(--muted-foreground))"}
                      fill={movementColors[type] || "hsl(var(--muted-foreground))"}
                      fillOpacity={0.4}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                Stok hareket verisi bulunamadi
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="chart-category-distribution">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs">Kategori Bazli Harcama</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {categoryData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [
                      formatCurrency(value) + " TL",
                      "Tutar",
                    ]}
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                Kategori verisi bulunamadi
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="table-price-changes">
        <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3 gap-2">
          <CardTitle className="text-xs">Son Fiyat Degisimleri</CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            Son 20
          </Badge>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          {data?.priceChanges && data.priceChanges.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Urun</TableHead>
                  <TableHead className="text-right">Eski Fiyat</TableHead>
                  <TableHead className="text-right">Yeni Fiyat</TableHead>
                  <TableHead className="text-right">Degisim (%)</TableHead>
                  <TableHead className="text-right">Tarih</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.priceChanges.map((change, index) => {
                  const changePercent = parseFloat(
                    change.change_percent || "0"
                  );
                  const isIncrease = changePercent > 0;
                  const isDecrease = changePercent < 0;
                  return (
                    <TableRow
                      key={index}
                      data-testid={`price-change-row-${index}`}
                    >
                      <TableCell
                        className="font-medium"
                        data-testid={`price-change-product-${index}`}
                      >
                        {change.product_name}
                      </TableCell>
                      <TableCell
                        className="text-right font-mono text-sm"
                        data-testid={`price-change-old-${index}`}
                      >
                        {change.old_price
                          ? formatCurrency(parseFloat(change.old_price)) +
                            " TL"
                          : "-"}
                      </TableCell>
                      <TableCell
                        className="text-right font-mono text-sm"
                        data-testid={`price-change-new-${index}`}
                      >
                        {formatCurrency(parseFloat(change.new_price))} TL
                      </TableCell>
                      <TableCell
                        className="text-right"
                        data-testid={`price-change-percent-${index}`}
                      >
                        {change.change_percent ? (
                          <Badge
                            variant={isIncrease ? "destructive" : "outline"}
                            className={
                              isDecrease
                                ? "bg-green-500/10 text-green-700 dark:text-green-400"
                                : ""
                            }
                          >
                            {isIncrease ? "+" : ""}
                            {changePercent.toFixed(1)}%
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell
                        className="text-right text-muted-foreground text-sm"
                        data-testid={`price-change-date-${index}`}
                      >
                        {new Date(change.date).toLocaleDateString("tr-TR")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Fiyat degisimi verisi bulunamadi
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TedarikciPerformansTab() {
  const { data, isLoading } = useQuery<SupplierPerformanceData>({
    queryKey: ["/api/satinalma/supplier-performance"],
  });

  if (isLoading) return <LoadingSkeleton />;

  const summary = data?.summary || { totalSuppliers: 0, totalOrders: 0, totalValue: 0, avgQuality: 0, totalIssues: 0 };
  const suppliersList = data?.suppliers || [];

  const qualityChartData = suppliersList
    .filter(s => s.orderCount > 0)
    .slice(0, 10)
    .map(s => ({
      name: s.name.length > 20 ? s.name.substring(0, 20) + "..." : s.name,
      kalite: s.qualityScore,
      teslimat: s.deliveryRate,
    }));

  const valueChartData = suppliersList
    .filter(s => s.totalValue > 0)
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 8)
    .map(s => ({
      name: s.name.length > 15 ? s.name.substring(0, 15) + "..." : s.name,
      value: s.totalValue,
    }));

  return (
    <div className="space-y-4" data-testid="supplier-performance-container">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard title="Aktif Tedarikci" value={summary.totalSuppliers.toString()} icon={Users} color="text-blue-500" bgColor="bg-blue-500/10" testId="sp-card-suppliers" />
        <SummaryCard title="Toplam Siparis (90 Gun)" value={summary.totalOrders.toString()} icon={ShoppingCart} color="text-green-500" bgColor="bg-green-500/10" testId="sp-card-orders" />
        <SummaryCard title="Toplam Tutar" value={formatCurrency(summary.totalValue) + " TL"} icon={DollarSign} color="text-purple-500" bgColor="bg-purple-500/10" testId="sp-card-value" />
        <SummaryCard title="Ort. Kalite Puani" value={summary.avgQuality.toFixed(1)} icon={Star} color="text-yellow-500" bgColor="bg-yellow-500/10" testId="sp-card-quality" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card data-testid="chart-supplier-quality">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs">Kalite ve Teslimat Puanlari</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {qualityChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={qualityChartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend />
                  <Bar dataKey="kalite" name="Kalite Puani" fill="hsl(210, 70%, 50%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="teslimat" name="Teslimat Orani" fill="hsl(150, 60%, 45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                Tedarikci verisi bulunamadi
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="chart-supplier-value">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs">Tedarikci Bazli Harcama Dagilimi</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {valueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={valueChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {valueChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatCurrency(value) + " TL", "Tutar"]} contentStyle={TOOLTIP_STYLE} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                Harcama verisi bulunamadi
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="table-supplier-performance">
        <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3 gap-2">
          <CardTitle className="text-xs">Tedarikci Performans Detayi</CardTitle>
          <Badge variant="secondary" className="text-[10px]">Son 90 Gun</Badge>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          {suppliersList.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tedarikci</TableHead>
                    <TableHead className="text-right">Kalite</TableHead>
                    <TableHead className="text-right">Teslimat</TableHead>
                    <TableHead className="text-right">Siparis</TableHead>
                    <TableHead className="text-right">Toplam Tutar</TableHead>
                    <TableHead className="text-right">Ort. Teslim (Gun)</TableHead>
                    <TableHead className="text-right">Urun Sayisi</TableHead>
                    <TableHead className="text-right">Sorunlar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliersList.map((s) => (
                    <TableRow key={s.id} data-testid={`sp-row-${s.id}`}>
                      <TableCell className="font-medium" data-testid={`sp-name-${s.id}`}>
                        <div>{s.name}</div>
                        <div className="text-xs text-muted-foreground">{s.code}</div>
                      </TableCell>
                      <TableCell className="text-right" data-testid={`sp-quality-${s.id}`}>
                        <Badge variant={s.qualityScore >= 80 ? "outline" : s.qualityScore >= 50 ? "secondary" : "destructive"} className={s.qualityScore >= 80 ? "bg-green-500/10 text-green-700 dark:text-green-400" : ""}>
                          {s.qualityScore}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" data-testid={`sp-delivery-${s.id}`}>
                        <Badge variant={s.deliveryRate >= 80 ? "outline" : s.deliveryRate >= 50 ? "secondary" : "destructive"} className={s.deliveryRate >= 80 ? "bg-green-500/10 text-green-700 dark:text-green-400" : ""}>
                          %{s.deliveryRate}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm" data-testid={`sp-orders-${s.id}`}>{s.orderCount}</TableCell>
                      <TableCell className="text-right font-mono text-sm" data-testid={`sp-value-${s.id}`}>{formatCurrency(s.totalValue)} TL</TableCell>
                      <TableCell className="text-right font-mono text-sm">{s.avgDeliveryDays > 0 ? s.avgDeliveryDays.toFixed(1) : "-"}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{s.activeProductCount}</TableCell>
                      <TableCell className="text-right" data-testid={`sp-issues-${s.id}`}>
                        {s.recentIssuesCount > 0 ? (
                          <Badge variant="destructive">{s.recentIssuesCount}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">0</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Tedarikci verisi bulunamadi
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StokHareketleriTab({ branchId }: { branchId: string }) {
  const queryParams = branchId && branchId !== "all" ? `?branchId=${branchId}` : "";
  const { data, isLoading } = useQuery<StockMovementReportData>({
    queryKey: ["/api/satinalma/stock-movement-report", branchId],
    queryFn: () => fetch(`/api/satinalma/stock-movement-report${queryParams}`, { credentials: "include" }).then(r => r.json()),
  });

  if (isLoading) return <LoadingSkeleton />;

  const summary = data?.summary || { totalMovements: 0, totalIn: 0, totalOut: 0 };
  const topItems = data?.topMovingItems || [];

  const monthlyMap = new Map<string, Record<string, number>>();
  (data?.monthlyMovements || []).forEach((m) => {
    const label = formatMonthLabel(m.month);
    if (!monthlyMap.has(label)) monthlyMap.set(label, {});
    const entry = monthlyMap.get(label)!;
    const mType = m.movement_type;
    entry[mType] = (entry[mType] || 0) + parseFloat(m.total_quantity);
  });

  const monthlyChartData = Array.from(monthlyMap.entries()).map(([month, types]) => {
    const inTypes = ["giris", "uretim_giris", "iade", "mal_kabul"];
    const outTypes = ["cikis", "uretim_cikis", "fire"];
    let totalIn = 0;
    let totalOut = 0;
    for (const [k, v] of Object.entries(types)) {
      if (inTypes.includes(k)) totalIn += v;
      if (outTypes.includes(k)) totalOut += v;
    }
    return { month, giris: totalIn, cikis: totalOut };
  });

  const categoryMap = new Map<string, { giris: number; cikis: number }>();
  (data?.categoryBreakdown || []).forEach((c) => {
    const cat = CATEGORY_LABELS[c.category] || c.category;
    if (!categoryMap.has(cat)) categoryMap.set(cat, { giris: 0, cikis: 0 });
    const entry = categoryMap.get(cat)!;
    const inTypes = ["giris", "uretim_giris", "iade", "mal_kabul"];
    const qty = parseFloat(c.total_quantity);
    if (inTypes.includes(c.movement_type)) {
      entry.giris += qty;
    } else {
      entry.cikis += qty;
    }
  });

  const categoryChartData = Array.from(categoryMap.entries())
    .map(([name, vals]) => ({ name: name.length > 12 ? name.substring(0, 12) + "..." : name, ...vals }))
    .sort((a, b) => (b.giris + b.cikis) - (a.giris + a.cikis))
    .slice(0, 8);

  return (
    <div className="space-y-4" data-testid="stock-movement-container">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard title="Toplam Hareket" value={summary.totalMovements.toLocaleString("tr-TR")} icon={ArrowUpDown} color="text-blue-500" bgColor="bg-blue-500/10" testId="sm-card-total" />
        <SummaryCard title="Toplam Giris Miktari" value={formatCurrency(summary.totalIn)} icon={ArrowDownRight} color="text-green-500" bgColor="bg-green-500/10" testId="sm-card-in" />
        <SummaryCard title="Toplam Cikis Miktari" value={formatCurrency(summary.totalOut)} icon={ArrowUpRight} color="text-red-500" bgColor="bg-red-500/10" testId="sm-card-out" />
        <SummaryCard title="Net Fark" value={formatCurrency(summary.totalIn - summary.totalOut)} icon={Package} color="text-purple-500" bgColor="bg-purple-500/10" testId="sm-card-net" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card data-testid="chart-monthly-movements">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs">Aylik Giris / Cikis Karsilastirmasi</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {monthlyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyChartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number, name: string) => [formatCurrency(value), name === "giris" ? "Giris" : "Cikis"]} />
                  <Legend formatter={(value: string) => value === "giris" ? "Giris" : "Cikis"} />
                  <Bar dataKey="giris" name="giris" fill="hsl(150, 60%, 45%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cikis" name="cikis" fill="hsl(0, 70%, 55%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                Hareket verisi bulunamadi
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="chart-category-movements">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs">Kategori Bazli Stok Hareketleri</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryChartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number, name: string) => [formatCurrency(value), name === "giris" ? "Giris" : "Cikis"]} />
                  <Legend formatter={(value: string) => value === "giris" ? "Giris" : "Cikis"} />
                  <Bar dataKey="giris" name="giris" fill="hsl(150, 60%, 45%)" radius={[0, 4, 4, 0]} stackId="stack" />
                  <Bar dataKey="cikis" name="cikis" fill="hsl(0, 70%, 55%)" radius={[0, 4, 4, 0]} stackId="stack" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                Kategori verisi bulunamadi
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="table-top-moving">
        <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3 gap-2">
          <CardTitle className="text-xs">En Cok Hareket Goren Urunler</CardTitle>
          <Badge variant="secondary" className="text-[10px]">Son 6 Ay</Badge>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          {topItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Urun</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Hareket Sayisi</TableHead>
                  <TableHead className="text-right">Toplam Miktar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topItems.map((item, index) => (
                  <TableRow key={index} data-testid={`sm-row-${index}`}>
                    <TableCell className="font-medium" data-testid={`sm-product-${index}`}>{item.product_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {CATEGORY_LABELS[item.category] || item.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm" data-testid={`sm-count-${index}`}>{item.movement_count}</TableCell>
                    <TableCell className="text-right font-mono text-sm" data-testid={`sm-qty-${index}`}>{formatCurrency(parseFloat(item.total_quantity))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Stok hareket verisi bulunamadi
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MaliyetAnaliziTab({ branchId }: { branchId: string }) {
  const queryParams = branchId && branchId !== "all" ? `?branchId=${branchId}` : "";
  const { data, isLoading } = useQuery<CostAnalysisData>({
    queryKey: ["/api/satinalma/cost-analysis", branchId],
    queryFn: () => fetch(`/api/satinalma/cost-analysis${queryParams}`, { credentials: "include" }).then(r => r.json()),
  });

  if (isLoading) return <LoadingSkeleton />;

  const summary = data?.summary || { totalSpending: 0, totalOrders: 0, avgMonthlySpending: 0, changePercent: 0 };
  const topItems = data?.topCostItems || [];

  const monthlyData = (data?.monthlySpending || []).map((m) => ({
    month: formatMonthLabel(m.month),
    spending: parseFloat(m.total_spending),
    orders: m.order_count,
  }));

  const categoryData = (data?.categorySpending || [])
    .filter(c => parseFloat(c.total_cost) > 0)
    .map(c => ({
      name: CATEGORY_LABELS[c.category] || c.category,
      value: parseFloat(c.total_cost),
      count: c.product_count,
    }));

  const topItemsChart = topItems
    .slice(0, 10)
    .map(i => ({
      name: i.product_name.length > 20 ? i.product_name.substring(0, 20) + "..." : i.product_name,
      cost: parseFloat(i.total_cost),
    }));

  return (
    <div className="space-y-4" data-testid="cost-analysis-container">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard title="Toplam Harcama (12 Ay)" value={formatCurrency(summary.totalSpending) + " TL"} icon={DollarSign} color="text-green-500" bgColor="bg-green-500/10" testId="ca-card-total" />
        <SummaryCard title="Toplam Siparis" value={summary.totalOrders.toString()} icon={ShoppingCart} color="text-blue-500" bgColor="bg-blue-500/10" testId="ca-card-orders" />
        <SummaryCard title="Ort. Aylik Harcama" value={formatCurrency(summary.avgMonthlySpending) + " TL"} icon={BarChart3} color="text-purple-500" bgColor="bg-purple-500/10" testId="ca-card-monthly" />
        <SummaryCard
          title="6 Aylik Degisim"
          value={(summary.changePercent >= 0 ? "+" : "") + summary.changePercent.toFixed(1) + "%"}
          icon={summary.changePercent >= 0 ? TrendingUp : ArrowDownRight}
          color={summary.changePercent > 0 ? "text-red-500" : "text-green-500"}
          bgColor={summary.changePercent > 0 ? "bg-red-500/10" : "bg-green-500/10"}
          testId="ca-card-change"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card data-testid="chart-cost-trend">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs">Aylik Maliyet Trendi</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v / 1000).toLocaleString("tr-TR") + "K"} />
                  <Tooltip formatter={(value: number, name: string) => [name === "spending" ? formatCurrency(value) + " TL" : value, name === "spending" ? "Harcama" : "Sipariş"]} contentStyle={TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="spending" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                Maliyet verisi bulunamadi
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="chart-cost-category">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs">Kategori Bazli Maliyet Dagilimi</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatCurrency(value) + " TL", "Tutar"]} contentStyle={TOOLTIP_STYLE} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                Kategori verisi bulunamadi
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2" data-testid="chart-top-cost-items">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs">En Yuksek Maliyetli Urunler</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {topItemsChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topItemsChart} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => (v / 1000).toLocaleString("tr-TR") + "K"} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value) + " TL", "Toplam Maliyet"]} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                Maliyet verisi bulunamadi
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="table-cost-items">
        <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3 gap-2">
          <CardTitle className="text-xs">Maliyet Detay Tablosu</CardTitle>
          <Badge variant="secondary" className="text-[10px]">Son 12 Ay</Badge>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          {topItems.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Urun</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Toplam Maliyet</TableHead>
                    <TableHead className="text-right">Toplam Miktar</TableHead>
                    <TableHead className="text-right">Ort. Birim Fiyat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topItems.map((item, index) => (
                    <TableRow key={index} data-testid={`ca-row-${index}`}>
                      <TableCell className="font-medium" data-testid={`ca-product-${index}`}>{item.product_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">
                          {CATEGORY_LABELS[item.category] || item.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm" data-testid={`ca-cost-${index}`}>{formatCurrency(parseFloat(item.total_cost))} TL</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(parseFloat(item.total_quantity))}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(parseFloat(item.avg_unit_price))} TL</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Maliyet verisi bulunamadi
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function TrendAnalizi() {
  const [activeTab, setActiveTab] = useState("genel");
  const [branchFilter, setBranchFilter] = useState("all");
  const { user } = useAuth();

  const canFilterBranch = ["admin", "ceo", "cgo", "satinalma", "muhasebe"].includes(user?.role || "");

  const { data: branches } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/branches"],
    enabled: canFilterBranch,
  });

  const branchParam = branchFilter !== "all" ? branchFilter : "";
  const trendQueryParams = branchParam ? `?branchId=${branchParam}` : "";

  const { data: trendData, isLoading: trendLoading } = useQuery<TrendData>({
    queryKey: ["/api/satinalma/trends", branchFilter],
    queryFn: () => fetch(`/api/satinalma/trends${trendQueryParams}`, { credentials: "include" }).then(r => r.json()),
  });

  if (trendLoading && activeTab === "genel") {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-4" data-testid="trend-analizi-container">
      {canFilterBranch && branches && branches.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[200px]" data-testid="select-trend-branch">
              <SelectValue placeholder="Sube" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tum Subeler</SelectItem>
              {branches.map((b: { id: number; name: string }) => (
                <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-trend-analizi" className="flex-wrap gap-1">
          <TabsTrigger value="genel" data-testid="tab-genel" className="gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            Genel Trend
          </TabsTrigger>
          <TabsTrigger value="tedarikci" data-testid="tab-tedarikci" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Tedarikci Performans
          </TabsTrigger>
          <TabsTrigger value="stok" data-testid="tab-stok" className="gap-1.5">
            <Package className="h-3.5 w-3.5" />
            Stok Hareketleri
          </TabsTrigger>
          <TabsTrigger value="maliyet" data-testid="tab-maliyet" className="gap-1.5">
            <PieChartIcon className="h-3.5 w-3.5" />
            Maliyet Analizi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="genel" className="mt-4">
          <GenelTrendTab data={trendData} />
        </TabsContent>

        <TabsContent value="tedarikci" className="mt-4">
          <TedarikciPerformansTab />
        </TabsContent>

        <TabsContent value="stok" className="mt-4">
          <StokHareketleriTab branchId={branchFilter} />
        </TabsContent>

        <TabsContent value="maliyet" className="mt-4">
          <MaliyetAnaliziTab branchId={branchFilter} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
