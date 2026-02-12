import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { compressImage } from "@/lib/image-utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, CheckCircle, Clock, Lightbulb, ArrowLeft, Edit2, Save, Sparkles, Plus, Trash2, Image, X, Eye, ChevronRight, ChevronLeft, Award, RotateCcw, MessageCircle, Presentation, TrendingUp, ShoppingBag, Users, Thermometer, Package, AlertCircle, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TrainingModule, isHQRole, hasPermission, type UserRoleType } from "@shared/schema";

const objectivesEditSchema = z.object({
  objectives: z.array(z.string()).default([]),
});

const stepsEditSchema = z.object({
  steps: z.array(z.object({
    step_number: z.number().optional(),
    title: z.string(),
    content: z.string(),
    media_suggestions: z.array(z.string()).optional(),
    photos: z.array(z.string()).optional(),
  })).default([]),
});

const quizEditSchema = z.object({
  quiz: z.array(z.object({
    question_id: z.string(),
    question_type: z.enum(["mcq", "true_false"]),
    question_text: z.string(),
    options: z.array(z.string()),
    correct_option_index: z.number(),
  })).default([]),
});

const scenariosEditSchema = z.object({
  scenarioTasks: z.array(z.object({
    scenario_id: z.string().optional(),
    title: z.string(),
    description: z.string(),
    tasks: z.array(z.string()).optional(),
  })).default([]),
});

const checklistEditSchema = z.object({
  supervisorChecklist: z.array(z.object({
    item_id: z.string().optional(),
    title: z.string(),
    description: z.string(),
  })).default([]),
});

export default function ModuleDetail() {
  const [, params] = useRoute("/akademi-modul/:id");
  const [, setLocation] = useLocation();
  const moduleId = params?.id ? parseInt(params.id) : null;
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Store referrer page for back navigation
  const referrerPage = typeof window !== 'undefined' ? sessionStorage.getItem('academyReferrer') : null;
  
  const isEditor = user ? hasPermission(user.role as UserRoleType, 'training', 'edit') : false;
  
  // Auto-mark module as started when opened by student
  useEffect(() => {
    if (moduleId && !isEditor && user?.id) {
      // Student opened module - mark as started/engaged
      // This could trigger an API call to mark module as "started"
      // For now, just ensure the module is viewable
    }
  }, [moduleId, isEditor, user?.id]);
  
  // Dialog states
  const [objectivesOpen, setObjectivesOpen] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [scenariosOpen, setScenariosOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPhase, setPreviewPhase] = useState<'objectives' | 'steps' | 'quiz' | 'scenarios' | 'completed'>('objectives');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [previewQuizAnswers, setPreviewQuizAnswers] = useState<Record<number, number>>({});
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  
  // Quiz timer states
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizTimeRemaining, setQuizTimeRemaining] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizScore, setQuizScore] = useState<{correct: number; total: number; percentage: number} | null>(null);

  // Quiz timer countdown effect
  useEffect(() => {
    if (!quizStarted || quizFinished || quizTimeRemaining <= 0) return;
    const timer = setInterval(() => {
      setQuizTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setQuizFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [quizStarted, quizFinished, quizTimeRemaining]);

  // Auto-finish quiz when time runs out
  useEffect(() => {
    if (quizFinished && !quizScore && module?.quiz) {
      const quiz = module.quiz;
      let correct = 0;
      quiz.forEach((q: any, idx: number) => {
        if (quizAnswers[idx] === q.correct_option_index) correct++;
      });
      setQuizScore({ correct, total: quiz.length, percentage: Math.round((correct / quiz.length) * 100) });
    }
  }, [quizFinished, quizScore, module?.quiz, quizAnswers]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const startQuiz = () => {
    const timeLimitMin = module?.timeLimitMinutes || 0;
    setQuizAnswers({});
    setQuizScore(null);
    setQuizFinished(false);
    if (timeLimitMin > 0) {
      setQuizTimeRemaining(timeLimitMin * 60);
    } else {
      setQuizTimeRemaining(0);
    }
    setQuizStarted(true);
  };

  const submitQuiz = () => {
    setQuizFinished(true);
  };

  // AI Sales & Marketing states
  const [isGeneratingSales, setIsGeneratingSales] = useState(false);
  const [isGeneratingPresentation, setIsGeneratingPresentation] = useState(false);
  const [isGeneratingMarketing, setIsGeneratingMarketing] = useState(false);
  const [isGeneratingRoleplay, setIsGeneratingRoleplay] = useState(false);
  const [activeRoleplayScenario, setActiveRoleplayScenario] = useState<number | null>(null);
  const [roleplayMessages, setRoleplayMessages] = useState<Array<{role: 'user' | 'customer'; message: string}>>([]);
  const [roleplayInput, setRoleplayInput] = useState("");

  const { data: module, isLoading } = useQuery({
    queryKey: ['/api/training/modules', moduleId],
    queryFn: async () => {
      if (!moduleId) return null;
      const res = await fetch(`/api/training/modules/${moduleId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!moduleId,
  });

  const objectivesForm = useForm<z.infer<typeof objectivesEditSchema>>({
    resolver: zodResolver(objectivesEditSchema),
    defaultValues: { objectives: module?.learningObjectives || [] },
  });

  const stepsForm = useForm<z.infer<typeof stepsEditSchema>>({
    resolver: zodResolver(stepsEditSchema),
    defaultValues: { steps: module?.steps || [] },
  });

  const quizForm = useForm<z.infer<typeof quizEditSchema>>({
    resolver: zodResolver(quizEditSchema),
    defaultValues: { quiz: module?.quiz || [] },
  });

  const scenariosForm = useForm<z.infer<typeof scenariosEditSchema>>({
    resolver: zodResolver(scenariosEditSchema),
    defaultValues: { scenarioTasks: module?.scenarioTasks || [] },
  });

  const checklistForm = useForm<z.infer<typeof checklistEditSchema>>({
    resolver: zodResolver(checklistEditSchema),
    defaultValues: { supervisorChecklist: module?.supervisorChecklist || [] },
  });

  const updateObjectivesMutation = useMutation({
    mutationFn: async (data: z.infer<typeof objectivesEditSchema>) => {
      if (!moduleId) throw new Error("Module not found");
      return apiRequest("PUT", `/api/training/modules/${moduleId}`, {
        title: module?.title,
        description: module?.description,
        level: module?.level,
        estimatedDuration: module?.estimatedDuration,
        learningObjectives: data.objectives,
      });
    },
    onSuccess: () => {
      toast({ title: "Öğrenme hedefleri güncellendi" });
      setObjectivesOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/training/modules', moduleId] });
    },
    onError: (error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const generateObjectivesMutation = useMutation({
    mutationFn: async () => {
      if (!moduleId) throw new Error("Module not found");
      const res = await fetch(`/api/training/modules/${moduleId}/generate-objectives`, { 
        method: "POST", 
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to generate");
      return res.json();
    },
    onSuccess: (data) => {
      objectivesForm.setValue("objectives", data.objectives);
      toast({ title: "Hedefler oluşturuldu", description: "AI ile öğrenme hedefleri oluşturuldu" });
    },
    onError: (error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const updateStepsMutation = useMutation({
    mutationFn: async (data: z.infer<typeof stepsEditSchema>) => {
      if (!moduleId) throw new Error("Module not found");
      return apiRequest("PUT", `/api/training/modules/${moduleId}`, {
        title: module?.title,
        description: module?.description,
        level: module?.level,
        estimatedDuration: module?.estimatedDuration,
        steps: data.steps,
      });
    },
    onSuccess: () => {
      toast({ title: "Adımlar güncellendi" });
      setStepsOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/training/modules', moduleId] });
    },
    onError: (error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const updateQuizMutation = useMutation({
    mutationFn: async (data: z.infer<typeof quizEditSchema>) => {
      if (!moduleId) throw new Error("Module not found");
      return apiRequest("PUT", `/api/training/modules/${moduleId}`, {
        title: module?.title,
        description: module?.description,
        level: module?.level,
        estimatedDuration: module?.estimatedDuration,
        quiz: data.quiz,
      });
    },
    onSuccess: () => {
      toast({ title: "Quiz güncellendi" });
      setQuizOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/training/modules', moduleId] });
    },
    onError: (error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const updateScenariosMutation = useMutation({
    mutationFn: async (data: z.infer<typeof scenariosEditSchema>) => {
      if (!moduleId) throw new Error("Module not found");
      return apiRequest("PUT", `/api/training/modules/${moduleId}`, {
        title: module?.title,
        description: module?.description,
        level: module?.level,
        estimatedDuration: module?.estimatedDuration,
        scenarioTasks: data.scenarioTasks,
      });
    },
    onSuccess: () => {
      toast({ title: "Senaryolar güncellendi" });
      setScenariosOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/training/modules', moduleId] });
    },
    onError: (error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const updateChecklistMutation = useMutation({
    mutationFn: async (data: z.infer<typeof checklistEditSchema>) => {
      if (!moduleId) throw new Error("Module not found");
      return apiRequest("PUT", `/api/training/modules/${moduleId}`, {
        title: module?.title,
        description: module?.description,
        level: module?.level,
        estimatedDuration: module?.estimatedDuration,
        supervisorChecklist: data.supervisorChecklist,
      });
    },
    onSuccess: () => {
      toast({ title: "Kontrol Listesi güncellendi" });
      setChecklistOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/training/modules', moduleId] });
    },
    onError: (error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  // Sync form values and selectedRoles when module loads
  useEffect(() => {
    if (module) {
      objectivesForm.reset({ objectives: module.learningObjectives || [] });
      stepsForm.reset({ steps: module.steps || [] });
      quizForm.reset({ quiz: module.quiz || [] });
      scenariosForm.reset({ scenarioTasks: module.scenarioTasks || [] });
      checklistForm.reset({ supervisorChecklist: module.supervisorChecklist || [] });
      setSelectedRoles(module.requiredForRole || []);
    }
  }, [module, objectivesForm, stepsForm, quizForm, scenariosForm, checklistForm]);

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground">Yükleniyor...</div>;
  }

  if (!module) {
    return (
      <div className="p-6">
        <Button onClick={() => setLocation("/akademi")} variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Geri Dön
        </Button>
        <div className="text-center py-8 text-destructive">Modül bulunamadı</div>
      </div>
    );
  }

  const learningObjectives = module.learningObjectives || [];
  const steps = module.steps || [];
  const scenarioTasks = module.scenarioTasks || [];
  const supervisorChecklist = module.supervisorChecklist || [];

  // STUDENT VIEW - Auto-show full learning experience immediately
  if (!isEditor) {
    return (
      <div className="flex flex-col gap-3 sm:gap-4 p-3 max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setLocation(referrerPage || "/akademi")}
            variant="outline"
            size="icon"
            title="Geri Dön"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* Student Learning Header */}
        <div>
          <h1 className="text-lg font-bold tracking-tight">{module.title}</h1>
          <p className="text-xs text-muted-foreground mt-1">{module.description}</p>
          <div className="flex gap-2 mt-4 flex-wrap">
            <Badge variant="outline">
              {module.level === "beginner" ? "Başlangıç" : module.level === "intermediate" ? "Orta" : "İleri"}
            </Badge>
            <Badge variant="outline">{module.estimatedDuration} dk</Badge>
          </div>
        </div>

        {/* Student Learning Tabs */}
        <Tabs value={previewPhase} onValueChange={(v) => setPreviewPhase(v as 'objectives' | 'steps' | 'quiz' | 'scenarios' | 'completed')} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="objectives">Hedefler</TabsTrigger>
            <TabsTrigger value="steps" disabled={previewPhase === 'objectives'}>İçerik</TabsTrigger>
            <TabsTrigger value="quiz" disabled={previewPhase !== 'quiz' && previewPhase !== 'completed'}>Sınav</TabsTrigger>
            <TabsTrigger value="completed" disabled={previewPhase !== 'completed'}>✓ Bitti</TabsTrigger>
          </TabsList>

          {/* Objectives Tab */}
          <TabsContent value="objectives" className="w-full space-y-2 sm:space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Öğrenme Hedefleri</CardTitle>
                <CardDescription>Bu modülü tamamladığında neler öğreneceksin</CardDescription>
              </CardHeader>
              <CardContent>
                {learningObjectives.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Hedef tanımlanmamış</p>
                ) : (
                  <ul className="flex flex-col gap-3 sm:gap-4">
                    {learningObjectives.map((objective: string, idx: number) => (
                      <li key={idx} className="flex gap-2 sm:gap-3 text-sm">
                        <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <span>{objective}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Button onClick={() => setPreviewPhase('steps')} className="w-full">
              İçeriği Başla <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </TabsContent>

          {/* Steps Tab */}
          <TabsContent value="steps" className="w-full space-y-2 sm:space-y-3">
            {steps.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">İçerik tanımlanmamış</p>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-lg">Adım {currentStepIndex + 1}: {steps[currentStepIndex]?.title}</CardTitle>
                        <CardDescription className="mt-2">{steps[currentStepIndex]?.content}</CardDescription>
                      </div>
                      <Badge variant="outline">{currentStepIndex + 1}/{steps.length}</Badge>
                    </div>
                  </CardHeader>
                </Card>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
                    disabled={currentStepIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" /> Önceki
                  </Button>
                  {currentStepIndex === steps.length - 1 ? (
                    <Button 
                      className="flex-1"
                      onClick={() => setPreviewPhase('quiz')}
                    >
                      Sınava Geç <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button 
                      className="flex-1"
                      onClick={() => setCurrentStepIndex(currentStepIndex + 1)}
                    >
                      Sonraki <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          {/* Quiz Tab */}
          <TabsContent value="quiz" className="w-full space-y-2 sm:space-y-3">
            {module.quiz && module.quiz.length > 0 ? (
              <>
                {!quizStarted ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Mod\u00fcl S\u0131nav\u0131</CardTitle>
                      <CardDescription>\u00d6\u011frendiklerini peki\u015ftir</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" data-testid="badge-quiz-count">
                          {module.quiz.length} Soru
                        </Badge>
                        {module.timeLimitMinutes && module.timeLimitMinutes > 0 && (
                          <Badge variant="outline" data-testid="badge-quiz-time">
                            <Clock className="w-3 h-3 mr-1" />
                            {module.timeLimitMinutes} Dakika
                          </Badge>
                        )}
                      </div>
                      {module.timeLimitMinutes && module.timeLimitMinutes > 0 && (
                        <div className="bg-muted/50 p-3 rounded text-sm text-muted-foreground">
                          <AlertCircle className="w-4 h-4 inline mr-1" />
                          S\u0131nav ba\u015flad\u0131ktan sonra {module.timeLimitMinutes} dakikan\u0131z olacak. S\u00fcre doldu\u011funda s\u0131nav otomatik olarak kapanacak ve sonu\u00e7lar\u0131n\u0131z g\u00f6r\u00fcnt\u00fclenecek.
                        </div>
                      )}
                      <Button onClick={startQuiz} className="w-full" data-testid="button-start-quiz">
                        S\u0131nav\u0131 Ba\u015flat
                      </Button>
                    </CardContent>
                  </Card>
                ) : quizFinished && quizScore ? (
                  <div className="space-y-3">
                    <Card className={quizScore.percentage >= 70 ? "border-green-500/50" : "border-destructive/50"}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          {quizScore.percentage >= 70 ? (
                            <><Award className="w-5 h-5 text-green-500" /> S\u0131nav Tamamland\u0131!</>
                          ) : (
                            <><AlertCircle className="w-5 h-5 text-destructive" /> S\u0131nav Sonucu</>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-center">
                          <p className="text-4xl font-bold" data-testid="text-quiz-score">%{quizScore.percentage}</p>
                          <p className="text-sm text-muted-foreground mt-1">{quizScore.correct}/{quizScore.total} do\u011fru</p>
                        </div>
                        {quizTimeRemaining === 0 && module.timeLimitMinutes && module.timeLimitMinutes > 0 && (
                          <div className="bg-muted/50 p-2 rounded text-xs text-center text-muted-foreground">
                            S\u00fcre doldu - S\u0131nav otomatik olarak tamamland\u0131
                          </div>
                        )}
                        <div className="space-y-2">
                          {module.quiz.map((q: any, idx: number) => (
                            <div key={idx} className={`p-3 rounded border text-sm ${quizAnswers[idx] === q.correct_option_index ? 'bg-green-500/10 border-green-500/30' : 'bg-destructive/10 border-destructive/30'}`}>
                              <p className="font-medium mb-1">{idx + 1}. {q.question_text}</p>
                              <p className="text-xs">
                                Cevab\u0131n\u0131z: {quizAnswers[idx] !== undefined ? q.options[quizAnswers[idx]] : 'Cevaplanmad\u0131'}
                                {quizAnswers[idx] !== q.correct_option_index && (
                                  <span className="text-green-600 dark:text-green-400 ml-2">Do\u011fru: {q.options[q.correct_option_index]}</span>
                                )}
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => { setQuizStarted(false); setQuizFinished(false); setQuizScore(null); }} className="flex-1" data-testid="button-retry-quiz">
                            <RotateCcw className="w-4 h-4 mr-1" /> Tekrar Dene
                          </Button>
                          {quizScore.percentage >= 70 && (
                            <Button
                              onClick={async () => {
                                setIsMarkingComplete(true);
                                try {
                                  await fetch(`/api/training/modules/${moduleId}/complete`, {
                                    method: 'POST', credentials: 'include',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ quizScore: quizScore.correct, quizPercentage: quizScore.percentage })
                                  });
                                  toast({ title: "Mod\u00fcl Tamamland\u0131!" });
                                  setPreviewPhase('completed');
                                  queryClient.invalidateQueries({ queryKey: ["/api/training/user-modules-stats"] });
                                  queryClient.invalidateQueries({ queryKey: ["/api/training/user-progress"], exact: false });
                                  queryClient.invalidateQueries({ queryKey: ["/api/academy/career-progress"] });
                                } catch (err) {
                                  toast({ title: "Hata", description: (err instanceof Error ? err.message : "Bilinmeyen hata"), variant: "destructive" });
                                } finally { setIsMarkingComplete(false); }
                              }}
                              disabled={isMarkingComplete}
                              className="flex-1"
                              data-testid="button-complete-module"
                            >
                              {isMarkingComplete ? "Kaydediliyor..." : "Tamamla"} <CheckCircle className="w-4 h-4 ml-1" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {module.timeLimitMinutes && module.timeLimitMinutes > 0 && (
                      <div className={`sticky top-0 z-50 p-3 rounded-md flex items-center justify-between ${quizTimeRemaining <= 30 ? 'bg-destructive/20 border border-destructive/50' : 'bg-muted'}`}>
                        <div className="flex items-center gap-2">
                          <Clock className={`w-4 h-4 ${quizTimeRemaining <= 30 ? 'text-destructive animate-pulse' : ''}`} />
                          <span className={`font-mono text-lg font-bold ${quizTimeRemaining <= 30 ? 'text-destructive' : ''}`} data-testid="text-quiz-timer">
                            {formatTime(quizTimeRemaining)}
                          </span>
                        </div>
                        <Badge variant="outline">{Object.keys(quizAnswers).length}/{module.quiz.length} cevaplanm\u0131\u015f</Badge>
                      </div>
                    )}
                    {module.quiz.map((q: any, idx: number) => (
                      <Card key={idx}>
                        <CardContent className="pt-4">
                          <p className="font-medium mb-3 text-sm">{idx + 1}. {q.question_text}</p>
                          <div className="space-y-2">
                            {q.options?.map((opt: string, optIdx: number) => (
                              <button
                                key={optIdx}
                                onClick={() => setQuizAnswers({ ...quizAnswers, [idx]: optIdx })}
                                className={`w-full text-left p-3 rounded border-2 transition-colors text-sm ${
                                  quizAnswers[idx] === optIdx
                                    ? "border-primary bg-primary/10"
                                    : "border-muted hover:border-primary/50"
                                }`}
                                data-testid={`button-quiz-answer-${idx}-${optIdx}`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <Button onClick={submitQuiz} className="w-full" data-testid="button-submit-quiz">
                      S\u0131nav\u0131 Tamamla ({Object.keys(quizAnswers).length}/{module.quiz.length})
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  S\u0131nav tan\u0131mlanmam\u0131\u015f
                  <Button
                    onClick={async () => {
                      setIsMarkingComplete(true);
                      try {
                        await fetch(`/api/training/modules/${moduleId}/complete`, {
                          method: 'POST', credentials: 'include',
                          headers: { 'Content-Type': 'application/json' }
                        });
                        toast({ title: "Mod\u00fcl Tamamland\u0131!" });
                        setPreviewPhase('completed');
                        queryClient.invalidateQueries({ queryKey: ["/api/training/user-modules-stats"] });
                      } catch (err) {
                        toast({ title: "Hata", variant: "destructive" });
                      } finally { setIsMarkingComplete(false); }
                    }}
                    disabled={isMarkingComplete}
                    className="w-full mt-4"
                    data-testid="button-complete-no-quiz"
                  >
                    Mod\u00fcl\u00fc Tamamla <CheckCircle className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Completed Tab */}
          <TabsContent value="completed" className="w-full space-y-2 sm:space-y-3">
            <Card className="bg-success/10 dark:bg-success/5 border-success/30 dark:border-success/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-success dark:text-success">
                  <Award className="w-6 h-6" />
                  Modül Tamamlandı!
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:gap-4">
                <p className="text-sm">✓ Öğrenme hedefleri tamamlandı</p>
                <p className="text-sm">✓ İçerik öğrenildi</p>
                <p className="text-sm">✓ Sınav geçildi</p>
                <Button onClick={() => setLocation(referrerPage || "/akademi")} className="w-full mt-4">
                  Academy'ye Dön
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // HQ/ADMIN EDIT VIEW
  return (
    <div className="flex flex-col gap-3 sm:gap-4 gap-2 sm:gap-3 p-3">
      <div className="flex items-center gap-2 mb-4">
        <Button
          onClick={() => setLocation("/akademi-hq")}
          variant="outline"
          size="icon"
          title="Geri Dön"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
      </div>

      {/* Header */}
      <div>
        <div className="flex justify-between items-start gap-2 sm:gap-3">
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{module.title}</h1>
            <p className="text-muted-foreground mt-2">{module.description}</p>
            <div className="flex gap-2 mt-4 flex-wrap">
              {module.isPublished ? (
                <Badge variant="default">Yayında</Badge>
              ) : (
                <Badge variant="secondary">Taslak</Badge>
              )}
              <Badge variant="outline">
                {module.level === "beginner"
                  ? "Başlangıç"
                  : module.level === "intermediate"
                  ? "Orta"
                  : "İleri"}
              </Badge>
              <Badge variant="outline">{module.estimatedDuration} dk</Badge>
              {module.tags && module.tags.length > 0 && (
                <div className="flex gap-1">
                  {module.tags.map((tag: string) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="default"
                size="sm"
                onClick={() => {
                  setPreviewPhase('objectives');
                  setCurrentStepIndex(0);
                  setPreviewQuizAnswers({});
                }}
                data-testid="button-preview-module"
              >
                <Eye className="w-4 h-4 mr-2" />
                Ön İzleme
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader className="flex flex-col gap-3 sm:gap-4">
                <DialogTitle>Modül Ön İzlemesi - Öğrenci Görünümü</DialogTitle>
                
                {/* Progress Bar */}
                {previewPhase !== 'completed' && (
                  <div className="flex flex-col gap-3 sm:gap-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>İlerleme</span>
                      <span>
                        {previewPhase === 'objectives' && '1/4'}
                        {previewPhase === 'steps' && '2/4'}
                        {previewPhase === 'quiz' && '3/4'}
                        {previewPhase === 'scenarios' && '4/4'}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-primary h-full transition-all duration-300"
                        style={{
                          width: previewPhase === 'objectives' ? '25%' 
                            : previewPhase === 'steps' ? '50%'
                            : previewPhase === 'quiz' ? '75%'
                            : previewPhase === 'scenarios' ? '100%' : '0%'
                        }}
                      />
                    </div>
                  </div>
                )}
              </DialogHeader>

              {/* Objectives Phase */}
              {previewPhase === 'objectives' && (
                <div className="w-full space-y-2 sm:space-y-3">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Öğrenme Hedefleri</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {learningObjectives.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Hedef tanımlanmamış</p>
                      ) : (
                        <ul className="flex flex-col gap-3 sm:gap-4">
                          {learningObjectives.map((objective: string, idx: number) => (
                            <li key={idx} className="flex gap-2 sm:gap-3 text-sm">
                              <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                              <span>{objective}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                  <div className="flex gap-2 justify-between">
                    <Button 
                      variant="outline" 
                      onClick={() => setPreviewOpen(false)}
                      data-testid="button-exit-preview"
                    >
                      Çık
                    </Button>
                    <Button 
                      onClick={() => {
                        setCurrentStepIndex(0);
                        setPreviewPhase('steps');
                      }}
                      data-testid="button-next-phase-objectives"
                    >
                      Devam Et
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Steps Phase */}
              {previewPhase === 'steps' && (
                <div className="w-full space-y-2 sm:space-y-3">
                  {steps.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Adım tanımlanmamış</p>
                  ) : (
                    <>
                      <Card>
                        <CardHeader>
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1">
                              <CardTitle className="text-lg">Adım {currentStepIndex + 1}: {steps[currentStepIndex]?.title}</CardTitle>
                            </div>
                            <Badge variant="outline">{currentStepIndex + 1}/{steps.length}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 gap-2 sm:gap-3">
                          <div className="space-y-3">
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{steps[currentStepIndex]?.content}</p>
                            {steps[currentStepIndex]?.photos && steps[currentStepIndex].photos.length > 0 && (
                              <div className="w-full space-y-2 sm:space-y-3 gap-2">
                                {steps[currentStepIndex].photos.map((photo: string, pidx: number) => (
                                  <div key={pidx} className="overflow-hidden rounded-lg bg-muted aspect-video">
                                    <img src={photo} alt={`Step photo ${pidx}`} className="w-full h-full object-cover" />
                                  </div>
                                ))}
                              </div>
                            )}
                            {steps[currentStepIndex]?.media_suggestions && steps[currentStepIndex].media_suggestions.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2">Önerilen Medya:</p>
                                <div className="flex gap-1 flex-wrap">
                                  {steps[currentStepIndex].media_suggestions.map((media: string, idx: number) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                      {media}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                      <div className="flex gap-2 justify-between">
                        <Button
                          variant="outline"
                          onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
                          disabled={currentStepIndex === 0}
                          data-testid="button-prev-step"
                        >
                          <ChevronLeft className="w-4 h-4 mr-2" />
                          Önceki
                        </Button>
                        {currentStepIndex === steps.length - 1 ? (
                          <Button 
                            onClick={() => {
                              setCurrentStepIndex(0);
                              setPreviewPhase('quiz');
                              setPreviewQuizAnswers({});
                            }}
                            data-testid="button-next-phase-steps"
                          >
                            Quiz'e Geç
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => setCurrentStepIndex(Math.min(steps.length - 1, currentStepIndex + 1))}
                            data-testid="button-next-step"
                          >
                            Sonraki
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Quiz Phase */}
              {previewPhase === 'quiz' && (
                <div className="w-full space-y-2 sm:space-y-3">
                  {!module?.quiz || module.quiz.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Quiz sorusu tanımlanmamış</p>
                  ) : (
                    <>
                      <div className="w-full space-y-2 sm:space-y-3">
                        {module.quiz.map((q: typeof module.quiz[0], idx: number) => (
                          <div key={idx} className="bg-card rounded-md border-l-4 border-l-success shadow-sm">
                            <div className="p-4">
                              <p className="font-medium mb-3">{idx + 1}. {q.question_text || `Soru ${idx + 1}`}</p>
                              <div className="flex flex-col gap-3 sm:gap-4">
                                {q.options?.map((opt: string, optIdx: number) => (
                                  <button
                                    key={optIdx}
                                    onClick={() => setPreviewQuizAnswers({ ...previewQuizAnswers, [idx]: optIdx })}
                                    className={`w-full text-left p-3 rounded border-2 transition-colors ${
                                      previewQuizAnswers[idx] === optIdx
                                        ? optIdx === q.correct_option_index
                                          ? "border-success bg-success/10 dark:bg-success/5/20"
                                          : "border-destructive bg-destructive/10 dark:bg-destructive/10"
                                        : "border-muted hover:border-primary"
                                    }`}
                                    data-testid={`button-quiz-option-${idx}-${optIdx}`}
                                  >
                                    <span className="text-sm">{opt}</span>
                                    {previewQuizAnswers[idx] === optIdx && (
                                      <span className="ml-2">
                                        {optIdx === q.correct_option_index ? "✓" : "✗"}
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 justify-between pt-4">
                        <Button 
                          variant="outline"
                          onClick={() => setPreviewPhase('steps')}
                          data-testid="button-back-to-steps"
                        >
                          <ChevronLeft className="w-4 h-4 mr-2" />
                          Adımlara Dön
                        </Button>
                        <Button 
                          onClick={() => {
                            setCurrentStepIndex(0);
                            setPreviewPhase('scenarios');
                          }}
                          data-testid="button-next-phase-quiz"
                        >
                          Senaryolara Geç
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Scenarios Phase */}
              {previewPhase === 'scenarios' && (
                <div className="w-full space-y-2 sm:space-y-3">
                  {scenarioTasks.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Senaryo tanımlanmamış</p>
                  ) : (
                    <>
                      <div className="flex flex-col gap-3 sm:gap-4">
                        {scenarioTasks.map((scenario: typeof scenarioTasks[0], idx: number) => (
                          <Card key={idx} className="border-l-4 border-l-secondary">
                            <CardContent className="pt-4">
                              <div className="flex flex-col gap-3 sm:gap-4">
                                <p className="font-medium text-sm">{scenario.title || `Senaryo ${idx + 1}`}</p>
                                <p className="text-sm text-muted-foreground">{scenario.description}</p>
                                {scenario.tasks && (
                                  <ul className="text-sm space-y-1 ml-4 mt-2">
                                    {scenario.tasks.map((task: string, tidx: number) => (
                                      <li key={tidx} className="list-disc text-muted-foreground">
                                        {task}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      <div className="flex gap-2 justify-between pt-4">
                        <Button 
                          variant="outline"
                          onClick={() => setPreviewPhase('quiz')}
                          data-testid="button-back-to-quiz"
                        >
                          <ChevronLeft className="w-4 h-4 mr-2" />
                          Quiz'e Dön
                        </Button>
                        <Button 
                          onClick={() => setPreviewPhase('completed')}
                          data-testid="button-complete-module"
                        >
                          Tamamla
                          <CheckCircle className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Completed Phase */}
              {previewPhase === 'completed' && (
                <div className="grid grid-cols-1 gap-2 sm:gap-3 text-center py-8">
                  <div className="flex justify-center">
                    <div className="relative">
                      <Award className="w-24 h-24 text-warning" />
                      <CheckCircle className="w-8 h-8 text-success absolute bottom-0 right-0" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Tebrikler!</h3>
                    <p className="text-muted-foreground mb-1">Modülü başarıyla tamamladınız</p>
                    <Badge className="mt-3 bg-warning/20 text-warning dark:bg-warning/5 dark:text-warning">
                      <Award className="w-3 h-3 mr-1" />
                      Rozet Kazandı: {module.title}
                    </Badge>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button 
                      onClick={() => {
                        if (moduleId) {
                          apiRequest("POST", `/api/training/modules/${moduleId}/complete`, { quizScore: quizScore?.correct || 0, quizPercentage: quizScore?.percentage || 100 }).catch(console.error);
                          setTimeout(() => setPreviewOpen(false), 300);
                        }
                      }}
                      data-testid="button-complete-and-close"
                    >
                      Tamamla ve Kapat
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setPreviewPhase('objectives');
                        setCurrentStepIndex(0);
                        setPreviewQuizAnswers({});
                      }}
                      data-testid="button-restart-module"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Baştan Başla
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-max min-w-full">
            <TabsTrigger value="overview">
              <BookOpen className="w-4 h-4 mr-2" />
              Genel
            </TabsTrigger>
            <TabsTrigger value="objectives">
              <Lightbulb className="w-4 h-4 mr-2" />
              Hedefler ({learningObjectives.length})
            </TabsTrigger>
            <TabsTrigger value="steps">
              <CheckCircle className="w-4 h-4 mr-2" />
              Adımlar ({steps.length})
            </TabsTrigger>
            <TabsTrigger value="quiz">
              <BookOpen className="w-4 h-4 mr-2" />
              Quiz ({module?.quiz?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="scenarios">
              <Clock className="w-4 h-4 mr-2" />
              Senaryolar ({scenarioTasks.length})
            </TabsTrigger>
            <TabsTrigger value="checklist">
              <CheckCircle className="w-4 h-4 mr-2" />
              Kontrol
            </TabsTrigger>
            <TabsTrigger value="sales-coach">
              <MessageCircle className="w-4 h-4 mr-2" />
              Satış Koçu
            </TabsTrigger>
            <TabsTrigger value="presentation">
              <Presentation className="w-4 h-4 mr-2" />
              Sunum
            </TabsTrigger>
            <TabsTrigger value="marketing">
              <TrendingUp className="w-4 h-4 mr-2" />
              Pazarlama
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview */}
        <TabsContent value="overview" className="grid grid-cols-1 gap-2 sm:gap-3">
          <Card>
            <CardHeader>
              <CardTitle>Modül Bilgileri & Atama</CardTitle>
              <CardDescription>Temel modül özellikleri ve yapısı</CardDescription>
            </CardHeader>
            <CardContent className="w-full space-y-2 sm:space-y-3">
              <div className="grid md:grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Başlık</p>
                  <p className="font-medium">{module.title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Seviye</p>
                  <Badge variant="outline">
                    {module.level === "beginner"
                      ? "Başlangıç"
                      : module.level === "intermediate"
                      ? "Orta"
                      : "İleri"}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Açıklama</p>
                <p className="text-sm">{module.description}</p>
              </div>
              <div className="grid md:grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Tahmini Süre</p>
                  <p className="font-medium">{module.estimatedDuration} dakika</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Durum</p>
                  <Badge variant={module.isPublished ? "default" : "secondary"}>
                    {module.isPublished ? "Yayında" : "Taslak"}
                  </Badge>
                </div>
              </div>
              {module.code && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Modül Kodu</p>
                  <p className="font-mono text-sm bg-muted p-2 rounded">{module.code}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Role Assignment Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rol Ataması</CardTitle>
              <CardDescription>Bu modülü hangi rollere atanacak?</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 sm:gap-3">
              {["Stajyer", "Bar Buddy", "Barista", "Supervisor Buddy", "Supervisor"].map((role) => (
                <label key={role} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover-elevate">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRoles([...selectedRoles, role]);
                      } else {
                        setSelectedRoles(selectedRoles.filter(r => r !== role));
                      }
                    }}
                    data-testid={`checkbox-role-${role}`}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{role}</span>
                </label>
              ))}
            </CardContent>
            <CardContent className="pt-0">
              <Button 
                size="sm" 
                className="w-full"
                onClick={async () => {
                  try {
                    await apiRequest("PUT", `/api/training/modules/${moduleId}`, {
                      title: module?.title,
                      description: module?.description,
                      level: module?.level,
                      estimatedDuration: module?.estimatedDuration,
                      requiredForRole: selectedRoles,
                    });
                    toast({ title: "Atamalar kaydedildi" });
                    queryClient.invalidateQueries({ queryKey: ['/api/training/modules', moduleId] });
                  } catch (err) {
                    toast({ title: "Hata", description: (err instanceof Error ? err.message : "Bilinmeyen hata"), variant: "destructive" });
                  }
                }}
                data-testid="button-save-role-assignment"
              >
                Rol Atamasını Kaydet
              </Button>
            </CardContent>
          </Card>

          {/* Gallery Section */}
          {module.galleryImages && module.galleryImages.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  <div>
                    <CardTitle>Modül Galerisi</CardTitle>
                    <CardDescription>{module.galleryImages.length} fotoğraf</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="w-full space-y-2 sm:space-y-3 lg:grid-cols-3 gap-2 sm:gap-3">
                  {module.galleryImages.map((img: typeof module.galleryImages[0], idx: number) => (
                    <div key={idx} className="overflow-hidden rounded-lg bg-muted aspect-[6/4]">
                      <img
                        src={img.url}
                        alt={img.alt || `Fotoğraf ${idx + 1}`}
                        className="w-full h-full object-cover"
                        data-testid={`image-gallery-${idx}`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Learning Objectives */}
        <TabsContent value="objectives" className="grid grid-cols-1 gap-2 sm:gap-3">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center gap-2">
                <div>
                  <CardTitle className="text-lg">Öğrenme Hedefleri</CardTitle>
                  <CardDescription>Modülün öğrenme çıktıları</CardDescription>
                </div>
                {isEditor && (
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => generateObjectivesMutation.mutate()}
                      disabled={generateObjectivesMutation.isPending}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      AI Oluştur
                    </Button>
                    <Dialog open={objectivesOpen} onOpenChange={setObjectivesOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Edit2 className="w-4 h-4 mr-2" />
                          Düzenle
                        </Button>
                      </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Öğrenme Hedeflerini Düzenle</DialogTitle>
                    </DialogHeader>
                    <Form {...objectivesForm}>
                      <form
                        onSubmit={objectivesForm.handleSubmit((data) =>
                          updateObjectivesMutation.mutate(data)
                        )}
                        className="grid grid-cols-1 gap-2 sm:gap-3"
                      >
                        <div className="flex flex-col gap-3 sm:gap-4">
                          {objectivesForm.watch("objectives").map((_, index) => (
                            <FormField
                              key={index}
                              control={objectivesForm.control}
                              name={`objectives.${index}`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Hedef {index + 1}</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder="Hedefi açıklayın..." {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                        <Button type="submit" disabled={updateObjectivesMutation.isPending} className="w-full">
                          Kaydet
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {learningObjectives.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">Hedef tanımlanmamış</p>
              ) : (
                <ul className="flex flex-col gap-3 sm:gap-4">
                  {learningObjectives.map((objective: string, idx: number) => (
                    <li key={idx} className="flex gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                      <span>{objective}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Steps */}
        <TabsContent value="steps" className="w-full space-y-2 sm:space-y-3">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center gap-2">
                <div>
                  <CardTitle>Öğrenme Adımları</CardTitle>
                  <CardDescription>Modülün yapılandırılmış öğrenme içeriği</CardDescription>
                </div>
                {isEditor && (
                  <Dialog open={stepsOpen} onOpenChange={setStepsOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Edit2 className="w-4 h-4 mr-2" />
                      Adım Ekle
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Adımları Düzenle</DialogTitle>
                    </DialogHeader>
                    <Form {...stepsForm}>
                      <form
                        onSubmit={stepsForm.handleSubmit((data) =>
                          updateStepsMutation.mutate(data)
                        )}
                        className="grid grid-cols-1 gap-2 sm:gap-3 max-h-96 overflow-y-auto"
                      >
                        {stepsForm.watch("steps").map((step, index) => (
                          <div key={index} className="border p-3 rounded grid grid-cols-1 gap-2 sm:gap-3 bg-muted/30">
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1">
                                <FormField
                                  control={stepsForm.control}
                                  name={`steps.${index}.title`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Adım {index + 1} - Başlık</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Adım başlığı..." {...field} className="text-sm" />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  const current = stepsForm.watch("steps");
                                  stepsForm.setValue("steps", current.filter((_, i: number) => i !== index));
                                }}
                                data-testid={`button-delete-step-${index}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                            <FormField
                              control={stepsForm.control}
                              name={`steps.${index}.content`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>İçerik</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder="Adım içeriği..." {...field} className="text-sm h-20" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <div className="border-t pt-2">
                              <FormLabel className="text-xs mb-2 block">Adım Fotoğrafı</FormLabel>
                              <div className="flex items-center gap-2">
                                <Input 
                                  type="file" 
                                  accept="image/*"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      try {
                                        const photoUrl = await compressImage(file);
                                        if (!step.photos) {
                                          stepsForm.setValue(`steps.${index}.photos`, []);
                                        }
                                        const current = stepsForm.watch(`steps.${index}.photos`) || [];
                                        stepsForm.setValue(`steps.${index}.photos`, [...current, photoUrl]);
                                      } catch {
                                        const reader = new FileReader();
                                        reader.onload = (event) => {
                                          const photoUrl = event.target?.result as string;
                                          const current = stepsForm.watch(`steps.${index}.photos`) || [];
                                          stepsForm.setValue(`steps.${index}.photos`, [...current, photoUrl]);
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    }
                                  }}
                                  className="text-xs"
                                  data-testid={`input-step-photo-${index}`}
                                />
                                <Image className="w-4 h-4 text-muted-foreground" />
                              </div>
                              {step.photos && step.photos.length > 0 && (
                                <div className="flex gap-2 mt-2 flex-wrap">
                                  {step.photos.map((photo: string, pidx: number) => (
                                    <div key={pidx} className="relative w-16 h-16 rounded overflow-hidden bg-muted">
                                      <img src={photo} alt={`Photo ${pidx}`} className="w-full h-full object-cover" />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const current = stepsForm.watch(`steps.${index}.photos`) || [];
                                          stepsForm.setValue(`steps.${index}.photos`, current.filter((_, i: number) => i !== pidx));
                                        }}
                                        className="absolute -top-1 -right-1 bg-destructive/100 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                                        data-testid={`button-remove-photo-${index}-${pidx}`}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const current = stepsForm.watch("steps");
                            stepsForm.setValue("steps", [...current, { title: "", content: "" }]);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Yeni Adım
                        </Button>
                        <Button type="submit" disabled={updateStepsMutation.isPending} className="w-full">
                          Kaydet
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                    </Dialog>
                  )}
              </div>
            </CardHeader>
            <CardContent>
              {steps.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">Adım tanımlanmamış</p>
              ) : (
                <div className="w-full space-y-2 sm:space-y-3">
                  {steps.map((step: typeof steps[0], idx: number) => (
                    <Card key={idx} className="border-l-4 border-l-primary">
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                            {step.step_number || idx + 1}
                          </span>
                          <CardTitle className="text-base">{step.title}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 gap-2 sm:gap-3 text-sm">
                        <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{step.content}</p>
                        {step.photos && step.photos.length > 0 && (
                          <div className="grid grid-cols-2 gap-2">
                            {step.photos.map((photo: string, pidx: number) => (
                              <div key={pidx} className="overflow-hidden rounded-md bg-muted aspect-video">
                                <img src={photo} alt={`Step photo ${pidx}`} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        )}
                        {step.media_suggestions && step.media_suggestions.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Önerilen Medya:</p>
                            <div className="flex gap-1 flex-wrap">
                              {step.media_suggestions.map((media: string, midx: number) => (
                                <Badge key={midx} variant="secondary" className="text-xs">
                                  {media}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quiz */}
        <TabsContent value="quiz" className="w-full space-y-2 sm:space-y-3">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center gap-2">
                <div>
                  <CardTitle>Quiz Soruları</CardTitle>
                  <CardDescription>Modülün bilgi ölçümü soruları</CardDescription>
                </div>
                {isEditor && (
                  <Dialog open={quizOpen} onOpenChange={setQuizOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Edit2 className="w-4 h-4 mr-2" />
                        Soru Ekle
                      </Button>
                    </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Quiz Sorularını Düzenle</DialogTitle>
                    </DialogHeader>
                    <Form {...quizForm}>
                      <form
                        onSubmit={quizForm.handleSubmit((data) => updateQuizMutation.mutate(data))}
                        className="grid grid-cols-1 gap-2 sm:gap-3 max-h-96 overflow-y-auto"
                      >
                        {quizForm.watch("quiz").map((_, index) => (
                          <div key={index} className="border p-3 rounded grid grid-cols-1 gap-2 sm:gap-3 bg-muted/30">
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1">
                                <FormField
                                  control={quizForm.control}
                                  name={`quiz.${index}.question_text`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Soru {index + 1}</FormLabel>
                                      <FormControl>
                                        <Textarea placeholder="Soruyu yazın..." {...field} className="text-sm" />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  const current = quizForm.watch("quiz");
                                  quizForm.setValue("quiz", current.filter((_, i: number) => i !== index));
                                }}
                                data-testid={`button-delete-quiz-${index}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>

                            {/* Options */}
                            <div className="grid grid-cols-1 gap-2 pl-2 border-l-2 border-muted-foreground/30">
                              <FormLabel className="text-xs">Cevap Seçenekleri</FormLabel>
                              {quizForm.watch(`quiz.${index}.options`)?.map((_, optIndex) => (
                                <div key={optIndex} className="flex gap-2 items-center">
                                  <FormField
                                    control={quizForm.control}
                                    name={`quiz.${index}.options.${optIndex}`}
                                    render={({ field }) => (
                                      <FormControl>
                                        <Input 
                                          placeholder={`Seçenek ${optIndex + 1}`}
                                          {...field}
                                          className="text-sm"
                                        />
                                      </FormControl>
                                    )}
                                  />
                                  <FormField
                                    control={quizForm.control}
                                    name={`quiz.${index}.correct_option_index`}
                                    render={({ field }) => (
                                      <FormControl>
                                        <Button
                                          type="button"
                                          variant={field.value === optIndex ? "default" : "outline"}
                                          size="sm"
                                          onClick={() => field.onChange(optIndex)}
                                          className="w-12"
                                          data-testid={`button-set-correct-${index}-${optIndex}`}
                                        >
                                          ✓
                                        </Button>
                                      </FormControl>
                                    )}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const current = quizForm.watch(`quiz.${index}.options`) || [];
                                      if (current.length > 1) {
                                        quizForm.setValue(`quiz.${index}.options`, current.filter((_, i: number) => i !== optIndex));
                                      }
                                    }}
                                    data-testid={`button-delete-option-${index}-${optIndex}`}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const current = quizForm.watch(`quiz.${index}.options`) || [];
                                  quizForm.setValue(`quiz.${index}.options`, [...current, ""]);
                                }}
                                className="w-full text-xs"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Seçenek Ekle
                              </Button>
                            </div>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const current = quizForm.watch("quiz");
                            quizForm.setValue("quiz", [...current, { question_id: `q${current.length}`, question_type: "mcq", question_text: "", options: [""], correct_option_index: 0 }]);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Yeni Soru
                        </Button>
                        <Button type="submit" disabled={updateQuizMutation.isPending} className="w-full">
                          Kaydet
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!module?.quiz || module.quiz.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">Quiz sorusu tanımlanmamış</p>
              ) : (
                <div className="flex flex-col gap-3 sm:gap-4">
                  {module.quiz.map((q: typeof module.quiz[0], idx: number) => (
                    <Card key={idx} className="border-l-4 border-l-success">
                      <CardContent className="pt-4">
                        <p className="font-medium text-sm">{q.question_text || `Soru ${idx + 1}`}</p>
                        {q.options && (
                          <ul className="text-sm space-y-1 mt-2 ml-4">
                            {q.options.map((opt: string, oidx: number) => (
                              <li key={oidx} className={`list-disc ${oidx === q.correct_option_index ? "text-success font-medium" : "text-muted-foreground"}`}>
                                {opt}
                              </li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scenarios */}
        <TabsContent value="scenarios" className="w-full space-y-2 sm:space-y-3">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center gap-2">
                <div>
                  <CardTitle>Senaryo Görevleri</CardTitle>
                  <CardDescription>Gerçek dünya uygulaması için senaryo tabanlı görevler</CardDescription>
                </div>
                {isEditor && (
                  <Dialog open={scenariosOpen} onOpenChange={setScenariosOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Edit2 className="w-4 h-4 mr-2" />
                        Senaryo Ekle
                      </Button>
                    </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Senaryoları Düzenle</DialogTitle>
                    </DialogHeader>
                    <Form {...scenariosForm}>
                      <form
                        onSubmit={scenariosForm.handleSubmit((data) => updateScenariosMutation.mutate(data))}
                        className="grid grid-cols-1 gap-2 sm:gap-3 max-h-96 overflow-y-auto"
                      >
                        {scenariosForm.watch("scenarioTasks").map((_, index) => (
                          <div key={index} className="border p-3 rounded grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                            <FormField
                              control={scenariosForm.control}
                              name={`scenarioTasks.${index}.title`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Senaryo Başlığı</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Senaryo adı..." {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={scenariosForm.control}
                              name={`scenarioTasks.${index}.description`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Açıklama</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder="Senaryo açıklaması..." {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const current = scenariosForm.watch("scenarioTasks");
                            scenariosForm.setValue("scenarioTasks", [...current, { scenario_id: `s${current.length}`, title: "", description: "" }]);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Yeni Senaryo
                        </Button>
                        <Button type="submit" disabled={updateScenariosMutation.isPending} className="w-full">
                          Kaydet
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {scenarioTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">Senaryo görev tanımlanmamış</p>
              ) : (
                <div className="flex flex-col gap-3 sm:gap-4">
                  {scenarioTasks.map((scenario: typeof scenarioTasks[0], idx: number) => (
                    <Card key={idx} className="border-l-4 border-l-secondary">
                      <CardContent className="pt-4">
                        <div className="flex flex-col gap-3 sm:gap-4">
                          <p className="font-medium text-sm">{scenario.title || `Senaryo ${idx + 1}`}</p>
                          <p className="text-sm text-muted-foreground">{scenario.description}</p>
                          {scenario.tasks && (
                            <ul className="text-sm space-y-1 ml-4">
                              {scenario.tasks.map((task: string, tidx: number) => (
                                <li key={tidx} className="list-disc text-muted-foreground">
                                  {task}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Supervisor Checklist */}
        <TabsContent value="checklist" className="w-full space-y-2 sm:space-y-3">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center gap-2">
                <div>
                  <CardTitle>Denetçi Kontrol Listesi</CardTitle>
                  <CardDescription>Modül tamamlanması kontrol noktaları</CardDescription>
                </div>
                {isEditor && (
                  <Dialog open={checklistOpen} onOpenChange={setChecklistOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Edit2 className="w-4 h-4 mr-2" />
                        Madde Ekle
                      </Button>
                    </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Kontrol Listesini Düzenle</DialogTitle>
                    </DialogHeader>
                    <Form {...checklistForm}>
                      <form
                        onSubmit={checklistForm.handleSubmit((data) => updateChecklistMutation.mutate(data))}
                        className="grid grid-cols-1 gap-2 sm:gap-3 max-h-96 overflow-y-auto"
                      >
                        {checklistForm.watch("supervisorChecklist").map((_, index) => (
                          <div key={index} className="border p-3 rounded grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                            <FormField
                              control={checklistForm.control}
                              name={`supervisorChecklist.${index}.title`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Başlık</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Kontrol noktası..." {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={checklistForm.control}
                              name={`supervisorChecklist.${index}.description`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Açıklama</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder="Kontrol açıklaması..." {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const current = checklistForm.watch("supervisorChecklist");
                            checklistForm.setValue("supervisorChecklist", [...current, { item_id: `c${current.length}`, title: "", description: "" }]);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Yeni Madde
                        </Button>
                        <Button type="submit" disabled={updateChecklistMutation.isPending} className="w-full">
                          Kaydet
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!module?.supervisorChecklist || module.supervisorChecklist.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">Kontrol listesi maddesi tanımlanmamış</p>
              ) : (
                <div className="flex flex-col gap-3 sm:gap-4">
                  {module.supervisorChecklist.map((item: typeof module.supervisorChecklist[0], idx: number) => (
                    <Card key={idx} className="border-l-4 border-l-warning">
                      <CardContent className="pt-4">
                        <div className="w-full space-y-1 md:space-y-1">
                          <p className="font-medium text-sm">{item.title}</p>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Coach Tab - AI Satış Koçu */}
        <TabsContent value="sales-coach" className="w-full space-y-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  AI Satış Koçu
                </CardTitle>
                <CardDescription>
                  Ürün tanıtım cümleleri ve müşteri sorularına yanıtlar
                </CardDescription>
              </div>
              {isEditor && (
                <Button 
                  onClick={async () => {
                    setIsGeneratingSales(true);
                    try {
                      const res = await fetch(`/api/training/modules/${moduleId}/generate-sales-tips`, {
                        method: 'POST',
                        credentials: 'include'
                      });
                      if (res.ok) {
                        queryClient.invalidateQueries({ queryKey: ['/api/training/modules', moduleId] });
                        toast({ title: "Başarılı", description: "Satış ipuçları oluşturuldu" });
                      }
                    } catch (error) {
                      toast({ title: "Hata", description: "Oluşturulamadı", variant: "destructive" });
                    } finally {
                      setIsGeneratingSales(false);
                    }
                  }}
                  disabled={isGeneratingSales}
                  size="sm"
                >
                  {isGeneratingSales ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  AI ile Oluştur
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sales Tips */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  Satış Cümleleri
                </h4>
                {(module?.salesTips as Array<{phrase: string; context: string; emotion?: string}> || []).length === 0 ? (
                  <p className="text-muted-foreground text-sm italic">
                    Henüz satış ipucu eklenmemiş. AI ile oluşturabilirsiniz.
                  </p>
                ) : (
                  <div className="grid gap-3">
                    {(module?.salesTips as Array<{phrase: string; context: string; emotion?: string}> || []).map((tip, idx) => (
                      <Card key={idx} className="border-l-4 border-l-green-500">
                        <CardContent className="pt-4">
                          <p className="font-medium text-sm mb-1">"{tip.phrase}"</p>
                          <p className="text-xs text-muted-foreground">{tip.context}</p>
                          {tip.emotion && (
                            <Badge variant="outline" className="mt-2">{tip.emotion}</Badge>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Customer Q&A */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Müşteri Soru-Cevap
                </h4>
                {(module?.marketingContent as any)?.customerQA?.length > 0 ? (
                  <div className="space-y-2">
                    {(module?.marketingContent as any)?.customerQA?.map((qa: {question: string; answer: string}, idx: number) => (
                      <Card key={idx}>
                        <CardContent className="pt-4 space-y-2">
                          <p className="text-sm font-medium flex items-center gap-2">
                            <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-xs">S</span>
                            {qa.question}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded text-xs shrink-0">C</span>
                            {qa.answer}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm italic">
                    Müşteri soruları ve cevapları AI ile oluşturulacak.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Presentation Guide Tab - Sunum Rehberi */}
        <TabsContent value="presentation" className="w-full space-y-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Presentation className="w-5 h-5 text-primary" />
                  Profesyonel Sunum Rehberi
                </CardTitle>
                <CardDescription>
                  Ürün servisi, saklama ve sunum talimatları
                </CardDescription>
              </div>
              {isEditor && (
                <Button 
                  onClick={async () => {
                    setIsGeneratingPresentation(true);
                    try {
                      const res = await fetch(`/api/training/modules/${moduleId}/generate-presentation`, {
                        method: 'POST',
                        credentials: 'include'
                      });
                      if (res.ok) {
                        queryClient.invalidateQueries({ queryKey: ['/api/training/modules', moduleId] });
                        toast({ title: "Başarılı", description: "Sunum rehberi oluşturuldu" });
                      }
                    } catch (error) {
                      toast({ title: "Hata", description: "Oluşturulamadı", variant: "destructive" });
                    } finally {
                      setIsGeneratingPresentation(false);
                    }
                  }}
                  disabled={isGeneratingPresentation}
                  size="sm"
                >
                  {isGeneratingPresentation ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  AI ile Oluştur
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {!(module?.presentationGuide as any) ? (
                <p className="text-muted-foreground text-sm italic">
                  Sunum rehberi henüz oluşturulmamış. AI ile oluşturabilirsiniz.
                </p>
              ) : (
                <div className="grid gap-4">
                  {/* Serving Instructions */}
                  {(module?.presentationGuide as any)?.servingInstructions && (
                    <Card className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-blue-500" />
                          <h5 className="font-semibold text-sm">Sunum Talimatları</h5>
                        </div>
                        <p className="text-sm">{(module?.presentationGuide as any)?.servingInstructions}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Thawing Instructions */}
                  {(module?.presentationGuide as any)?.thawingInstructions && (
                    <Card className="border-l-4 border-l-cyan-500">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="w-4 h-4 text-cyan-500" />
                          <h5 className="font-semibold text-sm">Çözündürme Talimatları</h5>
                        </div>
                        <p className="text-sm">{(module?.presentationGuide as any)?.thawingInstructions}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Heating Instructions */}
                  {(module?.presentationGuide as any)?.heatingInstructions && (
                    <Card className="border-l-4 border-l-orange-500">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Thermometer className="w-4 h-4 text-orange-500" />
                          <h5 className="font-semibold text-sm">Isıtma Talimatları</h5>
                        </div>
                        <p className="text-sm">{(module?.presentationGuide as any)?.heatingInstructions}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Plating Tips */}
                  {(module?.presentationGuide as any)?.platingTips && (
                    <Card className="border-l-4 border-l-purple-500">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Presentation className="w-4 h-4 text-purple-500" />
                          <h5 className="font-semibold text-sm">Tabak Düzenleme</h5>
                        </div>
                        <p className="text-sm">{(module?.presentationGuide as any)?.platingTips}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Storage Notes */}
                  {(module?.presentationGuide as any)?.storageNotes && (
                    <Card className="border-l-4 border-l-gray-500">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="w-4 h-4 text-gray-500" />
                          <h5 className="font-semibold text-sm">Saklama Notları</h5>
                        </div>
                        <p className="text-sm">{(module?.presentationGuide as any)?.storageNotes}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Allergen Info */}
                  {(module?.presentationGuide as any)?.allergenInfo && (
                    <Card className="border-l-4 border-l-red-500">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          <h5 className="font-semibold text-sm">Alerjen Bilgisi</h5>
                        </div>
                        <p className="text-sm">{(module?.presentationGuide as any)?.allergenInfo}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Marketing Tab - Pazarlama */}
        <TabsContent value="marketing" className="w-full space-y-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Pazarlama & Satış Geliştirme
                </CardTitle>
                <CardDescription>
                  Sosyal medya, upselling ve ürün hikayesi
                </CardDescription>
              </div>
              {isEditor && (
                <Button 
                  onClick={async () => {
                    setIsGeneratingMarketing(true);
                    try {
                      const res = await fetch(`/api/training/modules/${moduleId}/generate-marketing`, {
                        method: 'POST',
                        credentials: 'include'
                      });
                      if (res.ok) {
                        queryClient.invalidateQueries({ queryKey: ['/api/training/modules', moduleId] });
                        toast({ title: "Başarılı", description: "Pazarlama içerikleri oluşturuldu" });
                      }
                    } catch (error) {
                      toast({ title: "Hata", description: "Oluşturulamadı", variant: "destructive" });
                    } finally {
                      setIsGeneratingMarketing(false);
                    }
                  }}
                  disabled={isGeneratingMarketing}
                  size="sm"
                >
                  {isGeneratingMarketing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  AI ile Oluştur
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {!(module?.marketingContent as any) ? (
                <p className="text-muted-foreground text-sm italic">
                  Pazarlama içerikleri henüz oluşturulmamış. AI ile oluşturabilirsiniz.
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Product Story */}
                  {(module?.marketingContent as any)?.productStory && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Ürün Hikayesi</h4>
                      <Card className="bg-muted/50">
                        <CardContent className="pt-4">
                          <p className="text-sm italic">"{(module?.marketingContent as any)?.productStory}"</p>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Social Media Captions */}
                  {(module?.marketingContent as any)?.socialMediaCaptions?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Sosyal Medya Açıklamaları</h4>
                      <div className="grid gap-2">
                        {(module?.marketingContent as any)?.socialMediaCaptions?.map((caption: string, idx: number) => (
                          <Card key={idx} className="border-l-4 border-l-pink-500">
                            <CardContent className="pt-3 pb-3">
                              <p className="text-sm">{caption}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upselling Phrases */}
                  {(module?.marketingContent as any)?.upsellingPhrases?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Upselling Önerileri
                      </h4>
                      <div className="grid gap-2">
                        {(module?.marketingContent as any)?.upsellingPhrases?.map((phrase: string, idx: number) => (
                          <Card key={idx} className="border-l-4 border-l-green-500">
                            <CardContent className="pt-3 pb-3">
                              <p className="text-sm">"{phrase}"</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Target Audience */}
                  {(module?.marketingContent as any)?.targetAudience && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Hedef Kitle</h4>
                      <Badge variant="outline" className="text-sm">
                        {(module?.marketingContent as any)?.targetAudience}
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Roleplay Scenarios */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  AI Rol Yapma Senaryoları
                </CardTitle>
                <CardDescription>
                  Müşteri ile satış diyaloğu simülasyonu
                </CardDescription>
              </div>
              {isEditor && (
                <Button 
                  onClick={async () => {
                    setIsGeneratingRoleplay(true);
                    try {
                      const res = await fetch(`/api/training/modules/${moduleId}/generate-roleplay`, {
                        method: 'POST',
                        credentials: 'include'
                      });
                      if (res.ok) {
                        queryClient.invalidateQueries({ queryKey: ['/api/training/modules', moduleId] });
                        toast({ title: "Başarılı", description: "Rol yapma senaryoları oluşturuldu" });
                      }
                    } catch (error) {
                      toast({ title: "Hata", description: "Oluşturulamadı", variant: "destructive" });
                    } finally {
                      setIsGeneratingRoleplay(false);
                    }
                  }}
                  disabled={isGeneratingRoleplay}
                  size="sm"
                >
                  {isGeneratingRoleplay ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Senaryolar Oluştur
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {(module?.aiRoleplayScenarios as Array<{scenarioId: string; title: string; customerType: string; initialMessage: string; expectedResponses: string[]; tips: string[]}> || []).length === 0 ? (
                <p className="text-muted-foreground text-sm italic">
                  Henüz senaryo oluşturulmamış. AI ile oluşturabilirsiniz.
                </p>
              ) : (
                <div className="grid gap-3">
                  {(module?.aiRoleplayScenarios as Array<{scenarioId: string; title: string; customerType: string; initialMessage: string; expectedResponses: string[]; tips: string[]}> || []).map((scenario, idx) => (
                    <Card key={idx} className="border-l-4 border-l-indigo-500 hover-elevate cursor-pointer"
                      onClick={() => {
                        setActiveRoleplayScenario(activeRoleplayScenario === idx ? null : idx);
                        setRoleplayMessages([{ role: 'customer', message: scenario.initialMessage }]);
                        setRoleplayInput("");
                      }}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-semibold text-sm">{scenario.title}</h5>
                          <Badge variant="secondary">{scenario.customerType}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Müşteri: "{scenario.initialMessage}"
                        </p>
                        
                        {activeRoleplayScenario === idx && (
                          <div className="mt-4 space-y-3 border-t pt-4">
                            {/* Chat messages */}
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {roleplayMessages.map((msg, msgIdx) => (
                                <div key={msgIdx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-[80%] p-2 rounded-lg text-sm ${
                                    msg.role === 'user' 
                                      ? 'bg-primary text-primary-foreground' 
                                      : 'bg-muted'
                                  }`}>
                                    {msg.message}
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            {/* Input */}
                            <div className="flex gap-2">
                              <Input 
                                value={roleplayInput}
                                onChange={(e) => setRoleplayInput(e.target.value)}
                                placeholder="Cevabınızı yazın..."
                                className="flex-1"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && roleplayInput.trim()) {
                                    setRoleplayMessages([...roleplayMessages, { role: 'user', message: roleplayInput }]);
                                    setRoleplayInput("");
                                  }
                                }}
                              />
                              <Button 
                                size="sm"
                                onClick={() => {
                                  if (roleplayInput.trim()) {
                                    setRoleplayMessages([...roleplayMessages, { role: 'user', message: roleplayInput }]);
                                    setRoleplayInput("");
                                  }
                                }}
                              >
                                Gönder
                              </Button>
                            </div>
                            
                            {/* Tips */}
                            {scenario.tips?.length > 0 && (
                              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                                <p className="text-xs font-semibold mb-1">İpuçları:</p>
                                <ul className="text-xs text-muted-foreground space-y-1">
                                  {scenario.tips.map((tip, tipIdx) => (
                                    <li key={tipIdx}>• {tip}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Back Button */}
      <div>
        <Button onClick={() => setLocation("/akademi-hq")} variant="outline" className="w-full">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Academy HQ'ya Dön
        </Button>
      </div>
    </div>
  );
}
