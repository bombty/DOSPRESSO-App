import { useState, useMemo, useEffect, useRef } from "react";
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
  morning: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  evening: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
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
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  pending_hq: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  confirmed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
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
      toast({ title: "Başarılı", description: "Vardiya güncellendi" });
      setIsEditDialogOpen(false);
      setEditingShift(null);
      form.reset();
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
      toast({ title: "Başarılı", description: "Vardiya silindi" });
      setShiftToDelete(null);
    },
    onError: (error: any) => {
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
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
                  <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
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

                    <div className="grid grid-cols-2 gap-4">
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
                                  {u.fullName}
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card data-testid="card-total-shifts">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Bu Hafta</CardTitle>
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalWeekShifts}</div>
                <p className="text-xs text-muted-foreground">toplam vardiya</p>
              </CardContent>
            </Card>

            <Card data-testid="card-confirmed">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Onaylı</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{confirmedCount}</div>
                <p className="text-xs text-muted-foreground">kesinleşmiş vardiya</p>
              </CardContent>
            </Card>

            <Card data-testid="card-pending">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Bekleyen</CardTitle>
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
                <p className="text-xs text-muted-foreground">onay bekliyor</p>
              </CardContent>
            </Card>

            <Card data-testid="card-coverage">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Doluluk</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{coverageRate}%</div>
                <Progress value={coverageRate} className="mt-2 h-2" />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="card-today">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sun className="h-5 w-5 text-amber-500" />
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
                    <div className="space-y-3">
                      {todayShifts.map((shift) => {
                        const ShiftIcon = shiftTypeIcons[shift.shiftType];
                        return (
                          <div key={shift.id} className={cn("flex items-center justify-between p-3 rounded-lg border", shiftTypeColors[shift.shiftType])} data-testid={`shift-today-${shift.id}`}>
                            <div className="flex items-center gap-3">
                              <ShiftIcon className="h-5 w-5" />
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
                  <ArrowRight className="h-5 w-5 text-blue-500" />
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
                    <div className="space-y-3">
                      {tomorrowShifts.map((shift) => {
                        const ShiftIcon = shiftTypeIcons[shift.shiftType];
                        return (
                          <div key={shift.id} className={cn("flex items-center justify-between p-3 rounded-lg border", shiftTypeColors[shift.shiftType])} data-testid={`shift-tomorrow-${shift.id}`}>
                            <div className="flex items-center gap-3">
                              <ShiftIcon className="h-5 w-5" />
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Link href="/vardiya-checkin">
                  <Button variant="outline" className="w-full h-24 flex-col gap-2" data-testid="button-checkin">
                    <QrCode className="h-6 w-6" />
                    <span>Giriş/Çıkış</span>
                  </Button>
                </Link>
                <Link href="/vardiya-sablonlari">
                  <Button variant="outline" className="w-full h-24 flex-col gap-2" data-testid="button-templates-quick">
                    <FileText className="h-6 w-6" />
                    <span>Şablonlar</span>
                  </Button>
                </Link>
                {isSupervisor && (
                  <>
                    <Button variant="outline" className="w-full h-24 flex-col gap-2" onClick={() => setIsCreateDialogOpen(true)} data-testid="button-new-shift-quick">
                      <Plus className="h-6 w-6" />
                      <span>Yeni Vardiya</span>
                    </Button>
                    <Button variant="outline" className="w-full h-24 flex-col gap-2" onClick={() => setActiveTab('planning')} data-testid="button-weekly-plan">
                      <CalendarIcon className="h-6 w-6" />
                      <span>Haftalık Plan</span>
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planning" className="space-y-6">
          <Card data-testid="card-week-view">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
                      <div className="space-y-1">
                        {dayShifts.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">-</p>
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
                  <div className="space-y-2">
                    {thisWeekShifts
                      .sort((a, b) => a.shiftDate.localeCompare(b.shiftDate) || a.startTime.localeCompare(b.startTime))
                      .map((shift) => {
                        const ShiftIcon = shiftTypeIcons[shift.shiftType];
                        const shiftDate = parseISO(shift.shiftDate);
                        return (
                          <div 
                            key={shift.id} 
                            className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                            data-testid={`shift-item-${shift.id}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={cn("p-2 rounded-lg", shiftTypeColors[shift.shiftType])}>
                                <ShiftIcon className="h-5 w-5" />
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

        <TabsContent value="live" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card data-testid="card-live-active">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Şu An Çalışıyor</CardTitle>
                <UserCheck className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {todayShifts.filter(s => s.status === 'confirmed').length}
                </div>
                <p className="text-xs text-muted-foreground">aktif personel</p>
              </CardContent>
            </Card>

            <Card data-testid="card-live-late">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Geç Giriş</CardTitle>
                <Timer className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">0</div>
                <p className="text-xs text-muted-foreground">gecikmeli giriş</p>
              </CardContent>
            </Card>

            <Card data-testid="card-live-missing">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Gelmedi</CardTitle>
                <UserX className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">0</div>
                <p className="text-xs text-muted-foreground">eksik personel</p>
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-live-timeline">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
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
                <div className="space-y-4">
                  {['morning', 'evening', 'night'].map((type) => {
                    const typeShifts = todayShifts.filter(s => s.shiftType === type);
                    if (typeShifts.length === 0) return null;
                    const ShiftIcon = shiftTypeIcons[type];
                    return (
                      <div key={type} className="space-y-2">
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
                                <div className="w-2 h-2 rounded-full bg-green-500" />
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
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-primary/10">
                    <QrCode className="h-6 w-6 text-primary" />
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

        <TabsContent value="checkin" className="space-y-6">
          <CheckInContent user={user} toast={toast} />
        </TabsContent>
      </Tabs>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vardiya Düzenle</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateSubmit)} className="space-y-4">
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

              <div className="grid grid-cols-2 gap-4">
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
                            {u.fullName}
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
            const [type, id] = decodedText.split(':');
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
            }
          } catch (err) {
            console.error("QR decode error:", err);
          }
        },
        (error) => {
          console.log("QR scan error:", error);
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
    mutationFn: async (data: { shiftId: number; checkInMethod: string; latitude?: number; longitude?: number; locationConfidenceScore?: number }) => {
      return await apiRequest('POST', '/api/shift-attendance/manual-check-in', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shift-attendance/today'] });
      toast({ title: "Başarılı", description: "Vardiya girişi yapıldı" });
    },
    onError: (error: any) => {
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
    onError: (error: any) => {
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
          console.error("Location error:", error);
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

  const todayShifts = myShifts?.filter(s => {
    const shiftDate = parseISO(s.shiftDate);
    return isToday(shiftDate);
  }) || [];

  const isCheckedIn = todayAttendance?.checkInTime && !todayAttendance?.checkOutTime;
  const hasCompletedShift = todayAttendance?.checkOutTime;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Vardiya Giriş/Çıkış</h2>
          <p className="text-muted-foreground">
            {format(new Date(), "d MMMM yyyy, EEEE", { locale: tr })}
          </p>
        </div>
        {locationStatus === 'idle' && (
          <Button variant="outline" onClick={checkLocation} data-testid="button-check-location">
            <MapPin className="w-4 h-4 mr-2" />
            Konumu Kontrol Et
          </Button>
        )}
        {locationStatus === 'checking' && (
          <Badge variant="secondary">
            <Timer className="w-4 h-4 mr-2 animate-spin" />
            Konum alınıyor...
          </Badge>
        )}
        {locationStatus === 'success' && (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Konum doğrulandı ({locationConfidence}%)
          </Badge>
        )}
        {locationStatus === 'failed' && (
          <Badge variant="destructive">
            <AlertCircle className="w-4 h-4 mr-2" />
            Konum alınamadı
          </Badge>
        )}
      </div>

      {isCheckedIn && todayAttendance && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30" data-testid="card-checked-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <UserCheck className="h-5 w-5" />
              Aktif Vardiya
            </CardTitle>
            <CardDescription className="text-green-600 dark:text-green-400">
              {format(parseISO(todayAttendance.checkInTime), "HH:mm", { locale: tr })} saatinde giriş yaptınız
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Çalışma Süresi</p>
                <p className="text-2xl font-bold">
                  {Math.floor(differenceInMinutes(new Date(), parseISO(todayAttendance.checkInTime)) / 60)} saat{' '}
                  {differenceInMinutes(new Date(), parseISO(todayAttendance.checkInTime)) % 60} dakika
                </p>
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
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <CheckCircle2 className="h-5 w-5" />
              Bugünkü Vardiya Tamamlandı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
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
        <div className="space-y-4">
          <Card data-testid="card-qr-scan">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                QR Kod ile Giriş
              </CardTitle>
              <CardDescription>
                Şubenizdeki QR kodu okutarak hızlı giriş yapın
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4 py-6">
                {!scannerActive ? (
                  <div className="w-full max-w-sm">
                    <div className="w-full aspect-square border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center bg-muted/30">
                      <div className="text-center">
                        <QrCode className="h-16 w-16 mx-auto text-muted-foreground/50" />
                        <p className="mt-2 text-sm text-muted-foreground">QR tarayıcı kapalı</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div id="qr-scanner-container" className="w-full max-w-sm" />
                )}
                <Button 
                  variant="outline" 
                  onClick={() => setScannerActive(!scannerActive)} 
                  data-testid="button-toggle-scanner"
                  disabled={checkInMutation.isPending}
                >
                  {scannerActive ? "Tarayıcıyı Kapat" : "Tarayıcıyı Aç"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {todayShifts.length > 0 && (
            <Card data-testid="card-today-shifts">
              <CardHeader>
                <CardTitle>Bugünkü Vardiyalarınız</CardTitle>
                <CardDescription>Manuel giriş için bir vardiya seçin</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {todayShifts.map((shift) => {
                  const ShiftIcon = shiftTypeIcons[shift.shiftType];
                  return (
                    <div 
                      key={shift.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
                      data-testid={`shift-card-${shift.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg", shiftTypeColors[shift.shiftType])}>
                          <ShiftIcon className="h-5 w-5" />
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
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <CalendarIcon className="h-16 w-16 mx-auto text-muted-foreground/50" />
                  <p className="mt-4 text-lg font-medium">Bugün için planlı vardiya yok</p>
                  <p className="text-sm text-muted-foreground">
                    Vardiya yöneticinizle iletişime geçin
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg h-fit">
              <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100">Giriş/Çıkış Sistemi Hakkında</h4>
              <ul className="mt-2 text-sm text-blue-700 dark:text-blue-300 space-y-1">
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
