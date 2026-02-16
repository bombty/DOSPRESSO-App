import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Coffee, 
  Snowflake, 
  IceCream, 
  Citrus, 
  Leaf,
  ChefHat,
  Clock,
  Beaker,
  ChevronRight,
  Droplets,
  Package,
  CircleDot,
  Flower,
  UtensilsCrossed,
  BellDot,
  CheckCheck,
  Flame,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Sparkles,
  Megaphone,
  MessageSquare,
  TrendingUp,
  Presentation,
  Thermometer,
  AlertTriangle,
  Image as ImageIcon
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isHQRole } from "@shared/schema";
import { ImageUploader } from "@/components/image-uploader";

type RecipeCategory = {
  id: number;
  slug: string;
  titleTr: string;
  titleEn: string | null;
  description: string | null;
  iconName: string | null;
  colorHex: string | null;
  displayOrder: number | null;
  isActive: boolean | null;
};

type Recipe = {
  id: number;
  code: string;
  nameTr: string;
  nameEn: string | null;
  description: string | null;
  hasCoffee: boolean | null;
  hasMilk: boolean | null;
  difficulty: string | null;
  estimatedMinutes: number | null;
  photoUrl: string | null;
  isFeatured: boolean | null;
  categoryId: number;
  tags?: string[];
  subCategory?: string | null;
  infographicUrl?: string | null;
  marketingText?: string | null;
  salesTips?: string | null;
  presentationNotes?: string | null;
  storageConditions?: string | null;
  upsellingNotes?: string | null;
  importantNotes?: string | null;
};

type RecipeVersion = {
  id: number;
  recipeId: number;
  versionNumber: number;
  sizes: {
    massivo?: {
      cupMl: number;
      steps: string[];
      espresso?: string;
      concentrates?: Array<{ name: string; pumps: number; }>;
      milk?: { ml?: number; line?: string; type?: string; };
      water?: { ml?: number; line?: string; };
      syrups?: Record<string, number>;
      powders?: Record<string, number>;
      liquids?: Record<string, number>;
      garnish?: string[];
      toppings?: string[];
      ice?: string;
      lid?: string;
      equipment?: string[];
      blenderSetting?: string;
      servingNotes?: string;
    };
    longDiva?: {
      cupMl: number;
      steps: string[];
      espresso?: string;
      concentrates?: Array<{ name: string; pumps: number; }>;
      milk?: { ml?: number; line?: string; type?: string; };
      water?: { ml?: number; line?: string; };
      syrups?: Record<string, number>;
      powders?: Record<string, number>;
      liquids?: Record<string, number>;
      garnish?: string[];
      toppings?: string[];
      ice?: string;
      lid?: string;
      equipment?: string[];
      blenderSetting?: string;
      servingNotes?: string;
    };
  } | null;
  ingredients: Array<{ name: string; amount: string; unit?: string }> | null;
  notes: string | null;
  cookingSteps?: string[];
  preparationNotes?: string | null;
  servingInstructions?: string | null;
  storageInfo?: string | null;
};

type RecipeWithVersion = Recipe & {
  versions: RecipeVersion[];
};

type RecipeNotification = {
  id: number;
  recipeId: number;
  versionId: number;
  isRead: boolean;
  createdAt: string;
  recipeName: string | null;
  versionNumber: number | null;
};

const FOOD_SLUGS = new Set(["donutlar", "tatlilar", "tuzlular"]);

const iconMap: Record<string, React.ReactNode> = {
  Coffee: <Coffee className="h-5 w-5" />,
  Snowflake: <Snowflake className="h-5 w-5" />,
  IceCream: <IceCream className="h-5 w-5" />,
  Citrus: <Citrus className="h-5 w-5" />,
  Leaf: <Leaf className="h-5 w-5" />,
  Droplets: <Droplets className="h-5 w-5" />,
  Package: <Package className="h-5 w-5" />,
  CircleDot: <CircleDot className="h-5 w-5" />,
  Flower: <Flower className="h-5 w-5" />,
  Flower2: <Flower className="h-5 w-5" />,
  UtensilsCrossed: <UtensilsCrossed className="h-5 w-5" />,
};

export default function Receteler() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSize, setSelectedSize] = useState<"massivo" | "longDiva">("massivo");
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeWithVersion | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [mainTab, setMainTab] = useState<"beverages" | "food">("beverages");
  const [tempFilter, setTempFilter] = useState<"all" | "hot" | "iced" | "blend">("all");
  const { user } = useAuth();
  const { toast } = useToast();

  const canEdit = user?.role === 'admin' || isHQRole(user?.role as any);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [formNameTr, setFormNameTr] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDifficulty, setFormDifficulty] = useState("");
  const [formEstimatedMinutes, setFormEstimatedMinutes] = useState("");
  const [formHasCoffee, setFormHasCoffee] = useState(false);
  const [formHasMilk, setFormHasMilk] = useState(false);
  const [formSubCategory, setFormSubCategory] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formPhotoUrl, setFormPhotoUrl] = useState("");
  const [formInfographicUrl, setFormInfographicUrl] = useState("");
  const [formMarketingText, setFormMarketingText] = useState("");
  const [formSalesTips, setFormSalesTips] = useState("");
  const [formUpsellingNotes, setFormUpsellingNotes] = useState("");
  const [formPresentationNotes, setFormPresentationNotes] = useState("");
  const [formStorageConditions, setFormStorageConditions] = useState("");
  const [formImportantNotes, setFormImportantNotes] = useState("");

  const { data: categories = [], isLoading: loadingCategories } = useQuery<RecipeCategory[]>({
    queryKey: ["/api/academy/recipe-categories"],
  });

  const { data: recipes = [], isLoading: loadingRecipes } = useQuery<Recipe[]>({
    queryKey: ["/api/academy/recipes"],
  });

  const { data: notifications = [] } = useQuery<RecipeNotification[]>({
    queryKey: ["/api/academy/recipe-notifications"],
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", "/api/academy/recipe-notifications/mark-all-read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/academy/recipe-notifications"] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("PATCH", `/api/academy/recipe-notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/academy/recipe-notifications"] });
    },
  });

  const createRecipeMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      return apiRequest("POST", "/api/academy/recipes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/academy/recipes"] });
      toast({ title: "Reçete oluşturuldu", description: "Yeni reçete başarıyla eklendi." });
      setIsEditDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Reçete oluşturulamadı.", variant: "destructive" });
    },
  });

  const updateRecipeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, any> }) => {
      return apiRequest("PATCH", `/api/academy/recipes/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/academy/recipes"] });
      toast({ title: "Reçete güncellendi", description: "Reçete başarıyla kaydedildi." });
      setIsEditDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Reçete güncellenemedi.", variant: "destructive" });
    },
  });

  const deleteRecipeMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/academy/recipes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/academy/recipes"] });
      toast({ title: "Reçete silindi", description: "Reçete başarıyla silindi." });
      setIsEditDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Reçete silinemedi.", variant: "destructive" });
    },
  });

  const generateMarketingMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/academy/recipes/${id}/generate-marketing`);
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.marketingText) setFormMarketingText(data.marketingText);
      if (data.salesTips) setFormSalesTips(data.salesTips);
      if (data.upsellingNotes) setFormUpsellingNotes(data.upsellingNotes);
      if (data.presentationNotes) setFormPresentationNotes(data.presentationNotes);
      if (data.storageConditions) setFormStorageConditions(data.storageConditions);
      if (data.importantNotes) setFormImportantNotes(data.importantNotes);
      toast({ title: "AI içerik oluşturuldu", description: "Pazarlama alanları dolduruldu." });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "AI içerik oluşturulamadı.", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setEditingRecipe(null);
    setFormNameTr("");
    setFormCode("");
    setFormCategoryId("");
    setFormDescription("");
    setFormDifficulty("");
    setFormEstimatedMinutes("");
    setFormHasCoffee(false);
    setFormHasMilk(false);
    setFormSubCategory("");
    setFormTags("");
    setFormPhotoUrl("");
    setFormInfographicUrl("");
    setFormMarketingText("");
    setFormSalesTips("");
    setFormUpsellingNotes("");
    setFormPresentationNotes("");
    setFormStorageConditions("");
    setFormImportantNotes("");
  };

  const openCreateDialog = () => {
    resetForm();
    setIsEditDialogOpen(true);
  };

  const openEditDialog = (recipe: Recipe, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setEditingRecipe(recipe);
    setFormNameTr(recipe.nameTr || "");
    setFormCode(recipe.code || "");
    setFormCategoryId(String(recipe.categoryId));
    setFormDescription(recipe.description || "");
    setFormDifficulty(recipe.difficulty || "");
    setFormEstimatedMinutes(recipe.estimatedMinutes ? String(recipe.estimatedMinutes) : "");
    setFormHasCoffee(recipe.hasCoffee || false);
    setFormHasMilk(recipe.hasMilk || false);
    setFormSubCategory(recipe.subCategory || "");
    setFormTags(Array.isArray(recipe.tags) ? recipe.tags.join(", ") : "");
    setFormPhotoUrl(recipe.photoUrl || "");
    setFormInfographicUrl(recipe.infographicUrl || "");
    setFormMarketingText(recipe.marketingText || "");
    setFormSalesTips(recipe.salesTips || "");
    setFormUpsellingNotes(recipe.upsellingNotes || "");
    setFormPresentationNotes(recipe.presentationNotes || "");
    setFormStorageConditions(recipe.storageConditions || "");
    setFormImportantNotes(recipe.importantNotes || "");
    setIsEditDialogOpen(true);
  };

  const handleSaveRecipe = () => {
    if (!formNameTr.trim() || !formCode.trim()) {
      toast({ title: "Eksik alan", description: "Reçete adı ve kodu zorunludur.", variant: "destructive" });
      return;
    }

    const payload: Record<string, any> = {
      nameTr: formNameTr.trim(),
      code: formCode.trim(),
      categoryId: formCategoryId ? parseInt(formCategoryId) : undefined,
      description: formDescription.trim() || null,
      difficulty: formDifficulty || null,
      estimatedMinutes: formEstimatedMinutes ? parseInt(formEstimatedMinutes) : null,
      hasCoffee: formHasCoffee,
      hasMilk: formHasMilk,
      subCategory: formSubCategory || null,
      tags: formTags.trim() ? formTags.split(",").map(t => t.trim()).filter(Boolean) : [],
      photoUrl: formPhotoUrl || null,
      infographicUrl: formInfographicUrl || null,
      marketingText: formMarketingText.trim() || null,
      salesTips: formSalesTips.trim() || null,
      upsellingNotes: formUpsellingNotes.trim() || null,
      presentationNotes: formPresentationNotes.trim() || null,
      storageConditions: formStorageConditions.trim() || null,
      importantNotes: formImportantNotes.trim() || null,
    };

    if (editingRecipe) {
      updateRecipeMutation.mutate({ id: editingRecipe.id, data: payload });
    } else {
      createRecipeMutation.mutate(payload);
    }
  };

  const handleDeleteRecipe = () => {
    if (!editingRecipe) return;
    if (!confirm("Bu reçeteyi silmek istediğinizden emin misiniz?")) return;
    deleteRecipeMutation.mutate(editingRecipe.id);
  };

  const unreadNotifications = useMemo(() => {
    return notifications.filter((n) => !n.isRead);
  }, [notifications]);

  const updatedRecipeIds = useMemo(() => {
    return new Set(unreadNotifications.map((n) => n.recipeId));
  }, [unreadNotifications]);

  const beverageCategories = useMemo(() => {
    return categories.filter((c) => !FOOD_SLUGS.has(c.slug));
  }, [categories]);

  const foodCategories = useMemo(() => {
    return categories.filter((c) => FOOD_SLUGS.has(c.slug));
  }, [categories]);

  const activeCategories = mainTab === "beverages" ? beverageCategories : foodCategories;
  const activeCategoryIds = useMemo(() => new Set(activeCategories.map((c) => c.id)), [activeCategories]);

  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      const matchesSearch = recipe.nameTr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" 
        ? activeCategoryIds.has(recipe.categoryId)
        : recipe.categoryId === parseInt(selectedCategory);
      
      if (tempFilter !== "all") {
        const recipeSubCat = recipe.subCategory || (recipe.code.startsWith('I') || (Array.isArray(recipe.tags) && recipe.tags.includes('iced')) ? 'iced' : 'hot');
        if (tempFilter === "hot" && recipeSubCat !== "hot") return false;
        if (tempFilter === "iced" && recipeSubCat !== "iced") return false;
        if (tempFilter === "blend" && recipeSubCat !== "blend") return false;
      }
      
      return matchesSearch && matchesCategory;
    });
  }, [recipes, searchQuery, selectedCategory, activeCategoryIds, tempFilter]);

  const groupedRecipes = useMemo(() => {
    const grouped: Record<number, Recipe[]> = {};
    filteredRecipes.forEach((recipe) => {
      if (!grouped[recipe.categoryId]) {
        grouped[recipe.categoryId] = [];
      }
      grouped[recipe.categoryId].push(recipe);
    });
    return grouped;
  }, [filteredRecipes]);

  const handleRecipeClick = async (recipe: Recipe) => {
    try {
      const response = await fetch(`/api/academy/recipe/${recipe.id}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedRecipe(data);
        setIsDialogOpen(true);
        const notification = unreadNotifications.find((n) => n.recipeId === recipe.id);
        if (notification) {
          markReadMutation.mutate(notification.id);
        }
      }
    } catch (error) {
      console.error("Error fetching recipe details:", error);
    }
  };

  const getCategoryIcon = (iconName: string | null) => {
    if (!iconName) return <Coffee className="h-5 w-5" />;
    return iconMap[iconName] || <Coffee className="h-5 w-5" />;
  };

  const getDifficultyBadge = (difficulty: string | null) => {
    switch (difficulty) {
      case "easy":
        return <Badge variant="secondary">Kolay</Badge>;
      case "medium":
        return <Badge variant="outline">Orta</Badge>;
      case "hard":
        return <Badge variant="destructive">Zor</Badge>;
      default:
        return null;
    }
  };

  const currentVersion = selectedRecipe?.versions?.[0];
  const sizeData = currentVersion?.sizes?.[selectedSize];

  const beverageCount = useMemo(() => {
    const ids = new Set(beverageCategories.map(c => c.id));
    return recipes.filter(r => ids.has(r.categoryId)).length;
  }, [recipes, beverageCategories]);

  const foodCount = useMemo(() => {
    const ids = new Set(foodCategories.map(c => c.id));
    return recipes.filter(r => ids.has(r.categoryId)).length;
  }, [recipes, foodCategories]);

  const isSaving = createRecipeMutation.isPending || updateRecipeMutation.isPending;

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <ChefHat className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Reçete Kartları</h1>
              <p className="text-muted-foreground text-sm">
                {recipes.length} ürün, {categories.length} kategori
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {canEdit && (
              <Button
                onClick={openCreateDialog}
                data-testid="button-new-recipe"
              >
                <Plus className="h-4 w-4 mr-1" />
                Yeni Reçete
              </Button>
            )}
            {unreadNotifications.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                data-testid="button-mark-all-read"
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                {unreadNotifications.length} güncelleme okundu işaretle
              </Button>
            )}
          </div>
        </div>

        <Tabs value={mainTab} onValueChange={(v) => { const newTab = v as "beverages" | "food"; setMainTab(newTab); setSelectedCategory("all"); if (newTab === "food") { setTempFilter("all"); } }}>
          <TabsList className="w-full">
            <TabsTrigger value="beverages" className="flex-1 gap-2" data-testid="tab-beverages">
              <Coffee className="h-4 w-4" />
              İçecekler
              <Badge variant="secondary" className="ml-1">{beverageCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="food" className="flex-1 gap-2" data-testid="tab-food">
              <UtensilsCrossed className="h-4 w-4" />
              Yiyecekler
              <Badge variant="secondary" className="ml-1">{foodCount}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Reçete ara... (örn: Latte, Americano)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-recipe"
            />
          </div>
          {mainTab === "beverages" && (
            <Tabs value={selectedSize} onValueChange={(v) => setSelectedSize(v as "massivo" | "longDiva")} className="w-auto">
              <TabsList>
                <TabsTrigger value="massivo" data-testid="tab-massivo">Massivo</TabsTrigger>
                <TabsTrigger value="longDiva" data-testid="tab-longdiva">Long Diva</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>

        {mainTab === "beverages" && (
          <div className="flex items-center gap-1">
            <Button 
              size="sm" 
              variant="ghost"
              className={`toggle-elevate ${tempFilter === 'all' ? 'toggle-elevated' : ''}`}
              onClick={() => setTempFilter('all')}
              data-testid="filter-temp-all"
            >
              Tümü
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              className={`toggle-elevate ${tempFilter === 'hot' ? 'toggle-elevated' : ''}`}
              onClick={() => setTempFilter('hot')}
              data-testid="filter-temp-hot"
            >
              <Flame className="h-3.5 w-3.5 mr-1" />
              Sıcak
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              className={`toggle-elevate ${tempFilter === 'iced' ? 'toggle-elevated' : ''}`}
              onClick={() => setTempFilter('iced')}
              data-testid="filter-temp-iced"
            >
              <Snowflake className="h-3.5 w-3.5 mr-1" />
              Soğuk
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              className={`toggle-elevate ${tempFilter === 'blend' ? 'toggle-elevated' : ''}`}
              onClick={() => setTempFilter('blend')}
              data-testid="filter-temp-blend"
            >
              <IceCream className="h-3.5 w-3.5 mr-1" />
              Blend
            </Button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("all")}
            data-testid="btn-category-all"
          >
            Tümü
          </Button>
          {loadingCategories ? (
            <>
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
            </>
          ) : (
            activeCategories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === String(cat.id) ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(String(cat.id))}
                className="flex items-center gap-1"
                data-testid={`btn-category-${cat.id}`}
              >
                {getCategoryIcon(cat.iconName)}
                <span>{cat.titleTr}</span>
              </Button>
            ))
          )}
        </div>
      </div>

      {loadingRecipes ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : filteredRecipes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ChefHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Arama kriterlerine uygun reçete bulunamadı</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {activeCategories.filter(cat => groupedRecipes[cat.id]?.length > 0).map((category) => (
            <div key={category.id}>
              <div className="flex items-center gap-2 mb-3">
                <div 
                  className="p-2 rounded-lg" 
                  style={{ backgroundColor: category.colorHex ? `${category.colorHex}20` : undefined }}
                >
                  {getCategoryIcon(category.iconName)}
                </div>
                <h2 className="text-lg font-semibold">{category.titleTr}</h2>
                <Badge variant="secondary">{groupedRecipes[category.id]?.length}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {groupedRecipes[category.id]?.map((recipe) => {
                  const isUpdated = updatedRecipeIds.has(recipe.id);
                  return (
                    <Card 
                      key={recipe.id} 
                      className="hover-elevate cursor-pointer relative"
                      onClick={() => handleRecipeClick(recipe)}
                      data-testid={`card-recipe-${recipe.id}`}
                    >
                      {canEdit && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute top-2 right-2 z-10"
                          onClick={(e) => openEditDialog(recipe, e)}
                          data-testid={`button-edit-recipe-${recipe.id}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="outline" className="text-xs font-mono">
                                {recipe.code}
                              </Badge>
                              {recipe.isFeatured && (
                                <Badge className="text-xs">Öne Çıkan</Badge>
                              )}
                              {recipe.subCategory && (
                                <Badge variant="outline" className="text-xs">
                                  {recipe.subCategory === 'hot' && <Flame className="h-3 w-3 mr-0.5 text-orange-500" />}
                                  {recipe.subCategory === 'iced' && <Snowflake className="h-3 w-3 mr-0.5 text-blue-500" />}
                                  {recipe.subCategory === 'blend' && <IceCream className="h-3 w-3 mr-0.5 text-purple-500" />}
                                  {recipe.subCategory === 'hot' ? 'Hot' : recipe.subCategory === 'iced' ? 'Iced' : 'Blend'}
                                </Badge>
                              )}
                              {isUpdated && (
                                <Badge variant="secondary" className="text-xs" data-testid={`badge-updated-${recipe.id}`}>
                                  <BellDot className="h-3 w-3 mr-1" />
                                  Güncellendi
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-medium truncate">{recipe.nameTr}</h3>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                              {recipe.hasCoffee && (
                                <span className="flex items-center gap-1">
                                  <Coffee className="h-3 w-3" /> Kahveli
                                </span>
                              )}
                              {recipe.hasMilk && (
                                <span className="flex items-center gap-1">
                                  <Droplets className="h-3 w-3" /> Sütlü
                                </span>
                              )}
                              {recipe.estimatedMinutes && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {recipe.estimatedMinutes} dk
                                </span>
                              )}
                            </div>
                          </div>
                          {!canEdit && (
                            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedRecipe && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono">{selectedRecipe.code}</Badge>
                  {getDifficultyBadge(selectedRecipe.difficulty)}
                  {selectedRecipe.subCategory && (
                    <Badge variant="outline" className="text-xs">
                      {selectedRecipe.subCategory === 'hot' && <Flame className="h-3 w-3 mr-0.5 text-orange-500" />}
                      {selectedRecipe.subCategory === 'iced' && <Snowflake className="h-3 w-3 mr-0.5 text-blue-500" />}
                      {selectedRecipe.subCategory === 'blend' && <IceCream className="h-3 w-3 mr-0.5 text-purple-500" />}
                      {selectedRecipe.subCategory === 'hot' ? 'Hot' : selectedRecipe.subCategory === 'iced' ? 'Iced' : 'Blend'}
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-xl">{selectedRecipe.nameTr}</DialogTitle>
                {selectedRecipe.description && (
                  <DialogDescription>{selectedRecipe.description}</DialogDescription>
                )}
              </DialogHeader>

              {currentVersion?.sizes ? (
                <Tabs value={selectedSize} onValueChange={(v) => setSelectedSize(v as "massivo" | "longDiva")}>
                  <TabsList className="w-full">
                    <TabsTrigger value="massivo" className="flex-1" data-testid="dialog-tab-massivo">
                      Massivo {currentVersion?.sizes?.massivo?.cupMl && `(${currentVersion.sizes.massivo.cupMl}ml)`}
                    </TabsTrigger>
                    <TabsTrigger value="longDiva" className="flex-1" data-testid="dialog-tab-longdiva">
                      Long Diva {currentVersion?.sizes?.longDiva?.cupMl && `(${currentVersion.sizes.longDiva.cupMl}ml)`}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value={selectedSize} className="space-y-4 mt-4">
                    {sizeData ? (
                      <>
                        {sizeData.espresso && (
                          <Card>
                            <CardHeader className="py-3">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Coffee className="h-4 w-4" /> Espresso
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <p className="font-medium">{sizeData.espresso}</p>
                            </CardContent>
                          </Card>
                        )}

                        {sizeData.concentrates && sizeData.concentrates.length > 0 && (
                          <Card>
                            <CardHeader className="py-3">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Beaker className="h-4 w-4" /> Konsantre / Aroma
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="flex flex-wrap gap-2">
                                {sizeData.concentrates.map((c, idx) => (
                                  <Badge key={idx} variant="secondary">
                                    {c.name}: {c.pumps} pump
                                  </Badge>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {sizeData.milk && (
                          <Card>
                            <CardHeader className="py-3">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Droplets className="h-4 w-4" /> Süt
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="flex flex-wrap gap-2">
                                {sizeData.milk.ml && <Badge variant="secondary">{sizeData.milk.ml} ml</Badge>}
                                {sizeData.milk.line && <Badge variant="outline">Çizgi: {sizeData.milk.line}</Badge>}
                                {sizeData.milk.type && <Badge variant="outline">{sizeData.milk.type}</Badge>}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {sizeData.water && (sizeData.water.ml || sizeData.water.line) && (
                          <Card>
                            <CardHeader className="py-3">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Droplets className="h-4 w-4" /> Su
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="flex flex-wrap gap-2">
                                {sizeData.water.ml && <Badge variant="secondary">{sizeData.water.ml} ml</Badge>}
                                {sizeData.water.line && <Badge variant="outline">Çizgi: {sizeData.water.line}</Badge>}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {sizeData.syrups && Object.keys(sizeData.syrups).length > 0 && (
                          <Card>
                            <CardHeader className="py-3">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Beaker className="h-4 w-4" /> Şuruplar
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(sizeData.syrups).map(([name, amount]) => (
                                  <Badge key={name} variant="secondary">
                                    {name}: {amount} pump
                                  </Badge>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {sizeData.ice && (
                          <Card>
                            <CardHeader className="py-3">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Snowflake className="h-4 w-4" /> Buz
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <p className="font-medium">{sizeData.ice}</p>
                            </CardContent>
                          </Card>
                        )}

                        {sizeData.lid && (
                          <Card>
                            <CardHeader className="py-3">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Package className="h-4 w-4" /> Kapak Tipi
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <p className="font-medium">{sizeData.lid}</p>
                            </CardContent>
                          </Card>
                        )}

                        {sizeData.equipment && sizeData.equipment.length > 0 && (
                          <Card>
                            <CardHeader className="py-3">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <UtensilsCrossed className="h-4 w-4" /> Ekipman
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="flex flex-wrap gap-2">
                                {sizeData.equipment.map((item, idx) => (
                                  <Badge key={idx} variant="outline">{item}</Badge>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {sizeData.blenderSetting && (
                          <Card>
                            <CardHeader className="py-3">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <CircleDot className="h-4 w-4" /> Blender Ayarı
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <p className="font-medium">{sizeData.blenderSetting}</p>
                            </CardContent>
                          </Card>
                        )}

                        {sizeData.toppings && sizeData.toppings.length > 0 && (
                          <Card>
                            <CardHeader className="py-3">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Flower className="h-4 w-4" /> Topping
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="flex flex-wrap gap-2">
                                {sizeData.toppings.map((item, idx) => (
                                  <Badge key={idx} variant="outline">{item}</Badge>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {sizeData.garnish && sizeData.garnish.length > 0 && (
                          <Card>
                            <CardHeader className="py-3">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Flower className="h-4 w-4" /> Süsleme
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="flex flex-wrap gap-2">
                                {sizeData.garnish.map((item, idx) => (
                                  <Badge key={idx} variant="outline">{item}</Badge>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {sizeData.steps && sizeData.steps.length > 0 && (
                          <Card>
                            <CardHeader className="py-3">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <ChefHat className="h-4 w-4" /> Hazırlama Adımları
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <ol className="list-decimal list-inside space-y-2">
                                {sizeData.steps.map((step, idx) => (
                                  <li key={idx} className="text-sm">{step}</li>
                                ))}
                              </ol>
                            </CardContent>
                          </Card>
                        )}

                        {sizeData.servingNotes && (
                          <Card className="bg-muted/50">
                            <CardContent className="py-3">
                              <p className="text-sm text-muted-foreground">
                                <strong>Servis Notu:</strong> {sizeData.servingNotes}
                              </p>
                            </CardContent>
                          </Card>
                        )}

                        {currentVersion?.notes && (
                          <Card className="bg-muted/50">
                            <CardContent className="py-3">
                              <p className="text-sm text-muted-foreground">
                                <strong>Not:</strong> {currentVersion.notes}
                              </p>
                            </CardContent>
                          </Card>
                        )}
                      </>
                    ) : (
                      <Card>
                        <CardContent className="py-8 text-center">
                          <p className="text-muted-foreground">
                            Bu boy için reçete bilgisi henüz eklenmemiş
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                </Tabs>
              ) : currentVersion?.ingredients ? (
                <div className="space-y-4 mt-4">
                  {Array.isArray(currentVersion.ingredients) && currentVersion.ingredients.length > 0 && (
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Beaker className="h-4 w-4" /> İçerik / Malzeme
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-1">
                          {currentVersion.ingredients.map((ing: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs flex-shrink-0">{idx + 1}</span>
                              <span>{typeof ing === 'string' ? ing : `${ing.name}${ing.amount ? ` - ${ing.amount}` : ''}${ing.unit ? ` ${ing.unit}` : ''}`}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {currentVersion?.cookingSteps && currentVersion.cookingSteps.length > 0 && (
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Flame className="h-4 w-4" /> Pişirme Adımları
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <ol className="list-decimal list-inside space-y-2">
                          {currentVersion.cookingSteps.map((step: string, idx: number) => (
                            <li key={idx} className="text-sm">{step}</li>
                          ))}
                        </ol>
                      </CardContent>
                    </Card>
                  )}

                  {currentVersion?.preparationNotes && (
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <ChefHat className="h-4 w-4" /> Hazırlık Notları
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm whitespace-pre-wrap">{currentVersion.preparationNotes}</p>
                      </CardContent>
                    </Card>
                  )}

                  {currentVersion?.servingInstructions && (
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Presentation className="h-4 w-4" /> Sunum Talimatları
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm whitespace-pre-wrap">{currentVersion.servingInstructions}</p>
                      </CardContent>
                    </Card>
                  )}

                  {currentVersion?.storageInfo && (
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Thermometer className="h-4 w-4" /> Saklama Bilgisi
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm whitespace-pre-wrap">{currentVersion.storageInfo}</p>
                      </CardContent>
                    </Card>
                  )}

                  {currentVersion?.notes && (
                    <Card className="bg-muted/50">
                      <CardContent className="py-3">
                        <p className="text-sm text-muted-foreground">
                          <strong>Not:</strong> {currentVersion.notes}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">
                      Bu ürün için detaylı reçete bilgisi henüz eklenmemiş
                    </p>
                  </CardContent>
                </Card>
              )}

              {selectedRecipe.marketingText && (
                <Card className="mt-4" data-testid="card-marketing-text">
                  <CardHeader className="py-3 bg-primary/5 rounded-t-lg">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Megaphone className="h-4 w-4 text-primary" /> Pazarlama Dili
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3">
                    <p className="text-sm whitespace-pre-wrap">{selectedRecipe.marketingText}</p>
                  </CardContent>
                </Card>
              )}

              {selectedRecipe.salesTips && (
                <Card className="mt-4" data-testid="card-sales-tips">
                  <CardHeader className="py-3 bg-blue-500/5 rounded-t-lg">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-500" /> Satış Dili
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3">
                    <p className="text-sm whitespace-pre-wrap">{selectedRecipe.salesTips}</p>
                  </CardContent>
                </Card>
              )}

              {selectedRecipe.upsellingNotes && (
                <Card className="mt-4" data-testid="card-upselling-notes">
                  <CardHeader className="py-3 bg-green-500/5 rounded-t-lg">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" /> Upselling Önerileri
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3">
                    <p className="text-sm whitespace-pre-wrap">{selectedRecipe.upsellingNotes}</p>
                  </CardContent>
                </Card>
              )}

              {selectedRecipe.presentationNotes && (
                <Card className="mt-4" data-testid="card-presentation-notes">
                  <CardHeader className="py-3 bg-purple-500/5 rounded-t-lg">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Presentation className="h-4 w-4 text-purple-500" /> Sunum Notları
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3">
                    <p className="text-sm whitespace-pre-wrap">{selectedRecipe.presentationNotes}</p>
                  </CardContent>
                </Card>
              )}

              {selectedRecipe.storageConditions && (
                <Card className="mt-4" data-testid="card-storage-conditions">
                  <CardHeader className="py-3 bg-orange-500/5 rounded-t-lg">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Thermometer className="h-4 w-4 text-orange-500" /> Saklama Koşulları
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3">
                    <p className="text-sm whitespace-pre-wrap">{selectedRecipe.storageConditions}</p>
                  </CardContent>
                </Card>
              )}

              {selectedRecipe.importantNotes && (
                <Card className="mt-4" data-testid="card-important-notes">
                  <CardHeader className="py-3 bg-destructive/5 rounded-t-lg">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" /> Önemli Notlar
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3">
                    <p className="text-sm whitespace-pre-wrap">{selectedRecipe.importantNotes}</p>
                  </CardContent>
                </Card>
              )}

              {selectedRecipe.infographicUrl && (
                <Card className="mt-4" data-testid="card-infographic">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" /> İnfografik
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <img 
                      src={selectedRecipe.infographicUrl} 
                      alt="İnfografik" 
                      className="w-full rounded-md"
                      data-testid="img-infographic"
                    />
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRecipe ? "Reçete Düzenle" : "Yeni Reçete"}</DialogTitle>
            <DialogDescription>
              {editingRecipe ? "Reçete bilgilerini güncelleyin." : "Yeni bir reçete ekleyin."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="form-name">Reçete Adı *</Label>
                <Input
                  id="form-name"
                  value={formNameTr}
                  onChange={(e) => setFormNameTr(e.target.value)}
                  placeholder="Örn: Caramel Latte"
                  data-testid="input-recipe-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="form-code">Reçete Kodu *</Label>
                <Input
                  id="form-code"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="Örn: H_CL_01"
                  data-testid="input-recipe-code"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="Kategori seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.titleTr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Alt Kategori</Label>
                <Select value={formSubCategory} onValueChange={setFormSubCategory}>
                  <SelectTrigger data-testid="select-sub-category">
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hot">
                      <span className="flex items-center gap-1.5">
                        <Flame className="h-3.5 w-3.5 text-orange-500" />
                        Hot (Sıcak)
                      </span>
                    </SelectItem>
                    <SelectItem value="iced">
                      <span className="flex items-center gap-1.5">
                        <Snowflake className="h-3.5 w-3.5 text-blue-500" />
                        Iced (Soğuk)
                      </span>
                    </SelectItem>
                    <SelectItem value="blend">
                      <span className="flex items-center gap-1.5">
                        <IceCream className="h-3.5 w-3.5 text-purple-500" />
                        Blend
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Zorluk</Label>
                <Select value={formDifficulty} onValueChange={setFormDifficulty}>
                  <SelectTrigger data-testid="select-difficulty">
                    <SelectValue placeholder="Zorluk seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Kolay</SelectItem>
                    <SelectItem value="medium">Orta</SelectItem>
                    <SelectItem value="hard">Zor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="form-description">Açıklama</Label>
              <Textarea
                id="form-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Reçete açıklaması..."
                data-testid="textarea-description"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="form-minutes">Tahmini Süre (dk)</Label>
                <Input
                  id="form-minutes"
                  type="number"
                  value={formEstimatedMinutes}
                  onChange={(e) => setFormEstimatedMinutes(e.target.value)}
                  placeholder="5"
                  data-testid="input-estimated-minutes"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox
                  id="form-coffee"
                  checked={formHasCoffee}
                  onCheckedChange={(v) => setFormHasCoffee(!!v)}
                  data-testid="checkbox-has-coffee"
                />
                <Label htmlFor="form-coffee" className="cursor-pointer">Kahveli</Label>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox
                  id="form-milk"
                  checked={formHasMilk}
                  onCheckedChange={(v) => setFormHasMilk(!!v)}
                  data-testid="checkbox-has-milk"
                />
                <Label htmlFor="form-milk" className="cursor-pointer">Sütlü</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="form-tags">Etiketler (virgülle ayırın)</Label>
              <Input
                id="form-tags"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                placeholder="iced, signature, seasonal"
                data-testid="input-tags"
              />
            </div>

            <ImageUploader 
              value={formPhotoUrl} 
              onChange={setFormPhotoUrl} 
              purpose="recipe" 
              label="Reçete Fotoğrafı" 
            />

            <ImageUploader 
              value={formInfographicUrl} 
              onChange={setFormInfographicUrl} 
              purpose="recipe" 
              label="İnfografik" 
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label htmlFor="form-marketing">Pazarlama Metni</Label>
                {editingRecipe && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateMarketingMutation.mutate(editingRecipe.id)}
                    disabled={generateMarketingMutation.isPending}
                    data-testid="button-generate-marketing"
                  >
                    {generateMarketingMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-1" />
                    )}
                    AI ile Oluştur
                  </Button>
                )}
              </div>
              <Textarea
                id="form-marketing"
                value={formMarketingText}
                onChange={(e) => setFormMarketingText(e.target.value)}
                placeholder="Pazarlama dili metni..."
                data-testid="textarea-marketing-text"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="form-sales">Satış İpuçları</Label>
              <Textarea
                id="form-sales"
                value={formSalesTips}
                onChange={(e) => setFormSalesTips(e.target.value)}
                placeholder="Satış dili ipuçları..."
                data-testid="textarea-sales-tips"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="form-upselling">Upselling Notları</Label>
              <Textarea
                id="form-upselling"
                value={formUpsellingNotes}
                onChange={(e) => setFormUpsellingNotes(e.target.value)}
                placeholder="Upselling önerileri..."
                data-testid="textarea-upselling-notes"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="form-presentation">Sunum Notları</Label>
              <Textarea
                id="form-presentation"
                value={formPresentationNotes}
                onChange={(e) => setFormPresentationNotes(e.target.value)}
                placeholder="Sunum notları..."
                data-testid="textarea-presentation-notes"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="form-storage">Saklama Koşulları</Label>
              <Textarea
                id="form-storage"
                value={formStorageConditions}
                onChange={(e) => setFormStorageConditions(e.target.value)}
                placeholder="Saklama koşulları..."
                data-testid="textarea-storage-conditions"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="form-important">Önemli Notlar</Label>
              <Textarea
                id="form-important"
                value={formImportantNotes}
                onChange={(e) => setFormImportantNotes(e.target.value)}
                placeholder="Önemli notlar..."
                data-testid="textarea-important-notes"
              />
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap pt-4 border-t">
              {editingRecipe && (
                <Button
                  variant="destructive"
                  onClick={handleDeleteRecipe}
                  disabled={deleteRecipeMutation.isPending}
                  data-testid="button-delete-recipe"
                >
                  {deleteRecipeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-1" />
                  )}
                  Sil
                </Button>
              )}
              <div className="flex items-center gap-2 ml-auto flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  data-testid="button-cancel-recipe"
                >
                  İptal
                </Button>
                <Button
                  onClick={handleSaveRecipe}
                  disabled={isSaving}
                  data-testid="button-save-recipe"
                >
                  {isSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  {editingRecipe ? "Kaydet" : "Oluştur"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
