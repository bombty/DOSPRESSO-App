/**
 * MRP Günlük Malzeme Çekme Sayfası
 * Depocu: çekme listesi, pick/verify
 * Fabrika rolleri: plan görünümü, artan malzeme
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Package, CheckCircle, Clock, AlertTriangle, Truck, ArrowRight, RefreshCw, Archive, Thermometer } from "lucide-react";

const PICK_ROLES = ["admin", "fabrika_mudur", "uretim_sefi", "fabrika_depo"];
const VERIFY_ROLES = ["admin", "fabrika_mudur", "uretim_sefi", "sef", "fabrika_operator"];
const LEFTOVER_RECORD_ROLES = ["admin", "fabrika_mudur", "uretim_sefi", "sef", "fabrika_operator"];
const LEFTOVER_VERIFY_ROLES = ["admin", "gida_muhendisi", "recete_gm"];

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

export default function MRPDailyPlanPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const role = user?.role || "";
  const canPick = PICK_ROLES.includes(role);
  const canVerify = VERIFY_ROLES.includes(role);
  const canRecordLeftover = LEFTOVER_RECORD_ROLES.includes(role);
  const canVerifyLeftover = LEFTOVER_VERIFY_ROLES.includes(role);

  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [activeTab, setActiveTab] = useState<"pick" | "leftover">("pick");

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
      const r = await fetch(`/api/mrp/plan-items/${itemId}/pick`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromLocation }),
      });
      if (!r.ok) throw new Error("Çekme başarısız");
      return r.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/mrp/daily-plan"] }),
  });

  const verifyMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const r = await fetch(`/api/mrp/plan-items/${itemId}/verify`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!r.ok) throw new Error("Doğrulama başarısız");
      return r.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/mrp/daily-plan"] }),
  });

  // Artan malzeme queries
  const { data: leftovers = [] } = useQuery<any[]>({
    queryKey: ["/api/mrp/leftovers", selectedDate],
    queryFn: async () => { const r = await fetch(`/api/mrp/leftovers/${selectedDate}`, { credentials: "include" }); if (!r.ok) return []; return r.json(); },
    enabled: activeTab === "leftover",
  });

  const [leftoverItems, setLeftoverItems] = useState<Array<{ inventoryId: number; name: string; quantity: string; unit: string; condition: string; temp: string }>>([]);

  const leftoverMutation = useMutation({
    mutationFn: async (items: any[]) => {
      const r = await fetch("/api/mrp/leftovers", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordDate: selectedDate, items }),
      });
      if (!r.ok) throw new Error("Kayıt başarısız");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mrp/leftovers"] });
      setLeftoverItems([]);
    },
  });

  const verifyLeftoverMutation = useMutation({
    mutationFn: async ({ id, condition }: { id: number; condition?: string }) => {
      const r = await fetch(`/api/mrp/leftovers/${id}/verify`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ condition }),
      });
      if (!r.ok) throw new Error("Doğrulama başarısız");
      return r.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/mrp/leftovers"] }),
  });

  const plan = data?.plan;
  const items: any[] = data?.items || [];
  const pendingCount = items.filter(i => i.status === "pending").length;
  const pickedCount = items.filter(i => i.status === "picked" || i.status === "verified").length;

  if (isLoading) return (
    <div className="p-4 space-y-3">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );

  return (
    <div className="p-4 max-w-[900px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Malzeme Çekme Planı</h1>
          <p className="text-xs text-muted-foreground">Günlük üretim malzeme ihtiyacı</p>
        </div>
        <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
          className="w-36 h-8 text-xs" />
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 bg-muted rounded-lg p-0.5">
        <button onClick={() => setActiveTab("pick")}
          className={`flex-1 text-xs py-1.5 px-3 rounded-md transition-colors ${activeTab === "pick" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}>
          <Package className="h-3 w-3 inline mr-1" /> Çekme Listesi
        </button>
        <button onClick={() => setActiveTab("leftover")}
          className={`flex-1 text-xs py-1.5 px-3 rounded-md transition-colors ${activeTab === "leftover" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}>
          <Archive className="h-3 w-3 inline mr-1" /> Artan Kayıt
        </button>
      </div>

      {activeTab === "pick" && (<>
        <Card>
          <CardContent className="py-8 text-center">
            <Package className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Bu tarihte plan yok</p>
            <p className="text-xs text-muted-foreground mt-1">Üretim şefi veya RGM günlük plan oluşturmalı</p>
          </CardContent>
        </Card>
      )}

      {/* Plan özeti */}
      {plan && (
        <>
          <div className="grid grid-cols-4 gap-2">
            <Card className="p-2.5 text-center">
              <div className="text-lg font-bold">{items.length}</div>
              <div className="text-[10px] text-muted-foreground">Toplam Kalem</div>
            </Card>
            <Card className="p-2.5 text-center">
              <div className="text-lg font-bold text-yellow-400">{pendingCount}</div>
              <div className="text-[10px] text-muted-foreground">Bekleyen</div>
            </Card>
            <Card className="p-2.5 text-center">
              <div className="text-lg font-bold text-green-400">{pickedCount}</div>
              <div className="text-[10px] text-muted-foreground">Çekilen</div>
            </Card>
            <Card className="p-2.5 text-center">
              <StatusBadge status={plan.status} />
              <div className="text-[10px] text-muted-foreground mt-1">Plan Durumu</div>
            </Card>
          </div>

          {/* Malzeme listesi */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4" />
                Çekme Listesi
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {items.map((item: any) => (
                  <div key={item.id} className="px-3 py-2.5 flex items-center gap-3">
                    {/* Malzeme bilgisi */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium truncate">{item.inventory_name || item.inventoryName}</span>
                        <StatusBadge status={item.status} />
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{item.inventory_code || item.inventoryCode}</span>
                        {item.recipe_name && <span className="text-[10px] text-blue-400">→ {item.recipe_name}</span>}
                        {item.warehouse_location && <span className="text-[10px] text-muted-foreground">📍 {item.warehouse_location}</span>}
                      </div>
                    </div>

                    {/* Miktarlar */}
                    <div className="text-right shrink-0 w-24">
                      <div className="text-xs font-semibold">{Number(item.net_pick_quantity || item.netPickQuantity || 0).toLocaleString("tr-TR")} {item.unit}</div>
                      {Number(item.leftover_quantity || item.leftoverQuantity || 0) > 0 && (
                        <div className="text-[10px] text-green-400">Artan: {Number(item.leftover_quantity || item.leftoverQuantity).toLocaleString("tr-TR")}</div>
                      )}
                    </div>

                    {/* Aksiyonlar */}
                    <div className="shrink-0 w-20">
                      {item.status === "pending" && canPick && (
                        <Button size="sm" variant="outline" className="h-7 text-[10px] w-full"
                          onClick={() => pickMutation.mutate({ itemId: item.id, fromLocation: item.warehouse_location || "depo_ana" })}
                          disabled={pickMutation.isPending}>
                          <Truck className="h-3 w-3 mr-1" /> Çek
                        </Button>
                      )}
                      {item.status === "picked" && canVerify && (
                        <Button size="sm" variant="outline" className="h-7 text-[10px] w-full border-green-500/30 text-green-400"
                          onClick={() => verifyMutation.mutate(item.id)}
                          disabled={verifyMutation.isPending}>
                          <CheckCircle className="h-3 w-3 mr-1" /> Teslim
                        </Button>
                      )}
                      {item.status === "verified" && (
                        <span className="text-[10px] text-green-400 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Tamam</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {items.length === 0 && (
                <div className="py-6 text-center text-xs text-muted-foreground">Plan boş — henüz malzeme hesaplanmamış</div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ══ ARTAN KAYIT TAB ══ */}
      {activeTab === "leftover" && (
        <div className="space-y-4">
          {/* Mevcut artanlar */}
          {leftovers.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Archive className="h-4 w-4" />
                  Kayıtlı Artanlar ({selectedDate})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {leftovers.map((lo: any) => (
                    <div key={lo.id} className="px-3 py-2.5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{lo.inventory_name || lo.inventoryName}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                            lo.condition === "good" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                            lo.condition === "marginal" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                            "bg-red-500/20 text-red-400 border-red-500/30"
                          }`}>{lo.condition === "good" ? "İyi" : lo.condition === "marginal" ? "Sınırda" : "Kullanılamaz"}</span>
                          {lo.verified_by || lo.verifiedBy ? (
                            <CheckCircle className="h-3 w-3 text-green-400" />
                          ) : (
                            <Clock className="h-3 w-3 text-yellow-400" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">{lo.inventory_code || lo.inventoryCode}</span>
                          {lo.storage_temp && <span className="text-[10px] text-blue-400"><Thermometer className="h-2.5 w-2.5 inline" /> {lo.storage_temp}°C</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-semibold">{Number(lo.remaining_quantity || lo.remainingQuantity || 0).toLocaleString("tr-TR")} {lo.unit}</div>
                      </div>
                      {canVerifyLeftover && !(lo.verified_by || lo.verifiedBy) && (
                        <Button size="sm" variant="outline" className="h-7 text-[10px] border-green-500/30 text-green-400 shrink-0"
                          onClick={() => verifyLeftoverMutation.mutate({ id: lo.id })}
                          disabled={verifyLeftoverMutation.isPending}>
                          <CheckCircle className="h-3 w-3 mr-1" /> Onayla
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Yeni artan kayıt formu */}
          {canRecordLeftover && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Yeni Artan Kayıt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {leftoverItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded border border-border">
                    <div className="flex-1 space-y-1">
                      <div className="text-xs font-medium">{item.name}</div>
                      <div className="flex gap-2">
                        <Input type="number" placeholder="Miktar" value={item.quantity}
                          onChange={e => { const n = [...leftoverItems]; n[idx].quantity = e.target.value; setLeftoverItems(n); }}
                          className="h-7 text-xs w-24" />
                        <span className="text-xs text-muted-foreground self-center">{item.unit}</span>
                        <select value={item.condition}
                          onChange={e => { const n = [...leftoverItems]; n[idx].condition = e.target.value; setLeftoverItems(n); }}
                          className="h-7 text-xs rounded border bg-background px-2">
                          <option value="good">İyi</option>
                          <option value="marginal">Sınırda</option>
                          <option value="unusable">Kullanılamaz</option>
                        </select>
                        <Input type="number" placeholder="°C" value={item.temp}
                          onChange={e => { const n = [...leftoverItems]; n[idx].temp = e.target.value; setLeftoverItems(n); }}
                          className="h-7 text-xs w-16" />
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400"
                      onClick={() => setLeftoverItems(leftoverItems.filter((_, i) => i !== idx))}>✕</Button>
                  </div>
                ))}

                {/* Bugünkü plandan malzeme ekle */}
                {items.length > 0 && leftoverItems.length === 0 && (
                  <Button size="sm" variant="outline" className="w-full h-8 text-xs"
                    onClick={() => {
                      const newItems = items
                        .filter((i: any) => i.status === "verified" || i.status === "picked")
                        .map((i: any) => ({
                          inventoryId: i.inventory_id || i.inventoryId,
                          name: i.inventory_name || i.inventoryName || "?",
                          quantity: "",
                          unit: i.unit || "g",
                          condition: "good",
                          temp: "",
                        }));
                      setLeftoverItems(newItems);
                    }}>
                    <Package className="h-3 w-3 mr-1" /> Çekilen malzemelerden ekle
                  </Button>
                )}

                {leftoverItems.length > 0 && (
                  <Button size="sm" className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
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
                      if (valid.length > 0) leftoverMutation.mutate(valid);
                    }}
                    disabled={leftoverMutation.isPending}>
                    <CheckCircle className="h-3 w-3 mr-1" /> {leftoverItems.filter(i => i.quantity && Number(i.quantity) > 0).length} kalem kaydet
                  </Button>
                )}

                {leftovers.length === 0 && leftoverItems.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Bu tarihte kayıtlı artan malzeme yok</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
