import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2, Circle, ChevronRight, ChevronLeft,
  ExternalLink, Rocket, GraduationCap,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  deepLink: string;
  completed: boolean;
  required: boolean;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  tasks: OnboardingTask[];
}

interface RoleOnboardingData {
  needsOnboarding: boolean;
  role: string;
  roleLabel: string;
  steps: OnboardingStep[];
  completionPercentage: number;
  totalTasks: number;
  completedTasks: number;
}

export function RoleOnboardingWizard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);

  const branchOnboardingQuery = useQuery<{ needsOnboarding: boolean }>({
    queryKey: ["/api/admin/onboarding-status"],
    enabled: !!user,
    refetchOnWindowFocus: false,
  });

  const branchOnboardingActive = branchOnboardingQuery.data?.needsOnboarding === true;

  const { data, isLoading } = useQuery<RoleOnboardingData>({
    queryKey: ["/api/admin/role-onboarding-status"],
    enabled: !!user && !branchOnboardingActive,
    refetchOnWindowFocus: false,
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/role-onboarding-complete");
      if (!res.ok) throw new Error("İşlem başarısız");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Onboarding Tamamlandı", description: "Görevleriniz tanımlandı. Sistemi kullanmaya başlayabilirsiniz!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/role-onboarding-status"] });
    },
  });

  if (branchOnboardingActive || isLoading || !data || !data.needsOnboarding) return null;
  if (data.steps.length === 0) return null;

  const steps = data.steps;
  const step = steps[currentStep];
  if (!step) return null;

  const stepCompletedCount = step.tasks.filter(t => t.completed).length;
  const stepTotal = step.tasks.length;
  const allStepsComplete = data.completedTasks === data.totalTasks;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50" data-testid="role-onboarding-wizard">
      <div className="bg-card border rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto">
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-lg font-semibold" data-testid="text-role-wizard-title">
                Hoş Geldiniz — {data.roleLabel}
              </h2>
              <p className="text-sm text-muted-foreground">
                Sisteme başlamadan önce aşağıdaki kurulum adımlarını tamamlayın
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <Progress value={data.completionPercentage} className="flex-1" />
            <span className="text-xs font-medium text-muted-foreground">
              {data.completedTasks}/{data.totalTasks} görev
            </span>
          </div>

          <div className="flex items-center gap-1 mt-3 overflow-x-auto pb-1">
            {steps.map((s, i) => {
              const sCompleted = s.tasks.filter(t => t.completed).length;
              const sTotal = s.tasks.length;
              const isCurrent = i === currentStep;
              const isDone = sCompleted === sTotal && sTotal > 0;
              return (
                <button
                  key={s.id}
                  onClick={() => setCurrentStep(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                    isCurrent ? "bg-primary/10 text-primary" : isDone ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                  }`}
                  data-testid={`button-step-${s.id}`}
                >
                  {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{s.title}</span>
                  <Badge variant={isDone ? "default" : "secondary"} className="text-[10px] px-1 py-0 ml-1">
                    {sCompleted}/{sTotal}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <h3 className="font-semibold text-base">{step.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <Progress value={stepTotal > 0 ? (stepCompletedCount / stepTotal) * 100 : 0} className="flex-1 h-2" />
              <span className="text-xs text-muted-foreground">{stepCompletedCount}/{stepTotal}</span>
            </div>
          </div>

          <div className="space-y-2">
            {step.tasks.map(task => (
              <div
                key={task.id}
                className="flex items-start gap-3 p-3 rounded-md border"
                data-testid={`onboarding-task-${task.id}`}
              >
                {task.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                      {task.title}
                    </span>
                    {task.required && !task.completed && (
                      <Badge variant="destructive" className="text-[10px] px-1 py-0">Zorunlu</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                </div>
                {!task.completed && (
                  <Button variant="ghost" size="icon" asChild>
                    <a href={task.deepLink} data-testid={`link-task-${task.id}`}>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t flex items-center justify-between gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            data-testid="button-role-wizard-prev"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Geri
          </Button>

          <span className="text-xs text-muted-foreground">
            {currentStep + 1} / {steps.length}
          </span>

          <div className="flex items-center gap-2">
            {currentStep < steps.length - 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(currentStep + 1)}
                data-testid="button-role-wizard-next"
              >
                İleri
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
            {currentStep === steps.length - 1 && (
              <Button
                size="sm"
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                data-testid="button-role-onboarding-complete"
              >
                <Rocket className="w-4 h-4 mr-1" />
                {completeMutation.isPending ? "Tamamlanıyor..." : "Onboarding Tamamla"}
              </Button>
            )}
          </div>
        </div>

        <div className="px-6 pb-4">
          <p className="text-xs text-muted-foreground text-center">
            Tamamlanmamış görevlere daha sonra da dönebilirsiniz. Bu sihirbaz tüm adımları tamamlayana kadar gösterilir.
          </p>
        </div>
      </div>
    </div>
  );
}
