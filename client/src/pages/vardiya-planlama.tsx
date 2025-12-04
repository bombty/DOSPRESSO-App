import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  format, startOfWeek, addDays, isToday
} from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Clock, Sparkles, Users, Calendar, CheckCircle2, Loader2 } from "lucide-react";

interface ShiftDay {
  date: Date;
  shifts: any[];
  dayOfWeek: string;
}

export default function VardiyaPlanlama() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const { data: shifts } = useQuery({
    queryKey: ['/api/shifts', format(weekStart, 'yyyy-MM-dd')],
  });

  const { data: allEmployees } = useQuery({
    queryKey: ['/api/employees'],
  });

  const branchEmployees = allEmployees?.filter((emp: any) => emp.branchId === user?.branchId) || [];

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const dayShifts = shifts?.filter((s: any) => s.shiftDate === format(date, 'yyyy-MM-dd')) || [];
      return {
        date,
        shifts: dayShifts,
        dayOfWeek: format(date, 'EEEE', { locale: tr })
      };
    });
  }, [weekStart, shifts]);

  const previousWeek = () => setWeekStart(addDays(weekStart, -7));
  const nextWeek = () => setWeekStart(addDays(weekStart, 7));
  const goToToday = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  return (
    <div className="flex flex-col gap-3 sm:gap-4 p-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Haftalık Vardiya Planlama
          </h1>
          <p className="text-muted-foreground mt-1">
            {format(weekStart, "d MMMM", { locale: tr })} - {format(addDays(weekStart, 6), "d MMMM yyyy", { locale: tr })}
          </p>
        </div>
        
        {/* AI Planlama Butonu */}
        <Button 
          onClick={() => setAiModalOpen(true)} 
          className="gap-2"
          data-testid="button-ai-plan"
        >
          <Sparkles className="w-4 h-4" />
          AI ile Otomatik Planla
        </Button>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center gap-2 justify-between sm:justify-start flex-wrap">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={previousWeek} data-testid="button-prev-week">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Önceki Hafta
          </Button>
          <Button size="sm" variant="outline" onClick={goToToday} data-testid="button-today">
            Bugün
          </Button>
          <Button size="sm" variant="outline" onClick={nextWeek} data-testid="button-next-week">
            Sonraki Hafta
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* 7-Day Grid Calendar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {weekDays.map((day, idx) => (
          <Card 
            key={idx}
            className={`${isToday(day.date) ? "border-primary/50 bg-primary/5" : ""} hover-elevate`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm">
                  {format(day.date, 'd MMM', { locale: tr })}
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {day.dayOfWeek.substring(0, 3)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Shifts List */}
              <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                {day.shifts.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Vardiya yok
                  </p>
                ) : (
                  day.shifts.map((shift: any) => (
                    <div 
                      key={shift.id} 
                      className="p-1.5 rounded border bg-card hover-elevate cursor-pointer text-xs"
                      onClick={() => setSelectedShift(shift)}
                      data-testid={`shift-card-${shift.id}`}
                    >
                      <div className="font-semibold text-xs flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {shift.startTime?.substring(0, 5)} - {shift.endTime?.substring(0, 5)}
                        </div>
                        {shift.shiftChecklists && shift.shiftChecklists.length > 0 && (
                          <Badge variant="secondary" className="text-xs h-4 py-0">
                            {shift.shiftChecklists.length}
                          </Badge>
                        )}
                      </div>
                      {shift.assignedTo?.fullName && (
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {shift.assignedTo.fullName}
                        </div>
                      )}
                      <Badge variant="outline" className="mt-1 text-xs h-4">
                        {shift.status === 'draft' ? 'Taslak' : 
                         shift.status === 'pending_hq' ? 'Onay Bekliyor' :
                         shift.status === 'confirmed' ? 'Onayli' : shift.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>

              {/* Add Shift Button */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="w-full text-xs" data-testid={`button-add-shift-${idx}`}>
                    <Plus className="w-3 h-3 mr-1" />
                    Vardiya Ekle
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {format(day.date, 'd MMMM yyyy', { locale: tr })} Icin Vardiya
                    </DialogTitle>
                  </DialogHeader>
                  <QuickAddShiftForm 
                    date={day.date} 
                    employees={branchEmployees || []}
                    onSuccess={() => queryClient.invalidateQueries({ queryKey: ['/api/shifts'] })} 
                  />
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Planlama Modal */}
      <AIShiftPlannerModal 
        open={aiModalOpen} 
        onOpenChange={setAiModalOpen}
        weekStart={weekStart}
        employees={branchEmployees || []}
        branchId={user?.branchId}
      />

      {/* Shift Details Modal */}
      {selectedShift && (
        <Dialog open={!!selectedShift} onOpenChange={() => setSelectedShift(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Vardiya Detaylari</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <div>
                <p className="font-semibold">Saat</p>
                <p>{selectedShift.startTime?.substring(0, 5)} - {selectedShift.endTime?.substring(0, 5)}</p>
              </div>
              {selectedShift.assignedTo?.fullName && (
                <div>
                  <p className="font-semibold">Personel</p>
                  <p>{selectedShift.assignedTo.fullName}</p>
                </div>
              )}
              <div>
                <p className="font-semibold">Durum</p>
                <Badge>{selectedShift.status}</Badge>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function QuickAddShiftForm({ date, employees, onSuccess }: { date: Date; employees: any[]; onSuccess: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    assignedToId: '',
    startTime: '08:00',
    endTime: '16:30',
    breakStartTime: '11:00',
    breakEndTime: '12:00',
    openingChecklistId: '',
    closingChecklistId: '',
    thirdChecklistId: '',
  });

  const handleStartTimeChange = (time: string) => {
    setFormData(prev => {
      const [hours, mins] = time.split(':').map(Number);
      // 8.5 saat çalışma + 1 saat mola = 9.5 saat
      let endHours = (hours + 8) % 24;
      const endMins = 30;
      const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
      
      // Mola: başlangıçtan 3.5 saat sonra başlasın (12:30 ise 16:00, 09:00 ise 12:30)
      let breakStartHours = (hours + 3) % 24;
      const breakStartMins = 30;
      let breakEndHours = (hours + 4) % 24;
      const breakStartTime = `${String(breakStartHours).padStart(2, '0')}:${String(breakStartMins).padStart(2, '0')}`;
      const breakEndTime = `${String(breakEndHours).padStart(2, '0')}:30`;
      
      return {
        ...prev,
        startTime: time,
        endTime,
        breakStartTime,
        breakEndTime,
      };
    });
  };

  const { data: checklists } = useQuery({
    queryKey: ['/api/checklists'],
  });

  const openingChecklists = checklists?.filter((c: any) => c.type === 'opening' || !c.type) || [];
  const closingChecklists = checklists?.filter((c: any) => c.type === 'closing' || !c.type) || [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        branchId: user?.branchId,
        shiftDate: format(date, 'yyyy-MM-dd'),
        startTime: `${formData.startTime}:00`,
        endTime: `${formData.endTime}:00`,
        breakStartTime: `${formData.breakStartTime}:00`,
        breakEndTime: `${formData.breakEndTime}:00`,
        status: 'draft',
        assignedToId: formData.assignedToId || null,
        createdById: user?.id,
      };

      const shiftRes = await apiRequest('POST', '/api/shifts', payload);
      
      if ((formData.openingChecklistId || formData.closingChecklistId || formData.thirdChecklistId) && shiftRes?.id) {
        if (formData.openingChecklistId) {
          await apiRequest('POST', `/api/shifts/${shiftRes.id}/checklists`, {
            checklistId: parseInt(formData.openingChecklistId),
            type: 'opening',
          });
        }
        if (formData.closingChecklistId) {
          await apiRequest('POST', `/api/shifts/${shiftRes.id}/checklists`, {
            checklistId: parseInt(formData.closingChecklistId),
            type: 'closing',
          });
        }
        if (formData.thirdChecklistId) {
          await apiRequest('POST', `/api/shifts/${shiftRes.id}/checklists`, {
            checklistId: parseInt(formData.thirdChecklistId),
            type: 'other',
          });
        }
      }
    },
    onSuccess: () => {
      toast({ title: "Basarili", description: "Vardiya olusturuldu" });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-3">
      {/* Personel Secici */}
      <div>
        <label className="text-xs font-semibold">Personel</label>
        <Select value={formData.assignedToId} onValueChange={(v) => setFormData({ ...formData, assignedToId: v })}>
          <SelectTrigger data-testid="select-employee">
            <SelectValue placeholder="Personel secin..." />
          </SelectTrigger>
          <SelectContent>
            {employees.filter((emp: any) => emp.id).map((emp: any) => (
              <SelectItem key={emp.id} value={String(emp.id)}>
                <div className="flex items-center gap-2">
                  <span>{emp.fullName || `${emp.firstName} ${emp.lastName}`}</span>
                  <Badge variant="outline" className="text-xs h-4">
                    {emp.role === 'barista' ? 'Barista' : 
                     emp.role === 'intern' ? 'Stajyer' : 
                     emp.role === 'supervisor' ? 'Supervisor' : emp.role}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Vardiya Saatleri (Başlama - Çıkış) */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold h-4">İşe Başlama</label>
          <input
            type="time"
            value={formData.startTime}
            onChange={(e) => handleStartTimeChange(e.target.value)}
            className="w-20 px-2 py-0.5 text-xs border rounded-md h-8"
            data-testid="input-start-time"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-muted-foreground h-4">Çıkış (Oto)</label>
          <div className="w-20 px-2 py-0.5 text-xs bg-muted rounded-md text-center h-8 flex items-center justify-center">{formData.endTime}</div>
        </div>
      </div>

      {/* Mola Saatleri */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold h-4">Mola Başlama</label>
          <input
            type="time"
            value={formData.breakStartTime}
            onChange={(e) => {
              const breakStart = e.target.value;
              const [hours, mins] = breakStart.split(':').map(Number);
              const breakEndHours = (hours + 1) % 24;
              const breakEnd = `${String(breakEndHours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
              setFormData({ ...formData, breakStartTime: breakStart, breakEndTime: breakEnd });
            }}
            className="w-20 px-2 py-0.5 text-xs border rounded-md h-8"
            data-testid="input-break-start"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-muted-foreground h-4">Mola Bitişi (Oto)</label>
          <div className="w-20 px-2 py-0.5 text-xs bg-muted rounded-md text-center h-8 flex items-center justify-center">{formData.breakEndTime}</div>
        </div>
      </div>

      {openingChecklists.length > 0 && (
        <div>
          <label className="text-xs font-semibold">1. Checklist (Opsiyonel)</label>
          <Select value={formData.openingChecklistId} onValueChange={(v) => setFormData({ ...formData, openingChecklistId: v })}>
            <SelectTrigger data-testid="select-opening-checklist">
              <SelectValue placeholder="Secin..." />
            </SelectTrigger>
            <SelectContent>
              {openingChecklists.filter((c: any) => c.id).map((c: any) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.titleTr || c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {closingChecklists.length > 0 && (
        <div>
          <label className="text-xs font-semibold">2. Checklist (Opsiyonel)</label>
          <Select value={formData.closingChecklistId} onValueChange={(v) => setFormData({ ...formData, closingChecklistId: v })}>
            <SelectTrigger data-testid="select-closing-checklist">
              <SelectValue placeholder="Secin..." />
            </SelectTrigger>
            <SelectContent>
              {closingChecklists.filter((c: any) => c.id).map((c: any) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.titleTr || c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {checklists && checklists.length > 0 && (
        <div>
          <label className="text-xs font-semibold">3. Checklist (Opsiyonel)</label>
          <Select value={formData.thirdChecklistId} onValueChange={(v) => setFormData({ ...formData, thirdChecklistId: v })}>
            <SelectTrigger data-testid="select-third-checklist">
              <SelectValue placeholder="Secin..." />
            </SelectTrigger>
            <SelectContent>
              {checklists.filter((c: any) => c.id).map((c: any) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.titleTr || c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Button 
        onClick={() => createMutation.mutate()} 
        disabled={createMutation.isPending}
        className="w-full"
        data-testid="button-submit"
      >
        {createMutation.isPending ? "Ekleniyor..." : "Vardiya Ekle"}
      </Button>
    </div>
  );
}

interface ShiftAssignment {
  employeeId: string;
  dateStr: string;
  shiftType: 'morning' | 'evening' | 'off';
  startTime: string;
  endTime: string;
  breakStartTime?: string;
  breakEndTime?: string;
}

function AIShiftPlannerModal({ open, onOpenChange, weekStart, employees, branchId }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekStart: Date;
  employees: any[];
  branchId?: number;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState<'config' | 'preview' | 'done'>('config');
  const [assignments, setAssignments] = useState<Record<string, ShiftAssignment>>({});
  const [generatedPlan, setGeneratedPlan] = useState<any[]>([]);

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

  const shiftPresets = {
    morning: { startTime: '08:00', label: 'Sabah' },
    evening: { startTime: '14:00', label: 'Aksam' },
    off: { startTime: '', label: 'Off' },
  };

  const getAssignment = (empId: string, dateStr: string): ShiftAssignment | null => {
    return assignments[`${empId}-${dateStr}`] || null;
  };

  const setShiftType = (empId: string, dateStr: string, shiftType: 'morning' | 'evening' | 'off') => {
    const key = `${empId}-${dateStr}`;
    if (shiftType === 'off') {
      setAssignments(prev => {
        const { [key]: _, ...rest } = prev;
        return { ...rest, [key]: { employeeId: empId, dateStr, shiftType: 'off', startTime: '', endTime: '', breakStartTime: '', breakEndTime: '' } };
      });
    } else {
      const preset = shiftPresets[shiftType];
      const [hours, mins] = preset.startTime.split(':').map(Number);
      const endHours = (hours + 8) % 24;
      const endTime = `${String(endHours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
      const breakStartHours = (hours + 3) % 24;
      const breakEndHours = (hours + 4) % 24;
      const breakStart = `${String(breakStartHours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
      const breakEnd = `${String(breakEndHours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

      setAssignments(prev => ({
        ...prev,
        [key]: { 
          employeeId: empId, 
          dateStr, 
          shiftType, 
          startTime: preset.startTime, 
          endTime,
          breakStartTime: breakStart,
          breakEndTime: breakEnd,
        }
      }));
    }
  };

  const updateTime = (empId: string, dateStr: string, value: string) => {
    const key = `${empId}-${dateStr}`;
    const currentAssignment = assignments[key];
    if (!currentAssignment) return;

    const [hours, mins] = value.split(':').map(Number);
    const endHours = (hours + 8) % 24;
    const endTime = `${String(endHours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

    const breakStartHours = (hours + 3) % 24;
    const breakEndHours = (hours + 4) % 24;
    const breakStart = `${String(breakStartHours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    const breakEnd = `${String(breakEndHours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

    setAssignments(prev => ({
      ...prev,
      [key]: { 
        ...prev[key], 
        startTime: value,
        endTime,
        breakStartTime: breakStart,
        breakEndTime: breakEnd,
      }
    }));
  };

  const clearAssignment = (empId: string, dateStr: string) => {
    const key = `${empId}-${dateStr}`;
    setAssignments(prev => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  const generatePlan = () => {
    const shifts: any[] = [];
    Object.values(assignments).forEach((a) => {
      if (a.shiftType !== 'off' && a.startTime && a.endTime) {
        const startTime = a.startTime.length === 5 ? `${a.startTime}:00` : a.startTime;
        const endTime = a.endTime.length === 5 ? `${a.endTime}:00` : a.endTime;
        const breakStartTime = a.breakStartTime ? (a.breakStartTime.length === 5 ? `${a.breakStartTime}:00` : a.breakStartTime) : `${a.breakStartTime}:00`;
        const breakEndTime = a.breakEndTime ? (a.breakEndTime.length === 5 ? `${a.breakEndTime}:00` : a.breakEndTime) : `${a.breakEndTime}:00`;
        
        shifts.push({
          shiftDate: a.dateStr,
          startTime,
          endTime,
          breakStartTime,
          breakEndTime,
          shiftType: a.shiftType,
          assignedToId: a.employeeId,
          status: 'draft',
          branchId,
        });
      }
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
      if (generatedPlan.length === 0) return;
      await apiRequest('POST', '/api/shifts/bulk-create', {
        shifts: generatedPlan,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      setStep('done');
      toast({ title: "Basarili", description: "Vardiyalar olusturuldu" });
      setTimeout(() => {
        onOpenChange(false);
        setStep('config');
        setGeneratedPlan([]);
        setAssignments({});
      }, 1500);
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getEmployeeName = (id: string) => {
    const emp = employees.find((e: any) => String(e.id) === id);
    return emp?.fullName || emp?.firstName || 'Bilinmiyor';
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'barista': return <Badge className="text-xs h-5 bg-blue-500/10 text-blue-600 border-blue-500/20">B</Badge>;
      case 'intern': return <Badge className="text-xs h-5 bg-orange-500/10 text-orange-600 border-orange-500/20">S</Badge>;
      case 'supervisor': return <Badge className="text-xs h-5 bg-green-500/10 text-green-600 border-green-500/20">SV</Badge>;
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-primary" />
            Haftalik Vardiya Planlama
          </DialogTitle>
        </DialogHeader>

        {step === 'config' && (
          <>
            <div className="flex-1 overflow-auto">
              <ScrollArea className="h-[60vh]">
                <div className="space-y-3 pr-2">
                  {employees.filter((emp: any) => emp.id).map((emp: any) => {
                    const empId = String(emp.id);
                    return (
                      <Card key={emp.id} className="p-2">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium">{emp.fullName || `${emp.firstName} ${emp.lastName}`}</span>
                          {getRoleBadge(emp.role)}
                        </div>
                        
                        <div className="grid grid-cols-7 gap-1">
                          {weekDays.map((day) => {
                            const assignment = getAssignment(empId, day.dateStr);
                            const isOff = assignment?.shiftType === 'off';
                            const isMorning = assignment?.shiftType === 'morning';
                            const isEvening = assignment?.shiftType === 'evening';
                            
                            return (
                              <div key={day.dateStr} className="flex flex-col gap-0.5">
                                <div className="text-center text-xs text-muted-foreground">
                                  {day.shortName} {day.dayNum}
                                </div>
                                
                                <div className="flex flex-col gap-0.5">
                                  <Button
                                    size="sm"
                                    variant={isMorning ? "default" : "outline"}
                                    className={`text-xs h-6 px-1 ${isMorning ? 'bg-yellow-500 hover:bg-yellow-600' : ''}`}
                                    onClick={() => isMorning ? clearAssignment(empId, day.dateStr) : setShiftType(empId, day.dateStr, 'morning')}
                                    data-testid={`morning-${empId}-${day.dateStr}`}
                                  >
                                    S
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={isEvening ? "default" : "outline"}
                                    className={`text-xs h-6 px-1 ${isEvening ? 'bg-indigo-500 hover:bg-indigo-600' : ''}`}
                                    onClick={() => isEvening ? clearAssignment(empId, day.dateStr) : setShiftType(empId, day.dateStr, 'evening')}
                                    data-testid={`evening-${empId}-${day.dateStr}`}
                                  >
                                    A
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={isOff ? "default" : "outline"}
                                    className={`text-xs h-6 px-1 ${isOff ? 'bg-destructive hover:bg-destructive/90' : ''}`}
                                    onClick={() => isOff ? clearAssignment(empId, day.dateStr) : setShiftType(empId, day.dateStr, 'off')}
                                    data-testid={`off-${empId}-${day.dateStr}`}
                                  >
                                    X
                                  </Button>
                                </div>

                                {(isMorning || isEvening) && (
                                  <div className="flex flex-col gap-0.5 mt-0.5">
                                    <input
                                      type="time"
                                      value={assignment?.startTime || ''}
                                      onChange={(e) => updateTime(empId, day.dateStr, e.target.value)}
                                      className="w-full text-xs px-0.5 py-0.5 border rounded text-center h-6"
                                      title="Başlangıç saati (bitiş otomatik)"
                                    />
                                    <div className="text-xs text-muted-foreground text-center px-0.5 py-0.5 bg-muted rounded">
                                      {assignment?.endTime || '--:--'}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            <DialogFooter className="mt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Iptal
              </Button>
              <Button onClick={generatePlan} className="gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Plan Olustur ({Object.values(assignments).filter(a => a.shiftType !== 'off').length} vardiya)
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'preview' && (
          <>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold mb-2">Plan Onizlemesi ({generatedPlan.length} vardiya):</p>
              <ScrollArea className="h-[50vh] border rounded-md p-2">
                <div className="space-y-1">
                  {generatedPlan.map((shift: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 border rounded text-sm bg-card">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {shift.shiftDate}
                        </Badge>
                        <span className="text-muted-foreground">
                          {shift.startTime} - {shift.endTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{getEmployeeName(shift.assignedToId)}</span>
                        <Badge className={`text-xs ${shift.shiftType === 'morning' ? 'bg-yellow-500' : 'bg-indigo-500'}`}>
                          {shift.shiftType === 'morning' ? 'Sabah' : 'Aksam'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('config')}>
                Geri
              </Button>
              <Button 
                onClick={() => applyPlanMutation.mutate()} 
                disabled={applyPlanMutation.isPending}
                className="gap-2"
              >
                {applyPlanMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uygulanıyor...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Kaydet
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'done' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
              <p className="text-lg font-semibold">Vardiyalar Basariyla Olusturuldu!</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
