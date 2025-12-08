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
import { 
  BookOpen, Plus, Lightbulb, Trophy, BarChart3, Award, TrendingUp, Zap, Target, 
  CheckCircle, Flame, Sparkles, Coffee, GraduationCap, Brain, ChevronRight,
  Snowflake, IceCream, Citrus, Droplets, Leaf, Package, CircleDot, Flower2,
  Clock, Star, Users, ArrowLeft
} from "lucide-react";
import { Link } from "wouter";

const CAREER_LEVELS = [
  { id: 1, roleId: "stajyer", titleTr: "Stajyer", levelNumber: 1 },
  { id: 2, roleId: "bar_buddy", titleTr: "Bar Buddy", levelNumber: 2 },
  { id: 3, roleId: "barista", titleTr: "Barista", levelNumber: 3 },
  { id: 4, roleId: "supervisor_buddy", titleTr: "Supervisor Buddy", levelNumber: 4 },
  { id: 5, roleId: "supervisor", titleTr: "Supervisor", levelNumber: 5 },
];

type HubCategory = {
  id: number;
  slug: string;
  titleTr: string;
  iconName: string;
  colorHex: string;
  description?: string;
};

type RecipeCategory = {
  id: number;
  slug: string;
  titleTr: string;
  titleEn?: string;
  iconName: string;
  colorHex: string;
  description?: string;
  displayOrder: number;
};

type Recipe = {
  id: number;
  categoryId: number;
  nameTr: string;
  nameEn?: string;
  code: string;
  estimatedMinutes: number;
  difficulty: string;
  isActive: boolean;
};

const ICON_MAP: Record<string, any> = {
  Target, Coffee, BookOpen, Brain, GraduationCap,
  Snowflake, IceCream, Citrus, Droplets, Leaf, Package, CircleDot, Flower2,
  Trophy, Flame, Star, Zap, CheckCircle
};

const getIcon = (iconName: string) => ICON_MAP[iconName] || Coffee;

export default function Academy() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isExamDialogOpen, setIsExamDialogOpen] = useState(false);
  const [activeView, setActiveView] = useState<"hub" | "recipes" | "career" | "modules" | "practice">("hub");
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory | null>(null);

  // Get hub categories
  const { data: hubCategories = [] } = useQuery({
    queryKey: ["/api/academy/hub-categories"],
    queryFn: async () => {
      const res = await fetch("/api/academy/hub-categories", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Get recipe categories
  const { data: recipeCategories = [] } = useQuery({
    queryKey: ["/api/academy/recipe-categories"],
    queryFn: async () => {
      const res = await fetch("/api/academy/recipe-categories", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Get recipes for selected category
  const { data: categoryRecipes = [] } = useQuery({
    queryKey: ["/api/academy/recipes", selectedCategory?.id],
    queryFn: async () => {
      if (!selectedCategory?.id) return [];
      const res = await fetch(`/api/academy/recipes?categoryId=${selectedCategory.id}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedCategory?.id,
  });

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

  // Get all training modules
  const { data: modules = [] } = useQuery({
    queryKey: ["/api/training/modules"],
    queryFn: async () => {
      const res = await fetch("/api/training/modules", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
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

  // Get recommended quizzes
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

  // Get daily missions
  const { data: dailyMissions = [] } = useQuery({
    queryKey: ["/api/academy/daily-missions"],
    queryFn: async () => {
      const res = await fetch("/api/academy/daily-missions", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const isModuleCompleted = (moduleId: number) => {
    if (!Array.isArray(completedModules)) return false;
    return completedModules.some((m: any) => m.moduleId === moduleId && m.completedAt);
  };

  const currentLevel = CAREER_LEVELS.find(l => l.roleId === user?.role);
  const nextLevel = currentLevel ? CAREER_LEVELS[currentLevel.levelNumber] : null;
  const progressPercent = userProgress?.averageQuizScore || 0;

  // Hub Card Component
  const HubCard = ({ icon: Icon, title, description, color, onClick, badge }: {
    icon: any; title: string; description?: string; color: string; onClick: () => void; badge?: string | number;
  }) => (
    <Card 
      className="cursor-pointer hover-elevate transition-all border-2"
      style={{ borderColor: `${color}20` }}
      onClick={onClick}
      data-testid={`hub-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-sm truncate">{title}</h3>
            {badge && (
              <Badge variant="secondary" className="text-xs flex-shrink-0">{badge}</Badge>
            )}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{description}</p>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </CardContent>
    </Card>
  );

  // Recipe Category Card
  const RecipeCategoryCard = ({ category }: { category: RecipeCategory }) => {
    const Icon = getIcon(category.iconName);
    return (
      <Card 
        className="cursor-pointer hover-elevate"
        onClick={() => { setSelectedCategory(category); setActiveView("recipes"); }}
        data-testid={`recipe-category-${category.slug}`}
      >
        <CardContent className="p-3 flex flex-col items-center text-center gap-2">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${category.colorHex || '#8B4513'}15` }}
          >
            <Icon className="w-5 h-5" style={{ color: category.colorHex || '#8B4513' }} />
          </div>
          <span className="text-xs font-medium line-clamp-1">{category.titleTr}</span>
        </CardContent>
      </Card>
    );
  };

  // Back button for sub-views
  const BackButton = () => (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={() => { setActiveView("hub"); setSelectedCategory(null); }}
      className="mb-3"
      data-testid="button-back"
    >
      <ArrowLeft className="w-4 h-4 mr-1" />
      Geri
    </Button>
  );

  return (
    <div className="min-h-screen pb-20">
      <div className="p-3 flex flex-col gap-3 sm:gap-4">

        {/* Main Hub View */}
        {activeView === "hub" && (
          <>
            {/* User Stats Header - Compact */}
            {!isHQRole(user?.role as any) && user?.role !== 'admin' && (
              <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-bold text-sm">DOSPRESSO Akademi</h2>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1 text-xs">
                          <Trophy className="w-3 h-3 text-warning" />
                          <span>{userBadges.length} Rozet</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <BookOpen className="w-3 h-3 text-primary" />
                          <span>{completedStats?.completedCount || 0}/{completedStats?.totalCount || 0}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <Flame className="w-3 h-3 text-orange-500" />
                          <span>{userProgress?.streakDays || 0} Gün</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Hub Categories Grid */}
            <div className="grid grid-cols-1 gap-2">
              <HubCard
                icon={Target}
                title="Kariyer Yolculuğum"
                description={currentLevel ? `Mevcut: ${currentLevel.titleTr}` : "Kariyer yolculuğuna başla"}
                color="#1e3a5f"
                onClick={() => setActiveView("career")}
                badge={currentLevel?.levelNumber ? `Lvl ${currentLevel.levelNumber}` : undefined}
              />
              <HubCard
                icon={Coffee}
                title="Reçete Akademisi"
                description={`${recipeCategories.length} kategori, 120+ reçete`}
                color="#8B4513"
                onClick={() => setActiveView("recipes")}
              />
              <HubCard
                icon={BookOpen}
                title="Genel Eğitimler"
                description={`${modules.length} modül`}
                color="#228B22"
                onClick={() => setActiveView("modules")}
                badge={completedStats?.completedCount || 0}
              />
              <HubCard
                icon={Brain}
                title="Sürekli Pratik"
                description="Quizler ve günlük görevler"
                color="#4169E1"
                onClick={() => setActiveView("practice")}
              />
            </div>

            {/* Daily Missions Preview */}
            {dailyMissions.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4 text-warning" />
                    Günlük Görevler
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dailyMissions.slice(0, 3).map((mission: any) => (
                    <div key={mission.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs">{mission.title_tr}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">+{mission.xp_reward} XP</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Recipe Categories View */}
        {activeView === "recipes" && !selectedCategory && (
          <>
            <BackButton />
            <Card className="bg-gradient-to-r from-amber-900/10 to-amber-800/5 border-amber-900/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Coffee className="w-8 h-8 text-amber-800" />
                  <div>
                    <h2 className="font-bold">Reçete Akademisi</h2>
                    <p className="text-xs text-muted-foreground">120+ reçete, 10 kategori</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {recipeCategories.map((cat: RecipeCategory) => (
                <RecipeCategoryCard key={cat.id} category={cat} />
              ))}
            </div>
          </>
        )}

        {/* Recipe List for Selected Category */}
        {activeView === "recipes" && selectedCategory && (
          <>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSelectedCategory(null)}
              className="mb-3"
              data-testid="button-back-recipes"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Kategoriler
            </Button>
            <Card style={{ borderColor: `${selectedCategory.colorHex}30` }} className="border-2">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {(() => { const Icon = getIcon(selectedCategory.iconName); return <Icon className="w-6 h-6" style={{ color: selectedCategory.colorHex }} />; })()}
                  <div>
                    <h2 className="font-bold">{selectedCategory.titleTr}</h2>
                    <p className="text-xs text-muted-foreground">{categoryRecipes.length} reçete</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categoryRecipes.map((recipe: Recipe) => (
                <Link key={recipe.id} to={`/recete/${recipe.id}`}>
                  <Card className="cursor-pointer hover-elevate" data-testid={`recipe-${recipe.id}`}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Coffee className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{recipe.nameTr}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-xs">{recipe.code}</Badge>
                          <span className="text-xs text-muted-foreground">{recipe.estimatedMinutes}dk</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {categoryRecipes.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  Bu kategoride henüz reçete yok
                </div>
              )}
            </div>
          </>
        )}

        {/* Career Journey View */}
        {activeView === "career" && (
          <>
            <BackButton />
            <Card className="bg-gradient-to-r from-primary/10 to-blue-900/10 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Target className="w-8 h-8 text-primary" />
                  <div>
                    <h2 className="font-bold">Kariyer Yolculuğum</h2>
                    <p className="text-xs text-muted-foreground">Rol bazlı gelişim takibi</p>
                  </div>
                </div>
                {currentLevel && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{currentLevel.titleTr}</span>
                      <span className="text-muted-foreground">Seviye {currentLevel.levelNumber}/5</span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>%{Math.round(progressPercent)} tamamlandı</span>
                      {nextLevel && <span>Sonraki: {nextLevel.titleTr}</span>}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Career Levels */}
            <div className="space-y-2">
              {CAREER_LEVELS.map((level, idx) => {
                const isCompleted = currentLevel && level.levelNumber < currentLevel.levelNumber;
                const isCurrent = currentLevel?.levelNumber === level.levelNumber;
                return (
                  <Card 
                    key={level.id} 
                    className={`${isCurrent ? 'border-primary' : ''} ${isCompleted ? 'bg-muted/50' : ''}`}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        isCompleted ? 'bg-green-500 text-white' : 
                        isCurrent ? 'bg-primary text-primary-foreground' : 
                        'bg-muted text-muted-foreground'
                      }`}>
                        {isCompleted ? <CheckCircle className="w-4 h-4" /> : level.levelNumber}
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-medium text-sm ${isCompleted ? 'text-muted-foreground' : ''}`}>
                          {level.titleTr}
                        </h3>
                      </div>
                      {isCurrent && <Badge>Şu An</Badge>}
                      {isCompleted && <Badge variant="secondary">Tamamlandı</Badge>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {/* General Modules View */}
        {activeView === "modules" && (
          <>
            <BackButton />
            <Card className="bg-gradient-to-r from-green-900/10 to-green-800/5 border-green-900/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-8 h-8 text-green-700" />
                  <div>
                    <h2 className="font-bold">Genel Eğitimler</h2>
                    <p className="text-xs text-muted-foreground">{modules.length} modül mevcut</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {modules.map((module: { id: number; title: string; level: string; estimatedDuration: number }) => {
                const completed = isModuleCompleted(module.id);
                return (
                  <Link 
                    key={module.id} 
                    to={`/akademi-modul/${module.id}`}
                    onClick={() => sessionStorage.setItem('academyReferrer', '/akademi')}
                  >
                    <Card className={`cursor-pointer hover-elevate h-full ${completed ? 'border-green-500' : ''}`} data-testid={`card-module-${module.id}`}>
                      <CardContent className="p-3">
                        <div className="flex items-start gap-1 mb-2">
                          <h3 className="text-xs font-semibold line-clamp-2 flex-1">{module.title}</h3>
                          {completed && <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />}
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            {module.level === 'beginner' ? 'B' : module.level === 'intermediate' ? 'O' : 'İ'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{module.estimatedDuration}dk</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {/* Practice View */}
        {activeView === "practice" && (
          <>
            <BackButton />
            <Card className="bg-gradient-to-r from-blue-900/10 to-indigo-900/10 border-blue-900/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Brain className="w-8 h-8 text-blue-600" />
                  <div>
                    <h2 className="font-bold">Sürekli Pratik</h2>
                    <p className="text-xs text-muted-foreground">Quizler ve günlük görevler</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Daily Missions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-warning" />
                  Günlük Görevler
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dailyMissions.map((mission: any) => (
                  <div key={mission.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{mission.title_tr}</p>
                        <p className="text-xs text-muted-foreground">{mission.description_tr}</p>
                      </div>
                    </div>
                    <Badge className="bg-warning/20 text-warning">+{mission.xp_reward} XP</Badge>
                  </div>
                ))}
                {dailyMissions.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    Henüz günlük görev yok
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recommended Quizzes */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  Önerilen Quizler
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recommendedQuizzes.map((quiz: { id: number; title_tr: string; description_tr: string; difficulty: string; estimated_minutes: number }) => (
                  <Link key={quiz.id} to={`/akademi-quiz/${quiz.id}`}>
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border hover:border-primary transition cursor-pointer" data-testid={`quiz-card-${quiz.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{quiz.title_tr}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{quiz.description_tr}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{quiz.estimated_minutes}dk</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
                {recommendedQuizzes.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    Şu anda önerilecek quiz yok
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

      </div>
    </div>
  );
}
