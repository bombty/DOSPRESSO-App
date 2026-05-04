/**
 * MY ONBOARDING — Personel kendi öğrenme yolu
 *
 * URL: /onboarding (veya /akademi/onboarding)
 * Yetki: Tüm authenticated kullanıcılar (rol kendi user'dan alınır)
 *
 * Backend:
 *   GET /api/branch-onboarding/me/progress  — Kullanıcının ilerlemesi
 *
 * UX:
 *   - Üstte: tamamlama % progress bar
 *   - Adımlar dikey timeline (mobile-first)
 *   - Her adım: durum (locked / waiting / in_progress / completed)
 *   - Her reçete için: izlendi / quiz başarı / demo onayı
 *   - Tıklanabilir: reçete kartına tıkla → /branch-recipes/X
 *
 * Aslan istek: 4 May 2026 — TASK-ONBOARDING-001
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap, Lock, CheckCircle2, Clock, Award, Eye, Sparkles,
  ChevronRight, AlertCircle, BookOpen, Trophy, Lightbulb,
} from "lucide-react";

interface RecipeDetail {
  recipeId: number;
  viewed: boolean;
  quizAttempts: number;
  bestScore: number | null;
  demoCompleted: boolean;
  passed: boolean;
}

interface StepProgress {
  stepId: number;
  stepNumber: number;
  title: string;
  description: string | null;
  estimatedMinutes: number;
  totalRecipes: number;
  viewedRecipes: number;
  completedRecipes: number;
  stepProgress: number;
  completed: boolean;
  locked: boolean;
  avgQuizScore: number | null;
  recipeDetails: RecipeDetail[];
  prerequisiteStepIds: number[];
  completionCriteria: {
    minQuizScore?: number;
    requireSupervisorApproval?: boolean;
    requireRecipeDemo?: boolean;
  } | null;
}

interface OnboardingProgressResponse {
  role: string;
  userId: string;
  steps: any[];
  progress: StepProgress[];
  completedSteps: number;
  totalSteps: number;
  percentComplete: number;
  message?: string;
}

const ROLE_LABELS: Record<string, string> = {
  barista: 'Barista',
  bar_buddy: 'Bar Yardımcısı',
  stajyer: 'Stajyer',
  supervisor: 'Süpervizör',
  mudur: 'Müdür',
};

interface RecipeInfo {
  id: number;
  name: string;
  category: string;
}

export default function MyOnboardingPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data, isLoading, error } = useQuery<OnboardingProgressResponse>({
    queryKey: ['/api/branch-onboarding/me/progress'],
    queryFn: async () => {
      const res = await fetch('/api/branch-onboarding/me/progress', { credentials: 'include' });
      if (!res.ok) throw new Error('Yüklenemedi');
      return res.json();
    },
    enabled: !!user,
    staleTime: 60000, // 1 dk cache
  });

  // Reçete adlarını çekip ID -> name map'le
  const { data: productsData } = useQuery<{ products: any[] } | any[]>({
    queryKey: ['/api/branch-products', { active: true }],
    queryFn: async () => {
      const res = await fetch('/api/branch-products?active=true', { credentials: 'include' });
      if (!res.ok) throw new Error('Yüklenemedi');
      return res.json();
    },
    staleTime: 600000,
  });

  const recipeNameMap = useMemo(() => {
    const map = new Map<number, string>();
    const list: any[] = Array.isArray(productsData) ? productsData : ((productsData as any)?.products || []);
    for (const p of list) {
      // p.recipes varsa her reçete için map'e ekle
      if (p.recipes) {
        for (const r of p.recipes) {
          map.set(r.id, p.name);
        }
      }
    }
    return map;
  }, [productsData]);

  const totalEstimatedMinutes = useMemo(() => {
    if (!data?.progress) return 0;
    return data.progress.reduce((s, p) => s + (p.estimatedMinutes || 0), 0);
  }, [data]);

  const remainingMinutes = useMemo(() => {
    if (!data?.progress) return 0;
    return data.progress
      .filter(p => !p.completed)
      .reduce((s, p) => s + (p.estimatedMinutes || 0), 0);
  }, [data]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-3 sm:p-4 max-w-3xl space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold mb-2">Yüklenemedi</h2>
            <p className="text-muted-foreground text-sm">
              {(error as Error)?.message || 'Veri alınamadı'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Bu rol için onboarding tanımlanmamış
  if (data.totalSteps === 0) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardContent className="p-6 text-center">
            <Lightbulb className="h-10 w-10 text-amber-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold mb-2">Onboarding bulunmuyor</h2>
            <p className="text-muted-foreground text-sm mb-4">
              {data.message || 'Bu rol için henüz eğitim yolu tanımlanmadı.'}
            </p>
            <p className="text-xs text-muted-foreground">
              Yöneticinizden onboarding tanımlanmasını isteyin.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 sm:p-4 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-1">
          <GraduationCap className="h-6 w-6 text-primary" />
          Eğitim Yolculuğum
        </h1>
        <p className="text-sm text-muted-foreground">
          {ROLE_LABELS[data.role] || data.role} eğitim programı — {data.totalSteps} adım, ~{Math.round(totalEstimatedMinutes / 60 * 10) / 10} saat toplam
        </p>
      </div>

      {/* Genel ilerleme kartı */}
      <Card className="mb-4 border-primary/20 bg-primary/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="text-xs text-muted-foreground">Genel ilerleme</p>
              <p className="text-2xl font-bold">
                %{data.percentComplete}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({data.completedSteps}/{data.totalSteps} adım)
                </span>
              </p>
            </div>
            {data.percentComplete === 100 ? (
              <Badge className="bg-green-600 gap-1">
                <Trophy className="h-4 w-4" /> Tamamlandı!
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" /> ~{Math.round(remainingMinutes / 60 * 10) / 10} sa kaldı
              </Badge>
            )}
          </div>
          <Progress value={data.percentComplete} className="h-2" data-testid="overall-progress" />
        </CardContent>
      </Card>

      {/* Adımlar timeline */}
      <div className="space-y-3 relative">
        {data.progress.map((step, idx) => {
          const isLast = idx === data.progress.length - 1;
          const status = step.locked ? 'locked' : step.completed ? 'completed' : step.stepProgress > 0 ? 'in_progress' : 'waiting';

          const statusColors = {
            locked: 'border-muted-foreground/20 bg-muted/20 opacity-60',
            waiting: 'border-border bg-background',
            in_progress: 'border-amber-400 bg-amber-50/50 dark:bg-amber-950/20',
            completed: 'border-green-400 bg-green-50/50 dark:bg-green-950/20',
          };

          const statusIcons = {
            locked: <Lock className="h-5 w-5 text-muted-foreground" />,
            waiting: <Clock className="h-5 w-5 text-muted-foreground" />,
            in_progress: <BookOpen className="h-5 w-5 text-amber-600" />,
            completed: <CheckCircle2 className="h-5 w-5 text-green-600" />,
          };

          const statusLabels = {
            locked: 'Kilitli',
            waiting: 'Bekliyor',
            in_progress: 'Devam ediyor',
            completed: 'Tamamlandı',
          };

          return (
            <Card
              key={step.stepId}
              className={`relative ${statusColors[status]}`}
              data-testid={`step-card-${step.stepNumber}`}
            >
              {/* Timeline dikey çizgi */}
              {!isLast && (
                <div className="absolute left-7 top-14 bottom-0 w-0.5 bg-border -mb-3 z-0" />
              )}

              <CardContent className="p-4 relative z-10">
                {/* Üst satır: durum + numara + başlık */}
                <div className="flex items-start gap-3">
                  <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    status === 'completed' ? 'bg-green-100 dark:bg-green-900/40' :
                    status === 'in_progress' ? 'bg-amber-100 dark:bg-amber-900/40' :
                    status === 'locked' ? 'bg-muted' :
                    'bg-background border'
                  }`}>
                    {statusIcons[status]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        Adım {step.stepNumber}
                      </Badge>
                      <Badge
                        variant={status === 'completed' ? 'default' : 'outline'}
                        className={`text-[10px] ${
                          status === 'completed' ? 'bg-green-600' :
                          status === 'in_progress' ? 'border-amber-500 text-amber-700 dark:text-amber-300' : ''
                        }`}
                      >
                        {statusLabels[status]}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {step.estimatedMinutes} dk
                      </span>
                    </div>
                    <h3 className="font-semibold text-base">{step.title}</h3>
                    {step.description && (
                      <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                    )}
                  </div>
                </div>

                {/* İlerleme çubuğu */}
                {!step.locked && step.totalRecipes > 0 && (
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {step.completedRecipes}/{step.totalRecipes} reçete tamamlandı
                      </span>
                      <span className="font-semibold">%{step.stepProgress}</span>
                    </div>
                    <Progress value={step.stepProgress} className="h-1.5" />
                  </div>
                )}

                {/* Reçeteler */}
                {!step.locked && step.recipeDetails.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                      Reçeteler
                    </p>
                    {step.recipeDetails.map((rd) => {
                      const recipeName = recipeNameMap.get(rd.recipeId) || `Reçete #${rd.recipeId}`;
                      return (
                        <button
                          key={rd.recipeId}
                          onClick={() => {
                            // recipeId'den productId'yi bulamayız direkt — ID branch_recipes'tendir
                            // Kullanıcıya genel reçete listesini açalım
                            setLocation('/branch-recipes');
                          }}
                          className={`w-full flex items-center justify-between gap-2 p-2 rounded border text-left text-xs transition-colors ${
                            rd.passed
                              ? 'bg-green-100/50 dark:bg-green-900/20 border-green-300 dark:border-green-800'
                              : rd.viewed
                              ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900'
                              : 'bg-muted/30 hover:bg-muted/50 border-border'
                          }`}
                          data-testid={`recipe-${step.stepNumber}-${rd.recipeId}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {rd.passed ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                            ) : rd.viewed ? (
                              <Eye className="h-4 w-4 text-amber-600 shrink-0" />
                            ) : (
                              <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            <span className="truncate font-medium">{recipeName}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {rd.bestScore !== null && (
                              <Badge variant="outline" className="text-[9px]">
                                {rd.bestScore}%
                              </Badge>
                            )}
                            {rd.demoCompleted && (
                              <Badge variant="secondary" className="text-[9px] gap-0.5">
                                <Award className="h-2.5 w-2.5" /> Demo
                              </Badge>
                            )}
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Tamamlanma kriterleri (info) */}
                {step.completionCriteria && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {step.completionCriteria.minQuizScore && (
                      <Badge variant="outline" className="text-[9px] gap-0.5">
                        <Award className="h-2.5 w-2.5" />
                        Min %{step.completionCriteria.minQuizScore} quiz
                      </Badge>
                    )}
                    {step.completionCriteria.requireRecipeDemo && (
                      <Badge variant="outline" className="text-[9px]">
                        Demo gerekli
                      </Badge>
                    )}
                    {step.completionCriteria.requireSupervisorApproval && (
                      <Badge variant="outline" className="text-[9px]">
                        Süpervizör onayı
                      </Badge>
                    )}
                  </div>
                )}

                {/* Kilitli açıklaması */}
                {step.locked && (
                  <div className="mt-3 p-2 rounded bg-muted/50 text-xs flex items-center gap-2">
                    <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">
                      Önceki adımları tamamlayın
                    </span>
                  </div>
                )}

                {/* Tamamlandı kutlama */}
                {step.completed && (
                  <div className="mt-3 p-2 rounded bg-green-100 dark:bg-green-900/30 text-xs flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-green-600 shrink-0" />
                    <span className="text-green-800 dark:text-green-300 font-medium">
                      Tebrikler! Bu adımı tamamladın.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tamamlandı zaferi */}
      {data.percentComplete === 100 && (
        <Card className="mt-4 border-green-400 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
          <CardContent className="p-6 text-center space-y-2">
            <Trophy className="h-12 w-12 text-amber-500 mx-auto" />
            <h2 className="text-xl font-bold">Onboarding Tamamlandı!</h2>
            <p className="text-sm text-muted-foreground">
              {ROLE_LABELS[data.role] || data.role} eğitim yolunu başarıyla tamamladın.
              Şimdi tam yetkili çalışan olarak kahve hazırlayabilirsin.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
