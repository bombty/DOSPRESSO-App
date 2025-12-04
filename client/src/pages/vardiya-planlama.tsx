import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfWeek, addDays, isToday } from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Sparkles, X, Loader2, Wand2, UserPlus, Trash2 } from "lucide-react";

export default function VardiyaPlanlama() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [editingShiftId, setEditingShiftId] = useState<number | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const { data: shifts, isLoading: shiftsLoading } = useQuery({
    queryKey: ['/api/shifts'],
  });

  const { data: allEmployees } = useQuery({
    queryKey: ['/api/employees'],
  });

  const branchEmployees = useMemo(() => {
    if (!allEmployees || !Array.isArray(allEmployees)) return [];
    return allEmployees.filter((emp: any) => emp.branchId === user?.branchId);
  }, [allEmployees, user?.branchId]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      return {
        date,
        dateStr: format(date, 'yyyy-MM-dd'),
        dayName: format(date, 'EEEE', { locale: tr }),
        shortName: format(date, 'EEE', { locale: tr }),
        dayNum: format(date, 'd'),
      };
    });
  }, [weekStart]);

  const weekShifts = useMemo(() => {
    if (!shifts || !Array.isArray(shifts)) return {};
    const byDate: Record<string, any[]> = {};
    weekDays.forEach(day => {
      byDate[day.dateStr] = shifts.filter((s: any) => s.shiftDate === day.dateStr);
    });
    return byDate;
  }, [shifts, weekDays]);

  const previousWeek = () => setWeekStart(addDays(weekStart, -7));
  const nextWeek = () => setWeekStart(addDays(weekStart, 7));
  const goToToday = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const resetWeeklyMutation = useMutation({
    mutationFn: () => {
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      return apiRequest('DELETE', `/api/shifts/reset-weekly?weekStart=${weekStartStr}`);
    },
    onSuccess: (data: any) => {
      toast({ title: "Başarılı", description: data.message || "Vardiyalar sıfırlandı" });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      setResetConfirmOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const getShiftColor = (shift: any) => {
    const hour = parseInt(shift.startTime?.split(':')[0] || '0');
    return hour < 12 
      ? 'bg-amber-100 dark:bg-amber-900/50 border-amber-300 dark:border-amber-700' 
      : 'bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700';
  };

  return (
    <div className="flex flex-col gap-4 p-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Vardiya Planlama</h1>
          <p className="text-muted-foreground text-sm">
            {format(weekStart, "d MMM", { locale: tr })} - {format(addDays(weekStart, 6), "d MMM yyyy", { locale: tr })}
          </p>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setAddModalOpen(true)} className="gap-2" data-testid="button-add-shift">
            <UserPlus className="w-4 h-4" />
            Vardiya Ekle
          </Button>
          <Button onClick={() => setAiModalOpen(true)} className="gap-2" data-testid="button-ai-plan">
            <Wand2 className="w-4 h-4" />
            AI Planla
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => setResetConfirmOpen(true)} 
            className="gap-2" 
            data-testid="button-reset-shifts"
          >
            <Trash2 className="w-4 h-4" />
            Şiftleri Sıfırla
          </Button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center gap-2">
        <Button size="icon" variant="outline" onClick={previousWeek} data-testid="button-prev-week">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={goToToday} data-testid="button-today">
          Bugün
        </Button>
        <Button size="icon" variant="outline" onClick={nextWeek} data-testid="button-next-week">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Weekly Calendar Grid */}
      {shiftsLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {weekDays.map((day) => (
            <Card 
              key={day.dateStr}
              className={`min-h-[120px] ${isToday(day.date) ? 'ring-2 ring-primary' : ''}`}
            >
              <div className="p-2 border-b bg-muted/30 text-center">
                <div className="text-xs text-muted-foreground">{day.shortName}</div>
                <div className="text-lg font-bold">{day.dayNum}</div>
              </div>

              <CardContent className="p-2 space-y-1">
                {(weekShifts[day.dateStr] || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">-</p>
                ) : (
                  (weekShifts[day.dateStr] || []).map((shift: any) => {
                    const emp = branchEmployees.find((e: any) => e.id === shift.assignedToId);
                    const name = emp?.fullName || emp?.firstName || 'Bilinmiyor';
                    
                    return (
                      <button
                        key={shift.id}
                        onClick={() => setEditingShiftId(shift.id)}
                        className={`w-full p-1.5 rounded border text-left text-xs transition-all hover:shadow ${getShiftColor(shift)}`}
                        data-testid={`shift-chip-${shift.id}`}
                      >
                        <div className="font-medium truncate">{name}</div>
                        <div className="opacity-70">
                          {shift.startTime?.substring(0, 5)}-{shift.endTime?.substring(0, 5)}
                        </div>
                      </button>
                    );
                  })
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Shift Modal */}
      <ShiftEditModal
        open={!!editingShiftId}
        shiftId={editingShiftId}
        employees={branchEmployees}
        onClose={() => setEditingShiftId(null)}
      />

      {/* Add Shift Modal */}
      <AddShiftModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        weekStart={weekStart}
        employees={branchEmployees}
        branchId={user?.branchId || 0}
        existingShifts={Array.isArray(shifts) ? shifts : []}
      />

      {/* AI Plan Modal */}
      <AIPlanModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        weekStart={weekStart}
        employees={branchEmployees}
        branchId={user?.branchId || 0}
        existingShifts={Array.isArray(shifts) ? shifts : []}
      />

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vardiyaları Sıfırla</DialogTitle>
            <DialogDescription>
              Bu işlem {format(weekStart, "d MMM", { locale: tr })} - {format(addDays(weekStart, 6), "d MMM", { locale: tr })} haftasının tüm vardiyalarını silecektir. Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setResetConfirmOpen(false)}>
              İptal
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => resetWeeklyMutation.mutate()}
              disabled={resetWeeklyMutation.isPending}
              data-testid="button-confirm-reset"
            >
              {resetWeeklyMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Siliniyor...
                </>
              ) : (
                "Evet, Sıfırla"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ShiftEditModal({ open, shiftId, employees, onClose }: {
  open: boolean;
  shiftId: number | null;
  employees: any[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { data: shifts } = useQuery({ queryKey: ['/api/shifts'] });
  const { data: checklists } = useQuery({ queryKey: ['/api/checklists'] });
  const { data: tasks } = useQuery({ queryKey: ['/api/tasks'] });
  
  const shift = useMemo(() => {
    if (!shifts || !Array.isArray(shifts) || !shiftId) return null;
    return shifts.find((s: any) => s.id === shiftId);
  }, [shifts, shiftId]);

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [breakStartTime, setBreakStartTime] = useState('');
  const [breakEndTime, setBreakEndTime] = useState('');
  const [checklist1, setChecklist1] = useState('');
  const [checklist2, setChecklist2] = useState('');
  const [checklist3, setChecklist3] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [quickTaskText, setQuickTaskText] = useState('');

  const emp = useMemo(() => {
    if (!shift) return null;
    return employees.find((e: any) => e.id === shift.assignedToId);
  }, [shift, employees]);

  const availableTasks = useMemo(() => {
    if (!tasks || !Array.isArray(tasks)) return [];
    return tasks.filter((t: any) => t.status === 'pending' || t.status === 'assigned');
  }, [tasks]);

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', `/api/shifts/${shiftId}`),
    onSuccess: () => {
      toast({ title: "Silindi", description: "Vardiya silindi" });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      onClose();
    },
    onError: (err: Error) => toast({ title: "Hata", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      const [h] = startTime.split(':').map(Number);
      
      return apiRequest('PATCH', `/api/shifts/${shiftId}`, {
        startTime: `${startTime}:00`,
        endTime: `${endTime}:00`,
        breakStartTime: `${breakStartTime}:00`,
        breakEndTime: `${breakEndTime}:00`,
        shiftType: h < 12 ? 'morning' : 'evening',
        checklistId: checklist1 && checklist1 !== 'none' ? parseInt(checklist1) : null,
        checklist2Id: checklist2 && checklist2 !== 'none' ? parseInt(checklist2) : null,
        checklist3Id: checklist3 && checklist3 !== 'none' ? parseInt(checklist3) : null,
      });
    },
    onSuccess: () => {
      toast({ title: "Güncellendi" });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      onClose();
    },
    onError: (err: Error) => toast({ title: "Hata", description: err.message, variant: "destructive" }),
  });

  const quickTaskMutation = useMutation({
    mutationFn: () => {
      if (!quickTaskText.trim() || !shift?.assignedToId) {
        throw new Error("Görev açıklaması veya personel gerekli");
      }
      return apiRequest('POST', '/api/tasks', {
        title: quickTaskText.trim(),
        description: quickTaskText.trim(),
        priority: 'medium',
        branchId: shift.branchId,
        assignedToId: shift.assignedToId,
        dueDate: shift.shiftDate,
        status: 'assigned',
      });
    },
    onSuccess: () => {
      toast({ title: "Hızlı Görev Oluşturuldu" });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setQuickTaskText('');
    },
    onError: (err: Error) => toast({ title: "Hata", description: err.message, variant: "destructive" }),
  });

  const assignTaskMutation = useMutation({
    mutationFn: () => {
      if (!selectedTask || selectedTask === 'none' || !shift?.assignedToId) {
        throw new Error("Görev veya personel seçilmedi");
      }
      return apiRequest('PATCH', `/api/tasks/${selectedTask}`, {
        assignedToId: shift.assignedToId,
        status: 'assigned',
      });
    },
    onSuccess: () => {
      toast({ title: "Görev Atandı", description: "Görev başarıyla atandı" });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setSelectedTask('');
    },
    onError: (err: Error) => toast({ title: "Hata", description: err.message, variant: "destructive" }),
  });

  if (!shift) return null;

  if (!startTime && shift.startTime) {
    setStartTime(shift.startTime.substring(0, 5));
  }
  if (!endTime && shift.endTime) {
    setEndTime(shift.endTime.substring(0, 5));
  }
  if (!breakStartTime && shift.breakStartTime) {
    setBreakStartTime(shift.breakStartTime.substring(0, 5));
  }
  if (!breakEndTime && shift.breakEndTime) {
    setBreakEndTime(shift.breakEndTime.substring(0, 5));
  }
  if (!checklist1 && shift.checklistId) {
    setChecklist1(String(shift.checklistId));
  }
  if (!checklist2 && shift.checklist2Id) {
    setChecklist2(String(shift.checklist2Id));
  }
  if (!checklist3 && shift.checklist3Id) {
    setChecklist3(String(shift.checklist3Id));
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vardiya Düzenle</DialogTitle>
          <DialogDescription>{emp?.fullName || emp?.firstName} - {shift.shiftDate}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Başlangıç</label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1"
                data-testid="edit-start-time"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Bitiş</label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1"
                data-testid="edit-end-time"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Mola Başlangıç</label>
              <Input
                type="time"
                value={breakStartTime}
                onChange={(e) => setBreakStartTime(e.target.value)}
                className="mt-1"
                data-testid="edit-break-start"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Mola Bitiş</label>
              <Input
                type="time"
                value={breakEndTime}
                onChange={(e) => setBreakEndTime(e.target.value)}
                className="mt-1"
                data-testid="edit-break-end"
              />
            </div>
          </div>

          {/* Checklist Assignments */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Checklist Atamaları</p>
            <div className="space-y-2">
              <Select value={checklist1} onValueChange={setChecklist1}>
                <SelectTrigger className="text-sm" data-testid="edit-checklist-1">
                  <SelectValue placeholder="1. Checklist seç" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seçilmedi</SelectItem>
                  {Array.isArray(checklists) && checklists.map((cl: { id: number; title: string }) => (
                    <SelectItem key={cl.id} value={String(cl.id)}>{cl.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={checklist2} onValueChange={setChecklist2}>
                <SelectTrigger className="text-sm" data-testid="edit-checklist-2">
                  <SelectValue placeholder="2. Checklist seç" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seçilmedi</SelectItem>
                  {Array.isArray(checklists) && checklists.map((cl: { id: number; title: string }) => (
                    <SelectItem key={cl.id} value={String(cl.id)}>{cl.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={checklist3} onValueChange={setChecklist3}>
                <SelectTrigger className="text-sm" data-testid="edit-checklist-3">
                  <SelectValue placeholder="3. Checklist seç" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seçilmedi</SelectItem>
                  {Array.isArray(checklists) && checklists.map((cl: { id: number; title: string }) => (
                    <SelectItem key={cl.id} value={String(cl.id)}>{cl.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Task Assignment */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Görev Ata</p>
            <div className="flex gap-2 mb-3">
              <Select value={selectedTask} onValueChange={setSelectedTask}>
                <SelectTrigger className="text-sm flex-1" data-testid="edit-task-select">
                  <SelectValue placeholder="Mevcut görev seç" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seçilmedi</SelectItem>
                  {availableTasks.map((task: { id: number; title: string }) => (
                    <SelectItem key={task.id} value={String(task.id)}>{task.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                size="sm"
                variant="outline"
                onClick={() => assignTaskMutation.mutate()}
                disabled={!selectedTask || selectedTask === 'none' || assignTaskMutation.isPending}
                data-testid="button-assign-task"
              >
                {assignTaskMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ata"}
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Input
                placeholder="Hızlı görev yaz..."
                value={quickTaskText}
                onChange={(e) => setQuickTaskText(e.target.value)}
                className="text-sm"
                data-testid="quick-task-input"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && quickTaskText.trim()) {
                    quickTaskMutation.mutate();
                  }
                }}
              />
              <Button 
                size="sm"
                onClick={() => quickTaskMutation.mutate()}
                disabled={!quickTaskText.trim() || quickTaskMutation.isPending}
                data-testid="button-quick-task"
              >
                {quickTaskMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "+"}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            size="sm" 
            variant="destructive" 
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            data-testid="button-delete-shift"
          >
            {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            Sil
          </Button>
          <Button 
            size="sm"
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            data-testid="button-update-shift"
          >
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddShiftModal({ open, onClose, weekStart, employees, branchId, existingShifts }: {
  open: boolean;
  onClose: () => void;
  weekStart: Date;
  employees: any[];
  branchId: number;
  existingShifts: any[];
}) {
  const { toast } = useToast();
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('08:00');
  const [breakTime, setBreakTime] = useState('11:30');
  const [checklist1, setChecklist1] = useState('');
  const [checklist2, setChecklist2] = useState('');
  const [checklist3, setChecklist3] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [quickTaskText, setQuickTaskText] = useState('');

  const { data: checklists } = useQuery({
    queryKey: ['/api/checklists'],
  });

  const { data: tasks } = useQuery({
    queryKey: ['/api/tasks'],
  });

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      return {
        date,
        dateStr: format(date, 'yyyy-MM-dd'),
        shortName: format(date, 'EEE', { locale: tr }),
        dayNum: format(date, 'd'),
      };
    });
  }, [weekStart]);

  const availableEmployees = useMemo(() => {
    if (!selectedDays.length) return employees;
    
    const assignedEmployeeIds = new Set<string>();
    selectedDays.forEach(day => {
      const dayShifts = Array.isArray(existingShifts) 
        ? existingShifts.filter((s: any) => s.shiftDate === day)
        : [];
      dayShifts.forEach((s: any) => {
        if (s.assignedToId) assignedEmployeeIds.add(String(s.assignedToId));
      });
    });

    return employees.filter((emp: any) => !assignedEmployeeIds.has(String(emp.id)));
  }, [employees, selectedDays, existingShifts]);

  const getEmployeeAssignedDays = (employeeId: string) => {
    if (!Array.isArray(existingShifts)) return [];
    return existingShifts
      .filter((s: any) => String(s.assignedToId) === employeeId)
      .map((s: any) => s.shiftDate);
  };

  const toggleDay = (dateStr: string) => {
    const newDays = selectedDays.includes(dateStr) 
      ? selectedDays.filter(d => d !== dateStr)
      : [...selectedDays, dateStr];
    
    setSelectedDays(newDays);
    
    if (selectedEmployee) {
      const assignedDays = getEmployeeAssignedDays(selectedEmployee);
      if (newDays.some(d => assignedDays.includes(d))) {
        setSelectedEmployee('');
      }
    }
  };

  const availableTasks = useMemo(() => {
    if (!tasks || !Array.isArray(tasks)) return [];
    return tasks.filter((t: any) => t.status === 'pending' || t.status === 'assigned');
  }, [tasks]);

  const resetForm = () => {
    setSelectedEmployee('');
    setSelectedDays([]);
    setStartTime('08:00');
    setBreakTime('11:30');
    setChecklist1('');
    setChecklist2('');
    setChecklist3('');
    setSelectedTask('');
    setQuickTaskText('');
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const [h] = startTime.split(':').map(Number);
      const endH = (h + 8) % 24;
      const [bH] = breakTime.split(':').map(Number);
      const breakEndH = (bH + 1) % 24;
      const shiftType = h < 12 ? 'morning' : 'evening';

      const shifts = selectedDays.map(dateStr => ({
        shiftDate: dateStr,
        startTime: `${startTime}:00`,
        endTime: `${String(endH).padStart(2, '0')}:30:00`,
        breakStartTime: `${breakTime}:00`,
        breakEndTime: `${String(breakEndH).padStart(2, '0')}:30:00`,
        shiftType,
        assignedToId: selectedEmployee,
        status: 'draft',
        branchId,
        checklistId: checklist1 && checklist1 !== 'none' ? parseInt(checklist1) : null,
        checklist2Id: checklist2 && checklist2 !== 'none' ? parseInt(checklist2) : null,
        checklist3Id: checklist3 && checklist3 !== 'none' ? parseInt(checklist3) : null,
      }));

      const result = await apiRequest('POST', '/api/shifts/bulk-create', { shifts });

      // Assign task if selected
      if (selectedTask && selectedTask !== 'none') {
        await apiRequest('PATCH', `/api/tasks/${selectedTask}`, {
          assignedToId: parseInt(selectedEmployee),
          status: 'assigned',
          dueDate: selectedDays[0],
        });
      }

      // Create quick task if text provided
      if (quickTaskText.trim()) {
        await apiRequest('POST', '/api/tasks', {
          title: quickTaskText.trim(),
          description: quickTaskText.trim(),
          priority: 'medium',
          branchId,
          assignedToId: parseInt(selectedEmployee),
          dueDate: selectedDays[0],
          status: 'assigned',
        });
      }

      return result;
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: `${selectedDays.length} vardiya oluşturuldu` });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      resetForm();
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const canSave = selectedEmployee && selectedDays.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { resetForm(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Vardiya Ekle</DialogTitle>
          <DialogDescription>Personel seç, günleri işaretle, saati ayarla</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Day Selection First - so we can filter employees */}
          <div>
            <label className="text-sm font-medium">Günler</label>
            <div className="grid grid-cols-7 gap-1 mt-2">
              {weekDays.map(day => {
                const isSelected = selectedDays.includes(day.dateStr);
                return (
                  <button
                    key={day.dateStr}
                    type="button"
                    onClick={() => toggleDay(day.dateStr)}
                    className={`p-2 rounded-md text-center transition-all ${
                      isSelected 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                    data-testid={`day-toggle-${day.dateStr}`}
                  >
                    <div className="text-xs">{day.shortName}</div>
                    <div className="text-sm font-bold">{day.dayNum}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Employee Selection - filtered by selected days */}
          <div>
            <label className="text-sm font-medium">
              Personel 
              {selectedDays.length > 0 && availableEmployees.length < employees.length && (
                <span className="text-muted-foreground font-normal ml-1">
                  ({availableEmployees.length} müsait)
                </span>
              )}
            </label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="mt-1" data-testid="select-employee">
                <SelectValue placeholder={selectedDays.length ? "Müsait personel seçin" : "Önce gün seçin"} />
              </SelectTrigger>
              <SelectContent>
                {availableEmployees.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    Bu günlerde tüm personel dolu
                  </div>
                ) : (
                  availableEmployees.map((emp: any) => (
                    <SelectItem key={emp.id} value={String(emp.id)}>
                      {emp.fullName || `${emp.firstName} ${emp.lastName}`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Time Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Başlangıç</label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                data-testid="select-start-time"
              >
                {Array.from({ length: 13 }, (_, i) => {
                  const h = 7 + i;
                  const t = `${String(h).padStart(2, '0')}:00`;
                  return <option key={t} value={t}>{t}</option>;
                })}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Mola</label>
              <select
                value={breakTime}
                onChange={(e) => setBreakTime(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                data-testid="select-break-time"
              >
                {Array.from({ length: 10 }, (_, i) => {
                  const h = 11 + i;
                  const t = `${String(h).padStart(2, '0')}:30`;
                  return <option key={t} value={t}>{t}</option>;
                })}
              </select>
            </div>
          </div>

          {/* Checklist Selections */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">1. Checklist</label>
              <Select value={checklist1} onValueChange={setChecklist1}>
                <SelectTrigger className="mt-1" data-testid="select-checklist-1">
                  <SelectValue placeholder="Checklist seçin (opsiyonel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seçilmedi</SelectItem>
                  {Array.isArray(checklists) && checklists.map((cl: { id: number; title: string }) => (
                    <SelectItem key={cl.id} value={String(cl.id)}>
                      {cl.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">2. Checklist</label>
              <Select value={checklist2} onValueChange={setChecklist2}>
                <SelectTrigger className="mt-1" data-testid="select-checklist-2">
                  <SelectValue placeholder="Checklist seçin (opsiyonel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seçilmedi</SelectItem>
                  {Array.isArray(checklists) && checklists.map((cl: { id: number; title: string }) => (
                    <SelectItem key={cl.id} value={String(cl.id)}>
                      {cl.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">3. Checklist</label>
              <Select value={checklist3} onValueChange={setChecklist3}>
                <SelectTrigger className="mt-1" data-testid="select-checklist-3">
                  <SelectValue placeholder="Checklist seçin (opsiyonel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seçilmedi</SelectItem>
                  {Array.isArray(checklists) && checklists.map((cl: { id: number; title: string }) => (
                    <SelectItem key={cl.id} value={String(cl.id)}>
                      {cl.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Task Assignment */}
          <div className="border-t pt-3">
            <p className="text-sm font-medium mb-2">Görev Ata</p>
            <div className="flex gap-2 mb-3">
              <Select value={selectedTask} onValueChange={setSelectedTask}>
                <SelectTrigger className="text-sm flex-1" data-testid="add-task-select">
                  <SelectValue placeholder="Mevcut görev seç" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seçilmedi</SelectItem>
                  {availableTasks.map((task: { id: number; title: string }) => (
                    <SelectItem key={task.id} value={String(task.id)}>{task.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="Veya hızlıca görev yaz..."
              value={quickTaskText}
              onChange={(e) => setQuickTaskText(e.target.value)}
              className="text-sm"
              data-testid="input-quick-task"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onClose(); }}>
            İptal
          </Button>
          <Button 
            onClick={() => createMutation.mutate()}
            disabled={!canSave || createMutation.isPending}
            data-testid="button-save-shifts"
          >
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            {selectedDays.length > 0 ? `${selectedDays.length} Gün Kaydet` : 'Kaydet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AIPlanModal({ open, onClose, weekStart, employees, branchId, existingShifts }: {
  open: boolean;
  onClose: () => void;
  weekStart: Date;
  employees: any[];
  branchId: number;
  existingShifts: any[];
}) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);

  const { data: branches } = useQuery({ queryKey: ['/api/branches'] });
  
  const branch = useMemo(() => {
    if (!branches || !Array.isArray(branches)) return null;
    return branches.find((b: any) => b.id === branchId);
  }, [branches, branchId]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      return {
        date,
        dateStr: format(date, 'yyyy-MM-dd'),
        shortName: format(date, 'EEE', { locale: tr }),
        dayNum: format(date, 'd'),
      };
    });
  }, [weekStart]);

  const alreadyAssigned = useMemo(() => {
    const result: Record<string, Set<string>> = {};
    weekDays.forEach(day => {
      result[day.dateStr] = new Set();
      if (Array.isArray(existingShifts)) {
        existingShifts
          .filter((s: any) => s.shiftDate === day.dateStr)
          .forEach((s: any) => result[day.dateStr].add(String(s.assignedToId)));
      }
    });
    return result;
  }, [weekDays, existingShifts]);

  const generateAIPlan = () => {
    setIsGenerating(true);
    
    const newShifts: any[] = [];
    const employeeShiftMap: Record<string, Set<string>> = {}; // empId -> Set<dateStr>
    const employeeHoursMap: Record<string, number> = {}; // empId -> total hours
    
    // Initialize employee maps
    employees.forEach((emp: any) => {
      const empId = String(emp.id);
      employeeShiftMap[empId] = new Set();
      employeeHoursMap[empId] = 0;
      
      if (Array.isArray(existingShifts)) {
        existingShifts
          .filter((s: any) => String(s.assignedToId) === empId && 
            weekDays.some(d => d.dateStr === s.shiftDate))
          .forEach((s: any) => {
            employeeShiftMap[empId].add(s.shiftDate);
            employeeHoursMap[empId] += 8;
          });
      }
    });
    
    const openingHour = branch?.openingHours ? parseInt(branch.openingHours.split(':')[0]) : 7;
    const closingHour = branch?.closingHours ? parseInt(branch.closingHours.split(':')[0]) : 1;
    
    // Build all shift slots for the week
    const allSlots: any[] = [];
    weekDays.forEach((day) => {
      allSlots.push({
        date: day.dateStr,
        dayDate: day.date,
        name: 'Sabah',
        startHour: openingHour,
        endHour: openingHour + 8,
        shiftType: 'morning',
        durationHours: 7.5
      });
      allSlots.push({
        date: day.dateStr,
        dayDate: day.date,
        name: 'Akşam',
        startHour: openingHour + 8,
        endHour: closingHour === 1 ? openingHour + 16 : closingHour,
        shiftType: 'evening',
        durationHours: 7.5
      });
    });
    
    const getSkillScore = (emp: any) => {
      let score = emp.skillScore || 50;
      if (emp.role === 'supervisor') score += 30;
      else if (emp.role === 'supervisor_buddy') score += 20;
      else if (emp.role === 'barista') score += 10;
      else if (emp.role === 'bar_buddy') score += 5;
      else if (emp.role === 'stajyer') score -= 10;
      return Math.min(100, Math.max(0, score));
    };
    
    const sortedEmployees = [...employees].sort((a, b) => getSkillScore(b) - getSkillScore(a));
    
    const assignShift = (emp: any, slot: any) => {
      const empId = String(emp.id);
      const endHour = slot.endHour > 24 ? slot.endHour - 24 : slot.endHour;
      const breakStartH = slot.startHour + 4;
      
      newShifts.push({
        shiftDate: slot.date,
        startTime: `${String(slot.startHour).padStart(2, '0')}:00:00`,
        endTime: `${String(endHour).padStart(2, '0')}:00:00`,
        breakStartTime: `${String(breakStartH).padStart(2, '0')}:00:00`,
        breakEndTime: `${String(breakStartH + 1).padStart(2, '0')}:00:00`,
        shiftType: slot.shiftType,
        assignedToId: empId,
        status: 'draft',
        branchId,
        employeeName: emp.fullName || `${emp.firstName} ${emp.lastName}`,
        slotName: slot.name,
      });
      
      employeeShiftMap[empId].add(slot.date);
      employeeHoursMap[empId] += slot.durationHours;
    };
    
    // Core algorithm: Full-time 45h/week (6 days x 7.5h), 1 day off
    const fullTimeHours = 45;
    const fullTimeDays = 6;
    const partTimeHours = 25;
    
    const maxHoursPerEmployee = (emp: any) => {
      if (emp.employmentType === 'parttime') return partTimeHours;
      return emp.weeklyHours || fullTimeHours;
    };
    
    const maxDaysPerEmployee = (emp: any) => {
      if (emp.employmentType === 'parttime') return 3; // Part-time: 3 days
      return fullTimeDays; // Full-time: 6 days
    };
    
    // Step 1: Assign each employee exactly 6 days (or 3 for part-time) - 1 per day only
    for (const emp of sortedEmployees) {
      const empId = String(emp.id);
      let daysAssigned = employeeShiftMap[empId].size;
      let hoursAssigned = employeeHoursMap[empId];
      const maxHours = maxHoursPerEmployee(emp);
      const maxDays = maxDaysPerEmployee(emp);
      
      // Process days in order, assign max 1 slot per day per employee
      const daySlotMap: Record<string, any[]> = {};
      allSlots.forEach(slot => {
        if (!daySlotMap[slot.date]) daySlotMap[slot.date] = [];
        daySlotMap[slot.date].push(slot);
      });
      
      for (const dateStr of Object.keys(daySlotMap).sort()) {
        if (daysAssigned >= maxDays) break;
        if (hoursAssigned >= maxHours) break;
        if (employeeShiftMap[empId].has(dateStr)) continue; // Already assigned this day
        
        // Assign to first available slot of the day (sabah/morning preferred)
        const daySlots = daySlotMap[dateStr];
        const availableSlot = daySlots[0]; // Sabah vardiyası
        
        assignShift(emp, availableSlot);
        daysAssigned++;
        hoursAssigned += availableSlot.durationHours;
      }
    }
    
    // Step 2: Fill empty slots with second person (but not if employee already assigned that day)
    for (const slot of allSlots) {
      const peopleInSlot = newShifts.filter(s => s.shiftDate === slot.date && s.slotName === slot.name).length;
      
      for (const emp of sortedEmployees) {
        if (peopleInSlot >= 2) break; // Slot full
        
        const empId = String(emp.id);
        const maxHours = maxHoursPerEmployee(emp);
        const maxDays = maxDaysPerEmployee(emp);
        
        // CRITICAL: Do NOT assign if employee already assigned any shift on this day
        if (!employeeShiftMap[empId].has(slot.date) && 
            employeeShiftMap[empId].size < maxDays && 
            employeeHoursMap[empId] < maxHours) {
          assignShift(emp, slot);
        }
      }
    }

    setTimeout(() => {
      setPreview(newShifts);
      setIsGenerating(false);
      if (newShifts.length === 0) {
        toast({ title: "Uyarı", description: "Yeterli personel bulunamadı", variant: "destructive" });
      }
    }, 500);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const shiftsToCreate = preview.map(s => ({
        shiftDate: s.shiftDate,
        startTime: s.startTime,
        endTime: s.endTime,
        breakStartTime: s.breakStartTime,
        breakEndTime: s.breakEndTime,
        shiftType: s.shiftType,
        assignedToId: s.assignedToId,
        status: s.status,
        branchId: s.branchId,
      }));

      return apiRequest('POST', '/api/shifts/bulk-create', { shifts: shiftsToCreate });
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: `${preview.length} vardiya oluşturuldu` });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      setPreview([]);
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const handleClose = () => {
    setPreview([]);
    onClose();
  };

  const previewByDay = useMemo(() => {
    const result: Record<string, any[]> = {};
    weekDays.forEach(day => {
      result[day.dateStr] = preview.filter(s => s.shiftDate === day.dateStr);
    });
    return result;
  }, [preview, weekDays]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            AI Haftalık Plan
          </DialogTitle>
          <DialogDescription>
            Tüm personeli haftaya otomatik olarak dağıt (maks. 5 gün/kişi)
          </DialogDescription>
        </DialogHeader>

        {preview.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {employees.length} personel için haftalık plan oluştur
            </p>
            <Button 
              onClick={generateAIPlan} 
              disabled={isGenerating || employees.length === 0}
              className="gap-2"
              data-testid="button-generate-ai"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              Plan Oluştur
            </Button>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            <div className="text-sm font-medium text-green-600 dark:text-green-400">
              {preview.length} vardiya oluşturulacak
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map(day => (
                <div key={day.dateStr} className="text-center">
                  <div className="text-xs font-medium text-muted-foreground">{day.shortName}</div>
                  <div className="text-sm font-bold">{day.dayNum}</div>
                  <div className="mt-1 space-y-0.5">
                    {previewByDay[day.dateStr].map((shift, idx) => (
                      <div 
                        key={idx}
                        className="text-[10px] bg-primary/10 rounded px-1 py-0.5 truncate"
                        title={shift.employeeName}
                      >
                        {shift.employeeName?.split(' ')[0]}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            İptal
          </Button>
          {preview.length > 0 && (
            <>
              <Button variant="outline" onClick={generateAIPlan} disabled={isGenerating}>
                Yeniden Oluştur
              </Button>
              <Button 
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                data-testid="button-save-ai-plan"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Kaydet
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
