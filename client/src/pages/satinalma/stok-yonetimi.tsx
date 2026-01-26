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
  History,
  Eye,
  Truck,
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
  Download,
  Upload
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

interface StockMovement {
  id: number;
  movementType: string;
  quantity: string;
  notes: string | null;
  createdAt: string;
}

interface ProductSupplier {
  id: number;
  supplierName: string;
  supplierCode: string;
  unitPrice: string;
  leadTime: number;
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
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  
  const [newCategory, setNewCategory] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [movementType, setMovementType] = useState("");

  // Fetch stock movements for selected item
  const { data: stockMovements } = useQuery<StockMovement[]>({
    queryKey: ['/api/inventory', selectedItem?.id, 'movements'],
    queryFn: async () => {
      if (!selectedItem) return [];
      const res = await fetch(`/api/inventory/${selectedItem.id}/movements`);
      return res.json();
    },
    enabled: !!selectedItem && isDetailDialogOpen,
  });

  // Fetch suppliers for selected item
  const { data: productSuppliers } = useQuery<ProductSupplier[]>({
    queryKey: ['/api/inventory', selectedItem?.id, 'suppliers'],
    queryFn: async () => {
      if (!selectedItem) return [];
      const res = await fetch(`/api/inventory/${selectedItem.id}/suppliers`);
      return res.json();
    },
    enabled: !!selectedItem && isDetailDialogOpen,
  });

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

  const handleExportExcel = () => {
    if (!items || items.length === 0) {
      toast({ title: "Hata", description: "Dışa aktarılacak veri yok", variant: "destructive" });
      return;
    }
    
    const csvContent = [
      ["Kod", "Ürün Adı", "Kategori", "Birim", "Mevcut Stok", "Min. Stok", "Birim Maliyet", "Depo Konumu"].join(","),
      ...items.map(item => [
        item.code,
        `"${item.name}"`,
        item.category,
        item.unit,
        item.currentStock,
        item.minimumStock,
        item.unitCost,
        item.warehouseLocation || ""
      ].join(","))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stok_listesi_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Başarılı", description: "Stok listesi indirildi" });
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const rows = text.split("\n").slice(1).filter(row => row.trim());
      
      for (const row of rows) {
        const cols = row.split(",").map(c => c.replace(/^"|"$/g, "").trim());
        if (cols.length >= 6) {
          await apiRequest("POST", "/api/inventory", {
            code: cols[0],
            name: cols[1],
            category: cols[2] || "diger",
            unit: cols[3] || "adet",
            currentStock: cols[4] || "0",
            minimumStock: cols[5] || "0",
            unitCost: cols[6] || "0",
            warehouseLocation: cols[7] || null
          });
        }
      }
      
      queryClient.invalidateQueries({ predicate: (query) => 
        (query.queryKey[0] as string).startsWith("/api/inventory")
      });
      toast({ title: "Başarılı", description: `${rows.length} ürün içe aktarıldı` });
    } catch (error) {
      toast({ title: "Hata", description: "Dosya işlenirken hata oluştu", variant: "destructive" });
    }
    
    e.target.value = "";
  };

  const getMovementTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      giris: "Giriş",
      cikis: "Çıkış",
      sayim_duzeltme: "Sayım Düzeltme",
      fire: "Fire",
      iade: "İade",
      mal_kabul: "Mal Kabul"
    };
    return labels[type] || type;
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

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            data-testid="button-export-excel"
          >
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <label htmlFor="excel-import">
            <Button
              variant="outline"
              size="sm"
              asChild
              data-testid="button-import-excel"
            >
              <span>
                <Upload className="h-4 w-4 mr-2" />
                İçe Aktar
              </span>
            </Button>
          </label>
          <input
            type="file"
            id="excel-import"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleImportExcel}
          />
        </div>

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
                    <TableRow 
                      key={item.id} 
                      data-testid={`inventory-row-${item.id}`}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedItem(item);
                        setIsDetailDialogOpen(true);
                      }}
                    >
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
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItem(item);
                              setIsDetailDialogOpen(true);
                            }}
                            data-testid={`button-detail-${item.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
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

      {/* Ürün Detay Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Ürün Detayı
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-6">
              {/* Ürün Bilgileri */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Stok Kodu</p>
                  <p className="font-mono font-medium">{selectedItem.code}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Ürün Adı</p>
                  <p className="font-medium">{selectedItem.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Kategori</p>
                  <Badge variant="outline">
                    {categories.find(c => c.value === selectedItem.category)?.label || selectedItem.category}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Birim</p>
                  <p>{selectedItem.unit}</p>
                </div>
              </div>

              {/* Stok Durumu */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Stok Durumu</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 rounded-lg bg-muted">
                      <p className="text-2xl font-bold">{parseFloat(selectedItem.currentStock).toLocaleString("tr-TR")}</p>
                      <p className="text-xs text-muted-foreground">Mevcut ({selectedItem.unit})</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted">
                      <p className="text-2xl font-bold">{parseFloat(selectedItem.minimumStock).toLocaleString("tr-TR")}</p>
                      <p className="text-xs text-muted-foreground">Minimum ({selectedItem.unit})</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted">
                      <p className="text-2xl font-bold">₺{parseFloat(selectedItem.unitCost).toLocaleString("tr-TR")}</p>
                      <p className="text-xs text-muted-foreground">Birim Maliyet</p>
                    </div>
                  </div>
                  {selectedItem.warehouseLocation && (
                    <div className="mt-3 text-sm text-muted-foreground">
                      Depo Konumu: <span className="font-medium">{selectedItem.warehouseLocation}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tedarikçiler */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Tedarikçiler ({productSuppliers?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {productSuppliers && productSuppliers.length > 0 ? (
                    <div className="space-y-2">
                      {productSuppliers.map((supplier) => (
                        <div key={supplier.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                          <div>
                            <p className="font-medium">{supplier.supplierName}</p>
                            <p className="text-xs text-muted-foreground">{supplier.supplierCode}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">₺{parseFloat(supplier.unitPrice).toLocaleString("tr-TR")}</p>
                            <p className="text-xs text-muted-foreground">{supplier.leadTime} gün teslimat</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Bu ürün için henüz tedarikçi tanımlı değil
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Son Hareketler */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Son Stok Hareketleri
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stockMovements && stockMovements.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {stockMovements.slice(0, 10).map((movement) => (
                        <div key={movement.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2">
                            {movement.movementType === "giris" || movement.movementType === "mal_kabul" || movement.movementType === "iade" ? (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            )}
                            <div>
                              <p className="text-sm font-medium">{getMovementTypeLabel(movement.movementType)}</p>
                              {movement.notes && (
                                <p className="text-xs text-muted-foreground">{movement.notes}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-medium ${movement.movementType === "giris" || movement.movementType === "mal_kabul" || movement.movementType === "iade" ? "text-green-600" : "text-red-600"}`}>
                              {movement.movementType === "giris" || movement.movementType === "mal_kabul" || movement.movementType === "iade" ? "+" : "-"}
                              {parseFloat(movement.quantity).toLocaleString("tr-TR")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(movement.createdAt).toLocaleDateString("tr-TR")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Henüz stok hareketi yok
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Aksiyon Butonları */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setIsDetailDialogOpen(false);
                    setIsMovementDialogOpen(true);
                  }}
                  data-testid="button-add-movement-from-detail"
                >
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  Stok Hareketi Ekle
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
