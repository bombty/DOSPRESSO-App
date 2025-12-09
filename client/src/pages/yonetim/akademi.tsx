import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole, type UserRoleType } from "@shared/schema";
import { 
  AlertCircle, Plus, Pencil, Trash2, ChevronRight, Target, Coffee, BookOpen, 
  Brain, GraduationCap, Trophy, Flame, Star, Zap, CheckCircle, Users, 
  BarChart3, Settings, Award, TrendingUp, Clock, Eye, ArrowLeft,
  Snowflake, IceCream, Citrus, Droplets, Leaf, Package, CircleDot, Flower2
} from "lucide-react";

type HubCategory = {
  id: number;
  slug: string;
  titleTr: string;
  iconName: string;
  colorHex: string;
  description?: string;
  displayOrder: number;
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

type TrainingModule = {
  id: number;
  title: string;
  level: string;
  estimatedDuration: number;
  category?: string;
  isActive: boolean;
};

type Quiz = {
  id: number;
  title: string;
  description?: string;
  passingScore: number;
  timeLimit?: number;
  isActive: boolean;
  questionCount?: number;
};

type Recipe = {
  id: number;
  code: string;
  nameTr: string;
  nameEn?: string;
  description?: string;
  coffeeType?: string;
  difficulty?: string;
  estimatedMinutes?: number;
  categoryId?: number;
  photoUrl?: string;
  isActive: boolean;
  tags?: string[];
};

const ICON_MAP: Record<string, any> = {
  Target, Coffee, BookOpen, Brain, GraduationCap, Trophy, Flame, Star, Zap, CheckCircle,
  Snowflake, IceCream, Citrus, Droplets, Leaf, Package, CircleDot, Flower2,
  BarChart3, Settings, Award, TrendingUp, Users
};

const getIcon = (iconName: string) => ICON_MAP[iconName] || Coffee;

const AVAILABLE_ICONS = [
  { name: "Target", label: "Hedef" },
  { name: "Coffee", label: "Kahve" },
  { name: "BookOpen", label: "Kitap" },
  { name: "Brain", label: "Beyin" },
  { name: "GraduationCap", label: "Mezuniyet" },
  { name: "Trophy", label: "Kupa" },
  { name: "Flame", label: "Alev" },
  { name: "Star", label: "Yıldız" },
  { name: "Zap", label: "Şimşek" },
  { name: "Snowflake", label: "Kar Tanesi" },
  { name: "IceCream", label: "Dondurma" },
  { name: "Citrus", label: "Narenciye" },
  { name: "Droplets", label: "Damla" },
  { name: "Leaf", label: "Yaprak" },
];

const PRESET_COLORS = [
  "#1e3a5f", "#dc2626", "#16a34a", "#ca8a04", "#9333ea", 
  "#0891b2", "#db2777", "#ea580c", "#059669", "#6366f1"
];

export default function AdminAcademy() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<RecipeCategory | null>(null);
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<TrainingModule | null>(null);
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  if (!user || !isHQRole(user.role as UserRoleType)) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h3 className="font-semibold text-lg mt-2">Yetkisiz Erişim</h3>
            <p className="text-muted-foreground">Bu sayfaya erişim yetkiniz yok.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { data: hubCategories = [] } = useQuery<HubCategory[]>({
    queryKey: ["/api/academy/hub-categories"],
  });

  const { data: recipeCategories = [] } = useQuery<RecipeCategory[]>({
    queryKey: ["/api/academy/recipe-categories"],
  });

  const { data: modules = [] } = useQuery<TrainingModule[]>({
    queryKey: ["/api/training/modules"],
  });

  const { data: quizzes = [] } = useQuery<Quiz[]>({
    queryKey: ["/api/academy/quizzes"],
  });

  const { data: quizStats } = useQuery({
    queryKey: ["/api/academy/quiz-stats"],
    queryFn: async () => {
      const res = await fetch("/api/academy/quiz-stats", { credentials: "include" });
      if (!res.ok) return { totalAttempts: 0, passRate: 0 };
      return res.json();
    },
  });

  const { data: recipes = [] } = useQuery<Recipe[]>({
    queryKey: ["/api/academy/recipes"],
  });

  const activeModules = modules.filter((m: any) => m.isActive !== false);
  const activeQuizzes = quizzes.filter((q: any) => q.isActive !== false);

  return (
    <div className="w-full space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Akademi Yönetimi
              </CardTitle>
              <CardDescription>DOSPRESSO Akademi içeriklerini yönetin</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-auto gap-1 p-1">
          <TabsTrigger value="overview" className="text-xs sm:text-sm" data-testid="tab-overview">
            <BarChart3 className="w-4 h-4 mr-1" />
            Genel Bakış
          </TabsTrigger>
          <TabsTrigger value="recipes" className="text-xs sm:text-sm" data-testid="tab-recipes">
            <Coffee className="w-4 h-4 mr-1" />
            Reçeteler
          </TabsTrigger>
          <TabsTrigger value="categories" className="text-xs sm:text-sm" data-testid="tab-categories">
            <Package className="w-4 h-4 mr-1" />
            Kategoriler
          </TabsTrigger>
          <TabsTrigger value="modules" className="text-xs sm:text-sm" data-testid="tab-modules">
            <BookOpen className="w-4 h-4 mr-1" />
            Modüller
          </TabsTrigger>
          <TabsTrigger value="quizzes" className="text-xs sm:text-sm" data-testid="tab-quizzes">
            <Brain className="w-4 h-4 mr-1" />
            Quizler
          </TabsTrigger>
          <TabsTrigger value="gamification" className="text-xs sm:text-sm" data-testid="tab-gamification">
            <Trophy className="w-4 h-4 mr-1" />
            Oyunlaştırma
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <OverviewTab 
            hubCategories={hubCategories}
            recipeCategories={recipeCategories}
            modules={activeModules}
            quizzes={activeQuizzes}
            quizStats={quizStats}
          />
        </TabsContent>

        <TabsContent value="recipes" className="space-y-4 mt-4">
          <RecipesTab 
            recipes={recipes}
            recipeCategories={recipeCategories}
            onEdit={(rec) => { setEditingRecipe(rec); setRecipeDialogOpen(true); }}
            onAdd={() => { setEditingRecipe(null); setRecipeDialogOpen(true); }}
          />
        </TabsContent>

        <TabsContent value="categories" className="space-y-4 mt-4">
          <CategoriesTab 
            recipeCategories={recipeCategories}
            hubCategories={hubCategories}
            onEdit={(cat) => { setEditingCategory(cat); setCategoryDialogOpen(true); }}
            onAdd={() => { setEditingCategory(null); setCategoryDialogOpen(true); }}
          />
        </TabsContent>

        <TabsContent value="modules" className="space-y-4 mt-4">
          <ModulesTab 
            modules={modules}
            recipeCategories={recipeCategories}
            onEdit={(mod) => { setEditingModule(mod); setModuleDialogOpen(true); }}
            onAdd={() => { setEditingModule(null); setModuleDialogOpen(true); }}
          />
        </TabsContent>

        <TabsContent value="quizzes" className="space-y-4 mt-4">
          <QuizzesTab quizzes={quizzes} />
        </TabsContent>

        <TabsContent value="gamification" className="space-y-4 mt-4">
          <GamificationTab />
        </TabsContent>
      </Tabs>

      <CategoryDialog 
        open={categoryDialogOpen} 
        onOpenChange={setCategoryDialogOpen}
        category={editingCategory}
      />

      <ModuleDialog
        open={moduleDialogOpen}
        onOpenChange={setModuleDialogOpen}
        module={editingModule}
        categories={recipeCategories}
      />

      <RecipeDialog 
        open={recipeDialogOpen} 
        onOpenChange={setRecipeDialogOpen}
        recipe={editingRecipe}
        categories={recipeCategories}
      />
    </div>
  );
}

function OverviewTab({ hubCategories, recipeCategories, modules, quizzes, quizStats }: {
  hubCategories: HubCategory[];
  recipeCategories: RecipeCategory[];
  modules: TrainingModule[];
  quizzes: Quiz[];
  quizStats?: { totalAttempts: number; passRate: number };
}) {
  const stats = [
    { label: "Hub Kategorileri", value: hubCategories.length, icon: Target, color: "text-blue-600" },
    { label: "Reçete Kategorileri", value: recipeCategories.length, icon: Coffee, color: "text-amber-600" },
    { label: "Eğitim Modülleri", value: modules.length, icon: BookOpen, color: "text-green-600" },
    { label: "Aktif Quizler", value: quizzes.length, icon: Brain, color: "text-purple-600" },
  ];

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, idx) => (
          <Card key={idx}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Coffee className="w-4 h-4 text-amber-600" />
              Reçete Akademisi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recipeCategories.slice(0, 5).map((cat) => {
              const Icon = getIcon(cat.iconName);
              return (
                <div key={cat.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <Icon className="w-4 h-4" style={{ color: cat.colorHex }} />
                  <span className="text-sm flex-1">{cat.titleTr}</span>
                  <Badge variant="outline" className="text-xs">#{cat.displayOrder}</Badge>
                </div>
              );
            })}
            {recipeCategories.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                +{recipeCategories.length - 5} daha fazla kategori
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-600" />
              Quiz İstatistikleri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{quizStats?.totalAttempts || 0}</p>
                <p className="text-xs text-muted-foreground">Toplam Deneme</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-green-600">{quizStats?.passRate || 0}%</p>
                <p className="text-xs text-muted-foreground">Başarı Oranı</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {quizzes.slice(0, 3).map((quiz) => (
                <div key={quiz.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <span className="text-sm truncate flex-1">{quiz.title}</span>
                  <Badge variant="secondary" className="text-xs">%{quiz.passingScore}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-green-600" />
            Son Eklenen Modüller
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {modules.slice(0, 6).map((mod) => (
              <div key={mod.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{mod.title}</p>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">
                      {mod.level === 'beginner' ? 'Başlangıç' : mod.level === 'intermediate' ? 'Orta' : 'İleri'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{mod.estimatedDuration}dk</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function CategoriesTab({ recipeCategories, hubCategories, onEdit, onAdd }: {
  recipeCategories: RecipeCategory[];
  hubCategories: HubCategory[];
  onEdit: (cat: RecipeCategory) => void;
  onAdd: () => void;
}) {
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/academy/recipe-categories/${id}`, { 
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/academy/recipe-categories'] });
      toast({ title: "Başarılı", description: "Kategori silindi" });
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base">Reçete Kategorileri</CardTitle>
              <CardDescription>Reçete Akademisi kategorilerini yönetin</CardDescription>
            </div>
            <Button size="sm" onClick={onAdd} data-testid="button-add-category">
              <Plus className="w-4 h-4 mr-1" />
              Yeni Kategori
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {recipeCategories.map((cat) => {
              const Icon = getIcon(cat.iconName);
              return (
                <Card key={cat.id} className="hover-elevate" data-testid={`category-card-${cat.id}`}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${cat.colorHex}20` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: cat.colorHex }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm">{cat.titleTr}</h3>
                        {cat.description && (
                          <p className="text-xs text-muted-foreground truncate">{cat.description}</p>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          <Badge variant="outline" className="text-xs">Sıra: {cat.displayOrder}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7"
                          onClick={() => onEdit(cat)}
                          data-testid={`button-edit-category-${cat.id}`}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7 text-destructive"
                          onClick={() => {
                            if (confirm("Bu kategoriyi silmek istediğinize emin misiniz?")) {
                              deleteMutation.mutate(cat.id);
                            }
                          }}
                          data-testid={`button-delete-category-${cat.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Hub Kategorileri</CardTitle>
          <CardDescription>Akademi ana sayfa kategorileri (sistem tarafından yönetilir)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {hubCategories.map((cat) => {
              const Icon = getIcon(cat.iconName);
              return (
                <div key={cat.id} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Icon className="w-5 h-5" style={{ color: cat.colorHex }} />
                  <span className="text-sm font-medium">{cat.titleTr}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function ModulesTab({ modules, recipeCategories, onEdit, onAdd }: {
  modules: TrainingModule[];
  recipeCategories: RecipeCategory[];
  onEdit: (mod: TrainingModule) => void;
  onAdd: () => void;
}) {
  const [filterLevel, setFilterLevel] = useState("all");
  const { toast } = useToast();

  const filteredModules = modules.filter((m) => {
    if (filterLevel !== "all" && m.level !== filterLevel) return false;
    return true;
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/training/modules/${id}`, { 
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/modules'] });
      toast({ title: "Başarılı", description: "Modül silindi" });
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base">Eğitim Modülleri</CardTitle>
            <CardDescription>{modules.length} modül mevcut</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-32" data-testid="filter-level">
                <SelectValue placeholder="Seviye" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="beginner">Başlangıç</SelectItem>
                <SelectItem value="intermediate">Orta</SelectItem>
                <SelectItem value="advanced">İleri</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={onAdd} data-testid="button-add-module">
              <Plus className="w-4 h-4 mr-1" />
              Yeni Modül
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {filteredModules.map((mod) => (
            <Card key={mod.id} className="hover-elevate" data-testid={`module-card-${mod.id}`}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm line-clamp-2">{mod.title}</h3>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      <Badge 
                        variant={mod.level === 'beginner' ? 'secondary' : mod.level === 'intermediate' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {mod.level === 'beginner' ? 'Başlangıç' : mod.level === 'intermediate' ? 'Orta' : 'İleri'}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {mod.estimatedDuration}dk
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-7 w-7"
                      onClick={() => onEdit(mod)}
                      data-testid={`button-edit-module-${mod.id}`}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-7 w-7 text-destructive"
                      onClick={() => {
                        if (confirm("Bu modülü silmek istediğinize emin misiniz?")) {
                          deleteMutation.mutate(mod.id);
                        }
                      }}
                      data-testid={`button-delete-module-${mod.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {filteredModules.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Bu filtreyle eşleşen modül bulunamadı
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuizzesTab({ quizzes }: { quizzes: Quiz[] }) {
  const { toast } = useToast();

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await fetch(`/api/academy/quizzes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/academy/quizzes'] });
      toast({ title: "Başarılı", description: "Quiz durumu güncellendi" });
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base">Quiz Yönetimi</CardTitle>
            <CardDescription>{quizzes.length} quiz mevcut</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {quizzes.map((quiz) => (
            <Card key={quiz.id} className={`${quiz.isActive ? '' : 'opacity-60'}`} data-testid={`quiz-card-${quiz.id}`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Brain className={`w-5 h-5 ${quiz.isActive ? 'text-purple-600' : 'text-muted-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm">{quiz.title}</h3>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Badge variant="outline" className="text-xs">%{quiz.passingScore} geçme</Badge>
                        {quiz.timeLimit && (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            {quiz.timeLimit}dk
                          </span>
                        )}
                        {quiz.questionCount && (
                          <span className="text-xs text-muted-foreground">{quiz.questionCount} soru</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={quiz.isActive ? 'default' : 'secondary'}>
                      {quiz.isActive ? 'Aktif' : 'Pasif'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleMutation.mutate({ id: quiz.id, isActive: !quiz.isActive })}
                      data-testid={`button-toggle-quiz-${quiz.id}`}
                    >
                      {quiz.isActive ? 'Devre Dışı' : 'Aktifleştir'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {quizzes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Henüz quiz eklenmemiş
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GamificationTab() {
  const { data: badges = [] } = useQuery({
    queryKey: ["/api/academy/badges"],
    queryFn: async () => {
      const res = await fetch("/api/academy/badges", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: leaderboard = [] } = useQuery({
    queryKey: ["/api/academy/leaderboard"],
    queryFn: async () => {
      const res = await fetch("/api/academy/leaderboard", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  return (
    <>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-600" />
              Rozetler
            </CardTitle>
            <CardDescription>Sistem rozetleri (otomatik verilir)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {badges.slice(0, 8).map((badge: any) => (
                <div key={badge.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{badge.name}</p>
                    <p className="text-xs text-muted-foreground">+{badge.xpReward || 0} XP</p>
                  </div>
                </div>
              ))}
            </div>
            {badges.length > 8 && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                +{badges.length - 8} daha fazla rozet
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Liderlik Tablosu
            </CardTitle>
            <CardDescription>En yüksek XP'li kullanıcılar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((user: any, idx: number) => (
                <div key={user.id || idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    idx === 0 ? 'bg-amber-500 text-white' :
                    idx === 1 ? 'bg-gray-400 text-white' :
                    idx === 2 ? 'bg-amber-700 text-white' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user.firstName || user.username || 'Kullanıcı'}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {user.totalXp || 0} XP
                  </Badge>
                </div>
              ))}
            </div>
            {leaderboard.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Henüz liderlik tablosu verisi yok
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4" />
            XP Ayarları
          </CardTitle>
          <CardDescription>Puanlama kuralları (yakında)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold text-blue-600">+10</p>
              <p className="text-xs text-muted-foreground">Modül Tamamlama</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold text-green-600">+25</p>
              <p className="text-xs text-muted-foreground">Quiz Geçme</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold text-amber-600">+5</p>
              <p className="text-xs text-muted-foreground">Günlük Görev</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold text-purple-600">+50</p>
              <p className="text-xs text-muted-foreground">7 Gün Streak</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function RecipesTab({ recipes, recipeCategories, onEdit, onAdd }: {
  recipes: Recipe[];
  recipeCategories: RecipeCategory[];
  onEdit: (rec: Recipe) => void;
  onAdd: () => void;
}) {
  const [filterCategory, setFilterCategory] = useState("all");
  const { toast } = useToast();

  const filteredRecipes = recipes.filter((r) => {
    if (filterCategory !== "all" && r.categoryId !== parseInt(filterCategory)) return false;
    return true;
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/academy/recipes/${id}`, { 
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/academy/recipes'] });
      toast({ title: "Başarılı", description: "Reçete silindi" });
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base">Reçeteler</CardTitle>
            <CardDescription>{recipes.length} reçete mevcut</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-40" data-testid="filter-category">
                <SelectValue placeholder="Kategori Seç" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                {recipeCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.titleTr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={onAdd} data-testid="button-add-recipe">
              <Plus className="w-4 h-4 mr-1" />
              Yeni Reçete
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {filteredRecipes.map((recipe) => {
            const category = recipeCategories.find(c => c.id === recipe.categoryId);
            const Icon = category ? getIcon(category.iconName) : Coffee;
            return (
              <Card key={recipe.id} className="hover-elevate" data-testid={`recipe-card-${recipe.id}`}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    {recipe.photoUrl && (
                      <img 
                        src={recipe.photoUrl} 
                        alt={recipe.nameTr}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    )}
                    {!recipe.photoUrl && (
                      <div className="p-2 rounded-lg bg-muted">
                        <Icon className="w-5 h-5" style={{ color: category?.colorHex || '#1e3a5f' }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm line-clamp-1">{recipe.nameTr}</h3>
                      {category && <p className="text-xs text-muted-foreground">{category.titleTr}</p>}
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {recipe.difficulty && (
                          <Badge variant="outline" className="text-xs">
                            {recipe.difficulty === 'easy' ? 'Kolay' : recipe.difficulty === 'medium' ? 'Orta' : 'Zor'}
                          </Badge>
                        )}
                        {recipe.estimatedMinutes && (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            {recipe.estimatedMinutes}dk
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7"
                        onClick={() => onEdit(recipe)}
                        data-testid={`button-edit-recipe-${recipe.id}`}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7 text-destructive"
                        onClick={() => {
                          if (confirm("Bu reçeteyi silmek istediğinize emin misiniz?")) {
                            deleteMutation.mutate(recipe.id);
                          }
                        }}
                        data-testid={`button-delete-recipe-${recipe.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        {filteredRecipes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Bu filtreyle eşleşen reçete bulunamadı
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const recipeFormSchema = z.object({
  nameTr: z.string().min(1, "Reçete adı gerekli"),
  nameEn: z.string().optional(),
  code: z.string().optional(),
  description: z.string().optional(),
  difficulty: z.string().default("easy"),
  estimatedMinutes: z.coerce.number().min(1).default(5),
  categoryId: z.coerce.number().optional(),
  coffeeType: z.string().optional(),
});

type RecipeFormValues = z.infer<typeof recipeFormSchema>;

function RecipeDialog({ open, onOpenChange, recipe, categories }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: Recipe | null;
  categories: RecipeCategory[];
}) {
  const { toast } = useToast();
  
  const form = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: {
      nameTr: "",
      nameEn: "",
      code: "",
      description: "",
      difficulty: "easy",
      estimatedMinutes: 5,
      categoryId: undefined,
      coffeeType: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        nameTr: recipe?.nameTr || "",
        nameEn: recipe?.nameEn || "",
        code: recipe?.code || "",
        description: recipe?.description || "",
        difficulty: recipe?.difficulty || "easy",
        estimatedMinutes: recipe?.estimatedMinutes || 5,
        categoryId: recipe?.categoryId || undefined,
        coffeeType: recipe?.coffeeType || "",
      });
    }
  }, [open, recipe, form]);

  const mutation = useMutation({
    mutationFn: async (data: RecipeFormValues) => {
      const url = recipe 
        ? `/api/academy/recipes/${recipe.id}`
        : '/api/academy/recipes';
      const method = recipe ? 'PATCH' : 'POST';
      
      const code = data.code || data.nameTr.toUpperCase().substring(0, 3) + String(Date.now()).slice(-3);
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          ...data, 
          code,
          categoryId: data.categoryId ? Number(data.categoryId) : null,
          estimatedMinutes: Number(data.estimatedMinutes),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/academy/recipes'] });
      toast({ title: "Başarılı", description: recipe ? "Reçete güncellendi" : "Reçete oluşturuldu" });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: RecipeFormValues) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{recipe ? 'Reçete Düzenle' : 'Yeni Reçete'}</DialogTitle>
          <DialogDescription>Reçete bilgilerini girin</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nameTr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reçete Adı (TR)</FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      placeholder="örn: Espresso"
                      data-testid="input-recipe-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nameEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reçete Adı (EN)</FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      placeholder="örn: Espresso"
                      data-testid="input-recipe-name-en"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zorluk</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-recipe-difficulty">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="easy">Kolay</SelectItem>
                        <SelectItem value="medium">Orta</SelectItem>
                        <SelectItem value="hard">Zor</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="estimatedMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Süre (dk)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        {...field}
                        min={1}
                        data-testid="input-recipe-duration"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategori</FormLabel>
                  <Select value={field.value?.toString() || ""} onValueChange={(v) => field.onChange(v ? parseInt(v) : undefined)}>
                    <FormControl>
                      <SelectTrigger data-testid="select-recipe-category">
                        <SelectValue placeholder="Kategori seç" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.titleTr}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Açıklama</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field}
                      placeholder="Reçete açıklaması..."
                      rows={3}
                      data-testid="input-recipe-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-recipe">
                {mutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const categoryFormSchema = z.object({
  titleTr: z.string().min(1, "Kategori adı gerekli"),
  titleEn: z.string().optional(),
  slug: z.string().optional(),
  iconName: z.string().default("Coffee"),
  colorHex: z.string().default("#1e3a5f"),
  description: z.string().optional(),
  displayOrder: z.coerce.number().min(1).default(1),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

function CategoryDialog({ open, onOpenChange, category }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: RecipeCategory | null;
}) {
  const { toast } = useToast();
  
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      titleTr: "",
      titleEn: "",
      slug: "",
      iconName: "Coffee",
      colorHex: "#1e3a5f",
      description: "",
      displayOrder: 1,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        titleTr: category?.titleTr || "",
        titleEn: category?.titleEn || "",
        slug: category?.slug || "",
        iconName: category?.iconName || "Coffee",
        colorHex: category?.colorHex || "#1e3a5f",
        description: category?.description || "",
        displayOrder: category?.displayOrder || 1,
      });
    }
  }, [open, category, form]);

  const mutation = useMutation({
    mutationFn: async (data: CategoryFormValues) => {
      const url = category 
        ? `/api/academy/recipe-categories/${category.id}`
        : '/api/academy/recipe-categories';
      const method = category ? 'PATCH' : 'POST';
      
      const slug = data.slug || data.titleTr.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...data, slug }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/academy/recipe-categories'] });
      toast({ title: "Başarılı", description: category ? "Kategori güncellendi" : "Kategori oluşturuldu" });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: CategoryFormValues) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? 'Kategori Düzenle' : 'Yeni Kategori'}</DialogTitle>
          <DialogDescription>Reçete kategorisi bilgilerini girin</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="titleTr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategori Adı (TR)</FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      placeholder="örn: Sıcak İçecekler"
                      data-testid="input-category-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="titleEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategori Adı (EN)</FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      placeholder="örn: Hot Beverages"
                      data-testid="input-category-title-en"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Açıklama</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field}
                      placeholder="Kısa açıklama..."
                      rows={2}
                      data-testid="input-category-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="iconName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>İkon</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category-icon">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AVAILABLE_ICONS.map((icon) => {
                          const Icon = ICON_MAP[icon.name];
                          return (
                            <SelectItem key={icon.name} value={icon.name}>
                              <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4" />
                                <span>{icon.label}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="displayOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sıra</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        {...field}
                        min={1}
                        data-testid="input-category-order"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="colorHex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Renk</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded-lg border-2 ${field.value === color ? 'border-foreground' : 'border-transparent'}`}
                          style={{ backgroundColor: color }}
                          onClick={() => field.onChange(color)}
                          data-testid={`color-${color}`}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-category">
                {mutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const moduleFormSchema = z.object({
  title: z.string().min(1, "Modül adı gerekli"),
  level: z.string().default("beginner"),
  estimatedDuration: z.coerce.number().min(5).default(15),
  category: z.string().optional(),
});

type ModuleFormValues = z.infer<typeof moduleFormSchema>;

function ModuleDialog({ open, onOpenChange, module, categories }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: TrainingModule | null;
  categories: RecipeCategory[];
}) {
  const { toast } = useToast();
  
  const form = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: {
      title: "",
      level: "beginner",
      estimatedDuration: 15,
      category: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: module?.title || "",
        level: module?.level || "beginner",
        estimatedDuration: module?.estimatedDuration || 15,
        category: module?.category || "",
      });
    }
  }, [open, module, form]);

  const mutation = useMutation({
    mutationFn: async (data: ModuleFormValues) => {
      const url = module 
        ? `/api/training/modules/${module.id}`
        : '/api/training/modules';
      const method = module ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/modules'] });
      toast({ title: "Başarılı", description: module ? "Modül güncellendi" : "Modül oluşturuldu" });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: ModuleFormValues) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{module ? 'Modül Düzenle' : 'Yeni Modül'}</DialogTitle>
          <DialogDescription>Eğitim modülü bilgilerini girin</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modül Adı</FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      placeholder="örn: Espresso Hazırlama Teknikleri"
                      data-testid="input-module-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seviye</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-module-level">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="beginner">Başlangıç</SelectItem>
                        <SelectItem value="intermediate">Orta</SelectItem>
                        <SelectItem value="advanced">İleri</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="estimatedDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Süre (dk)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        {...field}
                        min={5}
                        data-testid="input-module-duration"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-module">
                {mutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
