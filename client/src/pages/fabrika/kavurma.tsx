import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Flame, Plus, BarChart3, Thermometer, Clock, Scale } from "lucide-react";

const ROAST_DEGREES: Record<string, string> = {
  light: "Açık Kavurma",
  medium: "Orta Kavurma",
  medium_dark: "Orta-Koyu",
  dark: "Koyu Kavurma",
  very_dark: "Çok Koyu",
};

export default function Kavurma() {
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const { data: logs, isLoading, isError: logsError } = useQuery<any[]>({
    queryKey: ["/api/factory/roasting"],
  });

  const { data: stats, isError: statsError } = useQuery<any>({
    queryKey: ["/api/factory/roasting/stats"],
  });

  const { data: products } = useQuery<any[]>({
    queryKey: ["/api/factory/products"],
    queryFn: async () => {
      const res = await fetch("/api/factory/products");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const coffeeProducts = (products || []).filter((p: any) =>
    p.category === "kahve" || p.name?.toLowerCase().includes("kahve") || p.name?.toLowerCase().includes("coffee")
  );

  const [formData, setFormData] = useState({
    greenCoffeeProductId: "",
    roastedProductId: "",
    greenWeightKg: "",
    roastedWeightKg: "",
    roastDegree: "medium",
    startTemperature: "",
    endTemperature: "",
    firstCrackTime: "",
    roastDurationMinutes: "",
    notes: "",
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/factory/roasting", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Kavurma kaydı oluşturuldu" });
      queryClient.invalidateQueries({ queryKey: ["/api/factory/roasting"] });
      setShowForm(false);
      setFormData({
        greenCoffeeProductId: "", roastedProductId: "", greenWeightKg: "", roastedWeightKg: "",
        roastDegree: "medium", startTemperature: "", endTemperature: "", firstCrackTime: "",
        roastDurationMinutes: "", notes: "",
      });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!formData.greenWeightKg || !formData.roastedWeightKg || !formData.roastDegree) {
      toast({ title: "Eksik bilgi", description: "Yeşil kahve ağırlığı, kavurulmuş ağırlık ve derece zorunludur", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      ...formData,
      greenCoffeeProductId: formData.greenCoffeeProductId ? parseInt(formData.greenCoffeeProductId) : null,
      roastedProductId: formData.roastedProductId ? parseInt(formData.roastedProductId) : null,
    });
  };

  const weightLossCalc = formData.greenWeightKg && formData.roastedWeightKg
    ? (((parseFloat(formData.greenWeightKg) - parseFloat(formData.roastedWeightKg)) / (parseFloat(formData.greenWeightKg) || 1)) * 100).toFixed(1)
    : null;

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (logsError || statsError) {
    return (
      <div className="p-4">
        <Card data-testid="kavurma-error-card">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Flame className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Veri yüklenirken hata oluştu</p>
            <p className="text-sm text-muted-foreground mt-1">Kavurma kayıtları alınamadı. Lütfen sayfayı yenileyin.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Flame className="h-6 w-6 mx-auto mb-1 text-orange-500" />
            <p className="text-2xl font-bold" data-testid="text-total-roasts">{stats?.stats?.totalRoasts || 0}</p>
            <p className="text-xs text-muted-foreground">Toplam Kavurma (30 gün)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Scale className="h-6 w-6 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{stats?.stats?.avgWeightLoss ? parseFloat(stats.stats.avgWeightLoss).toFixed(1) + "%" : "-"}</p>
            <p className="text-xs text-muted-foreground">Ort. Fire Oranı</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Scale className="h-6 w-6 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold">{stats?.stats?.totalGreenKg ? parseFloat(stats.stats.totalGreenKg).toFixed(0) : 0} kg</p>
            <p className="text-xs text-muted-foreground">Toplam Yeşil Kahve</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-6 w-6 mx-auto mb-1 text-amber-600" />
            <p className="text-2xl font-bold">{stats?.stats?.totalRoastedKg ? parseFloat(stats.stats.totalRoastedKg).toFixed(0) : 0} kg</p>
            <p className="text-xs text-muted-foreground">Toplam Kavurulmuş</p>
          </CardContent>
        </Card>
      </div>

      {stats?.degreeBreakdown && stats.degreeBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Kavurma Derecesi Dağılımı (30 gün)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.degreeBreakdown.map((d: any) => (
                <Badge key={d.degree} variant="secondary">
                  {ROAST_DEGREES[d.degree] || d.degree}: {d.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h3 className="font-medium">Kavurma Kayıtları</h3>
        <Button onClick={() => setShowForm(true)} data-testid="button-new-roasting">
          <Plus className="h-4 w-4 mr-1" /> Yeni Kavurma
        </Button>
      </div>

      <div className="grid gap-3">
        {(!logs || logs.length === 0) ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Flame className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Henüz kavurma kaydı yok</p>
            </CardContent>
          </Card>
        ) : (
          logs.map((item: any) => {
            const log = item.log || item;
            return (
              <Card key={log.id} data-testid={`card-roasting-${log.id}`}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Flame className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="font-medium" data-testid={`text-charge-number-${log.id}`}>{log.chargeNumber}</p>
                        <p className="text-sm text-muted-foreground">{item.greenProductName || "Kahve"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {ROAST_DEGREES[log.roastDegree] || log.roastDegree}
                      </Badge>
                      <Badge variant="outline">
                        Fire: {log.weightLossPct ? parseFloat(log.weightLossPct).toFixed(1) : "-"}%
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Scale className="h-3 w-3" /> {log.greenWeightKg}kg → {log.roastedWeightKg}kg
                    </span>
                    {log.roastDurationMinutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {log.roastDurationMinutes} dk
                      </span>
                    )}
                    {log.startTemperature && (
                      <span className="flex items-center gap-1">
                        <Thermometer className="h-3 w-3" /> {log.startTemperature}°C → {log.endTemperature}°C
                      </span>
                    )}
                    {log.roastDate && (
                      <span>{new Date(log.roastDate).toLocaleString("tr-TR")}</span>
                    )}
                    {item.operatorName && <span>{item.operatorName}</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5" /> Yeni Kavurma Kaydı
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Yeşil Kahve (kg) *</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.greenWeightKg}
                  onChange={(e) => setFormData({ ...formData, greenWeightKg: e.target.value })}
                  data-testid="input-green-weight"
                />
              </div>
              <div>
                <Label>Kavurulmuş (kg) *</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.roastedWeightKg}
                  onChange={(e) => setFormData({ ...formData, roastedWeightKg: e.target.value })}
                  data-testid="input-roasted-weight"
                />
              </div>
            </div>
            {weightLossCalc && (
              <p className="text-sm text-muted-foreground">
                Hesaplanan fire: <span className="font-medium">{weightLossCalc}%</span>
              </p>
            )}
            <div>
              <Label>Kavurma Derecesi *</Label>
              <Select value={formData.roastDegree} onValueChange={(v) => setFormData({ ...formData, roastDegree: v })}>
                <SelectTrigger data-testid="select-roast-degree">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROAST_DEGREES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Yeşil Kahve Ürünü</Label>
                <Select value={formData.greenCoffeeProductId} onValueChange={(v) => setFormData({ ...formData, greenCoffeeProductId: v })}>
                  <SelectTrigger data-testid="select-green-product">
                    <SelectValue placeholder="Opsiyonel" />
                  </SelectTrigger>
                  <SelectContent>
                    {coffeeProducts.map((p: any) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Kavurulmuş Ürün</Label>
                <Select value={formData.roastedProductId} onValueChange={(v) => setFormData({ ...formData, roastedProductId: v })}>
                  <SelectTrigger data-testid="select-roasted-product">
                    <SelectValue placeholder="Opsiyonel" />
                  </SelectTrigger>
                  <SelectContent>
                    {coffeeProducts.map((p: any) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Başlangıç Sıcaklık (°C)</Label>
                <Input
                  type="number"
                  value={formData.startTemperature}
                  onChange={(e) => setFormData({ ...formData, startTemperature: e.target.value })}
                  data-testid="input-start-temp"
                />
              </div>
              <div>
                <Label>Bitiş Sıcaklık (°C)</Label>
                <Input
                  type="number"
                  value={formData.endTemperature}
                  onChange={(e) => setFormData({ ...formData, endTemperature: e.target.value })}
                  data-testid="input-end-temp"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First Crack (sn)</Label>
                <Input
                  type="number"
                  value={formData.firstCrackTime}
                  onChange={(e) => setFormData({ ...formData, firstCrackTime: e.target.value })}
                  data-testid="input-first-crack"
                />
              </div>
              <div>
                <Label>Süre (dk)</Label>
                <Input
                  type="number"
                  value={formData.roastDurationMinutes}
                  onChange={(e) => setFormData({ ...formData, roastDurationMinutes: e.target.value })}
                  data-testid="input-duration"
                />
              </div>
            </div>
            <div>
              <Label>Notlar</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                data-testid="input-roasting-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>İptal</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-save-roasting">
              {createMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
