import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Package, CheckCircle, Clock, AlertTriangle, Truck, Archive,
  Thermometer, Warehouse, History, Plus, Search, ArrowDown, ArrowUp,
  X, ChefHat, BarChart3, Filter,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const PLAN_ROLES = ["admin", "fabrika_mudur", "uretim_sefi", "recete_gm"];
const PICK_ROLES = ["admin", "fabrika_mudur", "uretim_sefi", "fabrika_depo"];
const VERIFY_ROLES = ["admin", "fabrika_mudur", "uretim_sefi", "sef", "fabrika_operator"];
const LEFTOVER_RECORD_ROLES = ["admin", "fabrika_mudur", "uretim_sefi", "sef", "fabrika_operator"];
const LEFTOVER_VERIFY_ROLES = ["admin", "gida_muhendisi", "recete_gm"];

type TabType = "pick" | "leftover" | "stock" | "history";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "Bekliyor", cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    picked: { label: "Çekildi", cls: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    verified: { label: "Teslim", cls: "bg-green-500/20 text-green-400 border-green-500/30" },
    short: { label: "Eksik", cls: "bg-red-500/20 text-red-400 border-red-500/30" },
    draft: { label: "Taslak", cls: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
    confirmed: { label: "Onaylı", cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    in_progress: { label: "Devam", cls: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    completed: { label: "Tamamlandı", cls: "bg-green-500/20 text-green-400 border-green-500/30" },
  };
  const s = map[status] || { label: status, cls: "bg-gray-500/20 text-gray-400" };
  return <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${s.cls}`}>{s.label}</span>;
}

function ConditionBadge({ condition }: { condition: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    good: { label: "İyi", cls: "bg-green-500/20 text-green-400 border-green-500/30" },
    marginal: { label: "Sınırda", cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    unusable: { label: "Kullanılamaz", cls: "bg-red-500/20 text-red-400 border-red-500/30" },
  };
  const s = map[condition] || { label: condition, cls: "bg-gray-500/20 text-gray-400" };
  return <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${s.cls}`}>{s.label}</span>;
}

function CreatePlanDialog({ open, onClose, selectedDate }: { open: boolean; onClose: () => void; selectedDate: string }) {
  const queryClient = useQueryClient();
  const [recipes, setRecipes] = useState<Array<{ recipeId: number; batchCount: number; name: string }>>([]);

  const { data: allRecipes = [] } = useQuery<any[]>({
    queryKey: ["/api/factory/recipes"],
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/mrp/generate-daily-plan", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mrp/daily-plan"] });
      onClose();
      setRecipes([]);
    },
  });

  const addRecipe = (recipeId: string) => {
    const id = Number(recipeId);
    if (recipes.find(r => r.recipeId === id)) return;
    const recipe = allRecipes.find((r: any) => r.id === id);
    if (recipe) setRecipes([...recipes, { recipeId: id, batchCount: 1, name: recipe.name }]);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <ChefHat className="h-4 w-4" />
            Günlük Plan Oluştur — {selectedDate}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Reçete Ekle</label>
            <Select onValueChange={addRecipe}>
              <SelectTrigger className="h-8 text-xs" data-testid="select-recipe">
                <SelectValue placeholder="Reçete seçin..." />
              </SelectTrigger>
              <SelectContent>
                {allRecipes.filter((r: any) => !recipes.find(sel => sel.recipeId === r.id)).map((r: any) => (
                  <SelectItem key={r.id} value={String(r.id)}>{r.code} — {r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {recipes.length > 0 && (
            <div className="space-y-2">
              {recipes.map((r, idx) => (
                <div key={r.recipeId} className="flex items-center gap-2 p-2 rounded border border-border">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium truncate block">{r.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <label className="text-[10px] text-muted-foreground">Batch:</label>
                    <Input
                      type="number" min={1} max={50} value={r.batchCount}
                      onChange={e => { const n = [...recipes]; n[idx].batchCount = Number(e.target.value) || 1; setRecipes(n); }}
                      className="h-7 text-xs w-16"
                      data-testid={`input-batch-count-${r.recipeId}`}
                    />
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => setRecipes(recipes.filter((_, i) => i !== idx))} data-testid={`button-remove-recipe-${r.recipeId}`}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {recipes.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">En az bir reçete seçin</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} data-testid="button-cancel-plan">İptal</Button>
          <Button size="sm" disabled={recipes.length === 0 || createMutation.isPending}
            onClick={() => createMutation.mutate({ planDate: selectedDate, recipes: recipes.map(r => ({ recipeId: r.recipeId, batchCount: r.batchCount })) })}
            data-testid="button-create-plan">
            <Plus className="h-3 w-3 mr-1" /> Plan Oluştur
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PickTab({ selectedDate }: { selectedDate: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const role = user?.role || "";
  const canPick = PICK_ROLES.includes(role);
  const canVerify = VERIFY_ROLES.includes(role);
  const canCreatePlan = PLAN_ROLES.includes(role);
  const [showCreatePlan, setShowCreatePlan] = useState(false);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/mrp/daily-plan", selectedDate],
    queryFn: async () => {
      const r = await fetch(`/api/mrp/daily-plan/${selectedDate}`, { credentials: "include" });
      if (!r.ok) return null;
      return r.json();
    },
  });

  const pickMutation = useMutation({
    mutationFn: async ({ itemId, fromLocation }: { itemId: number; fromLocation: string }) => {
      const r = await apiRequest("PATCH", `/api/mrp/plan-items/${itemId}/pick`, { fromLocation });
      return r.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/mrp/daily-plan"] }),
  });

  const verifyMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const r = await apiRequest("PATCH", `/api/mrp/plan-items/${itemId}/verify`, {});
      return r.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/mrp/daily-plan"] }),
  });

  const confirmMutation = useMutation({
    mutationFn: async (planId: number) => {
      const r = await apiRequest("PATCH", `/api/mrp/daily-plan/${planId}/confirm`, {});
      return r.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/mrp/daily-plan"] }),
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  const plan = data?.plan;
  const items: any[] = data?.items || [];
  const pendingCount = items.filter(i => i.status === "pending").length;
  const pickedCount = items.filter(i => i.status === "picked" || i.status === "verified").length;
  const verifiedCount = items.filter(i => i.status === "verified").length;

  const categories = [...new Set(items.map((i: any) => i.category || "Diğer"))];

  if (!plan) {
    return (
      <>
        <Card>
          <CardContent className="py-8 text-center">
            <Package className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Bu tarihte plan yok</p>
            <p className="text-xs text-muted-foreground mt-1 mb-3">Reçete seçip günlük malzeme planı oluşturun</p>
            {canCreatePlan && (
              <Button size="sm" onClick={() => setShowCreatePlan(true)} data-testid="button-create-plan-empty">
                <Plus className="h-3 w-3 mr-1" /> Plan Oluştur
              </Button>
            )}
          </CardContent>
        </Card>
        <CreatePlanDialog open={showCreatePlan} onClose={() => setShowCreatePlan(false)} selectedDate={selectedDate} />
      </>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card className="p-2.5 text-center">
          <div className="text-lg font-bold">{items.length}</div>
          <div className="text-[10px] text-muted-foreground">Toplam Kalem</div>
        </Card>
        <Card className="p-2.5 text-center">
          <div className="text-lg font-bold text-yellow-400">{pendingCount}</div>
          <div className="text-[10px] text-muted-foreground">Bekleyen</div>
        </Card>
        <Card className="p-2.5 text-center">
          <div className="text-lg font-bold text-green-400">{verifiedCount}/{pickedCount}</div>
          <div className="text-[10px] text-muted-foreground">Teslim/Çekilen</div>
        </Card>
        <Card className="p-2.5 text-center">
          <div className="flex items-center justify-center gap-1">
            <StatusBadge status={plan.status} />
            {plan.status === "draft" && canCreatePlan && (
              <Button size="sm" variant="outline" className="h-6 text-[10px] ml-1"
                onClick={() => confirmMutation.mutate(plan.id)}
                disabled={confirmMutation.isPending}
                data-testid="button-confirm-plan">
                Onayla
              </Button>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">Plan</div>
        </Card>
      </div>

      {plan.total_cost_estimate && Number(plan.total_cost_estimate) > 0 && (
        <div className="text-xs text-muted-foreground text-right">
          Tahmini maliyet: <span className="font-medium text-foreground">₺{Number(plan.total_cost_estimate).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
        </div>
      )}

      {categories.map(cat => {
        const catItems = items.filter((i: any) => (i.category || "Diğer") === cat);
        return (
          <Card key={cat}>
            <CardHeader className="pb-1 pt-2 px-3">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">{cat} ({catItems.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {catItems.map((item: any) => (
                  <div key={item.id} className="px-3 py-2 flex items-center gap-2" data-testid={`pick-item-${item.id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-medium truncate">{item.inventory_name}</span>
                        <StatusBadge status={item.status} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">{item.inventory_code}</span>
                        {item.recipe_name && <span className="text-[10px] text-blue-400 truncate">{item.recipe_name}</span>}
                        {item.warehouse_location && <span className="text-[10px] text-muted-foreground">{item.warehouse_location}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-semibold">{Number(item.net_pick_quantity || 0).toLocaleString("tr-TR")} {item.unit}</div>
                      {Number(item.leftover_quantity || 0) > 0 && (
                        <div className="text-[10px] text-green-400">Artan: {Number(item.leftover_quantity).toLocaleString("tr-TR")}</div>
                      )}
                    </div>
                    <div className="shrink-0 w-16">
                      {item.status === "pending" && canPick && (
                        <Button size="sm" variant="outline" className="h-7 text-[10px] w-full"
                          onClick={() => pickMutation.mutate({ itemId: item.id, fromLocation: item.warehouse_location || "depo_ana" })}
                          disabled={pickMutation.isPending}
                          data-testid={`button-pick-${item.id}`}>
                          <Truck className="h-3 w-3 mr-1" /> Çek
                        </Button>
                      )}
                      {item.status === "picked" && canVerify && (
                        <Button size="sm" variant="outline" className="h-7 text-[10px] w-full border-green-500/30 text-green-400"
                          onClick={() => verifyMutation.mutate(item.id)}
                          disabled={verifyMutation.isPending}
                          data-testid={`button-verify-${item.id}`}>
                          <CheckCircle className="h-3 w-3 mr-1" /> Al
                        </Button>
                      )}
                      {item.status === "verified" && (
                        <span className="text-[10px] text-green-400 flex items-center gap-0.5"><CheckCircle className="h-3 w-3" /></span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {items.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">Plan boş — henüz malzeme hesaplanmamış</p>
      )}
    </div>
  );
}

function LeftoverTab({ selectedDate }: { selectedDate: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const role = user?.role || "";
  const canRecord = LEFTOVER_RECORD_ROLES.includes(role);
  const canVerifyLeftover = LEFTOVER_VERIFY_ROLES.includes(role);

  const [leftoverItems, setLeftoverItems] = useState<Array<{
    inventoryId: number; name: string; quantity: string; unit: string; condition: string; temp: string;
  }>>([]);

  const { data: leftovers = [], isLoading: leftoverLoading } = useQuery<any[]>({
    queryKey: ["/api/mrp/leftovers", selectedDate],
    queryFn: async () => {
      const r = await fetch(`/api/mrp/leftovers/${selectedDate}`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
  });

  const { data: planData } = useQuery<any>({
    queryKey: ["/api/mrp/daily-plan", selectedDate],
    queryFn: async () => {
      const r = await fetch(`/api/mrp/daily-plan/${selectedDate}`, { credentials: "include" });
      if (!r.ok) return null;
      return r.json();
    },
  });

  const yesterday = new Date(new Date(selectedDate).getTime() - 86400000).toISOString().split("T")[0];
  const { data: yesterdayLeftovers = [] } = useQuery<any[]>({
    queryKey: ["/api/mrp/leftovers", yesterday],
    queryFn: async () => {
      const r = await fetch(`/api/mrp/leftovers/${yesterday}`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (items: any[]) => {
      const r = await apiRequest("POST", "/api/mrp/leftovers", { recordDate: selectedDate, items });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mrp/leftovers"] });
      setLeftoverItems([]);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, condition }: { id: number; condition?: string }) => {
      const r = await apiRequest("PATCH", `/api/mrp/leftovers/${id}/verify`, { condition });
      return r.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/mrp/leftovers"] }),
  });

  const pickedItems = (planData?.items || []).filter((i: any) => i.status === "verified" || i.status === "picked");

  if (leftoverLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-3">
      {yesterdayLeftovers.length > 0 && (
        <Card>
          <CardHeader className="pb-1 pt-2 px-3">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Dünden Kalan ({yesterday})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {yesterdayLeftovers.map((lo: any) => (
                <div key={lo.id} className="px-3 py-1.5 flex items-center gap-2">
                  <span className="text-xs flex-1 truncate">{lo.inventory_name}</span>
                  <ConditionBadge condition={lo.condition} />
                  <span className="text-xs font-semibold shrink-0">{Number(lo.remaining_quantity || 0).toLocaleString("tr-TR")} {lo.unit}</span>
                  {lo.used_in_next_day && <CheckCircle className="h-3 w-3 text-green-400 shrink-0" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {leftovers.length > 0 && (
        <Card>
          <CardHeader className="pb-1 pt-2 px-3">
            <CardTitle className="text-xs flex items-center gap-1">
              <Archive className="h-3 w-3" /> Bugünün Artanları ({selectedDate})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {leftovers.map((lo: any) => (
                <div key={lo.id} className="px-3 py-2 flex items-center gap-2" data-testid={`leftover-item-${lo.id}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-medium truncate">{lo.inventory_name}</span>
                      <ConditionBadge condition={lo.condition} />
                      {(lo.verified_by || lo.verifiedBy) ? (
                        <CheckCircle className="h-3 w-3 text-green-400" />
                      ) : (
                        <Clock className="h-3 w-3 text-yellow-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-muted-foreground">{lo.inventory_code}</span>
                      {lo.storage_temp && (
                        <span className="text-[10px] text-blue-400">
                          <Thermometer className="h-2.5 w-2.5 inline" /> {lo.storage_temp}°C
                        </span>
                      )}
                      {lo.recorder_name && <span className="text-[10px] text-muted-foreground">Kaydeden: {lo.recorder_name}</span>}
                    </div>
                  </div>
                  <span className="text-xs font-semibold shrink-0">{Number(lo.remaining_quantity || 0).toLocaleString("tr-TR")} {lo.unit}</span>
                  {canVerifyLeftover && !(lo.verified_by || lo.verifiedBy) && (
                    <Button size="sm" variant="outline" className="h-7 text-[10px] border-green-500/30 text-green-400 shrink-0"
                      onClick={() => verifyMutation.mutate({ id: lo.id })}
                      disabled={verifyMutation.isPending}
                      data-testid={`button-verify-leftover-${lo.id}`}>
                      <CheckCircle className="h-3 w-3 mr-1" /> Onayla
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {canRecord && (
        <Card>
          <CardHeader className="pb-1 pt-2 px-3">
            <CardTitle className="text-xs flex items-center gap-1">
              <Plus className="h-3 w-3" /> Artan Malzeme Tartım Formu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-2">
            {leftoverItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 rounded border border-border">
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="text-xs font-medium truncate">{item.name}</div>
                  <div className="flex gap-1.5 flex-wrap">
                    <Input type="number" placeholder="Kalan miktar" value={item.quantity}
                      onChange={e => { const n = [...leftoverItems]; n[idx].quantity = e.target.value; setLeftoverItems(n); }}
                      className="h-7 text-xs w-24"
                      data-testid={`input-leftover-qty-${idx}`} />
                    <span className="text-[10px] text-muted-foreground self-center">{item.unit}</span>
                    <select value={item.condition}
                      onChange={e => { const n = [...leftoverItems]; n[idx].condition = e.target.value; setLeftoverItems(n); }}
                      className="h-7 text-xs rounded border bg-background px-1.5"
                      data-testid={`select-condition-${idx}`}>
                      <option value="good">İyi</option>
                      <option value="marginal">Sınırda</option>
                      <option value="unusable">Kullanılamaz</option>
                    </select>
                    <Input type="number" placeholder="°C" value={item.temp}
                      onChange={e => { const n = [...leftoverItems]; n[idx].temp = e.target.value; setLeftoverItems(n); }}
                      className="h-7 text-xs w-14"
                      data-testid={`input-temp-${idx}`} />
                  </div>
                </div>
                <Button size="icon" variant="ghost"
                  onClick={() => setLeftoverItems(leftoverItems.filter((_, i) => i !== idx))}
                  data-testid={`button-remove-leftover-${idx}`}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}

            {pickedItems.length > 0 && leftoverItems.length === 0 && (
              <Button size="sm" variant="outline" className="w-full h-8 text-xs"
                onClick={() => {
                  setLeftoverItems(pickedItems.map((i: any) => ({
                    inventoryId: i.inventory_id,
                    name: i.inventory_name || "?",
                    quantity: "",
                    unit: i.unit || "g",
                    condition: "good",
                    temp: "",
                  })));
                }}
                data-testid="button-add-from-picked">
                <Package className="h-3 w-3 mr-1" /> Çekilen {pickedItems.length} malzemeden ekle
              </Button>
            )}

            {leftoverItems.length === 0 && pickedItems.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">
                Bugün çekilen malzeme yok. Plan oluşturup malzeme çektikten sonra artan kaydı yapabilirsiniz.
              </p>
            )}

            {leftoverItems.length > 0 && (
              <Button size="sm" className="w-full h-8 text-xs"
                onClick={() => {
                  const valid = leftoverItems
                    .filter(i => i.quantity && Number(i.quantity) > 0)
                    .map(i => ({
                      inventoryId: i.inventoryId,
                      remainingQuantity: Number(i.quantity),
                      unit: i.unit,
                      condition: i.condition,
                      storageTemp: i.temp ? Number(i.temp) : null,
                    }));
                  if (valid.length > 0) saveMutation.mutate(valid);
                }}
                disabled={saveMutation.isPending || leftoverItems.filter(i => i.quantity && Number(i.quantity) > 0).length === 0}
                data-testid="button-save-leftovers">
                <CheckCircle className="h-3 w-3 mr-1" /> {leftoverItems.filter(i => i.quantity && Number(i.quantity) > 0).length} kalem kaydet
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StockTab() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const { data: stockItems = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/inventory", category, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      if (search) params.set("search", search);
      const r = await fetch(`/api/inventory?${params.toString()}`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  const lowStockItems = stockItems.filter((i: any) => parseFloat(i.currentStock) <= parseFloat(i.minimumStock) && parseFloat(i.minimumStock) > 0);
  const categories = ["all", "hammadde", "ambalaj", "yarimamul", "temizlik", "diger"];
  const categoryLabels: Record<string, string> = { all: "Tümü", hammadde: "Hammadde", ambalaj: "Ambalaj", yarimamul: "Yarı Mamül", temizlik: "Temizlik", diger: "Diğer" };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-2.5 text-center">
          <div className="text-lg font-bold">{stockItems.length}</div>
          <div className="text-[10px] text-muted-foreground">Toplam Ürün</div>
        </Card>
        <Card className="p-2.5 text-center">
          <div className="text-lg font-bold text-red-400">{lowStockItems.length}</div>
          <div className="text-[10px] text-muted-foreground">Düşük Stok</div>
        </Card>
        <Card className="p-2.5 text-center">
          <div className="text-lg font-bold text-yellow-400">{stockItems.filter((i: any) => parseFloat(i.currentStock) === 0).length}</div>
          <div className="text-[10px] text-muted-foreground">Stok Yok</div>
        </Card>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Malzeme ara..." value={search} onChange={e => setSearch(e.target.value)}
            className="h-8 text-xs pl-7" data-testid="input-stock-search" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-8 text-xs w-28" data-testid="select-stock-category">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map(c => (
              <SelectItem key={c} value={c}>{categoryLabels[c] || c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {lowStockItems.length > 0 && category === "all" && !search && (
        <Card className="border-red-500/20">
          <CardHeader className="pb-1 pt-2 px-3">
            <CardTitle className="text-xs text-red-400 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Düşük Stok Uyarıları ({lowStockItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {lowStockItems.slice(0, 10).map((item: any) => (
                <div key={item.id} className="px-3 py-1.5 flex items-center gap-2" data-testid={`stock-alert-${item.id}`}>
                  <span className="text-xs flex-1 truncate">{item.name}</span>
                  <span className="text-[10px] text-muted-foreground">{item.code}</span>
                  <span className="text-xs font-semibold text-red-400">{parseFloat(item.currentStock).toLocaleString("tr-TR")} {item.unit}</span>
                  <span className="text-[10px] text-muted-foreground">/ min: {parseFloat(item.minimumStock).toLocaleString("tr-TR")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {stockItems.slice(0, 50).map((item: any) => {
              const stock = parseFloat(item.currentStock);
              const min = parseFloat(item.minimumStock);
              const isLow = min > 0 && stock <= min;
              const isZero = stock === 0;
              return (
                <div key={item.id} className="px-3 py-2 flex items-center gap-2" data-testid={`stock-item-${item.id}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-medium truncate">{item.name}</span>
                      {isZero && <span className="text-[10px] px-1 py-0 rounded bg-red-500/20 text-red-400 border border-red-500/30">Stok Yok</span>}
                      {isLow && !isZero && <span className="text-[10px] px-1 py-0 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Düşük</span>}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{item.code} | {item.category}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-xs font-semibold ${isLow ? "text-red-400" : ""}`}>
                      {stock.toLocaleString("tr-TR")} {item.unit}
                    </div>
                    {min > 0 && (
                      <div className="text-[10px] text-muted-foreground">min: {min.toLocaleString("tr-TR")}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {stockItems.length > 50 && (
            <div className="text-xs text-muted-foreground text-center py-2">
              +{stockItems.length - 50} daha... (arama ile filtreleyin)
            </div>
          )}
          {stockItems.length === 0 && (
            <div className="py-6 text-center text-xs text-muted-foreground">Sonuç bulunamadı</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function HistoryTab() {
  const [days, setDays] = useState("7");

  const startDate = new Date(Date.now() - Number(days) * 86400000).toISOString().split("T")[0];
  const endDate = new Date().toISOString().split("T")[0];

  const { data: pickLogs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/mrp/pick-logs", startDate, endDate],
    queryFn: async () => {
      const r = await fetch(`/api/mrp/pick-logs?startDate=${startDate}&endDate=${endDate}`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Son</span>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="h-8 text-xs w-20" data-testid="select-history-days">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 gün</SelectItem>
            <SelectItem value="7">7 gün</SelectItem>
            <SelectItem value="14">14 gün</SelectItem>
            <SelectItem value="30">30 gün</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">({pickLogs.length} hareket)</span>
      </div>

      {pickLogs.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center">
            <History className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">Bu dönemde malzeme çekme kaydı yok</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {pickLogs.map((log: any) => (
                <div key={log.id} className="px-3 py-2 flex items-center gap-2" data-testid={`history-log-${log.id}`}>
                  <div className="shrink-0">
                    <ArrowUp className="h-3.5 w-3.5 text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-medium truncate">{log.inventory_name}</span>
                      <span className="text-[10px] text-muted-foreground">{log.inventory_code}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-muted-foreground">
                        {log.from_location || log.fromLocation} → {log.to_location || log.toLocation}
                      </span>
                      {log.picker_name && <span className="text-[10px] text-blue-400">{log.picker_name}</span>}
                      {log.lot_number && <span className="text-[10px] text-muted-foreground">LOT: {log.lot_number}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-semibold">{Number(log.quantity || 0).toLocaleString("tr-TR")} {log.unit}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(log.created_at || log.createdAt).toLocaleDateString("tr-TR")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function FabrikaStokMerkezi() {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [activeTab, setActiveTab] = useState<TabType>("pick");

  const tabs: { id: TabType; label: string; icon: typeof Package }[] = [
    { id: "pick", label: "Günlük Çekme", icon: Truck },
    { id: "leftover", label: "Artanlar", icon: Archive },
    { id: "stock", label: "Stok Durumu", icon: Warehouse },
    { id: "history", label: "Hareketler", icon: History },
  ];

  return (
    <div className="p-4 max-w-[900px] mx-auto space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2" data-testid="text-page-title">
            <Warehouse className="h-5 w-5" /> Fabrika Stok Merkezi
          </h1>
          <p className="text-xs text-muted-foreground">Malzeme çekme, artan takibi ve stok durumu</p>
        </div>
        {(activeTab === "pick" || activeTab === "leftover") && (
          <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            className="w-36 h-8 text-xs shrink-0" data-testid="input-date" />
        )}
      </div>

      <div className="flex gap-1 bg-muted rounded-lg p-0.5">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 text-xs py-1.5 px-2 rounded-md transition-colors flex items-center justify-center gap-1 ${
              activeTab === tab.id ? "bg-background shadow-sm font-medium" : "text-muted-foreground"
            }`}
            data-testid={`tab-${tab.id}`}>
            <tab.icon className="h-3 w-3" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === "pick" && <PickTab selectedDate={selectedDate} />}
      {activeTab === "leftover" && <LeftoverTab selectedDate={selectedDate} />}
      {activeTab === "stock" && <StockTab />}
      {activeTab === "history" && <HistoryTab />}
    </div>
  );
}
