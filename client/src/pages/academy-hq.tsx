import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole, type TrainingModule } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, CheckCircle, XCircle, Clock, BookOpen, Users, Trash2, Plus, GraduationCap } from "lucide-react";
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
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importJson, setImportJson] = useState("");

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

  const importMutation = useMutation({
    mutationFn: async (json: string) => {
      const data = JSON.parse(json);
      return apiRequest("POST", "/api/training/import", data);
    },
    onSuccess: () => {
      toast({ title: "Modüller başarıyla içe aktarıldı" });
      setIsImportOpen(false);
      setImportJson("");
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules"] });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

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
    <div className="space-y-6 p-6">
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
        <h1 className="text-3xl font-bold tracking-tight">Akademi - HQ Yönetim Paneli</h1>
        <p className="text-muted-foreground mt-2">Modül yönetimi, sınav talepleri ve atamalar</p>
      </div>

      <Tabs defaultValue="modules" className="w-full">
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
        <TabsContent value="modules" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Modüller Listesi */}
            <Card>
              <CardHeader>
                <CardTitle>Akademi Modülleri (12)</CardTitle>
                <CardDescription>Modülleri seçip düzenle veya ata</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
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
            <div className="space-y-4">
              {selectedModuleId && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>{ACADEMY_MODULES.find(m => m.id === selectedModuleId)?.name}</CardTitle>
                      <CardDescription>Modül yönetimi ve atama işlemleri</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                            })} className="space-y-4">
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
                              })} className="space-y-4">
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
                      <div className="space-y-2">
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
        <TabsContent value="exams" className="space-y-4">
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
                  <div className="space-y-2 max-h-96 overflow-y-auto">
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
                  <div className="space-y-2 max-h-96 overflow-y-auto">
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
        <TabsContent value="training" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Eğitim Modülleri Yönetimi</h2>
            <div className="flex gap-2">
              <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-import-json">
                    <Plus className="w-4 h-4 mr-2" />
                    JSON İçe Aktar
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>JSON Müfredatını İçe Aktar</DialogTitle>
                  </DialogHeader>
                  <Textarea
                    placeholder="DOSPRESSO Academy JSON'ını yapıştırın..."
                    value={importJson}
                    onChange={(e) => setImportJson(e.target.value)}
                    className="h-96"
                  />
                  <Button
                    onClick={() => importMutation.mutate(importJson)}
                    disabled={importMutation.isPending || !importJson}
                    className="w-full"
                  >
                    {importMutation.isPending ? "İçe Aktarılıyor..." : "İçe Aktar"}
                  </Button>
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
                  <form onSubmit={trainingForm.handleSubmit((data) => createTrainingMutation.mutate(data))} className="space-y-4">
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
                  <form onSubmit={editTrainingForm.handleSubmit((data) => updateTrainingMutation.mutate(data))} className="space-y-4">
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
                            <Select onValueChange={field.onChange} defaultValue={editingModule.level}>
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
              <Link key={module.id} href={`/akademi-modul/${module.id}`}>
                <Card className="cursor-pointer hover-elevate h-full">
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
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingModule(module);
                            editTrainingForm.reset(module);
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
                            e.preventDefault();
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
                  <CardContent className="space-y-2 text-sm">
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
              </Link>
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
