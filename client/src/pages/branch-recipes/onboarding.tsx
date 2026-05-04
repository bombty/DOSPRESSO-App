/**
 * BRANCH RECIPES — Onboarding Yönetimi (HQ Admin)
 *
 * URL: /branch-recipes/admin/onboarding
 * Yetki: admin, ceo, cgo, coach, trainer
 *
 * Backend:
 *   GET    /api/branch-onboarding (?includeInactive=true)
 *   POST   /api/branch-onboarding
 *   PATCH  /api/branch-onboarding/:id
 *   DELETE /api/branch-onboarding/:id
 *   POST   /api/branch-onboarding/reorder
 *
 * Bu sayfa: Rol seç → adımları gör/düzenle → reçeteleri ata
 *
 * Aslan istek: 4 May 2026 — TASK-ONBOARDING-001
 */

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
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
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Save, Pencil,
  GraduationCap, ListChecks, Coffee, AlertTriangle, Clock, Lock,
  CheckCircle2, X, BookOpen,
} from "lucide-react";

const HQ_EDIT_ROLES = ['admin', 'ceo', 'cgo', 'coach', 'trainer'];

const TARGET_ROLES = [
  { value: 'barista', label: 'Barista' },
  { value: 'bar_buddy', label: 'Bar Buddy' },
  { value: 'stajyer', label: 'Stajyer' },
  { value: 'supervisor', label: 'Süpervizör' },
  { value: 'supervisor_buddy', label: 'Süpervizör Buddy' },
  { value: 'mudur', label: 'Müdür' },
];

interface OnboardingStep {
  id: number;
  targetRole: string;
  stepNumber: number;
  title: string;
  description: string | null;
  recipeIds: number[];
  estimatedMinutes: number | null;
  prerequisiteStepIds: number[];
  completionCriteria: {
    minQuizScore?: number;
    requireSupervisorApproval?: boolean;
    requireRecipeDemo?: boolean;
  } | null;
  isActive: boolean;
}

interface BranchProduct {
  id: number;
  name: string;
  category: string;
}

interface BranchRecipe {
  id: number;
  productId: number;
  size: string;
  isActive: boolean;
}

export default function BranchRecipesOnboarding() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canEdit = user?.role && HQ_EDIT_ROLES.includes(user.role);

  const [selectedRole, setSelectedRole] = useState<string>('barista');
  const [editingStep, setEditingStep] = useState<OnboardingStep | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; title: string } | null>(null);

  // Tüm onboarding adımları
  const { data: onboardingData, isLoading } = useQuery<{
    steps: OnboardingStep[];
    grouped: Record<string, OnboardingStep[]>;
    roles: string[];
  }>({
    queryKey: ['/api/branch-onboarding', 'all'],
    queryFn: async () => {
      const res = await fetch('/api/branch-onboarding?includeInactive=true', { credentials: 'include' });
      if (!res.ok) throw new Error('Yüklenemedi');
      return res.json();
    },
    enabled: !!canEdit,
  });

  // Tüm ürünler ve reçeteler (recipe selector için)
  const { data: productsData } = useQuery<{ products: any[] }>({
    queryKey: ['/api/branch-products'],
    queryFn: async () => {
      const res = await fetch('/api/branch-products', { credentials: 'include' });
      if (!res.ok) throw new Error('Ürünler yüklenemedi');
      return res.json();
    },
    staleTime: 600000,
  });

  const allProducts: BranchProduct[] = productsData?.products ?? [];

  // Recipe ID'lerinden product/recipe bilgisi çıkar (lazy loaded)
  const [recipeNameCache, setRecipeNameCache] = useState<Record<number, string>>({});

  useEffect(() => {
    // İhtiyaç olan tüm recipe ID'lerini topla
    const allRecipeIds = new Set<number>();
    onboardingData?.steps.forEach(s => {
      (s.recipeIds || []).forEach(id => allRecipeIds.add(id));
    });

    // Cache'lenmemiş olanları yükle
    const missingIds = Array.from(allRecipeIds).filter(id => !recipeNameCache[id]);
    if (missingIds.length === 0) return;

    Promise.all(
      missingIds.map(async (id) => {
        try {
          const res = await fetch(`/api/branch-recipes/${id}`, { credentials: 'include' });
          if (!res.ok) return null;
          const data = await res.json();
          return { id, name: `${data.product?.name || 'Bilinmiyor'} (${data.recipe?.size === 'massivo' ? 'M' : data.recipe?.size === 'long_diva' ? 'L' : 'Std'})` };
        } catch {
          return null;
        }
      })
    ).then(results => {
      const newCache: Record<number, string> = {};
      results.forEach(r => {
        if (r) newCache[r.id] = r.name;
      });
      setRecipeNameCache(prev => ({ ...prev, ...newCache }));
    });
  }, [onboardingData]);

  // Mevcut role ait adımlar
  const currentSteps = useMemo(() => {
    return (onboardingData?.steps ?? [])
      .filter(s => s.targetRole === selectedRole)
      .sort((a, b) => a.stepNumber - b.stepNumber);
  }, [onboardingData?.steps, selectedRole]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: Partial<OnboardingStep>) => {
      const res = await fetch('/api/branch-onboarding', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, targetRole: selectedRole }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Kaydedilemedi');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Adım eklendi' });
      setEditorOpen(false);
      setEditingStep(null);
      queryClient.invalidateQueries({ queryKey: ['/api/branch-onboarding'] });
    },
    onError: (e: any) => {
      toast({ title: 'Hata', description: e?.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Partial<OnboardingStep> }) => {
      const res = await fetch(`/api/branch-onboarding/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Güncellenemedi');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Adım güncellendi' });
      setEditorOpen(false);
      setEditingStep(null);
      queryClient.invalidateQueries({ queryKey: ['/api/branch-onboarding'] });
    },
    onError: (e: any) => {
      toast({ title: 'Hata', description: e?.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/branch-onboarding/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Silinemedi');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Adım pasif edildi' });
      setDeleteConfirm(null);
      queryClient.invalidateQueries({ queryKey: ['/api/branch-onboarding'] });
    },
    onError: (e: any) => {
      toast({ title: 'Hata', description: e?.message, variant: 'destructive' });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: number[]) => {
      const res = await fetch('/api/branch-onboarding/reorder', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRole: selectedRole, orderedIds }),
      });
      if (!res.ok) throw new Error('Sıralanamadı');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/branch-onboarding'] });
    },
  });

  const moveStep = (index: number, dir: -1 | 1) => {
    const newIdx = index + dir;
    if (newIdx < 0 || newIdx >= currentSteps.length) return;
    const ids = currentSteps.map(s => s.id);
    [ids[index], ids[newIdx]] = [ids[newIdx], ids[index]];
    reorderMutation.mutate(ids);
  };

  const openCreate = () => {
    setEditingStep(null);
    setEditorOpen(true);
  };

  const openEdit = (step: OnboardingStep) => {
    setEditingStep(step);
    setEditorOpen(true);
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
              Onboarding yönetimi sadece HQ rollerine açık.
            </p>
            <Button onClick={() => setLocation('/branch-recipes')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" /> Geri
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 sm:p-4 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/branch-recipes/admin')}
            className="shrink-0"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Onboarding Yönetimi
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Rol bazlı eğitim adımları — barista hangi sırayla hangi reçeteyi öğrenecek
            </p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2 shrink-0" data-testid="button-add-step">
          <Plus className="h-4 w-4" /> Yeni Adım
        </Button>
      </div>

      {/* Rol seçici */}
      <Card className="mb-4">
        <CardContent className="p-3">
          <Label className="text-xs mb-2 block">Hedef Rol</Label>
          <Tabs value={selectedRole} onValueChange={setSelectedRole}>
            <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full">
              {TARGET_ROLES.map(r => (
                <TabsTrigger key={r.value} value={r.value} data-testid={`tab-role-${r.value}`}>
                  {r.label}
                  {onboardingData?.grouped[r.value] && (
                    <Badge variant="secondary" className="ml-1.5 text-[9px] px-1 py-0">
                      {onboardingData.grouped[r.value].length}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Bilgi kutusu */}
      <Card className="mb-4 border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="p-3 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2">
          <BookOpen className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p>
              <strong>Adımlar sırayla tamamlanır:</strong> Önkoşul tanımladıysanız, kullanıcı önceki adımları bitirmeden sonrakine geçemez.
            </p>
            <p>
              <strong>Reçete listesi:</strong> Her adımda öğretilecek reçete ID'leri. Kullanıcı detay sayfasını görüntülediğinde + quiz geçtiğinde adım tamamlanır.
            </p>
            <p>
              <strong>Tamamlanma kriteri:</strong> Min quiz skoru, süpervizör onayı, demo yapma — hepsi opsiyonel.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Adım listesi */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : currentSteps.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <h3 className="font-medium mb-1">{TARGET_ROLES.find(r => r.value === selectedRole)?.label} için onboarding tanımlı değil</h3>
            <p className="text-sm mb-4">İlk adımı eklemek için aşağıdaki butona tıklayın.</p>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" /> İlk Adımı Oluştur
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {currentSteps.map((step, idx) => (
            <Card
              key={step.id}
              className={`${!step.isActive ? 'opacity-50' : ''}`}
              data-testid={`onboarding-step-${step.id}`}
            >
              <CardContent className="p-3 sm:p-4 space-y-2">
                {/* Header satır */}
                <div className="flex items-start gap-2 flex-wrap">
                  <Badge variant="default" className="font-mono shrink-0">
                    Adım {step.stepNumber}
                  </Badge>
                  <h3 className="font-semibold flex-1 min-w-0">{step.title}</h3>
                  {!step.isActive && (
                    <Badge variant="secondary" className="text-[9px]">Pasif</Badge>
                  )}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={idx === 0 || reorderMutation.isPending}
                      onClick={() => moveStep(idx, -1)}
                      data-testid={`button-move-up-${step.id}`}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={idx === currentSteps.length - 1 || reorderMutation.isPending}
                      onClick={() => moveStep(idx, 1)}
                      data-testid={`button-move-down-${step.id}`}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEdit(step)}
                      data-testid={`button-edit-${step.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => setDeleteConfirm({ id: step.id, title: step.title })}
                      data-testid={`button-delete-${step.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Açıklama */}
                {step.description && (
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                )}

                {/* Meta */}
                <div className="flex flex-wrap gap-2 text-xs">
                  {step.estimatedMinutes ? (
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      ~{step.estimatedMinutes} dk
                    </Badge>
                  ) : null}
                  <Badge variant="outline" className="gap-1">
                    <Coffee className="h-3 w-3" />
                    {(step.recipeIds || []).length} reçete
                  </Badge>
                  {step.completionCriteria?.minQuizScore && (
                    <Badge variant="outline" className="gap-1">
                      <ListChecks className="h-3 w-3" />
                      Min quiz: %{step.completionCriteria.minQuizScore}
                    </Badge>
                  )}
                  {step.completionCriteria?.requireSupervisorApproval && (
                    <Badge variant="outline" className="text-amber-700 border-amber-500">
                      Süpervizör onayı
                    </Badge>
                  )}
                  {(step.prerequisiteStepIds || []).length > 0 && (
                    <Badge variant="outline" className="gap-1 text-purple-700 border-purple-500">
                      <Lock className="h-3 w-3" />
                      Önkoşul: {(step.prerequisiteStepIds || []).length} adım
                    </Badge>
                  )}
                </div>

                {/* Reçete listesi */}
                {(step.recipeIds || []).length > 0 && (
                  <div className="border-t pt-2 mt-2">
                    <Label className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 block">
                      Öğrenilecek Reçeteler
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {(step.recipeIds || []).map(rid => (
                        <button
                          key={rid}
                          onClick={() => setLocation(`/branch-recipes/${rid}`)}
                          className="text-[10px] px-2 py-0.5 rounded border bg-muted hover:bg-accent transition-colors"
                          data-testid={`recipe-link-${rid}`}
                        >
                          {recipeNameCache[rid] ?? `#${rid}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Editor dialog */}
      <StepEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        step={editingStep}
        targetRole={selectedRole}
        existingSteps={currentSteps}
        allProducts={allProducts}
        onSave={(data) => {
          if (editingStep) {
            updateMutation.mutate({ id: editingStep.id, payload: data });
          } else {
            createMutation.mutate(data);
          }
        }}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Adım Pasifleştir</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteConfirm?.title}" adımı pasif edilecek. Bu adım onboarding listesinde
              görünmeyecek ama veriler korunacak (geri getirilebilir).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Pasifleştir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// STEP EDITOR DIALOG
// ════════════════════════════════════════════════════════════════

function StepEditorDialog({
  open, onOpenChange, step, targetRole, existingSteps, allProducts, onSave, isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: OnboardingStep | null;
  targetRole: string;
  existingSteps: OnboardingStep[];
  allProducts: BranchProduct[];
  onSave: (data: Partial<OnboardingStep>) => void;
  isSaving: boolean;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [recipeIds, setRecipeIds] = useState<number[]>([]);
  const [prerequisiteStepIds, setPrerequisiteStepIds] = useState<number[]>([]);
  const [minQuizScore, setMinQuizScore] = useState<number | ''>('');
  const [requireSupervisorApproval, setRequireSupervisorApproval] = useState(false);
  const [requireRecipeDemo, setRequireRecipeDemo] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    if (open) {
      setTitle(step?.title ?? '');
      setDescription(step?.description ?? '');
      setEstimatedMinutes(step?.estimatedMinutes ?? 30);
      setRecipeIds(step?.recipeIds ?? []);
      setPrerequisiteStepIds(step?.prerequisiteStepIds ?? []);
      setMinQuizScore(step?.completionCriteria?.minQuizScore ?? '');
      setRequireSupervisorApproval(step?.completionCriteria?.requireSupervisorApproval ?? false);
      setRequireRecipeDemo(step?.completionCriteria?.requireRecipeDemo ?? false);
      setProductSearch('');
    }
  }, [open, step]);

  const handleSave = () => {
    if (!title.trim()) return;
    const criteria: any = {};
    if (typeof minQuizScore === 'number' && minQuizScore > 0) criteria.minQuizScore = minQuizScore;
    if (requireSupervisorApproval) criteria.requireSupervisorApproval = true;
    if (requireRecipeDemo) criteria.requireRecipeDemo = true;

    onSave({
      title: title.trim(),
      description: description.trim() || null,
      estimatedMinutes,
      recipeIds,
      prerequisiteStepIds,
      completionCriteria: Object.keys(criteria).length > 0 ? criteria : null,
    });
  };

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return allProducts.slice(0, 30);
    const q = productSearch.toLowerCase();
    return allProducts.filter(p => p.name.toLowerCase().includes(q)).slice(0, 30);
  }, [allProducts, productSearch]);

  // Toggle recipe (basitleştirilmiş — productId yerine recipeId tracking için product-recipe eşleme lazım, şimdilik product picker bare)
  // Gerçek senaryoda burada product seçince hangi boy reçetesi seçileceği sorusu çıkar.
  // Pratik çözüm: ürün tıklayınca ürünün ilk aktif reçetesinin ID'si eklenir.
  const toggleProduct = async (productId: number) => {
    // Ürünün reçetelerini al
    try {
      const res = await fetch(`/api/branch-products/${productId}`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const firstRecipe = (data.recipes ?? []).find((r: BranchRecipe) => r.isActive);
      if (!firstRecipe) return;
      const rid = firstRecipe.id;
      setRecipeIds(prev => prev.includes(rid) ? prev.filter(id => id !== rid) : [...prev, rid]);
    } catch {
      // skip
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {step ? 'Adımı Düzenle' : 'Yeni Onboarding Adımı'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {TARGET_ROLES.find(r => r.value === targetRole)?.label} rolü için yeni eğitim adımı.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-2">
          {/* Başlık */}
          <div className="space-y-1">
            <Label className="text-xs">Başlık *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ör: Sıcak kahveler ile başlayın"
              data-testid="input-step-title"
            />
          </div>

          {/* Açıklama */}
          <div className="space-y-1">
            <Label className="text-xs">Açıklama</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Bu adımda ne öğrenecek, hedef nedir..."
              rows={2}
              data-testid="textarea-step-description"
            />
          </div>

          {/* Süre */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Tahmini Süre (dk)</Label>
              <Input
                type="number"
                min={5}
                max={480}
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(Math.max(5, Number(e.target.value) || 30))}
                data-testid="input-step-minutes"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Min Quiz Skoru (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={minQuizScore}
                onChange={(e) => setMinQuizScore(e.target.value ? Number(e.target.value) : '')}
                placeholder="örn 80 (boş bırakılabilir)"
                data-testid="input-step-quiz-score"
              />
            </div>
          </div>

          {/* Onay gereksinimleri */}
          <div className="space-y-2 rounded border p-3 bg-muted/30">
            <Label className="text-xs font-semibold">Tamamlanma Kriterleri (opsiyonel)</Label>
            <div className="flex items-center justify-between">
              <Label className="text-xs cursor-pointer" htmlFor="req-sup">
                Süpervizör onayı gerekli
              </Label>
              <Switch
                id="req-sup"
                checked={requireSupervisorApproval}
                onCheckedChange={setRequireSupervisorApproval}
                data-testid="switch-supervisor-approval"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs cursor-pointer" htmlFor="req-demo">
                Reçete demosu yapma şartı
              </Label>
              <Switch
                id="req-demo"
                checked={requireRecipeDemo}
                onCheckedChange={setRequireRecipeDemo}
                data-testid="switch-recipe-demo"
              />
            </div>
          </div>

          {/* Önkoşul adımları */}
          {existingSteps.filter(s => !step || s.id !== step.id).length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">Önkoşul Adımlar</Label>
              <div className="space-y-1 max-h-32 overflow-y-auto border rounded p-2">
                {existingSteps
                  .filter(s => !step || s.id !== step.id)
                  .map(s => (
                    <label key={s.id} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prerequisiteStepIds.includes(s.id)}
                        onChange={() => {
                          setPrerequisiteStepIds(prev =>
                            prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                          );
                        }}
                        data-testid={`checkbox-prereq-${s.id}`}
                      />
                      <Badge variant="outline" className="font-mono text-[9px]">#{s.stepNumber}</Badge>
                      <span className="flex-1 truncate">{s.title}</span>
                    </label>
                  ))}
              </div>
            </div>
          )}

          {/* Reçete seçimi */}
          <div className="space-y-1">
            <Label className="text-xs">
              Öğrenilecek Reçeteler ({recipeIds.length} seçili)
            </Label>
            <Input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Ürün ara..."
              data-testid="input-product-search"
            />
            <div className="space-y-1 max-h-48 overflow-y-auto border rounded p-2">
              {filteredProducts.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Ürün bulunamadı
                </p>
              ) : (
                filteredProducts.map(p => {
                  const isSelected = recipeIds.length > 0; // Bu kontrol toggleProduct'ın güncellemesini bekler
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleProduct(p.id)}
                      className="w-full text-left p-2 rounded hover:bg-accent transition-colors flex items-center gap-2 text-xs"
                      data-testid={`button-toggle-product-${p.id}`}
                    >
                      <Coffee className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">{p.name}</span>
                      <Badge variant="outline" className="text-[9px]">{p.category}</Badge>
                    </button>
                  );
                })
              )}
            </div>
            {recipeIds.length > 0 && (
              <p className="text-[10px] text-muted-foreground">
                Seçili reçete ID'leri: {recipeIds.join(', ')}
              </p>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Vazgeç</AlertDialogCancel>
          <AlertDialogAction
            disabled={!title.trim() || isSaving}
            onClick={(e) => {
              e.preventDefault();
              handleSave();
            }}
            data-testid="button-save-step"
          >
            <Save className="h-4 w-4 mr-2" /> {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
