/**
 * BRANCH RECIPES ONBOARDING ADMIN — Reçete Onboarding Yönetimi
 *
 * URL: /branch-recipes/admin/onboarding
 * Yetki: HQ_EDIT_ROLES (admin, ceo, cgo, coach, trainer)
 *
 * Özellikler:
 * - Rol bazlı onboarding programı (stajyer/bar_buddy/barista/supervisor_buddy/supervisor)
 * - Her rol için sıralı adımlar (Hafta 1: Temel kahve, Hafta 2: ...)
 * - Her adıma reçete ekle/çıkar (multi-select)
 * - Önkoşul (önce hangi adım), tahmini süre, quiz min puan
 * - Soft delete (isActive=false)
 *
 * Akademi entegrasyonu:
 * - /branch-recipes (akademi-style öğrenme yolu) sayfası bunları kullanır
 * - Şube barista bu adımları takip ederek "ustalaşır"
 *
 * TASK-ONBOARDING-001 — 4 May 2026
 */

import { useState, useMemo } from "react";
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
  ArrowLeft, Plus, Pencil, Trash2, GraduationCap, BookOpen,
  Coffee, ChevronUp, ChevronDown, Save, X, Clock, Target,
  CheckCircle2, AlertTriangle,
} from "lucide-react";

const HQ_EDIT_ROLES = ['admin', 'ceo', 'cgo', 'coach', 'trainer'];

const BRANCH_ROLES = [
  { value: 'stajyer', label: 'Stajyer', icon: '🎓', description: 'İlk adım — temel mutfak/temizlik' },
  { value: 'bar_buddy', label: 'Bar Buddy', icon: '☕', description: 'Yardımcı barista — basit reçeteler' },
  { value: 'barista', label: 'Barista', icon: '👨‍🍳', description: 'Tam barista — tüm reçeteler' },
  { value: 'supervisor_buddy', label: 'Supervisor Buddy', icon: '⭐', description: 'Süpervizör adayı' },
  { value: 'supervisor', label: 'Supervisor', icon: '👔', description: 'Şube süpervizör' },
];

interface OnboardingStep {
  id: number;
  targetRole: string;
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
}

interface BranchProductWithRecipes {
  id: number;
  name: string;
  category: string;
  shortCode: string | null;
}

interface BranchRecipeFlat {
  id: number;
  productId: number;
  productName: string;
  size: string;
}

export default function BranchOnboardingAdmin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canEdit = user?.role && HQ_EDIT_ROLES.includes(user.role);

  const [selectedRole, setSelectedRole] = useState<string>('barista');
  const [editingStep, setEditingStep] = useState<OnboardingStep | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Tüm onboarding adımları
  const { data: stepsData, isLoading: stepsLoading } = useQuery<{
    steps: OnboardingStep[];
    byRole: Record<string, OnboardingStep[]>;
    total: number;
  }>({
    queryKey: ["/api/branch-onboarding"],
    queryFn: async () => {
      const res = await fetch("/api/branch-onboarding?includeInactive=true", { credentials: "include" });
      if (!res.ok) throw new Error("Onboarding adımları yüklenemedi");
      return res.json();
    },
    enabled: !!canEdit,
  });

  // Tüm reçeteler (modal için)
  const { data: productsData } = useQuery<{ products: BranchProductWithRecipes[] }>({
    queryKey: ["/api/branch-products", "all"],
    queryFn: async () => {
      const res = await fetch("/api/branch-products?includeInactive=false", { credentials: "include" });
      if (!res.ok) throw new Error("Ürünler yüklenemedi");
      return res.json();
    },
    enabled: !!canEdit,
  });

  // Yetki kontrolü
  if (!canEdit) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold mb-2">Yetkiniz yok</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Onboarding yönetimi sadece HQ rollerine açık (admin, CEO, CGO, koç, eğitmen).
            </p>
            <Button onClick={() => setLocation('/branch-recipes')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" /> Geri dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stepsForSelectedRole = stepsData?.byRole?.[selectedRole] ?? [];

  return (
    <div className="container mx-auto p-3 sm:p-4 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/branch-recipes/admin')}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Reçete Onboarding Yönetimi
            </h1>
            <p className="text-xs text-muted-foreground">
              Her rol için öğrenme yolunu yapılandır — sıralı adımlar, reçete grupları, tamamlanma kriterleri.
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setEditingStep(null);
            setCreateOpen(true);
          }}
          className="gap-2 shrink-0"
          data-testid="button-add-step"
        >
          <Plus className="h-4 w-4" /> Yeni Adım
        </Button>
      </div>

      {/* Bilgi kartı */}
      <Card className="mb-4 border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="p-3 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2">
          <BookOpen className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p>
              <strong>Onboarding</strong> — yeni başlayan personelin hangi reçeteleri sırayla öğreneceğini belirler.
            </p>
            <p>
              <strong>Tamamlanma</strong> — adımdaki her reçete için: ya quiz min puanı, ya da süpervizör onayı (demo).
            </p>
            <p>
              <strong>Önkoşul</strong> — bir adımı yapabilmek için önce başka adımları tamamlamak gerekiyorsa belirt.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Rol Seçim Tab'ları */}
      <Tabs value={selectedRole} onValueChange={setSelectedRole}>
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full mb-4 h-auto">
          {BRANCH_ROLES.map(role => {
            const count = stepsData?.byRole?.[role.value]?.filter(s => s.isActive).length ?? 0;
            return (
              <TabsTrigger
                key={role.value}
                value={role.value}
                className="flex-col h-auto py-2 gap-0.5"
                data-testid={`tab-role-${role.value}`}
              >
                <span className="text-base">{role.icon}</span>
                <span className="text-[10px] font-medium">{role.label}</span>
                {count > 0 && (
                  <Badge variant="secondary" className="text-[8px] h-4 px-1">
                    {count} adım
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {BRANCH_ROLES.map(role => (
          <TabsContent key={role.value} value={role.value} className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <span>{role.icon}</span> {role.label} Rolü Onboarding Programı
                </h3>
                <p className="text-xs text-muted-foreground">{role.description}</p>
              </div>
              <Badge variant="outline" className="text-xs">
                {stepsForSelectedRole.filter(s => s.isActive).length} aktif
                {stepsForSelectedRole.filter(s => !s.isActive).length > 0 && (
                  <span className="ml-1 text-muted-foreground">
                    + {stepsForSelectedRole.filter(s => !s.isActive).length} pasif
                  </span>
                )}
              </Badge>
            </div>

            {stepsLoading && <Skeleton className="h-32 w-full" />}

            {!stepsLoading && stepsForSelectedRole.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground text-sm">
                  Bu rol için henüz onboarding adımı yok.
                  <br />
                  <Button
                    variant="link"
                    onClick={() => {
                      setEditingStep(null);
                      setCreateOpen(true);
                    }}
                    className="mt-2"
                  >
                    İlk adımı ekle
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Adımlar listesi */}
            <div className="space-y-2">
              {stepsForSelectedRole.map(step => (
                <OnboardingStepCard
                  key={step.id}
                  step={step}
                  products={productsData?.products ?? []}
                  onEdit={() => {
                    setEditingStep(step);
                    setCreateOpen(true);
                  }}
                  onDelete={() => setDeleteConfirmId(step.id)}
                />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Adım ekleme/düzenleme modal */}
      <StepFormDialog
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setEditingStep(null);
        }}
        editingStep={editingStep}
        defaultRole={selectedRole}
        products={productsData?.products ?? []}
        existingSteps={stepsData?.steps ?? []}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/branch-onboarding"] });
          setCreateOpen(false);
          setEditingStep(null);
        }}
      />

      {/* Silme onay */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Onboarding adımını sil?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu adım pasife alınır (soft delete). Kullanıcılar artık görmez,
              ancak ileride tekrar aktif edilebilir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteConfirmId === null) return;
                try {
                  const res = await fetch(`/api/branch-onboarding/${deleteConfirmId}`, {
                    method: 'DELETE',
                    credentials: 'include',
                  });
                  if (!res.ok) throw new Error('Silinemedi');
                  toast({ title: 'Pasif edildi' });
                  queryClient.invalidateQueries({ queryKey: ["/api/branch-onboarding"] });
                } catch (e: any) {
                  toast({ title: 'Hata', description: e.message, variant: 'destructive' });
                }
                setDeleteConfirmId(null);
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Onboarding Step Card
// ════════════════════════════════════════════════════════════════

function OnboardingStepCard({
  step,
  products,
  onEdit,
  onDelete,
}: {
  step: OnboardingStep;
  products: BranchProductWithRecipes[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  // Reçete ID'lerden ürün adı çıkar
  const recipeNames = useMemo(() => {
    if (!step.recipeIds || step.recipeIds.length === 0) return [];
    // Note: recipeIds aslında recipe ID'leri, ürün ID değil — basit gösterim için sayı
    return step.recipeIds;
  }, [step.recipeIds, products]);

  return (
    <Card className={!step.isActive ? 'opacity-60' : ''} data-testid={`step-card-${step.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
            {step.stepNumber}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm">{step.title}</h3>
              {!step.isActive && (
                <Badge variant="secondary" className="text-[9px]">Pasif</Badge>
              )}
              <Badge variant="outline" className="text-[9px] gap-1">
                <Clock className="h-3 w-3" /> {step.estimatedMinutes} dk
              </Badge>
              {step.completionCriteria?.minQuizScore && (
                <Badge variant="outline" className="text-[9px] gap-1">
                  <Target className="h-3 w-3" /> {step.completionCriteria.minQuizScore}+ quiz
                </Badge>
              )}
              {step.completionCriteria?.requireRecipeDemo && (
                <Badge variant="outline" className="text-[9px] gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Demo gerekli
                </Badge>
              )}
            </div>
            {step.description && (
              <p className="text-xs text-muted-foreground">{step.description}</p>
            )}
            {recipeNames.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                <Coffee className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">
                  {recipeNames.length} reçete:
                </span>
                {recipeNames.slice(0, 5).map((rid, i) => (
                  <Badge key={rid} variant="secondary" className="text-[9px] px-1.5 py-0">
                    R-{rid}
                  </Badge>
                ))}
                {recipeNames.length > 5 && (
                  <Badge variant="secondary" className="text-[9px]">
                    +{recipeNames.length - 5}
                  </Badge>
                )}
              </div>
            )}
            {step.prerequisiteStepIds && step.prerequisiteStepIds.length > 0 && (
              <p className="text-[10px] text-muted-foreground">
                Önkoşul: {step.prerequisiteStepIds.map(id => `Adım #${id}`).join(', ')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} data-testid={`button-edit-${step.id}`}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete} data-testid={`button-delete-${step.id}`}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════
// Step Form Dialog (Create + Edit)
// ════════════════════════════════════════════════════════════════

interface StepFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingStep: OnboardingStep | null;
  defaultRole: string;
  products: BranchProductWithRecipes[];
  existingSteps: OnboardingStep[];
  onSuccess: () => void;
}

function StepFormDialog({ open, onClose, editingStep, defaultRole, products, existingSteps, onSuccess }: StepFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [targetRole, setTargetRole] = useState<string>(defaultRole);
  const [stepNumber, setStepNumber] = useState<number>(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [recipeIds, setRecipeIds] = useState<number[]>([]);
  const [prerequisiteStepIds, setPrerequisiteStepIds] = useState<number[]>([]);
  const [minQuizScore, setMinQuizScore] = useState<number | null>(70);
  const [requireRecipeDemo, setRequireRecipeDemo] = useState(false);
  const [requireSupervisorApproval, setRequireSupervisorApproval] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Edit modunda alanları doldur
  useMemo(() => {
    if (editingStep) {
      setTargetRole(editingStep.targetRole);
      setStepNumber(editingStep.stepNumber);
      setTitle(editingStep.title);
      setDescription(editingStep.description || '');
      setEstimatedMinutes(editingStep.estimatedMinutes);
      setRecipeIds(editingStep.recipeIds || []);
      setPrerequisiteStepIds(editingStep.prerequisiteStepIds || []);
      setMinQuizScore(editingStep.completionCriteria?.minQuizScore ?? 70);
      setRequireRecipeDemo(editingStep.completionCriteria?.requireRecipeDemo ?? false);
      setRequireSupervisorApproval(editingStep.completionCriteria?.requireSupervisorApproval ?? false);
      setIsActive(editingStep.isActive);
    } else {
      // Yeni ekleme — defaults
      setTargetRole(defaultRole);
      // Sonraki step number'ı tahmin et
      const sameRoleSteps = existingSteps.filter(s => s.targetRole === defaultRole);
      const maxStep = sameRoleSteps.reduce((m, s) => Math.max(m, s.stepNumber), 0);
      setStepNumber(maxStep + 1);
      setTitle('');
      setDescription('');
      setEstimatedMinutes(30);
      setRecipeIds([]);
      setPrerequisiteStepIds([]);
      setMinQuizScore(70);
      setRequireRecipeDemo(false);
      setRequireSupervisorApproval(false);
      setIsActive(true);
    }
  }, [editingStep, defaultRole, existingSteps]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        targetRole,
        stepNumber,
        title,
        description: description || null,
        estimatedMinutes,
        recipeIds,
        prerequisiteStepIds,
        completionCriteria: {
          minQuizScore: minQuizScore ?? undefined,
          requireRecipeDemo,
          requireSupervisorApproval,
        },
        isActive,
      };

      const url = editingStep
        ? `/api/branch-onboarding/${editingStep.id}`
        : '/api/branch-onboarding';
      const method = editingStep ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || e.message || 'Kaydedilemedi');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: editingStep ? 'Güncellendi' : 'Eklendi' });
      onSuccess();
    },
    onError: (e: any) => {
      toast({ title: 'Hata', description: e.message, variant: 'destructive' });
    },
  });

  const handleSubmit = () => {
    if (!title.trim()) {
      toast({ title: 'Başlık zorunlu', variant: 'destructive' });
      return;
    }
    saveMutation.mutate();
  };

  // Önkoşul olarak seçilebilecek adımlar (kendisi hariç)
  const possiblePrereqs = existingSteps.filter(s =>
    s.targetRole === targetRole && s.id !== editingStep?.id && s.isActive
  );

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {editingStep ? 'Onboarding Adımını Düzenle' : 'Yeni Onboarding Adımı'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Bu adımda öğrencinin neyi öğreneceğini ve tamamlanma kriterlerini belirle.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-2">
          {/* Rol + Adım No */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Hedef Rol *</Label>
              <Select value={targetRole} onValueChange={setTargetRole}>
                <SelectTrigger data-testid="select-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRANCH_ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.icon} {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Adım Sırası *</Label>
              <Input
                type="number"
                min={1}
                value={stepNumber}
                onChange={(e) => setStepNumber(Math.max(1, Number(e.target.value) || 1))}
                data-testid="input-step-number"
              />
            </div>
          </div>

          {/* Başlık */}
          <div className="space-y-1">
            <Label className="text-xs">Başlık *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ör: Hafta 1 — Temel Espresso Reçeteleri"
              data-testid="input-title"
            />
          </div>

          {/* Açıklama */}
          <div className="space-y-1">
            <Label className="text-xs">Açıklama</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Bu adımda neler öğrenilir, hangi yetkinlikler kazanılır..."
              rows={2}
              data-testid="input-description"
            />
          </div>

          {/* Süre */}
          <div className="space-y-1">
            <Label className="text-xs">Tahmini Süre (dakika)</Label>
            <Input
              type="number"
              min={1}
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(Math.max(1, Number(e.target.value) || 30))}
              data-testid="input-minutes"
            />
          </div>

          {/* Reçete seçimi */}
          <div className="space-y-1">
            <Label className="text-xs">Reçeteler ({recipeIds.length} seçili)</Label>
            <p className="text-[10px] text-muted-foreground">
              Bu adımda öğrenilecek reçeteleri seç. Recipe ID'lerini virgülle gir (örn: 1,5,12).
            </p>
            <Input
              value={recipeIds.join(',')}
              onChange={(e) => {
                const ids = e.target.value
                  .split(',')
                  .map(s => parseInt(s.trim()))
                  .filter(n => !isNaN(n) && n > 0);
                setRecipeIds(ids);
              }}
              placeholder="1, 5, 12"
              data-testid="input-recipe-ids"
            />
          </div>

          {/* Önkoşul */}
          {possiblePrereqs.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">Önkoşul Adımlar (önce tamamlanması gerekenler)</Label>
              <div className="flex flex-wrap gap-1.5">
                {possiblePrereqs.map(s => {
                  const checked = prerequisiteStepIds.includes(s.id);
                  return (
                    <Button
                      key={s.id}
                      variant={checked ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setPrerequisiteStepIds(prev =>
                          checked ? prev.filter(id => id !== s.id) : [...prev, s.id]
                        );
                      }}
                      className="h-7 text-xs gap-1"
                      type="button"
                    >
                      Adım #{s.stepNumber} — {s.title.substring(0, 20)}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tamamlanma Kriterleri */}
          <div className="space-y-2 p-3 rounded border bg-muted/30">
            <Label className="text-xs font-semibold">Tamamlanma Kriterleri</Label>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px]">Minimum Quiz Puanı</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={minQuizScore ?? ''}
                  onChange={(e) => setMinQuizScore(e.target.value ? Number(e.target.value) : null)}
                  placeholder="ör: 70"
                  className="h-8 text-sm"
                  data-testid="input-min-quiz-score"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-background">
              <Label htmlFor="require-demo" className="text-xs cursor-pointer">
                Reçete demosu gerekli (süpervizör onayı)
              </Label>
              <Switch
                id="require-demo"
                checked={requireRecipeDemo}
                onCheckedChange={setRequireRecipeDemo}
                data-testid="switch-require-demo"
              />
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-background">
              <Label htmlFor="require-approval" className="text-xs cursor-pointer">
                Süpervizör onayı gerekli
              </Label>
              <Switch
                id="require-approval"
                checked={requireSupervisorApproval}
                onCheckedChange={setRequireSupervisorApproval}
                data-testid="switch-require-approval"
              />
            </div>
          </div>

          {/* Aktif/Pasif */}
          {editingStep && (
            <div className="flex items-center justify-between p-2 rounded bg-muted/30">
              <Label htmlFor="active-step" className="text-xs cursor-pointer">
                Aktif (kullanıcılara görünür)
              </Label>
              <Switch
                id="active-step"
                checked={isActive}
                onCheckedChange={setIsActive}
                data-testid="switch-active"
              />
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Vazgeç</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            disabled={saveMutation.isPending || !title.trim()}
            data-testid="button-save-step"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Kaydediliyor...' : (editingStep ? 'Güncelle' : 'Ekle')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
