import { useState } from "react";
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
import { Plus, Calendar as CalendarIcon, Edit, Trash2, Clock, User as UserIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";

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

export default function Vardiyalar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftWithRelations | null>(null);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<number | undefined>(undefined);
  const [selectedUserFilter, setSelectedUserFilter] = useState<string | undefined>(undefined);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

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
      const token = localStorage.getItem('dospresso_token');
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const response = await fetch(`/api/shifts${queryParams}`, {
        headers,
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
    </div>
  );
}
