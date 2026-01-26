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
  Package, 
  Plus, 
  Search, 
  AlertTriangle,
  ArrowUpDown,
  Edit,
  History
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface InventoryItem {
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
}

const categories = [
  { value: "all", label: "Tümü" },
  { value: "hammadde", label: "Hammadde" },
  { value: "yarimamul", label: "Yarı Mamul" },
  { value: "mamul", label: "Mamul" },
  { value: "ambalaj", label: "Ambalaj" },
  { value: "sarf_malzeme", label: "Sarf Malzeme" },
  { value: "temizlik", label: "Temizlik" },
  { value: "diger", label: "Diğer" }
];

const units = ["kg", "gr", "lt", "ml", "adet", "paket", "kutu", "koli"];

export default function StokYonetimi() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [showLowStock, setShowLowStock] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  
  const [newCategory, setNewCategory] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [movementType, setMovementType] = useState("");

  const queryParams = new URLSearchParams();
  if (category && category !== "all") queryParams.set("category", category);
  if (search) queryParams.set("search", search);
  if (showLowStock) queryParams.set("lowStock", "true");
  const queryString = queryParams.toString();
  const inventoryUrl = `/api/inventory${queryString ? `?${queryString}` : ""}`;

  const { data: items, isLoading } = useQuery<InventoryItem[]>({
    queryKey: [inventoryUrl],
  });

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/inventory", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        (query.queryKey[0] as string).startsWith("/api/inventory")
      });
      resetAddForm();
      toast({ title: "Stok kalemi eklendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Stok kalemi eklenemedi", variant: "destructive" });
    }
  });

  const movementMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      return apiRequest("POST", `/api/inventory/${id}/movement`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        (query.queryKey[0] as string).startsWith("/api/inventory")
      });
      setIsMovementDialogOpen(false);
      setSelectedItem(null);
      setMovementType("");
      toast({ title: "Stok hareketi kaydedildi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Stok hareketi kaydedilemedi", variant: "destructive" });
    }
  });

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newCategory || !newUnit) {
      toast({ title: "Hata", description: "Kategori ve birim seçmeniz gerekiyor", variant: "destructive" });
      return;
    }
    const formData = new FormData(e.currentTarget);
    addMutation.mutate({
      code: formData.get("code"),
      name: formData.get("name"),
      category: newCategory,
      unit: newUnit,
      currentStock: formData.get("currentStock") || "0",
      minimumStock: formData.get("minimumStock") || "0",
      unitCost: formData.get("unitCost") || "0",
      warehouseLocation: formData.get("warehouseLocation") || null
    });
  };
  
  const resetAddForm = () => {
    setNewCategory("");
    setNewUnit("");
    setIsAddDialogOpen(false);
  };

  const handleMovementSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedItem) return;
    if (!movementType) {
      toast({ title: "Hata", description: "Hareket tipi seçmeniz gerekiyor", variant: "destructive" });
      return;
    }
    
    const formData = new FormData(e.currentTarget);
    movementMutation.mutate({
      id: selectedItem.id,
      data: {
        movementType: movementType,
        quantity: formData.get("quantity"),
        notes: formData.get("notes") || null
      }
    });
  };

  const getStockStatus = (item: InventoryItem) => {
    const current = parseFloat(item.currentStock);
    const min = parseFloat(item.minimumStock);
    
    if (current <= 0) return { label: "Stok Yok", variant: "destructive" as const };
    if (current <= min) return { label: "Düşük Stok", variant: "destructive" as const };
    if (current <= min * 1.5) return { label: "Uyarı", variant: "secondary" as const };
    return { label: "Normal", variant: "outline" as const };
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
            placeholder="Stok kalemi ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[180px]" data-testid="select-category">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={showLowStock ? "default" : "outline"}
          size="sm"
          onClick={() => setShowLowStock(!showLowStock)}
          data-testid="button-low-stock-filter"
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Düşük Stok
        </Button>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-inventory">
              <Plus className="h-4 w-4 mr-2" />
              Yeni Stok
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Yeni Stok Kalemi</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Stok Kodu</Label>
                  <Input id="code" name="code" required data-testid="input-code" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Kategori</Label>
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger data-testid="select-new-category">
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.filter(c => c.value !== "all").map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Ürün Adı</Label>
                <Input id="name" name="name" required data-testid="input-name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit">Birim</Label>
                  <Select value={newUnit} onValueChange={setNewUnit}>
                    <SelectTrigger data-testid="select-unit">
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map(unit => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentStock">Mevcut Stok</Label>
                  <Input id="currentStock" name="currentStock" type="number" step="0.001" defaultValue="0" data-testid="input-current-stock" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minimumStock">Minimum Stok</Label>
                  <Input id="minimumStock" name="minimumStock" type="number" step="0.001" defaultValue="0" data-testid="input-min-stock" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitCost">Birim Maliyet (₺)</Label>
                  <Input id="unitCost" name="unitCost" type="number" step="0.01" defaultValue="0" data-testid="input-unit-cost" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="warehouseLocation">Depo Konumu</Label>
                <Input id="warehouseLocation" name="warehouseLocation" placeholder="Örn: Raf A-3" data-testid="input-location" />
              </div>
              <Button type="submit" className="w-full" disabled={addMutation.isPending} data-testid="button-submit-add">
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
                <TableHead>Ürün Adı</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Stok</TableHead>
                <TableHead className="text-right">Min. Stok</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items && items.length > 0 ? (
                items.map((item) => {
                  const status = getStockStatus(item);
                  return (
                    <TableRow key={item.id} data-testid={`inventory-row-${item.id}`}>
                      <TableCell className="font-mono text-sm">{item.code}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {categories.find(c => c.value === item.category)?.label || item.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {parseFloat(item.currentStock).toLocaleString("tr-TR")} {item.unit}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {parseFloat(item.minimumStock).toLocaleString("tr-TR")} {item.unit}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedItem(item);
                              setIsMovementDialogOpen(true);
                            }}
                            data-testid={`button-movement-${item.id}`}
                          >
                            <ArrowUpDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {search || category !== "all" ? "Sonuç bulunamadı" : "Henüz stok kalemi yok"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isMovementDialogOpen} onOpenChange={setIsMovementDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Stok Hareketi</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <form onSubmit={handleMovementSubmit} className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="font-medium">{selectedItem.name}</div>
                <div className="text-sm text-muted-foreground">
                  Mevcut: {parseFloat(selectedItem.currentStock).toLocaleString("tr-TR")} {selectedItem.unit}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="movementType">Hareket Tipi</Label>
                <Select value={movementType} onValueChange={setMovementType}>
                  <SelectTrigger data-testid="select-movement-type">
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="giris">Giriş (Stok Artış)</SelectItem>
                    <SelectItem value="cikis">Çıkış (Stok Azalış)</SelectItem>
                    <SelectItem value="sayim_duzeltme">Sayım Düzeltme</SelectItem>
                    <SelectItem value="fire">Fire</SelectItem>
                    <SelectItem value="iade">İade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Miktar ({selectedItem.unit})</Label>
                <Input id="quantity" name="quantity" type="number" step="0.001" required data-testid="input-movement-quantity" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Not</Label>
                <Textarea id="notes" name="notes" placeholder="İsteğe bağlı açıklama" data-testid="input-movement-notes" />
              </div>
              <Button type="submit" className="w-full" disabled={movementMutation.isPending} data-testid="button-submit-movement">
                {movementMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
