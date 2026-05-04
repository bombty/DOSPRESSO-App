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
  Coffee, ListChecks, AlertTriangle, CheckCircle2, Sparkles, X, Star, StarOff,
  Brain, Wand2, Loader2,
} from "lucide-react";

const HQ_EDIT_ROLES = ['admin', 'ceo', 'cgo', 'coach', 'trainer'];

const COMMON_UNITS = ['gr', 'ml', 'adet', 'pump', 'shot', 'scoop', 'kg', 'lt', 'çay kaşığı', 'yemek kaşığı'];

const SLOT_OPTIONS = [
  { value: 'primary', label: 'Birincil Aroma' },
  { value: 'primary_fruit', label: 'Birinci Meyve' },
  { value: 'secondary_fruit', label: 'İkinci Meyve' },
  { value: 'secondary', label: 'İkincil Aroma' },
];

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
  const [isDirty, setIsDirty] = useState(false);
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);
  const [pendingExitUrl, setPendingExitUrl] = useState<string | null>(null);

  // Quiz generator state
  const [quizGenOpen, setQuizGenOpen] = useState(false);
  const [quizMaxQuestions, setQuizMaxQuestions] = useState(8);
  const [quizDifficulty, setQuizDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed');
  const [quizReplaceExisting, setQuizReplaceExisting] = useState(true);
  const [quizPreview, setQuizPreview] = useState<any[] | null>(null);

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

  // Quiz preview mutation (dryRun=true)
  const quizPreviewMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/branch-recipes/${recipeId}/quizzes/generate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxQuestions: quizMaxQuestions,
          difficulty: quizDifficulty,
          dryRun: true,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || e.message || "Quiz üretilemedi");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setQuizPreview(data.quizzes ?? []);
      if ((data.quizzes ?? []).length === 0) {
        toast({
          title: "Quiz üretilemedi",
          description: data.message || "Yetersiz veri — daha fazla malzeme/adım ekleyin",
          variant: "destructive",
        });
      }
    },
    onError: (e: any) => {
      toast({ title: "Hata", description: e?.message || 'Quiz üretilemedi', variant: 'destructive' });
    },
  });

  // Quiz apply mutation (DB'ye yaz)
  const quizApplyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/branch-recipes/${recipeId}/quizzes/generate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxQuestions: quizMaxQuestions,
          difficulty: quizDifficulty,
          dryRun: false,
          replace: quizReplaceExisting,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || e.message || "Quiz kaydedilemedi");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Quiz kaydedildi",
        description: data.message,
      });
      setQuizGenOpen(false);
      setQuizPreview(null);
      queryClient.invalidateQueries({ queryKey: ['/api/branch-recipes', recipeId] });
    },
    onError: (e: any) => {
      toast({ title: "Hata", description: e?.message || 'Quiz kaydedilemedi', variant: 'destructive' });
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

    try {
      await Promise.all([
        saveIngredientsMutation.mutateAsync(ingredients),
        saveStepsMutation.mutateAsync(steps),
      ]);
      toast({
        title: "Kaydedildi",
        description: `${ingredients.length} malzeme + ${steps.length} adım güncellendi.`,
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

  const isSaving = saveIngredientsMutation.isPending || saveStepsMutation.isPending;

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
        <div className="flex gap-2 shrink-0">
          <Button
            onClick={() => setQuizGenOpen(true)}
            variant="outline"
            disabled={isDirty}
            className="gap-2"
            title={isDirty ? "Önce malzeme/adım değişikliklerini kaydedin" : "Bu reçete için otomatik quiz soruları üret"}
            data-testid="button-generate-quiz"
          >
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">Quiz Üret</span>
          </Button>
          <Button
            onClick={handleSaveAll}
            disabled={!isDirty || isSaving}
            className="gap-2"
            data-testid="button-save-all"
          >
            {isSaving ? (
              <>Kaydediliyor...</>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline">Tümünü Kaydet</span>
                <span className="sm:hidden">Kaydet</span>
              </>
            )}
          </Button>
        </div>
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
              Aromalar
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

        {/* Aromalar Tab — sadece template reçeteler için */}
        {detail.recipe.isTemplate && (
          <TabsContent value="aromas" className="space-y-3">
            <AromaCompatibilityManager recipeId={recipeId!} />
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

      {/* Quiz Generator Modal */}
      <AlertDialog open={quizGenOpen} onOpenChange={(open) => {
        setQuizGenOpen(open);
        if (!open) setQuizPreview(null);
      }}>
        <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              Otomatik Quiz Üretici
            </AlertDialogTitle>
            <AlertDialogDescription>
              {detail?.product.name} için reçete malzeme ve adımlarından otomatik quiz soruları üret.
              Önce "Önizle" ile görür, beğenirsen "Kaydet" dersin.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-2">
            {/* Ayarlar */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Maksimum Soru Sayısı</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={quizMaxQuestions}
                  onChange={(e) => setQuizMaxQuestions(Math.min(20, Math.max(1, Number(e.target.value) || 8)))}
                  data-testid="input-quiz-max-questions"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Zorluk</Label>
                <Select value={quizDifficulty} onValueChange={(v) => setQuizDifficulty(v as any)}>
                  <SelectTrigger data-testid="select-quiz-difficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mixed">Karışık</SelectItem>
                    <SelectItem value="easy">Kolay</SelectItem>
                    <SelectItem value="medium">Orta</SelectItem>
                    <SelectItem value="hard">Zor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-muted/40">
              <div>
                <Label htmlFor="quiz-replace" className="text-xs cursor-pointer">
                  Eski otomatik quizleri sil
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  Manuel girilenler korunur. Sadece "auto-generated" olanlar silinir.
                </p>
              </div>
              <Switch
                id="quiz-replace"
                checked={quizReplaceExisting}
                onCheckedChange={setQuizReplaceExisting}
                data-testid="switch-quiz-replace"
              />
            </div>

            {/* Önizleme alanı */}
            {quizPreview && quizPreview.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-3">
                <div className="flex items-center justify-between sticky top-0 bg-background pb-2 border-b">
                  <span className="text-sm font-semibold">
                    Önizleme: {quizPreview.length} soru
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    Henüz kaydedilmedi
                  </Badge>
                </div>
                {quizPreview.map((q, idx) => (
                  <div key={idx} className="border rounded p-2.5 space-y-1.5 text-xs">
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="text-[9px] shrink-0">#{idx + 1}</Badge>
                      <Badge
                        variant="outline"
                        className={`text-[9px] shrink-0 ${
                          q.difficulty === 'easy' ? 'border-green-500 text-green-700' :
                          q.difficulty === 'medium' ? 'border-amber-500 text-amber-700' :
                          'border-red-500 text-red-700'
                        }`}
                      >
                        {q.difficulty === 'easy' ? 'Kolay' : q.difficulty === 'medium' ? 'Orta' : 'Zor'}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] shrink-0">
                        {q.focusArea}
                      </Badge>
                    </div>
                    <p className="font-medium">{q.question}</p>
                    {q.options && (
                      <ul className="ml-4 space-y-0.5">
                        {q.options.map((opt: string, i: number) => (
                          <li
                            key={i}
                            className={opt === q.correctAnswer ? 'font-semibold text-green-700 dark:text-green-400' : ''}
                          >
                            {opt === q.correctAnswer && '✓ '}{opt}
                          </li>
                        ))}
                      </ul>
                    )}
                    {q.explanation && (
                      <p className="text-[10px] text-muted-foreground italic mt-1">
                        💡 {q.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {quizPreview && quizPreview.length === 0 && (
              <div className="rounded border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                Yeterli veri yok — bu reçeteden quiz üretilemedi. Daha fazla malzeme/adım ekleyin.
              </div>
            )}
          </div>

          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={() => setQuizPreview(null)}>Kapat</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => quizPreviewMutation.mutate()}
              disabled={quizPreviewMutation.isPending}
              data-testid="button-quiz-preview"
            >
              {quizPreviewMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Üretiliyor</>
              ) : (
                <><Wand2 className="h-4 w-4 mr-2" /> Önizle</>
              )}
            </Button>
            <AlertDialogAction
              disabled={!quizPreview || quizPreview.length === 0 || quizApplyMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                quizApplyMutation.mutate();
              }}
              data-testid="button-quiz-apply"
            >
              {quizApplyMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Kaydediliyor</>
              ) : (
                <><Save className="h-4 w-4 mr-2" /> Kaydet</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// AROMA COMPATIBILITY MANAGER — Template reçete için aroma yönetimi
// ════════════════════════════════════════════════════════════════

interface AromaCompatItem {
  aromaId: number;
  slotName: string;
  overridePumpsMassivo: string | null;
  overridePumpsLongDiva: string | null;
  overrideUnit: string | null;
  isDefault: boolean;
  displayNameOverride: string | null;
  // Editor only
  _localId?: string;
  _aromaName?: string;
  _aromaIcon?: string | null;
  _aromaCategory?: string;
}

interface AromaOption {
  id: number;
  name: string;
  shortCode: string | null;
  category: string;
  description: string | null;
  colorHex: string | null;
  iconEmoji: string | null;
  formType: string;
  isActive: boolean;
}

function AromaCompatibilityManager({ recipeId }: { recipeId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [compats, setCompats] = useState<AromaCompatItem[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedAromaId, setSelectedAromaId] = useState<string>('');
  const [selectedSlotName, setSelectedSlotName] = useState<string>('primary');

  // Tüm aromalar (modal için)
  const { data: allAromasData } = useQuery<{ aromas: AromaOption[]; grouped: Record<string, AromaOption[]> }>({
    queryKey: ['/api/aroma-options'],
    queryFn: async () => {
      const res = await fetch('/api/aroma-options', { credentials: 'include' });
      if (!res.ok) throw new Error('Aromalar yüklenemedi');
      return res.json();
    },
    staleTime: 300000,
  });

  // Mevcut compatibility
  const { data: currentData, isLoading } = useQuery<{
    slots: Record<string, any[]>;
    total: number;
  }>({
    queryKey: ['/api/branch-recipes', recipeId, 'aroma-options', 'edit'],
    queryFn: async () => {
      const res = await fetch(`/api/branch-recipes/${recipeId}/aroma-options`, { credentials: 'include' });
      if (!res.ok) throw new Error('Yüklenemedi');
      return res.json();
    },
    staleTime: 0,
  });

  useEffect(() => {
    if (currentData) {
      const items: AromaCompatItem[] = [];
      let counter = 0;
      for (const [slotName, slotItems] of Object.entries(currentData.slots || {})) {
        for (const item of slotItems as any[]) {
          items.push({
            aromaId: item.aroma.id,
            slotName,
            overridePumpsMassivo: item.overridePumpsMassivo,
            overridePumpsLongDiva: item.overridePumpsLongDiva,
            overrideUnit: item.overrideUnit,
            isDefault: item.isDefault,
            displayNameOverride: item.displayNameOverride,
            _localId: `_${++counter}`,
            _aromaName: item.aroma.name,
            _aromaIcon: item.aroma.iconEmoji,
            _aromaCategory: item.aroma.category,
          });
        }
      }
      setCompats(items);
      setIsDirty(false);
    }
  }, [currentData]);

  const allAromas = allAromasData?.aromas ?? [];
  const groupedAromas = allAromasData?.grouped ?? {};

  // Aromaları kullanılabilir filtrele (zaten ekli olanları çıkar)
  const availableAromas = useMemo(() => {
    const usedKey = new Set(compats.map(c => `${c.aromaId}_${c.slotName}`));
    return allAromas.filter(a => !usedKey.has(`${a.id}_${selectedSlotName}`));
  }, [allAromas, compats, selectedSlotName]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = compats.map(({ _localId, _aromaName, _aromaIcon, _aromaCategory, ...rest }) => rest);
      const res = await fetch(`/api/branch-recipes/${recipeId}/aroma-compatibility`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compatibilities: payload }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || e.message || 'Kaydedilemedi');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: 'Aromalar kaydedildi', description: `${data.count} kombinasyon güncellendi.` });
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['/api/branch-recipes', recipeId, 'aroma-options'] });
    },
    onError: (e: any) => {
      toast({ title: 'Kaydedilemedi', description: e?.message || 'Hata', variant: 'destructive' });
    },
  });

  const addCompat = () => {
    if (!selectedAromaId) return;
    const aroma = allAromas.find(a => a.id === Number(selectedAromaId));
    if (!aroma) return;

    let counter = compats.length;
    const newItem: AromaCompatItem = {
      aromaId: aroma.id,
      slotName: selectedSlotName,
      overridePumpsMassivo: null,
      overridePumpsLongDiva: null,
      overrideUnit: 'pump',
      isDefault: compats.filter(c => c.slotName === selectedSlotName).length === 0,
      displayNameOverride: null,
      _localId: `_${++counter}`,
      _aromaName: aroma.name,
      _aromaIcon: aroma.iconEmoji,
      _aromaCategory: aroma.category,
    };

    setCompats(prev => [...prev, newItem]);
    setIsDirty(true);
    setAddModalOpen(false);
    setSelectedAromaId('');
  };

  const updateCompat = (localId: string, patch: Partial<AromaCompatItem>) => {
    setCompats(prev => prev.map(c => c._localId === localId ? { ...c, ...patch } : c));
    setIsDirty(true);
  };

  const removeCompat = (localId: string) => {
    setCompats(prev => prev.filter(c => c._localId !== localId));
    setIsDirty(true);
  };

  const toggleDefault = (localId: string) => {
    setCompats(prev => {
      const target = prev.find(c => c._localId === localId);
      if (!target) return prev;
      // Aynı slot içinde sadece bir tanesi default olabilir
      return prev.map(c => {
        if (c.slotName !== target.slotName) return c;
        if (c._localId === localId) return { ...c, isDefault: !target.isDefault };
        return { ...c, isDefault: false };
      });
    });
    setIsDirty(true);
  };

  // Slot'a göre grupla
  const groupedCompats = useMemo(() => {
    const g: Record<string, AromaCompatItem[]> = {};
    for (const c of compats) {
      if (!g[c.slotName]) g[c.slotName] = [];
      g[c.slotName].push(c);
    }
    return g;
  }, [compats]);

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  return (
    <div className="space-y-4">
      {/* Bilgi kutusu */}
      <Card className="border-purple-200 dark:border-purple-900 bg-purple-50/40 dark:bg-purple-950/20">
        <CardContent className="p-3 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-2">
          <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p>
              <strong>Aroma uyumluluğu</strong> — bu şablon reçetenin hangi aromaları kabul edeceğini ve her aroma için pump miktarını yönetir.
            </p>
            <p>
              <strong>Slot</strong> — aroma yerleştirme noktası. Tek aromalı reçeteler "Birincil" kullanır.
              Çift aromalı (Meyveli Yoğurt vb.) "Birinci Meyve" + "İkinci Meyve" kullanır.
            </p>
            <p>
              <strong>Varsayılan</strong> ⭐ — müşteri aroma seçmediğinde otomatik gelen.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Kaydet butonu */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">
          {compats.length} aroma kombinasyonu
          {isDirty && (
            <Badge variant="destructive" className="ml-2 text-[9px]">
              Kaydedilmedi
            </Badge>
          )}
        </span>
        <div className="flex gap-2">
          <Button
            onClick={() => setAddModalOpen(true)}
            variant="outline"
            size="sm"
            className="gap-1.5"
            data-testid="button-add-aroma-compat"
          >
            <Plus className="h-4 w-4" /> Ekle
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!isDirty || saveMutation.isPending}
            size="sm"
            className="gap-1.5"
            data-testid="button-save-aromas"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      </div>

      {/* Slot'lara göre listele */}
      {Object.keys(groupedCompats).length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground text-sm">
            Henüz aroma uyumluluğu tanımlanmadı. "Ekle" ile başlayın.
          </CardContent>
        </Card>
      )}

      {Object.entries(groupedCompats).map(([slotName, items]) => (
        <Card key={slotName}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
              {SLOT_OPTIONS.find(s => s.value === slotName)?.label || slotName}
              <Badge variant="outline" className="ml-2 text-[9px]">{items.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.map(item => (
              <div
                key={item._localId}
                className="border rounded-lg p-3 space-y-2"
                data-testid={`aroma-compat-${item.aromaId}-${item.slotName}`}
              >
                {/* Üst satır: emoji + isim + default + sil */}
                <div className="flex items-center gap-2 flex-wrap">
                  {item._aromaIcon && (
                    <span className="text-xl shrink-0" aria-hidden>{item._aromaIcon}</span>
                  )}
                  <span className="font-medium text-sm">{item._aromaName}</span>
                  <Badge variant="outline" className="text-[9px]">
                    {item._aromaCategory}
                  </Badge>
                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => toggleDefault(item._localId!)}
                      title={item.isDefault ? "Varsayılan değil" : "Varsayılan yap"}
                      data-testid={`button-toggle-default-${item.aromaId}`}
                    >
                      {item.isDefault ? (
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      ) : (
                        <StarOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeCompat(item._localId!)}
                      data-testid={`button-remove-aroma-${item.aromaId}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Pump miktarları */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Massivo (pump)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={item.overridePumpsMassivo ?? ''}
                      onChange={(e) =>
                        updateCompat(item._localId!, { overridePumpsMassivo: e.target.value || null })
                      }
                      placeholder="ör: 3"
                      className="h-8 text-sm"
                      data-testid={`input-pumps-massivo-${item.aromaId}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Long Diva (pump)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={item.overridePumpsLongDiva ?? ''}
                      onChange={(e) =>
                        updateCompat(item._localId!, { overridePumpsLongDiva: e.target.value || null })
                      }
                      placeholder="ör: 4"
                      className="h-8 text-sm"
                      data-testid={`input-pumps-longdiva-${item.aromaId}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Birim</Label>
                    <Select
                      value={item.overrideUnit ?? 'pump'}
                      onValueChange={(v) => updateCompat(item._localId!, { overrideUnit: v })}
                    >
                      <SelectTrigger className="h-8 text-sm" data-testid={`select-unit-${item.aromaId}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pump">pump</SelectItem>
                        <SelectItem value="ölçek">ölçek</SelectItem>
                        <SelectItem value="gr">gr</SelectItem>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="adet">adet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Görüntü adı override */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">
                    Müşteriye Gösterilen İsim (opsiyonel — ör: "Moulin Rouge")
                  </Label>
                  <Input
                    value={item.displayNameOverride ?? ''}
                    onChange={(e) =>
                      updateCompat(item._localId!, { displayNameOverride: e.target.value || null })
                    }
                    placeholder={item._aromaName}
                    className="h-8 text-sm"
                    data-testid={`input-display-override-${item.aromaId}`}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Aroma ekleme modal'ı */}
      <AlertDialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Aroma Ekle</AlertDialogTitle>
            <AlertDialogDescription>
              Bu reçeteye yeni bir aroma uyumluluğu ekle.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Slot</Label>
              <Select value={selectedSlotName} onValueChange={setSelectedSlotName}>
                <SelectTrigger data-testid="select-add-slot">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SLOT_OPTIONS.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Aroma</Label>
              <Select value={selectedAromaId} onValueChange={setSelectedAromaId}>
                <SelectTrigger data-testid="select-add-aroma">
                  <SelectValue placeholder="Aroma seç..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(groupedAromas).map(([cat, list]) => (
                    <div key={cat}>
                      <div className="px-2 py-1 text-[10px] uppercase font-semibold text-muted-foreground">
                        {cat}
                      </div>
                      {(list as AromaOption[])
                        .filter(a => !compats.some(c => c.aromaId === a.id && c.slotName === selectedSlotName))
                        .map(a => (
                          <SelectItem key={a.id} value={String(a.id)}>
                            {a.iconEmoji ? `${a.iconEmoji} ` : ''}{a.name}
                          </SelectItem>
                        ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
              {availableAromas.length === 0 && (
                <p className="text-xs text-amber-600">
                  Bu slot için tüm aromalar zaten ekli.
                </p>
              )}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedAromaId('')}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              disabled={!selectedAromaId}
              onClick={addCompat}
              data-testid="button-confirm-add-aroma"
            >
              <Plus className="h-4 w-4 mr-2" /> Ekle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
