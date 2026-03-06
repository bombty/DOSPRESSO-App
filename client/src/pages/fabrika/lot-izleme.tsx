import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, Search, ArrowRight, Calendar, User, MapPin, FlaskConical, Truck } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  uretildi: "Üretildi",
  kalite_bekliyor: "Kalite Bekliyor",
  onaylandi: "Onaylandı",
  sevk_edildi: "Sevk Edildi",
  iptal: "İptal",
  expired: "Süresi Dolmuş",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  uretildi: "secondary",
  kalite_bekliyor: "outline",
  onaylandi: "default",
  sevk_edildi: "default",
  iptal: "destructive",
  expired: "destructive",
};

export default function LotIzleme() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLot, setSelectedLot] = useState<string | null>(null);

  const { data: lots, isLoading, isError } = useQuery<any[]>({
    queryKey: ["/api/factory/lots", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/factory/lots?${params.toString()}`);
      if (!res.ok) throw new Error("LOT listesi alınamadı");
      return res.json();
    },
  });

  const { data: traceData, isLoading: traceLoading } = useQuery({
    queryKey: ["/api/factory/lots", selectedLot, "trace"],
    queryFn: async () => {
      if (!selectedLot) return null;
      const res = await fetch(`/api/factory/lots/${selectedLot}/trace`);
      if (!res.ok) throw new Error("LOT izlenebilirlik bilgisi alınamadı");
      return res.json();
    },
    enabled: !!selectedLot,
  });

  const filteredLots = (lots || []).filter((item: any) => {
    const lot = item.lot || item;
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      lot.lotNumber?.toLowerCase().includes(search) ||
      item.productName?.toLowerCase().includes(search)
    );
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4">
        <Card data-testid="lot-error-card">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Veri yüklenirken hata oluştu</p>
            <p className="text-sm text-muted-foreground mt-1">LOT listesi alınamadı. Lütfen sayfayı yenileyin.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="LOT numarası veya ürün ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-lot-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-lot-status-filter">
            <SelectValue placeholder="Durum Filtresi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="uretildi">Üretildi</SelectItem>
            <SelectItem value="kalite_bekliyor">Kalite Bekliyor</SelectItem>
            <SelectItem value="onaylandi">Onaylandı</SelectItem>
            <SelectItem value="sevk_edildi">Sevk Edildi</SelectItem>
            <SelectItem value="expired">Süresi Dolmuş</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3">
        {filteredLots.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>LOT kaydı bulunamadı</p>
            </CardContent>
          </Card>
        ) : (
          filteredLots.map((item: any) => {
            const lot = item.lot || item;
            return (
              <Card key={lot.id} className="hover-elevate" data-testid={`card-lot-${lot.id}`}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium" data-testid={`text-lot-number-${lot.id}`}>{lot.lotNumber}</p>
                        <p className="text-sm text-muted-foreground">{item.productName || "Ürün bilgisi yok"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={STATUS_VARIANTS[lot.status] || "secondary"} data-testid={`badge-lot-status-${lot.id}`}>
                        {STATUS_LABELS[lot.status] || lot.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {lot.quantity} {lot.unit || "adet"}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedLot(lot.lotNumber)}
                        data-testid={`button-lot-trace-${lot.id}`}
                      >
                        İzle <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                    {lot.productionDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(lot.productionDate).toLocaleDateString("tr-TR")}
                      </span>
                    )}
                    {item.producerName && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {item.producerName}
                      </span>
                    )}
                    {lot.expiryDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        SKT: {new Date(lot.expiryDate).toLocaleDateString("tr-TR")}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={!!selectedLot} onOpenChange={(open) => !open && setSelectedLot(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              LOT İzlenebilirlik: {selectedLot}
            </DialogTitle>
          </DialogHeader>
          {traceLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : traceData ? (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Üretim Bilgisi
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p><span className="text-muted-foreground">Ürün:</span> {traceData.product?.name || "-"}</p>
                    <p><span className="text-muted-foreground">Miktar:</span> {traceData.lot?.quantity} {traceData.lot?.unit}</p>
                    <p><span className="text-muted-foreground">Üretici:</span> {traceData.producer?.fullName || "-"}</p>
                    <p><span className="text-muted-foreground">Tarih:</span> {traceData.lot?.productionDate ? new Date(traceData.lot.productionDate).toLocaleString("tr-TR") : "-"}</p>
                    {traceData.lot?.expiryDate && (
                      <p><span className="text-muted-foreground">SKT:</span> {new Date(traceData.lot.expiryDate).toLocaleDateString("tr-TR")}</p>
                    )}
                  </CardContent>
                </Card>

                {traceData.qualityCheck && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FlaskConical className="h-4 w-4" /> Kalite Kontrol
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <p><span className="text-muted-foreground">Durum:</span> {traceData.qualityCheck.status}</p>
                      <p><span className="text-muted-foreground">Tarih:</span> {new Date(traceData.qualityCheck.createdAt).toLocaleString("tr-TR")}</p>
                      {traceData.qualityCheck.notes && (
                        <p><span className="text-muted-foreground">Notlar:</span> {traceData.qualityCheck.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Truck className="h-4 w-4" /> Sevkiyat Bilgisi
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    {traceData.shipments?.length > 0 ? (
                      <div className="space-y-2">
                        {traceData.shipments.map((s: any, i: number) => (
                          <div key={i} className="flex items-center justify-between">
                            <span>{s.shipment?.shipmentNumber || "Sevkiyat"}</span>
                            <Badge variant="secondary">{s.shipment?.status || "-"}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Henüz sevkiyat yapılmamış</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
