/**
 * BRANCH RECIPE EDITOR — Malzeme + Adım Editörü
 *
 * URL: /branch-recipes/admin/recipe/:recipeId
 * Yetki: admin, ceo, cgo, coach, trainer
 *
 * Backend:
 *   PUT /api/branch-recipes/:id/ingredients  — Replace all ingredients
 *   PUT /api/branch-recipes/:id/steps        — Replace all steps
 *
 * UX:
 *   - Tab: Malzemeler / Adımlar
 *   - Mobil-first: kartlar alt alta
 *   - Yukarı/aşağı taşı butonları (drag-drop yerine basit)
 *   - Tek "Tümünü Kaydet" butonu (transaction)
 *   - Kaydedilmemiş değişiklik koruması (beforeunload)
 *
 * Aslan istek: 4 May 2026 — TASK-EDIT-001
 */

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Save,
  Coffee, ListChecks, AlertTriangle, CheckCircle2, Sparkles, X,
} from "lucide-react";

const HQ_EDIT_ROLES = ['admin', 'ceo', 'cgo', 'coach', 'trainer'];

const COMMON_UNITS = ['gr', 'ml', 'adet', 'pump', 'shot', 'scoop', 'kg', 'lt', 'çay kaşığı', 'yemek kaşığı'];

interface BranchRecipeIngredient {
  id?: number;
  stepOrder: number;
  ingredientName: string;
  quantityText: string;
  quantityNumeric?: string | null;
  unit?: string | null;
  preparationNote?: string | null;
  isVariableAroma?: boolean;
  aromaSlot?: string | null;
  // Editor-only:
  _localId?: string;
  _isNew?: boolean;
}

interface BranchRecipeStep {
  id?: number;
  stepOrder: number;
  instruction: string;
  isCritical?: boolean;
  estimatedSec?: number | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  // Editor-only:
  _localId?: string;
  _isNew?: boolean;
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

interface AromaCompatibility {
  id?: number;
  aromaId: number;
  slotName: string;
  overridePumpsMassivo?: string | null;
  overridePumpsLongDiva?: string | null;
  overrideUnit?: string | null;
  isDefault?: boolean;
  displayNameOverride?: string | null;
  isActive?: boolean;
  // Detail (read-only join):
  aromaName?: string;
  aromaIconEmoji?: string | null;
  aromaCategory?: string;
  // Editor-only:
  _localId?: string;
  _isNew?: boolean;
}

interface RecipeDetail {
  product: { id: number; name: string; category: string };
  recipe: {
    id: number;
    productId: number;
    size: string;
    version: string;
    isTemplate: boolean;
    preparationTimeSec: number | null;
    difficultyLevel: number;
  };
  ingredients: BranchRecipeIngredient[];
  steps: BranchRecipeStep[];
}

const SIZE_LABEL: Record<string, string> = {
  massivo: "Massivo (200ml)",
  long_diva: "Long Diva (280ml)",
  tek_boy: "Standart",
};

// Local ID üreteci (kaydedilmemiş satırlar için)
let localCounter = 0;
const newLocalId = () => `_local_${++localCounter}`;

export default function BranchRecipeEditor() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/branch-recipes/admin/recipe/:recipeId");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const recipeId = params?.recipeId ? Number(params.recipeId) : null;
  const canEdit = user?.role && HQ_EDIT_ROLES.includes(user.role);

  const [activeTab, setActiveTab] = useState<'ingredients' | 'steps' | 'aromas'>('ingredients');
  const [ingredients, setIngredients] = useState<BranchRecipeIngredient[]>([]);
  const [steps, setSteps] = useState<BranchRecipeStep[]>([]);
  const [aromas, setAromas] = useState<AromaCompatibility[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);
  const [pendingExitUrl, setPendingExitUrl] = useState<string | null>(null);

  // Reçete detayını çek
  const { data: detail, isLoading } = useQuery<RecipeDetail>({
    queryKey: ["/api/branch-recipes", recipeId, "edit"],
    queryFn: async () => {
      const res = await fetch(`/api/branch-recipes/${recipeId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Reçete yüklenemedi");
      return res.json();
    },
    enabled: !!recipeId && !!canEdit,
    staleTime: 0, // Editör için her zaman taze data
  });

  // Mevcut aroma uyumlulukları (template ise)
  const { data: aromaData } = useQuery<{ compatibilities: AromaCompatibility[] }>({
    queryKey: ["/api/branch-recipes", recipeId, "aromas"],
    queryFn: async () => {
      const res = await fetch(`/api/branch-recipes/${recipeId}/aromas`, { credentials: "include" });
      if (!res.ok) throw new Error("Aroma listesi yüklenemedi");
      return res.json();
    },
    enabled: !!recipeId && !!canEdit && !!detail?.recipe.isTemplate,
    staleTime: 0,
  });

  // Aroma seçenekleri (tüm)
  const { data: aromaOptionsData } = useQuery<{ aromas: AromaOption[] }>({
    queryKey: ["/api/branch-aroma-options"],
    queryFn: async () => {
      const res = await fetch(`/api/branch-aroma-options`, { credentials: "include" });
      if (!res.ok) throw new Error("Aroma seçenekleri yüklenemedi");
      return res.json();
    },
    enabled: !!canEdit,
    staleTime: 600000,
  });
  const aromaOptions = useMemo(() => aromaOptionsData?.aromas || [], [aromaOptionsData]);

  // Detay yüklendiğinde state'i doldur
  useEffect(() => {
    if (detail) {
      setIngredients(
        (detail.ingredients || []).map(ing => ({
          ...ing,
          _localId: newLocalId(),
        }))
      );
      setSteps(
        (detail.steps || []).map(s => ({
          ...s,
          _localId: newLocalId(),
        }))
      );
      setIsDirty(false);
    }
  }, [detail]);

  // Aromalar yüklendiğinde state'i doldur
  useEffect(() => {
    if (aromaData?.compatibilities) {
      setAromas(
        aromaData.compatibilities.map(a => ({
          ...a,
          _localId: newLocalId(),
        }))
      );
    }
  }, [aromaData]);

  // beforeunload — kaydedilmemiş değişiklik uyarısı
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // ── Kaydet mutation'ları ──────────────────────────────────────
  const saveIngredientsMutation = useMutation({
    mutationFn: async (payload: BranchRecipeIngredient[]) => {
      const cleaned = payload.map(({ _localId, _isNew, id, ...rest }, idx) => ({
        ...rest,
        stepOrder: idx + 1,
      }));
      const res = await fetch(`/api/branch-recipes/${recipeId}/ingredients`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: cleaned }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || "Malzemeler kaydedilemedi");
      }
      return res.json();
    },
  });

  const saveStepsMutation = useMutation({
    mutationFn: async (payload: BranchRecipeStep[]) => {
      const cleaned = payload.map(({ _localId, _isNew, id, ...rest }, idx) => ({
        ...rest,
        stepOrder: idx + 1,
      }));
      const res = await fetch(`/api/branch-recipes/${recipeId}/steps`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: cleaned }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || "Adımlar kaydedilemedi");
      }
      return res.json();
    },
  });

  const saveAromasMutation = useMutation({
    mutationFn: async (payload: AromaCompatibility[]) => {
      const cleaned = payload
        .filter(a => a.aromaId && a.aromaId > 0) // Boş satırları filtrele
        .map(({ _localId, _isNew, id, aromaName, aromaIconEmoji, aromaCategory, ...rest }) => rest);
      const res = await fetch(`/api/branch-recipes/${recipeId}/aromas`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compatibilities: cleaned }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || "Aromalar kaydedilemedi");
      }
      return res.json();
    },
  });

  const handleSaveAll = async () => {
    // Validation: boş malzeme/adım yoksa ve sıralama 1'den başlıyor
    const emptyIng = ingredients.find(i => !i.ingredientName.trim());
    if (emptyIng) {
      toast({
        title: "Boş malzeme adı",
        description: "Lütfen tüm malzemelerin adını girin (boşları silebilirsiniz).",
        variant: "destructive",
      });
      setActiveTab('ingredients');
      return;
    }
    const emptyStep = steps.find(s => !s.instruction.trim());
    if (emptyStep) {
      toast({
        title: "Boş adım",
        description: "Lütfen tüm adımların talimatını girin (boşları silebilirsiniz).",
        variant: "destructive",
      });
      setActiveTab('steps');
      return;
    }
    // Aroma validation: aromaId boş olamaz
    const invalidAroma = aromas.find(a => !a.aromaId || a.aromaId <= 0);
    if (invalidAroma) {
      toast({
        title: "Aroma seçilmedi",
        description: "Lütfen tüm satırlarda bir aroma seçin (boşları silebilirsiniz).",
        variant: "destructive",
      });
      setActiveTab('aromas');
      return;
    }

    try {
      const promises: Promise<any>[] = [
        saveIngredientsMutation.mutateAsync(ingredients),
        saveStepsMutation.mutateAsync(steps),
      ];
      // Aroma sadece template reçetelerde
      if (detail?.recipe.isTemplate) {
        promises.push(saveAromasMutation.mutateAsync(aromas));
      }
      await Promise.all(promises);
      toast({
        title: "Kaydedildi",
        description: detail?.recipe.isTemplate
          ? `${ingredients.length} malzeme + ${steps.length} adım + ${aromas.length} aroma güncellendi.`
          : `${ingredients.length} malzeme + ${steps.length} adım güncellendi.`,
      });
      setIsDirty(false);
      // Cache'i temizle
      queryClient.invalidateQueries({ queryKey: ["/api/branch-recipes", recipeId] });
    } catch (e: any) {
      toast({
        title: "Kaydedilemedi",
        description: e?.message || "Bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  // ── Malzeme işlemleri ─────────────────────────────────────────
  const addIngredient = () => {
    setIngredients(prev => [
      ...prev,
      {
        _localId: newLocalId(),
        _isNew: true,
        stepOrder: prev.length + 1,
        ingredientName: "",
        quantityText: "",
        quantityNumeric: null,
        unit: null,
        preparationNote: null,
        isVariableAroma: false,
        aromaSlot: null,
      },
    ]);
    setIsDirty(true);
  };

  const updateIngredient = (localId: string, patch: Partial<BranchRecipeIngredient>) => {
    setIngredients(prev =>
      prev.map(i => (i._localId === localId ? { ...i, ...patch } : i))
    );
    setIsDirty(true);
  };

  const deleteIngredient = (localId: string) => {
    setIngredients(prev => prev.filter(i => i._localId !== localId));
    setIsDirty(true);
  };

  const moveIngredient = (localId: string, dir: -1 | 1) => {
    setIngredients(prev => {
      const idx = prev.findIndex(i => i._localId === localId);
      if (idx < 0) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
    setIsDirty(true);
  };

  // ── Adım işlemleri ────────────────────────────────────────────
  const addStep = () => {
    setSteps(prev => [
      ...prev,
      {
        _localId: newLocalId(),
        _isNew: true,
        stepOrder: prev.length + 1,
        instruction: "",
        isCritical: false,
        estimatedSec: null,
      },
    ]);
    setIsDirty(true);
  };

  const updateStep = (localId: string, patch: Partial<BranchRecipeStep>) => {
    setSteps(prev =>
      prev.map(s => (s._localId === localId ? { ...s, ...patch } : s))
    );
    setIsDirty(true);
  };

  const deleteStep = (localId: string) => {
    setSteps(prev => prev.filter(s => s._localId !== localId));
    setIsDirty(true);
  };

  const moveStep = (localId: string, dir: -1 | 1) => {
    setSteps(prev => {
      const idx = prev.findIndex(s => s._localId === localId);
      if (idx < 0) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
    setIsDirty(true);
  };

  // ── Aroma işlemleri ───────────────────────────────────────────
  const addAroma = () => {
    setAromas(prev => [
      ...prev,
      {
        _localId: newLocalId(),
        _isNew: true,
        aromaId: 0,
        slotName: 'primary',
        overridePumpsMassivo: null,
        overridePumpsLongDiva: null,
        overrideUnit: 'pump',
        isDefault: false,
        displayNameOverride: null,
        isActive: true,
      },
    ]);
    setIsDirty(true);
  };

  const updateAroma = (localId: string, patch: Partial<AromaCompatibility>) => {
    setAromas(prev =>
      prev.map(a => (a._localId === localId ? { ...a, ...patch } : a))
    );
    setIsDirty(true);
  };

  const deleteAroma = (localId: string) => {
    setAromas(prev => prev.filter(a => a._localId !== localId));
    setIsDirty(true);
  };

  // ── Geri butonu — dirty check ────────────────────────────────
  const handleBack = () => {
    if (isDirty) {
      setPendingExitUrl(`/branch-recipes/admin/${detail?.product.id}`);
      setConfirmExitOpen(true);
    } else {
      setLocation(`/branch-recipes/admin/${detail?.product.id ?? ''}`);
    }
  };

  // ── Yetki kontrolü ───────────────────────────────────────────
  if (!canEdit) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold mb-2">Yetkiniz yok</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Reçete düzenleme sadece HQ rollerine açık (admin, CEO, CGO, koç, eğitmen).
            </p>
            <Button onClick={() => setLocation('/branch-recipes')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" /> Geri dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold mb-2">Reçete bulunamadı</h2>
            <Button onClick={() => setLocation('/branch-recipes/admin')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" /> Yönetim paneline dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSaving = saveIngredientsMutation.isPending || saveStepsMutation.isPending || saveAromasMutation.isPending;

  return (
    <div className="container mx-auto p-3 sm:p-4 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="shrink-0"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold truncate flex items-center gap-2">
              <Coffee className="h-5 w-5 shrink-0 text-primary" />
              {detail.product.name}
            </h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
              <Badge variant="outline">{SIZE_LABEL[detail.recipe.size] || detail.recipe.size}</Badge>
              <Badge variant="outline">v{detail.recipe.version}</Badge>
              {detail.recipe.isTemplate && (
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" /> Şablon
                </Badge>
              )}
              {isDirty && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" /> Kaydedilmedi
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Button
          onClick={handleSaveAll}
          disabled={!isDirty || isSaving}
          className="gap-2 shrink-0"
          data-testid="button-save-all"
        >
          {isSaving ? (
            <>Kaydediliyor...</>
          ) : (
            <>
              <Save className="h-4 w-4" /> Tümünü Kaydet
            </>
          )}
        </Button>
      </div>

      {/* Yardım kutusu */}
      <Card className="mb-4 border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="p-3 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p>
              <strong>Sıralama:</strong> Yukarı/aşağı oklarla sırayı değiştir. Üst-alt = malzeme/adım sırası.
            </p>
            <p>
              <strong>Toplu kaydet:</strong> "Tümünü Kaydet" butonu hem malzemeleri hem adımları aynı anda günceller.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'ingredients' | 'steps' | 'aromas')}>
        <TabsList className={`grid w-full mb-4 ${detail.recipe.isTemplate ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="ingredients" data-testid="tab-ingredients">
            <ListChecks className="h-4 w-4 mr-2" />
            Malzemeler ({ingredients.length})
          </TabsTrigger>
          <TabsTrigger value="steps" data-testid="tab-steps">
            <Coffee className="h-4 w-4 mr-2" />
            Adımlar ({steps.length})
          </TabsTrigger>
          {detail.recipe.isTemplate && (
            <TabsTrigger value="aromas" data-testid="tab-aromas">
              <Sparkles className="h-4 w-4 mr-2" />
              Aromalar ({aromas.length})
            </TabsTrigger>
          )}
        </TabsList>

        {/* Malzemeler Tab */}
        <TabsContent value="ingredients" className="space-y-3">
          {ingredients.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground text-sm">
                Henüz malzeme eklenmedi. Aşağıdan ekleyin.
              </CardContent>
            </Card>
          )}

          {ingredients.map((ing, idx) => (
            <Card key={ing._localId} data-testid={`ingredient-card-${idx}`}>
              <CardContent className="p-3 space-y-3">
                {/* Sıra + Sil */}
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    #{idx + 1}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={idx === 0}
                      onClick={() => moveIngredient(ing._localId!, -1)}
                      data-testid={`button-move-up-ingredient-${idx}`}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={idx === ingredients.length - 1}
                      onClick={() => moveIngredient(ing._localId!, 1)}
                      data-testid={`button-move-down-ingredient-${idx}`}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteIngredient(ing._localId!)}
                      data-testid={`button-delete-ingredient-${idx}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Malzeme Adı */}
                <div className="space-y-1">
                  <Label htmlFor={`ing-name-${idx}`} className="text-xs">
                    Malzeme Adı *
                  </Label>
                  <Input
                    id={`ing-name-${idx}`}
                    value={ing.ingredientName}
                    onChange={(e) =>
                      updateIngredient(ing._localId!, { ingredientName: e.target.value })
                    }
                    placeholder="ör: Espresso shot, Süt, Buz..."
                    data-testid={`input-ingredient-name-${idx}`}
                  />
                </div>

                {/* Miktar + Birim — yan yana mobil-friendly */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor={`ing-qty-${idx}`} className="text-xs">
                      Miktar
                    </Label>
                    <Input
                      id={`ing-qty-${idx}`}
                      value={ing.quantityText || ''}
                      onChange={(e) => {
                        const text = e.target.value;
                        // Numeric'i text'ten otomatik parse et
                        const numMatch = text.match(/[\d.,]+/);
                        const num = numMatch ? numMatch[0].replace(',', '.') : null;
                        updateIngredient(ing._localId!, {
                          quantityText: text,
                          quantityNumeric: num,
                        });
                      }}
                      placeholder="ör: 30, 1, 2-3"
                      data-testid={`input-ingredient-quantity-${idx}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`ing-unit-${idx}`} className="text-xs">
                      Birim
                    </Label>
                    <Select
                      value={ing.unit || ''}
                      onValueChange={(v) =>
                        updateIngredient(ing._localId!, { unit: v === '__none' ? null : v })
                      }
                    >
                      <SelectTrigger id={`ing-unit-${idx}`} data-testid={`select-ingredient-unit-${idx}`}>
                        <SelectValue placeholder="Seç..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">— Yok —</SelectItem>
                        {COMMON_UNITS.map(u => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Hazırlama notu */}
                <div className="space-y-1">
                  <Label htmlFor={`ing-note-${idx}`} className="text-xs">
                    Hazırlama Notu (opsiyonel)
                  </Label>
                  <Input
                    id={`ing-note-${idx}`}
                    value={ing.preparationNote || ''}
                    onChange={(e) =>
                      updateIngredient(ing._localId!, { preparationNote: e.target.value || null })
                    }
                    placeholder="ör: Soğuk olmalı, Önceden çekilmiş..."
                    data-testid={`input-ingredient-note-${idx}`}
                  />
                </div>

                {/* Aroma slot (template ise) */}
                {detail.recipe.isTemplate && (
                  <div className="flex items-center justify-between p-2 rounded bg-muted/40">
                    <div className="flex flex-col">
                      <Label htmlFor={`ing-aroma-${idx}`} className="text-xs cursor-pointer">
                        Değişken Aroma?
                      </Label>
                      <span className="text-[10px] text-muted-foreground">
                        Aktifse, müşteri bu malzeme için aroma seçebilir
                      </span>
                    </div>
                    <Switch
                      id={`ing-aroma-${idx}`}
                      checked={!!ing.isVariableAroma}
                      onCheckedChange={(checked) =>
                        updateIngredient(ing._localId!, {
                          isVariableAroma: checked,
                          aromaSlot: checked ? (ing.aromaSlot || 'primary') : null,
                        })
                      }
                      data-testid={`switch-aroma-${idx}`}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Yeni Malzeme Ekle */}
          <Button
            variant="outline"
            className="w-full gap-2 border-dashed"
            onClick={addIngredient}
            data-testid="button-add-ingredient"
          >
            <Plus className="h-4 w-4" /> Yeni Malzeme Ekle
          </Button>
        </TabsContent>

        {/* Adımlar Tab */}
        <TabsContent value="steps" className="space-y-3">
          {steps.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground text-sm">
                Henüz adım eklenmedi. Aşağıdan ekleyin.
              </CardContent>
            </Card>
          )}

          {steps.map((step, idx) => (
            <Card key={step._localId} data-testid={`step-card-${idx}`}>
              <CardContent className="p-3 space-y-3">
                {/* Sıra + Aksiyon */}
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    Adım {idx + 1}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={idx === 0}
                      onClick={() => moveStep(step._localId!, -1)}
                      data-testid={`button-move-up-step-${idx}`}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={idx === steps.length - 1}
                      onClick={() => moveStep(step._localId!, 1)}
                      data-testid={`button-move-down-step-${idx}`}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteStep(step._localId!)}
                      data-testid={`button-delete-step-${idx}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Talimat */}
                <div className="space-y-1">
                  <Label htmlFor={`step-inst-${idx}`} className="text-xs">
                    Talimat *
                  </Label>
                  <Textarea
                    id={`step-inst-${idx}`}
                    value={step.instruction}
                    onChange={(e) =>
                      updateStep(step._localId!, { instruction: e.target.value })
                    }
                    placeholder="ör: Espresso makinesinden 30ml shot çek..."
                    rows={3}
                    data-testid={`textarea-step-instruction-${idx}`}
                  />
                </div>

                {/* Süre + Kritik */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor={`step-sec-${idx}`} className="text-xs">
                      Tahmini Süre (sn)
                    </Label>
                    <Input
                      id={`step-sec-${idx}`}
                      type="number"
                      min={0}
                      value={step.estimatedSec ?? ''}
                      onChange={(e) =>
                        updateStep(step._localId!, {
                          estimatedSec: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      placeholder="ör: 25"
                      data-testid={`input-step-sec-${idx}`}
                    />
                  </div>
                  <div className="flex flex-col justify-end gap-1">
                    <Label htmlFor={`step-critical-${idx}`} className="text-xs">
                      Kritik adım?
                    </Label>
                    <div className="flex items-center h-10 px-3 rounded border bg-background">
                      <Switch
                        id={`step-critical-${idx}`}
                        checked={!!step.isCritical}
                        onCheckedChange={(checked) =>
                          updateStep(step._localId!, { isCritical: checked })
                        }
                        data-testid={`switch-step-critical-${idx}`}
                      />
                      <span className="ml-2 text-xs text-muted-foreground">
                        {step.isCritical ? "Evet (vurgulu gösterilir)" : "Hayır"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Yeni Adım Ekle */}
          <Button
            variant="outline"
            className="w-full gap-2 border-dashed"
            onClick={addStep}
            data-testid="button-add-step"
          >
            <Plus className="h-4 w-4" /> Yeni Adım Ekle
          </Button>
        </TabsContent>

        {/* Aromalar Tab — sadece template reçetelerde */}
        {detail.recipe.isTemplate && (
        <TabsContent value="aromas" className="space-y-3">
          <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
              <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p>
                  <strong>Şablon reçete:</strong> Müşteri farklı aromalar seçebilir (ör: Mojito şablonu için Mango/Şeftali/Pinkberry).
                </p>
                <p>
                  Her aroma için <strong>özel pump miktarı</strong> belirleyebilirsiniz. Boş bırakırsanız reçete varsayılanı kullanılır.
                </p>
              </div>
            </CardContent>
          </Card>

          {aromas.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground text-sm">
                Henüz aroma eklenmedi. Aşağıdan ekleyin.
              </CardContent>
            </Card>
          )}

          {aromas.map((aroma, idx) => {
            const aromaInfo = aromaOptions.find(o => o.id === aroma.aromaId);
            const isUnique = aromas.filter(a => a.aromaId === aroma.aromaId && a.slotName === aroma.slotName).length === 1;
            return (
            <Card key={aroma._localId} data-testid={`aroma-card-${idx}`}>
              <CardContent className="p-3 space-y-3">
                {/* Aroma seçici + sil */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {aromaInfo?.iconEmoji && (
                      <span className="text-2xl">{aromaInfo.iconEmoji}</span>
                    )}
                    <Badge variant="outline" className="font-mono text-xs">
                      #{idx + 1}
                    </Badge>
                    {aroma.isDefault && (
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Varsayılan
                      </Badge>
                    )}
                    {!isUnique && (
                      <Badge variant="destructive" className="gap-1 text-[10px]">
                        <AlertTriangle className="h-2.5 w-2.5" /> Tekrar
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive shrink-0"
                    onClick={() => deleteAroma(aroma._localId!)}
                    data-testid={`button-delete-aroma-${idx}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Aroma seçimi */}
                <div className="space-y-1">
                  <Label className="text-xs">Aroma *</Label>
                  <Select
                    value={aroma.aromaId > 0 ? String(aroma.aromaId) : ''}
                    onValueChange={(v) =>
                      updateAroma(aroma._localId!, { aromaId: parseInt(v) })
                    }
                  >
                    <SelectTrigger data-testid={`select-aroma-${idx}`}>
                      <SelectValue placeholder="Aroma seç..." />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Kategoriye göre grupla */}
                      {['fruit', 'herbal', 'dairy', 'sweet', 'topping'].map(cat => {
                        const inCat = aromaOptions.filter(o => o.category === cat);
                        if (inCat.length === 0) return null;
                        const catLabel: Record<string, string> = {
                          fruit: '🍓 Meyve', herbal: '🌿 Bitki', dairy: '🥛 Süt Ürünü',
                          sweet: '🍯 Tatlı', topping: '✨ Süsleme',
                        };
                        return (
                          <div key={cat}>
                            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                              {catLabel[cat] || cat}
                            </div>
                            {inCat.map(opt => (
                              <SelectItem key={opt.id} value={String(opt.id)}>
                                {opt.iconEmoji} {opt.name}
                              </SelectItem>
                            ))}
                          </div>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Slot adı */}
                <div className="space-y-1">
                  <Label className="text-xs">Slot</Label>
                  <Select
                    value={aroma.slotName}
                    onValueChange={(v) => updateAroma(aroma._localId!, { slotName: v })}
                  >
                    <SelectTrigger data-testid={`select-aroma-slot-${idx}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Birincil Aroma</SelectItem>
                      <SelectItem value="primary_fruit">Birincil Meyve</SelectItem>
                      <SelectItem value="secondary">İkincil Aroma</SelectItem>
                      <SelectItem value="secondary_fruit">İkincil Meyve</SelectItem>
                      <SelectItem value="topping">Süsleme</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Pump miktarları */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Massivo Pump</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={aroma.overridePumpsMassivo ?? ''}
                      onChange={(e) =>
                        updateAroma(aroma._localId!, {
                          overridePumpsMassivo: e.target.value || null,
                        })
                      }
                      placeholder="Varsayılan"
                      data-testid={`input-aroma-massivo-${idx}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Long Diva Pump</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={aroma.overridePumpsLongDiva ?? ''}
                      onChange={(e) =>
                        updateAroma(aroma._localId!, {
                          overridePumpsLongDiva: e.target.value || null,
                        })
                      }
                      placeholder="Varsayılan"
                      data-testid={`input-aroma-longdiva-${idx}`}
                    />
                  </div>
                </div>

                {/* Override unit + display name */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Birim</Label>
                    <Select
                      value={aroma.overrideUnit || 'pump'}
                      onValueChange={(v) => updateAroma(aroma._localId!, { overrideUnit: v })}
                    >
                      <SelectTrigger data-testid={`select-aroma-unit-${idx}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pump">pump</SelectItem>
                        <SelectItem value="ölçek">ölçek</SelectItem>
                        <SelectItem value="adet">adet</SelectItem>
                        <SelectItem value="dilim">dilim</SelectItem>
                        <SelectItem value="parça">parça</SelectItem>
                        <SelectItem value="serpiştir">serpiştir</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Pazarlama Adı (opsiyonel)</Label>
                    <Input
                      value={aroma.displayNameOverride || ''}
                      onChange={(e) =>
                        updateAroma(aroma._localId!, { displayNameOverride: e.target.value || null })
                      }
                      placeholder="ör: Moulin Rouge"
                      data-testid={`input-aroma-display-name-${idx}`}
                    />
                  </div>
                </div>

                {/* Varsayılan toggle */}
                <div className="flex items-center justify-between p-2 rounded bg-muted/40">
                  <div className="flex flex-col">
                    <Label className="text-xs cursor-pointer">Varsayılan kombinasyon mu?</Label>
                    <span className="text-[10px] text-muted-foreground">
                      Aktifse müşteri ekranında önce gösterilir
                    </span>
                  </div>
                  <Switch
                    checked={!!aroma.isDefault}
                    onCheckedChange={(checked) =>
                      updateAroma(aroma._localId!, { isDefault: checked })
                    }
                    data-testid={`switch-aroma-default-${idx}`}
                  />
                </div>
              </CardContent>
            </Card>
          );})}

          {/* Yeni Aroma Ekle */}
          <Button
            variant="outline"
            className="w-full gap-2 border-dashed"
            onClick={addAroma}
            data-testid="button-add-aroma"
          >
            <Plus className="h-4 w-4" /> Yeni Aroma Ekle
          </Button>
        </TabsContent>
        )}
      </Tabs>

      {/* Sticky Save Button (mobile) */}
      {isDirty && (
        <div className="fixed bottom-4 left-4 right-4 sm:hidden z-50">
          <Button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="w-full gap-2 shadow-lg"
            size="lg"
            data-testid="button-save-all-sticky"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Kaydediliyor...' : 'Tümünü Kaydet'}
          </Button>
        </div>
      )}

      {/* Çıkış onayı (kaydedilmemiş varsa) */}
      <AlertDialog open={confirmExitOpen} onOpenChange={setConfirmExitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kaydedilmemiş değişiklikler var</AlertDialogTitle>
            <AlertDialogDescription>
              Bu sayfadan çıkarsanız değişiklikleriniz kaybolacak. Önce kaydetmek ister misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmExitOpen(false);
                if (pendingExitUrl) setLocation(pendingExitUrl);
              }}
            >
              Kaydetmeden çık
            </Button>
            <AlertDialogAction
              onClick={async () => {
                await handleSaveAll();
                setConfirmExitOpen(false);
                if (pendingExitUrl && !isDirty) setLocation(pendingExitUrl);
              }}
            >
              <Save className="h-4 w-4 mr-2" /> Kaydet ve çık
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
