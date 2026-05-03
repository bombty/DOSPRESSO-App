import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  insertDailyCashReportSchema, 
  type DailyCashReport, 
  type InsertDailyCashReport,
  type Branch,
  isBranchRole,
} from "@shared/schema";
import { MobileFilterCollapse } from "@/components/mobile-filter-collapse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListSkeleton } from "@/components/list-skeleton";
import { EmptyState } from "@/components/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Calendar as CalendarIcon, Edit, Trash2, TrendingUp, DollarSign, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ConfirmDeleteDialog, useConfirmDelete } from "@/components/confirm-delete-dialog";

type CashReportWithRelations = DailyCashReport & {
  branch: {
    name: string;
  };
  reportedBy: {
    fullName: string;
  };
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('tr-TR', { 
    style: 'currency', 
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(amount);
};

export default function CashReports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<CashReportWithRelations | null>(null);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<number | undefined>(undefined);
  const { deleteState, requestDelete, cancelDelete, confirmDelete } = useConfirmDelete();
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  const isSupervisor = user?.role && isBranchRole(user.role as any);
  const isMuhasebe = user?.role === 'muhasebe';

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ['/api/branches'],
    staleTime: 300000,
    enabled: isMuhasebe,
  });

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', format(dateFrom, 'yyyy-MM-dd'));
    if (dateTo) params.append('dateTo', format(dateTo, 'yyyy-MM-dd'));
    return params.toString() ? `?${params.toString()}` : '';
  };

  const { data: reports, isLoading, isError, refetch } = useQuery<CashReportWithRelations[]>({
    queryKey: ['/api/cash-reports', dateFrom, dateTo],
    queryFn: async () => {
      const queryParams = buildQueryParams();
      const response = await fetch(`/api/cash-reports${queryParams}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch cash reports');
      return response.json();
    },
  });

  const filteredReports = reports?.filter(report => {
    if (isMuhasebe && selectedBranchFilter && report.branchId !== selectedBranchFilter) {
      return false;
    }
    return true;
  });

  const form = useForm<InsertDailyCashReport>({
    resolver: zodResolver(insertDailyCashReportSchema),
    defaultValues: {
      branchId: user?.branchId || 0,
      reportDate: format(new Date(), 'yyyy-MM-dd'),
      openingCash: "0.00",
      closingCash: "0.00",
      totalSales: "0.00",
      cashSales: null,
      cardSales: null,
      expenses: null,
      notes: null,
      reportedById: user?.id || '',
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertDailyCashReport) => {
      await apiRequest('POST', '/api/cash-reports', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cash-reports'] });
      toast({
        title: "Başarılı",
        description: "Cashier raporu oluşturuldu",
      });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Cashier raporu oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertDailyCashReport> }) => {
      await apiRequest('PATCH', `/api/cash-reports/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cash-reports'] });
      toast({
        title: "Başarılı",
        description: "Cashier raporu güncellendi",
      });
      setEditingReport(null);
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Cashier raporu güncellenemedi",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/cash-reports/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cash-reports'] });
      toast({
        title: "Başarılı",
        description: "Cashier raporu silindi",
      });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Cashier raporu silinemedi",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: InsertDailyCashReport) => {
    if (editingReport) {
      updateMutation.mutate({ id: editingReport.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (report: CashReportWithRelations) => {
    setEditingReport(report);
    form.reset({
      branchId: report.branchId,
      reportDate: report.reportDate,
      openingCash: report.openingCash,
      closingCash: report.closingCash,
      totalSales: report.totalSales,
      cashSales: report.cashSales,
      cardSales: report.cardSales,
      expenses: report.expenses,
      notes: report.notes,
      reportedById: report.reportedById,
    });
  };

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingReport(null);
    form.reset();
  };

  const calculateDifference = (closing: number, opening: number) => {
    const diff = closing - opening;
    return diff;
  };

  return (
    <div className="container mx-auto p-3 grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
            Günlük Cashier Raporları
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-page-description">
            {isSupervisor && "Şubenizin günlük kasa raporlarını yönetin"}
            {isMuhasebe && "Tüm şubelerin kasa raporlarını görüntüleyin"}
          </p>
        </div>

        {isSupervisor && (
          <Dialog open={isCreateDialogOpen || !!editingReport} onOpenChange={(open) => {
            if (!open) handleCloseDialog();
            else setIsCreateDialogOpen(true);
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-report">
                <Plus className="w-4 h-4 mr-2" />
                Yeni Rapor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingReport ? "Cashier Raporu Düzenle" : "Yeni Cashier Raporu"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="w-full space-y-2 sm:space-y-3">
                  <FormField
                    control={form.control}
                    name="reportDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Rapor Tarihi *</FormLabel>
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
                                date > new Date() || date < new Date("2024-01-01")
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

                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <FormField
                      control={form.control}
                      name="openingCash"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Açılış Cashiersı *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value)}
                              placeholder="0.00"
                              data-testid="input-opening-cash"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="closingCash"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kapanış Cashiersı *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value)}
                              placeholder="0.00"
                              data-testid="input-closing-cash"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="totalSales"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Toplam Satış *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value)}
                            placeholder="0.00"
                            data-testid="input-total-sales"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <FormField
                      control={form.control}
                      name="cashSales"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nakit Satış</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value || null)}
                              placeholder="0.00"
                              data-testid="input-cash-sales"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cardSales"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kart Satış</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value || null)}
                              placeholder="0.00"
                              data-testid="input-card-sales"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="expenses"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Giderler</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            placeholder="0.00"
                            data-testid="input-expenses"
                          />
                        </FormControl>
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

      {isMuhasebe && (
        <MobileFilterCollapse activeFilterCount={(selectedBranchFilter ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0)} testId="cash-filter">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtreler</CardTitle>
          </CardHeader>
          <CardContent className="w-full space-y-2 sm:space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Şube</label>
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

            {(dateFrom || dateTo || selectedBranchFilter) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDateFrom(undefined);
                  setDateTo(undefined);
                  setSelectedBranchFilter(undefined);
                }}
                data-testid="button-clear-filters"
              >
                Filtreleri Temizle
              </Button>
            )}
          </CardContent>
        </Card>
        </MobileFilterCollapse>
      )}

      <div className="w-full space-y-2 sm:space-y-3">
        {isError ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold">Bir hata oluştu</h3>
            <p className="text-muted-foreground mt-2">Veriler yüklenirken sorun oluştu.</p>
            <Button onClick={() => refetch()} className="mt-4" data-testid="button-retry">Tekrar Dene</Button>
          </div>
        ) : isLoading ? (
          <ListSkeleton count={3} variant="card" />
        ) : filteredReports && filteredReports.length > 0 ? (
          filteredReports.map((report) => {
            const diff = calculateDifference(Number(report.closingCash), Number(report.openingCash));
            return (
              <Card key={report.id} className="hover-elevate" data-testid={`card-report-${report.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <CalendarIcon className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-lg" data-testid={`text-report-date-${report.id}`}>
                          {format(parseISO(report.reportDate), "PPP", { locale: tr })}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground" data-testid={`text-branch-${report.id}`}>
                          {report.branch.name} • {report.reportedBy.fullName}
                        </p>
                      </div>
                    </div>

                    {isSupervisor && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(report)}
                          data-testid={`button-edit-${report.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => requestDelete(report.id, "")}
                          data-testid={`button-delete-${report.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="w-full space-y-2 sm:space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                    <div className="w-full space-y-1 md:space-y-1">
                      <p className="text-xs text-muted-foreground">Açılış Cashiersı</p>
                      <p className="text-lg font-semibold" data-testid={`text-opening-${report.id}`}>
                        {formatCurrency(Number(report.openingCash))}
                      </p>
                    </div>
                    <div className="w-full space-y-1 md:space-y-1">
                      <p className="text-xs text-muted-foreground">Kapanış Cashiersı</p>
                      <p className="text-lg font-semibold" data-testid={`text-closing-${report.id}`}>
                        {formatCurrency(Number(report.closingCash))}
                      </p>
                    </div>
                    <div className="w-full space-y-1 md:space-y-1">
                      <p className="text-xs text-muted-foreground">Fark</p>
                      <div className="flex items-center gap-1">
                        {diff > 0 && <TrendingUp className="w-4 h-4 text-success" />}
                        {diff < 0 && <AlertCircle className="w-4 h-4 text-destructive" />}
                        <p className={cn(
                          "text-lg font-semibold",
                          diff > 0 && "text-success",
                          diff < 0 && "text-destructive"
                        )} data-testid={`text-diff-${report.id}`}>
                          {formatCurrency(diff)}
                        </p>
                      </div>
                    </div>
                    <div className="w-full space-y-1 md:space-y-1">
                      <p className="text-xs text-muted-foreground">Toplam Satış</p>
                      <p className="text-lg font-semibold" data-testid={`text-sales-${report.id}`}>
                        {formatCurrency(Number(report.totalSales))}
                      </p>
                    </div>
                  </div>

                  {(report.cashSales || report.cardSales || report.expenses) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 pt-2 border-t">
                      <div className="w-full space-y-1 md:space-y-1">
                        <p className="text-xs text-muted-foreground">Nakit Satış</p>
                        <p className="text-sm font-medium">
                          {report.cashSales ? formatCurrency(Number(report.cashSales)) : '-'}
                        </p>
                      </div>
                      <div className="w-full space-y-1 md:space-y-1">
                        <p className="text-xs text-muted-foreground">Kart Satış</p>
                        <p className="text-sm font-medium">
                          {report.cardSales ? formatCurrency(Number(report.cardSales)) : '-'}
                        </p>
                      </div>
                      <div className="w-full space-y-1 md:space-y-1">
                        <p className="text-xs text-muted-foreground">Giderler</p>
                        <p className="text-sm font-medium text-destructive">
                          {report.expenses ? formatCurrency(Number(report.expenses)) : '-'}
                        </p>
                      </div>
                    </div>
                  )}

                  {report.notes && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Notlar</p>
                      <p className="text-sm" data-testid={`text-notes-${report.id}`}>{report.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <EmptyState 
            icon={DollarSign}
            title="Kasa raporu yok"
            description={isSupervisor ? "Yeni bir rapor oluşturmak için yukarıdaki butonu kullanın" : "Henüz hiçbir şubede kasa raporu oluşturulmamış"}
            data-testid="empty-state-cash-reports"
          />
        )}
      </div>

      <ConfirmDeleteDialog
        open={deleteState.open}
        onOpenChange={(open) => !open && cancelDelete()}
        onConfirm={() => {
          const id = confirmDelete();
          if (id) deleteMutation.mutate(id as number);
        }}
        title="Silmek istediğinize emin misiniz?"
        description="Bu rapor silinecektir. Bu işlem geri alınamaz."
      />
    </div>
  );
}
