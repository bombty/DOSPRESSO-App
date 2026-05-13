// ═══════════════════════════════════════════════════════════════════
// Sprint 52 (Aslan 13 May 2026) — Hammadde Yönetimi (Samet)
// ═══════════════════════════════════════════════════════════════════
// 4 ana kategori sekme:
//   1. Hammadde (un, şeker, yağ - üretim için)
//   2. Al-Sat (toptan alıp doğrudan satılan)
//   3. Üretim Malzeme (ambalaj, etiket)
//   4. Fabrika Kullanım (temizlik, ofis)
// ═══════════════════════════════════════════════════════════════════

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  ShoppingCart,
  Box,
  Sparkles,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Edit,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  RAW_MATERIAL_CATEGORIES,
  RAW_MATERIAL_CATEGORY_LABELS,
  type RawMaterialCategory,
} from "@shared/schema/schema-31-fabrika-refactor";

interface RawMaterial {
  id: number;
  code: string;
  name: string;
  category: string | null;
  mainCategory: string | null;
  unit: string;
  currentStock: string;
  minStock: string;
  maxStock: string | null;
  reorderPoint: string | null;
  currentUnitPrice: string;
  lastPurchasePrice: string;
  warehouseLocation: string | null;
  kdvRate: number | null;
  sellingPrice: string | null;
  supplierId: number | null;
  isActive: boolean;
  energyKcal: string | null;
  allergenPresent: boolean | null;
  brand: string | null;
}

// Kategori bilgileri (ikon, renk, açıklama)
const CATEGORY_INFO: Record<RawMaterialCategory, {
  icon: any;
  color: string;
  bgColor: string;
  description: string;
}> = {
  hammadde: {
    icon: Package,
    color: "text-orange-700 dark:text-orange-300",
    bgColor: "bg-orange-100 dark:bg-orange-950",
    description: "Üretim için kullanılan ham malzemeler (un, şeker, yağ, aroma)",
  },
  al_sat: {
    icon: ShoppingCart,
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-100 dark:bg-blue-950",
    description: "Toptan alıp doğrudan satılan ürünler (üretim olmayan)",
  },
  uretim_malzeme: {
    icon: Box,
    color: "text-purple-700 dark:text-purple-300",
    bgColor: "bg-purple-100 dark:bg-purple-950",
    description: "Üretim malzemeleri (ambalaj, kutu, etiket, ipler)",
  },
  fabrika_kullanim: {
    icon: Sparkles,
    color: "text-green-700 dark:text-green-300",
    bgColor: "bg-green-100 dark:bg-green-950",
    description: "Fabrika operasyonel ihtiyaçlar (temizlik, ofis, sarf)",
  },
};

export default function HammaddelerYonetimi() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<RawMaterialCategory>("hammadde");
  const [search, setSearch] = useState("");

  // Tüm kategorilerin sayımı (dashboard üst karta için)
  const { data: allData } = useQuery<{ items: RawMaterial[] }>({
    queryKey: ["/api/raw-materials", "all"],
    queryFn: async () => {
      const res = await fetch("/api/raw-materials?limit=500");
      return res.json();
    },
  });

  const allItems = allData?.items || [];

  // Kategori başına sayım
  const categoryCounts = RAW_MATERIAL_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = allItems.filter(i => i.mainCategory === cat).length;
    return acc;
  }, {} as Record<RawMaterialCategory, number>);

  // Kritik stok sayısı (hammadde kategorisi için)
  const criticalStockCount = allItems.filter(i => {
    const cur = parseFloat(i.currentStock || "0");
    const min = parseFloat(i.minStock || "0");
    return min > 0 && cur < min;
  }).length;

  // Aktif tab'a göre filtrelenmiş liste
  const filteredItems = allItems.filter(i => {
    if (i.mainCategory !== activeTab) return false;
    if (search.trim()) {
      const term = search.toLowerCase();
      return (
        i.name?.toLowerCase().includes(term) ||
        i.code?.toLowerCase().includes(term) ||
        i.brand?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const formatNumber = (val: string | number | null) => {
    if (val === null || val === undefined) return "—";
    const n = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(n)) return "—";
    return n.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
  };

  const formatPrice = (val: string | null) => {
    if (!val) return "—";
    const n = parseFloat(val);
    if (isNaN(n) || n === 0) return "—";
    return `${n.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺`;
  };

  // Stok seviyesi rengi
  const stockBadgeColor = (current: string, min: string) => {
    const cur = parseFloat(current || "0");
    const minV = parseFloat(min || "0");
    if (minV === 0) return "outline";
    if (cur === 0) return "destructive";
    if (cur < minV) return "destructive";
    if (cur < minV * 1.5) return "default";
    return "secondary";
  };

  const stockStatus = (current: string, min: string) => {
    const cur = parseFloat(current || "0");
    const minV = parseFloat(min || "0");
    if (minV === 0) return null;
    if (cur === 0) return "Tükendi";
    if (cur < minV) return "Kritik";
    if (cur < minV * 1.5) return "Az";
    return "OK";
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6 text-orange-600" />
            Hammadde Yönetimi
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            4 kategoride toplam <strong>{allItems.length}</strong> kalem
            {criticalStockCount > 0 && (
              <span className="ml-2 text-red-600">
                • <strong>{criticalStockCount}</strong> kritik stok
              </span>
            )}
          </p>
        </div>
        <Button
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          onClick={() => {
            // TODO: Mr. Dobody AI hammadde ekleme dialog
            toast({
              title: "Yakında",
              description: "Mr. Dobody hammadde yardımcısı Sprint 52.1'de gelecek",
            });
          }}
          data-testid="btn-add-with-ai"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Mr. Dobody ile Ekle
        </Button>
      </div>

      {/* Kategori özet kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {RAW_MATERIAL_CATEGORIES.map((cat) => {
          const info = CATEGORY_INFO[cat];
          const Icon = info.icon;
          const count = categoryCounts[cat];
          const isActive = activeTab === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`rounded-lg border p-3 text-left transition-all ${
                isActive
                  ? "border-blue-500 ring-2 ring-blue-500/30 shadow-md"
                  : "border-border hover:border-blue-300"
              }`}
              data-testid={`category-card-${cat}`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className={`w-8 h-8 rounded-full ${info.bgColor} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${info.color}`} />
                </div>
                <span className="text-lg font-bold">{count}</span>
              </div>
              <p className="text-xs font-medium">{RAW_MATERIAL_CATEGORY_LABELS[cat]}</p>
            </button>
          );
        })}
      </div>

      {/* Açıklama */}
      <Card className="bg-muted/30">
        <CardContent className="p-3 text-xs">
          <p className="text-muted-foreground">
            <strong>{RAW_MATERIAL_CATEGORY_LABELS[activeTab]}:</strong> {CATEGORY_INFO[activeTab].description}
          </p>
        </CardContent>
      </Card>

      {/* Arama */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Kod, isim veya marka..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
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
            {filteredItems.length} kalem listeleniyor
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">
                {search
                  ? "Aramanla eşleşen kalem yok"
                  : `Henüz ${RAW_MATERIAL_CATEGORY_LABELS[activeTab].toLowerCase()} eklenmemiş`}
              </p>
              {activeTab === "al_sat" && !search && (
                <p className="text-xs mt-2 italic">
                  💡 Al-sat ürünler için "Mr. Dobody ile Ekle" butonunu kullan
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kod</TableHead>
                    <TableHead>Ad</TableHead>
                    <TableHead>Birim</TableHead>
                    <TableHead className="text-right">Stok</TableHead>
                    <TableHead className="text-right">Min</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">Birim Fiyat</TableHead>
                    {activeTab === "al_sat" && (
                      <TableHead className="text-right">Satış</TableHead>
                    )}
                    <TableHead className="text-center">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const status = stockStatus(item.currentStock, item.minStock);
                    return (
                      <TableRow key={item.id} data-testid={`row-material-${item.id}`}>
                        <TableCell className="font-mono text-xs">{item.code}</TableCell>
                        <TableCell>
                          <div className="font-medium">{item.name}</div>
                          {item.brand && (
                            <div className="text-xs text-muted-foreground">{item.brand}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{item.unit}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatNumber(item.currentStock)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {formatNumber(item.minStock)}
                        </TableCell>
                        <TableCell>
                          {status ? (
                            <Badge variant={stockBadgeColor(item.currentStock, item.minStock) as any}>
                              {status}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatPrice(item.currentUnitPrice)}
                        </TableCell>
                        {activeTab === "al_sat" && (
                          <TableCell className="text-right font-mono">
                            {formatPrice(item.sellingPrice)}
                          </TableCell>
                        )}
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/hammaddeler/${item.id}`)}
                            data-testid={`btn-detail-${item.id}`}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
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
    </div>
  );
}
