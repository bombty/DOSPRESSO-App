/**
 * BRANCH RECIPE DETAIL — Detay Sayfası
 *
 * Bir ürünün reçete detayını gösterir.
 * - Boy seçimi (Massivo / Long Diva)
 * - Malzemeler ve adımlar
 * - Template ise: Aroma seçimi (radio buttons)
 * - Pump miktarı aroma seçimine göre güncellenir
 * - Hazırlama süresi + zorluk
 * - Quiz başlatma butonu
 *
 * URL: /branch-recipes/:id
 */

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Coffee, Snowflake, Clock, ChefHat, AlertTriangle,
  Sparkles, CheckCircle2, ListChecks, Brain, Pencil,
  ThermometerSun, Beaker, Trophy,
} from "lucide-react";

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
  massivoPrice: string | null;
  longDivaPrice: string | null;
}

interface BranchRecipe {
  id: number;
  productId: number;
  size: 'massivo' | 'long_diva' | 'tek_boy';
  version: string;
  isActive: boolean;
  isTemplate: boolean;
  templateType: string | null;
  preparationTimeSec: number | null;
  difficultyLevel: number;
  servingCup: string | null;
  servingLid: string | null;
  servingNotes: string | null;
  notes: string | null;
}

interface BranchRecipeIngredient {
  id: number;
  recipeId: number;
  stepOrder: number;
  ingredientName: string;
  quantityText: string;
  quantityNumeric: string | null;
  unit: string | null;
  preparationNote: string | null;
  isVariableAroma: boolean;
  aromaSlot: string | null;
}

interface BranchRecipeStep {
  id: number;
  recipeId: number;
  stepOrder: number;
  instruction: string;
  isCritical: boolean;
  estimatedSec: number | null;
}

interface RecipeDetail {
  product: BranchProduct;
  recipe: BranchRecipe;
  ingredients: BranchRecipeIngredient[];
  steps: BranchRecipeStep[];
  quizCount: number;
}

interface AromaCompatibility {
  id: number;
  recipeId: number;
  aromaId: number;
  slotName: string;
  overridePumpsMassivo: string | null;
  overridePumpsLongDiva: string | null;
  overrideUnit: string | null;
  isDefault: boolean;
  displayNameOverride: string | null;
  isActive: boolean;
}

interface AromaOption {
  id: number;
  name: string;
  shortCode: string | null;
  category: string;
  colorHex: string | null;
  iconEmoji: string | null;
  formType: string;
}

const SIZE_LABEL: Record<string, string> = {
  massivo: "Massivo (200ml)",
  long_diva: "Long Diva (280ml)",
  tek_boy: "Standart",
};

const DIFFICULTY_LABEL: Record<number, { label: string; color: string }> = {
  1: { label: "Kolay", color: "bg-green-500" },
  2: { label: "Orta", color: "bg-yellow-500" },
  3: { label: "Zor", color: "bg-red-500" },
};

export default function BranchRecipeDetailPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/branch-recipes/:id");
  const productId = params?.id ? Number(params.id) : null;

  const [selectedSize, setSelectedSize] = useState<'massivo' | 'long_diva' | 'tek_boy'>('massivo');
  const [selectedPrimaryAromaId, setSelectedPrimaryAromaId] = useState<number | null>(null);
  const [selectedSecondaryAromaId, setSelectedSecondaryAromaId] = useState<number | null>(null);

  const canEdit = user?.role && HQ_EDIT_ROLES.includes(user.role);

  // Ürün + reçeteler
  const { data: productData, isLoading: productLoading } = useQuery<{
    product: BranchProduct;
    recipes: BranchRecipe[];
  }>({
    queryKey: ["/api/branch-products", productId],
    queryFn: async () => {
      const res = await fetch(`/api/branch-products/${productId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Ürün yüklenemedi");
      return res.json();
    },
    enabled: !!productId,
  });

  // Boy seçimi varsayılan ata
  useEffect(() => {
    if (productData?.recipes && productData.recipes.length > 0 && !selectedSize) {
      const firstSize = productData.recipes[0].size;
      setSelectedSize(firstSize);
    }
  }, [productData?.recipes]);

  // Aktif reçete
  const activeRecipe = useMemo(() => {
    return productData?.recipes?.find(r => r.size === selectedSize) ?? productData?.recipes?.[0];
  }, [productData?.recipes, selectedSize]);

  // Reçete detay (malzeme + adım)
  const { data: recipeDetail, isLoading: detailLoading } = useQuery<RecipeDetail>({
    queryKey: ["/api/branch-recipes", activeRecipe?.id],
    queryFn: async () => {
      const res = await fetch(`/api/branch-recipes/${activeRecipe!.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Reçete yüklenemedi");
      return res.json();
    },
    enabled: !!activeRecipe?.id,
  });

  const isLoading = productLoading || detailLoading;
  const product = productData?.product;
  const recipe = recipeDetail?.recipe ?? activeRecipe;

  // Mevcut boylar
  const availableSizes = useMemo(() => {
    return productData?.recipes?.map(r => r.size) ?? [];
  }, [productData?.recipes]);

  // Görsel için kategori meta
  const categoryIcon = product?.category?.includes('iced') || product?.category?.includes('cold')
    ? Snowflake
    : product?.category?.includes('hot')
    ? ThermometerSun
    : ChefHat;

  if (!productId) {
    return (
      <div className="container mx-auto p-4">
        <p>Geçersiz ürün ID</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!product || !recipe) {
    return (
      <div className="container mx-auto p-4">
        <Button variant="ghost" onClick={() => setLocation("/branch-recipes")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Geri
        </Button>
        <Card className="mt-4">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Reçete bulunamadı</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const ingredients = recipeDetail?.ingredients ?? [];
  const steps = recipeDetail?.steps ?? [];
  const difficulty = DIFFICULTY_LABEL[recipe.difficultyLevel ?? 1];
  const Icon = categoryIcon;

  return (
    <div className="container mx-auto p-4 max-w-4xl pb-20">
      {/* Geri butonu */}
      <Button
        variant="ghost"
        onClick={() => setLocation("/branch-recipes")}
        className="mb-4"
        data-testid="button-back"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Reçeteler
      </Button>

      {/* Ürün Header */}
      <Card className="mb-4 overflow-hidden">
        {product.imageUrl && (
          <div className="aspect-[3/2] w-full overflow-hidden bg-muted">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            {!product.imageUrl && (
              <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                <Icon className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{product.name}</h1>
                {product.shortCode && (
                  <Badge variant="outline">{product.shortCode}</Badge>
                )}
                {recipe.isTemplate && (
                  <Badge className="bg-purple-500 hover:bg-purple-600">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Şablon
                  </Badge>
                )}
              </div>
              {product.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {product.description}
                </p>
              )}

              {/* Meta bilgi */}
              <div className="flex items-center gap-3 mt-3 text-sm flex-wrap">
                <Badge className={difficulty.color}>
                  {difficulty.label}
                </Badge>
                {recipe.preparationTimeSec && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    ~{Math.round(recipe.preparationTimeSec / 60)} dk
                  </span>
                )}
                {recipe.version && (
                  <span className="text-xs text-muted-foreground">
                    Reçete v{recipe.version}
                  </span>
                )}
              </div>
            </div>

            {/* HQ edit butonu */}
            {canEdit && (
              <div className="flex flex-col gap-1.5 shrink-0">
                {activeRecipe && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation(`/branch-recipes/admin/recipe/${activeRecipe.id}`)}
                    data-testid="button-edit-recipe"
                    className="gap-1.5"
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="text-xs">Reçeteyi Düzenle</span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation(`/branch-recipes/admin/${product.id}`)}
                  data-testid="button-edit"
                  className="gap-1.5"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="text-[10px] text-muted-foreground">Ürün Bilgileri</span>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Boy Seçimi */}
      {availableSizes.length > 1 && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <Label className="text-sm font-semibold mb-2 block">Boy Seçimi</Label>
            <Tabs value={selectedSize} onValueChange={(v) => setSelectedSize(v as any)}>
              <TabsList className="grid grid-cols-2 w-full">
                {availableSizes.map(size => (
                  <TabsTrigger key={size} value={size} data-testid={`tab-size-${size}`}>
                    {SIZE_LABEL[size]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="mt-3 flex items-center gap-3 text-sm">
              {selectedSize === 'massivo' && product.massivoPrice && (
                <span>Fiyat: <strong>{product.massivoPrice}₺</strong></span>
              )}
              {selectedSize === 'long_diva' && product.longDivaPrice && (
                <span>Fiyat: <strong>{product.longDivaPrice}₺</strong></span>
              )}
              {recipe.servingCup && (
                <span className="text-muted-foreground">{recipe.servingCup}</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template ise aroma seçimi */}
      {recipe.isTemplate && recipe.templateType && (
        <TemplateAromaSelector
          recipeId={recipe.id}
          templateType={recipe.templateType}
          selectedSize={selectedSize}
          selectedPrimaryAromaId={selectedPrimaryAromaId}
          selectedSecondaryAromaId={selectedSecondaryAromaId}
          onPrimaryAromaChange={setSelectedPrimaryAromaId}
          onSecondaryAromaChange={setSelectedSecondaryAromaId}
        />
      )}

      {/* Malzemeler */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Beaker className="h-5 w-5 text-[#c0392b]" />
            Malzemeler
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ingredients.length === 0 ? (
            <p className="text-sm text-muted-foreground">Malzeme bulunamadı</p>
          ) : (
            ingredients.map((ing) => (
              <div
                key={ing.id}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  ing.isVariableAroma ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800' : 'bg-muted/30'
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-[#c0392b] text-white text-xs flex items-center justify-center flex-shrink-0 font-semibold">
                  {ing.stepOrder}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-medium">{ing.ingredientName}</span>
                    {ing.isVariableAroma && (
                      <Badge variant="outline" className="text-xs border-purple-400 text-purple-600">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Müşteri seçer
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-0.5">
                    <strong className="text-foreground">{ing.quantityText}</strong>
                    {ing.preparationNote && ` — ${ing.preparationNote}`}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Hazırlama Adımları */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-[#c0392b]" />
            Hazırlama Adımları
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {steps.length === 0 ? (
            <p className="text-sm text-muted-foreground">Adım bulunamadı</p>
          ) : (
            steps.map((step) => (
              <div
                key={step.id}
                className={`flex items-start gap-3 ${step.isCritical ? 'p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200' : ''}`}
              >
                <div className="w-7 h-7 rounded-full bg-foreground text-background text-xs flex items-center justify-center flex-shrink-0 font-semibold">
                  {step.stepOrder}
                </div>
                <div className="flex-1">
                  <p className="text-sm leading-relaxed">{step.instruction}</p>
                  {step.isCritical && (
                    <Badge variant="outline" className="mt-2 text-xs border-amber-500 text-amber-700">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Kritik adım
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Sunum bilgisi */}
      {(recipe.servingCup || recipe.servingLid || recipe.servingNotes) && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[#c0392b]" />
              Sunum
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {recipe.servingCup && (
              <div><strong>Bardak:</strong> {recipe.servingCup}</div>
            )}
            {recipe.servingLid && (
              <div><strong>Kapak:</strong> {recipe.servingLid}</div>
            )}
            {recipe.servingNotes && (
              <div className="text-muted-foreground">{recipe.servingNotes}</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quiz Butonu */}
      {recipeDetail && recipeDetail.quizCount > 0 && (
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-purple-600" />
              <div className="flex-1">
                <h3 className="font-semibold">Bu reçete için {recipeDetail.quizCount} quiz var</h3>
                <p className="text-sm text-muted-foreground">
                  Bilgini test et, ustalaş!
                </p>
              </div>
              <Button
                onClick={() => setLocation(`/branch-recipes/${product.id}/quiz?recipeId=${recipe.id}`)}
                className="bg-purple-600 hover:bg-purple-700"
                data-testid="button-start-quiz"
              >
                <Brain className="h-4 w-4 mr-2" />
                Quiz Başlat
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Template Aroma Seçici (alt bileşen)
// ─────────────────────────────────────────────

interface TemplateAromaSelectorProps {
  recipeId: number;
  templateType: string;
  selectedSize: string;
  selectedPrimaryAromaId: number | null;
  selectedSecondaryAromaId: number | null;
  onPrimaryAromaChange: (id: number) => void;
  onSecondaryAromaChange: (id: number) => void;
}

function TemplateAromaSelector({
  recipeId,
  templateType,
  selectedSize,
  selectedPrimaryAromaId,
  selectedSecondaryAromaId,
  onPrimaryAromaChange,
  onSecondaryAromaChange,
}: TemplateAromaSelectorProps) {
  // Bu reçetenin aroma uyumluluğunu çek
  // Şu an basit endpoint yok, simulasyon: template type'a göre uygun aromaları varsayıyorum
  // Gerçek API: GET /api/branch-recipes/:id/aroma-options (yeni endpoint olmalı)

  // Çift slot template tipleri
  const isDoubleSlot = ['fruit_yogurt_double', 'fruit_milkshake_double'].includes(templateType);

  return (
    <Card className="mb-4 border-purple-200 bg-purple-50/50 dark:bg-purple-900/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          Aroma Seçimi
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {isDoubleSlot
            ? "Bu şablon iki aroma kombinasyonu kullanır"
            : "Müşterinin tercihine göre aroma seçin"}
        </p>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground italic">
          Aroma seçim arayüzü için ek API endpoint gerekiyor.
          (Şu an reçete malzeme listesinde "Müşteri seçer" badge'i ile gösteriliyor)
        </div>
        {/* TODO: GET /api/branch-recipes/:id/aroma-options endpoint'i ile aromaları çek */}
      </CardContent>
    </Card>
  );
}
