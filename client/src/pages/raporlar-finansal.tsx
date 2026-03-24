import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Wallet, Calculator, TrendingDown, TrendingUp, Building2, Loader2, Pencil } from "lucide-react";

interface FinancialSummary {
  id: number;
  branchId: number;
  branchName: string;
  periodMonth: number;
  periodYear: number;
  revenueTotal: string;
  costPayroll: string;
  staffCount: number;
  costPerEmployee: string;
  costSupplies: string;
  costRent: string;
  costUtilities: string;
  costOther: string;
  costMaintenance: string;
  totalCost: string;
  netProfit: string;
  profitMargin: string;
}

function formatCurrency(val: string | number) {
  const n = Number(val || 0);
  if (n === 0) return "-";
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);
}

export default function RaporlarFinansal() {
  const { toast } = useToast();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [editBranch, setEditBranch] = useState<FinancialSummary | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const { data: financials, isLoading } = useQuery<FinancialSummary[]>({
    queryKey: ["/api/reports/financial/branches", month, year],
    queryFn: async () => {
      const res = await fetch(`/api/reports/financial/branches?month=${month}&year=${year}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const calculateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/reports/financial/calculate", { month, year });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports/financial/branches"] });
      toast({ title: "Hesaplandı", description: "Finansal veriler güncellendi" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editBranch) return;
      const res = await apiRequest("PATCH", `/api/reports/financial/branch/${editBranch.branchId}`, {
        month, year,
        revenueTotal: editValues.revenueTotal || "0",
        costRent: editValues.costRent || "0",
        costUtilities: editValues.costUtilities || "0",
        costOther: editValues.costOther || "0",
        costMaintenance: editValues.costMaintenance || "0",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports/financial/branches"] });
      toast({ title: "Kaydedildi" });
      setEditBranch(null);
    },
  });

  const totalRevenue = (financials || []).reduce((s, f) => s + Number(f.revenueTotal || 0), 0);
  const totalCost = (financials || []).reduce((s, f) => s + Number(f.totalCost || 0), 0);
  const totalProfit = totalRevenue - totalCost;
  const sorted = [...(financials || [])].sort((a, b) => Number(b.totalCost || 0) - Number(a.totalCost || 0));

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2026, i).toLocaleString("tr-TR", { month: "long" }),
  }));

  return (
    <div className="space-y-4" data-testid="financial-report-page">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Şube Finansal Raporu</h2>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-[130px]" data-testid="select-month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[90px]" data-testid="select-year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2025, 2026, 2027].map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => calculateMutation.mutate()}
            disabled={calculateMutation.isPending}
            data-testid="button-calculate"
          >
            {calculateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Calculator className="h-4 w-4 mr-1" />}
            Hesapla
          </Button>
        </div>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          <div className="flex flex-col items-center px-4 py-2 rounded-lg bg-muted/50 min-w-[100px]">
            <span className="text-lg font-bold">{formatCurrency(totalRevenue)}</span>
            <span className="text-xs text-muted-foreground">Toplam Gelir</span>
          </div>
          <div className="flex flex-col items-center px-4 py-2 rounded-lg bg-muted/50 min-w-[100px]">
            <span className="text-lg font-bold">{formatCurrency(totalCost)}</span>
            <span className="text-xs text-muted-foreground">Toplam Gider</span>
          </div>
          <div className={`flex flex-col items-center px-4 py-2 rounded-lg min-w-[100px] ${totalProfit >= 0 ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
            <span className={`text-lg font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(totalProfit)}</span>
            <span className="text-xs text-muted-foreground">Net Kâr</span>
          </div>
          <div className="flex flex-col items-center px-4 py-2 rounded-lg bg-muted/50 min-w-[80px]">
            <span className="text-lg font-bold">{(financials || []).length}</span>
            <span className="text-xs text-muted-foreground">Şube</span>
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : sorted.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">Bu dönem için finansal veri yok</p>
            <p className="text-xs text-muted-foreground mt-1">"Hesapla" butonuna basarak verileri oluşturun</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sorted.map((f) => {
            const profit = Number(f.netProfit || 0);
            const cost = Number(f.totalCost || 0);
            const revenue = Number(f.revenueTotal || 0);
            return (
              <Card key={f.branchId} data-testid={`financial-card-${f.branchId}`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium text-sm truncate">{f.branchName}</span>
                      <Badge variant="outline" className="text-xs">{f.staffCount} kişi</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      {revenue > 0 && (
                        <span className="text-green-600 font-medium">{formatCurrency(revenue)}</span>
                      )}
                      <span className="text-muted-foreground">{formatCurrency(cost)}</span>
                      {revenue > 0 && (
                        <span className={`font-semibold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {profit >= 0 ? <TrendingUp className="h-3 w-3 inline mr-0.5" /> : <TrendingDown className="h-3 w-3 inline mr-0.5" />}
                          {formatCurrency(profit)}
                        </span>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditBranch(f);
                          setEditValues({
                            revenueTotal: f.revenueTotal || "0",
                            costRent: f.costRent || "0",
                            costUtilities: f.costUtilities || "0",
                            costOther: f.costOther || "0",
                            costMaintenance: f.costMaintenance || "0",
                          });
                        }}
                        data-testid={`button-edit-${f.branchId}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                    {Number(f.costPayroll) > 0 && <span>Personel: {formatCurrency(f.costPayroll)}</span>}
                    {Number(f.costSupplies) > 0 && <span>Hammadde: {formatCurrency(f.costSupplies)}</span>}
                    {Number(f.costRent) > 0 && <span>Kira: {formatCurrency(f.costRent)}</span>}
                    {Number(f.costMaintenance) > 0 && <span>Bakım: {formatCurrency(f.costMaintenance)}</span>}
                    {Number(f.costPerEmployee) > 0 && <span>Kişi başı: {formatCurrency(f.costPerEmployee)}</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editBranch} onOpenChange={(o) => !o && setEditBranch(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editBranch?.branchName} — Manuel Veri Girişi</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {[
              { key: "revenueTotal", label: "Gelir (TL)" },
              { key: "costRent", label: "Kira (TL)" },
              { key: "costUtilities", label: "Faturalar (TL)" },
              { key: "costOther", label: "Diğer Gider (TL)" },
              { key: "costMaintenance", label: "Bakım (TL)" },
            ].map((field) => (
              <div key={field.key}>
                <label className="text-sm text-muted-foreground">{field.label}</label>
                <Input
                  type="number"
                  value={editValues[field.key] || "0"}
                  onChange={(e) => setEditValues({ ...editValues, [field.key]: e.target.value })}
                  data-testid={`input-${field.key}`}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              data-testid="button-save-financial"
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
