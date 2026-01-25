import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Flower
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

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
      milk?: { ml: number; type: string };
      syrups?: Record<string, number>;
      powders?: Record<string, number>;
      garnish?: string[];
      ice?: string;
    };
    longDiva?: {
      cupMl: number;
      steps: string[];
      espresso?: string;
      milk?: { ml: number; type: string };
      syrups?: Record<string, number>;
      powders?: Record<string, number>;
      garnish?: string[];
      ice?: string;
    };
  } | null;
  ingredients: Array<{ name: string; amount: string; unit?: string }> | null;
  notes: string | null;
};

type RecipeWithVersion = Recipe & {
  versions: RecipeVersion[];
};

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
};

export default function Receteler() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSize, setSelectedSize] = useState<"massivo" | "longDiva">("massivo");
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeWithVersion | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: categories = [], isLoading: loadingCategories } = useQuery<RecipeCategory[]>({
    queryKey: ["/api/academy/recipe-categories"],
  });

  const { data: recipes = [], isLoading: loadingRecipes } = useQuery<Recipe[]>({
    queryKey: ["/api/academy/recipes"],
  });

  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      const matchesSearch = recipe.nameTr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || 
        recipe.categoryId === parseInt(selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }, [recipes, searchQuery, selectedCategory]);

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
        return <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-200">Kolay</Badge>;
      case "medium":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-200">Orta</Badge>;
      case "hard":
        return <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-200">Zor</Badge>;
      default:
        return null;
    }
  };

  const currentVersion = selectedRecipe?.versions?.[0];
  const sizeData = currentVersion?.sizes?.[selectedSize];

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <ChefHat className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Reçete Kartları</h1>
            <p className="text-muted-foreground text-sm">
              Tüm içecek ve yiyeceklerin hazırlanış tarifleri
            </p>
          </div>
        </div>

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
          <Tabs value={selectedSize} onValueChange={(v) => setSelectedSize(v as "massivo" | "longDiva")} className="w-auto">
            <TabsList>
              <TabsTrigger value="massivo" data-testid="tab-massivo">Massivo</TabsTrigger>
              <TabsTrigger value="longDiva" data-testid="tab-longdiva">Long Diva</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
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
              categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === String(cat.id) ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(String(cat.id))}
                  className="whitespace-nowrap flex items-center gap-1"
                  data-testid={`btn-category-${cat.id}`}
                >
                  {getCategoryIcon(cat.iconName)}
                  <span>{cat.titleTr}</span>
                </Button>
              ))
            )}
          </div>
        </ScrollArea>
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
          {categories.filter(cat => groupedRecipes[cat.id]?.length > 0).map((category) => (
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
                {groupedRecipes[category.id]?.map((recipe) => (
                  <Card 
                    key={recipe.id} 
                    className="hover-elevate cursor-pointer"
                    onClick={() => handleRecipeClick(recipe)}
                    data-testid={`card-recipe-${recipe.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs font-mono">
                              {recipe.code}
                            </Badge>
                            {recipe.isFeatured && (
                              <Badge className="text-xs">Öne Çıkan</Badge>
                            )}
                          </div>
                          <h3 className="font-medium truncate">{recipe.nameTr}</h3>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
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
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">{selectedRecipe.code}</Badge>
                  {getDifficultyBadge(selectedRecipe.difficulty)}
                </div>
                <DialogTitle className="text-xl">{selectedRecipe.nameTr}</DialogTitle>
                {selectedRecipe.description && (
                  <DialogDescription>{selectedRecipe.description}</DialogDescription>
                )}
              </DialogHeader>

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

                      {sizeData.milk && (
                        <Card>
                          <CardHeader className="py-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Droplets className="h-4 w-4" /> Süt
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <p className="font-medium">{sizeData.milk.ml}ml - {sizeData.milk.type}</p>
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
