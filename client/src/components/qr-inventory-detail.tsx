import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, TrendingDown, TrendingUp, Warehouse, DollarSign, AlertTriangle, ArrowDownUp, X } from "lucide-react";

interface QRInventoryDetailProps {
  inventoryId: string | number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return "-"; }
}

function formatNumber(value: string | number | null | undefined): string {
  if (value == null) return "-";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "-";
  return num.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCurrency(value: string | number | null | undefined): string {
  if (value == null) return "-";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "-";
  return num.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";
}

function getMovementBadge(type: string | null) {
  if (!type) return <Badge variant="outline">-</Badge>;
  const map: Record<string, { variant: "default" | "destructive" | "secondary" | "outline"; label: string }> = {
    in: { variant: "default", label: "Giriş" },
    out: { variant: "destructive", label: "Çıkış" },
    transfer: { variant: "secondary", label: "Transfer" },
    adjustment: { variant: "outline", label: "Düzeltme" },
    return: { variant: "secondary", label: "İade" },
    purchase: { variant: "default", label: "Satın Alma" },
    consumption: { variant: "destructive", label: "Tüketim" },
    waste: { variant: "destructive", label: "Fire" },
  };
  const m = map[type] || { variant: "outline" as const, label: type };
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

function getStockStatus(current: number, min: number, max: number, reorder: number) {
  if (current <= 0) return { label: "Stok Yok", color: "bg-red-500", textColor: "text-red-600" };
  if (current <= min) return { label: "Kritik", color: "bg-red-500", textColor: "text-red-600" };
  if (current <= reorder) return { label: "Düşük", color: "bg-yellow-500", textColor: "text-yellow-600" };
  if (current >= max) return { label: "Fazla", color: "bg-blue-500", textColor: "text-blue-600" };
  return { label: "Normal", color: "bg-green-500", textColor: "text-green-600" };
}

export function QRInventoryDetail({ inventoryId, open, onOpenChange }: QRInventoryDetailProps) {
  const { data, isLoading, error } = useQuery<{
    inventory: any;
    movements: any[];
  }>({
    queryKey: ["/api/qr/inventory", inventoryId],
    queryFn: async () => {
      const res = await fetch(`/api/qr/inventory/${inventoryId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Ürün bilgisi alınamadı");
      return res.json();
    },
    enabled: !!inventoryId && open,
  });

  const inv = data?.inventory;
  const currentStock = inv ? parseFloat(inv.currentStock || "0") : 0;
  const minStock = inv ? parseFloat(inv.minimumStock || "0") : 0;
  const maxStock = inv ? parseFloat(inv.maximumStock || "0") : 0;
  const reorderPoint = inv ? parseFloat(inv.reorderPoint || "0") : 0;
  const stockStatus = inv ? getStockStatus(currentStock, minStock, maxStock, reorderPoint) : null;
  const stockPercent = maxStock > 0 ? Math.min(100, (currentStock / maxStock) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="title-inventory-detail">
            <Package className="h-5 w-5" />
            Ürün Detayı
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-3" data-testid="loading-inventory-detail">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {error && (
          <div className="text-center py-6 text-destructive" data-testid="error-inventory-detail">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Ürün bilgisi yüklenemedi</p>
          </div>
        )}

        {data && inv && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Ürün Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Ad</span>
                  <span className="font-medium text-right" data-testid="text-inventory-name">{inv.name || "-"}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Kod</span>
                  <span className="font-medium" data-testid="text-inventory-code">{inv.code || "-"}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Kategori</span>
                  <span className="font-medium text-right">{inv.category || "-"}{inv.subCategory ? ` / ${inv.subCategory}` : ""}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Birim</span>
                  <span className="font-medium">{inv.unit || "-"}</span>
                </div>
                {inv.description && (
                  <div className="pt-1">
                    <span className="text-muted-foreground text-xs">Açıklama</span>
                    <p className="text-xs mt-0.5">{inv.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  {currentStock <= reorderPoint ? <TrendingDown className="h-4 w-4 text-red-500" /> : <TrendingUp className="h-4 w-4 text-green-500" />}
                  Stok Durumu
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Mevcut Stok</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg" data-testid="text-current-stock">{formatNumber(currentStock)}</span>
                    <span className="text-xs text-muted-foreground">{inv.unit}</span>
                    {stockStatus && (
                      <Badge variant={stockStatus.label === "Normal" ? "secondary" : stockStatus.label === "Kritik" || stockStatus.label === "Stok Yok" ? "destructive" : "outline"} data-testid="badge-stock-status">
                        {stockStatus.label}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="w-full bg-muted rounded-md h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-md transition-all ${stockStatus?.color || "bg-green-500"}`}
                    style={{ width: `${stockPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Min: {formatNumber(minStock)}</span>
                  <span>Sipariş: {formatNumber(reorderPoint)}</span>
                  <span>Max: {formatNumber(maxStock)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Maliyet
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Birim Fiyat</span>
                  <span className="font-medium" data-testid="text-unit-cost">{formatCurrency(inv.unitCost)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Son Alış Fiyatı</span>
                  <span className="font-medium" data-testid="text-last-purchase-price">{formatCurrency(inv.lastPurchasePrice)}</span>
                </div>
              </CardContent>
            </Card>

            {(inv.warehouseLocation || inv.storageConditions || inv.shelfLife) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Warehouse className="h-4 w-4" />
                    Depo Bilgileri
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {inv.warehouseLocation && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Konum</span>
                      <span className="font-medium text-right" data-testid="text-warehouse-location">{inv.warehouseLocation}</span>
                    </div>
                  )}
                  {inv.storageConditions && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Saklama Koşulları</span>
                      <span className="font-medium text-right">{inv.storageConditions}</span>
                    </div>
                  )}
                  {inv.shelfLife && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Raf Ömrü</span>
                      <span className="font-medium">{inv.shelfLife} gün</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {data.movements.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ArrowDownUp className="h-4 w-4" />
                    Son Hareketler
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Tarih</TableHead>
                        <TableHead className="text-xs">Tip</TableHead>
                        <TableHead className="text-xs text-right">Miktar</TableHead>
                        <TableHead className="text-xs">Not</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.movements.slice(0, 10).map((mov: any) => (
                        <TableRow key={mov.id} data-testid={`row-movement-${mov.id}`}>
                          <TableCell className="text-xs whitespace-nowrap">{formatDate(mov.createdAt)}</TableCell>
                          <TableCell className="text-xs">{getMovementBadge(mov.movementType)}</TableCell>
                          <TableCell className="text-xs text-right font-medium">
                            {parseFloat(mov.quantity || "0") > 0 ? "+" : ""}{formatNumber(mov.quantity)}
                          </TableCell>
                          <TableCell className="text-xs max-w-[100px] truncate">{mov.notes || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => onOpenChange(false)}
              data-testid="button-close-inventory-detail"
            >
              <X className="h-4 w-4 mr-2" />
              Kapat
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
