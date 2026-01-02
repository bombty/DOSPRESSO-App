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
  RefreshCw
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
}

interface Station {
  id: number;
  name: string;
}

export default function FabrikaUretimPlanlama() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [formData, setFormData] = useState({
    productId: '',
    stationId: '',
    targetQuantity: '',
    notes: ''
  });

  const { data: plans = [], isLoading, refetch } = useQuery<ProductionPlan[]>({
    queryKey: ['/api/factory/production-plans'],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/factory/catalog/products'],
  });

  const { data: stations = [] } = useQuery<Station[]>({
    queryKey: ['/api/factory/stations'],
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

  const resetForm = () => {
    setFormData({ productId: '', stationId: '', targetQuantity: '', notes: '' });
    setSelectedDate(null);
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
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-amber-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Tamamlandı';
      case 'in_progress': return 'Devam Ediyor';
      case 'cancelled': return 'İptal';
      default: return 'Planlandı';
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
            <h1 className="text-2xl font-bold">Üretim Planlama</h1>
            <p className="text-muted-foreground">Günlük/haftalık üretim planlarını yönetin</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
          <Button onClick={() => { setSelectedDate(new Date()); setDialogOpen(true); }} data-testid="button-add-plan">
            <Plus className="h-4 w-4 mr-2" />
            Plan Ekle
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover-elevate">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 rounded-lg">
                <Target className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Toplam Plan</p>
                <p className="text-2xl font-bold">{plans.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Devam Eden</p>
                <p className="text-2xl font-bold">{plans.filter(p => p.status === 'in_progress').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tamamlanan</p>
                <p className="text-2xl font-bold">{plans.filter(p => p.status === 'completed').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Package className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hedef Üretim</p>
                <p className="text-2xl font-bold">{plans.reduce((sum, p) => sum + p.targetQuantity, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDate ? `${selectedDate.toLocaleDateString('tr-TR')} - Üretim Planı` : 'Üretim Planı Ekle'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ürün</Label>
              <Select value={formData.productId} onValueChange={(val) => setFormData({...formData, productId: val})}>
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

            <div className="space-y-2">
              <Label>İstasyon</Label>
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

            <div className="space-y-2">
              <Label>Hedef Miktar</Label>
              <Input
                type="number"
                placeholder="Örn: 500"
                value={formData.targetQuantity}
                onChange={(e) => setFormData({...formData, targetQuantity: e.target.value})}
                data-testid="input-target-quantity"
              />
            </div>

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
    </div>
  );
}
