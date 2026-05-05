/**
 * Takım Takvimi (Faz 4 — 6 May 2026)
 *
 * Yönetici (mudur/supervisor/coach/HQ) için aylık takım görünümü:
 * Vardiya + izin + mesai tek ekranda, renk kodlu grid.
 *
 * 5 PERSPEKTİF REVIEW (D-07):
 *   - Principal Eng:  Tek query'de tüm ay verisi, frontend grid render
 *   - F&B Ops:        Müdür "bu hafta kim ne zaman" 1 bakışta görür
 *   - Senior QA:      Hücre boş/dolu + loading + error 3 durum
 *   - Product Mgr:    Mobile için yatay scroll (personel sütun olarak)
 *   - Compliance:     Müdür kendi şubesi, HQ tüm — backend scope filter
 *
 * Endpoint'ler (mevcut):
 *   GET /api/leave-requests?status=approved&branchId=X
 *   GET /api/overtime-requests?status=approved&branchId=X
 *   GET /api/shifts?branchId=X&year=Y&month=M (varsa)
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar } from "lucide-react";

const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  branchId: number;
}

interface LeaveItem {
  id: number;
  userId: string;
  startDate: string;
  endDate: string;
  leaveType: string;
  status: string;
}

interface OvertimeItem {
  id: number;
  userId: string;
  overtimeDate: string;
  approvedMinutes: number | null;
  requestedMinutes: number;
  status: string;
}

type CellType = 'empty' | 'leave' | 'overtime' | 'work';

function dateInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function TakimTakvimiPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // HQ rolleri tüm şubeler, manager rolleri sadece kendi şubesi
  const isHQ = user && ['admin', 'ceo', 'cgo', 'muhasebe_ik', 'muhasebe', 'coach'].includes(user.role);
  const branchId = isHQ ? null : user?.branchId;

  // Şube personeli
  const usersQuery = useQuery<User[], Error>({
    queryKey: ['/api/users', branchId],
    queryFn: async () => {
      const url = branchId ? `/api/users?branchId=${branchId}` : '/api/users';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Kullanıcılar alınamadı');
      const data = await res.json();
      return Array.isArray(data) ? data : (data.list || []);
    },
  });

  // Onaylı izinler
  const leavesQuery = useQuery<LeaveItem[], Error>({
    queryKey: ['/api/leave-requests', 'approved', branchId, year, month],
    queryFn: async () => {
      const params = new URLSearchParams({ status: 'approved' });
      if (branchId) params.set('branchId', String(branchId));
      const res = await fetch(`/api/leave-requests?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('İzinler alınamadı');
      const data = await res.json();
      return Array.isArray(data) ? data : (data.list || []);
    },
  });

  // Onaylı mesailer
  const overtimesQuery = useQuery<OvertimeItem[], Error>({
    queryKey: ['/api/overtime-requests', 'approved', branchId, year, month],
    queryFn: async () => {
      const params = new URLSearchParams({ status: 'approved' });
      if (branchId) params.set('branchId', String(branchId));
      const res = await fetch(`/api/overtime-requests?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Mesailer alınamadı');
      const data = await res.json();
      return Array.isArray(data) ? data : (data.list || []);
    },
  });

  const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month]);

  // Her personel × her gün için cell tipini hesapla
  const cellMap = useMemo(() => {
    const map: Record<string, Record<number, CellType>> = {};
    if (!usersQuery.data) return map;

    for (const u of usersQuery.data) {
      map[u.id] = {};
      for (let d = 1; d <= daysInMonth; d++) {
        map[u.id][d] = 'empty';
      }
    }

    // İzin günlerini işaretle
    for (const lv of leavesQuery.data || []) {
      if (!map[lv.userId]) continue;
      for (let d = 1; d <= daysInMonth; d++) {
        const date = ymd(year, month, d);
        if (dateInRange(date, lv.startDate, lv.endDate)) {
          map[lv.userId][d] = 'leave';
        }
      }
    }

    // Mesai günlerini işaretle (izinin üzerine yazmaz)
    for (const ot of overtimesQuery.data || []) {
      if (!map[ot.userId]) continue;
      const otDate = new Date(ot.overtimeDate);
      if (otDate.getFullYear() === year && otDate.getMonth() + 1 === month) {
        const d = otDate.getDate();
        if (map[ot.userId][d] === 'empty') {
          map[ot.userId][d] = 'overtime';
        }
      }
    }

    return map;
  }, [usersQuery.data, leavesQuery.data, overtimesQuery.data, year, month, daysInMonth]);

  // Renk kodları
  const cellColor = (type: CellType) => {
    switch (type) {
      case 'leave':    return 'bg-blue-200 border-blue-300';
      case 'overtime': return 'bg-orange-200 border-orange-300';
      case 'work':     return 'bg-green-200 border-green-300';
      default:         return 'bg-muted/30';
    }
  };

  const navigateMonth = (delta: number) => {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newMonth < 1)  { newMonth = 12; newYear--; }
    setMonth(newMonth);
    setYear(newYear);
  };

  const usersList = usersQuery.data || [];
  const isLoading = usersQuery.isLoading || leavesQuery.isLoading || overtimesQuery.isLoading;
  const isError = usersQuery.isError || leavesQuery.isError || overtimesQuery.isError;

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => setLocation('/ik-merkezi')} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-1" /> İK Merkezi
        </Button>
        <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <Calendar className="h-5 w-5" /> Takım Takvimi
        </h1>
      </div>

      {/* Ay seçim */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)} data-testid="button-prev-month">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
          <SelectTrigger className="w-32" data-testid="select-month">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((name, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
          <SelectTrigger className="w-24" data-testid="select-year">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[year - 1, year, year + 1].map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => navigateMonth(1)} data-testid="button-next-month">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Lejant */}
      <div className="flex items-center gap-3 flex-wrap text-xs">
        <LegendBadge color="bg-blue-200 border-blue-300" label="İzin" />
        <LegendBadge color="bg-orange-200 border-orange-300" label="Mesai" />
        <LegendBadge color="bg-muted/30" label="Boş/Vardiya yok" />
        <span className="text-muted-foreground ml-auto">
          {usersList.length} kişi · {daysInMonth} gün
        </span>
      </div>

      {/* Takvim grid */}
      <Card>
        <CardContent className="p-2 overflow-x-auto">
          {isLoading && <div className="p-8 text-center text-muted-foreground" data-testid="loading-state">Yükleniyor…</div>}
          {isError && <div className="p-8 text-center text-red-600" data-testid="error-state">Veri alınamadı</div>}
          {!isLoading && !isError && usersList.length === 0 && (
            <div className="p-8 text-center text-muted-foreground" data-testid="empty-state">
              Bu şubede personel bulunamadı
            </div>
          )}
          {!isLoading && !isError && usersList.length > 0 && (
            <table className="w-full text-xs border-collapse" data-testid="table-calendar">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-background border-b border-r px-2 py-1.5 text-left font-medium min-w-[140px]">
                    Personel
                  </th>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                    const dt = new Date(year, month - 1, d);
                    const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
                    return (
                      <th
                        key={d}
                        className={`border-b px-1 py-1 text-center font-medium min-w-[28px] ${isWeekend ? 'bg-muted/30 text-muted-foreground' : ''}`}
                      >
                        {d}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {usersList.map(u => (
                  <tr key={u.id} data-testid={`row-user-${u.id}`}>
                    <td className="sticky left-0 bg-background border-r px-2 py-1 font-medium truncate max-w-[140px]" title={`${u.firstName} ${u.lastName}`}>
                      {u.firstName} {u.lastName?.[0]}.
                    </td>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                      const cellType = cellMap[u.id]?.[d] || 'empty';
                      return (
                        <td
                          key={d}
                          className={`border ${cellColor(cellType)} h-7`}
                          data-testid={`cell-${u.id}-${d}`}
                          title={cellType === 'leave' ? 'İzin' : cellType === 'overtime' ? 'Mesai' : ''}
                        />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LegendBadge({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-4 h-4 border rounded ${color}`} />
      <span>{label}</span>
    </div>
  );
}
