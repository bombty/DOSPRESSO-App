import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Copy,
  Check,
  Send,
  Package,
  Calendar,
  Loader2,
} from "lucide-react";

interface PlanItem {
  productId: number;
  dayOfWeek: number;
  plannedQuantity: number;
  unit: string;
  priority: string;
  notes: string;
}

interface Product {
  id: number;
  name: string;
  category: string;
  sku: string;
  unit: string;
}

interface Plan {
  id: number;
  week_start: string;
  week_end: string;
  status: string;
  creator_name: string;
  approver_name: string | null;
  item_count: number;
  notes: string | null;
}

interface PlanDetail {
  plan: any;
  items: Array<{
    id: number;
    product_id: number;
    day_of_week: number;
    planned_quantity: string;
    unit: string;
    priority: string;
    notes: string;
    product_name: string;
    product_category: string;
    sku: string;
  }>;
}

const DAY_NAMES = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const FULL_DAY_NAMES = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const APPROVE_ROLES = ["admin", "ceo", "cgo", "fabrika_mudur", "coach"];

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().split("T")[0];
}

function getWeekEnd(date: Date): string {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 7);
  return d.toISOString().split("T")[0];
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    draft: { label: "Taslak", variant: "secondary" },
    suggested: { label: "Öneri", variant: "outline" },
    approved: { label: "Onaylı", variant: "default" },
    active: { label: "Aktif", variant: "default" },
  };
  const s = map[status] || { label: status, variant: "secondary" as const };
  return <Badge variant={s.variant} data-testid={`plan-status-${status}`}>{s.label}</Badge>;
}

export default function WeeklyPlanTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const userRole = user?.role || "";
  const canApprove = APPROVE_ROLES.includes(userRole);

  const [currentWeek, setCurrentWeek] = useState(() => {
    const now = new Date();
    return getWeekStart(now);
  });
  const weekEnd = useMemo(() => {
    const d = new Date(currentWeek);
    d.setDate(d.getDate() + 6);
    return d.toISOString().split("T")[0];
  }, [currentWeek]);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editItems, setEditItems] = useState<PlanItem[]>([]);
  const [editMode, setEditMode] = useState(false);

  const [newItem, setNewItem] = useState({ productId: "", dayOfWeek: "1", quantity: "", unit: "adet", priority: "normal" });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/factory/catalog/products"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: plans = [], isLoading: loadingPlans } = useQuery<Plan[]>({
    queryKey: [`/api/production-planning/plans?weekStart=${currentWeek}`],
  });

  const currentPlan = plans.find((p: Plan) => p.week_start === currentWeek);

  const { data: planDetail, isLoading: loadingDetail } = useQuery<PlanDetail>({
    queryKey: ["/api/production-planning/plans", currentPlan?.id],
    enabled: !!currentPlan?.id,
  });

  const createPlanMutation = useMutation({
    mutationFn: async (data: { weekStart: string; weekEnd: string; items: PlanItem[] }) => {
      return apiRequest("POST", "/api/production-planning/plans", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-planning/plans"] });
      toast({ title: "Plan oluşturuldu" });
      setEditMode(false);
      setEditItems([]);
    },
    onError: () => toast({ title: "Plan oluşturulamadı", variant: "destructive" }),
  });

  const updatePlanMutation = useMutation({
    mutationFn: async (data: { items: PlanItem[] }) => {
      return apiRequest("PUT", `/api/production-planning/plans/${currentPlan!.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-planning/plans"] });
      toast({ title: "Plan güncellendi" });
      setEditMode(false);
    },
    onError: () => toast({ title: "Plan güncellenemedi", variant: "destructive" }),
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/production-planning/plans/${currentPlan!.id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-planning/plans"] });
      toast({ title: "Plan onaylandı" });
    },
  });

  const suggestMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/production-planning/plans/${currentPlan!.id}/suggest`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-planning/plans"] });
      toast({ title: "Plan öneri olarak gönderildi" });
    },
  });

  const copyMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/production-planning/plans/copy-last-week", {
        targetWeekStart: currentWeek,
        targetWeekEnd: weekEnd,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-planning/plans"] });
      toast({ title: "Geçen hafta kopyalandı" });
    },
    onError: () => toast({ title: "Kopyalama başarısız", variant: "destructive" }),
  });

  function navigateWeek(dir: number) {
    const d = new Date(currentWeek);
    d.setDate(d.getDate() + dir * 7);
    setCurrentWeek(d.toISOString().split("T")[0]);
    setEditMode(false);
  }

  function startEdit() {
    if (planDetail?.items) {
      setEditItems(planDetail.items.map((it) => ({
        productId: it.product_id,
        dayOfWeek: it.day_of_week,
        plannedQuantity: Number(it.planned_quantity),
        unit: it.unit,
        priority: it.priority,
        notes: it.notes || "",
      })));
    } else {
      setEditItems([]);
    }
    setEditMode(true);
  }

  function addItem() {
    if (!newItem.productId || !newItem.quantity) return;
    const prod = products.find((p) => p.id === Number(newItem.productId));
    setEditItems([...editItems, {
      productId: Number(newItem.productId),
      dayOfWeek: Number(newItem.dayOfWeek),
      plannedQuantity: Number(newItem.quantity),
      unit: prod?.unit || newItem.unit,
      priority: newItem.priority,
      notes: "",
    }]);
    setNewItem({ ...newItem, quantity: "" });
    setAddDialogOpen(false);
  }

  function removeItem(idx: number) {
    setEditItems(editItems.filter((_, i) => i !== idx));
  }

  function savePlan() {
    if (currentPlan) {
      updatePlanMutation.mutate({ items: editItems });
    } else {
      createPlanMutation.mutate({ weekStart: currentWeek, weekEnd, items: editItems });
    }
  }

  const groupedItems = useMemo(() => {
    const items = editMode ? editItems : (planDetail?.items?.map((it) => ({
      productId: it.product_id,
      dayOfWeek: it.day_of_week,
      plannedQuantity: Number(it.planned_quantity),
      unit: it.unit,
      priority: it.priority,
      notes: it.notes || "",
      productName: it.product_name,
      category: it.product_category,
    })) || []);

    const byDay: Record<number, typeof items> = {};
    for (let d = 1; d <= 7; d++) byDay[d] = [];
    for (const item of items) {
      const day = item.dayOfWeek;
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(item);
    }
    return byDay;
  }, [editMode, editItems, planDetail]);

  const weekLabel = useMemo(() => {
    const s = new Date(currentWeek);
    const e = new Date(weekEnd);
    return `${s.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} - ${e.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}`;
  }, [currentWeek, weekEnd]);

  const isSaving = createPlanMutation.isPending || updatePlanMutation.isPending;

  return (
    <div className="space-y-4" data-testid="weekly-plan-tab">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateWeek(-1)} data-testid="prev-week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium" data-testid="week-label">{weekLabel}</span>
          </div>
          <Button variant="outline" size="icon" onClick={() => navigateWeek(1)} data-testid="next-week">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {currentPlan && statusBadge(currentPlan.status)}

          {!currentPlan && (
            <Button variant="outline" size="sm" onClick={() => copyMutation.mutate()} disabled={copyMutation.isPending} data-testid="copy-last-week">
              {copyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              Geçen Haftadan Kopyala
            </Button>
          )}

          {editMode ? (
            <>
              <Button size="sm" onClick={() => setAddDialogOpen(true)} data-testid="add-item-btn">
                <Plus className="h-4 w-4 mr-1" /> Ekle
              </Button>
              <Button size="sm" onClick={savePlan} disabled={isSaving} data-testid="save-plan">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                Kaydet
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditMode(false)} data-testid="cancel-edit">
                Vazgeç
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={startEdit} data-testid="edit-plan">
                <Plus className="h-4 w-4 mr-1" /> {currentPlan ? "Düzenle" : "Yeni Plan"}
              </Button>
              {currentPlan && currentPlan.status === "draft" && !canApprove && (
                <Button variant="outline" size="sm" onClick={() => suggestMutation.mutate()} disabled={suggestMutation.isPending} data-testid="suggest-plan">
                  <Send className="h-4 w-4 mr-1" /> Öner
                </Button>
              )}
              {currentPlan && currentPlan.status !== "approved" && canApprove && (
                <Button size="sm" onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending} data-testid="approve-plan">
                  <Check className="h-4 w-4 mr-1" /> Onayla
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {loadingPlans || loadingDetail ? (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
          {[1, 2, 3, 4, 5, 6, 0].map((dayNum) => {
            const dayItems = groupedItems[dayNum] || [];
            return (
              <Card key={dayNum} className="min-h-[120px]" data-testid={`day-col-${dayNum}`}>
                <CardHeader className="p-2 pb-1">
                  <CardTitle className="text-xs font-semibold text-center">{FULL_DAY_NAMES[dayNum]}</CardTitle>
                </CardHeader>
                <CardContent className="p-2 pt-0 space-y-1">
                  {dayItems.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground text-center py-2">Plan yok</p>
                  ) : (
                    dayItems.map((item, idx) => {
                      const prodName = (item as any).productName || products.find((p) => p.id === item.productId)?.name || `#${item.productId}`;
                      return (
                        <div key={idx} className="flex items-center justify-between bg-muted/40 rounded px-1.5 py-1 gap-1" data-testid={`plan-item-${dayNum}-${idx}`}>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-medium truncate">{prodName}</p>
                            <p className="text-[9px] text-muted-foreground">{item.plannedQuantity} {item.unit}</p>
                          </div>
                          {editMode && (
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => {
                              const globalIdx = editItems.findIndex((e) => e === item);
                              if (globalIdx >= 0) removeItem(globalIdx);
                            }} data-testid={`remove-item-${dayNum}-${idx}`}>
                              <span className="text-[10px] text-destructive">x</span>
                            </Button>
                          )}
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {currentPlan && (
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1 flex-wrap gap-1">
          <span>Oluşturan: {currentPlan.creator_name}</span>
          {currentPlan.approver_name && <span>Onaylayan: {currentPlan.approver_name}</span>}
          {currentPlan.notes && <span>Not: {currentPlan.notes}</span>}
        </div>
      )}

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Plan Kalemi Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Ürün</label>
              <Select value={newItem.productId} onValueChange={(v) => setNewItem({ ...newItem, productId: v })}>
                <SelectTrigger data-testid="select-product">
                  <SelectValue placeholder="Ürün seçin" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.category})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium">Gün</label>
              <Select value={newItem.dayOfWeek} onValueChange={(v) => setNewItem({ ...newItem, dayOfWeek: v })}>
                <SelectTrigger data-testid="select-day">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                    <SelectItem key={d} value={String(d)}>{FULL_DAY_NAMES[d]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium">Miktar</label>
              <Input
                type="number"
                inputMode="numeric"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                placeholder="0"
                data-testid="input-quantity"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Öncelik</label>
              <Select value={newItem.priority} onValueChange={(v) => setNewItem({ ...newItem, priority: v })}>
                <SelectTrigger data-testid="select-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Düşük</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">Yüksek</SelectItem>
                  <SelectItem value="urgent">Acil</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={addItem} disabled={!newItem.productId || !newItem.quantity} data-testid="confirm-add-item">
              <Plus className="h-4 w-4 mr-1" /> Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
