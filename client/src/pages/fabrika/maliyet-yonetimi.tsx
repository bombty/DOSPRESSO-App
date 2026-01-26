import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Calculator, Package, Warehouse, TrendingUp, Plus, RefreshCw, 
  DollarSign, Percent, Building2, FileText, Settings2, BarChart3,
  Loader2, AlertTriangle, CheckCircle, Edit, Trash2
} from "lucide-react";

const rawMaterialSchema = z.object({
  code: z.string().min(1, "Kod gerekli"),
  name: z.string().min(1, "Ad gerekli"),
  category: z.string().optional(),
  unit: z.string().min(1, "Birim gerekli"),
  currentUnitPrice: z.string().optional(),
});

const fixedCostSchema = z.object({
  category: z.string().min(1, "Kategori gerekli"),
  name: z.string().min(1, "Ad gerekli"),
  description: z.string().optional(),
  monthlyAmount: z.string().min(1, "Tutar gerekli"),
  isRecurring: z.boolean().default(true),
});

const profitMarginSchema = z.object({
  name: z.string().min(1, "Ad gerekli"),
  category: z.string().min(1, "Kategori gerekli"),
  defaultMargin: z.string().min(1, "Marj gerekli"),
  minimumMargin: z.string().optional(),
  maximumMargin: z.string().optional(),
  description: z.string().optional(),
});

const fixedCostCategories = [
  { value: "personel", label: "Personel" },
  { value: "elektrik", label: "Elektrik" },
  { value: "dogalgaz", label: "Doğalgaz" },
  { value: "su", label: "Su" },
  { value: "kira", label: "Kira" },
  { value: "sigorta", label: "Sigorta" },
  { value: "amortisman", label: "Amortisman" },
  { value: "bakim_onarim", label: "Bakım/Onarım" },
  { value: "temizlik", label: "Temizlik" },
  { value: "guvenlik", label: "Güvenlik" },
  { value: "iletisim", label: "İletişim" },
  { value: "vergi", label: "Vergi" },
  { value: "diger", label: "Diğer" },
];

const productCategories = [
  { value: "donut", label: "Donut" },
  { value: "pastane", label: "Pastane" },
  { value: "konsantre", label: "Konsantre/Şurup" },
  { value: "topping", label: "Topping" },
  { value: "kahve", label: "Kahve" },
  { value: "cay", label: "Çay" },
  { value: "kullan_at", label: "Kullan-At" },
  { value: "sarf_malzeme", label: "Sarf Malzeme" },
  { value: "wasp", label: "Wasp" },
  { value: "porselen", label: "Porselen" },
  { value: "mamabon", label: "Mamabon" },
  { value: "diger", label: "Diğer" },
];

function formatCurrency(value: string | number | null | undefined): string {
  if (!value) return "₺0,00";
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(num);
}

function formatPercent(value: string | number | null | undefined): string {
  if (!value) return "%0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `%${((num - 1) * 100).toFixed(1)}`;
}

function ProductCostDetail({ productId }: { productId: number }) {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/product-costs', productId],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!data || !data.recipe) {
    return <p className="text-sm text-muted-foreground text-center py-4">Bu ürün için aktif reçete bulunamadı</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Ürün</p>
          <p className="font-medium">{data.product?.name}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Reçete Tipi</p>
          <Badge className={data.recipe?.recipeType === "KEYBLEND" ? "bg-amber-500" : ""}>
            {data.recipe?.recipeType}
          </Badge>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-2">Malzeme Listesi</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kod</TableHead>
              <TableHead>Malzeme</TableHead>
              <TableHead className="text-right">Miktar</TableHead>
              <TableHead className="text-right">Birim Fiyat</TableHead>
              <TableHead className="text-right">Toplam</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.ingredients?.map((ing: any) => (
              <TableRow key={ing.id} className={ing.isKeyblend ? "bg-amber-50 dark:bg-amber-900/20" : ""}>
                <TableCell className="font-mono text-xs">{ing.materialCode}</TableCell>
                <TableCell>
                  {ing.materialName}
                  {ing.isKeyblend && <Badge className="ml-2 text-xs bg-amber-500">KB</Badge>}
                </TableCell>
                <TableCell className="text-right">{ing.quantity} {ing.unit}</TableCell>
                <TableCell className="text-right">{ing.isHidden ? "***" : formatCurrency(ing.unitCost)}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(ing.totalCost)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-4 border-t">
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">Hammadde Maliyeti</p>
          <p className="font-bold">{formatCurrency(data.costs?.rawMaterialCost)}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">Genel Gider Payı</p>
          <p className="font-bold">{formatCurrency(data.costs?.overheadCost)}</p>
        </div>
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <p className="text-xs text-muted-foreground">Toplam Maliyet</p>
          <p className="font-bold text-blue-700 dark:text-blue-400">{formatCurrency(data.costs?.totalUnitCost)}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">Kar Marjı</p>
          <p className="font-bold">{data.costs?.profitMargin}</p>
        </div>
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
          <p className="text-xs text-muted-foreground">Önerilen Fiyat</p>
          <p className="font-bold text-green-700 dark:text-green-400">{formatCurrency(data.costs?.suggestedPrice)}</p>
        </div>
      </div>
    </div>
  );
}

export default function MaliyetYonetimi() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isAddMaterialDialogOpen, setIsAddMaterialDialogOpen] = useState(false);
  const [isAddCostDialogOpen, setIsAddCostDialogOpen] = useState(false);
  const [isAddMarginDialogOpen, setIsAddMarginDialogOpen] = useState(false);
  const [isProductCostDialogOpen, setIsProductCostDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  const { data: dashboardStats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ['/api/cost-dashboard/stats'],
  });

  const { data: rawMaterials, isLoading: materialsLoading } = useQuery<any[]>({
    queryKey: ['/api/raw-materials'],
  });

  const { data: fixedCosts, isLoading: costsLoading } = useQuery<any[]>({
    queryKey: ['/api/fixed-costs'],
  });

  const { data: profitMargins, isLoading: marginsLoading } = useQuery<any[]>({
    queryKey: ['/api/profit-margins'],
  });

  const { data: costCalculations, isLoading: calculationsLoading } = useQuery<any[]>({
    queryKey: ['/api/cost-calculations'],
  });

  const { data: dashboardProducts, isLoading: productsLoading } = useQuery<any[]>({
    queryKey: ['/api/cost-dashboard/products'],
  });

  const syncPricesMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/sync-prices-from-receipts", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/raw-materials'] });
      toast({ title: "Fiyatlar senkronize edildi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Fiyatlar senkronize edilemedi", variant: "destructive" });
    }
  });

  const calculateAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/cost-calculations/calculate-all", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cost-calculations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cost-dashboard/stats'] });
      toast({ title: "Tüm maliyetler hesaplandı" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Maliyet hesaplaması başarısız", variant: "destructive" });
    }
  });

  const materialForm = useForm<z.infer<typeof rawMaterialSchema>>({
    resolver: zodResolver(rawMaterialSchema),
    defaultValues: { code: "", name: "", category: "", unit: "kg", currentUnitPrice: "0" }
  });

  const costForm = useForm<z.infer<typeof fixedCostSchema>>({
    resolver: zodResolver(fixedCostSchema),
    defaultValues: { category: "", name: "", description: "", monthlyAmount: "", isRecurring: true }
  });

  const marginForm = useForm<z.infer<typeof profitMarginSchema>>({
    resolver: zodResolver(profitMarginSchema),
    defaultValues: { name: "", category: "", defaultMargin: "1.20", minimumMargin: "1.01", maximumMargin: "2.00", description: "" }
  });

  const createMaterialMutation = useMutation({
    mutationFn: async (data: z.infer<typeof rawMaterialSchema>) => {
      return apiRequest("POST", "/api/raw-materials", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/raw-materials'] });
      setIsAddMaterialDialogOpen(false);
      materialForm.reset();
      toast({ title: "Hammadde eklendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Hammadde eklenemedi", variant: "destructive" });
    }
  });

  const createCostMutation = useMutation({
    mutationFn: async (data: z.infer<typeof fixedCostSchema>) => {
      return apiRequest("POST", "/api/fixed-costs", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fixed-costs'] });
      setIsAddCostDialogOpen(false);
      costForm.reset();
      toast({ title: "Sabit gider eklendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Sabit gider eklenemedi", variant: "destructive" });
    }
  });

  const createMarginMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profitMarginSchema>) => {
      return apiRequest("POST", "/api/profit-margins", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profit-margins'] });
      setIsAddMarginDialogOpen(false);
      marginForm.reset();
      toast({ title: "Kar marjı şablonu eklendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Kar marjı eklenemedi", variant: "destructive" });
    }
  });

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Maliyet Yönetimi</h1>
          <p className="text-sm text-muted-foreground">Ürün maliyeti, sabit giderler ve kar marjı yönetimi</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => syncPricesMutation.mutate()}
            disabled={syncPricesMutation.isPending}
            data-testid="button-sync-prices"
          >
            {syncPricesMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Fiyat Senkronize
          </Button>
          <Button 
            size="sm" 
            onClick={() => calculateAllMutation.mutate()}
            disabled={calculateAllMutation.isPending}
            data-testid="button-calculate-all"
          >
            {calculateAllMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calculator className="w-4 h-4 mr-2" />}
            Tümünü Hesapla
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="hammadde" data-testid="tab-hammadde">Hammaddeler</TabsTrigger>
          <TabsTrigger value="urun-maliyetleri" data-testid="tab-urun-maliyetleri">Ürün Maliyetleri</TabsTrigger>
          <TabsTrigger value="sabit-gider" data-testid="tab-sabit-gider">Sabit Giderler</TabsTrigger>
          <TabsTrigger value="kar-marji" data-testid="tab-kar-marji">Kar Marjları</TabsTrigger>
          <TabsTrigger value="hesaplamalar" data-testid="tab-hesaplamalar">Hesaplamalar</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Ürün Sayısı</p>
                    <p className="text-xl font-bold" data-testid="text-product-count">{dashboardStats?.productCount || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Reçete Sayısı</p>
                    <p className="text-xl font-bold" data-testid="text-recipe-count">{dashboardStats?.recipeCount || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Warehouse className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Hammadde</p>
                    <p className="text-xl font-bold" data-testid="text-material-count">{dashboardStats?.materialCount || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Aylık Sabit Gider</p>
                    <p className="text-lg font-bold" data-testid="text-fixed-costs">{formatCurrency(dashboardStats?.totalFixedCosts)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Percent className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Ort. Kar Marjı</p>
                    <p className="text-xl font-bold" data-testid="text-avg-margin">%{(dashboardStats?.avgProfitMargin || 0).toFixed(1)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Bu Ay Hesaplama</p>
                    <p className="text-xl font-bold" data-testid="text-calculations">{dashboardStats?.calculationsThisMonth || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Ürün Maliyet Özeti</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardProducts && dashboardProducts.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ürün</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead className="text-right">Maliyet</TableHead>
                        <TableHead className="text-right">Önerilen Fiyat</TableHead>
                        <TableHead className="text-right">Kar Marjı</TableHead>
                        <TableHead>Durum</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboardProducts.slice(0, 10).map((item: any) => (
                        <TableRow key={item.product?.id} data-testid={`row-product-${item.product?.id}`}>
                          <TableCell className="font-medium">{item.product?.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.product?.category}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(item.product?.basePrice)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.product?.suggestedPrice)}</TableCell>
                          <TableCell className="text-right">{formatPercent(item.product?.profitMargin)}</TableCell>
                          <TableCell>
                            {item.recipe ? (
                              <Badge variant="default" className="bg-green-500">Reçeteli</Badge>
                            ) : (
                              <Badge variant="secondary">Reçete Yok</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Henüz ürün bulunmuyor</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hammadde" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Hammadde Listesi</h2>
            <Dialog open={isAddMaterialDialogOpen} onOpenChange={setIsAddMaterialDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-material">
                  <Plus className="w-4 h-4 mr-2" />
                  Yeni Hammadde
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Yeni Hammadde Ekle</DialogTitle>
                </DialogHeader>
                <Form {...materialForm}>
                  <form onSubmit={materialForm.handleSubmit((data) => createMaterialMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={materialForm.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kod</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-material-code" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={materialForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ad</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-material-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={materialForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kategori</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-material-category" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={materialForm.control}
                      name="unit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Birim</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-material-unit">
                                <SelectValue placeholder="Birim seçin" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="kg">Kilogram (kg)</SelectItem>
                              <SelectItem value="gr">Gram (gr)</SelectItem>
                              <SelectItem value="lt">Litre (lt)</SelectItem>
                              <SelectItem value="ml">Mililitre (ml)</SelectItem>
                              <SelectItem value="adet">Adet</SelectItem>
                              <SelectItem value="paket">Paket</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={materialForm.control}
                      name="currentUnitPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Birim Fiyat (₺)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} data-testid="input-material-price" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={createMaterialMutation.isPending} data-testid="button-submit-material">
                      {createMaterialMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Kaydet
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              {materialsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : rawMaterials && rawMaterials.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kod</TableHead>
                      <TableHead>Ad</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Birim</TableHead>
                      <TableHead className="text-right">Birim Fiyat</TableHead>
                      <TableHead className="text-right">Son Alım Fiyatı</TableHead>
                      <TableHead>Durum</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rawMaterials.map((material: any) => (
                      <TableRow key={material.id} data-testid={`row-material-${material.id}`}>
                        <TableCell className="font-mono text-sm">{material.code}</TableCell>
                        <TableCell>{material.name}</TableCell>
                        <TableCell>{material.category || "-"}</TableCell>
                        <TableCell>{material.unit}</TableCell>
                        <TableCell className="text-right">{formatCurrency(material.currentUnitPrice)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(material.lastPurchasePrice)}</TableCell>
                        <TableCell>
                          {material.isActive ? (
                            <Badge variant="default" className="bg-green-500">Aktif</Badge>
                          ) : (
                            <Badge variant="secondary">Pasif</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Henüz hammadde bulunmuyor</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="urun-maliyetleri" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Ürün Maliyetleri ve Reçeteler</h2>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => syncPricesMutation.mutate()}
                disabled={syncPricesMutation.isPending}
                data-testid="button-sync-prices"
              >
                {syncPricesMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Fiyatları Senkronize Et
              </Button>
              <Button
                size="sm"
                onClick={() => calculateAllMutation.mutate()}
                disabled={calculateAllMutation.isPending}
                data-testid="button-calculate-all"
              >
                {calculateAllMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calculator className="w-4 h-4 mr-2" />}
                Tüm Maliyetleri Hesapla
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Reçeteli Ürünler</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {productsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : dashboardProducts && dashboardProducts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ürün</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Reçete Tipi</TableHead>
                        <TableHead className="text-right">Maliyet</TableHead>
                        <TableHead className="text-right">Önerilen</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboardProducts.filter((p: any) => p.recipe).map((item: any) => (
                        <TableRow key={item.product?.id} data-testid={`row-product-${item.product?.id}`}>
                          <TableCell className="font-medium">{item.product?.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{item.product?.category}</Badge>
                          </TableCell>
                          <TableCell>
                            {item.recipe?.recipeType === "KEYBLEND" ? (
                              <Badge className="bg-amber-500 text-xs">KEYBLEND</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">OPEN</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(item.product?.basePrice)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(item.product?.suggestedPrice)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedProductId(item.product?.id);
                                setIsProductCostDialogOpen(true);
                              }}
                              data-testid={`button-view-cost-${item.product?.id}`}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Henüz reçeteli ürün bulunmuyor</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Maliyet Özeti</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Reçeteli Ürün</p>
                    <p className="text-xl font-bold">
                      {dashboardProducts?.filter((p: any) => p.recipe).length || 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Keyblend Ürün</p>
                    <p className="text-xl font-bold">
                      {dashboardProducts?.filter((p: any) => p.recipe?.recipeType === "KEYBLEND").length || 0}
                    </p>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Keyblend Güvenliği</p>
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Keyblend malzemelerin formülasyonu gizlidir. Sadece admin rolü detayları görebilir.
                    Maliyet hesaplamaları tüm malzemeleri içerir.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Dialog open={isProductCostDialogOpen} onOpenChange={setIsProductCostDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Ürün Maliyet Detayı</DialogTitle>
              </DialogHeader>
              {selectedProductId && <ProductCostDetail productId={selectedProductId} />}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="sabit-gider" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Fabrika Sabit Giderleri</h2>
            <Dialog open={isAddCostDialogOpen} onOpenChange={setIsAddCostDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-cost">
                  <Plus className="w-4 h-4 mr-2" />
                  Yeni Gider
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Yeni Sabit Gider Ekle</DialogTitle>
                </DialogHeader>
                <Form {...costForm}>
                  <form onSubmit={costForm.handleSubmit((data) => createCostMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={costForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kategori</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-cost-category">
                                <SelectValue placeholder="Kategori seçin" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {fixedCostCategories.map(cat => (
                                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={costForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gider Adı</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-cost-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={costForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Açıklama</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-cost-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={costForm.control}
                      name="monthlyAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Aylık Tutar (₺)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} data-testid="input-cost-amount" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={createCostMutation.isPending} data-testid="button-submit-cost">
                      {createCostMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Kaydet
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              {costsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : fixedCosts && fixedCosts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Gider Adı</TableHead>
                      <TableHead>Açıklama</TableHead>
                      <TableHead className="text-right">Aylık Tutar</TableHead>
                      <TableHead className="text-right">Yıllık Tutar</TableHead>
                      <TableHead>Tekrar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fixedCosts.map((cost: any) => (
                      <TableRow key={cost.id} data-testid={`row-cost-${cost.id}`}>
                        <TableCell>
                          <Badge variant="outline">
                            {fixedCostCategories.find(c => c.value === cost.category)?.label || cost.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{cost.name}</TableCell>
                        <TableCell className="text-muted-foreground">{cost.description || "-"}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(cost.monthlyAmount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(cost.annualAmount)}</TableCell>
                        <TableCell>
                          {cost.isRecurring ? (
                            <Badge variant="default">Her Ay</Badge>
                          ) : (
                            <Badge variant="secondary">Tek Seferlik</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Henüz sabit gider bulunmuyor</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kar-marji" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Kar Marjı Şablonları</h2>
            <Dialog open={isAddMarginDialogOpen} onOpenChange={setIsAddMarginDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-margin">
                  <Plus className="w-4 h-4 mr-2" />
                  Yeni Şablon
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Yeni Kar Marjı Şablonu</DialogTitle>
                </DialogHeader>
                <Form {...marginForm}>
                  <form onSubmit={marginForm.handleSubmit((data) => createMarginMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={marginForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Şablon Adı</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-margin-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={marginForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ürün Kategorisi</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-margin-category">
                                <SelectValue placeholder="Kategori seçin" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {productCategories.map(cat => (
                                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={marginForm.control}
                      name="defaultMargin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Varsayılan Marj (örn: 1.20 = %20)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} data-testid="input-margin-default" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={marginForm.control}
                        name="minimumMargin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Min Marj</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} data-testid="input-margin-min" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={marginForm.control}
                        name="maximumMargin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Marj</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} data-testid="input-margin-max" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={createMarginMutation.isPending} data-testid="button-submit-margin">
                      {createMarginMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Kaydet
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {marginsLoading ? (
              <div className="col-span-full flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : profitMargins && profitMargins.length > 0 ? (
              profitMargins.map((margin: any) => (
                <Card key={margin.id} data-testid={`card-margin-${margin.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{margin.name}</h3>
                        <Badge variant="outline" className="mt-1">
                          {productCategories.find(c => c.value === margin.category)?.label || margin.category}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">{formatPercent(margin.defaultMargin)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatPercent(margin.minimumMargin)} - {formatPercent(margin.maximumMargin)}
                        </p>
                      </div>
                    </div>
                    {margin.description && (
                      <p className="text-sm text-muted-foreground mt-2">{margin.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="col-span-full text-sm text-muted-foreground text-center py-8">Henüz kar marjı şablonu bulunmuyor</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="hesaplamalar" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Son Maliyet Hesaplamaları</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {calculationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : costCalculations && costCalculations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ürün</TableHead>
                      <TableHead>Dönem</TableHead>
                      <TableHead className="text-right">Hammadde Maliyeti</TableHead>
                      <TableHead className="text-right">Genel Gider</TableHead>
                      <TableHead className="text-right">Toplam Maliyet</TableHead>
                      <TableHead className="text-right">Önerilen Fiyat</TableHead>
                      <TableHead className="text-right">Kar Marjı</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costCalculations.map((calc: any) => (
                      <TableRow key={calc.calculation?.id} data-testid={`row-calculation-${calc.calculation?.id}`}>
                        <TableCell className="font-medium">{calc.product?.name}</TableCell>
                        <TableCell>{calc.calculation?.periodMonth}/{calc.calculation?.periodYear}</TableCell>
                        <TableCell className="text-right">{formatCurrency(calc.calculation?.rawMaterialCost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(calc.calculation?.overheadCost)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(calc.calculation?.totalUnitCost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(calc.calculation?.suggestedSellingPrice)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            %{calc.calculation?.profitMarginPercentage}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Henüz maliyet hesaplaması yapılmamış</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
