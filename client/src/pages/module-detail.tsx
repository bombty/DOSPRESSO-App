import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, CheckCircle, Clock, Lightbulb, ArrowLeft, Edit2, Save, Sparkles, Plus, Trash2 } from "lucide-react";
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

export default function ModuleDetail() {
  const [, params] = useRoute("/akademi-modul/:id");
  const [, setLocation] = useLocation();
  const moduleId = params?.id ? parseInt(params.id) : null;
  const { toast } = useToast();

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
      queryClient.invalidateQueries({ queryKey: [`/api/training/modules/${moduleId}`] });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground">Yükleniyor...</div>;
  }

  if (!module) {
    return (
      <div className="p-6">
        <Button onClick={() => setLocation("/akademi-hq")} variant="outline" size="sm">
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

  return (
    <div className="space-y-6 p-6">
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
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
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
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Modül Bilgileri</CardTitle>
              <CardDescription>Temel modül özellikleri ve yapısı</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
        </TabsContent>

        {/* Learning Objectives */}
        <TabsContent value="objectives" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center gap-2">
                <div>
                  <CardTitle>Öğrenme Hedefleri</CardTitle>
                  <CardDescription>Modülün öğrenme çıktıları</CardDescription>
                </div>
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
                  <Dialog>
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
                        <div className="space-y-3">
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
              </div>
            </CardHeader>
            <CardContent>
              {learningObjectives.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Hedef tanımlanmamış</p>
              ) : (
                <ul className="space-y-2">
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
        <TabsContent value="steps" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center gap-2">
                <div>
                  <CardTitle>Öğrenme Adımları</CardTitle>
                  <CardDescription>Modülün yapılandırılmış öğrenme içeriği</CardDescription>
                </div>
                <Dialog>
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
                          <div key={index} className="border p-3 rounded space-y-2">
                            <FormField
                              control={stepsForm.control}
                              name={`steps.${index}.title`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Başlık</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Adım başlığı..." {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={stepsForm.control}
                              name={`steps.${index}.content`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>İçerik</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder="Adım içeriği..." {...field} />
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
              </div>
            </CardHeader>
            <CardContent>
              {steps.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Adım tanımlanmamış</p>
              ) : (
                <div className="space-y-4">
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
        <TabsContent value="quiz" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center gap-2">
                <div>
                  <CardTitle>Quiz Soruları</CardTitle>
                  <CardDescription>Modülün bilgi ölçümü soruları</CardDescription>
                </div>
                <Dialog>
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
                          <div key={index} className="border p-3 rounded space-y-2">
                            <FormField
                              control={quizForm.control}
                              name={`quiz.${index}.question_text`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Soru</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder="Soruyu yazın..." {...field} />
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
              </div>
            </CardHeader>
            <CardContent>
              {!module?.quiz || module.quiz.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Quiz sorusu tanımlanmamış</p>
              ) : (
                <div className="space-y-3">
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
        <TabsContent value="scenarios" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center gap-2">
                <div>
                  <CardTitle>Senaryo Görevleri</CardTitle>
                  <CardDescription>Gerçek dünya uygulaması için senaryo tabanlı görevler</CardDescription>
                </div>
                <Dialog>
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
              </div>
            </CardHeader>
            <CardContent>
              {scenarioTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Senaryo görev tanımlanmamış</p>
              ) : (
                <div className="space-y-3">
                  {scenarioTasks.map((scenario: any, idx: number) => (
                    <Card key={idx} className="border-l-4 border-l-purple-500">
                      <CardContent className="pt-4">
                        <div className="space-y-2">
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

          {supervisorChecklist.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Denetçi Kontrol Listesi</CardTitle>
                <CardDescription>Denetçi onayı için gerekli kontrol noktaları</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {supervisorChecklist.map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-2 p-2 rounded border text-sm">
                      <CheckCircle className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">{item.title || `Kontrol ${idx + 1}`}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
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
