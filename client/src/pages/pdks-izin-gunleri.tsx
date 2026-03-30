import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { CalendarDays, Plus, Trash2, Users, Calendar, BarChart3 } from "lucide-react";

const MONTHS = [
  { value: "1", label: "Ocak" }, { value: "2", label: "Şubat" }, { value: "3", label: "Mart" },
  { value: "4", label: "Nisan" }, { value: "5", label: "Mayıs" }, { value: "6", label: "Haziran" },
  { value: "7", label: "Temmuz" }, { value: "8", label: "Ağustos" }, { value: "9", label: "Eylül" },
  { value: "10", label: "Ekim" }, { value: "11", label: "Kasım" }, { value: "12", label: "Aralık" },
];

const DAY_NAMES_FULL = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const DAY_NAMES = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

interface ScheduledOff {
  id: number;
  userId: string;
  branchId: number | null;
  offDate: string;
  offType: string;
  createdAt: string;
}

interface BranchItem {
  id: number;
  name: string;
}

interface UserItem {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  branchId: number;
}

interface WeeklySummary {
  id: number;
  userId: string;
  weekStartDate: string;
  weekEndDate: string;
  plannedTotalMinutes: number;
  actualTotalMinutes: number;
  overtimeMinutes: number;
  missingMinutes: number;
  workDaysCount: number;
  absentDaysCount: number;
  weeklyComplianceScore: number;
}

function formatMinutes(minutes: number): string {
  if (!minutes) return "0s 0dk";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}dk`;
  return `${h}s ${m}dk`;
}

export default function PdksIzinGunleri() {
  const { user } = useAuth();
  const { toast } = useToast();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [bulkMode, setBulkMode] = useState(false);

  const canManage = ['admin', 'ceo', 'cgo', 'muhasebe_ik', 'muhasebe'].includes(user?.role || '');

  const branchesQuery = useQuery<BranchItem[]>({
    queryKey: ['/api/branches'],
    staleTime: 300000,
    enabled: canManage,
  });

  const usersQuery = useQuery<UserItem[]>({
    queryKey: ['/api/admin/users'],
    enabled: canManage,
  });

  const filteredUsers = (usersQuery.data || []).filter(u => {
    if (selectedBranchId && selectedBranchId !== 'all' && u.branchId !== Number(selectedBranchId)) return false;
    if (u.role === 'sube_kiosk') return false;
    return true;
  });

  const offsQuery = useQuery<ScheduledOff[]>({
    queryKey: ['/api/pdks/scheduled-offs', selectedUserId, selectedMonth, selectedYear],
    queryFn: async () => {
      if (!selectedUserId) return [];
      const res = await fetch(`/api/pdks/scheduled-offs?userId=${selectedUserId}&month=${selectedMonth}&year=${selectedYear}`, { credentials: 'include' });
      if (!res.ok) {
        const err = await res.text().catch(() => 'Bilinmeyen hata');
        throw new Error(`İzin günleri yüklenemedi: ${err}`);
      }
      return res.json();
    },
    enabled: !!selectedUserId,
  });

  const createOffsMutation = useMutation({
    mutationFn: async (offs: { userId: string; branchId: number | null; offDate: string; offType: string }[]) => {
      const res = await apiRequest('POST', '/api/pdks/scheduled-offs', { offs });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Başarılı", description: `${data.inserted} izin günü oluşturuldu.` });
      queryClient.invalidateQueries({ queryKey: ['/api/pdks/scheduled-offs'] });
      setSelectedDays([]);
    },
    onError: () => {
      toast({ title: "Hata", description: "İzin günleri oluşturulamadı.", variant: "destructive" });
    },
  });

  const deleteOffMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/pdks/scheduled-offs/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Silindi", description: "İzin günü silindi." });
      queryClient.invalidateQueries({ queryKey: ['/api/pdks/scheduled-offs'] });
    },
  });

  const month = Number(selectedMonth);
  const year = Number(selectedYear);
  const daysInMonth = new Date(year, month, 0).getDate();
  const offDatesSet = new Set((offsQuery.data || []).map(o => o.offDate));

  const calendarDays = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isOff = offDatesSet.has(dateStr);
    calendarDays.push({ day: d, dateStr, dayOfWeek, isWeekend, isOff, dayName: DAY_NAMES[dayOfWeek] });
  }

  const handleDayToggle = (day: number) => {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleBulkWeekend = () => {
    const weekendDays = calendarDays.filter(d => d.isWeekend && !d.isOff).map(d => d.day);
    setSelectedDays(weekendDays);
  };

  const handleSaveOffs = () => {
    if (!selectedUserId || selectedDays.length === 0) return;
    const selectedUser = filteredUsers.find(u => u.id === selectedUserId);
    const offs = selectedDays.map(day => ({
      userId: selectedUserId,
      branchId: selectedUser?.branchId || null,
      offDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      offType: 'program_off',
    }));
    createOffsMutation.mutate(offs);
  };

  if (!canManage) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Bu sayfaya erişim yetkiniz bulunmamaktadır.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4" data-testid="page-pdks-izin-gunleri">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold flex items-center gap-2" data-testid="text-page-title">
          <CalendarDays className="h-5 w-5" />
          İzin Günleri Yönetimi
        </h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-base">Filtreler</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Şube</label>
              <Select value={selectedBranchId} onValueChange={(v) => { setSelectedBranchId(v); setSelectedUserId(""); }}>
                <SelectTrigger data-testid="select-branch">
                  <SelectValue placeholder="Tüm Şubeler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Şubeler</SelectItem>
                  {(branchesQuery.data || []).filter(b => (b as any).isActive !== false).map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Personel</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger data-testid="select-user">
                  <SelectValue placeholder="Personel Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {filteredUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.id} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Ay</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger data-testid="select-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Yıl</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger data-testid="select-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2027">2027</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedUserId && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear} Takvimi
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkWeekend}
                  data-testid="button-bulk-weekend"
                >
                  Hafta Sonlarını Seç
                </Button>
                {selectedDays.length > 0 && (
                  <Button
                    size="sm"
                    onClick={handleSaveOffs}
                    disabled={createOffsMutation.isPending}
                    data-testid="button-save-offs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {selectedDays.length} Gün Kaydet
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAY_NAMES.map(d => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: new Date(year, month - 1, 1).getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {calendarDays.map(d => {
                  const isSelected = selectedDays.includes(d.day);
                  return (
                    <button
                      key={d.day}
                      onClick={() => !d.isOff && handleDayToggle(d.day)}
                      disabled={d.isOff}
                      className={`
                        relative p-2 rounded-md text-sm text-center transition-colors
                        ${d.isOff
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 cursor-default'
                          : isSelected
                            ? 'bg-primary text-primary-foreground'
                            : d.isWeekend
                              ? 'bg-muted/50 dark:bg-muted/20 hover-elevate'
                              : 'hover-elevate'
                        }
                      `}
                      data-testid={`calendar-day-${d.day}`}
                    >
                      <span className="font-medium">{d.day}</span>
                      {d.isOff && (
                        <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-3 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-blue-100 dark:bg-blue-900/30 border border-blue-300" /> Off (Kayıtlı)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-primary" /> Seçili
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-muted/50 border" /> Hafta Sonu
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-base">Kayıtlı Off Günleri ({(offsQuery.data || []).length})</CardTitle>
            </CardHeader>
            <CardContent>
              {offsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Yükleniyor...</p>
              ) : offsQuery.isError ? (
                <p className="text-sm text-destructive">Hata: {offsQuery.error?.message || 'İzin günleri yüklenemedi'}</p>
              ) : (offsQuery.data || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Bu ay için kayıtlı off günü bulunamadı.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(offsQuery.data || []).sort((a, b) => a.offDate.localeCompare(b.offDate)).map(off => {
                    const date = new Date(off.offDate + 'T00:00:00');
                    const dayName = DAY_NAMES_FULL[date.getDay()];
                    return (
                      <Badge
                        key={off.id}
                        variant="secondary"
                        className="flex items-center gap-1 py-1"
                      >
                        {off.offDate.split('-')[2]} {dayName}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-1 p-0"
                          onClick={() => deleteOffMutation.mutate(off.id)}
                          data-testid={`button-delete-off-${off.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
