import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfWeek, addDays, isToday, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Sparkles, X, Loader2, Wand2, UserPlus, Trash2, AlertTriangle, Calendar, GripVertical } from "lucide-react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";

// Draggable Shift Chip Component
function DraggableShiftChip({ shift, employee, canEdit, onClick }: {
  shift: any;
  employee: any;
  canEdit: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `shift-${shift.id}`,
    data: { shift, employee },
    disabled: !canEdit,
  });

  const hour = parseInt(shift.startTime?.split(':')[0] || '0');
  const colorClass = hour < 12 
    ? 'bg-amber-100 dark:bg-amber-900/50 border-amber-300 dark:border-amber-700' 
    : 'bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700';

  const name = employee?.fullName || employee?.firstName || 'Bilinmiyor';

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.5 : 1,
      }}
      className={`w-full p-1.5 rounded border text-left text-xs transition-all ${colorClass} ${canEdit ? 'cursor-grab active:cursor-grabbing' : 'opacity-60'}`}
      data-testid={`shift-chip-${shift.id}`}
    >
      <div className="flex items-center gap-1">
        {canEdit && (
          <div {...listeners} {...attributes} className="cursor-grab">
            <GripVertical className="w-3 h-3 text-muted-foreground" />
          </div>
        )}
        <button onClick={onClick} disabled={!canEdit} className="flex-1 text-left min-w-0">
          <div className="font-medium truncate">{name}</div>
          <div className="opacity-70">
            {shift.startTime?.substring(0, 5)}-{shift.endTime?.substring(0, 5)}
          </div>
        </button>
      </div>
    </div>
  );
}

// Droppable Day Cell Component
function DroppableDayCell({ dateStr, children, isOver }: {
  dateStr: string;
  children: React.ReactNode;
  isOver?: boolean;
}) {
  const { setNodeRef, isOver: dropIsOver } = useDroppable({
    id: `day-${dateStr}`,
    data: { dateStr },
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[80px] p-2 space-y-1 transition-colors ${
        dropIsOver ? 'bg-primary/10 ring-2 ring-primary ring-inset' : ''
      }`}
      data-testid={`drop-zone-${dateStr}`}
    >
      {children}
    </div>
  );
}

export default function VardiyaPlanlama() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [editingShiftId, setEditingShiftId] = useState<number | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [periodWeeks, setPeriodWeeks] = useState<1 | 2>(1);
  const [activeShift, setActiveShift] = useState<any>(null);

  // Drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Role-based access: Only these roles can edit shifts
  const editableRoles = ['supervisor', 'supervisor_buddy', 'destek', 'muhasebe', 'coach', 'teknik', 'satinalma', 'fabrika', 'yatirimci_hq', 'admin'];
  const canEditShifts = user?.role && editableRoles.includes(user.role);

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

  // Period days: 7 for 1 week, 14 for 2 weeks
  const periodDays = useMemo(() => {
    const totalDays = periodWeeks * 7;
    return Array.from({ length: totalDays }, (_, i) => {
      const date = addDays(weekStart, i);
      return {
        date,
        dateStr: format(date, 'yyyy-MM-dd'),
        dayName: format(date, 'EEEE', { locale: tr }),
        shortName: format(date, 'EEE', { locale: tr }),
        dayNum: format(date, 'd'),
        weekIndex: Math.floor(i / 7),
      };
    });
  }, [weekStart, periodWeeks]);

  // For backward compatibility
  const weekDays = periodDays.filter(d => d.weekIndex === 0);

  const periodShifts = useMemo(() => {
    if (!shifts || !Array.isArray(shifts)) return {};
    const byDate: Record<string, any[]> = {};
    periodDays.forEach(day => {
      byDate[day.dateStr] = shifts.filter((s: any) => s.shiftDate === day.dateStr);
    });
    return byDate;
  }, [shifts, periodDays]);

  // Alias for backward compatibility
  const weekShifts = periodShifts;

  // Conflict detection: check if employee already has a shift on given date
  const detectConflict = useCallback((employeeId: string, targetDate: string, excludeShiftId?: number) => {
    if (!shifts || !Array.isArray(shifts)) return null;
    // Normalize IDs to strings for comparison (backend may return different types)
    const normalizedEmployeeId = String(employeeId);
    const conflictingShift = shifts.find((s: any) => 
      s.shiftDate === targetDate && 
      String(s.assignedToId) === normalizedEmployeeId && 
      s.id !== excludeShiftId
    );
    return conflictingShift;
  }, [shifts]);

  // Gap detection: find days with no shifts
  const gapsInPeriod = useMemo(() => {
    const gaps: string[] = [];
    periodDays.forEach(day => {
      const dayShifts = periodShifts[day.dateStr] || [];
      if (dayShifts.length === 0) {
        gaps.push(day.dateStr);
      }
    });
    return gaps;
  }, [periodDays, periodShifts]);

  const previousWeek = () => setWeekStart(addDays(weekStart, -7 * periodWeeks));
  const nextWeek = () => setWeekStart(addDays(weekStart, 7 * periodWeeks));
  const goToToday = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Drag-drop mutation
  const moveShiftMutation = useMutation({
    mutationFn: async ({ shiftId, newDate }: { shiftId: number; newDate: string }) => {
      return apiRequest('PATCH', `/api/shifts/${shiftId}`, { shiftDate: newDate });
    },
    onSuccess: () => {
      toast({ title: "Taşındı", description: "Vardiya yeni güne taşındı" });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
    },
    onError: (err: Error) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveShift(null);
    const { active, over } = event;
    
    if (!over || !active.data.current) return;
    
    const shift = active.data.current.shift;
    const targetDateStr = over.data.current?.dateStr;
    
    if (!targetDateStr || shift.shiftDate === targetDateStr) return;
    
    // Check for conflict
    const conflict = detectConflict(shift.assignedToId, targetDateStr, shift.id);
    if (conflict) {
      toast({ 
        title: "Çakışma Tespit Edildi", 
        description: `Bu personel ${targetDateStr} tarihinde zaten başka bir vardiyaya atanmış.`,
        variant: "destructive" 
      });
      return;
    }
    
    moveShiftMutation.mutate({ shiftId: shift.id, newDate: targetDateStr });
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current) {
      setActiveShift(event.active.data.current.shift);
    }
  };

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

  // End date for display
  const periodEndDate = addDays(weekStart, periodWeeks * 7 - 1);

  return (
    <div className="flex flex-col gap-4 p-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Vardiya Planlama</h1>
          <p className="text-muted-foreground text-sm">
            {format(weekStart, "d MMM", { locale: tr })} - {format(periodEndDate, "d MMM yyyy", { locale: tr })}
          </p>
        </div>
        
        <div className="flex gap-2 flex-wrap items-center">
          {/* Period Toggle */}
          <div className="flex border rounded-md overflow-hidden">
            <button
              onClick={() => setPeriodWeeks(1)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                periodWeeks === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted hover-elevate'
              }`}
              data-testid="toggle-1-week"
            >
              1 Hafta
            </button>
            <button
              onClick={() => setPeriodWeeks(2)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                periodWeeks === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted hover-elevate'
              }`}
              data-testid="toggle-2-weeks"
            >
              2 Hafta
            </button>
          </div>

          {canEditShifts && (
            <>
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
                Sıfırla
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Gap Warning */}
      {gapsInPeriod.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="text-amber-800 dark:text-amber-200">
            <strong>{gapsInPeriod.length} gün</strong> vardiya atanmamış: {gapsInPeriod.slice(0, 3).map(d => format(parseISO(d), "d MMM", { locale: tr })).join(", ")}
            {gapsInPeriod.length > 3 && ` ve ${gapsInPeriod.length - 3} daha...`}
          </span>
        </div>
      )}

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
        <span className="text-xs text-muted-foreground ml-2">
          {canEditShifts && "Sürükle-bırak ile vardiyaları taşıyabilirsiniz"}
        </span>
      </div>

      {/* Calendar Grid with Drag-Drop */}
      {shiftsLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {/* Week Headers for 2-week view */}
          {periodWeeks === 2 && (
            <div className="grid grid-cols-2 gap-4 mb-2">
              <div className="text-center text-sm font-medium text-muted-foreground">
                1. Hafta: {format(weekStart, "d MMM", { locale: tr })} - {format(addDays(weekStart, 6), "d MMM", { locale: tr })}
              </div>
              <div className="text-center text-sm font-medium text-muted-foreground">
                2. Hafta: {format(addDays(weekStart, 7), "d MMM", { locale: tr })} - {format(addDays(weekStart, 13), "d MMM", { locale: tr })}
              </div>
            </div>
          )}

          <div className={`grid gap-2 ${periodWeeks === 2 ? 'grid-cols-7 md:grid-cols-14' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-7'}`}>
            {periodDays.map((day) => {
              const isGap = gapsInPeriod.includes(day.dateStr);
              
              return (
                <Card 
                  key={day.dateStr}
                  className={`min-h-[120px] ${isToday(day.date) ? 'ring-2 ring-primary' : ''} ${isGap ? 'border-amber-300 dark:border-amber-700' : ''}`}
                >
                  <div className={`p-2 border-b text-center ${isGap ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-muted/30'}`}>
                    <div className="text-xs text-muted-foreground">{day.shortName}</div>
                    <div className="text-lg font-bold">{day.dayNum}</div>
                  </div>

                  <DroppableDayCell dateStr={day.dateStr}>
                    {(periodShifts[day.dateStr] || []).length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">-</p>
                    ) : (
                      (periodShifts[day.dateStr] || []).map((shift: any) => {
                        const emp = branchEmployees.find((e: any) => e.id === shift.assignedToId);
                        
                        return (
                          <DraggableShiftChip
                            key={shift.id}
                            shift={shift}
                            employee={emp}
                            canEdit={canEditShifts || false}
                            onClick={() => { if (canEditShifts) setEditingShiftId(shift.id); }}
                          />
                        );
                      })
                    )}
                  </DroppableDayCell>
                </Card>
              );
            })}
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeShift && (
              <div className="p-2 bg-primary text-primary-foreground rounded shadow-lg text-xs">
                <div className="font-medium">Taşınıyor...</div>
                <div>{activeShift.startTime?.substring(0, 5)}-{activeShift.endTime?.substring(0, 5)}</div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Edit Shift Modal */}
      {editingShiftId && canEditShifts && (
        <ShiftEditModal
          open={true}
          shiftId={editingShiftId}
          employees={branchEmployees}
          onClose={() => setEditingShiftId(null)}
          canEdit={canEditShifts}
        />
      )}

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

function ShiftEditModal({ open, shiftId, employees, onClose, canEdit = true }: {
  open: boolean;
  shiftId: number | null;
  employees: any[];
  onClose: () => void;
  canEdit?: boolean;
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
          {canEdit && (
            <>
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
            </>
          )}
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
  const [endTime, setEndTime] = useState('16:30');
  const [breakTime, setBreakTime] = useState('12:00');
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState<'all' | 'fulltime' | 'parttime'>('all');
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

  // Calculate weekly hours for each employee from existing shifts
  const getEmployeeWeeklyHours = useCallback((employeeId: string) => {
    if (!Array.isArray(existingShifts)) return 0;
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const weekEndStr = format(addDays(weekStart, 6), 'yyyy-MM-dd');
    
    const employeeShifts = existingShifts.filter((s: any) => 
      String(s.assignedToId) === employeeId && 
      s.shiftDate >= weekStartStr && 
      s.shiftDate <= weekEndStr
    );
    
    let totalMinutes = 0;
    employeeShifts.forEach((shift: any) => {
      if (shift.startTime && shift.endTime) {
        const [startH, startM] = shift.startTime.split(':').map(Number);
        const [endH, endM] = shift.endTime.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        totalMinutes += endMinutes - startMinutes;
      }
    });
    
    return Math.round(totalMinutes / 60 * 10) / 10; // Hours with 1 decimal
  }, [existingShifts, weekStart]);

  // Calculate new shift hours
  const calculateShiftHours = useCallback(() => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return (endMinutes - startMinutes) / 60;
  }, [startTime, endTime]);

  const availableEmployees = useMemo(() => {
    let filtered = employees;
    
    // Filter by employment type
    if (employeeTypeFilter !== 'all') {
      filtered = filtered.filter((emp: any) => emp.employmentType === employeeTypeFilter);
    }
    
    if (!selectedDays.length) return filtered;
    
    const assignedEmployeeIds = new Set<string>();
    selectedDays.forEach(day => {
      const dayShifts = Array.isArray(existingShifts) 
        ? existingShifts.filter((s: any) => s.shiftDate === day)
        : [];
      dayShifts.forEach((s: any) => {
        if (s.assignedToId) assignedEmployeeIds.add(String(s.assignedToId));
      });
    });

    return filtered.filter((emp: any) => !assignedEmployeeIds.has(String(emp.id)));
  }, [employees, selectedDays, existingShifts, employeeTypeFilter]);

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
    setEndTime('16:30');
    setBreakTime('12:00');
    setEmployeeTypeFilter('all');
    setChecklist1('');
    setChecklist2('');
    setChecklist3('');
    setSelectedTask('');
    setQuickTaskText('');
  };

  // Check if employee would exceed weekly limit with new shifts
  const checkHoursLimit = useCallback(() => {
    if (!selectedEmployee) return null;
    
    const emp = employees.find((e: any) => String(e.id) === selectedEmployee);
    if (!emp) return null;
    
    const currentHours = getEmployeeWeeklyHours(selectedEmployee);
    const newShiftHours = calculateShiftHours() * selectedDays.length;
    const totalHours = currentHours + newShiftHours;
    const weeklyLimit = emp.weeklyHours || (emp.employmentType === 'parttime' ? 25 : 45);
    
    return {
      currentHours,
      newShiftHours,
      totalHours,
      weeklyLimit,
      exceedsLimit: totalHours > weeklyLimit,
      employee: emp,
    };
  }, [selectedEmployee, employees, getEmployeeWeeklyHours, calculateShiftHours, selectedDays]);

  const hoursCheck = checkHoursLimit();

  const createMutation = useMutation({
    mutationFn: async () => {
      const [startH] = startTime.split(':').map(Number);
      const [bH] = breakTime.split(':').map(Number);
      const breakEndH = (bH + 1) % 24;
      const shiftType = startH < 12 ? 'morning' : 'evening';

      const shifts = selectedDays.map(dateStr => ({
        shiftDate: dateStr,
        startTime: `${startTime}:00`,
        endTime: `${endTime}:00`,
        breakStartTime: `${breakTime}:00`,
        breakEndTime: `${String(breakEndH).padStart(2, '0')}:00:00`,
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

          {/* Employee Type Filter */}
          <div>
            <label className="text-sm font-medium">Personel Tipi</label>
            <div className="flex gap-1 mt-1">
              {[
                { value: 'all', label: 'Tümü' },
                { value: 'fulltime', label: 'Tam Zamanlı' },
                { value: 'parttime', label: 'Part-time' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEmployeeTypeFilter(opt.value as 'all' | 'fulltime' | 'parttime')}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    employeeTypeFilter === opt.value 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                  data-testid={`filter-${opt.value}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Employee Selection - filtered by selected days and type */}
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
                  availableEmployees.map((emp: any) => {
                    const weeklyHours = getEmployeeWeeklyHours(String(emp.id));
                    const limit = emp.weeklyHours || (emp.employmentType === 'parttime' ? 25 : 45);
                    const isPartTime = emp.employmentType === 'parttime';
                    return (
                      <SelectItem key={emp.id} value={String(emp.id)}>
                        <div className="flex items-center gap-2 w-full">
                          <span className="flex-1">{emp.fullName || `${emp.firstName} ${emp.lastName}`}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${isPartTime ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                            {isPartTime ? 'PT' : 'FT'}
                          </span>
                          <span className="text-xs text-muted-foreground">{weeklyHours}/{limit}s</span>
                        </div>
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Hours Warning */}
          {hoursCheck && (
            <div className={`p-3 rounded-md text-sm ${hoursCheck.exceedsLimit ? 'bg-destructive/10 border border-destructive/30' : 'bg-muted'}`}>
              <div className="flex items-center justify-between">
                <span>Mevcut: {hoursCheck.currentHours}s</span>
                <span>Yeni: +{hoursCheck.newShiftHours.toFixed(1)}s</span>
                <span className={hoursCheck.exceedsLimit ? 'text-destructive font-bold' : 'font-medium'}>
                  Toplam: {hoursCheck.totalHours.toFixed(1)}/{hoursCheck.weeklyLimit}s
                </span>
              </div>
              {hoursCheck.exceedsLimit && (
                <p className="text-destructive text-xs mt-1">
                  Haftalık limit aşılıyor! ({hoursCheck.employee.employmentType === 'parttime' ? 'Part-time' : 'Tam zamanlı'})
                </p>
              )}
            </div>
          )}

          {/* Time Selection - Flexible */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-sm font-medium">Başlangıç</label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1"
                data-testid="input-start-time"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Bitiş</label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1"
                data-testid="input-end-time"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Mola</label>
              <Input
                type="time"
                value={breakTime}
                onChange={(e) => setBreakTime(e.target.value)}
                className="mt-1"
                data-testid="input-break-time"
              />
            </div>
          </div>
          
          {/* Shift Duration Display */}
          <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
            <span>Vardiya Süresi:</span>
            <span className="font-medium">{calculateShiftHours().toFixed(1)} saat</span>
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
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isCached, setIsCached] = useState(false);

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

  // AI-powered shift plan generation via backend
  const generateAIPlan = async (skipCache: boolean = false) => {
    setIsGenerating(true);
    setAiSummary('');
    
    try {
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      const url = `/api/shifts/recommendations?weekStart=${weekStartStr}&branchId=${branchId}${skipCache ? '&skipCache=true' : ''}`;
      
      const response = await fetch(url, { credentials: 'include' });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'AI planlama başarısız');
      }
      
      const data = await response.json();
      
      if (!data.recommendations || data.recommendations.length === 0) {
        toast({ 
          title: "Uyarı", 
          description: "AI yeterli öneri oluşturamadı. Personel bilgilerini kontrol edin.", 
          variant: "destructive" 
        });
        setPreview([]);
        return;
      }
      
      // Map AI recommendations to preview format with employee names
      const mappedShifts = data.recommendations.map((rec: any) => {
        const emp = employees.find((e: any) => String(e.id) === String(rec.assignedToId));
        return {
          ...rec,
          branchId,
          employeeName: emp?.fullName || emp?.firstName || 'Bilinmeyen',
          slotName: rec.shiftType === 'morning' ? 'Sabah' : rec.shiftType === 'evening' ? 'Akşam' : 'Gece',
        };
      });
      
      setPreview(mappedShifts);
      setAiSummary(data.summary || '');
      setIsCached(data.cached || false);
      
      toast({ 
        title: data.cached ? "Önbellek Kullanıldı" : "AI Plan Hazır", 
        description: `${mappedShifts.length} vardiya önerisi oluşturuldu` 
      });
    } catch (error: any) {
      console.error("AI plan error:", error);
      toast({ 
        title: "AI Hatası", 
        description: error.message || "Planlama başarısız", 
        variant: "destructive" 
      });
    } finally {
      setIsGenerating(false);
    }
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
              {employees.length} personel için AI destekli haftalık plan oluştur
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              OpenAI ile optimal vardiya dağılımı, stajyer-barista eşleşmesi ve 45 saat limiti kontrolü
            </p>
            <Button 
              onClick={() => generateAIPlan(false)} 
              disabled={isGenerating || employees.length === 0}
              className="gap-2"
              data-testid="button-generate-ai"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              {isGenerating ? 'AI Düşünüyor...' : 'AI Plan Oluştur'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-green-600 dark:text-green-400">
                {preview.length} vardiya oluşturulacak
              </div>
              {isCached && (
                <Badge variant="secondary" className="text-xs">Önbellekten</Badge>
              )}
            </div>
            
            {aiSummary && (
              <div className="p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                <strong>AI Özeti:</strong> {aiSummary}
              </div>
            )}
            
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map(day => (
                <div key={day.dateStr} className="text-center">
                  <div className="text-xs font-medium text-muted-foreground">{day.shortName}</div>
                  <div className="text-sm font-bold">{day.dayNum}</div>
                  <div className="mt-1 space-y-0.5">
                    {previewByDay[day.dateStr].map((shift, idx) => (
                      <div 
                        key={idx}
                        className={`text-[10px] rounded px-1 py-0.5 truncate ${
                          shift.shiftType === 'morning' 
                            ? 'bg-amber-100 dark:bg-amber-900/50' 
                            : shift.shiftType === 'evening'
                            ? 'bg-blue-100 dark:bg-blue-900/50'
                            : 'bg-purple-100 dark:bg-purple-900/50'
                        }`}
                        title={`${shift.employeeName} - ${shift.slotName}`}
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
              <Button variant="outline" onClick={() => generateAIPlan(true)} disabled={isGenerating}>
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
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
