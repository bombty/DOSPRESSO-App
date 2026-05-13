// ═══════════════════════════════════════════════════════════════════
// Sprint 55 (Aslan 13 May 2026) — Aslan2 (recete_gm) Paneli
// ═══════════════════════════════════════════════════════════════════
// 3 tab:
//   1. Reçeteler (factoryRecipes + version mgmt)
//   2. KEYBLEND Gizli Formül (admin + recete_gm)
//   3. Maliyet Hesabı (reçete x hammadde fiyatı)
// ═══════════════════════════════════════════════════════════════════

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Beaker,
  Lock,
  DollarSign,
  GitBranch,
  Eye,
  EyeOff,
  AlertTriangle,
  ChevronUp,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Aslan2Paneli() {
  return (
    <div className="container mx-auto p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Beaker className="w-6 h-6 text-purple-600" />
          Reçete Yönetimi (Aslan2)
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          recete_gm paneli: reçeteler + KEYBLEND + maliyet
        </p>
      </div>

      <Tabs defaultValue="recipes" className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="recipes" data-testid="tab-recipes">
            <GitBranch className="w-4 h-4 mr-2" />
            Reçeteler
          </TabsTrigger>
          <TabsTrigger value="keyblend" data-testid="tab-keyblend">
            <Lock className="w-4 h-4 mr-2" />
            KEYBLEND
          </TabsTrigger>
          <TabsTrigger value="cost" data-testid="tab-cost">
            <DollarSign className="w-4 h-4 mr-2" />
            Maliyet
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recipes" className="mt-4">
          <RecipesTab />
        </TabsContent>

        <TabsContent value="keyblend" className="mt-4">
          <KeyblendTab />
        </TabsContent>

        <TabsContent value="cost" className="mt-4">
          <CostTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 1 — REÇETELER
// ═══════════════════════════════════════════════════════════════════

function RecipesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "mamul" | "yari_mamul" | "pending">("all");
  const [versionRecipe, setVersionRecipe] = useState<any>(null);
  const [changeReason, setChangeReason] = useState("");

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/aslan2/recipes"],
  });

  const recipes = data?.recipes || [];
  const summary = data?.summary || {};

  const filtered = recipes.filter((r: any) => {
    if (filter === "mamul") return r.outputType === "mamul";
    if (filter === "yari_mamul") return r.outputType === "yari_mamul";
    if (filter === "pending") return r.approvalStatus === "pending";
    return true;
  });

  const newVersionMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const res = await apiRequest("POST", `/api/aslan2/recipes/${id}/new-version`, { changeReason: reason });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: `✅ Yeni versiyon: v${data.newVersion}`, description: "Onaya gönderildi (pending)" });
      queryClient.invalidateQueries({ queryKey: ["/api/aslan2/recipes"] });
      setVersionRecipe(null);
      setChangeReason("");
    },
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card className={`cursor-pointer ${filter === "all" ? "ring-2 ring-purple-500" : ""}`} onClick={() => setFilter("all")}>
          <CardContent className="p-3">
            <div className="text-2xl font-bold">{summary.total || 0}</div>
            <div className="text-xs text-muted-foreground">Toplam</div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer ${filter === "mamul" ? "ring-2 ring-purple-500" : ""}`} onClick={() => setFilter("mamul")}>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-blue-600">{summary.mamul || 0}</div>
            <div className="text-xs text-muted-foreground">Mamul</div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer ${filter === "yari_mamul" ? "ring-2 ring-purple-500" : ""}`} onClick={() => setFilter("yari_mamul")}>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-orange-600">{summary.yariMamul || 0}</div>
            <div className="text-xs text-muted-foreground">Yarı Mamul</div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer ${filter === "pending" ? "ring-2 ring-purple-500" : ""}`} onClick={() => setFilter("pending")}>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-yellow-600">{summary.pending || 0}</div>
            <div className="text-xs text-muted-foreground">Onay Bekliyor</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{filtered.length} reçete</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Yükleniyor...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <GitBranch className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Kayıt yok</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kod</TableHead>
                    <TableHead>Ad</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>Versiyon</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-center">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 100).map((r: any) => (
                    <TableRow key={r.id} data-testid={`row-recipe-${r.id}`}>
                      <TableCell className="font-mono text-xs">{r.code}</TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{r.name}</div>
                        {r.productName && <div className="text-xs text-muted-foreground">→ {r.productName}</div>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.outputType === "mamul" ? "default" : "secondary"} className="text-xs">
                          {r.outputType === "mamul" ? "Mamul" : "Yarı Mamul"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">v{r.version}</TableCell>
                      <TableCell>
                        {r.approvalStatus === "approved" ? (
                          <Badge className="bg-green-100 text-green-700 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Onaylı</Badge>
                        ) : r.approvalStatus === "pending" ? (
                          <Badge className="bg-yellow-100 text-yellow-700 text-xs"><Clock className="w-3 h-3 mr-1" />Beklemede</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">{r.approvalStatus}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="sm" onClick={() => setVersionRecipe(r)} title="Yeni versiyon">
                          <ChevronUp className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!versionRecipe} onOpenChange={(open) => !open && setVersionRecipe(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Versiyon — {versionRecipe?.name}</DialogTitle>
            <DialogDescription>
              v{versionRecipe?.version} → v{(versionRecipe?.version || 1) + 1} (Onay bekleyecek)
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Değişiklik gerekçesi (örn: Cevizli oran %5 azaltıldı, maliyet)..."
            value={changeReason}
            onChange={(e) => setChangeReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setVersionRecipe(null)}>İptal</Button>
            <Button
              onClick={() => newVersionMutation.mutate({ id: versionRecipe.id, reason: changeReason })}
              disabled={newVersionMutation.isPending}
            >
              Yeni Versiyon Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 2 — KEYBLEND (admin + recete_gm only)
// ═══════════════════════════════════════════════════════════════════

function KeyblendTab() {
  const [reveal, setReveal] = useState<Record<number, boolean>>({});

  const { data, isLoading, error } = useQuery<any>({
    queryKey: ["/api/aslan2/keyblends"],
  });

  if (error) {
    return (
      <Card className="border-red-300">
        <CardContent className="py-6 text-center">
          <Lock className="w-12 h-12 mx-auto mb-2 text-red-500" />
          <p className="text-sm font-medium text-red-700">{(error as any).message || "Erişim yok"}</p>
          <p className="text-xs text-muted-foreground mt-1">KEYBLEND sadece admin + recete_gm rollerine açık</p>
        </CardContent>
      </Card>
    );
  }

  const items = data?.keyblends || [];

  return (
    <div className="space-y-3">
      <Card className="border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20">
        <CardContent className="p-3 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs">
            <strong>Hassas Veri:</strong> Bu sayfadaki KEYBLEND formülleri DOSPRESSO'nun ticari sırlarıdır.
            Tüm görüntülemeler audit log'a yazılır. Yetkisiz paylaşım sözleşme ihlalidir.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4 text-red-600" />
            {items.length} KEYBLEND Tanımı
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Yükleniyor...</div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Lock className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">KEYBLEND tanımı yok</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((kb: any) => (
                <Card key={kb.id} className="border-2 border-red-200 dark:border-red-900">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="destructive" className="text-xs"><Lock className="w-3 h-3 mr-1" />{kb.code}</Badge>
                          <h3 className="font-semibold">{kb.name}</h3>
                        </div>
                        {kb.description && (
                          <p className="text-xs text-muted-foreground">{kb.description}</p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReveal({ ...reveal, [kb.id]: !reveal[kb.id] })}
                      >
                        {reveal[kb.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                    {reveal[kb.id] && (
                      <div className="mt-2 p-2 bg-muted/50 rounded font-mono text-xs whitespace-pre-wrap">
                        {kb.ingredients ? (
                          typeof kb.ingredients === "string" ? kb.ingredients : JSON.stringify(kb.ingredients, null, 2)
                        ) : (
                          <span className="text-muted-foreground italic">Formül henüz girilmemiş</span>
                        )}
                        {kb.preparationSteps && (
                          <div className="mt-2 pt-2 border-t">
                            <strong>Hazırlama:</strong>
                            <div className="mt-1">{kb.preparationSteps}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 3 — MALİYET
// ═══════════════════════════════════════════════════════════════════

function CostTab() {
  const [recipeId, setRecipeId] = useState<number | null>(null);

  const { data: recipesData } = useQuery<any>({
    queryKey: ["/api/aslan2/recipes"],
  });

  const { data: costData, isLoading } = useQuery<any>({
    queryKey: ["/api/aslan2/recipes/cost", recipeId],
    queryFn: async () => {
      if (!recipeId) return null;
      const res = await fetch(`/api/aslan2/recipes/${recipeId}/cost`, { credentials: "include" });
      return res.json();
    },
    enabled: !!recipeId,
  });

  const recipes = recipesData?.recipes || [];

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Reçete Maliyet Hesabı</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {recipes.slice(0, 20).map((r: any) => (
              <Button
                key={r.id}
                size="sm"
                variant={recipeId === r.id ? "default" : "outline"}
                onClick={() => setRecipeId(r.id)}
                className="text-xs"
              >
                {r.code}: {r.name}
              </Button>
            ))}
          </div>
          {recipes.length > 20 && (
            <p className="text-xs text-muted-foreground mt-2">İlk 20 reçete listeleniyor</p>
          )}
        </CardContent>
      </Card>

      {!recipeId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Maliyetini görmek istediğiniz reçeteyi seçin</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Hesaplanıyor...</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Card>
              <CardContent className="p-3">
                <div className="text-2xl font-bold">₺{costData?.summary?.totalCost || 0}</div>
                <div className="text-xs text-muted-foreground">
                  Batch Toplam ({costData?.summary?.batchOutput} {costData?.summary?.outputUnit})
                </div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 dark:bg-green-950/20">
              <CardContent className="p-3">
                <div className="text-2xl font-bold text-green-700">₺{costData?.summary?.unitCost || 0}</div>
                <div className="text-xs text-muted-foreground">
                  Birim ({costData?.summary?.outputUnit})
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Malzeme Dağılımı</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Malzeme</TableHead>
                    <TableHead className="text-right">Miktar</TableHead>
                    <TableHead className="text-right">Birim Fiyat</TableHead>
                    <TableHead className="text-right">Maliyet</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(costData?.breakdown || []).map((ing: any) => (
                    <TableRow key={ing.ingredientId}>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {ing.isKeyblend && <Lock className="w-3 h-3 text-red-600" />}
                          <span className={ing.isKeyblend ? "font-mono text-xs" : ""}>
                            {ing.materialName || `#${ing.ingredientId}`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{ing.quantity} {ing.unit}</TableCell>
                      <TableCell className="text-right font-mono text-xs">₺{ing.unitPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono font-medium">₺{ing.cost.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
