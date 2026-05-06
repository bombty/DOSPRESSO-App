import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft, ChefHat, Clock, Users, Package, Zap, Droplets,
  Lock, Unlock, FlaskConical, AlertTriangle, Scale,
  Layers, Play, Edit, Eye, Timer, Flame, Snowflake,
  Link2, Unlink, DollarSign, Pencil, Search, BadgeCheck, ShieldAlert,
  ArrowRight, Plus, Minus, History, ChevronRight, ClipboardCheck, User,
  Tag, Download,
} from "lucide-react";
import { downloadTGKLabel } from "@/lib/tgk-label-pdf";

const APPROVAL_SCOPE_LABELS: Record<string, string> = {
  gramaj: "Gramaj (Üretim Formülü)",
  besin: "Besin Değerleri",
  alerjen: "Alerjenler",
};

// P7.2 (29 Nis 2026): ceo (Aslan) gramaj/besin/alerjen onayı verebilir.
const APPROVAL_ROLES = ["admin", "recete_gm", "gida_muhendisi", "ceo"];

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

  const { toast } = useToast();
  const [multiplier, setMultiplier] = useState(1);
  const [activeTab, setActiveTab] = useState("malzemeler");
  const [editingIngredient, setEditingIngredient] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: "", amount: "", unit: "", rawMaterialId: "" });
  const [inventorySearch, setInventorySearch] = useState("");
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalScope, setApprovalScope] = useState<"gramaj" | "besin" | "alerjen">("gramaj");
  const [approvalNote, setApprovalNote] = useState("");
  
  // Sprint 7 v3 (5 May 2026): TGK Etiket önizleme dialog
  const [tgkLabelDialogOpen, setTgkLabelDialogOpen] = useState(false);
  const [tgkLabelData, setTgkLabelData] = useState<any>(null);
  const [tgkLabelLoading, setTgkLabelLoading] = useState(false);

  const handleCalculateTgkLabel = async () => {
    setTgkLabelLoading(true);
    try {
      const res = await fetch(`/api/recipe-label/calculate-factory`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factoryRecipeId: parseInt(recipeId || '0') }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Hata', description: data.message || 'Hesaplanamadı', variant: 'destructive' });
        return;
      }
      setTgkLabelData(data);
      setTgkLabelDialogOpen(true);
    } catch (e) {
      toast({ title: 'Hata', description: 'TGK etiket hesaplanamadı', variant: 'destructive' });
    } finally {
      setTgkLabelLoading(false);
    }
  };

  const handleDownloadTgkPdf = () => {
    if (!tgkLabelData) return;
    downloadTGKLabel({
      productName: tgkLabelData.recipeName || recipe?.name || 'Ürün',
      ingredientsText: tgkLabelData.ingredientsText || '',
      allergenWarning: tgkLabelData.allergenWarning,
      crossContaminationWarning: tgkLabelData.crossContaminationWarning,
      netQuantityG: tgkLabelData.totalGramsKnown,
      energyKcal: tgkLabelData.nutrition?.energyKcal,
      energyKj: tgkLabelData.nutrition?.energyKj,
      fat: tgkLabelData.nutrition?.fat,
      saturatedFat: tgkLabelData.nutrition?.saturatedFat,
      carbohydrate: tgkLabelData.nutrition?.carbohydrate,
      sugar: tgkLabelData.nutrition?.sugar,
      protein: tgkLabelData.nutrition?.protein,
      salt: tgkLabelData.nutrition?.salt,
      fiber: tgkLabelData.nutrition?.fiber,
      manufacturerName: 'DOSPRESSO Coffee & Donut',
      manufacturerAddress: 'Antalya, Türkiye',
      version: 1,
    });
    toast({ title: 'PDF indirildi', description: 'TGK 2017/2284 uyumlu etiket' });
  };

  const { data: recipe, isLoading } = useQuery<any>({
    queryKey: ["/api/factory/recipes", recipeId],
    queryFn: async () => {
      const res = await fetch(`/api/factory/recipes/${recipeId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Yüklenemedi");
      return res.json();
    },
    enabled: !!recipeId,
  });

  // P7.2 (29 Nis 2026):
  //   - ceo (Aslan) reçete tam yetkili (EKLENDİ)
  //   - sef (Ümit) reçete editleyemez (ÇIKARILDI)
  const canEdit = ["admin", "recete_gm", "ceo"].includes(user?.role || "") && !recipe?.editLocked;
  const isAdmin = ["admin", "recete_gm", "ceo"].includes(user?.role || "");
  const canEditIngredients = recipe?.canEditIngredients;
  const canViewCost = recipe?.canViewCost;
  const canApprove = APPROVAL_ROLES.includes(user?.role || "");

  const { data: approvals, isLoading: approvalsLoading, isError: approvalsError } = useQuery<any[]>({
    queryKey: ["/api/factory/recipes", recipeId, "approvals"],
    queryFn: async () => {
      const res = await fetch(`/api/factory/recipes/${recipeId}/approvals`, { credentials: "include" });
      if (!res.ok) throw new Error("Onaylar yüklenemedi");
      return res.json();
    },
    enabled: !!recipeId,
  });

  const addApprovalMutation = useMutation({
    mutationFn: async (data: { scope: string; note: string | null }) => {
      return apiRequest("POST", `/api/factory/recipes/${recipeId}/approvals`, {
        scope: data.scope,
        note: data.note,
        recipeVersionNumber: recipe?.version ?? null,
        sourceRef: "manual",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/factory/recipes", recipeId, "approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/factory/recipes", recipeId] });
      queryClient.invalidateQueries({ queryKey: ["/api/factory/recipes"] });
      setApprovalDialogOpen(false);
      setApprovalNote("");
      toast({ title: "Onay kaydedildi" });
    },
    onError: (err: any) => {
      toast({
        title: "Onay kaydedilemedi",
        description: err?.message || "Sunucu hatası",
        variant: "destructive",
      });
    },
  });

  const { data: inventoryItems } = useQuery<any[]>({
    queryKey: ["/api/inventory", inventorySearch],
    queryFn: async () => {
      const res = await fetch(`/api/inventory?search=${encodeURIComponent(inventorySearch)}&limit=20`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!editingIngredient && inventorySearch.length >= 2,
  });

  const approveGrammageMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/factory/recipes/${recipeId}/approve-grammage`, {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/factory/recipes", recipeId] });
      queryClient.invalidateQueries({ queryKey: ["/api/quality/allergens/recipes"] });
      toast({
        title: data?.alreadyApproved ? "Bugün zaten onayladınız" : "Gramaj onayı kaydedildi",
        description: "Onay change_log'a yazıldı.",
      });
    },
    onError: (err: any) => {
      toast({ title: "Onaylanamadı", description: err?.message || "Sunucu hatası", variant: "destructive" });
    },
  });

  const updateIngredientMutation = useMutation({
    mutationFn: async (data: { ingredientId: number; name?: string; amount?: string; unit?: string; rawMaterialId?: number | null }) => {
      return apiRequest("PATCH", `/api/factory/recipes/${recipeId}/ingredients/${data.ingredientId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/factory/recipes", recipeId] });
      setEditingIngredient(null);
      toast({ title: "Malzeme güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Malzeme güncellenemedi", variant: "destructive" });
    },
  });
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
            <h1 className="text-lg font-semibold flex items-center gap-2 flex-wrap">
              {recipe.name}
              {recipe.editLocked && <Lock className="h-4 w-4 text-amber-500" />}
              {recipe.ingredientChangesSinceApproval?.hasChangesAfterApproval ? (
                <Badge
                  className="gap-1 bg-amber-600 text-white border-amber-700 dark:bg-amber-700 dark:border-amber-600"
                  data-testid="badge-grammage-changed-after-approval"
                >
                  <History className="h-3 w-3" />
                  Onay sonrası değişiklik var
                </Badge>
              ) : recipe.grammageApproval?.approved ? (
                <Badge
                  className="gap-1 bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-700 dark:border-emerald-600"
                  data-testid="badge-grammage-approved"
                >
                  <BadgeCheck className="h-3 w-3" />
                  Gramaj Onaylı
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="gap-1 border-amber-600/40 text-amber-500"
                  data-testid="badge-grammage-pending"
                >
                  <ShieldAlert className="h-3 w-3" />
                  Onaysız
                </Badge>
              )}
            </h1>
            <p className="text-xs text-muted-foreground">
              {recipe.code} · {CATEGORY_LABELS[recipe.category] || recipe.category} · v{recipe.version}
              {recipe.outputType === "yari_mamul" && " · Yarı Mamül"}
              {recipe.grammageApproval?.approved && (
                <>
                  {" · "}
                  <span className="text-emerald-500" data-testid="text-grammage-approver">
                    {recipe.grammageApproval.userName || recipe.grammageApproval.userId} · {recipe.grammageApproval.date}
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {recipe.grammageApproval?.canApprove && (!recipe.grammageApproval?.approved || recipe.ingredientChangesSinceApproval?.hasChangesAfterApproval) && (
              <Button
                size="sm"
                variant="default"
                className={cn(
                  recipe.ingredientChangesSinceApproval?.hasChangesAfterApproval
                    ? "bg-amber-600 hover:bg-amber-700 border-amber-700"
                    : "bg-emerald-600 hover:bg-emerald-700 border-emerald-700"
                )}
                onClick={() => approveGrammageMutation.mutate()}
                disabled={approveGrammageMutation.isPending}
                data-testid="button-approve-grammage"
              >
                <BadgeCheck className="h-3.5 w-3.5 mr-1" />
                {approveGrammageMutation.isPending
                  ? "Kaydediliyor..."
                  : recipe.ingredientChangesSinceApproval?.hasChangesAfterApproval
                    ? recipe.ingredientChangesSinceApproval.totalChanges > 0
                      ? `Değişiklikleri onayla (${recipe.ingredientChangesSinceApproval.totalChanges})`
                      : "Adım değişikliklerini onayla"
                    : "Üretim formülüyle onayla"}
              </Button>
            )}
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

      {/* Task #173: Son onaydan beri değişen malzemeler */}
      {recipe.ingredientChangesSinceApproval?.hasBaseline && recipe.ingredientChangesSinceApproval?.totalChanges > 0 && (
        <div className="px-6 pt-4">
          <Card
            className={cn(
              "border-amber-600/40",
              "bg-amber-50/30 dark:bg-amber-950/10"
            )}
            data-testid="card-changes-since-approval"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <History className="h-4 w-4" />
                Son onaydan beri değişen malzemeler ({recipe.ingredientChangesSinceApproval.totalChanges})
                {recipe.ingredientChangesSinceApproval.baselineDate && (
                  <span className="ml-auto text-[10px] text-muted-foreground font-normal">
                    Baz: v{recipe.ingredientChangesSinceApproval.baselineVersionNumber} ·{" "}
                    {new Date(recipe.ingredientChangesSinceApproval.baselineDate).toLocaleDateString("tr-TR")}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 text-xs px-3 py-2 font-semibold text-muted-foreground border-b border-border">
                <span>Malzeme</span>
                <span className="text-right">Eski</span>
                <span className="text-center w-4"></span>
                <span className="text-right">Yeni</span>
                <span className="text-right w-16">Δ %</span>
              </div>
              {recipe.ingredientChangesSinceApproval.changed.map((c: any) => (
                <div
                  key={`chg-${c.refId || c.name}`}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 text-xs px-3 py-1.5 border-b border-border/30"
                  data-testid={`diff-changed-${c.refId || c.name}`}
                >
                  <span className="truncate">
                    {c.name}
                    {c.oldName && c.oldName !== c.name && (
                      <span className="text-muted-foreground"> (eski: {c.oldName})</span>
                    )}
                  </span>
                  <span className="text-right font-mono tabular-nums text-muted-foreground">
                    {c.oldAmount != null ? `${formatAmt(c.oldAmount)} ${c.oldUnit || ""}` : "—"}
                  </span>
                  <ArrowRight className="h-3 w-3 self-center text-muted-foreground" />
                  <span className="text-right font-mono tabular-nums">
                    {c.newAmount != null ? `${formatAmt(c.newAmount)} ${c.newUnit || ""}` : "—"}
                  </span>
                  <span
                    className={cn(
                      "text-right font-mono tabular-nums w-16",
                      c.deltaPct != null && c.deltaPct > 0 && "text-emerald-600 dark:text-emerald-400",
                      c.deltaPct != null && c.deltaPct < 0 && "text-red-600 dark:text-red-400",
                    )}
                  >
                    {c.deltaPct != null ? `${c.deltaPct > 0 ? "+" : ""}${c.deltaPct.toFixed(1)}%` : "—"}
                  </span>
                </div>
              ))}
              {recipe.ingredientChangesSinceApproval.added.map((a: any) => (
                <div
                  key={`add-${a.refId || a.name}`}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 text-xs px-3 py-1.5 border-b border-border/30 text-emerald-700 dark:text-emerald-400"
                  data-testid={`diff-added-${a.refId || a.name}`}
                >
                  <span className="flex items-center gap-1 truncate">
                    <Plus className="h-3 w-3 shrink-0" /> {a.name}
                  </span>
                  <span className="text-right text-muted-foreground">—</span>
                  <ArrowRight className="h-3 w-3 self-center text-muted-foreground" />
                  <span className="text-right font-mono tabular-nums">
                    {a.newAmount != null ? `${formatAmt(a.newAmount)} ${a.newUnit || ""}` : "—"}
                  </span>
                  <span className="text-right text-[10px] w-16">YENİ</span>
                </div>
              ))}
              {recipe.ingredientChangesSinceApproval.removed.map((r: any) => (
                <div
                  key={`rem-${r.refId || r.name}`}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 text-xs px-3 py-1.5 border-b border-border/30 text-red-700 dark:text-red-400 line-through"
                  data-testid={`diff-removed-${r.refId || r.name}`}
                >
                  <span className="flex items-center gap-1 truncate">
                    <Minus className="h-3 w-3 shrink-0" /> {r.name}
                  </span>
                  <span className="text-right font-mono tabular-nums">
                    {r.oldAmount != null ? `${formatAmt(r.oldAmount)} ${r.oldUnit || ""}` : "—"}
                  </span>
                  <ArrowRight className="h-3 w-3 self-center text-muted-foreground" />
                  <span className="text-right text-muted-foreground">—</span>
                  <span className="text-right text-[10px] w-16">SİLİNDİ</span>
                </div>
              ))}
              {recipe.ingredientChangesSinceApproval.stepsChanged && (
                <div className="px-3 py-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-100/30 dark:bg-amber-900/10">
                  ⚠ Üretim adımlarında da değişiklik yapıldı.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

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
            <TabsTrigger value="onaylar" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-2 text-sm" data-testid="tab-onaylar">
              <ClipboardCheck className="h-3.5 w-3.5 mr-1" />
              Onaylar {approvals?.length ? `(${approvals.length})` : ""}
            </TabsTrigger>
            {canViewCost && (
              <TabsTrigger value="maliyet" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-2 text-sm">
                <DollarSign className="h-3.5 w-3.5 mr-1" /> Maliyet
              </TabsTrigger>
            )}
            <TabsTrigger value="etiket" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-2 text-sm" data-testid="tab-etiket">
              <Tag className="h-3.5 w-3.5 mr-1" /> Etiket (TGK)
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
                    const scaledCost = canViewCost && ing.lineCost ? (ing.lineCost * multiplier) : null;

                    return (
                      <div
                        key={ing.id}
                        className={cn(
                          "flex items-center justify-between py-2 px-3 rounded-lg gap-2",
                          isKeyblend ? "bg-purple-950/20 border border-purple-800/30" : "bg-muted/30",
                          !ing.linked && !isKeyblend && "border border-amber-800/30"
                        )}
                        data-testid={`ingredient-${ing.refId}`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {isKeyblend && <Lock className="h-3.5 w-3.5 text-purple-400 shrink-0" />}
                          {!isKeyblend && ing.linked && <Link2 className="h-3 w-3 text-emerald-500 shrink-0" />}
                          {!isKeyblend && !ing.linked && <Unlink className="h-3 w-3 text-amber-500 shrink-0" />}
                          <div className="min-w-0">
                            <span className="text-sm truncate block">
                              {isKeyblend ? `Keyblend ${ing.name}` : ing.name}
                            </span>
                            {ing.inventoryCode && (
                              <span className="text-[10px] text-emerald-500/70">{ing.inventoryCode}</span>
                            )}
                            {!ing.linked && !isKeyblend && (
                              <span className="text-[10px] text-amber-500">Eşleşmemiş</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {canViewCost && scaledCost !== null && scaledCost > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              ₺{scaledCost.toFixed(2)}
                            </span>
                          )}
                          <span className={cn(
                            "text-sm font-mono font-medium tabular-nums",
                            isKeyblend && "text-purple-300"
                          )}>
                            {Number.isInteger(scaled) ? scaled : scaled.toFixed(1)} {ing.unit}
                          </span>
                          {canEditIngredients && !isKeyblend && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              data-testid={`btn-edit-ingredient-${ing.refId}`}
                              onClick={() => {
                                setEditingIngredient(ing);
                                setEditForm({
                                  name: ing.name,
                                  amount: String(ing.amount),
                                  unit: ing.unit,
                                  rawMaterialId: ing.rawMaterialId ? String(ing.rawMaterialId) : "",
                                });
                                setInventorySearch("");
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
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
            {/* Üst aksiyon barı — Hesapla / Yeniden Hesapla */}
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Besin Değer Tablosu (100g)</span>
                {recipe.nutritionConfidence && (
                  <Badge variant="outline" className="text-[10px]">
                    AI Güven: %{recipe.nutritionConfidence}
                  </Badge>
                )}
              </div>
              <Button
                size="sm"
                variant={recipe.nutritionFacts ? "outline" : "default"}
                onClick={async () => {
                  try {
                    toast({ title: "Besin değeri hesaplanıyor...", description: "Hammadde besin değerlerinden toplam çıkarılıyor" });
                    const res = await apiRequest("POST", `/api/factory/recipes/${recipe.id}/calculate-nutrition`);
                    const data = await res.json();
                    queryClient.invalidateQueries({ queryKey: [`/api/factory/recipes/${recipe.id}`] });
                    if (data.unverified && data.unverified.length > 0) {
                      toast({
                        title: "⚠️ Eksik veri uyarısı",
                        description: `${data.unverified.length} hammadde için besin verisi eksik: ${data.unverified.slice(0, 3).join(", ")}${data.unverified.length > 3 ? "..." : ""}`,
                        variant: "destructive",
                      });
                    } else {
                      toast({ title: "✅ Besin değeri hesaplandı", description: `Güven skoru: %${data.confidence || 0}` });
                    }
                  } catch (error: any) {
                    toast({ title: "Hesaplama başarısız", description: error.message || "Bilinmeyen hata", variant: "destructive" });
                  }
                }}
                data-testid="button-calc-nutrition-tab"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                {recipe.nutritionFacts ? "Yeniden Hesapla" : "Şimdi Hesapla"}
              </Button>
            </div>

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

                  {/* Porsiyon başına (etiket için) */}
                  {recipe.expectedUnitWeight && recipe.nutritionFacts.energy_kcal != null && (
                    <div className="mt-4 pt-3 border-t">
                      <div className="text-xs font-medium mb-2 flex items-center gap-1">
                        <Tag className="h-3.5 w-3.5" />
                        Porsiyon Başına ({recipe.expectedUnitWeight}g)
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>Enerji: <strong>{((recipe.nutritionFacts.energy_kcal * Number(recipe.expectedUnitWeight)) / 100).toFixed(1)} kcal</strong></div>
                        <div>Yağ: <strong>{((recipe.nutritionFacts.fat_g * Number(recipe.expectedUnitWeight)) / 100).toFixed(1)} g</strong></div>
                        <div>Karbonhidrat: <strong>{((recipe.nutritionFacts.carbohydrate_g * Number(recipe.expectedUnitWeight)) / 100).toFixed(1)} g</strong></div>
                        <div>Protein: <strong>{((recipe.nutritionFacts.protein_g * Number(recipe.expectedUnitWeight)) / 100).toFixed(1)} g</strong></div>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        💡 Bu değerler etiket bilgisi için otomatik kullanılır (TGK 2017/2284)
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                <CardContent className="text-center py-8">
                  <Scale className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                  <p className="text-sm font-medium">Besin değerleri henüz hesaplanmadı</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                    Yukarıdaki <strong>"Şimdi Hesapla"</strong> butonuna tıklayın. Sistem hammadde besin
                    değerlerinden reçete toplam besin değerini ve porsiyon başına etiket değerlerini otomatik oluşturur.
                  </p>
                  {(!recipe.ingredients || recipe.ingredients.length === 0) && (
                    <p className="text-xs text-red-600 mt-3 font-medium">
                      ⚠️ Önce malzeme listesi tamamlanmalı
                    </p>
                  )}
                </CardContent>
              </Card>
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

          {/* ONAYLAR TAB */}
          <TabsContent value="onaylar" className="space-y-3 pb-8" data-testid="tab-content-onaylar">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4" /> Onay Geçmişi
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Gramaj, besin değeri ve alerjen onayları kayıt altına alınır.
                </p>
              </div>
              {canApprove && (
                <Button
                  size="sm"
                  onClick={() => {
                    setApprovalScope("gramaj");
                    setApprovalNote("");
                    setApprovalDialogOpen(true);
                  }}
                  data-testid="button-add-approval"
                >
                  <BadgeCheck className="h-3.5 w-3.5 mr-1" /> Onay Ver
                </Button>
              )}
            </div>

            {approvalsLoading ? (
              <Skeleton className="h-24" />
            ) : approvalsError ? (
              <Card className="border-red-800/30 bg-red-950/10">
                <CardContent className="p-3">
                  <p className="text-sm text-red-400 flex items-center gap-2" data-testid="approvals-error">
                    <AlertTriangle className="h-4 w-4" />
                    Onay geçmişi yüklenemedi. Lütfen sayfayı yenileyin.
                  </p>
                </CardContent>
              </Card>
            ) : !approvals || approvals.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardCheck className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">Henüz onay kaydı yok</p>
              </div>
            ) : (
              <div className="space-y-2">
                {approvals.map((a: any) => (
                  <Card key={a.id} data-testid={`approval-row-${a.id}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              className={cn(
                                "gap-1",
                                a.scope === "gramaj" && "bg-emerald-600 text-white border-emerald-700",
                                a.scope === "besin" && "bg-sky-600 text-white border-sky-700",
                                a.scope === "alerjen" && "bg-amber-600 text-white border-amber-700",
                              )}
                              data-testid={`approval-scope-${a.id}`}
                            >
                              <BadgeCheck className="h-3 w-3" />
                              {APPROVAL_SCOPE_LABELS[a.scope] || a.scope}
                            </Badge>
                            {a.recipeVersionNumber != null && (
                              <Badge variant="outline" className="text-[10px]">
                                v{a.recipeVersionNumber}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-[10px]" data-testid={`approval-source-${a.id}`}>
                              {a.sourceRef === "manual" || !a.sourceRef ? "Manuel" : a.sourceRef}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-3 flex-wrap">
                            <span className="flex items-center gap-1" data-testid={`approval-user-${a.id}`}>
                              <User className="h-3 w-3" />
                              {a.approvedByName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {a.approvedAt ? new Date(a.approvedAt).toLocaleString("tr-TR") : "—"}
                            </span>
                          </div>
                          {a.note && (
                            <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap" data-testid={`approval-note-${a.id}`}>
                              {a.note}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* MALİYET TAB */}
          {canViewCost && (
            <TabsContent value="maliyet" className="space-y-4 pb-8">
              {(() => {
                const allIngs = recipe?.ingredients || [];
                let totalCost = 0;
                let missingCount = 0;
                const costRows = allIngs.filter((i: any) => i.ingredientType !== "keyblend").map((ing: any) => {
                  const amount = Number(ing.amount || 0) * multiplier;
                  const cost = (ing.lineCost || 0) * multiplier;
                  totalCost += cost;
                  if (!ing.hasPrice) missingCount++;
                  return { ...ing, scaledAmount: amount, scaledCost: cost };
                });
                const unitCost = scaledOutput > 0 ? totalCost / scaledOutput : 0;

                return (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <Card className="p-3 text-center">
                        <div className="text-lg font-bold">₺{totalCost.toFixed(2)}</div>
                        <div className="text-[10px] text-muted-foreground">Batch Maliyet</div>
                      </Card>
                      <Card className="p-3 text-center">
                        <div className="text-lg font-bold">₺{unitCost.toFixed(2)}</div>
                        <div className="text-[10px] text-muted-foreground">Birim Maliyet</div>
                      </Card>
                      <Card className="p-3 text-center">
                        <div className="text-lg font-bold">{allIngs.length - missingCount}/{allIngs.length}</div>
                        <div className="text-[10px] text-muted-foreground">Fiyatlı Malzeme</div>
                      </Card>
                    </div>
                    {missingCount > 0 && (
                      <Card className="border-amber-800/30 bg-amber-950/10 p-3">
                        <p className="text-xs text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {missingCount} malzemenin fiyatı eksik — gerçek maliyet daha yüksek olabilir
                        </p>
                      </Card>
                    )}
                    <Card>
                      <CardContent className="p-0">
                        <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-xs border-b border-border px-3 py-2 font-semibold text-muted-foreground">
                          <span>Malzeme</span>
                          <span className="text-right">Miktar</span>
                          <span className="text-right w-20">Maliyet</span>
                        </div>
                        {costRows.map((row: any) => (
                          <div key={row.id} className={cn("grid grid-cols-[1fr_auto_auto] gap-x-3 text-xs px-3 py-1.5 border-b border-border/30", !row.hasPrice && "text-amber-500")}>
                            <span className="truncate">{row.name} {row.inventoryCode && <span className="text-muted-foreground">({row.inventoryCode})</span>}</span>
                            <span className="text-right font-mono tabular-nums">{row.scaledAmount.toFixed(1)} {row.unit}</span>
                            <span className="text-right font-mono tabular-nums w-20">{row.hasPrice ? `₺${row.scaledCost.toFixed(2)}` : "—"}</span>
                          </div>
                        ))}
                        <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-xs px-3 py-2 font-semibold bg-muted/50">
                          <span>TOPLAM</span>
                          <span></span>
                          <span className="text-right font-mono tabular-nums w-20">₺{totalCost.toFixed(2)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                );
              })()}
            </TabsContent>
          )}

          {/* ETİKET (TGK 2017/2284) — Aslan'ın "etiket çalışmıyor" geri bildirimi sonrası */}
          <TabsContent value="etiket" className="space-y-4 pb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="h-4 w-4 text-blue-500" />
                  TGK 2017/2284 Uyumlu Etiket
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Onay durumu kontrolü */}
                {!recipe.gramajApproved && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <p className="text-xs">
                      Reçete henüz onaylanmadı — etiket basımı için "Onaylar" sekmesinden onay alınmalı.
                    </p>
                  </div>
                )}

                {/* Besin değeri durumu */}
                {!recipe.nutritionFacts && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <p className="text-xs">
                      Besin değerleri henüz hesaplanmadı — "Besin Değerleri" sekmesinden "Şimdi Hesapla" butonuna tıklayın.
                    </p>
                  </div>
                )}

                {/* Etiket özet kartı */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 border rounded">
                    <div className="text-xs text-muted-foreground">Ürün Adı</div>
                    <div className="text-sm font-medium">{recipe.name}</div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-xs text-muted-foreground">Ürün Kodu</div>
                    <div className="text-sm font-medium">{recipe.code}</div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-xs text-muted-foreground">Net Miktar (porsiyon)</div>
                    <div className="text-sm font-medium">
                      {recipe.expectedUnitWeight ? `${recipe.expectedUnitWeight} g` : "—"}
                    </div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-xs text-muted-foreground">Batch Çıktı</div>
                    <div className="text-sm font-medium">
                      {recipe.baseBatchOutput ? `${recipe.baseBatchOutput} ${recipe.outputUnit || "adet"}` : "—"}
                    </div>
                  </div>
                </div>

                {/* Allerjen önizleme */}
                {recipe.allergens && Array.isArray(recipe.allergens) && recipe.allergens.length > 0 && (
                  <div className="p-3 border rounded bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                    <div className="text-xs font-medium mb-2">Etikette koyu/altı çizili gösterilecek alerjenler:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {recipe.allergens.map((a: any, idx: number) => (
                        <Badge key={idx} variant="destructive" className="text-[10px]">
                          ⚠️ {typeof a === 'string' ? a : (a.name || a.label || JSON.stringify(a))}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Etiket aksiyonları */}
                <div className="flex gap-2 flex-wrap pt-2">
                  <Button
                    size="sm"
                    onClick={() => navigate(`/etiket-hesapla?productId=${recipe.id}&productType=factory_recipe`)}
                    disabled={!recipe.gramajApproved || !recipe.nutritionFacts}
                    data-testid="button-open-label-editor"
                  >
                    <Tag className="h-4 w-4 mr-2" />
                    Etiket Editörünü Aç
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        toast({ title: "Etiket PDF üretiliyor...", description: "Porsiyon ağırlığına göre TGK formatı" });
                        const res = await fetch(`/api/factory/recipes/${recipe.id}/label-pdf`, { credentials: "include" });
                        if (!res.ok) throw new Error("PDF üretilemedi");
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `etiket-${recipe.code}.pdf`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast({ title: "✅ Etiket indirildi" });
                      } catch (err: any) {
                        toast({ title: "Etiket üretilemedi", description: err.message, variant: "destructive" });
                      }
                    }}
                    disabled={!recipe.gramajApproved || !recipe.nutritionFacts}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    PDF İndir
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground p-3 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                  🏷️ <strong>TGK 2017/2284 zorunlu alanlar:</strong> Ürün adı, net miktar, son tüketim tarihi,
                  üretici bilgileri, alerjen uyarısı, içindekiler listesi (alerjenler kalın), besin değerleri tablosu (100g + porsiyon), <strong>lot/parti numarası (Madde 9/k)</strong>.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Malzeme Düzenleme Dialog */}
      {editingIngredient && (
        <Dialog open={!!editingIngredient} onOpenChange={() => setEditingIngredient(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Malzeme Düzenle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Malzeme Adı</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                  data-testid="input-ingredient-name"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Miktar</Label>
                  <Input
                    type="number"
                    value={editForm.amount}
                    onChange={(e) => setEditForm(f => ({ ...f, amount: e.target.value }))}
                    data-testid="input-ingredient-amount"
                  />
                </div>
                <div>
                  <Label>Birim</Label>
                  <Input
                    value={editForm.unit}
                    onChange={(e) => setEditForm(f => ({ ...f, unit: e.target.value }))}
                    data-testid="input-ingredient-unit"
                  />
                </div>
              </div>
              <div>
                <Label>Hammadde Eşleştirme</Label>
                <div className="mt-1 space-y-2">
                  {editingIngredient.inventoryCode && (
                    <div className="flex items-center gap-2 text-xs p-2 bg-muted/50 rounded">
                      <Link2 className="h-3 w-3 text-emerald-500" />
                      <span>Mevcut: <strong>{editingIngredient.inventoryCode}</strong> — {editingIngredient.inventoryName}</span>
                    </div>
                  )}
                  <Input
                    placeholder="Hammadde ara (kod veya isim)..."
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    data-testid="input-inventory-search"
                  />
                  {inventoryItems && inventoryItems.length > 0 && (
                    <div className="max-h-40 overflow-y-auto border rounded space-y-0.5 p-1">
                      {inventoryItems.map((item: any) => (
                        <button
                          key={item.id}
                          className={cn(
                            "w-full text-left text-xs px-2 py-1.5 rounded hover-elevate",
                            String(item.id) === editForm.rawMaterialId && "bg-primary/10"
                          )}
                          onClick={() => setEditForm(f => ({ ...f, rawMaterialId: String(item.id) }))}
                          data-testid={`btn-select-inventory-${item.id}`}
                        >
                          <span className="font-mono text-emerald-500">{item.code}</span>
                          {" — "}
                          <span>{item.name}</span>
                          <span className="text-muted-foreground ml-1">({item.unit})</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {editingIngredient.rawMaterialId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-amber-500"
                      onClick={() => setEditForm(f => ({ ...f, rawMaterialId: "" }))}
                    >
                      <Unlink className="h-3 w-3 mr-1" /> Eşleşmeyi Kaldır
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingIngredient(null)}>
                Vazgeç
              </Button>
              <Button
                onClick={() => {
                  updateIngredientMutation.mutate({
                    ingredientId: editingIngredient.id,
                    name: editForm.name,
                    amount: editForm.amount,
                    unit: editForm.unit,
                    rawMaterialId: editForm.rawMaterialId ? Number(editForm.rawMaterialId) : null,
                  });
                }}
                disabled={updateIngredientMutation.isPending}
                data-testid="btn-save-ingredient"
              >
                {updateIngredientMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Onay Verme Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-approval">
          <DialogHeader>
            <DialogTitle>Onay Ver</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Onay Kapsamı</Label>
              <Select value={approvalScope} onValueChange={(v: "gramaj" | "besin" | "alerjen") => setApprovalScope(v)}>
                <SelectTrigger className="mt-1" data-testid="select-approval-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gramaj" data-testid="option-scope-gramaj">
                    {APPROVAL_SCOPE_LABELS.gramaj}
                  </SelectItem>
                  <SelectItem value="besin" data-testid="option-scope-besin">
                    {APPROVAL_SCOPE_LABELS.besin}
                  </SelectItem>
                  <SelectItem value="alerjen" data-testid="option-scope-alerjen">
                    {APPROVAL_SCOPE_LABELS.alerjen}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Not (opsiyonel, en az 3 karakter)</Label>
              <Textarea
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder="Onayla ilgili not ekleyin..."
                className="mt-1 min-h-24"
                data-testid="input-approval-note"
              />
            </div>
            {recipe?.version != null && (
              <p className="text-xs text-muted-foreground">
                Bu onay reçete v{recipe.version} için kaydedilecek.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>
              Vazgeç
            </Button>
            <Button
              onClick={() => {
                const note = approvalNote.trim();
                if (note && note.length < 3) {
                  toast({
                    title: "Not en az 3 karakter olmalı",
                    variant: "destructive",
                  });
                  return;
                }
                addApprovalMutation.mutate({
                  scope: approvalScope,
                  note: note || null,
                });
              }}
              disabled={addApprovalMutation.isPending}
              data-testid="button-confirm-approval"
            >
              {addApprovalMutation.isPending ? "Kaydediliyor..." : "Onayı Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

function formatAmt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(n < 1 ? 3 : 2);
}
