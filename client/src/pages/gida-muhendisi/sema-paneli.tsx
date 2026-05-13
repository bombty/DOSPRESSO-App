// ═══════════════════════════════════════════════════════════════════
// Sprint 53 (Aslan 13 May 2026) — Sema (gida_muhendisi) Paneli
// ═══════════════════════════════════════════════════════════════════
// 3 tab:
//   1. Besin Değer (eksik raw_materials + AI tahmin)
//   2. Reçete Onay (pending factory_recipes)
//   3. Alerjen Analiz (cross-contamination overview)
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  FlaskConical,
  Beaker,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
  Loader2,
  Edit3,
  ShieldCheck,
  Filter,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function SemaPaneli() {
  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FlaskConical className="w-6 h-6 text-pink-600" />
          Gıda Mühendisliği Paneli
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Besin değer + reçete onay + alerjen yönetimi (TGK Madde 9)
        </p>
      </div>

      <Tabs defaultValue="nutrition" className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="nutrition" data-testid="tab-nutrition">
            <Beaker className="w-4 h-4 mr-2" />
            Besin Değer
          </TabsTrigger>
          <TabsTrigger value="approval" data-testid="tab-approval">
            <ShieldCheck className="w-4 h-4 mr-2" />
            Reçete Onay
          </TabsTrigger>
          <TabsTrigger value="allergen" data-testid="tab-allergen">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Alerjen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nutrition" className="mt-4">
          <NutritionTab />
        </TabsContent>

        <TabsContent value="approval" className="mt-4">
          <RecipeApprovalTab />
        </TabsContent>

        <TabsContent value="allergen" className="mt-4">
          <AllergenTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 1 — BESİN DEĞER
// ═══════════════════════════════════════════════════════════════════

function NutritionTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "missing" | "tgk_pending">("missing");
  const [editing, setEditing] = useState<any>(null);

  const { data, isLoading } = useQuery<{ items: any[]; count: number }>({
    queryKey: ["/api/sema/missing-nutrition"],
  });

  const items = data?.items || [];
  const filtered = items.filter(i => {
    if (filter === "missing") return !i.energyKcal || !i.protein;
    if (filter === "tgk_pending") return !i.tgkVerifiedAt;
    return true;
  });

  const stats = {
    total: items.length,
    missing: items.filter(i => !i.energyKcal || !i.protein).length,
    tgkPending: items.filter(i => !i.tgkVerifiedAt).length,
  };

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className={`cursor-pointer ${filter === "all" ? "ring-2 ring-pink-500" : ""}`} onClick={() => setFilter("all")}>
          <CardContent className="p-3">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Toplam Eksik</div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer ${filter === "missing" ? "ring-2 ring-pink-500" : ""}`} onClick={() => setFilter("missing")}>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-orange-600">{stats.missing}</div>
            <div className="text-xs text-muted-foreground">Besin Değer Yok</div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer ${filter === "tgk_pending" ? "ring-2 ring-pink-500" : ""}`} onClick={() => setFilter("tgk_pending")}>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-red-600">{stats.tgkPending}</div>
            <div className="text-xs text-muted-foreground">TGK Onay Bekliyor</div>
          </CardContent>
        </Card>
      </div>

      {/* Tablo */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            {filtered.length} kalem
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Yükleniyor...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p className="text-sm font-medium">Tüm kalemler tamam!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kod</TableHead>
                    <TableHead>Ad</TableHead>
                    <TableHead className="text-right">Kcal</TableHead>
                    <TableHead className="text-right">Protein</TableHead>
                    <TableHead className="text-right">Yağ</TableHead>
                    <TableHead className="text-center">TGK</TableHead>
                    <TableHead className="text-center">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 100).map(item => (
                    <TableRow key={item.id} data-testid={`row-${item.id}`}>
                      <TableCell className="font-mono text-xs">{item.code}</TableCell>
                      <TableCell>
                        <div className="font-medium">{item.name}</div>
                        {item.brand && <div className="text-xs text-muted-foreground">{item.brand}</div>}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {item.energyKcal ? parseFloat(item.energyKcal).toFixed(0) : <span className="text-red-500">—</span>}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {item.protein ? parseFloat(item.protein).toFixed(1) : <span className="text-red-500">—</span>}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {item.fat ? parseFloat(item.fat).toFixed(1) : <span className="text-red-500">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.tgkVerifiedAt ? (
                          <Badge variant="default" className="bg-green-100 text-green-700">✓</Badge>
                        ) : (
                          <Badge variant="outline">⏳</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(item)}>
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filtered.length > 100 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  İlk 100 gösteriliyor. Filtreyi daralt.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {editing && (
        <NutritionEditDialog
          item={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function NutritionEditDialog({ item, onClose }: { item: any; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    energyKcal: item.energyKcal || "",
    fat: item.fat || "",
    saturatedFat: item.saturatedFat || "",
    carbohydrate: item.carbohydrate || "",
    sugar: item.sugar || "",
    protein: item.protein || "",
    salt: item.salt || "",
    fiber: item.fiber || "",
    allergenPresent: item.allergenPresent || false,
    allergenDetail: item.allergenDetail || "",
  });
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);

  const aiMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/sema/raw-materials/${item.id}/ai-suggest-nutrition`, {});
      return res.json();
    },
    onSuccess: (data) => {
      setAiSuggestion(data.suggestion);
      setForm({
        energyKcal: data.suggestion.energyKcal?.toString() || form.energyKcal,
        fat: data.suggestion.fat?.toString() || form.fat,
        saturatedFat: data.suggestion.saturatedFat?.toString() || form.saturatedFat,
        carbohydrate: data.suggestion.carbohydrate?.toString() || form.carbohydrate,
        sugar: data.suggestion.sugar?.toString() || form.sugar,
        protein: data.suggestion.protein?.toString() || form.protein,
        salt: data.suggestion.salt?.toString() || form.salt,
        fiber: data.suggestion.fiber?.toString() || form.fiber,
        allergenPresent: data.suggestion.allergenPresent || form.allergenPresent,
        allergenDetail: data.suggestion.allergenDetail || form.allergenDetail,
      });
      toast({ title: "🤖 AI önerisi dolduruldu", description: "Lütfen kontrol edin" });
    },
    onError: (err: any) => {
      toast({ title: "AI hatası", description: err.message, variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (markTgk: boolean) => {
      const res = await apiRequest("PATCH", `/api/sema/raw-materials/${item.id}/nutrition`, {
        ...form,
        markTgkCompliant: markTgk,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "✅ Kaydedildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/sema/missing-nutrition"] });
      onClose();
    },
  });

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
          <DialogDescription>
            Kod: <code>{item.code}</code> • 100g/100ml başına besin değeri
          </DialogDescription>
        </DialogHeader>

        <Button
          variant="outline"
          onClick={() => aiMutation.mutate()}
          disabled={aiMutation.isPending}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:opacity-90"
        >
          {aiMutation.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />AI düşünüyor...</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" />Mr. Dobody ile Otomatik Doldur</>
          )}
        </Button>

        {aiSuggestion?.reasoning && (
          <div className="text-xs italic text-muted-foreground bg-purple-50 dark:bg-purple-950/20 p-2 rounded">
            💭 {aiSuggestion.reasoning} (Güven: {aiSuggestion.confidence})
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: "energyKcal", label: "Enerji (kcal)" },
            { key: "fat", label: "Yağ (g)" },
            { key: "saturatedFat", label: "Doymuş Yağ (g)" },
            { key: "carbohydrate", label: "Karbonhidrat (g)" },
            { key: "sugar", label: "Şeker (g)" },
            { key: "protein", label: "Protein (g)" },
            { key: "salt", label: "Tuz (g)" },
            { key: "fiber", label: "Lif (g)" },
          ].map(f => (
            <div key={f.key}>
              <Label className="text-xs">{f.label}</Label>
              <Input
                type="number"
                step="0.01"
                value={(form as any)[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              />
            </div>
          ))}
        </div>

        <div className="space-y-2 pt-2 border-t">
          <Label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.allergenPresent}
              onChange={(e) => setForm({ ...form, allergenPresent: e.target.checked })}
              className="w-4 h-4"
            />
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            Alerjen içerir
          </Label>
          {form.allergenPresent && (
            <Textarea
              placeholder="Örn: Gluten, Süt proteini, Yumurta"
              value={form.allergenDetail}
              onChange={(e) => setForm({ ...form, allergenDetail: e.target.value })}
              rows={2}
            />
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>İptal</Button>
          <Button onClick={() => saveMutation.mutate(false)} disabled={saveMutation.isPending}>
            Kaydet
          </Button>
          <Button
            onClick={() => saveMutation.mutate(true)}
            disabled={saveMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            <ShieldCheck className="w-4 h-4 mr-2" />
            Kaydet + TGK Onayla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 2 — REÇETE ONAY
// ═══════════════════════════════════════════════════════════════════

function RecipeApprovalTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejecting, setRejecting] = useState<any>(null);
  const [rejectFeedback, setRejectFeedback] = useState("");

  const { data, isLoading } = useQuery<{ recipes: any[]; count: number }>({
    queryKey: ["/api/sema/pending-recipes"],
  });

  const recipes = data?.recipes || [];

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/sema/recipes/${id}/approve`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "✅ Reçete onaylandı" });
      queryClient.invalidateQueries({ queryKey: ["/api/sema/pending-recipes"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, feedback }: { id: number; feedback: string }) => {
      const res = await apiRequest("POST", `/api/sema/recipes/${id}/reject`, { feedback });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "❌ Reçete reddedildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/sema/pending-recipes"] });
      setRejecting(null);
      setRejectFeedback("");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{recipes.length} reçete onay bekliyor</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Yükleniyor...</div>
        ) : recipes.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
            <p className="text-sm font-medium">Onay bekleyen reçete yok</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recipes.map(r => (
              <Card key={r.id} className="border-2 border-orange-200 dark:border-orange-900">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{r.product?.name || `Reçete #${r.id}`}</h3>
                        {r.product?.sku && <Badge variant="outline" className="text-xs">{r.product.sku}</Badge>}
                        <Badge variant="secondary" className="text-xs">v{r.version}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Kategori: {r.product?.category || "—"} • {new Date(r.createdAt).toLocaleDateString("tr-TR")}
                      </div>
                      {r.notes && (
                        <p className="text-sm mt-2 bg-muted/30 p-2 rounded">{r.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => approveMutation.mutate(r.id)}
                        disabled={approveMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setRejecting(r)}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!rejecting} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reçete Reddet — {rejecting?.product?.name}</DialogTitle>
            <DialogDescription>Red sebebi belirtin (min 5 karakter)</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Örn: Alerjen bilgisi eksik, malzeme miktarları kontrol edilmeli..."
            value={rejectFeedback}
            onChange={(e) => setRejectFeedback(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>İptal</Button>
            <Button
              variant="destructive"
              onClick={() => rejectMutation.mutate({ id: rejecting.id, feedback: rejectFeedback })}
              disabled={rejectFeedback.length < 5}
            >
              Reddet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 3 — ALERJEN ANALİZ
// ═══════════════════════════════════════════════════════════════════

function AllergenTab() {
  const [filter, setFilter] = useState<"all" | "allergen" | "cross" | "undocumented">("all");

  const { data, isLoading } = useQuery<{ items: any[]; summary: any }>({
    queryKey: ["/api/sema/allergen-overview"],
  });

  const items = data?.items || [];
  const summary = data?.summary || { total: 0, withAllergen: 0, withCrossContamination: 0, undocumented: 0 };

  const filtered = items.filter(i => {
    if (filter === "allergen") return i.allergenPresent;
    if (filter === "cross") return i.crossContamination && i.crossContamination.trim().length > 0;
    if (filter === "undocumented") return !i.allergenPresent && !i.allergenDetail;
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card className={`cursor-pointer ${filter === "all" ? "ring-2 ring-orange-500" : ""}`} onClick={() => setFilter("all")}>
          <CardContent className="p-3">
            <div className="text-2xl font-bold">{summary.total}</div>
            <div className="text-xs text-muted-foreground">Toplam</div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer ${filter === "allergen" ? "ring-2 ring-orange-500" : ""}`} onClick={() => setFilter("allergen")}>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-orange-600">{summary.withAllergen}</div>
            <div className="text-xs text-muted-foreground">Alerjen İçeren</div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer ${filter === "cross" ? "ring-2 ring-orange-500" : ""}`} onClick={() => setFilter("cross")}>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-purple-600">{summary.withCrossContamination}</div>
            <div className="text-xs text-muted-foreground">Çapraz Kont.</div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer ${filter === "undocumented" ? "ring-2 ring-orange-500" : ""}`} onClick={() => setFilter("undocumented")}>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-red-600">{summary.undocumented}</div>
            <div className="text-xs text-muted-foreground">Belgesiz</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{filtered.length} kalem</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Yükleniyor...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kod</TableHead>
                    <TableHead>Ad</TableHead>
                    <TableHead>Alerjen</TableHead>
                    <TableHead>Detay</TableHead>
                    <TableHead>Çapraz Kontaminasyon</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 100).map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.code}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        {item.allergenPresent ? (
                          <Badge className="bg-orange-100 text-orange-700">⚠ Var</Badge>
                        ) : item.allergenDetail ? (
                          <Badge variant="outline">Yok</Badge>
                        ) : (
                          <Badge variant="destructive">Belgesiz</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{item.allergenDetail || "—"}</TableCell>
                      <TableCell className="text-xs text-purple-700">{item.crossContamination || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
