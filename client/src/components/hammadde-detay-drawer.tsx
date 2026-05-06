/**
 * BUG-07 FIX: Hammadde Detay Drawer (Bağlam-İçi)
 *
 * Aslan 7 May 2026 — Replit Agent raporu BUG-07:
 * 'Reçete malzeme tıklayınca /girdi-yonetimi/:id'ye navigate ediyor —
 *  kullanıcı reçete sayfasından çıkıyor'
 *
 * ÇÖZÜM: Sheet (side drawer) ile in-page detay göster.
 * Reçete sayfasından çıkmadan hammadde detayı görüntülenebilir.
 *
 * D-44 Bağlam-İçi Tab Prensibi'nin drawer versiyonu.
 */

import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package, Beaker, AlertTriangle, Truck, Tag, ExternalLink,
  TrendingUp, TrendingDown, DollarSign, Calendar,
} from "lucide-react";

interface HammaddeDetayDrawerProps {
  rawMaterialId: number | null;
  open: boolean;
  onClose: () => void;
}

export function HammaddeDetayDrawer({ rawMaterialId, open, onClose }: HammaddeDetayDrawerProps) {
  const [, navigate] = useLocation();

  const { data: hammadde, isLoading } = useQuery<any>({
    queryKey: [`/api/girdi/${rawMaterialId}`],
    enabled: open && !!rawMaterialId,
  });

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Hammadde Detayı
          </SheetTitle>
          <SheetDescription className="text-xs">
            Reçeteden ayrılmadan tüm bilgiler
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
            {/* Genel */}
            <Card>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-start gap-2 flex-wrap">
                  <span className="font-mono text-xs text-muted-foreground">{hammadde.code}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {hammadde.unit}
                  </Badge>
                  {hammadde.isActive === false && (
                    <Badge variant="destructive" className="text-[10px]">Pasif</Badge>
                  )}
                  {hammadde.isKeyblend && (
                    <Badge className="text-[10px] bg-purple-100 text-purple-900">🔒 Keyblend</Badge>
                  )}
                </div>
                <h3 className="font-semibold">{hammadde.name}</h3>
                {hammadde.brand && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {hammadde.brand}
                  </p>
                )}
                {hammadde.materialGroup && (
                  <p className="text-xs text-muted-foreground">
                    Grup: <span className="font-medium">{hammadde.materialGroup}</span>
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Tedarikçi */}
            {hammadde.supplier && (
              <Card>
                <CardContent className="pt-4">
                  <div className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    Tedarikçi
                  </div>
                  <div className="font-medium text-sm">{hammadde.supplier.name}</div>
                </CardContent>
              </Card>
            )}

            {/* Fiyat */}
            <Card>
              <CardContent className="pt-4">
                <div className="text-[11px] text-muted-foreground mb-2 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Fiyat Bilgisi
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {hammadde.currentUnitPrice !== null && hammadde.currentUnitPrice !== undefined && (
                    <div>
                      <div className="text-muted-foreground">Güncel</div>
                      <div className="font-semibold">
                        {Number(hammadde.currentUnitPrice).toFixed(2)} ₺/{hammadde.unit}
                      </div>
                    </div>
                  )}
                  {hammadde.averagePrice !== null && hammadde.averagePrice !== undefined && (
                    <div>
                      <div className="text-muted-foreground">Ortalama</div>
                      <div className="font-medium">
                        {Number(hammadde.averagePrice).toFixed(2)} ₺
                      </div>
                    </div>
                  )}
                  {hammadde.lastPurchasePrice !== null && hammadde.lastPurchasePrice !== undefined && (
                    <div>
                      <div className="text-muted-foreground">Son Alış</div>
                      <div>{Number(hammadde.lastPurchasePrice).toFixed(2)} ₺</div>
                    </div>
                  )}
                  {hammadde.priceLastUpdated && (
                    <div>
                      <div className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Güncelleme
                      </div>
                      <div className="text-[11px]">
                        {new Date(hammadde.priceLastUpdated).toLocaleDateString('tr-TR')}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Besin Değerleri */}
            {(hammadde.energyKcal !== null || hammadde.fat !== null || hammadde.protein !== null) && (
              <Card>
                <CardContent className="pt-4">
                  <div className="text-[11px] text-muted-foreground mb-2 flex items-center gap-1">
                    <Beaker className="h-3 w-3" />
                    Besin Değerleri (100g başına)
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {hammadde.energyKcal !== null && hammadde.energyKcal !== undefined && (
                      <div>
                        <span className="text-muted-foreground">Enerji:</span>{' '}
                        <span className="font-medium">{hammadde.energyKcal} kcal</span>
                      </div>
                    )}
                    {hammadde.fat !== null && hammadde.fat !== undefined && (
                      <div>
                        <span className="text-muted-foreground">Yağ:</span>{' '}
                        <span className="font-medium">{hammadde.fat}g</span>
                      </div>
                    )}
                    {hammadde.carbohydrate !== null && hammadde.carbohydrate !== undefined && (
                      <div>
                        <span className="text-muted-foreground">Karb:</span>{' '}
                        <span className="font-medium">{hammadde.carbohydrate}g</span>
                      </div>
                    )}
                    {hammadde.protein !== null && hammadde.protein !== undefined && (
                      <div>
                        <span className="text-muted-foreground">Protein:</span>{' '}
                        <span className="font-medium">{hammadde.protein}g</span>
                      </div>
                    )}
                    {hammadde.salt !== null && hammadde.salt !== undefined && (
                      <div>
                        <span className="text-muted-foreground">Tuz:</span>{' '}
                        <span className="font-medium">{hammadde.salt}g</span>
                      </div>
                    )}
                    {hammadde.sugar !== null && hammadde.sugar !== undefined && (
                      <div>
                        <span className="text-muted-foreground">Şeker:</span>{' '}
                        <span className="font-medium">{hammadde.sugar}g</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Alerjen */}
            {(hammadde.allergenPresent || hammadde.allergenDetail || hammadde.crossContamination) && (
              <Card className="border-orange-200 bg-orange-50/30 dark:bg-orange-950/10">
                <CardContent className="pt-4">
                  <div className="text-[11px] text-muted-foreground mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-orange-600" />
                    Alerjen Bilgisi
                  </div>
                  {hammadde.allergenPresent && (
                    <Badge className="bg-orange-100 text-orange-900 text-[10px] mb-2">
                      ⚠️ Alerjen İçerir
                    </Badge>
                  )}
                  {hammadde.allergenDetail && (
                    <p className="text-xs mb-1">
                      <span className="text-muted-foreground">Detay:</span> {hammadde.allergenDetail}
                    </p>
                  )}
                  {hammadde.crossContamination && (
                    <p className="text-xs">
                      <span className="text-muted-foreground">Çapraz:</span> {hammadde.crossContamination}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* TGK Uyum */}
            <Card className={hammadde.tgkCompliant ? "border-green-200 bg-green-50/30 dark:bg-green-950/10" : "border-yellow-200 bg-yellow-50/30 dark:bg-yellow-950/10"}>
              <CardContent className="pt-4">
                <div className="text-[11px] text-muted-foreground mb-1">TGK 2017/2284</div>
                <Badge className={hammadde.tgkCompliant ? "bg-green-100 text-green-900 text-[10px]" : "bg-yellow-100 text-yellow-900 text-[10px]"}>
                  {hammadde.tgkCompliant ? "✅ Onaylı" : "⏳ Onay Bekliyor"}
                </Badge>
              </CardContent>
            </Card>

            {/* Aksiyonlar */}
            <div className="flex flex-col gap-2 pt-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  onClose();
                  navigate(`/girdi-yonetimi/${rawMaterialId}`);
                }}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-2" />
                Tam Detayda Aç (5 sekme)
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
