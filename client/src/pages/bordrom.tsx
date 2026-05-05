import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { Banknote, CalendarDays, Clock, UserX, AlertCircle, Calculator, ArrowRight, Info, Download, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const MONTHS = [
  { value: "1", label: "Ocak" }, { value: "2", label: "Şubat" }, { value: "3", label: "Mart" },
  { value: "4", label: "Nisan" }, { value: "5", label: "Mayıs" }, { value: "6", label: "Haziran" },
  { value: "7", label: "Temmuz" }, { value: "8", label: "Ağustos" }, { value: "9", label: "Eylül" },
  { value: "10", label: "Ekim" }, { value: "11", label: "Kasım" }, { value: "12", label: "Aralık" },
];

// Sprint 6 (5 May 2026 - Mahmut feedback): HQ rolleri Maaş Hesaplama sayfasına yönlendirilmeli
// Bordrom = personel için kişisel görünüm
// /maas = HQ/admin için toplu hesaplama
const HQ_PAYROLL_ROLES = ['admin', 'ceo', 'cgo', 'muhasebe_ik', 'muhasebe'];

function formatCurrency(kurus: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(kurus / 100);
}

export default function BordromPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1));
  const [selectedYear] = useState(String(now.getFullYear()));
  const [downloading, setDownloading] = useState(false);

  const isHQPayrollRole = user && HQ_PAYROLL_ROLES.includes(user.role);

  const payrollQuery = useQuery<any[], Error>({
    queryKey: ['/api/pdks-payroll/my', selectedYear, selectedMonth],
    queryFn: async () => {
      const res = await fetch(`/api/pdks-payroll/my?year=${selectedYear}&month=${selectedMonth}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  // İK Redesign Faz 3: Son 12 ay bordro geçmişi (grafik için)
  const historyQuery = useQuery<{
    list: Array<{ year: number; month: number; netPay: number; workedDays: number; status: string }>;
    summary: { count: number; avgNet: number; lastMonth: any };
  }, Error>({
    queryKey: ['/api/me/payroll-history', 12],
    queryFn: async () => {
      const res = await fetch('/api/me/payroll-history?limit=12', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const payroll = payrollQuery.data?.[0];

  // PDF indirme
  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const url = `/api/me/payroll/${selectedYear}/${selectedMonth}/pdf`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'PDF üretilemedi');
      }
      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `bordro-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(downloadUrl);
      toast({ title: "✅ PDF indirildi" });
    } catch (err: any) {
      toast({
        title: "PDF indirilemedi",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" data-testid="text-bordrom-title">Bordrom</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Bu sayfa kişisel bordronuzu gösterir. Bordro hesaplaması her ayın sonunda HQ tarafından yapılır.
          </p>
        </div>
        {isHQPayrollRole && (
          <Button
            variant="default"
            size="sm"
            onClick={() => setLocation('/maas')}
            data-testid="button-go-to-maas"
            className="shrink-0"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Toplu Maaş Hesaplama
            <ArrowRight className="h-3 w-3 ml-2" />
          </Button>
        )}
      </div>

      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
        <SelectTrigger className="w-36" data-testid="select-bordrom-month">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map(m => (
            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {payrollQuery.isError ? (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold">Bir hata oluştu</h3>
          <p className="text-muted-foreground mt-2">Veriler yüklenirken sorun oluştu.</p>
          <Button onClick={() => payrollQuery.refetch()} className="mt-4" data-testid="button-retry">Tekrar Dene</Button>
        </div>
      ) : payrollQuery.isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Yükleniyor...</div>
      ) : !payroll ? (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <Info className="h-12 w-12 text-blue-500 mx-auto opacity-70" />
            <div className="text-base font-medium">
              {MONTHS[Number(selectedMonth) - 1]?.label} {selectedYear} bordrosu henüz hazırlanmadı
            </div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {isHQPayrollRole 
                ? "Yönetici hesabıyla giriş yaptınız. Toplu hesaplama için 'Maaş Hesaplama' sayfasına geçin." 
                : "Bordrolar her ay sonunda hazırlanıp paylaşılır. Sorularınız için yöneticinize danışın."}
            </p>
            {isHQPayrollRole && (
              <Button
                onClick={() => setLocation('/maas')}
                className="mt-2"
                data-testid="button-empty-go-to-maas"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Maaş Hesaplama Sayfası
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">{MONTHS[Number(selectedMonth) - 1]?.label} {selectedYear}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Çalışılan Gün</div>
                  <div className="font-bold" data-testid="text-my-worked">{payroll.workedDays}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Off Gün</div>
                  <div className="font-bold" data-testid="text-my-off">{payroll.offDays}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
                <UserX className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Eksik Gün</div>
                  <div className="font-bold" data-testid="text-my-absent">{payroll.absentDays}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">FM</div>
                  <div className="font-bold" data-testid="text-my-overtime">{payroll.overtimeMinutes} dk</div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-muted-foreground" />
                <span className="text-lg font-bold">NET ÖDEME</span>
              </div>
              <span className="text-2xl font-bold" data-testid="text-my-net">{formatCurrency(payroll.netPay)}</span>
            </div>

            {/* İK Redesign Faz 3: PDF indirme */}
            <div className="flex justify-end pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadPDF}
                disabled={downloading}
                data-testid="button-download-pdf"
              >
                <Download className="h-4 w-4 mr-2" />
                {downloading ? 'İndiriliyor…' : 'Detaylı Bordro PDF'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* İK Redesign Faz 3: Son 12 ay bordro geçmişi */}
      {historyQuery.data && historyQuery.data.list.length > 0 && (
        <Card data-testid="card-payroll-history">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <History className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Bordro Geçmişim ({historyQuery.data.summary.count} ay)</h2>
              {historyQuery.data.summary.avgNet > 0 && (
                <span className="text-xs text-muted-foreground ml-auto">
                  Ortalama net: {formatCurrency(historyQuery.data.summary.avgNet)}
                </span>
              )}
            </div>
            <div className="space-y-1">
              {historyQuery.data.list.map(h => (
                <button
                  key={`${h.year}-${h.month}`}
                  onClick={() => setSelectedMonth(String(h.month))}
                  className="w-full flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-muted/50 transition-colors"
                  data-testid={`button-history-${h.year}-${h.month}`}
                >
                  <span className="text-muted-foreground">
                    {MONTHS[h.month - 1]?.label} {h.year}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {h.workedDays} gün
                  </span>
                  <span className="font-medium">{formatCurrency(h.netPay)}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
