import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Package,
  Factory,
  Target,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Play,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Loader2,
  FileText,
  TrendingDown,
  Zap,
  History,
  Link2,
  Brain,
  BarChart3,
  Boxes,
  X
} from "lucide-react";

interface ProductionPlan {
  id: number;
  productId: number;
  stationId: number;
  plannedDate: string;
  targetQuantity: number;
  actualQuantity: number | null;
  status: string;
  notes: string | null;
  productName: string;
  stationName: string;
}

interface Product {
  id: number;
  name: string;
  category: string;
  sku: string;
  unit: string;
}

interface Station {
  id: number;
  name: string;
}

interface Recipe {
  id: number;
  name: string;
  productId: number;
  outputQuantity: string;
  recipeType: string;
  isActive: boolean;
}

interface StockCheckItem {
  materialName: string;
  materialCode: string;
  requiredQuantity: string;
  currentStock: string;
  unit: string;
  sufficient: boolean;
  linked: boolean;
  deficit: string;
}

interface ProductionRecord {
  id: number;
  productionNumber: string;
  productionDate: string;
  recipeId: number;
  plannedQuantity: string;
  producedQuantity: string;
  wasteQuantity: string;
  unit: string;
  status: string;
  ingredientsDeducted: boolean;
  productAddedToStock: boolean;
  notes: string | null;
}

interface MaterialLink {
  materialId: number;
  materialCode: string;
  materialName: string;
  materialUnit: string;
  linked: boolean;
  inventoryId: number | null;
  inventoryCode: string | null;
  inventoryName: string | null;
  currentStock: number | null;
  minimumStock: number | null;
  stockUnit: string | null;
}

interface AIInsights {
  summary: {
    totalProductions: number;
    totalProduced: string;
    totalWaste: string;
    wasteRate: string;
    lowStockCount: number;
    linkedMaterialCount: number;
    periodDays: number;
  };
  lowStockAlerts: {
    id: number;
    name: string;
    code: string;
    currentStock: string;
    minimumStock: string;
    unit: string;
  }[];
  consumptionForecasts: {
    materialName: string;
    materialCode: string;
    currentStock: string;
    minimumStock: string;
    unit: string;
    dailyConsumption: string;
    daysRemaining: number;
    suggestedOrderQuantity: string;
    urgency: string;
  }[];
  recommendations: string[];
}

export default function FabrikaUretimPlanlama() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState("takvim");
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [producedQuantity, setProducedQuantity] = useState("");
  const [productionNotes, setProductionNotes] = useState("");
  const [stockCheckResult, setStockCheckResult] = useState<{ allSufficient: boolean; items: StockCheckItem[] } | null>(null);
  const [stockChecking, setStockChecking] = useState(false);
  const [formData, setFormData] = useState({
    productId: '',
    stationId: '',
    targetQuantity: '',
    batchCount: '',
    notes: ''
  });
  const [recipeInfo, setRecipeInfo] = useState<{
    recipe: { id: number; name: string; outputQuantity: number; outputUnit: string; expectedOutputCount: number | null; expectedWastePercent: number; productionTimeMinutes: number; laborBatchSize: number } | null;
    batchSpec: { id: number; batchWeightKg: number; expectedPieces: number; targetDurationMinutes: number; machineName: string | null } | null;
    stationId: number | null;
  } | null>(null);
  const [loadingRecipeInfo, setLoadingRecipeInfo] = useState(false);
  const [historyFilter, setHistoryFilter] = useState({ search: '', status: 'all', dateFrom: '', dateTo: '' });

  const { data: plans = [], isLoading, refetch } = useQuery<ProductionPlan[]>({
    queryKey: ['/api/factory/production-plans'],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/factory/catalog/products'],
  });

  const { data: stations = [] } = useQuery<Station[]>({
    queryKey: ['/api/factory/stations'],
  });

  const { data: recipes = [] } = useQuery<Recipe[]>({
    queryKey: ['/api/recipes'],
  });

  const { data: productionHistory = [] } = useQuery<ProductionRecord[]>({
    queryKey: ['/api/production/history'],
    enabled: activeTab === "gecmis",
  });

  const { data: materialLinks } = useQuery<{ materials: MaterialLink[]; summary: any }>({
    queryKey: ['/api/production/material-stock-links'],
    enabled: activeTab === "baglanti",
  });

  const { data: aiInsights } = useQuery<AIInsights>({
    queryKey: ['/api/production/ai-insights'],
    enabled: activeTab === "ai-analiz",
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/factory/production-plans', data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Üretim planı oluşturuldu" });
      queryClient.invalidateQueries({ queryKey: ['/api/factory/production-plans'] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/production/complete', data);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ 
        title: "Üretim Tamamlandı", 
        description: data.message
      });
      queryClient.invalidateQueries({ queryKey: ['/api/factory/production-plans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/production/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/production/ai-insights'] });
      queryClient.invalidateQueries({ queryKey: ['/api/production/material-stock-links'] });
      queryClient.invalidateQueries({ predicate: (query) => 
        (query.queryKey[0] as string)?.startsWith?.("/api/inventory")
      });
      setCompleteDialogOpen(false);
      resetCompleteForm();
    },
    onError: (error: any) => {
      toast({ title: "Üretim Hatası", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ productId: '', stationId: '', targetQuantity: '', batchCount: '', notes: '' });
    setSelectedDate(null);
    setRecipeInfo(null);
  };

  const handleProductSelect = async (productId: string) => {
    setFormData(prev => ({ ...prev, productId }));
    setRecipeInfo(null);
    if (!productId) return;
    
    setLoadingRecipeInfo(true);
    try {
      const res = await fetch(`/api/factory/product-recipe-info/${productId}`, { credentials: 'include' });
      if (res.ok) {
        const info = await res.json();
        setRecipeInfo(info);
        if (info.stationId) {
          setFormData(prev => ({ ...prev, productId, stationId: info.stationId.toString() }));
        } else {
          setFormData(prev => ({ ...prev, productId }));
        }
        if (info.batchSpec?.expectedPieces && !formData.batchCount) {
          setFormData(prev => ({ 
            ...prev, 
            productId,
            stationId: info.stationId ? info.stationId.toString() : prev.stationId,
            batchCount: '1',
            targetQuantity: info.batchSpec.expectedPieces.toString()
          }));
        }
      }
    } catch (err) {
      console.error("Recipe info fetch error:", err);
    } finally {
      setLoadingRecipeInfo(false);
    }
  };

  const handleBatchCountChange = (count: string) => {
    const batchCount = parseInt(count) || 0;
    const piecesPerBatch = recipeInfo?.batchSpec?.expectedPieces || recipeInfo?.recipe?.expectedOutputCount || 0;
    setFormData(prev => ({
      ...prev,
      batchCount: count,
      targetQuantity: piecesPerBatch > 0 ? (batchCount * piecesPerBatch).toString() : prev.targetQuantity
    }));
  };

  const resetCompleteForm = () => {
    setSelectedProductId("");
    setSelectedRecipeId("");
    setProducedQuantity("");
    setProductionNotes("");
    setStockCheckResult(null);
  };

  const handleAddPlan = () => {
    if (!selectedDate || !formData.productId || !formData.stationId || !formData.targetQuantity) {
      toast({ title: "Lütfen tüm alanları doldurun", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      productId: parseInt(formData.productId),
      stationId: parseInt(formData.stationId),
      plannedDate: selectedDate.toISOString(),
      targetQuantity: parseInt(formData.targetQuantity),
      notes: formData.notes || null,
    });
  };

  const handleCheckStock = async () => {
    if (!selectedRecipeId || !producedQuantity) return;
    setStockChecking(true);
    try {
      const res = await apiRequest('POST', '/api/production/check-stock', {
        recipeId: parseInt(selectedRecipeId),
        quantity: parseFloat(producedQuantity)
      });
      const data = await res.json();
      setStockCheckResult(data);
    } catch (error: any) {
      toast({ title: "Stok kontrol hatası", description: error.message, variant: "destructive" });
    } finally {
      setStockChecking(false);
    }
  };

  const handleCompleteProduction = () => {
    if (!selectedProductId || !selectedRecipeId || !producedQuantity) {
      toast({ title: "Lütfen tüm alanları doldurun", variant: "destructive" });
      return;
    }
    completeMutation.mutate({
      productId: parseInt(selectedProductId),
      recipeId: parseInt(selectedRecipeId),
      producedQuantity: parseFloat(producedQuantity),
      notes: productionNotes
    });
  };

  const getRecipesForProduct = (productId: string) => {
    if (!productId) return [];
    return recipes.filter(r => r.productId === parseInt(productId) && r.isActive);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    const startPadding = firstDay.getDay() || 7;
    for (let i = 1; i < startPadding; i++) {
      days.push(null);
    }
    
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  const getPlansForDate = (date: Date) => {
    return plans.filter(plan => {
      const planDate = new Date(plan.plannedDate);
      return planDate.toDateString() === date.toDateString();
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': case 'tamamlandi': return 'bg-green-500';
      case 'in_progress': case 'devam_ediyor': return 'bg-blue-500';
      case 'cancelled': case 'iptal': return 'bg-red-500';
      default: return 'bg-amber-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': case 'tamamlandi': return 'Tamamlandı';
      case 'in_progress': case 'devam_ediyor': return 'Devam Ediyor';
      case 'cancelled': case 'iptal': return 'İptal';
      default: return 'Planlandı';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'text-red-500';
      case 'warning': return 'text-amber-500';
      case 'info': return 'text-blue-500';
      default: return 'text-green-500';
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'critical': return <Badge variant="destructive">Acil</Badge>;
      case 'warning': return <Badge className="bg-amber-500 text-white">Uyarı</Badge>;
      case 'info': return <Badge variant="secondary">Bilgi</Badge>;
      default: return <Badge className="bg-green-500 text-white">Normal</Badge>;
    }
  };

  const days = getDaysInMonth(currentDate);
  const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-8 w-8 text-amber-500" />
          <div>
            <h1 className="text-2xl font-bold">Üretim Planlama & Yönetim</h1>
            <p className="text-muted-foreground">Üretim planları, stok entegrasyonu ve AI analiz</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
          <Button variant="outline" onClick={() => { setSelectedDate(new Date()); setDialogOpen(true); }} data-testid="button-add-plan">
            <Plus className="h-4 w-4 mr-2" />
            Plan Ekle
          </Button>
          <Button onClick={() => { resetCompleteForm(); setCompleteDialogOpen(true); }} data-testid="button-complete-production">
            <Play className="h-4 w-4 mr-2" />
            Üretimi Tamamla
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="hover-elevate">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Target className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Toplam Plan</p>
                <p className="text-xl font-bold">{plans.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Devam Eden</p>
                <p className="text-xl font-bold">{plans.filter(p => p.status === 'in_progress').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tamamlanan</p>
                <p className="text-xl font-bold">{plans.filter(p => p.status === 'completed').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Package className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Hedef Üretim</p>
                <p className="text-xl font-bold">{plans.reduce((sum, p) => sum + p.targetQuantity, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <Boxes className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reçete Sayısı</p>
                <p className="text-xl font-bold">{recipes.filter(r => r.isActive).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="takvim" data-testid="tab-takvim">
            <CalendarIcon className="h-4 w-4 mr-1" />
            Takvim
          </TabsTrigger>
          <TabsTrigger value="gecmis" data-testid="tab-gecmis">
            <History className="h-4 w-4 mr-1" />
            Üretim Geçmişi
          </TabsTrigger>
          <TabsTrigger value="baglanti" data-testid="tab-baglanti">
            <Link2 className="h-4 w-4 mr-1" />
            Stok Bağlantıları
          </TabsTrigger>
          <TabsTrigger value="ai-analiz" data-testid="tab-ai-analiz">
            <Brain className="h-4 w-4 mr-1" />
            AI Analiz
          </TabsTrigger>
        </TabsList>

        {/* TAKVİM TAB */}
        <TabsContent value="takvim" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  {currentDate.toLocaleString('tr-TR', { month: 'long', year: 'numeric' })}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                    data-testid="button-prev-month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentDate(new Date())}
                    data-testid="button-today"
                  >
                    Bugün
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                    data-testid="button-next-month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map(day => (
                  <div key={day} className="p-2 text-center font-medium text-muted-foreground text-sm">
                    {day}
                  </div>
                ))}
                {days.map((date, idx) => {
                  if (!date) {
                    return <div key={`empty-${idx}`} className="p-2 min-h-[100px]"></div>;
                  }
                  const dayPlans = getPlansForDate(date);
                  const isToday = date.toDateString() === new Date().toDateString();
                  return (
                    <div
                      key={date.toISOString()}
                      className={`p-2 min-h-[100px] border rounded-lg hover-elevate cursor-pointer ${isToday ? 'border-amber-500 bg-amber-500/10' : 'border-muted'}`}
                      onClick={() => { setSelectedDate(date); setDialogOpen(true); }}
                      data-testid={`calendar-day-${date.getDate()}`}
                    >
                      <div className={`text-sm font-medium mb-1 ${isToday ? 'text-amber-500' : ''}`}>
                        {date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayPlans.slice(0, 3).map(plan => (
                          <div
                            key={plan.id}
                            className={`text-xs p-1 rounded truncate ${getStatusColor(plan.status)} text-white`}
                            title={`${plan.productName} - ${plan.targetQuantity} adet`}
                          >
                            {plan.productName}
                          </div>
                        ))}
                        {dayPlans.length > 3 && (
                          <div className="text-xs text-muted-foreground">+{dayPlans.length - 3} daha</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ÜRETİM GEÇMİŞİ TAB */}
        <TabsContent value="gecmis" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Üretim Geçmişi
                </CardTitle>
                <Badge variant="secondary">{productionHistory.length} kayıt</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-3 flex-wrap">
                <div className="flex-1 min-w-[160px]">
                  <Label className="text-xs">Ara</Label>
                  <Input
                    placeholder="Üretim no veya not..."
                    value={historyFilter.search}
                    onChange={(e) => setHistoryFilter(prev => ({ ...prev, search: e.target.value }))}
                    data-testid="input-history-search"
                  />
                </div>
                <div className="w-36">
                  <Label className="text-xs">Durum</Label>
                  <Select value={historyFilter.status} onValueChange={(val) => setHistoryFilter(prev => ({ ...prev, status: val }))}>
                    <SelectTrigger data-testid="select-history-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                      <SelectItem value="completed">Tamamlandı</SelectItem>
                      <SelectItem value="in_progress">Devam Ediyor</SelectItem>
                      <SelectItem value="cancelled">İptal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-36">
                  <Label className="text-xs">Başlangıç</Label>
                  <Input
                    type="date"
                    value={historyFilter.dateFrom}
                    onChange={(e) => setHistoryFilter(prev => ({ ...prev, dateFrom: e.target.value }))}
                    data-testid="input-history-date-from"
                  />
                </div>
                <div className="w-36">
                  <Label className="text-xs">Bitiş</Label>
                  <Input
                    type="date"
                    value={historyFilter.dateTo}
                    onChange={(e) => setHistoryFilter(prev => ({ ...prev, dateTo: e.target.value }))}
                    data-testid="input-history-date-to"
                  />
                </div>
                {(historyFilter.search || historyFilter.status !== 'all' || historyFilter.dateFrom || historyFilter.dateTo) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryFilter({ search: '', status: 'all', dateFrom: '', dateTo: '' })}
                    data-testid="button-clear-history-filters"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Temizle
                  </Button>
                )}
              </div>

              {(() => {
                const filtered = productionHistory.filter(record => {
                  if (historyFilter.search) {
                    const s = historyFilter.search.toLocaleLowerCase('tr-TR');
                    if (!record.productionNumber?.toLocaleLowerCase('tr-TR').includes(s) && !record.notes?.toLocaleLowerCase('tr-TR').includes(s)) return false;
                  }
                  if (historyFilter.status !== 'all' && record.status !== historyFilter.status && record.status !== (historyFilter.status === 'completed' ? 'tamamlandi' : historyFilter.status === 'in_progress' ? 'devam_ediyor' : 'iptal')) return false;
                  if (historyFilter.dateFrom && new Date(record.productionDate) < new Date(historyFilter.dateFrom)) return false;
                  if (historyFilter.dateTo && new Date(record.productionDate) > new Date(historyFilter.dateTo + 'T23:59:59')) return false;
                  return true;
                });
                return filtered.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Factory className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium">{productionHistory.length === 0 ? 'Henüz üretim kaydı yok' : 'Filtreye uygun kayıt bulunamadı'}</p>
                    <p className="text-sm mt-1">{productionHistory.length === 0 ? '"Üretimi Tamamla" butonunu kullanarak ilk üretim kaydınızı oluşturun' : 'Farklı filtre kriterleri deneyin'}</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Toplam Üretim</p>
                        <p className="text-lg font-bold" data-testid="text-total-produced">
                          {filtered.reduce((sum, r) => sum + parseFloat(r.producedQuantity || '0'), 0).toLocaleString('tr-TR')} adet
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Toplam Fire</p>
                        <p className="text-lg font-bold text-red-500" data-testid="text-total-waste">
                          {filtered.reduce((sum, r) => sum + parseFloat(r.wasteQuantity || '0'), 0).toLocaleString('tr-TR')} adet
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Fire Oranı</p>
                        <p className="text-lg font-bold" data-testid="text-waste-rate">
                          {(() => {
                            const totalProduced = filtered.reduce((s, r) => s + parseFloat(r.producedQuantity || '0'), 0);
                            const totalWaste = filtered.reduce((s, r) => s + parseFloat(r.wasteQuantity || '0'), 0);
                            return totalProduced > 0 ? `%${((totalWaste / (totalProduced + totalWaste)) * 100).toFixed(1)}` : '%0';
                          })()}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Kayıt Sayısı</p>
                        <p className="text-lg font-bold">{filtered.length}</p>
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Üretim No</TableHead>
                          <TableHead>Tarih</TableHead>
                          <TableHead>Miktar</TableHead>
                          <TableHead>Fire</TableHead>
                          <TableHead>Stok Düşümü</TableHead>
                          <TableHead>Ürün Girişi</TableHead>
                          <TableHead>Durum</TableHead>
                          <TableHead>Notlar</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map(record => (
                          <TableRow key={record.id} data-testid={`production-record-${record.id}`}>
                            <TableCell className="font-mono text-sm">{record.productionNumber}</TableCell>
                            <TableCell>{new Date(record.productionDate).toLocaleDateString('tr-TR')}</TableCell>
                            <TableCell className="font-medium">{record.producedQuantity} {record.unit}</TableCell>
                            <TableCell>
                              {parseFloat(record.wasteQuantity) > 0 ? (
                                <span className="text-red-500">{record.wasteQuantity} {record.unit}</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {record.ingredientsDeducted ? (
                                <Badge className="bg-green-500 text-white">
                                  <ArrowDownToLine className="h-3 w-3 mr-1" />
                                  Düşüldü
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Bekliyor</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {record.productAddedToStock ? (
                                <Badge className="bg-blue-500 text-white">
                                  <ArrowUpFromLine className="h-3 w-3 mr-1" />
                                  Eklendi
                                </Badge>
                              ) : (
                                <Badge variant="secondary">-</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${getStatusColor(record.status)} text-white`}>
                                {getStatusLabel(record.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                              {record.notes || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* STOK BAĞLANTILARI TAB */}
        <TabsContent value="baglanti" className="mt-4 space-y-4">
          {materialLinks && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="hover-elevate">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Boxes className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Toplam Hammadde</p>
                        <p className="text-xl font-bold">{materialLinks.summary.total}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover-elevate">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/20 rounded-lg">
                        <Link2 className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Bağlı</p>
                        <p className="text-xl font-bold">{materialLinks.summary.linked}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover-elevate">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-500/20 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Bağlantısız</p>
                        <p className="text-xl font-bold">{materialLinks.summary.unlinked}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="h-5 w-5" />
                    Hammadde - Stok Bağlantıları
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kod</TableHead>
                        <TableHead>Hammadde</TableHead>
                        <TableHead>Birim</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>Stok Kalemi</TableHead>
                        <TableHead>Mevcut Stok</TableHead>
                        <TableHead>Min. Stok</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {materialLinks.materials.map(mat => (
                        <TableRow key={mat.materialId} data-testid={`material-link-${mat.materialId}`}>
                          <TableCell className="font-mono text-sm">{mat.materialCode}</TableCell>
                          <TableCell className="font-medium">{mat.materialName}</TableCell>
                          <TableCell>{mat.materialUnit}</TableCell>
                          <TableCell>
                            {mat.linked ? (
                              <Badge className="bg-green-500 text-white">Bağlı</Badge>
                            ) : (
                              <Badge variant="destructive">Bağlantısız</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {mat.inventoryName ? (
                              <span className="text-sm">{mat.inventoryName} ({mat.inventoryCode})</span>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {mat.currentStock !== null ? (
                              <span className={mat.currentStock <= (mat.minimumStock || 0) ? 'text-red-500 font-medium' : ''}>
                                {mat.currentStock.toFixed(2)} {mat.stockUnit}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {mat.minimumStock !== null ? (
                              <span className="text-sm">{mat.minimumStock.toFixed(2)} {mat.stockUnit}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* AI ANALİZ TAB */}
        <TabsContent value="ai-analiz" className="mt-4 space-y-4">
          {aiInsights ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <Card className="hover-elevate">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Üretim (30 gün)</p>
                      <p className="text-2xl font-bold">{aiInsights.summary.totalProductions}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover-elevate">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Toplam Üretilen</p>
                      <p className="text-2xl font-bold">{aiInsights.summary.totalProduced}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover-elevate">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Fire</p>
                      <p className="text-2xl font-bold">{aiInsights.summary.totalWaste}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover-elevate">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Fire Oranı</p>
                      <p className="text-2xl font-bold">%{aiInsights.summary.wasteRate}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover-elevate">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Düşük Stok</p>
                      <p className="text-2xl font-bold text-red-500">{aiInsights.summary.lowStockCount}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* AI Öneriler */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-500" />
                    AI Önerileri
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {aiInsights.recommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        {rec.startsWith("ACİL") ? (
                          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                        ) : rec.startsWith("UYARI") ? (
                          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                        ) : (
                          <Zap className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                        )}
                        <p className="text-sm">{rec}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Tüketim Tahminleri */}
              {aiInsights.consumptionForecasts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5" />
                      Tüketim Tahminleri
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Hammadde</TableHead>
                          <TableHead>Mevcut Stok</TableHead>
                          <TableHead>Günlük Tüketim</TableHead>
                          <TableHead>Kalan Gün</TableHead>
                          <TableHead>Önerilen Sipariş</TableHead>
                          <TableHead>Aciliyet</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {aiInsights.consumptionForecasts.map((fc, idx) => (
                          <TableRow key={idx} data-testid={`forecast-${idx}`}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{fc.materialName}</p>
                                <p className="text-xs text-muted-foreground">{fc.materialCode}</p>
                              </div>
                            </TableCell>
                            <TableCell>{fc.currentStock} {fc.unit}</TableCell>
                            <TableCell>{fc.dailyConsumption} {fc.unit}</TableCell>
                            <TableCell>
                              <span className={getUrgencyColor(fc.urgency)}>
                                {fc.daysRemaining > 365 ? "365+" : fc.daysRemaining} gün
                              </span>
                            </TableCell>
                            <TableCell>{fc.suggestedOrderQuantity} {fc.unit}</TableCell>
                            <TableCell>{getUrgencyBadge(fc.urgency)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Düşük Stok Uyarıları */}
              {aiInsights.lowStockAlerts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      Düşük Stok Uyarıları
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {aiInsights.lowStockAlerts.map(alert => (
                        <Card key={alert.id} className="border-red-200 dark:border-red-800">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-medium text-sm">{alert.name}</p>
                              <Badge variant="destructive" className="text-xs">{alert.code}</Badge>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Mevcut:</span>
                                <span className="text-red-500 font-medium">{alert.currentStock} {alert.unit}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Minimum:</span>
                                <span>{alert.minimumStock} {alert.unit}</span>
                              </div>
                              <Progress 
                                value={Math.min(100, (parseFloat(alert.currentStock) / parseFloat(alert.minimumStock)) * 100)} 
                                className="h-2 mt-2" 
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">AI analiz yükleniyor...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Plan Ekleme Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedDate ? `${selectedDate.toLocaleDateString('tr-TR')} - Üretim Planı` : 'Üretim Planı Ekle'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ürün</Label>
              <Select value={formData.productId} onValueChange={handleProductSelect}>
                <SelectTrigger data-testid="select-product">
                  <SelectValue placeholder="Ürün seçin" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name} ({product.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loadingRecipeInfo && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 bg-muted/50 rounded-md">
                <Loader2 className="h-4 w-4 animate-spin" />
                Reçete bilgileri yükleniyor...
              </div>
            )}

            {recipeInfo && (recipeInfo.recipe || recipeInfo.batchSpec) && (
              <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                <CardContent className="p-3 space-y-2">
                  <p className="text-xs font-medium flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                    <Zap className="h-3.5 w-3.5" />
                    Reçete Bilgileri (Otomatik)
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {recipeInfo.recipe && (
                      <>
                        <div>
                          <span className="text-muted-foreground">Reçete:</span>{' '}
                          <span className="font-medium">{recipeInfo.recipe.name}</span>
                        </div>
                        {recipeInfo.recipe.expectedWastePercent > 0 && (
                          <div>
                            <span className="text-muted-foreground">Beklenen Fire:</span>{' '}
                            <span className="font-medium text-red-600">%{recipeInfo.recipe.expectedWastePercent}</span>
                          </div>
                        )}
                        {recipeInfo.recipe.productionTimeMinutes > 0 && (
                          <div>
                            <span className="text-muted-foreground">Süre/Batch:</span>{' '}
                            <span className="font-medium">{recipeInfo.recipe.productionTimeMinutes} dk</span>
                          </div>
                        )}
                      </>
                    )}
                    {recipeInfo.batchSpec && (
                      <>
                        <div>
                          <span className="text-muted-foreground">Batch Ağırlık:</span>{' '}
                          <span className="font-medium">{recipeInfo.batchSpec.batchWeightKg} kg</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Batch Adet:</span>{' '}
                          <span className="font-medium">{recipeInfo.batchSpec.expectedPieces} adet</span>
                        </div>
                        {recipeInfo.batchSpec.machineName && (
                          <div>
                            <span className="text-muted-foreground">Makine:</span>{' '}
                            <span className="font-medium">{recipeInfo.batchSpec.machineName}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <Label>İstasyon {recipeInfo?.stationId ? <Badge variant="secondary" className="ml-1 text-[10px]">Otomatik</Badge> : null}</Label>
              <Select value={formData.stationId} onValueChange={(val) => setFormData({...formData, stationId: val})}>
                <SelectTrigger data-testid="select-station">
                  <SelectValue placeholder="İstasyon seçin" />
                </SelectTrigger>
                <SelectContent>
                  {stations.map(station => (
                    <SelectItem key={station.id} value={station.id.toString()}>
                      {station.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {recipeInfo?.batchSpec?.expectedPieces ? (
              <div className="space-y-2">
                <Label>Batch Adedi</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Batch sayısı"
                    value={formData.batchCount}
                    onChange={(e) => handleBatchCountChange(e.target.value)}
                    data-testid="input-batch-count"
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">x</span>
                  <span className="text-sm font-medium">{recipeInfo.batchSpec.expectedPieces} adet</span>
                  <span className="text-sm text-muted-foreground">=</span>
                  <span className="text-sm font-bold text-amber-600" data-testid="text-total-target">
                    {formData.targetQuantity || 0} adet
                  </span>
                </div>
                {recipeInfo.recipe?.expectedWastePercent ? (
                  <p className="text-xs text-muted-foreground">
                    Beklenen fire: ~{Math.round(Number(formData.targetQuantity || 0) * recipeInfo.recipe.expectedWastePercent / 100)} adet (%{recipeInfo.recipe.expectedWastePercent})
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Hedef Miktar (adet)</Label>
                <Input
                  type="number"
                  placeholder="Örn: 500"
                  value={formData.targetQuantity}
                  onChange={(e) => setFormData({...formData, targetQuantity: e.target.value})}
                  data-testid="input-target-quantity"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Notlar (Opsiyonel)</Label>
              <Textarea
                placeholder="Üretim planı hakkında notlar..."
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                data-testid="input-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
            <Button onClick={handleAddPlan} disabled={createMutation.isPending} data-testid="button-save-plan">
              {createMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Üretimi Tamamla Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={(open) => { setCompleteDialogOpen(open); if (!open) resetCompleteForm(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-green-500" />
              Üretimi Tamamla
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ürün Seçin</Label>
              <Select value={selectedProductId} onValueChange={(val) => { setSelectedProductId(val); setSelectedRecipeId(""); setStockCheckResult(null); }}>
                <SelectTrigger data-testid="select-production-product">
                  <SelectValue placeholder="Üretilecek ürünü seçin" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProductId && (
              <div className="space-y-2">
                <Label>Reçete Seçin</Label>
                {getRecipesForProduct(selectedProductId).length === 0 ? (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
                    <AlertTriangle className="h-4 w-4 inline mr-2 text-amber-500" />
                    Bu ürüne ait aktif reçete bulunamadı. Önce Maliyet Yönetimi sekmesinden reçete tanımlayın.
                  </div>
                ) : (
                  <Select value={selectedRecipeId} onValueChange={(val) => { setSelectedRecipeId(val); setStockCheckResult(null); }}>
                    <SelectTrigger data-testid="select-production-recipe">
                      <SelectValue placeholder="Reçete seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {getRecipesForProduct(selectedProductId).map(recipe => (
                        <SelectItem key={recipe.id} value={recipe.id.toString()}>
                          {recipe.name} (Çıktı: {recipe.outputQuantity})
                          {recipe.recipeType === 'KEYBLEND' && ' [KEYBLEND]'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {selectedRecipeId && (
              <div className="space-y-2">
                <Label>Üretim Miktarı</Label>
                <Input
                  type="number"
                  placeholder="Üretilecek miktar"
                  value={producedQuantity}
                  onChange={(e) => { setProducedQuantity(e.target.value); setStockCheckResult(null); }}
                  data-testid="input-produced-quantity"
                />
              </div>
            )}

            {selectedRecipeId && producedQuantity && (
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleCheckStock}
                disabled={stockChecking}
                data-testid="button-check-stock"
              >
                {stockChecking ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Package className="h-4 w-4 mr-2" />
                )}
                Stok Kontrolü Yap
              </Button>
            )}

            {stockCheckResult && (
              <div className="space-y-3">
                <div className={`p-3 rounded-lg ${stockCheckResult.allSufficient ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                  {stockCheckResult.allSufficient ? (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Tüm hammaddeler yeterli. Üretime başlanabilir.</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="font-medium">Bazı hammaddelerin stoğu yetersiz!</span>
                    </div>
                  )}
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hammadde</TableHead>
                      <TableHead>Gerekli</TableHead>
                      <TableHead>Mevcut</TableHead>
                      <TableHead>Durum</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockCheckResult.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{item.materialName}</p>
                            <p className="text-xs text-muted-foreground">{item.materialCode}</p>
                          </div>
                        </TableCell>
                        <TableCell>{item.requiredQuantity} {item.unit}</TableCell>
                        <TableCell>
                          {item.linked ? (
                            <span className={!item.sufficient ? 'text-red-500 font-medium' : ''}>{item.currentStock} {item.unit}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">Bağlantısız</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {!item.linked ? (
                            <Badge variant="secondary">Bağlantısız</Badge>
                          ) : item.sufficient ? (
                            <Badge className="bg-green-500 text-white">Yeterli</Badge>
                          ) : (
                            <Badge variant="destructive">Eksik: {item.deficit} {item.unit}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notlar (Opsiyonel)</Label>
              <Textarea
                placeholder="Üretim hakkında notlar..."
                value={productionNotes}
                onChange={(e) => setProductionNotes(e.target.value)}
                data-testid="input-production-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>İptal</Button>
            <Button 
              onClick={handleCompleteProduction} 
              disabled={completeMutation.isPending || !selectedProductId || !selectedRecipeId || !producedQuantity}
              data-testid="button-confirm-production"
            >
              {completeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  İşleniyor...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Üretimi Tamamla
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
