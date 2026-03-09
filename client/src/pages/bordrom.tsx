import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { Banknote, CalendarDays, Clock, UserX, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const MONTHS = [
  { value: "1", label: "Ocak" }, { value: "2", label: "Şubat" }, { value: "3", label: "Mart" },
  { value: "4", label: "Nisan" }, { value: "5", label: "Mayıs" }, { value: "6", label: "Haziran" },
  { value: "7", label: "Temmuz" }, { value: "8", label: "Ağustos" }, { value: "9", label: "Eylül" },
  { value: "10", label: "Ekim" }, { value: "11", label: "Kasım" }, { value: "12", label: "Aralık" },
];

function formatCurrency(kurus: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(kurus / 100);
}

export default function BordromPage() {
  const { user } = useAuth();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1));
  const [selectedYear] = useState(String(now.getFullYear()));

  const payrollQuery = useQuery<any[], Error>({
    queryKey: ['/api/pdks-payroll/my', selectedYear, selectedMonth],
    queryFn: async () => {
      const res = await fetch(`/api/pdks-payroll/my?year=${selectedYear}&month=${selectedMonth}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const payroll = payrollQuery.data?.[0];

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h1 className="text-xl font-bold" data-testid="text-bordrom-title">Bordrom</h1>

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
          <CardContent className="p-8 text-center text-muted-foreground">
            {MONTHS[Number(selectedMonth) - 1]?.label} {selectedYear} dönemi için bordro henüz hesaplanmadı.
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
