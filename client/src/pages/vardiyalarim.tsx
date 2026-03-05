import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, startOfWeek, addDays, isToday, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { tr } from "date-fns/locale";
import { Clock, Sun, Sunset, Moon, ArrowRightLeft, Calendar, Check, X, Coffee, UserMinus, AlertTriangle, AlertCircle, Timer, FileText, QrCode } from "lucide-react";
import QrCheckinGenerator from "@/components/qr-checkin-generator";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ShiftTask {
  id: number;
  taskId: number;
  isCompleted: boolean;
  task: { id: number; title: string; description?: string; priority: string };
}

interface ShiftChecklist {
  id: number;
  checklistId: number;
  isCompleted: boolean;
  checklist: { id: number; name: string; description?: string; itemCount?: number };
}

interface MyShift {
  id: number;
  shiftDate: string;
  startTime: string;
  endTime: string;
  breakStartTime?: string;
  breakEndTime?: string;
  shiftType: string;
  status: string;
  branch: { name: string };
  createdBy: { fullName: string };
  assignedTo?: { id: string; firstName: string; lastName: string; fullName?: string };
  notes?: string;
  tasks?: ShiftTask[];
  checklists?: ShiftChecklist[];
}

const t = (s: string) => s.substring(0, 5);

function getShiftTypeLabel(type: string) {
  return type === "morning" ? "Sabah" : type === "evening" ? "Akşam" : "Gece";
}

function getShiftTypeIcon(type: string) {
  if (type === "morning") return <Sun className="w-3 h-3" />;
  if (type === "evening") return <Sunset className="w-3 h-3" />;
  return <Moon className="w-3 h-3" />;
}

export default function Vardiyalarim() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedWeekOffset, setSelectedWeekOffset] = useState<0 | 1>(0);
  const [viewMode, setViewMode] = useState<"my" | "branch" | "leave" | "qr">("my");

  const [swapDialogOpen, setSwapDialogOpen] = useState(false);
  const [swapTargetShift, setSwapTargetShift] = useState<MyShift | null>(null);
  const [swapRequesterShiftId, setSwapRequesterShiftId] = useState("");
  const [swapReason, setSwapReason] = useState("");

  const [overtimeDialogOpen, setOvertimeDialogOpen] = useState(false);
  const [overtimeShift, setOvertimeShift] = useState<MyShift | null>(null);
  const [overtimeDuration, setOvertimeDuration] = useState("60");
  const [overtimeReasonType, setOvertimeReasonType] = useState("");
  const [overtimeMissingEmployee, setOvertimeMissingEmployee] = useState("");
  const [overtimeReasonText, setOvertimeReasonText] = useState("");

  const [leaveType, setLeaveType] = useState("");
  const [leaveDates, setLeaveDates] = useState<string[]>([]);
  const [leaveReason, setLeaveReason] = useState("");

  const branchId = (user as any)?.branchId;
  const isSupervisor = ["supervisor", "supervisor_buddy"].includes((user as any)?.role || "");

  const weekStart = useMemo(() => {
    const today = new Date();
    return startOfWeek(new Date(today.getTime() + selectedWeekOffset * 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 });
  }, [selectedWeekOffset]);

  const startDate = format(weekStart, "yyyy-MM-dd");
  const endDate = format(addDays(weekStart, 6), "yyyy-MM-dd");

  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");
  const monthDays = eachDayOfInterval({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) });
  const workDaysInMonth = monthDays.filter((d) => d.getDay() !== 0 && d.getDay() !== 6).length;

  const { data: myShifts, isLoading } = useQuery<MyShift[]>({
    queryKey: ["/api/shifts/my", `start=${startDate}&end=${endDate}`],
    queryFn: async () => {
      const res = await fetch(`/api/shifts/my?start=${startDate}&end=${endDate}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: monthShifts } = useQuery<MyShift[]>({
    queryKey: ["/api/shifts/my", `start=${monthStart}&end=${monthEnd}`],
    queryFn: async () => {
      const res = await fetch(`/api/shifts/my?start=${monthStart}&end=${monthEnd}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: branchShifts, isLoading: isBranchLoading } = useQuery<MyShift[]>({
    queryKey: ["/api/shifts", "branch", branchId, startDate],
    queryFn: async () => {
      if (!branchId) return [];
      const res = await fetch(`/api/shifts?branchId=${branchId}&dateFrom=${startDate}&dateTo=${endDate}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: viewMode === "branch" && !!branchId,
  });

  const { data: branchColleagues } = useQuery<any[]>({
    queryKey: ["/api/branches", branchId, "users"],
    queryFn: async () => {
      if (!branchId) return [];
      const res = await fetch(`/api/branches/${branchId}/users`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!branchId,
  });

  const { data: pendingSwapRequests } = useQuery<any[]>({
    queryKey: ["/api/shift-swap-requests/pending-for-me"],
  });

  const { data: supervisorPendingSwaps } = useQuery<any[]>({
    queryKey: ["/api/shift-swap-requests/pending-supervisor"],
    enabled: isSupervisor,
  });

  const { data: myLeaveRequests } = useQuery<any[]>({
    queryKey: ["/api/leave-requests/my"],
    enabled: viewMode === "leave",
  });

  const createSwapMutation = useMutation({
    mutationFn: async (body: any) => {
      await apiRequest("POST", "/api/shift-swap-requests", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shift-swap-requests/pending-for-me"] });
      setSwapDialogOpen(false);
      toast({ title: "Başarılı", description: "Takas talebi gönderildi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Takas talebi gönderilemedi", variant: "destructive" });
    },
  });

  const approveSwapMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/shift-swap-requests/${id}/target-approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-swap-requests/pending-for-me"] });
      toast({ title: "Başarılı", description: "Takas talebi onaylandı" });
    },
    onError: () => {
      toast({ title: "Hata", description: "İşlem başarısız", variant: "destructive" });
    },
  });

  const rejectSwapMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/shift-swap-requests/${id}/target-reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-swap-requests/pending-for-me"] });
      toast({ title: "Başarılı", description: "Takas talebi reddedildi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "İşlem başarısız", variant: "destructive" });
    },
  });

  const supervisorApproveSwapMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/shift-swap-requests/${id}/supervisor-approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-swap-requests/pending-supervisor"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({ title: "Başarılı", description: "Takas onaylandı" });
    },
    onError: () => {
      toast({ title: "Hata", description: "İşlem başarısız", variant: "destructive" });
    },
  });

  const supervisorRejectSwapMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/shift-swap-requests/${id}/supervisor-reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-swap-requests/pending-supervisor"] });
      toast({ title: "Başarılı", description: "Takas reddedildi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "İşlem başarısız", variant: "destructive" });
    },
  });

  const createOvertimeMutation = useMutation({
    mutationFn: async (body: any) => {
      await apiRequest("POST", "/api/overtime-requests", body);
    },
    onSuccess: () => {
      setOvertimeDialogOpen(false);
      toast({ title: "Başarılı", description: "Mesai talebi gönderildi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Mesai talebi gönderilemedi", variant: "destructive" });
    },
  });

  const createLeaveMutation = useMutation({
    mutationFn: async (body: any) => {
      await apiRequest("POST", "/api/leave-requests", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests/my"] });
      setLeaveDates([]);
      setLeaveType("");
      setLeaveReason("");
      toast({ title: "Başarılı", description: "İzin talebi gönderildi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "İzin talebi gönderilemedi", variant: "destructive" });
    },
  });

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      return {
        date,
        dateStr: format(date, "yyyy-MM-dd"),
        dayName: format(date, "EEEE", { locale: tr }),
        dayShort: format(date, "EEE", { locale: tr }),
        dayNum: format(date, "d"),
        isToday: isToday(date),
      };
    });
  }, [weekStart]);

  const totalShifts = myShifts?.length || 0;
  const upcomingShifts = myShifts?.filter((s) => differenceInDays(new Date(s.shiftDate), new Date()) >= 0).length || 0;
  const workedDays = new Set(monthShifts?.map((s) => s.shiftDate)).size || 0;

  const branchPlanData = useMemo(() => {
    if (!branchShifts) return { morning: new Map<string, MyShift[]>(), evening: new Map<string, MyShift[]>(), night: new Map<string, MyShift[]>() };
    const groups: Record<string, Map<string, MyShift[]>> = {
      morning: new Map(),
      evening: new Map(),
      night: new Map(),
    };
    branchShifts.forEach((shift) => {
      const key = shift.shiftType || "morning";
      const group = groups[key] || groups.morning;
      const empId = shift.assignedTo?.id || "unknown";
      const empName = shift.assignedTo?.fullName || `${shift.assignedTo?.firstName || ""} ${shift.assignedTo?.lastName || ""}`.trim() || "Bilinmeyen";
      const empKey = `${empId}|${empName}`;
      if (!group.has(empKey)) group.set(empKey, []);
      group.get(empKey)!.push(shift);
    });
    return groups;
  }, [branchShifts]);

  function openSwapDialog(shift: MyShift) {
    setSwapTargetShift(shift);
    setSwapRequesterShiftId("");
    setSwapReason("");
    setSwapDialogOpen(true);
  }

  function openOvertimeDialog(shift: MyShift) {
    setOvertimeShift(shift);
    setOvertimeDuration("60");
    setOvertimeReasonType("");
    setOvertimeMissingEmployee("");
    setOvertimeReasonText("");
    setOvertimeDialogOpen(true);
  }

  function submitSwap() {
    if (!swapTargetShift || !swapRequesterShiftId) return;
    createSwapMutation.mutate({
      requesterShiftId: parseInt(swapRequesterShiftId),
      targetShiftId: swapTargetShift.id,
      targetUserId: swapTargetShift.assignedTo?.id,
      branchId,
      swapDate: swapTargetShift.shiftDate,
      reason: swapReason || undefined,
    });
  }

  function submitOvertime() {
    if (!overtimeShift || !overtimeReasonType) return;
    const mins = parseInt(overtimeDuration);
    const endTimeStr = overtimeShift.endTime?.substring(0, 5) || "17:00";
    const [h, m] = endTimeStr.split(":").map(Number);
    const endH = h + Math.floor((m + mins) / 60);
    const endM = (m + mins) % 60;
    const computedEnd = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

    let reason = overtimeReasonType;
    if (overtimeReasonType === "Gelemeyen Personel" && overtimeMissingEmployee) {
      const emp = (branchColleagues || []).find((c: any) => String(c.id) === overtimeMissingEmployee);
      reason += ` - ${emp?.fullName || emp?.firstName || ""}`;
    }
    if (overtimeReasonText) reason += ` - ${overtimeReasonText}`;

    createOvertimeMutation.mutate({
      userId: isSupervisor ? overtimeShift.assignedTo?.id || (user as any)?.id : (user as any)?.id,
      branchId,
      overtimeDate: overtimeShift.shiftDate,
      startTime: endTimeStr,
      endTime: computedEnd,
      requestedMinutes: mins,
      reason,
    });
  }

  function submitLeave() {
    if (!leaveType || leaveDates.length === 0) return;
    createLeaveMutation.mutate({
      userId: (user as any)?.id,
      branchId,
      leaveType,
      startDate: leaveDates[0],
      endDate: leaveDates[leaveDates.length - 1],
      reason: leaveReason || undefined,
    });
  }

  function toggleLeaveDate(dateStr: string) {
    setLeaveDates((prev) => (prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr].sort()));
  }

  function EmployeePopover({ shift }: { shift: MyShift }) {
    const empName = shift.assignedTo?.fullName || `${shift.assignedTo?.firstName || ""} ${shift.assignedTo?.lastName || ""}`.trim() || "Bilinmeyen";
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="text-xs font-medium underline decoration-dotted cursor-pointer text-left truncate"
            data-testid={`popover-trigger-employee-${shift.id}`}
          >
            {empName}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2 space-y-1" align="start">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => openSwapDialog(shift)}
            data-testid={`button-popover-swap-${shift.id}`}
          >
            <ArrowRightLeft className="w-3 h-3" />
            Takas Talebi
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => openOvertimeDialog(shift)}
            data-testid={`button-popover-overtime-${shift.id}`}
          >
            <Timer className="w-3 h-3" />
            Mesai Talep Et
          </Button>
          {isSupervisor && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => {
                setViewMode("leave");
              }}
              data-testid={`button-popover-leave-${shift.id}`}
            >
              <Calendar className="w-3 h-3" />
              İzin Talebi
            </Button>
          )}
        </PopoverContent>
      </Popover>
    );
  }

  function renderMyShifts() {
    if (isLoading) {
      return <div className="text-center py-8 text-muted-foreground" data-testid="text-loading">Yükleniyor...</div>;
    }

    const shiftsForWeek = myShifts || [];
    if (shiftsForWeek.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground" data-testid="text-no-shifts">
          Bu hafta için vardiya bulunamadı
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2">
        {weekDays.map((day) => {
          const dayShifts = shiftsForWeek.filter((s) => s.shiftDate === day.dateStr);
          if (dayShifts.length === 0) return null;
          return dayShifts.map((shift) => (
            <Card key={shift.id} className={day.isToday ? "border-primary/50" : ""} data-testid={`card-my-shift-${shift.id}`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {getShiftTypeIcon(shift.shiftType)}
                    <span className="text-sm font-semibold" data-testid={`text-shift-date-${shift.id}`}>
                      {format(new Date(shift.shiftDate), "d MMM", { locale: tr })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {day.dayShort}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="secondary" className="text-xs" data-testid={`badge-shift-type-${shift.id}`}>
                      {getShiftTypeLabel(shift.shiftType)}
                    </Badge>
                    {day.isToday && <Badge data-testid={`badge-today-${shift.id}`}>Bugün</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <div className="flex items-center gap-1 text-sm" data-testid={`text-shift-time-${shift.id}`}>
                    <Clock className="w-3 h-3" />
                    <span>{t(shift.startTime)}-{t(shift.endTime)}</span>
                  </div>
                  {shift.breakStartTime && shift.breakEndTime && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground" data-testid={`text-shift-break-${shift.id}`}>
                      <Coffee className="w-3 h-3" />
                      <span>M: {t(shift.breakStartTime)}-{t(shift.breakEndTime)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ));
        })}
      </div>
    );
  }

  function renderBranchPlan() {
    if (isBranchLoading) {
      return <div className="text-center py-8 text-muted-foreground" data-testid="text-branch-loading">Yükleniyor...</div>;
    }

    const shiftGroups = [
      { key: "morning", label: "Sabah", icon: <Sun className="w-4 h-4" />, data: branchPlanData.morning },
      { key: "evening", label: "Akşam", icon: <Sunset className="w-4 h-4" />, data: branchPlanData.evening },
    ];

    if (branchPlanData.night && branchPlanData.night.size > 0) {
      shiftGroups.push({ key: "night", label: "Gece", icon: <Moon className="w-4 h-4" />, data: branchPlanData.night });
    }

    return (
      <div className="flex flex-col gap-3">
        {shiftGroups.map((group) => {
          if (group.data.size === 0) return null;
          const employees = Array.from(group.data.entries());
          return (
            <Card key={group.key} data-testid={`card-branch-group-${group.key}`}>
              <CardHeader className="pb-2 p-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  {group.icon}
                  {group.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 pb-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[600px]">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 pl-3 font-medium text-muted-foreground w-28">Çalışan</th>
                        {weekDays.map((day, i) => (
                          <th
                            key={i}
                            className={`text-center p-1 font-medium text-muted-foreground ${day.isToday ? "bg-primary/5" : ""}`}
                            data-testid={`th-day-${i}`}
                          >
                            <div>{day.dayShort}</div>
                            <div className="text-[10px]">{day.dayNum}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map(([empKey, empShifts]) => {
                        const [, empName] = empKey.split("|");
                        return (
                          <tr key={empKey} className="border-b last:border-b-0" data-testid={`row-employee-${empKey}`}>
                            <td className="p-2 pl-3 font-medium truncate max-w-[120px]">{empName}</td>
                            {weekDays.map((day, i) => {
                              const dayShift = empShifts.find((s) => s.shiftDate === day.dateStr);
                              return (
                                <td key={i} className={`p-1 text-center ${day.isToday ? "bg-primary/5" : ""}`}>
                                  {dayShift ? (
                                    <div className="flex flex-col items-center gap-0.5">
                                      <span className="text-[11px] font-medium" data-testid={`text-cell-time-${dayShift.id}`}>
                                        {t(dayShift.startTime)}-{t(dayShift.endTime)}
                                      </span>
                                      {dayShift.breakStartTime && dayShift.breakEndTime && (
                                        <span className="text-[10px] text-muted-foreground">
                                          M: {t(dayShift.breakStartTime)}-{t(dayShift.breakEndTime)}
                                        </span>
                                      )}
                                      <EmployeePopover shift={dayShift} />
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
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
          );
        })}

        {(!branchShifts || branchShifts.length === 0) && (
          <div className="text-center py-8 text-muted-foreground" data-testid="text-no-branch-shifts">
            Bu hafta için şube planı bulunamadı
          </div>
        )}
      </div>
    );
  }

  function renderLeaveTab() {
    const nextMonth = eachDayOfInterval({
      start: new Date(),
      end: addDays(new Date(), 30),
    });

    return (
      <div className="flex flex-col gap-3">
        <Card data-testid="card-leave-form">
          <CardHeader className="pb-2 p-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Yeni İzin Talebi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">İzin Türü</label>
              <Select value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger data-testid="select-leave-type">
                  <SelectValue placeholder="İzin türü seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual" data-testid="option-leave-annual">Yıllık İzin</SelectItem>
                  <SelectItem value="sick" data-testid="option-leave-sick">Hastalık İzni</SelectItem>
                  <SelectItem value="personal" data-testid="option-leave-personal">Kişisel İzin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Tarih Seçin</label>
              <div className="grid grid-cols-7 gap-1">
                {nextMonth.map((d) => {
                  const ds = format(d, "yyyy-MM-dd");
                  const selected = leaveDates.includes(ds);
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <Button
                      key={ds}
                      variant={selected ? "default" : "outline"}
                      size="sm"
                      className={`text-xs toggle-elevate ${selected ? "toggle-elevated" : ""} ${isWeekend ? "opacity-50" : ""}`}
                      onClick={() => toggleLeaveDate(ds)}
                      data-testid={`button-leave-date-${ds}`}
                    >
                      {format(d, "d")}
                    </Button>
                  );
                })}
              </div>
              {leaveDates.length > 0 && (
                <p className="text-xs text-muted-foreground" data-testid="text-selected-dates">
                  Seçilen: {leaveDates.map((d) => format(new Date(d), "d MMM", { locale: tr })).join(", ")}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Sebep (opsiyonel)</label>
              <Textarea
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder="İzin sebebinizi yazın..."
                className="text-sm"
                data-testid="textarea-leave-reason"
              />
            </div>

            <Button
              onClick={submitLeave}
              disabled={!leaveType || leaveDates.length === 0 || createLeaveMutation.isPending}
              data-testid="button-submit-leave"
            >
              <FileText className="w-4 h-4" />
              İzin Talebi Gönder
            </Button>
          </CardContent>
        </Card>

        {myLeaveRequests && myLeaveRequests.length > 0 && (
          <Card data-testid="card-my-leave-requests">
            <CardHeader className="pb-2 p-3">
              <CardTitle className="text-sm">İzin Taleplerim</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              {myLeaveRequests.map((req: any) => (
                <div key={req.id} className="flex items-center justify-between gap-2 p-2 rounded border" data-testid={`leave-request-${req.id}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium" data-testid={`text-leave-dates-${req.id}`}>
                      {req.startDate && format(new Date(req.startDate), "d MMM", { locale: tr })}
                      {req.endDate && req.endDate !== req.startDate && ` - ${format(new Date(req.endDate), "d MMM", { locale: tr })}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {req.leaveType === "annual" ? "Yıllık İzin" : req.leaveType === "sick" ? "Hastalık İzni" : "Kişisel İzin"}
                    </p>
                  </div>
                  <Badge
                    variant={req.status === "approved" ? "default" : req.status === "rejected" ? "destructive" : "secondary"}
                    data-testid={`badge-leave-status-${req.id}`}
                  >
                    {req.status === "approved" ? "Onaylandı" : req.status === "rejected" ? "Reddedildi" : "Beklemede"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Vardiyalarım</h1>
        <p className="text-sm text-muted-foreground mt-0.5" data-testid="text-page-description">Çalışma programınız ve talepler</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-2">
            <div className="flex flex-col items-center text-center gap-0.5">
              <p className="text-[10px] text-muted-foreground">Toplam Vardiya</p>
              <p className="text-lg font-bold" data-testid="text-total-shifts">{totalShifts}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2">
            <div className="flex flex-col items-center text-center gap-0.5">
              <p className="text-[10px] text-muted-foreground">Yaklaşan</p>
              <p className="text-lg font-bold" data-testid="text-upcoming-shifts">{upcomingShifts}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2">
            <div className="flex flex-col items-center text-center gap-0.5">
              <p className="text-[10px] text-muted-foreground">Bu Ay</p>
              <p className="text-lg font-bold" data-testid="text-month-attendance">{workedDays}/{workDaysInMonth}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} data-testid="tabs-view-mode">
        <TabsList>
          <TabsTrigger value="my" data-testid="tab-my-shifts">Vardiyalarım</TabsTrigger>
          <TabsTrigger value="qr" data-testid="tab-qr-checkin">
            <QrCode className="w-3.5 h-3.5 mr-1" />
            QR Giriş
          </TabsTrigger>
          <TabsTrigger value="branch" data-testid="tab-branch-plan">Şube Planı</TabsTrigger>
          <TabsTrigger value="leave" data-testid="tab-leave-request">İzin Talebi</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex gap-2 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          className={`toggle-elevate ${selectedWeekOffset === 0 ? "toggle-elevated" : ""}`}
          onClick={() => setSelectedWeekOffset(0)}
          data-testid="button-this-week"
        >
          Bu Hafta
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`toggle-elevate ${selectedWeekOffset === 1 ? "toggle-elevated" : ""}`}
          onClick={() => setSelectedWeekOffset(1)}
          data-testid="button-next-week"
        >
          Gelecek Hafta
        </Button>
        <span className="text-xs text-muted-foreground self-center" data-testid="text-week-range">
          {format(weekStart, "d MMM", { locale: tr })} - {format(addDays(weekStart, 6), "d MMM", { locale: tr })}
        </span>
      </div>

      {viewMode === "my" && renderMyShifts()}
      {viewMode === "qr" && <QrCheckinGenerator />}
      {viewMode === "branch" && renderBranchPlan()}
      {viewMode === "leave" && renderLeaveTab()}

      {pendingSwapRequests && pendingSwapRequests.length > 0 && (
        <Card data-testid="card-pending-swaps">
          <CardHeader className="pb-2 p-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4" />
              Gelen Takas Talepleri
            </CardTitle>
            <CardDescription className="text-xs">Size gelen vardiya takas talepleri</CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            {pendingSwapRequests.map((req: any) => (
              <div key={req.id} className="flex items-center justify-between gap-2 p-2 rounded border" data-testid={`swap-request-${req.id}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" data-testid={`text-swap-requester-${req.id}`}>
                    {req.requester?.fullName || req.requester?.firstName || "Bilinmeyen"}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid={`text-swap-date-${req.id}`}>
                    {req.swapDate ? format(new Date(req.swapDate), "d MMM yyyy", { locale: tr }) : ""}
                    {req.requesterShift && ` ${t(req.requesterShift.startTime)}-${t(req.requesterShift.endTime)}`}
                  </p>
                  {req.reason && (
                    <p className="text-xs text-muted-foreground mt-0.5" data-testid={`text-swap-reason-${req.id}`}>{req.reason}</p>
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

      {isSupervisor && supervisorPendingSwaps && supervisorPendingSwaps.length > 0 && (
        <Card data-testid="card-supervisor-pending-swaps">
          <CardHeader className="pb-2 p-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Yönetici Onay Bekleyen Takaslar
            </CardTitle>
            <CardDescription className="text-xs">Her iki çalışan da onayladı, son onayınız bekleniyor</CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            {supervisorPendingSwaps.map((req: any) => (
              <div key={req.id} className="flex items-center justify-between gap-2 p-2 rounded border" data-testid={`supervisor-swap-${req.id}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" data-testid={`text-supervisor-swap-names-${req.id}`}>
                    {req.requester?.fullName || req.requester?.firstName || "?"} / {req.target?.fullName || req.target?.firstName || "?"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {req.swapDate ? format(new Date(req.swapDate), "d MMM yyyy", { locale: tr }) : ""}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    {req.requesterShift && (
                      <span>{t(req.requesterShift.startTime)}-{t(req.requesterShift.endTime)}</span>
                    )}
                    <ArrowRightLeft className="w-3 h-3" />
                    {req.targetShift && (
                      <span>{t(req.targetShift.startTime)}-{t(req.targetShift.endTime)}</span>
                    )}
                  </div>
                  {req.reason && <p className="text-xs text-muted-foreground mt-0.5">{req.reason}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => supervisorApproveSwapMutation.mutate(req.id)}
                    disabled={supervisorApproveSwapMutation.isPending}
                    data-testid={`button-supervisor-approve-${req.id}`}
                  >
                    <Check className="w-4 h-4 text-green-600" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => supervisorRejectSwapMutation.mutate(req.id)}
                    disabled={supervisorRejectSwapMutation.isPending}
                    data-testid={`button-supervisor-reject-${req.id}`}
                  >
                    <X className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={swapDialogOpen} onOpenChange={setSwapDialogOpen}>
        <DialogContent data-testid="dialog-swap-request">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4" />
              Vardiya Takas Talebi
            </DialogTitle>
          </DialogHeader>
          {swapTargetShift && (
            <div className="space-y-3">
              <div className="p-2 rounded border">
                <p className="text-xs text-muted-foreground">Hedef Vardiya</p>
                <p className="text-sm font-medium" data-testid="text-swap-target-info">
                  {swapTargetShift.assignedTo?.fullName || `${swapTargetShift.assignedTo?.firstName || ""} ${swapTargetShift.assignedTo?.lastName || ""}`.trim()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(swapTargetShift.shiftDate), "d MMMM yyyy, EEEE", { locale: tr })} - {t(swapTargetShift.startTime)}/{t(swapTargetShift.endTime)}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Sizin vardiyanız (takas edilecek)</label>
                <Select value={swapRequesterShiftId} onValueChange={setSwapRequesterShiftId}>
                  <SelectTrigger data-testid="select-swap-requester-shift">
                    <SelectValue placeholder="Vardiyanızı seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {(myShifts || []).map((s) => (
                      <SelectItem key={s.id} value={String(s.id)} data-testid={`option-my-shift-${s.id}`}>
                        {format(new Date(s.shiftDate), "d MMM", { locale: tr })} {t(s.startTime)}-{t(s.endTime)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Sebep (opsiyonel)</label>
                <Textarea
                  value={swapReason}
                  onChange={(e) => setSwapReason(e.target.value)}
                  placeholder="Takas sebebi..."
                  className="text-sm"
                  data-testid="textarea-swap-reason"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSwapDialogOpen(false)} data-testid="button-cancel-swap">
              İptal
            </Button>
            <Button
              onClick={submitSwap}
              disabled={!swapRequesterShiftId || createSwapMutation.isPending}
              data-testid="button-submit-swap"
            >
              Takas Talebi Gönder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={overtimeDialogOpen} onOpenChange={setOvertimeDialogOpen}>
        <DialogContent data-testid="dialog-overtime-request">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Timer className="w-4 h-4" />
              Mesai Talep Et
            </DialogTitle>
          </DialogHeader>
          {overtimeShift && (
            <div className="space-y-3">
              <div className="p-2 rounded border">
                <p className="text-xs text-muted-foreground">Vardiya Bilgisi</p>
                <p className="text-sm font-medium" data-testid="text-overtime-shift-info">
                  {format(new Date(overtimeShift.shiftDate), "d MMMM yyyy, EEEE", { locale: tr })}
                </p>
                <p className="text-xs text-muted-foreground">
                  Başlangıç: {t(overtimeShift.endTime)} (vardiya bitiş saati)
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Süre</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { val: "60", label: "1 saat" },
                    { val: "120", label: "2 saat" },
                    { val: "180", label: "3 saat" },
                    { val: "240", label: "4 saat" },
                  ].map((opt) => (
                    <Button
                      key={opt.val}
                      variant="ghost"
                      size="sm"
                      className={`toggle-elevate ${overtimeDuration === opt.val ? "toggle-elevated" : ""}`}
                      onClick={() => setOvertimeDuration(opt.val)}
                      data-testid={`button-duration-${opt.val}`}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Sebep</label>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`toggle-elevate ${overtimeReasonType === "İş Yoğunluğu" ? "toggle-elevated" : ""}`}
                    onClick={() => { setOvertimeReasonType("İş Yoğunluğu"); setOvertimeMissingEmployee(""); }}
                    data-testid="button-reason-workload"
                  >
                    <Clock className="w-3 h-3" />
                    İş Yoğunluğu
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`toggle-elevate ${overtimeReasonType === "Gelemeyen Personel" ? "toggle-elevated" : ""}`}
                    onClick={() => setOvertimeReasonType("Gelemeyen Personel")}
                    data-testid="button-reason-missing"
                  >
                    <UserMinus className="w-3 h-3" />
                    Gelemeyen Personel
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`toggle-elevate ${overtimeReasonType === "Yönetici Talebi" ? "toggle-elevated" : ""}`}
                    onClick={() => { setOvertimeReasonType("Yönetici Talebi"); setOvertimeMissingEmployee(""); }}
                    data-testid="button-reason-manager"
                  >
                    <AlertCircle className="w-3 h-3" />
                    Yönetici Talebi
                  </Button>
                </div>
              </div>

              {overtimeReasonType === "Gelemeyen Personel" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Gelemeyen çalışan</label>
                  <Select value={overtimeMissingEmployee} onValueChange={setOvertimeMissingEmployee}>
                    <SelectTrigger data-testid="select-missing-employee">
                      <SelectValue placeholder="Çalışan seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {(branchColleagues || [])
                        .filter((c: any) => c.id !== (user as any)?.id)
                        .map((c: any) => (
                          <SelectItem key={c.id} value={String(c.id)} data-testid={`option-missing-${c.id}`}>
                            {c.fullName || `${c.firstName || ""} ${c.lastName || ""}`.trim()}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Ek açıklama (opsiyonel)</label>
                <Textarea
                  value={overtimeReasonText}
                  onChange={(e) => setOvertimeReasonText(e.target.value)}
                  placeholder="Ek detay..."
                  className="text-sm"
                  data-testid="textarea-overtime-reason"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOvertimeDialogOpen(false)} data-testid="button-cancel-overtime">
              İptal
            </Button>
            <Button
              onClick={submitOvertime}
              disabled={!overtimeReasonType || createOvertimeMutation.isPending}
              data-testid="button-submit-overtime"
            >
              Mesai Talebi Gönder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
