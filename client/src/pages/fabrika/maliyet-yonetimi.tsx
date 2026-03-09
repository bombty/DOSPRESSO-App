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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Calculator, Package, Warehouse, TrendingUp, Plus, RefreshCw, 
  DollarSign, Percent, Building2, FileText, Settings2, BarChart3,
  Loader2, AlertTriangle, CheckCircle, Edit, Trash2, Users, Clock, Hash,
  Sparkles, Camera, Type, Upload, ArrowLeft, ArrowRight, Check, X, Search,
  ChevronsUpDown, Zap, PackageOpen, Cog, History, TrendingDown, Phone, Mail, MapPin, Building
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";

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

function ProductCostDetail({ productId, onEditLabor, onEditRecipe, onDeleteIngredient, onAddIngredient }: { productId: number; onEditLabor?: (recipeId: number) => void; onEditRecipe?: (recipeId: number) => void; onDeleteIngredient?: (recipeId: number, ingredientId: number) => void; onAddIngredient?: (recipeId: number) => void }) {
  const { toast } = useToast();
  const { data, isLoading, isError, refetch } = useQuery<any>({
    queryKey: ['/api/product-costs', productId],
  });

  const addPackagingMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await apiRequest("POST", "/api/packaging-items", values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-costs', productId] });
      queryClient.invalidateQueries({ queryKey: ['/api/cost-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cost-dashboard/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cost-dashboard/stats'] });
      toast({ title: "Ambalaj malzemesi eklendi" });
    }
  });

  const deletePackagingMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/packaging-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-costs', productId] });
      queryClient.invalidateQueries({ queryKey: ['/api/cost-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cost-dashboard/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cost-dashboard/stats'] });
      toast({ title: "Ambalaj malzemesi silindi" });
    }
  });

  const [editingIngredientId, setEditingIngredientId] = useState<number | null>(null);
  const [editIngredientQty, setEditIngredientQty] = useState("");
  const [editIngredientUnit, setEditIngredientUnit] = useState("");

  const updateIngredientMutation = useMutation({
    mutationFn: async ({ recipeId, ingredientId, quantity, unit }: { recipeId: number; ingredientId: number; quantity: string; unit: string }) => {
      const res = await apiRequest("PATCH", `/api/recipes/${recipeId}/ingredients/${ingredientId}`, { quantity, unit });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-costs', productId] });
      queryClient.invalidateQueries({ queryKey: ['/api/cost-dashboard'] });
      toast({ title: "Malzeme miktarı güncellendi" });
      setEditingIngredientId(null);
    },
    onError: () => {
      toast({ title: "Hata", description: "Malzeme güncellenemedi", variant: "destructive" });
    }
  });

  const [showAddPackaging, setShowAddPackaging] = useState(false);
  const [pkgName, setPkgName] = useState("");
  const [pkgUnitCost, setPkgUnitCost] = useState("");
  const [pkgQty, setPkgQty] = useState("1");
  const [pkgMaterialId, setPkgMaterialId] = useState<number | null>(null);

  const [showBatchYieldEdit, setShowBatchYieldEdit] = useState(false);
  const [byUnitWeight, setByUnitWeight] = useState("");
  const [byUnitWeightUnit, setByUnitWeightUnit] = useState("g");
  const [byOutputCount, setByOutputCount] = useState("");
  const [byTolerance, setByTolerance] = useState("5");

  const saveBatchYieldMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await apiRequest("PATCH", `/api/product-recipes/${values.recipeId}/batch-yield`, values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-costs', productId] });
      toast({ title: "Batch verim ayarları kaydedildi" });
      setShowBatchYieldEdit(false);
    }
  });

  const { data: pkgMaterialsList = [] } = useQuery<any[]>({
    queryKey: ['/api/raw-materials'],
  });

  if (isLoading) {
    
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

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
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Reçete Tipi</p>
            <Badge className={data.recipe?.recipeType === "KEYBLEND" ? "bg-amber-500" : ""}>
              {data.recipe?.recipeType}
            </Badge>
          </div>
          {onEditRecipe && data.recipe?.id && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEditRecipe(data.recipe.id)}
              data-testid="button-edit-recipe"
            >
              <Edit className="w-3 h-3 mr-1" />
              Reçete Düzenle
            </Button>
          )}
        </div>
      </div>

      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">İşçilik Bilgileri</p>
          </div>
          {onEditLabor && data.recipe?.id && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEditLabor(data.recipe.id)}
              data-testid="button-edit-labor"
            >
              <Edit className="w-3 h-3 mr-1" />
              Düzenle
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Personel Sayısı</p>
            <p className="font-medium" data-testid="text-worker-count">{data.labor?.workerCount || 1} kişi</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Üretim Süresi</p>
            <p className="font-medium" data-testid="text-production-time">{data.labor?.productionMinutes || 0} dakika</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Batch Miktarı</p>
            <p className="font-medium" data-testid="text-batch-size">{data.labor?.batchSize || 1} adet</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Saat Ücreti {data.labor?.isAutoRate && <Badge variant="outline" className="ml-1 text-[10px]">Otomatik</Badge>}</p>
            <p className="font-medium" data-testid="text-hourly-rate">{formatCurrency(data.labor?.hourlyRate)}</p>
          </div>
        </div>
        {data.labor?.formula && (
          <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-blue-200 dark:border-blue-700">
            Formül: {data.labor.formula} = {formatCurrency(data.labor.totalLaborCost)}
          </p>
        )}
      </div>

      <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-amber-600" />
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Enerji Maliyeti</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">kWh / Batch</p>
            <p className="font-medium" data-testid="text-kwh-per-batch">{data.energy?.kwhPerBatch || 0} kWh</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Birim Elektrik Fiyatı</p>
            <p className="font-medium" data-testid="text-kwh-price">{formatCurrency(data.energy?.kwhPrice)}/kWh</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cihaz</p>
            <p className="font-medium text-xs" data-testid="text-equipment">{data.energy?.equipmentDescription || "Tanımlanmadı"}</p>
          </div>
        </div>
        {data.energy?.formula && (
          <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-amber-200 dark:border-amber-700">
            Formül: {data.energy.formula} = {formatCurrency(data.energy.totalEnergyCost)}
          </p>
        )}
      </div>

      <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <PackageOpen className="w-4 h-4 text-teal-600" />
            <p className="text-sm font-medium text-teal-700 dark:text-teal-400">Ambalaj Maliyeti</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddPackaging(!showAddPackaging)}
            data-testid="button-add-packaging"
          >
            <Plus className="w-3 h-3 mr-1" />
            Ekle
          </Button>
        </div>
        {data.packaging?.items?.length > 0 ? (
          <div className="space-y-1">
            {data.packaging.items.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between text-sm py-1 border-b border-teal-100 dark:border-teal-800 last:border-0">
                <span>{item.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{item.quantity} {item.unit} x {formatCurrency(item.unitCost)}</span>
                  <span className="font-medium">{formatCurrency(parseFloat(item.quantity || "1") * parseFloat(item.unitCost))}</span>
                  <Button size="icon" variant="ghost" onClick={() => deletePackagingMutation.mutate(item.id)} data-testid={`button-delete-packaging-${item.id}`}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-1">Toplam: {formatCurrency(data.packaging.totalPackagingCost)}</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Ambalaj malzemesi tanımlanmamış</p>
        )}
        {showAddPackaging && (
          <div className="mt-2 pt-2 border-t border-teal-200 dark:border-teal-700 space-y-2">
            <div className="flex items-end gap-2 flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <label className="text-xs text-muted-foreground">Hammadde / Ambalaj Seç</label>
                <Select
                  value={pkgMaterialId?.toString() || ""}
                  onValueChange={(val) => {
                    const mid = parseInt(val);
                    setPkgMaterialId(mid);
                    const mat = (pkgMaterialsList as any[])?.find((m: any) => m.id === mid);
                    if (mat) {
                      setPkgName(mat.name);
                      setPkgUnitCost(mat.currentUnitPrice?.toString() || "0");
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-packaging-material">
                    <SelectValue placeholder="Malzeme seçin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(pkgMaterialsList as any[])?.map((mat: any) => (
                      <SelectItem key={mat.id} value={mat.id.toString()}>
                        {mat.name} - {mat.unit} (₺{parseFloat(mat.currentUnitPrice || "0").toLocaleString("tr-TR")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-20">
                <label className="text-xs text-muted-foreground">Adet</label>
                <Input value={pkgQty} onChange={(e) => setPkgQty(e.target.value)} type="number" data-testid="input-packaging-qty" />
              </div>
              <div className="w-24">
                <label className="text-xs text-muted-foreground">Birim Fiyat</label>
                <Input value={pkgUnitCost} onChange={(e) => setPkgUnitCost(e.target.value)} type="number" step="0.01" data-testid="input-packaging-cost" />
              </div>
              <Button
                size="sm"
                disabled={!pkgName || !pkgUnitCost}
                onClick={() => {
                  addPackagingMutation.mutate({ productId, name: pkgName, quantity: pkgQty, unitCost: pkgUnitCost, rawMaterialId: pkgMaterialId });
                  setPkgName(""); setPkgUnitCost(""); setPkgQty("1"); setPkgMaterialId(null);
                  setShowAddPackaging(false);
                }}
                data-testid="button-save-packaging"
              >
                <Check className="w-3 h-3 mr-1" />
                Kaydet
              </Button>
            </div>
          </div>
        )}
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
              <TableHead></TableHead>
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
                <TableCell className="text-right">
                  {editingIngredientId === ing.id ? (
                    <div className="flex items-center gap-1 justify-end">
                      <Input
                        type="number"
                        step="0.01"
                        value={editIngredientQty}
                        onChange={(e) => setEditIngredientQty(e.target.value)}
                        className="w-20 h-7 text-xs text-right"
                        data-testid={`input-edit-qty-${ing.id}`}
                      />
                      <span className="text-xs text-muted-foreground">{editIngredientUnit}</span>
                    </div>
                  ) : (
                    <span>{ing.quantity} {ing.unit}</span>
                  )}
                </TableCell>
                <TableCell className="text-right">{ing.isHidden ? "***" : formatCurrency(ing.unitCost)}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(ing.totalCost)}</TableCell>
                <TableCell>
                  {!ing.isHidden && data.recipe?.id && (
                    <div className="flex items-center gap-0.5 justify-end">
                      {editingIngredientId === ing.id ? (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              updateIngredientMutation.mutate({
                                recipeId: data.recipe.id,
                                ingredientId: ing.id,
                                quantity: editIngredientQty,
                                unit: editIngredientUnit
                              });
                            }}
                            disabled={updateIngredientMutation.isPending}
                            data-testid={`button-save-ingredient-${ing.id}`}
                          >
                            <Check className="w-3 h-3 text-green-600" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditingIngredientId(null)}
                            data-testid={`button-cancel-edit-${ing.id}`}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingIngredientId(ing.id);
                              setEditIngredientQty(ing.quantity);
                              setEditIngredientUnit(ing.unit);
                            }}
                            data-testid={`button-edit-ingredient-${ing.id}`}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          {onDeleteIngredient && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => onDeleteIngredient(data.recipe.id, ing.id)}
                              data-testid={`button-delete-ingredient-${ing.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {onAddIngredient && data.recipe?.id && (
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => onAddIngredient(data.recipe.id)}
            data-testid="button-add-ingredient-action"
          >
            <Plus className="w-3 h-3 mr-1" />
            Malzeme Ekle
          </Button>
        )}
        {data.batchYield && (
          <div className="mt-2 p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-sm font-medium">Toplam Malzeme:</span>
              <span className="text-sm font-bold" data-testid="text-total-ingredient-weight">
                {parseFloat(data.batchYield.totalIngredientWeightKg).toFixed(3)} kg
              </span>
            </div>
          </div>
        )}
      </div>

      {data.batchYield && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-red-600" />
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Batch Verim & Fire Hesaplama</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowBatchYieldEdit(!showBatchYieldEdit);
                if (!showBatchYieldEdit && data.batchYield) {
                  setByUnitWeight(data.batchYield.expectedUnitWeight?.toString() || "");
                  setByUnitWeightUnit(data.batchYield.expectedUnitWeightUnit || "g");
                  setByOutputCount(data.batchYield.expectedOutputCount?.toString() || "");
                  setByTolerance(data.batchYield.wasteTolerancePercent || "5");
                }
              }}
              data-testid="button-edit-batch-yield"
            >
              <Edit className="w-3 h-3 mr-1" />
              {showBatchYieldEdit ? "Kapat" : "Ayarla"}
            </Button>
          </div>

          {data.batchYield.isConfigured ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Birim Gramaj</p>
                  <p className="font-medium" data-testid="text-unit-weight">
                    {data.batchYield.expectedUnitWeight} {data.batchYield.expectedUnitWeightUnit}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Beklenen Adet</p>
                  <p className="font-medium" data-testid="text-expected-output">{data.batchYield.expectedOutputCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Beklenen Toplam</p>
                  <p className="font-medium" data-testid="text-expected-total-output">
                    {parseFloat(data.batchYield.calculatedTotalOutputKg).toFixed(3)} kg
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fire Toleransı</p>
                  <p className="font-medium" data-testid="text-waste-tolerance">%{data.batchYield.wasteTolerancePercent}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-red-200 dark:border-red-700">
                <div>
                  <p className="text-xs text-muted-foreground">Beklenen Fire</p>
                  <p className="font-medium text-red-600 dark:text-red-400" data-testid="text-expected-waste">
                    {parseFloat(data.batchYield.expectedWasteKg).toFixed(3)} kg (%{data.batchYield.expectedWastePercent})
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fire Maliyeti</p>
                  <p className="font-medium text-red-600 dark:text-red-400" data-testid="text-expected-waste-cost">
                    {formatCurrency(data.batchYield.expectedWasteCostTl)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Formül</p>
                  <p className="text-xs text-muted-foreground">
                    {parseFloat(data.batchYield.totalIngredientWeightKg).toFixed(3)} kg - ({data.batchYield.expectedOutputCount} x {data.batchYield.expectedUnitWeight}{data.batchYield.expectedUnitWeightUnit}) = Fire
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Batch verim hesaplaması yapmak için birim gramaj ve beklenen adet bilgilerini girin.
            </p>
          )}

          {showBatchYieldEdit && (
            <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-700 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Birim Gramaj/ml</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={byUnitWeight}
                    onChange={(e) => setByUnitWeight(e.target.value)}
                    placeholder="25"
                    data-testid="input-unit-weight"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Birim</label>
                  <Select value={byUnitWeightUnit} onValueChange={setByUnitWeightUnit}>
                    <SelectTrigger data-testid="select-unit-weight-unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="g">gram (g)</SelectItem>
                      <SelectItem value="ml">mililitre (ml)</SelectItem>
                      <SelectItem value="kg">kilogram (kg)</SelectItem>
                      <SelectItem value="lt">litre (lt)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Beklenen Adet</label>
                  <Input
                    type="number"
                    value={byOutputCount}
                    onChange={(e) => setByOutputCount(e.target.value)}
                    placeholder="50"
                    data-testid="input-expected-output-count"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Fire Toleransı (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={byTolerance}
                    onChange={(e) => setByTolerance(e.target.value)}
                    placeholder="5"
                    data-testid="input-waste-tolerance"
                  />
                </div>
              </div>

              {byUnitWeight && byOutputCount && (
                <div className="p-2 rounded bg-red-100 dark:bg-red-900/30 text-xs space-y-1">
                  {(() => {
                    const totalKg = parseFloat(data.batchYield.totalIngredientWeightKg);
                    const unitW = parseFloat(byUnitWeight);
                    const count = parseInt(byOutputCount);
                    const unit = byUnitWeightUnit;
                    let outputKg = 0;
                    if (unit === "g" || unit === "ml") outputKg = (unitW * count) / 1000;
                    else outputKg = unitW * count;
                    const wasteKg = totalKg - outputKg;
                    const wastePct = totalKg > 0 ? (wasteKg / totalKg) * 100 : 0;
                    const costPerKg = parseFloat(data.batchYield.wasteCostPerKg);
                    const wasteCost = wasteKg * costPerKg;
                    return (
                      <>
                        <p>Toplam Girdi: <strong>{totalKg.toFixed(3)} kg</strong></p>
                        <p>Beklenen Toplam Ürün: <strong>{outputKg.toFixed(3)} kg</strong> ({count} adet x {unitW} {unit})</p>
                        <p>Hesaplanan Fire: <strong className="text-red-600">{wasteKg.toFixed(3)} kg (%{wastePct.toFixed(2)})</strong></p>
                        <p>Tahmini Fire Maliyeti: <strong className="text-red-600">{formatCurrency(wasteCost)}</strong></p>
                      </>
                    );
                  })()}
                </div>
              )}

              <Button
                size="sm"
                disabled={!byUnitWeight || !byOutputCount || saveBatchYieldMutation.isPending}
                onClick={() => {
                  saveBatchYieldMutation.mutate({
                    recipeId: data.recipe.id,
                    expectedUnitWeight: parseFloat(byUnitWeight),
                    expectedUnitWeightUnit: byUnitWeightUnit,
                    expectedOutputCount: parseInt(byOutputCount),
                    wasteTolerancePercent: parseFloat(byTolerance || "5")
                  });
                }}
                data-testid="button-save-batch-yield"
              >
                {saveBatchYieldMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                Kaydet
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-4 border-t">
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">Hammadde Maliyeti</p>
          <p className="font-bold" data-testid="text-raw-material-cost">{formatCurrency(data.costs?.rawMaterialCost)}</p>
        </div>
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <p className="text-xs text-muted-foreground">İşçilik Maliyeti</p>
          <p className="font-bold text-blue-700 dark:text-blue-400" data-testid="text-labor-cost">{formatCurrency(data.costs?.laborCost)}</p>
        </div>
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
          <p className="text-xs text-muted-foreground">Enerji Maliyeti</p>
          <p className="font-bold text-amber-700 dark:text-amber-400" data-testid="text-energy-cost">{formatCurrency(data.costs?.energyCost)}</p>
        </div>
        <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-900/20">
          <p className="text-xs text-muted-foreground">Ambalaj Maliyeti</p>
          <p className="font-bold text-teal-700 dark:text-teal-400" data-testid="text-packaging-cost">{formatCurrency(data.costs?.packagingCost)}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">Genel Gider Payı</p>
          <p className="font-bold" data-testid="text-overhead-cost">{formatCurrency(data.costs?.overheadCost)}</p>
        </div>
        <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
          <p className="text-xs text-muted-foreground">Toplam Birim Maliyet</p>
          <p className="font-bold text-purple-700 dark:text-purple-400" data-testid="text-total-unit-cost">{formatCurrency(data.costs?.totalUnitCost)}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">Kar Marjı</p>
          <p className="font-bold" data-testid="text-profit-margin">{data.costs?.profitMargin}</p>
        </div>
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
          <p className="text-xs text-muted-foreground">Önerilen Fiyat</p>
          <p className="font-bold text-green-700 dark:text-green-400" data-testid="text-suggested-price">{formatCurrency(data.costs?.suggestedPrice)}</p>
        </div>
      </div>
    </div>
  );
}

function MaterialPriceHistoryDialog({ materialId, open, onOpenChange }: { materialId: number; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/raw-materials', materialId, 'price-history'],
    enabled: !!materialId && open,
  });

  const material = data?.material;
  const supplier = data?.supplier;
  const history = data?.history || [];

  const chartData = [...history].reverse().map((h: any) => ({
    date: new Date(h.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: '2-digit' }),
    price: parseFloat(h.newPrice || "0"),
    fullDate: new Date(h.createdAt).toLocaleDateString('tr-TR'),
  }));

  const priceChange = history.length >= 2 
    ? parseFloat(history[0].newPrice) - parseFloat(history[1].newPrice) 
    : 0;
  const priceChangePercent = history.length >= 2 && parseFloat(history[1].newPrice) > 0
    ? ((priceChange / parseFloat(history[1].newPrice)) * 100).toFixed(1)
    : "0";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Hammadde Detayı
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : material ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Kod</p>
                <p className="font-mono font-semibold text-sm" data-testid="text-material-code">{material.code}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Birim</p>
                <p className="font-semibold text-sm" data-testid="text-material-unit">{material.unit}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <p className="text-xs text-muted-foreground">Güncel Fiyat</p>
                <p className="font-bold text-sm text-blue-700 dark:text-blue-400" data-testid="text-material-price">
                  {formatCurrency(material.currentUnitPrice)}/{material.unit}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Son Değişim</p>
                <div className="flex items-center gap-1">
                  {priceChange > 0 ? (
                    <TrendingUp className="w-3 h-3 text-red-500" />
                  ) : priceChange < 0 ? (
                    <TrendingDown className="w-3 h-3 text-green-500" />
                  ) : null}
                  <p className={`font-semibold text-sm ${priceChange > 0 ? 'text-red-600 dark:text-red-400' : priceChange < 0 ? 'text-green-600 dark:text-green-400' : ''}`} data-testid="text-price-change">
                    {priceChange > 0 ? '+' : ''}{priceChangePercent}%
                  </p>
                </div>
              </div>
            </div>

            {supplier && (
              <Card>
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Tedarikçi Bilgileri
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-medium" data-testid="text-supplier-name">{supplier.name}</span>
                    </div>
                    {supplier.contactPerson && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        <span data-testid="text-supplier-contact">{supplier.contactPerson}</span>
                      </div>
                    )}
                    {supplier.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" />
                        <span data-testid="text-supplier-phone">{supplier.phone}</span>
                      </div>
                    )}
                    {supplier.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-3.5 h-3.5" />
                        <span data-testid="text-supplier-email">{supplier.email}</span>
                      </div>
                    )}
                    {supplier.city && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" />
                        <span data-testid="text-supplier-city">{supplier.city}</span>
                      </div>
                    )}
                    {supplier.paymentTermDays && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Vade: {supplier.paymentTermDays} gün</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {chartData.length > 1 && (
              <Card>
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Fiyat Geçmişi Grafiği
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 11 }} 
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 11 }} 
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `₺${v.toLocaleString('tr-TR')}`}
                      />
                      <RechartsTooltip 
                        formatter={(value: any) => [`₺${parseFloat(value).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`, 'Fiyat']}
                        labelFormatter={(label) => `Tarih: ${label}`}
                        contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="price" 
                        stroke="hsl(217, 91%, 60%)" 
                        strokeWidth={2}
                        fill="url(#priceGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Fiyat Değişim Tablosu
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {history.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tarih</TableHead>
                        <TableHead className="text-right">Eski Fiyat</TableHead>
                        <TableHead className="text-right">Yeni Fiyat</TableHead>
                        <TableHead className="text-right">Değişim</TableHead>
                        <TableHead>Kaynak</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((h: any) => {
                        const change = parseFloat(h.changePercent || "0");
                        const sourceLabels: Record<string, string> = {
                          'manual': 'Manuel',
                          'sync_purchase': 'Satınalma Senkron',
                          'sync_receipts': 'Mal Kabul Senkron',
                          'initial_seed': 'İlk Kayıt',
                        };
                        return (
                          <TableRow key={h.id} data-testid={`row-price-history-${h.id}`}>
                            <TableCell className="text-sm">
                              {new Date(h.createdAt).toLocaleDateString('tr-TR')}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {h.previousPrice ? formatCurrency(h.previousPrice) : '-'}
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium">
                              {formatCurrency(h.newPrice)}
                            </TableCell>
                            <TableCell className="text-right">
                              {change !== 0 ? (
                                <Badge 
                                  variant="outline" 
                                  className={change > 0 ? 'text-red-600 border-red-200 dark:text-red-400 dark:border-red-800' : 'text-green-600 border-green-200 dark:text-green-400 dark:border-green-800'}
                                >
                                  {change > 0 ? '+' : ''}{change.toFixed(1)}%
                                </Badge>
                              ) : (
                                <Badge variant="outline">-</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {sourceLabels[h.source] || h.source}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">Henüz fiyat geçmişi bulunmuyor</p>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">Hammadde bilgisi bulunamadı</p>
        )}
      </DialogContent>
    </Dialog>
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
  
  const [isEditMaterialDialogOpen, setIsEditMaterialDialogOpen] = useState(false);
  const [isEditCostDialogOpen, setIsEditCostDialogOpen] = useState(false);
  const [isEditMarginDialogOpen, setIsEditMarginDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any>(null);
  const [editingCost, setEditingCost] = useState<any>(null);
  const [editingMargin, setEditingMargin] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteType, setDeleteType] = useState<'material' | 'cost' | 'margin' | 'machine' | null>(null);
  const [isEditLaborDialogOpen, setIsEditLaborDialogOpen] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState<number | null>(null);
  const [laborWorkerCount, setLaborWorkerCount] = useState(1);
  const [laborProductionMinutes, setLaborProductionMinutes] = useState(0);
  const [laborBatchSize, setLaborBatchSize] = useState(1);
  const [laborHourlyRate, setLaborHourlyRate] = useState("0");
  const [energyKwhPerBatch, setEnergyKwhPerBatch] = useState("0");
  const [energyEquipment, setEnergyEquipment] = useState("");
  const [energyMachineId, setEnergyMachineId] = useState<number | null>(null);
  const [isEditRecipeDialogOpen, setIsEditRecipeDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<any>(null);
  const [recipeName, setRecipeName] = useState("");
  const [recipeType, setRecipeType] = useState("OPEN");
  const [recipeOutputQty, setRecipeOutputQty] = useState("1");
  const [recipeOutputUnit, setRecipeOutputUnit] = useState("adet");
  const [recipeNotes, setRecipeNotes] = useState("");
  const [isAddIngredientDialogOpen, setIsAddIngredientDialogOpen] = useState(false);
  const [newIngredientMaterialId, setNewIngredientMaterialId] = useState<number | null>(null);
  const [newIngredientQuantity, setNewIngredientQuantity] = useState("");
  const [newIngredientUnit, setNewIngredientUnit] = useState("gr");

  const [isMaterialDetailOpen, setIsMaterialDetailOpen] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null);

  const [isAddMachineDialogOpen, setIsAddMachineDialogOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<any>(null);
  const [machineName, setMachineName] = useState("");
  const [machineDescription, setMachineDescription] = useState("");
  const [machineKwh, setMachineKwh] = useState("0");
  const [machineIsActive, setMachineIsActive] = useState(true);
  const [machineProductIds, setMachineProductIds] = useState<number[]>([]);

  const [isAiRecipeDialogOpen, setIsAiRecipeDialogOpen] = useState(false);
  const [aiMode, setAiMode] = useState<"photo" | "text">("photo");
  const [aiTextInput, setAiTextInput] = useState("");
  const [aiImageBase64, setAiImageBase64] = useState<string | null>(null);
  const [aiImagePreview, setAiImagePreview] = useState<string | null>(null);
  const [aiStep, setAiStep] = useState<"input" | "review">("input");
  const [aiParsedResult, setAiParsedResult] = useState<any>(null);
  const [aiSelectedProductId, setAiSelectedProductId] = useState<number | null>(null);
  const [aiRecipeName, setAiRecipeName] = useState("");
  const [aiRecipeType, setAiRecipeType] = useState("OPEN");
  const [aiIngredients, setAiIngredients] = useState<any[]>([]);
  const [openMaterialPopoverIdx, setOpenMaterialPopoverIdx] = useState<number | null>(null);
  const [aiActionMode, setAiActionMode] = useState<"create" | "update">("create");
  const [aiSelectedRecipeId, setAiSelectedRecipeId] = useState<number | null>(null);
  const [isNewMaterialDialogOpen, setIsNewMaterialDialogOpen] = useState(false);
  const [newMaterialForIdx, setNewMaterialForIdx] = useState<number | null>(null);
  const [newMaterialName, setNewMaterialName] = useState("");
  const [newMaterialCode, setNewMaterialCode] = useState("");
  const [newMaterialUnit, setNewMaterialUnit] = useState("gr");
  const [newMaterialCategory, setNewMaterialCategory] = useState("");
  const [newMaterialPrice, setNewMaterialPrice] = useState("0");

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

  const { data: factoryMachinesList = [] } = useQuery<any[]>({
    queryKey: ['/api/factory-machines'],
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

  const updateMaterialMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PUT", `/api/raw-materials/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/raw-materials'] });
      setIsEditMaterialDialogOpen(false);
      setEditingMaterial(null);
      toast({ title: "Hammadde güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Hammadde güncellenemedi", variant: "destructive" });
    }
  });

  const updateCostMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PUT", `/api/fixed-costs/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fixed-costs'] });
      setIsEditCostDialogOpen(false);
      setEditingCost(null);
      toast({ title: "Sabit gider güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Sabit gider güncellenemedi", variant: "destructive" });
    }
  });

  const updateMarginMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PUT", `/api/profit-margins/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profit-margins'] });
      setIsEditMarginDialogOpen(false);
      setEditingMargin(null);
      toast({ title: "Kar marjı güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Kar marjı güncellenemedi", variant: "destructive" });
    }
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/raw-materials/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/raw-materials'] });
      setDeleteConfirmId(null);
      setDeleteType(null);
      toast({ title: "Hammadde silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Hammadde silinemedi", variant: "destructive" });
    }
  });

  const deleteCostMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/fixed-costs/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fixed-costs'] });
      setDeleteConfirmId(null);
      setDeleteType(null);
      toast({ title: "Sabit gider silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Sabit gider silinemedi", variant: "destructive" });
    }
  });

  const deleteMarginMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/profit-margins/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profit-margins'] });
      setDeleteConfirmId(null);
      setDeleteType(null);
      toast({ title: "Kar marjı silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Kar marjı silinemedi", variant: "destructive" });
    }
  });

  const updateRecipeLaborMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PUT", `/api/recipes/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-costs'] });
      if (selectedProductId) {
        queryClient.invalidateQueries({ queryKey: ['/api/product-costs', selectedProductId] });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/cost-dashboard'] });
      setIsEditLaborDialogOpen(false);
      setEditingRecipeId(null);
      toast({ title: "İşçilik & enerji bilgileri güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "İşçilik bilgileri güncellenemedi", variant: "destructive" });
    }
  });

  const updateRecipeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PUT", `/api/recipes/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-costs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cost-dashboard'] });
      setIsEditRecipeDialogOpen(false);
      toast({ title: "Reçete güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Reçete güncellenemedi", variant: "destructive" });
    }
  });

  const addIngredientMutation = useMutation({
    mutationFn: async ({ recipeId, rawMaterialId, quantity, unit }: { recipeId: number; rawMaterialId: number; quantity: string; unit: string }) => {
      return apiRequest("POST", `/api/recipes/${recipeId}/ingredients`, { rawMaterialId, quantity, unit });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-costs'] });
      setIsAddIngredientDialogOpen(false);
      setNewIngredientMaterialId(null);
      setNewIngredientQuantity("");
      setNewIngredientUnit("gr");
      toast({ title: "Malzeme eklendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Malzeme eklenemedi", variant: "destructive" });
    }
  });

  function resetAiDialog() {
    setIsAiRecipeDialogOpen(false);
    setAiStep("input");
    setAiMode("photo");
    setAiTextInput("");
    setAiImageBase64(null);
    setAiImagePreview(null);
    setAiParsedResult(null);
    setAiSelectedProductId(null);
    setAiRecipeName("");
    setAiRecipeType("OPEN");
    setAiIngredients([]);
    setOpenMaterialPopoverIdx(null);
    setAiActionMode("create");
    setAiSelectedRecipeId(null);
  }

  function resetNewMaterialDialog() {
    setIsNewMaterialDialogOpen(false);
    setNewMaterialForIdx(null);
    setNewMaterialName("");
    setNewMaterialCode("");
    setNewMaterialUnit("gr");
    setNewMaterialCategory("");
    setNewMaterialPrice("0");
  }

  const aiParseMutation = useMutation({
    mutationFn: async (data: { imageBase64?: string | null; textInput?: string; mode: string }) => {
      const res = await apiRequest("POST", "/api/recipes/ai-parse", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      setAiParsedResult(data);
      setAiRecipeName(data.parsed?.productName || "");
      setAiRecipeType(data.parsed?.recipeType || "OPEN");
      if (data.matchedProduct) {
        setAiSelectedProductId(data.matchedProduct.id);
      }
      const mappedIngredients = (data.ingredients || []).map((ing: any, idx: number) => ({
        id: idx,
        originalName: ing.originalName,
        quantity: ing.quantity?.toString() || "0",
        unit: ing.unit || "gr",
        rawMaterialId: ing.matchedMaterial?.id || null,
        isMatched: ing.isMatched,
        matchScore: ing.matchScore,
        matchedMaterialName: ing.matchedMaterial?.name || null,
      }));
      setAiIngredients(mappedIngredients);
      if (mappedIngredients.length === 0) {
        toast({ title: "Uyarı", description: "AI reçeteden malzeme çıkaramadı. Lütfen farklı bir fotoğraf veya metin deneyin.", variant: "destructive" });
      } else {
        setAiStep("review");
      }
    },
    onError: (error: any) => {
      toast({ title: "AI Analiz Hatası", description: error.message || "Reçete analiz edilemedi", variant: "destructive" });
    }
  });

  const aiCreateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/recipes/ai-create", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-costs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cost-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      toast({ title: "Reçete Oluşturuldu", description: data.message });
      resetAiDialog();
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Reçete oluşturulamadı", variant: "destructive" });
    }
  });

  const aiUpdateMutation = useMutation({
    mutationFn: async ({ recipeId, data }: { recipeId: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/recipes/${recipeId}/ai-update`, data);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-costs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cost-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      toast({ title: "Reçete Güncellendi", description: data.message });
      resetAiDialog();
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Reçete güncellenemedi", variant: "destructive" });
    }
  });

  const createNewMaterialMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/raw-materials", data);
      return res.json();
    },
    onSuccess: (newMaterial: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/raw-materials'] });
      if (newMaterialForIdx !== null) {
        const updated = [...aiIngredients];
        updated[newMaterialForIdx] = {
          ...updated[newMaterialForIdx],
          rawMaterialId: newMaterial.id,
          isMatched: true,
          matchedMaterialName: newMaterial.name,
        };
        setAiIngredients(updated);
        if (aiParsedResult) {
          setAiParsedResult({
            ...aiParsedResult,
            allMaterials: [...(aiParsedResult.allMaterials || []), newMaterial],
          });
        }
      }
      toast({ title: "Hammadde Oluşturuldu", description: `${newMaterial.name} başarıyla eklendi` });
      resetNewMaterialDialog();
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Hammadde oluşturulamadı", variant: "destructive" });
    }
  });

  const handleAiImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setAiImageBase64(base64);
      setAiImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleAiParse = () => {
    if (aiMode === "photo" && aiImageBase64) {
      aiParseMutation.mutate({ imageBase64: aiImageBase64, mode: "photo" });
    } else if (aiMode === "text" && aiTextInput.trim()) {
      aiParseMutation.mutate({ textInput: aiTextInput, mode: "text" });
    }
  };

  const handleAiCreate = () => {
    const validIngredients = aiIngredients.filter(ing => ing.rawMaterialId && parseFloat(ing.quantity) > 0);
    if (validIngredients.length === 0) {
      toast({ title: "Eksik Bilgi", description: "En az bir eşleşmiş malzeme gerekli", variant: "destructive" });
      return;
    }

    const ingredientData = validIngredients.map(ing => ({
      rawMaterialId: ing.rawMaterialId,
      quantity: ing.quantity,
      unit: ing.unit,
    }));

    if (aiActionMode === "update" && aiSelectedRecipeId) {
      aiUpdateMutation.mutate({
        recipeId: aiSelectedRecipeId,
        data: {
          recipeName: aiRecipeName,
          recipeType: aiRecipeType,
          outputQuantity: aiParsedResult?.parsed?.batchSize?.toString() || "1",
          outputUnit: aiParsedResult?.parsed?.outputUnit || "adet",
          productionTimeMinutes: aiParsedResult?.parsed?.productionTimeMinutes || 0,
          notes: "AI ile güncellendi",
          ingredients: ingredientData,
        },
      });
    } else {
      if (!aiSelectedProductId || !aiRecipeName) {
        toast({ title: "Eksik Bilgi", description: "Ürün ve reçete adı gerekli", variant: "destructive" });
        return;
      }
      aiCreateMutation.mutate({
        productId: aiSelectedProductId,
        recipeName: aiRecipeName,
        recipeType: aiRecipeType,
        outputQuantity: aiParsedResult?.parsed?.batchSize?.toString() || "1",
        outputUnit: aiParsedResult?.parsed?.outputUnit || "adet",
        productionTimeMinutes: aiParsedResult?.parsed?.productionTimeMinutes || 0,
        notes: aiParsedResult?.parsed?.notes || "AI tarafından oluşturuldu",
        ingredients: ingredientData,
      });
    }
  };

  const handleOpenNewMaterialDialog = (idx: number) => {
    const ing = aiIngredients[idx];
    setNewMaterialForIdx(idx);
    setNewMaterialName(ing?.originalName || "");
    setNewMaterialCode("HM-" + (ing?.originalName || "").toLocaleUpperCase('tr-TR').replace(/\s+/g, "-").substring(0, 15));
    setNewMaterialUnit(ing?.unit || "gr");
    setNewMaterialCategory("Genel");
    setNewMaterialPrice("0");
    setIsNewMaterialDialogOpen(true);
  };

  const handleCreateNewMaterial = () => {
    if (!newMaterialName || !newMaterialCode || !newMaterialUnit) {
      toast({ title: "Eksik Bilgi", description: "Ad, kod ve birim zorunludur", variant: "destructive" });
      return;
    }
    createNewMaterialMutation.mutate({
      name: newMaterialName,
      code: newMaterialCode,
      unit: newMaterialUnit,
      category: newMaterialCategory || null,
      currentUnitPrice: newMaterialPrice || "0",
    });
  };

  const deleteIngredientMutation = useMutation({
    mutationFn: async ({ recipeId, ingredientId }: { recipeId: number; ingredientId: number }) => {
      return apiRequest("DELETE", `/api/recipes/${recipeId}/ingredients/${ingredientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-costs'] });
      toast({ title: "Malzeme silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Malzeme silinemedi", variant: "destructive" });
    }
  });

  const createMachineMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/factory-machines", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/factory-machines'] });
      setIsAddMachineDialogOpen(false);
      resetMachineForm();
      toast({ title: "Cihaz eklendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Cihaz eklenemedi", variant: "destructive" });
    }
  });

  const updateMachineMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PUT", `/api/factory-machines/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/factory-machines'] });
      setIsAddMachineDialogOpen(false);
      setEditingMachine(null);
      resetMachineForm();
      toast({ title: "Cihaz güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Cihaz güncellenemedi", variant: "destructive" });
    }
  });

  const deleteMachineMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/factory-machines/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/factory-machines'] });
      setDeleteConfirmId(null);
      setDeleteType(null);
      toast({ title: "Cihaz silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Cihaz silinemedi", variant: "destructive" });
    }
  });

  const resetMachineForm = () => {
    setMachineName("");
    setMachineDescription("");
    setMachineKwh("0");
    setMachineIsActive(true);
    setMachineProductIds([]);
  };

  const openEditMachineDialog = (machine: any) => {
    setEditingMachine(machine);
    setMachineName(machine.name || "");
    setMachineDescription(machine.description || "");
    setMachineKwh(machine.kwhConsumption?.toString() || "0");
    setMachineIsActive(machine.isActive !== false);
    setMachineProductIds(machine.products?.map((p: any) => p.productId || p.id) || []);
    setIsAddMachineDialogOpen(true);
  };

  const handleSaveMachine = () => {
    const data = {
      name: machineName,
      description: machineDescription,
      kwhConsumption: parseFloat(machineKwh) || 0,
      isActive: machineIsActive,
      productIds: machineProductIds,
    };
    if (editingMachine) {
      updateMachineMutation.mutate({ id: editingMachine.id, data });
    } else {
      createMachineMutation.mutate(data);
    }
  };

  const openEditLaborDialog = (recipeId: number) => {
    setEditingRecipeId(recipeId);
    if (selectedProductId) {
      const cachedData = queryClient.getQueryData(['/api/product-costs', selectedProductId]) as any;
      if (cachedData?.recipe) {
        setLaborWorkerCount(cachedData.recipe.laborWorkerCount || 1);
        setLaborProductionMinutes(cachedData.recipe.productionTimeMinutes || 0);
        setLaborBatchSize(cachedData.recipe.laborBatchSize || 1);
        setLaborHourlyRate(cachedData.recipe.laborHourlyRate?.toString() || "0");
        setEnergyKwhPerBatch(cachedData.recipe.energyKwhPerBatch?.toString() || "0");
        setEnergyEquipment(cachedData.recipe.equipmentDescription || "");
        setEnergyMachineId(cachedData.recipe.machineId || null);
      }
    }
    setIsEditLaborDialogOpen(true);
  };

  const openEditRecipeDialog = (recipeId: number) => {
    setEditingRecipeId(recipeId);
    if (selectedProductId) {
      const cachedData = queryClient.getQueryData(['/api/product-costs', selectedProductId]) as any;
      if (cachedData?.recipe) {
        setRecipeName(cachedData.recipe.name || "");
        setRecipeType(cachedData.recipe.recipeType || "OPEN");
        setRecipeOutputQty(cachedData.recipe.outputQuantity?.toString() || "1");
        setRecipeOutputUnit(cachedData.recipe.outputUnit || "adet");
        setRecipeNotes(cachedData.recipe.notes || "");
        setEditingRecipe(cachedData.recipe);
      }
    }
    setIsEditRecipeDialogOpen(true);
  };

  const handleDelete = () => {
    if (deleteConfirmId === null || !deleteType) return;
    
    if (deleteType === 'material') {
      deleteMaterialMutation.mutate(deleteConfirmId);
    } else if (deleteType === 'cost') {
      deleteCostMutation.mutate(deleteConfirmId);
    } else if (deleteType === 'margin') {
      deleteMarginMutation.mutate(deleteConfirmId);
    } else if (deleteType === 'machine') {
      deleteMachineMutation.mutate(deleteConfirmId);
    }
  };

  const editMaterialForm = useForm<z.infer<typeof rawMaterialSchema>>({
    resolver: zodResolver(rawMaterialSchema),
    defaultValues: { code: "", name: "", category: "", unit: "kg", currentUnitPrice: "0" }
  });

  const editCostForm = useForm<z.infer<typeof fixedCostSchema>>({
    resolver: zodResolver(fixedCostSchema),
    defaultValues: { category: "", name: "", description: "", monthlyAmount: "", isRecurring: true }
  });

  const editMarginForm = useForm<z.infer<typeof profitMarginSchema>>({
    resolver: zodResolver(profitMarginSchema),
    defaultValues: { name: "", category: "", defaultMargin: "1.20", minimumMargin: "1.01", maximumMargin: "2.00", description: "" }
  });

  const openEditMaterialDialog = (material: any) => {
    setEditingMaterial(material);
    editMaterialForm.reset({
      code: material.code || "",
      name: material.name || "",
      category: material.category || "",
      unit: material.unit || "kg",
      currentUnitPrice: material.currentUnitPrice?.toString() || "0"
    });
    setIsEditMaterialDialogOpen(true);
  };

  const openEditCostDialog = (cost: any) => {
    setEditingCost(cost);
    editCostForm.reset({
      category: cost.category || "",
      name: cost.name || "",
      description: cost.description || "",
      monthlyAmount: cost.monthlyAmount?.toString() || "",
      isRecurring: cost.isRecurring ?? true
    });
    setIsEditCostDialogOpen(true);
  };

  const openEditMarginDialog = (margin: any) => {
    setEditingMargin(margin);
    editMarginForm.reset({
      name: margin.name || "",
      category: margin.category || "",
      defaultMargin: margin.defaultMargin?.toString() || "1.20",
      minimumMargin: margin.minimumMargin?.toString() || "1.01",
      maximumMargin: margin.maximumMargin?.toString() || "2.00",
      description: margin.description || ""
    });
    setIsEditMarginDialogOpen(true);
  };

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
          <TabsTrigger value="cihazlar" data-testid="tab-cihazlar">Cihazlar</TabsTrigger>
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
                        <TableRow
                          key={item.product?.id}
                          data-testid={`row-product-${item.product?.id}`}
                          className="cursor-pointer hover-elevate"
                          onClick={() => {
                            setSelectedProductId(item.product?.id);
                            setIsProductCostDialogOpen(true);
                          }}
                        >
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
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rawMaterials.map((material: any) => (
                      <TableRow key={material.id} data-testid={`row-material-${material.id}`}>
                        <TableCell className="font-mono text-sm">{material.code}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            className="p-0 h-auto text-left font-medium text-blue-600 dark:text-blue-400"
                            onClick={() => { setSelectedMaterialId(material.id); setIsMaterialDetailOpen(true); }}
                            data-testid={`button-material-detail-${material.id}`}
                          >
                            {material.name}
                          </Button>
                        </TableCell>
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
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEditMaterialDialog(material)}
                              data-testid={`button-edit-material-${material.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => { setDeleteConfirmId(material.id); setDeleteType('material'); }}
                              data-testid={`button-delete-material-${material.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
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
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm">Reçeteli Ürünler</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAiRecipeDialogOpen(true)}
                  data-testid="button-ai-recipe"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI ile Oluştur
                </Button>
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
                        <TableRow
                          key={item.product?.id}
                          data-testid={`row-product-${item.product?.id}`}
                          className="cursor-pointer hover-elevate"
                          onClick={() => {
                            setSelectedProductId(item.product?.id);
                            setIsProductCostDialogOpen(true);
                          }}
                        >
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
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProductId(item.product?.id);
                                  setIsProductCostDialogOpen(true);
                                }}
                                data-testid={`button-view-cost-${item.product?.id}`}
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProductId(item.product?.id);
                                  if (item.recipe?.id) {
                                    openEditRecipeDialog(item.recipe.id);
                                  }
                                }}
                                data-testid={`button-edit-recipe-${item.product?.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
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
              {selectedProductId && (
                <ProductCostDetail 
                  productId={selectedProductId} 
                  onEditLabor={openEditLaborDialog}
                  onEditRecipe={openEditRecipeDialog}
                  onDeleteIngredient={(recipeId, ingredientId) => deleteIngredientMutation.mutate({ recipeId, ingredientId })}
                  onAddIngredient={(recipeId) => {
                    setEditingRecipeId(recipeId);
                    setNewIngredientMaterialId(null);
                    setNewIngredientQuantity("");
                    setNewIngredientUnit("gr");
                    setIsAddIngredientDialogOpen(true);
                  }}
                />
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={isEditLaborDialogOpen} onOpenChange={setIsEditLaborDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>İşçilik & Enerji Bilgilerini Düzenle</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-xs font-medium text-blue-600 flex items-center gap-1"><Users className="w-3 h-3" /> İşçilik</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Personel Sayısı</label>
                    <Input
                      type="number"
                      min={1}
                      value={laborWorkerCount}
                      onChange={(e) => setLaborWorkerCount(parseInt(e.target.value) || 1)}
                      data-testid="input-labor-worker-count"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Üretim Süresi (dk)</label>
                    <Input
                      type="number"
                      min={0}
                      value={laborProductionMinutes}
                      onChange={(e) => setLaborProductionMinutes(parseInt(e.target.value) || 0)}
                      data-testid="input-labor-production-time"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Batch Miktarı (adet)</label>
                    <Input
                      type="number"
                      min={1}
                      value={laborBatchSize}
                      onChange={(e) => setLaborBatchSize(parseInt(e.target.value) || 1)}
                      data-testid="input-labor-batch-size"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Saat Ücreti (₺) <span className="text-xs text-muted-foreground">0=Otomatik</span></label>
                    <Input
                      type="number"
                      step="0.01"
                      value={laborHourlyRate}
                      onChange={(e) => setLaborHourlyRate(e.target.value)}
                      data-testid="input-labor-hourly-rate"
                    />
                  </div>
                </div>
                <p className="text-xs font-medium text-amber-600 flex items-center gap-1 pt-2 border-t"><Zap className="w-3 h-3" /> Enerji</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">kWh / Batch</label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={energyKwhPerBatch}
                      onChange={(e) => setEnergyKwhPerBatch(e.target.value)}
                      data-testid="input-energy-kwh"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Kullanılan Cihaz</label>
                    <Select
                      value={energyMachineId?.toString() || "none"}
                      onValueChange={(val) => {
                        if (val === "none") {
                          setEnergyMachineId(null);
                          setEnergyEquipment("");
                          return;
                        }
                        const mid = parseInt(val);
                        setEnergyMachineId(mid);
                        const machine = (factoryMachinesList as any[])?.find((m: any) => m.id === mid);
                        if (machine) {
                          setEnergyEquipment(machine.name);
                          setEnergyKwhPerBatch(machine.kwhConsumption?.toString() || "0");
                        }
                      }}
                    >
                      <SelectTrigger data-testid="select-energy-machine">
                        <SelectValue placeholder="Cihaz seçin..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Seçilmedi</SelectItem>
                        {(factoryMachinesList as any[])?.filter((m: any) => m.isActive || m.id === energyMachineId).map((machine: any) => (
                          <SelectItem key={machine.id} value={machine.id.toString()}>
                            {machine.name} ({machine.kwhConsumption} kWh){!machine.isActive ? " (Pasif)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  className="w-full"
                  disabled={updateRecipeLaborMutation.isPending}
                  onClick={() => {
                    if (editingRecipeId) {
                      updateRecipeLaborMutation.mutate({
                        id: editingRecipeId,
                        data: {
                          laborWorkerCount,
                          productionTimeMinutes: laborProductionMinutes,
                          laborBatchSize,
                          laborHourlyRate: laborHourlyRate,
                          energyKwhPerBatch: energyKwhPerBatch,
                          equipmentDescription: energyEquipment,
                          machineId: energyMachineId,
                        }
                      });
                    }
                  }}
                  data-testid="button-submit-labor"
                >
                  {updateRecipeLaborMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Kaydet
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditRecipeDialogOpen} onOpenChange={setIsEditRecipeDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reçete Düzenle</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Reçete Adı</label>
                  <Input
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                    data-testid="input-recipe-name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Reçete Tipi</label>
                  <Select value={recipeType} onValueChange={setRecipeType}>
                    <SelectTrigger data-testid="select-recipe-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPEN">OPEN (Görünür)</SelectItem>
                      <SelectItem value="KEYBLEND">KEYBLEND (Gizli)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Çıktı Miktarı</label>
                    <Input
                      type="number"
                      step="0.001"
                      value={recipeOutputQty}
                      onChange={(e) => setRecipeOutputQty(e.target.value)}
                      data-testid="input-recipe-output-qty"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Çıktı Birimi</label>
                    <Select value={recipeOutputUnit} onValueChange={setRecipeOutputUnit}>
                      <SelectTrigger data-testid="select-recipe-output-unit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="adet">Adet</SelectItem>
                        <SelectItem value="kg">Kilogram</SelectItem>
                        <SelectItem value="lt">Litre</SelectItem>
                        <SelectItem value="porsiyon">Porsiyon</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Notlar</label>
                  <Input
                    value={recipeNotes}
                    onChange={(e) => setRecipeNotes(e.target.value)}
                    data-testid="input-recipe-notes"
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={updateRecipeMutation.isPending}
                  onClick={() => {
                    if (editingRecipeId) {
                      updateRecipeMutation.mutate({
                        id: editingRecipeId,
                        data: {
                          name: recipeName,
                          recipeType,
                          outputQuantity: recipeOutputQty,
                          outputUnit: recipeOutputUnit,
                          notes: recipeNotes,
                        }
                      });
                    }
                  }}
                  data-testid="button-save-recipe"
                >
                  {updateRecipeMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Kaydet
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddIngredientDialogOpen} onOpenChange={setIsAddIngredientDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Malzeme Ekle</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Hammadde</label>
                  <Select 
                    value={newIngredientMaterialId?.toString() || ""} 
                    onValueChange={(v) => setNewIngredientMaterialId(parseInt(v))}
                  >
                    <SelectTrigger data-testid="select-ingredient-material">
                      <SelectValue placeholder="Hammadde seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {rawMaterials?.map((m: any) => (
                        <SelectItem key={m.id} value={m.id.toString()}>
                          {m.code} - {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Miktar</label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={newIngredientQuantity}
                      onChange={(e) => setNewIngredientQuantity(e.target.value)}
                      data-testid="input-ingredient-quantity"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Birim</label>
                    <Select value={newIngredientUnit} onValueChange={setNewIngredientUnit}>
                      <SelectTrigger data-testid="select-ingredient-unit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gr">Gram (gr)</SelectItem>
                        <SelectItem value="kg">Kilogram (kg)</SelectItem>
                        <SelectItem value="ml">Mililitre (ml)</SelectItem>
                        <SelectItem value="lt">Litre (lt)</SelectItem>
                        <SelectItem value="adet">Adet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  className="w-full"
                  disabled={addIngredientMutation.isPending || !newIngredientMaterialId || !newIngredientQuantity}
                  onClick={() => {
                    if (editingRecipeId && newIngredientMaterialId && newIngredientQuantity) {
                      addIngredientMutation.mutate({
                        recipeId: editingRecipeId,
                        rawMaterialId: newIngredientMaterialId,
                        quantity: newIngredientQuantity,
                        unit: newIngredientUnit,
                      });
                    }
                  }}
                  data-testid="button-add-ingredient"
                >
                  {addIngredientMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Malzeme Ekle
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAiRecipeDialogOpen} onOpenChange={(open) => { if (!open) resetAiDialog(); else setIsAiRecipeDialogOpen(true); }}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  AI ile Reçete Oluştur
                </DialogTitle>
              </DialogHeader>
              
              {aiStep === "input" && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant={aiMode === "photo" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAiMode("photo")}
                      data-testid="button-ai-mode-photo"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Fotoğraf
                    </Button>
                    <Button
                      variant={aiMode === "text" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAiMode("text")}
                      data-testid="button-ai-mode-text"
                    >
                      <Type className="w-4 h-4 mr-2" />
                      Metin
                    </Button>
                  </div>

                  {aiMode === "photo" ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Reçete fotoğrafını yükleyin. AI fotoğraftaki malzemeleri ve miktarları otomatik olarak analiz edecektir.
                      </p>
                      <div className="border-2 border-dashed rounded-md p-6 text-center">
                        {aiImagePreview ? (
                          <div className="space-y-3">
                            <img src={aiImagePreview} alt="Reçete" className="max-h-48 mx-auto rounded-md object-contain" loading="lazy" />
                            <Button variant="outline" size="sm" onClick={() => { setAiImageBase64(null); setAiImagePreview(null); }} data-testid="button-remove-image">
                              <X className="w-4 h-4 mr-2" />
                              Kaldır
                            </Button>
                          </div>
                        ) : (
                          <label className="cursor-pointer block">
                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAiImageUpload} data-testid="input-ai-image" />
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              <Upload className="w-8 h-8" />
                              <span className="text-sm">Fotoğraf yükleyin veya çekin</span>
                            </div>
                          </label>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Reçete metnini yapıştırın veya yazın. AI malzemeleri ve miktarları otomatik olarak çıkaracaktır.
                      </p>
                      <Textarea
                        value={aiTextInput}
                        onChange={(e) => setAiTextInput(e.target.value)}
                        placeholder={"Örnek:\nOreo Cheesecake\nBatch: 630 adet\n\nMalzemeler:\n- Creambase: 0.06 kg\n- Oreo Crumble: 0.08 kg\n- Cream Cheese: 0.15 kg"}
                        className="min-h-[200px]"
                        data-testid="input-ai-text"
                      />
                    </div>
                  )}

                  <Button 
                    className="w-full"
                    disabled={aiParseMutation.isPending || (aiMode === "photo" ? !aiImageBase64 : !aiTextInput.trim())}
                    onClick={handleAiParse}
                    data-testid="button-ai-analyze"
                  >
                    {aiParseMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        AI Analiz Ediyor...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Analiz Et
                      </>
                    )}
                  </Button>
                </div>
              )}

              {aiStep === "review" && aiParsedResult && (
                <div className="space-y-4">
                  <Button variant="ghost" size="sm" onClick={() => setAiStep("input")} data-testid="button-ai-back">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Geri
                  </Button>

                  <div className="flex gap-2 p-1 rounded-md bg-muted/50">
                    <Button
                      variant={aiActionMode === "create" ? "default" : "ghost"}
                      size="sm"
                      className="flex-1"
                      onClick={() => { setAiActionMode("create"); setAiSelectedRecipeId(null); }}
                      data-testid="button-ai-mode-create"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Yeni Reçete Oluştur
                    </Button>
                    <Button
                      variant={aiActionMode === "update" ? "default" : "ghost"}
                      size="sm"
                      className="flex-1"
                      onClick={() => setAiActionMode("update")}
                      data-testid="button-ai-mode-update"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Mevcut Reçeteyi Güncelle
                    </Button>
                  </div>

                  {aiActionMode === "update" && (
                    <div>
                      <label className="text-sm font-medium">Güncellenecek Reçete</label>
                      <Select
                        value={aiSelectedRecipeId?.toString() || ""}
                        onValueChange={(v) => {
                          const rId = parseInt(v);
                          setAiSelectedRecipeId(rId);
                          const recipe = (aiParsedResult?.allRecipes || []).find((r: any) => r.id === rId);
                          if (recipe) {
                            setAiRecipeName(recipe.name);
                            setAiRecipeType(recipe.recipeType || "OPEN");
                            setAiSelectedProductId(recipe.productId);
                          }
                        }}
                      >
                        <SelectTrigger data-testid="select-ai-existing-recipe">
                          <SelectValue placeholder="Reçete seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {(aiParsedResult?.allRecipes || []).map((r: any) => (
                            <SelectItem key={r.id} value={r.id.toString()}>
                              {r.name} (v{r.version}) - {r.productName || ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">Reçete Adı</label>
                      <Input
                        value={aiRecipeName}
                        onChange={(e) => setAiRecipeName(e.target.value)}
                        data-testid="input-ai-recipe-name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Reçete Tipi</label>
                      <Select value={aiRecipeType} onValueChange={setAiRecipeType}>
                        <SelectTrigger data-testid="select-ai-recipe-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OPEN">OPEN (Açık)</SelectItem>
                          <SelectItem value="KEYBLEND">KEYBLEND (Gizli)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {aiActionMode === "create" && (
                    <div>
                      <label className="text-sm font-medium">Ürün</label>
                      <Select 
                        value={aiSelectedProductId?.toString() || ""} 
                        onValueChange={(v) => setAiSelectedProductId(parseInt(v))}
                      >
                        <SelectTrigger data-testid="select-ai-product">
                          <SelectValue placeholder="Ürün seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {(aiParsedResult?.allProducts || []).map((p: any) => (
                            <SelectItem key={p.id} value={p.id.toString()}>
                              {p.name} ({p.category})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="p-2 rounded-md bg-muted/50 text-center">
                      <p className="text-xs text-muted-foreground">Batch</p>
                      <p className="font-medium text-sm">{aiParsedResult?.parsed?.batchSize || "-"} {aiParsedResult?.parsed?.outputUnit || ""}</p>
                    </div>
                    <div className="p-2 rounded-md bg-muted/50 text-center">
                      <p className="text-xs text-muted-foreground">Süre</p>
                      <p className="font-medium text-sm">{aiParsedResult?.parsed?.productionTimeMinutes || "-"} dk</p>
                    </div>
                    <div className="p-2 rounded-md bg-muted/50 text-center">
                      <p className="text-xs text-muted-foreground">Kategori</p>
                      <p className="font-medium text-sm">{aiParsedResult?.parsed?.category || "-"}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Malzeme Eşleştirme</h4>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {aiIngredients.map((ing, idx) => (
                        <div key={idx} className={`p-3 rounded-md border ${ing.rawMaterialId ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20" : "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20"}`}>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              {ing.rawMaterialId ? <Check className="w-4 h-4 text-green-600" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />}
                              <span className="text-sm font-medium">{ing.originalName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {!ing.rawMaterialId && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-xs px-2"
                                  onClick={() => handleOpenNewMaterialDialog(idx)}
                                  data-testid={`button-create-material-${idx}`}
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Yeni Hammadde
                                </Button>
                              )}
                              <Badge variant={ing.rawMaterialId ? "default" : "secondary"} className={`text-xs ${ing.rawMaterialId ? "bg-green-500" : ""}`}>
                                {ing.rawMaterialId ? `%${Math.round((ing.matchScore || 1) * 100)}` : "Eşleşmedi"}
                              </Badge>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            <div>
                              <label className="text-xs text-muted-foreground">Hammadde</label>
                              <Popover open={openMaterialPopoverIdx === idx} onOpenChange={(open) => setOpenMaterialPopoverIdx(open ? idx : null)} modal={true}>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openMaterialPopoverIdx === idx}
                                    className="h-8 w-full justify-between text-xs font-normal"
                                    data-testid={`select-ai-material-${idx}`}
                                  >
                                    <span className="truncate">
                                      {ing.rawMaterialId
                                        ? (() => { const m = (aiParsedResult?.allMaterials || []).find((m: any) => m.id === ing.rawMaterialId); return m ? `${m.code} - ${m.name}` : "Seçin"; })()
                                        : "Seçin"}
                                    </span>
                                    <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[280px] p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder="Hammadde ara..." className="text-xs" />
                                    <CommandList>
                                      <CommandEmpty>Sonuç bulunamadı</CommandEmpty>
                                      <CommandGroup>
                                        {(aiParsedResult?.allMaterials || []).map((m: any) => (
                                          <CommandItem
                                            key={m.id}
                                            value={`${m.code} ${m.name}`}
                                            onSelect={() => {
                                              const updated = [...aiIngredients];
                                              updated[idx] = { ...updated[idx], rawMaterialId: m.id, isMatched: true, matchedMaterialName: m.name };
                                              setAiIngredients(updated);
                                              setOpenMaterialPopoverIdx(null);
                                            }}
                                            className="text-xs"
                                          >
                                            <Check className={`mr-1 h-3 w-3 ${ing.rawMaterialId === m.id ? "opacity-100" : "opacity-0"}`} />
                                            {m.code} - {m.name}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Miktar</label>
                              <Input
                                type="number"
                                step="0.0001"
                                value={ing.quantity}
                                onChange={(e) => {
                                  const updated = [...aiIngredients];
                                  updated[idx] = { ...updated[idx], quantity: e.target.value };
                                  setAiIngredients(updated);
                                }}
                                className="h-8 text-xs"
                                data-testid={`input-ai-quantity-${idx}`}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Birim</label>
                              <Select
                                value={ing.unit}
                                onValueChange={(v) => {
                                  const updated = [...aiIngredients];
                                  updated[idx] = { ...updated[idx], unit: v };
                                  setAiIngredients(updated);
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs" data-testid={`select-ai-unit-${idx}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="gr">Gram</SelectItem>
                                  <SelectItem value="kg">Kilogram</SelectItem>
                                  <SelectItem value="ml">Mililitre</SelectItem>
                                  <SelectItem value="lt">Litre</SelectItem>
                                  <SelectItem value="adet">Adet</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                      {aiIngredients.filter(i => i.rawMaterialId).length}/{aiIngredients.length} malzeme eşleştirildi. 
                      Eşleşmeyen malzemeleri listeden seçebilir veya "Yeni Hammadde" ile oluşturabilirsiniz.
                    </p>
                  </div>

                  <Button
                    className="w-full"
                    disabled={
                      (aiActionMode === "create" ? aiCreateMutation.isPending : aiUpdateMutation.isPending) ||
                      (aiActionMode === "create" && (!aiSelectedProductId || !aiRecipeName)) ||
                      (aiActionMode === "update" && !aiSelectedRecipeId) ||
                      aiIngredients.filter(i => i.rawMaterialId).length === 0
                    }
                    onClick={handleAiCreate}
                    data-testid="button-ai-create-recipe"
                  >
                    {(aiCreateMutation.isPending || aiUpdateMutation.isPending) ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {aiActionMode === "update" ? "Güncelleniyor..." : "Oluşturuluyor..."}
                      </>
                    ) : (
                      <>
                        {aiActionMode === "update" ? <RefreshCw className="w-4 h-4 mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                        {aiActionMode === "update" ? "Reçeteyi Güncelle" : "Reçeteyi Kaydet"}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={isNewMaterialDialogOpen} onOpenChange={(open) => { if (!open) resetNewMaterialDialog(); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yeni Hammadde Oluştur</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Eşleşmeyen malzeme için yeni hammadde kaydı oluşturun. Kaydedildikten sonra otomatik olarak reçeteye atanacaktır.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Hammadde Adı</label>
                    <Input
                      value={newMaterialName}
                      onChange={(e) => setNewMaterialName(e.target.value)}
                      placeholder="Örn: Creambase"
                      data-testid="input-new-material-name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Kod</label>
                    <Input
                      value={newMaterialCode}
                      onChange={(e) => setNewMaterialCode(e.target.value)}
                      placeholder="Örn: HM-CREAMBASE"
                      data-testid="input-new-material-code"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm font-medium">Birim</label>
                    <Select value={newMaterialUnit} onValueChange={setNewMaterialUnit}>
                      <SelectTrigger data-testid="select-new-material-unit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gr">Gram</SelectItem>
                        <SelectItem value="kg">Kilogram</SelectItem>
                        <SelectItem value="ml">Mililitre</SelectItem>
                        <SelectItem value="lt">Litre</SelectItem>
                        <SelectItem value="adet">Adet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Kategori</label>
                    <Input
                      value={newMaterialCategory}
                      onChange={(e) => setNewMaterialCategory(e.target.value)}
                      placeholder="Örn: Süt Ürünleri"
                      data-testid="input-new-material-category"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Birim Fiyat (TL)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newMaterialPrice}
                      onChange={(e) => setNewMaterialPrice(e.target.value)}
                      data-testid="input-new-material-price"
                    />
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={handleCreateNewMaterial}
                  disabled={createNewMaterialMutation.isPending || !newMaterialName || !newMaterialCode}
                  data-testid="button-save-new-material"
                >
                  {createNewMaterialMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Hammaddeyi Kaydet
                    </>
                  )}
                </Button>
              </div>
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
                      <TableHead className="text-right">İşlemler</TableHead>
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
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEditCostDialog(cost)}
                              data-testid={`button-edit-cost-${cost.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => { setDeleteConfirmId(cost.id); setDeleteType('cost'); }}
                              data-testid={`button-delete-cost-${cost.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
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
                    <div className="flex items-center gap-1 mt-3 pt-3 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditMarginDialog(margin)}
                        data-testid={`button-edit-margin-${margin.id}`}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Düzenle
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => { setDeleteConfirmId(margin.id); setDeleteType('margin'); }}
                        data-testid={`button-delete-margin-${margin.id}`}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Sil
                      </Button>
                    </div>
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
                      <TableHead className="text-right">İşçilik Maliyeti</TableHead>
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
                        <TableCell className="text-right">{formatCurrency(calc.calculation?.directLaborCost)}</TableCell>
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

        <TabsContent value="cihazlar" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                <Cog className="w-5 h-5" />
                Cihaz Listesi
              </CardTitle>
              <Button
                size="sm"
                onClick={() => {
                  setEditingMachine(null);
                  resetMachineForm();
                  setIsAddMachineDialogOpen(true);
                }}
                data-testid="button-add-machine"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ekle
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {factoryMachinesList.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cihaz Adı</TableHead>
                      <TableHead className="text-right">kWh</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Üretebileceği Ürünler</TableHead>
                      <TableHead>İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {factoryMachinesList.map((machine: any) => {
                      const productNames = machine.products?.map((p: any) => {
                        const found = dashboardProducts?.find((dp: any) => dp.product?.id === (p.productId || p.id));
                        return found?.product?.name || p.name || `#${p.productId || p.id}`;
                      }).join(", ") || "-";
                      return (
                        <TableRow key={machine.id} data-testid={`row-machine-${machine.id}`}>
                          <TableCell className="font-medium" data-testid={`text-machine-name-${machine.id}`}>
                            {machine.name}
                            {machine.description && (
                              <p className="text-xs text-muted-foreground">{machine.description}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-right" data-testid={`text-machine-kwh-${machine.id}`}>
                            {machine.kwhConsumption || 0} kWh
                          </TableCell>
                          <TableCell>
                            {machine.isActive !== false ? (
                              <Badge variant="outline" className="text-green-600 border-green-200 dark:text-green-400 dark:border-green-800" data-testid={`badge-machine-status-${machine.id}`}>
                                Aktif
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-red-600 border-red-200 dark:text-red-400 dark:border-red-800" data-testid={`badge-machine-status-${machine.id}`}>
                                Pasif
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <p className="text-sm truncate" data-testid={`text-machine-products-${machine.id}`}>{productNames}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => openEditMachineDialog(machine)}
                                data-testid={`button-edit-machine-${machine.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setDeleteConfirmId(machine.id);
                                  setDeleteType('machine');
                                }}
                                data-testid={`button-delete-machine-${machine.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Henüz cihaz eklenmemiş</p>
              )}
            </CardContent>
          </Card>

          <Dialog open={isAddMachineDialogOpen} onOpenChange={(open) => {
            setIsAddMachineDialogOpen(open);
            if (!open) {
              setEditingMachine(null);
              resetMachineForm();
            }
          }}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingMachine ? "Cihaz Düzenle" : "Yeni Cihaz Ekle"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Cihaz Adı</label>
                  <Input
                    value={machineName}
                    onChange={(e) => setMachineName(e.target.value)}
                    placeholder="Cihaz adı"
                    data-testid="input-machine-name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Açıklama</label>
                  <Textarea
                    value={machineDescription}
                    onChange={(e) => setMachineDescription(e.target.value)}
                    placeholder="Cihaz açıklaması"
                    data-testid="input-machine-description"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">kWh Tüketimi</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={machineKwh}
                    onChange={(e) => setMachineKwh(e.target.value)}
                    placeholder="0"
                    data-testid="input-machine-kwh"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="machine-active"
                    checked={machineIsActive}
                    onCheckedChange={(checked) => setMachineIsActive(checked === true)}
                    data-testid="checkbox-machine-active"
                  />
                  <label htmlFor="machine-active" className="text-sm font-medium cursor-pointer">
                    Aktif
                  </label>
                </div>
                {dashboardProducts && dashboardProducts.length > 0 && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Üretebileceği Ürünler</label>
                    <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-3">
                      {dashboardProducts.map((item: any) => (
                        <div key={item.product?.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`machine-product-${item.product?.id}`}
                            checked={machineProductIds.includes(item.product?.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setMachineProductIds([...machineProductIds, item.product?.id]);
                              } else {
                                setMachineProductIds(machineProductIds.filter((id) => id !== item.product?.id));
                              }
                            }}
                            data-testid={`checkbox-machine-product-${item.product?.id}`}
                          />
                          <label
                            htmlFor={`machine-product-${item.product?.id}`}
                            className="text-sm cursor-pointer"
                          >
                            {item.product?.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddMachineDialogOpen(false);
                      setEditingMachine(null);
                      resetMachineForm();
                    }}
                    data-testid="button-cancel-machine"
                  >
                    İptal
                  </Button>
                  <Button
                    onClick={handleSaveMachine}
                    disabled={!machineName || createMachineMutation.isPending || updateMachineMutation.isPending}
                    data-testid="button-save-machine"
                  >
                    {(createMachineMutation.isPending || updateMachineMutation.isPending) && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {editingMachine ? "Güncelle" : "Kaydet"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>

      {/* Edit Material Dialog */}
      <Dialog open={isEditMaterialDialogOpen} onOpenChange={setIsEditMaterialDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hammadde Düzenle</DialogTitle>
          </DialogHeader>
          <Form {...editMaterialForm}>
            <form onSubmit={editMaterialForm.handleSubmit((data) => {
              if (editingMaterial) {
                updateMaterialMutation.mutate({ id: editingMaterial.id, data });
              }
            })} className="space-y-4">
              <FormField
                control={editMaterialForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kod</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-material-code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editMaterialForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ad</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-material-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editMaterialForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-material-category">
                          <SelectValue placeholder="Kategori seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="coffee">Kahve</SelectItem>
                        <SelectItem value="dairy">Süt & Süt Ürünleri</SelectItem>
                        <SelectItem value="syrup">Şurup & Sos</SelectItem>
                        <SelectItem value="packaging">Ambalaj</SelectItem>
                        <SelectItem value="consumable">Sarf Malzeme</SelectItem>
                        <SelectItem value="ingredient">Malzeme</SelectItem>
                        <SelectItem value="other">Diğer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editMaterialForm.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Birim</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-material-unit">
                          <SelectValue placeholder="Birim seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="kg">Kilogram (kg)</SelectItem>
                        <SelectItem value="lt">Litre (lt)</SelectItem>
                        <SelectItem value="gr">Gram (gr)</SelectItem>
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
                control={editMaterialForm.control}
                name="currentUnitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Birim Fiyat (₺)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} data-testid="input-edit-material-price" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={updateMaterialMutation.isPending} data-testid="button-submit-edit-material">
                {updateMaterialMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Güncelle
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Fixed Cost Dialog */}
      <Dialog open={isEditCostDialogOpen} onOpenChange={setIsEditCostDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sabit Gider Düzenle</DialogTitle>
          </DialogHeader>
          <Form {...editCostForm}>
            <form onSubmit={editCostForm.handleSubmit((data) => {
              if (editingCost) {
                updateCostMutation.mutate({ id: editingCost.id, data });
              }
            })} className="space-y-4">
              <FormField
                control={editCostForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-cost-category">
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
                control={editCostForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gider Adı</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-cost-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editCostForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Açıklama</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-cost-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editCostForm.control}
                name="monthlyAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aylık Tutar (₺)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} data-testid="input-edit-cost-amount" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={updateCostMutation.isPending} data-testid="button-submit-edit-cost">
                {updateCostMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Güncelle
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Profit Margin Dialog */}
      <Dialog open={isEditMarginDialogOpen} onOpenChange={setIsEditMarginDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kar Marjı Düzenle</DialogTitle>
          </DialogHeader>
          <Form {...editMarginForm}>
            <form onSubmit={editMarginForm.handleSubmit((data) => {
              if (editingMargin) {
                updateMarginMutation.mutate({ id: editingMargin.id, data });
              }
            })} className="space-y-4">
              <FormField
                control={editMarginForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şablon Adı</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-margin-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editMarginForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ürün Kategorisi</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-margin-category">
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
                control={editMarginForm.control}
                name="defaultMargin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Varsayılan Marj (örn: 1.20 = %20)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} data-testid="input-edit-margin-default" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editMarginForm.control}
                  name="minimumMargin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Marj</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} data-testid="input-edit-margin-min" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editMarginForm.control}
                  name="maximumMargin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Marj</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} data-testid="input-edit-margin-max" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" className="w-full" disabled={updateMarginMutation.isPending} data-testid="button-submit-edit-margin">
                {updateMarginMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Güncelle
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) { setDeleteConfirmId(null); setDeleteType(null); }}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Silme Onayı
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Bu kaydı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setDeleteConfirmId(null); setDeleteType(null); }} data-testid="button-cancel-delete">
              İptal
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleteMaterialMutation.isPending || deleteCostMutation.isPending || deleteMarginMutation.isPending || deleteMachineMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {(deleteMaterialMutation.isPending || deleteCostMutation.isPending || deleteMarginMutation.isPending || deleteMachineMutation.isPending) ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Sil
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {selectedMaterialId && (
        <MaterialPriceHistoryDialog
          materialId={selectedMaterialId}
          open={isMaterialDetailOpen}
          onOpenChange={setIsMaterialDetailOpen}
        />
      )}
    </div>
  );
}
