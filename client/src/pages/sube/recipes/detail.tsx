import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import {
  ArrowLeft, Coffee, Snowflake, Clock, ChefHat, BookOpen,
  Trophy, Pencil, AlertCircle, CheckCircle2, Image as ImageIcon
} from "lucide-react";

const EDIT_ROLES = ['admin', 'ceo', 'cgo', 'coach', 'trainer'];

interface Recipe {
  id: number;
  productId: number;
  size: 'massivo' | 'long_diva' | 'tek_boy';
  version: string;
  isTemplate: boolean;
  templateType?: string;
  difficultyLevel: number;
  servingCup?: string;
  servingLid?: string;
  notes?: string;
}

interface Ingredient {
  id: number;
  stepOrder: number;
  ingredientName: string;
  quantityText: string;
  unit?: string;
  preparationNote?: string;
  isVariableAroma?: boolean;
  aromaSlot?: string;
}

interface Step {
  id: number;
  stepOrder: number;
  instruction: string;
  isCritical: boolean;
  estimatedSec?: number;
}

interface Product {
  id: number;
  name: string;
  shortCode?: string;
  category: string;
  description?: string;
  imageUrl?: string;
  massivoPrice?: string;
  longDivaPrice?: string;
}

const SIZE_LABELS: Record<string, string> = {
  massivo: "Massivo (200ml)",
  long_diva: "Long Diva (280ml)",
  tek_boy: "Tek Boy",
};

export default function RecipeDetailPage() {
  const [match, params] = useRoute("/sube/recipes/:id");
  const productId = params?.id ? Number(params.id) : null;
  const { user } = useAuth();
  const canEdit = user && EDIT_ROLES.includes(user.role);

  const [selectedSize, setSelectedSize] = useState<'massivo' | 'long_diva' | 'tek_boy'>('massivo');

  // Ürün + reçete listesi
  const { data: productData, isLoading: loadingProduct, isError } = useQuery<{
    product: Product;
    recipes: Recipe[];
  }>({
    queryKey: [`/api/branch-products/${productId}`],
    queryFn: async () => {
      const res = await fetch(`/api/branch-products/${productId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Ürün yüklenemedi");
      return res.json();
    },
    enabled: !!productId,
  });

  // Seçili boyuttaki reçete
  const selectedRecipe = productData?.recipes.find(r => r.size === selectedSize)
    || productData?.recipes[0]; // fallback

  // Reçete detay (malzeme + adım)
  const { data: recipeDetail, isLoading: loadingDetail } = useQuery<{
    product: Product;
    recipe: Recipe;
    ingredients: Ingredient[];
    steps: Step[];
    quizCount: number;
  }>({
    queryKey: [`/api/branch-recipes/${selectedRecipe?.id}`],
    queryFn: async () => {
      const res = await fetch(`/api/branch-recipes/${selectedRecipe!.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Reçete yüklenemedi");
      return res.json();
    },
    enabled: !!selectedRecipe?.id,
  });

  if (!match || !productId) {
    return <div className="p-4 text-center text-gray-500">Geçersiz sayfa</div>;
  }

  if (isError) {
    return <ErrorState onRetry={() => window.location.reload()} />;
  }

  const product = productData?.product;
  const availableSizes = productData?.recipes.map(r => r.size) || [];

  return (
    <div className="min-h-screen bg-[#edeae4] dark:bg-[#0c0f14]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#c0392b] text-white px-3 py-2.5 shadow-md">
        <div className="flex items-center gap-2">
          <Link href="/sube/recipes" data-testid="btn-back">
            <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-9 w-9">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold truncate" data-testid="text-product-name">
              {loadingProduct ? <Skeleton className="h-5 w-40" /> : product?.name}
            </h1>
            <p className="text-xs opacity-80">
              {loadingDetail ? "..." : `Reçete v${selectedRecipe?.version || '3.6'}`}
            </p>
          </div>
          {canEdit && product && (
            <Link href={`/sube/recipes/${product.id}/edit`} data-testid="btn-edit">
              <Button size="icon" variant="secondary" className="h-9 w-9">
                <Pencil className="w-4 h-4" />
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Görsel */}
      {product?.imageUrl ? (
        <div className="relative w-full h-48 bg-gray-200">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-amber-500 to-orange-700 flex items-center justify-center">
          <Coffee className="w-16 h-16 text-white opacity-50" />
        </div>
      )}

      {/* Ürün açıklama + boyut seçimi */}
      <section className="bg-white dark:bg-[#141820] px-4 py-3 border-b">
        {product?.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{product.description}</p>
        )}

        {/* Fiyat + Zorluk */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-2 text-sm">
            {product?.massivoPrice && (
              <Badge variant="outline" className="text-xs">
                Massivo ₺{product.massivoPrice}
              </Badge>
            )}
            {product?.longDivaPrice && (
              <Badge variant="outline" className="text-xs">
                Long Diva ₺{product.longDivaPrice}
              </Badge>
            )}
          </div>
          {selectedRecipe && (
            <Badge variant={selectedRecipe.difficultyLevel === 1 ? "default" : selectedRecipe.difficultyLevel === 2 ? "secondary" : "destructive"}>
              {selectedRecipe.difficultyLevel === 1 ? "🟢 Kolay" : selectedRecipe.difficultyLevel === 2 ? "🟡 Orta" : "🔴 Zor"}
            </Badge>
          )}
        </div>

        {/* Boyut seçimi (Massivo / Long Diva) */}
        {availableSizes.length > 1 && (
          <div className="flex gap-2">
            {availableSizes.map(size => (
              <Button
                key={size}
                variant={selectedSize === size ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedSize(size as any)}
                className="flex-1"
                data-testid={`btn-size-${size}`}
              >
                {SIZE_LABELS[size]}
              </Button>
            ))}
          </div>
        )}
      </section>

      {/* Tabs: Malzeme / Adımlar / Quiz */}
      <main className="px-4 py-4 pb-24">
        {loadingDetail ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : recipeDetail && (
          <Tabs defaultValue="ingredients" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-12">
              <TabsTrigger value="ingredients" data-testid="tab-ingredients">
                <ChefHat className="w-4 h-4 mr-1" />
                Malzeme
              </TabsTrigger>
              <TabsTrigger value="steps" data-testid="tab-steps">
                <BookOpen className="w-4 h-4 mr-1" />
                Adımlar
              </TabsTrigger>
              <TabsTrigger value="quiz" data-testid="tab-quiz">
                <Trophy className="w-4 h-4 mr-1" />
                Quiz {recipeDetail.quizCount > 0 && `(${recipeDetail.quizCount})`}
              </TabsTrigger>
            </TabsList>

            {/* MALZEMELER */}
            <TabsContent value="ingredients" className="mt-3 space-y-2">
              {recipeDetail.ingredients.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Henüz malzeme eklenmemiş</p>
              ) : (
                recipeDetail.ingredients.map((ing, idx) => (
                  <Card key={ing.id} className="overflow-hidden">
                    <CardContent className="p-3 flex items-start gap-3">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#c0392b] text-white flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="font-medium text-sm">{ing.ingredientName}</h3>
                          {ing.isVariableAroma && (
                            <Badge variant="outline" className="text-xs">
                              🎨 Aroma değişken
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                          <span className="font-medium">{ing.quantityText}</span>
                          {ing.unit && <span className="text-xs text-gray-500"> {ing.unit}</span>}
                        </p>
                        {ing.preparationNote && (
                          <p className="text-xs text-gray-500 italic mt-1">
                            ℹ️ {ing.preparationNote}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* ADIMLAR */}
            <TabsContent value="steps" className="mt-3 space-y-2">
              {recipeDetail.steps.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Henüz adım eklenmemiş</p>
              ) : (
                recipeDetail.steps.map((step, idx) => (
                  <Card
                    key={step.id}
                    className={`overflow-hidden ${step.isCritical ? 'border-l-4 border-l-amber-500' : ''}`}
                  >
                    <CardContent className="p-3 flex items-start gap-3">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#192838] text-white flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        {step.isCritical && (
                          <Badge variant="outline" className="mb-1 text-xs border-amber-500 text-amber-700">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Kritik adım
                          </Badge>
                        )}
                        <p className="text-sm leading-relaxed">{step.instruction}</p>
                        {step.estimatedSec && (
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> ~{step.estimatedSec} sn
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* QUIZ */}
            <TabsContent value="quiz" className="mt-3">
              {recipeDetail.quizCount === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-gray-500">Bu reçete için quiz henüz hazırlanmadı</p>
                    {canEdit && (
                      <p className="text-xs text-gray-400 mt-2">
                        HQ rolleri quiz oluşturabilir
                      </p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Link href={`/sube/recipes/${productId}/quiz?recipe=${selectedRecipe?.id}`}>
                  <Card className="cursor-pointer hover:shadow-lg active:scale-95 transition-all bg-gradient-to-br from-[#c0392b] to-[#a02818] text-white">
                    <CardContent className="p-6 text-center">
                      <Trophy className="w-12 h-12 mx-auto mb-3" />
                      <h3 className="font-bold text-lg">Quiz Başlat</h3>
                      <p className="text-sm opacity-90 mt-1">
                        {recipeDetail.quizCount} soru ile bilgini test et
                      </p>
                      <Button variant="secondary" className="mt-3">
                        Başla →
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#192838] text-white px-4 py-2 text-center text-xs">
        {selectedRecipe?.servingLid && `🥤 ${selectedRecipe.servingLid}`}
        {selectedRecipe?.servingCup && ` · ${selectedRecipe.servingCup}`}
      </footer>
    </div>
  );
}
