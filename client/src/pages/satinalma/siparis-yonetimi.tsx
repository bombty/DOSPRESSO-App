import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { 
  ShoppingCart, 
  Plus, 
  Search, 
  Calendar,
  Check,
  X,
  Clock,
  Eye,
  Send,
  Truck,
  CreditCard
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface PurchaseOrder {
  id: number;
  orderNumber: string;
  supplierId: number;
  orderDate: string;
  expectedDeliveryDate: string | null;
  status: string;
  subtotal: string;
  totalAmount: string;
  supplier?: {
    name: string;
    code: string;
  };
}

interface Supplier {
  id: number;
  code: string;
  name: string;
}

interface PurchaseOrderPayment {
  id: number;
  purchaseOrderId: number;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  paymentDate: string | null;
  dueDate: string | null;
  amount: string;
  paymentMethod: string | null;
  status: string;
  notes: string | null;
  processedById: string | null;
  createdAt: string;
  updatedAt: string;
}

const statusOptions = [
  { value: "all", label: "Tümü" },
  { value: "taslak", label: "Taslak" },
  { value: "onay_bekliyor", label: "Onay Bekliyor" },
  { value: "onaylandi", label: "Onaylandı" },
  { value: "siparis_verildi", label: "Sipariş Verildi" },
  { value: "kismen_teslim", label: "Kısmen Teslim" },
  { value: "tamamlandi", label: "Tamamlandı" },
  { value: "reddedildi", label: "Reddedildi" },
  { value: "iptal", label: "İptal" }
];

const paymentMethodLabels: Record<string, string> = {
  havale: "Havale",
  eft: "EFT",
  kredi_karti: "Kredi Karti",
  nakit: "Nakit",
  cek: "Cek"
};

function PaymentStatusBadge({ orderId }: { orderId: number }) {
  const { data: payments } = useQuery<PurchaseOrderPayment[]>({
    queryKey: ["/api/purchase-order-payments", orderId],
    queryFn: async () => {
      const res = await fetch(`/api/purchase-order-payments?purchaseOrderId=${orderId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch payments");
      return res.json();
    },
  });

  if (!payments || payments.length === 0) return null;

  const latestPayment = payments[0];

  if (latestPayment.status === "odendi") {
    return <Badge variant="default" className="bg-green-600 text-white" data-testid={`badge-payment-status-${orderId}`}>Ödendi</Badge>;
  }

  if (latestPayment.status === "beklemede") {
    return <Badge variant="secondary" className="bg-yellow-500 text-white" data-testid={`badge-payment-status-${orderId}`}>Ödeme Bekliyor</Badge>;
  }

  return null;
}

function PaymentDialog({ order, open, onOpenChange }: { order: PurchaseOrder; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [amount, setAmount] = useState(order.totalAmount || "0");
  const [paymentMethod, setPaymentMethod] = useState("havale");
  const [notes, setNotes] = useState("");

  const createPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/purchase-order-payments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) =>
        (query.queryKey[0] as string).startsWith("/api/purchase-order-payments")
      });
      onOpenChange(false);
      setInvoiceNumber("");
      setInvoiceDate("");
      setDueDate("");
      setAmount(order.totalAmount || "0");
      setPaymentMethod("havale");
      setNotes("");
      toast({ title: "Ödeme bilgisi kaydedildi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Ödeme bilgisi kaydedilemedi", variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    createPaymentMutation.mutate({
      purchaseOrderId: order.id,
      invoiceNumber: invoiceNumber || null,
      invoiceDate: invoiceDate ? new Date(invoiceDate).toISOString() : null,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      amount,
      paymentMethod,
      notes: notes || null,
      status: "beklemede"
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="dialog-payment">
        <DialogHeader>
          <DialogTitle>Ödeme Bilgisi - {order.orderNumber}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invoiceNumber">Fatura Numarasi</Label>
            <Input
              id="invoiceNumber"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Fatura numarasi"
              data-testid="input-invoice-number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoiceDate">Fatura Tarihi</Label>
            <Input
              id="invoiceDate"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              data-testid="input-invoice-date"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDate">Vade Tarihi</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              data-testid="input-due-date"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Ödeme Tutarı</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              data-testid="input-payment-amount"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Ödeme Yöntemi</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger data-testid="select-payment-method">
                <SelectValue placeholder="Ödeme yöntemi seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="havale">Havale</SelectItem>
                <SelectItem value="eft">EFT</SelectItem>
                <SelectItem value="kredi_karti">Kredi Karti</SelectItem>
                <SelectItem value="nakit">Nakit</SelectItem>
                <SelectItem value="cek">Cek</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Aciklama</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Açıklama (isteğe bağlı)"
              data-testid="input-payment-notes"
            />
          </div>
          <Button type="submit" className="w-full" disabled={createPaymentMutation.isPending} data-testid="button-save-payment">
            {createPaymentMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OrderDetailDialog({ order, open, onOpenChange }: { order: PurchaseOrder; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const isMuhasebeOrAdmin = user?.role === "muhasebe" || user?.role === "admin";

  const { data: payments, isLoading: paymentsLoading } = useQuery<PurchaseOrderPayment[]>({
    queryKey: ["/api/purchase-order-payments", order.id],
    queryFn: async () => {
      const res = await fetch(`/api/purchase-order-payments?purchaseOrderId=${order.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch payments");
      return res.json();
    },
    enabled: open,
  });

  const markPaidMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      return apiRequest("PATCH", `/api/purchase-order-payments/${paymentId}`, { status: "odendi", paymentDate: new Date().toISOString() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) =>
        (query.queryKey[0] as string).startsWith("/api/purchase-order-payments")
      });
      toast({ title: "Ödeme durumu güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Ödeme durumu güncellenemedi", variant: "destructive" });
    }
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("tr-TR");
  };

  const formatCurrency = (amount: string) => {
    return parseFloat(amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 });
  };

  const getPaymentStatusBadge = (status: string) => {
    if (status === "odendi") {
      return <Badge variant="default" className="bg-green-600 text-white">Ödendi</Badge>;
    }
    if (status === "beklemede") {
      return <Badge variant="secondary" className="bg-yellow-500 text-white">Beklemede</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="dialog-order-detail">
        <DialogHeader>
          <DialogTitle>Sipariş Detayı - {order.orderNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Tedarikçi:</span>
              <p className="font-medium" data-testid="text-order-supplier">{order.supplier?.name || "-"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Sipariş Tarihi:</span>
              <p className="font-medium" data-testid="text-order-date">{new Date(order.orderDate).toLocaleDateString("tr-TR")}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Teslimat Tarihi:</span>
              <p className="font-medium" data-testid="text-delivery-date">{order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString("tr-TR") : "-"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Toplam Tutar:</span>
              <p className="font-medium" data-testid="text-order-total">{parseFloat(order.totalAmount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL</p>
            </div>
          </div>

          {payments && payments.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Ödeme Bilgileri</h4>
              {payments.map((payment) => (
                <Card key={payment.id} data-testid={`card-payment-${payment.id}`}>
                  <CardContent className="p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Fatura No:</span>
                        <p className="font-medium" data-testid={`text-invoice-number-${payment.id}`}>{payment.invoiceNumber || "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Fatura Tarihi:</span>
                        <p className="font-medium" data-testid={`text-invoice-date-${payment.id}`}>{formatDate(payment.invoiceDate)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Vade Tarihi:</span>
                        <p className="font-medium" data-testid={`text-due-date-${payment.id}`}>{formatDate(payment.dueDate)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tutar:</span>
                        <p className="font-medium" data-testid={`text-payment-amount-${payment.id}`}>{formatCurrency(payment.amount)} TL</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Ödeme Yöntemi:</span>
                        <p className="font-medium" data-testid={`text-payment-method-${payment.id}`}>{paymentMethodLabels[payment.paymentMethod || ""] || payment.paymentMethod || "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Durum:</span>
                        <div data-testid={`text-payment-status-${payment.id}`}>{getPaymentStatusBadge(payment.status)}</div>
                      </div>
                    </div>
                    {payment.notes && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Not:</span>
                        <p>{payment.notes}</p>
                      </div>
                    )}
                    {isMuhasebeOrAdmin && payment.status === "beklemede" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markPaidMutation.mutate(payment.id)}
                        disabled={markPaidMutation.isPending}
                        data-testid={`button-mark-paid-${payment.id}`}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Ödeme Yapıldı
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {payments && payments.length === 0 && (
            <p className="text-sm text-muted-foreground">Henüz ödeme bilgisi yok.</p>
          )}

          {paymentsLoading && (
            <Skeleton className="h-20 w-full" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SiparisYonetimi() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [status, setStatus] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [paymentDialogOrder, setPaymentDialogOrder] = useState<PurchaseOrder | null>(null);
  const [detailDialogOrder, setDetailDialogOrder] = useState<PurchaseOrder | null>(null);
  const [rejectDialogOrder, setRejectDialogOrder] = useState<PurchaseOrder | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const isAdminOrCeo = user?.role === "admin" || user?.role === "ceo" || user?.role === "cgo";
  const canFilterBranch = ["admin", "ceo", "cgo", "satinalma", "muhasebe"].includes(user?.role || "");

  const queryParams = new URLSearchParams();
  if (status && status !== "all") queryParams.set("status", status);
  if (branchFilter && branchFilter !== "all") queryParams.set("branchId", branchFilter);
  const queryString = queryParams.toString();
  const ordersUrl = `/api/purchase-orders${queryString ? `?${queryString}` : ""}`;

  const { data: orders, isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ["/api/purchase-orders", status, branchFilter],
    queryFn: async () => {
      const res = await fetch(ordersUrl, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
  });

  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: branches } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/branches"],
    enabled: canFilterBranch,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/purchase-orders", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        (query.queryKey[0] as string).startsWith("/api/purchase-orders")
      });
      setIsAddDialogOpen(false);
      setSelectedSupplierId("");
      toast({ title: "Sipariş oluşturuldu" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Sipariş oluşturulamadı", variant: "destructive" });
    }
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, newStatus, successMessage }: { id: number, newStatus: string, successMessage?: string }) => {
      return apiRequest("PATCH", `/api/purchase-orders/${id}/status`, { status: newStatus });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ predicate: (query) => 
        (query.queryKey[0] as string).startsWith("/api/purchase-orders")
      });
      toast({ title: variables.successMessage || "Sipariş durumu güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Durum güncellenemedi", variant: "destructive" });
    }
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("PATCH", `/api/purchase-orders/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        (query.queryKey[0] as string).startsWith("/api/purchase-orders")
      });
      toast({ title: "Sipariş onaylandı" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Onaylama başarısız", variant: "destructive" });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, rejectionReason }: { id: number; rejectionReason: string }) => {
      return apiRequest("PATCH", `/api/purchase-orders/${id}/reject`, { rejectionReason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        (query.queryKey[0] as string).startsWith("/api/purchase-orders")
      });
      setRejectDialogOrder(null);
      setRejectionReason("");
      toast({ title: "Sipariş reddedildi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Red işlemi başarısız", variant: "destructive" });
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
      expectedDeliveryDate: formData.get("expectedDeliveryDate") || null,
      status: "taslak",
      items: []
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      taslak: { label: "Taslak", variant: "outline" },
      onay_bekliyor: { label: "Onay Bekliyor", variant: "secondary" },
      onaylandi: { label: "Onaylandı", variant: "default" },
      siparis_verildi: { label: "Sipariş Verildi", variant: "secondary" },
      kismen_teslim: { label: "Kısmen Teslim", variant: "secondary" },
      tamamlandi: { label: "Tamamlandı", variant: "default" },
      reddedildi: { label: "Reddedildi", variant: "destructive" },
      iptal: { label: "İptal", variant: "destructive" }
    };
    const config = statusMap[status] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("tr-TR");
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(parseFloat(amount));
  };

  const canShowPaymentButton = (orderStatus: string) => {
    return ["onaylandi", "siparis_verildi", "tamamlandi"].includes(orderStatus);
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
          <SelectTrigger className="w-[180px]" data-testid="select-order-status">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canFilterBranch && branches && branches.length > 0 && (
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[200px]" data-testid="select-order-branch">
              <SelectValue placeholder="Şube" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Şubeler</SelectItem>
              {branches.map((b: { id: number; name: string }) => (
                <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex-1" />

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-order">
              <Plus className="h-4 w-4 mr-2" />
              Yeni Siparis
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Yeni Satınalma Siparişi</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="supplierId">Tedarikçi</Label>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger data-testid="select-supplier">
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
                <Label htmlFor="expectedDeliveryDate">Beklenen Teslimat Tarihi</Label>
                <Input 
                  id="expectedDeliveryDate" 
                  name="expectedDeliveryDate" 
                  type="date" 
                  data-testid="input-delivery-date"
                />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-order">
                {createMutation.isPending ? "Oluşturuluyor..." : "Sipariş Oluştur"}
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
                <TableHead>Sipariş No</TableHead>
                <TableHead>Tedarikçi</TableHead>
                <TableHead>Sipariş Tarihi</TableHead>
                <TableHead>Teslimat Tarihi</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders && orders.length > 0 ? (
                orders.map((order) => (
                  <TableRow key={order.id} data-testid={`order-row-${order.id}`}>
                    <TableCell className="font-mono text-sm">{order.orderNumber}</TableCell>
                    <TableCell className="font-medium">
                      {order.supplier?.name || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(order.orderDate)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(order.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        {getStatusBadge(order.status)}
                        {canShowPaymentButton(order.status) && (
                          <PaymentStatusBadge orderId={order.id} />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDetailDialogOrder(order)}
                          data-testid={`button-view-order-${order.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canShowPaymentButton(order.status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPaymentDialogOrder(order)}
                            data-testid={`button-payment-info-${order.id}`}
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Ödeme Bilgisi
                          </Button>
                        )}
                        {order.status === "taslak" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => statusMutation.mutate({ id: order.id, newStatus: "onay_bekliyor", successMessage: "Sipariş CEO/CGO onayına gönderildi" })}
                            disabled={statusMutation.isPending}
                            data-testid={`button-send-approval-${order.id}`}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Onaya Gönder
                          </Button>
                        )}
                        {order.status === "onay_bekliyor" && isAdminOrCeo && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => approveMutation.mutate(order.id)}
                              disabled={approveMutation.isPending}
                              data-testid={`button-approve-order-${order.id}`}
                            >
                              <Check className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setRejectDialogOrder(order)}
                              data-testid={`button-reject-order-${order.id}`}
                            >
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        )}
                        {order.status === "onaylandi" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => statusMutation.mutate({ id: order.id, newStatus: "siparis_verildi", successMessage: "Sipariş verildi" })}
                            disabled={statusMutation.isPending}
                            data-testid={`button-place-order-${order.id}`}
                          >
                            <Truck className="h-4 w-4 mr-1" />
                            Sipariş Ver
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {status !== "all" ? "Bu durumda sipariş yok" : "Henüz sipariş yok"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {paymentDialogOrder && (
        <PaymentDialog
          order={paymentDialogOrder}
          open={!!paymentDialogOrder}
          onOpenChange={(open) => { if (!open) setPaymentDialogOrder(null); }}
        />
      )}

      {detailDialogOrder && (
        <OrderDetailDialog
          order={detailDialogOrder}
          open={!!detailDialogOrder}
          onOpenChange={(open) => { if (!open) setDetailDialogOrder(null); }}
        />
      )}

      <Dialog open={!!rejectDialogOrder} onOpenChange={(open) => { if (!open) { setRejectDialogOrder(null); setRejectionReason(""); } }}>
        <DialogContent className="max-w-md" data-testid="dialog-reject-order">
          <DialogHeader>
            <DialogTitle>Sipariş Reddet - {rejectDialogOrder?.orderNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">Red Nedeni</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Red nedenini yazin..."
                data-testid="textarea-rejection-reason"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => { setRejectDialogOrder(null); setRejectionReason(""); }}
                data-testid="button-cancel-reject"
              >
                Vazgec
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (rejectDialogOrder && rejectionReason.trim()) {
                    rejectMutation.mutate({ id: rejectDialogOrder.id, rejectionReason: rejectionReason.trim() });
                  }
                }}
                disabled={!rejectionReason.trim() || rejectMutation.isPending}
                data-testid="button-confirm-reject"
              >
                Reddet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
