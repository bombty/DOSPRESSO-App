// ═══════════════════════════════════════════════════════════════════
// Sprint 52 (Aslan 13 May 2026) — Fabrika Ürünleri (Samet View-Only)
// ═══════════════════════════════════════════════════════════════════
// Samet fabrika'da üretilen mamül ürünleri görür (düzenleyemez).
// 8 kategori filtre:
//   donut, kek_pasta, surup, tatli, tuzlu, kahve, toz_karisim, diger
// ═══════════════════════════════════════════════════════════════════

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Factory,
  Search,
  Eye,
  Lock,
  Coffee,
  Cake,
  Cookie,
  Box,
  Info,
} from "lucide-react";
import {
  FACTORY_PRODUCT_CATEGORIES,
  FACTORY_PRODUCT_CATEGORY_LABELS,
  type FactoryProductCategory,
} from "@shared/schema/schema-31-fabrika-refactor";

interface FactoryProduct {
  id: number;
  name: string;
  sku: string;
  category: string;
  subCategory: string | null;
  unit: string;
  currentStock: number | null;
  minStock: number | null;
  maxStockLevel: number | null;
  basePrice: string;
  suggestedPrice: string;
  currentSellingPrice: string;
  profitMargin: string;
  isActive: boolean;
  isTemporarilyStopped: boolean;
  isNewProduct: boolean;
  allergens: string[] | null;
  productType: string;
  requiresFoodEngineerApproval: boolean;
}

// Kategori → İkon
const CATEGORY_ICONS: Record<string, any> = {
  donut: Cookie,
  kek_pasta: Cake,
  surup: Box,
  tatli: Cake,
  tuzlu: Cookie,
  kahve: Coffee,
  toz_karisim: Box,
  diger: Box,
};

export default function FactoryProductsSamet() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: products = [], isLoading } = useQuery<FactoryProduct[]>({
    queryKey: ["/api/factory-products"],
    staleTime: 60000,
  });

  // Filtreleme
  const filtered = products.filter(p => {
    if (!p.isActive) return false;
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
    if (search.trim()) {
      const term = search.toLowerCase();
      return (
        p.name?.toLowerCase().includes(term) ||
        p.sku?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  // Kategori başına sayım
  const categoryCounts = FACTORY_PRODUCT_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = products.filter(p => p.category === cat && p.isActive).length;
    return acc;
  }, {} as Record<string, number>);

  const totalActive = products.filter(p => p.isActive).length;

  const formatPrice = (val: string | null) => {
    if (!val) return "—";
    const n = parseFloat(val);
    if (isNaN(n) || n === 0) return "—";
    return `${n.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺`;
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Factory className="w-6 h-6 text-purple-600" />
            Fabrika Ürünleri
          </h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
            <Eye className="w-3 h-3" />
            Görüntüleme modu — toplam <strong>{totalActive}</strong> aktif mamül
          </p>
        </div>
      </div>

      {/* View-only uyarı */}
      <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200">
        <CardContent className="p-3 flex items-start gap-2 text-sm">
          <Lock className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Salt okunur</p>
            <p className="text-xs text-muted-foreground">
              Fabrika ürünleri Fabrika Müdürü (Eren) ve Reçete GM (İlker) tarafından yönetilir.
              Sen görüntüleyebilir, satış fiyatlarını ve stok seviyelerini takip edebilirsin.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Kategori kartları */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        <button
          onClick={() => setCategoryFilter("all")}
          className={`rounded-lg border p-2 text-center transition-all ${
            categoryFilter === "all"
              ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30"
              : "border-border hover:border-purple-300"
          }`}
        >
          <div className="text-lg font-bold">{totalActive}</div>
          <div className="text-xs">Tümü</div>
        </button>
        {FACTORY_PRODUCT_CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat] || Box;
          const count = categoryCounts[cat] || 0;
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`rounded-lg border p-2 text-center transition-all ${
                categoryFilter === cat
                  ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30"
                  : "border-border hover:border-purple-300"
              }`}
              data-testid={`category-${cat}`}
            >
              <Icon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <div className="text-lg font-bold">{count}</div>
              <div className="text-[10px] leading-tight">{FACTORY_PRODUCT_CATEGORY_LABELS[cat]}</div>
            </button>
          );
        })}
      </div>

      {/* Arama */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="SKU veya isim ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={() => setSearch("")} disabled={!search}>
          Temizle
        </Button>
      </div>

      {/* Liste */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {filtered.length} ürün listeleniyor
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Yükleniyor...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Factory className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Sonuç bulunamadı</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Ad</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Stok</TableHead>
                    <TableHead className="text-right">Maliyet</TableHead>
                    <TableHead className="text-right">Satış Fiyatı</TableHead>
                    <TableHead className="text-center">Etiket</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id} data-testid={`row-product-${p.id}`}>
                      <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                      <TableCell>
                        <div className="font-medium">{p.name}</div>
                        {p.subCategory && (
                          <div className="text-xs text-muted-foreground">{p.subCategory}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {FACTORY_PRODUCT_CATEGORY_LABELS[p.category as FactoryProductCategory] || p.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {p.currentStock ?? "—"} {p.unit}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground text-xs">
                        {formatPrice(p.basePrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatPrice(p.currentSellingPrice)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-center flex-wrap">
                          {p.isNewProduct && (
                            <Badge variant="default" className="text-[10px]">Yeni</Badge>
                          )}
                          {p.isTemporarilyStopped && (
                            <Badge variant="destructive" className="text-[10px]">Durdu</Badge>
                          )}
                          {p.requiresFoodEngineerApproval && (
                            <Badge variant="secondary" className="text-[10px]">Onay</Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
