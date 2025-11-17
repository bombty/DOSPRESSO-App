import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  insertShiftSchema, 
  type Shift, 
  type InsertShift,
  type Branch,
  type User,
  isBranchRole,
} from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Calendar as CalendarIcon, Edit, Trash2, Clock, User as UserIcon, Sparkles, List, LayoutGrid, ArrowLeftRight, Check, X } from "lucide-react";
import { format, parseISO, startOfWeek, endOfWeek, addWeeks } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { ShiftTradeRequest } from "@shared/schema";
import { Calendar as BigCalendar, dateFnsLocalizer, Event } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { getDay, parse, startOfWeek as startOfWeekFns, getISOWeek } from 'date-fns';

const locales = {
  'tr': tr,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeekFns(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const DragDropCalendar = withDragAndDrop(BigCalendar);

type ShiftWithRelations = Shift & {
  branch: {
    name: string;
  };
  assignedTo: {
    fullName: string;
  } | null;
  createdBy: {
    fullName: string;
  };
};

const shiftTypeLabels: Record<string, string> = {
  morning: "Sabah",
  evening: "Akşam",
  night: "Gece",
};

const shiftTypeColors: Record<string, string> = {
  morning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  evening: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  night: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

const statusLabels: Record<string, string> = {
  draft: "Taslak",
  pending_hq: "HQ Onayı Bekliyor",
  confirmed: "Onaylandı",
  completed: "Tamamlandı",
  cancelled: "İptal",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  pending_hq: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

type AIShiftSuggestion = {
  shiftDate: string;
  shiftType: string;
  suggestedAssignee: { id: string; name: string; confidenceScore: number } | null;
  reasoning: string;
  startTime: string;
  endTime: string;
};

type AIShiftPlanResponse = {
  suggestions: AIShiftSuggestion[];
  summary: string;
  cached?: boolean;
};

type CalendarEvent = Event & {
  shift: ShiftWithRelations;
};

export default function Vardiyalar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftWithRelations | null>(null);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<number | undefined>(undefined);
  const [selectedUserFilter, setSelectedUserFilter] = useState<string | undefined>(undefined);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [aiSuggestions, setAiSuggestions] = useState<AIShiftPlanResponse | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'month'>('list');
  const [isTradeDialogOpen, setIsTradeDialogOpen] = useState(false);
  const [selectedShiftForTrade, setSelectedShiftForTrade] = useState<ShiftWithRelations | null>(null);

  const isSupervisor = user?.role && (user.role === 'supervisor' || user.role === 'supervisor_buddy');
  const isHQIK = user?.role === 'destek';
  const isEmployee = user?.role && isBranchRole(user.role as any) && !isSupervisor;

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ['/api/branches'],
    enabled: isHQIK,
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: !!isSupervisor,
  });

  const branchUsers = users?.filter((u: User) => u.branchId === user?.branchId);

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', format(dateFrom, 'yyyy-MM-dd'));
    if (dateTo) params.append('dateTo', format(dateTo, 'yyyy-MM-dd'));
    if (selectedUserFilter) params.append('assignedToId', selectedUserFilter);
    return params.toString() ? `?${params.toString()}` : '';
  };

  const { data: shifts, isLoading } = useQuery<ShiftWithRelations[]>({
    queryKey: ['/api/shifts', dateFrom, dateTo, selectedUserFilter],
    queryFn: async () => {
      const queryParams = buildQueryParams();
      const response = await fetch(`/api/shifts${queryParams}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch shifts');
      return response.json();
    },
  });

  const filteredShifts = shifts?.filter(shift => {
    if (isHQIK && selectedBranchFilter && shift.branchId !== selectedBranchFilter) {
      return false;
    }
    return true;
  });

  const form = useForm<InsertShift>({
    resolver: zodResolver(insertShiftSchema),
    defaultValues: {
      branchId: user?.branchId || 0,
      shiftDate: format(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00:00',
      endTime: '17:00:00',
      shiftType: 'morning',
      status: 'draft',
      assignedToId: null,
      notes: null,
      createdById: user?.id || '',
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertShift) => {
      await apiRequest('POST', '/api/shifts', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      toast({
        title: "Başarılı",
        description: "Vardiya oluşturuldu",
      });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Vardiya oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertShift> }) => {
      await apiRequest('PATCH', `/api/shifts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      toast({
        title: "Başarılı",
        description: "Vardiya güncellendi",
      });
      setEditingShift(null);
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Vardiya güncellenemedi",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/shifts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      toast({
        title: "Başarılı",
        description: "Vardiya silindi",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Vardiya silinemedi",
        variant: "destructive",
      });
    },
  });

  const aiSuggestMutation = useMutation({
    mutationFn: async (data: { branchId: number; weekStart: string; weekEnd: string }) => {
      const response = await apiRequest('POST', '/api/shifts/ai-suggest', data);
      return await response.json();
    },
    onSuccess: (data: AIShiftPlanResponse) => {
      setAiSuggestions(data);
      toast({
        title: "AI Öneri Hazır",
        description: data.cached ? "Önbelleğe alınmış plan kullanıldı" : `${data.suggestions.length} vardiya önerisi oluşturuldu`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "AI öneri oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  const applyAISuggestionsMutation = useMutation({
    mutationFn: async (suggestions: AIShiftSuggestion[]) => {
      const shiftsToCreate = suggestions.map(s => ({
        branchId: user!.branchId!,
        shiftDate: s.shiftDate,
        startTime: s.startTime,
        endTime: s.endTime,
        shiftType: s.shiftType as "morning" | "evening" | "night",
        status: "draft" as const,
        assignedToId: s.suggestedAssignee?.id || null,
        notes: `AI Önerisi: ${s.reasoning}`,
        createdById: user!.id,
      }));
      
      // Backend expects { shifts: [...], checklistIds?: [...] } format (line 3647 in routes.ts)
      return apiRequest('POST', '/api/shifts/bulk-create', { shifts: shiftsToCreate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      toast({
        title: "✅ Başarılı",
        description: `${aiSuggestions?.suggestions.length || 0} vardiya oluşturuldu`,
      });
      setAiSuggestions(null);
      setIsAIDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Vardiyalar oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  const { data: shiftTrades } = useQuery<ShiftTradeRequest[]>({
    queryKey: ['/api/shift-trades'],
    enabled: !!user,
  });

  const createTradeMutation = useMutation({
    mutationFn: async (data: { requesterId: string; responderId: string; requesterShiftId: number; responderShiftId: number; notes?: string }) => {
      await apiRequest('POST', '/api/shift-trades', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shift-trades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      toast({
        title: "Başarılı",
        description: "Vardiya takas talebi oluşturuldu",
      });
      setIsTradeDialogOpen(false);
      setSelectedShiftForTrade(null);
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Takas talebi oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  const respondTradeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('PATCH', `/api/shift-trades/${id}/respond`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shift-trades'] });
      toast({
        title: "Başarılı",
        description: "Takas talebi onaylandı",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Takas talebi yanıtlanamadı",
        variant: "destructive",
      });
    },
  });

  const approveTradeMutation = useMutation({
    mutationFn: async ({ id, approved, notes }: { id: number; approved: boolean; notes?: string }) => {
      await apiRequest('PATCH', `/api/shift-trades/${id}/approve`, { approved, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shift-trades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      toast({
        title: "Başarılı",
        description: "Takas talebi işlendi",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Takas talebi işlenemedi",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: InsertShift) => {
    if (editingShift) {
      updateMutation.mutate({ id: editingShift.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (shift: ShiftWithRelations) => {
    setEditingShift(shift);
    form.reset({
      branchId: shift.branchId,
      shiftDate: shift.shiftDate,
      startTime: shift.startTime,
      endTime: shift.endTime,
      shiftType: shift.shiftType as "morning" | "evening" | "night",
      status: shift.status as "draft" | "pending_hq" | "confirmed" | "completed" | "cancelled",
      assignedToId: shift.assignedToId,
      notes: shift.notes,
      createdById: shift.createdById,
    });
  };

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingShift(null);
    form.reset();
  };

  const handleAISuggest = () => {
    if (!user?.branchId) return;
    const weekEnd = endOfWeek(selectedWeekStart, { weekStartsOn: 1 });
    aiSuggestMutation.mutate({
      branchId: user.branchId,
      weekStart: format(selectedWeekStart, 'yyyy-MM-dd'),
      weekEnd: format(weekEnd, 'yyyy-MM-dd'),
    });
  };

  const calendarEvents: CalendarEvent[] = useMemo(() => {
    if (!shifts) return [];
    return shifts.map((shift) => {
      const start = parseISO(`${shift.shiftDate}T${shift.startTime}`);
      const end = parseISO(`${shift.shiftDate}T${shift.endTime}`);
      return {
        start,
        end,
        title: `${shift.assignedTo?.fullName || 'Atanmamış'} - ${shiftTypeLabels[shift.shiftType]}`,
        shift,
        resourceId: shift.assignedToId || undefined,
      };
    });
  }, [shifts]);

  // Client-side validation for shift updates
  const validateShiftUpdate = useCallback((
    shiftId: number,
    newData: Partial<InsertShift>
  ): { valid: boolean; error?: string } => {
    if (!shifts || !branchUsers) return { valid: true };

    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return { valid: true };

    const employeeId = newData.assignedToId !== undefined ? newData.assignedToId : shift.assignedToId;
    if (!employeeId) return { valid: true };

    const shiftDate = newData.shiftDate || shift.shiftDate;
    const startTime = newData.startTime || shift.startTime;
    const endTime = newData.endTime || shift.endTime;

    // 1. Check 1-hour break validation (shift duration)
    const start = parseISO(`${shiftDate}T${startTime}`);
    const end = parseISO(`${shiftDate}T${endTime}`);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    
    if (durationHours > 6 && durationHours < 7) {
      return { 
        valid: false, 
        error: "6 saatten uzun vardiyalar için 1 saat mola gereklidir. Toplam vardiya süresi en az 7 saat olmalıdır." 
      };
    }

    // Get week boundaries
    const weekStart = startOfWeek(parseISO(shiftDate), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(parseISO(shiftDate), { weekStartsOn: 1 });

    // Get all shifts for this employee in this week
    const employeeWeekShifts = shifts.filter(s => {
      if (s.assignedToId !== employeeId) return false;
      const sDate = parseISO(s.shiftDate);
      return sDate >= weekStart && sDate <= weekEnd;
    });

    // Calculate total weekly hours and days worked
    let totalWeeklyHours = 0;
    const daysWorked = new Set<string>();

    employeeWeekShifts.forEach(s => {
      if (s.id === shiftId) {
        totalWeeklyHours += durationHours;
        daysWorked.add(shiftDate);
      } else {
        const sStart = parseISO(`${s.shiftDate}T${s.startTime}`);
        const sEnd = parseISO(`${s.shiftDate}T${s.endTime}`);
        const sDuration = (sEnd.getTime() - sStart.getTime()) / (1000 * 60 * 60);
        totalWeeklyHours += sDuration;
        daysWorked.add(s.shiftDate);
      }
    });

    // 2. Check 45h/week limit
    if (totalWeeklyHours > 45) {
      return { 
        valid: false, 
        error: `Bu çalışan haftalık 45 saat sınırını aşacak (${totalWeeklyHours.toFixed(1)} saat). Lütfen vardiya süresini azaltın.` 
      };
    }

    // 3. Check minimum 1 day off per week (must work max 6 days)
    if (daysWorked.size > 6) {
      return { 
        valid: false, 
        error: "Çalışanlar haftada en az 1 gün izinli olmalıdır. Bu çalışan zaten 7 gün çalışıyor." 
      };
    }

    return { valid: true };
  }, [shifts, branchUsers]);

  const handleEventDrop = useCallback(({ event, start, end, resourceId }: { event: CalendarEvent; start: Date; end: Date; resourceId?: string }) => {
    if (!isSupervisor) return;
    
    const shiftDate = format(start, 'yyyy-MM-dd');
    const startTime = format(start, 'HH:mm:ss');
    const endTime = format(end, 'HH:mm:ss');

    const updateData: Partial<InsertShift> = {
      shiftDate,
      startTime,
      endTime,
    };

    if (resourceId && resourceId !== event.shift.assignedToId) {
      updateData.assignedToId = resourceId;
    }

    // Validate before mutation
    const validation = validateShiftUpdate(event.shift.id, updateData);
    if (!validation.valid) {
      toast({
        title: "Uyarı",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate({
      id: event.shift.id,
      data: updateData,
    });
  }, [isSupervisor, updateMutation, validateShiftUpdate, toast]);

  const handleEventResize = useCallback(({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
    if (!isSupervisor) return;

    const startTime = format(start, 'HH:mm:ss');
    const endTime = format(end, 'HH:mm:ss');

    const updateData = {
      startTime,
      endTime,
    };

    // Validate before mutation
    const validation = validateShiftUpdate(event.shift.id, updateData);
    if (!validation.valid) {
      toast({
        title: "Uyarı",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate({
      id: event.shift.id,
      data: updateData,
    });
  }, [isSupervisor, updateMutation, validateShiftUpdate, toast]);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    handleEdit(event.shift);
  }, []);

  const handleSelectSlot = useCallback((slotInfo: { start: Date; end: Date }) => {
    if (!isSupervisor) return;
    
    // Preserve current branchId or use filter (never 0)
    const targetBranchId = user?.branchId || selectedBranchFilter || form.getValues().branchId;
    
    // Validate branchId exists
    if (!targetBranchId) {
      toast({
        title: "Uyarı",
        description: "Lütfen önce şube seçin",
        variant: "destructive",
      });
      return;
    }
    
    // Partial reset - only update date/time fields, preserve context
    const currentValues = form.getValues();
    form.reset({
      ...currentValues,
      shiftDate: format(slotInfo.start, 'yyyy-MM-dd'),
      startTime: '09:00:00',
      endTime: '17:00:00',
      shiftType: 'morning',
      status: 'draft',
      assignedToId: null,
      branchId: targetBranchId,
      createdById: user?.id || '',
    });
    setEditingShift(null);
    setIsCreateDialogOpen(true);
  }, [form, user, isSupervisor, selectedBranchFilter, toast]);

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const shiftType = event.shift.shiftType;
    let backgroundColor = '#3174ad';
    
    if (shiftType === 'morning') backgroundColor = '#f59e0b';
    if (shiftType === 'evening') backgroundColor = '#3b82f6';
    if (shiftType === 'night') backgroundColor = '#8b5cf6';

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    };
  }, []);

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            Vardiya Yönetimi
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-page-description">
            {isSupervisor && "Şubenizin vardiyalarını yönetin"}
            {isHQIK && "Tüm şubelerin vardiyalarını görüntüleyin"}
            {isEmployee && "Size atanmış vardiyalarınızı görüntüleyin"}
          </p>
        </div>

        {isSupervisor && (
          <div className="flex gap-2">
            <div className="flex gap-1 mr-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
                data-testid="button-view-list"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'month' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('month')}
                data-testid="button-view-month"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>
            <Dialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-ai-suggest">
                  <Sparkles className="w-4 h-4 mr-2" />
                  🤖 AI Vardiya Öner
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>AI Vardiya Önerisi</DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    Geçmiş verilerinizi analiz ederek optimal vardiya planı oluşturulur. (Günde 3 öneri hakkınız var)
                  </p>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Hafta Seçin</label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedWeekStart(addWeeks(selectedWeekStart, -1))}
                        data-testid="button-prev-week"
                      >
                        ← Önceki Hafta
                      </Button>
                      <div className="flex-1 text-center py-2">
                        {format(selectedWeekStart, "d MMM", { locale: tr })} - {format(endOfWeek(selectedWeekStart, { weekStartsOn: 1 }), "d MMM yyyy", { locale: tr })}
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setSelectedWeekStart(addWeeks(selectedWeekStart, 1))}
                        data-testid="button-next-week"
                      >
                        Sonraki Hafta →
                      </Button>
                    </div>
                  </div>

                  <Button
                    onClick={handleAISuggest}
                    disabled={aiSuggestMutation.isPending}
                    className="w-full"
                    data-testid="button-generate-ai-plan"
                  >
                    {aiSuggestMutation.isPending ? "AI Analiz Ediyor..." : "✨ AI Öneri Oluştur"}
                  </Button>

                  {aiSuggestions && (
                    <div className="space-y-4 mt-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <h3 className="font-semibold mb-2">AI Özeti:</h3>
                        <p className="text-sm text-muted-foreground">{aiSuggestions.summary}</p>
                        {aiSuggestions.cached && (
                          <Badge variant="outline" className="mt-2">
                            Önbellekten Yüklendi
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">Önerilen Vardiyalar:</h3>
                          <Button
                            onClick={() => applyAISuggestionsMutation.mutate(aiSuggestions.suggestions)}
                            disabled={applyAISuggestionsMutation.isPending}
                            size="sm"
                            data-testid="button-apply-ai-suggestions"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            {applyAISuggestionsMutation.isPending ? "Uygulanıyor..." : "Hepsini Uygula"}
                          </Button>
                        </div>
                        {aiSuggestions.suggestions.map((suggestion, idx) => (
                          <div key={idx} className="p-3 border rounded-lg space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4" />
                                <span className="font-medium">
                                  {format(parseISO(suggestion.shiftDate), "d MMMM yyyy", { locale: tr })}
                                </span>
                                <Badge className={shiftTypeColors[suggestion.shiftType]}>
                                  {shiftTypeLabels[suggestion.shiftType]}
                                </Badge>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {suggestion.startTime} - {suggestion.endTime}
                              </span>
                            </div>
                            {suggestion.suggestedAssignee && (
                              <div className="flex items-center gap-2 text-sm">
                                <UserIcon className="w-3 h-3" />
                                <span>{suggestion.suggestedAssignee.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {Math.round(suggestion.suggestedAssignee.confidenceScore)}% güven
                                </Badge>
                              </div>
                            )}
                            <p className="text-sm text-muted-foreground">{suggestion.reasoning}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isCreateDialogOpen || !!editingShift} onOpenChange={(open) => {
              if (!open) handleCloseDialog();
              else setIsCreateDialogOpen(true);
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-shift">
                  <Plus className="w-4 h-4 mr-2" />
                  Yeni Vardiya
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingShift ? "Vardiya Düzenle" : "Yeni Vardiya"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="shiftDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Vardiya Tarihi *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                data-testid="button-select-date"
                              >
                                {field.value ? (
                                  format(parseISO(field.value), "PPP", { locale: tr })
                                ) : (
                                  <span>Tarih seçin</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? parseISO(field.value) : undefined}
                              onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                              disabled={(date) =>
                                date < new Date("2024-01-01")
                              }
                              initialFocus
                              locale={tr}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Başlangıç Saati *</FormLabel>
                          <FormControl>
                            <Input 
                              type="time"
                              {...field}
                              placeholder="09:00"
                              data-testid="input-start-time"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bitiş Saati *</FormLabel>
                          <FormControl>
                            <Input 
                              type="time"
                              {...field}
                              placeholder="17:00"
                              data-testid="input-end-time"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="shiftType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vardiya Tipi *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-shift-type">
                              <SelectValue placeholder="Vardiya tipi seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="morning">Sabah (08:00-16:00)</SelectItem>
                            <SelectItem value="evening">Akşam (16:00-00:00)</SelectItem>
                            <SelectItem value="night">Gece (00:00-08:00)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Durum *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-status">
                              <SelectValue placeholder="Durum seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">Taslak</SelectItem>
                            <SelectItem value="pending_hq">HQ Onayı Bekliyor</SelectItem>
                            <SelectItem value="confirmed">Onaylandı</SelectItem>
                            <SelectItem value="completed">Tamamlandı</SelectItem>
                            <SelectItem value="cancelled">İptal</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="assignedToId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Atanan Çalışan</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value === 'none' ? null : value)} 
                          value={field.value || 'none'}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-assigned-to">
                              <SelectValue placeholder="Çalışan seçin (opsiyonel)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Atanmamış</SelectItem>
                            {branchUsers?.map((employee: User) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.firstName} {employee.lastName} ({employee.role})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notlar</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field}
                            value={field.value ?? ''}
                            placeholder="Opsiyonel notlar..."
                            rows={3}
                            data-testid="input-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleCloseDialog}
                      data-testid="button-cancel"
                    >
                      İptal
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-submit"
                    >
                      {createMutation.isPending || updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtreler</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {isHQIK && (
              <div>
                <label className="text-sm font-medium mb-2 block">Şube</label>
                <Select 
                  value={selectedBranchFilter?.toString()} 
                  onValueChange={(value) => setSelectedBranchFilter(value === 'all' ? undefined : Number(value))}
                >
                  <SelectTrigger data-testid="select-branch-filter">
                    <SelectValue placeholder="Tüm şubeler" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Şubeler</SelectItem>
                    {branches?.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id.toString()}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isSupervisor && (
              <div>
                <label className="text-sm font-medium mb-2 block">Çalışan</label>
                <Select 
                  value={selectedUserFilter || 'all'} 
                  onValueChange={(value) => setSelectedUserFilter(value === 'all' ? undefined : value)}
                >
                  <SelectTrigger data-testid="select-user-filter">
                    <SelectValue placeholder="Tüm çalışanlar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Çalışanlar</SelectItem>
                    {branchUsers?.map((employee: User) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Başlangıç Tarihi</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                    data-testid="button-date-from"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PPP", { locale: tr }) : "Tarih seçin"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                    locale={tr}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Bitiş Tarihi</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                    data-testid="button-date-to"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PPP", { locale: tr }) : "Tarih seçin"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                    locale={tr}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {(dateFrom || dateTo || selectedBranchFilter || selectedUserFilter) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDateFrom(undefined);
                setDateTo(undefined);
                setSelectedBranchFilter(undefined);
                setSelectedUserFilter(undefined);
              }}
              data-testid="button-clear-filters"
            >
              Filtreleri Temizle
            </Button>
          )}
        </CardContent>
      </Card>

      {viewMode === 'month' ? (
        <Card className="p-4">
          <div style={{ height: '700px' }}>
            <DragDropCalendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              resources={branchUsers?.map((u: User) => ({
                id: u.id,
                title: `${u.firstName} ${u.lastName}`,
              })) || []}
              resourceIdAccessor="id"
              resourceTitleAccessor="title"
              style={{ height: '100%' }}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              selectable={isSupervisor}
              eventPropGetter={eventStyleGetter}
              resizable={isSupervisor}
              draggableAccessor={() => isSupervisor}
              views={['month']}
              defaultView="month"
              culture="tr"
              messages={{
                next: "Sonraki",
                previous: "Önceki",
                today: "Bugün",
                month: "Ay",
                week: "Hafta",
                day: "Gün",
                agenda: "Gündem",
                date: "Tarih",
                time: "Saat",
                event: "Vardiya",
                noEventsInRange: "Bu tarih aralığında vardiya yok",
                showMore: (total) => `+${total} daha`,
                allDay: "Tüm Gün",
                work_week: "Çalışma Haftası",
                yesterday: "Dün",
                tomorrow: "Yarın",
              }}
            />
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))
          ) : filteredShifts && filteredShifts.length > 0 ? (
            filteredShifts.map((shift) => (
            <Card key={shift.id} className="hover-elevate" data-testid={`card-shift-${shift.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-lg" data-testid={`text-shift-date-${shift.id}`}>
                        {format(parseISO(shift.shiftDate), "PPP", { locale: tr })}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground" data-testid={`text-branch-${shift.id}`}>
                        {shift.branch.name}
                      </p>
                    </div>
                  </div>

                  {isSupervisor && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(shift)}
                        data-testid={`button-edit-${shift.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          if (confirm("Bu vardiyayı silmek istediğinize emin misiniz?")) {
                            deleteMutation.mutate(shift.id);
                          }
                        }}
                        data-testid={`button-delete-${shift.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Saat Aralığı</div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium" data-testid={`text-time-${shift.id}`}>
                        {shift.startTime.slice(0, 5)} - {shift.endTime.slice(0, 5)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Vardiya Tipi</div>
                    <Badge 
                      className={cn("rounded-md", shiftTypeColors[shift.shiftType])}
                      data-testid={`badge-type-${shift.id}`}
                    >
                      {shiftTypeLabels[shift.shiftType]}
                    </Badge>
                  </div>

                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Durum</div>
                    <Badge 
                      className={cn("rounded-md", statusColors[shift.status])}
                      data-testid={`badge-status-${shift.id}`}
                    >
                      {statusLabels[shift.status]}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Atanan Çalışan</div>
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-muted-foreground" />
                      <span data-testid={`text-assigned-${shift.id}`}>
                        {shift.assignedTo?.fullName || "Atanmamış"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Oluşturan</div>
                    <span className="text-sm" data-testid={`text-created-by-${shift.id}`}>
                      {shift.createdBy.fullName}
                    </span>
                  </div>
                </div>

                {shift.notes && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Notlar</div>
                    <p className="text-sm" data-testid={`text-notes-${shift.id}`}>
                      {shift.notes}
                    </p>
                  </div>
                )}

                {shift.assignedToId === user?.id && (
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedShiftForTrade(shift);
                        setIsTradeDialogOpen(true);
                      }}
                      data-testid={`button-trade-${shift.id}`}
                      className="w-full"
                    >
                      <ArrowLeftRight className="w-4 h-4 mr-2" />
                      Vardiya Takası
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <p data-testid="text-no-shifts">Henüz vardiya bulunmuyor</p>
              {isSupervisor && <p className="text-sm mt-2">Yeni bir vardiya oluşturmak için yukarıdaki butonu kullanın</p>}
            </CardContent>
          </Card>
        )}
        </div>
      )}

      {/* Shift Trade Dialog */}
      <Dialog open={isTradeDialogOpen} onOpenChange={setIsTradeDialogOpen}>
        <DialogContent data-testid="dialog-shift-trade">
          <DialogHeader>
            <DialogTitle>Vardiya Takası Talebi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedShiftForTrade && (
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground mb-1">Takas Edilecek Vardiya</p>
                <p className="font-medium">
                  {format(parseISO(selectedShiftForTrade.shiftDate), "PPP", { locale: tr })}
                </p>
                <p className="text-sm">
                  {selectedShiftForTrade.startTime.slice(0, 5)} - {selectedShiftForTrade.endTime.slice(0, 5)} ({shiftTypeLabels[selectedShiftForTrade.shiftType]})
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Takas Yapılacak Vardiya</label>
              <Select
                onValueChange={(value) => {
                  const targetShift = filteredShifts?.find(s => s.id === parseInt(value));
                  if (targetShift && selectedShiftForTrade && user) {
                    createTradeMutation.mutate({
                      requesterId: user.id,
                      responderId: targetShift.assignedToId!,
                      requesterShiftId: selectedShiftForTrade.id,
                      responderShiftId: targetShift.id,
                      notes: '',
                    });
                  }
                }}
                disabled={createTradeMutation.isPending}
              >
                <SelectTrigger data-testid="select-target-shift">
                  <SelectValue placeholder="Bir vardiya seçin" />
                </SelectTrigger>
                <SelectContent>
                  {filteredShifts
                    ?.filter(s => 
                      s.id !== selectedShiftForTrade?.id && 
                      s.assignedToId && 
                      s.assignedToId !== user?.id &&
                      s.branchId === selectedShiftForTrade?.branchId
                    )
                    .map(shift => (
                      <SelectItem key={shift.id} value={shift.id.toString()} data-testid={`option-shift-${shift.id}`}>
                        {format(parseISO(shift.shiftDate), "PPP", { locale: tr })} - {shift.assignedTo?.fullName} ({shift.startTime.slice(0, 5)} - {shift.endTime.slice(0, 5)})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pending Trades Panel */}
      {shiftTrades && shiftTrades.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Bekleyen Takas Talepleri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {shiftTrades.map((trade) => {
              const requesterShift = shifts?.find(s => s.id === trade.requesterShiftId);
              const responderShift = shifts?.find(s => s.id === trade.responderShiftId);
              
              const statusLabels: Record<string, string> = {
                taslak: "Taslak",
                calisan_onayi: "Çalışan Onayı",
                yonetici_onayi: "Yönetici Onayı",
                reddedildi: "Reddedildi",
                iptal: "İptal",
              };

              const statusColors: Record<string, string> = {
                taslak: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
                calisan_onayi: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
                yonetici_onayi: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                reddedildi: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
                iptal: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
              };

              const isResponder = trade.responderId === user?.id;
              const isRequester = trade.requesterId === user?.id;
              const canApprove = isSupervisor || user?.role === 'coach' || user?.role === 'admin';

              return (
                <Card key={trade.id} data-testid={`card-trade-${trade.id}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className={cn("rounded-md", statusColors[trade.status])} data-testid={`badge-trade-status-${trade.id}`}>
                        {statusLabels[trade.status]}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(trade.createdAt!), "PPP", { locale: tr })}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground mb-1">Takas Eden</p>
                        {requesterShift && (
                          <>
                            <p className="font-medium">{requesterShift.assignedTo?.fullName}</p>
                            <p className="text-sm">{format(parseISO(requesterShift.shiftDate), "PP", { locale: tr })}</p>
                            <p className="text-sm">{requesterShift.startTime.slice(0, 5)} - {requesterShift.endTime.slice(0, 5)}</p>
                          </>
                        )}
                      </div>

                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground mb-1">Takas Alacak</p>
                        {responderShift && (
                          <>
                            <p className="font-medium">{responderShift.assignedTo?.fullName}</p>
                            <p className="text-sm">{format(parseISO(responderShift.shiftDate), "PP", { locale: tr })}</p>
                            <p className="text-sm">{responderShift.startTime.slice(0, 5)} - {responderShift.endTime.slice(0, 5)}</p>
                          </>
                        )}
                      </div>
                    </div>

                    {trade.notes && (
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground mb-1">Not</p>
                        <p className="text-sm">{trade.notes}</p>
                      </div>
                    )}

                    {trade.supervisorNotes && (
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground mb-1">Yönetici Notu</p>
                        <p className="text-sm">{trade.supervisorNotes}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {isResponder && trade.status === 'taslak' && (
                        <Button
                          onClick={() => respondTradeMutation.mutate(trade.id)}
                          disabled={respondTradeMutation.isPending}
                          data-testid={`button-respond-${trade.id}`}
                          className="flex-1"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Onayla
                        </Button>
                      )}

                      {canApprove && trade.status === 'calisan_onayi' && (
                        <>
                          <Button
                            onClick={() => approveTradeMutation.mutate({ id: trade.id, approved: true })}
                            disabled={approveTradeMutation.isPending}
                            data-testid={`button-approve-${trade.id}`}
                            className="flex-1"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Onayla
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => approveTradeMutation.mutate({ id: trade.id, approved: false })}
                            disabled={approveTradeMutation.isPending}
                            data-testid={`button-reject-${trade.id}`}
                            className="flex-1"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Reddet
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
