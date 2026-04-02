import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ConfirmDeleteDialog, useConfirmDelete } from "@/components/confirm-delete-dialog";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfWeek, addDays, isToday, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Sparkles, X, Loader2, Wand2, UserPlus, Trash2, AlertTriangle, Calendar, GripVertical, ArrowLeftRight, Clock, CheckCircle2, XCircle, CalendarPlus, FileText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

// Helper function to generate consistent color for each employee
function getEmployeeColor(employeeId: string | number): string {
  const colors = [
    'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700',
    'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700',
    'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700',
    'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-700',
    'bg-purple-100 dark:bg-purple-900/40 border-purple-300 dark:border-purple-700',
    'bg-pink-100 dark:bg-pink-900/40 border-pink-300 dark:border-pink-700',
    'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-300 dark:border-indigo-700',
    'bg-cyan-100 dark:bg-cyan-900/40 border-cyan-300 dark:border-cyan-700',
    'bg-orange-100 dark:bg-orange-900/40 border-orange-300 dark:border-orange-700',
    'bg-teal-100 dark:bg-teal-900/40 border-teal-300 dark:border-teal-700',
  ];
  
  // Hash employee ID to determine color index
  const id = String(employeeId);
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return colors[Math.abs(hash) % colors.length];
}

// Draggable Shift Chip Component
// Entire card is draggable when canEdit is true - hold and drag to move
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

  const colorClass = getEmployeeColor(employee?.id || shift.assignedToId);
  const name = employee?.fullName || employee?.firstName || 'Bilinmiyor';

  // Handle click vs drag - only trigger onClick if not dragging
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isDragging && shift?.id) onClick();
  };

  return (
    <div
      ref={setNodeRef}
      {...(canEdit ? { ...listeners, ...attributes } : {})}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.5 : 1,
        touchAction: 'none',
      }}
      onClick={handleClick}
      className={`w-full p-1.5 rounded border text-left text-xs transition-all ${colorClass} ${canEdit ? 'cursor-grab active:cursor-grabbing' : 'opacity-60'}`}
      data-testid={`shift-chip-${shift.id}`}
    >
      <div className="flex items-center gap-1">
        {canEdit && (
          <GripVertical className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{name}</div>
          <div className="opacity-70">
            {shift.startTime?.substring(0, 5)}-{shift.endTime?.substring(0, 5)}
          </div>
        </div>
      </div>
    </div>
  );
}

// Droppable Day Cell Component
function DroppableDayCell({ dateStr, children, isOver, onDayClick }: {
  dateStr: string;
  children: React.ReactNode;
  isOver?: boolean;
  onDayClick?: (dateStr: string) => void;
}) {
  const { setNodeRef, isOver: dropIsOver } = useDroppable({
    id: `day-${dateStr}`,
    data: { dateStr },
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[80px] p-2 space-y-1 transition-colors cursor-pointer ${
        dropIsOver ? 'bg-primary/10 ring-2 ring-primary ring-inset' : ''
      }`}
      onClick={() => onDayClick?.(dateStr)}
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
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [periodWeeks, setPeriodWeeks] = useState<1 | 2>(1);
  const [activeShift, setActiveShift] = useState<any>(null);
  
  // Shift swap states
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapSourceShift, setSwapSourceShift] = useState<any>(null);
  const [swapTargetShift, setSwapTargetShift] = useState<any>(null);
  const [swapReason, setSwapReason] = useState('');

  // Inline form states (no more modal)
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:30');
  const [breakTime, setBreakTime] = useState('12:00');
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState<'all' | 'fulltime' | 'parttime'>('all');
  const [checklist1, setChecklist1] = useState('');
  const [checklist2, setChecklist2] = useState('');
  const [checklist3, setChecklist3] = useState('');

  // Drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Tab state
  const [activeTab, setActiveTab] = useState<'schedule' | 'swap-requests' | 'compliance'>('schedule');
  const [dobodyDismissed, setDobodyDismissed] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");

  // Role-based access: Only these roles can edit shifts
  const editableRoles = ['supervisor', 'supervisor_buddy', 'destek', 'muhasebe', 'coach', 'teknik', 'satinalma', 'fabrika', 'yatirimci_hq', 'admin'];
  const canEditShifts = user?.role && editableRoles.includes(user.role);
  const isSupervisor = user?.role === 'supervisor' || user?.role === 'supervisor_buddy' || ['admin', 'hq_admin', 'hq_staff', 'destek'].includes(user?.role || '');

  const { data: shifts, isLoading: shiftsLoading, isError, refetch } = useQuery({
    queryKey: ['/api/shifts'],
  });

  // Fetch pending swap requests for current user (as target)
  const { data: pendingSwapRequestsForMe } = useQuery({
    queryKey: ['/api/shift-swap-requests/pending-for-me'],
  });

  // Fetch all swap requests for the branch
  const { data: allSwapRequests, refetch: refetchSwapRequests } = useQuery({
    queryKey: ['/api/shift-swap-requests'],
  });

  // Fetch pending supervisor approval requests
  const { data: pendingSuperviorRequests } = useQuery({
    queryKey: ['/api/shift-swap-requests/pending-supervisor'],
    enabled: isSupervisor,
  });

  const { data: allEmployees } = useQuery({
    queryKey: ['/api/employees'],
    staleTime: 600000,
  });

  // Fetch branch details for opening/closing hours
  const { data: branchData } = useQuery({
    queryKey: ['/api/branches', user?.branchId],
    staleTime: 300000,
    enabled: !!user?.branchId,
  });

  const branchHours = useMemo(() => {
    if (!branchData) return null;
    return {
      openingHours: branchData.openingHours || '08:00',
      closingHours: branchData.closingHours || '22:00',
    };
  }, [branchData]);

  const branchEmployees = useMemo(() => {
    if (!allEmployees || !Array.isArray(allEmployees)) return [];
    return allEmployees.filter((emp: any) => emp.branchId === user?.branchId);
  }, [allEmployees, user?.branchId]);

  const { data: checklists } = useQuery({
    queryKey: ['/api/checklists'],
    staleTime: 1800000,
  });

  const { data: tasks } = useQuery({
    queryKey: ['/api/tasks'],
    staleTime: 60000,
  });

  // Calculate weekly hours for each employee from existing shifts (excluding 1-hour breaks)
  const getEmployeeWeeklyHours = useCallback((employeeId: string) => {
    if (!Array.isArray(shifts)) return 0;
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const weekEndStr = format(addDays(weekStart, 6), 'yyyy-MM-dd');
    
    const employeeShifts = shifts.filter((s: any) => 
      String(s.assignedToId) === employeeId && 
      s.shiftDate >= weekStartStr && 
      s.shiftDate <= weekEndStr
    );
    
    let totalMinutes = 0;
    employeeShifts.forEach((shift: any) => {
      if (shift.startTime && shift.endTime) {
        const [sH, sM] = shift.startTime.split(':').map(Number);
        const [eH, eM] = shift.endTime.split(':').map(Number);
        let shiftMinutes = (eH * 60 + eM) - (sH * 60 + sM);
        // Gece yarısını geçen vardiya (kapanış) düzeltmesi
        if (shiftMinutes < 0) shiftMinutes += 24 * 60;
        // Mola düşümü: 6 saat ve üstü vardiyalarda 1 saat mola
        if (shiftMinutes >= 360) shiftMinutes -= 60;
        totalMinutes += shiftMinutes;
      }
    });
    
    return Math.round(totalMinutes / 60 * 10) / 10;
  }, [shifts, weekStart]);

  // Calculate new shift hours (excluding 1-hour break), handles midnight crossover
  const calculateShiftHours = useCallback(() => {
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    let totalMinutes = (eH * 60 + eM) - (sH * 60 + sM);
    if (totalMinutes < 0) totalMinutes += 24 * 60; // gece yarısı düzeltmesi
    const workMinutes = totalMinutes >= 360 ? totalMinutes - 60 : totalMinutes;
    return workMinutes / 60;
  }, [startTime, endTime]);

  // Available employees filtered by type and availability
  const availableEmployees = useMemo(() => {
    let filtered = branchEmployees;
    
    if (employeeTypeFilter !== 'all') {
      filtered = filtered.filter((emp: any) => emp.employmentType === employeeTypeFilter);
    }
    
    if (!selectedDays.length) return filtered;
    
    // Filter out employees already assigned on selected days
    const assignedEmployeeIds = new Set<string>();
    selectedDays.forEach(day => {
      const dayShifts = Array.isArray(shifts) 
        ? shifts.filter((s: any) => s.shiftDate === day)
        : [];
      dayShifts.forEach((s: any) => {
        if (s.assignedToId) assignedEmployeeIds.add(String(s.assignedToId));
      });
    });

    return filtered.filter((emp: any) => !assignedEmployeeIds.has(String(emp.id)));
  }, [branchEmployees, selectedDays, shifts, employeeTypeFilter]);

  // Check if employee would exceed weekly limit with new shifts
  const hoursCheck = useMemo(() => {
    if (!selectedEmployee) return null;
    
    const emp = branchEmployees.find((e: any) => String(e.id) === selectedEmployee);
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
  }, [selectedEmployee, branchEmployees, getEmployeeWeeklyHours, calculateShiftHours, selectedDays]);

  // Get selected employee details
  const selectedEmployeeDetails = useMemo(() => {
    if (!selectedEmployee) return null;
    return branchEmployees.find((e: any) => String(e.id) === selectedEmployee);
  }, [selectedEmployee, branchEmployees]);

  // Toggle day selection
  const toggleDay = (dateStr: string) => {
    setSelectedDays(prev => 
      prev.includes(dateStr) 
        ? prev.filter(d => d !== dateStr)
        : [...prev, dateStr]
    );
  };

  // Reset inline form
  const resetInlineForm = () => {
    setSelectedEmployee('');
    setSelectedDays([]);
    setStartTime('08:00');
    setEndTime('16:30');
    setBreakTime('12:00');
    setEmployeeTypeFilter('all');
    setChecklist1('');
    setChecklist2('');
    setChecklist3('');
  };

  const getDospressoShiftType = useCallback((time: string): { label: string; key: string } => {
    const [h, m] = time.split(':').map(Number);
    const minutes = h * 60 + m;
    if (minutes <= 8 * 60) return { label: 'Açılış', key: 'opening' };
    if (minutes <= 12 * 60) return { label: 'Aracı', key: 'intermediate' };
    if (minutes <= 16 * 60) return { label: '1. Kapanış', key: 'first_closing' };
    return { label: 'Kapanış', key: 'closing' };
  }, []);

  const validateBreakTime = useCallback((start: string, breakVal: string): boolean => {
    const [sH, sM] = start.split(':').map(Number);
    const [bH, bM] = breakVal.split(':').map(Number);
    const startMin = sH * 60 + sM;
    const breakMin = bH * 60 + bM;
    const diff = breakMin - startMin;
    return diff >= 180 && diff <= 300;
  }, []);

  const [breakWarning, setBreakWarning] = useState('');

  useEffect(() => {
    if (!selectedEmployee || !selectedEmployeeDetails) return;

    const isParttime = selectedEmployeeDetails.employmentType === 'parttime';
    const [sH, sM] = startTime.split(':').map(Number);
    const startMinutes = sH * 60 + sM;

    if (isParttime) {
      const endMinutes = startMinutes + 4 * 60;
      const endH = Math.floor(endMinutes / 60) % 24;
      const endM = endMinutes % 60;
      setEndTime(`${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`);
      setBreakWarning('');
    } else {
      const totalMinutes = 8 * 60 + 30;
      const endMinutes = startMinutes + totalMinutes;
      const endH = Math.floor(endMinutes / 60) % 24;
      const endM = endMinutes % 60;
      setEndTime(`${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`);

      const breakMinutes = startMinutes + 4 * 60;
      const breakH = Math.floor(breakMinutes / 60) % 24;
      const breakM = breakMinutes % 60;
      setBreakTime(`${String(breakH).padStart(2, '0')}:${String(breakM).padStart(2, '0')}`);
      setBreakWarning('');
    }
  }, [startTime, selectedEmployee, selectedEmployeeDetails]);

  useEffect(() => {
    if (!selectedEmployee || !selectedEmployeeDetails) return;
    if (selectedEmployeeDetails.employmentType === 'parttime') {
      setBreakWarning('');
      return;
    }
    if (!validateBreakTime(startTime, breakTime)) {
      setBreakWarning('Mola başlangıçtan 3-5 saat sonra olmalıdır');
    } else {
      setBreakWarning('');
    }
  }, [breakTime, startTime, selectedEmployee, selectedEmployeeDetails, validateBreakTime]);

  // Create shifts mutation for inline form
  const createShiftsMutation = useMutation({
    mutationFn: async () => {
      const [sH] = startTime.split(':').map(Number);
      const [bH] = breakTime.split(':').map(Number);
      const breakEndH = (bH + 1) % 24;
      const shiftType = sH < 12 ? 'morning' : 'evening';

      const newShifts = selectedDays.map(dateStr => ({
        shiftDate: dateStr,
        startTime: `${startTime}:00`,
        endTime: `${endTime}:00`,
        breakStartTime: `${breakTime}:00`,
        breakEndTime: `${String(breakEndH).padStart(2, '0')}:00:00`,
        shiftType,
        assignedToId: selectedEmployee,
        status: 'draft',
        branchId: user?.branchId || 0,
        checklistId: checklist1 && checklist1 !== 'none' ? parseInt(checklist1) : null,
        checklist2Id: checklist2 && checklist2 !== 'none' ? parseInt(checklist2) : null,
        checklist3Id: checklist3 && checklist3 !== 'none' ? parseInt(checklist3) : null,
      }));

      // Çakışma + 11 saat kontrolü
      const allWarnings: string[] = [];
      const allErrors: string[] = [];
      for (const s of newShifts) {
        try {
          const res = await fetch('/api/shifts/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ branchId: s.branchId, assignedToId: s.assignedToId, shiftDate: s.shiftDate, startTime: s.startTime, endTime: s.endTime }),
          });
          if (res.ok) {
            const v = await res.json();
            allErrors.push(...v.errors);
            allWarnings.push(...v.warnings);
          }
        } catch {}
      }
      if (allErrors.length > 0) throw new Error(allErrors[0]);
      if (allWarnings.length > 0) {
        toast({ title: "⚠ Dinlenme Uyarısı", description: allWarnings[0], variant: "destructive" });
      }

      return apiRequest('POST', '/api/shifts/bulk-create', { shifts: newShifts });
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: `${selectedDays.length} vardiya oluşturuldu` });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      resetInlineForm();
    },
    onError: (err: Error) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const canSaveShift = selectedEmployee && selectedDays.length > 0;

  // Mr. Dobody shift planner uyarıları
  const { data: dobodyWarnings = [] } = useQuery<any[]>({
    queryKey: ["/api/agent/actions", "shift_planner"],
    queryFn: async () => {
      const res = await fetch("/api/agent/actions?status=pending&limit=5", { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      const arr = Array.isArray(data) ? data : (data.actions || []);
      return arr.filter((a: any) =>
        ["weekend_off_violation","peak_understaffed","rotation_imbalance","week_not_planned"].includes(a.metadata?.type || a.type)
      );
    },
    refetchInterval: 120000,
  });

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

  const copyWeekMutation = useMutation({
    mutationFn: (params: { sourceWeekStart: string; targetWeekStart: string; branchId: number }) =>
      apiRequest('POST', '/api/shifts/copy-week', params).then((r: Response) => r.json()),
    onSuccess: (data: any) => {
      toast({ title: "Hafta Kopyalandı", description: data.message });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
    },
    onError: (err: Error) => toast({ title: "Kopyalama Hatası", description: err.message, variant: "destructive" }),
  });

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

  // Shift swap request mutation
  const createSwapRequestMutation = useMutation({
    mutationFn: async (data: { requesterShiftId: number; targetShiftId: number; targetUserId: string; branchId: number; swapDate: string; reason: string }) => {
      return apiRequest('POST', '/api/shift-swap-requests', data);
    },
    onSuccess: () => {
      toast({ 
        title: "Takas Talebi Gönderildi", 
        description: "Karşı tarafın onayı bekleniyor",
      });
      setSwapModalOpen(false);
      setSwapSourceShift(null);
      setSwapTargetShift(null);
      setSwapReason('');
      queryClient.invalidateQueries({ queryKey: ['/api/shift-swap-requests'] });
    },
    onError: (err: Error) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  // Find a shift by its ID
  const findShiftById = (shiftId: number) => {
    if (!shifts || !Array.isArray(shifts)) return null;
    return shifts.find((s: any) => s.id === shiftId);
  };

  // Find employee by ID
  const findEmployeeById = (employeeId: string) => {
    return branchEmployees.find(e => e.id === employeeId);
  };

  // Handle drag end - now supports shift-to-shift swap
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveShift(null);
    const { active, over } = event;
    
    if (!over || !active.data.current) return;
    
    const sourceShift = active.data.current.shift;
    const overId = String(over.id);
    
    // Check if dropped on another shift (for swap)
    if (overId.startsWith('shift-')) {
      const targetShiftId = parseInt(overId.replace('shift-', ''));
      const targetShift = findShiftById(targetShiftId);
      
      if (targetShift && targetShift.id !== sourceShift.id) {
        // Different employee's shift - open swap modal
        if (targetShift.assignedToId !== sourceShift.assignedToId) {
          setSwapSourceShift(sourceShift);
          setSwapTargetShift(targetShift);
          setSwapModalOpen(true);
          return;
        }
      }
      return;
    }
    
    // Regular day-to-day move
    const targetDateStr = over.data.current?.dateStr;
    if (!targetDateStr || sourceShift.shiftDate === targetDateStr) return;
    
    // Check for conflict
    const conflict = detectConflict(sourceShift.assignedToId, targetDateStr, sourceShift.id);
    if (conflict) {
      toast({ 
        title: "Çakışma Tespit Edildi", 
        description: `Bu personel ${targetDateStr} tarihinde zaten başka bir vardiyaya atanmış.`,
        variant: "destructive" 
      });
      return;
    }
    
    moveShiftMutation.mutate({ shiftId: sourceShift.id, newDate: targetDateStr });
  };

  // Submit swap request
  const handleSubmitSwapRequest = () => {
    if (!swapSourceShift || !swapTargetShift || !user?.branchId) return;
    
    createSwapRequestMutation.mutate({
      requesterShiftId: swapSourceShift.id,
      targetShiftId: swapTargetShift.id,
      targetUserId: swapTargetShift.assignedToId,
      branchId: user.branchId,
      swapDate: swapSourceShift.shiftDate,
      reason: swapReason,
    });
  };

  // Target approve/reject mutations
  const targetApproveMutation = useMutation({
    mutationFn: async (requestId: number) => {
      return apiRequest('PATCH', `/api/shift-swap-requests/${requestId}/target-approve`, {});
    },
    onSuccess: () => {
      toast({ title: "Onaylandı", description: "Takas talebi onaylandı, yönetici onayı bekleniyor" });
      queryClient.invalidateQueries({ queryKey: ['/api/shift-swap-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shift-swap-requests/pending-for-me'] });
    },
    onError: (err: Error) => toast({ title: "Hata", description: err.message, variant: "destructive" }),
  });

  const targetRejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: number; reason: string }) => {
      return apiRequest('PATCH', `/api/shift-swap-requests/${requestId}/target-reject`, { rejectionReason: reason });
    },
    onSuccess: () => {
      toast({ title: "Reddedildi", description: "Takas talebi reddedildi" });
      queryClient.invalidateQueries({ queryKey: ['/api/shift-swap-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shift-swap-requests/pending-for-me'] });
    },
    onError: (err: Error) => toast({ title: "Hata", description: err.message, variant: "destructive" }),
  });

  // Supervisor approve/reject mutations
  const supervisorApproveMutation = useMutation({
    mutationFn: async (requestId: number) => {
      return apiRequest('PATCH', `/api/shift-swap-requests/${requestId}/supervisor-approve`, {});
    },
    onSuccess: () => {
      toast({ title: "Takas Tamamlandı", description: "Vardiyalar başarıyla takas edildi" });
      queryClient.invalidateQueries({ queryKey: ['/api/shift-swap-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shift-swap-requests/pending-supervisor'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
    },
    onError: (err: Error) => toast({ title: "Hata", description: err.message, variant: "destructive" }),
  });

  const supervisorRejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: number; reason: string }) => {
      return apiRequest('PATCH', `/api/shift-swap-requests/${requestId}/supervisor-reject`, { rejectionReason: reason });
    },
    onSuccess: () => {
      toast({ title: "Reddedildi", description: "Takas talebi reddedildi" });
      queryClient.invalidateQueries({ queryKey: ['/api/shift-swap-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shift-swap-requests/pending-supervisor'] });
    },
    onError: (err: Error) => toast({ title: "Hata", description: err.message, variant: "destructive" }),
  });

  // Pending counts for badge
  const pendingForMeCount = Array.isArray(pendingSwapRequestsForMe) ? pendingSwapRequestsForMe.length : 0;
  const pendingSupervisorCount = Array.isArray(pendingSuperviorRequests) ? pendingSuperviorRequests.length : 0;
  const totalPendingCount = pendingForMeCount + (isSupervisor ? pendingSupervisorCount : 0);

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
          <h1 className="text-xl font-bold">Vardiya Planlama</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{format(weekStart, "d MMM", { locale: tr })} - {format(periodEndDate, "d MMM yyyy", { locale: tr })}</span>
            {branchHours && (
              <Badge variant="outline" className="text-[10px] px-1.5" data-testid="badge-branch-hours">
                {branchHours.openingHours?.substring(0, 5)} - {branchHours.closingHours?.substring(0, 5)}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap items-center">
          {activeTab === 'schedule' && (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Stats Strip — haftalık özet */}
      {branchEmployees.length > 0 && (
        <div className="flex items-center gap-5 text-xs px-1 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
            <span className="text-muted-foreground">45sa tamamlayan</span>
            <span className="font-semibold">{branchEmployees.filter((e:any) => { const h=getEmployeeWeeklyHours(String(e.id)); const l=e.weeklyHours||(e.employmentType==='parttime'?25:45); return h>=l; }).length}/{branchEmployees.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"></div>
            <span className="text-muted-foreground">Saat eksik</span>
            <span className="font-semibold">{branchEmployees.filter((e:any) => { const h=getEmployeeWeeklyHours(String(e.id)); const l=e.weeklyHours||(e.employmentType==='parttime'?25:45); return h>0&&h<l; }).length} kişi</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></div>
            <span className="text-muted-foreground">Boş gün</span>
            <span className="font-semibold">{gapsInPeriod.length}</span>
          </div>
          {dobodyWarnings.length > 0 && !dobodyDismissed && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:"#7f77dd"}}></div>
              <span className="text-muted-foreground">Dobody uyarısı</span>
              <span className="font-semibold">{dobodyWarnings.length}</span>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'schedule' | 'swap-requests' | 'compliance')} className="w-full">
        <div className="flex items-center gap-2 flex-wrap">
          <TabsList className="grid max-w-lg grid-cols-3">
            <TabsTrigger value="schedule" className="gap-2" data-testid="tab-schedule">
              <Calendar className="w-4 h-4" />
              Haftalık Görünüm
            </TabsTrigger>
            <TabsTrigger value="swap-requests" className="gap-2 relative" data-testid="tab-swap-requests">
              <ArrowLeftRight className="w-4 h-4" />
              Takas Talepleri
              {totalPendingCount > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                  {totalPendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="compliance" className="gap-2" data-testid="tab-compliance">
              <CheckCircle2 className="w-4 h-4" />
              Uyumluluk
            </TabsTrigger>
          </TabsList>

          {/* Quick Links */}
          <div className="flex gap-2 ml-auto">
            <Link href="/leave-requests">
              <Button variant="outline" size="sm" className="gap-2" data-testid="link-leave-requests">
                <CalendarPlus className="w-4 h-4" />
                İzin Talepleri
              </Button>
            </Link>
            <Link href="/overtime-requests">
              <Button variant="outline" size="sm" className="gap-2" data-testid="link-overtime-requests">
                <Clock className="w-4 h-4" />
                Mesai Talepleri
              </Button>
            </Link>
          </div>
        </div>

        <TabsContent value="schedule" className="mt-4">

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
          Bu Hafta
        </Button>
        <Button size="icon" variant="outline" onClick={nextWeek} data-testid="button-next-week">
          <ChevronRight className="w-4 h-4" />
        </Button>
        <span className="text-xs text-muted-foreground ml-2">
          {canEditShifts && "Sürükle-bırak ile vardiyaları taşıyabilirsiniz"}
        </span>
        {canEditShifts && (
          <Button
            size="sm"
            variant="outline"
            className="ml-auto gap-1.5 text-xs"
            disabled={copyWeekMutation.isPending}
            onClick={() => {
              const prevWeekStart = new Date(weekStart);
              prevWeekStart.setDate(prevWeekStart.getDate() - 7);
              copyWeekMutation.mutate({
                sourceWeekStart: prevWeekStart.toISOString().split('T')[0],
                targetWeekStart: weekStart.toISOString().split('T')[0],
                branchId: user?.branchId,
              });
            }}
            data-testid="button-copy-prev-week"
          >
            {copyWeekMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CalendarPlus className="h-3 w-3" />}
            Geçen Haftayı Kopyala
          </Button>
        )}
      </div>

      {/* Personel Haftalık Saat Özeti — Grid kart görünümü */}
      {branchEmployees.length > 0 && (
        <div className="rounded-xl border p-3 mb-1" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Haftalık Saat Özeti</span>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="text-green-400">✓ {branchEmployees.filter((e:any) => { const h = getEmployeeWeeklyHours(String(e.id)); const l = e.weeklyHours || (e.employmentType==='parttime'?25:45); return h >= l; }).length} tamamlandı</span>
              <span className="text-amber-400">⚠ {branchEmployees.filter((e:any) => { const h = getEmployeeWeeklyHours(String(e.id)); const l = e.weeklyHours || (e.employmentType==='parttime'?25:45); return h > 0 && h < l; }).length} eksik</span>
              <span className="text-muted-foreground/50">{branchEmployees.filter((e:any) => getEmployeeWeeklyHours(String(e.id)) === 0).length} atanmamış</span>
            </div>
          </div>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
            {branchEmployees.map((emp: any) => {
              const hours = getEmployeeWeeklyHours(String(emp.id));
              const limit = emp.weeklyHours || (emp.employmentType === 'parttime' ? 25 : 45);
              const pct = Math.min(100, Math.round((hours / limit) * 100));
              const over = hours > limit;
              const under = hours > 0 && hours < limit;
              const barColor = over ? '#ef4444' : under ? '#f59e0b' : '#22c55e';
              const textColor = over ? '#f87171' : under ? '#fbbf24' : '#4ade80';
              const bg = over ? 'rgba(239,68,68,0.08)' : under ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)';
              const borderColor = over ? 'rgba(239,68,68,0.25)' : under ? 'rgba(245,158,11,0.25)' : 'rgba(34,197,94,0.2)';
              return (
                <div key={emp.id} className="rounded-md p-2" style={{ background: bg, border: `0.5px solid ${borderColor}` }}>
                  <div className="text-xs font-medium truncate">{emp.firstName} {emp.lastName?.charAt(0)}.</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                    <span className="text-[10px] font-medium flex-shrink-0" style={{ color: textColor }}>
                      {hours}/{limit}s{over ? ' ⚠' : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
            {/* Mr. Dobody Shift Planner Uyarıları — kapatılabilir */}
      {dobodyWarnings.length > 0 && !dobodyDismissed && (
        <div className="rounded-xl border px-3 py-2.5 mb-1" style={{ background: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.25)' }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
              🤖 Mr. Dobody — {dobodyWarnings.length} Vardiya Uyarısı
            </span>
            <button onClick={() => setDobodyDismissed(true)} className="text-[10px] text-muted-foreground hover:text-foreground">✕ kapat</button>
          </div>
          <div className="space-y-1">
            {dobodyWarnings.slice(0, 3).map((w: any, i: number) => (
              <div key={i} className="text-xs text-amber-300/80 flex items-start gap-1.5">
                <span className="mt-0.5 flex-shrink-0">⚠</span>
                <span>{w.message || w.description || String(w)}</span>
              </div>
            ))}
            {dobodyWarnings.length > 3 && (
              <div className="text-[10px] text-muted-foreground">+{dobodyWarnings.length - 3} daha...</div>
            )}
          </div>
        </div>
      )}
      {/* Main Content: Inline Form + Calendar Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left: Inline Shift Form */}
        {canEditShifts && (
          <Card className="lg:col-span-3">
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Vardiya Ekle
              </h3>

              {/* Day Selection */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Günler</label>
                <div className="grid grid-cols-7 gap-1 mt-1">
                  {weekDays.map(day => {
                    const isSelected = selectedDays.includes(day.dateStr);
                    return (
                      <button
                        key={day.dateStr}
                        type="button"
                        onClick={() => toggleDay(day.dateStr)}
                        className={`p-1.5 rounded text-center transition-all text-xs ${
                          isSelected 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                        data-testid={`day-toggle-${day.dateStr}`}
                      >
                        <div className="text-[10px]">{day.shortName}</div>
                        <div className="font-bold">{day.dayNum}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Employee Type Filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Personel Tipi</label>
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
                      className={`flex-1 px-2 py-1 text-[10px] font-medium rounded transition-colors ${
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

              {/* Employee Selection */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Personel {availableEmployees.length < branchEmployees.length && `(${availableEmployees.length} müsait)`}
                </label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger className="mt-1 text-xs h-8" data-testid="select-employee">
                    <SelectValue placeholder="Personel seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEmployees.length === 0 ? (
                      <div className="p-2 text-xs text-muted-foreground text-center">
                        Müsait personel yok
                      </div>
                    ) : (
                      availableEmployees.map((emp: any) => {
                        const weeklyHours = getEmployeeWeeklyHours(String(emp.id));
                        const limit = emp.weeklyHours || (emp.employmentType === 'parttime' ? 25 : 45);
                        const isPartTime = emp.employmentType === 'parttime';
                        return (
                          <SelectItem key={emp.id} value={String(emp.id)}>
                            <div className="flex items-center gap-2">
                              <span>{emp.fullName || `${emp.firstName} ${emp.lastName}`}</span>
                              <Badge variant="outline" className={`text-[9px] px-1 ${isPartTime ? 'border-orange-400' : 'border-blue-400'}`}>
                                {isPartTime ? 'PT' : 'FT'}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">{weeklyHours}/{limit}s</span>
                            </div>
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Hours Check Warning */}
              {hoursCheck && (
                <div className={`p-2 rounded text-xs ${hoursCheck.exceedsLimit ? 'bg-destructive/10 border border-destructive/30' : 'bg-muted'}`}>
                  <div className="flex justify-between">
                    <span>Mevcut: {hoursCheck.currentHours}s</span>
                    <span>+{Number(hoursCheck.newShiftHours ?? 0).toFixed(1)}s</span>
                    <span className={hoursCheck.exceedsLimit ? 'text-destructive font-bold' : 'font-medium'}>
                      {Number(hoursCheck.totalHours ?? 0).toFixed(1)}/{hoursCheck.weeklyLimit}s
                    </span>
                  </div>
                  {hoursCheck.exceedsLimit && (
                    <p className="text-destructive text-[10px] mt-1">Haftalık limit aşılıyor!</p>
                  )}
                </div>
              )}

              {/* Time Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground">Başlangıç</label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="mt-0.5 h-8 text-xs"
                    data-testid="input-start-time"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground">Bitiş</label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="mt-0.5 h-8 text-xs"
                    data-testid="input-end-time"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground">Mola</label>
                  <Input
                    type="time"
                    value={breakTime}
                    onChange={(e) => setBreakTime(e.target.value)}
                    className="mt-0.5 h-8 text-xs"
                    data-testid="input-break-time"
                  />
                </div>
              </div>

              {breakWarning && (
                <div className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-1.5 rounded flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  {breakWarning}
                </div>
              )}

              {/* Shift Type Label */}
              {startTime && (
                <div className="flex items-center justify-between text-xs bg-muted/50 p-2 rounded">
                  <span className="text-muted-foreground">Vardiya Tipi:</span>
                  <Badge variant="outline" className="text-[10px]" data-testid="badge-shift-type">
                    {getDospressoShiftType(startTime).label}
                  </Badge>
                </div>
              )}

              {/* Shift Duration */}
              <div className="flex justify-between text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                <span>Vardiya Süresi:</span>
                <span className="font-medium">{calculateShiftHours().toFixed(1)} saat</span>
              </div>

              {/* Checklists */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Checklistler</label>
                {[
                  { value: checklist1, setter: setChecklist1, label: '1' },
                  { value: checklist2, setter: setChecklist2, label: '2' },
                  { value: checklist3, setter: setChecklist3, label: '3' },
                ].map(({ value, setter, label }) => (
                  <Select key={label} value={value} onValueChange={setter}>
                    <SelectTrigger className="h-7 text-xs" data-testid={`select-checklist-${label}`}>
                      <SelectValue placeholder={`${label}. Checklist (opsiyonel)`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Seçilmedi</SelectItem>
                      {Array.isArray(checklists) && (Array.isArray(checklists) ? checklists : []).map((cl: { id: number; title: string }) => (
                        <SelectItem key={cl.id} value={String(cl.id)}>{cl.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ))}
              </div>

              {/* Görev Atama */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Görev Ekle <span className="opacity-50">(opsiyonel)</span></label>
                <Select value={selectedTaskId || "none"} onValueChange={v => setSelectedTaskId(v === "none" ? "" : v)}>
                  <SelectTrigger className="h-7 text-xs" data-testid="select-task">
                    <SelectValue placeholder="Görev seç..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seçilmedi</SelectItem>
                    {Array.isArray(tasks) && (tasks as any[]).filter((t: any) => !t.assignedToId || t.status === 'beklemede').map((t: any) => (
                      <SelectItem key={t.id} value={String(t.id)}>{(t.description || t.title || '').slice(0, 50)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Save Button */}
              <Button 
                className="w-full gap-2"
                onClick={() => createShiftsMutation.mutate()}
                disabled={!canSaveShift || createShiftsMutation.isPending}
                data-testid="button-save-shift"
              >
                {createShiftsMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Calendar className="w-4 h-4" />
                )}
                {selectedDays.length > 0 ? `${selectedDays.length} Gün Kaydet` : 'Vardiya Kaydet'}
              </Button>

              {/* Clear Form */}
              {(selectedEmployee || selectedDays.length > 0) && (
                <Button variant="ghost" size="sm" className="w-full text-xs" onClick={resetInlineForm}>
                  Formu Temizle
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Right: Calendar Grid */}
        <div className={`${canEditShifts ? 'lg:col-span-8 xl:col-span-9' : 'lg:col-span-12'}`}>
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

              <div className={`grid gap-2 ${periodWeeks === 2 ? 'grid-cols-7' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-7'}`}>
                {periodDays.map((day) => {
                  const isGap = gapsInPeriod.includes(day.dateStr);
                  const isSelectedDay = selectedDays.includes(day.dateStr);
                  const hasPreview = isSelectedDay && selectedEmployee && selectedEmployeeDetails;
                  
                  return (
                    <Card 
                      key={day.dateStr}
                      className={`min-h-[100px] transition-all ${isToday(day.date) ? 'ring-2 ring-primary' : ''} ${isGap ? 'border-amber-300 dark:border-amber-700' : ''} ${isSelectedDay ? 'ring-2 ring-green-500 dark:ring-green-400' : ''}`}
                    >
                      <div 
                        className={`p-2 border-b text-center cursor-pointer transition-colors ${
                          isSelectedDay ? 'bg-green-100 dark:bg-green-900/40' : 
                          isGap ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-muted/30'
                        }`}
                        onClick={() => canEditShifts && toggleDay(day.dateStr)}
                        data-testid={`calendar-day-${day.dateStr}`}
                      >
                        <div className="text-xs text-muted-foreground">{day.shortName}</div>
                        <div className="text-lg font-bold">{day.dayNum}</div>
                      </div>

                      <DroppableDayCell dateStr={day.dateStr} onDayClick={canEditShifts ? toggleDay : undefined}>
                        {/* Preview of new shift being created */}
                        {hasPreview && (
                          <div className="w-full p-1.5 rounded border-2 border-dashed border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/20 text-xs mb-1">
                            <div className="font-medium text-green-700 dark:text-green-300 truncate">
                              {selectedEmployeeDetails.fullName || `${selectedEmployeeDetails.firstName} ${selectedEmployeeDetails.lastName}`}
                            </div>
                            <div className="text-green-600 dark:text-green-400 opacity-80">
                              {startTime}-{endTime}
                            </div>
                          </div>
                        )}
                        
                        {/* Existing shifts */}
                        {(periodShifts[day.dateStr] || []).length === 0 && !hasPreview ? (
                          <div>
                            {isGap && dobodyWarnings.length > 0 ? (
                              <div className="p-1.5 text-center">
                                <div className="text-[10px] font-medium mb-0.5" style={{ color: '#a5a0f0' }}>◈ Dobody</div>
                                <p className="text-[10px] text-amber-500">Boş vardiya — personel ata</p>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground text-center py-3">-</p>
                            )}
                          </div>
                        ) : (
                          (periodShifts[day.dateStr] || []).map((shift: any) => {
                            if (!shift?.id) return null;
                            const emp = branchEmployees.find((e: any) => e.id === shift.assignedToId);
                            
                            return (
                              <DraggableShiftChip
                                key={shift.id}
                                shift={shift}
                                employee={emp}
                                canEdit={canEditShifts || false}
                                onClick={() => { 
                                  if (canEditShifts && shift?.id) {
                                    setEditingShiftId(shift.id); 
                                  }
                                }}
                              />
                            );
                          })
                        )}
                        {/* Dobody inline uyarı — bu gün için */}
                        {dobodyWarnings.filter((w:any) => !w.shiftDate || w.shiftDate === day.dateStr).slice(0,1).map((w:any, wi:number) => (
                          <div key={wi} className="mx-1 mb-1 px-2 py-1 rounded text-[10px] leading-snug"
                            style={{background:'rgba(245,158,11,0.08)', border:'0.5px dashed rgba(245,158,11,0.35)', color:'#fbbf24'}}>
                            {(w.message||w.description||'').slice(0,60)}{(w.message||'').length>60?'…':''}
                          </div>
                        ))}
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
        </div>
      </div>

        </TabsContent>

        {/* Swap Requests Tab */}
        <TabsContent value="swap-requests" className="mt-4">
          <div className="space-y-6">
            {/* Pending for me - Target approval */}
            {pendingForMeCount > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArrowLeftRight className="w-4 h-4" />
                    Gelen Takas Talepleri
                    <Badge variant="destructive" className="ml-2">{pendingForMeCount}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Array.isArray(pendingSwapRequestsForMe) && pendingSwapRequestsForMe.map((req: any) => (
                    <div key={req.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30" data-testid={`swap-request-${req.id}`}>
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {findEmployeeById(req.requesterId)?.fullName || 'Personel'} takas talep ediyor
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex gap-3">
                          <span>Tarih: {req.swapDate ? format(parseISO(req.swapDate), 'd MMM yyyy', { locale: tr }) : '-'}</span>
                        </div>
                        {req.reason && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Sebep: {req.reason}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => targetRejectMutation.mutate({ requestId: req.id, reason: '' })}
                          disabled={targetRejectMutation.isPending}
                          data-testid={`button-reject-swap-${req.id}`}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reddet
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => targetApproveMutation.mutate(req.id)}
                          disabled={targetApproveMutation.isPending}
                          data-testid={`button-approve-swap-${req.id}`}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Onayla
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Pending supervisor approval - For supervisors */}
            {isSupervisor && pendingSupervisorCount > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Yönetici Onayı Bekleyen Talepler
                    <Badge variant="secondary" className="ml-2">{pendingSupervisorCount}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Array.isArray(pendingSuperviorRequests) && pendingSuperviorRequests.map((req: any) => (
                    <div key={req.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30" data-testid={`supervisor-swap-request-${req.id}`}>
                      <div className="flex-1">
                        <div className="font-medium text-sm flex items-center gap-2">
                          <span>{findEmployeeById(req.requesterId)?.fullName || 'Personel'}</span>
                          <ArrowLeftRight className="w-3 h-3 text-muted-foreground" />
                          <span>{findEmployeeById(req.targetUserId)?.fullName || 'Personel'}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex gap-3">
                          <span>Tarih: {req.swapDate ? format(parseISO(req.swapDate), 'd MMM yyyy', { locale: tr }) : '-'}</span>
                          <Badge variant="outline" className="text-[10px]">Hedef Onayladı</Badge>
                        </div>
                        {req.reason && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Sebep: {req.reason}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => supervisorRejectMutation.mutate({ requestId: req.id, reason: '' })}
                          disabled={supervisorRejectMutation.isPending}
                          data-testid={`button-supervisor-reject-${req.id}`}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reddet
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => supervisorApproveMutation.mutate(req.id)}
                          disabled={supervisorApproveMutation.isPending}
                          data-testid={`button-supervisor-approve-${req.id}`}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Onayla & Takas Et
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* All swap requests history */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Tüm Takas Talepleri</CardTitle>
              </CardHeader>
              <CardContent>
                {!allSwapRequests || (Array.isArray(allSwapRequests) && allSwapRequests.length === 0) ? (
                  <div className="text-center text-muted-foreground py-8">
                    <ArrowLeftRight className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Henüz takas talebi bulunmuyor</p>
                    <p className="text-xs mt-1">Vardiya takviminizden bir vardiyayı başka bir personelin vardiyasına sürükleyerek takas talebi oluşturabilirsiniz.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Array.isArray(allSwapRequests) && allSwapRequests.slice(0, 10).map((req: any) => (
                      <div key={req.id} className="flex items-center justify-between p-2 border rounded text-sm" data-testid={`swap-history-${req.id}`}>
                        <div className="flex items-center gap-2">
                          <span>{findEmployeeById(req.requesterId)?.fullName?.split(' ')[0] || '?'}</span>
                          <ArrowLeftRight className="w-3 h-3 text-muted-foreground" />
                          <span>{findEmployeeById(req.targetUserId)?.fullName?.split(' ')[0] || '?'}</span>
                          <span className="text-muted-foreground text-xs">
                            ({req.swapDate ? format(parseISO(req.swapDate), 'd MMM', { locale: tr }) : '-'})
                          </span>
                        </div>
                        <Badge
                          variant={
                            req.status === 'approved' ? 'default' :
                            req.status === 'pending_target' || req.status === 'pending_supervisor' ? 'secondary' :
                            'destructive'
                          }
                          className="text-[10px]"
                        >
                          {req.status === 'approved' ? 'Tamamlandı' :
                           req.status === 'pending_target' ? 'Hedef Onayı Bekliyor' :
                           req.status === 'pending_supervisor' ? 'Yönetici Onayı Bekliyor' :
                           req.status === 'rejected_by_target' ? 'Hedef Reddetti' :
                           req.status === 'rejected_by_supervisor' ? 'Yönetici Reddetti' :
                           req.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="mt-4">
          <ComplianceView
            branchId={user?.branchId || 0}
            weekStart={weekStart}
          />
        </TabsContent>
      </Tabs>

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

      {/* Shift Swap Request Modal */}
      <Dialog open={swapModalOpen} onOpenChange={(o) => { if (!o) { setSwapModalOpen(false); setSwapSourceShift(null); setSwapTargetShift(null); setSwapReason(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5" />
              Vardiya Takas Talebi
            </DialogTitle>
            <DialogDescription>
              Vardiyayı başka bir personel ile takas etmek için talep oluşturun. Takas, hedef personel ve yönetici onayı gerektirir.
            </DialogDescription>
          </DialogHeader>

          {swapSourceShift && swapTargetShift && (
            <div className="space-y-4">
              {/* Swap visualization */}
              <div className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
                {/* Source shift */}
                <div className="flex-1 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Sizin Vardiyanız</div>
                  <div className="font-medium text-sm">
                    {findEmployeeById(swapSourceShift.assignedToId)?.fullName || 'Siz'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(parseISO(swapSourceShift.shiftDate), 'd MMM', { locale: tr })}
                  </div>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    <span className="text-xs">
                      {swapSourceShift.startTime?.substring(0, 5)}-{swapSourceShift.endTime?.substring(0, 5)}
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <ArrowLeftRight className="w-6 h-6 text-muted-foreground flex-shrink-0" />

                {/* Target shift */}
                <div className="flex-1 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Takas Edilecek</div>
                  <div className="font-medium text-sm">
                    {findEmployeeById(swapTargetShift.assignedToId)?.fullName || 'Personel'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(parseISO(swapTargetShift.shiftDate), 'd MMM', { locale: tr })}
                  </div>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    <span className="text-xs">
                      {swapTargetShift.startTime?.substring(0, 5)}-{swapTargetShift.endTime?.substring(0, 5)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="swap-reason">Takas Nedeni (opsiyonel)</Label>
                <Textarea
                  id="swap-reason"
                  placeholder="Neden takas yapmak istiyorsunuz?"
                  value={swapReason}
                  onChange={(e) => setSwapReason(e.target.value)}
                  className="min-h-[80px]"
                  data-testid="input-swap-reason"
                />
              </div>

              {/* Info box */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md text-sm">
                <AlertTriangle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-blue-800 dark:text-blue-200">
                  <strong>Çift Onay Sistemi:</strong> Takas talebi önce karşı tarafın onayını bekler, ardından yönetici onayı gerekir.
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => { setSwapModalOpen(false); setSwapSourceShift(null); setSwapTargetShift(null); setSwapReason(''); }}
            >
              İptal
            </Button>
            <Button 
              onClick={handleSubmitSwapRequest}
              disabled={createSwapRequestMutation.isPending || !swapSourceShift || !swapTargetShift}
              data-testid="button-submit-swap"
            >
              {createSwapRequestMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Gönderiliyor...
                </>
              ) : (
                <>
                  <ArrowLeftRight className="w-4 h-4 mr-2" />
                  Takas Talebi Gönder
                </>
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
  const { deleteState: shiftDelState, requestDelete: requestShiftDel, cancelDelete: cancelShiftDel, confirmDelete: confirmShiftDel } = useConfirmDelete();
  const { data: shifts } = useQuery({ queryKey: ['/api/shifts'] });
  const { data: checklists } = useQuery({ queryKey: ['/api/checklists'], staleTime: 1800000 });
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
                  {Array.isArray(checklists) && (Array.isArray(checklists) ? checklists : []).map((cl: { id: number; title: string }) => (
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
                  {Array.isArray(checklists) && (Array.isArray(checklists) ? checklists : []).map((cl: { id: number; title: string }) => (
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
                  {Array.isArray(checklists) && (Array.isArray(checklists) ? checklists : []).map((cl: { id: number; title: string }) => (
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
                onClick={() => requestShiftDel(shiftId!, shift?.shiftType === 'morning' ? 'Sabah Vardiyası' : 'Akşam Vardiyası')}
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

        <ConfirmDeleteDialog
          open={shiftDelState.open}
          onOpenChange={(open) => !open && cancelShiftDel()}
          onConfirm={() => {
            const id = confirmShiftDel();
            if (id !== null) deleteMutation.mutate();
          }}
          title="Vardiyayı Sil"
          description={`"${shiftDelState.itemName || ''}" vardiyasını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
        />
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
  const [aiError, setAiError] = useState<string | null>(null);

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
    setAiError(null);
    
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
      const mappedShifts = data.recommendations?.map((rec: any) => {
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
      
      const shiftCounts: Record<string, number> = {};
      mappedShifts.forEach((s: any) => {
        shiftCounts[s.assignedToId] = (shiftCounts[s.assignedToId] || 0) + 1;
      });
      
      const missingEmployees = employees.filter((emp: any) => {
        const count = shiftCounts[String(emp.id)] || 0;
        const target = emp.employmentType === 'parttime' ? 3 : 6;
        return count < target;
      });
      
      const warningParts: string[] = [];
      if (missingEmployees.length > 0) {
        warningParts.push(`${missingEmployees.length} personelin vardiyası eksik`);
      }
      
      const desc = `${mappedShifts.length} vardiya önerisi oluşturuldu` + 
        (warningParts.length > 0 ? ` (${warningParts.join(', ')})` : '');
      
      toast({ 
        title: data.cached ? "Önbellek Kullanıldı" : "AI Plan Hazır", 
        description: desc,
        variant: missingEmployees.length > 0 ? "destructive" : "default",
      });
    } catch (error: any) {
      console.error("AI plan error:", error);
      const rawMessage = (error.message || '').toLocaleLowerCase('tr-TR');
      let userTitle = "AI Planlama Hatası";
      let userMessage = "";

      if (rawMessage.includes('timeout') || rawMessage.includes('timed out') || rawMessage.includes('504') || rawMessage.includes('zaman aşımı')) {
        userTitle = "Zaman Aşımı";
        userMessage = "AI planlama isteği zaman aşımına uğradı. Sunucu yoğun olabilir, lütfen birkaç dakika sonra tekrar deneyin.";
      } else if (rawMessage.includes('not enough') || rawMessage.includes('yeterli personel') || rawMessage.includes('no employees') || rawMessage.includes('personel bulunamadı')) {
        userTitle = "Yetersiz Personel";
        userMessage = "Vardiya planı oluşturmak için yeterli personel bulunamadı. Lütfen şube personel listesini kontrol edin.";
      } else if (rawMessage.includes('conflict') || rawMessage.includes('çakışma') || rawMessage.includes('already assigned') || rawMessage.includes('zaten atanmış')) {
        userTitle = "Tarih Çakışması";
        userMessage = "Seçilen tarih aralığında mevcut vardiyalarla çakışma tespit edildi. Mevcut vardiyaları kontrol edip tekrar deneyin.";
      } else if (rawMessage.includes('401') || rawMessage.includes('403') || rawMessage.includes('unauthorized') || rawMessage.includes('yetki')) {
        userTitle = "Yetkilendirme Hatası";
        userMessage = "Bu işlem için yetkiniz bulunmuyor. Lütfen oturumunuzu kontrol edin.";
      } else if (rawMessage.includes('openai') || rawMessage.includes('api key') || rawMessage.includes('rate limit') || rawMessage.includes('quota')) {
        userTitle = "AI Servisi Hatası";
        userMessage = "AI servisiyle bağlantı kurulamadı. Lütfen birkaç dakika sonra tekrar deneyin.";
      } else if (rawMessage.includes('500') || rawMessage.includes('internal server')) {
        userTitle = "Sunucu Hatası";
        userMessage = "Sunucuda beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.";
      } else if (error.message) {
        userMessage = error.message;
      } else {
        userMessage = "Bilinmeyen bir hata oluştu. Lütfen tekrar deneyin veya yöneticinize başvurun.";
      }

      setAiError(userMessage);
      toast({ 
        title: userTitle, 
        description: userMessage, 
        variant: "destructive" 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyWeekMutation = useMutation({
    mutationFn: (params: { sourceWeekStart: string; targetWeekStart: string; branchId: number }) =>
      apiRequest('POST', '/api/shifts/copy-week', params).then(r => r.json()),
    onSuccess: (data: any) => {
      toast({ title: "Hafta Kopyalandı", description: data.message });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
    },
    onError: (err: Error) => toast({ title: "Kopyalama Hatası", description: err.message, variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      // Checklist otomatik atama: şift tipine göre
      const checklistArr = Array.isArray(checklists) ? checklists as any[] : [];
      const openingCL = checklistArr.find((c: any) => c.title?.includes('Açılış') || c.name?.includes('Açılış'));
      const closingCL = checklistArr.find((c: any) => c.title?.includes('Kapanış') || c.name?.includes('Kapanış'));

      const shiftsToCreate = preview.map(s => {
        const isOpening = s.shiftType === 'opening' || s.shiftType === 'morning';
        const isClosing = s.shiftType === 'closing' || s.shiftType === 'evening';
        return {
          shiftDate: s.shiftDate,
          startTime: s.startTime,
          endTime: s.endTime,
          breakStartTime: s.breakStartTime,
          breakEndTime: s.breakEndTime,
          shiftType: s.shiftType,
          assignedToId: s.assignedToId,
          status: s.status,
          branchId: s.branchId,
          checklistId: isOpening && openingCL ? openingCL.id : isClosing && closingCL ? closingCL.id : null,
        };
      });

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
    setAiError(null);
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
            Tüm personeli haftaya otomatik olarak dağıt (FT: 6 gün, PT: 3 gün)
          </DialogDescription>
        </DialogHeader>

        {preview.length === 0 ? (
          <div className="text-center py-8">
            {aiError ? (
              <>
                <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
                <div className="p-3 mb-4 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive text-left" data-testid="text-ai-error">
                  {aiError}
                </div>
                <Button 
                  onClick={() => generateAIPlan(false)} 
                  disabled={isGenerating}
                  className="gap-2"
                  data-testid="button-retry-ai"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                  {isGenerating ? 'AI Düşünüyor...' : 'Tekrar Dene'}
                </Button>
              </>
            ) : (
              <>
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
              </>
            )}
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
            
            {(() => {
              const counts: Record<string, number> = {};
              preview.forEach(s => { counts[s.assignedToId] = (counts[s.assignedToId] || 0) + 1; });
              const issues = employees.filter((emp: any) => {
                const c = counts[String(emp.id)] || 0;
                const target = emp.employmentType === 'parttime' ? 3 : 6;
                return c < target;
              });
              if (issues.length === 0) return null;
              return (
                <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs">
                  <strong className="text-red-600 dark:text-red-400">Eksik Vardiya Uyarisi:</strong>
                  <ul className="mt-1 space-y-0.5">
                    {issues.map((emp: any) => {
                      const c = counts[String(emp.id)] || 0;
                      const target = emp.employmentType === 'parttime' ? 3 : 6;
                      return (
                        <li key={emp.id} className="text-red-600 dark:text-red-400">
                          {emp.fullName || emp.firstName}: {c}/{target} gun
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })()}

            {(() => {
              const empHours: Record<string, number> = {};
              const empDays: Record<string, number> = {};
              preview.forEach(s => {
                const start = s.startTime ? parseInt(s.startTime.split(':')[0]) : 0;
                const end = s.endTime ? parseInt(s.endTime.split(':')[0]) : 0;
                const hours = end > start ? end - start : 24 - start + end;
                empHours[s.assignedToId] = (empHours[s.assignedToId] || 0) + hours;
                empDays[s.assignedToId] = (empDays[s.assignedToId] || 0) + 1;
              });
              const entries = (Array.isArray(employees) ? employees : []).map((emp: any) => ({
                name: emp.fullName || emp.firstName,
                hours: empHours[String(emp.id)] || 0,
                days: empDays[String(emp.id)] || 0,
                limit: emp.weeklyHours || (emp.employmentType === 'parttime' ? 25 : 45),
                targetDays: emp.employmentType === 'parttime' ? 3 : 6,
                type: emp.employmentType,
              }));
              if (entries.length === 0) return null;
              return (
                <div className="p-2 bg-muted/30 rounded text-xs">
                  <strong>Adil Dagilim Ozeti:</strong>
                  <div className="space-y-1.5 mt-1">
                    {entries.map((e, i) => {
                      const pct = Math.min(100, Math.round((e.days / e.targetDays) * 100));
                      const barColor = pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500';
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="truncate flex-1">{e.name}</span>
                            <span className="text-muted-foreground whitespace-nowrap">{e.days}/{e.targetDays}g {e.hours}/{e.limit}s</span>
                          </div>
                          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

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

function ComplianceView({ branchId, weekStart }: { branchId: number; weekStart: Date }) {
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(addDays(weekStart, 6), 'yyyy-MM-dd');

  const { data: complianceData, isLoading } = useQuery<any>({
    queryKey: ['/api/shifts/compliance', branchId, weekStartStr, weekEndStr],
    queryFn: async () => {
      if (!branchId) return null;
      const res = await fetch(`/api/shifts/compliance?branchId=${branchId}&dateFrom=${weekStartStr}&dateTo=${weekEndStr}`, { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!branchId,
  });

  const { data: branchUsers } = useQuery<any[]>({
    queryKey: ['/api/users', { branchId }],
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (!complianceData || !complianceData.compliance || complianceData.compliance.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Bu hafta için uyumluluk verisi bulunamadı. PDKS kayıtları veya planlı vardiyalar mevcut değil.
        </CardContent>
      </Card>
    );
  }

  const userMap = new Map<string, string>();
  if (branchUsers) {
    for (const u of (branchUsers as any[])) {
      userMap.set(u.id, [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || 'Bilinmiyor');
    }
  }

  const uniqueUsers = [...new Set(complianceData.compliance?.map((c: any) => c.userId))];
  const weekDays: string[] = [];
  for (let i = 0; i < 7; i++) {
    weekDays.push(format(addDays(weekStart, i), 'yyyy-MM-dd'));
  }

  const dayLabels = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_time': return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'slightly_off': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
      case 'significantly_off': return 'bg-red-500/10 text-red-600 dark:text-red-400';
      case 'no_pdks': return 'bg-muted/50 text-muted-foreground';
      default: return 'bg-muted/30 text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'on_time': return 'Zamanında';
      case 'slightly_off': return 'Hafif Sapma';
      case 'significantly_off': return 'Belirgin Sapma';
      case 'no_pdks': return 'PDKS Yok';
      default: return '-';
    }
  };

  const summary = complianceData.summary;

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <Card className="flex-1 min-w-[120px]">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-compliance-rate">{summary.onTimeRate}%</p>
            <p className="text-xs text-muted-foreground">Uyumluluk Oranı</p>
          </CardContent>
        </Card>
        <Card className="flex-1 min-w-[120px]">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.onTime}</p>
            <p className="text-xs text-muted-foreground">Zamanında</p>
          </CardContent>
        </Card>
        <Card className="flex-1 min-w-[120px]">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{summary.slightlyOff}</p>
            <p className="text-xs text-muted-foreground">Hafif Sapma</p>
          </CardContent>
        </Card>
        <Card className="flex-1 min-w-[120px]">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.significantlyOff}</p>
            <p className="text-xs text-muted-foreground">Belirgin Sapma</p>
          </CardContent>
        </Card>
        <Card className="flex-1 min-w-[120px]">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{summary.noPdks}</p>
            <p className="text-xs text-muted-foreground">PDKS Yok</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-2">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="p-2 text-left w-32 text-muted-foreground font-medium">Personel</th>
                  {weekDays.map((d) => {
                    const dayOfWeek = new Date(d).getDay();
                    const isBusy = [0, 5, 6].includes(dayOfWeek);
                    return (
                      <th key={d} className={`p-2 text-center text-muted-foreground font-medium ${isBusy ? 'bg-amber-500/5' : ''}`}>
                        {dayLabels[(dayOfWeek + 6) % 7]}
                        <br />
                        <span className="text-[10px]">{d.substring(5)}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {uniqueUsers.map((userId: string) => {
                  const userName = userMap.get(userId) || userId.substring(0, 8);
                  return (
                    <tr key={userId} className="border-t border-border" data-testid={`row-compliance-${userId}`}>
                      <td className="p-2">
                        <p className="font-medium text-[11px] truncate max-w-[120px]">{userName}</p>
                      </td>
                      {weekDays.map(day => {
                        const entry = complianceData.compliance.find(
                          (c: any) => c.userId === userId && c.date === day
                        );
                        if (!entry) {
                          return (
                            <td key={day} className="p-1 text-center">
                              <span className="text-muted-foreground text-[10px]">-</span>
                            </td>
                          );
                        }
                        return (
                          <td key={day} className="p-1 text-center">
                            <div className={`rounded px-1 py-0.5 ${getStatusColor(entry.status)}`} title={entry.details}>
                              <p className="font-mono text-[10px]">
                                {entry.actualStart || '—'}
                                {entry.actualEnd ? ` → ${entry.actualEnd}` : ''}
                              </p>
                              <p className="text-[8px]">{getStatusLabel(entry.status)}</p>
                              {entry.lateMinutes > 0 && (
                                <p className="text-[8px] text-red-500">+{entry.lateMinutes}dk geç</p>
                              )}
                              {entry.overtimeMinutes > 0 && (
                                <p className="text-[8px] text-blue-500">+{entry.overtimeMinutes}dk mesai</p>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
