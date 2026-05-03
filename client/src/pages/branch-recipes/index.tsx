/**
 * BRANCH RECIPES — Liste Sayfası
 *
 * Mobil-first tasarım, barista'nın günlük kullanacağı ana ekran.
 *
 * Özellikler:
 *   - Kategori bazlı grup (sıcak/buzlu/creamice/...)
 *   - Hızlı arama (ürün adı + malzeme)
 *   - Template badge (şablon olanlar için)
 *   - Görsel gösterim (varsa)
 *   - HQ rolleri için "Yeni Ürün" butonu
 *
 * URL: /branch-recipes
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Coffee, Snowflake, IceCream, GlassWater, Leaf, Cookie,
  Search, Plus, Sparkles, ChefHat, Clock, ChevronRight,
} from "lucide-react";

// Kategori meta bilgileri
const CATEGORY_META: Record<string, {
  label: string;
  icon: any;
  color: string;
  bgColor: string;
}> = {
  hot_coffee: {
    label: "Sıcak Kahveler",
    icon: Coffee,
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
  },
  iced_coffee: {
    label: "Buzlu Kahveler",
    icon: Snowflake,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
  },
  creamice: {
    label: "Creamice (Kırık Buzlu)",
    icon: IceCream,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
  },
  creamshake_caffeine_free: {
    label: "Creamshake (Kahvesiz)",
    icon: IceCream,
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-50 dark:bg-pink-900/20",
  },
  freshess: {
    label: "Freshess",
    icon: Leaf,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-900/20",
  },
  frozen_yogurt: {
    label: "Frozen Yogurt",
    icon: GlassWater,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-50 dark:bg-rose-900/20",
  },
  creamice_fruit_milkshake: {
    label: "Meyveli Milkshake",
    icon: GlassWater,
    color: "text-fuchsia-600 dark:text-fuchsia-400",
    bgColor: "bg-fuchsia-50 dark:bg-fuchsia-900/20",
  },
  hot_tea: {
    label: "Sıcak Çaylar",
    icon: Coffee,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
  },
  cold_tea: {
    label: "Soğuk Çaylar",
    icon: Snowflake,
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-50 dark:bg-cyan-900/20",
  },
  gourmet_shake: {
    label: "Gourmet Shake",
    icon: Cookie,
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
  },
  freddo: {
    label: "Freddo",
    icon: Coffee,
    color: "text-stone-700 dark:text-stone-400",
    bgColor: "bg-stone-50 dark:bg-stone-900/20",
  },
};

// HQ edit yetkisi
const HQ_EDIT_ROLES = ['admin', 'ceo', 'cgo', 'coach', 'trainer'];

interface BranchProduct {
  id: number;
  name: string;
  shortCode: string | null;
  category: string;
  subCategory: string | null;
  description: string | null;
  imageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  massivoPrice: string | null;
  longDivaPrice: string | null;
}

interface SearchResult {
  id: number;
  name: string;
  shortCode: string | null;
  category: string;
  matchType: 'product' | 'ingredient';
}

export default function BranchRecipesPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const canEdit = user?.role && HQ_EDIT_ROLES.includes(user.role);

  // Tüm ürünler
  const { data: products = [], isLoading: productsLoading } = useQuery<BranchProduct[]>({
    queryKey: ["/api/branch-products", { isActive: true }],
    queryFn: async () => {
      const res = await fetch("/api/branch-products?isActive=true", { credentials: "include" });
      if (!res.ok) throw new Error("Ürünler yüklenemedi");
      return res.json();
    },
  });

  // Kategoriler
  const { data: categories = [] } = useQuery<{ category: string; count: number }[]>({
    queryKey: ["/api/branch-recipes/categories"],
    queryFn: async () => {
      const res = await fetch("/api/branch-recipes/categories", { credentials: "include" });
      if (!res.ok) throw new Error("Kategoriler yüklenemedi");
      return res.json();
    },
  });

  // Arama
  const { data: searchResults = [], isLoading: searchLoading } = useQuery<SearchResult[]>({
    queryKey: ["/api/branch-recipes/search", searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      const res = await fetch(`/api/branch-recipes/search?q=${encodeURIComponent(searchQuery)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Arama hatası");
      return res.json();
    },
    enabled: searchQuery.length >= 2,
  });

  // Filtrelenmiş ürünler (kategori bazlı)
  const filteredProducts = useMemo(() => {
    if (selectedCategory === "all") return products;
    return products.filter(p => p.category === selectedCategory);
  }, [products, selectedCategory]);

  // Kategoriye göre grupla
  const groupedProducts = useMemo(() => {
    const groups: Record<string, BranchProduct[]> = {};
    filteredProducts.forEach(p => {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    });
    return groups;
  }, [filteredProducts]);

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <ChefHat className="h-7 w-7 text-[#c0392b]" />
            Reçeteler
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Şube içecek ve ürün reçeteleri
          </p>
        </div>
        {canEdit && (
          <Button
            onClick={() => setLocation("/branch-recipes/admin")}
            className="bg-[#c0392b] hover:bg-[#a73225]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Yönet
          </Button>
        )}
      </div>

      {/* Arama */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Reçete ara (ürün adı veya malzeme)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>

          {/* Arama sonuçları */}
          {searchQuery.length >= 2 && (
            <div className="mt-4 space-y-1">
              {searchLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : searchResults.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">
                  Sonuç bulunamadı
                </p>
              ) : (
                searchResults.map((r) => (
                  <Button
                    key={r.id}
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => setLocation(`/branch-recipes/${r.id}`)}
                    data-testid={`search-result-${r.id}`}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <span className="font-medium flex-1 text-left">{r.name}</span>
                      {r.shortCode && (
                        <Badge variant="outline" className="text-xs">
                          {r.shortCode}
                        </Badge>
                      )}
                      {r.matchType === 'ingredient' && (
                        <Badge variant="secondary" className="text-xs">
                          malzeme
                        </Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Button>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Kategori filtresi (tab şeklinde, mobile-first) */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-6">
        <TabsList className="w-full overflow-x-auto flex-nowrap justify-start">
          <TabsTrigger value="all" data-testid="tab-all">
            Tümü ({products.length})
          </TabsTrigger>
          {categories.map((c) => {
            const meta = CATEGORY_META[c.category];
            if (!meta) return null;
            const Icon = meta.icon;
            return (
              <TabsTrigger
                key={c.category}
                value={c.category}
                data-testid={`tab-${c.category}`}
                className="whitespace-nowrap"
              >
                <Icon className="h-4 w-4 mr-1" />
                {meta.label} ({c.count})
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Ürün Listesi */}
      {productsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : Object.keys(groupedProducts).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <ChefHat className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Bu kategoride ürün yok</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedProducts).map(([categoryKey, items]) => {
            const meta = CATEGORY_META[categoryKey];
            if (!meta) return null;
            const Icon = meta.icon;

            return (
              <div key={categoryKey}>
                {selectedCategory === "all" && (
                  <h2 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${meta.color}`}>
                    <Icon className="h-5 w-5" />
                    {meta.label}
                    <Badge variant="secondary" className="ml-auto">
                      {items.length}
                    </Badge>
                  </h2>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((product) => (
                    <Card
                      key={product.id}
                      className={`hover:shadow-md transition-shadow cursor-pointer ${meta.bgColor}`}
                      onClick={() => setLocation(`/branch-recipes/${product.id}`)}
                      data-testid={`product-card-${product.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Görsel veya icon */}
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                              loading="lazy"
                            />
                          ) : (
                            <div className={`w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.bgColor}`}>
                              <Icon className={`h-8 w-8 ${meta.color}`} />
                            </div>
                          )}

                          {/* İçerik */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold truncate">
                                {product.name}
                              </h3>
                              {product.shortCode && (
                                <Badge variant="outline" className="text-xs">
                                  {product.shortCode}
                                </Badge>
                              )}
                              {product.subCategory && product.subCategory.startsWith('fruit_') && (
                                <Badge className="text-xs bg-purple-500 hover:bg-purple-600">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  Şablon
                                </Badge>
                              )}
                            </div>

                            {product.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {product.description}
                              </p>
                            )}

                            {/* Fiyat */}
                            <div className="flex items-center gap-3 mt-2 text-xs">
                              {product.massivoPrice && (
                                <span className="text-muted-foreground">
                                  M: <strong className="text-foreground">{product.massivoPrice}₺</strong>
                                </span>
                              )}
                              {product.longDivaPrice && (
                                <span className="text-muted-foreground">
                                  LD: <strong className="text-foreground">{product.longDivaPrice}₺</strong>
                                </span>
                              )}
                            </div>
                          </div>

                          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 self-center" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer İstatistik */}
      {!productsLoading && products.length > 0 && (
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Toplam {products.length} ürün, {categories.length} kategori
        </div>
      )}
    </div>
  );
}
