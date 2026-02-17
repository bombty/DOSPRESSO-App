import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfWeek, addDays, isToday, differenceInDays } from "date-fns";
import { tr } from "date-fns/locale";
import { Clock, ChevronDown, ChevronUp, Sun, Sunset, Moon, ClipboardList, ArrowRightLeft, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  assignedTo?: { id: string; firstName: string; lastName: string };
  notes?: string;
  tasks?: ShiftTask[];
  checklists?: ShiftChecklist[];
}

export default function Vardiyalarim() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedWeekOffset, setSelectedWeekOffset] = useState<0 | 1>(0);
  const [viewMode, setViewMode] = useState<"my" | "branch">("my");
  const [expandedShifts, setExpandedShifts] = useState<Set<number>>(new Set());
  const [swapShift, setSwapShift] = useState<MyShift | null>(null);
  const [swapTargetUser, setSwapTargetUser] = useState<string>("");
  const [swapReason, setSwapReason] = useState<string>("");

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

  const { data: branchColleagues } = useQuery({
    queryKey: ['/api/branches', (user as any)?.branchId, 'users'],
    queryFn: async () => {
      const branchId = (user as any)?.branchId;
      if (!branchId) return [];
      const res = await fetch(`/api/branches/${branchId}/users`);
      if (!res.ok) throw new Error('Failed to fetch colleagues');
      return res.json();
    },
    enabled: !!swapShift && !!(user as any)?.branchId,
  });

  const { data: pendingSwapRequests } = useQuery<any[]>({
    queryKey: ['/api/shift-swap-requests/pending-for-me'],
  });

  const createSwapMutation = useMutation({
    mutationFn: async (body: any) => {
      await apiRequest('POST', '/api/shift-swap-requests', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shifts/my'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shift-swap-requests/pending-for-me'] });
      setSwapShift(null);
      setSwapTargetUser("");
      setSwapReason("");
      toast({ title: "Başarılı", description: "Takas talebi gönderildi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Takas talebi gönderilemedi", variant: "destructive" });
    },
  });

  const approveSwapMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('PATCH', `/api/shift-swap-requests/${id}/target-approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shifts/my'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shift-swap-requests/pending-for-me'] });
      toast({ title: "Başarılı", description: "Takas talebi onaylandı" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Takas talebi onaylanamadı", variant: "destructive" });
    },
  });

  const rejectSwapMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('PATCH', `/api/shift-swap-requests/${id}/target-reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shifts/my'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shift-swap-requests/pending-for-me'] });
      toast({ title: "Başarılı", description: "Takas talebi reddedildi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Takas talebi reddedilemedi", variant: "destructive" });
    },
  });

  const weekStart = useMemo(() => {
    const today = new Date();
    const weekStarts = startOfWeek(new Date(today.getTime() + selectedWeekOffset * 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 });
    return weekStarts;
  }, [selectedWeekOffset]);

  const startDate = format(weekStart, 'yyyy-MM-dd');
  const endDate = format(addDays(weekStart, 6), 'yyyy-MM-dd');

  const { data: myShifts, isLoading } = useQuery({
    queryKey: ['/api/shifts/my', startDate],
    queryFn: async () => {
      const res = await fetch(`/api/shifts/my?start=${startDate}&end=${endDate}`);
      if (!res.ok) throw new Error('Failed to fetch shifts');
      return res.json();
    },
  });

  const { data: branchShifts, isLoading: isBranchLoading } = useQuery({
    queryKey: ['/api/shifts', 'branch', (user as any)?.branchId, startDate],
    queryFn: async () => {
      const branchId = (user as any)?.branchId;
      if (!branchId) return [];
      const res = await fetch(`/api/shifts?branchId=${branchId}&dateFrom=${startDate}&dateTo=${endDate}`);
      if (!res.ok) throw new Error('Failed to fetch branch shifts');
      return res.json();
    },
    enabled: viewMode === "branch",
  });

  const activeShifts = viewMode === "my" ? myShifts : branchShifts;
  const activeLoading = viewMode === "my" ? isLoading : isBranchLoading;

  const shiftsByDay = useMemo(() => {
    if (!activeShifts) return new Map();
    const grouped = new Map<string, MyShift[]>();
    
    activeShifts.forEach((shift: MyShift) => {
      const day = shift.shiftDate;
      if (!grouped.has(day)) grouped.set(day, []);
      grouped.get(day)!.push(shift);
    });
    
    return grouped;
  }, [activeShifts]);

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

  const totalShifts = activeShifts?.length || 0;
  const upcomingShifts = activeShifts?.filter((s: MyShift) => {
    const daysUntil = differenceInDays(new Date(s.shiftDate), new Date());
    return daysUntil >= 0;
  }).length || 0;

  const getShiftTypeColor = (type: string) => {
    return type === 'morning' ? 'bg-amber-100 dark:bg-amber-900/30 text-warning' :
           type === 'evening' ? 'bg-blue-100 dark:bg-blue-900/30 text-primary' :
           'bg-purple-100 dark:bg-purple-900/30 text-secondary';
  };

  const getShiftTypeLabel = (type: string) => {
    return type === 'morning' ? 'Sabah' :
           type === 'evening' ? 'Akşam' :
           'Gece';
  };

  const getShiftTypeIcon = (type: string) => {
    if (type === 'morning') return <Sun className="w-3 h-3" />;
    if (type === 'evening') return <Sunset className="w-3 h-3" />;
    return <Moon className="w-3 h-3" />;
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-4 p-3">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="text-page-title">Vardiyalarım</h1>
        <p className="text-muted-foreground mt-1" data-testid="text-page-description">Bu haftanın çalışma programınız</p>
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "my" | "branch")} data-testid="tabs-view-mode">
        <TabsList>
          <TabsTrigger value="my" data-testid="tab-my-shifts">Benim Vardiyalarım</TabsTrigger>
          <TabsTrigger value="branch" data-testid="tab-branch-plan">Şube Planı</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-3 md:grid-cols-3 gap-2 sm:gap-3">
        <Card>
          <CardContent className="p-2 sm:p-3">
            <div className="flex flex-col items-center text-center gap-1">
              <p className="text-xs text-muted-foreground">Toplam</p>
              <p className="text-lg sm:text-2xl font-bold" data-testid="text-total-shifts">{totalShifts}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 sm:p-3">
            <div className="flex flex-col items-center text-center gap-1">
              <p className="text-xs text-muted-foreground">Vardiya</p>
              <p className="text-lg sm:text-2xl font-bold text-success" data-testid="text-confirmed-shifts">{totalShifts}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 sm:p-3">
            <div className="flex flex-col items-center text-center gap-1">
              <p className="text-xs text-muted-foreground">Yaklaşan</p>
              <p className="text-lg sm:text-2xl font-bold text-primary" data-testid="text-upcoming-shifts">{upcomingShifts}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedWeekOffset === 0 ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedWeekOffset(0)}
          data-testid="button-this-week"
        >
          Bu Hafta
        </Button>
        <Button
          variant={selectedWeekOffset === 1 ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedWeekOffset(1)}
          data-testid="button-next-week"
        >
          Gelecek Hafta
        </Button>
      </div>

      {activeLoading ? (
        <div className="text-center py-8 text-muted-foreground" data-testid="text-loading">Yükleniyor...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {weekDays.map((day, idx) => (
            <Card key={idx} className={day.isToday ? "border-primary/50 bg-primary/5" : ""} data-testid={`card-day-${idx}`}>
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
                  <p className="text-xs text-muted-foreground text-center py-2" data-testid={`text-no-shift-${idx}`}>İzin günü</p>
                ) : (
                  day.shifts.map((shift: MyShift) => {
                    const taskCount = shift.tasks?.length || 0;
                    const checklistCount = shift.checklists?.length || 0;
                    const completedTasks = shift.tasks?.filter((t: ShiftTask) => t.isCompleted).length || 0;
                    const completedChecklists = shift.checklists?.filter((c: ShiftChecklist) => c.isCompleted).length || 0;
                    const hasItems = taskCount > 0 || checklistCount > 0;
                    const isExpanded = expandedShifts.has(shift.id);
                    const employeeName = shift.assignedTo
                      ? `${shift.assignedTo.firstName || ''} ${shift.assignedTo.lastName || ''}`.trim()
                      : '';

                    return (
                      <div 
                        key={shift.id}
                        className={`p-1.5 rounded text-xs ${getShiftTypeColor(shift.shiftType)}`}
                        data-testid={`shift-${shift.id}`}
                      >
                        <div className="font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {shift.startTime?.substring(0, 5)} - {shift.endTime?.substring(0, 5)}
                          {viewMode === "my" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="ml-auto"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSwapShift(shift);
                                setSwapTargetUser("");
                                setSwapReason("");
                              }}
                              data-testid={`button-swap-${shift.id}`}
                            >
                              <ArrowRightLeft className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {getShiftTypeIcon(shift.shiftType)}
                          <span className="text-xs">{getShiftTypeLabel(shift.shiftType)}</span>
                        </div>
                        {viewMode === "branch" && employeeName && (
                          <div className="text-xs mt-0.5 opacity-80" data-testid={`text-employee-${shift.id}`}>
                            {employeeName}
                          </div>
                        )}
                        <div className="flex items-center justify-end mt-1">
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

      {pendingSwapRequests && (pendingSwapRequests as any[]).length > 0 && (
        <Card data-testid="card-pending-swaps">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4" />
              Bekleyen Takas Talepleri
            </CardTitle>
            <CardDescription className="text-xs">Size gelen vardiya takas talepleri</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(pendingSwapRequests as any[]).map((req: any) => (
              <div
                key={req.id}
                className="flex items-center justify-between gap-2 p-2 rounded border"
                data-testid={`swap-request-${req.id}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" data-testid={`text-swap-requester-${req.id}`}>
                    {req.requester?.fullName || req.requester?.firstName || 'Bilinmeyen'}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid={`text-swap-date-${req.id}`}>
                    {req.swapDate ? format(new Date(req.swapDate), 'd MMM yyyy', { locale: tr }) : ''}
                    {req.requesterShift && ` ${req.requesterShift.startTime?.substring(0, 5)} - ${req.requesterShift.endTime?.substring(0, 5)}`}
                  </p>
                  {req.reason && (
                    <p className="text-xs text-muted-foreground mt-0.5" data-testid={`text-swap-reason-${req.id}`}>
                      {req.reason}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => approveSwapMutation.mutate(req.id)}
                    disabled={approveSwapMutation.isPending}
                    data-testid={`button-approve-swap-${req.id}`}
                  >
                    <Check className="w-4 h-4 text-green-600" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => rejectSwapMutation.mutate(req.id)}
                    disabled={rejectSwapMutation.isPending}
                    data-testid={`button-reject-swap-${req.id}`}
                  >
                    <X className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!swapShift} onOpenChange={(open) => { if (!open) setSwapShift(null); }}>
        <DialogContent data-testid="dialog-swap-request">
          <DialogHeader>
            <DialogTitle>Vardiya Takas Talebi</DialogTitle>
          </DialogHeader>
          {swapShift && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Takas edilecek vardiya</p>
                <p className="text-sm text-muted-foreground" data-testid="text-swap-shift-info">
                  {format(new Date(swapShift.shiftDate), 'd MMMM yyyy, EEEE', { locale: tr })} - {swapShift.startTime?.substring(0, 5)} / {swapShift.endTime?.substring(0, 5)}
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Takas yapılacak kişi</label>
                <Select value={swapTargetUser} onValueChange={setSwapTargetUser}>
                  <SelectTrigger data-testid="select-swap-target">
                    <SelectValue placeholder="Çalışan seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {(branchColleagues as any[] || [])
                      .filter((c: any) => c.id !== (user as any)?.id)
                      .map((colleague: any) => (
                        <SelectItem
                          key={colleague.id}
                          value={String(colleague.id)}
                          data-testid={`option-colleague-${colleague.id}`}
                        >
                          {colleague.fullName || `${colleague.firstName || ''} ${colleague.lastName || ''}`.trim()}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Sebep (opsiyonel)</label>
                <Textarea
                  value={swapReason}
                  onChange={(e) => setSwapReason(e.target.value)}
                  placeholder="Takas sebebinizi yazın..."
                  data-testid="textarea-swap-reason"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSwapShift(null)}
              data-testid="button-cancel-swap"
            >
              İptal
            </Button>
            <Button
              onClick={() => {
                if (!swapShift || !swapTargetUser) return;
                createSwapMutation.mutate({
                  requesterShiftId: swapShift.id,
                  targetUserId: swapTargetUser,
                  branchId: (user as any)?.branchId,
                  swapDate: swapShift.shiftDate,
                  reason: swapReason || undefined,
                });
              }}
              disabled={!swapTargetUser || createSwapMutation.isPending}
              data-testid="button-confirm-swap"
            >
              Takas Talebi Gönder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
