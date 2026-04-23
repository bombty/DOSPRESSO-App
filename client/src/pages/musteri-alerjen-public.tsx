/**
 * R-5D: Müşteri Alerjen + Besin Tablosu — PUBLIC (Auth YOK)
 *
 * QR kod ile erişim için tasarlanmıştır. Müşteri QR okutur → bu sayfaya gelir.
 * Sadece besin değeri ve alerjen bilgisi gösterir.
 * Malzeme listesi, maliyet, üretim adımları GÖSTERİLMEZ (rakip koruma).
 *
 * URL: /m/alerjen/:id (ürün tek) veya /m/alerjen (liste)
 * API: /api/public/allergens/recipes ve /api/public/allergens/recipes/:id
 *
 * Rate limit: 30 istek/dakika per IP (DoS koruma)
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Search, Info, ShieldCheck, ChevronLeft } from "lucide-react";

interface Per100g {
  energy_kcal: number;
  fat_g: number;
  saturated_fat_g: number;
  carbohydrate_g: number;
  sugar_g: number;
  fiber_g: number;
  protein_g: number;
  salt_g: number;
}

interface RecipeListItem {
  id: number;
  name: string;
  category: string | null;
  coverPhotoUrl: string | null;
  allergens: string[];
}

interface RecipeDetail {
  id: number;
  name: string;
  category: string | null;
  coverPhotoUrl: string | null;
  per100g: Per100g | null;
  perPortion: Per100g | null;
  portionWeight: number | null;
  allergens: string[];
  isVerified: boolean;
  message?: string;
}

// 14 AB resmi alerjen + TR ikon/etiket
const ALLERGEN_META: Record<string, { icon: string; label: string }> = {
  gluten: { icon: "🌾", label: "Gluten" },
  süt: { icon: "🥛", label: "Süt / Laktoz" },
  sut: { icon: "🥛", label: "Süt / Laktoz" },
  yumurta: { icon: "🥚", label: "Yumurta" },
  fındık: { icon: "🥜", label: "Fındık" },
  findik: { icon: "🥜", label: "Fındık" },
  fıstık: { icon: "🌰", label: "Fıstık" },
  fistik: { icon: "🌰", label: "Fıstık" },
  soya: { icon: "🫘", label: "Soya" },
  susam: { icon: "🌱", label: "Susam" },
  sülfit: { icon: "🍷", label: "Sülfit" },
  sulfit: { icon: "🍷", label: "Sülfit" },
  balık: { icon: "🐟", label: "Balık" },
  balik: { icon: "🐟", label: "Balık" },
  kabuklu: { icon: "🦐", label: "Kabuklu Deniz Ürünleri" },
  yumusakca: { icon: "🦑", label: "Yumuşakça" },
  hardal: { icon: "🌶️", label: "Hardal" },
  kereviz: { icon: "🥬", label: "Kereviz" },
  lupin: { icon: "🌿", label: "Lupin" },
};

function AllergenBadge({ allergen, size = "md" }: { allergen: string; size?: "sm" | "md" | "lg" }) {
  const meta = ALLERGEN_META[allergen.toLowerCase()] || { icon: "⚠️", label: allergen };
  const sizeClass = size === "lg" ? "text-base py-1.5 px-3" : size === "sm" ? "text-xs py-0.5 px-1.5" : "text-sm py-1 px-2";
  return (
    <Badge variant="destructive" className={`${sizeClass} font-medium`}>
      <span className="mr-1">{meta.icon}</span>
      {meta.label}
    </Badge>
  );
}

// Liste sayfası - tüm ürünler
function RecipeListPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery<RecipeListItem[]>({
    queryKey: ["/api/public/allergens/recipes"],
    staleTime: 5 * 60 * 1000, // 5 dk cache (müşteri tarafı, değişmez)
  });

  const filtered = data?.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const byCategory = filtered.reduce((acc, r) => {
    const cat = r.category || "Diğer";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(r);
    return acc;
  }, {} as Record<string, RecipeListItem[]>);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white dark:from-gray-950 dark:to-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 pt-4">
          <div className="inline-block bg-red-600 text-white rounded-full p-3 mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold">Alerjen & Besin Bilgisi</h1>
          <p className="text-sm text-muted-foreground mt-1">
            DOSPRESSO ürünlerinde kullanılan alerjenler ve besin değerleri
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Ürün ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Loading/Error */}
        {isLoading && (
          <div className="text-center py-12 text-muted-foreground">Yükleniyor...</div>
        )}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6 text-center text-destructive">
              Bilgi yüklenemedi. Lütfen daha sonra tekrar deneyin.
            </CardContent>
          </Card>
        )}

        {/* Liste */}
        {!isLoading && !error && Object.entries(byCategory).map(([cat, recipes]) => (
          <div key={cat} className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
              {cat}
            </h2>
            <div className="space-y-2">
              {recipes.map(r => (
                <Card
                  key={r.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/m/alerjen/${r.id}`)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    {r.coverPhotoUrl && (
                      <img
                        src={r.coverPhotoUrl}
                        alt={r.name}
                        className="w-12 h-12 rounded object-cover flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{r.name}</div>
                      {r.allergens.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {r.allergens.slice(0, 4).map(a => (
                            <AllergenBadge key={a} allergen={a} size="sm" />
                          ))}
                          {r.allergens.length > 4 && (
                            <span className="text-xs text-muted-foreground">+{r.allergens.length - 4}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}

        {!isLoading && !error && filtered.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Arama sonucu bulunamadı.
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-8 pb-8 text-xs text-muted-foreground">
          <p>© DOSPRESSO — Donut & Coffee</p>
          <p className="mt-1">Güvenilir alerjen bilgisi için her ziyaretinizde kontrol edin</p>
        </div>
      </div>
    </div>
  );
}

// Detay sayfası - tek ürün
function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data: recipe, isLoading, error } = useQuery<RecipeDetail>({
    queryKey: [`/api/public/allergens/recipes/${id}`],
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Yükleniyor...</div>;
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white p-4">
        <div className="max-w-2xl mx-auto">
          <Button variant="ghost" onClick={() => navigate("/m/alerjen")} className="mb-4">
            <ChevronLeft className="w-4 h-4 mr-1" /> Geri
          </Button>
          <Card className="border-destructive">
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-2" />
              <h2 className="font-semibold">Ürün bulunamadı</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Bu QR kodla ulaşılan ürün şu an gösterilmiyor olabilir.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white dark:from-gray-950 dark:to-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/m/alerjen")} className="mb-4">
          <ChevronLeft className="w-4 h-4 mr-1" /> Tüm Ürünler
        </Button>

        {/* Ürün Kartı */}
        <Card className="overflow-hidden">
          {recipe.coverPhotoUrl && (
            <img
              src={recipe.coverPhotoUrl}
              alt={recipe.name}
              className="w-full h-48 object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
          <CardHeader>
            <CardTitle className="text-2xl">{recipe.name}</CardTitle>
            {recipe.category && (
              <CardDescription className="capitalize">{recipe.category}</CardDescription>
            )}
            {recipe.isVerified && (
              <Badge variant="default" className="w-fit mt-1">
                <ShieldCheck className="w-3 h-3 mr-1" /> Doğrulanmış Bilgi
              </Badge>
            )}
          </CardHeader>
        </Card>

        {/* ALERJENLER */}
        <Card className="mt-4 border-red-200 dark:border-red-900">
          <CardHeader className="pb-3 bg-red-50 dark:bg-red-950/30">
            <CardTitle className="text-base flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Alerjen Bilgisi
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {recipe.allergens.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  Bu ürün aşağıdaki alerjenleri içerir veya iz miktarında bulundurabilir:
                </p>
                <div className="flex flex-wrap gap-2">
                  {recipe.allergens.map(a => (
                    <AllergenBadge key={a} allergen={a} size="lg" />
                  ))}
                </div>
                {!recipe.isVerified && (
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded border border-yellow-200 dark:border-yellow-800">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200">
                      <Info className="w-3 h-3 inline mr-1" />
                      Bu bilgi henüz tüm malzemeler için doğrulanmamıştır. En güncel bilgi için personele danışın.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Bu ürün için alerjen bilgisi henüz hazırlanmamış. Lütfen personele danışın.
              </p>
            )}
          </CardContent>
        </Card>

        {/* BESİN DEĞERLERİ */}
        {recipe.per100g && (
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                🥗 Besin Değerleri
              </CardTitle>
              {recipe.portionWeight && (
                <CardDescription>
                  1 porsiyon ≈ {recipe.portionWeight} gram
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2">Besin</th>
                    <th className="text-right py-2">100 gr başına</th>
                    {recipe.perPortion && <th className="text-right py-2">1 porsiyon</th>}
                  </tr>
                </thead>
                <tbody>
                  <NutritionRow
                    label="Enerji"
                    per100={`${recipe.per100g.energy_kcal} kcal`}
                    perPortion={recipe.perPortion ? `${recipe.perPortion.energy_kcal} kcal` : null}
                    bold
                  />
                  <NutritionRow
                    label="Yağ"
                    per100={`${recipe.per100g.fat_g} g`}
                    perPortion={recipe.perPortion ? `${recipe.perPortion.fat_g} g` : null}
                  />
                  <NutritionRow
                    label="— doymuş yağ"
                    per100={`${recipe.per100g.saturated_fat_g} g`}
                    perPortion={recipe.perPortion ? `${recipe.perPortion.saturated_fat_g} g` : null}
                    indent
                  />
                  <NutritionRow
                    label="Karbonhidrat"
                    per100={`${recipe.per100g.carbohydrate_g} g`}
                    perPortion={recipe.perPortion ? `${recipe.perPortion.carbohydrate_g} g` : null}
                  />
                  <NutritionRow
                    label="— şeker"
                    per100={`${recipe.per100g.sugar_g} g`}
                    perPortion={recipe.perPortion ? `${recipe.perPortion.sugar_g} g` : null}
                    indent
                  />
                  <NutritionRow
                    label="Lif"
                    per100={`${recipe.per100g.fiber_g} g`}
                    perPortion={recipe.perPortion ? `${recipe.perPortion.fiber_g} g` : null}
                  />
                  <NutritionRow
                    label="Protein"
                    per100={`${recipe.per100g.protein_g} g`}
                    perPortion={recipe.perPortion ? `${recipe.perPortion.protein_g} g` : null}
                  />
                  <NutritionRow
                    label="Tuz"
                    per100={`${recipe.per100g.salt_g} g`}
                    perPortion={recipe.perPortion ? `${recipe.perPortion.salt_g} g` : null}
                  />
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Not + Mesaj */}
        {recipe.message && (
          <Card className="mt-4 border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30">
            <CardContent className="pt-4 text-sm text-yellow-900 dark:text-yellow-200">
              <Info className="w-4 h-4 inline mr-1" />
              {recipe.message}
            </CardContent>
          </Card>
        )}

        <div className="text-center mt-6 pb-8 text-xs text-muted-foreground">
          <p>© DOSPRESSO — Donut & Coffee</p>
          <p className="mt-1">Bilgi amaçlıdır. Kesin alerjen teyidi için personele danışın.</p>
        </div>
      </div>
    </div>
  );
}

function NutritionRow({
  label,
  per100,
  perPortion,
  bold = false,
  indent = false,
}: {
  label: string;
  per100: string;
  perPortion: string | null;
  bold?: boolean;
  indent?: boolean;
}) {
  return (
    <tr className="border-b last:border-0">
      <td className={`py-2 ${bold ? "font-semibold" : ""} ${indent ? "pl-4 text-muted-foreground" : ""}`}>
        {label}
      </td>
      <td className={`py-2 text-right font-mono ${bold ? "font-semibold" : ""}`}>{per100}</td>
      {perPortion !== null && (
        <td className={`py-2 text-right font-mono ${bold ? "font-semibold" : ""}`}>{perPortion}</td>
      )}
    </tr>
  );
}

// Main export - route'a göre liste veya detay göster
export default function MusteriAlerjenPublic() {
  const { id } = useParams<{ id?: string }>();
  return id ? <RecipeDetailPage /> : <RecipeListPage />;
}
