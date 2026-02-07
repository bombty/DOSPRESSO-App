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
import { 
  Calculator, Package, Warehouse, TrendingUp, Plus, RefreshCw, 
  DollarSign, Percent, Building2, FileText, Settings2, BarChart3,
  Loader2, AlertTriangle, CheckCircle, Edit, Trash2, Users, Clock, Hash,
  Sparkles, Camera, Type, Upload, ArrowLeft, ArrowRight, Check, X, Search
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

function ProductCostDetail({ productId, onEditLabor, onEditRecipe, onDeleteIngredient, onAddIngredient }: { productId: number; onEditLabor?: (recipeId: number) => void; onEditRecipe?: (recipeId: number) => void; onDeleteIngredient?: (recipeId: number, ingredientId: number) => void; onAddIngredient?: (recipeId: number) => void }) {
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
            <p className="text-xs text-muted-foreground">Saat Ücreti</p>
            <p className="font-medium" data-testid="text-hourly-rate">{formatCurrency(data.labor?.hourlyRate)}</p>
          </div>
        </div>
        {data.labor?.formula && (
          <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-blue-200 dark:border-blue-700">
            Formül: {data.labor.formula} = {formatCurrency(data.labor.totalLaborCost)}
          </p>
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
                <TableCell className="text-right">{ing.quantity} {ing.unit}</TableCell>
                <TableCell className="text-right">{ing.isHidden ? "***" : formatCurrency(ing.unitCost)}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(ing.totalCost)}</TableCell>
                <TableCell>
                  {!ing.isHidden && onDeleteIngredient && data.recipe?.id && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onDeleteIngredient(data.recipe.id, ing.id)}
                      data-testid={`button-delete-ingredient-${ing.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
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
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-4 border-t">
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">Hammadde Maliyeti</p>
          <p className="font-bold">{formatCurrency(data.costs?.rawMaterialCost)}</p>
        </div>
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <p className="text-xs text-muted-foreground">İşçilik Maliyeti</p>
          <p className="font-bold text-blue-700 dark:text-blue-400">{formatCurrency(data.costs?.laborCost)}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">Genel Gider Payı</p>
          <p className="font-bold">{formatCurrency(data.costs?.overheadCost)}</p>
        </div>
        <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
          <p className="text-xs text-muted-foreground">Toplam Maliyet</p>
          <p className="font-bold text-purple-700 dark:text-purple-400">{formatCurrency(data.costs?.totalUnitCost)}</p>
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
  
  const [isEditMaterialDialogOpen, setIsEditMaterialDialogOpen] = useState(false);
  const [isEditCostDialogOpen, setIsEditCostDialogOpen] = useState(false);
  const [isEditMarginDialogOpen, setIsEditMarginDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any>(null);
  const [editingCost, setEditingCost] = useState<any>(null);
  const [editingMargin, setEditingMargin] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteType, setDeleteType] = useState<'material' | 'cost' | 'margin' | null>(null);
  const [isEditLaborDialogOpen, setIsEditLaborDialogOpen] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState<number | null>(null);
  const [laborWorkerCount, setLaborWorkerCount] = useState(1);
  const [laborProductionMinutes, setLaborProductionMinutes] = useState(0);
  const [laborBatchSize, setLaborBatchSize] = useState(1);
  const [laborHourlyRate, setLaborHourlyRate] = useState("0");
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
      queryClient.invalidateQueries({ queryKey: ['/api/cost-dashboard'] });
      setIsEditLaborDialogOpen(false);
      setEditingRecipeId(null);
      toast({ title: "İşçilik bilgileri güncellendi" });
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
    if (!aiSelectedProductId || !aiRecipeName || validIngredients.length === 0) {
      toast({ title: "Eksik Bilgi", description: "Ürün, reçete adı ve en az bir eşleşmiş malzeme gerekli", variant: "destructive" });
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
      ingredients: validIngredients.map(ing => ({
        rawMaterialId: ing.rawMaterialId,
        quantity: ing.quantity,
        unit: ing.unit,
      })),
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

  const openEditLaborDialog = (recipeId: number) => {
    setEditingRecipeId(recipeId);
    if (selectedProductId) {
      const cachedData = queryClient.getQueryData(['/api/product-costs', selectedProductId]) as any;
      if (cachedData?.recipe) {
        setLaborWorkerCount(cachedData.recipe.laborWorkerCount || 1);
        setLaborProductionMinutes(cachedData.recipe.productionTimeMinutes || 0);
        setLaborBatchSize(cachedData.recipe.laborBatchSize || 1);
        setLaborHourlyRate(cachedData.recipe.laborHourlyRate?.toString() || "0");
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
                <DialogTitle>İşçilik Bilgilerini Düzenle</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
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
                  <label className="text-sm font-medium">Saat Başı İşçilik Ücreti (₺)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={laborHourlyRate}
                    onChange={(e) => setLaborHourlyRate(e.target.value)}
                    data-testid="input-labor-hourly-rate"
                  />
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
                            <img src={aiImagePreview} alt="Reçete" className="max-h-48 mx-auto rounded-md object-contain" />
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

                  <div className="grid grid-cols-3 gap-3">
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
                            <Badge variant={ing.rawMaterialId ? "default" : "secondary"} className={`text-xs ${ing.rawMaterialId ? "bg-green-500" : ""}`}>
                              {ing.rawMaterialId ? `%${Math.round(ing.matchScore * 100)}` : "Eşleşmedi"}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-xs text-muted-foreground">Hammadde</label>
                              <Select
                                value={ing.rawMaterialId?.toString() || ""}
                                onValueChange={(v) => {
                                  const updated = [...aiIngredients];
                                  const mat = aiParsedResult?.allMaterials?.find((m: any) => m.id === parseInt(v));
                                  updated[idx] = { ...updated[idx], rawMaterialId: parseInt(v), isMatched: true, matchedMaterialName: mat?.name || "" };
                                  setAiIngredients(updated);
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs" data-testid={`select-ai-material-${idx}`}>
                                  <SelectValue placeholder="Seçin" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(aiParsedResult?.allMaterials || []).map((m: any) => (
                                    <SelectItem key={m.id} value={m.id.toString()}>
                                      {m.code} - {m.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
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
                      Eşleşmeyen malzemeleri listeden seçebilirsiniz.
                    </p>
                  </div>

                  <Button
                    className="w-full"
                    disabled={aiCreateMutation.isPending || !aiSelectedProductId || !aiRecipeName || aiIngredients.filter(i => i.rawMaterialId).length === 0}
                    onClick={handleAiCreate}
                    data-testid="button-ai-create-recipe"
                  >
                    {aiCreateMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Oluşturuluyor...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Reçeteyi Kaydet
                      </>
                    )}
                  </Button>
                </div>
              )}
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
              disabled={deleteMaterialMutation.isPending || deleteCostMutation.isPending || deleteMarginMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {(deleteMaterialMutation.isPending || deleteCostMutation.isPending || deleteMarginMutation.isPending) ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Sil
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
