import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Calculator, CheckCircle2, FileSpreadsheet, ChevronLeft } from "lucide-react";

const MONTHS = [
  { value: "1", label: "Ocak" }, { value: "2", label: "Şubat" }, { value: "3", label: "Mart" },
  { value: "4", label: "Nisan" }, { value: "5", label: "Mayıs" }, { value: "6", label: "Haziran" },
  { value: "7", label: "Temmuz" }, { value: "8", label: "Ağustos" }, { value: "9", label: "Eylül" },
  { value: "10", label: "Ekim" }, { value: "11", label: "Kasım" }, { value: "12", label: "Aralık" },
];

const POSITION_LABELS: Record<string, string> = {
  stajyer: "Stajyer",
  bar_buddy: "Bar Buddy",
  barista: "Barista",
  supervisor_buddy: "Sup. Buddy",
  supervisor: "Supervisor",
};

function formatCurrency(kurus: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(kurus / 100);
}

export default function MaasPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const now = new Date();
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1));
  const [selectedYear] = useState(String(now.getFullYear()));
  const [selectedPayroll, setSelectedPayroll] = useState<any>(null);

  const canAdmin = user && ['admin', 'ceo', 'cgo', 'muhasebe_ik', 'muhasebe'].includes(user.role);
  const isSupervisor = user?.role === 'supervisor';
  const isInvestor = user && ['yatirimci_branch', 'yatirimci_hq'].includes(user.role);

  const branchesQuery = useQuery<{ id: number; name: string }[]>({
    queryKey: ['/api/pdks-payroll/branches'],
  });

  useEffect(() => {
    if (branchesQuery.data?.length && !selectedBranch) {
      if (user?.branchId) {
        setSelectedBranch(String(user.branchId));
      } else {
        setSelectedBranch(String(branchesQuery.data[0].id));
      }
    }
  }, [branchesQuery.data, user]);

  const summaryQuery = useQuery<any[]>({
    queryKey: ['/api/pdks-payroll/summary', selectedBranch, selectedYear, selectedMonth],
    queryFn: async () => {
      const res = await fetch(`/api/pdks-payroll/summary?branchId=${selectedBranch}&year=${selectedYear}&month=${selectedMonth}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!selectedBranch,
  });

  const calculateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/pdks-payroll/calculate', {
        branchId: Number(selectedBranch),
        year: Number(selectedYear),
        month: Number(selectedMonth),
      });
    },
    onSuccess: () => {
      toast({ title: "Maaş hesaplandı" });
      queryClient.invalidateQueries({ queryKey: ['/api/pdks-payroll/summary'] });
    },
    onError: () => {
      toast({ title: "Hata", description: "Hesaplama başarısız", variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('PATCH', `/api/pdks-payroll/${id}/approve`, {});
    },
    onSuccess: () => {
      toast({ title: "Bordro onaylandı" });
      queryClient.invalidateQueries({ queryKey: ['/api/pdks-payroll/summary'] });
    },
    onError: () => {
      toast({ title: "Hata", description: "Onay başarısız", variant: "destructive" });
    },
  });

  const detailQuery = useQuery<any>({
    queryKey: ['/api/pdks-payroll', selectedPayroll?.userId, selectedYear, selectedMonth],
    queryFn: async () => {
      const res = await fetch(`/api/pdks-payroll/${selectedPayroll.userId}?year=${selectedYear}&month=${selectedMonth}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!selectedPayroll?.userId,
  });

  const handleExcelExport = async () => {
    try {
      const res = await fetch(`/api/pdks-payroll/summary?branchId=${selectedBranch}&year=${selectedYear}&month=${selectedMonth}`, { credentials: 'include' });
      const data = await res.json();
      if (!data.length) {
        toast({ title: "Veri yok", description: "Önce maaş hesaplaması yapın", variant: "destructive" });
        return;
      }

      let csv = "Sıra;Ad Soyad;Pozisyon;Çalışılan;Off;Eksik;Ücretsiz İzin;FM (dk);Rapor;Toplam Maaş;Taban;Prim;Günlük Ücret;Gün Kesintisi;Prim Kesintisi;FM Tutarı;NET\n";
      data.forEach((p: any, i: number) => {
        csv += `${i + 1};${p.userName};${POSITION_LABELS[p.positionCode] || p.positionCode};${p.workedDays};${p.offDays};${p.absentDays};${p.unpaidLeaveDays || 0};${p.overtimeMinutes || 0};${p.sickLeaveDays || 0};${(p.totalSalary / 100).toFixed(0)};${(p.baseSalary / 100).toFixed(0)};${(p.bonus / 100).toFixed(0)};${(p.dailyRate / 100).toFixed(0)};${(p.absenceDeduction / 100).toFixed(0)};${(p.bonusDeduction / 100).toFixed(0)};${(p.overtimePay / 100).toFixed(0)};${(p.netPay / 100).toFixed(0)}\n`;
      });

      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const branchName = branchesQuery.data?.find(b => b.id === Number(selectedBranch))?.name || 'sube';
      a.download = `maas_${branchName}_${selectedYear}_${selectedMonth}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Excel indirildi" });
    } catch (err) {
      toast({ title: "Hata", description: "Excel indirilemedi", variant: "destructive" });
    }
  };

  if (selectedPayroll && detailQuery.data) {
    const p = detailQuery.data.payroll;
    return (
      <div className="p-4 max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => setSelectedPayroll(null)} data-testid="button-back-to-maas">
            <ChevronLeft />
          </Button>
          <h2 className="text-lg font-semibold" data-testid="text-payroll-detail-title">
            {selectedPayroll.userName} — {MONTHS[Number(selectedMonth) - 1]?.label} {selectedYear} Bordro
          </h2>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Pozisyon</div>
              <div className="font-medium">{POSITION_LABELS[p.positionCode] || p.positionCode}</div>
            </div>

            {!isInvestor && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">Maaş Bilgileri</div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>Toplam: <span className="font-medium">{formatCurrency(p.totalSalary)}</span></div>
                  <div>Taban: <span className="font-medium">{formatCurrency(p.baseSalary)}</span></div>
                  <div>Prim: <span className="font-medium">{formatCurrency(p.bonus)}</span></div>
                </div>
              </div>
            )}

            <div>
              <div className="text-sm text-muted-foreground mb-1">Devam Bilgileri</div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-sm">
                <div>Çalışılan: <span className="font-medium">{p.workedDays}</span></div>
                <div>Off: <span className="font-medium">{p.offDays}</span></div>
                <div>Eksik: <span className="font-medium">{p.absentDays}</span></div>
                <div>Ücr. İzin: <span className="font-medium">{p.unpaidLeaveDays}</span></div>
                <div>Rapor: <span className="font-medium">{p.sickLeaveDays}</span></div>
                <div>FM: <span className="font-medium">{p.overtimeMinutes} dk</span></div>
              </div>
            </div>

            {!isSupervisor && !isInvestor && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">Hesaplama</div>
                <div className="space-y-1 text-sm">
                  <div>Günlük Ücret: {formatCurrency(p.totalSalary)} ÷ 30 = <span className="font-medium">{formatCurrency(p.dailyRate)}</span></div>
                  {p.absenceDeduction > 0 && (
                    <div className="text-destructive">Gün Kesintisi: ({p.absentDays}+1) × {formatCurrency(p.dailyRate)} = <span className="font-medium">{formatCurrency(p.absenceDeduction)}</span></div>
                  )}
                  {p.bonusDeduction > 0 && (
                    <div className="text-destructive">Prim Kesintisi: ({p.unpaidLeaveDays}÷30) × {formatCurrency(p.bonus)} = <span className="font-medium">{formatCurrency(p.bonusDeduction)}</span></div>
                  )}
                  {p.overtimePay > 0 && (
                    <div className="text-green-600 dark:text-green-400">FM Tutarı: ({p.overtimeMinutes}÷60) × ({formatCurrency(p.totalSalary)}÷240) × 1.5 = <span className="font-medium">{formatCurrency(p.overtimePay)}</span></div>
                  )}
                </div>
              </div>
            )}

            <div className="border-t pt-3">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">NET ÖDEME</span>
                <span className="text-2xl font-bold" data-testid="text-net-pay">{formatCurrency(p.netPay)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totals = summaryQuery.data?.reduce((acc: any, p: any) => ({
    totalSalary: (acc.totalSalary || 0) + (p.totalSalary || 0),
    absenceDeduction: (acc.absenceDeduction || 0) + (p.absenceDeduction || 0),
    bonusDeduction: (acc.bonusDeduction || 0) + (p.bonusDeduction || 0),
    overtimePay: (acc.overtimePay || 0) + (p.overtimePay || 0),
    netPay: (acc.netPay || 0) + (p.netPay || 0),
  }), {});

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold" data-testid="text-maas-title">Maaş Hesaplama — {MONTHS[Number(selectedMonth) - 1]?.label} {selectedYear}</h1>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
          <SelectTrigger className="w-48" data-testid="select-maas-branch">
            <SelectValue placeholder="Şube seçin" />
          </SelectTrigger>
          <SelectContent>
            {branchesQuery.data?.map(b => (
              <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-36" data-testid="select-maas-month">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map(m => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canAdmin && (
          <div className="flex gap-2 ml-auto flex-wrap">
            <Button onClick={() => calculateMutation.mutate()} disabled={calculateMutation.isPending} data-testid="button-calculate">
              <Calculator className="h-4 w-4 mr-1" />
              {calculateMutation.isPending ? "Hesaplanıyor..." : "Hesapla"}
            </Button>
            <Button variant="outline" onClick={handleExcelExport} data-testid="button-export-excel">
              <FileSpreadsheet className="h-4 w-4 mr-1" />
              Excel
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {summaryQuery.isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Yükleniyor...</div>
          ) : !summaryQuery.data?.length ? (
            <div className="p-8 text-center text-muted-foreground">
              {canAdmin ? "Henüz hesaplama yapılmadı. Önce 'Hesapla' butonuna tıklayın." : "Bu dönemde bordro bulunmuyor."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Personel</th>
                    <th className="text-center p-3 font-medium">Pozisyon</th>
                    {!isSupervisor && <th className="text-right p-3 font-medium">Maaş</th>}
                    {!isSupervisor && !isInvestor && <th className="text-right p-3 font-medium">Kesinti</th>}
                    {!isSupervisor && !isInvestor && <th className="text-right p-3 font-medium">FM</th>}
                    <th className="text-right p-3 font-medium">NET</th>
                    {canAdmin && <th className="text-center p-3 font-medium">Durum</th>}
                  </tr>
                </thead>
                <tbody>
                  {summaryQuery.data.map((p: any) => (
                    <tr
                      key={p.userId}
                      className="border-b hover-elevate cursor-pointer"
                      onClick={() => setSelectedPayroll(p)}
                      data-testid={`row-payroll-${p.userId}`}
                    >
                      <td className="p-3 font-medium">{p.userName}</td>
                      <td className="text-center p-3">{POSITION_LABELS[p.positionCode] || p.positionCode}</td>
                      {!isSupervisor && <td className="text-right p-3">{formatCurrency(p.totalSalary || 0)}</td>}
                      {!isSupervisor && !isInvestor && (
                        <td className="text-right p-3">
                          {((p.absenceDeduction || 0) + (p.bonusDeduction || 0)) > 0 ? (
                            <span className="text-destructive">{formatCurrency((p.absenceDeduction || 0) + (p.bonusDeduction || 0))}</span>
                          ) : "0"}
                        </td>
                      )}
                      {!isSupervisor && !isInvestor && (
                        <td className="text-right p-3">
                          {(p.overtimePay || 0) > 0 ? <span className="text-green-600 dark:text-green-400">{formatCurrency(p.overtimePay)}</span> : "0"}
                        </td>
                      )}
                      <td className="text-right p-3 font-bold">{formatCurrency(p.netPay || 0)}</td>
                      {canAdmin && (
                        <td className="text-center p-3">
                          {p.status === 'approved' ? (
                            <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Onaylı</Badge>
                          ) : p.status === 'calculated' ? (
                            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); approveMutation.mutate(p.id); }} data-testid={`button-approve-${p.userId}`}>
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Onayla
                            </Button>
                          ) : (
                            <Badge variant="outline">Taslak</Badge>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                {!isSupervisor && totals && (
                  <tfoot>
                    <tr className="border-t-2 bg-muted/30 font-bold">
                      <td className="p-3" colSpan={2}>TOPLAM</td>
                      <td className="text-right p-3">{formatCurrency(totals.totalSalary || 0)}</td>
                      {!isInvestor && (
                        <td className="text-right p-3 text-destructive">{formatCurrency((totals.absenceDeduction || 0) + (totals.bonusDeduction || 0))}</td>
                      )}
                      {!isInvestor && (
                        <td className="text-right p-3 text-green-600 dark:text-green-400">{formatCurrency(totals.overtimePay || 0)}</td>
                      )}
                      <td className="text-right p-3">{formatCurrency(totals.netPay || 0)}</td>
                      {canAdmin && <td></td>}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
