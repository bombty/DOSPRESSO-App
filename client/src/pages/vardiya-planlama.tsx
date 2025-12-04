import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format, startOfWeek, addDays, isToday } from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Sparkles, X } from "lucide-react";

export default function VardiyaPlanlama() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [editingShiftId, setEditingShiftId] = useState<number | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const { data: shifts } = useQuery({
    queryKey: ['/api/shifts', format(weekStart, 'yyyy-MM-dd')],
  });

  const { data: allEmployees } = useQuery({
    queryKey: ['/api/employees'],
  });

  const branchEmployees = (Array.isArray(allEmployees) ? allEmployees : [])?.filter((emp: any) => emp.branchId === user?.branchId) || [];

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
      byDate[day.dateStr] = shifts.filter((s: any) => s.shiftDate === day.dateStr) || [];
    });
    return byDate;
  }, [shifts, weekDays]);

  const previousWeek = () => setWeekStart(addDays(weekStart, -7));
  const nextWeek = () => setWeekStart(addDays(weekStart, 7));
  const goToToday = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const getShiftBgColor = (shift: any) => {
    const hour = parseInt(shift.startTime?.split(':')[0] || '0');
    return hour < 12 ? 'bg-yellow-100 dark:bg-yellow-900' : 'bg-blue-100 dark:bg-blue-900';
  };

  return (
    <div className="flex flex-col gap-4 p-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Haftalık Vardiya Takvimi
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {format(weekStart, "d MMMM", { locale: tr })} - {format(addDays(weekStart, 6), "d MMMM yyyy", { locale: tr })}
          </p>
        </div>
        
        <Button 
          onClick={() => setAiModalOpen(true)} 
          className="gap-2 w-fit"
          data-testid="button-ai-plan"
        >
          <Sparkles className="w-4 h-4" />
          AI Planla
        </Button>
      </div>

      {/* Week Navigation */}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={previousWeek} data-testid="button-prev-week">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={goToToday} data-testid="button-today">
          Bugün
        </Button>
        <Button size="sm" variant="outline" onClick={nextWeek} data-testid="button-next-week">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Weekly Calendar - Simple Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2">
        {weekDays.map((day) => (
          <Card 
            key={day.dateStr}
            className={`flex flex-col ${isToday(day.date) ? 'border-primary/50 bg-primary/5' : ''}`}
          >
            {/* Day Header */}
            <div className="p-2 border-b text-center">
              <div className="text-xs font-semibold text-muted-foreground">{day.shortName}</div>
              <div className="text-sm font-bold">{day.dayNum}</div>
            </div>

            {/* Shifts List */}
            <CardContent className="flex-1 p-2 space-y-1.5 overflow-y-auto">
              {(weekShifts[day.dateStr] || []).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">-</p>
              ) : (
                (weekShifts[day.dateStr] || []).map((shift: any) => {
                  const emp = branchEmployees.find((e: any) => e.id === shift.assignedToId);
                  const empName = emp?.fullName || `${emp?.firstName} ${emp?.lastName}`;
                  
                  return (
                    <button
                      key={shift.id}
                      onClick={() => setEditingShiftId(shift.id)}
                      className={`w-full p-1.5 rounded-md text-left text-xs hover:shadow-sm transition-all ${getShiftBgColor(shift)}`}
                      data-testid={`shift-${shift.id}`}
                    >
                      <div className="font-semibold truncate">{empName}</div>
                      <div className="text-xs opacity-75">
                        {shift.startTime?.substring(0, 5)} - {shift.endTime?.substring(0, 5)}
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Modal */}
      <ShiftEditModal
        open={!!editingShiftId}
        shiftId={editingShiftId}
        onOpenChange={() => setEditingShiftId(null)}
      />

      {/* AI Planlama Modal */}
      <AIShiftPlannerModal 
        open={aiModalOpen} 
        onOpenChange={setAiModalOpen}
        weekStart={weekStart}
        employees={branchEmployees || []}
        branchId={user?.branchId || 0}
      />
    </div>
  );
}

function ShiftEditModal({ open, shiftId, onOpenChange }: { open: boolean; shiftId: number | null; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: shifts } = useQuery({ queryKey: ['/api/shifts'] });
  
  const shift = (Array.isArray(shifts) ? shifts : []).find((s: any) => s.id === shiftId);
  const [formData, setFormData] = useState({
    startTime: '',
    endTime: '',
    breakStartTime: '',
    breakEndTime: '',
  });

  const handleStartTimeChange = (time: string) => {
    const [hours, mins] = time.split(':').map(Number);
    const endHours = (hours + 8) % 24;
    const endTime = `${String(endHours).padStart(2, '0')}:30`;
    const breakStartHours = (hours + 3) % 24;
    const breakEndHours = (hours + 4) % 24;
    const breakStart = `${String(breakStartHours).padStart(2, '0')}:30`;
    const breakEnd = `${String(breakEndHours).padStart(2, '0')}:30`;

    setFormData({ startTime: time, endTime, breakStartTime: breakStart, breakEndTime: breakEnd });
  };

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!shiftId) return;
      await apiRequest('DELETE', `/api/shifts/${shiftId}`);
    },
    onSuccess: () => {
      toast({ title: "Basarili", description: "Vardiya silindi" });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!shiftId) return;
      await apiRequest('PATCH', `/api/shifts/${shiftId}`, {
        startTime: `${formData.startTime}:00`,
        endTime: `${formData.endTime}:00`,
        breakStartTime: `${formData.breakStartTime}:00`,
        breakEndTime: `${formData.breakEndTime}:00`,
      });
    },
    onSuccess: () => {
      toast({ title: "Basarili", description: "Vardiya guncellendi" });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  if (!shift) return null;

  if (!formData.startTime) {
    setFormData({
      startTime: shift.startTime?.substring(0, 5) || '08:00',
      endTime: shift.endTime?.substring(0, 5) || '16:30',
      breakStartTime: shift.breakStartTime?.substring(0, 5) || '11:30',
      breakEndTime: shift.breakEndTime?.substring(0, 5) || '12:30',
    });
  }

  const emp = shift.assignedTo;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Vardiya Duzenle</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-sm font-semibold">{emp?.fullName}</div>

          <div>
            <label className="text-xs font-semibold">İşe Başlama</label>
            <input
              type="time"
              value={formData.startTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
              className="w-full px-2 py-1 text-xs border rounded-md h-8 mt-1"
              data-testid="input-start-time"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Çıkış (Oto)</label>
            <div className="w-full px-2 py-1 text-xs bg-muted rounded-md text-center h-8 flex items-center justify-center mt-1">
              {formData.endTime}
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 justify-between">
          <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} data-testid="button-delete">
            <X className="w-3 h-3 mr-1" />
            Sil
          </Button>
          <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save">
            {saveMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ShiftAssignment {
  employeeId: string;
  dateStr: string;
  startTime: string;
  endTime: string;
  breakStartTime: string;
  breakEndTime: string;
}

function AIShiftPlannerModal({ open, onOpenChange, weekStart, employees, branchId }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekStart: Date;
  employees: any[];
  branchId: number;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState<'config' | 'preview' | 'done'>('config');
  const [assignments, setAssignments] = useState<Record<string, ShiftAssignment>>({});
  const [generatedPlan, setGeneratedPlan] = useState<any[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editStartTime, setEditStartTime] = useState('08:00');
  const [editBreakStart, setEditBreakStart] = useState('11:30');

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      return {
        date,
        dayName: format(date, 'EEEE', { locale: tr }),
        shortName: format(date, 'EEE', { locale: tr }),
        dateStr: format(date, 'yyyy-MM-dd'),
        dayNum: format(date, 'd'),
      };
    });
  }, [weekStart]);

  const calculateTimes = (startTime: string, breakStart: string) => {
    const [sH, sM] = startTime.split(':').map(Number);
    const endH = (sH + 8) % 24;
    const endTime = `${String(endH).padStart(2, '0')}:30`;
    
    const [bH, bM] = breakStart.split(':').map(Number);
    const breakEndH = (bH + 1) % 24;
    const breakEnd = `${String(breakEndH).padStart(2, '0')}:30`;
    
    return { endTime, breakEnd };
  };

  const openEditor = (empId: string, dateStr: string) => {
    const key = `${empId}-${dateStr}`;
    const existing = assignments[key];
    setEditStartTime(existing?.startTime || '08:00');
    setEditBreakStart(existing?.breakStartTime || '11:30');
    setEditingKey(key);
  };

  const saveShiftTime = () => {
    if (!editingKey) return;
    const [empId, dateStr] = editingKey.split('-');
    const { endTime, breakEnd } = calculateTimes(editStartTime, editBreakStart);
    
    setAssignments(prev => ({
      ...prev,
      [editingKey]: {
        employeeId: empId,
        dateStr,
        startTime: editStartTime,
        endTime,
        breakStartTime: editBreakStart,
        breakEndTime: breakEnd,
      }
    }));
    setEditingKey(null);
  };

  const toggleOff = (empId: string, dateStr: string) => {
    const key = `${empId}-${dateStr}`;
    setAssignments(prev => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  const getAssignment = (empId: string, dateStr: string) => {
    return assignments[`${empId}-${dateStr}`];
  };

  const generatePlan = () => {
    const shifts: any[] = [];
    Object.values(assignments).forEach((a) => {
      shifts.push({
        shiftDate: a.dateStr,
        startTime: `${a.startTime}:00`,
        endTime: `${a.endTime}:00`,
        breakStartTime: `${a.breakStartTime}:00`,
        breakEndTime: `${a.breakEndTime}:00`,
        shiftType: 'shift',
        assignedToId: a.employeeId,
        status: 'draft',
        branchId,
      });
    });
    
    if (shifts.length === 0) {
      toast({ title: "Uyari", description: "En az 1 vardiya atamasi yapin", variant: "destructive" });
      return;
    }
    
    setGeneratedPlan(shifts);
    setStep('preview');
  };

  const applyPlanMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/shifts/bulk-create', { shifts: generatedPlan });
    },
    onSuccess: () => {
      toast({ title: "Basarili", description: `${generatedPlan.length} vardiya olusturuldu` });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      setStep('done');
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  if (step === 'done') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm text-center">
          <div className="py-6">
            <div className="text-3xl font-bold text-success mb-2">✓</div>
            <h2 className="text-lg font-bold">Tamamlandi!</h2>
            <p className="text-sm text-muted-foreground mt-2">{generatedPlan.length} vardiya olusturuldu.</p>
            <Button
              className="w-full mt-4"
              onClick={() => {
                onOpenChange(false);
                setStep('config');
                setAssignments({});
                setGeneratedPlan([]);
              }}
            >
              Kapat
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open && (step === 'config' || step === 'preview')} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{step === 'config' ? 'AI ile Haftalik Plan' : 'Onay'}</DialogTitle>
          </DialogHeader>

          {step === 'config' ? (
            <div className="space-y-3 text-xs overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border p-1 text-left">Personel</th>
                    {weekDays.map(day => (
                      <th key={day.dateStr} className="border p-1 text-center">
                        <div>{day.shortName}</div>
                        <div className="text-muted-foreground text-xs">{day.dayNum}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp: any) => (
                    <tr key={emp.id}>
                      <td className="border p-1">{emp.fullName || `${emp.firstName} ${emp.lastName}`}</td>
                      {weekDays.map((day) => {
                        const assignment = getAssignment(emp.id, day.dateStr);
                        return (
                          <td key={`${emp.id}-${day.dateStr}`} className="border p-1">
                            <div className="flex gap-0.5 justify-center">
                              <button
                                onClick={() => openEditor(emp.id, day.dateStr)}
                                className={`flex-1 px-2 py-1 rounded text-xs font-medium ${
                                  assignment 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-gray-200 dark:bg-gray-700'
                                }`}
                                data-testid={`shift-box-${emp.id}-${day.dateStr}`}
                              >
                                {assignment ? assignment.startTime : '+'}
                              </button>
                              <button
                                onClick={() => toggleOff(emp.id, day.dateStr)}
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  !assignment
                                    ? 'bg-red-500 text-white'
                                    : 'bg-gray-200 dark:bg-gray-700'
                                }`}
                                data-testid={`off-box-${emp.id}-${day.dateStr}`}
                              >
                                X
                              </button>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>Iptal</Button>
                <Button onClick={generatePlan} data-testid="button-preview">Devam Et</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm space-y-2 max-h-[300px] overflow-y-auto">
                {generatedPlan.map((shift, idx) => {
                  const emp = employees.find((e: any) => e.id === shift.assignedToId);
                  return (
                    <div key={idx} className="p-2 bg-muted rounded text-xs">
                      <div className="font-semibold">{emp?.fullName || `${emp?.firstName} ${emp?.lastName}`}</div>
                      <div className="text-muted-foreground">
                        {format(new Date(shift.shiftDate), 'd MMMM', { locale: tr })} - {shift.startTime?.substring(0, 5)}-{shift.endTime?.substring(0, 5)}
                      </div>
                    </div>
                  );
                })}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setStep('config')}>Geri Don</Button>
                <Button onClick={() => applyPlanMutation.mutate()} disabled={applyPlanMutation.isPending} data-testid="button-apply">
                  {applyPlanMutation.isPending ? "Uygulanıyor..." : "Uygula"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Time Picker Dialog */}
      <Dialog open={!!editingKey} onOpenChange={() => setEditingKey(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Saat Seç</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold">İşe Başlama</label>
              <select
                value={editStartTime}
                onChange={(e) => setEditStartTime(e.target.value)}
                className="w-full px-2 py-1 border rounded-md text-xs mt-1 h-8"
                data-testid="select-start-time"
              >
                {Array.from({ length: 13 }, (_, i) => {
                  const h = 7 + i;
                  const time = `${String(h).padStart(2, '0')}:00`;
                  return <option key={time} value={time}>{time}</option>;
                })}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold">Mola Başlama</label>
              <select
                value={editBreakStart}
                onChange={(e) => setEditBreakStart(e.target.value)}
                className="w-full px-2 py-1 border rounded-md text-xs mt-1 h-8"
                data-testid="select-break-start"
              >
                {Array.from({ length: 11 }, (_, i) => {
                  const h = 11 + i;
                  const time = `${String(h).padStart(2, '0')}:30`;
                  return <option key={time} value={time}>{time}</option>;
                })}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setEditingKey(null)}>İptal</Button>
            <Button size="sm" onClick={saveShiftTime} data-testid="button-save-time">Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
