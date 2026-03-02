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
import { Textarea } from "@/components/ui/textarea";
import { 
  Users, 
  Plus, 
  Search, 
  Phone,
  Mail,
  MapPin,
  Star,
  Edit
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface Supplier {
  id: number;
  code: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  performanceScore: string;
  totalOrders: number;
  paymentTermDays: number;
}

const statusOptions = [
  { value: "all", label: "Tümü" },
  { value: "aktif", label: "Aktif" },
  { value: "pasif", label: "Pasif" },
  { value: "askiya_alinmis", label: "Askıya Alınmış" }
];

export default function TedarikciYonetimi() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const queryParams = new URLSearchParams();
  if (status && status !== "all") queryParams.set("status", status);
  if (search) queryParams.set("search", search);
  const queryString = queryParams.toString();
  const suppliersUrl = `/api/suppliers${queryString ? `?${queryString}` : ""}`;

  const { data: suppliers, isLoading } = useQuery<Supplier[]>({
    queryKey: [suppliersUrl],
  });

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/suppliers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        (query.queryKey[0] as string).startsWith("/api/suppliers")
      });
      setIsAddDialogOpen(false);
      toast({ title: "Tedarikçi eklendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Tedarikçi eklenemedi", variant: "destructive" });
    }
  });

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    addMutation.mutate({
      code: formData.get("code"),
      name: formData.get("name"),
      contactPerson: formData.get("contactPerson") || null,
      email: formData.get("email") || null,
      phone: formData.get("phone") || null,
      city: formData.get("city") || null,
      address: formData.get("address") || null,
      taxNumber: formData.get("taxNumber") || null,
      paymentTermDays: parseInt(formData.get("paymentTermDays") as string) || 30,
      status: "aktif"
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "aktif":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Aktif</Badge>;
      case "pasif":
        return <Badge variant="secondary">Pasif</Badge>;
      case "askiya_alinmis":
        return <Badge variant="destructive">Askıya Alınmış</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPerformanceColor = (score: string) => {
    const numScore = parseFloat(score);
    if (numScore >= 4) return "text-green-500";
    if (numScore >= 3) return "text-yellow-500";
    return "text-red-500";
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
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tedarikçi ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-supplier"
          />
        </div>
        
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]" data-testid="select-status">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-supplier">
              <Plus className="h-4 w-4 mr-2" />
              Yeni Tedarikçi
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Yeni Tedarikçi</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Tedarikçi Kodu</Label>
                  <Input id="code" name="code" required data-testid="input-supplier-code" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxNumber">Vergi No</Label>
                  <Input id="taxNumber" name="taxNumber" data-testid="input-tax-number" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Firma Adı</Label>
                <Input id="name" name="name" required data-testid="input-supplier-name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Yetkili Kişi</Label>
                  <Input id="contactPerson" name="contactPerson" data-testid="input-contact-person" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input id="phone" name="phone" data-testid="input-phone" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-posta</Label>
                  <Input id="email" name="email" type="email" data-testid="input-email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Şehir</Label>
                  <Input id="city" name="city" data-testid="input-city" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Adres</Label>
                <Textarea id="address" name="address" data-testid="input-address" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentTermDays">Ödeme Vadesi (Gün)</Label>
                <Input id="paymentTermDays" name="paymentTermDays" type="number" defaultValue="30" data-testid="input-payment-term" />
              </div>
              <Button type="submit" className="w-full" disabled={addMutation.isPending} data-testid="button-submit-supplier">
                {addMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
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
                <TableHead>Kod</TableHead>
                <TableHead>Firma Adı</TableHead>
                <TableHead>Yetkili</TableHead>
                <TableHead>İletişim</TableHead>
                <TableHead className="text-center">Performans</TableHead>
                <TableHead className="text-center">Sipariş</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers && suppliers.length > 0 ? (
                suppliers.map((supplier) => (
                  <TableRow key={supplier.id} data-testid={`supplier-row-${supplier.id}`}>
                    <TableCell className="font-mono text-sm">{supplier.code}</TableCell>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>{supplier.contactPerson || "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        {supplier.phone && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" /> {supplier.phone}
                          </span>
                        )}
                        {supplier.email && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3" /> {supplier.email}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className={`h-4 w-4 ${getPerformanceColor(supplier.performanceScore)}`} />
                        <span className={getPerformanceColor(supplier.performanceScore)}>
                          {parseFloat(supplier.performanceScore).toFixed(1)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{supplier.totalOrders}</TableCell>
                    <TableCell>{getStatusBadge(supplier.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedSupplier(supplier)}
                        data-testid={`button-edit-supplier-${supplier.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {search || status !== "all" ? "Aramanızla eşleşen sonuç bulunamadı" : "Henüz tedarikçi bulunmuyor"}
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
