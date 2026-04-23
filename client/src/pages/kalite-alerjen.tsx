import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ListSkeleton } from "@/components/list-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { downloadEtiketPDF } from "@/lib/etiketPDF";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertTriangle, ShieldCheck, Search, Info, Flame, Wheat, Egg, Milk, Nut, Fish, Leaf, BadgeCheck, HelpCircle, Wrench, Printer, FileWarning, History, Check, ChevronsUpDown, X, Download, FileSpreadsheet } from "lucide-react";

const FIX_ROLES = ["admin", "kalite_yoneticisi", "gida_muhendisi", "recete_gm", "sef", "ust_yonetim"];

const PRINT_LOG_ROLES = new Set([
  "admin", "ceo", "ust_yonetim",
  "fabrika_muduru", "fabrika_mudur",
  "kalite_yoneticisi", "kalite_kontrol",
  "gida_muhendisi", "recete_gm",
]);

interface PrintLogEntry {
  id: number;
  recipeId: number;
  recipeCode: string | null;
  recipeName: string | null;
  printedById: string | null;
  printedByName: string;
  printedByRole: string | null;
  isDraft: boolean;
  grammageApproved: boolean;
  draftReason: string | null;
  printedAt: string;
}

interface PrintLogResponse {
  logs: PrintLogEntry[];
  stats: {
    total: number;
    draftCount: number;
    approvedCount: number;
    returned?: number;
    offset?: number;
    limit?: number;
    hasMore?: boolean;
  };
}

const PRINT_LOG_PAGE_SIZE = 200;

const PRINT_LOG_FILTERS_KEY = "kalite-alerjen:printlog-filters";

interface PrintLogFilters {
  recipeId: number | null;
  from: string;
  to: string;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE_RE.test(value)) return false;
  const d = new Date(value + "T00:00:00");
  return !isNaN(d.getTime());
}

function loadPrintLogFilters(): PrintLogFilters {
  if (typeof window === "undefined") return { recipeId: null, from: "", to: "" };
  try {
    const raw = window.localStorage.getItem(PRINT_LOG_FILTERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        recipeId: typeof parsed.recipeId === "number" && Number.isFinite(parsed.recipeId) ? parsed.recipeId : null,
        from: isValidIsoDate(parsed.from) ? parsed.from : "",
        to: isValidIsoDate(parsed.to) ? parsed.to : "",
      };
    }
  } catch {}
  return { recipeId: null, from: "", to: "" };
}

function PrintLogPanel() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<PrintLogFilters>(() => loadPrintLogFilters());
  const [recipePopoverOpen, setRecipePopoverOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(PRINT_LOG_FILTERS_KEY, JSON.stringify(filters));
    } catch {}
  }, [filters]);

  const filterParams = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.recipeId) params.set("recipeId", String(filters.recipeId));
    if (filters.from) params.set("from", new Date(filters.from + "T00:00:00").toISOString());
    if (filters.to) {
      const toEnd = new Date(filters.to + "T23:59:59.999");
      params.set("to", toEnd.toISOString());
    }
    return params;
  }, [filters]);

  const buildQueryUrl = (offset: number) => {
    const params = new URLSearchParams(filterParams);
    params.set("limit", String(PRINT_LOG_PAGE_SIZE));
    params.set("offset", String(offset));
    return `/api/quality/allergens/print-log?${params.toString()}`;
  };

  const {
    data: infiniteData,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<PrintLogResponse>({
    queryKey: ["/api/quality/allergens/print-log", filters],
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }) => {
      const res = await fetch(buildQueryUrl(Number(pageParam) || 0), {
        credentials: "include",
        signal,
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    getNextPageParam: (lastPage) => {
      const stats = lastPage.stats;
      if (!stats?.hasMore) return undefined;
      const nextOffset = (stats.offset ?? 0) + (stats.returned ?? lastPage.logs.length);
      return nextOffset;
    },
  });
  const [exporting, setExporting] = useState<"csv" | "xlsx" | null>(null);

  const handleExport = async (format: "csv" | "xlsx") => {
    try {
      setExporting(format);
      const exportParams = new URLSearchParams(filterParams);
      exportParams.set("format", format);
      const res = await fetch(
        `/api/quality/allergens/print-log/export?${exportParams.toString()}`,
        { credentials: "include" },
      );
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const match = cd.match(/filename="?([^";]+)"?/i);
      const filename =
        match?.[1] ||
        `etiket_basim_gecmisi_${new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-")}.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Dışa aktarım hazır", description: filename });
    } catch (err) {
      toast({
        title: "Dışa aktarım başarısız",
        description: String((err as Error).message || err),
        variant: "destructive",
      });
    } finally {
      setExporting(null);
    }
  };

  const data = useMemo<PrintLogResponse | undefined>(() => {
    if (!infiniteData) return undefined;
    const allLogs = infiniteData.pages.flatMap((p) => p.logs);
    const lastStats = infiniteData.pages[infiniteData.pages.length - 1]?.stats;
    return {
      logs: allLogs,
      stats: {
        total: lastStats?.total ?? allLogs.length,
        draftCount: lastStats?.draftCount ?? 0,
        approvedCount: lastStats?.approvedCount ?? 0,
        returned: allLogs.length,
        hasMore: lastStats?.hasMore,
      },
    };
  }, [infiniteData]);

  const recipesQuery = useQuery<ListResponse>({
    queryKey: ["/api/quality/allergens/recipes"],
  });

  const allRecipes = useMemo(() => {
    if (!recipesQuery.data) return [] as RecipeSummary[];
    return [...recipesQuery.data.verified, ...recipesQuery.data.unverified]
      .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [recipesQuery.data]);

  const selectedRecipe = useMemo(
    () => allRecipes.find(r => r.id === filters.recipeId) ?? null,
    [allRecipes, filters.recipeId],
  );

  const hasActiveFilters = filters.recipeId !== null || !!filters.from || !!filters.to;

  return (
    <Card data-testid="card-print-log">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4" />
              Etiket Basım Geçmişi
            </CardTitle>
            <CardDescription className="text-xs">
              Gıda güvenliği denetim izi — her PDF basımı kim, ne zaman, taslak mı / onaylı mı.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {data && (
              <>
                <Badge variant="outline" data-testid="badge-printlog-total">
                  Toplam: {data.stats.total}
                </Badge>
                {data.stats.total > data.logs.length && (
                  <Badge
                    variant="outline"
                    className="border-muted-foreground/40 text-muted-foreground"
                    data-testid="badge-printlog-loaded"
                  >
                    Yüklenen: {data.logs.length}
                  </Badge>
                )}
                <Badge
                  variant="default"
                  className="bg-emerald-600 text-white border-emerald-700"
                  data-testid="badge-printlog-approved"
                >
                  Onaylı: {data.stats.approvedCount}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-amber-600/40 text-amber-600 dark:text-amber-400"
                  data-testid="badge-printlog-draft"
                >
                  Taslak: {data.stats.draftCount}
                </Badge>
              </>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={exporting !== null || !data || data.stats.total === 0}
              onClick={() => handleExport("csv")}
              data-testid="button-printlog-export-csv"
            >
              <Download className="w-3.5 h-3.5" />
              {exporting === "csv" ? "Hazırlanıyor…" : "CSV indir"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={exporting !== null || !data || data.stats.total === 0}
              onClick={() => handleExport("xlsx")}
              data-testid="button-printlog-export-xlsx"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              {exporting === "xlsx" ? "Hazırlanıyor…" : "Excel indir"}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2 pt-3">
          <div className="flex flex-col gap-1 min-w-[220px] flex-1">
            <Label className="text-xs text-muted-foreground">Reçete</Label>
            <Popover open={recipePopoverOpen} onOpenChange={setRecipePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={recipePopoverOpen}
                  className="justify-between font-normal"
                  data-testid="button-printlog-recipe"
                >
                  <span className="truncate">
                    {selectedRecipe
                      ? `${selectedRecipe.name}${selectedRecipe.code ? ` (${selectedRecipe.code})` : ""}`
                      : "Tüm reçeteler"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Reçete ara..." data-testid="input-printlog-recipe-search" />
                  <CommandList>
                    <CommandEmpty>Reçete bulunamadı.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="__all__"
                        onSelect={() => {
                          setFilters((f) => ({ ...f, recipeId: null }));
                          setRecipePopoverOpen(false);
                        }}
                        data-testid="item-printlog-recipe-all"
                      >
                        <Check className={`mr-2 h-4 w-4 ${filters.recipeId === null ? "opacity-100" : "opacity-0"}`} />
                        Tüm reçeteler
                      </CommandItem>
                      {allRecipes.map((r) => (
                        <CommandItem
                          key={r.id}
                          value={`${r.name} ${r.code}`}
                          onSelect={() => {
                            setFilters((f) => ({ ...f, recipeId: r.id }));
                            setRecipePopoverOpen(false);
                          }}
                          data-testid={`item-printlog-recipe-${r.id}`}
                        >
                          <Check className={`mr-2 h-4 w-4 ${filters.recipeId === r.id ? "opacity-100" : "opacity-0"}`} />
                          <span className="truncate">{r.name}</span>
                          {r.code && <span className="ml-2 text-xs text-muted-foreground">{r.code}</span>}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Başlangıç</Label>
            <Input
              type="date"
              value={filters.from}
              max={filters.to || undefined}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              className="w-[160px]"
              data-testid="input-printlog-from"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Bitiş</Label>
            <Input
              type="date"
              value={filters.to}
              min={filters.from || undefined}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              className="w-[160px]"
              data-testid="input-printlog-to"
            />
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters({ recipeId: null, from: "", to: "" })}
              data-testid="button-printlog-clear-filters"
            >
              <X className="w-4 h-4 mr-1" />
              Temizle
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading && <ListSkeleton count={3} />}
        {error && <ErrorState message={`Geçmiş yüklenemedi: ${String(error)}`} />}
        {data && data.logs.length === 0 && (
          <EmptyState
            title="Henüz basım kaydı yok"
            description="İlk etiket basıldığında burada listelenecek."
          />
        )}
        {data && data.logs.length > 0 && (
          <>
          <ScrollArea className="max-h-96">
            <div className="divide-y divide-border/50">
              {data.logs.map((log) => (
                <div
                  key={log.id}
                  className="py-2 flex items-start justify-between gap-3"
                  data-testid={`row-printlog-${log.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate" data-testid={`text-printlog-recipe-${log.id}`}>
                      {log.recipeName ?? "—"}
                      {log.recipeCode && (
                        <span className="text-xs text-muted-foreground ml-2">{log.recipeCode}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {log.printedByName}
                      {log.printedByRole && <span className="opacity-70"> · {log.printedByRole}</span>}
                      <span className="opacity-70"> · {new Date(log.printedAt).toLocaleString("tr-TR")}</span>
                    </div>
                    {log.draftReason && (
                      <div className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                        {log.draftReason}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0">
                    {log.isDraft ? (
                      <Badge
                        variant="outline"
                        className="gap-1 border-amber-600/40 text-amber-600 dark:text-amber-400"
                        data-testid={`badge-printlog-status-${log.id}`}
                      >
                        <FileWarning className="w-3 h-3" /> Taslak
                      </Badge>
                    ) : (
                      <Badge
                        className="gap-1 bg-emerald-600 text-white border-emerald-700"
                        data-testid={`badge-printlog-status-${log.id}`}
                      >
                        <BadgeCheck className="w-3 h-3" /> Onaylı
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          </>
        )}
        {data && data.logs.length > 0 && hasNextPage && (
          <div className="flex justify-center pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              data-testid="button-printlog-load-more"
            >
              {isFetchingNextPage
                ? "Yükleniyor..."
                : `Daha Fazla Yükle (${data.stats.total - data.logs.length} kalan)`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getFixTarget(
  recipeId: number,
  reason: string | null,
  ingredientCount: number,
): { href: string; label: string; hint: string } {
  const needsRecipeEdit = ingredientCount === 0 || (reason && reason.toLowerCase().includes("malzeme listesi"));
  if (needsRecipeEdit) {
    return { href: `/fabrika/receteler/${recipeId}/duzenle`, label: "Düzelt", hint: "Reçete editörü" };
  }
  return { href: "/kalite/besin-onay", label: "Düzelt", hint: "Besin onayı paneli" };
}

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
  grammageApprovalUserName?: string | null;
  grammageApprovalNote?: string | null;
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

function RecipeCard({ recipe, onOpen, canFix }: { recipe: RecipeSummary; onOpen: (id: number) => void; canFix: boolean }) {
  const fixTarget = !recipe.isVerified ? getFixTarget(recipe.id, recipe.verificationReason, recipe.ingredientCount) : null;
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
            <div className="flex-1 space-y-1.5">
              <div>{recipe.verificationReason}</div>
              {canFix && fixTarget && (
                <Link href={fixTarget.href}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={(e) => e.stopPropagation()}
                    data-testid={`button-fix-card-${recipe.id}`}
                  >
                    <Wrench className="w-3 h-3" />
                    {fixTarget.label}
                    <span className="opacity-70">· {fixTarget.hint}</span>
                  </Button>
                </Link>
              )}
            </div>
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

const PRINT_OVERRIDE_ROLES = new Set(["admin", "ceo", "fabrika_muduru", "fabrika_mudur", "kalite_yoneticisi", "gida_muhendisi", "recete_gm"]);

function RecipeDetailDialog({ id, onClose, canFix }: { id: number | null; onClose: () => void; canFix: boolean }) {
  const { data, isLoading, error } = useQuery<RecipeDetail>({
    queryKey: ["/api/quality/allergens/recipes", id],
    enabled: id !== null,
  });
  const { user } = useAuth();
  const { toast } = useToast();
  const [showWarning, setShowWarning] = useState(false);
  const [printing, setPrinting] = useState(false);

  const userRole = (user as any)?.role ?? "";
  const canOverride = PRINT_OVERRIDE_ROLES.has(userRole);
  const today = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  })();
  const [productionInfoOpen, setProductionInfoOpen] = useState(false);
  const [productionDate, setProductionDate] = useState(today);
  const [expiryDate, setExpiryDate] = useState("");
  const [lotNumber, setLotNumber] = useState("");

  const productionInfoValid =
    productionDate.trim() !== "" && expiryDate.trim() !== "" && lotNumber.trim() !== "";

  const buildAndPrint = async (asDraft: boolean) => {
    if (!data) return;
    if (!productionInfoValid) {
      toast({
        title: "Üretim bilgileri eksik",
        description: "Etiket basımı için üretim tarihi, SKT ve lot numarası zorunludur.",
        variant: "destructive",
      });
      return;
    }
    setPrinting(true);
    try {
      const productUrl = `${window.location.origin}/kalite/alerjen?recipe=${data.id}`;
      const isDraftPrint = asDraft || !data.grammageApproved;
      const draftReason = !data.grammageApproved ? "Gramaj onayi bekliyor" : (asDraft ? "Manuel taslak" : undefined);
      await downloadEtiketPDF({
        name: data.name,
        code: data.code,
        category: data.category,
        expectedUnitWeight: data.expectedUnitWeight,
        per100g: data.per100g,
        perPortion: data.perPortion,
        allergens: data.allergens,
        ingredients: data.ingredients.map(i => ({ name: i.name, matched: i.matched, allergens: i.allergens })),
        grammageApproved: !!data.grammageApproved,
        grammageApprovalUserName: data.grammageApprovalUserName ?? null,
        grammageApprovalDate: data.grammageApprovalDate ?? null,
        isDraft: isDraftPrint,
        draftReason,
        productionDate,
        expiryDate,
        lotNumber: lotNumber.trim(),
        productUrl,
      });
      // Task #187 — denetim logu (best-effort, başarısızlığı kullanıcıya yansıtma)
      try {
        await apiRequest("POST", `/api/quality/allergens/recipes/${data.id}/print-log`, {
          isDraft: isDraftPrint,
          grammageApproved: !!data.grammageApproved,
          draftReason: draftReason ?? null,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/quality/allergens/print-log"] });
      } catch (logErr) {
        console.warn("Etiket basım logu kaydedilemedi:", logErr);
      }
      toast({
        title: asDraft || !data.grammageApproved ? "Taslak etiket indirildi" : "Etiket PDF'i indirildi",
        description: asDraft || !data.grammageApproved
          ? "Reçete henüz gıda mühendisi tarafından onaylanmadığı için TASLAK filigranı eklendi."
          : `${data.grammageApprovalUserName ?? "Gıda Mühendisi"} onaylı etiket başarıyla oluşturuldu.`,
      });
    } catch (e: any) {
      toast({ title: "Etiket oluşturulamadı", description: String(e?.message ?? e), variant: "destructive" });
    } finally {
      setPrinting(false);
      setShowWarning(false);
    }
  };

  const handlePrintClick = () => {
    if (!data) return;
    setProductionInfoOpen(true);
  };

  const handleProductionInfoConfirm = () => {
    if (!productionInfoValid || !data) return;
    setProductionInfoOpen(false);
    if (!data.grammageApproved) {
      setShowWarning(true);
      return;
    }
    buildAndPrint(false);
  };

  return (
    <Dialog open={id !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="dialog-recipe-detail">
        <DialogHeader>
          <div className="flex flex-row items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <DialogTitle data-testid="text-detail-name">{data?.name ?? "Yükleniyor..."}</DialogTitle>
              <DialogDescription>
                {data?.code}{data?.category ? ` · ${data.category}` : ""}
                {data?.expectedUnitWeight ? ` · ${data.expectedUnitWeight} gr/porsiyon` : ""}
              </DialogDescription>
            </div>
            {data && (
              <div className="flex items-center gap-2 shrink-0">
                {data.grammageApproved ? (
                  <Badge
                    className="gap-1 bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-700 dark:border-emerald-600"
                    data-testid="badge-detail-grammage-approved"
                  >
                    <BadgeCheck className="w-3 h-3" /> Gıda Müh. Onaylı
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 border-amber-600/40 text-amber-600 dark:text-amber-400" data-testid="badge-detail-grammage-pending">
                    <AlertTriangle className="w-3 h-3" /> Onay Bekliyor
                  </Badge>
                )}
                <Button
                  size="sm"
                  onClick={handlePrintClick}
                  disabled={printing || !data}
                  data-testid="button-print-etiket"
                >
                  <Printer className="w-3.5 h-3.5" />
                  {printing ? "Hazırlanıyor..." : "Etiket Yazdır"}
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        {isLoading && <ListSkeleton count={4} />}
        {error && <ErrorState message={`Detay yüklenemedi: ${String(error)}`} />}

        {data && (
          <ScrollArea className="flex-1 pr-3 -mr-3">
            <div className="space-y-4 pb-2">
              {/* Verify status banner */}
              {!data.isVerified && (() => {
                const fixTarget = getFixTarget(data.id, data.verificationReason, data.ingredientCount);
                return (
                  <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="font-medium text-amber-900 dark:text-amber-200" data-testid="text-detail-unverified-reason">
                        {data.verificationReason ?? "Henüz tam doğrulanmadı"}
                      </div>
                      <div className="text-xs text-amber-800/80 dark:text-amber-200/80">
                        {data.matchedCount}/{data.ingredientCount} malzemenin besin değeri doğrulandı.
                        {data.unmatchedNames.length > 0 && (
                          <> Eksik: {data.unmatchedNames.slice(0, 3).join(", ")}{data.unmatchedNames.length > 3 ? "..." : ""}</>
                        )}
                      </div>
                      {canFix && fixTarget && (
                        <Link href={fixTarget.href}>
                          <Button size="sm" variant="outline" className="gap-1" data-testid="button-fix-detail">
                            <Wrench className="w-3 h-3" />
                            {fixTarget.label}
                            <span className="opacity-70">· {fixTarget.hint}</span>
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })()}

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

      <Dialog open={productionInfoOpen} onOpenChange={setProductionInfoOpen}>
        <DialogContent data-testid="dialog-production-info">
          <DialogHeader>
            <DialogTitle>Üretim Bilgileri</DialogTitle>
            <DialogDescription>
              Etiket basımı için üretim tarihi, son kullanma tarihi (SKT) ve lot/parti numarası
              <strong> zorunludur</strong>. Bu alanlar boş bırakılırsa basım yapılamaz.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="input-production-date">Üretim Tarihi</Label>
              <Input
                id="input-production-date"
                type="date"
                value={productionDate}
                onChange={(e) => setProductionDate(e.target.value)}
                data-testid="input-production-date"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="input-expiry-date">Son Kullanma Tarihi (SKT)</Label>
              <Input
                id="input-expiry-date"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                data-testid="input-expiry-date"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="input-lot-number">Lot / Parti Numarası</Label>
              <Input
                id="input-lot-number"
                placeholder="Örn: L240423-01"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                data-testid="input-lot-number"
              />
            </div>
            {!productionInfoValid && (
              <div className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>Tüm alanlar doldurulmadan etiket basılamaz.</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProductionInfoOpen(false)}
              data-testid="button-cancel-production-info"
            >
              Vazgeç
            </Button>
            <Button
              onClick={handleProductionInfoConfirm}
              disabled={!productionInfoValid}
              data-testid="button-confirm-production-info"
            >
              <Printer className="w-3.5 h-3.5" />
              Devam Et
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent data-testid="dialog-grammage-warning">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileWarning className="w-5 h-5 text-amber-500" />
              Bu reçete henüz onaylanmadı
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                <strong>{data?.name}</strong> reçetesinin gramajı henüz gıda mühendisi tarafından onaylanmamıştır.
                Müşteriye sunulacak etiketin basılması <strong>varsayılan olarak engellenmiştir</strong>.
              </span>
              <span className="block">
                {canOverride
                  ? "Yönetici yetkiniz var. Yine de yazdırmak isterseniz çıkacak PDF üzerinde \"TASLAK — Gıda Müh. onayı bekliyor\" filigranı bulunacaktır."
                  : "Etiket basımı için önce reçetenin Fabrika Reçete Detay sayfasından gıda mühendisi onayı alınması gerekir."}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-print">Vazgeç</AlertDialogCancel>
            {canOverride && (
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  buildAndPrint(true);
                }}
                disabled={printing}
                data-testid="button-force-print-draft"
              >
                <Printer className="w-3.5 h-3.5" />
                Taslak olarak yazdır
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

export default function KaliteAlerjenPage() {
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const r = params.get("recipe");
    const n = r ? Number(r) : NaN;
    return Number.isFinite(n) ? n : null;
  });
  const [tab, setTab] = useState("verified");
  const [sortBy, setSortBy] = useState<"default" | "approval-desc" | "approval-asc">(() => {
    try {
      if (typeof window === "undefined") return "default";
      const stored = window.localStorage.getItem("kalite-alerjen:sortBy");
      return stored === "approval-desc" || stored === "approval-asc" || stored === "default"
        ? stored
        : "default";
    } catch {
      return "default";
    }
  });
  const [onlyFullyApproved, setOnlyFullyApproved] = useState<boolean>(() => {
    try {
      if (typeof window === "undefined") return false;
      return window.localStorage.getItem("kalite-alerjen:onlyFullyApproved") === "true";
    } catch {
      return false;
    }
  });
  const { user } = useAuth();
  const canFix = !!user?.role && FIX_ROLES.includes(user.role);
  const canViewPrintLog = !!user?.role && PRINT_LOG_ROLES.has(user.role);

  useEffect(() => {
    try {
      window.localStorage.setItem("kalite-alerjen:sortBy", sortBy);
    } catch {}
  }, [sortBy]);

  useEffect(() => {
    try {
      window.localStorage.setItem("kalite-alerjen:onlyFullyApproved", String(onlyFullyApproved));
    } catch {}
  }, [onlyFullyApproved]);

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
                {verified.map(r => <RecipeCard key={r.id} recipe={r} onOpen={setOpenId} canFix={canFix} />)}
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
                {unverified.map(r => <RecipeCard key={r.id} recipe={r} onOpen={setOpenId} canFix={canFix} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {canViewPrintLog && <PrintLogPanel />}

      <RecipeDetailDialog id={openId} onClose={() => setOpenId(null)} canFix={canFix} />
    </div>
  );
}
