import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole, type TrainingModule } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModuleGallery } from "@/components/ModuleGallery";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, CheckCircle, XCircle, Clock, BookOpen, Users, Trash2, Plus, GraduationCap, Upload, FileText, Image } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const quizSchema = z.object({
  title: z.string().min(3, "Başlık en az 3 karakter olmalı"),
  description: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

const assignmentSchema = z.object({
  quizId: z.string().min(1, "Quiz seçin"),
  assignTo: z.enum(["user", "branch", "role"]),
  targetId: z.string().min(1, "Hedef seçin"),
});

const questionSchema = z.object({
  quizId: z.number().min(1, "Quiz seçin"),
  question: z.string().min(5, "Soru en az 5 karakter olmalı"),
  options: z.array(z.string()).min(2, "En az 2 seçenek gerekli"),
  correctAnswerIndex: z.number().min(0),
});

const trainingModuleSchema = z.object({
  title: z.string().min(3, "Başlık en az 3 karakter olmalı"),
  description: z.string().optional(),
  category: z.string().optional(),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  estimatedDuration: z.number().min(1),
  isPublished: z.boolean().default(false),
  requiredForRole: z.array(z.string()).default([]),
});

const ACADEMY_MODULES = [
  { id: 1, name: "Akademi", path: "/akademi", status: "active" },
  { id: 2, name: "Yönetim", path: "/akademi-hq", status: "active" },
  { id: 3, name: "Supervisor", path: "/akademi-supervisor", status: "active" },
  { id: 4, name: "Analitik", path: "/akademi-analytics", status: "active" },
  { id: 5, name: "Rozetler", path: "/akademi-badges", status: "active" },
  { id: 6, name: "Sıralama", path: "/akademi-leaderboard", status: "active" },
  { id: 7, name: "Yollar", path: "/akademi-learning-paths", status: "active" },
  { id: 8, name: "Sertifikalar", path: "/akademi-certificates", status: "active" },
  { id: 9, name: "Başarılar", path: "/akademi-achievements", status: "active" },
  { id: 10, name: "İlerleme", path: "/akademi-progress-overview", status: "active" },
  { id: 11, name: "Seri", path: "/akademi-streak-tracker", status: "active" },
  { id: 12, name: "AI Asistan", path: "/akademi-ai-assistant", status: "active" },
];

export default function AcademyHQ() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // HQ-only access check
  const isHQ = user && isHQRole(user.role as any);
  if (user && !isHQ) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Yetkisiz Erişim</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Bu sayfaya sadece HQ personeli erişebilir.</p>
            <Button onClick={() => window.location.href = "/"} className="mt-4 w-full">
              Ana Sayfaya Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [isCreateQuizOpen, setIsCreateQuizOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(1);
  const [isAddTrainingOpen, setIsAddTrainingOpen] = useState(false);
  const [isEditTrainingOpen, setIsEditTrainingOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<TrainingModule | null>(null);
  
  // AI Module Generator States
  const [isAiGeneratorOpen, setIsAiGeneratorOpen] = useState(false);
  const [aiWizardStep, setAiWizardStep] = useState<1 | 2 | 3>(1);
  const [aiInputText, setAiInputText] = useState("");
  const [aiRoleLevel, setAiRoleLevel] = useState("Stajyer");
  const [aiEstimatedMinutes, setAiEstimatedMinutes] = useState(15);
  const [generatedModule, setGeneratedModule] = useState<any>(null);
  const [aiInputMode, setAiInputMode] = useState<"text" | "file">("text");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [editingGalleryImages, setEditingGalleryImages] = useState<any[]>([]);

  if (!user || (user.role !== "admin" && !isHQRole(user.role as any))) {
    return <div className="p-6 text-center text-destructive">Erişim Reddedildi</div>;
  }

  const quizForm = useForm({
    resolver: zodResolver(quizSchema),
    defaultValues: { title: "", description: "", difficulty: "medium" as const },
  });

  const trainingForm = useForm<z.infer<typeof trainingModuleSchema>>({
    resolver: zodResolver(trainingModuleSchema),
    defaultValues: { title: "", description: "", category: "", level: "beginner" as const, estimatedDuration: 30, isPublished: false, requiredForRole: [] },
  });

  const editTrainingForm = useForm<z.infer<typeof trainingModuleSchema>>({
    resolver: zodResolver(trainingModuleSchema),
    defaultValues: { title: "", description: "", category: "", level: "beginner" as const, estimatedDuration: 30, isPublished: false, requiredForRole: [] },
  });

  const assignForm = useForm({
    resolver: zodResolver(assignmentSchema),
    defaultValues: { quizId: "", assignTo: "user" as const, targetId: "" },
  });

  const questionForm = useForm({
    resolver: zodResolver(questionSchema),
    defaultValues: { quizId: 1, question: "", options: ["", ""], correctAnswerIndex: 0 },
  });

  const { data: pendingExams = [] } = useQuery({
    queryKey: ["/api/academy/exam-requests-pending"],
    queryFn: async () => {
      const res = await fetch(`/api/academy/exam-requests?status=pending`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: approvedExams = [] } = useQuery({
    queryKey: ["/api/academy/exam-requests-approved"],
    queryFn: async () => {
      const res = await fetch(`/api/academy/exam-requests?status=approved`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("PATCH", `/api/academy/exam-request/${id}/approve`, {});
    },
    onSuccess: () => {
      toast({ title: "Sınav onaylandı" });
      queryClient.invalidateQueries({ queryKey: ["/api/academy/exam-requests-pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/academy/exam-requests-approved"] });
      setSelectedExamId(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      return apiRequest("PATCH", `/api/academy/exam-request/${id}/reject`, { rejectionReason: reason });
    },
    onSuccess: () => {
      toast({ title: "Sınav reddedildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/academy/exam-requests-pending"] });
      setSelectedExamId(null);
    },
  });

  const createQuizMutation = useMutation({
    mutationFn: async (data: z.infer<typeof quizSchema>) => {
      return apiRequest("POST", "/api/academy/quiz/create", data);
    },
    onSuccess: () => {
      toast({ title: "Quiz oluşturuldu" });
      setIsCreateQuizOpen(false);
      quizForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/academy/quizzes"] });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const assignQuizMutation = useMutation({
    mutationFn: async (data: z.infer<typeof assignmentSchema>) => {
      return apiRequest("POST", "/api/academy/assignment/create", data);
    },
    onSuccess: () => {
      toast({ title: "Quiz atandı" });
      setIsAssignOpen(false);
      assignForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const { data: quizzes = [] } = useQuery({
    queryKey: ["/api/academy/quizzes"],
    queryFn: async () => {
      const res = await fetch(`/api/academy/quizzes`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: quizQuestions = [] } = useQuery({
    queryKey: [`/api/academy/quiz/${selectedQuizId}/questions`],
    queryFn: async () => {
      if (!selectedQuizId) return [];
      const res = await fetch(`/api/academy/quiz/${selectedQuizId}/questions`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedQuizId,
  });

  const { data: trainingModules = [] } = useQuery<TrainingModule[]>({
    queryKey: ["/api/training/modules"],
    queryFn: async () => {
      const res = await fetch(`/api/training/modules`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createTrainingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof trainingModuleSchema>) => {
      return apiRequest("POST", "/api/training/modules", { ...data, createdBy: user?.id });
    },
    onSuccess: () => {
      toast({ title: "Eğitim modülü oluşturuldu" });
      setIsAddTrainingOpen(false);
      trainingForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules"] });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const deleteTrainingMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/training/modules/${id}`, {});
    },
    onSuccess: () => {
      toast({ title: "Eğitim modülü silindi" });
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules"] });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const updateTrainingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof trainingModuleSchema>) => {
      if (!editingModule) throw new Error("Module not selected");
      return apiRequest("PUT", `/api/training/modules/${editingModule.id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Eğitim modülü güncellendi" });
      setIsEditTrainingOpen(false);
      setEditingModule(null);
      editTrainingForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules"] });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  // AI Module Generator Mutations
  const generateModuleMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/training/generate", {
        inputText: aiInputText,
        roleLevel: aiRoleLevel,
        estimatedMinutes: aiEstimatedMinutes,
      });
      return await response.json() as { success: boolean; module: any };
    },
    onSuccess: (data) => {
      setGeneratedModule(data.module);
      setAiWizardStep(2);
      toast({ title: "Modül başarıyla oluşturuldu! Önizlemeye geçiliyor..." });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "AI modül oluşturma başarısız",
        variant: "destructive"
      });
    },
  });

  const saveGeneratedModuleMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/training/generate/save", {
        module: generatedModule,
        roleLevel: aiRoleLevel,
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "Modül veritabanına kaydedildi!" });
      setIsAiGeneratorOpen(false);
      resetAiWizard();
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules"] });
    },
    onError: (error: any) => {
      toast({
        title: "Kaydetme Hatası",
        description: error.message || "Modül kaydedilemedi",
        variant: "destructive"
      });
    },
  });

  const resetAiWizard = () => {
    setAiWizardStep(1);
    setAiInputText("");
    setAiRoleLevel("Stajyer");
    setAiEstimatedMinutes(15);
    setGeneratedModule(null);
    setAiInputMode("text");
    setSelectedFile(null);
    setIsExtractingText(false);
  };

  const handleFileUpload = async (file: File) => {
    setSelectedFile(file);
    setIsExtractingText(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/training/generate/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Dosya işlenemedi');
      }
      
      const result = await response.json();
      setAiInputText(result.extractedText);
      toast({ title: `Metin çıkarıldı: ${result.fileName}` });
    } catch (error: any) {
      toast({
        title: "Dosya İşleme Hatası",
        description: error.message || "Dosyadan metin çıkarılamadı",
        variant: "destructive"
      });
      setSelectedFile(null);
    } finally {
      setIsExtractingText(false);
    }
  };

  const { data: allUsers = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch(`/api/users`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: number) => {
      return apiRequest("DELETE", `/api/academy/question/${questionId}`, {});
    },
    onSuccess: () => {
      toast({ title: "Soru silindi" });
      queryClient.invalidateQueries({ queryKey: [`/api/academy/quiz/${selectedQuizId}/questions`] });
    },
  });

  const createQuestionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof questionSchema>) => {
      return apiRequest("POST", "/api/academy/question", data);
    },
    onSuccess: () => {
      toast({ title: "Soru eklendi" });
      setIsAddQuestionOpen(false);
      questionForm.reset();
      queryClient.invalidateQueries({ queryKey: [`/api/academy/quiz/${selectedQuizId}/questions`] });
    },
  });

  return (
    <div className="grid grid-cols-1 gap-2 p-3">
      <div className="flex items-center gap-2 mb-4">
        <Button
          onClick={() => window.history.back()}
          variant="outline"
          size="icon"
          data-testid="button-back"
          title="Geri Dön"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
      </div>
      
      <div>
        <h1 className="text-lg font-bold tracking-tight">Akademi - HQ Yönetim Paneli</h1>
        <p className="text-muted-foreground mt-2">Modül yönetimi, sınav talepleri ve atamalar</p>
      </div>

      <Tabs defaultValue="training" className="w-full">
        <TabsList className="w-full flex flex-wrap gap-1">
          <TabsTrigger value="modules" className="flex-1 min-w-fit">
            <BookOpen className="w-4 h-4 mr-2" />
            Modüller
          </TabsTrigger>
          <TabsTrigger value="exams" className="flex-1 min-w-fit">
            <Clock className="w-4 h-4 mr-2" />
            Sınav Talepleri
          </TabsTrigger>
          <TabsTrigger value="training" className="flex-1 min-w-fit">
            <GraduationCap className="w-4 h-4 mr-2" />
            Eğitim Modülleri ({trainingModules.length})
          </TabsTrigger>
        </TabsList>

        {/* MODULES TAB - ANA SAYFA */}
        <TabsContent value="temp" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Modüller Listesi */}
            <Card>
              <CardHeader>
                <CardTitle>Akademi Modülleri (12)</CardTitle>
                <CardDescription>Modülleri seçip düzenle veya ata</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                  {ACADEMY_MODULES.map((module) => (
                    <button
                      key={module.id}
                      onClick={() => setSelectedModuleId(module.id)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition ${
                        selectedModuleId === module.id
                          ? "border-primary bg-primary/5"
                          : "border-transparent hover:border-border"
                      }`}
                      data-testid={`button-select-module-${module.id}`}
                    >
                      <p className="font-medium text-sm">{module.name}</p>
                      <p className="text-xs text-muted-foreground">{module.path}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Seçili Modül Detayı */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {selectedModuleId && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>{ACADEMY_MODULES.find(m => m.id === selectedModuleId)?.name}</CardTitle>
                      <CardDescription>Modül yönetimi ve atama işlemleri</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Yol:</p>
                        <p className="text-sm font-mono bg-muted p-2 rounded">
                          {ACADEMY_MODULES.find(m => m.id === selectedModuleId)?.path}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Durum:</p>
                        <Badge>Aktif</Badge>
                      </div>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="w-full" data-testid={`button-assign-module-${selectedModuleId}`}>
                            Bu Modülü Ata
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{ACADEMY_MODULES.find(m => m.id === selectedModuleId)?.name} - Atama</DialogTitle>
                          </DialogHeader>
                          <Form {...assignForm}>
                            <form onSubmit={assignForm.handleSubmit((data) => {
                              assignQuizMutation.mutate({
                                ...data,
                                quizId: selectedModuleId.toString(),
                              });
                            })} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <FormField
                                control={assignForm.control}
                                name="assignTo"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Atama Türü</FormLabel>
                                    <FormControl>
                                      <select {...field} className="border rounded px-2 py-1 w-full">
                                        <option value="user">Kullanıcı</option>
                                        <option value="branch">Şube</option>
                                        <option value="role">Rol</option>
                                      </select>
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={assignForm.control}
                                name="targetId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Hedef ID</FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder={
                                          assignForm.getValues("assignTo") as string === "user" 
                                            ? "Kullanıcı ID'si"
                                            : (assignForm.getValues("assignTo") as string) === "branch"
                                            ? "Şube ID'si"
                                            : "Rol Adı"
                                        }
                                        {...field} 
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <Button type="submit" disabled={assignQuizMutation.isPending} className="w-full">
                                Ata
                              </Button>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>

                  {/* Quiz Management */}
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="text-lg">Quiz Yönetimi</CardTitle>
                          <CardDescription>Bu modülle ilgili quizleri düzenle</CardDescription>
                        </div>
                        <Dialog open={isCreateQuizOpen} onOpenChange={setIsCreateQuizOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" data-testid="button-create-quiz">
                              <Plus className="w-4 h-4 mr-1" />
                              Quiz Ekle
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Yeni Quiz</DialogTitle>
                            </DialogHeader>
                            <Form {...quizForm}>
                              <form onSubmit={quizForm.handleSubmit((data) => {
                                createQuizMutation.mutate(data);
                              })} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <FormField
                                  control={quizForm.control}
                                  name="title"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Başlık</FormLabel>
                                      <FormControl>
                                        <Input {...field} placeholder="Quiz başlığı" />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={quizForm.control}
                                  name="description"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Açıklama (İsteğe Bağlı)</FormLabel>
                                      <FormControl>
                                        <Textarea {...field} placeholder="Quiz açıklaması" />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={quizForm.control}
                                  name="difficulty"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Zorluk</FormLabel>
                                      <FormControl>
                                        <select {...field} className="border rounded px-2 py-1 w-full">
                                          <option value="easy">Kolay</option>
                                          <option value="medium">Orta</option>
                                          <option value="hard">Zor</option>
                                        </select>
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <Button type="submit" disabled={createQuizMutation.isPending} className="w-full">
                                  Oluştur
                                </Button>
                              </form>
                            </Form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        {quizzes.slice(0, 3).map((quiz: any) => (
                          <div key={quiz.id} className="p-2 border rounded text-sm">
                            <p className="font-medium">{quiz.title_tr}</p>
                            <p className="text-xs text-muted-foreground">{quiz.description_tr}</p>
                          </div>
                        ))}
                        {quizzes.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">Quiz yok</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>

          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle>Modül İstatistikleri</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-muted rounded text-center">
                  <p className="text-2xl font-bold">12</p>
                  <p className="text-xs text-muted-foreground">Toplam Modül</p>
                </div>
                <div className="p-3 bg-muted rounded text-center">
                  <p className="text-2xl font-bold">12</p>
                  <p className="text-xs text-muted-foreground">Aktif</p>
                </div>
                <div className="p-3 bg-muted rounded text-center">
                  <p className="text-2xl font-bold">{quizzes.length}</p>
                  <p className="text-xs text-muted-foreground">Quiz Sayısı</p>
                </div>
                <div className="p-3 bg-muted rounded text-center">
                  <p className="text-2xl font-bold">{allUsers.length}</p>
                  <p className="text-xs text-muted-foreground">Kullanıcı</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EXAM REQUESTS TAB */}
        <TabsContent value="temp" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Pending */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Beklemede ({pendingExams.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingExams.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">Talep yok</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                    {pendingExams.map((exam: any) => (
                      <div key={exam.id} className="p-3 border rounded text-sm">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium">{exam.userId}</p>
                            <p className="text-xs text-muted-foreground">Rol: {exam.targetRoleId}</p>
                          </div>
                          <Badge variant="outline">Beklemede</Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            onClick={() => approveMutation.mutate(exam.id)}
                            disabled={approveMutation.isPending}
                            data-testid={`button-approve-exam-${exam.id}`}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Onayla
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => rejectMutation.mutate({ id: exam.id, reason: "Reddedildi" })}
                            disabled={rejectMutation.isPending}
                            data-testid={`button-reject-exam-${exam.id}`}
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Reddet
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Approved */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Onaylı ({approvedExams.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {approvedExams.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">Onay yok</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                    {approvedExams.map((exam: any) => (
                      <div key={exam.id} className="p-3 border rounded text-sm">
                        <p className="font-medium">{exam.userId}</p>
                        <p className="text-xs text-muted-foreground">Rol: {exam.targetRoleId}</p>
                        <Badge className="mt-2">Onaylı</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* EĞİTİM MODÜLLERI TAB */}
        <TabsContent value="temp" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Eğitim Modülleri Yönetimi</h2>
            <div className="flex gap-2">
              <Dialog open={isAiGeneratorOpen} onOpenChange={(open) => {
                setIsAiGeneratorOpen(open);
                if (!open) resetAiWizard();
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-ai-generator">
                    <GraduationCap className="w-4 h-4 mr-2" />
                    AI ile Modül Oluştur
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5" />
                      AI Modül Oluşturucu
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${aiWizardStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>1</div>
                      <div className={`flex-1 h-1 ${aiWizardStep >= 2 ? 'bg-primary' : 'bg-muted'}`} />
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${aiWizardStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>2</div>
                      <div className={`flex-1 h-1 ${aiWizardStep >= 3 ? 'bg-primary' : 'bg-muted'}`} />
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${aiWizardStep >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>3</div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Metin Gir</span>
                      <span>AI Önizleme</span>
                      <span>Kaydet</span>
                    </div>
                  </DialogHeader>
                  
                  {/* Step 1: Input Text or File */}
                  {aiWizardStep === 1 && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="bg-muted/50 p-3 rounded-lg text-sm">
                        <p className="font-medium mb-1">Nasıl Çalışır?</p>
                        <p className="text-muted-foreground">Metin yapıştırın veya PDF/fotoğraf yükleyin. AI, içeriği otomatik olarak yapılandırılmış bir eğitim modülüne dönüştürecek.</p>
                      </div>
                      
                      {/* Input Mode Toggle */}
                      <div className="flex gap-2 p-1 bg-muted rounded-lg">
                        <Button
                          type="button"
                          variant={aiInputMode === "text" ? "default" : "ghost"}
                          className="flex-1"
                          onClick={() => setAiInputMode("text")}
                          data-testid="button-text-mode"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Metin Gir
                        </Button>
                        <Button
                          type="button"
                          variant={aiInputMode === "file" ? "default" : "ghost"}
                          className="flex-1"
                          onClick={() => setAiInputMode("file")}
                          data-testid="button-file-mode"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Dosya Yükle
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Hedef Rol</label>
                          <Select value={aiRoleLevel} onValueChange={setAiRoleLevel}>
                            <SelectTrigger data-testid="select-role-level">
                              <SelectValue placeholder="Rol seçin" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Stajyer">Stajyer</SelectItem>
                              <SelectItem value="Bar Buddy">Bar Buddy</SelectItem>
                              <SelectItem value="Barista">Barista</SelectItem>
                              <SelectItem value="Supervisor Buddy">Supervisor Buddy</SelectItem>
                              <SelectItem value="Supervisor">Supervisor</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Tahmini Süre (dk)</label>
                          <Input 
                            type="number" 
                            value={aiEstimatedMinutes}
                            onChange={(e) => setAiEstimatedMinutes(Number(e.target.value) || 15)}
                            min={5}
                            max={120}
                            data-testid="input-duration"
                          />
                        </div>
                      </div>
                      
                      {/* File Upload Mode */}
                      {aiInputMode === "file" && (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <label className="text-sm font-medium mb-1 block">PDF veya Fotoğraf Yükle</label>
                          <div 
                            className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
                            onClick={() => document.getElementById('file-upload-input')?.click()}
                          >
                            <input
                              id="file-upload-input"
                              type="file"
                              accept=".pdf,image/jpeg,image/png,image/webp,image/heic"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file);
                              }}
                              data-testid="input-file-upload"
                            />
                            {isExtractingText ? (
                              <div className="flex flex-col items-center gap-2">
                                <Clock className="w-8 h-8 animate-spin text-primary" />
                                <p className="text-sm font-medium">Metin çıkarılıyor...</p>
                                <p className="text-xs text-muted-foreground">PDF veya görsel işleniyor</p>
                              </div>
                            ) : selectedFile ? (
                              <div className="flex flex-col items-center gap-2">
                                <CheckCircle className="w-8 h-8 text-green-500" />
                                <p className="text-sm font-medium">{selectedFile.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {(selectedFile.size / 1024).toFixed(1)} KB - Metin çıkarıldı
                                </p>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedFile(null);
                                    setAiInputText("");
                                  }}
                                >
                                  Dosyayı Kaldır
                                </Button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <div className="flex gap-2">
                                  <FileText className="w-8 h-8 text-muted-foreground" />
                                  <Image className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <p className="text-sm font-medium">PDF veya fotoğraf yüklemek için tıklayın</p>
                                <p className="text-xs text-muted-foreground">Maksimum 10 MB - PDF, JPEG, PNG desteklenir</p>
                              </div>
                            )}
                          </div>
                          
                          {aiInputText && (
                            <div>
                              <label className="text-sm font-medium mb-1 block">Çıkarılan Metin (düzenleyebilirsiniz)</label>
                              <Textarea
                                value={aiInputText}
                                onChange={(e) => setAiInputText(e.target.value)}
                                className="h-40"
                                data-testid="textarea-extracted-text"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                {aiInputText.length} karakter
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Text Input Mode */}
                      {aiInputMode === "text" && (
                        <div>
                          <label className="text-sm font-medium mb-1 block">Eğitim İçeriği Metni</label>
                          <Textarea
                            placeholder="Eğitim konusu hakkında bir makale, prosedür veya herhangi bir metin yapıştırın... (en az 50 karakter)"
                            value={aiInputText}
                            onChange={(e) => setAiInputText(e.target.value)}
                            className="h-64"
                            data-testid="textarea-input-text"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {aiInputText.length} karakter {aiInputText.length < 50 && "(min. 50 karakter gerekli)"}
                          </p>
                        </div>
                      )}
                      
                      <Button
                        onClick={() => generateModuleMutation.mutate()}
                        disabled={generateModuleMutation.isPending || aiInputText.length < 50 || isExtractingText}
                        className="w-full"
                        data-testid="button-generate-module"
                      >
                        {generateModuleMutation.isPending ? (
                          <>
                            <Clock className="w-4 h-4 mr-2 animate-spin" />
                            AI Modül Oluşturuyor... (10-20 saniye)
                          </>
                        ) : (
                          <>
                            <GraduationCap className="w-4 h-4 mr-2" />
                            AI ile Modül Oluştur
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  
                  {/* Step 2: Preview Generated Module */}
                  {aiWizardStep === 2 && generatedModule && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">Modül başarıyla oluşturuldu!</p>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
                        <div>
                          <h4 className="font-semibold text-lg">{generatedModule.title}</h4>
                          <p className="text-sm text-muted-foreground">{generatedModule.description}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">{aiRoleLevel}</Badge>
                            <Badge variant="outline">{generatedModule.estimatedDuration} dk</Badge>
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-sm mb-2">Öğrenme Hedefleri ({generatedModule.learningObjectives?.length || 0})</h5>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            {generatedModule.learningObjectives?.map((obj: string, i: number) => (
                              <li key={i} className="text-muted-foreground">{obj}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-sm mb-2">Eğitim Adımları ({generatedModule.steps?.length || 0})</h5>
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            {generatedModule.steps?.map((step: any, i: number) => (
                              <div key={i} className="bg-muted/50 p-2 rounded text-sm">
                                <p className="font-medium">{step.stepNumber}. {step.title}</p>
                                <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{step.content}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-sm mb-2">Quiz Soruları ({generatedModule.quiz?.length || 0})</h5>
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            {generatedModule.quiz?.map((q: any, i: number) => (
                              <div key={i} className="bg-muted/50 p-2 rounded text-sm">
                                <p className="font-medium">{q.questionText}</p>
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  {q.options?.map((opt: string, j: number) => (
                                    <Badge key={j} variant={j === q.correctOptionIndex ? "default" : "outline"} className="text-xs">
                                      {opt}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-sm mb-2">Senaryolar ({generatedModule.scenarioTasks?.length || 0})</h5>
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            {generatedModule.scenarioTasks?.map((s: any, i: number) => (
                              <div key={i} className="bg-muted/50 p-2 rounded text-sm">
                                <p className="font-medium">{s.title}</p>
                                <p className="text-muted-foreground text-xs">{s.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-sm mb-2">Denetçi Kontrol Listesi ({generatedModule.supervisorChecklist?.length || 0})</h5>
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            {generatedModule.supervisorChecklist?.map((c: any, i: number) => (
                              <div key={i} className="bg-muted/50 p-2 rounded text-sm">
                                <p className="font-medium">{c.title}</p>
                                <p className="text-muted-foreground text-xs">{c.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setAiWizardStep(1)} className="flex-1" data-testid="button-back">
                          Geri Dön
                        </Button>
                        <Button 
                          onClick={() => saveGeneratedModuleMutation.mutate()}
                          disabled={saveGeneratedModuleMutation.isPending}
                          className="flex-1"
                          data-testid="button-save-module"
                        >
                          {saveGeneratedModuleMutation.isPending ? "Kaydediliyor..." : "Modülü Kaydet"}
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
              <Dialog open={isAddTrainingOpen} onOpenChange={setIsAddTrainingOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-training">
                  <Plus className="w-4 h-4 mr-2" />
                  Yeni Modül
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Yeni Eğitim Modülü Oluştur</DialogTitle>
                </DialogHeader>
                <Form {...trainingForm}>
                  <form onSubmit={trainingForm.handleSubmit((data) => createTrainingMutation.mutate(data))} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={trainingForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Başlık</FormLabel>
                          <FormControl>
                            <Input placeholder="Modül başlığı" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={trainingForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Açıklama</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Modül açıklaması" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={trainingForm.control}
                        name="level"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Seviye</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue="beginner">
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="beginner">Başlangıç</SelectItem>
                                <SelectItem value="intermediate">Orta</SelectItem>
                                <SelectItem value="advanced">İleri</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={trainingForm.control}
                        name="estimatedDuration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tahmini Süre (dk)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button type="submit" disabled={createTrainingMutation.isPending} className="w-full">
                      {createTrainingMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          {/* Edit Dialog */}
          <Dialog open={isEditTrainingOpen} onOpenChange={setIsEditTrainingOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Eğitim Modülünü Düzenle</DialogTitle>
              </DialogHeader>
              {editingModule && (
                <Form {...editTrainingForm}>
                  <form onSubmit={editTrainingForm.handleSubmit((data) => updateTrainingMutation.mutate(data))} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={editTrainingForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Başlık</FormLabel>
                          <FormControl>
                            <Input placeholder="Modül başlığı" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editTrainingForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Açıklama</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Modül açıklaması" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editTrainingForm.control}
                        name="level"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Seviye</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={editingModule?.level || "beginner"}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="beginner">Başlangıç</SelectItem>
                                <SelectItem value="intermediate">Orta</SelectItem>
                                <SelectItem value="advanced">İleri</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editTrainingForm.control}
                        name="estimatedDuration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tahmini Süre (dk)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    {editingModule.id && (
                      <ModuleGallery
                        moduleId={editingModule.id}
                        images={editingGalleryImages}
                        onImagesChange={setEditingGalleryImages}
                        disabled={updateTrainingMutation.isPending}
                      />
                    )}
                    <Button type="submit" disabled={updateTrainingMutation.isPending} className="w-full">
                      {updateTrainingMutation.isPending ? "Güncelleniyor..." : "Güncelle"}
                    </Button>
                  </form>
                </Form>
              )}
            </DialogContent>
          </Dialog>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trainingModules.map((module: TrainingModule) => (
              <div 
                key={module.id}
                onClick={() => {
                  sessionStorage.setItem('academyReferrer', '/akademi-hq');
                  setLocation(`/akademi-modul/${module.id}`);
                }}
                className="cursor-pointer"
              >
                <Card className="hover-elevate h-full">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-base">{module.title}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          Seviye: {module.level === 'beginner' ? 'Başlangıç' : module.level === 'intermediate' ? 'Orta' : 'İleri'}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingModule(module);
                            setEditingGalleryImages(module.galleryImages || []);
                            editTrainingForm.reset({
                              title: module.title,
                              description: module.description || undefined,
                              category: module.category || undefined,
                              level: (module.level as "beginner" | "intermediate" | "advanced") || "beginner",
                              estimatedDuration: module.estimatedDuration ?? 30,
                              isPublished: module.isPublished ?? false,
                              requiredForRole: module.requiredForRole || [],
                            });
                            setIsEditTrainingOpen(true);
                          }}
                          data-testid={`button-edit-module-${module.id}`}
                        >
                          ✎ Düzenle
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTrainingMutation.mutate(module.id);
                          }}
                          disabled={deleteTrainingMutation.isPending}
                          data-testid={`button-delete-module-${module.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-2 text-sm">
                    {module.description && <p className="text-muted-foreground line-clamp-2">{module.description}</p>}
                    <div className="flex gap-2 flex-wrap">
                      {module.isPublished && <Badge variant="default">Yayında</Badge>}
                      {!module.isPublished && <Badge variant="secondary">Taslak</Badge>}
                      <Badge variant="outline">{module.estimatedDuration} dk</Badge>
                    </div>
                    {module.requiredForRole && module.requiredForRole.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Zorunlu Roller:</p>
                        <div className="flex gap-1 flex-wrap">
                          {module.requiredForRole.map((role: string) => (
                            <Badge key={role} variant="outline" className="text-xs">{role}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
          {trainingModules.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <GraduationCap className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">Henüz eğitim modülü eklenmedi</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
