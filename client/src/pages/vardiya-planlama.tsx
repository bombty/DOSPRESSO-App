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
      
      if ((formData.openingChecklistId || formData.closingChecklistId) && shiftRes?.id) {
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

      {/* Vardiya Saatleri */}
      <div>
        <label className="text-xs font-semibold">İşe Başlama Saati</label>
        <input
          type="time"
          value={formData.startTime}
          onChange={(e) => handleStartTimeChange(e.target.value)}
          className="w-full px-2 py-1 text-xs border rounded-md"
          data-testid="input-start-time"
        />
      </div>

      {/* Çıkış Saati (Otomatik Hesaplanan) */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground">Çıkış Saati (Otomatik)</label>
        <div className="px-2 py-1 text-xs bg-muted rounded-md">{formData.endTime}</div>
      </div>

      {/* Mola Saatleri (Manuel) */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-semibold">Mola Başlama</label>
          <input
            type="time"
            value={formData.breakStartTime}
            onChange={(e) => setFormData({ ...formData, breakStartTime: e.target.value })}
            className="w-full px-2 py-1 text-xs border rounded-md"
            data-testid="input-break-start"
          />
        </div>
        <div>
          <label className="text-xs font-semibold">Mola Bitişi</label>
          <input
            type="time"
            value={formData.breakEndTime}
            onChange={(e) => setFormData({ ...formData, breakEndTime: e.target.value })}
            className="w-full px-2 py-1 text-xs border rounded-md"
            data-testid="input-break-end"
          />
        </div>
      </div>

      {openingChecklists.length > 0 && (
        <div>
          <label className="text-xs font-semibold">Acilis Ceklisti (Opsiyonel)</label>
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
          <label className="text-xs font-semibold">Kapanis Ceklisti (Opsiyonel)</label>
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

function AIShiftPlannerModal({ open, onOpenChange, weekStart, employees, branchId }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekStart: Date;
  employees: any[];
  branchId?: number;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState<'config' | 'preview' | 'done'>('config');
  const [offDays, setOffDays] = useState<Record<string, string>>({});
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      return {
        date,
        dayName: format(date, 'EEEE', { locale: tr }),
        dateStr: format(date, 'yyyy-MM-dd'),
      };
    });
  }, [weekStart]);

  const toggleOffDay = (employeeId: string | number, dateStr: string) => {
    const empId = String(employeeId);
    setOffDays(prev => {
      const key = `${empId}-${dateStr}`;
      if (prev[key]) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: 'off' };
    });
  };

  const aiGenerateMutation = useMutation({
    mutationFn: async () => {
      const weekEnd = format(addDays(weekStart, 6), 'yyyy-MM-dd');
      const result = await apiRequest('POST', '/api/shifts/ai-suggest', {
        branchId,
        weekStart: format(weekStart, 'yyyy-MM-dd'),
        weekEnd,
        offDays,
      });
      return result;
    },
    onSuccess: (data) => {
      setGeneratedPlan(data);
      setStep('preview');
      toast({ title: "AI Plan Olusturuldu", description: "Onizleme icin hazir" });
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const applyPlanMutation = useMutation({
    mutationFn: async () => {
      if (!generatedPlan?.shifts) return;
      await apiRequest('POST', '/api/shifts/bulk-create', {
        shifts: generatedPlan.shifts,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      setStep('done');
      toast({ title: "Basarili", description: "Vardiyalar olusturuldu" });
      setTimeout(() => {
        onOpenChange(false);
        setStep('config');
        setGeneratedPlan(null);
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

  const getEmployeeRoleBadge = (role: string) => {
    switch (role) {
      case 'barista': return <Badge className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">Barista</Badge>;
      case 'intern': return <Badge className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/20">Stajyer</Badge>;
      case 'supervisor': return <Badge className="text-xs bg-green-500/10 text-green-600 border-green-500/20">Supervisor</Badge>;
      default: return <Badge variant="outline" className="text-xs">{role}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI ile Haftalik Vardiya Planlama
          </DialogTitle>
        </DialogHeader>

        {step === 'config' && (
          <>
            <div className="space-y-4 flex-1 overflow-hidden">
              {/* Kurallar Bilgisi */}
              <Card className="bg-muted/50">
                <CardContent className="py-3 space-y-1">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    AI Planlama Kurallari:
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1 ml-6">
                    <li>- Her stajyerin yaninda en az 1 barista olacak</li>
                    <li>- Sabah vardiyalari daha az personel (yogun degil)</li>
                    <li>- Aksam vardiyalari daha fazla personel (yogun)</li>
                    <li>- Gucler ayriligi: Ayni kisi hem acilis hem kapanis yapmaz</li>
                    <li>- Her personele haftada en az 1 gun off</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Off Gunleri Secimi */}
              <div>
                <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Off Gunlerini Isaretleyin:
                </p>
                <ScrollArea className="h-[300px] border rounded-md p-2">
                  <div className="space-y-3">
                    {employees.filter((emp: any) => emp.id).map((emp: any) => (
                      <div key={emp.id} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{emp.fullName || `${emp.firstName} ${emp.lastName}`}</span>
                          {getEmployeeRoleBadge(emp.role)}
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {weekDays.map((day) => {
                            const empId = String(emp.id);
                            const isOff = offDays[`${empId}-${day.dateStr}`];
                            return (
                              <Button
                                key={day.dateStr}
                                size="sm"
                                variant={isOff ? "default" : "outline"}
                                className={`text-xs px-2 h-7 ${isOff ? 'bg-destructive hover:bg-destructive/90' : ''}`}
                                onClick={() => toggleOffDay(empId, day.dateStr)}
                                data-testid={`off-${empId}-${day.dateStr}`}
                              >
                                {day.dayName.substring(0, 3)}
                              </Button>
                            );
                          })}
                        </div>
                        <Separator className="mt-2" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Iptal
              </Button>
              <Button 
                onClick={() => aiGenerateMutation.mutate()} 
                disabled={aiGenerateMutation.isPending || !branchId}
                className="gap-2"
              >
                {aiGenerateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    AI Planiyor...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Plan Olustur
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'preview' && generatedPlan && (
          <>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold mb-2">Olusturulan Plan Onizlemesi:</p>
              <ScrollArea className="h-[400px] border rounded-md p-2">
                <div className="space-y-2">
                  {generatedPlan.shifts?.map((shift: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 border rounded text-sm">
                      <div>
                        <span className="font-medium">{shift.shiftDate}</span>
                        <span className="text-muted-foreground ml-2">
                          {shift.startTime?.substring(0, 5)} - {shift.endTime?.substring(0, 5)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>{employees.find(e => e.id === shift.assignedToId)?.fullName || 'Bilinmiyor'}</span>
                        <Badge variant="outline" className="text-xs">
                          {shift.shiftType === 'morning' ? 'Sabah' : 
                           shift.shiftType === 'evening' ? 'Aksam' : 'Gece'}
                        </Badge>
                      </div>
                    </div>
                  )) || <p className="text-muted-foreground text-center py-4">Plan bos</p>}
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
                    Plani Uygula
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
