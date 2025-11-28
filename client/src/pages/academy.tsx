import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertExamRequestSchema, type ExamRequest } from "@shared/schema";
import { Award, TrendingUp, BookOpen, Plus, Zap, BarChart3, Target, Zap as Leaderboard, Lightbulb, Flame, Trophy, Bookmark, Brain, Shield, Users, TrendingUp as Analytics } from "lucide-react";
import { Link } from "wouter";

const CAREER_LEVELS = [
  { id: 1, roleId: "stajyer", titleTr: "Stajyer", levelNumber: 1 },
  { id: 2, roleId: "bar_buddy", titleTr: "Bar Buddy", levelNumber: 2 },
  { id: 3, roleId: "barista", titleTr: "Barista", levelNumber: 3 },
  { id: 4, roleId: "supervisor_buddy", titleTr: "Supervisor Buddy", levelNumber: 4 },
  { id: 5, roleId: "supervisor", titleTr: "Supervisor", levelNumber: 5 },
];

export default function Academy() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isExamDialogOpen, setIsExamDialogOpen] = useState(false);

  // Get career levels
  const { data: careerLevels = [] } = useQuery({
    queryKey: ["/api/academy/career-levels"],
    queryFn: async () => {
      const res = await fetch("/api/academy/career-levels", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Get user career progress
  const { data: userProgress } = useQuery({
    queryKey: ["/api/academy/career-progress", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/academy/career-progress/${user.id}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Get exam requests for supervisor view
  const { data: examRequests = [] } = useQuery({
    queryKey: ["/api/academy/exam-requests", user?.id],
    queryFn: async () => {
      if (user?.role !== "supervisor") return [];
      const res = await fetch(`/api/academy/exam-requests?status=pending`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: user?.role === "supervisor",
  });

  // Get recommended quizzes for user
  const { data: recommendedQuizzes = [] } = useQuery({
    queryKey: ["/api/academy/recommended-quizzes", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch("/api/academy/recommended-quizzes", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Exam request form
  const form = useForm({
    resolver: zodResolver(insertExamRequestSchema),
    defaultValues: {
      userId: "",
      targetRoleId: "bar_buddy",
      supervisorId: user?.id || "",
      supervisorNotes: "",
      status: "pending",
    },
  });

  const createExamMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/academy/exam-request", data);
    },
    onSuccess: () => {
      toast({ title: "Sınav talep gönderildi", description: "HQ tarafından incelenecek" });
      setIsExamDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/academy/exam-requests"] });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  // Current level display
  const currentLevel = CAREER_LEVELS.find(l => l.roleId === user?.role);
  const nextLevel = currentLevel ? CAREER_LEVELS[currentLevel.levelNumber] : null;
  const progressPercent = userProgress?.averageQuizScore || 0;

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">DOSPRESSO Academy</h1>
        <p className="text-muted-foreground mt-2">Kariyer yolunuzu takip edin ve ilerleyin</p>
      </div>

      {/* My Path Section */}
      {currentLevel && (
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Benim Yolum
                </CardTitle>
                <CardDescription>Kariyer ilerlemesi ve sonraki hedefler</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Level */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Mevcut Seviye</span>
                <Badge variant="default">{currentLevel.titleTr}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Seviye {currentLevel.levelNumber}/5</p>
            </div>

            {/* Progress to Next Level */}
            {nextLevel && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sonraki Seviyeye İlerleme</span>
                  <span className="text-sm text-muted-foreground">{Math.round(progressPercent)}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                <p className="text-xs text-muted-foreground">Hedef: {nextLevel.titleTr}</p>
              </div>
            )}

            {/* Career Path */}
            <div className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">Kariyer Yolu</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {CAREER_LEVELS.map((level, idx) => (
                  <div key={level.id} className="flex items-center gap-2">
                    <Badge 
                      variant={level.levelNumber <= currentLevel.levelNumber ? "default" : "outline"}
                      className="whitespace-nowrap"
                    >
                      {level.titleTr}
                    </Badge>
                    {idx < CAREER_LEVELS.length - 1 && <span className="text-muted-foreground">→</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Next Module */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span className="text-sm font-medium">Sonraki Modül</span>
                </div>
                {nextLevel && user?.role === "supervisor" && (
                  <Dialog open={isExamDialogOpen} onOpenChange={setIsExamDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus className="w-3 h-3 mr-1" />
                        Sınav Talep Et
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Sınav Talep Formu</DialogTitle>
                      </DialogHeader>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit((data) => createExamMutation.mutate(data))} className="space-y-4">
                          <FormField
                            control={form.control}
                            name="userId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Çalışan ID</FormLabel>
                                <FormControl>
                                  <input {...field} type="text" placeholder="user-id" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="targetRoleId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Hedef Rol</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {CAREER_LEVELS.slice(1).map(level => (
                                      <SelectItem key={level.roleId} value={level.roleId}>
                                        {level.titleTr}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="supervisorNotes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Notlar</FormLabel>
                                <FormControl>
                                  <Textarea {...field} placeholder="Sınav hakkında notlarınız..." />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button type="submit" disabled={createExamMutation.isPending} className="w-full">
                            {createExamMutation.isPending ? "Gönderiliyor..." : "Talep Gönder"}
                          </Button>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2">Modül içeriği yakında yüklenecek</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Exam Requests for Supervisors */}
      {user?.role === "supervisor" && examRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Beklemede Olan Sınav Talepleri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {examRequests.map((req: ExamRequest) => (
                <div key={req.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{req.userId}</p>
                    <p className="text-xs text-muted-foreground">→ {req.targetRoleId}</p>
                  </div>
                  <Badge variant="outline">{req.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommended Quizzes with Difficulty Progression */}
      {recommendedQuizzes.length > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Senin İçin Önerilen Sınavlar
            </CardTitle>
            <CardDescription>Kolaydan zora doğru ilerle: Kolay → Orta → Zor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Difficulty Progression Indicator */}
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <span className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full"></span>
                  Kolay
                </span>
                <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                  <span className="w-2 h-2 bg-yellow-600 dark:bg-yellow-400 rounded-full"></span>
                  Orta
                </span>
                <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                  <span className="w-2 h-2 bg-red-600 dark:bg-red-400 rounded-full"></span>
                  Zor
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {recommendedQuizzes.map((quiz: any) => {
                  const diffColor = quiz.difficulty === 'easy' ? 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200' 
                    : quiz.difficulty === 'hard' ? 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200'
                    : 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200';
                  
                  const diffLabel = quiz.difficulty === 'easy' ? 'Kolay' 
                    : quiz.difficulty === 'hard' ? 'Zor' : 'Orta';

                  return (
                    <Link key={quiz.id} to={`/akademi-quiz/${quiz.quizId}`}>
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border hover:border-blue-500 transition cursor-pointer" data-testid={`quiz-card-${quiz.quizId}`}>
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-sm flex-1">{quiz.titleTr}</p>
                          <Badge className={`text-xs ml-2 ${diffColor}`}>{diffLabel}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{quiz.descriptionTr}</p>
                        <div className="flex items-center justify-between mt-2">
                          <Badge variant="outline" className="text-xs">{quiz.estimatedMinutes} dk</Badge>
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Başla →</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links to Analytics & Badges */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/akademi-analytics">
          <Card className="cursor-pointer hover-elevate">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Analitikler
              </CardTitle>
              <CardDescription>Performans istatistikleri</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/akademi-badges">
          <Card className="cursor-pointer hover-elevate">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-5 h-5" />
                Rozetler
              </CardTitle>
              <CardDescription>Kazanılan başarılar</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/akademi-leaderboard">
          <Card className="cursor-pointer hover-elevate">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="w-5 h-5" />
                Liderlik
              </CardTitle>
              <CardDescription>En iyi performanslar</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/akademi-branch-analytics">
          <Card className="cursor-pointer hover-elevate">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Şube Analizi
              </CardTitle>
              <CardDescription>Şubeler arası karşılaştırma</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/akademi-team-competitions">
          <Card className="cursor-pointer hover-elevate">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Takım Yarışmaları
              </CardTitle>
              <CardDescription>Şubeler arası rekabet</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/akademi-certificates">
          <Card className="cursor-pointer hover-elevate">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bookmark className="w-5 h-5" />
                Sertifikalar
              </CardTitle>
              <CardDescription>Kazanılan belgeler</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/akademi-learning-paths">
          <Card className="cursor-pointer hover-elevate">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI Öğrenme Yolları
              </CardTitle>
              <CardDescription>Kişiselleştirilmiş rotalar</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/akademi-cohort-analytics">
          <Card className="cursor-pointer hover-elevate">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Kohort Analizi
              </CardTitle>
              <CardDescription>HQ leadership insights</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/akademi-achievements">
          <Card className="cursor-pointer hover-elevate">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Başarılar
              </CardTitle>
              <CardDescription>Mileleri açarak başarı kazan</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/akademi-progress-overview">
          <Card className="cursor-pointer hover-elevate">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                İlerleme Özeti
              </CardTitle>
              <CardDescription>Genel ilerlemeni izle</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/akademi-streak-tracker">
          <Card className="cursor-pointer hover-elevate">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Flame className="w-5 h-5" />
                Öğrenme Serisi
              </CardTitle>
              <CardDescription>Günlük tutarlılık rozetleri</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/akademi-ai-assistant">
          <Card className="cursor-pointer hover-elevate">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                AI Asistan
              </CardTitle>
              <CardDescription>Yapay zeka tutor yardımı</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/akademi-adaptive-engine">
          <Card className="cursor-pointer hover-elevate">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Uyarlanabilir Motor
              </CardTitle>
              <CardDescription>AI önerilen yollar</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/akademi-social-groups">
          <Card className="cursor-pointer hover-elevate">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-5 h-5" />
                Sosyal İşbirliği
              </CardTitle>
              <CardDescription>Çalışma grupları ve mentörlük</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/akademi-advanced-analytics">
          <Card className="cursor-pointer hover-elevate">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Analytics className="w-5 h-5" />
                İleri Analitikler
              </CardTitle>
              <CardDescription>Detaylı performans analizi</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
