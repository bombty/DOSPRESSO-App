import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Factory, 
  Package, 
  Truck, 
  Warehouse, 
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  Search,
  Box,
  Layers,
  Settings,
  TrendingUp
} from "lucide-react";

interface FactoryProduct {
  id: number;
  name: string;
  sku: string;
  category: string;
  unit: string;
  unitPrice: number;
  minStock: number;
  description: string | null;
  isActive: boolean;
}

interface ProductionBatch {
  id: number;
  batchNumber: string;
  productId: number;
  quantity: number;
  unit: string;
  productionDate: string;
  expiryDate: string | null;
  status: string;
  qualityScore: number | null;
  qualityNotes: string | null;
  notes: string | null;
}

interface BranchOrder {
  id: number;
  orderNumber: string;
  branchId: number;
  status: string;
  priority: string;
  requestedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  totalAmount: number;
  notes: string | null;
  createdAt: string;
}

interface FactoryInventory {
  id: number;
  productId: number;
  batchId: number | null;
  quantity: number;
  reservedQuantity: number;
}

const CATEGORIES = [
  { value: "kahve_cekirdegi", label: "Kahve Çekirdeği" },
  { value: "sirop", label: "Sirop" },
  { value: "sut_urunleri", label: "Süt Ürünleri" },
  { value: "tatli", label: "Tatlı" },
  { value: "ambalaj", label: "Ambalaj" },
  { value: "diger", label: "Diğer" },
];

const BATCH_STATUSES = [
  { value: "planned", label: "Planlandı", color: "bg-gray-500" },
  { value: "in_progress", label: "Üretimde", color: "bg-blue-500" },
  { value: "completed", label: "Tamamlandı", color: "bg-green-500" },
  { value: "quality_check", label: "Kalite Kontrol", color: "bg-yellow-500" },
  { value: "approved", label: "Onaylandı", color: "bg-emerald-500" },
  { value: "rejected", label: "Reddedildi", color: "bg-red-500" },
];

const ORDER_STATUSES = [
  { value: "pending", label: "Bekliyor", color: "bg-gray-500" },
  { value: "confirmed", label: "Onaylandı", color: "bg-blue-500" },
  { value: "preparing", label: "Hazırlanıyor", color: "bg-yellow-500" },
  { value: "shipped", label: "Gönderildi", color: "bg-purple-500" },
  { value: "delivered", label: "Teslim Edildi", color: "bg-green-500" },
  { value: "cancelled", label: "İptal", color: "bg-red-500" },
];

function formatCurrency(value: number): string {
  return (value / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Fabrika() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);

  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    category: "kahve_cekirdegi",
    unit: "kg",
    unitPrice: 0,
    minStock: 0,
    description: ""
  });

  const [newBatch, setNewBatch] = useState({
    productId: 0,
    batchNumber: "",
    quantity: 0,
    unit: "kg",
    productionDate: new Date().toISOString().split('T')[0],
    expiryDate: "",
    notes: ""
  });

  const { data: products, isLoading: productsLoading } = useQuery<FactoryProduct[]>({
    queryKey: ["/api/factory/products"],
  });

  const { data: batches, isLoading: batchesLoading } = useQuery<ProductionBatch[]>({
    queryKey: ["/api/factory/batches"],
  });

  const { data: orders, isLoading: ordersLoading } = useQuery<BranchOrder[]>({
    queryKey: ["/api/factory/orders"],
  });

  const { data: inventory, isLoading: inventoryLoading } = useQuery<FactoryInventory[]>({
    queryKey: ["/api/factory/inventory"],
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: typeof newProduct) => {
      return apiRequest("POST", "/api/factory/products", {
        ...data,
        unitPrice: Math.round(data.unitPrice * 100)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/factory/products"] });
      setIsProductDialogOpen(false);
      setNewProduct({ name: "", sku: "", category: "kahve_cekirdegi", unit: "kg", unitPrice: 0, minStock: 0, description: "" });
      toast({ title: "Başarılı", description: "Ürün oluşturuldu" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Ürün oluşturulamadı", variant: "destructive" });
    },
  });

  const createBatchMutation = useMutation({
    mutationFn: async (data: typeof newBatch) => {
      return apiRequest("POST", "/api/factory/batches", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/factory/batches"] });
      setIsBatchDialogOpen(false);
      setNewBatch({ productId: 0, batchNumber: "", quantity: 0, unit: "kg", productionDate: new Date().toISOString().split('T')[0], expiryDate: "", notes: "" });
      toast({ title: "Başarılı", description: "Üretim partisi oluşturuldu" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Parti oluşturulamadı", variant: "destructive" });
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest("PATCH", `/api/factory/orders/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/factory/orders"] });
      toast({ title: "Başarılı", description: "Sipariş güncellendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Sipariş güncellenemedi", variant: "destructive" });
    },
  });

  const updateBatchMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest("PATCH", `/api/factory/batches/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/factory/batches"] });
      toast({ title: "Başarılı", description: "Parti durumu güncellendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Parti güncellenemedi", variant: "destructive" });
    },
  });

  const filteredProducts = products?.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  const pendingOrders = orders?.filter(o => o.status === "pending").length || 0;
  const activeBatches = batches?.filter(b => b.status === "in_progress").length || 0;
  const lowStockProducts = (inventory || []).filter(i => {
    const product = products?.find(p => p.id === i.productId);
    return product && i.quantity < product.minStock;
  }).length;

  const getStatusBadge = (status: string, statuses: typeof BATCH_STATUSES) => {
    const statusInfo = statuses.find(s => s.value === status);
    return statusInfo ? (
      <Badge className={`${statusInfo.color} text-white`}>{statusInfo.label}</Badge>
    ) : (
      <Badge variant="outline">{status}</Badge>
    );
  };

  const getProductName = (productId: number) => {
    return products?.find(p => p.id === productId)?.name || "Bilinmiyor";
  };

  if (!user || !['admin', 'fabrika', 'coach'].includes(user.role)) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Factory className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Fabrika Yönetimi</h1>
            <p className="text-sm text-muted-foreground">Üretim, stok ve sipariş takibi</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">
            <TrendingUp className="h-4 w-4 mr-2" />
            Özet
          </TabsTrigger>
          <TabsTrigger value="products" data-testid="tab-products">
            <Package className="h-4 w-4 mr-2" />
            Ürünler
          </TabsTrigger>
          <TabsTrigger value="batches" data-testid="tab-batches">
            <Layers className="h-4 w-4 mr-2" />
            Üretim
          </TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-orders">
            <Truck className="h-4 w-4 mr-2" />
            Siparişler
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Toplam Ürün
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{products?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Aktif ürün sayısı</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  Aktif Üretim
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeBatches}</div>
                <p className="text-xs text-muted-foreground">Devam eden üretim</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Truck className="h-4 w-4 text-yellow-500" />
                  Bekleyen Sipariş
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingOrders}</div>
                <p className="text-xs text-muted-foreground">İşlenmeyi bekliyor</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Düşük Stok
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{lowStockProducts}</div>
                <p className="text-xs text-muted-foreground">Kritik stok seviyesi</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Son Üretimler</CardTitle>
              </CardHeader>
              <CardContent>
                {batchesLoading ? (
                  <Skeleton className="h-32" />
                ) : batches && batches.length > 0 ? (
                  <div className="space-y-3">
                    {batches.slice(0, 5).map(batch => (
                      <div key={batch.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{batch.batchNumber}</p>
                          <p className="text-sm text-muted-foreground">{getProductName(batch.productId)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{batch.quantity} {batch.unit}</span>
                          {getStatusBadge(batch.status, BATCH_STATUSES)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Box} title="Üretim kaydı yok" description="Henüz üretim partisi oluşturulmamış." />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Son Siparişler</CardTitle>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <Skeleton className="h-32" />
                ) : orders && orders.length > 0 ? (
                  <div className="space-y-3">
                    {orders.slice(0, 5).map(order => (
                      <div key={order.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{order.orderNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{formatCurrency(order.totalAmount)} ₺</span>
                          {getStatusBadge(order.status, ORDER_STATUSES)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Truck} title="Sipariş yok" description="Henüz sipariş oluşturulmamış." />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ürün ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-products"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40" data-testid="select-category-filter">
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-product">
                  <Plus className="h-4 w-4 mr-2" />
                  Ürün Ekle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Yeni Ürün</DialogTitle>
                  <DialogDescription>Fabrika ürünü ekleyin</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Ürün Adı</Label>
                      <Input
                        id="name"
                        value={newProduct.name}
                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                        data-testid="input-product-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU</Label>
                      <Input
                        id="sku"
                        value={newProduct.sku}
                        onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                        data-testid="input-product-sku"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Kategori</Label>
                      <Select value={newProduct.category} onValueChange={(v) => setNewProduct({ ...newProduct, category: v })}>
                        <SelectTrigger data-testid="select-product-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unit">Birim</Label>
                      <Select value={newProduct.unit} onValueChange={(v) => setNewProduct({ ...newProduct, unit: v })}>
                        <SelectTrigger data-testid="select-product-unit">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">Kilogram (kg)</SelectItem>
                          <SelectItem value="lt">Litre (lt)</SelectItem>
                          <SelectItem value="adet">Adet</SelectItem>
                          <SelectItem value="paket">Paket</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="unitPrice">Birim Fiyat (₺)</Label>
                      <Input
                        id="unitPrice"
                        type="number"
                        step="0.01"
                        value={newProduct.unitPrice}
                        onChange={(e) => setNewProduct({ ...newProduct, unitPrice: parseFloat(e.target.value) || 0 })}
                        data-testid="input-product-price"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minStock">Min. Stok</Label>
                      <Input
                        id="minStock"
                        type="number"
                        value={newProduct.minStock}
                        onChange={(e) => setNewProduct({ ...newProduct, minStock: parseInt(e.target.value) || 0 })}
                        data-testid="input-product-minstock"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Açıklama</Label>
                    <Textarea
                      id="description"
                      value={newProduct.description}
                      onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                      data-testid="input-product-description"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsProductDialogOpen(false)}>İptal</Button>
                  <Button 
                    onClick={() => createProductMutation.mutate(newProduct)}
                    disabled={createProductMutation.isPending || !newProduct.name || !newProduct.sku}
                    data-testid="button-save-product"
                  >
                    Kaydet
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map(product => (
                <Card key={product.id} data-testid={`card-product-${product.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{product.name}</CardTitle>
                        <CardDescription>{product.sku}</CardDescription>
                      </div>
                      <Badge variant="outline">
                        {CATEGORIES.find(c => c.value === product.category)?.label || product.category}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Birim Fiyat:</span>
                      <span className="font-medium">{formatCurrency(product.unitPrice)} ₺/{product.unit}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-muted-foreground">Min. Stok:</span>
                      <span className="font-medium">{product.minStock} {product.unit}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">Ürün bulunamadı</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="batches" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-batch">
                  <Plus className="h-4 w-4 mr-2" />
                  Üretim Başlat
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Yeni Üretim Partisi</DialogTitle>
                  <DialogDescription>Üretim kaydı oluşturun</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="productId">Ürün</Label>
                    <Select value={newBatch.productId.toString()} onValueChange={(v) => setNewBatch({ ...newBatch, productId: parseInt(v) })}>
                      <SelectTrigger data-testid="select-batch-product">
                        <SelectValue placeholder="Ürün seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {products?.map(p => (
                          <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="batchNumber">Parti No</Label>
                      <Input
                        id="batchNumber"
                        value={newBatch.batchNumber}
                        onChange={(e) => setNewBatch({ ...newBatch, batchNumber: e.target.value })}
                        placeholder="BATCH-001"
                        data-testid="input-batch-number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Miktar</Label>
                      <Input
                        id="quantity"
                        type="number"
                        value={newBatch.quantity}
                        onChange={(e) => setNewBatch({ ...newBatch, quantity: parseInt(e.target.value) || 0 })}
                        data-testid="input-batch-quantity"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="productionDate">Üretim Tarihi</Label>
                      <Input
                        id="productionDate"
                        type="date"
                        value={newBatch.productionDate}
                        onChange={(e) => setNewBatch({ ...newBatch, productionDate: e.target.value })}
                        data-testid="input-batch-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiryDate">Son Kullanma Tarihi</Label>
                      <Input
                        id="expiryDate"
                        type="date"
                        value={newBatch.expiryDate}
                        onChange={(e) => setNewBatch({ ...newBatch, expiryDate: e.target.value })}
                        data-testid="input-batch-expiry"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notlar</Label>
                    <Textarea
                      id="notes"
                      value={newBatch.notes}
                      onChange={(e) => setNewBatch({ ...newBatch, notes: e.target.value })}
                      data-testid="input-batch-notes"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsBatchDialogOpen(false)}>İptal</Button>
                  <Button 
                    onClick={() => createBatchMutation.mutate(newBatch)}
                    disabled={createBatchMutation.isPending || !newBatch.productId || !newBatch.batchNumber}
                    data-testid="button-save-batch"
                  >
                    Kaydet
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {batchesLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : batches && batches.length > 0 ? (
            <div className="space-y-3">
              {batches.map(batch => (
                <Card key={batch.id} data-testid={`card-batch-${batch.id}`}>
                  <CardContent className="pt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Box className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{batch.batchNumber}</span>
                          {getStatusBadge(batch.status, BATCH_STATUSES)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {getProductName(batch.productId)} - {batch.quantity} {batch.unit}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Üretim: {new Date(batch.productionDate).toLocaleDateString('tr-TR')}
                          {batch.expiryDate && ` | SKT: ${new Date(batch.expiryDate).toLocaleDateString('tr-TR')}`}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {batch.status === "planned" && (
                          <Button 
                            size="sm" 
                            onClick={() => updateBatchMutation.mutate({ id: batch.id, status: "in_progress" })}
                            data-testid={`button-start-batch-${batch.id}`}
                          >
                            Başlat
                          </Button>
                        )}
                        {batch.status === "in_progress" && (
                          <Button 
                            size="sm" 
                            onClick={() => updateBatchMutation.mutate({ id: batch.id, status: "completed" })}
                            data-testid={`button-complete-batch-${batch.id}`}
                          >
                            Tamamla
                          </Button>
                        )}
                        {batch.status === "completed" && (
                          <Button 
                            size="sm" 
                            onClick={() => updateBatchMutation.mutate({ id: batch.id, status: "quality_check" })}
                            data-testid={`button-qc-batch-${batch.id}`}
                          >
                            Kalite Kontrole Gönder
                          </Button>
                        )}
                        {batch.status === "quality_check" && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateBatchMutation.mutate({ id: batch.id, status: "rejected" })}
                              data-testid={`button-reject-batch-${batch.id}`}
                            >
                              Reddet
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => updateBatchMutation.mutate({ id: batch.id, status: "approved" })}
                              data-testid={`button-approve-batch-${batch.id}`}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Onayla
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">Henüz üretim kaydı yok</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          {ordersLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : orders && orders.length > 0 ? (
            <div className="space-y-3">
              {orders.map(order => (
                <Card key={order.id} data-testid={`card-order-${order.id}`}>
                  <CardContent className="pt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{order.orderNumber}</span>
                          {getStatusBadge(order.status, ORDER_STATUSES)}
                          {order.priority === "urgent" && (
                            <Badge variant="destructive">Acil</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Sipariş: {new Date(order.createdAt).toLocaleDateString('tr-TR')}
                          {order.requestedDeliveryDate && ` | Talep: ${new Date(order.requestedDeliveryDate).toLocaleDateString('tr-TR')}`}
                        </p>
                        <p className="text-sm font-medium mt-1">{formatCurrency(order.totalAmount)} ₺</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {order.status === "pending" && (
                          <Button 
                            size="sm" 
                            onClick={() => updateOrderMutation.mutate({ id: order.id, status: "confirmed" })}
                            data-testid={`button-confirm-order-${order.id}`}
                          >
                            Onayla
                          </Button>
                        )}
                        {order.status === "confirmed" && (
                          <Button 
                            size="sm" 
                            onClick={() => updateOrderMutation.mutate({ id: order.id, status: "preparing" })}
                            data-testid={`button-prepare-order-${order.id}`}
                          >
                            Hazırlamaya Başla
                          </Button>
                        )}
                        {order.status === "preparing" && (
                          <Button 
                            size="sm" 
                            onClick={() => updateOrderMutation.mutate({ id: order.id, status: "shipped" })}
                            data-testid={`button-ship-order-${order.id}`}
                          >
                            Gönderildi
                          </Button>
                        )}
                        {order.status === "shipped" && (
                          <Button 
                            size="sm" 
                            onClick={() => updateOrderMutation.mutate({ id: order.id, status: "delivered" })}
                            data-testid={`button-deliver-order-${order.id}`}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Teslim Edildi
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">Henüz sipariş yok</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
