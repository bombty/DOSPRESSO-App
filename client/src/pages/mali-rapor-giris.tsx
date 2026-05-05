/**
 * Sprint 14 (5 May 2026) - Mali Rapor Hızlı Veri Girişi
 * 
 * Aslan'ın talebi (5 May 20:00):
 *   IMG_2094: Mali Rapor 0₺ — gelir/gider/net kar hep boş.
 *   Mahmut'un manuel olarak gelir-gider girebilmesi gerekli.
 * 
 * BU SAYFA: Şube × ay seç, kalem kalem mali veri gir, kaydet.
 * 
 * Veri Modeli (branch_financial_summary):
 *   - revenue_total (gelir)
 *   - cost_payroll (bordro)
 *   - cost_supplies (sarf)
 *   - cost_rent (kira)
 *   - cost_utilities (faturalar)
 *   - cost_maintenance (bakım)
 *   - cost_other (diğer)
 *   - net_profit, profit_margin (otomatik hesaplanır)
 * 
 * Yetki: admin, ceo, cgo, muhasebe, muhasebe_ik
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, TrendingUp, TrendingDown, AlertTriangle, Save, Calculator, FileBarChart } from "lucide-react";

const ALLOWED_ROLES = ['admin', 'ceo', 'cgo', 'muhasebe', 'muhasebe_ik'];

export default function MaliRaporGiris() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAllowed = user?.role && ALLOWED_ROLES.includes(user.role);

  const now = new Date();
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);

  // Form state
  const [revenue, setRevenue] = useState<string>('');
  const [costPayroll, setCostPayroll] = useState<string>('');
  const [costSupplies, setCostSupplies] = useState<string>('');
  const [costRent, setCostRent] = useState<string>('');
  const [costUtilities, setCostUtilities] = useState<string>('');
  const [costMaintenance, setCostMaintenance] = useState<string>('');
  const [costOther, setCostOther] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Şubeler
  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ['/api/branches'],
    enabled: !!isAllowed,
  });

  useEffect(() => {
    if (!selectedBranchId && branches.length > 0) {
      const pilot = branches.find((b: any) => [5, 8, 23, 24].includes(b.id) && b.isActive);
      if (pilot) setSelectedBranchId(pilot.id);
    }
  }, [branches, selectedBranchId]);

  // Mevcut veri (varsa load)
  const { data: existingReport, refetch } = useQuery<any>({
    queryKey: ['/api/reports/financial', selectedBranchId, selectedYear, selectedMonth],
    queryFn: async () => {
      if (!selectedBranchId) return null;
      const res = await fetch(
        `/api/reports/financial?branchId=${selectedBranchId}&year=${selectedYear}&month=${selectedMonth}`,
        { credentials: 'include' }
      );
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!selectedBranchId,
  });

  // Mevcut data load et
  useEffect(() => {
    if (existingReport) {
      setRevenue(existingReport.revenueTotal || '');
      setCostPayroll(existingReport.costPayroll || '');
      setCostSupplies(existingReport.costSupplies || '');
      setCostRent(existingReport.costRent || '');
      setCostUtilities(existingReport.costUtilities || '');
      setCostMaintenance(existingReport.costMaintenance || '');
      setCostOther(existingReport.costOther || '');
      setNotes(existingReport.notes || '');
    } else {
      // Reset
      setRevenue(''); setCostPayroll(''); setCostSupplies('');
      setCostRent(''); setCostUtilities(''); setCostMaintenance('');
      setCostOther(''); setNotes('');
    }
  }, [existingReport]);

  // Hesaplama (canlı)
  const totalCost = 
    Number(costPayroll || 0) + 
    Number(costSupplies || 0) + 
    Number(costRent || 0) + 
    Number(costUtilities || 0) + 
    Number(costMaintenance || 0) + 
    Number(costOther || 0);
  const netProfit = Number(revenue || 0) - totalCost;
  const profitMargin = revenue && Number(revenue) > 0 ? (netProfit / Number(revenue)) * 100 : 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBranchId) throw new Error('Şube seçilmedi');
      
      return apiRequest('POST', '/api/reports/financial/calculate', {
        branchId: selectedBranchId,
        year: selectedYear,
        month: selectedMonth,
        revenueTotal: Number(revenue || 0),
        revenueSource: 'manual',
        costPayroll: Number(costPayroll || 0),
        costSupplies: Number(costSupplies || 0),
        costRent: Number(costRent || 0),
        costUtilities: Number(costUtilities || 0),
        costMaintenance: Number(costMaintenance || 0),
        costOther: Number(costOther || 0),
        totalCost,
        netProfit,
        profitMargin,
        notes,
        calculatedBy: user?.id,
      });
    },
    onSuccess: () => {
      toast({ title: '✓ Mali rapor kaydedildi', description: `${months[selectedMonth - 1]} ${selectedYear}` });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/reports/financial'] });
    },
    onError: (e: any) => toast({ title: 'Hata', description: e.message, variant: 'destructive' }),
  });

  if (!isAllowed) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <Card className="border-red-200">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-red-500" />
            <h2 className="text-lg font-bold">Yetki Yok</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Mali rapor girişi <strong>admin/CEO/CGO/muhasebe</strong> rolleri içindir.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const months = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-4 pb-20">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-green-600" />
                Mali Rapor Girişi
              </CardTitle>
              <CardDescription>
                Şube × ay bazlı gelir/gider manuel veri girişi
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filtreler */}
      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Şube</Label>
              <Select 
                value={selectedBranchId ? String(selectedBranchId) : ''} 
                onValueChange={(v) => setSelectedBranchId(Number(v))}
              >
                <SelectTrigger data-testid="select-branch"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {branches.filter((b: any) => b.isActive).map((b: any) => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Yıl</Label>
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Ay</Label>
              <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {months.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {existingReport && (
            <div className="mt-2 text-xs">
              <Badge variant="secondary">📝 Mevcut kayıt var (düzenleme modu)</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* GELİR */}
      <Card className="border-green-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-green-700">
            <TrendingUp className="h-4 w-4" />
            Gelir
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label className="text-xs">Toplam Gelir (₺)</Label>
            <Input 
              type="number"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              placeholder="örn: 450000"
              className="text-lg font-medium"
              data-testid="input-revenue"
            />
          </div>
        </CardContent>
      </Card>

      {/* GİDER */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-red-700">
            <TrendingDown className="h-4 w-4" />
            Giderler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Bordro</Label>
              <Input 
                type="number"
                value={costPayroll}
                onChange={(e) => setCostPayroll(e.target.value)}
                placeholder="0"
                data-testid="input-cost-payroll"
              />
            </div>
            <div>
              <Label className="text-xs">Sarf Malzeme</Label>
              <Input 
                type="number"
                value={costSupplies}
                onChange={(e) => setCostSupplies(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs">Kira</Label>
              <Input 
                type="number"
                value={costRent}
                onChange={(e) => setCostRent(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs">Faturalar (Su/Elektrik/Doğalgaz)</Label>
              <Input 
                type="number"
                value={costUtilities}
                onChange={(e) => setCostUtilities(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs">Bakım/Onarım</Label>
              <Input 
                type="number"
                value={costMaintenance}
                onChange={(e) => setCostMaintenance(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs">Diğer</Label>
              <Input 
                type="number"
                value={costOther}
                onChange={(e) => setCostOther(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CANLI HESAPLAMA */}
      <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-300">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Canlı Hesaplama
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-white dark:bg-slate-900 rounded">
              <div className="text-xs text-muted-foreground">Toplam Gelir</div>
              <div className="text-lg font-bold text-green-600">
                ₺{Number(revenue || 0).toLocaleString('tr-TR')}
              </div>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded">
              <div className="text-xs text-muted-foreground">Toplam Gider</div>
              <div className="text-lg font-bold text-red-500">
                ₺{totalCost.toLocaleString('tr-TR')}
              </div>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded">
              <div className="text-xs text-muted-foreground">Net Kar</div>
              <div className={`text-lg font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                ₺{netProfit.toLocaleString('tr-TR')}
              </div>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded">
              <div className="text-xs text-muted-foreground">Kar Marjı</div>
              <div className={`text-lg font-bold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                %{profitMargin.toFixed(1)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notlar + Kaydet */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <Label className="text-xs">Notlar (opsiyonel)</Label>
            <Textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Bu ay özel notlar (özel kampanya, anormal gider, vs.)"
              rows={2}
            />
          </div>
          <Button 
            onClick={() => saveMutation.mutate()}
            disabled={!selectedBranchId || !revenue || saveMutation.isPending}
            className="w-full"
            data-testid="button-save-financial"
          >
            <Save className="h-4 w-4 mr-2" />
            {existingReport ? 'Güncelle' : 'Kaydet'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
