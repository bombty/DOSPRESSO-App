/**
 * Sprint 14 — Hammadde Detay Sayfası (D-44 Bağlam-İçi Tab Prensibi)
 *
 * Önceki yapı: girdi-yonetimi.tsx içinde modal/dialog
 * Yeni yapı: Tek başına detay sayfası, 5 bağlam-içi sekme
 *
 * Route: /girdi-yonetimi/:id
 *
 * Sekmeler:
 *   1. 📋 Genel — Temel bilgiler (rawMaterials)
 *   2. 🥗 Besin (TÜRKOMP) — Besin değerleri
 *   3. ⚠️ Alerjen — 14 TGK allerjen
 *   4. 🛡️ Tedarikçi Kalite — defectRate, lot QC (sidebar'dan taşındı)
 *   5. 📦 Stok Hareketleri — inventory_movements + fiyat geçmişi
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft, Package, Beaker, AlertTriangle, Shield, Boxes,
  TrendingUp, TrendingDown, Tag, Truck, BadgeCheck, FileText,
  DollarSign, Calendar, Edit, Save, X,
} from "lucide-react";

interface Hammadde {
  id: number;
  code: string;
  name: string;
  category?: string | null;
  unit: string;
  brand?: string | null;
  materialGroup?: string | null;
  currentUnitPrice?: string | null;
  lastPurchasePrice?: string | null;
  averagePrice?: string | null;
  priceLastUpdated?: string | null;
  contentInfo?: string | null;
  isActive: boolean;
  isKeyblend: boolean;
  notes?: string | null;
  supplier?: { id: number; name: string } | null;
  // TGK Sprint 7
  netContentValue?: string | null;
  netContentUnit?: string | null;
  // Allerjen
  allergenInfo?: string | null;
  allergens?: string[] | null;
}

const ROLE_CAN_EDIT = ['admin', 'ceo', 'cgo', 'satinalma', 'gida_muhendisi'];

export default function GirdiDetay() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/girdi-yonetimi/:id");
  const { user } = useAuth();
  const { toast } = useToast();
  const id = params?.id ? parseInt(params.id, 10) : null;
  const [activeTab, setActiveTab] = useState("genel");

  // ═══════════════════════════════════════════════════════════════════
  // BUG-EDIT FIX (7 May 2026): Edit Mode — Sema bilgileri düzenleyebilir
  // ═══════════════════════════════════════════════════════════════════
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  const canEdit = ROLE_CAN_EDIT.includes(user?.role || '');

  const { data: hammadde, isLoading, error } = useQuery<Hammadde>({
    queryKey: [`/api/girdi/${id}`],
    enabled: !!id,
  });

  // Tedarikçi listesi (dropdown için)
  const { data: suppliers = [] } = useQuery<any[]>({
    queryKey: ['/api/suppliers'],
    enabled: isEditing,
  });

  // Edit mutation — PUT /api/girdi/:id
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PUT", `/api/girdi/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/girdi/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/girdi/list'] });
      toast({ title: "✅ Hammadde güncellendi", description: "Değişiklikler kaydedildi." });
      setIsEditing(false);
    },
    onError: (err: any) => {
      toast({
        title: "Hata",
        description: err?.message || "Hammadde güncellenemedi.",
        variant: "destructive",
      });
    },
  });

  // Edit moda geçince mevcut değerleri form'a yükle
  const handleStartEdit = () => {
    if (!hammadde) return;
    setEditForm({
      name: hammadde.name,
      code: hammadde.code,
      category: hammadde.category || '',
      unit: hammadde.unit || 'kg',
      brand: hammadde.brand || '',
      materialGroup: hammadde.materialGroup || '',
      supplierId: hammadde.supplier?.id || null,
      currentUnitPrice: hammadde.currentUnitPrice || '',
      contentInfo: (hammadde as any).contentInfo || '',
      allergenPresent: (hammadde as any).allergenPresent ?? false,
      allergenDetail: (hammadde as any).allergenDetail || '',
      crossContamination: (hammadde as any).crossContamination || '',
      energyKcal: (hammadde as any).energyKcal ?? '',
      fat: (hammadde as any).fat ?? '',
      carbohydrate: (hammadde as any).carbohydrate ?? '',
      protein: (hammadde as any).protein ?? '',
      salt: (hammadde as any).salt ?? '',
      sugar: (hammadde as any).sugar ?? '',
      fiber: (hammadde as any).fiber ?? '',
      storageConditions: (hammadde as any).storageConditions || '',
      isActive: hammadde.isActive ?? true,
      tgkCompliant: (hammadde as any).tgkCompliant ?? false,
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    // Sayısal alanları parseFloat ile temizle
    const cleaned: any = { ...editForm };
    ['currentUnitPrice', 'energyKcal', 'fat', 'carbohydrate', 'protein', 'salt', 'sugar', 'fiber'].forEach(k => {
      if (cleaned[k] === '' || cleaned[k] === null || cleaned[k] === undefined) {
        cleaned[k] = null;
      } else {
        cleaned[k] = parseFloat(cleaned[k]);
      }
    });
    if (cleaned.supplierId === '' || cleaned.supplierId === null) cleaned.supplierId = null;
    updateMutation.mutate(cleaned);
  };

  const handleCancel = () => {
    setEditForm({});
    setIsEditing(false);
  };
  // ═══════════════════════════════════════════════════════════════════

  // Fiyat geçmişi (price history)
  const { data: priceHistory = [] } = useQuery<any[]>({
    queryKey: [`/api/girdi/${id}/price-history`],
    enabled: !!id && activeTab === "stok",
  });

  // TÜRKOMP besin değerleri (hammadde adıyla eşleştir)
  const { data: nutritionData } = useQuery<any>({
    queryKey: [`/api/turkomp/by-name`, hammadde?.name],
    queryFn: async () => {
      if (!hammadde?.name) return null;
      const res = await fetch(`/api/turkomp/by-name?name=${encodeURIComponent(hammadde.name)}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!hammadde?.name && activeTab === "besin",
  });

  if (!id) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <Card className="mt-8">
          <CardContent className="p-8 text-center space-y-4">
            <Package className="h-16 w-16 text-primary mx-auto" />
            <h2 className="text-2xl font-bold">Hammadde Bulunamadı</h2>
            <p className="text-muted-foreground">Lütfen önce bir hammadde seçin.</p>
            <Button onClick={() => navigate('/girdi-yonetimi')}>
              Hammaddeler Sayfasına Git
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) return <LoadingState />;
  if (error || !hammadde) return <ErrorState message="Hammadde yüklenemedi" />;

  const allergens = Array.isArray(hammadde.allergens) ? hammadde.allergens : [];
  const hasAllergens = allergens.length > 0;

  return (
    <div className="container mx-auto p-4 max-w-7xl pb-20" data-testid="girdi-detay">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/girdi-yonetimi')} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Hammaddeler
        </Button>
      </div>

      <div className="flex items-start gap-3 mb-6">
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3">
          <Package className="h-6 w-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{hammadde.name}</h1>
            <Badge variant="outline" className="text-xs">{hammadde.code}</Badge>
            {hammadde.isKeyblend && (
              <Badge className="text-xs bg-purple-600">🔒 Keyblend</Badge>
            )}
            {!hammadde.isActive && (
              <Badge variant="secondary" className="text-xs">Pasif</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {hammadde.category || "Kategori yok"} • {hammadde.unit}
            {hammadde.brand && ` • ${hammadde.brand}`}
            {hammadde.supplier && ` • Tedarikçi: ${hammadde.supplier.name}`}
          </p>
        </div>
        {/* BUG-EDIT FIX: Düzenle / Kaydet / İptal butonları */}
        <div className="flex gap-2">
          {!isEditing && canEdit && (
            <Button onClick={handleStartEdit} size="sm" data-testid="button-edit-hammadde">
              <Edit className="h-4 w-4 mr-1" />
              Düzenle
            </Button>
          )}
          {isEditing && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={updateMutation.isPending}
                data-testid="button-cancel-edit"
              >
                <X className="h-4 w-4 mr-1" />
                İptal
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateMutation.isPending}
                data-testid="button-save-hammadde"
              >
                <Save className="h-4 w-4 mr-1" />
                {updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Bağlam Şeridi - Mr. Dobody hızlı bilgi */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="pt-3 pb-3">
            <div className="text-xs text-muted-foreground">Güncel Fiyat</div>
            <div className="text-lg font-bold flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-green-600" />
              {hammadde.currentUnitPrice ? `${parseFloat(hammadde.currentUnitPrice).toFixed(2)} TL` : "—"}
            </div>
            <div className="text-[10px] text-muted-foreground">/{hammadde.unit}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3">
            <div className="text-xs text-muted-foreground">Allerjen</div>
            <div className="text-lg font-bold">
              {hasAllergens ? (
                <span className="text-amber-600">{allergens.length} tespit</span>
              ) : (
                <span className="text-green-600">Yok ✓</span>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3">
            <div className="text-xs text-muted-foreground">TÜRKOMP</div>
            <div className="text-lg font-bold">
              {nutritionData ? <span className="text-green-600">Veri var ✓</span> : <span className="text-muted-foreground">—</span>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3">
            <div className="text-xs text-muted-foreground">Son Fiyat Güncelleme</div>
            <div className="text-sm font-bold">
              {hammadde.priceLastUpdated
                ? new Date(hammadde.priceLastUpdated).toLocaleDateString('tr-TR')
                : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-transparent p-0 border-b border-border rounded-none w-full justify-start overflow-x-auto">
          <TabsTrigger value="genel" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-2 text-sm">
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Genel
          </TabsTrigger>
          <TabsTrigger value="besin" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-2 text-sm">
            <Beaker className="h-3.5 w-3.5 mr-1.5" />
            Besin (TÜRKOMP)
          </TabsTrigger>
          <TabsTrigger value="alerjen" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-2 text-sm">
            <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
            Alerjen
          </TabsTrigger>
          <TabsTrigger value="tedarikci" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-2 text-sm">
            <Shield className="h-3.5 w-3.5 mr-1.5" />
            Tedarikçi Kalite
          </TabsTrigger>
          <TabsTrigger value="stok" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-2 text-sm">
            <Boxes className="h-3.5 w-3.5 mr-1.5" />
            Stok & Fiyat
          </TabsTrigger>
        </TabsList>

        {/* GENEL */}
        <TabsContent value="genel" className="space-y-4 pt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Hammadde Bilgileri
                {isEditing && <Badge className="ml-2 bg-blue-600 text-xs">Düzenleme Modu</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!isEditing ? (
                /* ───── VIEW MODE ───── */
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Kod</div>
                      <div className="font-medium">{hammadde.code}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Kategori</div>
                      <div className="font-medium">{hammadde.category || "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Birim</div>
                      <div className="font-medium">{hammadde.unit}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Marka</div>
                      <div className="font-medium">{hammadde.brand || "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Malzeme Grubu</div>
                      <div className="font-medium">{hammadde.materialGroup || "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Tedarikçi</div>
                      <div className="font-medium">{hammadde.supplier?.name || "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Net Miktar</div>
                      <div className="font-medium">
                        {hammadde.netContentValue ? `${hammadde.netContentValue} ${hammadde.netContentUnit || hammadde.unit}` : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Durum</div>
                      <div className="font-medium">
                        {hammadde.isActive ? (
                          <span className="text-green-600">Aktif ✓</span>
                        ) : (
                          <span className="text-muted-foreground">Pasif</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {hammadde.contentInfo && (
                    <div className="pt-3 border-t">
                      <div className="text-xs text-muted-foreground mb-1">İçerik Bilgisi (TGK m.9)</div>
                      <div className="text-sm">{hammadde.contentInfo}</div>
                    </div>
                  )}

                  {hammadde.notes && (
                    <div className="pt-3 border-t">
                      <div className="text-xs text-muted-foreground mb-1">Notlar</div>
                      <div className="text-sm whitespace-pre-line">{hammadde.notes}</div>
                    </div>
                  )}
                </>
              ) : (
                /* ───── EDIT MODE ───── */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="edit-name">Ürün Adı *</Label>
                      <Input
                        id="edit-name"
                        value={editForm.name || ''}
                        onChange={e => setEditForm((f: any) => ({ ...f, name: e.target.value }))}
                        data-testid="input-edit-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-code">Kod</Label>
                      <Input
                        id="edit-code"
                        value={editForm.code || ''}
                        onChange={e => setEditForm((f: any) => ({ ...f, code: e.target.value }))}
                        data-testid="input-edit-code"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-category">Kategori</Label>
                      <Input
                        id="edit-category"
                        value={editForm.category || ''}
                        onChange={e => setEditForm((f: any) => ({ ...f, category: e.target.value }))}
                        placeholder="örn: kuru_gida, sut_urunu"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-unit">Birim *</Label>
                      <Select
                        value={editForm.unit || 'kg'}
                        onValueChange={v => setEditForm((f: any) => ({ ...f, unit: v }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="L">L</SelectItem>
                          <SelectItem value="ml">ml</SelectItem>
                          <SelectItem value="adet">adet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit-brand">Marka</Label>
                      <Input
                        id="edit-brand"
                        value={editForm.brand || ''}
                        onChange={e => setEditForm((f: any) => ({ ...f, brand: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-materialGroup">Malzeme Grubu</Label>
                      <Input
                        id="edit-materialGroup"
                        value={editForm.materialGroup || ''}
                        onChange={e => setEditForm((f: any) => ({ ...f, materialGroup: e.target.value }))}
                        placeholder="örn: katki maddesi"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-supplier">Tedarikçi</Label>
                      <Select
                        value={editForm.supplierId ? String(editForm.supplierId) : 'none'}
                        onValueChange={v => setEditForm((f: any) => ({ ...f, supplierId: v === 'none' ? null : parseInt(v, 10) }))}
                      >
                        <SelectTrigger data-testid="select-edit-supplier"><SelectValue placeholder="Seçin..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Tedarikçi yok —</SelectItem>
                          {suppliers.map((s: any) => (
                            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit-currentUnitPrice">Güncel Fiyat (₺)</Label>
                      <Input
                        id="edit-currentUnitPrice"
                        type="number"
                        step="0.01"
                        value={editForm.currentUnitPrice || ''}
                        onChange={e => setEditForm((f: any) => ({ ...f, currentUnitPrice: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="edit-contentInfo">İçerik Bilgisi (TGK Madde 9)</Label>
                    <Textarea
                      id="edit-contentInfo"
                      value={editForm.contentInfo || ''}
                      onChange={e => setEditForm((f: any) => ({ ...f, contentInfo: e.target.value }))}
                      placeholder="örn: Buğday unu, su, tuz, maya, şeker..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-storageConditions">Saklama Koşulları</Label>
                    <Input
                      id="edit-storageConditions"
                      value={editForm.storageConditions || ''}
                      onChange={e => setEditForm((f: any) => ({ ...f, storageConditions: e.target.value }))}
                      placeholder="örn: +4°C, kuru ve serin yer"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="edit-isActive"
                        checked={editForm.isActive ?? true}
                        onCheckedChange={(v: boolean) => setEditForm((f: any) => ({ ...f, isActive: v }))}
                      />
                      <Label htmlFor="edit-isActive">Aktif</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="edit-tgkCompliant"
                        checked={editForm.tgkCompliant ?? false}
                        onCheckedChange={(v: boolean) => setEditForm((f: any) => ({ ...f, tgkCompliant: v }))}
                      />
                      <Label htmlFor="edit-tgkCompliant">TGK 2017/2284 Onaylı</Label>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* BESİN (TÜRKOMP) */}
        <TabsContent value="besin" className="space-y-4 pt-6">
          {/* BUG-EDIT FIX: Edit modunda manuel besin değer girişi */}
          {isEditing && (
            <Card className="border-blue-300 bg-blue-50/30 dark:bg-blue-950/10">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Besin Değerleri Manuel Giriş (100g başına)
                </CardTitle>
                <CardDescription>
                  TÜRKOMP'ta veri yoksa veya farklı değer girmek istiyorsanız buraya girin.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <Label htmlFor="edit-energyKcal">Enerji (kcal)</Label>
                    <Input
                      id="edit-energyKcal"
                      type="number"
                      step="0.1"
                      value={editForm.energyKcal ?? ''}
                      onChange={e => setEditForm((f: any) => ({ ...f, energyKcal: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-fat">Yağ (g)</Label>
                    <Input
                      id="edit-fat"
                      type="number"
                      step="0.01"
                      value={editForm.fat ?? ''}
                      onChange={e => setEditForm((f: any) => ({ ...f, fat: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-carbohydrate">Karbonhidrat (g)</Label>
                    <Input
                      id="edit-carbohydrate"
                      type="number"
                      step="0.01"
                      value={editForm.carbohydrate ?? ''}
                      onChange={e => setEditForm((f: any) => ({ ...f, carbohydrate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-protein">Protein (g)</Label>
                    <Input
                      id="edit-protein"
                      type="number"
                      step="0.01"
                      value={editForm.protein ?? ''}
                      onChange={e => setEditForm((f: any) => ({ ...f, protein: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-sugar">Şeker (g)</Label>
                    <Input
                      id="edit-sugar"
                      type="number"
                      step="0.01"
                      value={editForm.sugar ?? ''}
                      onChange={e => setEditForm((f: any) => ({ ...f, sugar: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-salt">Tuz (g)</Label>
                    <Input
                      id="edit-salt"
                      type="number"
                      step="0.01"
                      value={editForm.salt ?? ''}
                      onChange={e => setEditForm((f: any) => ({ ...f, salt: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-fiber">Lif (g)</Label>
                    <Input
                      id="edit-fiber"
                      type="number"
                      step="0.01"
                      value={editForm.fiber ?? ''}
                      onChange={e => setEditForm((f: any) => ({ ...f, fiber: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Beaker className="h-4 w-4 text-blue-500" />
                TÜRKOMP Besin Değerleri (100g)
              </CardTitle>
              <CardDescription>
                T.C. Tarım ve Orman Bakanlığı resmi veri tabanı (turkomp.tarimorman.gov.tr)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {nutritionData ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-muted/30 rounded">
                    <div className="text-xs text-muted-foreground">Enerji</div>
                    <div className="text-lg font-bold">
                      {nutritionData.energy_kcal ? `${Math.round(nutritionData.energy_kcal)} kcal` : "—"}
                    </div>
                  </div>
                  <div className="p-3 bg-muted/30 rounded">
                    <div className="text-xs text-muted-foreground">Protein</div>
                    <div className="text-lg font-bold">
                      {nutritionData.protein != null ? `${nutritionData.protein} g` : "—"}
                    </div>
                  </div>
                  <div className="p-3 bg-muted/30 rounded">
                    <div className="text-xs text-muted-foreground">Yağ</div>
                    <div className="text-lg font-bold">
                      {nutritionData.fat != null ? `${nutritionData.fat} g` : "—"}
                    </div>
                  </div>
                  <div className="p-3 bg-muted/30 rounded">
                    <div className="text-xs text-muted-foreground">Karbonhidrat</div>
                    <div className="text-lg font-bold">
                      {nutritionData.carbohydrate != null ? `${nutritionData.carbohydrate} g` : "—"}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 space-y-3">
                  <Beaker className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                  <div>
                    <p className="text-sm font-medium">TÜRKOMP'ta veri bulunamadı</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      "{hammadde.name}" için TÜRKOMP veri tabanında eşleşme yok.
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/turkomp?q=${encodeURIComponent(hammadde.name)}`)}>
                    TÜRKOMP'ta Manuel Ara
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ALERJEN */}
        <TabsContent value="alerjen" className="space-y-4 pt-6">
          {/* BUG-EDIT FIX: Edit modunda alerjen bilgisi */}
          {isEditing && (
            <Card className="border-orange-300 bg-orange-50/30 dark:bg-orange-950/10">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Alerjen Bilgisi (TGK EK-1)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Switch
                    id="edit-allergenPresent"
                    checked={editForm.allergenPresent ?? false}
                    onCheckedChange={(v: boolean) => setEditForm((f: any) => ({ ...f, allergenPresent: v }))}
                  />
                  <Label htmlFor="edit-allergenPresent">Alerjen İçerir</Label>
                </div>
                <div>
                  <Label htmlFor="edit-allergenDetail">Alerjen Detayı</Label>
                  <Textarea
                    id="edit-allergenDetail"
                    value={editForm.allergenDetail || ''}
                    onChange={e => setEditForm((f: any) => ({ ...f, allergenDetail: e.target.value }))}
                    placeholder="örn: Sülfit içerir. Süt, yumurta, gluten içerebilir."
                    rows={2}
                    disabled={!editForm.allergenPresent}
                  />
                  {!editForm.allergenPresent && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      'Alerjen İçerir' kapalıyken bu alan deaktif.
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="edit-crossContamination">Çapraz Bulaşma Uyarısı</Label>
                  <Textarea
                    id="edit-crossContamination"
                    value={editForm.crossContamination || ''}
                    onChange={e => setEditForm((f: any) => ({ ...f, crossContamination: e.target.value }))}
                    placeholder="örn: Aynı tesiste fındık işlenmektedir."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Allerjen Bilgisi (TGK Ek-2)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hasAllergens ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {allergens.map((a, idx) => (
                      <Badge key={idx} variant="destructive" className="text-xs">
                        ⚠️ {a}
                      </Badge>
                    ))}
                  </div>
                  {hammadde.allergenInfo && (
                    <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertTitle>Detaylı Allerjen Bilgisi</AlertTitle>
                      <AlertDescription className="text-xs whitespace-pre-line">
                        {hammadde.allergenInfo}
                      </AlertDescription>
                    </Alert>
                  )}
                  <p className="text-xs text-muted-foreground p-3 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                    💡 Bu hammaddeyi içeren reçetelerde TGK 2017/2284 m.10 uyarınca etiket üzerinde
                    koyu/altı çizili olarak gösterilmelidir.
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 space-y-3">
                  <BadgeCheck className="h-12 w-12 text-green-500 mx-auto" />
                  <div>
                    <p className="text-sm font-medium">Allerjen tespit edilmedi</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      14 TGK allerjeninden hiçbiri bu hammaddede yok.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TEDARİKÇİ KALİTE */}
        <TabsContent value="tedarikci" className="space-y-4 pt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-500" />
                Tedarikçi Kalite Kontrolü (Bağlam-İçi)
              </CardTitle>
              <CardDescription>
                Bu hammaddenin tedarikçi performansı, hata oranı ve QC geçmişi
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hammadde.supplier ? (
                <div className="space-y-4">
                  <div className="p-4 border rounded space-y-2">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{hammadde.supplier.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Tedarikçi #{hammadde.supplier.id}
                    </p>
                  </div>
                  <div className="text-center py-6 space-y-3">
                    <Shield className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                    <p className="text-sm">
                      QC verileri Sprint 16'da entegre edilecek (tedarikci-kalite.tsx içeriği bağlam-içi taşınacak)
                    </p>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/tedarikci-kalite?supplierId=${hammadde.supplier?.id}`)}>
                      Tedarikçi Kalite Sayfasına Git (geçici)
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 space-y-3">
                  <Truck className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                  <div>
                    <p className="text-sm font-medium">Tedarikçi atanmamış</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Bu hammaddeye henüz tedarikçi atanmadı. Satınalma birimi ile koordine edin.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* STOK & FİYAT */}
        <TabsContent value="stok" className="space-y-4 pt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                Fiyat Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 border rounded">
                  <div className="text-xs text-muted-foreground">Güncel Fiyat</div>
                  <div className="text-lg font-bold">
                    {hammadde.currentUnitPrice ? `${parseFloat(hammadde.currentUnitPrice).toFixed(2)} TL` : "—"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">/{hammadde.unit}</div>
                </div>
                <div className="p-3 border rounded">
                  <div className="text-xs text-muted-foreground">Son Alış Fiyatı</div>
                  <div className="text-lg font-bold">
                    {hammadde.lastPurchasePrice ? `${parseFloat(hammadde.lastPurchasePrice).toFixed(2)} TL` : "—"}
                  </div>
                </div>
                <div className="p-3 border rounded">
                  <div className="text-xs text-muted-foreground">Ortalama Fiyat</div>
                  <div className="text-lg font-bold">
                    {hammadde.averagePrice ? `${parseFloat(hammadde.averagePrice).toFixed(2)} TL` : "—"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                Fiyat Geçmişi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {priceHistory.length > 0 ? (
                <div className="space-y-2">
                  {priceHistory.slice(0, 10).map((p: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 border rounded text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{new Date(p.date || p.createdAt).toLocaleDateString('tr-TR')}</span>
                      </div>
                      <div className="font-medium">
                        {parseFloat(p.unitPrice || p.price || 0).toFixed(2)} TL
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 space-y-2">
                  <TrendingDown className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                  <p className="text-sm text-muted-foreground">Henüz fiyat geçmişi yok</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
