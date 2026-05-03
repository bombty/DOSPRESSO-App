import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ErrorState } from "@/components/error-state";
import { Search, Coffee, Snowflake, IceCream, Leaf, GlassWater, Pizza, ChefHat, Plus, Pencil } from "lucide-react";

// ────────────────────────────────────────
// Kategori meta (UI için ikon + Türkçe ad)
// ────────────────────────────────────────
const CATEGORIES: Record<string, { label: string; icon: any; color: string }> = {
  hot_coffee: { label: "Sıcak Kahveler", icon: Coffee, color: "bg-orange-500" },
  iced_coffee: { label: "Buzlu Kahveler", icon: Snowflake, color: "bg-blue-500" },
  creamice: { label: "Creamice (Kırık Buzlu)", icon: IceCream, color: "bg-purple-500" },
  creamice_caffeine_free: { label: "Creamice Kahvesiz", icon: IceCream, color: "bg-pink-500" },
  creamice_fruit_milkshake: { label: "Meyveli Milkshake", icon: GlassWater, color: "bg-rose-500" },
  creamshake_caffeine_free: { label: "Creamshake Kahvesiz", icon: GlassWater, color: "bg-fuchsia-500" },
  freshess: { label: "Freshess (Mojito/Ice Tea)", icon: Leaf, color: "bg-green-500" },
  frozen_yogurt: { label: "Frozen Yogurt", icon: IceCream, color: "bg-yellow-500" },
  gourmet_shake: { label: "Gourmet Shake", icon: GlassWater, color: "bg-amber-500" },
  hot_tea: { label: "Sıcak Çaylar", icon: Leaf, color: "bg-emerald-500" },
  cold_tea: { label: "Soğuk Çaylar", icon: Leaf, color: "bg-cyan-500" },
  freddo: { label: "Freddo", icon: Coffee, color: "bg-stone-500" },
  donut: { label: "Donutlar", icon: Pizza, color: "bg-red-500" },
  pastry: { label: "Hamur İşleri", icon: Pizza, color: "bg-indigo-500" },
  other: { label: "Diğer", icon: ChefHat, color: "bg-gray-500" },
};

// HQ rolleri (edit yetkisi)
const EDIT_ROLES = ['admin', 'ceo', 'cgo', 'coach', 'trainer'];

interface BranchProduct {
  id: number;
  name: string;
  shortCode?: string;
  category: string;
  subCategory?: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  massivoPrice?: string;
  longDivaPrice?: string;
  displayOrder: number;
}

export default function RecipesListPage() {
  const { user } = useAuth();
  const canEdit = user && EDIT_ROLES.includes(user.role);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Tüm ürünler
  const { data: products = [], isLoading, isError, refetch } = useQuery<BranchProduct[]>({
    queryKey: ["/api/branch-products"],
    queryFn: async () => {
      const res = await fetch("/api/branch-products?isActive=true", { credentials: "include" });
      if (!res.ok) throw new Error("Yükleme hatası");
      return res.json();
    },
  });

  // Kategoriler (sadece var olan kategorileri göster)
  const availableCategories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return Array.from(cats).sort();
  }, [products]);

  // Filtrelenmiş liste
  const filtered = useMemo(() => {
    let list = products;

    if (selectedCategory) {
      list = list.filter(p => p.category === selectedCategory);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.shortCode?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
      );
    }

    return list;
  }, [products, selectedCategory, searchTerm]);

  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  return (
    <div className="min-h-screen bg-[#edeae4] dark:bg-[#0c0f14]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#c0392b] text-white px-4 py-3 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold">📖 Reçete Kitabı</h1>
            <p className="text-xs opacity-80">v3.6 · {products.length} ürün</p>
          </div>
          {canEdit && (
            <Link href="/sube/recipes/new" data-testid="btn-new-recipe">
              <Button size="sm" variant="secondary" className="gap-1">
                <Plus className="w-4 h-4" /> Yeni
              </Button>
            </Link>
          )}
        </div>

        {/* Arama */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Ürün ara... (Latte, Mojito, Mango)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white text-gray-900 border-0 h-11"
            data-testid="input-search"
          />
        </div>
      </header>

      {/* Kategori chip'leri (yatay scroll) */}
      <ScrollArea className="w-full whitespace-nowrap border-b bg-white dark:bg-[#141820]">
        <div className="flex gap-2 px-4 py-3">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className="shrink-0"
            data-testid="chip-all"
          >
            Hepsi ({products.length})
          </Button>
          {availableCategories.map(cat => {
            const meta = CATEGORIES[cat] || { label: cat, icon: ChefHat, color: "bg-gray-500" };
            const count = products.filter(p => p.category === cat).length;
            const Icon = meta.icon;
            return (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className="shrink-0 gap-1"
                data-testid={`chip-${cat}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {meta.label} ({count})
              </Button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Ürün Listesi (Card grid) */}
      <main className="px-4 py-4 pb-24">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="h-48 animate-pulse bg-gray-200" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Coffee className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{searchTerm ? "Sonuç bulunamadı" : "Bu kategoride ürün yok"}</p>
            {searchTerm && (
              <Button variant="link" onClick={() => setSearchTerm("")}>
                Aramayı temizle
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(product => {
              const meta = CATEGORIES[product.category] || CATEGORIES.other;
              const Icon = meta.icon;
              return (
                <Link
                  key={product.id}
                  href={`/sube/recipes/${product.id}`}
                  data-testid={`card-product-${product.id}`}
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow active:scale-95 cursor-pointer h-full">
                    {/* Görsel veya placeholder */}
                    <div className={`h-32 ${meta.color} relative flex items-center justify-center`}>
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <Icon className="w-12 h-12 text-white opacity-80" />
                      )}
                      {product.shortCode && (
                        <Badge className="absolute top-2 left-2 bg-black/60 text-white text-xs">
                          {product.shortCode}
                        </Badge>
                      )}
                      {canEdit && (
                        <Link
                          href={`/sube/recipes/${product.id}/edit`}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-2 right-2"
                          data-testid={`btn-edit-${product.id}`}
                        >
                          <Button size="icon" variant="secondary" className="h-8 w-8">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      )}
                    </div>

                    <CardContent className="p-3">
                      <h3 className="font-semibold text-sm line-clamp-1">{product.name}</h3>
                      {product.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                          {product.description}
                        </p>
                      )}
                      <div className="flex gap-2 mt-2 text-xs">
                        {product.massivoPrice && (
                          <span className="text-gray-600">M: ₺{product.massivoPrice}</span>
                        )}
                        {product.longDivaPrice && (
                          <span className="text-gray-600">L: ₺{product.longDivaPrice}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer (mobil alt çubuk) */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#192838] text-white px-4 py-2 text-center text-xs">
        DOSPRESSO Reçete · {filtered.length} ürün gösteriliyor
      </footer>
    </div>
  );
}
