import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfWeek, addDays, isToday } from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Sparkles, X, Loader2, Wand2, UserPlus } from "lucide-react";

export default function VardiyaPlanlama() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [editingShiftId, setEditingShiftId] = useState<number | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);

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
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAddModalOpen(true)} className="gap-2" data-testid="button-add-shift">
            <UserPlus className="w-4 h-4" />
            Vardiya Ekle
          </Button>
          <Button onClick={() => setAiModalOpen(true)} className="gap-2" data-testid="button-ai-plan">
            <Wand2 className="w-4 h-4" />
            AI Planla
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
  
  const shift = useMemo(() => {
    if (!shifts || !Array.isArray(shifts) || !shiftId) return null;
    return shifts.find((s: any) => s.id === shiftId);
  }, [shifts, shiftId]);

  const [startTime, setStartTime] = useState('');

  const emp = useMemo(() => {
    if (!shift) return null;
    return employees.find((e: any) => e.id === shift.assignedToId);
  }, [shift, employees]);

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
      const endH = (h + 8) % 24;
      const breakStartH = (h + 3) % 24;
      const breakEndH = (h + 4) % 24;
      
      return apiRequest('PATCH', `/api/shifts/${shiftId}`, {
        startTime: `${startTime}:00`,
        endTime: `${String(endH).padStart(2, '0')}:30:00`,
        breakStartTime: `${String(breakStartH).padStart(2, '0')}:30:00`,
        breakEndTime: `${String(breakEndH).padStart(2, '0')}:30:00`,
        shiftType: h < 12 ? 'morning' : 'evening',
      });
    },
    onSuccess: () => {
      toast({ title: "Güncellendi" });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      onClose();
    },
    onError: (err: Error) => toast({ title: "Hata", description: err.message, variant: "destructive" }),
  });

  if (!shift) return null;

  if (!startTime && shift.startTime) {
    setStartTime(shift.startTime.substring(0, 5));
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Vardiya Düzenle</DialogTitle>
          <DialogDescription>{emp?.fullName || emp?.firstName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Başlangıç Saati</label>
            <select
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
              data-testid="edit-start-time"
            >
              {Array.from({ length: 13 }, (_, i) => {
                const h = 7 + i;
                const t = `${String(h).padStart(2, '0')}:00`;
                return <option key={t} value={t}>{t}</option>;
              })}
            </select>
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

  const resetForm = () => {
    setSelectedEmployee('');
    setSelectedDays([]);
    setStartTime('08:00');
    setBreakTime('11:30');
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
      }));

      return apiRequest('POST', '/api/shifts/bulk-create', { shifts });
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: `${selectedDays.length} vardiya oluşturuldu` });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
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
    const employeeWorkDays: Record<string, number> = {};
    
    employees.forEach((emp: any) => {
      let existingCount = 0;
      if (Array.isArray(existingShifts)) {
        existingCount = existingShifts.filter((s: any) => 
          String(s.assignedToId) === String(emp.id) &&
          weekDays.some(d => d.dateStr === s.shiftDate)
        ).length;
      }
      employeeWorkDays[emp.id] = existingCount;
    });

    weekDays.forEach((day) => {
      const availableEmps = employees.filter((emp: any) => 
        !alreadyAssigned[day.dateStr].has(String(emp.id)) &&
        employeeWorkDays[emp.id] < 5
      );

      availableEmps.forEach((emp: any) => {
        if (employeeWorkDays[emp.id] < 5) {
          const startHour = 8 + Math.floor(Math.random() * 4);
          const endHour = startHour + 8;
          const breakHour = startHour + 3;
          const shiftType = startHour < 12 ? 'morning' : 'evening';

          newShifts.push({
            shiftDate: day.dateStr,
            startTime: `${String(startHour).padStart(2, '0')}:00:00`,
            endTime: `${String(endHour % 24).padStart(2, '0')}:30:00`,
            breakStartTime: `${String(breakHour).padStart(2, '0')}:30:00`,
            breakEndTime: `${String((breakHour + 1) % 24).padStart(2, '0')}:30:00`,
            shiftType,
            assignedToId: String(emp.id),
            status: 'draft',
            branchId,
            employeeName: emp.fullName || `${emp.firstName} ${emp.lastName}`,
          });
          
          employeeWorkDays[emp.id]++;
        }
      });
    });

    setTimeout(() => {
      setPreview(newShifts);
      setIsGenerating(false);
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
