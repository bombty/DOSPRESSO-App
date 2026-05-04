/**
 * BRANCH ONBOARDING ADMIN — Rol bazlı eğitim yolu yöneticisi
 *
 * URL: /branch-recipes/admin/onboarding
 * Yetki: HQ_EDIT_ROLES (admin, ceo, cgo, coach, trainer)
 *
 * Backend:
 *   GET  /api/branch-onboarding-admin/all          — Tüm roller, gruplandırılmış
 *   PUT  /api/branch-onboarding-admin/:role        — Belirli rol için replace-all
 *   POST /api/branch-onboarding/seed-defaults      — Default seed (idempotent)
 *
 * UX:
 *   - Tab: Rol seçimi (barista / bar_buddy / stajyer)
 *   - Her tab içinde: numbered list (1, 2, 3...)
 *   - Her adımda: title + description + reçete seçimi (multi) + dakika + min quiz score
 *   - Sıralama: yukarı/aşağı oklarla
 *   - Tek "Kaydet" — replace-all transaction
 *   - "Default seed" butonu (boşsa)
 *
 * Aslan istek: 4 May 2026 — TASK-ONBOARDING-001
 */

import { useState, useEffect, useMemo } from "react";
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
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Save,
  GraduationCap, BookOpen, Clock, Award, Sparkles, X, AlertTriangle, CheckCircle2,
} from "lucide-react";

const HQ_EDIT_ROLES = ['admin', 'ceo', 'cgo', 'coach', 'trainer'];

const ROLE_LABELS: Record<string, { label: string; emoji: string; description: string }> = {
  barista: { label: 'Barista', emoji: '☕', description: 'Tam yetkili kahve ustası — 5 adım' },
  bar_buddy: { label: 'Bar Yardımcısı', emoji: '🤝', description: 'Yardımcı personel — 3 kısa adım' },
  stajyer: { label: 'Stajyer', emoji: '🎓', description: 'Kapsamlı eğitim — 8 adım' },
  supervisor: { label: 'Süpervizör', emoji: '👔', description: 'Yönetici eğitimi' },
  mudur: { label: 'Müdür', emoji: '🏢', description: 'Şube müdür eğitimi' },
};

interface OnboardingStep {
  id?: number;
  stepNumber: number;
  title: string;
  description: string | null;
  recipeIds: number[];
  estimatedMinutes: number;
  prerequisiteStepIds: number[];
  completionCriteria: {
    minQuizScore?: number;
    requireSupervisorApproval?: boolean;
    requireRecipeDemo?: boolean;
  } | null;
  isActive: boolean;
  // Editor only
  _localId?: string;
  _isNew?: boolean;
}

interface BranchProduct {
  id: number;
  name: string;
  category: string;
  isActive: boolean;
}

let localCounter = 0;
const newLocalId = () => `_local_${++localCounter}`;

export default function OnboardingAdminPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canEdit = user?.role && HQ_EDIT_ROLES.includes(user.role);

  const [activeRole, setActiveRole] = useState<string>('barista');
  const [stepsByRole, setStepsByRole] = useState<Record<string, OnboardingStep[]>>({});
  const [dirtyRoles, setDirtyRoles] = useState<Set<string>>(new Set());
  const [seedConfirmOpen, setSeedConfirmOpen] = useState(false);
  const [seedForce, setSeedForce] = useState(false);

  // Tüm onboarding adımları çek
  const { data, isLoading, refetch } = useQuery<{
    grouped: Record<string, OnboardingStep[]>;
    roles: string[];
    total: number;
  }>({
    queryKey: ['/api/branch-onboarding-admin/all'],
    queryFn: async () => {
      const res = await fetch('/api/branch-onboarding-admin/all', { credentials: 'include' });
      if (!res.ok) throw new Error('Yüklenemedi');
      return res.json();
    },
    enabled: !!canEdit,
    staleTime: 0,
  });

  // Reçete listesi (her adıma reçete eklemek için)
  const { data: productsData } = useQuery<{ products: BranchProduct[] }>({
    queryKey: ['/api/branch-products', { active: true }],
    queryFn: async () => {
      const res = await fetch('/api/branch-products?active=true', { credentials: 'include' });
      if (!res.ok) throw new Error('Yüklenemedi');
      return res.json();
    },
    staleTime: 300000,
  });

  const allProducts: BranchProduct[] = (productsData as any)?.products ?? (Array.isArray(productsData) ? productsData : []);

  // Data yüklenince state'i doldur
  useEffect(() => {
    if (data?.grouped) {
      const initial: Record<string, OnboardingStep[]> = {};
      const allRoles = ['barista', 'bar_buddy', 'stajyer', 'supervisor', 'mudur'];
      for (const role of allRoles) {
        const items = data.grouped[role] || [];
        initial[role] = items.map(s => ({
          ...s,
          recipeIds: s.recipeIds || [],
          prerequisiteStepIds: s.prerequisiteStepIds || [],
          _localId: newLocalId(),
        }));
      }
      setStepsByRole(initial);
      setDirtyRoles(new Set());
    }
  }, [data]);

  // beforeunload uyarısı
  useEffect(() => {
    if (dirtyRoles.size === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirtyRoles.size]);

  // ── Save mutation ─────────────────────────────────────────────
  const saveRoleMutation = useMutation({
    mutationFn: async (role: string) => {
      const steps = (stepsByRole[role] || []).map(({ _localId, _isNew, id, ...rest }, idx) => ({
        ...rest,
        stepNumber: idx + 1,
      }));
      const res = await fetch(`/api/branch-onboarding-admin/${role}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || e.message || 'Kaydedilemedi');
      }
      return res.json();
    },
  });

  // ── Seed mutation ─────────────────────────────────────────────
  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/branch-onboarding/seed-defaults', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: seedForce }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Seed başarısız');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: 'Seed tamam', description: data.message });
      setSeedConfirmOpen(false);
      refetch();
    },
    onError: (e: any) => {
      toast({ title: 'Hata', description: e?.message || 'Seed başarısız', variant: 'destructive' });
    },
  });

  const handleSaveRole = async (role: string) => {
    // Validation
    const steps = stepsByRole[role] || [];
    const emptyTitle = steps.find(s => !s.title.trim());
    if (emptyTitle) {
      toast({ title: 'Boş başlık', description: 'Tüm adımların başlığı olmalı', variant: 'destructive' });
      return;
    }

    try {
      await saveRoleMutation.mutateAsync(role);
      toast({ title: 'Kaydedildi', description: `${ROLE_LABELS[role]?.label || role} onboarding güncellendi (${steps.length} adım)` });
      const newDirty = new Set(dirtyRoles);
      newDirty.delete(role);
      setDirtyRoles(newDirty);
      queryClient.invalidateQueries({ queryKey: ['/api/branch-onboarding-admin/all'] });
    } catch (e: any) {
      toast({ title: 'Hata', description: e?.message || 'Kaydedilemedi', variant: 'destructive' });
    }
  };

  // ── Step CRUD ─────────────────────────────────────────────────
  const updateRoleSteps = (role: string, updater: (steps: OnboardingStep[]) => OnboardingStep[]) => {
    setStepsByRole(prev => ({
      ...prev,
      [role]: updater(prev[role] || []),
    }));
    setDirtyRoles(prev => new Set([...Array.from(prev), role]));
  };

  const addStep = (role: string) => {
    updateRoleSteps(role, (prev) => [
      ...prev,
      {
        _localId: newLocalId(),
        _isNew: true,
        stepNumber: prev.length + 1,
        title: '',
        description: '',
        recipeIds: [],
        estimatedMinutes: 30,
        prerequisiteStepIds: [],
        completionCriteria: { minQuizScore: 70 },
        isActive: true,
      },
    ]);
  };

  const updateStep = (role: string, localId: string, patch: Partial<OnboardingStep>) => {
    updateRoleSteps(role, (prev) =>
      prev.map(s => s._localId === localId ? { ...s, ...patch } : s)
    );
  };

  const deleteStep = (role: string, localId: string) => {
    updateRoleSteps(role, (prev) => prev.filter(s => s._localId !== localId));
  };

  const moveStep = (role: string, localId: string, dir: -1 | 1) => {
    updateRoleSteps(role, (prev) => {
      const idx = prev.findIndex(s => s._localId === localId);
      if (idx < 0) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  };

  const toggleRecipe = (role: string, localId: string, recipeId: number) => {
    updateRoleSteps(role, (prev) =>
      prev.map(s => {
        if (s._localId !== localId) return s;
        const has = s.recipeIds.includes(recipeId);
        return {
          ...s,
          recipeIds: has ? s.recipeIds.filter(id => id !== recipeId) : [...s.recipeIds, recipeId],
        };
      })
    );
  };

  // ── Yetki kontrolü ─────────────────────────────────────────────
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
      </div>
    );
  }

  const totalSteps = Object.values(stepsByRole).reduce((sum, arr) => sum + arr.length, 0);
  const isEmpty = totalSteps === 0;

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
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <GraduationCap className="h-5 w-5 shrink-0 text-primary" />
              Onboarding Yönetimi
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Yeni başlayan personelin rol bazlı eğitim yolu — toplam {totalSteps} adım
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {isEmpty && (
            <Button
              onClick={() => setSeedConfirmOpen(true)}
              variant="outline"
              className="gap-2"
              data-testid="button-seed"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Default Seed</span>
              <span className="sm:hidden">Seed</span>
            </Button>
          )}
        </div>
      </div>

      {/* Yardım kutusu */}
      <Card className="mb-4 border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="p-3 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p>
              <strong>Onboarding</strong> = yeni başlayan personelin sıralı eğitim adımları.
              Her adım reçete seçimi + tahmini süre + tamamlanma kriteri içerir.
            </p>
            <p>
              <strong>Tamamlanma:</strong> Personel reçeteyi okur → quizini geçer (varsayılan ≥70%) → süpervizör onaylar.
            </p>
            <p>
              <strong>Boş ise:</strong> "Default Seed" butonu barista/bar_buddy/stajyer için 16 hazır adım kurar.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tabs - Roller */}
      <Tabs value={activeRole} onValueChange={setActiveRole}>
        <TabsList className="grid w-full grid-cols-3 mb-4">
          {['barista', 'bar_buddy', 'stajyer'].map(role => {
            const meta = ROLE_LABELS[role];
            const stepCount = (stepsByRole[role] || []).length;
            const isDirty = dirtyRoles.has(role);
            return (
              <TabsTrigger key={role} value={role} data-testid={`tab-role-${role}`}>
                <span className="mr-1">{meta?.emoji}</span>
                <span className="truncate">{meta?.label || role}</span>
                <Badge variant={isDirty ? "destructive" : "outline"} className="ml-2 text-[9px]">
                  {stepCount}{isDirty ? '*' : ''}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {['barista', 'bar_buddy', 'stajyer'].map(role => {
          const meta = ROLE_LABELS[role];
          const steps = stepsByRole[role] || [];
          const isDirty = dirtyRoles.has(role);
          const totalMin = steps.reduce((s, st) => s + (st.estimatedMinutes || 0), 0);

          return (
            <TabsContent key={role} value={role} className="space-y-3">
              {/* Rol özeti */}
              <Card>
                <CardContent className="p-3 flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className="font-semibold text-sm">
                      {meta?.emoji} {meta?.label}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {meta?.description} — Toplam {steps.length} adım, ~{Math.round(totalMin / 60 * 10) / 10} saat
                    </p>
                  </div>
                  <Button
                    onClick={() => handleSaveRole(role)}
                    disabled={!isDirty || saveRoleMutation.isPending}
                    size="sm"
                    className="gap-2"
                    data-testid={`button-save-${role}`}
                  >
                    <Save className="h-4 w-4" />
                    {saveRoleMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                </CardContent>
              </Card>

              {steps.length === 0 && (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground text-sm">
                    Bu rol için henüz adım yok. "Yeni Adım" ile başlayın veya yukarıdan "Default Seed".
                  </CardContent>
                </Card>
              )}

              {steps.map((step, idx) => (
                <Card key={step._localId} data-testid={`step-card-${role}-${idx}`}>
                  <CardContent className="p-3 space-y-3">
                    {/* Sıra + butonlar */}
                    <div className="flex items-center justify-between gap-2">
                      <Badge className="font-mono text-xs">
                        Adım {idx + 1}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={idx === 0}
                          onClick={() => moveStep(role, step._localId!, -1)}
                          data-testid={`button-up-${role}-${idx}`}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={idx === steps.length - 1}
                          onClick={() => moveStep(role, step._localId!, 1)}
                          data-testid={`button-down-${role}-${idx}`}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => deleteStep(role, step._localId!)}
                          data-testid={`button-delete-${role}-${idx}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Başlık */}
                    <div className="space-y-1">
                      <Label className="text-xs">Başlık *</Label>
                      <Input
                        value={step.title}
                        onChange={(e) => updateStep(role, step._localId!, { title: e.target.value })}
                        placeholder="ör: Hoşgeldin & Sistem Tanıtımı"
                        data-testid={`input-title-${role}-${idx}`}
                      />
                    </div>

                    {/* Açıklama */}
                    <div className="space-y-1">
                      <Label className="text-xs">Açıklama</Label>
                      <Textarea
                        value={step.description || ''}
                        onChange={(e) => updateStep(role, step._localId!, { description: e.target.value || null })}
                        placeholder="Bu adımda öğrenilecekler..."
                        rows={2}
                        data-testid={`textarea-description-${role}-${idx}`}
                      />
                    </div>

                    {/* Süre + Min Quiz Score */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Süre (dk)
                        </Label>
                        <Input
                          type="number"
                          min={5}
                          max={480}
                          value={step.estimatedMinutes}
                          onChange={(e) => updateStep(role, step._localId!, { estimatedMinutes: Number(e.target.value) || 30 })}
                          data-testid={`input-minutes-${role}-${idx}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                          <Award className="h-3 w-3" /> Min Quiz Skoru
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={step.completionCriteria?.minQuizScore ?? 70}
                          onChange={(e) => updateStep(role, step._localId!, {
                            completionCriteria: {
                              ...step.completionCriteria,
                              minQuizScore: Number(e.target.value) || 70,
                            },
                          })}
                          data-testid={`input-quiz-score-${role}-${idx}`}
                        />
                      </div>
                    </div>

                    {/* Reçete seçimi */}
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center justify-between">
                        <span>Reçeteler ({step.recipeIds.length})</span>
                        {step.recipeIds.length > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px]"
                            onClick={() => updateStep(role, step._localId!, { recipeIds: [] })}
                          >
                            Tümünü kaldır
                          </Button>
                        )}
                      </Label>
                      <div className="flex flex-wrap gap-1.5 p-2 rounded border bg-muted/30 max-h-40 overflow-y-auto">
                        {allProducts.length === 0 && (
                          <span className="text-[10px] text-muted-foreground">Ürün yükleniyor...</span>
                        )}
                        {allProducts.map(p => {
                          const isSelected = step.recipeIds.includes(p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => toggleRecipe(role, step._localId!, p.id)}
                              className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                                isSelected
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-background hover:border-primary/50'
                              }`}
                              data-testid={`recipe-toggle-${role}-${idx}-${p.id}`}
                            >
                              {p.name}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Bu adımda öğrenilecek reçeteler. Personel her reçete için quizden geçmeli.
                      </p>
                    </div>

                    {/* Tamamlanma kriterleri */}
                    <div className="grid grid-cols-2 gap-2 p-2 rounded bg-muted/30">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] cursor-pointer">Süpervizör onayı</Label>
                        <Switch
                          checked={!!step.completionCriteria?.requireSupervisorApproval}
                          onCheckedChange={(checked) => updateStep(role, step._localId!, {
                            completionCriteria: {
                              ...step.completionCriteria,
                              requireSupervisorApproval: checked,
                            },
                          })}
                          data-testid={`switch-supervisor-${role}-${idx}`}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] cursor-pointer">Demo gerekli</Label>
                        <Switch
                          checked={!!step.completionCriteria?.requireRecipeDemo}
                          onCheckedChange={(checked) => updateStep(role, step._localId!, {
                            completionCriteria: {
                              ...step.completionCriteria,
                              requireRecipeDemo: checked,
                            },
                          })}
                          data-testid={`switch-demo-${role}-${idx}`}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Yeni adım ekle */}
              <Button
                variant="outline"
                className="w-full gap-2 border-dashed"
                onClick={() => addStep(role)}
                data-testid={`button-add-${role}`}
              >
                <Plus className="h-4 w-4" /> Yeni Adım Ekle
              </Button>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Seed onay dialog */}
      <AlertDialog open={seedConfirmOpen} onOpenChange={setSeedConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Default Onboarding Seed</AlertDialogTitle>
            <AlertDialogDescription>
              barista (5 adım), bar_buddy (3 adım), stajyer (8 adım) için 16 hazır eğitim adımı kurar.
              <br /><br />
              <strong>Reçeteler:</strong> İlk 20 aktif reçete sıralı dağıtılır.
              <br />
              <strong>Süre:</strong> Her adım için 30-120 dk tahmini.
              <br />
              <strong>Quiz:</strong> Default %70 başarı kriteri.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center justify-between p-2 rounded bg-amber-50 dark:bg-amber-950/30">
            <Label htmlFor="seed-force" className="text-xs cursor-pointer">
              Mevcut adımları sil ve sıfırla
            </Label>
            <Switch
              id="seed-force"
              checked={seedForce}
              onCheckedChange={setSeedForce}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                seedMutation.mutate();
              }}
              disabled={seedMutation.isPending}
              data-testid="button-confirm-seed"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {seedMutation.isPending ? 'Seed yapılıyor...' : 'Seed Oluştur'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
