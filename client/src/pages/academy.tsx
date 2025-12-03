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
import { insertExamRequestSchema, type ExamRequest, isHQRole } from "@shared/schema";
import { BookOpen, Plus, Lightbulb, Trophy, BarChart3, Award, TrendingUp, Zap, Target, CheckCircle, Flame, Sparkles } from "lucide-react";
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
  const [activeHub, setActiveHub] = useState<"learning" | "achievements" | "analytics">("learning");

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

  // Get user badges
  const { data: userBadges = [] } = useQuery({
    queryKey: ["/api/academy/user-badges", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch("/api/academy/user-badges", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Get completed modules count
  const { data: completedStats } = useQuery({
    queryKey: ["/api/training/user-modules-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return { completedCount: 0, totalCount: 0 };
      const res = await fetch("/api/training/user-modules-stats", { credentials: "include" });
      if (!res.ok) return { completedCount: 0, totalCount: 0 };
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Get all training modules
  const { data: modules = [] } = useQuery({
    queryKey: ["/api/training/modules"],
    queryFn: async () => {
      const res = await fetch("/api/training/modules", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Get user module completion status
  const { data: completedModules = [] } = useQuery({
    queryKey: ["/api/training/user-progress", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch("/api/training/progress/" + user.id, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Helper: check if module is completed
  const isModuleCompleted = (moduleId: number) => {
    if (!Array.isArray(completedModules)) return false;
    return completedModules.some((m) => m.moduleId === moduleId && m.completedAt);
  };

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
    mutationFn: async (data) => {
      return apiRequest("POST", "/api/academy/exam-request", data);
    },
    onSuccess: () => {
      toast({ title: "Sınav talep gönderildi", description: "HQ tarafından incelenecek" });
      setIsExamDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/academy/exam-requests"] });
    },
    onError: (error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  // Current level display
  const currentLevel = CAREER_LEVELS.find(l => l.roleId === user?.role);
  const nextLevel = currentLevel ? CAREER_LEVELS[currentLevel.levelNumber] : null;
  const progressPercent = userProgress?.averageQuizScore || 0;

  return (
    <div className="min-h-screen pb-20">
      <div className="p-3 flex flex-col gap-3 sm:gap-4">

      {/* 3-Hub Navigation - MOVED TO TOP */}
      <div className="flex gap-2 mb-2 sticky top-0 bg-background z-10 pb-1 border-b">
        <Button
          onClick={() => setActiveHub("learning")}
          variant={activeHub === "learning" ? "default" : "outline"}
          className="flex-1"
          data-testid="button-hub-learning"
        >
          <BookOpen className="w-4 h-4 mr-2" />
          Öğrenme
        </Button>
        <Button
          onClick={() => setActiveHub("achievements")}
          variant={activeHub === "achievements" ? "default" : "outline"}
          className="flex-1"
          data-testid="button-hub-achievements"
        >
          <Trophy className="w-4 h-4 mr-2" />
          Başarılar
        </Button>
        <Button
          onClick={() => setActiveHub("analytics")}
          variant={activeHub === "analytics" ? "default" : "outline"}
          className="flex-1"
          data-testid="button-hub-analytics"
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Analitik
        </Button>
      </div>

      {/* Quick Stats Dashboard - COMPACT */}
      {!isHQRole(user?.role as any) && user?.role !== 'admin' && (
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-xs font-medium flex items-center gap-1">
              <Trophy className="w-3 h-3 text-yellow-600" />
              <span className="truncate">Rozetler</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-3">
            <div className="text-xl font-bold">{userBadges.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-xs font-medium flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-primary" />
              <span className="truncate">Modüller</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-3">
            <div className="text-xl font-bold">{completedStats?.completedCount || 0}/{completedStats?.totalCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-xs font-medium flex items-center gap-1">
              <Target className="w-3 h-3 text-success" />
              <span className="truncate">İlerleme</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-3">
            <div className="text-xl font-bold">{Math.round(progressPercent)}%</div>
          </CardContent>
        </Card>
      </div>
      )}

      {/* My Path Section - COMPACT */}
      {currentLevel && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Award className="w-4 h-4" />
                Benim Yolum
              </CardTitle>
              {nextLevel && user?.role === "supervisor" && (
                <Dialog open={isExamDialogOpen} onOpenChange={setIsExamDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="w-3 h-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Sınav Talep Formu</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit((data) => createExamMutation.mutate(data))} className="w-full space-y-2 sm:space-y-3">
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
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:gap-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">Mevcut: {currentLevel.titleTr}</span>
              <span className="text-muted-foreground">Seviye {currentLevel.levelNumber}/5</span>
            </div>
            {nextLevel && (
              <div className="w-full space-y-1 md:space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Sonraki: {nextLevel.titleTr}</span>
                  <span className="font-medium">{Math.round(progressPercent)}%</span>
                </div>
                <Progress value={progressPercent} className="h-1.5" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pending Exam Requests - COMPACT */}
      {user?.role === "supervisor" && examRequests.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Beklemede ({examRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="w-full space-y-1 md:space-y-1">
            {examRequests.map((req: ExamRequest) => (
              <div key={req.id} className="flex items-center justify-between p-2 text-xs border-b last:border-0">
                <span className="font-medium truncate">{req.userId}</span>
                <Badge variant="outline" className="text-xs">{req.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Learning Hub */}
      {activeHub === "learning" && (
        <div className="flex flex-col gap-3 sm:gap-4">
          {modules.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Modüller
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {modules.map((module) => {
                    const completed = isModuleCompleted(module.id);
                    return (
                      <Link 
                        key={module.id} 
                        to={`/akademi-modul/${module.id}`} 
                        data-testid={`link-module-${module.id}`}
                        onClick={() => sessionStorage.setItem('academyReferrer', '/akademi')}
                      >
                        <Card className={`cursor-pointer hover-elevate h-full flex flex-col ${completed ? 'border-success dark:border-green-600' : ''}`} data-testid={`card-module-${module.id}`}>
                          <CardHeader className="pb-2 pt-2 px-2 flex-1">
                            <div className="flex items-start gap-1 mb-2">
                              <CardTitle className="text-xs font-semibold line-clamp-2 flex-1 leading-tight">{module.title}</CardTitle>
                              {completed && (
                                <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-wrap">
                              <Badge variant="outline" className="text-xs px-1 py-0">
                                {module.level === 'beginner' ? 'B' : module.level === 'intermediate' ? 'O' : 'İ'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{module.estimatedDuration}dk</span>
                            </div>
                          </CardHeader>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {recommendedQuizzes.length > 0 && (
            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-primary dark:text-blue-400" />
                  Önerilen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3 sm:gap-4">
                  <div className="flex flex-col gap-3 sm:gap-4 gap-2">
                    {recommendedQuizzes.map((quiz) => {
                      const diffColor = quiz.difficulty === 'easy' ? 'bg-green-100 dark:bg-success/5 text-green-800 dark:text-green-200' 
                        : quiz.difficulty === 'hard' ? 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200'
                        : 'bg-warning/20 dark:bg-warning/5 text-yellow-800 dark:text-warning';
                      
                      const diffLabel = quiz.difficulty === 'easy' ? 'Kolay' 
                        : quiz.difficulty === 'hard' ? 'Zor' : 'Orta';

                      return (
                        <Link key={quiz.id} to={`/akademi-quiz/${quiz.quizId}`}>
                          <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border hover:border-blue-500 transition cursor-pointer" data-testid={`quiz-card-${quiz.quizId}`}>
                            <div className="flex items-start justify-between mb-1">
                              <p className="font-medium text-xs line-clamp-1 flex-1">{quiz.titleTr}</p>
                              <Badge className={`text-xs ml-1 ${diffColor}`}>{diffLabel}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1">{quiz.descriptionTr}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs">{quiz.estimatedMinutes}dk</span>
                              <span className="text-xs font-medium text-primary dark:text-blue-400">→</span>
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
          {recommendedQuizzes.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Şu anda önerilecek sınav bulunmuyor. Daha sonra tekrar deneyin.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Achievements Hub - COMPACT */}
      {activeHub === "achievements" && (
        <div className="w-full space-y-2 sm:space-y-3">
          <Link to="/akademi-streak-tracker" data-testid="link-streak-tracker">
            <Card className="cursor-pointer hover-elevate" data-testid="card-streak-tracker">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  Öğrenme Serisi
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs">
                <p className="text-muted-foreground">Ardışık gün takibi</p>
              </CardContent>
            </Card>
          </Link>
          
          <Link to="/akademi-rozet-koleksiyonum" data-testid="link-badges">
            <Card className="cursor-pointer hover-elevate" data-testid="card-badges">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Rozetler
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs">
                <p className="text-muted-foreground">5 rozet seviyesi</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {/* Analytics Hub - COMPACT */}
      {activeHub === "analytics" && (
        <div className="w-full space-y-2 sm:space-y-3">
          <Link to="/akademi-adaptive-engine" data-testid="link-adaptive-engine">
            <Card className="cursor-pointer hover-elevate" data-testid="card-adaptive-engine">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="w-4 h-4 text-destructive" />
                  Adaptif Motor
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">AI önerileri</CardContent>
            </Card>
          </Link>

          <Link to="/akademi-ai-assistant" data-testid="link-ai-assistant">
            <Card className="cursor-pointer hover-elevate" data-testid="card-ai-assistant">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  AI Asistan
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">Sorularınızı sor</CardContent>
            </Card>
          </Link>

          <Link to="/akademi-progress-overview" data-testid="link-progress-overview">
            <Card className="cursor-pointer hover-elevate" data-testid="card-progress-overview">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  İlerleme Özeti
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">Tüm başarılar</CardContent>
            </Card>
          </Link>

          <Link to="/akademi-advanced-analytics" data-testid="link-advanced-analytics">
            <Card className="cursor-pointer hover-elevate" data-testid="card-advanced-analytics">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-600" />
                  İleri Analitikler
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">Detaylı analiz</CardContent>
            </Card>
          </Link>

          <Link to="/akademi-branch-analytics" data-testid="link-branch-analytics">
            <Card className="cursor-pointer hover-elevate" data-testid="card-branch-analytics">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-600" />
                  Şube Analitikleri
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">Şube performansı</CardContent>
            </Card>
          </Link>

          <Link to="/akademi-cohort-analytics" data-testid="link-cohort-analytics">
            <Card className="cursor-pointer hover-elevate" data-testid="card-cohort-analytics">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-600" />
                  Kohort Analitikleri
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">Takım performansı</CardContent>
            </Card>
          </Link>
        </div>
      )}
      </div>
    </div>
  );
}
