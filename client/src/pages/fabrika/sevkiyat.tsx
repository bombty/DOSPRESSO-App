import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Truck,
  Plus,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  Trash2,
  Eye,
  RefreshCw,
  ShoppingCart,
  ArrowRight,
  CalendarClock,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";

interface Shipment {
  id: number;
  shipmentNumber: string;
  branchId: number;
  status: string;
  preparedById: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  deliveryNotes: string | null;
  transferType: string | null;
  totalCost: string | null;
  totalSalePrice: string | null;
  createdAt: string;
  updatedAt: string;
  branchName: string | null;
}

interface ShipmentDetail extends Shipment {
  items: ShipmentItem[];
}

interface ShipmentItem {
  id: number;
  shipmentId: number;
  productId: number;
  quantity: string;
  unit: string | null;
  lotNumber: string | null;
  expiryDate: string | null;
  notes: string | null;
  productName: string | null;
  productSku: string | null;
}

interface Branch {
  id: number;
  name: string;
}

interface FactoryProduct {
  id: number;
  name: string;
  sku: string | null;
  unit: string | null;
  category: string | null;
}

interface NewItem {
  productId: number;
  quantity: string;
  unit: string;
  lotNumber: string;
  notes: string;
}

interface BranchOrder {
  id: number;
  orderNumber: string;
  branchId: number;
  branchName?: string;
  status: string;
  priority: string;
  requestedById: string;
  requestedByName?: string;
  requestedDeliveryDate: string | null;
  notes: string | null;
  totalAmount: number | null;
  createdAt: string;
  updatedAt: string;
}

interface BranchOrderDetail extends BranchOrder {
  items: BranchOrderItem[];
}

interface BranchOrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  approvedQuantity: number | null;
  unit: string | null;
  unitPrice: number;
  totalPrice: number;
  notes: string | null;
  productName?: string;
  productCategory?: string | null;
}

export default function FabrikaSevkiyat() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("shipments");
  const [filterBranch, setFilterBranch] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedShipmentId, setSelectedShipmentId] = useState<number | null>(null);

  const [orderDetailDialogOpen, setOrderDetailDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectOrderId, setRejectOrderId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [newBranchId, setNewBranchId] = useState<string>("");
  const [newDeliveryNotes, setNewDeliveryNotes] = useState("");
  const [pendingOrderRequestId, setPendingOrderRequestId] = useState<number | null>(null);
  const [newItems, setNewItems] = useState<NewItem[]>([
    { productId: 0, quantity: "", unit: "adet", lotNumber: "", notes: "" },
  ]);

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (filterBranch !== "all") params.set("branchId", filterBranch);
    if (filterStatus !== "all") params.set("status", filterStatus);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  };

  const { data: shipments = [], isLoading: shipmentsLoading, isError, refetch } = useQuery<Shipment[]>({
    queryKey: ['/api/factory/shipments', filterBranch, filterStatus],
    queryFn: async () => {
      const res = await fetch(`/api/factory/shipments${buildQueryString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error("Failed to fetch shipments");
      return res.json();
    },
  });

  const { data: shipmentDetail, isLoading: detailLoading } = useQuery<ShipmentDetail>({
    queryKey: ['/api/factory/shipments', selectedShipmentId],
    queryFn: async () => {
      const res = await fetch(`/api/factory/shipments/${selectedShipmentId}`, { credentials: 'include' });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!selectedShipmentId && detailDialogOpen,
  });

  const { data: branchesList = [] } = useQuery<Branch[]>({
    queryKey: ['/api/branches'],
  });

  const { data: products = [] } = useQuery<FactoryProduct[]>({
    queryKey: ['/api/factory/products'],
  });

  const { data: branchOrders = [], isLoading: ordersLoading } = useQuery<BranchOrder[]>({
    queryKey: ['/api/branch-orders', 'all-statuses'],
    queryFn: async () => {
      const res = await fetch('/api/branch-orders', { credentials: 'include' });
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
  });

  const { data: orderDetail, isLoading: orderDetailLoading } = useQuery<BranchOrderDetail>({
    queryKey: ['/api/branch-orders', selectedOrderId],
    queryFn: async () => {
      const res = await fetch(`/api/branch-orders/${selectedOrderId}`, { credentials: 'include' });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!selectedOrderId && orderDetailDialogOpen,
  });

  const pendingOrders = branchOrders.filter(o => o.status === 'pending');
  const approvedOrders = branchOrders.filter(o => o.status === 'approved');

  const createMutation = useMutation({
    mutationFn: async (data: { branchId: number; deliveryNotes: string; orderRequestId?: number; items: any[] }) => {
      const res = await apiRequest('POST', '/api/factory/shipments', data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Sevkiyat oluşturuldu" });
      queryClient.invalidateQueries({ queryKey: ['/api/factory/shipments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/branch-orders'] });
      setPendingOrderRequestId(null);
      resetCreateForm();
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, deliveryNotes }: { id: number; status: string; deliveryNotes?: string }) => {
      const res = await apiRequest('PATCH', `/api/factory/shipments/${id}/status`, { status, deliveryNotes });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Durum güncellendi" });
      queryClient.invalidateQueries({ queryKey: ['/api/factory/shipments'] });
      setDetailDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/factory/shipments/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Sevkiyat silindi" });
      queryClient.invalidateQueries({ queryKey: ['/api/factory/shipments'] });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('PATCH', `/api/branch-orders/${id}/approve`, {});
      return res.json();
    },
    onSuccess: (data: any) => {
      const warnings = data.stockWarnings;
      if (warnings && warnings.length > 0) {
        toast({ title: "Sipariş onaylandı (stok uyarıları var)", description: warnings.join(', ') });
      } else {
        toast({ title: "Sipariş onaylandı" });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/branch-orders'] });
      setOrderDetailDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const res = await apiRequest('PATCH', `/api/branch-orders/${id}/cancel`, { reason });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Sipariş reddedildi" });
      queryClient.invalidateQueries({ queryKey: ['/api/branch-orders'] });
      setRejectDialogOpen(false);
      setRejectReason("");
      setOrderDetailDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const resetCreateForm = () => {
    setCreateDialogOpen(false);
    setNewBranchId("");
    setNewDeliveryNotes("");
    setNewItems([{ productId: 0, quantity: "", unit: "adet", lotNumber: "", notes: "" }]);
  };

  const handleCreate = () => {
    if (!newBranchId) {
      toast({ title: "Hata", description: "Şube seçilmeli", variant: "destructive" });
      return;
    }
    const validItems = newItems.filter(i => i.productId > 0 && parseFloat(i.quantity) > 0);
    if (validItems.length === 0) {
      toast({ title: "Hata", description: "En az bir ürün ekleyin", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      branchId: parseInt(newBranchId),
      deliveryNotes: newDeliveryNotes,
      orderRequestId: pendingOrderRequestId || undefined,
      items: validItems.map(i => ({
        productId: i.productId,
        quantity: parseFloat(i.quantity),
        unit: i.unit,
        lotNumber: i.lotNumber || undefined,
        notes: i.notes || undefined,
      })),
    });
  };

  const handleCreateFromOrder = (order: BranchOrder) => {
    setNewBranchId(String(order.branchId));
    setNewDeliveryNotes(`Sipariş No: ${order.orderNumber}`);
    setPendingOrderRequestId(order.id);
    setCreateDialogOpen(true);
    setOrderDetailDialogOpen(false);
  };

  const addNewItem = () => {
    setNewItems([...newItems, { productId: 0, quantity: "", unit: "adet", lotNumber: "", notes: "" }]);
  };

  const removeNewItem = (index: number) => {
    if (newItems.length <= 1) return;
    setNewItems(newItems.filter((_, i) => i !== index));
  };

  const updateNewItem = (index: number, field: keyof NewItem, value: string | number) => {
    setNewItems(newItems.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'hazirlaniyor':
        return <Badge variant="secondary" data-testid={`badge-status-${status}`}><Clock className="h-3 w-3 mr-1" />Hazırlanıyor</Badge>;
      case 'sevk_edildi':
        return <Badge className="bg-blue-600" data-testid={`badge-status-${status}`}><Send className="h-3 w-3 mr-1" />Sevk Edildi</Badge>;
      case 'teslim_edildi':
        return <Badge className="bg-green-600" data-testid={`badge-status-${status}`}><CheckCircle2 className="h-3 w-3 mr-1" />Teslim Edildi</Badge>;
      case 'iptal':
        return <Badge variant="destructive" data-testid={`badge-status-${status}`}><XCircle className="h-3 w-3 mr-1" />İptal</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" data-testid={`badge-order-status-${status}`}><Clock className="h-3 w-3 mr-1" />Bekliyor</Badge>;
      case 'approved':
        return <Badge className="bg-green-600" data-testid={`badge-order-status-${status}`}><CheckCircle2 className="h-3 w-3 mr-1" />Onaylandı</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" data-testid={`badge-order-status-${status}`}><XCircle className="h-3 w-3 mr-1" />Reddedildi</Badge>;
      case 'delivered':
        return <Badge className="bg-blue-600" data-testid={`badge-order-status-${status}`}><Truck className="h-3 w-3 mr-1" />Teslim Edildi</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive" data-testid="badge-priority-urgent"><AlertTriangle className="h-3 w-3 mr-1" />Acil</Badge>;
      case 'high':
        return <Badge className="bg-orange-500" data-testid="badge-priority-high">Yüksek</Badge>;
      default:
        return null;
    }
  };

  const getTransferTypeBadge = (type: string | null) => {
    if (!type) return null;
    switch (type) {
      case 'internal':
        return <Badge variant="secondary" data-testid="badge-transfer-internal">Dahili Transfer</Badge>;
      case 'sale':
        return <Badge className="bg-purple-600" data-testid="badge-transfer-sale">Satış</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const formatShortDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  };

  const prepCount = shipments.filter(s => s.status === 'hazirlaniyor').length;
  const dispatchedCount = shipments.filter(s => s.status === 'sevk_edildi').length;
  const deliveredCount = shipments.filter(s => s.status === 'teslim_edildi').length;

  const renderTimeline = (shipment: ShipmentDetail) => {
    const steps = [
      { key: 'hazirlaniyor', label: 'Hazırlanıyor', icon: Clock, date: shipment.createdAt },
      { key: 'sevk_edildi', label: 'Sevk Edildi', icon: Send, date: shipment.dispatchedAt },
      { key: 'teslim_edildi', label: 'Teslim Edildi', icon: CheckCircle2, date: shipment.deliveredAt },
    ];

    const statusOrder = ['hazirlaniyor', 'sevk_edildi', 'teslim_edildi'];
    const currentIdx = statusOrder.indexOf(shipment.status);
    const isCancelled = shipment.status === 'iptal';

    
  if (shipmentsLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
      <div className="flex items-center gap-2 py-3" data-testid="shipment-timeline">
        {steps.map((step, idx) => {
          const isCompleted = !isCancelled && idx <= currentIdx;
          const isCurrent = !isCancelled && idx === currentIdx;
          const StepIcon = step.icon;

          return (
            <div key={step.key} className="flex items-center gap-2 flex-1">
              <div className={`flex flex-col items-center gap-1 flex-1 ${isCompleted ? 'text-green-600' : 'text-muted-foreground'}`}>
                <div className={`p-2 rounded-full ${isCurrent ? 'bg-primary/20 ring-2 ring-primary' : isCompleted ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                  <StepIcon className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium text-center">{step.label}</span>
                {step.date && isCompleted && (
                  <span className="text-xs text-muted-foreground">{formatShortDate(step.date)}</span>
                )}
              </div>
              {idx < steps.length - 1 && (
                <div className={`h-0.5 flex-1 ${idx < currentIdx && !isCancelled ? 'bg-green-500' : 'bg-muted'}`} />
              )}
            </div>
          );
        })}
        {isCancelled && (
          <div className="flex flex-col items-center gap-1 text-destructive">
            <div className="p-2 rounded-full bg-destructive/10">
              <XCircle className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium">İptal</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Truck className="h-8 w-8 text-blue-500" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-sevkiyat-title">Sevkiyat Yönetimi</h1>
            <p className="text-muted-foreground">Fabrika sevkiyat takibi</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/factory/shipments'] });
              queryClient.invalidateQueries({ queryKey: ['/api/branch-orders'] });
            }}
            data-testid="button-refresh-shipments"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-shipment">
            <Plus className="h-4 w-4 mr-2" />
            Yeni Sevkiyat
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-500/20 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bekleyen Sipariş</p>
                <p className="text-2xl font-bold" data-testid="text-pending-orders-count">{pendingOrders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 rounded-lg">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hazırlanan</p>
                <p className="text-2xl font-bold" data-testid="text-prep-count">{prepCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Send className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sevk Edilen</p>
                <p className="text-2xl font-bold" data-testid="text-dispatched-count">{dispatchedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Teslim Edilen</p>
                <p className="text-2xl font-bold" data-testid="text-delivered-count">{deliveredCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-sevkiyat">
          <TabsTrigger value="orders" data-testid="tab-orders">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Şube Siparişleri
            {pendingOrders.length > 0 && (
              <Badge variant="destructive" className="ml-2" data-testid="badge-pending-count">
                {pendingOrders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="shipments" data-testid="tab-shipments">
            <Truck className="h-4 w-4 mr-2" />
            Sevkiyatlar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 flex-wrap">
                <ShoppingCart className="h-5 w-5" />
                Bekleyen Siparişler
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : pendingOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Bekleyen sipariş yok</p>
                </div>
              ) : (
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sipariş No</TableHead>
                        <TableHead>Şube</TableHead>
                        <TableHead>Öncelik</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>Tarih</TableHead>
                        <TableHead>İşlem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingOrders.map((order) => (
                        <TableRow key={order.id} data-testid={`row-pending-order-${order.id}`}>
                          <TableCell className="font-mono text-sm" data-testid={`text-order-number-${order.id}`}>
                            {order.orderNumber}
                          </TableCell>
                          <TableCell data-testid={`text-order-branch-${order.id}`}>
                            {order.branchName || `Şube #${order.branchId}`}
                          </TableCell>
                          <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                          <TableCell>{getOrderStatusBadge(order.status)}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(order.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedOrderId(order.id);
                                  setOrderDetailDialogOpen(true);
                                }}
                                data-testid={`button-view-order-${order.id}`}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Detay
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => approveMutation.mutate(order.id)}
                                disabled={approveMutation.isPending}
                                data-testid={`button-approve-order-${order.id}`}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Onayla
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setRejectOrderId(order.id);
                                  setRejectDialogOpen(true);
                                }}
                                data-testid={`button-reject-order-${order.id}`}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reddet
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {approvedOrders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 flex-wrap">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Onaylanmış Siparişler (Sevkiyat Bekliyor)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sipariş No</TableHead>
                        <TableHead>Şube</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>Tarih</TableHead>
                        <TableHead>İşlem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedOrders.map((order) => (
                        <TableRow key={order.id} data-testid={`row-approved-order-${order.id}`}>
                          <TableCell className="font-mono text-sm">
                            {order.orderNumber}
                          </TableCell>
                          <TableCell>
                            {order.branchName || `Şube #${order.branchId}`}
                          </TableCell>
                          <TableCell>{getOrderStatusBadge(order.status)}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(order.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedOrderId(order.id);
                                  setOrderDetailDialogOpen(true);
                                }}
                                data-testid={`button-view-approved-order-${order.id}`}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Detay
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleCreateFromOrder(order)}
                                data-testid={`button-create-shipment-from-order-${order.id}`}
                              >
                                <Truck className="h-4 w-4 mr-1" />
                                Sevkiyat Oluştur
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 flex-wrap">
                <FileText className="h-5 w-5" />
                Tüm Siparişler
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : branchOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Sipariş bulunamadı</p>
                </div>
              ) : (
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sipariş No</TableHead>
                        <TableHead>Şube</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>Öncelik</TableHead>
                        <TableHead>Tarih</TableHead>
                        <TableHead>İşlem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {branchOrders.map((order) => (
                        <TableRow key={order.id} data-testid={`row-all-order-${order.id}`}>
                          <TableCell className="font-mono text-sm">
                            {order.orderNumber}
                          </TableCell>
                          <TableCell>
                            {order.branchName || `Şube #${order.branchId}`}
                          </TableCell>
                          <TableCell>{getOrderStatusBadge(order.status)}</TableCell>
                          <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(order.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedOrderId(order.id);
                                setOrderDetailDialogOpen(true);
                              }}
                              data-testid={`button-view-all-order-${order.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shipments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 flex-wrap">
                <Package className="h-5 w-5" />
                Sevkiyat Listesi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 mb-4 flex-wrap">
                <div className="w-48">
                  <Select value={filterBranch} onValueChange={setFilterBranch}>
                    <SelectTrigger data-testid="select-filter-branch">
                      <SelectValue placeholder="Şube Filtrele" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Şubeler</SelectItem>
                      {branchesList.map(b => (
                        <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-48">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger data-testid="select-filter-status">
                      <SelectValue placeholder="Durum Filtrele" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Durumlar</SelectItem>
                      <SelectItem value="hazirlaniyor">Hazırlanıyor</SelectItem>
                      <SelectItem value="sevk_edildi">Sevk Edildi</SelectItem>
                      <SelectItem value="teslim_edildi">Teslim Edildi</SelectItem>
                      <SelectItem value="iptal">İptal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {shipmentsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : shipments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Sevkiyat bulunamadı</p>
                </div>
              ) : (
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sevkiyat No</TableHead>
                        <TableHead>Şube</TableHead>
                        <TableHead>Transfer Tipi</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>Oluşturma</TableHead>
                        <TableHead>Sevk Tarihi</TableHead>
                        <TableHead>İşlem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shipments.map((shipment) => (
                        <TableRow key={shipment.id} data-testid={`row-shipment-${shipment.id}`}>
                          <TableCell className="font-mono text-sm" data-testid={`text-shipment-number-${shipment.id}`}>
                            {shipment.shipmentNumber}
                          </TableCell>
                          <TableCell data-testid={`text-shipment-branch-${shipment.id}`}>
                            {shipment.branchName || `Şube #${shipment.branchId}`}
                          </TableCell>
                          <TableCell data-testid={`text-shipment-transfer-type-${shipment.id}`}>
                            {getTransferTypeBadge(shipment.transferType)}
                          </TableCell>
                          <TableCell>{getStatusBadge(shipment.status)}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(shipment.createdAt)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(shipment.dispatchedAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedShipmentId(shipment.id);
                                  setDetailDialogOpen(true);
                                }}
                                data-testid={`button-view-shipment-${shipment.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {shipment.status === 'hazirlaniyor' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => statusMutation.mutate({ id: shipment.id, status: 'sevk_edildi' })}
                                    disabled={statusMutation.isPending}
                                    data-testid={`button-dispatch-${shipment.id}`}
                                  >
                                    <Send className="h-4 w-4 mr-1" />
                                    Sevk Et
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => statusMutation.mutate({ id: shipment.id, status: 'iptal' })}
                                    disabled={statusMutation.isPending}
                                    data-testid={`button-cancel-${shipment.id}`}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {shipment.status === 'sevk_edildi' && (
                                <Button
                                  size="sm"
                                  className="bg-green-600"
                                  onClick={() => statusMutation.mutate({ id: shipment.id, status: 'teslim_edildi' })}
                                  disabled={statusMutation.isPending}
                                  data-testid={`button-deliver-${shipment.id}`}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Teslim
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={createDialogOpen} onOpenChange={(open) => { if (!open) resetCreateForm(); else setCreateDialogOpen(true); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Yeni Sevkiyat Oluştur
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Şube</Label>
              <Select value={newBranchId} onValueChange={setNewBranchId}>
                <SelectTrigger data-testid="select-new-branch">
                  <SelectValue placeholder="Şube seçin" />
                </SelectTrigger>
                <SelectContent>
                  {branchesList.map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Label>Ürünler</Label>
                <Button size="sm" variant="outline" onClick={addNewItem} data-testid="button-add-item">
                  <Plus className="h-4 w-4 mr-1" />
                  Ürün Ekle
                </Button>
              </div>
              {newItems.map((item, idx) => (
                <div key={idx} className="flex items-end gap-2 p-3 border rounded-md flex-wrap">
                  <div className="flex-1 min-w-[150px] space-y-1">
                    <Label className="text-xs">Ürün</Label>
                    <Select
                      value={item.productId ? String(item.productId) : ""}
                      onValueChange={(v) => updateNewItem(idx, 'productId', parseInt(v))}
                    >
                      <SelectTrigger data-testid={`select-item-product-${idx}`}>
                        <SelectValue placeholder="Ürün seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map(p => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name} {p.sku ? `(${p.sku})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24 space-y-1">
                    <Label className="text-xs">Miktar</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={item.quantity}
                      onChange={(e) => updateNewItem(idx, 'quantity', e.target.value)}
                      placeholder="0"
                      data-testid={`input-item-qty-${idx}`}
                    />
                  </div>
                  <div className="w-24 space-y-1">
                    <Label className="text-xs">Birim</Label>
                    <Input
                      value={item.unit}
                      onChange={(e) => updateNewItem(idx, 'unit', e.target.value)}
                      placeholder="adet"
                      data-testid={`input-item-unit-${idx}`}
                    />
                  </div>
                  <div className="w-28 space-y-1">
                    <Label className="text-xs">Lot No</Label>
                    <Input
                      value={item.lotNumber}
                      onChange={(e) => updateNewItem(idx, 'lotNumber', e.target.value)}
                      placeholder="LOT-"
                      data-testid={`input-item-lot-${idx}`}
                    />
                  </div>
                  {newItems.length > 1 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeNewItem(idx)}
                      data-testid={`button-remove-item-${idx}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Teslimat Notları (Opsiyonel)</Label>
              <Textarea
                value={newDeliveryNotes}
                onChange={(e) => setNewDeliveryNotes(e.target.value)}
                placeholder="Ek notlar..."
                rows={2}
                data-testid="input-delivery-notes"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={resetCreateForm} data-testid="button-cancel-create">
              İptal
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              data-testid="button-submit-shipment"
            >
              {createMutation.isPending ? "Oluşturuluyor..." : "Sevkiyat Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Sevkiyat Detayı
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : shipmentDetail ? (
            <div className="space-y-4">
              {renderTimeline(shipmentDetail)}

              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Sevkiyat No</p>
                  <p className="font-mono font-semibold" data-testid="text-detail-number">{shipmentDetail.shipmentNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Şube</p>
                  <p className="font-semibold" data-testid="text-detail-branch">{shipmentDetail.branchName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Durum</p>
                  {getStatusBadge(shipmentDetail.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Transfer Tipi</p>
                  <div data-testid="text-detail-transfer-type">
                    {getTransferTypeBadge(shipmentDetail.transferType) || <span className="text-sm text-muted-foreground">-</span>}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Oluşturulma</p>
                  <p className="text-sm">{formatDate(shipmentDetail.createdAt)}</p>
                </div>
                {shipmentDetail.dispatchedAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Sevk Tarihi</p>
                    <p className="text-sm">{formatDate(shipmentDetail.dispatchedAt)}</p>
                  </div>
                )}
                {shipmentDetail.deliveredAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Teslim Tarihi</p>
                    <p className="text-sm">{formatDate(shipmentDetail.deliveredAt)}</p>
                  </div>
                )}
                {shipmentDetail.totalCost && (
                  <div>
                    <p className="text-sm text-muted-foreground">Toplam Maliyet</p>
                    <p className="text-sm font-semibold" data-testid="text-detail-cost">{Number(shipmentDetail.totalCost).toLocaleString('tr-TR')} TL</p>
                  </div>
                )}
                {shipmentDetail.totalSalePrice && (
                  <div>
                    <p className="text-sm text-muted-foreground">Toplam Satış</p>
                    <p className="text-sm font-semibold" data-testid="text-detail-sale-price">{Number(shipmentDetail.totalSalePrice).toLocaleString('tr-TR')} TL</p>
                  </div>
                )}
              </div>

              {shipmentDetail.deliveryNotes && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Notlar</p>
                  <p className="text-sm">{shipmentDetail.deliveryNotes}</p>
                </div>
              )}

              <div>
                <p className="font-semibold mb-2">Ürünler ({shipmentDetail.items?.length || 0})</p>
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ürün</TableHead>
                        <TableHead>Miktar</TableHead>
                        <TableHead>Lot No</TableHead>
                        <TableHead>SKT</TableHead>
                        <TableHead>Not</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shipmentDetail.items?.map((item) => (
                        <TableRow key={item.id} data-testid={`row-detail-item-${item.id}`}>
                          <TableCell className="font-medium">
                            {item.productName || `Ürün #${item.productId}`}
                            {item.productSku && <span className="text-muted-foreground ml-1 text-xs">({item.productSku})</span>}
                          </TableCell>
                          <TableCell>{item.quantity} {item.unit || ''}</TableCell>
                          <TableCell className="font-mono text-xs" data-testid={`text-item-lot-${item.id}`}>{item.lotNumber || '-'}</TableCell>
                          <TableCell className="text-sm" data-testid={`text-item-expiry-${item.id}`}>
                            {item.expiryDate ? (
                              <span className={new Date(item.expiryDate) < new Date() ? 'text-destructive font-semibold' : ''}>
                                {formatShortDate(item.expiryDate)}
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{item.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {shipmentDetail.status === 'hazirlaniyor' && (
                <div className="flex gap-2 justify-end flex-wrap">
                  <Button
                    onClick={() => statusMutation.mutate({ id: shipmentDetail.id, status: 'sevk_edildi' })}
                    disabled={statusMutation.isPending}
                    data-testid="button-detail-dispatch"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Sevk Et
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => statusMutation.mutate({ id: shipmentDetail.id, status: 'iptal' })}
                    disabled={statusMutation.isPending}
                    data-testid="button-detail-cancel"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    İptal Et
                  </Button>
                </div>
              )}
              {shipmentDetail.status === 'sevk_edildi' && (
                <div className="flex justify-end">
                  <Button
                    className="bg-green-600"
                    onClick={() => statusMutation.mutate({ id: shipmentDetail.id, status: 'teslim_edildi' })}
                    disabled={statusMutation.isPending}
                    data-testid="button-detail-deliver"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Teslim Edildi
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={orderDetailDialogOpen} onOpenChange={setOrderDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Sipariş Detayı
            </DialogTitle>
          </DialogHeader>

          {orderDetailLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : orderDetail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Sipariş No</p>
                  <p className="font-mono font-semibold" data-testid="text-order-detail-number">{orderDetail.orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Şube</p>
                  <p className="font-semibold" data-testid="text-order-detail-branch">{orderDetail.branchName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Durum</p>
                  {getOrderStatusBadge(orderDetail.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Öncelik</p>
                  {getPriorityBadge(orderDetail.priority) || <span className="text-sm">Normal</span>}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Talep Eden</p>
                  <p className="text-sm" data-testid="text-order-detail-requester">{orderDetail.requestedByName || "Bilinmiyor"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Oluşturulma</p>
                  <p className="text-sm">{formatDate(orderDetail.createdAt)}</p>
                </div>
                {orderDetail.requestedDeliveryDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">İstenen Teslim</p>
                    <p className="text-sm flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      {formatShortDate(orderDetail.requestedDeliveryDate)}
                    </p>
                  </div>
                )}
                {orderDetail.totalAmount != null && orderDetail.totalAmount > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Toplam Tutar</p>
                    <p className="text-sm font-semibold">{Number(orderDetail.totalAmount).toLocaleString('tr-TR')} TL</p>
                  </div>
                )}
              </div>

              {orderDetail.notes && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Notlar</p>
                  <p className="text-sm">{orderDetail.notes}</p>
                </div>
              )}

              <div>
                <p className="font-semibold mb-2">Ürünler ({orderDetail.items?.length || 0})</p>
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ürün</TableHead>
                        <TableHead>Talep</TableHead>
                        <TableHead>Onaylanan</TableHead>
                        <TableHead>Birim</TableHead>
                        <TableHead>Not</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderDetail.items?.map((item) => (
                        <TableRow key={item.id} data-testid={`row-order-item-${item.id}`}>
                          <TableCell className="font-medium">
                            {item.productName || `Ürün #${item.productId}`}
                            {item.productCategory && <span className="text-muted-foreground ml-1 text-xs">({item.productCategory})</span>}
                          </TableCell>
                          <TableCell data-testid={`text-order-item-qty-${item.id}`}>{item.quantity}</TableCell>
                          <TableCell data-testid={`text-order-item-approved-qty-${item.id}`}>
                            {item.approvedQuantity != null ? (
                              <span className={item.approvedQuantity < item.quantity ? 'text-orange-500 font-semibold' : 'text-green-600 font-semibold'}>
                                {item.approvedQuantity}
                                {item.approvedQuantity < item.quantity && (
                                  <AlertTriangle className="h-3 w-3 inline ml-1" />
                                )}
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-sm">{item.unit || 'adet'}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{item.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {orderDetail.status === 'pending' && (
                <div className="flex gap-2 justify-end flex-wrap">
                  <Button
                    onClick={() => approveMutation.mutate(orderDetail.id)}
                    disabled={approveMutation.isPending}
                    data-testid="button-detail-approve-order"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {approveMutation.isPending ? "Onaylanıyor..." : "Onayla"}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setRejectOrderId(orderDetail.id);
                      setRejectDialogOpen(true);
                    }}
                    data-testid="button-detail-reject-order"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reddet
                  </Button>
                </div>
              )}

              {orderDetail.status === 'approved' && (
                <div className="flex justify-end">
                  <Button
                    onClick={() => handleCreateFromOrder(orderDetail)}
                    data-testid="button-detail-create-shipment"
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Sevkiyat Oluştur
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Sipariş Reddet
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Red Sebebi</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Red sebebini giriniz..."
                rows={3}
                data-testid="input-reject-reason"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRejectDialogOpen(false); setRejectReason(""); }} data-testid="button-cancel-reject">
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (rejectOrderId) {
                  rejectMutation.mutate({ id: rejectOrderId, reason: rejectReason });
                }
              }}
              disabled={rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? "Reddediliyor..." : "Reddet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
