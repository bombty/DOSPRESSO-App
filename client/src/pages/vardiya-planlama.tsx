import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  format, startOfWeek, addDays, parseISO, isSameDay, isToday
} from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Clock } from "lucide-react";

interface ShiftDay {
  date: Date;
  shifts: any[];
  dayOfWeek: string;
}

export default function VardiyaPlanlama() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedShift, setSelectedShift] = useState(null);

  const { data: shifts } = useQuery({
    queryKey: ['/api/shifts', format(weekStart, 'yyyy-MM-dd')],
  });

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
                            {shift.shiftChecklists.length} 📋
                          </Badge>
                        )}
                      </div>
                      {shift.assignedTo?.fullName && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {shift.assignedTo.fullName}
                        </div>
                      )}
                      <Badge variant="outline" className="mt-1 text-xs h-4">
                        {shift.status === 'draft' ? 'Taslak' : 
                         shift.status === 'pending_hq' ? 'Onay Bekliyor' :
                         shift.status === 'confirmed' ? 'Onaylı' : shift.status}
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
                      {format(day.date, 'd MMMM yyyy', { locale: tr })} İçin Vardiya
                    </DialogTitle>
                  </DialogHeader>
                  <QuickAddShiftForm date={day.date} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['/api/shifts'] })} />
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Shift Details Modal */}
      {selectedShift && (
        <Dialog open={!!selectedShift} onOpenChange={() => setSelectedShift(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Vardiya Detayları</DialogTitle>
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

function QuickAddShiftForm({ date, onSuccess }: { date: Date; onSuccess: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    shiftType: 'morning',
    assignedToId: '',
    openingChecklistId: '',
    closingChecklistId: '',
  });

  const { data: checklists } = useQuery({
    queryKey: ['/api/checklists'],
  });

  const openingChecklists = checklists?.filter((c: any) => c.type === 'opening' || !c.type) || [];
  const closingChecklists = checklists?.filter((c: any) => c.type === 'closing' || !c.type) || [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const shiftTimes: Record<string, [string, string]> = {
        morning: ['06:00:00', '14:00:00'],
        evening: ['14:00:00', '22:00:00'],
        night: ['22:00:00', '06:00:00'],
      };
      const [start, end] = shiftTimes[formData.shiftType];
      
      const payload: any = {
        branchId: user?.branchId,
        shiftDate: format(date, 'yyyy-MM-dd'),
        startTime: start,
        endTime: end,
        shiftType: formData.shiftType,
        status: 'draft',
        assignedToId: formData.assignedToId || null,
        createdById: user?.id,
      };

      const shiftRes = await apiRequest('POST', '/api/shifts', payload);
      
      // Attach checklists if selected
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
      toast({ title: "Başarılı", description: "Vardiya oluşturuldu" });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs font-semibold">Vardiya Tipi</label>
        <Select value={formData.shiftType} onValueChange={(v) => setFormData({ ...formData, shiftType: v })}>
          <SelectTrigger data-testid="select-shift-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="morning">Sabah (06:00-14:00)</SelectItem>
            <SelectItem value="evening">Akşam (14:00-22:00)</SelectItem>
            <SelectItem value="night">Gece (22:00-06:00)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {openingChecklists.length > 0 && (
        <div>
          <label className="text-xs font-semibold">Açılış Çeklisti (Opsiyonel)</label>
          <Select value={formData.openingChecklistId} onValueChange={(v) => setFormData({ ...formData, openingChecklistId: v })}>
            <SelectTrigger data-testid="select-opening-checklist">
              <SelectValue placeholder="Seçin..." />
            </SelectTrigger>
            <SelectContent>
              {openingChecklists.map((c: any) => (
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
          <label className="text-xs font-semibold">Kapanış Çeklisti (Opsiyonel)</label>
          <Select value={formData.closingChecklistId} onValueChange={(v) => setFormData({ ...formData, closingChecklistId: v })}>
            <SelectTrigger data-testid="select-closing-checklist">
              <SelectValue placeholder="Seçin..." />
            </SelectTrigger>
            <SelectContent>
              {closingChecklists.map((c: any) => (
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
