import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompactKPIStrip, type KPIItem } from "@/components/shared/UnifiedKPI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  Users, 
  ShoppingCart, 
  AlertTriangle,
  Beaker,
  Boxes,
  ArrowUpDown,
  Star,
  Clock,
  Truck,
  RefreshCw,
  FileWarning,
  PackageX,
  QrCode,
  X,
  CheckCircle2,
  Loader2,
  Building2
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Html5Qrcode } from "html5-qrcode";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";

interface DashboardData {
  totalSuppliers: number;
  pendingOrders: number;
  lowStockAlerts: number;
  recentReceipts: number;
  totalInventoryItems: number;
  totalRawMaterials: number;
}

interface PendingOrder {
  id: number;
  orderNumber: string;
  totalAmount: string;
  orderDate: string;
  supplier: {
    name: string;
  } | null;
}

interface LowStockItem {
  id: number;
  name: string;
  code: string;
  currentStock: string;
  minimumStock: string;
  unit: string;
  category: string;
}

interface SupplierPerformance {
  id: number;
  name: string;
  performanceScore: string;
  onTimeDeliveryRate: string;
  status: string;
}

interface StaleQuoteItem {
  id: number;
  name: string;
  code: string;
  category: string;
  unitCost: string;
  unit: string;
  lastQuoteDate: string | null;
  daysSinceQuote: number | null;
  suppliers: { supplierName: string; unitPrice: string }[];
}

interface CriticalStockItem {
  id: number;
  name: string;
  code: string;
  currentStock: string;
  minimumStock: string;
  unit: string;
  category: string;
}

const categoryLabels: Record<string, string> = {
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

interface QRFoundProduct {
  id: number;
  code: string;
  name: string;
  category: string;
  unit: string;
  current_stock: string;
}

interface Branch {
  id: number;
  name: string;
  isActive: boolean;
}

const HQ_ROLES = ["admin", "ceo", "cgo", "satinalma", "muhasebe"];

export default function SatinalmaDashboard() {
  const [staleDialogOpen, setStaleDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrScanning, setQrScanning] = useState(false);
  const [qrProcessing, setQrProcessing] = useState(false);
  const [qrFoundProduct, setQrFoundProduct] = useState<QRFoundProduct | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const qrProcessedRef = useRef(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const isHqRole = user && HQ_ROLES.includes(user.role);

  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (!qrDialogOpen) {
      stopQrScanner();
      qrProcessedRef.current = false;
      setQrProcessing(false);
      setQrFoundProduct(null);
    }
  }, [qrDialogOpen]);

  const stopQrScanner = async () => {
    try {
      if (qrScannerRef.current) {
        await qrScannerRef.current.stop();
        qrScannerRef.current = null;
      }
    } catch {}
    setQrScanning(false);
  };

  const startQrScanner = async () => {
    try {
      qrProcessedRef.current = false;
      setQrFoundProduct(null);
      setQrScanning(true);
      await new Promise(resolve => setTimeout(resolve, 100));
      const html5QrCode = new Html5Qrcode("satinalma-qr-reader");
      qrScannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          if (qrProcessedRef.current) return;
          qrProcessedRef.current = true;
          setQrProcessing(true);
          await stopQrScanner();
          await handleQrResult(decodedText);
        },
        () => {}
      );
    } catch {
      toast({
        title: "Kamera Hatası",
        description: "Kameraya erişilemedi. Lütfen izinleri kontrol edin.",
        variant: "destructive",
      });
      setQrScanning(false);
    }
  };

  const handleQrResult = async (qrData: string) => {
    try {
      const trimmed = qrData.trim();
      let qrCode = trimmed;
      if (trimmed.startsWith("INV-")) {
        qrCode = trimmed;
      } else if (trimmed.match(/\/inventory\/(\d+)/i) || trimmed.match(/\/envanter\/(\d+)/i) || trimmed.match(/\/stok\/(\d+)/i)) {
        const match = trimmed.match(/\/(?:inventory|envanter|stok)\/(\d+)/i);
        if (match) qrCode = match[1];
      } else if (trimmed.match(/\/urun-karti\/(\d+)/i)) {
        const match = trimmed.match(/\/urun-karti\/(\d+)/i);
        if (match) {
          const productId = parseInt(match[1]);
          setQrProcessing(false);
          setQrDialogOpen(false);
          window.location.href = `/satinalma/stok-yonetimi?productId=${productId}`;
          return;
        }
      }

      const res = await fetch(`/api/inventory/qr/${encodeURIComponent(qrCode)}`);
      if (!res.ok) {
        toast({
          title: "Ürün Bulunamadı",
          description: "Bu QR koda ait ürün bulunamadı.",
          variant: "destructive",
        });
        qrProcessedRef.current = false;
        setQrProcessing(false);
        return;
      }

      const product = await res.json();
      setQrFoundProduct(product);
      setQrProcessing(false);
      toast({
        title: "Ürün Bulundu",
        description: `${product.name} (${product.code})`,
      });
    } catch {
      toast({
        title: "Hata",
        description: "QR kod işleme sırasında hata oluştu.",
        variant: "destructive",
      });
      qrProcessedRef.current = false;
      setQrProcessing(false);
    }
  };

  const navigateToProduct = (productId: number) => {
    setQrDialogOpen(false);
    window.location.href = `/satinalma/stok-yonetimi?productId=${productId}`;
  };

  const { data: branchesList, isError, refetch, isLoading } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    enabled: !!isHqRole,
  });

  const dashboardQueryParam = selectedBranchId !== "all" ? `?branchId=${selectedBranchId}` : "";
  const { data, isLoading: dashboardLoading } = useQuery<DashboardData>({
    queryKey: ["/api/satinalma/dashboard", selectedBranchId],
    queryFn: async () => {
      const res = await fetch(`/api/satinalma/dashboard${dashboardQueryParam}`);
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return res.json();
    },
  });

  const { data: pendingOrders, isLoading: pendingLoading } = useQuery<PendingOrder[]>({
    queryKey: ['/api/purchase-orders', 'onay_bekliyor'],
    queryFn: async () => {
      const res = await fetch('/api/purchase-orders?status=onay_bekliyor');
      if (!res.ok) throw new Error('Failed to fetch pending orders');
      return res.json();
    },
  });

  const { data: lowStockItems, isLoading: lowStockLoading } = useQuery<LowStockItem[]>({
    queryKey: ['/api/inventory', 'alerts', 'low-stock'],
    queryFn: async () => {
      const res = await fetch('/api/inventory/alerts/low-stock');
      if (!res.ok) throw new Error('Failed to fetch low stock alerts');
      return res.json();
    },
  });

  const { data: allSuppliers, isLoading: suppliersLoading } = useQuery<SupplierPerformance[]>({
    queryKey: ['/api/suppliers', 'performance'],
    queryFn: async () => {
      const res = await fetch('/api/suppliers');
      if (!res.ok) throw new Error('Failed to fetch suppliers');
      const data = await res.json();
      return data
        .filter((s: SupplierPerformance) => s.status === 'aktif')
        .sort((a: SupplierPerformance, b: SupplierPerformance) => 
          parseFloat(b.performanceScore || '0') - parseFloat(a.performanceScore || '0')
        )
        .slice(0, 5);
    },
  });

  const { data: staleQuotes } = useQuery<StaleQuoteItem[]>({
    queryKey: ['/api/satinalma/stale-quotes'],
  });

  const { data: criticalStock } = useQuery<CriticalStockItem[]>({
    queryKey: ['/api/satinalma/critical-stock'],
  });

  const updatePricesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/satinalma/update-prices-from-quotes');
      return res.json();
    },
    onSuccess: (data: { updatedCount: number; message: string }) => {
      toast({
        title: "Fiyatlar Güncellendi",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/satinalma/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/satinalma/stale-quotes'] });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Fiyat güncellemesi sırasında bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-1 pt-3 px-3">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <Skeleton className="h-6 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-1 pt-3 px-3">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const metrics = [
    {
      title: "Toplam Stok Kalemi",
      value: data?.totalInventoryItems || 0,
      icon: Boxes,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      title: "Hammadde Kalemi",
      value: data?.totalRawMaterials || 0,
      icon: Beaker,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
    {
      title: "Aktif Tedarikçi",
      value: data?.totalSuppliers || 0,
      icon: Users,
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    {
      title: "Bekleyen Sipariş",
      value: data?.pendingOrders || 0,
      icon: ShoppingCart,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10"
    },
    {
      title: "Düşük Stok Uyarısı",
      value: data?.lowStockAlerts || 0,
      icon: AlertTriangle,
      color: data?.lowStockAlerts && data.lowStockAlerts > 0 ? "text-red-500" : "text-muted-foreground",
      bgColor: data?.lowStockAlerts && data.lowStockAlerts > 0 ? "bg-red-500/10" : "bg-muted"
    }
  ];

  return (
    <div className="space-y-3">
      {isHqRole && (
        <div className="flex items-center gap-2 flex-wrap">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
            <SelectTrigger className="w-[220px]" data-testid="select-branch-filter">
              <SelectValue placeholder="Şube Filtrele" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" data-testid="select-branch-all">Tüm Şubeler</SelectItem>
              {branchesList?.filter(b => b.isActive).map((branch) => (
                <SelectItem key={branch.id} value={branch.id.toString()} data-testid={`select-branch-${branch.id}`}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedBranchId !== "all" && (
            <Badge variant="secondary" className="text-xs" data-testid="badge-branch-active-filter">
              {branchesList?.find(b => b.id.toString() === selectedBranchId)?.name}
            </Badge>
          )}
        </div>
      )}

      <CompactKPIStrip
        items={metrics.map((metric): KPIItem => ({
          label: metric.title,
          value: metric.value,
          icon: <metric.icon className={`h-4 w-4 ${metric.color}`} />,
          color: metric.color.includes('red') ? 'danger' : metric.color.includes('orange') ? 'warning' : metric.color.includes('green') ? 'success' : metric.color.includes('blue') ? 'info' : 'default',
        }))}
        desktopColumns={5}
        desktopRenderer={
          <div className="grid grid-cols-3 lg:grid-cols-5 gap-2">
            {metrics.map((metric, index) => (
              <Card key={index} data-testid={`metric-card-${index}`}>
                <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3 gap-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    {metric.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                    <metric.icon className={`h-3.5 w-3.5 ${metric.color}`} />
                  </div>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="text-lg font-bold" data-testid={`metric-value-${index}`}>{metric.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        }
      />

      <Card className="border-primary/30" data-testid="card-qr-scanner">
        <CardContent className="flex items-center justify-between gap-3 py-3 px-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <QrCode className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">QR ile Urun Tara</p>
              <p className="text-xs text-muted-foreground">QR kod tarayarak urun kartina ulasin</p>
            </div>
          </div>
          <Button
            onClick={() => setQrDialogOpen(true)}
            data-testid="button-qr-scan-product"
          >
            <QrCode className="h-4 w-4 mr-2" />
            QR Tara
          </Button>
        </CardContent>
      </Card>

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="title-qr-product-scanner">
              <QrCode className="h-5 w-5" />
              QR ile Urun Tara
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {qrProcessing && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/30">
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
                <span className="text-sm font-medium">QR kod isleniyor...</span>
              </div>
            )}

            {qrFoundProduct && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">Urun Bulundu</p>
                    <p className="text-xs text-green-600 dark:text-green-400">{qrFoundProduct.name}</p>
                  </div>
                </div>
                <Card>
                  <CardContent className="pt-3 pb-3 px-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Urun Adi</span>
                      <span className="text-sm font-medium" data-testid="text-qr-product-name">{qrFoundProduct.name}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Kod</span>
                      <span className="text-sm font-mono" data-testid="text-qr-product-code">{qrFoundProduct.code}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Kategori</span>
                      <Badge variant="outline" className="text-xs" data-testid="text-qr-product-category">
                        {categoryLabels[qrFoundProduct.category] || qrFoundProduct.category}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Mevcut Stok</span>
                      <span className="text-sm font-mono" data-testid="text-qr-product-stock">
                        {parseFloat(qrFoundProduct.current_stock || "0").toFixed(1)} {qrFoundProduct.unit}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                <Button
                  className="w-full"
                  onClick={() => navigateToProduct(qrFoundProduct.id)}
                  data-testid="button-go-to-product-card"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Urun Kartina Git
                </Button>
              </div>
            )}

            {!qrFoundProduct && (
              <>
                <div
                  id="satinalma-qr-reader"
                  className="w-full rounded-lg overflow-hidden bg-muted"
                  style={{ minHeight: "300px" }}
                />

                <div className="flex gap-2">
                  {!qrScanning ? (
                    <Button onClick={startQrScanner} className="flex-1" data-testid="button-qr-start-scan" disabled={qrProcessing}>
                      <QrCode className="h-4 w-4 mr-2" />
                      Taramaya Basla
                    </Button>
                  ) : (
                    <Button
                      onClick={stopQrScanner}
                      variant="destructive"
                      className="flex-1"
                      data-testid="button-qr-stop-scan"
                      disabled={qrProcessing}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Durdur
                    </Button>
                  )}
                  <Button
                    onClick={() => setQrDialogOpen(false)}
                    variant="outline"
                    data-testid="button-qr-close"
                  >
                    Kapat
                  </Button>
                </div>
              </>
            )}

            {qrFoundProduct && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setQrFoundProduct(null);
                  qrProcessedRef.current = false;
                }}
                data-testid="button-qr-scan-again"
              >
                <QrCode className="h-4 w-4 mr-2" />
                Baska Urun Tara
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {((staleQuotes && staleQuotes.length > 0) || (criticalStock && criticalStock.length > 0)) && (
        <Card className="border-amber-500/30" data-testid="card-ai-reminders">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-3 gap-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              AI Hatirlatmalar
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => updatePricesMutation.mutate()}
              disabled={updatePricesMutation.isPending}
              data-testid="button-update-prices"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${updatePricesMutation.isPending ? "animate-spin" : ""}`} />
              Fiyatları Güncelle
            </Button>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-2">
              {staleQuotes && staleQuotes.length > 0 && (
                <div className="flex items-center justify-between gap-2 text-sm flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <FileWarning className="h-3.5 w-3.5 text-amber-500" />
                    {staleQuotes.length} urun 2+ aydir teklif almamis
                  </span>
                  <Button size="sm" variant="outline" onClick={() => setStaleDialogOpen(true)} data-testid="button-stale-detail">
                    Detay
                  </Button>
                </div>
              )}
              {criticalStock && criticalStock.length > 0 && (
                <div className="flex items-center justify-between gap-2 text-sm flex-wrap">
                  <span className="flex items-center gap-1.5 text-red-500 dark:text-red-400">
                    <PackageX className="h-3.5 w-3.5" />
                    {criticalStock.length} ürün kritik stok seviyesinde
                  </span>
                  <Button size="sm" variant="outline" onClick={() => window.location.href = '/satinalma/stok-yonetimi'} data-testid="button-critical-stock-view">
                    Görüntüle
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={staleDialogOpen} onOpenChange={setStaleDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileWarning className="h-4 w-4 text-amber-500" />
              Guncel Teklif Almamis Urunler
            </DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Urun</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Son Teklif</TableHead>
                <TableHead className="text-right">Gun</TableHead>
                <TableHead className="text-right">Mevcut Fiyat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staleQuotes?.map((item) => (
                <TableRow key={item.id} data-testid={`stale-quote-row-${item.id}`}>
                  <TableCell>
                    <div className="font-medium" data-testid={`stale-name-${item.id}`}>{item.name}</div>
                    <div className="text-xs text-muted-foreground">{item.code}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs" data-testid={`stale-category-${item.id}`}>
                      {categoryLabels[item.category] || item.category}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`stale-date-${item.id}`}>
                    {item.lastQuoteDate
                      ? new Date(item.lastQuoteDate).toLocaleDateString("tr-TR")
                      : <span className="text-muted-foreground">Hic teklif yok</span>}
                  </TableCell>
                  <TableCell className="text-right" data-testid={`stale-days-${item.id}`}>
                    {item.daysSinceQuote != null ? (
                      <Badge variant={item.daysSinceQuote > 120 ? "destructive" : "secondary"} className="text-xs">
                        {item.daysSinceQuote} gun
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">N/A</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono" data-testid={`stale-price-${item.id}`}>
                    {item.unitCost ? `${parseFloat(item.unitCost).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL` : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3 gap-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-orange-500" />
              Onay Bekleyen Siparişler
            </CardTitle>
            <Badge variant="secondary" className="text-[10px]" data-testid="badge-pending-count">
              {pendingOrders?.length || 0} adet
            </Badge>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {pendingLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : pendingOrders && pendingOrders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sipariş No</TableHead>
                    <TableHead>Tedarikci</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                    <TableHead className="text-right">Tarih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingOrders.map((order) => (
                    <TableRow 
                      key={order.id} 
                      className="cursor-pointer"
                      data-testid={`pending-order-row-${order.id}`}
                    >
                      <TableCell className="font-mono text-sm" data-testid={`order-number-${order.id}`}>
                        {order.orderNumber}
                      </TableCell>
                      <TableCell data-testid={`order-supplier-${order.id}`}>
                        {order.supplier?.name || "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono" data-testid={`order-amount-${order.id}`}>
                        {parseFloat(order.totalAmount || "0").toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm" data-testid={`order-date-${order.id}`}>
                        {new Date(order.orderDate).toLocaleDateString("tr-TR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p data-testid="text-no-pending-orders">Onay bekleyen siparis yok</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3 gap-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              Düşük Stok Uyarıları
            </CardTitle>
            <Badge variant="secondary" className="text-[10px]" data-testid="badge-low-stock-count">
              {lowStockItems?.length || 0} kalem
            </Badge>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {lowStockLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : lowStockItems && lowStockItems.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Urun</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Stok / Min</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockItems.slice(0, 10).map((item) => (
                    <TableRow key={item.id} data-testid={`low-stock-row-${item.id}`}>
                      <TableCell className="font-medium" data-testid={`low-stock-name-${item.id}`}>
                        {item.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs" data-testid={`low-stock-category-${item.id}`}>
                          {categoryLabels[item.category] || item.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" data-testid={`low-stock-qty-${item.id}`}>
                        <span className="text-red-500 font-mono font-bold">
                          {parseFloat(item.currentStock).toFixed(1)}
                        </span>
                        <span className="text-muted-foreground"> / {parseFloat(item.minimumStock).toFixed(1)} {item.unit}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p data-testid="text-no-low-stock">Düşük stok uyarısı yok</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3 gap-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <ArrowUpDown className="h-3.5 w-3.5 text-blue-500" />
              Son Stok Hareketleri
            </CardTitle>
            <Badge variant="secondary" className="text-[10px]" data-testid="badge-receipts-count">
              {data?.recentReceipts || 0} islem (30 gun)
            </Badge>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-3" data-testid="stock-movements-summary">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <div className="flex items-center gap-2 mb-1">
                    <Truck className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-400">Mal Kabul</span>
                  </div>
                  <div className="text-lg font-bold text-green-700 dark:text-green-400" data-testid="value-recent-receipts">
                    {data?.recentReceipts || 0}
                  </div>
                  <span className="text-xs text-muted-foreground">Son 30 gun</span>
                </div>
                <div className="p-3 rounded-lg bg-orange-500/10">
                  <div className="flex items-center gap-2 mb-1">
                    <ShoppingCart className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                    <span className="text-xs font-medium text-orange-700 dark:text-orange-400">Bekleyen Sipariş</span>
                  </div>
                  <div className="text-lg font-bold text-orange-700 dark:text-orange-400" data-testid="value-pending-orders">
                    {data?.pendingOrders || 0}
                  </div>
                  <span className="text-xs text-muted-foreground">Onay bekliyor</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <div className="flex items-center gap-2 mb-1">
                    <Boxes className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Toplam Stok</span>
                  </div>
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-400" data-testid="value-total-inventory">
                    {data?.totalInventoryItems || 0}
                  </div>
                  <span className="text-xs text-muted-foreground">Aktif kalem</span>
                </div>
                <div className="p-3 rounded-lg bg-red-500/10">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                    <span className="text-xs font-medium text-red-700 dark:text-red-400">Düşük Stok</span>
                  </div>
                  <div className="text-lg font-bold text-red-700 dark:text-red-400" data-testid="value-low-stock-alerts">
                    {data?.lowStockAlerts || 0}
                  </div>
                  <span className="text-xs text-muted-foreground">Uyarı</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3 gap-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <Star className="h-3.5 w-3.5 text-amber-500" />
              Tedarikçi Performans Özeti
            </CardTitle>
            <Badge variant="secondary" className="text-[10px]" data-testid="badge-supplier-count">
              Top 5
            </Badge>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {suppliersLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : allSuppliers && allSuppliers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tedarikci</TableHead>
                    <TableHead className="text-right">Puan</TableHead>
                    <TableHead className="text-right">Zamaninda Teslim</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allSuppliers.map((supplier) => {
                    const score = parseFloat(supplier.performanceScore || "0");
                    return (
                      <TableRow key={supplier.id} data-testid={`supplier-row-${supplier.id}`}>
                        <TableCell className="font-medium" data-testid={`supplier-name-${supplier.id}`}>
                          {supplier.name}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`supplier-score-${supplier.id}`}>
                          <Badge 
                            variant={score >= 80 ? "outline" : score >= 50 ? "secondary" : "destructive"}
                            className={`text-xs ${score >= 80 ? "bg-green-500/10 text-green-700 dark:text-green-400" : ""}`}
                          >
                            {Number(score ?? 0).toFixed(0)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground" data-testid={`supplier-delivery-${supplier.id}`}>
                          %{parseFloat(supplier.onTimeDeliveryRate || "0").toFixed(0)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p data-testid="text-no-suppliers">Tedarikçi verisi yok</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
