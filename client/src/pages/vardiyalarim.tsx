import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format, startOfWeek, addDays, isToday, differenceInDays } from "date-fns";
import { tr } from "date-fns/locale";
import { Clock, ChevronDown, ChevronUp, CheckCircle, ListTodo, ClipboardList, CheckSquare } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ShiftTask {
  id: number;
  taskId: number;
  isCompleted: boolean;
  task: {
    id: number;
    title: string;
    description?: string;
    priority: string;
  };
}

interface ShiftChecklist {
  id: number;
  checklistId: number;
  isCompleted: boolean;
  checklist: {
    id: number;
    name: string;
    description?: string;
    itemCount?: number;
  };
}

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
  tasks?: ShiftTask[];
  checklists?: ShiftChecklist[];
}

export default function Vardiyalarim() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);
  const [expandedShifts, setExpandedShifts] = useState<Set<number>>(new Set());

  const toggleShiftExpanded = (shiftId: number) => {
    setExpandedShifts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(shiftId)) {
        newSet.delete(shiftId);
      } else {
        newSet.add(shiftId);
      }
      return newSet;
    });
  };

  // Task completion mutation
  const completeTaskMutation = useMutation({
    mutationFn: async ({ shiftTaskId, isCompleted }: { shiftTaskId: number; isCompleted: boolean }) => {
      await apiRequest('PATCH', `/api/shift-tasks/${shiftTaskId}`, { isCompleted });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shifts/my'] });
      toast({ title: "Başarılı", description: "Görev durumu güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Görev güncellenemedi", variant: "destructive" });
    },
  });

  // Checklist completion mutation
  const completeChecklistMutation = useMutation({
    mutationFn: async ({ shiftChecklistId, isCompleted }: { shiftChecklistId: number; isCompleted: boolean }) => {
      await apiRequest('PATCH', `/api/shift-checklists/${shiftChecklistId}`, { isCompleted });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shifts/my'] });
      toast({ title: "Başarılı", description: "Checklist durumu güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Checklist güncellenemedi", variant: "destructive" });
    },
  });

  const weekStart = useMemo(() => {
    const today = new Date();
    const weekStarts = startOfWeek(new Date(today.getTime() + selectedWeekOffset * 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 });
    return weekStarts;
  }, [selectedWeekOffset]);

  // Fetch shifts assigned to current user only
  const { data: myShifts, isLoading } = useQuery({
    queryKey: ['/api/shifts/my', format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(addDays(weekStart, 6), 'yyyy-MM-dd');
      const res = await fetch(`/api/shifts/my?start=${startDate}&end=${endDate}`);
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
                  day.shifts.map((shift) => {
                    const taskCount = shift.tasks?.length || 0;
                    const checklistCount = shift.checklists?.length || 0;
                    const completedTasks = shift.tasks?.filter(t => t.isCompleted).length || 0;
                    const completedChecklists = shift.checklists?.filter(c => c.isCompleted).length || 0;
                    const hasItems = taskCount > 0 || checklistCount > 0;
                    const isExpanded = expandedShifts.has(shift.id);

                    return (
                      <div 
                        key={shift.id}
                        className={`p-1.5 rounded text-xs ${getShiftTypeColor(shift.shiftType)}`}
                        data-testid={`shift-${shift.id}`}
                      >
                        <div className="font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {shift.startTime?.substring(0, 5)} - {shift.endTime?.substring(0, 5)}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <Badge variant="outline" className="text-xs h-4 font-normal">
                            {shift.status === 'draft' ? 'Taslak' :
                             shift.status === 'pending_hq' ? 'Beklemede' :
                             shift.status === 'confirmed' ? 'Onaylı' : shift.status}
                          </Badge>
                          {hasItems && (
                            <button 
                              onClick={() => toggleShiftExpanded(shift.id)}
                              className="flex items-center gap-0.5 text-xs opacity-75 hover:opacity-100"
                              data-testid={`toggle-shift-${shift.id}`}
                            >
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              <span>{taskCount + checklistCount}</span>
                            </button>
                          )}
                        </div>
                        {isExpanded && hasItems && (
                          <div className="mt-2 pt-2 border-t border-current/20 space-y-1">
                            {shift.tasks?.map((shiftTask) => (
                              <div key={shiftTask.id} className="flex items-center gap-1.5">
                                <Checkbox 
                                  checked={shiftTask.isCompleted}
                                  onCheckedChange={(checked) => 
                                    completeTaskMutation.mutate({ 
                                      shiftTaskId: shiftTask.id, 
                                      isCompleted: !!checked 
                                    })
                                  }
                                  className="h-3 w-3"
                                  data-testid={`task-check-${shiftTask.id}`}
                                />
                                <span className={shiftTask.isCompleted ? "line-through opacity-50" : ""}>
                                  {shiftTask.task?.title || `Görev #${shiftTask.taskId}`}
                                </span>
                              </div>
                            ))}
                            {shift.checklists?.map((shiftChecklist) => (
                              <div key={shiftChecklist.id} className="flex items-center gap-1.5">
                                <Checkbox 
                                  checked={shiftChecklist.isCompleted}
                                  onCheckedChange={(checked) => 
                                    completeChecklistMutation.mutate({ 
                                      shiftChecklistId: shiftChecklist.id, 
                                      isCompleted: !!checked 
                                    })
                                  }
                                  className="h-3 w-3"
                                  data-testid={`checklist-check-${shiftChecklist.id}`}
                                />
                                <ClipboardList className="w-3 h-3" />
                                <span className={shiftChecklist.isCompleted ? "line-through opacity-50" : ""}>
                                  {shiftChecklist.checklist?.name || `Checklist #${shiftChecklist.checklistId}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
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
