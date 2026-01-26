import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  Users, 
  ShoppingCart, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Beaker,
  Boxes,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard
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

interface RawMaterial {
  id: number;
  name: string;
  category: string;
  unit: string;
  currentPrice: string;
  isKeyblend: boolean;
}

interface InventoryItem {
  id: number;
  name: string;
  currentStock: string;
  minimumStock: string;
  unit: string;
  category: string;
}

interface AccountingData {
  totalReceivables: number;
  totalPayables: number;
  accountCount: number;
}

interface DashboardData {
  totalSuppliers: number;
  pendingOrders: number;
  lowStockAlerts: number;
  recentReceipts: number;
  totalInventoryItems: number;
  rawMaterials: RawMaterial[];
  inventory: InventoryItem[];
  totalRawMaterials: number;
  accounting: AccountingData;
}

export default function SatinalmaDashboard() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/satinalma/dashboard"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const metrics = [
    {
      title: "Hammadde Kalemi",
      value: data?.totalRawMaterials || 0,
      icon: Beaker,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
    {
      title: "Toplam Stok Kalemi",
      value: data?.totalInventoryItems || 0,
      icon: Boxes,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
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
      color: data?.lowStockAlerts && data.lowStockAlerts > 0 ? "text-red-500" : "text-gray-500",
      bgColor: data?.lowStockAlerts && data.lowStockAlerts > 0 ? "bg-red-500/10" : "bg-gray-500/10"
    }
  ];

  const isLowStock = (current: string, minimum: string) => {
    return parseFloat(current) <= parseFloat(minimum);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {metrics.map((metric, index) => (
          <Card key={index} className="hover-elevate cursor-pointer" data-testid={`metric-card-${index}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hammaddeler Listesi */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Beaker className="h-5 w-5 text-purple-500" />
              Hammaddeler
            </CardTitle>
            <Badge variant="secondary">{data?.totalRawMaterials || 0} kalem</Badge>
          </CardHeader>
          <CardContent>
            {data?.rawMaterials && data.rawMaterials.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hammadde</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Fiyat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rawMaterials.map((item) => (
                    <TableRow key={item.id} data-testid={`raw-material-row-${item.id}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {item.name}
                          {item.isKeyblend && (
                            <Badge variant="outline" className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                              KB
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ₺{parseFloat(item.currentPrice).toFixed(2)}/{item.unit}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Beaker className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Henüz hammadde kaydı yok</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stok Listesi */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Boxes className="h-5 w-5 text-blue-500" />
              Stok Durumu
            </CardTitle>
            <Badge variant="secondary">{data?.totalInventoryItems || 0} kalem</Badge>
          </CardHeader>
          <CardContent>
            {data?.inventory && data.inventory.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ürün</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Stok</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.inventory.map((item) => (
                    <TableRow key={item.id} data-testid={`inventory-row-${item.id}`}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className={`font-mono ${isLowStock(item.currentStock, item.minimumStock) ? 'text-red-500 font-bold' : ''}`}>
                            {parseFloat(item.currentStock).toFixed(1)}
                          </span>
                          <span className="text-muted-foreground text-xs">{item.unit}</span>
                          {isLowStock(item.currentStock, item.minimumStock) && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Boxes className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Henüz stok kaydı yok</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Muhasebe Entegrasyonu */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="h-5 w-5 text-indigo-500" />
            Muhasebe Özeti (Cari Hesaplar)
          </CardTitle>
          <Badge variant="secondary">{data?.accounting?.accountCount || 0} hesap</Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">Toplam Alacak</span>
              </div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                ₺{(data?.accounting?.totalReceivables || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-red-700 dark:text-red-400">Toplam Borç</span>
              </div>
              <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                ₺{(data?.accounting?.totalPayables || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <CreditCard className="h-5 w-5 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-700 dark:text-indigo-400">Net Durum</span>
              </div>
              <div className={`text-2xl font-bold ${((data?.accounting?.totalReceivables || 0) - (data?.accounting?.totalPayables || 0)) >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                ₺{((data?.accounting?.totalReceivables || 0) - (data?.accounting?.totalPayables || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Son İşlemler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Mal kabul - {data?.recentReceipts || 0} kayıt (son 30 gün)</span>
                </div>
                <Badge variant="secondary">Tamamlandı</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">{data?.pendingOrders || 0} sipariş onay bekliyor</span>
                </div>
                <Badge variant="outline">Beklemede</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Hızlı Erişim</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <button 
                className="p-4 bg-muted/50 rounded-lg hover-elevate text-left"
                data-testid="quick-access-new-order"
              >
                <ShoppingCart className="h-5 w-5 mb-2 text-primary" />
                <div className="font-medium text-sm">Yeni Sipariş</div>
              </button>
              <button 
                className="p-4 bg-muted/50 rounded-lg hover-elevate text-left"
                data-testid="quick-access-goods-receipt"
              >
                <Package className="h-5 w-5 mb-2 text-primary" />
                <div className="font-medium text-sm">Mal Kabul</div>
              </button>
              <button 
                className="p-4 bg-muted/50 rounded-lg hover-elevate text-left"
                data-testid="quick-access-low-stock"
              >
                <AlertTriangle className="h-5 w-5 mb-2 text-orange-500" />
                <div className="font-medium text-sm">Düşük Stok</div>
              </button>
              <button 
                className="p-4 bg-muted/50 rounded-lg hover-elevate text-left"
                data-testid="quick-access-suppliers"
              >
                <Users className="h-5 w-5 mb-2 text-primary" />
                <div className="font-medium text-sm">Tedarikçiler</div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
