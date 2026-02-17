import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
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

const MONTH_LABELS: Record<string, string> = {
  "01": "Oca",
  "02": "Sub",
  "03": "Mar",
  "04": "Nis",
  "05": "May",
  "06": "Haz",
  "07": "Tem",
  "08": "Agu",
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
  giris: "Giris",
  cikis: "Cikis",
  fire: "Fire",
  mal_kabul: "Mal Kabul",
  iade: "Iade",
  uretim_giris: "Uretim Giris",
  uretim_cikis: "Uretim Cikis",
  sayim_duzeltme: "Sayim Duzeltme",
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

export default function TrendAnalizi() {
  const { data, isLoading } = useQuery<TrendData>({
    queryKey: ["/api/satinalma/trends"],
  });

  if (isLoading) {
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
    <div className="space-y-4" data-testid="trend-analizi-container">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryCards.map((card, index) => (
          <Card key={index} data-testid={`trend-summary-card-${index}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3 gap-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div
                className="text-lg font-bold"
                data-testid={`trend-summary-value-${index}`}
              >
                {card.value}
              </div>
            </CardContent>
          </Card>
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
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      color: "hsl(var(--foreground))",
                    }}
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
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      color: "hsl(var(--foreground))",
                    }}
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
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      color: "hsl(var(--foreground))",
                    }}
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
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      color: "hsl(var(--foreground))",
                    }}
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
