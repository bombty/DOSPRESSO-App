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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
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
  Snowflake, IceCream, Citrus, Droplets, Leaf, Package, CircleDot, Flower2,
  Video, ImageIcon, ListOrdered, Sparkles, Search, Copy, EyeOff, GripVertical, Loader2
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ObjectUploader } from "@/components/ObjectUploader";

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
  description?: string;
  level: string;
  estimatedDuration: number;
  category?: string;
  isActive: boolean;
  isPublished?: boolean;
  heroImageUrl?: string;
  mainVideoUrl?: string;
  xpReward?: number;
  learningObjectives?: string[];
  steps?: { stepNumber: number; title: string; content: string }[];
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

type RecipeSizeDetail = {
  cupMl?: number;
  espresso?: string;
  syrups?: { name: string; pumps: number }[];
  milk?: { type: string; ml: number };
  powders?: { name: string; scoops: number }[];
  ice?: string;
  garnish?: string[];
  steps?: string[];
};

type RecipeSizes = {
  massivo?: RecipeSizeDetail;
  longDiva?: RecipeSizeDetail;
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
  sizes?: RecipeSizes;
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
  const [editingRecipeId, setEditingRecipeId] = useState<number | null>(null);
  const [duplicatingRecipe, setDuplicatingRecipe] = useState<Recipe | null>(null);
  const [aiModuleDialogOpen, setAiModuleDialogOpen] = useState(false);

  const handleDuplicateRecipe = (recipe: Recipe) => {
    setDuplicatingRecipe(recipe);
    setEditingRecipeId(null);
    setRecipeDialogOpen(true);
  };

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
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto gap-1 p-1">
          <TabsTrigger value="overview" className="text-xs sm:text-sm" data-testid="tab-overview">
            <BarChart3 className="w-4 h-4 mr-1" />
            Genel Bakış
          </TabsTrigger>
          <TabsTrigger value="recipes" className="text-xs sm:text-sm" data-testid="tab-recipes">
            <Coffee className="w-4 h-4 mr-1" />
            Reçeteler
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
            onEditRecipe={(rec) => { setDuplicatingRecipe(null); setEditingRecipeId(rec.id); setRecipeDialogOpen(true); }}
            onAddRecipe={() => { setDuplicatingRecipe(null); setEditingRecipeId(null); setRecipeDialogOpen(true); }}
            onEditCategory={(cat) => { setEditingCategory(cat); setCategoryDialogOpen(true); }}
            onAddCategory={() => { setEditingCategory(null); setCategoryDialogOpen(true); }}
            onDuplicateRecipe={handleDuplicateRecipe}
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
        onOpenChange={(open) => { setRecipeDialogOpen(open); if (!open) setDuplicatingRecipe(null); }}
        recipeId={editingRecipeId}
        categories={recipeCategories}
        duplicatingRecipe={duplicatingRecipe}
      />

      <AIModuleDialog
        open={aiModuleDialogOpen}
        onOpenChange={setAiModuleDialogOpen}
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
          <Card key={idx} className="hover-elevate cursor-pointer" onClick={() => {}} data-testid={`stat-card-${idx}`}>
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
              <div className="text-center p-3 rounded-lg bg-muted/50 hover-elevate cursor-pointer" data-testid="stat-total-attempts">
                <p className="text-2xl font-bold">{quizStats?.totalAttempts || 0}</p>
                <p className="text-xs text-muted-foreground">Toplam Deneme</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50 hover-elevate cursor-pointer" data-testid="stat-pass-rate">
                <p className="text-2xl font-bold text-green-600">{quizStats?.passRate || 0}%</p>
                <p className="text-xs text-muted-foreground">Başarı Oranı</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {quizzes.slice(0, 3).map((quiz) => (
                <div key={quiz.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover-elevate cursor-pointer" data-testid={`quiz-list-item-${quiz.id}`}>
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
  const [aiModuleDialogOpen, setAiModuleDialogOpen] = useState(false);
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
    <>
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base">Eğitim Modülleri</CardTitle>
            <CardDescription>{modules.length} modül mevcut</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
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
            <Button size="sm" variant="outline" onClick={() => setAiModuleDialogOpen(true)} data-testid="button-ai-module">
              <Sparkles className="w-4 h-4 mr-1" />
              AI ile Oluştur
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

    <AIModuleDialog
      open={aiModuleDialogOpen}
      onOpenChange={setAiModuleDialogOpen}
    />
    </>
  );
}

function QuizzesTab({ quizzes }: { quizzes: Quiz[] }) {
  const { toast } = useToast();
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);

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
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base">Quiz Yönetimi</CardTitle>
              <CardDescription>{quizzes.length} quiz mevcut</CardDescription>
            </div>
            <Button size="sm" onClick={() => setQuizDialogOpen(true)} data-testid="button-create-quiz">
              <Plus className="w-4 h-4 mr-1" />
              Yeni Quiz
            </Button>
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
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedQuiz(quiz);
                          setQuestionDialogOpen(true);
                        }}
                        data-testid={`button-add-question-${quiz.id}`}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Soru Ekle
                      </Button>
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

      <QuestionDialog 
        open={questionDialogOpen} 
        onOpenChange={setQuestionDialogOpen} 
        quiz={selectedQuiz} 
      />

      <QuizDialog 
        open={quizDialogOpen} 
        onOpenChange={setQuizDialogOpen} 
      />
    </>
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

function RecipeDetailDialog({ recipeId, category, open, onOpenChange }: {
  recipeId: number | null;
  category: RecipeCategory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: recipe, isLoading } = useQuery<Recipe>({
    queryKey: ['/api/academy/recipe', recipeId],
    enabled: open && !!recipeId,
  });
  
  if (!recipeId) return null;
  
  const sizes = recipe?.sizes || {};
  const Icon = category ? getIcon(category.iconName) : Coffee;
  
  const renderSizeDetail = (sizeKey: 'massivo' | 'longDiva', label: string, defaultCupMl: number) => {
    const size = sizes[sizeKey];
    if (!size) return null;
    
    return (
      <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-semibold">{label}</Badge>
          <span className="text-sm text-muted-foreground">({size.cupMl || defaultCupMl}ml)</span>
        </div>
        
        {size.espresso && (
          <div className="flex items-center gap-2">
            <Coffee className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium">Espresso:</span>
            <span className="text-sm">{size.espresso}</span>
          </div>
        )}
        
        {size.syrups && size.syrups.length > 0 && (
          <div className="flex items-start gap-2">
            <Droplets className="w-4 h-4 text-pink-500 mt-0.5" />
            <div>
              <span className="text-sm font-medium">Şurup:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {size.syrups.map((s, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{s.name} ({s.pumps} pump)</Badge>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {size.milk && (
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium">Süt:</span>
            <span className="text-sm">{size.milk.type} ({size.milk.ml}ml)</span>
          </div>
        )}
        
        {size.powders && size.powders.length > 0 && (
          <div className="flex items-start gap-2">
            <CircleDot className="w-4 h-4 text-orange-500 mt-0.5" />
            <div>
              <span className="text-sm font-medium">Toz:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {size.powders.map((p, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{p.name} ({p.scoops} scoop)</Badge>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {size.ice && (
          <div className="flex items-center gap-2">
            <Snowflake className="w-4 h-4 text-cyan-500" />
            <span className="text-sm font-medium">Buz:</span>
            <span className="text-sm">{size.ice}</span>
          </div>
        )}
        
        {size.garnish && size.garnish.length > 0 && (
          <div className="flex items-start gap-2">
            <Flower2 className="w-4 h-4 text-green-500 mt-0.5" />
            <div>
              <span className="text-sm font-medium">Garnitür:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {size.garnish.map((g, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{g}</Badge>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {size.steps && size.steps.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <span className="text-sm font-medium flex items-center gap-1 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Hazırlama Adımları:
            </span>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              {size.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : recipe ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg" style={{ backgroundColor: (category?.colorHex || '#1e3a5f') + '20' }}>
                  <Icon className="w-6 h-6" style={{ color: category?.colorHex || '#1e3a5f' }} />
                </div>
                <div>
                  <DialogTitle className="text-xl">{recipe.nameTr}</DialogTitle>
                  <DialogDescription className="flex items-center gap-2 mt-1">
                    {category && <Badge variant="secondary">{category.titleTr}</Badge>}
                    {recipe.difficulty && (
                      <Badge variant="outline">
                        {recipe.difficulty === 'easy' ? 'Kolay' : recipe.difficulty === 'medium' ? 'Orta' : 'Zor'}
                      </Badge>
                    )}
                    {recipe.estimatedMinutes && (
                      <span className="text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {recipe.estimatedMinutes} dk
                      </span>
                    )}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {recipe.description && (
                  <p className="text-sm text-muted-foreground">{recipe.description}</p>
                )}
                
                <Separator />
                
                <div className="grid gap-4">
                  {renderSizeDetail('massivo', 'MASSIVO', 350)}
                  {renderSizeDetail('longDiva', 'LONG DIVA', 550)}
                </div>
                
                {(!sizes.massivo && !sizes.longDiva) && (
                  <div className="text-center py-8 text-muted-foreground">
                    Bu reçete için henüz detaylı bilgi girilmemiş
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function RecipesTab({ recipes, recipeCategories, onEditRecipe, onAddRecipe, onEditCategory, onAddCategory, onDuplicateRecipe }: {
  recipes: Recipe[];
  recipeCategories: RecipeCategory[];
  onEditRecipe: (rec: Recipe) => void;
  onAddRecipe: () => void;
  onEditCategory: (cat: RecipeCategory) => void;
  onAddCategory: () => void;
  onDuplicateRecipe?: (rec: Recipe) => void;
}) {
  const { toast } = useToast();
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeView, setActiveView] = useState<'recipes' | 'categories'>('recipes');
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null);
  
  const filteredRecipes = recipes.filter(r => {
    const matchesSearch = searchQuery === "" || 
      r.nameTr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.nameEn && r.nameEn.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.code && r.code.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = filterCategoryId === null || r.categoryId === filterCategoryId;
    return matchesSearch && matchesCategory;
  });
  
  const categoriesWithRecipes = recipeCategories
    .filter(cat => filteredRecipes.some(r => r.categoryId === cat.id))
    .sort((a, b) => a.displayOrder - b.displayOrder);
  
  const allCategoriesSorted = [...recipeCategories].sort((a, b) => a.displayOrder - b.displayOrder);

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

  const deleteCategoryMutation = useMutation({
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

  const handleDeleteCategory = (category: RecipeCategory) => {
    const recipeCount = recipes.filter(r => r.categoryId === category.id).length;
    if (recipeCount > 0) {
      toast({ 
        title: "Silinemez", 
        description: `Bu kategoride ${recipeCount} reçete var. Önce reçeteleri başka kategoriye taşıyın veya silin.`, 
        variant: "destructive" 
      });
      return;
    }
    if (confirm(`"${category.titleTr}" kategorisini silmek istediğinize emin misiniz?`)) {
      deleteCategoryMutation.mutate(category.id);
    }
  };

  const handleViewDetail = (recipe: Recipe) => {
    setSelectedRecipeId(recipe.id);
    setSelectedCategoryId(recipe.categoryId || null);
    setDetailOpen(true);
  };

  return (
    <>
      <RecipeDetailDialog 
        recipeId={selectedRecipeId} 
        category={selectedCategoryId ? recipeCategories.find(c => c.id === selectedCategoryId) || null : null}
        open={detailOpen} 
        onOpenChange={setDetailOpen} 
      />
      
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base">Reçeteler</CardTitle>
              <CardDescription>{filteredRecipes.length} / {recipes.length} reçete, {recipeCategories.length} kategori</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant={activeView === 'recipes' ? 'default' : 'outline'} onClick={() => setActiveView('recipes')}>
                <Coffee className="w-4 h-4 mr-1" />
                Reçeteler
              </Button>
              <Button size="sm" variant={activeView === 'categories' ? 'default' : 'outline'} onClick={() => setActiveView('categories')}>
                <Package className="w-4 h-4 mr-1" />
                Kategoriler
              </Button>
            </div>
            <Button size="sm" onClick={activeView === 'recipes' ? onAddRecipe : onAddCategory} data-testid="button-add-item">
              <Plus className="w-4 h-4 mr-1" />
              {activeView === 'recipes' ? 'Yeni Reçete' : 'Yeni Kategori'}
            </Button>
          </div>
          
          {activeView === 'recipes' && (
            <div className="flex gap-2 mt-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Reçete ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-recipe-search"
                />
              </div>
              <Select value={filterCategoryId?.toString() || "all"} onValueChange={(v) => setFilterCategoryId(v === "all" ? null : parseInt(v))}>
                <SelectTrigger className="w-[180px]" data-testid="select-filter-category">
                  <SelectValue placeholder="Tüm Kategoriler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Kategoriler</SelectItem>
                  {allCategoriesSorted.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.titleTr} ({recipes.filter(r => r.categoryId === cat.id).length})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(searchQuery || filterCategoryId) && (
                <Button size="sm" variant="ghost" onClick={() => { setSearchQuery(""); setFilterCategoryId(null); }}>
                  Temizle
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {activeView === 'recipes' ? (
            categoriesWithRecipes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Henüz reçete bulunmuyor
              </div>
            ) : (
              <Accordion type="multiple" defaultValue={categoriesWithRecipes.slice(0, 3).map(c => c.id.toString())} className="space-y-2">
                {categoriesWithRecipes.map((category) => {
                  const categoryRecipes = filteredRecipes.filter(r => r.categoryId === category.id);
                  const Icon = getIcon(category.iconName);
                  
                  return (
                    <AccordionItem key={category.id} value={category.id.toString()} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline py-3" data-testid={`accordion-category-${category.id}`}>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg" style={{ backgroundColor: category.colorHex + '20' }}>
                            <Icon className="w-5 h-5" style={{ color: category.colorHex }} />
                          </div>
                          <div className="text-left">
                            <h3 className="font-semibold text-sm">{category.titleTr}</h3>
                            <p className="text-xs text-muted-foreground">{categoryRecipes.length} reçete</p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid sm:grid-cols-2 gap-2 pb-2">
                          {categoryRecipes.map((recipe) => (
                            <div 
                              key={recipe.id} 
                              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover-elevate cursor-pointer"
                              onClick={() => handleViewDetail(recipe)}
                              data-testid={`recipe-card-${recipe.id}`}
                            >
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm line-clamp-1">{recipe.nameTr}</h4>
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
                              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-7 w-7"
                                  onClick={() => handleViewDetail(recipe)}
                                  data-testid={`button-view-recipe-${recipe.id}`}
                                  title="Görüntüle"
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-7 w-7"
                                  onClick={() => onEditRecipe(recipe)}
                                  data-testid={`button-edit-recipe-${recipe.id}`}
                                  title="Düzenle"
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                {onDuplicateRecipe && (
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-7 w-7"
                                    onClick={() => onDuplicateRecipe(recipe)}
                                    data-testid={`button-duplicate-recipe-${recipe.id}`}
                                    title="Kopyala"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                )}
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
                                  title="Sil"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {allCategoriesSorted.map((category) => {
                const Icon = getIcon(category.iconName);
                const recipeCount = recipes.filter(r => r.categoryId === category.id).length;
                
                return (
                  <div 
                    key={category.id}
                    className="flex items-center gap-3 p-4 rounded-lg border bg-card hover-elevate"
                    data-testid={`category-card-${category.id}`}
                  >
                    <div className="p-3 rounded-lg" style={{ backgroundColor: category.colorHex + '20' }}>
                      <Icon className="w-6 h-6" style={{ color: category.colorHex }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">{category.titleTr}</h4>
                        <Badge variant="secondary" className="text-xs">{recipeCount}</Badge>
                      </div>
                      {category.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{category.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7"
                        onClick={() => onEditCategory(category)}
                        data-testid={`button-edit-category-${category.id}`}
                        title="Düzenle"
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className={`h-7 w-7 ${recipeCount === 0 ? 'text-destructive' : 'text-muted-foreground'}`}
                        onClick={() => handleDeleteCategory(category)}
                        data-testid={`button-delete-category-${category.id}`}
                        title={recipeCount > 0 ? `${recipeCount} reçete var - silinemez` : "Sil"}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

const recipeFormSchema = z.object({
  nameTr: z.string().min(1, "Reçete adı gerekli"),
  nameEn: z.string().optional(),
  code: z.string().optional(),
  description: z.string().optional(),
  photoUrl: z.string().optional(),
  difficulty: z.string().default("easy"),
  estimatedMinutes: z.coerce.number().min(1).default(5),
  categoryId: z.coerce.number({ required_error: "Kategori seçimi zorunlu" }).min(1, "Kategori seçimi zorunlu"),
  coffeeType: z.string().optional(),
  // MASSIVO fields
  massivoCupMl: z.coerce.number().optional(),
  massivoEspresso: z.string().optional(),
  massivoSyrups: z.string().optional(),
  massivoMilkType: z.string().optional(),
  massivoMilkMl: z.coerce.number().optional(),
  massivoPowders: z.string().optional(),
  massivoIce: z.string().optional(),
  massivoGarnish: z.string().optional(),
  massivoSteps: z.string().optional(),
  // LONG DIVA fields
  longDivaCupMl: z.coerce.number().optional(),
  longDivaEspresso: z.string().optional(),
  longDivaSyrups: z.string().optional(),
  longDivaMilkType: z.string().optional(),
  longDivaMilkMl: z.coerce.number().optional(),
  longDivaPowders: z.string().optional(),
  longDivaIce: z.string().optional(),
  longDivaGarnish: z.string().optional(),
  longDivaSteps: z.string().optional(),
});

type RecipeFormValues = z.infer<typeof recipeFormSchema>;

const ESPRESSO_OPTIONS = ["Single Shot", "Double Shot", "Triple Shot", "Yok"];
const ICE_OPTIONS = ["Küp Buz", "Kırık Buz", "Blender Buz", "Yok"];
const MILK_OPTIONS = ["%3 Süt", "Yağsız Süt", "Badem Sütü", "Yulaf Sütü", "Hindistan Cevizi Sütü", "Yok"];

function parseSyrups(text: string): { name: string; pumps: number }[] {
  return text.split('\n').filter(s => s.trim()).map(line => {
    const [name, pumps] = line.split(':');
    return { name: name?.trim() || line.trim(), pumps: parseInt(pumps) || 1 };
  });
}

function parsePowders(text: string): { name: string; scoops: number }[] {
  return text.split('\n').filter(s => s.trim()).map(line => {
    const [name, scoops] = line.split(':');
    return { name: name?.trim() || line.trim(), scoops: parseInt(scoops) || 1 };
  });
}

function formatSyrups(syrups?: { name: string; pumps: number }[]): string {
  if (!syrups || syrups.length === 0) return "";
  return syrups.map(s => `${s.name}:${s.pumps}`).join('\n');
}

function formatPowders(powders?: { name: string; scoops: number }[]): string {
  if (!powders || powders.length === 0) return "";
  return powders.map(p => `${p.name}:${p.scoops}`).join('\n');
}

function RecipeDialog({ open, onOpenChange, recipeId, categories, duplicatingRecipe }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeId: number | null;
  categories: RecipeCategory[];
  duplicatingRecipe?: Recipe | null;
}) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("temel");
  
  const { data: recipe, isLoading } = useQuery<Recipe>({
    queryKey: ['/api/academy/recipe', recipeId],
    enabled: open && !!recipeId,
  });
  
  const form = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: {
      nameTr: "",
      nameEn: "",
      code: "",
      description: "",
      photoUrl: "",
      difficulty: "easy",
      estimatedMinutes: 5,
      categoryId: undefined,
      coffeeType: "",
      massivoCupMl: 350,
      massivoEspresso: "",
      massivoSyrups: "",
      massivoMilkType: "",
      massivoMilkMl: undefined,
      massivoPowders: "",
      massivoIce: "",
      massivoGarnish: "",
      massivoSteps: "",
      longDivaCupMl: 550,
      longDivaEspresso: "",
      longDivaSyrups: "",
      longDivaMilkType: "",
      longDivaMilkMl: undefined,
      longDivaPowders: "",
      longDivaIce: "",
      longDivaGarnish: "",
      longDivaSteps: "",
    },
  });

  useEffect(() => {
    if (open && recipe) {
      const sizes = recipe.sizes || { massivo: {}, longDiva: {} };
      const m = sizes.massivo || {};
      const l = sizes.longDiva || {};
      
      form.reset({
        nameTr: recipe.nameTr || "",
        nameEn: recipe.nameEn || "",
        code: recipe.code || "",
        description: recipe.description || "",
        photoUrl: recipe.photoUrl || "",
        difficulty: recipe.difficulty || "easy",
        estimatedMinutes: recipe.estimatedMinutes || 5,
        categoryId: recipe.categoryId || undefined,
        coffeeType: recipe.coffeeType || "",
        massivoCupMl: m.cupMl || 350,
        massivoEspresso: m.espresso || "",
        massivoSyrups: formatSyrups(m.syrups),
        massivoMilkType: m.milk?.type || "",
        massivoMilkMl: m.milk?.ml,
        massivoPowders: formatPowders(m.powders),
        massivoIce: m.ice || "",
        massivoGarnish: m.garnish?.join('\n') || "",
        massivoSteps: m.steps?.join('\n') || "",
        longDivaCupMl: l.cupMl || 550,
        longDivaEspresso: l.espresso || "",
        longDivaSyrups: formatSyrups(l.syrups),
        longDivaMilkType: l.milk?.type || "",
        longDivaMilkMl: l.milk?.ml,
        longDivaPowders: formatPowders(l.powders),
        longDivaIce: l.ice || "",
        longDivaGarnish: l.garnish?.join('\n') || "",
        longDivaSteps: l.steps?.join('\n') || "",
      });
    } else if (open && duplicatingRecipe) {
      const sizes = duplicatingRecipe.sizes || { massivo: {}, longDiva: {} };
      const m = sizes.massivo || {};
      const l = sizes.longDiva || {};
      
      form.reset({
        nameTr: duplicatingRecipe.nameTr + " (Kopya)" || "",
        nameEn: duplicatingRecipe.nameEn ? duplicatingRecipe.nameEn + " (Copy)" : "",
        code: "",
        description: duplicatingRecipe.description || "",
        photoUrl: duplicatingRecipe.photoUrl || "",
        difficulty: duplicatingRecipe.difficulty || "easy",
        estimatedMinutes: duplicatingRecipe.estimatedMinutes || 5,
        categoryId: duplicatingRecipe.categoryId || undefined,
        coffeeType: duplicatingRecipe.coffeeType || "",
        massivoCupMl: m.cupMl || 350,
        massivoEspresso: m.espresso || "",
        massivoSyrups: formatSyrups(m.syrups),
        massivoMilkType: m.milk?.type || "",
        massivoMilkMl: m.milk?.ml,
        massivoPowders: formatPowders(m.powders),
        massivoIce: m.ice || "",
        massivoGarnish: m.garnish?.join('\n') || "",
        massivoSteps: m.steps?.join('\n') || "",
        longDivaCupMl: l.cupMl || 550,
        longDivaEspresso: l.espresso || "",
        longDivaSyrups: formatSyrups(l.syrups),
        longDivaMilkType: l.milk?.type || "",
        longDivaMilkMl: l.milk?.ml,
        longDivaPowders: formatPowders(l.powders),
        longDivaIce: l.ice || "",
        longDivaGarnish: l.garnish?.join('\n') || "",
        longDivaSteps: l.steps?.join('\n') || "",
      });
    } else if (open && !recipeId && !duplicatingRecipe) {
      form.reset({
        nameTr: "",
        nameEn: "",
        code: "",
        description: "",
        difficulty: "easy",
        estimatedMinutes: 5,
        categoryId: undefined,
        coffeeType: "",
        massivoCupMl: 350,
        massivoEspresso: "",
        massivoSyrups: "",
        massivoMilkType: "",
        massivoMilkMl: undefined,
        massivoPowders: "",
        massivoIce: "",
        massivoGarnish: "",
        massivoSteps: "",
        longDivaCupMl: 550,
        longDivaEspresso: "",
        longDivaSyrups: "",
        longDivaMilkType: "",
        longDivaMilkMl: undefined,
        longDivaPowders: "",
        longDivaIce: "",
        longDivaGarnish: "",
        longDivaSteps: "",
      });
    }
  }, [open, recipe, recipeId, duplicatingRecipe, form]);

  const mutation = useMutation({
    mutationFn: async (data: RecipeFormValues) => {
      const url = recipeId 
        ? `/api/academy/recipes/${recipeId}`
        : '/api/academy/recipes';
      const method = recipeId ? 'PATCH' : 'POST';
      
      const code = data.code || data.nameTr.toUpperCase().substring(0, 3) + String(Date.now()).slice(-3);
      
      const sizes = {
        massivo: {
          cupMl: data.massivoCupMl || 350,
          espresso: data.massivoEspresso || undefined,
          syrups: parseSyrups(data.massivoSyrups || ""),
          milk: data.massivoMilkType ? { type: data.massivoMilkType, ml: data.massivoMilkMl || 0 } : undefined,
          powders: parsePowders(data.massivoPowders || ""),
          ice: data.massivoIce || undefined,
          garnish: (data.massivoGarnish || "").split('\n').filter(s => s.trim()),
          steps: (data.massivoSteps || "").split('\n').filter(s => s.trim()),
        },
        longDiva: {
          cupMl: data.longDivaCupMl || 550,
          espresso: data.longDivaEspresso || undefined,
          syrups: parseSyrups(data.longDivaSyrups || ""),
          milk: data.longDivaMilkType ? { type: data.longDivaMilkType, ml: data.longDivaMilkMl || 0 } : undefined,
          powders: parsePowders(data.longDivaPowders || ""),
          ice: data.longDivaIce || undefined,
          garnish: (data.longDivaGarnish || "").split('\n').filter(s => s.trim()),
          steps: (data.longDivaSteps || "").split('\n').filter(s => s.trim()),
        },
      };
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          nameTr: data.nameTr,
          nameEn: data.nameEn,
          code,
          description: data.description,
          photoUrl: data.photoUrl || null,
          difficulty: data.difficulty,
          estimatedMinutes: Number(data.estimatedMinutes),
          categoryId: data.categoryId ? Number(data.categoryId) : null,
          coffeeType: data.coffeeType,
          sizes,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/academy/recipes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/academy/recipe', recipeId] });
      toast({ title: "Başarılı", description: recipeId ? "Reçete güncellendi" : "Reçete oluşturuldu" });
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {isLoading && recipeId ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
        <DialogHeader>
          <DialogTitle>{recipeId ? 'Reçete Düzenle' : 'Yeni Reçete'}</DialogTitle>
          <DialogDescription>Reçete bilgilerini girin ve bardak boylarını tanımlayın</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="temel">Temel Bilgi</TabsTrigger>
                <TabsTrigger value="massivo">MASSIVO (350ml)</TabsTrigger>
                <TabsTrigger value="longdiva">LONG DIVA (550ml)</TabsTrigger>
              </TabsList>

              <TabsContent value="temel" className="space-y-4">
                <FormField
                  control={form.control}
                  name="nameTr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reçete Adı (TR)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="örn: Espresso" data-testid="input-recipe-name" />
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
                        <Input {...field} placeholder="örn: Espresso" data-testid="input-recipe-name-en" />
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
                          <Input type="number" {...field} min={1} data-testid="input-recipe-duration" />
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
                        <Textarea {...field} placeholder="Reçete açıklaması..." rows={3} data-testid="input-recipe-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="photoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reçete Fotoğrafı</FormLabel>
                      <FormControl>
                        <div className="flex flex-col items-center gap-3">
                          {field.value && (
                            <div className="relative w-32 aspect-[3/4] rounded-lg overflow-hidden border">
                              <img 
                                src={field.value} 
                                alt="Reçete fotoğrafı" 
                                className="w-full h-full object-cover"
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="destructive"
                                className="absolute top-1 right-1 h-6 w-6"
                                onClick={() => field.onChange("")}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                          <ObjectUploader
                            onUploadComplete={(url) => field.onChange(url)}
                            accept="image/*"
                            directory="recipes"
                            maxSizeMB={5}
                            aspectRatio={3/4}
                            data-testid="uploader-recipe-photo"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="massivo" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="massivoCupMl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bardak (ml)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min={1} placeholder="350" data-testid="input-massivo-cup" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="massivoEspresso"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Espresso</FormLabel>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-massivo-espresso">
                              <SelectValue placeholder="Seç..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ESPRESSO_OPTIONS.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="massivoMilkType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Süt Tipi</FormLabel>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-massivo-milk">
                              <SelectValue placeholder="Seç..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {MILK_OPTIONS.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="massivoMilkMl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Süt (ml)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min={0} placeholder="200" data-testid="input-massivo-milk-ml" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="massivoIce"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Buz</FormLabel>
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-massivo-ice">
                            <SelectValue placeholder="Seç..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ICE_OPTIONS.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="massivoSyrups"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Şuruplar (isim:pump)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Vanilya:2&#10;Karamel:1" rows={2} data-testid="input-massivo-syrups" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="massivoPowders"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tozlar (isim:scoop)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Çikolata:2&#10;Tarçın:1" rows={2} data-testid="input-massivo-powders" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="massivoGarnish"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Garnitür</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Çikolata sosu&#10;Krema" rows={2} data-testid="input-massivo-garnish" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="massivoSteps"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hazırlama Adımları</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="1. Shot çek&#10;2. Süt ekle&#10;3. Karıştır" rows={4} data-testid="input-massivo-steps" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="longdiva" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="longDivaCupMl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bardak (ml)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min={1} placeholder="550" data-testid="input-longdiva-cup" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="longDivaEspresso"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Espresso</FormLabel>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-longdiva-espresso">
                              <SelectValue placeholder="Seç..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ESPRESSO_OPTIONS.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="longDivaMilkType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Süt Tipi</FormLabel>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-longdiva-milk">
                              <SelectValue placeholder="Seç..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {MILK_OPTIONS.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="longDivaMilkMl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Süt (ml)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min={0} placeholder="300" data-testid="input-longdiva-milk-ml" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="longDivaIce"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Buz</FormLabel>
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-longdiva-ice">
                            <SelectValue placeholder="Seç..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ICE_OPTIONS.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="longDivaSyrups"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Şuruplar (isim:pump)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Vanilya:3&#10;Karamel:2" rows={2} data-testid="input-longdiva-syrups" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="longDivaPowders"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tozlar (isim:scoop)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Çikolata:3&#10;Tarçın:1" rows={2} data-testid="input-longdiva-powders" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="longDivaGarnish"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Garnitür</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Çikolata sosu&#10;Krema" rows={2} data-testid="input-longdiva-garnish" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="longDivaSteps"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hazırlama Adımları</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="1. Shot çek&#10;2. Süt ekle&#10;3. Karıştır" rows={4} data-testid="input-longdiva-steps" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

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
          </>
        )}
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

const stepSchema = z.object({
  stepNumber: z.number(),
  title: z.string(),
  content: z.string(),
  mediaSuggestions: z.array(z.string()).optional(),
});

const moduleFormSchema = z.object({
  title: z.string().min(1, "Modül adı gerekli"),
  description: z.string().optional(),
  level: z.string().default("beginner"),
  estimatedDuration: z.coerce.number().min(5).default(15),
  category: z.string().optional(),
  heroImageUrl: z.string().optional(),
  mainVideoUrl: z.string().optional(),
  xpReward: z.coerce.number().min(0).default(50),
  isPublished: z.boolean().default(false),
  learningObjectives: z.string().optional(),
  stepsText: z.string().optional(),
});

type ModuleFormValues = z.infer<typeof moduleFormSchema>;
type ModuleStep = z.infer<typeof stepSchema>;

function ModuleDialog({ open, onOpenChange, module, categories }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: TrainingModule | null;
  categories: RecipeCategory[];
}) {
  const { toast } = useToast();
  const [activeDialogTab, setActiveDialogTab] = useState<'basic' | 'content' | 'settings'>('basic');
  
  const form = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: {
      title: "",
      description: "",
      level: "beginner",
      estimatedDuration: 15,
      category: "",
      heroImageUrl: "",
      mainVideoUrl: "",
      xpReward: 50,
      isPublished: false,
      learningObjectives: "",
      stepsText: "",
    },
  });

  useEffect(() => {
    if (open) {
      const objectives = module?.learningObjectives || [];
      const steps = module?.steps || [];
      
      form.reset({
        title: module?.title || "",
        description: module?.description || "",
        level: module?.level || "beginner",
        estimatedDuration: module?.estimatedDuration || 15,
        category: module?.category || "",
        heroImageUrl: module?.heroImageUrl || "",
        mainVideoUrl: (module as any)?.mainVideoUrl || "",
        xpReward: (module as any)?.xpReward || 50,
        isPublished: module?.isPublished || false,
        learningObjectives: Array.isArray(objectives) ? objectives.join('\n') : "",
        stepsText: Array.isArray(steps) ? steps.map((s: any) => `${s.stepNumber}. ${s.title}\n${s.content}`).join('\n\n') : "",
      });
      setActiveDialogTab('basic');
    }
  }, [open, module, form]);

  const mutation = useMutation({
    mutationFn: async (data: ModuleFormValues) => {
      const learningObjectives = data.learningObjectives 
        ? data.learningObjectives.split('\n').filter(l => l.trim()) 
        : [];
      
      const steps: ModuleStep[] = [];
      if (data.stepsText) {
        const stepBlocks = data.stepsText.split('\n\n').filter(b => b.trim());
        stepBlocks.forEach((block, idx) => {
          const lines = block.split('\n');
          const titleLine = lines[0] || '';
          const titleMatch = titleLine.match(/^\d+\.\s*(.+)$/);
          steps.push({
            stepNumber: idx + 1,
            title: titleMatch ? titleMatch[1] : titleLine,
            content: lines.slice(1).join('\n').trim() || titleLine,
          });
        });
      }
      
      const payload = {
        ...data,
        learningObjectives,
        steps,
        heroImageUrl: data.heroImageUrl || null,
        mainVideoUrl: data.mainVideoUrl || null,
      };
      
      const url = module 
        ? `/api/training/modules/${module.id}`
        : '/api/training/modules';
      const method = module ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{module ? 'Modül Düzenle' : 'Yeni Modül'}</DialogTitle>
          <DialogDescription>Modern LMS eğitim modülü oluşturun</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs value={activeDialogTab} onValueChange={(v) => setActiveDialogTab(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Temel Bilgiler</TabsTrigger>
                <TabsTrigger value="content">İçerik</TabsTrigger>
                <TabsTrigger value="settings">Ayarlar</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4 mt-4">
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
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Açıklama</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          placeholder="Bu modülde öğrenecekleriniz..."
                          rows={3}
                          data-testid="input-module-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-3 gap-4">
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
                  <FormField
                    control={form.control}
                    name="xpReward"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>XP Ödülü</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            {...field}
                            min={0}
                            data-testid="input-module-xp"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori</FormLabel>
                      <Select value={field.value || ''} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-module-category">
                            <SelectValue placeholder="Kategori seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="barista">Barista</SelectItem>
                          <SelectItem value="supervisor">Supervisor</SelectItem>
                          <SelectItem value="hygiene">Hijyen</SelectItem>
                          <SelectItem value="customer_service">Müşteri Hizmetleri</SelectItem>
                          <SelectItem value="onboarding">İşe Alıştırma</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              <TabsContent value="content" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="heroImageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" />
                        Banner Görsel URL
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          placeholder="https://example.com/banner.jpg"
                          data-testid="input-module-hero"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="mainVideoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Video className="w-4 h-4" />
                        Ana Video URL
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          placeholder="https://youtube.com/watch?v=... veya S3 URL"
                          data-testid="input-module-video"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="learningObjectives"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Öğrenme Hedefleri (her satıra bir hedef)
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          placeholder="Espresso çekme tekniklerini öğreneceksiniz&#10;Kahve çeşitlerini tanıyacaksınız&#10;Müşteri hizmetleri becerilerinizi geliştireceksiniz"
                          rows={4}
                          data-testid="input-module-objectives"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="stepsText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <ListOrdered className="w-4 h-4" />
                        Eğitim Adımları (her adım için: "1. Başlık" sonra açıklama)
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          placeholder={"1. Espresso Makinesi Tanıtımı\nMakinenin parçalarını ve işlevlerini öğrenin.\n\n2. Kahve Öğütme\nDoğru öğütme boyutunu ayarlayın.\n\n3. Damlatma Tekniği\nMükemmel espresso için damlatma süresini öğrenin."}
                          rows={8}
                          className="font-mono text-sm"
                          data-testid="input-module-steps"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              <TabsContent value="settings" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="isPublished"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Yayınla</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Bu modülü personele görünür yap
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-module-published"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <div className="rounded-lg border p-4 space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    AI Destekli Özellikler
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    İçerik oluşturduktan sonra AI ile quiz soruları ve mindmap oluşturabilirsiniz.
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" disabled>
                      <Brain className="w-4 h-4 mr-1" />
                      Quiz Oluştur
                    </Button>
                    <Button type="button" variant="outline" size="sm" disabled>
                      <Sparkles className="w-4 h-4 mr-1" />
                      Mindmap Oluştur
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <DialogFooter className="mt-6">
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

const questionSchema = z.object({
  question: z.string().min(5, "Soru en az 5 karakter olmalı"),
  questionType: z.enum(["multiple_choice", "true_false"]),
  options: z.array(z.string()).min(2, "En az 2 seçenek gerekli"),
  correctAnswerIndex: z.number().min(0),
  explanation: z.string().optional(),
  points: z.number().min(1).default(1),
});

const aiModuleSchema = z.object({
  prompt: z.string().min(10, "Açıklama en az 10 karakter olmalı"),
});

type AIModuleFormValues = z.infer<typeof aiModuleSchema>;

function AIModuleDialog({ open, onOpenChange }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<AIModuleFormValues>({
    resolver: zodResolver(aiModuleSchema),
    defaultValues: {
      prompt: "",
    },
  });

  const handleGenerate = async (data: AIModuleFormValues) => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/training/modules/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt: data.prompt }),
      });
      if (!res.ok) throw new Error(await res.text());
      const moduleData = await res.json();
      queryClient.invalidateQueries({ queryKey: ['/api/training/modules'] });
      toast({ title: "Başarılı", description: "AI modül oluşturuldu", });
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI ile Modül Oluştur
          </DialogTitle>
          <DialogDescription>
            Yapay zeka tarafından hazırlanmış eğitim modülünü oluşturun
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleGenerate)} className="space-y-4">
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modül Açıklaması</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Örn: Espresso çekme teknikleri hakkında yeni modül oluştur..."
                      {...field}
                      rows={5}
                      data-testid="input-ai-module-prompt"
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
              <Button type="submit" disabled={isGenerating} data-testid="button-generate-ai-module">
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Oluşturuluyor...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Oluştur
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function QuestionDialog({ 
  open, 
  onOpenChange, 
  quiz 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  quiz: Quiz | null;
}) {
  const { toast } = useToast();
  const [questionType, setQuestionType] = useState<"multiple_choice" | "true_false">("multiple_choice");
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);

  const form = useForm<z.infer<typeof questionSchema>>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      question: "",
      questionType: "multiple_choice",
      options: ["", "", "", ""],
      correctAnswerIndex: 0,
      explanation: "",
      points: 1,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof questionSchema>) => {
      if (!quiz) throw new Error("Quiz seçilmedi");
      const res = await fetch(`/api/academy/quiz/${quiz.id}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          careerQuizId: quiz.id,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/academy/quizzes'] });
      toast({ title: "Başarılı", description: "Soru eklendi" });
      form.reset();
      setOptions(["", "", "", ""]);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const handleQuestionTypeChange = (type: "multiple_choice" | "true_false") => {
    setQuestionType(type);
    if (type === "true_false") {
      setOptions(["Doğru", "Yanlış"]);
      form.setValue("options", ["Doğru", "Yanlış"]);
    } else {
      setOptions(["", "", "", ""]);
      form.setValue("options", ["", "", "", ""]);
    }
    form.setValue("questionType", type);
  };

  const onSubmit = (data: z.infer<typeof questionSchema>) => {
    data.options = options.filter(o => o.trim() !== "");
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Soru Ekle</DialogTitle>
          <DialogDescription>
            {quiz?.title} quizine yeni soru ekle
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={questionType === "multiple_choice" ? "default" : "outline"}
                size="sm"
                onClick={() => handleQuestionTypeChange("multiple_choice")}
              >
                Çoktan Seçmeli
              </Button>
              <Button
                type="button"
                variant={questionType === "true_false" ? "default" : "outline"}
                size="sm"
                onClick={() => handleQuestionTypeChange("true_false")}
              >
                Doğru/Yanlış
              </Button>
            </div>

            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Soru</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Soru metnini yazın..." 
                      {...field} 
                      data-testid="input-question-text"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label>Seçenekler</Label>
              {options.map((option, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correctAnswer"
                    checked={form.watch("correctAnswerIndex") === idx}
                    onChange={() => form.setValue("correctAnswerIndex", idx)}
                    className="w-4 h-4"
                  />
                  <Input
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...options];
                      newOptions[idx] = e.target.value;
                      setOptions(newOptions);
                    }}
                    placeholder={`Seçenek ${idx + 1}`}
                    disabled={questionType === "true_false"}
                    data-testid={`input-option-${idx}`}
                  />
                </div>
              ))}
              {questionType === "multiple_choice" && options.length < 6 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOptions([...options, ""])}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Seçenek Ekle
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                Doğru cevabı seçmek için radio butonunu işaretleyin
              </p>
            </div>

            <FormField
              control={form.control}
              name="explanation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Açıklama (Opsiyonel)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Cevap sonrası gösterilecek açıklama..." 
                      {...field} 
                      data-testid="input-question-explanation"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="points"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Puan</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={1} 
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      data-testid="input-question-points"
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
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-question">
                {mutation.isPending ? 'Ekleniyor...' : 'Soru Ekle'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const quizSchema = z.object({
  title: z.string().min(3, "Başlık en az 3 karakter olmalı"),
  description: z.string().optional(),
  passingScore: z.number().min(1).max(100).default(70),
  timeLimit: z.number().min(1).optional(),
  maxAttempts: z.number().min(1).default(3),
});

function QuizDialog({ 
  open, 
  onOpenChange 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof quizSchema>>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      title: "",
      description: "",
      passingScore: 70,
      timeLimit: undefined,
      maxAttempts: 3,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof quizSchema>) => {
      const res = await fetch('/api/academy/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/academy/quizzes'] });
      toast({ title: "Başarılı", description: "Quiz oluşturuldu" });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni Quiz Oluştur</DialogTitle>
          <DialogDescription>
            Personel için yeni bir quiz ekleyin
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quiz Başlığı</FormLabel>
                  <FormControl>
                    <Input placeholder="ör: Espresso Hazırlama" {...field} data-testid="input-quiz-title" />
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
                    <Textarea placeholder="Quiz hakkında kısa bir açıklama..." {...field} data-testid="input-quiz-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="passingScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Geçme Notu (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1} 
                        max={100}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 70)}
                        data-testid="input-quiz-passing-score"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timeLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Süre (dk)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1}
                        placeholder="Opsiyonel"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        data-testid="input-quiz-time-limit"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="maxAttempts"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maksimum Deneme Hakkı</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={1}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 3)}
                      data-testid="input-quiz-max-attempts"
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
              <Button type="submit" disabled={mutation.isPending} data-testid="button-create-quiz">
                {mutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
