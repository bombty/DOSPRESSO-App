/**
 * DailyRecordTab — Günlük Üretim Kayıt
 *
 * Yeni Sistem B (TASK-URETIM-PLANLAMA-V2 — 4 May 2026)
 *
 * Workflow:
 *   1. Bugünün haftalık plan kalemleri listelenir (production_plan_items WHERE day_of_week = today)
 *   2. Her plan kalemi için: Plan miktarı + Üretilen + Fire + Sebep input
 *   3. POST /api/production-planning/records ile kayıt
 *   4. Aynı plan kalemi için birden çok kayıt yapılabilir (sabah seansı + akşam seansı)
 *   5. Mevcut kayıtlar tarih aralığında listelenir, düzenlenebilir
 *
 * Backend:
 *   GET  /api/production-planning/plans?weekStart=YYYY-MM-DD
 *   GET  /api/production-planning/plans/:id (items'la birlikte)
 *   POST /api/production-planning/records
 *   GET  /api/production-planning/records?startDate=&endDate=&productId=
 *   GET  /api/factory/waste-reasons (dropdown önerileri için)
 *
 * UX:
 *   - Mobil-first kart yapısı
 *   - Bugünün planı üstte vurgulu
 *   - Geçmiş günler katlanabilir
 *   - Fire input açılınca sebep dropdown da açılır
 *   - Toplu kaydet (her satır ayrı request, sıralı)
 */

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ChevronLeft, ChevronRight, Calendar, Save, Plus, AlertTriangle,
  Package, TrendingDown, CheckCircle2, Clock, Trash2, Edit, Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DAY_NAMES = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const DAY_NAMES_LONG = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

interface PlanItem {
  id: number;
  plan_id: number;
  product_id: number;
  product_name: string;
  product_category: string;
  day_of_week: number;
  planned_quantity: string | number;
  unit: string;
  priority: string;
  notes: string | null;
}

interface ProductionRecord {
  id: number;
  plan_item_id: number | null;
  product_id: number;
  product_name: string;
  product_category: string;
  record_date: string;
  produced_quantity: string;
  waste_quantity: string;
  waste_reason: string | null;
  unit: string;
  recorder_name: string | null;
  notes: string | null;
  created_at: string;
}

interface WasteReason {
  id: number;
  code: string;
  name: string;
  category: string;
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().split("T")[0];
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function dateToDayOfWeek(dateStr: string): number {
  // Pazartesi=1, Pazar=7 (production_plan_items convention)
  const d = new Date(dateStr);
  const dow = d.getDay();
  return dow === 0 ? 7 : dow;
}

export default function DailyRecordTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [recordDrafts, setRecordDrafts] = useState<Record<number, {
    producedQuantity: string;
    wasteQuantity: string;
    wasteReason: string;
    notes: string;
  }>>({});

  const weekStart = useMemo(() => getWeekStart(new Date(selectedDate)), [selectedDate]);
  const dayOfWeek = useMemo(() => dateToDayOfWeek(selectedDate), [selectedDate]);

  // Bu haftanın planı
  const { data: plans = [] } = useQuery<any[]>({
    queryKey: [`/api/production-planning/plans?weekStart=${weekStart}`],
  });

  const currentPlan = plans[0];

  // Plan detayı (item'larla)
  const { data: planDetail, isLoading: planLoading } = useQuery<{ plan: any; items: PlanItem[] }>({
    queryKey: ["/api/production-planning/plans", currentPlan?.id],
    enabled: !!currentPlan?.id,
  });

  // Bugünün plan kalemleri
  const todayItems = useMemo(() => {
    if (!planDetail?.items) return [];
    return planDetail.items.filter(item => item.day_of_week === dayOfWeek);
  }, [planDetail, dayOfWeek]);

  // Bugünün kayıtları
  const { data: todayRecords = [], isLoading: recordsLoading } = useQuery<ProductionRecord[]>({
    queryKey: [`/api/production-planning/records?startDate=${selectedDate}&endDate=${selectedDate}`],
  });

  // Fire sebepleri
  const { data: wasteReasons = [] } = useQuery<WasteReason[]>({
    queryKey: ["/api/factory/waste-reasons"],
  });

  // Kayıt gönderme
  const saveRecordMutation = useMutation({
    mutationFn: async (data: {
      planItemId?: number;
      productId: number;
      recordDate: string;
      producedQuantity: number;
      wasteQuantity: number;
      wasteReason: string | null;
      unit: string;
      notes: string | null;
    }) => {
      return apiRequest("POST", "/api/production-planning/records", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-planning/records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/production-planning/comparison"] });
      toast({ title: "Üretim kaydı eklendi", description: "Veriler güncellendi." });
    },
    onError: (err: any) => {
      toast({
        title: "Kaydedilemedi",
        description: err?.message || "Bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Bir plan item için kayıt göndermek
  const handleSaveItem = async (item: PlanItem) => {
    const draft = recordDrafts[item.id];
    if (!draft) {
      toast({ title: "Boş", description: "Önce miktar gir.", variant: "destructive" });
      return;
    }

    const produced = Number(draft.producedQuantity || 0);
    const waste = Number(draft.wasteQuantity || 0);

    if (produced <= 0 && waste <= 0) {
      toast({ title: "Geçersiz", description: "En az üretim veya fire miktarı 0'dan büyük olmalı.", variant: "destructive" });
      return;
    }

    if (waste > 0 && !draft.wasteReason) {
      toast({ title: "Fire sebebi zorunlu", description: "Fire varsa sebep seç.", variant: "destructive" });
      return;
    }

    try {
      await saveRecordMutation.mutateAsync({
        planItemId: item.id,
        productId: item.product_id,
        recordDate: selectedDate,
        producedQuantity: produced,
        wasteQuantity: waste,
        wasteReason: draft.wasteReason || null,
        unit: item.unit || "adet",
        notes: draft.notes || null,
      });

      // Draft temizle
      setRecordDrafts(prev => {
        const { [item.id]: _, ...rest } = prev;
        return rest;
      });
    } catch {
      // toast onError'da geliyor
    }
  };

  // Plan dışı serbest kayıt (off-plan)
  const [offPlanProductId, setOffPlanProductId] = useState<string>("");
  const [offPlanQuantity, setOffPlanQuantity] = useState<string>("");
  const [offPlanWaste, setOffPlanWaste] = useState<string>("");
  const [offPlanWasteReason, setOffPlanWasteReason] = useState<string>("");
  const [offPlanNotes, setOffPlanNotes] = useState<string>("");

  // Ürün listesi (off-plan için)
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["/api/factory/catalog/products"],
  });

  const handleOffPlanSave = async () => {
    if (!offPlanProductId) {
      toast({ title: "Ürün seç", variant: "destructive" });
      return;
    }
    const produced = Number(offPlanQuantity || 0);
    const waste = Number(offPlanWaste || 0);
    if (produced <= 0 && waste <= 0) {
      toast({ title: "Miktar gerekli", variant: "destructive" });
      return;
    }
    if (waste > 0 && !offPlanWasteReason) {
      toast({ title: "Fire sebebi zorunlu", variant: "destructive" });
      return;
    }

    try {
      await saveRecordMutation.mutateAsync({
        productId: Number(offPlanProductId),
        recordDate: selectedDate,
        producedQuantity: produced,
        wasteQuantity: waste,
        wasteReason: offPlanWasteReason || null,
        unit: "adet",
        notes: offPlanNotes || "Plan dışı kayıt",
      });

      setOffPlanProductId("");
      setOffPlanQuantity("");
      setOffPlanWaste("");
      setOffPlanWasteReason("");
      setOffPlanNotes("");
    } catch {}
  };

  // Tarih navigasyonu
  const navigateDay = (dir: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const isToday = selectedDate === todayStr();

  // Plan item için bugün ne kadar üretildi/fire var
  const getItemProgress = (itemId: number, productId: number) => {
    const records = todayRecords.filter(r =>
      r.plan_item_id === itemId || (r.plan_item_id === null && r.product_id === productId)
    );
    const totalProduced = records.reduce((s, r) => s + Number(r.produced_quantity || 0), 0);
    const totalWaste = records.reduce((s, r) => s + Number(r.waste_quantity || 0), 0);
    return { totalProduced, totalWaste, recordCount: records.length };
  };

  return (
    <div className="space-y-4" data-testid="daily-record-tab">
      {/* Tarih navigasyonu */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigateDay(-1)} data-testid="prev-day">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-40 h-9"
                  data-testid="date-picker"
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => navigateDay(1)} data-testid="next-day">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isToday ? "default" : "outline"} className="text-xs">
                {DAY_NAMES_LONG[new Date(selectedDate).getDay()]}
              </Badge>
              {isToday && <Badge className="bg-green-600 text-xs">Bugün</Badge>}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(todayStr())}
                disabled={isToday}
                data-testid="go-today"
              >
                Bugüne git
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan durumu */}
      {planLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !currentPlan ? (
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Bu hafta için plan yok</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Önce "Haftalık Plan" tab'ından bir plan oluşturun. Plan dışı serbest üretim kaydı yapabilirsiniz.
            </p>
          </CardContent>
        </Card>
      ) : currentPlan.status !== "approved" ? (
        <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm">Plan henüz onaylanmadı</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Mevcut durumu: <Badge variant="outline" className="ml-1">{currentPlan.status}</Badge>
                Onaylanmamış planlar üzerinden üretim kaydı alınabilir ama önerilmez.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Bugünün plan kalemleri */}
      {todayItems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Bugünün Plan Kalemleri ({todayItems.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {DAY_NAMES_LONG[new Date(selectedDate).getDay()]} için planlanan ürünler. Her satıra üretilen miktar ve varsa fire gir.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayItems.map(item => {
              const progress = getItemProgress(item.id, item.product_id);
              const planned = Number(item.planned_quantity || 0);
              const completionPct = planned > 0 ? Math.round((progress.totalProduced / planned) * 100) : 0;
              const draft = recordDrafts[item.id] || { producedQuantity: "", wasteQuantity: "", wasteReason: "", notes: "" };

              return (
                <Card
                  key={item.id}
                  className={completionPct >= 100 ? "border-green-300 bg-green-50/30 dark:bg-green-950/20" : ""}
                  data-testid={`plan-item-${item.id}`}
                >
                  <CardContent className="p-3 space-y-2.5">
                    {/* Ürün başlığı + ilerleme */}
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <h4 className="font-semibold text-sm">{item.product_name}</h4>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <Badge variant="outline" className="text-[9px]">
                            {item.product_category}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            Plan: <strong>{planned} {item.unit}</strong>
                          </span>
                          {progress.recordCount > 0 && (
                            <Badge variant="secondary" className="text-[9px]">
                              {progress.recordCount} kayıt
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Badge
                        className={`text-xs ${
                          completionPct >= 100 ? "bg-green-600" :
                          completionPct >= 75 ? "bg-blue-500" :
                          completionPct > 0 ? "bg-amber-500" : ""
                        }`}
                        variant={completionPct === 0 ? "outline" : "default"}
                      >
                        {progress.totalProduced} / {planned} {item.unit}
                        {completionPct >= 100 && <CheckCircle2 className="h-3 w-3 ml-1 inline" />}
                      </Badge>
                    </div>

                    {/* Mevcut fire varsa göster */}
                    {progress.totalWaste > 0 && (
                      <div className="text-[10px] text-red-600 dark:text-red-400 flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" />
                        Toplam Fire: {progress.totalWaste} {item.unit}
                      </div>
                    )}

                    {/* Yeni kayıt input'ları */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground">Üretilen</Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          value={draft.producedQuantity}
                          onChange={(e) => setRecordDrafts(prev => ({
                            ...prev,
                            [item.id]: { ...draft, producedQuantity: e.target.value },
                          }))}
                          placeholder={`${item.unit}`}
                          className="h-8 text-sm"
                          data-testid={`input-produced-${item.id}`}
                        />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <TrendingDown className="h-2.5 w-2.5 text-red-500" />
                          Fire
                        </Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          value={draft.wasteQuantity}
                          onChange={(e) => setRecordDrafts(prev => ({
                            ...prev,
                            [item.id]: { ...draft, wasteQuantity: e.target.value },
                          }))}
                          placeholder={`${item.unit}`}
                          className="h-8 text-sm"
                          data-testid={`input-waste-${item.id}`}
                        />
                      </div>
                    </div>

                    {/* Fire sebep dropdown — sadece fire > 0 ise */}
                    {Number(draft.wasteQuantity || 0) > 0 && (
                      <div className="space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground">Fire Sebebi *</Label>
                        <Select
                          value={draft.wasteReason}
                          onValueChange={(v) => setRecordDrafts(prev => ({
                            ...prev,
                            [item.id]: { ...draft, wasteReason: v },
                          }))}
                        >
                          <SelectTrigger className="h-8 text-sm" data-testid={`select-waste-reason-${item.id}`}>
                            <SelectValue placeholder="Sebep seç..." />
                          </SelectTrigger>
                          <SelectContent>
                            {wasteReasons.length === 0 ? (
                              <SelectItem value="__none" disabled>Sebep tanımlanmamış</SelectItem>
                            ) : (
                              wasteReasons.map(wr => (
                                <SelectItem key={wr.id} value={wr.name}>
                                  {wr.name} ({wr.category})
                                </SelectItem>
                              ))
                            )}
                            <SelectItem value="Diğer">Diğer (manuel)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Not */}
                    <div className="space-y-0.5">
                      <Label className="text-[10px] text-muted-foreground">Not (opsiyonel)</Label>
                      <Input
                        value={draft.notes}
                        onChange={(e) => setRecordDrafts(prev => ({
                          ...prev,
                          [item.id]: { ...draft, notes: e.target.value },
                        }))}
                        placeholder="Sabah seansı, makine duruşu vb."
                        className="h-8 text-sm"
                        data-testid={`input-notes-${item.id}`}
                      />
                    </div>

                    {/* Kaydet butonu */}
                    <Button
                      onClick={() => handleSaveItem(item)}
                      disabled={saveRecordMutation.isPending || (!draft.producedQuantity && !draft.wasteQuantity)}
                      size="sm"
                      className="w-full gap-1.5"
                      data-testid={`button-save-${item.id}`}
                    >
                      {saveRecordMutation.isPending ? (
                        <><Loader2 className="h-3 w-3 animate-spin" /> Kaydediliyor</>
                      ) : (
                        <><Save className="h-3 w-3" /> Kayıt Ekle</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Plan dışı kayıt */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Plan Dışı Kayıt
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">
            Planda olmayan bir ürün için üretim kaydı (ör: deneme üretimi, ek sipariş)
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-0.5">
            <Label className="text-[10px]">Ürün</Label>
            <Select value={offPlanProductId} onValueChange={setOffPlanProductId}>
              <SelectTrigger className="h-9" data-testid="off-plan-product">
                <SelectValue placeholder="Ürün seç..." />
              </SelectTrigger>
              <SelectContent>
                {products.map((p: any) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name} {p.category && <span className="text-muted-foreground">({p.category})</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <Label className="text-[10px]">Üretilen</Label>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                value={offPlanQuantity}
                onChange={(e) => setOffPlanQuantity(e.target.value)}
                placeholder="adet"
                className="h-9"
                data-testid="off-plan-quantity"
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] flex items-center gap-1">
                <TrendingDown className="h-2.5 w-2.5 text-red-500" />
                Fire
              </Label>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                value={offPlanWaste}
                onChange={(e) => setOffPlanWaste(e.target.value)}
                placeholder="adet"
                className="h-9"
                data-testid="off-plan-waste"
              />
            </div>
          </div>
          {Number(offPlanWaste || 0) > 0 && (
            <div className="space-y-0.5">
              <Label className="text-[10px]">Fire Sebebi *</Label>
              <Select value={offPlanWasteReason} onValueChange={setOffPlanWasteReason}>
                <SelectTrigger className="h-9" data-testid="off-plan-waste-reason">
                  <SelectValue placeholder="Sebep seç..." />
                </SelectTrigger>
                <SelectContent>
                  {wasteReasons.map(wr => (
                    <SelectItem key={wr.id} value={wr.name}>
                      {wr.name} ({wr.category})
                    </SelectItem>
                  ))}
                  <SelectItem value="Diğer">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <Input
            value={offPlanNotes}
            onChange={(e) => setOffPlanNotes(e.target.value)}
            placeholder="Not (opsiyonel)"
            className="h-9"
            data-testid="off-plan-notes"
          />
          <Button
            onClick={handleOffPlanSave}
            disabled={saveRecordMutation.isPending || !offPlanProductId}
            className="w-full gap-1.5"
            size="sm"
            variant="outline"
            data-testid="off-plan-save"
          >
            {saveRecordMutation.isPending ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> Kaydediliyor</>
            ) : (
              <><Plus className="h-3 w-3" /> Plan Dışı Kayıt Ekle</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Bugünün kayıtları listesi */}
      {todayRecords.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {selectedDate} Tarihindeki Kayıtlar ({todayRecords.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayRecords.map(record => (
              <div
                key={record.id}
                className="flex items-center justify-between gap-2 p-2 rounded border bg-muted/30 text-xs"
                data-testid={`record-${record.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{record.product_name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {record.recorder_name && <>Kayıt: {record.recorder_name} • </>}
                    {new Date(record.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                    {record.notes && <> • {record.notes}</>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <Badge className="bg-blue-500 text-[10px]">
                    {record.produced_quantity} {record.unit}
                  </Badge>
                  {Number(record.waste_quantity || 0) > 0 && (
                    <Badge variant="outline" className="text-[10px] border-red-300 text-red-600">
                      <TrendingDown className="h-2.5 w-2.5 mr-0.5" />
                      Fire: {record.waste_quantity}
                      {record.waste_reason && <> ({record.waste_reason})</>}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Plan + kayıt yoksa boş durum */}
      {todayItems.length === 0 && todayRecords.length === 0 && currentPlan && (
        <Card>
          <CardContent className="p-6 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Bu gün için plan kalemi yok</h3>
            <p className="text-sm text-muted-foreground">
              {DAY_NAMES_LONG[new Date(selectedDate).getDay()]} için planlanmış üretim yok. Yukarıdan "Plan Dışı Kayıt" ile ekleyebilirsiniz.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
