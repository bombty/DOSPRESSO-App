import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfWeek, addDays, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight, Building, Users, Clock, Eye } from "lucide-react";

function getEmployeeColor(employeeId: string | number): string {
  const colors = [
    'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700',
    'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700',
    'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700',
    'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-700',
    'bg-purple-100 dark:bg-purple-900/40 border-purple-300 dark:border-purple-700',
    'bg-pink-100 dark:bg-pink-900/40 border-pink-300 dark:border-pink-700',
  ];
  const id = String(employeeId);
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash = hash & hash;
  }
  return colors[Math.abs(hash) % colors.length];
}

const DAY_NAMES = ['Pazartesi', 'Sali', 'Carsamba', 'Persembe', 'Cuma', 'Cumartesi', 'Pazar'];
const DAY_NAMES_TR = ['Pazartesi', 'Sal\u0131', '\u00c7ar\u015famba', 'Per\u015fembe', 'Cuma', 'Cumartesi', 'Pazar'];
const DAY_SHORT_TR = ['Pzt', 'Sal', '\u00c7ar', 'Per', 'Cum', 'Cmt', 'Paz'];

export default function HqVardiyaGoruntuleme() {
  const { user } = useAuth();
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const weekEnd = addDays(weekStart, 6);
  const dateFrom = format(weekStart, 'yyyy-MM-dd');
  const dateTo = format(weekEnd, 'yyyy-MM-dd');

  const { data: branches, isLoading: branchesLoading } = useQuery<any[]>({
    queryKey: ['/api/branches'],
  });

  const { data: shifts, isLoading: shiftsLoading } = useQuery<any[]>({
    queryKey: ['/api/shifts', selectedBranchId, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBranchId) params.set('branchId', selectedBranchId);
      params.set('dateFrom', dateFrom);
      params.set('dateTo', dateTo);
      const res = await fetch(`/api/shifts?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Vardiyalar yuklenemedi');
      return res.json();
    },
    enabled: !!selectedBranchId,
  });

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      return {
        date,
        dateStr: format(date, 'yyyy-MM-dd'),
        dayName: DAY_NAMES_TR[i],
        dayShort: DAY_SHORT_TR[i],
        dayNum: format(date, 'd'),
        monthShort: format(date, 'MMM', { locale: tr }),
      };
    });
  }, [weekStart]);

  const shiftsByDate = useMemo(() => {
    const byDate: Record<string, any[]> = {};
    weekDays.forEach(day => {
      byDate[day.dateStr] = [];
    });
    if (shifts && Array.isArray(shifts)) {
      shifts.forEach((shift: any) => {
        const shiftDate = shift.shiftDate || shift.date;
        if (shiftDate && byDate[shiftDate]) {
          byDate[shiftDate].push(shift);
        }
      });
    }
    return byDate;
  }, [shifts, weekDays]);

  const stats = useMemo(() => {
    if (!shifts || !Array.isArray(shifts)) return { totalShifts: 0, totalEmployees: 0, totalHours: 0 };

    const employeeIds = new Set<string>();
    let totalMinutes = 0;

    shifts.forEach((shift: any) => {
      const empId = shift.assignedToId || shift.employee?.id;
      if (empId) employeeIds.add(String(empId));

      if (shift.startTime && shift.endTime) {
        const [sH, sM] = shift.startTime.split(':').map(Number);
        const [eH, eM] = shift.endTime.split(':').map(Number);
        totalMinutes += (eH * 60 + eM) - (sH * 60 + sM);
      }
    });

    return {
      totalShifts: shifts.length,
      totalEmployees: employeeIds.size,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
    };
  }, [shifts]);

  const previousWeek = () => setWeekStart(addDays(weekStart, -7));
  const nextWeek = () => setWeekStart(addDays(weekStart, 7));

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto" data-testid="hq-vardiya-goruntuleme-page">
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 flex-wrap pb-2">
          <Eye className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <CardTitle className="text-lg" data-testid="page-title">HQ Vardiya G{"\u00F6"}r{"\u00FC"}nt{"\u00FC"}leme</CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-[200px]">
              <Building className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Select
                value={selectedBranchId}
                onValueChange={setSelectedBranchId}
              >
                <SelectTrigger className="w-[220px]" data-testid="select-branch">
                  <SelectValue placeholder={branchesLoading ? "Y\u00FCkleniyor..." : "\u015Eube Se\u00E7in"} />
                </SelectTrigger>
                <SelectContent>
                  {branches?.map((branch: any) => (
                    <SelectItem key={branch.id} value={String(branch.id)} data-testid={`branch-option-${branch.id}`}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="icon" onClick={previousWeek} data-testid="button-prev-week">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-1.5 text-sm font-medium" data-testid="week-display">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{format(weekStart, 'd MMM', { locale: tr })} - {format(weekEnd, 'd MMM yyyy', { locale: tr })}</span>
              </div>
              <Button variant="outline" size="icon" onClick={nextWeek} data-testid="button-next-week">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedBranchId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground" data-testid="no-branch-message">
            <Building className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Vardiyalar{"\u0131"} g{"\u00F6"}r{"\u00FC"}nt{"\u00FC"}lemek i{"\u00E7"}in bir {"\u015F"}ube se{"\u00E7"}in</p>
          </CardContent>
        </Card>
      ) : shiftsLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground" data-testid="loading-message">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p>Vardiyalar y{"\u00FC"}kleniyor...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="hidden md:grid grid-cols-7 border-b" data-testid="week-header-desktop">
                {weekDays.map((day, i) => (
                  <div
                    key={day.dateStr}
                    className="p-2 text-center border-r last:border-r-0 bg-muted/30"
                    data-testid={`day-header-${day.dateStr}`}
                  >
                    <div className="text-xs font-medium text-muted-foreground">{day.dayName}</div>
                    <div className="text-sm font-semibold">{day.dayNum} {day.monthShort}</div>
                  </div>
                ))}
              </div>

              <div className="hidden md:grid grid-cols-7" data-testid="week-grid-desktop">
                {weekDays.map((day) => {
                  const dayShifts = shiftsByDate[day.dateStr] || [];
                  return (
                    <div
                      key={day.dateStr}
                      className="min-h-[100px] p-2 border-r last:border-r-0 border-b last:border-b-0 space-y-1"
                      data-testid={`day-cell-${day.dateStr}`}
                    >
                      {dayShifts.length === 0 && (
                        <div className="text-xs text-muted-foreground text-center pt-4">--</div>
                      )}
                      {dayShifts.map((shift: any) => {
                        const empName = shift.employee?.fullName || shift.employee?.firstName || 'Bilinmiyor';
                        const colorClass = getEmployeeColor(shift.assignedToId || shift.employee?.id || 0);
                        return (
                          <div
                            key={shift.id}
                            className={`p-1.5 rounded border text-xs ${colorClass}`}
                            data-testid={`shift-chip-${shift.id}`}
                          >
                            <div className="font-medium truncate">{empName}</div>
                            <div className="opacity-70">
                              {shift.startTime?.substring(0, 5)}-{shift.endTime?.substring(0, 5)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              <div className="md:hidden" data-testid="week-grid-mobile">
                {weekDays.map((day) => {
                  const dayShifts = shiftsByDate[day.dateStr] || [];
                  return (
                    <div key={day.dateStr} className="border-b last:border-b-0" data-testid={`day-mobile-${day.dateStr}`}>
                      <div className="flex items-center gap-2 p-3 bg-muted/30">
                        <span className="text-sm font-medium">{day.dayName}</span>
                        <span className="text-xs text-muted-foreground">{day.dayNum} {day.monthShort}</span>
                        {dayShifts.length > 0 && (
                          <Badge variant="secondary" className="ml-auto text-xs" data-testid={`day-shift-count-${day.dateStr}`}>
                            {dayShifts.length}
                          </Badge>
                        )}
                      </div>
                      <div className="p-2 space-y-1">
                        {dayShifts.length === 0 && (
                          <div className="text-xs text-muted-foreground text-center py-2">Vardiya yok</div>
                        )}
                        {dayShifts.map((shift: any) => {
                          const empName = shift.employee?.fullName || shift.employee?.firstName || 'Bilinmiyor';
                          const colorClass = getEmployeeColor(shift.assignedToId || shift.employee?.id || 0);
                          return (
                            <div
                              key={shift.id}
                              className={`p-2 rounded border text-xs ${colorClass}`}
                              data-testid={`shift-chip-mobile-${shift.id}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium truncate">{empName}</span>
                                <span className="opacity-70 flex-shrink-0">
                                  {shift.startTime?.substring(0, 5)}-{shift.endTime?.substring(0, 5)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Haftal{"\u0131"}k {"\u00D6"}zet</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4" data-testid="summary-stats">
                <div className="text-center" data-testid="stat-total-shifts">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs">Toplam Vardiya</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.totalShifts}</div>
                </div>
                <div className="text-center" data-testid="stat-total-employees">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-xs">Personel</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.totalEmployees}</div>
                </div>
                <div className="text-center" data-testid="stat-total-hours">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs">Toplam Saat</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.totalHours}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
