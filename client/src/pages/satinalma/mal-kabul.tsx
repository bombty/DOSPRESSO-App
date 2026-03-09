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
  DialogDescription,
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
  Package,
  Star,
  Trash2,
  ShieldCheck
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";

interface GoodsReceipt {
  id: number;
  receiptNumber: string;
  supplierId: number;
  purchaseOrderId: number | null;
  receiptDate: string;
  status: string;
  qualityCheckRequired: boolean;
  qualityCheckPassed: boolean | null;
  supplierInvoiceNumber: string | null;
  deliveryNoteNumber: string | null;
  notes: string | null;
  receivedById: string;
  createdAt: string;
  supplier?: {
    name: string;
    code: string;
  };
  purchaseOrder?: {
    orderNumber: string;
  };
}

interface GoodsReceiptDetail extends GoodsReceipt {
  items: GoodsReceiptItemDetail[];
}

interface GoodsReceiptItemDetail {
  id: number;
  goodsReceiptId: number;
  inventoryId: number;
  orderedQuantity: string | null;
  receivedQuantity: string;
  acceptedQuantity: string | null;
  rejectedQuantity: string | null;
  unit: string;
  unitPrice: string | null;
  batchNumber: string | null;
  qualityStatus: string;
  qualityNotes: string | null;
  rejectionReason: string | null;
  inventory?: {
    id: number;
    name: string;
    code: string;
    unit: string;
  };
}

interface Supplier {
  id: number;
  code: string;
  name: string;
}

interface SupplierProduct {
  id: number;
  code: string;
  name: string;
  unit: string;
  category: string;
  currentStock: string;
  unitPrice: string;
}

interface PurchaseOrder {
  id: number;
  orderNumber: string;
  supplierId: number;
  status: string;
  supplier?: { name: string; code: string };
}

interface PurchaseOrderDetail {
  id: number;
  orderNumber: string;
  supplierId: number;
  items: {
    id: number;
    inventoryId: number;
    quantity: string;
    unit: string;
    unitPrice: string;
    inventory?: {
      id: number;
      name: string;
      code: string;
      unit: string;
    };
  }[];
}

interface ReceiptItemRow {
  inventoryId: string;
  orderedQuantity: string;
  receivedQuantity: string;
  unit: string;
  unitPrice: string;
  qualityStatus: string;
  notes: string;
}

const statusOptions = [
  { value: "all", label: "Tümü" },
  { value: "beklemede", label: "Beklemede" },
  { value: "kontrol_ediliyor", label: "Kontrol Ediliyor" },
  { value: "kabul_edildi", label: "Kabul Edildi" },
  { value: "kismen_kabul", label: "Kismen Kabul" },
  { value: "reddedildi", label: "Reddedildi" }
];

const qualityStatusLabels: Record<string, string> = {
  uygun: "Uygun",
  sartli_kabul: "Şartlı Kabul",
  uygun_degil: "Uygun Değil",
  beklemede: "Beklemede",
  gecti: "Geçti",
  kaldi: "Kaldı"
};

const emptyRow = (): ReceiptItemRow => ({
  inventoryId: "",
  orderedQuantity: "",
  receivedQuantity: "",
  unit: "",
  unitPrice: "",
  qualityStatus: "uygun",
  notes: ""
});

export default function MalKabul() {
  const { toast } = useToast();
  const [status, setStatus] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [selectedPOId, setSelectedPOId] = useState("");
  const [qualityCheckRequired, setQualityCheckRequired] = useState("false");
  const [itemRows, setItemRows] = useState<ReceiptItemRow[]>([emptyRow()]);
  
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [detailReceiptId, setDetailReceiptId] = useState<number | null>(null);

  const [isQCDialogOpen, setIsQCDialogOpen] = useState(false);
  const [qcReceiptId, setQcReceiptId] = useState<number | null>(null);
  const [qcItemStatuses, setQcItemStatuses] = useState<Record<number, { qualityStatus: string; qualityNotes: string }>>({});

  const [isEvaluationDialogOpen, setIsEvaluationDialogOpen] = useState(false);
  const [evaluatingReceipt, setEvaluatingReceipt] = useState<GoodsReceipt | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState("on_time");
  const [supplierQualityScore, setSupplierQualityScore] = useState("4");
  const [qualityNotes, setQualityNotes] = useState("");

  const queryParams = new URLSearchParams();
  if (status && status !== "all") queryParams.set("status", status);
  const queryString = queryParams.toString();
  const receiptsUrl = `/api/goods-receipts${queryString ? `?${queryString}` : ""}`;

  const { data: receipts, isLoading, isError, refetch } = useQuery<GoodsReceipt[]>({
    queryKey: [receiptsUrl],
  });

  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: supplierProducts } = useQuery<SupplierProduct[]>({
    queryKey: ["/api/inventory/by-supplier", selectedSupplierId],
    queryFn: async () => {
      if (!selectedSupplierId) return [];
      const res = await fetch(`/api/inventory/by-supplier/${selectedSupplierId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!selectedSupplierId,
  });

  const { data: allInventory } = useQuery<SupplierProduct[]>({
    queryKey: ["/api/inventory"],
    enabled: !!selectedSupplierId,
  });

  const { data: supplierPOs } = useQuery<PurchaseOrder[]>({
    queryKey: ["/api/purchase-orders", { supplierId: selectedSupplierId }],
    queryFn: async () => {
      if (!selectedSupplierId) return [];
      const res = await fetch(`/api/purchase-orders?supplierId=${selectedSupplierId}&status=onaylandi`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!selectedSupplierId,
  });

  const { data: poDetail } = useQuery<PurchaseOrderDetail>({
    queryKey: ["/api/purchase-orders", selectedPOId],
    queryFn: async () => {
      const res = await fetch(`/api/purchase-orders/${selectedPOId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!selectedPOId,
  });

  const { data: receiptDetail } = useQuery<GoodsReceiptDetail>({
    queryKey: ["/api/goods-receipts", detailReceiptId],
    queryFn: async () => {
      const res = await fetch(`/api/goods-receipts/${detailReceiptId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!detailReceiptId,
  });

  const { data: qcDetail } = useQuery<GoodsReceiptDetail>({
    queryKey: ["/api/goods-receipts", qcReceiptId],
    queryFn: async () => {
      const res = await fetch(`/api/goods-receipts/${qcReceiptId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!qcReceiptId,
  });

  const availableProducts = supplierProducts && supplierProducts.length > 0 
    ? supplierProducts 
    : (allInventory || []);

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
      resetAddForm();
      toast({ title: "Mal kabul kaydı oluşturuldu" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Mal kabul kaydı oluşturulamadı", variant: "destructive" });
    }
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, qualityCheckPassed, qualityCheckNotes, deliveryStatus, supplierQualityScore, qualityNotes }: any) => {
      return apiRequest("PATCH", `/api/goods-receipts/${id}/status`, { 
        status, 
        qualityCheckPassed, 
        qualityCheckNotes,
        deliveryStatus,
        supplierQualityScore,
        qualityNotes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        (query.queryKey[0] as string).startsWith("/api/goods-receipts")
      });
      queryClient.invalidateQueries({ predicate: (query) => 
        (query.queryKey[0] as string).startsWith("/api/suppliers")
      });
      queryClient.invalidateQueries({ predicate: (query) => 
        (query.queryKey[0] as string).startsWith("/api/inventory")
      });
      setIsEvaluationDialogOpen(false);
      setIsQCDialogOpen(false);
      setEvaluatingReceipt(null);
      setDeliveryStatus("on_time");
      setSupplierQualityScore("4");
      setQualityNotes("");
      setQcReceiptId(null);
      setQcItemStatuses({});
      toast({ title: "Mal kabul durumu güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Durum güncellenemedi", variant: "destructive" });
    }
  });

  const qcItemMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return apiRequest("PATCH", `/api/goods-receipt-items/${id}/quality`, data);
    },
    onSuccess: () => {
      if (qcReceiptId) {
        queryClient.invalidateQueries({ queryKey: ["/api/goods-receipts", qcReceiptId] });
      }
    }
  });

  const resetAddForm = () => {
    setSelectedSupplierId("");
    setSelectedPOId("");
    setQualityCheckRequired("false");
    setItemRows([emptyRow()]);
  };

  const handleSupplierChange = (value: string) => {
    setSelectedSupplierId(value);
    setSelectedPOId("");
    setItemRows([emptyRow()]);
  };

  const handlePOChange = (value: string) => {
    setSelectedPOId(value);
  };

  const handlePOAutoPopulate = () => {
    if (poDetail?.items && poDetail.items.length > 0) {
      const rows: ReceiptItemRow[] = poDetail.items.map(item => ({
        inventoryId: item.inventoryId.toString(),
        orderedQuantity: item.quantity,
        receivedQuantity: item.quantity,
        unit: item.unit || item.inventory?.unit || "",
        unitPrice: item.unitPrice || "",
        qualityStatus: "uygun",
        notes: ""
      }));
      setItemRows(rows);
    }
  };

  const updateItemRow = (index: number, field: keyof ReceiptItemRow, value: string) => {
    setItemRows(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      if (field === "inventoryId" && value) {
        const product = availableProducts.find(p => p.id.toString() === value);
        if (product) {
          updated[index].unit = product.unit;
          updated[index].unitPrice = product.unitPrice || "";
        }
      }
      return updated;
    });
  };

  const addItemRow = () => {
    setItemRows(prev => [...prev, emptyRow()]);
  };

  const removeItemRow = (index: number) => {
    if (itemRows.length <= 1) return;
    setItemRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      toast({ title: "Hata", description: "Tedarikçi seçmeniz gerekiyor", variant: "destructive" });
      return;
    }

    const validItems = itemRows.filter(row => row.inventoryId && row.receivedQuantity);
    if (validItems.length === 0) {
      toast({ title: "Hata", description: "En az bir ürün eklemeniz gerekiyor", variant: "destructive" });
      return;
    }

    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      supplierId: parseInt(selectedSupplierId),
      purchaseOrderId: selectedPOId ? parseInt(selectedPOId) : null,
      supplierInvoiceNumber: formData.get("supplierInvoiceNumber") || null,
      deliveryNoteNumber: formData.get("deliveryNoteNumber") || null,
      qualityCheckRequired: qualityCheckRequired === "true",
      notes: formData.get("notes") || null,
      items: validItems.map(row => ({
        inventoryId: parseInt(row.inventoryId),
        orderedQuantity: row.orderedQuantity || null,
        receivedQuantity: row.receivedQuantity,
        acceptedQuantity: row.qualityStatus !== "uygun_degil" ? row.receivedQuantity : "0",
        rejectedQuantity: row.qualityStatus === "uygun_degil" ? row.receivedQuantity : "0",
        unit: row.unit,
        unitPrice: row.unitPrice || null,
        qualityStatus: row.qualityStatus,
        qualityNotes: row.notes || null,
      }))
    });
  };

  const handleAcceptWithEvaluation = () => {
    if (!evaluatingReceipt) return;
    statusMutation.mutate({
      id: evaluatingReceipt.id,
      status: "kabul_edildi",
      qualityCheckPassed: true,
      deliveryStatus,
      supplierQualityScore: parseInt(supplierQualityScore),
      qualityNotes
    });
  };
  
  const openEvaluationDialog = (receipt: GoodsReceipt) => {
    setEvaluatingReceipt(receipt);
    setDeliveryStatus("on_time");
    setSupplierQualityScore("4");
    setQualityNotes("");
    setIsEvaluationDialogOpen(true);
  };

  const openDetailDialog = (receiptId: number) => {
    setDetailReceiptId(receiptId);
    setIsDetailDialogOpen(true);
  };

  const openQCDialog = (receiptId: number) => {
    setQcReceiptId(receiptId);
    setQcItemStatuses({});
    setIsQCDialogOpen(true);
  };

  const handleQCSubmit = async () => {
    if (!qcDetail) return;

    for (const item of qcDetail.items) {
      const itemStatus = qcItemStatuses[item.id];
      if (itemStatus) {
        await qcItemMutation.mutateAsync({
          id: item.id,
          qualityStatus: itemStatus.qualityStatus,
          qualityNotes: itemStatus.qualityNotes,
          acceptedQuantity: itemStatus.qualityStatus === "uygun" || itemStatus.qualityStatus === "sartli_kabul"
            ? item.receivedQuantity
            : "0",
          rejectedQuantity: itemStatus.qualityStatus === "uygun_degil"
            ? item.receivedQuantity
            : "0",
        });
      }
    }

    const allItems = qcDetail.items.map(item => {
      const s = qcItemStatuses[item.id];
      return s ? s.qualityStatus : item.qualityStatus;
    });

    const allPassed = allItems.every(s => s === "uygun" || s === "sartli_kabul");
    const allFailed = allItems.every(s => s === "uygun_degil");
    
    let newStatus = "kismen_kabul";
    if (allPassed) newStatus = "kabul_edildi";
    if (allFailed) newStatus = "reddedildi";

    statusMutation.mutate({
      id: qcDetail.id,
      status: newStatus,
      qualityCheckPassed: !allFailed,
    });
  };

  const getStatusBadge = (s: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      beklemede: { label: "Beklemede", variant: "outline" },
      kontrol_ediliyor: { label: "Kontrol Ediliyor", variant: "secondary" },
      kabul_edildi: { label: "Kabul Edildi", variant: "default" },
      kismen_kabul: { label: "Kismen Kabul", variant: "secondary" },
      reddedildi: { label: "Reddedildi", variant: "destructive" }
    };
    const config = statusMap[s] || { label: s, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getQualityBadge = (s: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      uygun: { label: "Uygun", variant: "default" },
      sartli_kabul: { label: "Şartlı Kabul", variant: "secondary" },
      uygun_degil: { label: "Uygun Değil", variant: "destructive" },
      beklemede: { label: "Beklemede", variant: "outline" },
      gecti: { label: "Geçti", variant: "default" },
      kaldi: { label: "Kaldı", variant: "destructive" }
    };
    const config = map[s] || { label: s, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("tr-TR");
  };

  if (isLoading) {
    
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

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

        <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetAddForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-receipt">
              <Plus className="h-4 w-4 mr-2" />
              Yeni Mal Kabul
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Yeni Mal Kabul</DialogTitle>
              <DialogDescription>Tedarikçi seçin ve teslim alınan ürünleri girin</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplierId">Tedarikçi</Label>
                  <Select value={selectedSupplierId} onValueChange={handleSupplierChange}>
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
                <div className="space-y-2">
                  <Label>Sipariş Bağlantısı</Label>
                  <div className="flex items-center gap-2">
                    <Select value={selectedPOId} onValueChange={handlePOChange}>
                      <SelectTrigger data-testid="select-receipt-po" className="flex-1">
                        <SelectValue placeholder="Sipariş seçin (isteğe bağlı)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Siparişsiz</SelectItem>
                        {supplierPOs?.map(po => (
                          <SelectItem key={po.id} value={po.id.toString()}>
                            {po.orderNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedPOId && selectedPOId !== "none" && poDetail && (
                      <Button type="button" variant="outline" size="sm" onClick={handlePOAutoPopulate} data-testid="button-populate-from-po">
                        Doldur
                      </Button>
                    )}
                  </div>
                </div>
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
                  <Label htmlFor="deliveryNoteNumber">Irsaliye No</Label>
                  <Input 
                    id="deliveryNoteNumber" 
                    name="deliveryNoteNumber" 
                    data-testid="input-delivery-note"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="qualityCheckRequired">Kalite Kontrol</Label>
                  <Select value={qualityCheckRequired} onValueChange={setQualityCheckRequired}>
                    <SelectTrigger data-testid="select-quality-check">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">Gerekli Degil</SelectItem>
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
              </div>

              {selectedSupplierId && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="text-base font-semibold">Ürün Kalemleri</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addItemRow} data-testid="button-add-item-row">
                      <Plus className="h-4 w-4 mr-1" />
                      Ürün Ekle
                    </Button>
                  </div>
                  
                  <div className="border rounded-md overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[200px]">Ürün</TableHead>
                          <TableHead className="w-[100px]">Sipariş Mik.</TableHead>
                          <TableHead className="w-[100px]">Teslim Mik.</TableHead>
                          <TableHead className="w-[80px]">Birim</TableHead>
                          <TableHead className="w-[140px]">Kalite Durumu</TableHead>
                          <TableHead className="min-w-[120px]">Aciklama</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itemRows.map((row, index) => (
                          <TableRow key={index} data-testid={`item-row-${index}`}>
                            <TableCell>
                              <Select value={row.inventoryId} onValueChange={(val) => updateItemRow(index, "inventoryId", val)}>
                                <SelectTrigger data-testid={`select-product-${index}`}>
                                  <SelectValue placeholder="Ürün seçin" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableProducts.map(product => (
                                    <SelectItem key={product.id} value={product.id.toString()}>
                                      {product.name} ({product.code})
                                      {product.category === "arge" && <Badge variant="outline" className="ml-1 text-xs">AR-GE</Badge>}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.001"
                                value={row.orderedQuantity}
                                onChange={(e) => updateItemRow(index, "orderedQuantity", e.target.value)}
                                placeholder="-"
                                data-testid={`input-ordered-qty-${index}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.001"
                                value={row.receivedQuantity}
                                onChange={(e) => updateItemRow(index, "receivedQuantity", e.target.value)}
                                placeholder="0"
                                data-testid={`input-received-qty-${index}`}
                              />
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground" data-testid={`text-unit-${index}`}>
                                {row.unit || "-"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Select value={row.qualityStatus} onValueChange={(val) => updateItemRow(index, "qualityStatus", val)}>
                                <SelectTrigger data-testid={`select-quality-${index}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="uygun">Uygun</SelectItem>
                                  <SelectItem value="sartli_kabul">Şartlı Kabul</SelectItem>
                                  <SelectItem value="uygun_degil">Uygun Değil</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={row.notes}
                                onChange={(e) => updateItemRow(index, "notes", e.target.value)}
                                placeholder="Açıklama"
                                data-testid={`input-item-notes-${index}`}
                              />
                            </TableCell>
                            <TableCell>
                              {itemRows.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeItemRow(index)}
                                  data-testid={`button-remove-item-${index}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

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
                          <Badge className="bg-green-500/10 text-green-600">Gecti</Badge>
                        ) : (
                          <Badge variant="destructive">Kaldi</Badge>
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
                          onClick={() => openDetailDialog(receipt.id)}
                          data-testid={`button-view-receipt-${receipt.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {receipt.status === "kontrol_ediliyor" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openQCDialog(receipt.id)}
                            data-testid={`button-qc-receipt-${receipt.id}`}
                          >
                            <ShieldCheck className="h-4 w-4" />
                          </Button>
                        )}
                        {receipt.status === "beklemede" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEvaluationDialog(receipt)}
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

      <Dialog open={isDetailDialogOpen} onOpenChange={(open) => { setIsDetailDialogOpen(open); if (!open) setDetailReceiptId(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mal Kabul Detayi</DialogTitle>
            {receiptDetail && (
              <DialogDescription>
                {receiptDetail.receiptNumber} - {receiptDetail.supplier?.name}
              </DialogDescription>
            )}
          </DialogHeader>
          {receiptDetail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Kabul Numarasi</span>
                  <p className="font-mono text-sm" data-testid="text-detail-receipt-number">{receiptDetail.receiptNumber}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Tedarikçi</span>
                  <p className="text-sm" data-testid="text-detail-supplier">{receiptDetail.supplier?.name} ({receiptDetail.supplier?.code})</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Kabul Tarihi</span>
                  <p className="text-sm" data-testid="text-detail-date">{formatDate(receiptDetail.receiptDate)}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Durum</span>
                  <div data-testid="text-detail-status">{getStatusBadge(receiptDetail.status)}</div>
                </div>
                {receiptDetail.supplierInvoiceNumber && (
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">Fatura No</span>
                    <p className="text-sm">{receiptDetail.supplierInvoiceNumber}</p>
                  </div>
                )}
                {receiptDetail.deliveryNoteNumber && (
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">Irsaliye No</span>
                    <p className="text-sm">{receiptDetail.deliveryNoteNumber}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Kabul Eden</span>
                  <p className="text-sm" data-testid="text-detail-received-by">{receiptDetail.receivedById || "-"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Oluşturulma Tarihi</span>
                  <p className="text-sm" data-testid="text-detail-created">{receiptDetail.createdAt ? formatDate(receiptDetail.createdAt) : "-"}</p>
                </div>
              </div>

              {receiptDetail.notes && (
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Notlar</span>
                  <p className="text-sm">{receiptDetail.notes}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-base font-semibold">Teslim Alınan Ürünler</Label>
                {receiptDetail.items && receiptDetail.items.length > 0 ? (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ürün</TableHead>
                          <TableHead className="text-right">Sipariş Mik.</TableHead>
                          <TableHead className="text-right">Teslim Mik.</TableHead>
                          <TableHead className="text-right">Kabul Mik.</TableHead>
                          <TableHead>Birim</TableHead>
                          <TableHead>Kalite</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {receiptDetail.items.map((item) => (
                          <TableRow key={item.id} data-testid={`detail-item-row-${item.id}`}>
                            <TableCell className="font-medium">
                              {item.inventory?.name || `Ürün #${item.inventoryId}`}
                            </TableCell>
                            <TableCell className="text-right">{item.orderedQuantity || "-"}</TableCell>
                            <TableCell className="text-right">{item.receivedQuantity}</TableCell>
                            <TableCell className="text-right">{item.acceptedQuantity || "-"}</TableCell>
                            <TableCell>{item.unit}</TableCell>
                            <TableCell>{getQualityBadge(item.qualityStatus)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Ürün kalemi bulunamadı</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isQCDialogOpen} onOpenChange={(open) => { setIsQCDialogOpen(open); if (!open) { setQcReceiptId(null); setQcItemStatuses({}); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kalite Kontrol Onayi</DialogTitle>
            {qcDetail && (
              <DialogDescription>
                {qcDetail.receiptNumber} - {qcDetail.supplier?.name}
              </DialogDescription>
            )}
          </DialogHeader>
          {qcDetail ? (
            <div className="space-y-4">
              {qcDetail.items && qcDetail.items.length > 0 ? (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ürün</TableHead>
                        <TableHead className="text-right">Teslim Mik.</TableHead>
                        <TableHead>Birim</TableHead>
                        <TableHead className="w-[160px]">Kalite Durumu</TableHead>
                        <TableHead className="min-w-[120px]">Not</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {qcDetail.items.map((item) => {
                        const currentStatus = qcItemStatuses[item.id] || { qualityStatus: item.qualityStatus || "beklemede", qualityNotes: item.qualityNotes || "" };
                        return (
                          <TableRow key={item.id} data-testid={`qc-item-row-${item.id}`}>
                            <TableCell className="font-medium">
                              {item.inventory?.name || `Ürün #${item.inventoryId}`}
                            </TableCell>
                            <TableCell className="text-right">{item.receivedQuantity}</TableCell>
                            <TableCell>{item.unit}</TableCell>
                            <TableCell>
                              <Select
                                value={currentStatus.qualityStatus}
                                onValueChange={(val) => setQcItemStatuses(prev => ({
                                  ...prev,
                                  [item.id]: { ...currentStatus, qualityStatus: val }
                                }))}
                              >
                                <SelectTrigger data-testid={`select-qc-status-${item.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="beklemede">Beklemede</SelectItem>
                                  <SelectItem value="uygun">Uygun</SelectItem>
                                  <SelectItem value="sartli_kabul">Şartlı Kabul</SelectItem>
                                  <SelectItem value="uygun_degil">Uygun Değil</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={currentStatus.qualityNotes}
                                onChange={(e) => setQcItemStatuses(prev => ({
                                  ...prev,
                                  [item.id]: { ...currentStatus, qualityNotes: e.target.value }
                                }))}
                                placeholder="Kalite notu"
                                data-testid={`input-qc-notes-${item.id}`}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Ürün kalemi bulunamadı</p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsQCDialogOpen(false)}
                >
                  İptal
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleQCSubmit}
                  disabled={statusMutation.isPending || qcItemMutation.isPending}
                  data-testid="button-confirm-qc"
                >
                  {statusMutation.isPending ? "Kaydediliyor..." : "Kalite Kontrolü Onayla"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEvaluationDialogOpen} onOpenChange={setIsEvaluationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tedarikçi Değerlendirmesi</DialogTitle>
            <DialogDescription>
              {evaluatingReceipt?.supplier?.name} - {evaluatingReceipt?.receiptNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Teslimat Durumu</Label>
              <Select value={deliveryStatus} onValueChange={setDeliveryStatus}>
                <SelectTrigger data-testid="select-delivery-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="early">Erken Teslimat</SelectItem>
                  <SelectItem value="on_time">Zamaninda</SelectItem>
                  <SelectItem value="late">Gec Teslimat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Kalite Puani (1-5)</Label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((score) => (
                  <Button
                    key={score}
                    type="button"
                    variant={parseInt(supplierQualityScore) >= score ? "default" : "outline"}
                    size="icon"
                    onClick={() => setSupplierQualityScore(score.toString())}
                    data-testid={`button-quality-score-${score}`}
                  >
                    <Star className={`h-4 w-4 ${parseInt(supplierQualityScore) >= score ? "fill-current" : ""}`} />
                  </Button>
                ))}
                <span className="ml-2 text-sm text-muted-foreground">
                  {supplierQualityScore}/5
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="qualityNotes">Değerlendirme Notları</Label>
              <Textarea
                id="qualityNotes"
                value={qualityNotes}
                onChange={(e) => setQualityNotes(e.target.value)}
                placeholder="Ürün kalitesi, paketleme vb. hakkında notlar"
                data-testid="input-quality-notes"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsEvaluationDialogOpen(false)}
              >
                İptal
              </Button>
              <Button
                className="flex-1"
                onClick={handleAcceptWithEvaluation}
                disabled={statusMutation.isPending}
                data-testid="button-confirm-acceptance"
              >
                {statusMutation.isPending ? "Kaydediliyor..." : "Onayla"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
