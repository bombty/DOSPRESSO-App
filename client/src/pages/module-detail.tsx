import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
import { BookOpen, CheckCircle, Clock, Lightbulb, ArrowLeft, Edit2, Save, Sparkles, Plus, Trash2, Image, X, Eye, ChevronRight, ChevronLeft, Award, RotateCcw } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TrainingModule } from "@shared/schema";

const objectivesEditSchema = z.object({
  objectives: z.array(z.string()).default([]),
});

const stepsEditSchema = z.object({
  steps: z.array(z.object({
    step_number: z.number().optional(),
    title: z.string(),
    content: z.string(),
    media_suggestions: z.array(z.string()).optional(),
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
  
  // Determine if user is HQ/admin who can edit (only admin, hq, hq_support can edit)
  const isEditor = user?.role === 'admin' || user?.role === 'hq' || user?.role === 'hq_support';
  
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

  const { data: module, isLoading } = useQuery({
    queryKey: [`/api/training/modules/${moduleId}`],
    queryFn: async () => {
      if (!moduleId) return null;
      const res = await fetch(`/api/training/modules`, { credentials: "include" });
      if (!res.ok) return null;
      const modules = await res.json();
      return modules.find((m: TrainingModule) => m.id === moduleId) || null;
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
      queryClient.invalidateQueries({ queryKey: [`/api/training/modules/${moduleId}`] });
    },
    onError: (error: any) => {
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
    onError: (error: any) => {
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
      queryClient.invalidateQueries({ queryKey: [`/api/training/modules/${moduleId}`] });
    },
    onError: (error: any) => {
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
      queryClient.invalidateQueries({ queryKey: [`/api/training/modules/${moduleId}`] });
    },
    onError: (error: any) => {
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
      queryClient.invalidateQueries({ queryKey: [`/api/training/modules/${moduleId}`] });
    },
    onError: (error: any) => {
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
      queryClient.invalidateQueries({ queryKey: [`/api/training/modules/${moduleId}`] });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  // Sync form values when module loads
  useEffect(() => {
    if (module) {
      objectivesForm.reset({ objectives: module.learningObjectives || [] });
      stepsForm.reset({ steps: module.steps || [] });
      quizForm.reset({ quiz: module.quiz || [] });
      scenariosForm.reset({ scenarioTasks: module.scenarioTasks || [] });
      checklistForm.reset({ supervisorChecklist: module.supervisorChecklist || [] });
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
      <div className="space-y-6 p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
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
        <Tabs value={previewPhase} onValueChange={(v: any) => setPreviewPhase(v)} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="objectives">Hedefler</TabsTrigger>
            <TabsTrigger value="steps" disabled={previewPhase === 'objectives'}>İçerik</TabsTrigger>
            <TabsTrigger value="quiz" disabled={previewPhase !== 'quiz' && previewPhase !== 'completed'}>Sınav</TabsTrigger>
            <TabsTrigger value="completed" disabled={previewPhase !== 'completed'}>✓ Tamamlandı</TabsTrigger>
          </TabsList>

          {/* Objectives Tab */}
          <TabsContent value="objectives" className="grid grid-cols-1 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Öğrenme Hedefleri</CardTitle>
                <CardDescription>Bu modülü tamamladığında neler öğreneceksin</CardDescription>
              </CardHeader>
              <CardContent>
                {learningObjectives.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Hedef tanımlanmamış</p>
                ) : (
                  <ul className="grid grid-cols-1 gap-3">
                    {learningObjectives.map((objective: string, idx: number) => (
                      <li key={idx} className="flex gap-3 text-sm">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
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
          <TabsContent value="steps" className="grid grid-cols-1 gap-4">
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
          <TabsContent value="quiz" className="grid grid-cols-1 gap-4">
            {module.quiz && module.quiz.length > 0 ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Modül Sınavı</CardTitle>
                    <CardDescription>Öğrendiklerini pekiştir</CardDescription>
                  </CardHeader>
                </Card>
                <Button 
                  onClick={async () => {
                    setIsMarkingComplete(true);
                    try {
                      await fetch(`/api/training/modules/${moduleId}/complete`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' }
                      });
                      toast({ title: "Modül Tamamlandı!", description: "Başarıyla tamamlandı" });
                      setPreviewPhase('completed');
                      queryClient.invalidateQueries({ queryKey: ["/api/training/user-modules-stats"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/academy/career-progress"] });
                    } catch (err: any) {
                      toast({ title: "Hata", description: err.message, variant: "destructive" });
                    } finally {
                      setIsMarkingComplete(false);
                    }
                  }}
                  disabled={isMarkingComplete}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isMarkingComplete ? "Kaydediliyor..." : "Sınavı Tamamla"} <CheckCircle className="w-4 h-4 ml-2" />
                </Button>
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Sınav tanımlanmamış - Modülü tamamlamak için devam et
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Completed Tab */}
          <TabsContent value="completed" className="grid grid-cols-1 gap-4">
            <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <Award className="w-6 h-6" />
                  Modül Tamamlandı!
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3">
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
    <div className="grid grid-cols-1 gap-6 p-6">
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
        <div className="flex justify-between items-start gap-4">
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
              <DialogHeader className="grid grid-cols-1 gap-3">
                <DialogTitle>Modül Ön İzlemesi - Öğrenci Görünümü</DialogTitle>
                
                {/* Progress Bar */}
                {previewPhase !== 'completed' && (
                  <div className="grid grid-cols-1 gap-2">
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
                <div className="grid grid-cols-1 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Öğrenme Hedefleri</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {learningObjectives.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Hedef tanımlanmamış</p>
                      ) : (
                        <ul className="grid grid-cols-1 gap-3">
                          {learningObjectives.map((objective: string, idx: number) => (
                            <li key={idx} className="flex gap-3 text-sm">
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
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
                <div className="grid grid-cols-1 gap-4">
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
                        <CardContent className="grid grid-cols-1 gap-4">
                          <p className="text-sm whitespace-pre-wrap">{steps[currentStepIndex]?.content}</p>
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
                <div className="grid grid-cols-1 gap-4">
                  {!module?.quiz || module.quiz.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Quiz sorusu tanımlanmamış</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-4">
                        {module.quiz.map((q: any, idx: number) => (
                          <Card key={idx} className="border-l-4 border-l-green-500">
                            <CardContent className="pt-4">
                              <p className="font-medium mb-3">{idx + 1}. {q.question_text || `Soru ${idx + 1}`}</p>
                              <div className="grid grid-cols-1 gap-2">
                                {q.options?.map((opt: string, optIdx: number) => (
                                  <button
                                    key={optIdx}
                                    onClick={() => setPreviewQuizAnswers({ ...previewQuizAnswers, [idx]: optIdx })}
                                    className={`w-full text-left p-3 rounded border-2 transition-colors ${
                                      previewQuizAnswers[idx] === optIdx
                                        ? optIdx === q.correct_option_index
                                          ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                                          : "border-red-500 bg-red-50 dark:bg-red-950/20"
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
                            </CardContent>
                          </Card>
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
                <div className="grid grid-cols-1 gap-4">
                  {scenarioTasks.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Senaryo tanımlanmamış</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-3">
                        {scenarioTasks.map((scenario: any, idx: number) => (
                          <Card key={idx} className="border-l-4 border-l-purple-500">
                            <CardContent className="pt-4">
                              <div className="grid grid-cols-1 gap-2">
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
                <div className="space-y-6 text-center py-8">
                  <div className="flex justify-center">
                    <div className="relative">
                      <Award className="w-24 h-24 text-yellow-500" />
                      <CheckCircle className="w-8 h-8 text-green-600 absolute bottom-0 right-0" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Tebrikler!</h3>
                    <p className="text-muted-foreground mb-1">Modülü başarıyla tamamladınız</p>
                    <Badge className="mt-3 bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200">
                      <Award className="w-3 h-3 mr-1" />
                      Rozet Kazandı: {module.title}
                    </Badge>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button 
                      onClick={() => {
                        if (moduleId) {
                          apiRequest("POST", `/api/training/modules/${moduleId}/complete`).catch(console.error);
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
        <TabsList className="grid w-full grid-cols-6">
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
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="grid grid-cols-1 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Modül Bilgileri</CardTitle>
              <CardDescription>Temel modül özellikleri ve yapısı</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4">
              <div className="grid md:grid-cols-2 gap-4">
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
              <div className="grid md:grid-cols-2 gap-4">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {module.galleryImages.map((img: any, idx: number) => (
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
        <TabsContent value="objectives" className="grid grid-cols-1 gap-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center gap-2">
                <div>
                  <CardTitle>Öğrenme Hedefleri</CardTitle>
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
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-1 gap-3">
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
                <p className="text-sm text-muted-foreground text-center py-4">Hedef tanımlanmamış</p>
              ) : (
                <ul className="grid grid-cols-1 gap-2">
                  {learningObjectives.map((objective: string, idx: number) => (
                    <li key={idx} className="flex gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>{objective}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Steps */}
        <TabsContent value="steps" className="grid grid-cols-1 gap-4">
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
                        className="space-y-4 max-h-96 overflow-y-auto"
                      >
                        {stepsForm.watch("steps").map((_, index) => (
                          <div key={index} className="border p-3 rounded space-y-2 bg-muted/30">
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
                                  stepsForm.setValue("steps", current.filter((_: any, i: number) => i !== index));
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
                <p className="text-sm text-muted-foreground text-center py-4">Adım tanımlanmamış</p>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {steps.map((step: any, idx: number) => (
                    <Card key={idx} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
                            {step.step_number || idx + 1}
                          </span>
                          <CardTitle className="text-base">{step.title}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <p className="text-muted-foreground whitespace-pre-wrap">{step.content}</p>
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
        <TabsContent value="quiz" className="grid grid-cols-1 gap-4">
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
                        className="space-y-4 max-h-96 overflow-y-auto"
                      >
                        {quizForm.watch("quiz").map((_, index) => (
                          <div key={index} className="border p-3 rounded space-y-3 bg-muted/30">
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
                                  quizForm.setValue("quiz", current.filter((_: any, i: number) => i !== index));
                                }}
                                data-testid={`button-delete-quiz-${index}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>

                            {/* Options */}
                            <div className="space-y-2 pl-2 border-l-2 border-muted-foreground/30">
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
                                        quizForm.setValue(`quiz.${index}.options`, current.filter((_: any, i: number) => i !== optIndex));
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
                <p className="text-sm text-muted-foreground text-center py-4">Quiz sorusu tanımlanmamış</p>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {module.quiz.map((q: any, idx: number) => (
                    <Card key={idx} className="border-l-4 border-l-green-500">
                      <CardContent className="pt-4">
                        <p className="font-medium text-sm">{q.question_text || `Soru ${idx + 1}`}</p>
                        {q.options && (
                          <ul className="text-sm space-y-1 mt-2 ml-4">
                            {q.options.map((opt: string, oidx: number) => (
                              <li key={oidx} className={`list-disc ${oidx === q.correct_option_index ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
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
        <TabsContent value="scenarios" className="grid grid-cols-1 gap-4">
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
                        className="space-y-4 max-h-96 overflow-y-auto"
                      >
                        {scenariosForm.watch("scenarioTasks").map((_, index) => (
                          <div key={index} className="border p-3 rounded space-y-2">
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
                <p className="text-sm text-muted-foreground text-center py-4">Senaryo görev tanımlanmamış</p>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {scenarioTasks.map((scenario: any, idx: number) => (
                    <Card key={idx} className="border-l-4 border-l-purple-500">
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-1 gap-2">
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
        <TabsContent value="checklist" className="grid grid-cols-1 gap-4">
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
                        className="space-y-4 max-h-96 overflow-y-auto"
                      >
                        {checklistForm.watch("supervisorChecklist").map((_, index) => (
                          <div key={index} className="border p-3 rounded space-y-2">
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
                <p className="text-sm text-muted-foreground text-center py-4">Kontrol listesi maddesi tanımlanmamış</p>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {module.supervisorChecklist.map((item: any, idx: number) => (
                    <Card key={idx} className="border-l-4 border-l-orange-500">
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-1 gap-1">
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
