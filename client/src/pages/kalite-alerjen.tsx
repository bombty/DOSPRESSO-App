import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ListSkeleton } from "@/components/list-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { AlertTriangle, ShieldCheck, Search, Info, Flame, Wheat, Egg, Milk, Nut, Fish, Leaf, BadgeCheck, HelpCircle } from "lucide-react";

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

interface RecipeSummary {
  id: number;
  name: string;
  code: string;
  category: string | null;
  outputType: string;
  coverPhotoUrl: string | null;
  expectedUnitWeight: number | null;
  per100g: Per100g;
  allergens: string[];
  ingredientCount: number;
  matchedCount: number;
  approvedCount: number;
  unmatchedNames: string[];
  isVerified: boolean;
  verificationReason: string | null;
  lowConfidenceCount: number;
  minConfidence: number | null;
  grammageApproved?: boolean;
  grammageApprovalDate?: string | null;
}

interface RecipeDetail extends RecipeSummary {
  description: string | null;
  baseBatchOutput: number | null;
  perPortion: Per100g | null;
  ingredients: Array<{
    name: string;
    amount: number;
    unit: string;
    matched: boolean;
    matchedName?: string;
    allergens: string[];
    confidence?: number | null;
    source?: string | null;
    verifiedBy?: string | null;
    verifiedByName?: string | null;
    updatedAt?: string | null;
  }>;
}

interface ListResponse {
  verified: RecipeSummary[];
  unverified: RecipeSummary[];
  stats: { verified: number; unverified: number; totalIngredientsCovered: number };
}

const ALLERGEN_ICON: Record<string, any> = {
  "gluten": Wheat,
  "süt": Milk,
  "yumurta": Egg,
  "fındık": Nut,
  "yer fıstığı": Nut,
  "soya": Leaf,
  "balık": Fish,
};

function AllergenBadge({ name }: { name: string }) {
  const Icon = ALLERGEN_ICON[name] ?? AlertTriangle;
  return (
    <Badge variant="secondary" className="gap-1" data-testid={`badge-allergen-${name}`}>
      <Icon className="w-3 h-3" />
      <span className="capitalize">{name}</span>
    </Badge>
  );
}

function VerificationBadge({
  confidence,
  source,
  verifiedByName,
  updatedAt,
  matched,
}: {
  confidence?: number | null;
  source?: string | null;
  verifiedByName?: string | null;
  updatedAt?: string | null;
  matched: boolean;
}) {
  if (!matched) return null;

  const isApproved = confidence === 100 && (source ?? "").toLowerCase().includes("manual_verified");
  const formattedDate = updatedAt
    ? new Date(updatedAt).toLocaleDateString("tr-TR", { year: "numeric", month: "short", day: "numeric" })
    : null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {isApproved ? (
          <Badge
            className="gap-1 shrink-0 bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-700 dark:border-emerald-600"
            data-testid="badge-ingredient-approved"
          >
            <BadgeCheck className="w-3 h-3" />
            Onaylı
          </Badge>
        ) : (
          <Badge
            className="gap-1 shrink-0 bg-amber-500 text-white border-amber-600 dark:bg-amber-600 dark:border-amber-500"
            data-testid="badge-ingredient-estimated"
          >
            <HelpCircle className="w-3 h-3" />
            Tahmini
          </Badge>
        )}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1 text-xs">
          <div className="font-semibold">
            {isApproved ? "Gıda mühendisi onaylı" : "Tahmini değer"}
          </div>
          {isApproved ? (
            <>
              {verifiedByName ? (
                <div>Onaylayan: <span className="font-medium">{verifiedByName}</span></div>
              ) : (
                <div className="opacity-80">Onaylayan kullanıcı kaydedilmemiş</div>
              )}
              {formattedDate && <div>Son güncelleme: <span className="font-medium">{formattedDate}</span></div>}
              <div className="text-[11px] opacity-80">
                Bu malzemenin besin değerleri gıda mühendisi tarafından doğrulanmıştır.
              </div>
            </>
          ) : (
            <>
              <div>Kaynak: <span className="font-medium">{source || "manual"}</span></div>
              {confidence != null && <div>Güven: <span className="font-medium">%{confidence}</span></div>}
              {formattedDate && <div>Son güncelleme: <span className="font-medium">{formattedDate}</span></div>}
              <div className="text-[11px] opacity-80">
                Henüz gıda mühendisi onayından geçmedi. Etiket basımı öncesi onaylanması önerilir.
              </div>
            </>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function NutritionRow({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums" data-testid={`text-nutri-${label}`}>{value} {unit}</span>
    </div>
  );
}

function RecipeCard({ recipe, onOpen }: { recipe: RecipeSummary; onOpen: (id: number) => void }) {
  return (
    <Card
      className="hover-elevate cursor-pointer overflow-hidden"
      onClick={() => onOpen(recipe.id)}
      data-testid={`card-recipe-${recipe.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base truncate" data-testid={`text-recipe-name-${recipe.id}`}>
              {recipe.name}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {recipe.code}{recipe.category ? ` · ${recipe.category}` : ""}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-1 shrink-0 items-end">
            {recipe.isVerified ? (
              <Badge variant="default" className="gap-1">
                <ShieldCheck className="w-3 h-3" /> Doğrulandı
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <AlertTriangle className="w-3 h-3" /> Eksik
              </Badge>
            )}
            {recipe.grammageApproved ? (
              <Badge
                className="gap-1 bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-700 dark:border-emerald-600"
                data-testid={`badge-grammage-${recipe.id}`}
              >
                <BadgeCheck className="w-3 h-3" /> Gramaj Onaylı
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="gap-1 border-amber-600/40 text-amber-500"
                data-testid={`badge-grammage-pending-${recipe.id}`}
              >
                <AlertTriangle className="w-3 h-3" /> Gramaj Onaysız
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!recipe.isVerified && recipe.verificationReason && (
          <div
            className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-900 dark:text-amber-200"
            data-testid={`text-unverified-reason-${recipe.id}`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <span>{recipe.verificationReason}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">Malzeme onayı</span>
          {recipe.ingredientCount > 0 && recipe.approvedCount === recipe.ingredientCount ? (
            <Badge
              className="gap-1 shrink-0 bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-700 dark:border-emerald-600"
              data-testid={`badge-fully-approved-${recipe.id}`}
            >
              <BadgeCheck className="w-3 h-3" />
              Tam onaylı ({recipe.approvedCount}/{recipe.ingredientCount})
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="gap-1 shrink-0 tabular-nums"
              data-testid={`badge-approval-count-${recipe.id}`}
            >
              <BadgeCheck className="w-3 h-3" />
              {recipe.approvedCount}/{recipe.ingredientCount} onaylı
            </Badge>
          )}
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1.5">Alerjenler</div>
          {recipe.allergens.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {recipe.allergens.map(a => <AllergenBadge key={a} name={a} />)}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground italic">Bilinen alerjen yok</span>
          )}
        </div>
        <div className="flex items-center justify-between bg-muted/40 rounded-md px-3 py-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Flame className="w-3 h-3" /> 100g enerji
          </span>
          <span className="font-semibold tabular-nums" data-testid={`text-kcal-${recipe.id}`}>
            {recipe.per100g.energy_kcal} kcal
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function RecipeDetailDialog({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { data, isLoading, error } = useQuery<RecipeDetail>({
    queryKey: ["/api/quality/allergens/recipes", id],
    enabled: id !== null,
  });

  return (
    <Dialog open={id !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="dialog-recipe-detail">
        <DialogHeader>
          <DialogTitle data-testid="text-detail-name">{data?.name ?? "Yükleniyor..."}</DialogTitle>
          <DialogDescription>
            {data?.code}{data?.category ? ` · ${data.category}` : ""}
            {data?.expectedUnitWeight ? ` · ${data.expectedUnitWeight} gr/porsiyon` : ""}
          </DialogDescription>
        </DialogHeader>

        {isLoading && <ListSkeleton count={4} />}
        {error && <ErrorState message={`Detay yüklenemedi: ${String(error)}`} />}

        {data && (
          <ScrollArea className="flex-1 pr-3 -mr-3">
            <div className="space-y-4 pb-2">
              {/* Verify status banner */}
              {!data.isVerified && (
                <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium text-amber-900 dark:text-amber-200" data-testid="text-detail-unverified-reason">
                      {data.verificationReason ?? "Henüz tam doğrulanmadı"}
                    </div>
                    <div className="text-xs text-amber-800/80 dark:text-amber-200/80 mt-0.5">
                      {data.matchedCount}/{data.ingredientCount} malzemenin besin değeri doğrulandı.
                      {data.unmatchedNames.length > 0 && (
                        <> Eksik: {data.unmatchedNames.slice(0, 3).join(", ")}{data.unmatchedNames.length > 3 ? "..." : ""}</>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Allergens */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Alerjenler</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.allergens.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5" data-testid="container-detail-allergens">
                      {data.allergens.map(a => <AllergenBadge key={a} name={a} />)}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">Bilinen alerjen yok</span>
                  )}
                </CardContent>
              </Card>

              {/* Nutrition table */}
              <div className="grid sm:grid-cols-2 gap-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">100 gr başına</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <NutritionRow label="Enerji" value={data.per100g.energy_kcal} unit="kcal" />
                    <NutritionRow label="Yağ" value={data.per100g.fat_g} unit="g" />
                    <NutritionRow label="  Doymuş yağ" value={data.per100g.saturated_fat_g} unit="g" />
                    <NutritionRow label="Karbonhidrat" value={data.per100g.carbohydrate_g} unit="g" />
                    <NutritionRow label="  Şeker" value={data.per100g.sugar_g} unit="g" />
                    <NutritionRow label="Lif" value={data.per100g.fiber_g} unit="g" />
                    <NutritionRow label="Protein" value={data.per100g.protein_g} unit="g" />
                    <NutritionRow label="Tuz" value={data.per100g.salt_g} unit="g" />
                  </CardContent>
                </Card>
                {data.perPortion && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        Porsiyon başına ({data.expectedUnitWeight} gr)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <NutritionRow label="Enerji" value={data.perPortion.energy_kcal} unit="kcal" />
                      <NutritionRow label="Yağ" value={data.perPortion.fat_g} unit="g" />
                      <NutritionRow label="  Doymuş yağ" value={data.perPortion.saturated_fat_g} unit="g" />
                      <NutritionRow label="Karbonhidrat" value={data.perPortion.carbohydrate_g} unit="g" />
                      <NutritionRow label="  Şeker" value={data.perPortion.sugar_g} unit="g" />
                      <NutritionRow label="Lif" value={data.perPortion.fiber_g} unit="g" />
                      <NutritionRow label="Protein" value={data.perPortion.protein_g} unit="g" />
                      <NutritionRow label="Tuz" value={data.perPortion.salt_g} unit="g" />
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Ingredient breakdown */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Malzeme bazlı alerjen dökümü</CardTitle>
                  <CardDescription className="text-xs">
                    {data.matchedCount}/{data.ingredientCount} malzeme besin değer veritabanında eşleşti
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="divide-y divide-border/50">
                    {data.ingredients.map((ing, idx) => (
                      <div key={idx} className="py-2 flex items-start justify-between gap-3" data-testid={`row-ingredient-${idx}`}>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{ing.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {ing.amount} {ing.unit}
                            {ing.matched && ing.matchedName && ing.matchedName.toLowerCase() !== ing.name.toLowerCase() && (
                              <> · eşleşen: {ing.matchedName}</>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-1 shrink-0 max-w-[55%]">
                          <VerificationBadge
                            matched={ing.matched}
                            confidence={ing.confidence}
                            source={ing.source}
                            verifiedByName={ing.verifiedByName}
                            updatedAt={ing.updatedAt}
                          />
                          {ing.allergens.map(a => <AllergenBadge key={a} name={a} />)}
                          {!ing.matched && (
                            <Badge variant="outline" className="text-xs">eşleşmedi</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="text-xs text-muted-foreground flex items-start gap-1.5 px-1">
                <Info className="w-3 h-3 mt-0.5 shrink-0" />
                <span>
                  Besin değerleri 100 gr ürün başına hesaplanmıştır ve fabrika reçete malzemelerinden
                  ağırlık oranlı olarak türetilmiştir. AB/TR yönetmeliği uyarınca 14 majör alerjen takip edilir.
                </span>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function KaliteAlerjenPage() {
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [tab, setTab] = useState("verified");
  const [sortBy, setSortBy] = useState<"default" | "approval-desc" | "approval-asc">("default");
  const [onlyFullyApproved, setOnlyFullyApproved] = useState(false);

  const { data, isLoading, error } = useQuery<ListResponse>({
    queryKey: ["/api/quality/allergens/recipes"],
  });

  const approvalRatio = (r: RecipeSummary) =>
    r.ingredientCount > 0 ? r.approvedCount / r.ingredientCount : 0;

  const processRecipes = (list: RecipeSummary[]) => {
    const q = search.trim().toLowerCase();
    let out = list;
    if (q) {
      out = out.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        (r.category || "").toLowerCase().includes(q) ||
        r.allergens.some(a => a.toLowerCase().includes(q))
      );
    }
    if (onlyFullyApproved) {
      out = out.filter(r => r.ingredientCount > 0 && r.approvedCount === r.ingredientCount);
    }
    if (sortBy !== "default") {
      out = [...out].sort((a, b) => {
        const ra = approvalRatio(a);
        const rb = approvalRatio(b);
        if (ra === rb) return a.name.localeCompare(b.name, "tr");
        return sortBy === "approval-desc" ? rb - ra : ra - rb;
      });
    }
    return out;
  };

  const verified = useMemo(() => processRecipes(data?.verified ?? []), [data, search, sortBy, onlyFullyApproved]);
  const unverified = useMemo(() => processRecipes(data?.unverified ?? []), [data, search, sortBy, onlyFullyApproved]);

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-kalite-alerjen">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Alerjen & Besin Tablosu
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ürünlerimizin alerjen bilgileri ve 100 gr başına besin değerleri.
          </p>
        </div>
        {data && (
          <div className="flex gap-2">
            <Badge variant="default" className="gap-1" data-testid="badge-stats-verified">
              <ShieldCheck className="w-3 h-3" /> {data.stats.verified} doğrulanmış
            </Badge>
            <Badge variant="outline" className="gap-1" data-testid="badge-stats-unverified">
              <AlertTriangle className="w-3 h-3" /> {data.stats.unverified} eksik
            </Badge>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Ürün, kod, alerjen ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-allergen"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="sm:w-56" data-testid="select-sort-approval">
            <SelectValue placeholder="Sıralama" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default" data-testid="option-sort-default">Varsayılan sıralama</SelectItem>
            <SelectItem value="approval-desc" data-testid="option-sort-desc">Onay oranı: yüksekten düşüğe</SelectItem>
            <SelectItem value="approval-asc" data-testid="option-sort-asc">Onay oranı: düşükten yükseğe</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 px-3 rounded-md border border-border h-9 sm:h-auto">
          <Switch
            id="toggle-only-fully-approved"
            checked={onlyFullyApproved}
            onCheckedChange={setOnlyFullyApproved}
            data-testid="switch-only-fully-approved"
          />
          <Label htmlFor="toggle-only-fully-approved" className="text-sm whitespace-nowrap cursor-pointer">
            Yalnızca tam onaylı
          </Label>
        </div>
      </div>

      {isLoading && <ListSkeleton count={6} />}
      {error && <ErrorState message={`Liste yüklenemedi: ${String(error)}`} />}

      {data && (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="verified" data-testid="tab-verified">
              Doğrulanmış ({verified.length})
            </TabsTrigger>
            <TabsTrigger value="unverified" data-testid="tab-unverified">
              Eksik veri ({unverified.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="verified" className="mt-4">
            {verified.length === 0 ? (
              <EmptyState
                title="Sonuç bulunamadı"
                description="Aramanıza uygun doğrulanmış ürün yok."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {verified.map(r => <RecipeCard key={r.id} recipe={r} onOpen={setOpenId} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="unverified" className="mt-4 space-y-3">
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="text-amber-900 dark:text-amber-200">
                Aşağıdaki reçetelerin bazı malzemelerinin besin değerleri henüz Sema Gıda tarafından
                doğrulanmadı. Görüntülenen bilgiler eksik olabilir.
              </div>
            </div>
            {unverified.length === 0 ? (
              <EmptyState
                title="Hepsi doğrulanmış"
                description="Tüm ürünlerin besin değerleri ve alerjenleri doğrulandı."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {unverified.map(r => <RecipeCard key={r.id} recipe={r} onOpen={setOpenId} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <RecipeDetailDialog id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
