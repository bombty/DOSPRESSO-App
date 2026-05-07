/**
 * BUG-07 FIX + ASLAN 7 May 2026 EDIT FIX:
 * Hammadde Detay Drawer (Bağlam-İçi + Inline Edit)
 *
 * Aslan'ın talebi:
 *   "reçetede içerik kısmında hammadeeye tıklayınca güncelleme,
 *    fiyat girme,( eğer yoksa) detay kartı açıp düzenleme imkanı olmalı"
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package, Beaker, AlertTriangle, Truck, Tag, ExternalLink,
  DollarSign, Calendar, Edit, Save, X,
} from "lucide-react";

interface HammaddeDetayDrawerProps {
  rawMaterialId: number | null;
  open: boolean;
  onClose: () => void;
}

const EDIT_ROLES = ['admin', 'ceo', 'cgo', 'satinalma', 'gida_muhendisi'];

export function HammaddeDetayDrawer({ rawMaterialId, open, onClose }: HammaddeDetayDrawerProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const canEdit = EDIT_ROLES.includes(user?.role || '');

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  const { data: hammadde, isLoading } = useQuery<any>({
    queryKey: [`/api/girdi/${rawMaterialId}`],
    enabled: open && !!rawMaterialId,
  });

  useEffect(() => {
    if (!open) {
      setIsEditing(false);
      setEditForm({});
    }
  }, [open]);

  const handleStartEdit = () => {
    if (!hammadde) return;
    setEditForm({
      currentUnitPrice: hammadde.currentUnitPrice ?? '',
      brand: hammadde.brand || '',
      energyKcal: hammadde.energyKcal ?? '',
      fat: hammadde.fat ?? '',
      carbohydrate: hammadde.carbohydrate ?? '',
      protein: hammadde.protein ?? '',
      sugar: hammadde.sugar ?? '',
      salt: hammadde.salt ?? '',
      fiber: hammadde.fiber ?? '',
      allergenPresent: hammadde.allergenPresent ?? false,
      allergenDetail: hammadde.allergenDetail || '',
    });
    setIsEditing(true);
  };

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PUT", `/api/girdi/${rawMaterialId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/girdi/${rawMaterialId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/girdi/list'] });
      // Reçete sayfasındaki besin değerleri de tazelensin
      queryClient.invalidateQueries({ queryKey: ['/api/factory/recipes'] });
      toast({
        title: "✅ Güncellendi",
        description: "Reçete besin hesabı otomatik yenilenir.",
      });
      setIsEditing(false);
    },
    onError: (err: any) => {
      toast({
        title: "Hata",
        description: err?.message || "Güncellenemedi.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const cleaned: any = { ...editForm };
    ['currentUnitPrice', 'energyKcal', 'fat', 'carbohydrate', 'protein', 'sugar', 'salt', 'fiber'].forEach(k => {
      if (cleaned[k] === '' || cleaned[k] === null || cleaned[k] === undefined) {
        cleaned[k] = null;
      } else {
        cleaned[k] = parseFloat(cleaned[k]);
      }
    });
    updateMutation.mutate(cleaned);
  };

  const handleCancel = () => {
    setEditForm({});
    setIsEditing(false);
  };

  const missingPrice = hammadde && (hammadde.currentUnitPrice === null || hammadde.currentUnitPrice === undefined || Number(hammadde.currentUnitPrice) === 0);
  const missingNutrition = hammadde && (hammadde.energyKcal === null || hammadde.energyKcal === undefined);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between gap-2 pr-6">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              <span>Hammadde Detayı</span>
            </div>
            {!isEditing && canEdit && hammadde && (
              <Button
                size="sm"
                onClick={handleStartEdit}
                data-testid="button-drawer-edit"
              >
                <Edit className="h-3.5 w-3.5 mr-1" />
                Düzenle
              </Button>
            )}
          </SheetTitle>
          <SheetDescription className="text-xs">
            {isEditing ? 'Düzenleme modu — kaydet butonuna tıklayın' : 'Reçeteden ayrılmadan tüm bilgiler'}
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-3 mt-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : !hammadde ? (
          <div className="mt-8 text-center text-muted-foreground">
            <AlertTriangle className="h-10 w-10 mx-auto mb-2 text-amber-500" />
            <p className="text-sm">Hammadde bulunamadı</p>
          </div>
        ) : (
          <div className="space-y-3 mt-4 pb-8">
            {/* Genel + Eksiklik uyarısı */}
            <Card>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-start gap-2 flex-wrap">
                  <span className="font-mono text-xs text-muted-foreground">{hammadde.code}</span>
                  <Badge variant="outline" className="text-[10px]">{hammadde.unit}</Badge>
                  {hammadde.isActive === false && <Badge variant="destructive" className="text-[10px]">Pasif</Badge>}
                  {hammadde.isKeyblend && <Badge className="text-[10px] bg-purple-100 text-purple-900">🔒 Keyblend</Badge>}
                  {missingPrice && !isEditing && (
                    <Badge className="text-[10px] bg-red-100 text-red-900 border border-red-300">⚠️ Fiyat eksik</Badge>
                  )}
                  {missingNutrition && !isEditing && (
                    <Badge className="text-[10px] bg-orange-100 text-orange-900 border border-orange-300">⚠️ Besin eksik</Badge>
                  )}
                </div>
                <h3 className="font-semibold">{hammadde.name}</h3>
                {!isEditing ? (
                  <>
                    {hammadde.brand && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Tag className="h-3 w-3" />{hammadde.brand}
                      </p>
                    )}
                    {hammadde.materialGroup && (
                      <p className="text-xs text-muted-foreground">
                        Grup: <span className="font-medium">{hammadde.materialGroup}</span>
                      </p>
                    )}
                  </>
                ) : (
                  <div>
                    <Label className="text-[10px]">Marka</Label>
                    <Input
                      value={editForm.brand || ''}
                      onChange={e => setEditForm((f: any) => ({ ...f, brand: e.target.value }))}
                      placeholder="örn: Doğuş"
                      className="h-8 text-sm"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tedarikçi (sadece view) */}
            {!isEditing && hammadde.supplier && (
              <Card>
                <CardContent className="pt-4">
                  <div className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
                    <Truck className="h-3 w-3" />Tedarikçi
                  </div>
                  <div className="font-medium text-sm">{hammadde.supplier.name}</div>
                </CardContent>
              </Card>
            )}

            {/* Fiyat */}
            <Card className={missingPrice && !isEditing ? "border-red-300 bg-red-50/30 dark:bg-red-950/10" : ""}>
              <CardContent className="pt-4">
                <div className="text-[11px] text-muted-foreground mb-2 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />Fiyat Bilgisi {missingPrice && !isEditing && <span className="text-red-600">— eksik!</span>}
                </div>
                {!isEditing ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {hammadde.currentUnitPrice !== null && hammadde.currentUnitPrice !== undefined && Number(hammadde.currentUnitPrice) > 0 ? (
                      <div>
                        <div className="text-muted-foreground">Güncel</div>
                        <div className="font-semibold">{Number(hammadde.currentUnitPrice).toFixed(2)} ₺/{hammadde.unit}</div>
                      </div>
                    ) : (
                      <div className="col-span-2">
                        <div className="text-red-600 text-xs italic">⚠️ Fiyat girilmemiş — düzenle butonuna tıklayın</div>
                      </div>
                    )}
                    {hammadde.lastPurchasePrice !== null && hammadde.lastPurchasePrice !== undefined && Number(hammadde.lastPurchasePrice) > 0 && (
                      <div>
                        <div className="text-muted-foreground">Son Alış</div>
                        <div>{Number(hammadde.lastPurchasePrice).toFixed(2)} ₺</div>
                      </div>
                    )}
                    {hammadde.priceLastUpdated && (
                      <div>
                        <div className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />Güncelleme
                        </div>
                        <div className="text-[11px]">{new Date(hammadde.priceLastUpdated).toLocaleDateString('tr-TR')}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <Label className="text-[10px]">Güncel Birim Fiyat (₺ / {hammadde.unit})</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editForm.currentUnitPrice ?? ''}
                      onChange={e => setEditForm((f: any) => ({ ...f, currentUnitPrice: e.target.value }))}
                      placeholder="0.00"
                      className="h-8 text-sm"
                      data-testid="input-drawer-price"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Besin Değerleri */}
            <Card className={missingNutrition && !isEditing ? "border-orange-300 bg-orange-50/30 dark:bg-orange-950/10" : ""}>
              <CardContent className="pt-4">
                <div className="text-[11px] text-muted-foreground mb-2 flex items-center gap-1">
                  <Beaker className="h-3 w-3" />Besin Değerleri (100g) {missingNutrition && !isEditing && <span className="text-orange-600">— eksik!</span>}
                </div>
                {!isEditing ? (
                  hammadde.energyKcal !== null && hammadde.energyKcal !== undefined ? (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Enerji:</span> <span className="font-medium">{hammadde.energyKcal} kcal</span></div>
                      {hammadde.fat !== null && <div><span className="text-muted-foreground">Yağ:</span> <span className="font-medium">{hammadde.fat}g</span></div>}
                      {hammadde.carbohydrate !== null && <div><span className="text-muted-foreground">Karb:</span> <span className="font-medium">{hammadde.carbohydrate}g</span></div>}
                      {hammadde.protein !== null && <div><span className="text-muted-foreground">Protein:</span> <span className="font-medium">{hammadde.protein}g</span></div>}
                      {hammadde.sugar !== null && <div><span className="text-muted-foreground">Şeker:</span> <span className="font-medium">{hammadde.sugar}g</span></div>}
                      {hammadde.salt !== null && <div><span className="text-muted-foreground">Tuz:</span> <span className="font-medium">{hammadde.salt}g</span></div>}
                    </div>
                  ) : (
                    <p className="text-orange-600 text-xs italic">⚠️ Besin değerleri girilmemiş — reçete besin hesabı eksik kalır</p>
                  )
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px]">Enerji (kcal)</Label>
                      <Input type="number" step="0.1" value={editForm.energyKcal ?? ''} onChange={e => setEditForm((f: any) => ({ ...f, energyKcal: e.target.value }))} className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-[10px]">Yağ (g)</Label>
                      <Input type="number" step="0.01" value={editForm.fat ?? ''} onChange={e => setEditForm((f: any) => ({ ...f, fat: e.target.value }))} className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-[10px]">Karbonhidrat (g)</Label>
                      <Input type="number" step="0.01" value={editForm.carbohydrate ?? ''} onChange={e => setEditForm((f: any) => ({ ...f, carbohydrate: e.target.value }))} className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-[10px]">Protein (g)</Label>
                      <Input type="number" step="0.01" value={editForm.protein ?? ''} onChange={e => setEditForm((f: any) => ({ ...f, protein: e.target.value }))} className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-[10px]">Şeker (g)</Label>
                      <Input type="number" step="0.01" value={editForm.sugar ?? ''} onChange={e => setEditForm((f: any) => ({ ...f, sugar: e.target.value }))} className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-[10px]">Tuz (g)</Label>
                      <Input type="number" step="0.01" value={editForm.salt ?? ''} onChange={e => setEditForm((f: any) => ({ ...f, salt: e.target.value }))} className="h-8 text-sm" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Alerjen */}
            <Card className={isEditing || (hammadde.allergenPresent || hammadde.allergenDetail) ? "border-orange-200 bg-orange-50/30 dark:bg-orange-950/10" : ""}>
              <CardContent className="pt-4">
                <div className="text-[11px] text-muted-foreground mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-orange-600" />Alerjen Bilgisi
                </div>
                {!isEditing ? (
                  hammadde.allergenPresent || hammadde.allergenDetail ? (
                    <>
                      {hammadde.allergenPresent && <Badge className="bg-orange-100 text-orange-900 text-[10px] mb-2">⚠️ Alerjen İçerir</Badge>}
                      {hammadde.allergenDetail && (
                        <p className="text-xs mb-1">
                          <span className="text-muted-foreground">Detay:</span> {hammadde.allergenDetail}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">Alerjen yok</p>
                  )
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Switch checked={editForm.allergenPresent ?? false} onCheckedChange={(v: boolean) => setEditForm((f: any) => ({ ...f, allergenPresent: v }))} />
                      <Label className="text-xs">Alerjen İçerir</Label>
                    </div>
                    <Textarea
                      value={editForm.allergenDetail || ''}
                      onChange={e => setEditForm((f: any) => ({ ...f, allergenDetail: e.target.value }))}
                      placeholder="örn: Gluten, süt, yumurta içerir"
                      rows={2}
                      className="text-sm"
                      disabled={!editForm.allergenPresent}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Aksiyon Butonları */}
            <div className="flex flex-col gap-2 pt-2 sticky bottom-0 bg-background pb-2">
              {isEditing ? (
                <>
                  <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-drawer-save">
                    <Save className="h-3.5 w-3.5 mr-2" />
                    {updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCancel} disabled={updateMutation.isPending}>
                    <X className="h-3.5 w-3.5 mr-2" />İptal
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => { onClose(); navigate(`/girdi-yonetimi/${rawMaterialId}`); }}>
                  <ExternalLink className="h-3.5 w-3.5 mr-2" />Tam Detayda Aç (5 sekme)
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
