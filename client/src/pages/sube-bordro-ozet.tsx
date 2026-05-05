import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Clock, TrendingUp, DollarSign, AlertTriangle } from "lucide-react";

// Sprint 8 (5 May 2026) #F: HQ rolleri için branch seçici
const HQ_ROLES_WITH_BRANCH_ACCESS = ['admin', 'ceo', 'cgo', 'coach', 'trainer', 'muhasebe', 'muhasebe_ik'];

export default function SubeBordroOzet() {
  const { user } = useAuth();
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  // Sprint 8 #F: HQ kullanıcılar branch seçer; diğerleri kendi şubelerini görür
  const isHQRole = user?.role && HQ_ROLES_WITH_BRANCH_ACCESS.includes(user.role);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  
  const branchId = isHQRole ? selectedBranchId : (user?.branchId ?? null);

  // HQ rolleri için tüm aktif şubeleri çek
  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ["/api/branches"],
    enabled: !!isHQRole,
    staleTime: 600000,
  });

  // İlk açılışta default branch'i seç (HQ için)
  useEffect(() => {
    if (isHQRole && branches.length > 0 && !selectedBranchId) {
      // managed_branches'te HQ + Fabrika + Işıklar varsa onları öncele
      const managed = branches.filter((b: any) => [5, 23, 24].includes(b.id) && b.isActive);
      const firstActive = managed[0] || branches.find((b: any) => b.isActive);
      if (firstActive) setSelectedBranchId(firstActive.id);
    }
  }, [isHQRole, branches, selectedBranchId]);

  const { data: employees = [], isLoading: empLoading } = useQuery<any[]>({
    queryKey: ["/api/employees", branchId],
    staleTime: 600000,
    queryFn: async () => {
      const res = await fetch(`/api/employees?branchId=${branchId}&isActive=true`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!branchId,
  });

  const { data: payrollRecords = [] } = useQuery<any[]>({
    queryKey: ["/api/payroll/records", selectedYear, selectedMonth, branchId],
    queryFn: async () => {
      const res = await fetch(`/api/payroll/records?year=${selectedYear}&month=${selectedMonth}`, { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data.records || []);
    },
    enabled: !!branchId,
  });

  const { data: weeklyStats = [] } = useQuery<any[]>({
    queryKey: ["/api/shifts/weekly-summary", branchId, selectedYear, selectedMonth],
    queryFn: async () => {
      const res = await fetch(`/api/shifts?branchId=${branchId}&month=${selectedYear}-${String(selectedMonth).padStart(2, "0")}`, { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      const shiftsArr = Array.isArray(data) ? data : (data.shifts || []);
      // Personel bazlı saat toplamı
      const byUser: Record<string, { name: string; totalMins: number; overtimeMins: number; shiftCount: number; employmentType: string; weeklyHours: number }> = {};
      for (const s of shiftsArr) {
        if (!s.assignedToId || !s.startTime || !s.endTime) continue;
        const [sh, sm] = s.startTime.split(":").map(Number);
        const [eh, em] = s.endTime.split(":").map(Number);
        let mins = (eh * 60 + em) - (sh * 60 + sm);
        if (mins < 0) mins += 24 * 60;
        const emp = employees.find((e: any) => e.id === s.assignedToId || String(e.id) === s.assignedToId);
        if (!byUser[s.assignedToId]) {
          byUser[s.assignedToId] = {
            name: emp ? `${emp.firstName} ${emp.lastName}` : s.assignedToId,
            totalMins: 0, overtimeMins: 0, shiftCount: 0,
            employmentType: emp?.employmentType || "fulltime",
            weeklyHours: emp?.weeklyHours || 45,
          };
        }
        byUser[s.assignedToId].totalMins += mins;
        byUser[s.assignedToId].shiftCount += 1;
      }
      // Mesai hesabı: aylık limit = weeklyHours * 4
      for (const v of Object.values(byUser)) {
        const monthlyLimitMins = v.weeklyHours * 4 * 60;
        v.overtimeMins = Math.max(0, v.totalMins - monthlyLimitMins);
      }
      return Object.values(byUser).sort((a, b) => b.totalMins - a.totalMins);
    },
    enabled: !!branchId && employees.length > 0,
  });

  const months = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];

  // Sprint 8 #F: HQ rolü için branch seçici göster, branch role için yetki kontrolü
  if (isHQRole && !selectedBranchId) {
    return (
      <div className="space-y-4 p-4 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Şube Bordro Özeti</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Bordro özetini görmek için şube seçin:
            </p>
            <Select 
              value={selectedBranchId ? String(selectedBranchId) : ''} 
              onValueChange={(v) => setSelectedBranchId(Number(v))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Şube seçin..." />
              </SelectTrigger>
              <SelectContent>
                {branches.filter((b: any) => b.isActive).map((b: any) => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!branchId) return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <p className="text-sm text-muted-foreground">Bu sayfayı görüntülemek için şube erişiminiz olmalı.</p>
    </div>
  );

  const totalNetPayroll = payrollRecords.reduce((s: number, r: any) => s + (r.netSalary || 0), 0);
  const totalOvertimeMins = weeklyStats.reduce((s, r) => s + r.overtimeMins, 0);
  const approvedCount = payrollRecords.filter((r: any) => r.status === "approved").length;

  return (
    <div className="space-y-4 p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold">Şube Bordro Özeti</h1>
          <p className="text-sm text-muted-foreground">
            {isHQRole && selectedBranchId 
              ? `${branches.find((b: any) => b.id === selectedBranchId)?.name || 'Şube'} · Personel bazlı çalışma saati ve bordro durumu`
              : 'Personel bazlı çalışma saati ve bordro durumu'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Sprint 8 #F: HQ rolü için branch dropdown */}
          {isHQRole && (
            <Select 
              value={selectedBranchId ? String(selectedBranchId) : ''} 
              onValueChange={(v) => setSelectedBranchId(Number(v))}
            >
              <SelectTrigger className="w-40 text-xs" data-testid="select-branch">
                <SelectValue placeholder="Şube..." />
              </SelectTrigger>
              <SelectContent>
                {branches.filter((b: any) => b.isActive).map((b: any) => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m, i) => (
                <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Özet kartlar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Personel</span>
            </div>
            <p className="text-2xl font-bold">{employees.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Fazla Mesai</span>
            </div>
            <p className="text-2xl font-bold">{(totalOvertimeMins / 60).toFixed(1)}<span className="text-sm font-normal text-muted-foreground ml-1">sa</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Onaylanan</span>
            </div>
            <p className="text-2xl font-bold">{approvedCount}<span className="text-sm font-normal text-muted-foreground ml-1">/{payrollRecords.length}</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Toplam Net</span>
            </div>
            <p className="text-lg font-bold">{totalNetPayroll > 0 ? (totalNetPayroll / 100).toLocaleString("tr-TR") + " ₺" : "—"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Personel tablosu */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm">Personel Çalışma Saatleri — {months[selectedMonth - 1]} {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {weeklyStats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Bu ay için vardiya verisi bulunamadı.</p>
          ) : (
            <div className="space-y-2">
              {weeklyStats.map((stat, i) => {
                const totalHours = stat.totalMins / 60;
                const overtimeHours = stat.overtimeMins / 60;
                const monthlyLimit = (stat.weeklyHours * 4);
                const pct = Math.min(100, Math.round((totalHours / monthlyLimit) * 100));
                const payroll = payrollRecords.find((r: any) => r.employeeId === stat.userId || r.userId === stat.userId);
                return (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {stat.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium truncate">{stat.name}</span>
                        <Badge variant="outline" className="text-xs px-1.5 py-0">{stat.employmentType === "parttime" ? "Yarı" : "Tam"}</Badge>
                        {overtimeHours > 0 && (
                          <Badge className="text-xs px-1.5 py-0 bg-amber-500/15 text-amber-600 border-amber-500/30">+{overtimeHours.toFixed(1)}sa mesai</Badge>
                        )}
                        {payroll && (
                          <Badge className={`text-xs px-1.5 py-0 ${payroll.status === "approved" ? "bg-green-500/15 text-green-600 border-green-500/30" : "bg-muted text-muted-foreground"}`}>
                            {payroll.status === "approved" ? "✓ Onaylı" : "Taslak"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct > 100 ? "#ef4444" : pct > 90 ? "#f59e0b" : "#22c55e" }} />
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{totalHours.toFixed(1)}/{monthlyLimit}sa</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-muted-foreground">{stat.shiftCount} vardiya</p>
                      {payroll?.netSalary && (
                        <p className="text-xs font-medium">{(payroll.netSalary / 100).toLocaleString("tr-TR")} ₺</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
