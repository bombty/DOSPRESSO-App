import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Html5QrcodeScanner } from "html5-qrcode";
import { 
  insertShiftSchema, 
  type Shift, 
  type InsertShift,
  type Branch,
  type User,
  isBranchRole,
} from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { 
  Plus, Calendar as CalendarIcon, Clock, Users, CheckCircle2, 
  AlertCircle, TrendingUp, FileText, QrCode, ArrowRight,
  Sun, Moon, Sunset, UserCheck, UserX, Timer, Edit, Trash2, MoreHorizontal,
  MapPin
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format, parseISO, startOfWeek, endOfWeek, isToday, isTomorrow, addDays, differenceInMinutes } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

type ShiftWithRelations = Shift & {
  branch: { name: string };
  assignedTo: { fullName: string } | null;
  createdBy: { fullName: string };
};

const shiftTypeLabels: Record<string, string> = {
  morning: "Sabah",
  evening: "Akşam",
  night: "Gece",
};

const shiftTypeIcons: Record<string, any> = {
  morning: Sun,
  evening: Sunset,
  night: Moon,
};

const shiftTypeColors: Record<string, string> = {
  morning: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-warning/30 dark:border-amber-800",
  evening: "bg-primary/10 text-primary dark:bg-primary/5/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  night: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800",
};

const statusLabels: Record<string, string> = {
  draft: "Taslak",
  pending_hq: "Onay Bekliyor",
  confirmed: "Onaylandı",
  completed: "Tamamlandı",
  cancelled: "İptal",
};

const statusColors: Record<string, string> = {
  draft: "bg-secondary text-foreground dark:bg-gray-800 dark:text-gray-300",
  pending_hq: "bg-warning/20 text-warning dark:bg-yellow-900/30 dark:text-yellow-300",
  confirmed: "bg-green-100 text-success dark:bg-green-900/30 dark:text-green-300",
  completed: "bg-primary/10 text-primary dark:bg-primary/5/30 dark:text-blue-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export default function Vardiyalar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [editingShift, setEditingShift] = useState<ShiftWithRelations | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [shiftToDelete, setShiftToDelete] = useState<ShiftWithRelations | null>(null);
  const [elapsedTime, setElapsedTime] = useState({ hours: 0, minutes: 0, seconds: 0 });

  const isSupervisor = user?.role && (user.role === 'supervisor' || user.role === 'supervisor_buddy');
  const isHQIK = user?.role === 'destek';
  const isEmployee = user?.role && isBranchRole(user.role as any) && !isSupervisor;

  const { data: shifts, isLoading, refetch } = useQuery<ShiftWithRelations[]>({
    queryKey: ['/api/shifts'],
  });

  useEffect(() => {
    if (activeTab === 'live') {
      refetch();
      const interval = setInterval(() => {
        refetch();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [activeTab, refetch]);

  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: !!isSupervisor || !!isHQIK,
  });

  // Fetch active check-ins for live tab
  const { data: activeAttendances, refetch: refetchAttendances } = useQuery<any[]>({
    queryKey: ['/api/shift-attendance', 'active'],
    enabled: !!isSupervisor,
    refetchInterval: activeTab === 'live' ? 15000 : false,
    queryFn: async () => {
      const response = await fetch(`/api/shift-attendance?status=checked_in&date=${format(new Date(), 'yyyy-MM-dd')}`);
      if (!response.ok) throw new Error('Failed to fetch active attendance');
      return response.json();
    }
  });

  const branchUsers = users?.filter((u: User) => u.branchId === user?.branchId);

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
      toast({ title: "Başarılı", description: "Vardiya oluşturuldu" });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
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
      toast({ title: "Başarılı", description: "Vardiya güncellendi" });
      setIsEditDialogOpen(false);
      setEditingShift(null);
      form.reset();
    },
    onError: (error) => {
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
      toast({ title: "Başarılı", description: "Vardiya silindi" });
      setShiftToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Vardiya silinemedi",
        variant: "destructive",
      });
    },
  });

  const handleEditShift = (shift: ShiftWithRelations) => {
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
    setIsEditDialogOpen(true);
  };

  const handleUpdateSubmit = (data: InsertShift) => {
    if (editingShift) {
      const updateData = {
        shiftDate: data.shiftDate,
        startTime: data.startTime,
        endTime: data.endTime,
        shiftType: data.shiftType,
        status: data.status,
        assignedToId: data.assignedToId,
        notes: data.notes,
      };
      updateMutation.mutate({ id: editingShift.id, data: updateData });
    }
  };

  const todayShifts = useMemo(() => {
    if (!shifts) return [];
    const today = format(new Date(), 'yyyy-MM-dd');
    return shifts.filter(s => s.shiftDate === today);
  }, [shifts]);

  const tomorrowShifts = useMemo(() => {
    if (!shifts) return [];
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    return shifts.filter(s => s.shiftDate === tomorrow);
  }, [shifts]);

  const thisWeekShifts = useMemo(() => {
    if (!shifts) return [];
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    return shifts.filter(s => {
      const date = parseISO(s.shiftDate);
      return date >= weekStart && date <= weekEnd;
    });
  }, [shifts]);

  const confirmedCount = thisWeekShifts.filter(s => s.status === 'confirmed').length;
  const pendingCount = thisWeekShifts.filter(s => s.status === 'pending_hq' || s.status === 'draft').length;
  const completedCount = thisWeekShifts.filter(s => s.status === 'completed').length;
  const totalWeekShifts = thisWeekShifts.length;
  const coverageRate = totalWeekShifts > 0 ? Math.round((confirmedCount / totalWeekShifts) * 100) : 0;

  const getShiftsForDate = (date: Date) => {
    if (!shifts) return [];
    const dateStr = format(date, 'yyyy-MM-dd');
    return shifts.filter(s => s.shiftDate === dateStr);
  };

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-3 grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="text-page-title">
            Vardiya Yönetimi
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-page-description">
            {isSupervisor && "Şubenizin vardiyalarını planlayın ve takip edin"}
            {isHQIK && "Tüm şubelerin vardiyalarını görüntüleyin"}
            {isEmployee && "Vardiya programınızı görüntüleyin"}
          </p>
        </div>

        {isSupervisor && (
          <div className="flex gap-2">
            <Link href="/vardiya-sablonlari">
              <Button variant="outline" data-testid="button-templates">
                <FileText className="w-4 h-4 mr-2" />
                Şablonlar
              </Button>
            </Link>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-shift">
                  <Plus className="w-4 h-4 mr-2" />
                  Yeni Vardiya
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Yeni Vardiya Oluştur</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="w-full space-y-2 sm:space-y-3">
                    <FormField
                      control={form.control}
                      name="shiftDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tarih</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button variant="outline" className="w-full justify-start text-left font-normal" data-testid="button-date-picker">
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? format(parseISO(field.value), "d MMMM yyyy", { locale: tr }) : "Tarih seçin"}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={field.value ? parseISO(field.value) : undefined}
                                onSelect={(date) => date && field.onChange(format(date, 'yyyy-MM-dd'))}
                                locale={tr}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="shiftType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vardiya Tipi</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-shift-type">
                                <SelectValue placeholder="Seçin" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="morning">🌅 Sabah (06:00-14:00)</SelectItem>
                              <SelectItem value="evening">🌆 Akşam (14:00-22:00)</SelectItem>
                              <SelectItem value="night">🌙 Gece (22:00-06:00)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Başlangıç</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} data-testid="input-start-time" />
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
                            <FormLabel>Bitiş</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} data-testid="input-end-time" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="assignedToId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Personel</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger data-testid="select-employee">
                                <SelectValue placeholder="Personel seçin (opsiyonel)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {branchUsers?.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.username || 'Bilinmeyen'}
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
                          <FormLabel>Notlar (Opsiyonel)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Vardiya ile ilgili notlar..." 
                              {...field} 
                              value={field.value || ''}
                              data-testid="input-notes" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        İptal
                      </Button>
                      <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-shift">
                        {createMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col gap-3 sm:gap-4">
        <TabsList className="grid w-full grid-cols-4 max-w-xl">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <TrendingUp className="w-4 h-4 mr-2" />
            Genel Bakış
          </TabsTrigger>
          <TabsTrigger value="planning" data-testid="tab-planning">
            <CalendarIcon className="w-4 h-4 mr-2" />
            Planlama
          </TabsTrigger>
          <TabsTrigger value="live" data-testid="tab-live">
            <Clock className="w-4 h-4 mr-2" />
            Canlı Takip
          </TabsTrigger>
          <TabsTrigger value="checkin" data-testid="tab-checkin">
            <QrCode className="w-4 h-4 mr-2" />
            Giriş/Çıkış
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="w-full space-y-2 sm:space-y-3">
          <div className="flex flex-col gap-3 sm:gap-4 lg:grid-cols-4 gap-2 sm:gap-3">
            <Card data-testid="card-total-shifts">
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center gap-1.5">
                  <div className="h-4 w-4 rounded-full bg-primary/10 dark:bg-primary/5/20 flex items-center justify-center">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground">Bu Hafta</p>
                  <p className="text-lg font-bold">{totalWeekShifts}</p>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-confirmed">
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center gap-1.5">
                  <div className="h-4 w-4 rounded-full bg-green-100 dark:bg-success/10 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </div>
                  <p className="text-xs text-muted-foreground">Onaylı</p>
                  <p className="text-lg font-bold text-success">{confirmedCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-pending">
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center gap-1.5">
                  <div className="h-4 w-4 rounded-full bg-warning/20 dark:bg-yellow-900/20 flex items-center justify-center">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                  </div>
                  <p className="text-xs text-muted-foreground">Bekleyen</p>
                  <p className="text-lg font-bold text-yellow-600">{pendingCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-coverage">
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center gap-1.5">
                  <div className="h-4 w-4 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    <Users className="h-4 w-4 text-purple-600" />
                  </div>
                  <p className="text-xs text-muted-foreground">Doluluk</p>
                  <p className="text-lg font-bold">{coverageRate}%</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
            <Card data-testid="card-today">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-amber-500" />
                  Bugün
                  <Badge variant="secondary" className="ml-auto">{todayShifts.length} vardiya</Badge>
                </CardTitle>
                <CardDescription>{format(new Date(), "d MMMM yyyy, EEEE", { locale: tr })}</CardDescription>
              </CardHeader>
              <CardContent>
                {todayShifts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Bugün planlanmış vardiya yok</p>
                ) : (
                  <ScrollArea className="h-[200px]">
                    <div className="flex flex-col gap-3 sm:gap-4">
                      {todayShifts.map((shift) => {
                        const ShiftIcon = shiftTypeIcons[shift.shiftType];
                        return (
                          <div key={shift.id} className={cn("flex items-center justify-between p-3 rounded-lg border", shiftTypeColors[shift.shiftType])} data-testid={`shift-today-${shift.id}`}>
                            <div className="flex items-center gap-2 sm:gap-3">
                              <ShiftIcon className="h-4 w-4" />
                              <div>
                                <p className="font-medium">{shift.assignedTo?.fullName || "Atanmamış"}</p>
                                <p className="text-sm opacity-80">{shift.startTime.slice(0, 5)} - {shift.endTime.slice(0, 5)}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className={statusColors[shift.status]}>
                              {statusLabels[shift.status]}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-tomorrow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-blue-500" />
                  Yarın
                  <Badge variant="secondary" className="ml-auto">{tomorrowShifts.length} vardiya</Badge>
                </CardTitle>
                <CardDescription>{format(addDays(new Date(), 1), "d MMMM yyyy, EEEE", { locale: tr })}</CardDescription>
              </CardHeader>
              <CardContent>
                {tomorrowShifts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">Yarın için vardiya planlanmamış</p>
                    {isSupervisor && (
                      <Button variant="outline" size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Vardiya Ekle
                      </Button>
                    )}
                  </div>
                ) : (
                  <ScrollArea className="h-[200px]">
                    <div className="flex flex-col gap-3 sm:gap-4">
                      {tomorrowShifts.map((shift) => {
                        const ShiftIcon = shiftTypeIcons[shift.shiftType];
                        return (
                          <div key={shift.id} className={cn("flex items-center justify-between p-3 rounded-lg border", shiftTypeColors[shift.shiftType])} data-testid={`shift-tomorrow-${shift.id}`}>
                            <div className="flex items-center gap-2 sm:gap-3">
                              <ShiftIcon className="h-4 w-4" />
                              <div>
                                <p className="font-medium">{shift.assignedTo?.fullName || "Atanmamış"}</p>
                                <p className="text-sm opacity-80">{shift.startTime.slice(0, 5)} - {shift.endTime.slice(0, 5)}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className={statusColors[shift.status]}>
                              {statusLabels[shift.status]}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-quick-actions">
            <CardHeader>
              <CardTitle>Hızlı Erişim</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <Link href="/vardiya-checkin">
                  <Button variant="outline" className="w-full h-24 flex-col gap-2" data-testid="button-checkin">
                    <QrCode className="h-4 w-4" />
                    <span>Giriş/Çıkış</span>
                  </Button>
                </Link>
                <Link href="/vardiya-sablonlari">
                  <Button variant="outline" className="w-full h-24 flex-col gap-2" data-testid="button-templates-quick">
                    <FileText className="h-4 w-4" />
                    <span>Şablonlar</span>
                  </Button>
                </Link>
                {isSupervisor && (
                  <>
                    <Button variant="outline" className="w-full h-24 flex-col gap-2" onClick={() => setIsCreateDialogOpen(true)} data-testid="button-new-shift-quick">
                      <Plus className="h-4 w-4" />
                      <span>Yeni Vardiya</span>
                    </Button>
                    <Button variant="outline" className="w-full h-24 flex-col gap-2" onClick={() => setActiveTab('planning')} data-testid="button-weekly-plan">
                      <CalendarIcon className="h-4 w-4" />
                      <span>Haftalık Plan</span>
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="w-full space-y-2 sm:space-y-3">
          <Card data-testid="card-week-view">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                <div>
                  <CardTitle>Haftalık Plan</CardTitle>
                  <CardDescription>
                    {format(weekDays[0], "d MMM", { locale: tr })} - {format(weekDays[6], "d MMM yyyy", { locale: tr })}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedDate(addDays(selectedDate, -7))}>
                    Önceki Hafta
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
                    Bu Hafta
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedDate(addDays(selectedDate, 7))}>
                    Sonraki Hafta
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day, index) => {
                  const dayShifts = getShiftsForDate(day);
                  const isCurrentDay = isToday(day);
                  return (
                    <div 
                      key={index} 
                      className={cn(
                        "min-h-[150px] border rounded-lg p-2",
                        isCurrentDay && "ring-2 ring-primary"
                      )}
                      data-testid={`day-column-${index}`}
                    >
                      <div className={cn(
                        "text-center mb-2 pb-2 border-b",
                        isCurrentDay && "font-bold text-primary"
                      )}>
                        <p className="text-xs text-muted-foreground">{format(day, "EEE", { locale: tr })}</p>
                        <p className="text-lg">{format(day, "d")}</p>
                      </div>
                      <div className="w-full space-y-1 md:space-y-1">
                        {dayShifts.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-3">-</p>
                        ) : (
                          dayShifts.slice(0, 3).map((shift) => (
                            <div 
                              key={shift.id} 
                              className={cn("text-xs p-1.5 rounded border", shiftTypeColors[shift.shiftType])}
                              title={`${shift.assignedTo?.fullName || 'Atanmamış'} - ${shift.startTime.slice(0,5)}-${shift.endTime.slice(0,5)}`}
                            >
                              <p className="font-medium truncate">{shift.assignedTo?.fullName?.split(' ')[0] || '?'}</p>
                              <p className="opacity-70">{shift.startTime.slice(0, 5)}</p>
                            </div>
                          ))
                        )}
                        {dayShifts.length > 3 && (
                          <p className="text-xs text-muted-foreground text-center">+{dayShifts.length - 3} daha</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-all-shifts">
            <CardHeader>
              <CardTitle>Bu Haftanın Tüm Vardiyaları</CardTitle>
              <CardDescription>{thisWeekShifts.length} vardiya planlandı</CardDescription>
            </CardHeader>
            <CardContent>
              {thisWeekShifts.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">Bu hafta için henüz vardiya planlanmamış</p>
                  {isSupervisor && (
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      İlk Vardiyayı Oluştur
                    </Button>
                  )}
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="flex flex-col gap-3 sm:gap-4">
                    {thisWeekShifts
                      .sort((a, b) => a.shiftDate.localeCompare(b.shiftDate) || a.startTime.localeCompare(b.startTime))
                      .map((shift) => {
                        const ShiftIcon = shiftTypeIcons[shift.shiftType];
                        const shiftDate = parseISO(shift.shiftDate);
                        return (
                          <div 
                            key={shift.id} 
                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                            data-testid={`shift-item-${shift.id}`}
                          >
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className={cn("p-2 rounded-lg", shiftTypeColors[shift.shiftType])}>
                                <ShiftIcon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-medium">{shift.assignedTo?.fullName || "Atanmamış"}</p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <span>{format(shiftDate, "d MMM, EEE", { locale: tr })}</span>
                                  <span>•</span>
                                  <span>{shift.startTime.slice(0, 5)} - {shift.endTime.slice(0, 5)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={shiftTypeColors[shift.shiftType]}>
                                {shiftTypeLabels[shift.shiftType]}
                              </Badge>
                              <Badge variant="outline" className={statusColors[shift.status]}>
                                {statusLabels[shift.status]}
                              </Badge>
                              {isSupervisor && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" data-testid={`button-shift-menu-${shift.id}`}>
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEditShift(shift)} data-testid={`button-edit-shift-${shift.id}`}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Düzenle
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => setShiftToDelete(shift)} 
                                      className="text-destructive"
                                      data-testid={`button-delete-shift-${shift.id}`}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Sil
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="w-full space-y-2 sm:space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <Card data-testid="card-live-active">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Canlı Çalışanlar</CardTitle>
                <UserCheck className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success">
                  {activeAttendances?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">şu an giriş yapan</p>
              </CardContent>
            </Card>

            <Card data-testid="card-live-late">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Toplam Vardiyalar</CardTitle>
                <Timer className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{todayShifts.length}</div>
                <p className="text-xs text-muted-foreground">bugün planlanmış</p>
              </CardContent>
            </Card>

            <Card data-testid="card-live-missing">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Henüz Gelmedi</CardTitle>
                <UserX className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive">
                  {(todayShifts.length - (activeAttendances?.length || 0)) > 0 ? todayShifts.length - (activeAttendances?.length || 0) : 0}
                </div>
                <p className="text-xs text-muted-foreground">eksik personel</p>
              </CardContent>
            </Card>
          </div>

          {/* Active Check-ins */}
          {isSupervisor && (
            <Card data-testid="card-active-checkins">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-green-500" />
                  Canlı Giriş Yapanlar
                </CardTitle>
                <CardDescription>Şu an faal olan personel listesi</CardDescription>
              </CardHeader>
              <CardContent>
                {activeAttendances && activeAttendances.length > 0 ? (
                  <div className="flex flex-col gap-3 sm:gap-4">
                    {activeAttendances.map((attendance) => {
                      const user = users?.find(u => u.id === attendance.userId);
                      const checkInTime = attendance.checkInTime ? new Date(attendance.checkInTime) : null;
                      const duration = checkInTime ? Math.floor((Date.now() - checkInTime.getTime()) / (60 * 1000)) : 0;
                      return (
                        <div key={attendance.id} className="flex items-center justify-between p-3 rounded-lg border bg-success/10 dark:bg-success/5/20">
                          <div className="flex items-center gap-2 sm:gap-3 flex-1">
                            <div className="w-2 h-2 rounded-full bg-success/100 animate-pulse" />
                            <div className="flex-1">
                              <p className="font-medium">{user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.username || 'Bilinmeyen'}</p>
                              <div className="flex gap-2 sm:gap-3 text-xs text-muted-foreground mt-1">
                                <span>📍 {attendance.location_confidence ? Math.round(attendance.location_confidence) + '%' : 'Bilinmeyen'}</span>
                                <span>⏱️ {duration} dakika</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-success">{checkInTime ? format(checkInTime, 'HH:mm') : '-'}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <UserX className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Henüz kimse giriş yapmadı</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card data-testid="card-live-timeline">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Bugünkü Zaman Çizelgesi
              </CardTitle>
              <CardDescription>{format(new Date(), "d MMMM yyyy, EEEE", { locale: tr })}</CardDescription>
            </CardHeader>
            <CardContent>
              {todayShifts.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Bugün için planlanmış vardiya yok</p>
                </div>
              ) : (
                <div className="w-full space-y-2 sm:space-y-3">
                  {['morning', 'evening', 'night'].map((type) => {
                    const typeShifts = todayShifts.filter(s => s.shiftType === type);
                    if (typeShifts.length === 0) return null;
                    const ShiftIcon = shiftTypeIcons[type];
                    return (
                      <div key={type} className="flex flex-col gap-3 sm:gap-4">
                        <div className="flex items-center gap-2">
                          <div className={cn("p-1.5 rounded", shiftTypeColors[type])}>
                            <ShiftIcon className="h-4 w-4" />
                          </div>
                          <span className="font-medium">{shiftTypeLabels[type]} Vardiyası</span>
                          <Badge variant="secondary">{typeShifts.length} kişi</Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 ml-8">
                          {typeShifts.map((shift) => (
                            <div 
                              key={shift.id}
                              className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                              data-testid={`live-shift-${shift.id}`}
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-success/100" />
                                <span className="font-medium">{shift.assignedTo?.fullName || "Atanmamış"}</span>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {shift.startTime.slice(0, 5)} - {shift.endTime.slice(0, 5)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-checkin-prompt">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-3 rounded-full bg-primary/10">
                    <QrCode className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Vardiya Giriş/Çıkış</p>
                    <p className="text-sm text-muted-foreground">QR kod ile hızlı giriş yapın</p>
                  </div>
                </div>
                <Button data-testid="button-go-checkin" onClick={() => setActiveTab('checkin')}>
                  Giriş Yap
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="w-full space-y-2 sm:space-y-3">
          <CheckInContent user={user} toast={toast} />
        </TabsContent>
      </Tabs>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vardiya Düzenle</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateSubmit)} className="w-full space-y-2 sm:space-y-3">
              <FormField
                control={form.control}
                name="shiftDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tarih</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className="w-full justify-start text-left font-normal" data-testid="button-edit-date-picker">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(parseISO(field.value), "d MMMM yyyy", { locale: tr }) : "Tarih seçin"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value ? parseISO(field.value) : undefined}
                          onSelect={(date) => date && field.onChange(format(date, 'yyyy-MM-dd'))}
                          locale={tr}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shiftType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vardiya Tipi</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-shift-type">
                          <SelectValue placeholder="Seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="morning">🌅 Sabah</SelectItem>
                        <SelectItem value="evening">🌆 Akşam</SelectItem>
                        <SelectItem value="night">🌙 Gece</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Başlangıç</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} data-testid="input-edit-start-time" />
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
                      <FormLabel>Bitiş</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} data-testid="input-edit-end-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="assignedToId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Personel</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-employee">
                          <SelectValue placeholder="Personel seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {branchUsers?.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.username || 'Bilinmeyen'}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durum</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-status">
                          <SelectValue placeholder="Durum seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Taslak</SelectItem>
                        <SelectItem value="pending_hq">Onay Bekliyor</SelectItem>
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
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notlar</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Vardiya ile ilgili notlar..." 
                        {...field} 
                        value={field.value || ''}
                        data-testid="input-edit-notes" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  İptal
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-edit">
                  {updateMutation.isPending ? "Güncelleniyor..." : "Güncelle"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!shiftToDelete} onOpenChange={(open) => !open && setShiftToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vardiyayı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu vardiyayı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
              {shiftToDelete && (
                <div className="mt-2 p-3 bg-muted rounded-lg">
                  <p className="font-medium">{shiftToDelete.assignedTo?.fullName || "Atanmamış"}</p>
                  <p className="text-sm">{format(parseISO(shiftToDelete.shiftDate), "d MMMM yyyy", { locale: tr })}</p>
                  <p className="text-sm">{shiftToDelete.startTime.slice(0, 5)} - {shiftToDelete.endTime.slice(0, 5)}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => shiftToDelete && deleteMutation.mutate(shiftToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Siliniyor..." : "Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CheckInContent({ user, toast }: { user: any; toast: any }) {
  const [scannerActive, setScannerActive] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'checking' | 'success' | 'failed'>('idle');
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationConfidence, setLocationConfidence] = useState(0);
  const [scannedShiftId, setScannedShiftId] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const { data: todayAttendance, refetch: refetchAttendance } = useQuery<any>({
    queryKey: ['/api/shift-attendance/today'],
  });

  // Auto-refetch attendance when tab is active
  useEffect(() => {
    const interval = setInterval(() => refetchAttendance(), 5000);
    return () => clearInterval(interval);
  }, [refetchAttendance]);

  const { data: myShifts } = useQuery<ShiftWithRelations[]>({
    queryKey: ['/api/shifts/my'],
  });

  // Initialize QR Scanner
  useEffect(() => {
    if (scannerActive && !scannerRef.current) {
      const scanner = new Html5QrcodeScanner(
        "qr-scanner-container",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      
      scanner.render(
        (decodedText) => {
          try {
            // QR kod formatı: "branch:123"
            const trimmed = decodedText.trim();
            const parts = trimmed.split(':');
            const [type, id] = parts;
            if (type === 'branch') {
              setScannerActive(false);
              scanner.clear();
              scannerRef.current = null;
              
              // Bugünkü vardiyaları bul ve ilkini seç
              if (todayShifts && todayShifts.length > 0) {
                handleQRCheckIn(todayShifts[0]);
              } else {
                toast({ title: "Hata", description: "Bugün için vardiya bulunamadı", variant: "destructive" });
              }
            } else {
              toast({ title: "Hata", description: "Bu bir vardiya QR kodu değil", variant: "destructive" });
            }
          } catch (err) {
            toast({ title: "Hata", description: "QR kod okunamadı, lütfen tekrar deneyin", variant: "destructive" });
          }
        },
        (error) => {
        }
      );
      
      scannerRef.current = scanner;
    } else if (!scannerActive && scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, [scannerActive, myShifts, toast]);

  const checkInMutation = useMutation({
    mutationFn: async (data: { shiftId?: number; branchId?: number; checkInMethod: string; latitude?: number; longitude?: number; locationConfidenceScore?: number }) => {
      return await apiRequest('POST', '/api/shift-attendance/manual-check-in', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shift-attendance/today'] });
      toast({ title: "Başarılı", description: "Vardiya girişi yapıldı" });
    },
    onError: (error) => {
      toast({ title: "Hata", description: error.message || "Giriş yapılamadı", variant: "destructive" });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async (data: { attendanceId: number }) => {
      return await apiRequest('POST', '/api/shift-attendance/manual-check-out', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shift-attendance/today'] });
      toast({ title: "Başarılı", description: "Vardiya çıkışı yapıldı" });
    },
    onError: (error) => {
      toast({ title: "Hata", description: error.message || "Çıkış yapılamadı", variant: "destructive" });
    },
  });

  const checkLocation = () => {
    setLocationStatus('checking');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationConfidence(position.coords.accuracy < 50 ? 100 : position.coords.accuracy < 100 ? 80 : 60);
          setLocationStatus('success');
        },
        (error) => {
          setLocationStatus('failed');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLocationStatus('failed');
    }
  };

  const handleQRCheckIn = (shift: ShiftWithRelations) => {
    checkLocation();
    setTimeout(() => {
      if (currentLocation) {
        checkInMutation.mutate({
          shiftId: shift.id,
          checkInMethod: 'qr',
          latitude: currentLocation.lat,
          longitude: currentLocation.lng,
          locationConfidenceScore: locationConfidence,
        });
      }
    }, 500);
  };

  const handleManualCheckIn = (shift: ShiftWithRelations) => {
    if (!currentLocation) {
      checkLocation();
      toast({ title: "Konum kontrol ediliyor", description: "Lütfen bekleyin..." });
      return;
    }
    
    checkInMutation.mutate({
      shiftId: shift.id,
      checkInMethod: 'manual',
      latitude: currentLocation.lat,
      longitude: currentLocation.lng,
      locationConfidenceScore: locationConfidence,
    });
  };

  const handleBranchCheckIn = (branchId: number) => {
    if (!currentLocation) {
      checkLocation();
      toast({ title: "Konum kontrol ediliyor", description: "Lütfen bekleyin..." });
      return;
    }
    
    checkInMutation.mutate({
      branchId: branchId,
      checkInMethod: 'manual',
      latitude: currentLocation.lat,
      longitude: currentLocation.lng,
      locationConfidenceScore: locationConfidence,
    });
  };

  const todayShifts = myShifts?.filter(s => {
    const shiftDate = parseISO(s.shiftDate);
    return isToday(shiftDate);
  }) || [];

  const isCheckedIn = todayAttendance?.checkInTime && !todayAttendance?.checkOutTime;
  const hasCompletedShift = todayAttendance?.checkOutTime;

  // Live timer for elapsed work time
  useEffect(() => {
    if (!isCheckedIn || !todayAttendance?.checkInTime) return;
    
    const interval = setInterval(() => {
      const checkIn = new Date(todayAttendance.checkInTime).getTime();
      const now = new Date().getTime();
      const totalSeconds = Math.floor((now - checkIn) / 1000);
      
      setElapsedTime({
        hours: Math.floor(totalSeconds / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isCheckedIn, todayAttendance?.checkInTime]);

  return (
    <div className="w-full space-y-2 sm:space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Vardiya Giriş/Çıkış</h2>
        {locationStatus === 'idle' && (
          <Button variant="outline" onClick={checkLocation} size="sm" data-testid="button-check-location">
            <MapPin className="w-4 h-4 mr-2" />
            Konum
          </Button>
        )}
        {locationStatus === 'checking' && (
          <Badge variant="secondary">
            <Timer className="w-4 h-4 mr-2 animate-spin" />
            Alınıyor...
          </Badge>
        )}
        {locationStatus === 'success' && (
          <Badge className="bg-green-100 text-success dark:bg-green-900/30 dark:text-green-300">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Doğrulandı
          </Badge>
        )}
        {locationStatus === 'failed' && (
          <Badge variant="destructive">
            <AlertCircle className="w-4 h-4 mr-2" />
            Başarısız
          </Badge>
        )}
      </div>

      {isCheckedIn && todayAttendance && (
        <Card className="border-success/30 dark:border-success/40 bg-success/10 dark:bg-success/5/30" data-testid="card-checked-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success dark:text-green-300">
              <UserCheck className="h-4 w-4" />
              Aktif Vardiya - {format(parseISO(todayAttendance.checkInTime), "HH:mm", { locale: tr })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
              <div className="flex flex-col gap-3 sm:gap-4">
                <p className="text-sm text-muted-foreground">Çalışma Süresi</p>
                <div className="font-mono text-3xl font-bold text-success dark:text-green-300 tracking-wide">
                  {String(elapsedTime.hours).padStart(2, '0')}:{String(elapsedTime.minutes).padStart(2, '0')}:{String(elapsedTime.seconds).padStart(2, '0')}
                </div>
              </div>
              <Button 
                size="lg"
                variant="destructive"
                onClick={() => checkOutMutation.mutate({ attendanceId: todayAttendance.id })}
                disabled={checkOutMutation.isPending}
                data-testid="button-checkout"
              >
                <UserX className="w-5 h-5 mr-2" />
                {checkOutMutation.isPending ? "Çıkış yapılıyor..." : "Vardiya Çıkışı"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {hasCompletedShift && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30" data-testid="card-completed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary dark:text-blue-300">
              <CheckCircle2 className="h-4 w-4" />
              Vardiya Tamamlandı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Giriş</p>
                <p className="font-medium">{format(parseISO(todayAttendance.checkInTime), "HH:mm", { locale: tr })}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Çıkış</p>
                <p className="font-medium">{format(parseISO(todayAttendance.checkOutTime), "HH:mm", { locale: tr })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isCheckedIn && !hasCompletedShift && (
        <div className="w-full space-y-2 sm:space-y-3">
          {/* Inline QR Scanner - Only show when active */}
          {scannerActive && (
            <Card className="border-primary/50 bg-card/80 backdrop-blur-sm" data-testid="card-qr-scan-inline">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    QR Kod Tara
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Şubenizdeki QR kodu kameraya gösterin
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setScannerActive(false)}
                  variant="ghost"
                  size="icon"
                  data-testid="button-close-scanner"
                >
                  <AlertCircle className="h-4 w-4 opacity-50" />
                </Button>
              </CardHeader>

              <CardContent className="w-full space-y-2 sm:space-y-3">
                {/* Scanner Container */}
                <div className="border rounded-lg overflow-hidden bg-black/5">
                  <div id="qr-scanner-container" style={{ width: '100%' }} />
                </div>

                {/* Close Button */}
                <Button 
                  variant="outline" 
                  onClick={() => setScannerActive(false)} 
                  data-testid="button-close-qr-scanner"
                  className="w-full"
                >
                  Kapat
                </Button>
              </CardContent>
            </Card>
          )}

          {/* QR Toggle Button - Show when scanner is closed */}
          {!scannerActive && (
            <Card data-testid="card-qr-prompt">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  QR Kod ile Giriş Yap
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="default" 
                  onClick={() => setScannerActive(true)} 
                  data-testid="button-open-scanner"
                  className="w-full"
                  disabled={checkInMutation.isPending}
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  {checkInMutation.isPending ? "Giriş yapılıyor..." : "Tarayıcıyı Aç"}
                </Button>
              </CardContent>
            </Card>
          )}

          {todayShifts.length > 0 && (
            <Card data-testid="card-today-shifts">
              <CardHeader>
                <CardTitle>Bugünkü Vardiyaları Seç</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:gap-4">
                {todayShifts.map((shift) => {
                  const ShiftIcon = shiftTypeIcons[shift.shiftType];
                  return (
                    <div 
                      key={shift.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                      data-testid={`shift-card-${shift.id}`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className={cn("p-2 rounded-lg", shiftTypeColors[shift.shiftType])}>
                          <ShiftIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{shiftTypeLabels[shift.shiftType]} Vardiyası</p>
                          <p className="text-sm text-muted-foreground">
                            {shift.startTime.slice(0, 5)} - {shift.endTime.slice(0, 5)}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleManualCheckIn(shift)}
                        disabled={checkInMutation.isPending || locationStatus === 'checking'}
                        data-testid={`button-checkin-${shift.id}`}
                      >
                        {checkInMutation.isPending ? "Giriş yapılıyor..." : "Giriş Yap"}
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {todayShifts.length === 0 && (
            <Card data-testid="card-no-shifts">
              <CardHeader>
                <CardTitle>Şube Seçerek Giriş Yap</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:gap-4">
                <div className="flex flex-col gap-3 sm:gap-4">
                  <Button
                    onClick={() => {
                      if (user?.branchId) {
                        handleBranchCheckIn(user.branchId);
                      } else {
                        toast({ title: "Hata", description: "Şube bilgisi bulunamadı", variant: "destructive" });
                      }
                    }}
                    disabled={checkInMutation.isPending || locationStatus === 'checking'}
                    data-testid="button-checkin-branch"
                    className="w-full"
                  >
                    {checkInMutation.isPending ? "Giriş yapılıyor..." : "Şubeye Giriş Yap"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
        <CardContent className="pt-6">
          <div className="flex gap-2 sm:gap-3">
            <div className="p-2 bg-primary/10 dark:bg-primary/5 rounded-lg h-fit">
              <CheckCircle2 className="h-4 w-4 text-primary dark:text-blue-400" />
            </div>
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100">Giriş/Çıkış Sistemi Hakkında</h4>
              <ul className="mt-2 text-sm text-primary dark:text-blue-300 space-y-1">
                <li>1. Şubenizde bulunan QR kodu okutun veya manuel giriş yapın</li>
                <li>2. Konum bilginiz otomatik olarak doğrulanır</li>
                <li>3. Şube yarıçapı içinde olmanız gerekir</li>
                <li>4. Vardiya bitiminde çıkış yapmayı unutmayın</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
