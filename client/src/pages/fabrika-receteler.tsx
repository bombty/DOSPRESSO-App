import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ChefHat, Clock, Users, Package, FlaskConical, Lock,
  EyeOff, ChevronRight, Plus, Layers, Zap,
} from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  cookie: "Kurabiye",
  cinnamon_roll: "Cinnamon Roll",
  donut: "Donut",
  brownie: "Brownie",
  cheesecake: "Cheesecake",
  ekmek: "Ekmek & Hamur",
  borek_pogaca: "Börek/Poğaça",
  kek_pasta: "Kek & Pasta",
  tuzlu_hamur: "Tuzlu Hamur",
  konsantre: "Konsantre",
  cikolata_toz: "Çikolata Toz",
  baz_toz_surup: "Baz Toz Şurup",
  ozel_karisim: "Özel Karışım",
};

const OUTPUT_TYPE_CONFIG = {
  mamul: { label: "Mamül", color: "bg-green-600", icon: Package },
  yari_mamul: { label: "Yarı Mamül", color: "bg-amber-600", icon: Layers },
};

export default function FabrikaReceteler() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const { data: recipes = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/factory/recipes", filterCategory],
    queryFn: async () => {
      const params = filterCategory !== "all" ? `?category=${filterCategory}` : "";
      const res = await fetch(`/api/factory/recipes${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Yüklenemedi");
      return res.json();
    },
  });

  const canCreate = ["admin", "recete_gm", "sef"].includes(user?.role || "");

  // Aktif kategorileri bul
  const categories = [...new Set(recipes.map((r: any) => r.category).filter(Boolean))];

  return (
    <div className="flex-1 overflow-y-auto" data-testid="fabrika-receteler">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Fabrika Reçeteleri
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {recipes.length} reçete
          </p>
        </div>
        {canCreate && (
          <Button size="sm" onClick={() => navigate("/fabrika/receteler/yeni")} data-testid="btn-new-recipe">
            <Plus className="h-4 w-4 mr-1.5" />
            Yeni Reçete
          </Button>
        )}
      </div>

      {/* Kategori Filtresi */}
      <div className="px-6 py-3 flex items-center gap-1.5 flex-wrap border-b border-border/50">
        <Button
          size="sm"
          variant={filterCategory === "all" ? "default" : "ghost"}
          onClick={() => setFilterCategory("all")}
          className="text-xs h-7"
        >
          Tümü
        </Button>
        {categories.map(cat => (
          <Button
            key={cat}
            size="sm"
            variant={filterCategory === cat ? "default" : "ghost"}
            onClick={() => setFilterCategory(cat)}
            className="text-xs h-7"
          >
            {CATEGORY_LABELS[cat] || cat}
          </Button>
        ))}
      </div>

      {/* Reçete Kartları */}
      <div className="p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-16">
            <ChefHat className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">Henüz reçete eklenmemiş</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recipes.map((recipe: any) => {
              const outputConfig = OUTPUT_TYPE_CONFIG[recipe.outputType as keyof typeof OUTPUT_TYPE_CONFIG] || OUTPUT_TYPE_CONFIG.mamul;
              const OutputIcon = outputConfig.icon;
              const totalTime = (recipe.prepTimeMinutes || 0) + (recipe.productionTimeMinutes || 0) + (recipe.cleaningTimeMinutes || 0);

              return (
                <Card
                  key={recipe.id}
                  className={cn(
                    "cursor-pointer hover:border-primary/50 transition-all group relative overflow-hidden",
                    recipe.editLocked && "ring-1 ring-amber-500/30",
                    !recipe.isVisible && "opacity-60"
                  )}
                  onClick={() => navigate(`/fabrika/receteler/${recipe.id}`)}
                  data-testid={`recipe-card-${recipe.id}`}
                >
                  {/* Kapak Fotoğrafı */}
                  {recipe.coverPhotoUrl ? (
                    <div className="h-36 bg-muted overflow-hidden">
                      <img
                        src={recipe.coverPhotoUrl}
                        alt={recipe.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  ) : (
                    <div className="h-28 bg-gradient-to-br from-amber-900/20 to-orange-900/20 flex items-center justify-center">
                      <ChefHat className="h-10 w-10 text-muted-foreground/30" />
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    <Badge className={cn("text-[10px] text-white", outputConfig.color)}>
                      <OutputIcon className="h-3 w-3 mr-0.5" />
                      {outputConfig.label}
                    </Badge>
                    {recipe.recipeType === "KEYBLEND" && (
                      <Badge variant="outline" className="text-[10px] bg-purple-950/50 text-purple-300 border-purple-700">
                        Keyblend
                      </Badge>
                    )}
                  </div>
                  {recipe.editLocked && (
                    <div className="absolute top-2 right-2">
                      <Lock className="h-4 w-4 text-amber-500" />
                    </div>
                  )}
                  {!recipe.isVisible && (
                    <div className="absolute top-2 right-2">
                      <EyeOff className="h-4 w-4 text-red-400" />
                    </div>
                  )}

                  <CardContent className="p-4">
                    {/* Başlık */}
                    <h3 className="font-semibold text-sm line-clamp-1 mb-0.5">{recipe.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1 mb-3">
                      {recipe.code} · {CATEGORY_LABELS[recipe.category] || recipe.category}
                    </p>

                    {/* Parametreler */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Package className="h-3.5 w-3.5" />
                        <span>{recipe.baseBatchOutput} {recipe.outputUnit || "adet"}/batch</span>
                      </div>
                      {totalTime > 0 && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{totalTime >= 60 ? `${Math.floor(totalTime / 60)}s ${totalTime % 60}dk` : `${totalTime} dk`}</span>
                        </div>
                      )}
                      {recipe.requiredWorkers > 0 && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          <span>{recipe.requiredWorkers} kişi</span>
                        </div>
                      )}
                      {recipe.equipmentKwh && Number(recipe.equipmentKwh) > 0 && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Zap className="h-3.5 w-3.5" />
                          <span>{recipe.equipmentKwh} KWh</span>
                        </div>
                      )}
                    </div>

                    {/* Alerjenler */}
                    {recipe.allergens && recipe.allergens.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <p className="text-[10px] text-amber-500 flex items-center gap-1">
                          ⚠️ {recipe.allergens.join(", ")}
                        </p>
                      </div>
                    )}

                    {/* Maliyet */}
                    {recipe.unitCost && Number(recipe.unitCost) > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">Birim maliyet</span>
                        <span className="text-xs font-medium">₺{(Number(recipe.unitCost) / 100).toFixed(2)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
