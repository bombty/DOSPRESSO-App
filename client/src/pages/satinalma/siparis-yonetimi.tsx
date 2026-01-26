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
import { 
  ShoppingCart, 
  Plus, 
  Search, 
  Calendar,
  Check,
  X,
  Clock,
  Eye
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

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

const statusOptions = [
  { value: "all", label: "Tümü" },
  { value: "taslak", label: "Taslak" },
  { value: "onay_bekliyor", label: "Onay Bekliyor" },
  { value: "onaylandi", label: "Onaylandı" },
  { value: "siparis_verildi", label: "Sipariş Verildi" },
  { value: "kismen_teslim", label: "Kısmen Teslim" },
  { value: "tamamlandi", label: "Tamamlandı" },
  { value: "iptal", label: "İptal" }
];

export default function SiparisYonetimi() {
  const { toast } = useToast();
  const [status, setStatus] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");

  const queryParams = new URLSearchParams();
  if (status && status !== "all") queryParams.set("status", status);
  const queryString = queryParams.toString();
  const ordersUrl = `/api/purchase-orders${queryString ? `?${queryString}` : ""}`;

  const { data: orders, isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: [ordersUrl],
  });

  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
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
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      return apiRequest("PATCH", `/api/purchase-orders/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        (query.queryKey[0] as string).startsWith("/api/purchase-orders")
      });
      toast({ title: "Sipariş durumu güncellendi" });
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
      siparis_verildi: { label: "Sipariş Verildi", variant: "default" },
      kismen_teslim: { label: "Kısmen Teslim", variant: "secondary" },
      tamamlandi: { label: "Tamamlandı", variant: "default" },
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

        <div className="flex-1" />

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-order">
              <Plus className="h-4 w-4 mr-2" />
              Yeni Sipariş
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
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid={`button-view-order-${order.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {order.status === "onay_bekliyor" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => statusMutation.mutate({ id: order.id, status: "onaylandi" })}
                              data-testid={`button-approve-order-${order.id}`}
                            >
                              <Check className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => statusMutation.mutate({ id: order.id, status: "iptal" })}
                              data-testid={`button-reject-order-${order.id}`}
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
                    {status !== "all" ? "Bu durumda sipariş yok" : "Henüz sipariş yok"}
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
