import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Package,
  Truck,
  Plus,
  Trash2,
  AlertTriangle,
  FileText,
  ArrowUpDown,
  ShoppingCart,
  MapPin,
  Edit,
  QrCode,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";

interface UrunKartiProps {
  productId: number;
  onBack: () => void;
}

interface ProductCardData {
  product: {
    id: number;
    code: string;
    name: string;
    category: string;
    unit: string;
    currentStock: string;
    minimumStock: string;
    maximumStock: string | null;
    unitCost: string;
    warehouseLocation: string | null;
    isActive: boolean;
  };
  suppliers: Array<{
    id: number;
    supplierId: number;
    unitPrice: string;
    leadTimeDays: number;
    isPrimary: boolean;
    preferenceOrder: number;
    supplierName: string;
    supplierCode: string;
    supplierStatus: string;
    paymentTerms: number | null;
    qualityScore: string | null;
    deliveryRate: string | null;
    contactPerson: string | null;
    phone: string | null;
    email: string | null;
  }>;
  priceHistory: Array<{
    id: number;
    price: string;
    createdAt: string;
  }>;
  quotes: Array<{
    id: number;
    supplierId: number;
    unitPrice: string;
    minimumOrderQuantity: string;
    leadTimeDays: number;
    validUntil: string | null;
    shippingCost: string;
    shippingResponsibility: string;
    paymentTermDays: number;
    status: string;
    createdAt: string;
  }>;
  issues: Array<{
    id: number;
    supplierId: number;
    issueType: string;
    severity: string;
    description: string;
    resolution: string | null;
    status: string;
    createdAt: string;
  }>;
  movementSummary: Array<{
    movementType: string;
    count: number;
    totalQuantity: string;
  }>;
  purchaseOrderHistory: Array<{
    poItemId: number;
    quantity: string;
    unitPrice: string;
    lineTotal: string;
    orderId: number;
    orderNumber: string;
    orderDate: string;
    orderStatus: string;
    supplierId: number;
  }>;
}

interface SupplierOption {
  id: number;
  name: string;
  code: string;
}

const categories: Record<string, string> = {
  hammadde: "Hammadde",
  yarimamul: "Yarı Mamul",
  mamul: "Mamul",
  ambalaj: "Ambalaj",
  ekipman: "Ekipman",
  sube_ekipman: "Şube Ekipman",
  sube_malzeme: "Şube Malzeme",
  konsantre: "Konsantre",
  donut: "Donut",
  tatli: "Tatlı",
  tuzlu: "Tuzlu",
  cay_grubu: "Çay Grubu",
  kahve: "Kahve",
  toz_topping: "Toz/Topping",
  sarf_malzeme: "Sarf Malzeme",
  temizlik: "Temizlik",
  diger: "Diğer",
};

const issueTypeLabels: Record<string, string> = {
  kalite: "Kalite",
  teslimat_gecikmesi: "Teslimat Gecikmesi",
  adet_eksik: "Adet Eksik",
  hasar: "Hasar",
  yanlis_urun: "Yanlış Ürün",
  diger: "Diğer",
};

const severityLabels: Record<string, string> = {
  dusuk: "Düşük",
  orta: "Orta",
  yuksek: "Yüksek",
  kritik: "Kritik",
};

const movementTypeLabels: Record<string, string> = {
  giris: "Giriş",
  cikis: "Çıkış",
  sayim_duzeltme: "Sayım Düzeltme",
  fire: "Fire",
  iade: "İade",
  mal_kabul: "Mal Kabul",
  uretim_giris: "Üretimden Giriş",
  uretim_cikis: "Üretime Çıkış",
};

const orderStatusLabels: Record<string, string> = {
  taslak: "Taslak",
  onay_bekliyor: "Onay Bekliyor",
  onaylandi: "Onaylandı",
  siparis_verildi: "Sipariş Verildi",
  kismen_teslim: "Kısmen Teslim",
  tamamlandi: "Tamamlandı",
  iptal: "İptal",
};

const issueStatusLabels: Record<string, string> = {
  acik: "Açık",
  inceleniyor: "İnceleniyor",
  cozuldu: "Çözüldü",
  kapandi: "Kapandı",
};

export default function UrunKarti({ productId, onBack }: UrunKartiProps) {
  const { toast } = useToast();
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isAddQuoteOpen, setIsAddQuoteOpen] = useState(false);
  const [isReportIssueOpen, setIsReportIssueOpen] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);

  const [newSupplierForm, setNewSupplierForm] = useState({
    supplierId: "",
    unitPrice: "",
    minimumOrderQuantity: "1",
    leadTimeDays: "3",
    isPrimary: false,
  });

  const [newQuoteForm, setNewQuoteForm] = useState({
    supplierId: "",
    unitPrice: "",
    minimumOrderQuantity: "1",
    leadTimeDays: "3",
    shippingCost: "0",
    paymentTermDays: "30",
    validUntil: "",
    notes: "",
  });

  const [newIssueForm, setNewIssueForm] = useState({
    supplierId: "",
    issueType: "",
    severity: "orta",
    description: "",
  });

  const { data: cardData, isLoading, isError, refetch } = useQuery<ProductCardData>({
    queryKey: ['/api/inventory', productId, 'card'],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/${productId}/card`);
      if (!res.ok) throw new Error("Failed to fetch product card");
      return res.json();
    },
  });

  const { data: allSuppliers } = useQuery<SupplierOption[]>({
    queryKey: ['/api/suppliers'],
    queryFn: async () => {
      const res = await fetch("/api/suppliers");
      if (!res.ok) throw new Error("Failed to fetch suppliers");
      return res.json();
    },
  });

  const { data: movements } = useQuery<Array<{
    id: number;
    movementType: string;
    quantity: string;
    notes: string | null;
    createdAt: string;
    previousStock: string;
    newStock: string;
  }>>({
    queryKey: ['/api/inventory', productId, 'movements'],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/${productId}/movements`);
      if (!res.ok) throw new Error("Failed to fetch movements");
      return res.json();
    },
  });

  const addSupplierMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/inventory/${productId}/suppliers`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory', productId, 'card'] });
      setIsAddSupplierOpen(false);
      setNewSupplierForm({ supplierId: "", unitPrice: "", minimumOrderQuantity: "1", leadTimeDays: "3", isPrimary: false });
      toast({ title: "Tedarikçi eklendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Tedarikçi eklenemedi", variant: "destructive" });
    },
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/product-suppliers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory', productId, 'card'] });
      toast({ title: "Tedarikçi bağlantısı silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Tedarikçi silinemedi", variant: "destructive" });
    },
  });

  const addQuoteMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/supplier-quotes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory', productId, 'card'] });
      setIsAddQuoteOpen(false);
      setNewQuoteForm({ supplierId: "", unitPrice: "", minimumOrderQuantity: "1", leadTimeDays: "3", shippingCost: "0", paymentTermDays: "30", validUntil: "", notes: "" });
      toast({ title: "Teklif talebi oluşturuldu" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Teklif oluşturulamadı", variant: "destructive" });
    },
  });

  const reportIssueMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/supplier-issues", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory', productId, 'card'] });
      setIsReportIssueOpen(false);
      setNewIssueForm({ supplierId: "", issueType: "", severity: "orta", description: "" });
      toast({ title: "Sorun bildirimi oluşturuldu" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Sorun bildirimi oluşturulamadı", variant: "destructive" });
    },
  });

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierForm.supplierId || !newSupplierForm.unitPrice) {
      toast({ title: "Hata", description: "Tedarikçi ve birim fiyat zorunludur", variant: "destructive" });
      return;
    }
    addSupplierMutation.mutate({
      supplierId: parseInt(newSupplierForm.supplierId),
      unitPrice: newSupplierForm.unitPrice,
      minimumOrderQuantity: newSupplierForm.minimumOrderQuantity,
      leadTimeDays: parseInt(newSupplierForm.leadTimeDays),
      isPrimary: newSupplierForm.isPrimary,
    });
  };

  const handleAddQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuoteForm.supplierId || !newQuoteForm.unitPrice) {
      toast({ title: "Hata", description: "Tedarikçi ve fiyat zorunludur", variant: "destructive" });
      return;
    }
    addQuoteMutation.mutate({
      inventoryId: productId,
      supplierId: parseInt(newQuoteForm.supplierId),
      unitPrice: newQuoteForm.unitPrice,
      minimumOrderQuantity: newQuoteForm.minimumOrderQuantity,
      leadTimeDays: parseInt(newQuoteForm.leadTimeDays),
      shippingCost: newQuoteForm.shippingCost,
      paymentTermDays: parseInt(newQuoteForm.paymentTermDays),
      validUntil: newQuoteForm.validUntil ? new Date(newQuoteForm.validUntil).toISOString() : null,
      notes: newQuoteForm.notes || null,
      status: "aktif",
    });
  };

  const handleReportIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIssueForm.supplierId || !newIssueForm.issueType || !newIssueForm.description) {
      toast({ title: "Hata", description: "Tedarikçi, sorun tipi ve açıklama zorunludur", variant: "destructive" });
      return;
    }
    reportIssueMutation.mutate({
      inventoryId: productId,
      supplierId: parseInt(newIssueForm.supplierId),
      issueType: newIssueForm.issueType,
      severity: newIssueForm.severity,
      description: newIssueForm.description,
      status: "acik",
    });
  };

  if (isLoading) {
    
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!cardData) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Geri Don
        </Button>
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Ürün bulunamadı</p>
        </div>
      </div>
    );
  }

  const { product, suppliers: productSuppliers, quotes, issues, purchaseOrderHistory } = cardData;

  const currentStock = parseFloat(product.currentStock);
  const minStock = parseFloat(product.minimumStock);
  const stockRatio = minStock > 0 ? currentStock / minStock : currentStock > 0 ? 2 : 0;

  let stockColor = "text-green-600 dark:text-green-400";
  let stockBg = "bg-green-500/10";
  let stockLabel = "Normal";
  if (currentStock <= 0) {
    stockColor = "text-red-600 dark:text-red-400";
    stockBg = "bg-red-500/10";
    stockLabel = "Stok Yok";
  } else if (stockRatio <= 1) {
    stockColor = "text-red-600 dark:text-red-400";
    stockBg = "bg-red-500/10";
    stockLabel = "Düşük Stok";
  } else if (stockRatio <= 1.5) {
    stockColor = "text-yellow-600 dark:text-yellow-400";
    stockBg = "bg-yellow-500/10";
    stockLabel = "Uyarı";
  }

  const supplierChartData = productSuppliers
    .filter((s) => s.unitPrice)
    .map((s) => ({
      name: s.supplierName || s.supplierCode,
      fiyat: parseFloat(s.unitPrice),
    }));

  const supplierNameMap: Record<number, string> = {};
  if (allSuppliers) {
    allSuppliers.forEach((s: any) => {
      supplierNameMap[s.id] = s.name;
    });
  }
  productSuppliers.forEach((s) => {
    supplierNameMap[s.supplierId] = s.supplierName;
  });

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} data-testid="button-back">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Geri Don
      </Button>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold" data-testid="text-product-name">{product.name}</h2>
                <Badge variant="outline" data-testid="badge-category">
                  {categories[product.category] || product.category}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="font-mono" data-testid="text-product-code">{product.code}</span>
                <span data-testid="text-product-unit">Birim: {product.unit}</span>
                {product.warehouseLocation && (
                  <span className="flex items-center gap-1" data-testid="text-warehouse-location">
                    <MapPin className="h-3 w-3" />
                    {product.warehouseLocation}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${stockBg} text-center min-w-[120px]`}>
                <p className={`text-2xl font-bold ${stockColor}`} data-testid="text-current-stock">
                  {currentStock.toLocaleString("tr-TR")}
                </p>
                <p className="text-xs text-muted-foreground">{product.unit}</p>
                <Badge
                  variant={stockRatio <= 1 ? "destructive" : stockRatio <= 1.5 ? "secondary" : "outline"}
                  className="mt-1"
                  data-testid="badge-stock-status"
                >
                  {stockLabel}
                </Badge>
              </div>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowQrCode(!showQrCode)}
                  data-testid="button-toggle-qr"
                >
                  <QrCode className="h-4 w-4" />
                </Button>
                {showQrCode && (
                  <Card className="absolute right-0 top-full mt-2 z-50 w-[240px] shadow-lg">
                    <CardContent className="p-3 flex flex-col items-center gap-2">
                      <p className="text-sm font-medium text-center">{product.name}</p>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/urun-karti/${productId}`)}`}
                        alt="QR Kod"
                        className="w-[180px] h-[180px] rounded"
                        data-testid="img-product-qr"
                      />
                      <p className="text-xs text-muted-foreground">/urun-karti/{productId}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
              <Button variant="outline" data-testid="button-edit-product">
                <Edit className="h-4 w-4 mr-2" />
                Duzenle
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="tedarikci" className="w-full">
        <TabsList className="w-full flex flex-wrap" data-testid="tabs-list">
          <TabsTrigger value="tedarikci" data-testid="tab-suppliers">
            <Truck className="h-4 w-4 mr-1" />
            Tedarikciler
          </TabsTrigger>
          <TabsTrigger value="fiyat" data-testid="tab-price-history">
            <FileText className="h-4 w-4 mr-1" />
            Fiyat Gecmisi
          </TabsTrigger>
          <TabsTrigger value="sorunlar" data-testid="tab-issues">
            <AlertTriangle className="h-4 w-4 mr-1" />
            Sorunlar
          </TabsTrigger>
          <TabsTrigger value="hareketler" data-testid="tab-movements">
            <ArrowUpDown className="h-4 w-4 mr-1" />
            Stok Hareketleri
          </TabsTrigger>
          <TabsTrigger value="siparisler" data-testid="tab-orders">
            <ShoppingCart className="h-4 w-4 mr-1" />
            Siparis Gecmisi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tedarikci" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 pt-3 px-4">
              <CardTitle className="text-sm">Tedarikçiler ({productSuppliers.length})</CardTitle>
              <Button size="sm" onClick={() => setIsAddSupplierOpen(true)} data-testid="button-add-supplier">
                <Plus className="h-4 w-4 mr-1" />
                Tedarikçi Ekle
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tedarikçi</TableHead>
                    <TableHead className="text-right">Birim Fiyat (TL)</TableHead>
                    <TableHead className="text-right">Min. Sipariş</TableHead>
                    <TableHead className="text-right">Tedarik Süresi (gün)</TableHead>
                    <TableHead className="text-right">Ödeme Vadesi (gün)</TableHead>
                    <TableHead className="text-right">Kalite Skoru</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productSuppliers.length > 0 ? (
                    productSuppliers.map((s) => (
                      <TableRow key={s.id} data-testid={`supplier-row-${s.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{s.supplierName}</p>
                            <p className="text-xs text-muted-foreground">{s.supplierCode}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {parseFloat(s.unitPrice).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">-</TableCell>
                        <TableCell className="text-right">{s.leadTimeDays}</TableCell>
                        <TableCell className="text-right">{s.paymentTerms || "-"}</TableCell>
                        <TableCell className="text-right">
                          {s.qualityScore ? parseFloat(s.qualityScore).toFixed(1) : "-"}
                        </TableCell>
                        <TableCell>
                          {s.isPrimary ? (
                            <Badge variant="default" data-testid={`badge-primary-${s.id}`}>Birincil</Badge>
                          ) : (
                            <Badge variant="secondary" data-testid={`badge-secondary-${s.id}`}>Yedek</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteSupplierMutation.mutate(s.id)}
                            disabled={deleteSupplierMutation.isPending}
                            data-testid={`button-delete-supplier-${s.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Bu urun icin tedarikci tanimli degil
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fiyat" className="mt-4 space-y-4">
          {supplierChartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm">Tedarikçi Fiyat Karşılaştırması</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64" data-testid="chart-price-comparison">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={supplierChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip
                        formatter={(value: number) => [`${value.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`, "Fiyat"]}
                      />
                      <Bar dataKey="fiyat" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 pt-3 px-4">
              <CardTitle className="text-sm">Tedarikçi Teklifleri ({quotes.length})</CardTitle>
              <Button size="sm" onClick={() => setIsAddQuoteOpen(true)} data-testid="button-add-quote">
                <Plus className="h-4 w-4 mr-1" />
                Yeni Teklif Al
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tedarikci</TableHead>
                    <TableHead className="text-right">Fiyat (TL)</TableHead>
                    <TableHead className="text-right">Min. Sipariş</TableHead>
                    <TableHead className="text-right">Tedarik Suresi</TableHead>
                    <TableHead className="text-right">Kargo Ucreti</TableHead>
                    <TableHead className="text-right">Vade (gun)</TableHead>
                    <TableHead>Gecerlilik</TableHead>
                    <TableHead>Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.length > 0 ? (
                    quotes.map((q) => (
                      <TableRow key={q.id} data-testid={`quote-row-${q.id}`}>
                        <TableCell className="font-medium">
                          {supplierNameMap[q.supplierId] || `#${q.supplierId}`}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {parseFloat(q.unitPrice).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          {q.minimumOrderQuantity ? parseFloat(q.minimumOrderQuantity).toLocaleString("tr-TR") : "-"}
                        </TableCell>
                        <TableCell className="text-right">{q.leadTimeDays} gun</TableCell>
                        <TableCell className="text-right font-mono">
                          {q.shippingCost ? parseFloat(q.shippingCost).toLocaleString("tr-TR", { minimumFractionDigits: 2 }) : "0,00"}
                        </TableCell>
                        <TableCell className="text-right">{q.paymentTermDays}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {q.validUntil ? new Date(q.validUntil).toLocaleDateString("tr-TR") : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={q.status === "aktif" ? "default" : "outline"}>
                            {q.status === "aktif" ? "Aktif" : q.status === "suresi_doldu" ? "Süresi Doldu" : q.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Henuz teklif kaydi yok
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sorunlar" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 pt-3 px-4">
              <CardTitle className="text-sm">Sorunlar ({issues.length})</CardTitle>
              <Button size="sm" onClick={() => setIsReportIssueOpen(true)} data-testid="button-report-issue">
                <Plus className="h-4 w-4 mr-1" />
                Sorun Bildir
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Tedarikci</TableHead>
                    <TableHead>Sorun Tipi</TableHead>
                    <TableHead>Onem</TableHead>
                    <TableHead>Aciklama</TableHead>
                    <TableHead>Cozum</TableHead>
                    <TableHead>Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues.length > 0 ? (
                    issues.map((issue) => (
                      <TableRow key={issue.id} data-testid={`issue-row-${issue.id}`}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(issue.createdAt).toLocaleDateString("tr-TR")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {supplierNameMap[issue.supplierId] || `#${issue.supplierId}`}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {issueTypeLabels[issue.issueType] || issue.issueType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              issue.severity === "kritik" || issue.severity === "yuksek"
                                ? "destructive"
                                : issue.severity === "orta"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {severityLabels[issue.severity] || issue.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{issue.description}</TableCell>
                        <TableCell className="max-w-[150px] truncate text-muted-foreground">
                          {issue.resolution || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={issue.status === "cozuldu" || issue.status === "kapandi" ? "outline" : "default"}>
                            {issueStatusLabels[issue.status] || issue.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Henuz sorun bildirimi yok
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hareketler" className="mt-4">
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm">Son Stok Hareketleri</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Hareket Tipi</TableHead>
                    <TableHead className="text-right">Miktar</TableHead>
                    <TableHead>Aciklama</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements && movements.length > 0 ? (
                    movements.map((m) => {
                      const isIncoming = ["giris", "mal_kabul", "iade", "uretim_giris"].includes(m.movementType);
                      return (
                        <TableRow key={m.id} data-testid={`movement-row-${m.id}`}>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {new Date(m.createdAt).toLocaleDateString("tr-TR")}
                          </TableCell>
                          <TableCell>
                            <Badge variant={isIncoming ? "default" : "secondary"}>
                              {movementTypeLabels[m.movementType] || m.movementType}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-mono font-medium ${isIncoming ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                            {isIncoming ? "+" : "-"}{parseFloat(m.quantity).toLocaleString("tr-TR")}
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-[250px] truncate">
                            {m.notes || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Henüz stok hareketi yok
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="siparisler" className="mt-4">
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm">Sipariş Geçmişi ({purchaseOrderHistory.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sipariş No</TableHead>
                    <TableHead>Tedarikci</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead className="text-right">Miktar</TableHead>
                    <TableHead className="text-right">Birim Fiyat (TL)</TableHead>
                    <TableHead className="text-right">Toplam (TL)</TableHead>
                    <TableHead>Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrderHistory.length > 0 ? (
                    purchaseOrderHistory.map((po) => (
                      <TableRow key={po.poItemId} data-testid={`order-row-${po.poItemId}`}>
                        <TableCell className="font-mono text-sm" data-testid={`order-number-${po.poItemId}`}>
                          {po.orderNumber}
                        </TableCell>
                        <TableCell className="font-medium">
                          {supplierNameMap[po.supplierId] || `#${po.supplierId}`}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {po.orderDate ? new Date(po.orderDate).toLocaleDateString("tr-TR") : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {parseFloat(po.quantity).toLocaleString("tr-TR")}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {parseFloat(po.unitPrice).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {parseFloat(po.lineTotal).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              po.orderStatus === "tamamlandi"
                                ? "outline"
                                : po.orderStatus === "iptal"
                                  ? "destructive"
                                  : "default"
                            }
                          >
                            {orderStatusLabels[po.orderStatus] || po.orderStatus}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Henuz siparis gecmisi yok
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tedarikci Ekle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSupplier} className="space-y-4">
            <div className="space-y-2">
              <Label>Tedarikci</Label>
              <Select value={newSupplierForm.supplierId} onValueChange={(v) => setNewSupplierForm((p) => ({ ...p, supplierId: v }))}>
                <SelectTrigger data-testid="select-supplier">
                  <SelectValue placeholder="Tedarikçi seçin" />
                </SelectTrigger>
                <SelectContent>
                  {allSuppliers?.map((s: any) => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.name} ({s.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Birim Fiyat (TL)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newSupplierForm.unitPrice}
                  onChange={(e) => setNewSupplierForm((p) => ({ ...p, unitPrice: e.target.value }))}
                  required
                  data-testid="input-supplier-price"
                />
              </div>
              <div className="space-y-2">
                <Label>Min. Siparis Miktari</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={newSupplierForm.minimumOrderQuantity}
                  onChange={(e) => setNewSupplierForm((p) => ({ ...p, minimumOrderQuantity: e.target.value }))}
                  data-testid="input-supplier-moq"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tedarik Suresi (gun)</Label>
                <Input
                  type="number"
                  value={newSupplierForm.leadTimeDays}
                  onChange={(e) => setNewSupplierForm((p) => ({ ...p, leadTimeDays: e.target.value }))}
                  data-testid="input-supplier-lead-time"
                />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newSupplierForm.isPrimary}
                    onChange={(e) => setNewSupplierForm((p) => ({ ...p, isPrimary: e.target.checked }))}
                    data-testid="checkbox-is-primary"
                  />
                  <span className="text-sm">Birincil Tedarikçi</span>
                </label>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={addSupplierMutation.isPending} data-testid="button-submit-supplier">
              {addSupplierMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddQuoteOpen} onOpenChange={setIsAddQuoteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Teklif Al</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddQuote} className="space-y-4">
            <div className="space-y-2">
              <Label>Tedarikci</Label>
              <Select value={newQuoteForm.supplierId} onValueChange={(v) => setNewQuoteForm((p) => ({ ...p, supplierId: v }))}>
                <SelectTrigger data-testid="select-quote-supplier">
                  <SelectValue placeholder="Tedarikçi seçin" />
                </SelectTrigger>
                <SelectContent>
                  {allSuppliers?.map((s: any) => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.name} ({s.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Birim Fiyat (TL)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newQuoteForm.unitPrice}
                  onChange={(e) => setNewQuoteForm((p) => ({ ...p, unitPrice: e.target.value }))}
                  required
                  data-testid="input-quote-price"
                />
              </div>
              <div className="space-y-2">
                <Label>Min. Siparis</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={newQuoteForm.minimumOrderQuantity}
                  onChange={(e) => setNewQuoteForm((p) => ({ ...p, minimumOrderQuantity: e.target.value }))}
                  data-testid="input-quote-moq"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tedarik Suresi (gun)</Label>
                <Input
                  type="number"
                  value={newQuoteForm.leadTimeDays}
                  onChange={(e) => setNewQuoteForm((p) => ({ ...p, leadTimeDays: e.target.value }))}
                  data-testid="input-quote-lead-time"
                />
              </div>
              <div className="space-y-2">
                <Label>Kargo Ucreti (TL)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newQuoteForm.shippingCost}
                  onChange={(e) => setNewQuoteForm((p) => ({ ...p, shippingCost: e.target.value }))}
                  data-testid="input-quote-shipping"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Odeme Vadesi (gun)</Label>
                <Input
                  type="number"
                  value={newQuoteForm.paymentTermDays}
                  onChange={(e) => setNewQuoteForm((p) => ({ ...p, paymentTermDays: e.target.value }))}
                  data-testid="input-quote-payment-term"
                />
              </div>
              <div className="space-y-2">
                <Label>Gecerlilik Tarihi</Label>
                <Input
                  type="date"
                  value={newQuoteForm.validUntil}
                  onChange={(e) => setNewQuoteForm((p) => ({ ...p, validUntil: e.target.value }))}
                  data-testid="input-quote-valid-until"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Not</Label>
              <Textarea
                value={newQuoteForm.notes}
                onChange={(e) => setNewQuoteForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Ek bilgi"
                data-testid="input-quote-notes"
              />
            </div>
            <Button type="submit" className="w-full" disabled={addQuoteMutation.isPending} data-testid="button-submit-quote">
              {addQuoteMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isReportIssueOpen} onOpenChange={setIsReportIssueOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sorun Bildir</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReportIssue} className="space-y-4">
            <div className="space-y-2">
              <Label>Tedarikci</Label>
              <Select value={newIssueForm.supplierId} onValueChange={(v) => setNewIssueForm((p) => ({ ...p, supplierId: v }))}>
                <SelectTrigger data-testid="select-issue-supplier">
                  <SelectValue placeholder="Tedarikçi seçin" />
                </SelectTrigger>
                <SelectContent>
                  {allSuppliers?.map((s: any) => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.name} ({s.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sorun Tipi</Label>
                <Select value={newIssueForm.issueType} onValueChange={(v) => setNewIssueForm((p) => ({ ...p, issueType: v }))}>
                  <SelectTrigger data-testid="select-issue-type">
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kalite">Kalite</SelectItem>
                    <SelectItem value="teslimat_gecikmesi">Teslimat Gecikmesi</SelectItem>
                    <SelectItem value="adet_eksik">Adet Eksik</SelectItem>
                    <SelectItem value="hasar">Hasar</SelectItem>
                    <SelectItem value="yanlis_urun">Yanlış Ürün</SelectItem>
                    <SelectItem value="diger">Diğer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Önem Derecesi</Label>
                <Select value={newIssueForm.severity} onValueChange={(v) => setNewIssueForm((p) => ({ ...p, severity: v }))}>
                  <SelectTrigger data-testid="select-issue-severity">
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dusuk">Düşük</SelectItem>
                    <SelectItem value="orta">Orta</SelectItem>
                    <SelectItem value="yuksek">Yüksek</SelectItem>
                    <SelectItem value="kritik">Kritik</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Aciklama</Label>
              <Textarea
                value={newIssueForm.description}
                onChange={(e) => setNewIssueForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Sorun detayi..."
                required
                data-testid="input-issue-description"
              />
            </div>
            <Button type="submit" className="w-full" disabled={reportIssueMutation.isPending} data-testid="button-submit-issue">
              {reportIssueMutation.isPending ? "Kaydediliyor..." : "Bildir"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
