import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfWeek, addDays, isToday, differenceInDays } from "date-fns";
import { tr } from "date-fns/locale";
import { Clock, MapPin, User } from "lucide-react";

interface MyShift {
  id: number;
  shiftDate: string;
  startTime: string;
  endTime: string;
  shiftType: string;
  status: string;
  branch: { name: string };
  createdBy: { fullName: string };
  notes?: string;
}

export default function Vardiyalarim() {
  const { user } = useAuth();
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);

  const weekStart = useMemo(() => {
    const today = new Date();
    const weekStarts = startOfWeek(new Date(today.getTime() + selectedWeekOffset * 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 });
    return weekStarts;
  }, [selectedWeekOffset]);

  // Fetch shifts assigned to current user only
  const { data: myShifts, isLoading } = useQuery({
    queryKey: ['/api/my-shifts', format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(addDays(weekStart, 6), 'yyyy-MM-dd');
      const res = await fetch(`/api/my-shifts?start=${startDate}&end=${endDate}`);
      if (!res.ok) throw new Error('Failed to fetch shifts');
      return res.json();
    },
  });

  const shiftsByDay = useMemo(() => {
    if (!myShifts) return new Map();
    const grouped = new Map<string, MyShift[]>();
    
    myShifts.forEach((shift: MyShift) => {
      const day = shift.shiftDate;
      if (!grouped.has(day)) grouped.set(day, []);
      grouped.get(day)!.push(shift);
    });
    
    return grouped;
  }, [myShifts]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      return {
        date,
        dateStr,
        shifts: shiftsByDay.get(dateStr) || [],
        dayName: format(date, 'EEEE', { locale: tr }),
        isToday: isToday(date),
      };
    });
  }, [weekStart, shiftsByDay]);

  const totalShifts = myShifts?.length || 0;
  const confirmedShifts = myShifts?.filter((s: MyShift) => s.status === 'confirmed').length || 0;
  const upcomingShifts = myShifts?.filter((s: MyShift) => {
    const daysUntil = differenceInDays(new Date(s.shiftDate), new Date());
    return daysUntil >= 0;
  }).length || 0;

  const getShiftTypeColor = (type: string) => {
    return type === 'morning' ? 'bg-amber-100 dark:bg-amber-900/30 text-warning' :
           type === 'evening' ? 'bg-blue-100 dark:bg-blue-900/30 text-primary' :
           'bg-purple-100 dark:bg-purple-900/30 text-secondary';
  };

  const getShiftTypeLabel = (type: string) => {
    return type === 'morning' ? '🌅 Sabah' :
           type === 'evening' ? '🌆 Akşam' :
           '🌙 Gece';
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-4 p-3">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Vardiyalarım</h1>
        <p className="text-muted-foreground mt-1">Bu haftanın çalışma programınız</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 md:grid-cols-3 gap-2 sm:gap-3">
        <Card>
          <CardContent className="p-2 sm:p-3">
            <div className="flex flex-col items-center text-center gap-1">
              <p className="text-xs text-muted-foreground">Toplam</p>
              <p className="text-lg sm:text-2xl font-bold">{totalShifts}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 sm:p-3">
            <div className="flex flex-col items-center text-center gap-1">
              <p className="text-xs text-muted-foreground">Onaylı</p>
              <p className="text-lg sm:text-2xl font-bold text-success">{confirmedShifts}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 sm:p-3">
            <div className="flex flex-col items-center text-center gap-1">
              <p className="text-xs text-muted-foreground">Yaklaşan</p>
              <p className="text-lg sm:text-2xl font-bold text-primary">{upcomingShifts}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Week Navigation */}
      <div className="flex gap-2 flex-wrap">
        <button 
          onClick={() => setSelectedWeekOffset(prev => prev - 1)}
          className="px-2 py-1 text-xs border rounded hover:bg-accent"
          data-testid="button-prev-week"
        >
          ← Önceki
        </button>
        <button 
          onClick={() => setSelectedWeekOffset(0)}
          className="px-2 py-1 text-xs border rounded hover:bg-accent"
          data-testid="button-current-week"
        >
          Bu Hafta
        </button>
        <button 
          onClick={() => setSelectedWeekOffset(prev => prev + 1)}
          className="px-2 py-1 text-xs border rounded hover:bg-accent"
          data-testid="button-next-week"
        >
          Sonraki →
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {weekDays.map((day, idx) => (
            <Card key={idx} className={day.isToday ? "border-primary/50 bg-primary/5" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <CardTitle className="text-xs sm:text-sm">
                      {format(day.date, 'd MMM', { locale: tr })}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {day.dayName.substring(0, 3)}
                    </CardDescription>
                  </div>
                  {day.isToday && <Badge className="text-xs">Bugün</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {day.shifts.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">İzin günü</p>
                ) : (
                  day.shifts.map((shift) => (
                    <div 
                      key={shift.id}
                      className={`p-1.5 rounded text-xs ${getShiftTypeColor(shift.shiftType)}`}
                      data-testid={`shift-${shift.id}`}
                    >
                      <div className="font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {shift.startTime?.substring(0, 5)} - {shift.endTime?.substring(0, 5)}
                      </div>
                      <div className="text-xs opacity-75 mt-0.5">
                        {getShiftTypeLabel(shift.shiftType)}
                      </div>
                      <Badge 
                        variant="outline" 
                        className="mt-1 text-xs h-4 font-normal"
                      >
                        {shift.status === 'draft' ? 'Taslak' :
                         shift.status === 'pending_hq' ? 'Beklemede' :
                         shift.status === 'confirmed' ? 'Onaylı' : shift.status}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* All Shifts Tab View */}
      {myShifts && myShifts.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm sm:text-base">Tüm Vardiyalar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {myShifts.map((shift) => (
              <div key={shift.id} className="flex items-start justify-between p-2 border rounded text-xs sm:text-sm hover-elevate">
                <div className="flex-1">
                  <div className="font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {format(new Date(shift.shiftDate), 'd MMM yyyy', { locale: tr })}
                  </div>
                  <div className="text-muted-foreground">
                    {shift.startTime?.substring(0, 5)} - {shift.endTime?.substring(0, 5)}
                  </div>
                  {shift.notes && (
                    <div className="mt-1 text-muted-foreground">{shift.notes}</div>
                  )}
                </div>
                <Badge variant="outline">
                  {shift.status === 'confirmed' ? 'Onaylı' :
                   shift.status === 'pending_hq' ? 'Beklemede' : 'Taslak'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
