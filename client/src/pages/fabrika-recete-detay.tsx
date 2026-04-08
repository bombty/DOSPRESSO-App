import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, ChefHat, Clock, Users, Package, Zap, Droplets,
  Lock, Unlock, FlaskConical, AlertTriangle, Scale,
  Layers, Play, Edit, Eye, Timer, Flame, Snowflake,
} from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  cookie: "Kurabiye", cinnamon_roll: "Cinnamon Roll", donut: "Donut",
  borek_pogaca: "Börek/Poğaça", kek_pasta: "Kek & Pasta",
  tuzlu_hamur: "Tuzlu Hamur", konsantre: "Konsantre",
};

const INGREDIENT_CATEGORY_LABELS: Record<string, string> = {
  ana: "Ana Malzemeler", katki: "Katkı / İmprover", lezzet: "Lezzet",
  dolgu: "Dolgu", susleme: "Süsleme",
};

const BATCH_PRESETS_DEFAULT = [
  { name: "×1", multiplier: 1, type: "standard" },
  { name: "×1.25", multiplier: 1.25, type: "standard" },
  { name: "×1.5", multiplier: 1.5, type: "standard" },
  { name: "×1.75", multiplier: 1.75, type: "standard" },
  { name: "×2", multiplier: 2, type: "standard" },
  { name: "AR-GE %5", multiplier: 0.05, type: "arge" },
  { name: "AR-GE %10", multiplier: 0.10, type: "arge" },
  { name: "AR-GE %25", multiplier: 0.25, type: "arge" },
];

export default function FabrikaReceteDetay() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const recipeId = Number(params.id);

  const [multiplier, setMultiplier] = useState(1);
  const [activeTab, setActiveTab] = useState("malzemeler");

  const { data: recipe, isLoading } = useQuery<any>({
    queryKey: ["/api/factory/recipes", recipeId],
    queryFn: async () => {
      const res = await fetch(`/api/factory/recipes/${recipeId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Yüklenemedi");
      return res.json();
    },
    enabled: !!recipeId,
  });

  const canEdit = ["admin", "recete_gm", "sef"].includes(user?.role || "") && !recipe?.editLocked;
  const isAdmin = ["admin", "recete_gm"].includes(user?.role || "");
  const presets = recipe?.batchPresets || BATCH_PRESETS_DEFAULT;
  const totalTime = (recipe?.prepTimeMinutes || 0) + (recipe?.productionTimeMinutes || 0) + (recipe?.cleaningTimeMinutes || 0);
  const scaledOutput = Math.round((recipe?.baseBatchOutput || 1) * multiplier);

  // Malzemeleri kategoriye göre grupla
  const groupedIngredients = useMemo(() => {
    if (!recipe?.ingredients) return {};
    const groups: Record<string, any[]> = {};
    for (const ing of recipe.ingredients) {
      const cat = ing.ingredientCategory || "ana";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(ing);
    }
    return groups;
  }, [recipe?.ingredients]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Reçete bulunamadı</p>
        <Button variant="ghost" onClick={() => navigate("/fabrika/receteler")} className="mt-4">
          ← Listeye Dön
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto" data-testid="fabrika-recete-detay">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/fabrika/receteler")} className="h-8 px-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold flex items-center gap-2">
              {recipe.name}
              {recipe.editLocked && <Lock className="h-4 w-4 text-amber-500" />}
            </h1>
            <p className="text-xs text-muted-foreground">
              {recipe.code} · {CATEGORY_LABELS[recipe.category] || recipe.category} · v{recipe.version}
              {recipe.outputType === "yari_mamul" && " · Yarı Mamül"}
            </p>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => navigate(`/fabrika/receteler/${recipeId}/duzenle`)}>
                <Edit className="h-3.5 w-3.5 mr-1" /> Düzenle
              </Button>
            )}
            <Button size="sm" onClick={() => navigate(`/fabrika/receteler/${recipeId}/uretim`)}>
              <Play className="h-3.5 w-3.5 mr-1" /> Üretime Başla
            </Button>
          </div>
        </div>
      </div>

      {/* Batch Seçici */}
      <div className="px-6 py-3 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-muted-foreground">Batch:</span>
          <div className="flex gap-1 flex-wrap">
            {presets.filter((p: any) => p.type === "standard").map((p: any) => (
              <Button
                key={p.multiplier}
                size="sm"
                variant={multiplier === p.multiplier ? "default" : "outline"}
                onClick={() => setMultiplier(p.multiplier)}
                className="text-xs h-7 px-2.5"
              >
                {p.name}
              </Button>
            ))}
            <div className="w-px h-7 bg-border mx-1" />
            {presets.filter((p: any) => p.type === "arge").map((p: any) => (
              <Button
                key={p.multiplier}
                size="sm"
                variant={multiplier === p.multiplier ? "default" : "outline"}
                onClick={() => setMultiplier(p.multiplier)}
                className={cn("text-xs h-7 px-2.5", multiplier === p.multiplier ? "bg-purple-600 hover:bg-purple-700" : "text-purple-400 border-purple-700")}
              >
                <FlaskConical className="h-3 w-3 mr-1" />
                {p.name}
              </Button>
            ))}
          </div>
          <Badge variant="secondary" className="text-xs">
            = {scaledOutput} {recipe.outputUnit || "adet"}
          </Badge>
        </div>
      </div>

      {/* Üretim Parametreleri Şeridi */}
      <div className="px-6 py-2.5 border-b border-border/30 flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
        {totalTime > 0 && (
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {recipe.prepTimeMinutes > 0 && `Hazırlık ${recipe.prepTimeMinutes}dk`}
            {recipe.productionTimeMinutes > 0 && ` · Üretim ${recipe.productionTimeMinutes >= 60 ? `${Math.floor(recipe.productionTimeMinutes / 60)}s${recipe.productionTimeMinutes % 60 > 0 ? ` ${recipe.productionTimeMinutes % 60}dk` : ""}` : `${recipe.productionTimeMinutes}dk`}`}
            {recipe.cleaningTimeMinutes > 0 && ` · Temizlik ${recipe.cleaningTimeMinutes}dk`}
          </span>
        )}
        {recipe.requiredWorkers > 0 && (
          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {recipe.requiredWorkers} kişi</span>
        )}
        {recipe.equipmentKwh && Number(recipe.equipmentKwh) > 0 && (
          <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> {recipe.equipmentKwh} KWh</span>
        )}
        {recipe.waterConsumptionLt && Number(recipe.waterConsumptionLt) > 0 && (
          <span className="flex items-center gap-1"><Droplets className="h-3.5 w-3.5" /> {recipe.waterConsumptionLt} lt</span>
        )}
        {recipe.expectedWasteKg && Number(recipe.expectedWasteKg) > 0 && (
          <span className="flex items-center gap-1">Fire: {recipe.expectedWasteKg}kg</span>
        )}
      </div>

      {/* Tab'lar */}
      <div className="px-6 pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 bg-transparent p-0 border-b border-border rounded-none w-full justify-start">
            <TabsTrigger value="malzemeler" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-2 text-sm">
              Malzemeler
            </TabsTrigger>
            <TabsTrigger value="adimlar" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-2 text-sm">
              Adımlar ({recipe.steps?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="besin" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-2 text-sm">
              Besin Değerleri
            </TabsTrigger>
            <TabsTrigger value="notlar" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-2 text-sm">
              Teknik Notlar
            </TabsTrigger>
          </TabsList>

          {/* MALZEMELER TAB */}
          <TabsContent value="malzemeler" className="space-y-4 pb-8">
            {Object.entries(groupedIngredients).map(([category, ingredients]) => (
              <div key={category}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {INGREDIENT_CATEGORY_LABELS[category] || category}
                </h3>
                <div className="space-y-1">
                  {(ingredients as any[]).map((ing: any) => {
                    const scaled = Math.round(Number(ing.amount) * multiplier * 100) / 100;
                    const isKeyblend = ing.ingredientType === "keyblend";

                    return (
                      <div
                        key={ing.id}
                        className={cn(
                          "flex items-center justify-between py-2 px-3 rounded-lg",
                          isKeyblend ? "bg-purple-950/20 border border-purple-800/30" : "bg-muted/30"
                        )}
                        data-testid={`ingredient-${ing.refId}`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {isKeyblend && <Lock className="h-3.5 w-3.5 text-purple-400 shrink-0" />}
                          <span className="text-sm truncate">
                            {isKeyblend ? `Keyblend ${ing.name}` : ing.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">[{ing.refId}]</span>
                        </div>
                        <span className={cn(
                          "text-sm font-mono font-medium tabular-nums shrink-0 ml-3",
                          isKeyblend && "text-purple-300"
                        )}>
                          {Number.isInteger(scaled) ? scaled : scaled.toFixed(1)} {ing.unit}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Alerjenler */}
            {recipe.allergens && recipe.allergens.length > 0 && (
              <Card className="border-amber-800/30 bg-amber-950/10">
                <CardContent className="p-3">
                  <p className="text-sm flex items-center gap-2 text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    Alerjenler: {recipe.allergens.join(", ")}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ADIMLAR TAB */}
          <TabsContent value="adimlar" className="space-y-3 pb-8">
            {recipe.steps?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Henüz adım eklenmemiş</p>
            ) : (
              recipe.steps?.map((step: any, idx: number) => (
                <Card key={step.id} className={cn(step.isCriticalControl && "border-red-800/30")}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold shrink-0">
                        {step.stepNumber}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold mb-1">{step.title}</h4>
                        {step.isCriticalControl && (
                          <Badge variant="destructive" className="text-[10px] mb-1.5">
                            HACCP Kontrol Noktası
                          </Badge>
                        )}
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {parseIngredientRefs(step.content, recipe.ingredients || [], multiplier)}
                        </p>
                        {step.tips && (
                          <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                            💡 {step.tips}
                          </p>
                        )}
                        {step.ccpNotes && (
                          <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                            ⚠️ {step.ccpNotes}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {step.timerSeconds && (
                            <span className="flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              {Math.floor(step.timerSeconds / 60)}:{String(step.timerSeconds % 60).padStart(2, "0")}
                            </span>
                          )}
                          {step.temperatureCelsius && (
                            <span className="flex items-center gap-1">
                              <Flame className="h-3 w-3" /> {step.temperatureCelsius}°C
                            </span>
                          )}
                          {step.equipmentNeeded && (
                            <span>{step.equipmentNeeded}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* BESİN DEĞERLERİ TAB */}
          <TabsContent value="besin" className="pb-8">
            {recipe.nutritionFacts ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Scale className="h-4 w-4" />
                    Besin Değer Tablosu (100gr)
                  </CardTitle>
                  {recipe.nutritionConfidence && (
                    <p className="text-[10px] text-muted-foreground">
                      AI Güven: %{recipe.nutritionConfidence} · {recipe.nutritionCalculatedAt && new Date(recipe.nutritionCalculatedAt).toLocaleDateString("tr-TR")}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {[
                    { label: "Enerji", value: recipe.nutritionFacts.energy_kcal, unit: "kcal" },
                    { label: "Yağ", value: recipe.nutritionFacts.fat_g, unit: "g" },
                    { label: "  Doymuş yağ", value: recipe.nutritionFacts.saturated_fat_g, unit: "g" },
                    { label: "Karbonhidrat", value: recipe.nutritionFacts.carbohydrate_g, unit: "g" },
                    { label: "  Şeker", value: recipe.nutritionFacts.sugar_g, unit: "g" },
                    { label: "Lif", value: recipe.nutritionFacts.fiber_g, unit: "g" },
                    { label: "Protein", value: recipe.nutritionFacts.protein_g, unit: "g" },
                    { label: "Tuz", value: recipe.nutritionFacts.salt_g, unit: "g" },
                  ].map(row => (
                    <div key={row.label} className={cn("flex justify-between text-sm py-0.5", row.label.startsWith("  ") && "pl-4 text-muted-foreground")}>
                      <span>{row.label.trim()}</span>
                      <span className="font-mono tabular-nums">{row.value != null ? `${row.value} ${row.unit}` : "—"}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-8">
                <Scale className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">Besin değerleri henüz hesaplanmamış</p>
                <p className="text-xs text-muted-foreground mt-1">Malzeme listesi tamamlandığında AI otomatik hesaplayacak</p>
              </div>
            )}
          </TabsContent>

          {/* TEKNİK NOTLAR TAB */}
          <TabsContent value="notlar" className="pb-8">
            <div className="space-y-4">
              {recipe.technicalNotes && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Teknik Notlar</CardTitle></CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{recipe.technicalNotes}</p></CardContent>
                </Card>
              )}
              {recipe.bakersPercentage && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Baker's Yüzdeler</CardTitle></CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{recipe.bakersPercentage}</p></CardContent>
                </Card>
              )}
              {recipe.equipmentDescription && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Ekipman</CardTitle></CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">{recipe.equipmentDescription}</p></CardContent>
                </Card>
              )}
              {!recipe.technicalNotes && !recipe.bakersPercentage && (
                <p className="text-sm text-muted-foreground text-center py-8">Teknik not eklenmemiş</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Türev Reçeteler (Yarı Mamül ise) */}
      {recipe.childRecipes?.length > 0 && (
        <div className="px-6 pb-8">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Türev Mamüller ({recipe.childRecipes.length})
          </h3>
          <div className="flex gap-2 flex-wrap">
            {recipe.childRecipes.map((child: any) => (
              <Button
                key={child.id}
                variant="outline"
                size="sm"
                onClick={() => navigate(`/fabrika/receteler/${child.id}`)}
                className="text-xs"
              >
                {child.name} <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Malzeme referans parse (adım metinlerinde {0001} → chip) ──
function parseIngredientRefs(content: string, ingredients: any[], multiplier: number): React.ReactNode {
  if (!content) return null;

  const parts = content.split(/(\{[A-Za-z0-9-]+\})/g);

  return parts.map((part, i) => {
    const match = part.match(/^\{([A-Za-z0-9-]+)\}$/);
    if (!match) return part;

    const refId = match[1];
    const ingredient = ingredients.find((ing: any) => ing.refId === refId);
    if (!ingredient) return part;

    const scaled = Math.round(Number(ingredient.amount) * multiplier * 100) / 100;
    const display = Number.isInteger(scaled) ? String(scaled) : scaled.toFixed(1);
    const isKeyblend = ingredient.ingredientType === "keyblend";

    return (
      <span
        key={i}
        className={cn(
          "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold mx-0.5",
          isKeyblend
            ? "bg-purple-900/40 text-purple-200 border border-purple-700/50"
            : "bg-amber-900/30 text-amber-200 border border-amber-700/50"
        )}
        title={ingredient.name}
      >
        {isKeyblend && <Lock className="h-2.5 w-2.5" />}
        {display}{ingredient.unit}
      </span>
    );
  });
}

// Missing import for ChevronRight
import { ChevronRight } from "lucide-react";
