import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  TrendingUp, TrendingDown, DollarSign, Package, AlertTriangle, 
  ChevronLeft, BarChart3, Calculator, Layers, History, Minus,
} from "lucide-react";
import { useLocation } from "wouter";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
} from "recharts";

interface RecipeCost {
  id: number;
  code: string;
  name: string;
  category: string;
  batchOutput: number;
  outputUnit: string;
  unitWeight: string;
  ingredientCost: number;
  overheadCost: number;
  toppingCost: number;
  fillingCost: number;
  totalBatchCost: number;
  unitCost: number;
  sellingPrice: number;
  profit: number;
  margin: number;
  totalIngredients: number;
  missingPrices: number;
  priceComplete: boolean;
}

interface RecipeDetail {
  recipe: any;
  ingredients: any[];
  costs: any;
  pricing: any;
  overhead: any;
  toppingFilling: any;
}

const CATEGORY_LABELS: Record<string, string> = {
  donut: "Donut", cinnamon_roll: "Cinnamon Roll", cookie: "Kurabiye",
  brownie: "Brownie", cheesecake: "Cheesecake", ekmek: "Ekmek & Hamur",
};

function formatTL(val: number): string {
  return `₺${val.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface PriceHistoryEntry {
  id: number;
  productId: number;
  oldBasePrice: string | number | null;
  newBasePrice: string | number | null;
  oldSuggestedPrice: string | number | null;
  newSuggestedPrice: string | number | null;
  changePercent: string | number | null;
  source: string;
  notes: string | null;
  changedById: string | null;
  changedByName: string | null;
  changedAt: string;
}

const SOURCE_LABELS: Record<string, string> = {
  cost_calc: "Maliyet Hesabı",
  recipe_recalc: "Reçete Yeniden Hesap",
  script: "Script",
  manual: "Manuel",
  import: "İçeri Aktarım",
};

function PriceHistoryTab({ productId, recipeCode }: { productId: number | null; recipeCode: string }) {
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const { data, isLoading } = useQuery<{
    product: { id: number; sku: string; name: string; basePrice: string; suggestedPrice: string };
    history: PriceHistoryEntry[];
    availableSources: string[];
  }>({
    queryKey: ["/api/factory-products", productId, "price-history", sourceFilter, from, to],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sourceFilter !== "all") params.set("source", sourceFilter);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const r = await fetch(`/api/factory-products/${productId}/price-history?${params.toString()}`, {
        credentials: "include",
      });
      if (!r.ok) throw new Error("Yüklenemedi");
      return r.json();
    },
    enabled: !!productId,
  });

  if (!productId) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground" data-testid="text-no-product-link">
        <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p>"{recipeCode}" reçetesi henüz bir fabrika ürününe bağlı değil.</p>
        <p className="text-xs mt-1">Fiyat geçmişi görüntüleme için reçeteyi bir ürünle ilişkilendirin.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        <History className="h-6 w-6 mx-auto animate-pulse mb-2" />
        <p>Fiyat geçmişi yükleniyor...</p>
      </div>
    );
  }

  const history = data?.history || [];
  const availableSources = data?.availableSources || [];

  const merged: Record<string, { date: string; base?: number; suggested?: number }> = {};
  for (const h of [...history].reverse()) {
    const date = new Date(h.changedAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "2-digit" });
    if (!merged[date]) merged[date] = { date };
    if (h.newBasePrice !== null && h.newBasePrice !== undefined) merged[date].base = Number(h.newBasePrice);
    if (h.newSuggestedPrice !== null && h.newSuggestedPrice !== undefined) merged[date].suggested = Number(h.newSuggestedPrice);
  }
  const mergedArr = Object.values(merged);

  return (
    <div className="space-y-4">
      {/* Filtreler */}
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Kaynak</label>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-44 h-9" data-testid="select-source-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Kaynaklar</SelectItem>
              {availableSources.map(s => (
                <SelectItem key={s} value={s}>{SOURCE_LABELS[s] || s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Başlangıç</label>
          <Input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="w-36 h-9"
            data-testid="input-date-from"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Bitiş</label>
          <Input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="w-36 h-9"
            data-testid="input-date-to"
          />
        </div>
        {(sourceFilter !== "all" || from || to) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSourceFilter("all"); setFrom(""); setTo(""); }}
            data-testid="button-clear-filters"
          >
            Temizle
          </Button>
        )}
      </div>

      {/* Chart */}
      {mergedArr.length > 0 ? (
        <Card>
          <CardContent className="p-3">
            <div className="h-56" data-testid="chart-price-history">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mergedArr} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip
                    formatter={(v: any) => formatTL(Number(v))}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="base"
                    name="Baz Fiyat"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="suggested"
                    name="Önerilen Fiyat"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-6 text-sm text-muted-foreground border rounded-md" data-testid="text-no-history">
          <History className="h-6 w-6 mx-auto mb-2 opacity-40" />
          Bu filtrelere uyan fiyat değişikliği kaydı bulunamadı.
        </div>
      )}

      {/* Tablo */}
      {history.length > 0 && (
        <div className="border rounded-md max-h-72 overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="text-xs">Tarih</TableHead>
                <TableHead className="text-xs text-right">Baz (Eski → Yeni)</TableHead>
                <TableHead className="text-xs text-right">Önerilen (Eski → Yeni)</TableHead>
                <TableHead className="text-xs text-right">Değişim</TableHead>
                <TableHead className="text-xs">Kaynak</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map(h => {
                const change = h.changePercent !== null && h.changePercent !== undefined ? Number(h.changePercent) : null;
                const fmt = (v: string | number | null) => v !== null && v !== undefined ? formatTL(Number(v)) : "—";
                return (
                  <TableRow key={h.id} data-testid={`row-history-${h.id}`}>
                    <TableCell className="text-xs py-1.5">
                      {new Date(h.changedAt).toLocaleString("tr-TR", {
                        day: "2-digit", month: "2-digit", year: "2-digit",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-xs text-right py-1.5">
                      <span className="text-muted-foreground">{fmt(h.oldBasePrice)}</span>
                      <span className="mx-1 text-muted-foreground">→</span>
                      <span className="font-medium">{fmt(h.newBasePrice)}</span>
                    </TableCell>
                    <TableCell className="text-xs text-right py-1.5">
                      <span className="text-muted-foreground">{fmt(h.oldSuggestedPrice)}</span>
                      <span className="mx-1 text-muted-foreground">→</span>
                      <span className="font-medium">{fmt(h.newSuggestedPrice)}</span>
                    </TableCell>
                    <TableCell className="text-xs text-right py-1.5">
                      {change === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : change > 0 ? (
                        <span className="text-red-500 inline-flex items-center gap-0.5">
                          <TrendingUp className="h-3 w-3" />%{change.toFixed(2)}
                        </span>
                      ) : change < 0 ? (
                        <span className="text-emerald-500 inline-flex items-center gap-0.5">
                          <TrendingDown className="h-3 w-3" />%{Math.abs(change).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground inline-flex items-center gap-0.5">
                          <Minus className="h-3 w-3" />0
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs py-1.5">
                      <Badge variant="secondary" className="text-[10px]">
                        {SOURCE_LABELS[h.source] || h.source}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function MarginBadge({ margin }: { margin: number }) {
  if (margin >= 70) return <Badge className="bg-emerald-600 text-white">%{margin.toFixed(0)}</Badge>;
  if (margin >= 50) return <Badge className="bg-blue-600 text-white">%{margin.toFixed(0)}</Badge>;
  if (margin >= 30) return <Badge className="bg-amber-600 text-white">%{margin.toFixed(0)}</Badge>;
  return <Badge className="bg-red-600 text-white">%{margin.toFixed(0)}</Badge>;
}

export default function MaliyetAnalizi() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [detailRecipeId, setDetailRecipeId] = useState<number | null>(null);
  const [batchMultiplier, setBatchMultiplier] = useState(1);

  const { data, isLoading } = useQuery<{ recipes: RecipeCost[]; summary: any }>({
    queryKey: ["/api/cost-analysis/recipes"],
    queryFn: async () => {
      const r = await fetch("/api/cost-analysis/recipes", { credentials: "include" });
      if (!r.ok) throw new Error("Yüklenemedi");
      return r.json();
    },
  });

  const { data: detail } = useQuery<RecipeDetail>({
    queryKey: ["/api/cost-analysis/recipe", detailRecipeId],
    queryFn: async () => {
      const r = await fetch(`/api/cost-analysis/recipe/${detailRecipeId}`, { credentials: "include" });
      if (!r.ok) throw new Error("Yüklenemedi");
      return r.json();
    },
    enabled: !!detailRecipeId,
  });

  const recipes = data?.recipes || [];
  const summary = data?.summary;

  const filtered = recipes.filter(r => {
    if (selectedCategory !== "all" && r.category !== selectedCategory) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.code.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const categories = [...new Set(recipes.map(r => r.category))].filter(Boolean);

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <Calculator className="h-8 w-8 mx-auto text-muted-foreground animate-pulse mb-2" />
        <p className="text-sm text-muted-foreground">Maliyet analizi hesaplanıyor...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Maliyet Analizi</h1>
          <p className="text-sm text-muted-foreground">Reçete bazlı maliyet, satış fiyatı ve kâr marjı</p>
        </div>
      </div>

      {/* KPI Kartları */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Toplam Reçete</span>
              </div>
              <p className="text-2xl font-bold">{summary.totalRecipes}</p>
              <p className="text-xs text-muted-foreground">{summary.withSellingPrice} fiyatlı</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-4 w-4 text-emerald-500" />
                <span className="text-xs text-muted-foreground">Ort. Kâr Marjı</span>
              </div>
              <p className="text-2xl font-bold text-emerald-500">%{summary.avgMargin?.toFixed(0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calculator className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">Fiyat Tamamlanan</span>
              </div>
              <p className="text-2xl font-bold">{summary.allPricesComplete}</p>
              <p className="text-xs text-muted-foreground">/ {summary.totalRecipes} reçete</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-xs text-muted-foreground">Düşük Marj</span>
              </div>
              <p className="text-2xl font-bold text-red-500">{summary.lowMarginProducts?.length || 0}</p>
              <p className="text-xs text-muted-foreground">ürün (%50 altı)</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtreler */}
      <div className="flex flex-wrap gap-2">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Kategoriler</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat] || cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Ürün ara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-48"
        />
      </div>

      {/* Ürün Maliyet Tablosu */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ürün</TableHead>
                <TableHead className="text-right">Batch</TableHead>
                <TableHead className="text-right">Birim Maliyet</TableHead>
                <TableHead className="text-right">Satış Fiyatı</TableHead>
                <TableHead className="text-right">Kâr</TableHead>
                <TableHead className="text-center">Marj</TableHead>
                <TableHead className="text-center">Veri</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setDetailRecipeId(r.id)}
                >
                  <TableCell>
                    <div>
                      <span className="font-mono text-xs text-muted-foreground mr-2">{r.code}</span>
                      <span className="font-medium">{r.name}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] mt-0.5">{CATEGORY_LABELS[r.category] || r.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {r.batchOutput} {r.outputUnit}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatTL(r.unitCost)}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.sellingPrice > 0 ? (
                      <span className="font-medium text-emerald-500">{formatTL(r.sellingPrice)}</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.sellingPrice > 0 ? (
                      <span className={r.profit > 0 ? "text-emerald-500" : "text-red-500"}>
                        {r.profit > 0 ? "+" : ""}{formatTL(r.profit)}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {r.sellingPrice > 0 ? <MarginBadge margin={r.margin} /> : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {r.priceComplete ? (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 text-[10px]">Tam</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-amber-500">{r.missingPrices} eksik</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detay Dialog */}
      <Dialog open={!!detailRecipeId} onOpenChange={open => !open && setDetailRecipeId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">{detail.recipe.code}</span>
                  {detail.recipe.name}
                </DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="cost" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="cost" data-testid="tab-cost">
                    <Calculator className="h-4 w-4 mr-1" /> Maliyet Detayı
                  </TabsTrigger>
                  <TabsTrigger value="history" data-testid="tab-price-history">
                    <History className="h-4 w-4 mr-1" /> Fiyat Geçmişi
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="cost" className="space-y-4 mt-4">

              {/* Maliyet Özeti */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="border-blue-500/30">
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Birim Maliyet</p>
                    <p className="text-lg font-bold">{formatTL(detail.costs.unitCost)}</p>
                  </CardContent>
                </Card>
                <Card className="border-emerald-500/30">
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Satış Fiyatı</p>
                    <p className="text-lg font-bold text-emerald-500">{formatTL(detail.pricing.sellingPrice)}</p>
                  </CardContent>
                </Card>
                <Card className="border-amber-500/30">
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Kâr Marjı</p>
                    <p className="text-lg font-bold">
                      {detail.pricing.margin > 0 ? (
                        <span className="text-emerald-500">%{detail.pricing.margin}</span>
                      ) : "—"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Batch hesaplayıcı */}
              <div className="flex items-center gap-3 bg-muted/30 rounded-lg p-3">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Batch sayısı:</span>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={batchMultiplier}
                  onChange={e => setBatchMultiplier(Math.max(1, Number(e.target.value)))}
                  className="w-20 h-8"
                />
                <span className="text-sm text-muted-foreground">
                  = {detail.recipe.batchOutput * batchMultiplier} {detail.recipe.outputUnit} ×{" "}
                  {formatTL(detail.costs.unitCost)} = <span className="font-bold">{formatTL(detail.costs.totalBatchCost * batchMultiplier)}</span>
                </span>
              </div>

              {/* Maliyet dağılımı */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Maliyet Dağılımı (1 batch = {detail.recipe.batchOutput} {detail.recipe.outputUnit})</h4>
                <div className="space-y-1.5">
                  {[
                    { label: "Hammadde", value: detail.costs.ingredientCost, icon: "🧪" },
                    { label: "Elektrik", value: detail.costs.electricityCost, icon: "⚡" },
                    { label: "Personel", value: detail.costs.personnelCost, icon: "👷" },
                    { label: "Topping", value: detail.costs.toppingCost, icon: "🍫" },
                    { label: "Dolgu", value: detail.costs.fillingCost, icon: "🍯" },
                  ].map(item => {
                    const pct = detail.costs.totalBatchCost > 0 ? (item.value / detail.costs.totalBatchCost * 100) : 0;
                    return (
                      <div key={item.label} className="flex items-center gap-2">
                        <span className="text-sm w-24">{item.icon} {item.label}</span>
                        <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500/60 rounded-full flex items-center justify-end pr-2"
                            style={{ width: `${Math.max(pct, 5)}%` }}
                          >
                            <span className="text-[10px] text-white font-medium">%{pct.toFixed(0)}</span>
                          </div>
                        </div>
                        <span className="text-sm font-medium w-20 text-right">{formatTL(item.value)}</span>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-2 pt-1 border-t">
                    <span className="text-sm font-bold w-24">TOPLAM</span>
                    <div className="flex-1" />
                    <span className="text-sm font-bold w-20 text-right">{formatTL(detail.costs.totalBatchCost)}</span>
                  </div>
                </div>
              </div>

              {/* Hammadde listesi */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Hammadde Detayı</h4>
                <div className="max-h-60 overflow-y-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Malzeme</TableHead>
                        <TableHead className="text-xs text-right">Miktar</TableHead>
                        <TableHead className="text-xs text-right">₺/KG</TableHead>
                        <TableHead className="text-xs text-right">Maliyet</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.ingredients.filter((i: any) => i.type !== "keyblend").map((ing: any, idx: number) => (
                        <TableRow key={idx} className={ing.hasMissingPrice ? "bg-amber-500/10" : ""}>
                          <TableCell className="text-xs py-1">
                            {ing.inventoryCode && (
                              <span className="font-mono text-muted-foreground mr-1">{ing.inventoryCode}</span>
                            )}
                            {ing.name}
                          </TableCell>
                          <TableCell className="text-xs text-right py-1">
                            {Number(ing.amount).toLocaleString("tr-TR")} {ing.unit}
                          </TableCell>
                          <TableCell className="text-xs text-right py-1">
                            {ing.pricePerKg > 0 ? formatTL(ing.pricePerKg) : <span className="text-amber-500">—</span>}
                          </TableCell>
                          <TableCell className="text-xs text-right py-1 font-medium">
                            {ing.cost > 0 ? formatTL(ing.cost) : <span className="text-amber-500">eksik</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                  <PriceHistoryTab
                    productId={(detail.recipe as any).productId ?? null}
                    recipeCode={detail.recipe.code}
                  />
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
