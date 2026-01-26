import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  ClipboardCheck, 
  Plus, 
  Search, 
  Calendar,
  Check,
  X,
  Eye,
  Package
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface GoodsReceipt {
  id: number;
  receiptNumber: string;
  supplierId: number;
  purchaseOrderId: number | null;
  receiptDate: string;
  status: string;
  qualityCheckRequired: boolean;
  qualityCheckPassed: boolean | null;
  supplier?: {
    name: string;
    code: string;
  };
  purchaseOrder?: {
    orderNumber: string;
  };
}

interface Supplier {
  id: number;
  code: string;
  name: string;
}

const statusOptions = [
  { value: "all", label: "Tümü" },
  { value: "beklemede", label: "Beklemede" },
  { value: "kontrol_ediliyor", label: "Kontrol Ediliyor" },
  { value: "kabul_edildi", label: "Kabul Edildi" },
  { value: "kismen_kabul", label: "Kısmen Kabul" },
  { value: "reddedildi", label: "Reddedildi" }
];

export default function MalKabul() {
  const { toast } = useToast();
  const [status, setStatus] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [qualityCheckRequired, setQualityCheckRequired] = useState("false");

  const queryParams = new URLSearchParams();
  if (status && status !== "all") queryParams.set("status", status);
  const queryString = queryParams.toString();
  const receiptsUrl = `/api/goods-receipts${queryString ? `?${queryString}` : ""}`;

  const { data: receipts, isLoading } = useQuery<GoodsReceipt[]>({
    queryKey: [receiptsUrl],
  });

  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/goods-receipts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        (query.queryKey[0] as string).startsWith("/api/goods-receipts")
      });
      queryClient.invalidateQueries({ predicate: (query) => 
        (query.queryKey[0] as string).startsWith("/api/inventory")
      });
      setIsAddDialogOpen(false);
      setSelectedSupplierId("");
      setQualityCheckRequired("false");
      toast({ title: "Mal kabul kaydı oluşturuldu" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Mal kabul kaydı oluşturulamadı", variant: "destructive" });
    }
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, qualityCheckPassed, qualityCheckNotes }: any) => {
      return apiRequest("PATCH", `/api/goods-receipts/${id}/status`, { status, qualityCheckPassed, qualityCheckNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        (query.queryKey[0] as string).startsWith("/api/goods-receipts")
      });
      toast({ title: "Durum güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Durum güncellenemedi", variant: "destructive" });
    }
  });

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      toast({ title: "Hata", description: "Tedarikçi seçmeniz gerekiyor", variant: "destructive" });
      return;
    }
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      supplierId: parseInt(selectedSupplierId),
      supplierInvoiceNumber: formData.get("supplierInvoiceNumber") || null,
      deliveryNoteNumber: formData.get("deliveryNoteNumber") || null,
      qualityCheckRequired: qualityCheckRequired === "true",
      notes: formData.get("notes") || null,
      items: []
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      beklemede: { label: "Beklemede", variant: "outline" },
      kontrol_ediliyor: { label: "Kontrol Ediliyor", variant: "secondary" },
      kabul_edildi: { label: "Kabul Edildi", variant: "default" },
      kismen_kabul: { label: "Kısmen Kabul", variant: "secondary" },
      reddedildi: { label: "Reddedildi", variant: "destructive" }
    };
    const config = statusMap[status] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("tr-TR");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]" data-testid="select-receipt-status">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-receipt">
              <Plus className="h-4 w-4 mr-2" />
              Yeni Mal Kabul
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Yeni Mal Kabul</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="supplierId">Tedarikçi</Label>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger data-testid="select-receipt-supplier">
                    <SelectValue placeholder="Tedarikçi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers?.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        {supplier.name} ({supplier.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplierInvoiceNumber">Fatura No</Label>
                  <Input 
                    id="supplierInvoiceNumber" 
                    name="supplierInvoiceNumber" 
                    data-testid="input-invoice-number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deliveryNoteNumber">İrsaliye No</Label>
                  <Input 
                    id="deliveryNoteNumber" 
                    name="deliveryNoteNumber" 
                    data-testid="input-delivery-note"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="qualityCheckRequired">Kalite Kontrol</Label>
                <Select value={qualityCheckRequired} onValueChange={setQualityCheckRequired}>
                  <SelectTrigger data-testid="select-quality-check">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Gerekli Değil</SelectItem>
                    <SelectItem value="true">Gerekli</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Not</Label>
                <Textarea 
                  id="notes" 
                  name="notes" 
                  placeholder="İsteğe bağlı açıklama"
                  data-testid="input-receipt-notes"
                />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-receipt">
                {createMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kabul No</TableHead>
                <TableHead>Tedarikçi</TableHead>
                <TableHead>Sipariş No</TableHead>
                <TableHead>Kabul Tarihi</TableHead>
                <TableHead className="text-center">Kalite Kontrol</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts && receipts.length > 0 ? (
                receipts.map((receipt) => (
                  <TableRow key={receipt.id} data-testid={`receipt-row-${receipt.id}`}>
                    <TableCell className="font-mono text-sm">{receipt.receiptNumber}</TableCell>
                    <TableCell className="font-medium">
                      {receipt.supplier?.name || "-"}
                    </TableCell>
                    <TableCell>
                      {receipt.purchaseOrder?.orderNumber || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(receipt.receiptDate)}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {receipt.qualityCheckRequired ? (
                        receipt.qualityCheckPassed === null ? (
                          <Badge variant="outline">Bekliyor</Badge>
                        ) : receipt.qualityCheckPassed ? (
                          <Badge className="bg-green-500/10 text-green-600">Geçti</Badge>
                        ) : (
                          <Badge variant="destructive">Kaldı</Badge>
                        )
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid={`button-view-receipt-${receipt.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {receipt.status === "beklemede" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => statusMutation.mutate({ 
                                id: receipt.id, 
                                status: "kabul_edildi",
                                qualityCheckPassed: true
                              })}
                              data-testid={`button-accept-receipt-${receipt.id}`}
                            >
                              <Check className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => statusMutation.mutate({ 
                                id: receipt.id, 
                                status: "reddedildi",
                                qualityCheckPassed: false 
                              })}
                              data-testid={`button-reject-receipt-${receipt.id}`}
                            >
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {status !== "all" ? "Bu durumda kayıt yok" : "Henüz mal kabul kaydı yok"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
