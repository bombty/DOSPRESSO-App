import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen,
  Lightbulb,
  ListChecks,
  Bot,
  Send,
  Loader2,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  Users,
  Settings,
  HardDrive,
  Building2,
  Wrench,
  GraduationCap,
  BarChart3,
  FileText,
  Star,
  Shield,
  Factory,
  Tablet,
  Grid,
  Clock,
  AlertTriangle,
  QrCode,
  Headphones,
  Bell,
  MessageSquare,
  Calculator,
  Calendar,
  UserCheck,
  CheckSquare,
  ClipboardList,
  Home,
  Package,
  Truck,
  ClipboardCheck,
  MessageSquareHeart,
  TrendingUp,
  ShoppingCart,
  Crown,
  Megaphone,
  type LucideIcon,
} from "lucide-react";

interface RoleGuideContent {
  roleKey: string;
  roleTitle: string;
  roleDescription: string;
  availableModules: Array<{
    name: string;
    description: string;
    icon: string;
    path: string;
    detailedSteps?: string[];
  }>;
  quickTips: string[];
  commonTasks: Array<{
    title: string;
    steps: string[];
  }>;
  restrictions: string[];
}

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  Settings,
  HardDrive,
  Building2,
  Wrench,
  GraduationCap,
  BarChart3,
  FileText,
  Star,
  Shield,
  Factory,
  Tablet,
  Grid,
  Clock,
  AlertTriangle,
  QrCode,
  Headphones,
  Bell,
  MessageSquare,
  Calculator,
  Calendar,
  UserCheck,
  CheckSquare,
  ClipboardList,
  Home,
  BookOpen,
  Package,
  Truck,
  ClipboardCheck,
  MessageSquareHeart,
  TrendingUp,
  ShoppingCart,
  Crown,
  Megaphone,
  Bot,
  BarChart: BarChart3,
  PackageCheck: Package,
};

function getIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] || BookOpen;
}

export default function KullanimKilavuzu() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [question, setQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [expandedTask, setExpandedTask] = useState<number | null>(null);
  const [expandedModule, setExpandedModule] = useState<number | null>(null);

  const { data: guide, isLoading } = useQuery<RoleGuideContent>({
    queryKey: ["/api/me/usage-guide"],
  });

  const askMutation = useMutation({
    mutationFn: async (q: string) => {
      const res = await apiRequest("POST", "/api/me/usage-guide/ask", { question: q });
      return res.json();
    },
    onSuccess: (data: { answer: string }) => {
      setAiAnswer(data.answer);
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message || "Yanıt alınamadı, lütfen tekrar deneyin.",
        variant: "destructive",
      });
    },
  });

  const handleAsk = () => {
    if (!question.trim()) return;
    setAiAnswer("");
    askMutation.mutate(question.trim());
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="loading-guide">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground" data-testid="text-guide-error">Kullanım kılavuzu yüklenemedi.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 pb-24 space-y-6">
        <div className="space-y-2" data-testid="section-header">
          <div className="flex items-center gap-2 flex-wrap">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Kullanım Kılavuzu</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" data-testid="badge-role">{guide.roleTitle}</Badge>
          </div>
          <p className="text-muted-foreground text-sm" data-testid="text-role-description">{guide.roleDescription}</p>
        </div>

        {guide.availableModules.length > 0 && (
          <section data-testid="section-modules">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5" />
              Erişilebilir Modüller
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {guide.availableModules.map((mod, i) => {
                const IconComp = getIcon(mod.icon);
                const isExpanded = expandedModule === i;
                return (
                  <Card
                    key={i}
                    className="cursor-pointer hover-elevate transition-all"
                    onClick={() => setExpandedModule(isExpanded ? null : i)}
                    data-testid={`card-module-${i}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-md bg-primary/10 shrink-0">
                          <IconComp className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-sm">{mod.name}</p>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{mod.description}</p>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Bu modülde yapabilecekleriniz:</p>
                          {mod.detailedSteps && mod.detailedSteps.length > 0 ? (
                            <ul className="space-y-1">
                              {mod.detailedSteps.map((step, j) => (
                                <li key={j} className="flex items-start gap-2 text-xs text-muted-foreground">
                                  <span className="text-primary font-bold shrink-0">•</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-muted-foreground">{mod.description}</p>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(mod.path);
                            }}
                            data-testid={`button-go-module-${i}`}
                          >
                            Modüle Git
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {guide.quickTips.length > 0 && (
          <section data-testid="section-tips">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Hızlı İpuçları
            </h2>
            <Card>
              <CardContent className="p-4">
                <ul className="space-y-2">
                  {guide.quickTips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm" data-testid={`text-tip-${i}`}>
                      <span className="text-primary font-bold shrink-0">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>
        )}

        {guide.commonTasks.length > 0 && (
          <section data-testid="section-tasks">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              Sık Yapılan İşlemler
            </h2>
            <div className="space-y-2">
              {guide.commonTasks.map((task, i) => (
                <Card key={i} data-testid={`card-task-${i}`}>
                  <CardHeader
                    className="p-4 cursor-pointer flex flex-row items-center justify-between gap-2"
                    onClick={() => setExpandedTask(expandedTask === i ? null : i)}
                    data-testid={`button-expand-task-${i}`}
                  >
                    <CardTitle className="text-sm font-medium">{task.title}</CardTitle>
                    {expandedTask === i ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </CardHeader>
                  {expandedTask === i && (
                    <CardContent className="px-4 pb-4 pt-0">
                      <ol className="space-y-1">
                        {task.steps.map((step, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm" data-testid={`text-step-${i}-${j}`}>
                            <Badge variant="outline" className="shrink-0 text-xs">{j + 1}</Badge>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </section>
        )}

        {guide.restrictions.length > 0 && (
          <section data-testid="section-restrictions">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Kısıtlamalar
            </h2>
            <Card>
              <CardContent className="p-4">
                <ul className="space-y-2">
                  {guide.restrictions.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground" data-testid={`text-restriction-${i}`}>
                      <span className="shrink-0">-</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>
        )}

        <section data-testid="section-ai-ask">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI'ya Sor
          </h2>
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Sistem hakkında sorularınızı Türkçe olarak sorun, AI size rolünüze uygun yanıtlar verecektir.
              </p>
              <Textarea
                placeholder="Örn: Nasıl yeni görev oluşturabilirim?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="resize-none"
                rows={3}
                data-testid="input-ai-question"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleAsk}
                  disabled={askMutation.isPending || !question.trim()}
                  data-testid="button-ask-ai"
                >
                  {askMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Sor
                </Button>
              </div>
              {aiAnswer && (
                <div className="rounded-md bg-muted p-4 text-sm whitespace-pre-wrap" data-testid="text-ai-answer">
                  {aiAnswer}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
