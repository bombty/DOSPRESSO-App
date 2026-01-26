import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  Users, 
  ShoppingCart, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardData {
  totalSuppliers: number;
  pendingOrders: number;
  lowStockAlerts: number;
  recentReceipts: number;
  totalInventoryItems: number;
}

export default function SatinalmaDashboard() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/satinalma/dashboard"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
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
    );
  }

  const metrics = [
    {
      title: "Toplam Stok Kalemi",
      value: data?.totalInventoryItems || 0,
      icon: Package,
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
