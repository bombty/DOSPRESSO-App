import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, Clock, Coffee, ListCheck, Beaker, AlertTriangle, 
  Image, ChevronDown, ChevronUp, History, User, Star
} from "lucide-react";

type RecipeVersion = {
  id: number;
  recipeId: number;
  versionNumber: number;
  ingredients: string[];
  steps: string[];
  equipmentNeeded: string[];
  tipsTr?: string;
  allergenInfo?: string;
  changeSummary?: Record<string, any>;
  updatedById?: string;
  createdAt: string;
};

type Recipe = {
  id: number;
  categoryId: number;
  nameTr: string;
  nameEn?: string;
  code: string;
  estimatedMinutes: number;
  difficulty: string;
  photoUrl?: string;
  currentVersion?: RecipeVersion;
};

export default function ReceteDetay() {
  const [, params] = useRoute("/recete/:id");
  const recipeId = params?.id;
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [activeTab, setActiveTab] = useState("ingredients");

  const { data: recipe, isLoading } = useQuery({
    queryKey: ["/api/academy/recipe", recipeId],
    queryFn: async () => {
      if (!recipeId) return null;
      const res = await fetch(`/api/academy/recipe/${recipeId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!recipeId,
  });

  const { data: versions = [] } = useQuery({
    queryKey: ["/api/academy/recipe-versions", recipeId],
    queryFn: async () => {
      if (!recipeId) return [];
      const res = await fetch(`/api/academy/recipe/${recipeId}/versions`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!recipeId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 space-y-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen p-4">
        <Link to="/akademi">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Geri
          </Button>
        </Link>
        <div className="text-center py-12">
          <Coffee className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Reçete bulunamadı</p>
        </div>
      </div>
    );
  }

  const version = recipe.currentVersion;
  const ingredients = version?.ingredients || [];
  const steps = version?.steps || [];
  const equipmentNeeded = version?.equipmentNeeded || [];
  const displaySteps = showAllSteps ? steps : steps.slice(0, 5);

  const getDifficultyBadge = (level: string) => {
    switch (level) {
      case 'easy': return <Badge className="bg-green-500">Kolay</Badge>;
      case 'medium': return <Badge className="bg-yellow-500">Orta</Badge>;
      case 'hard': return <Badge className="bg-red-500">Zor</Badge>;
      default: return <Badge variant="outline">{level}</Badge>;
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="p-3 space-y-4">
        <Link to="/akademi">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Akademi
          </Button>
        </Link>

        {recipe.photoUrl ? (
          <div 
            className="h-48 rounded-xl bg-cover bg-center relative"
            style={{ backgroundImage: `url(${recipe.photoUrl})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent rounded-xl" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <h1 className="text-xl font-bold">{recipe.nameTr}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-white border-white/50">{recipe.code}</Badge>
                <div className="flex items-center gap-1 text-sm">
                  <Clock className="w-3 h-3" />
                  <span>{recipe.estimatedMinutes} dk</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <Card className="border-amber-900/20 bg-gradient-to-r from-amber-900/10 to-amber-800/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-amber-900/10 flex items-center justify-center">
                  <Coffee className="w-8 h-8 text-amber-800" />
                </div>
                <div className="flex-1">
                  <h1 className="text-xl font-bold">{recipe.nameTr}</h1>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline">{recipe.code}</Badge>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{recipe.estimatedMinutes} dk</span>
                    </div>
                    {getDifficultyBadge(recipe.difficulty)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Compact KPI Strip - Unique Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2 rounded-lg border bg-card">
            <span className="text-muted-foreground">Versiyon</span>
            <p className="font-medium mt-1">v{version?.versionNumber || 1}</p>
          </div>
          <div className="p-2 rounded-lg border bg-card">
            <span className="text-muted-foreground">Malzeme</span>
            <p className="font-medium mt-1">{ingredients.length} adet</p>
          </div>
          <div className="p-2 rounded-lg border bg-card">
            <span className="text-muted-foreground">Adım</span>
            <p className="font-medium mt-1">{steps.length} adım</p>
          </div>
          <div className="p-2 rounded-lg border bg-card">
            <span className="text-muted-foreground">Ekipman</span>
            <p className="font-medium mt-1">{equipmentNeeded.length} adet</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap gap-1 h-auto p-1">
            <TabsTrigger value="ingredients" data-testid="tab-ingredients" className="text-xs px-2 py-1.5">
              <Beaker className="w-3 h-3 mr-1" />
              Malzemeler
            </TabsTrigger>
            <TabsTrigger value="steps" data-testid="tab-steps" className="text-xs px-2 py-1.5">
              <ListCheck className="w-3 h-3 mr-1" />
              Adımlar
            </TabsTrigger>
            <TabsTrigger value="info" data-testid="tab-info" className="text-xs px-2 py-1.5">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Bilgi
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ingredients" className="mt-4 space-y-3">
            {ingredients.length > 0 ? (
              <Card>
                <CardContent className="p-3 space-y-2">
                  {ingredients.map((item: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium flex-shrink-0">
                        {idx + 1}
                      </div>
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Malzeme bilgisi henüz eklenmemiş
              </div>
            )}

            {equipmentNeeded.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Gerekli Ekipman</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="flex flex-wrap gap-2">
                    {equipmentNeeded.map((eq: string, idx: number) => (
                      <Badge key={idx} variant="outline">{eq}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="steps" className="mt-4 space-y-3">
            {steps.length > 0 ? (
              <Card>
                <CardContent className="p-3 space-y-3">
                  {displaySteps.map((step: string, idx: number) => (
                    <div key={idx} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="text-sm">{step}</p>
                      </div>
                    </div>
                  ))}
                  
                  {steps.length > 5 && (
                    <Button 
                      variant="ghost" 
                      className="w-full" 
                      onClick={() => setShowAllSteps(!showAllSteps)}
                      data-testid="button-toggle-steps"
                    >
                      {showAllSteps ? (
                        <>
                          <ChevronUp className="w-4 h-4 mr-1" />
                          Daha az göster
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-1" />
                          Tüm adımları göster ({steps.length - 5} daha)
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Hazırlama adımları henüz eklenmemiş
              </div>
            )}
          </TabsContent>

          <TabsContent value="info" className="mt-4 space-y-3">
            {version?.tipsTr && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    İpuçları
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <p className="text-sm text-muted-foreground">{version.tipsTr}</p>
                </CardContent>
              </Card>
            )}

            {version?.allergenInfo && (
              <Card className="border-red-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-red-600">
                    <AlertTriangle className="w-4 h-4" />
                    Alerjen Bilgisi
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <p className="text-sm">{version.allergenInfo}</p>
                </CardContent>
              </Card>
            )}

            {version && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Versiyon Bilgisi
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Versiyon:</span>
                    <Badge variant="outline">v{version.versionNumber}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Son Güncelleme:</span>
                    <span>{new Date(version.createdAt).toLocaleDateString('tr-TR')}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {(!version?.tipsTr && !version?.allergenInfo && !version) && (
              <div className="text-center py-8 text-muted-foreground">
                Ek bilgi mevcut değil
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
