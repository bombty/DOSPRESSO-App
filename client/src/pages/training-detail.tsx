import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, BookOpen, Play, CheckCircle2, Clock, Video, Brain, Award, Plus, Trash2 } from "lucide-react";
import type { TrainingModule, ModuleVideo, ModuleQuiz, Flashcard, UserTrainingProgress } from "@shared/schema";

interface ModuleLesson {
  id: number;
  moduleId: number;
  title: string;
  content: string;
  orderIndex: number;
  estimatedDuration: number;
  createdAt: string;
  updatedAt: string;
}

interface TrainingModuleWithContent extends TrainingModule {
  videos: ModuleVideo[];
  lessons: ModuleLesson[];
  quizzes: ModuleQuiz[];
  flashcards: Flashcard[];
}

export default function TrainingDetail() {
  const [, params] = useRoute("/egitim/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<ModuleLesson | null>(null);
  const [lessonFormData, setLessonFormData] = useState({ title: "", content: "", estimatedDuration: 15, orderIndex: 1 });
  const [isGeneratingMaterials, setIsGeneratingMaterials] = useState(false);

  const moduleId = params?.id ? parseInt(params.id) : 0;
  const isAdminOrCoach = user?.role === 'admin' || user?.role === 'coach';

  const { data: module, isLoading } = useQuery<TrainingModuleWithContent>({
    queryKey: ["/api/training/modules", moduleId],
    enabled: !!moduleId,
  });

  const { data: progress } = useQuery<UserTrainingProgress>({
    queryKey: ["/api/training/progress", moduleId],
    enabled: !!moduleId && !!user,
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/training/progress/${moduleId}`, "PUT", {
        status: "completed",
        progressPercentage: 100,
        completedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/progress", moduleId] });
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules"] });
      toast({ title: "Başarılı", description: "Modül tamamlandı olarak işaretlendi" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Yetkisiz",
          description: "Oturumunuz sonlandı. Tekrar giriş yapılıyor...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Hata",
        description: "Modül tamamlanamadı",
        variant: "destructive",
      });
    },
  });

  const toggleCardFlip = (cardId: number) => {
    setFlippedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const createLessonMutation = useMutation({
    mutationFn: async (data: typeof lessonFormData) => {
      await apiRequest(`/api/training/modules/${moduleId}/lessons`, "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules", moduleId] });
      toast({ title: "Başarılı", description: "Ders oluşturuldu" });
      setLessonDialogOpen(false);
      setLessonFormData({ title: "", content: "", estimatedDuration: 15, orderIndex: 1 });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Yetkisiz",
          description: "Oturumunuz sonlandı. Tekrar giriş yapılıyor...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ title: "Hata", description: "Ders oluşturulamadı", variant: "destructive" });
    },
  });

  const updateLessonMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<typeof lessonFormData> }) => {
      await apiRequest(`/api/training/lessons/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules", moduleId] });
      toast({ title: "Başarılı", description: "Ders güncellendi" });
      setLessonDialogOpen(false);
      setEditingLesson(null);
      setLessonFormData({ title: "", content: "", estimatedDuration: 15, orderIndex: 1 });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Yetkisiz",
          description: "Oturumunuz sonlandı. Tekrar giriş yapılıyor...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ title: "Hata", description: "Ders güncellenemedi", variant: "destructive" });
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/training/lessons/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules", moduleId] });
      toast({ title: "Başarılı", description: "Ders silindi" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Yetkisiz",
          description: "Oturumunuz sonlandı. Tekrar giriş yapılıyor...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ title: "Hata", description: "Ders silinemedi", variant: "destructive" });
    },
  });

  const generateMaterialsMutation = useMutation({
    mutationFn: async (lessonId: number) => {
      setIsGeneratingMaterials(true);
      return await apiRequest(`/api/training/lessons/${lessonId}/generate-materials`, "POST", {
        quizCount: 5,
        flashcardCount: 10,
      });
    },
    onSuccess: async (data: any) => {
      setIsGeneratingMaterials(false);
      await queryClient.invalidateQueries({ queryKey: ["/api/training/modules", moduleId] });
      await queryClient.refetchQueries({ queryKey: ["/api/training/modules", moduleId] });
      toast({ 
        title: "AI Materyal Oluşturuldu", 
        description: data.message || "Quiz soruları ve flashcard'lar hazır",
      });
    },
    onError: () => {
      setIsGeneratingMaterials(false);
      toast({ title: "Hata", description: "AI materyal oluşturulamadı", variant: "destructive" });
    },
  });

  const handleEditLesson = (lesson: ModuleLesson) => {
    setEditingLesson(lesson);
    setLessonFormData({
      title: lesson.title,
      content: lesson.content,
      estimatedDuration: lesson.estimatedDuration,
      orderIndex: lesson.orderIndex,
    });
    setLessonDialogOpen(true);
  };

  const handleSaveLesson = () => {
    if (editingLesson) {
      updateLessonMutation.mutate({ id: editingLesson.id, data: lessonFormData });
    } else {
      createLessonMutation.mutate(lessonFormData);
    }
  };

  const categoryLabels: Record<string, string> = {
    barista_basics: "Barista Temelleri",
    customer_service: "Müşteri Hizmetleri",
    equipment_training: "Ekipman Eğitimi",
    hygiene_safety: "Hijyen & Güvenlik",
    product_knowledge: "Ürün Bilgisi",
    management: "Yönetim",
  };

  const levelLabels: Record<string, string> = {
    beginner: "Başlangıç",
    intermediate: "Orta",
    advanced: "İleri",
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!module) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <BookOpen className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Modül bulunamadı</h2>
        <Button onClick={() => setLocation("/egitim")} data-testid="button-back">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Eğitimlere Dön
        </Button>
      </div>
    );
  }

  const isCompleted = progress?.status === "completed";
  const progressPercentage = progress?.progressPercentage || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setLocation("/egitim")}
            data-testid="button-back-to-list"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Geri
          </Button>
        </div>
        {!isCompleted && (
          <Button
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending}
            data-testid="button-complete-module"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Tamamla
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-3xl" data-testid="text-module-title">
                {module.title}
              </CardTitle>
              {module.description && (
                <CardDescription className="text-base" data-testid="text-module-description">
                  {module.description}
                </CardDescription>
              )}
            </div>
            {isCompleted && (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" data-testid="badge-completed">
                <Award className="mr-1 h-3 w-3" />
                Tamamlandı
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {module.category && (
              <Badge variant="outline" data-testid="badge-category">
                {categoryLabels[module.category] || module.category}
              </Badge>
            )}
            {module.level && (
              <Badge variant="outline" data-testid="badge-level">
                {levelLabels[module.level] || module.level}
              </Badge>
            )}
            {module.estimatedDuration && (
              <Badge variant="outline" data-testid="badge-duration">
                <Clock className="mr-1 h-3 w-3" />
                {module.estimatedDuration} dk
              </Badge>
            )}
          </div>

          {progress && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">İlerleme</span>
                <span className="font-medium" data-testid="text-progress-percentage">
                  {progressPercentage}%
                </span>
              </div>
              <Progress value={progressPercentage} data-testid="progress-bar" />
            </div>
          )}
        </CardHeader>
      </Card>

      <Tabs defaultValue="videos" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4" data-testid="tabs-list">
          <TabsTrigger value="videos" data-testid="tab-videos">
            <Video className="mr-2 h-4 w-4" />
            Videolar
          </TabsTrigger>
          <TabsTrigger value="lessons" data-testid="tab-lessons">
            <BookOpen className="mr-2 h-4 w-4" />
            Dersler
          </TabsTrigger>
          <TabsTrigger value="quiz" data-testid="tab-quiz">
            <Brain className="mr-2 h-4 w-4" />
            Quiz
          </TabsTrigger>
          <TabsTrigger value="flashcards" data-testid="tab-flashcards">
            <Award className="mr-2 h-4 w-4" />
            Flashcardlar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="space-y-4" data-testid="tab-content-videos">
          {module.videos && module.videos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {module.videos.map((video, index) => (
                <Card key={video.id} data-testid={`video-card-${video.id}`}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      {video.title}
                    </CardTitle>
                    {video.duration && (
                      <CardDescription>
                        Süre: {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {video.videoUrl.includes('youtube.com') || video.videoUrl.includes('youtu.be') ? (
                      <div className="aspect-video">
                        <iframe
                          src={video.videoUrl.replace('watch?v=', 'embed/')}
                          className="w-full h-full rounded"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          data-testid={`video-iframe-${video.id}`}
                        />
                      </div>
                    ) : (
                      <a
                        href={video.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-2"
                        data-testid={`video-link-${video.id}`}
                      >
                        <Play className="h-4 w-4" />
                        Videoyu İzle
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Bu modül için henüz video eklenmemiş</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="lessons" className="space-y-4" data-testid="tab-content-lessons">
          {isAdminOrCoach && (
            <div className="flex justify-end mb-4">
              <Button 
                onClick={() => {
                  setEditingLesson(null);
                  const nextOrder = (module.lessons?.length || 0) + 1;
                  setLessonFormData({ title: "", content: "", estimatedDuration: 15, orderIndex: nextOrder });
                  setLessonDialogOpen(true);
                }}
                data-testid="button-add-lesson"
              >
                <Plus className="mr-2 h-4 w-4" />
                Ders Ekle
              </Button>
            </div>
          )}

          {module.lessons && module.lessons.length > 0 ? (
            <div className="space-y-4">
              {module.lessons.map((lesson) => (
                <Card key={lesson.id} data-testid={`lesson-card-${lesson.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle>{lesson.title}</CardTitle>
                        <CardDescription>
                          <Clock className="inline-block mr-1 h-3 w-3" />
                          {lesson.estimatedDuration} dk
                        </CardDescription>
                      </div>
                      {isAdminOrCoach && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditLesson(lesson)}
                            data-testid={`button-edit-lesson-${lesson.id}`}
                          >
                            Düzenle
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm("Bu dersi silmek istediğinizden emin misiniz?")) {
                                deleteLessonMutation.mutate(lesson.id);
                              }
                            }}
                            data-testid={`button-delete-lesson-${lesson.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="prose dark:prose-invert max-w-none text-sm whitespace-pre-wrap">
                      {lesson.content}
                    </div>
                    {isAdminOrCoach && (
                      <Button
                        onClick={() => generateMaterialsMutation.mutate(lesson.id)}
                        disabled={isGeneratingMaterials}
                        variant="secondary"
                        className="w-full"
                        data-testid={`button-generate-materials-${lesson.id}`}
                      >
                        <Brain className="mr-2 h-4 w-4" />
                        {isGeneratingMaterials ? "AI Materyal Oluşturuluyor..." : "AI Materyal Oluştur (Quiz + Flashcard)"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Bu modül için henüz ders eklenmemiş</p>
                {isAdminOrCoach && (
                  <Button 
                    className="mt-4"
                    onClick={() => {
                      setEditingLesson(null);
                      const nextOrder = (module.lessons?.length || 0) + 1;
                      setLessonFormData({ title: "", content: "", estimatedDuration: 15, orderIndex: nextOrder });
                      setLessonDialogOpen(true);
                    }}
                    data-testid="button-add-first-lesson"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    İlk Dersi Ekle
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {lessonDialogOpen && isAdminOrCoach && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setLessonDialogOpen(false)} data-testid="lesson-dialog-backdrop">
              <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} data-testid="lesson-dialog-card">
                <CardHeader>
                  <CardTitle>{editingLesson ? "Dersi Düzenle" : "Yeni Ders Ekle"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Başlık</label>
                    <Input
                      value={lessonFormData.title}
                      onChange={(e) => setLessonFormData({ ...lessonFormData, title: e.target.value })}
                      placeholder="Ders başlığı"
                      data-testid="input-lesson-title"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">İçerik</label>
                    <Textarea
                      value={lessonFormData.content}
                      onChange={(e) => setLessonFormData({ ...lessonFormData, content: e.target.value })}
                      placeholder="Ders içeriğini buraya yazın..."
                      rows={12}
                      data-testid="input-lesson-content"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Tahmini Süre (dk)</label>
                      <Input
                        type="number"
                        value={lessonFormData.estimatedDuration}
                        onChange={(e) => setLessonFormData({ ...lessonFormData, estimatedDuration: parseInt(e.target.value) || 0 })}
                        data-testid="input-lesson-duration"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Sıra</label>
                      <Input
                        type="number"
                        value={lessonFormData.orderIndex}
                        onChange={(e) => setLessonFormData({ ...lessonFormData, orderIndex: parseInt(e.target.value) || 1 })}
                        data-testid="input-lesson-order"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setLessonDialogOpen(false);
                        setEditingLesson(null);
                        setLessonFormData({ title: "", content: "", estimatedDuration: 15, orderIndex: 1 });
                      }}
                      data-testid="button-cancel-lesson"
                    >
                      İptal
                    </Button>
                    <Button
                      onClick={handleSaveLesson}
                      disabled={!lessonFormData.title.trim() || !lessonFormData.content.trim()}
                      data-testid="button-save-lesson"
                    >
                      Kaydet
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="quiz" className="space-y-4" data-testid="tab-content-quiz">
          {module.quizzes && module.quizzes.length > 0 ? (
            <div className="space-y-4">
              {module.quizzes.map((quiz) => (
                <Card key={quiz.id} data-testid={`quiz-card-${quiz.id}`}>
                  <CardHeader>
                    <CardTitle>{quiz.title}</CardTitle>
                    {quiz.description && (
                      <CardDescription>{quiz.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      {quiz.passingScore && (
                        <span>Geçme Puanı: {quiz.passingScore}%</span>
                      )}
                      {quiz.timeLimit && (
                        <span>Süre: {quiz.timeLimit} dk</span>
                      )}
                    </div>
                    <Button className="w-full" data-testid={`button-start-quiz-${quiz.id}`}>
                      <Play className="mr-2 h-4 w-4" />
                      Quiz'e Başla
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Bu modül için henüz quiz eklenmemiş</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="flashcards" className="space-y-4" data-testid="tab-content-flashcards">
          {module.flashcards && module.flashcards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {module.flashcards.map((card) => (
                <Card
                  key={card.id}
                  className="cursor-pointer hover-elevate transition-all"
                  onClick={() => toggleCardFlip(card.id)}
                  data-testid={`flashcard-${card.id}`}
                >
                  <CardContent className="pt-6 min-h-48 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <p className="text-sm text-muted-foreground uppercase tracking-wide">
                        {flippedCards.has(card.id) ? "Cevap" : "Soru"}
                      </p>
                      <p className="text-lg font-medium">
                        {flippedCards.has(card.id) ? card.back : card.front}
                      </p>
                      {card.difficulty && !flippedCards.has(card.id) && (
                        <Badge variant="outline" className="mt-2">
                          {card.difficulty}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Bu modül için henüz flashcard eklenmemiş</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
