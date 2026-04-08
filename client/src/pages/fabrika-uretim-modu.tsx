import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, ArrowRight, Play, Pause, RotateCcw,
  ChevronLeft, Clock, AlertTriangle, Beaker, Volume2,
  CheckCircle2, FlaskConical, Lock,
} from "lucide-react";

// ═══════════════════════════════════════
// TYPES
// ═══════════════════════════════════════

interface FactoryIngredient {
  id: number;
  refId: string;
  ref_id?: string;
  name: string;
  amount: string | number;
  unit: string;
  ingredientType: string;
  ingredient_type?: string;
  ingredientCategory: string;
  ingredient_category?: string;
  keyblendId?: number | null;
  keyblend_id?: number | null;
}

interface FactoryStep {
  id: number;
  stepNumber: number;
  step_number?: number;
  title: string;
  content: string;
  photoUrl?: string | null;
  photo_url?: string | null;
  photoUrls?: string[] | null;
  photo_urls?: string[] | null;
  timerSeconds?: number | null;
  timer_seconds?: number | null;
  temperatureCelsius?: number | null;
  temperature_celsius?: number | null;
  equipmentNeeded?: string | null;
  equipment_needed?: string | null;
  isCriticalControl?: boolean;
  is_critical_control?: boolean;
  ccpNotes?: string | null;
  ccp_notes?: string | null;
  tips?: string | null;
}

interface BatchPreset {
  name: string;
  multiplier: number;
  type: "standard" | "arge";
}

// ═══════════════════════════════════════
// INGREDIENT CHIP PARSER
// ═══════════════════════════════════════

function parseIngredientRefs(
  content: string,
  ingredients: FactoryIngredient[],
  multiplier: number
): React.ReactNode[] {
  const parts = content.split(/(\{[^}]+\})/g);
  return parts.map((part, idx) => {
    const match = part.match(/^\{(\w+)\}$/);
    if (!match) return <span key={idx}>{part}</span>;

    const refId = match[1];
    const ingredient = ingredients.find(
      (i) => (i.refId || i.ref_id) === refId
    );
    if (!ingredient) return <span key={idx}>{part}</span>;

    const baseAmount = Number(ingredient.amount);
    const scaled = Math.round(baseAmount * multiplier * 100) / 100;
    const display = Number.isInteger(scaled) ? scaled.toString() : scaled.toFixed(1);
    const isKeyblend = (ingredient.ingredientType || ingredient.ingredient_type) === "keyblend";

    return (
      <span
        key={idx}
        className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-semibold mx-0.5",
          isKeyblend
            ? "bg-purple-100 border border-purple-300 text-purple-800 dark:bg-purple-950 dark:border-purple-700 dark:text-purple-200"
            : "bg-amber-100 border border-amber-300 text-amber-800 dark:bg-amber-950 dark:border-amber-700 dark:text-amber-200"
        )}
        title={ingredient.name}
      >
        {isKeyblend && <Lock className="w-3 h-3" />}
        {display}{ingredient.unit}
      </span>
    );
  });
}

// ═══════════════════════════════════════
// TIMER COMPONENT
// ═══════════════════════════════════════

function StepTimer({ seconds, title }: { seconds: number; title: string }) {
  const [remaining, setRemaining] = useState(seconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setRemaining(seconds);
    setIsRunning(false);
    setIsFinished(false);
  }, [seconds]);

  useEffect(() => {
    if (isRunning && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsFinished(true);
            // Sesli bildirim
            try {
              const ctx = new AudioContext();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.value = 800;
              gain.gain.value = 0.3;
              osc.start();
              setTimeout(() => { osc.stop(); ctx.close(); }, 1000);
            } catch {}
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, remaining]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className={cn(
      "rounded-xl border-2 p-4 text-center",
      isFinished
        ? "border-green-500 bg-green-50 dark:bg-green-950/30"
        : isRunning
          ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 animate-pulse"
          : "border-border bg-muted/50"
    )}>
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
        <Clock className="w-3.5 h-3.5 inline mr-1" />
        {title}
      </div>
      <div className={cn(
        "text-4xl font-mono font-bold tracking-wider my-2",
        isFinished ? "text-green-600" : isRunning ? "text-amber-600" : ""
      )}>
        {formatTime(remaining)}
      </div>
      {isFinished && (
        <div className="text-sm font-medium text-green-600 mb-2">
          <CheckCircle2 className="w-4 h-4 inline mr-1" /> Süre doldu!
        </div>
      )}
      <div className="flex items-center justify-center gap-2">
        <Button
          size="lg"
          variant={isRunning ? "outline" : "default"}
          onClick={() => setIsRunning(!isRunning)}
          disabled={isFinished}
          className="min-w-[100px]"
        >
          {isRunning ? <><Pause className="w-4 h-4 mr-1" /> Durdur</> : <><Play className="w-4 h-4 mr-1" /> Başlat</>}
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => { setRemaining(seconds); setIsRunning(false); setIsFinished(false); }}
        >
          <RotateCcw className="w-4 h-4 mr-1" /> Sıfırla
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// MAIN PRODUCTION MODE
// ═══════════════════════════════════════

export default function FabrikaUretimModu() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [isArge, setIsArge] = useState(false);
  const [productionLogId, setProductionLogId] = useState<number | null>(null);
  const [stepCompleted, setStepCompleted] = useState<Record<number, boolean>>({});

  // Fetch recipe detail
  const { data: recipe, isLoading } = useQuery<any>({
    queryKey: ["/api/factory/recipes", id],
    queryFn: async () => {
      const res = await fetch(`/api/factory/recipes/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Reçete yüklenemedi");
      return res.json();
    },
    enabled: !!id,
  });

  const ingredients: FactoryIngredient[] = recipe?.ingredients || [];
  const steps: FactoryStep[] = recipe?.steps || [];
  const batchPresets: BatchPreset[] = recipe?.batchPresets || recipe?.batch_presets || [
    { name: "×1", multiplier: 1, type: "standard" },
    { name: "×1.25", multiplier: 1.25, type: "standard" },
    { name: "×1.5", multiplier: 1.5, type: "standard" },
    { name: "×1.75", multiplier: 1.75, type: "standard" },
    { name: "×2", multiplier: 2, type: "standard" },
    { name: "AR-GE %5", multiplier: 0.05, type: "arge" },
    { name: "AR-GE %10", multiplier: 0.10, type: "arge" },
    { name: "AR-GE %25", multiplier: 0.25, type: "arge" },
  ];

  const step = steps[currentStep];
  const totalSteps = steps.length;
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;
  const baseBatch = recipe?.baseBatchOutput || recipe?.base_batch_output || 1;
  const outputCount = Math.round(baseBatch * multiplier);

  // Start production
  const startProduction = useCallback(async () => {
    try {
      const res = await fetch(`/api/factory/recipes/${id}/start-production`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          batchMultiplier: multiplier,
          isArge,
          argeNotes: isArge ? "AR-GE deneme üretimi" : undefined,
        }),
      });
      if (res.ok) {
        const log = await res.json();
        setProductionLogId(log.id);
      }
    } catch {}
  }, [id, multiplier, isArge]);

  // Complete production
  const completeProduction = useCallback(async () => {
    if (!productionLogId) return;
    try {
      await fetch(`/api/factory/production-logs/${productionLogId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          actualOutput: outputCount,
          notes: `${totalSteps} adım tamamlandı`,
        }),
      });
      navigate(`/fabrika/receteler/${id}`);
    } catch {}
  }, [productionLogId, outputCount, totalSteps, id, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Reçete yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!recipe || steps.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">Reçete bulunamadı veya adım tanımlı değil</p>
          <Button onClick={() => navigate("/fabrika/receteler")}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Geri Dön
          </Button>
        </div>
      </div>
    );
  }

  // ── BATCH SEÇİM EKRANI (üretim başlamadan) ──
  if (!productionLogId) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <Button variant="ghost" onClick={() => navigate(`/fabrika/receteler/${id}`)} className="mb-4">
            <ChevronLeft className="w-4 h-4 mr-1" /> Geri
          </Button>

          <h1 className="text-2xl font-bold mb-1">{recipe.name}</h1>
          <p className="text-muted-foreground mb-6">{recipe.description}</p>

          {/* Batch Presets */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Batch Ayarı</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {batchPresets.filter(p => p.type === "standard").map((preset) => (
                <Button
                  key={preset.multiplier}
                  variant={multiplier === preset.multiplier && !isArge ? "default" : "outline"}
                  className="h-14 text-lg font-bold"
                  onClick={() => { setMultiplier(preset.multiplier); setIsArge(false); }}
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>

          {/* AR-GE */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              <FlaskConical className="w-4 h-4 inline mr-1" /> AR-GE Deneme
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {batchPresets.filter(p => p.type === "arge").map((preset) => (
                <Button
                  key={preset.multiplier}
                  variant={multiplier === preset.multiplier && isArge ? "default" : "outline"}
                  className={cn("h-14 font-bold", isArge && multiplier === preset.multiplier && "bg-purple-600 hover:bg-purple-700")}
                  onClick={() => { setMultiplier(preset.multiplier); setIsArge(true); }}
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Özet */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Çıktı:</span>
                  <span className="font-bold ml-2">{outputCount} {recipe.outputUnit || recipe.output_unit || "adet"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Adım:</span>
                  <span className="font-bold ml-2">{totalSteps} adım</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Personel:</span>
                  <span className="font-bold ml-2">{recipe.requiredWorkers || recipe.required_workers || 1} kişi</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Süre:</span>
                  <span className="font-bold ml-2">
                    {(recipe.prepTimeMinutes || recipe.prep_time_minutes || 0) +
                     (recipe.productionTimeMinutes || recipe.production_time_minutes || 0) +
                     (recipe.cleaningTimeMinutes || recipe.cleaning_time_minutes || 0)} dk
                  </span>
                </div>
              </div>
              {isArge && (
                <div className="mt-3 p-2 bg-purple-50 dark:bg-purple-950/30 rounded-md border border-purple-200 dark:border-purple-800">
                  <FlaskConical className="w-4 h-4 inline mr-1 text-purple-600" />
                  <span className="text-sm text-purple-700 dark:text-purple-300 font-medium">
                    AR-GE deneme üretimi — normal raporlardan ayrılır
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Button size="lg" className="w-full h-14 text-lg font-bold" onClick={startProduction}>
            🍳 Üretime Başla
          </Button>
        </div>
      </div>
    );
  }

  // ── ÜRETİM MODU (adım adım) ──
  const timerSec = step?.timerSeconds ?? step?.timer_seconds ?? null;
  const isCCP = step?.isCriticalControl ?? step?.is_critical_control ?? false;
  const photoUrl = step?.photoUrl ?? step?.photo_url ?? null;
  const photos = step?.photoUrls ?? step?.photo_urls ?? [];
  const temp = step?.temperatureCelsius ?? step?.temperature_celsius ?? null;
  const equipment = step?.equipmentNeeded ?? step?.equipment_needed ?? null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <Button variant="ghost" size="sm" onClick={() => {
            if (confirm("Üretim modundan çıkmak istediğinize emin misiniz?")) {
              navigate(`/fabrika/receteler/${id}`);
            }
          }}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Çık
          </Button>
          <div className="text-center">
            <span className="text-lg font-bold">
              Adım {currentStep + 1} / {totalSteps}
            </span>
          </div>
          <div className="text-right">
            <Badge variant="outline" className="text-xs">
              {isArge ? "🔬 AR-GE" : `×${multiplier}`} = {outputCount} {recipe.outputUnit || "adet"}
            </Badge>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-3xl mx-auto w-full">
        {/* Photo */}
        {(photoUrl || (photos && photos.length > 0)) && (
          <div className="mb-4 rounded-xl overflow-hidden border">
            <img
              src={photoUrl || (photos as string[])?.[0] || ""}
              alt={step.title}
              className="w-full h-48 md:h-64 object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        )}

        {/* CCP Warning */}
        {isCCP && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border-2 border-red-400 dark:border-red-700 rounded-xl">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" />
              HACCP KRİTİK KONTROL NOKTASI
            </div>
            {(step.ccpNotes || step.ccp_notes) && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{step.ccpNotes || step.ccp_notes}</p>
            )}
          </div>
        )}

        {/* Step Title */}
        <h2 className="text-xl md:text-2xl font-bold mb-3">{step.title}</h2>

        {/* Temperature & Equipment */}
        {(temp || equipment) && (
          <div className="flex gap-3 mb-3 flex-wrap">
            {temp && (
              <Badge variant="secondary" className="text-sm py-1">🌡️ {temp}°C</Badge>
            )}
            {equipment && (
              <Badge variant="secondary" className="text-sm py-1">🔧 {equipment}</Badge>
            )}
          </div>
        )}

        {/* Step Content with Ingredient Chips */}
        <div className="text-base md:text-lg leading-relaxed mb-6">
          {parseIngredientRefs(step.content, ingredients, multiplier)}
        </div>

        {/* Tips */}
        {step.tips && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              💡 {step.tips}
            </span>
          </div>
        )}

        {/* Timer */}
        {timerSec && timerSec > 0 && (
          <div className="mb-6">
            <StepTimer seconds={timerSec} title={step.title} />
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="sticky bottom-0 bg-card border-t px-4 py-3">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
            disabled={currentStep === 0}
            className="min-w-[120px]"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Geri
          </Button>

          {currentStep < totalSteps - 1 ? (
            <Button
              size="lg"
              onClick={() => {
                setStepCompleted((prev) => ({ ...prev, [currentStep]: true }));
                setCurrentStep((s) => s + 1);
              }}
              className="min-w-[120px]"
            >
              İleri <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              size="lg"
              className="min-w-[160px] bg-green-600 hover:bg-green-700"
              onClick={completeProduction}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" /> Üretimi Tamamla
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
