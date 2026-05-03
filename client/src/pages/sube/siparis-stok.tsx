import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShoppingCart,
  ClipboardList,
  Package,
  ArrowRightLeft,
  Plus,
  Trash2,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  AlertTriangle,
  Minus,
  Search,
  RefreshCw,
} from "lucide-react";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";

interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Beklemede", variant: "secondary" },
  approved: { label: "Onaylandı", variant: "default" },
  shipped: { label: "Sevk Edildi", variant: "outline" },
  delivered: { label: "Teslim Edildi", variant: "default" },
  cancelled: { label: "İptal", variant: "destructive" },
};

const MOVEMENT_TYPE_MAP: Record<string, string> = {
  sevkiyat_giris: "Sevkiyat Girişi",
  zayiat: "Zayiat",
  sayim_duzeltme: "Sayım Düzeltme",
  transfer: "Transfer",
  iade: "İade",
};

const TABS = [
  { id: "siparis-ver", label: "Sipariş Ver", icon: ShoppingCart },
  { id: "siparislerim", label: "Siparişlerim", icon: ClipboardList },
  { id: "stok-durumu", label: "Stok Durumu", icon: Package },
  { id: "stok-hareketleri", label: "Stok Hareketleri", icon: ArrowRightLeft },
] as const;

type TabId = typeof TABS[number]["id"];

function SiparisVerTab({ branchId }: { branchId: number }) {
  const { toast } = useToast();
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [priority, setPriority] = useState("normal");
  const [notes, setNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: products = [], isLoading: productsLoading, isError, refetch } = useQuery<any[]>({
    queryKey: ["/api/factory/products"],
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/branch-orders", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Sipariş oluşturuldu", description: "Siparişiniz fabrikaya iletildi." });
      setOrderItems([]);
      setDeliveryDate("");
      setPriority("normal");
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/branch-orders"] });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Sipariş oluşturulamadı", variant: "destructive" });
    },
  });

  const addProduct = (product: any) => {
    if (orderItems.find((i) => i.productId === product.id)) {
      toast({ title: "Uyarı", description: "Bu ürün zaten listede", variant: "destructive" });
      return;
    }
    setOrderItems([
      ...orderItems,
      {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unit: product.unit || "adet",
        unitPrice: 0,
      },
    ]);
  };

  const updateQuantity = (productId: number, quantity: number) => {
    setOrderItems(orderItems.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, quantity) } : i)));
  };

  const removeItem = (productId: number) => {
    setOrderItems(orderItems.filter((i) => i.productId !== productId));
  };

  const handleSubmit = () => {
    if (orderItems.length === 0) {
      toast({ title: "Hata", description: "En az bir ürün ekleyin", variant: "destructive" });
      return;
    }
    createOrderMutation.mutate({
      branchId,
      items: orderItems.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unit: i.unit,
        unitPrice: i.unitPrice,
      })),
      requestedDeliveryDate: deliveryDate || null,
      priority,
      notes: notes || null,
    });
  };

  const filteredProducts = products.filter(
    (p: any) =>
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  
  if (productsLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 flex-wrap">
            <Plus className="h-5 w-5" />
            Ürün Ekle
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ürün ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="input-product-search"
            />
          </div>
          {productsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto border rounded-md">
              {filteredProducts.map((product: any) => {
                const alreadyAdded = orderItems.some((i) => i.productId === product.id);
                return (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-2 p-2 border-b last:border-b-0"
                    data-testid={`product-row-${product.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.sku} - {product.category}</p>
                    </div>
                    <Button
                      size="sm"
                      variant={alreadyAdded ? "secondary" : "default"}
                      disabled={alreadyAdded}
                      onClick={() => addProduct(product)}
                      data-testid={`button-add-product-${product.id}`}
                    >
                      {alreadyAdded ? "Eklendi" : "Ekle"}
                    </Button>
                  </div>
                );
              })}
              {filteredProducts.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">Ürün bulunamadı</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {orderItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 flex-wrap">
              <ShoppingCart className="h-5 w-5" />
              Sipariş Sepeti ({orderItems.length} ürün)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ürün</TableHead>
                    <TableHead>Miktar</TableHead>
                    <TableHead>Birim</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderItems.map((item) => (
                    <TableRow key={item.productId} data-testid={`cart-item-${item.productId}`}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            data-testid={`button-decrease-${item.productId}`}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 1)}
                            className="w-16 text-center"
                            data-testid={`input-quantity-${item.productId}`}
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            data-testid={`button-increase-${item.productId}`}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeItem(item.productId)}
                          data-testid={`button-remove-${item.productId}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Teslim Tarihi</Label>
                <Input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  data-testid="input-delivery-date"
                />
              </div>
              <div className="space-y-2">
                <Label>Öncelik</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger data-testid="select-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgent">Acil</SelectItem>
                    <SelectItem value="low">Düşük</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notlar</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Sipariş ile ilgili notlarınız..."
                data-testid="input-order-notes"
              />
            </div>

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={createOrderMutation.isPending}
              data-testid="button-submit-order"
            >
              {createOrderMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Siparişi Gönder
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SiparislerimTab({ branchId }: { branchId: number }) {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const { data: orders = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/branch-orders", branchId],
    queryFn: async () => {
      const url = branchId ? `/api/branch-orders?branchId=${branchId}` : "/api/branch-orders";
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  const { data: orderDetail } = useQuery<any>({
    queryKey: ["/api/branch-orders", selectedOrder?.id],
    enabled: !!selectedOrder,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4" />;
      case "approved": return <CheckCircle className="h-4 w-4" />;
      case "shipped": return <Truck className="h-4 w-4" />;
      case "delivered": return <CheckCircle className="h-4 w-4" />;
      case "cancelled": return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Henüz sipariş bulunmuyor</p>
            </CardContent>
          </Card>
        ) : (
          (Array.isArray(orders) ? orders : []).map((order: any) => {
            const statusInfo = STATUS_MAP[order.status] || STATUS_MAP.pending;
            return (
              <Card
                key={order.id}
                className="cursor-pointer hover-elevate"
                onClick={() => setSelectedOrder(order)}
                data-testid={`order-card-${order.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-medium" data-testid={`text-order-number-${order.id}`}>
                        {order.orderNumber}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {order.branchName} - {new Date(order.createdAt).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {order.priority === "urgent" && (
                        <Badge variant="destructive">Acil</Badge>
                      )}
                      <Badge variant={statusInfo.variant}>
                        {getStatusIcon(order.status)}
                        <span className="ml-1">{statusInfo.label}</span>
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sipariş Detay - {selectedOrder?.orderNumber}</DialogTitle>
          </DialogHeader>
          {orderDetail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Şube:</span>
                  <p className="font-medium">{orderDetail.branchName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Durum:</span>
                  <p>
                    <Badge variant={STATUS_MAP[orderDetail.status]?.variant || "secondary"}>
                      {STATUS_MAP[orderDetail.status]?.label || orderDetail.status}
                    </Badge>
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Talep Eden:</span>
                  <p className="font-medium">{orderDetail.requestedByName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tarih:</span>
                  <p className="font-medium">{new Date(orderDetail.createdAt).toLocaleDateString("tr-TR")}</p>
                </div>
              </div>

              {orderDetail.notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Notlar:</span>
                  <p>{orderDetail.notes}</p>
                </div>
              )}

              {orderDetail.rejectionReason && (
                <div className="text-sm p-2 bg-destructive/10 rounded-md">
                  <span className="text-destructive font-medium">İptal Sebebi:</span>
                  <p>{orderDetail.rejectionReason}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-2">Ürünler</p>
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ürün</TableHead>
                      <TableHead>Talep</TableHead>
                      <TableHead>Onay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderDetail.items?.map((item: any) => (
                      <TableRow key={item.id} data-testid={`detail-item-${item.id}`}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell>{item.quantity} {item.unit}</TableCell>
                        <TableCell>
                          {item.approvedQuantity != null ? (
                            <span className={item.approvedQuantity < item.quantity ? "text-amber-600 dark:text-amber-400" : ""}>
                              {item.approvedQuantity} {item.unit}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function StokDurumuTab({ branchId }: { branchId: number }) {
  const { data: inventory = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/branch-inventory", branchId],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (inventory.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Henüz stok kaydı bulunmuyor</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ürün</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Stok</TableHead>
                <TableHead>Min</TableHead>
                <TableHead>Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(Array.isArray(inventory) ? inventory : []).map((item: any) => {
                const current = parseFloat(item.currentStock || "0");
                const min = parseFloat(item.minimumStock || "0");
                const belowMin = current < min;
                return (
                  <TableRow key={item.id} data-testid={`inventory-row-${item.id}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.productName || "Bilinmiyor"}</p>
                        {item.productSku && (
                          <p className="text-xs text-muted-foreground">{item.productSku}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.productCategory || "-"}
                    </TableCell>
                    <TableCell>
                      <span className={belowMin ? "text-destructive font-bold" : "font-medium"}>
                        {current}
                      </span>
                      {" "}{item.unit || item.productUnit || "adet"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {min} {item.unit || item.productUnit || "adet"}
                    </TableCell>
                    <TableCell>
                      {belowMin ? (
                        <Badge variant="destructive" data-testid={`badge-low-stock-${item.id}`}>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Düşük
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Yeterli</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function StokHareketleriTab({ branchId }: { branchId: number }) {
  const [movementType, setMovementType] = useState("all");

  const movementQueryUrl = `/api/branch-inventory/${branchId}/movements?limit=50${movementType !== "all" ? `&movementType=${movementType}` : ""}`;

  const { data: movementsData, isLoading } = useQuery<any>({
    queryKey: [movementQueryUrl],
  });

  const movements = movementsData?.data || movementsData || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={movementType} onValueChange={setMovementType}>
          <SelectTrigger className="w-48" data-testid="select-movement-type">
            <SelectValue placeholder="Hareket Tipi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="sevkiyat_giris">Sevkiyat Girişi</SelectItem>
            <SelectItem value="zayiat">Zayiat</SelectItem>
            <SelectItem value="sayim_duzeltme">Sayım Düzeltme</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {Array.isArray(movements) && movements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ArrowRightLeft className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Henüz stok hareketi bulunmuyor</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Ürün</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>Miktar</TableHead>
                    <TableHead>Önceki</TableHead>
                    <TableHead>Yeni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(Array.isArray(movements) ? movements : []).map((m: any) => {
                    const qty = parseFloat(m.quantity || "0");
                    return (
                      <TableRow key={m.id} data-testid={`movement-row-${m.id}`}>
                        <TableCell className="text-sm">
                          {new Date(m.createdAt).toLocaleDateString("tr-TR")}
                        </TableCell>
                        <TableCell className="font-medium">{m.productName || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {MOVEMENT_TYPE_MAP[m.movementType] || m.movementType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={qty >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                            {qty >= 0 ? "+" : ""}{qty}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{m.previousStock}</TableCell>
                        <TableCell className="font-medium">{m.newStock}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function SubeSiparisStok() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("siparis-ver");

  const branchId = user?.branchId ? Number(user.branchId) : 0;

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 flex-wrap">
        <Package className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold" data-testid="text-page-title">Şube Stok & Sipariş</h1>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b pb-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <Button
              key={tab.id}
              variant={isActive ? "default" : "ghost"}
              onClick={() => setActiveTab(tab.id)}
              className="whitespace-nowrap"
              data-testid={`tab-${tab.id}`}
            >
              <Icon className="h-4 w-4 mr-1.5" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      {activeTab === "siparis-ver" && <SiparisVerTab branchId={branchId} />}
      {activeTab === "siparislerim" && <SiparislerimTab branchId={branchId} />}
      {activeTab === "stok-durumu" && <StokDurumuTab branchId={branchId} />}
      {activeTab === "stok-hareketleri" && <StokHareketleriTab branchId={branchId} />}
    </div>
  );
}
