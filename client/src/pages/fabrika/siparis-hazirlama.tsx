import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Package, QrCode, ArrowRightFromLine, Search, Clock } from "lucide-react";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

interface InventoryItem {
  id: number;
  code: string;
  name: string;
  category: string;
  unit: string;
  currentStock: string;
}

interface InventoryMovement {
  id: number;
  inventoryId: number;
  movementType: string;
  quantity: string;
  notes: string | null;
  createdAt: string;
  previousStock: string | null;
  newStock: string | null;
}

export default function SiparisHazirlama() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedInventoryId, setSelectedInventoryId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [reference, setReference] = useState("");
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: inventoryItems, isLoading: itemsLoading, isError, refetch } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory?isActive=true"],
  });

  const { data: recentExits, isLoading: exitsLoading } = useQuery<InventoryMovement[]>({
    queryKey: ["/api/inventory-movements?type=cikis&limit=20"],
  });

  const stockExitMutation = useMutation({
    mutationFn: async (data: { inventoryId: number; quantity: number; notes: string; referenceType: string; referenceId: null }) => {
      return apiRequest("POST", "/api/factory/stock-exit", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-movements?type=cikis&limit=20"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory?isActive=true"] });
      setSelectedInventoryId("");
      setQuantity("");
      setNotes("");
      setReference("");
      toast({ title: "Stok çıkışı yapıldı" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Stok çıkışı yapılamadı", variant: "destructive" });
    },
  });

  const qrMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/inventory/by-qr", { qrCode: code });
      return res.json();
    },
    onSuccess: (data: InventoryItem) => {
      setSelectedInventoryId(data.id.toString());
      setQrDialogOpen(false);
      setQrCode("");
      toast({ title: "Ürün bulundu", description: data.name });
    },
    onError: () => {
      toast({ title: "Hata", description: "QR kodu ile ürün bulunamadı", variant: "destructive" });
    },
  });

  const handleStockExit = () => {
    if (!selectedInventoryId || !quantity) {
      toast({ title: "Hata", description: "Ürün ve miktar gerekli", variant: "destructive" });
      return;
    }
    const notesWithRef = reference ? `${notes ? notes + " | " : ""}Ref: ${reference}` : notes;
    stockExitMutation.mutate({
      inventoryId: parseInt(selectedInventoryId),
      quantity: parseFloat(quantity),
      notes: notesWithRef,
      referenceType: "order_fulfillment",
      referenceId: null,
    });
  };

  const handleQrSearch = () => {
    if (!qrCode.trim()) return;
    qrMutation.mutate(qrCode.trim());
  };

  const filteredItems = inventoryItems?.filter(item =>
    !searchTerm || item.name.toLocaleLowerCase('tr-TR').includes(searchTerm.toLocaleLowerCase('tr-TR')) || item.code.toLocaleLowerCase('tr-TR').includes(searchTerm.toLocaleLowerCase('tr-TR'))
  ) || [];

  const selectedItem = inventoryItems?.find(i => i.id.toString() === selectedInventoryId);

  const getItemName = (inventoryId: number) => {
    const item = inventoryItems?.find(i => i.id === inventoryId);
    return item ? `${item.name} (${item.code})` : `#${inventoryId}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return dateStr;
    }
  };

  
  if (itemsLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Package className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-lg font-semibold" data-testid="text-page-title">Sipariş Hazırlama</h1>
      </div>

      <Card>
        <CardHeader className="p-3 pb-0">
          <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
            <ArrowRightFromLine className="h-4 w-4" />
            Hızlı Stok Çıkışı
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 space-y-2">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setQrDialogOpen(true)}
              data-testid="button-qr-scan"
            >
              <QrCode className="h-4 w-4 mr-1" />
              QR ile Ürün Bul
            </Button>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Ürün</Label>
            <Select value={selectedInventoryId} onValueChange={setSelectedInventoryId}>
              <SelectTrigger data-testid="select-inventory-item">
                <SelectValue placeholder="Ürün seçin" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <div className="flex items-center gap-1 border rounded-md px-2">
                    <Search className="h-3 w-3 text-muted-foreground" />
                    <input
                      className="flex-1 py-1 text-sm bg-transparent outline-none"
                      placeholder="Ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      data-testid="input-search-inventory"
                    />
                  </div>
                </div>
                {filteredItems.map(item => (
                  <SelectItem key={item.id} value={item.id.toString()} data-testid={`select-item-${item.id}`}>
                    {item.name} ({item.code}) - Stok: {item.currentStock} {item.unit}
                    {item.category === "arge" && <Badge variant="outline" className="ml-1 text-xs">AR-GE</Badge>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedItem && (
            <div className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap" data-testid="text-selected-item-info">
              Secili: {selectedItem.name} | Stok: {selectedItem.currentStock} {selectedItem.unit}
              {selectedItem.category === "arge" && <Badge variant="outline" className="text-xs">AR-GE</Badge>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Miktar</Label>
              <Input
                type="number"
                step="0.001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                data-testid="input-quantity"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Referans (Şube/Sipariş No)</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Şube adı veya sipariş no"
                data-testid="input-reference"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Not (Opsiyonel)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ek açıklama"
              className="min-h-[60px]"
              data-testid="input-notes"
            />
          </div>

          <Button
            className="w-full"
            onClick={handleStockExit}
            disabled={stockExitMutation.isPending || !selectedInventoryId || !quantity}
            data-testid="button-stock-exit"
          >
            {stockExitMutation.isPending ? "İşleniyor..." : "Çıkış Yap"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 pb-0">
          <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
            <Clock className="h-4 w-4" />
            Son Stok Çıkışları
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          {exitsLoading ? (
            <div className="text-center py-4 text-muted-foreground text-sm">Yükleniyor...</div>
          ) : recentExits && recentExits.length > 0 ? (
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Tarih</TableHead>
                    <TableHead className="text-xs">Ürün</TableHead>
                    <TableHead className="text-xs text-right">Miktar</TableHead>
                    <TableHead className="text-xs">Not</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentExits.map((movement) => (
                    <TableRow key={movement.id} data-testid={`exit-row-${movement.id}`}>
                      <TableCell className="text-xs whitespace-nowrap">{formatDate(movement.createdAt)}</TableCell>
                      <TableCell className="text-xs">{getItemName(movement.inventoryId)}</TableCell>
                      <TableCell className="text-xs text-right">{movement.quantity}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{movement.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm" data-testid="text-no-exits">
              Henüz stok çıkışı yapılmamış
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              QR ile Ürün Bul
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">QR Kodu</Label>
              <Input
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                placeholder="QR kodu girin veya okutun"
                onKeyDown={(e) => e.key === "Enter" && handleQrSearch()}
                autoFocus
                data-testid="input-qr-code"
              />
            </div>
            <Button
              className="w-full"
              onClick={handleQrSearch}
              disabled={qrMutation.isPending || !qrCode.trim()}
              data-testid="button-qr-search"
            >
              {qrMutation.isPending ? "Araniyor..." : "Ara"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
