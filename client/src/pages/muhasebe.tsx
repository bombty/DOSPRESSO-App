import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Calculator, 
  Settings, 
  TrendingUp, 
  Users, 
  Calendar,
  Edit,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Info,
  ArrowRight,
  Percent,
  Banknote,
  Receipt,
  Utensils,
  Bus
} from "lucide-react";

interface PayrollParameters {
  id: number;
  year: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  minimumWageGross: number;
  minimumWageNet: number;
  sgkEmployeeRate: number;
  sgkEmployerRate: number;
  unemploymentEmployeeRate: number;
  unemploymentEmployerRate: number;
  stampTaxRate: number;
  taxBracket1Limit: number;
  taxBracket1Rate: number;
  taxBracket2Limit: number;
  taxBracket2Rate: number;
  taxBracket3Limit: number;
  taxBracket3Rate: number;
  taxBracket4Limit: number;
  taxBracket4Rate: number;
  taxBracket5Rate: number;
  mealAllowanceTaxExemptDaily: number;
  mealAllowanceSgkExemptDaily: number;
  transportAllowanceExemptDaily: number;
  workingDaysPerMonth: number;
  workingHoursPerDay: number;
  overtimeMultiplier: string;
  notes?: string;
}

function formatCurrency(value: number): string {
  return (value / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(value: number): string {
  return (value / 10).toFixed(1);
}

export default function Muhasebe() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [editingParam, setEditingParam] = useState<PayrollParameters | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [calcGross, setCalcGross] = useState<string>("");
  const [calcNet, setCalcNet] = useState<string>("");
  const [calcCumulativeTaxBase, setCalcCumulativeTaxBase] = useState<string>("0");
  const [calcResult, setCalcResult] = useState<any>(null);

  const canEdit = user?.role === 'admin' || user?.role === 'muhasebe';

  const { data: parameters = [], isLoading } = useQuery<PayrollParameters[]>({
    queryKey: ['/api/payroll/parameters'],
  });

  const currentYearParams = parameters.find(p => p.year === selectedYear);
  const activeParams = parameters.find(p => p.isActive);

  const updateMutation = useMutation({
    mutationFn: async (data: PayrollParameters) => {
      // Only send the fields allowed by the Zod schema
      const payload = {
        minimumWageGross: data.minimumWageGross,
        minimumWageNet: data.minimumWageNet,
        taxBracket1Limit: data.taxBracket1Limit,
        taxBracket2Limit: data.taxBracket2Limit,
        taxBracket3Limit: data.taxBracket3Limit,
        taxBracket4Limit: data.taxBracket4Limit,
        mealAllowanceTaxExemptDaily: data.mealAllowanceTaxExemptDaily,
        mealAllowanceSgkExemptDaily: data.mealAllowanceSgkExemptDaily,
        transportAllowanceExemptDaily: data.transportAllowanceExemptDaily,
        isActive: data.isActive,
        notes: data.notes,
      };
      return apiRequest("PATCH", `/api/payroll/parameters/${editingParam?.id}`, payload);
    },
    onSuccess: () => {
      toast({ title: "Parametreler güncellendi" });
      setIsEditDialogOpen(false);
      setEditingParam(null);
      queryClient.invalidateQueries({ queryKey: ['/api/payroll/parameters'] });
    },
    onError: () => {
      toast({ title: "Güncelleme başarısız", variant: "destructive" });
    },
  });

  const calculatePayroll = async () => {
    if (!calcGross && !calcNet) {
      toast({ title: "Brüt veya net maaş girin", variant: "destructive" });
      return;
    }

    try {
      // Convert TL to kuruş (multiply by 100 and round to avoid floating point errors)
      const grossKurus = calcGross ? Math.round(parseFloat(calcGross) * 100) : undefined;
      const netKurus = calcNet ? Math.round(parseFloat(calcNet) * 100) : undefined;
      const cumulativeKurus = Math.round(parseFloat(calcCumulativeTaxBase || "0") * 100);

      const response = await fetch('/api/payroll/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          grossSalary: grossKurus,
          netSalary: netKurus,
          year: selectedYear,
          cumulativeTaxBase: cumulativeKurus,
        }),
      });

      if (!response.ok) throw new Error('Hesaplama hatası');
      
      const result = await response.json();
      setCalcResult(result);
    } catch {
      toast({ title: "Hesaplama hatası", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Calculator className="h-6 w-6 text-emerald-600" />
            <h1 className="text-xl font-bold">Muhasebe & Bordro</h1>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-[120px]" data-testid="select-year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="parameters" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="parameters" data-testid="tab-parameters">
              <Settings className="h-4 w-4 mr-2" />
              Parametreler
            </TabsTrigger>
            <TabsTrigger value="calculator" data-testid="tab-calculator">
              <Calculator className="h-4 w-4 mr-2" />
              Hesaplama
            </TabsTrigger>
            <TabsTrigger value="reports" data-testid="tab-reports">
              <TrendingUp className="h-4 w-4 mr-2" />
              Raporlar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="parameters" className="space-y-4 mt-4">
            {currentYearParams ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={currentYearParams.isActive ? "default" : "secondary"}>
                      {currentYearParams.isActive ? "Aktif" : "Pasif"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Yürürlük: {new Date(currentYearParams.effectiveFrom).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                  {canEdit && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => { 
                        // Clone the object to avoid mutating query cache
                        setEditingParam({ ...currentYearParams }); 
                        setIsEditDialogOpen(true); 
                      }}
                      data-testid="button-edit-params"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Düzenle
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-green-600" />
                        Asgari Ücret
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Brüt:</span>
                        <span className="font-medium">{formatCurrency(currentYearParams.minimumWageGross)} TL</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Net:</span>
                        <span className="font-medium">{formatCurrency(currentYearParams.minimumWageNet)} TL</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Percent className="h-4 w-4 text-blue-600" />
                        SGK & İşsizlik (İşçi)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SGK:</span>
                        <span className="font-medium">%{formatPercent(currentYearParams.sgkEmployeeRate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">İşsizlik:</span>
                        <span className="font-medium">%{formatPercent(currentYearParams.unemploymentEmployeeRate)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-muted-foreground">Toplam:</span>
                        <span className="font-bold">%{formatPercent(currentYearParams.sgkEmployeeRate + currentYearParams.unemploymentEmployeeRate)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-orange-600" />
                        Damga Vergisi
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Oran:</span>
                        <span className="font-medium">Binde {(currentYearParams.stampTaxRate / 100).toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Asgari ücret tutarına kadar istisna uygulanır
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="md:col-span-2 lg:col-span-3">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                        Gelir Vergisi Dilimleri (Kümülatif)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <div className="text-xs text-muted-foreground">1. Dilim</div>
                          <div className="font-medium">%{formatPercent(currentYearParams.taxBracket1Rate)}</div>
                          <div className="text-xs">0 - {formatCurrency(currentYearParams.taxBracket1Limit)} TL</div>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="text-xs text-muted-foreground">2. Dilim</div>
                          <div className="font-medium">%{formatPercent(currentYearParams.taxBracket2Rate)}</div>
                          <div className="text-xs">{formatCurrency(currentYearParams.taxBracket1Limit)} - {formatCurrency(currentYearParams.taxBracket2Limit)} TL</div>
                        </div>
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                          <div className="text-xs text-muted-foreground">3. Dilim</div>
                          <div className="font-medium">%{formatPercent(currentYearParams.taxBracket3Rate)}</div>
                          <div className="text-xs">{formatCurrency(currentYearParams.taxBracket2Limit)} - {formatCurrency(currentYearParams.taxBracket3Limit)} TL</div>
                        </div>
                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                          <div className="text-xs text-muted-foreground">4. Dilim</div>
                          <div className="font-medium">%{formatPercent(currentYearParams.taxBracket4Rate)}</div>
                          <div className="text-xs">{formatCurrency(currentYearParams.taxBracket3Limit)} - {formatCurrency(currentYearParams.taxBracket4Limit)} TL</div>
                        </div>
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <div className="text-xs text-muted-foreground">5. Dilim</div>
                          <div className="font-medium">%{formatPercent(currentYearParams.taxBracket5Rate)}</div>
                          <div className="text-xs">{formatCurrency(currentYearParams.taxBracket4Limit)} TL üzeri</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Utensils className="h-4 w-4 text-amber-600" />
                        Yemek Parası Muafiyeti
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Vergi Muaf (Günlük):</span>
                        <span className="font-medium">{formatCurrency(currentYearParams.mealAllowanceTaxExemptDaily)} TL</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SGK Muaf (Nakit):</span>
                        <span className="font-medium">{formatCurrency(currentYearParams.mealAllowanceSgkExemptDaily)} TL</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Yemek kartı ile SGK muafiyeti sınırsızdır
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Bus className="h-4 w-4 text-cyan-600" />
                        Ulaşım Yardımı
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Muaf Limit (Günlük):</span>
                        <span className="font-medium">{formatCurrency(currentYearParams.transportAllowanceExemptDaily)} TL</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-indigo-600" />
                        Çalışma Parametreleri
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Aylık Gün:</span>
                        <span className="font-medium">{currentYearParams.workingDaysPerMonth} gün</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Günlük Saat:</span>
                        <span className="font-medium">{currentYearParams.workingHoursPerDay} saat</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fazla Mesai:</span>
                        <span className="font-medium">x{currentYearParams.overtimeMultiplier}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {currentYearParams.notes && (
                  <Card className="border-yellow-200 dark:border-yellow-800">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-yellow-600 mt-0.5" />
                        <p className="text-sm text-muted-foreground">{currentYearParams.notes}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{selectedYear} yılı için bordro parametreleri bulunamadı.</p>
                  {canEdit && (
                    <Button className="mt-4" data-testid="button-add-params">
                      Parametre Ekle
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="calculator" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Maaş Hesaplama
                </CardTitle>
                <CardDescription>
                  Brüt veya net maaş girerek detaylı bordro hesabı yapın
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="grossSalary">Brüt Maaş (TL)</Label>
                    <Input
                      id="grossSalary"
                      type="number"
                      step="0.01"
                      placeholder="Brüt maaş girin..."
                      value={calcGross}
                      onChange={(e) => { setCalcGross(e.target.value); setCalcNet(""); }}
                      data-testid="input-gross-salary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="netSalary">Net Maaş (TL)</Label>
                    <Input
                      id="netSalary"
                      type="number"
                      step="0.01"
                      placeholder="Net maaş girin..."
                      value={calcNet}
                      onChange={(e) => { setCalcNet(e.target.value); setCalcGross(""); }}
                      data-testid="input-net-salary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cumulativeTaxBase">Kümülatif Vergi Matrahı (TL)</Label>
                    <Input
                      id="cumulativeTaxBase"
                      type="number"
                      step="0.01"
                      placeholder="Yıl başından itibaren toplam..."
                      value={calcCumulativeTaxBase}
                      onChange={(e) => setCalcCumulativeTaxBase(e.target.value)}
                      data-testid="input-cumulative-tax-base"
                    />
                    <p className="text-xs text-muted-foreground">
                      Yıl başından bu aya kadar biriken vergi matrahı
                    </p>
                  </div>
                </div>
                <Button onClick={calculatePayroll} className="w-full" data-testid="button-calculate">
                  <Calculator className="h-4 w-4 mr-2" />
                  Hesapla
                </Button>

                {calcResult && (
                  <div className="mt-6 space-y-4">
                    <Separator />
                    <h3 className="font-semibold flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Hesaplama Sonucu
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="bg-green-50 dark:bg-green-900/20">
                        <CardContent className="pt-4">
                          <div className="text-sm text-muted-foreground">Brüt Maaş</div>
                          <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                            {formatCurrency(calcResult.grossSalary)} TL
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-blue-50 dark:bg-blue-900/20">
                        <CardContent className="pt-4">
                          <div className="text-sm text-muted-foreground">Net Maaş</div>
                          <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                            {formatCurrency(calcResult.netSalary)} TL
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Kesinti Detayları</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>SGK İşçi Payı (%14):</span>
                          <span className="text-red-600">-{formatCurrency(calcResult.sgkEmployee)} TL</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>İşsizlik Sigortası (%1):</span>
                          <span className="text-red-600">-{formatCurrency(calcResult.unemploymentEmployee)} TL</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-sm">
                          <span>Gelir Vergisi Matrahı:</span>
                          <span>{formatCurrency(calcResult.taxBase)} TL</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Gelir Vergisi ({calcResult.taxBracket}. dilim):</span>
                          <span className="text-red-600">-{formatCurrency(calcResult.incomeTax)} TL</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Damga Vergisi:</span>
                          <span className="text-red-600">-{formatCurrency(calcResult.stampTax)} TL</span>
                        </div>
                        {calcResult.minimumWageExemption > 0 && (
                          <div className="flex justify-between text-sm text-green-600">
                            <span>Asgari Ücret İstisnası:</span>
                            <span>+{formatCurrency(calcResult.minimumWageExemption)} TL</span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex justify-between font-bold">
                          <span>Toplam Kesinti:</span>
                          <span className="text-red-600">-{formatCurrency(calcResult.totalDeductions)} TL</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-muted/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">İşveren Maliyeti</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Brüt Maaş:</span>
                          <span>{formatCurrency(calcResult.grossSalary)} TL</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>SGK İşveren Payı (%20.5):</span>
                          <span>+{formatCurrency(calcResult.sgkEmployer)} TL</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>İşsizlik İşveren Payı (%2):</span>
                          <span>+{formatCurrency(calcResult.unemploymentEmployer)} TL</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                          <span>Toplam Maliyet:</span>
                          <span className="text-primary">{formatCurrency(calcResult.employerCost)} TL</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4 mt-4">
            <Card>
              <CardContent className="py-8 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Bordro raporları yakında eklenecek.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Aylık bordro özeti, vergi/SGK bildirgeleri ve daha fazlası...
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bordro Parametrelerini Düzenle - {editingParam?.year}</DialogTitle>
            <DialogDescription>
              Vergi dilimleri, SGK oranları ve muafiyet limitlerini güncelleyin.
            </DialogDescription>
          </DialogHeader>
          
          {editingParam && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Brüt Asgari Ücret (TL)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(editingParam.minimumWageGross / 100).toFixed(2)}
                    onChange={(e) => setEditingParam({ ...editingParam, minimumWageGross: Math.round(parseFloat(e.target.value || "0") * 100) })}
                    data-testid="input-edit-min-wage-gross"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Net Asgari Ücret (TL)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(editingParam.minimumWageNet / 100).toFixed(2)}
                    onChange={(e) => setEditingParam({ ...editingParam, minimumWageNet: Math.round(parseFloat(e.target.value || "0") * 100) })}
                    data-testid="input-edit-min-wage-net"
                  />
                </div>
              </div>

              <Separator />
              <h4 className="font-medium">Gelir Vergisi Dilimleri (TL)</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>1. Dilim Üst Sınırı</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(editingParam.taxBracket1Limit / 100).toFixed(2)}
                    onChange={(e) => setEditingParam({ ...editingParam, taxBracket1Limit: Math.round(parseFloat(e.target.value || "0") * 100) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>2. Dilim Üst Sınırı</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(editingParam.taxBracket2Limit / 100).toFixed(2)}
                    onChange={(e) => setEditingParam({ ...editingParam, taxBracket2Limit: Math.round(parseFloat(e.target.value || "0") * 100) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>3. Dilim Üst Sınırı</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(editingParam.taxBracket3Limit / 100).toFixed(2)}
                    onChange={(e) => setEditingParam({ ...editingParam, taxBracket3Limit: Math.round(parseFloat(e.target.value || "0") * 100) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>4. Dilim Üst Sınırı</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(editingParam.taxBracket4Limit / 100).toFixed(2)}
                    onChange={(e) => setEditingParam({ ...editingParam, taxBracket4Limit: Math.round(parseFloat(e.target.value || "0") * 100) })}
                  />
                </div>
              </div>

              <Separator />
              <h4 className="font-medium">Yemek & Ulaşım Muafiyetleri (Günlük TL)</h4>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Yemek Vergi Muafiyeti</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(editingParam.mealAllowanceTaxExemptDaily / 100).toFixed(2)}
                    onChange={(e) => setEditingParam({ ...editingParam, mealAllowanceTaxExemptDaily: Math.round(parseFloat(e.target.value || "0") * 100) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Yemek SGK Muafiyeti</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(editingParam.mealAllowanceSgkExemptDaily / 100).toFixed(2)}
                    onChange={(e) => setEditingParam({ ...editingParam, mealAllowanceSgkExemptDaily: Math.round(parseFloat(e.target.value || "0") * 100) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ulaşım Muafiyeti</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(editingParam.transportAllowanceExemptDaily / 100).toFixed(2)}
                    onChange={(e) => setEditingParam({ ...editingParam, transportAllowanceExemptDaily: Math.round(parseFloat(e.target.value || "0") * 100) })}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} data-testid="button-cancel-edit">
              <X className="h-4 w-4 mr-2" />
              İptal
            </Button>
            <Button 
              onClick={() => editingParam && updateMutation.mutate(editingParam)}
              disabled={updateMutation.isPending}
              data-testid="button-save-params"
            >
              <Save className="h-4 w-4 mr-2" />
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
