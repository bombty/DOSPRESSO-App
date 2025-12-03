import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Clock, CheckCircle2, Wrench, Search, Loader2, Plus } from "lucide-react";
import { format, differenceInHours } from "date-fns";
import { tr } from "date-fns/locale";
import { useLocation } from "wouter";
import type { EquipmentFault } from "@shared/schema";

// Constants
const SLA_CRITICAL_HOURS = 2.5;
const SLA_HIGH_HOURS = 5;
const SLA_CRITICAL_RISK_HOURS = 1.5;
const SLA_HIGH_RISK_HOURS = 3.5;
const RECENT_FAULTS_LIMIT = 8;
const FAULTS_PER_PAGE = 10;

const STAGE_LABELS: Record<string, string> = {
  bekliyor: "Beklemede",
  isleme_alindi: "İşleme Alındı",
  devam_ediyor: "Devam Ediyor",
  servis_cagrildi: "Servis Çağrıldı",
  kargoya_verildi: "Kargoya Verildi",
  kapatildi: "Kapatıldı",
};

const updateFaultSchema = z.object({
  currentStage: z.string(),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
  actualCost: z.string().optional(),
});

const PRIORITY_COLORS: Record<string, string> = {
  kritik: "bg-destructive/10 text-destructive dark:bg-destructive/5 dark:text-destructive",
  yuksek: "bg-warning/10 text-warning dark:bg-warning/5 dark:text-warning",
  default: "bg-primary/10 text-primary dark:bg-primary/5 dark:text-primary",
};

const STAGE_COLORS: Record<string, string> = {
  bekliyor: "bg-secondary text-foreground dark:bg-gray-900 dark:text-gray-200",
  isleme_alindi: "bg-primary/10 text-primary dark:bg-primary/5 dark:text-primary",
  devam_ediyor: "bg-warning/20 text-warning dark:bg-warning/5 dark:text-warning",
  servis_cagrildi: "bg-warning/10 text-warning dark:bg-warning/5 dark:text-warning",
  kargoya_verildi: "bg-secondary/10 text-secondary dark:bg-secondary/5 dark:text-secondary",
  kapatildi: "bg-success/10 text-success dark:bg-success/5 dark:text-success",
};

const getPriorityColor = (priority: string | null): string => 
  PRIORITY_COLORS[priority as string] || PRIORITY_COLORS.default;

const getStageColor = (stage: string | null): string => 
  STAGE_COLORS[stage as string] || "bg-secondary text-foreground";

const getTimeSinceCreation = (createdAt): string => {
  if (!createdAt) return "-";
  const hours = differenceInHours(new Date(), new Date(createdAt));
  if (hours < 1) return "< 1 saat";
  if (hours < 24) return `${hours} saat`;
  return `${Math.floor(hours / 24)} gün`;
};

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// Skeleton loading component
function FaultSkeleton() {
  return (
    <div className="flex items-center justify-between p-3 border rounded animate-pulse">
      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
        <div className="h-4 bg-accent dark:bg-gray-700 rounded w-3/4"></div>
        <div className="h-3 bg-accent dark:bg-gray-700 rounded w-1/2"></div>
      </div>
      <div className="h-8 bg-accent dark:bg-gray-700 rounded w-24"></div>
    </div>
  );
}

function FaultSkeletonList() {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <FaultSkeleton key={i} />
      ))}
    </div>
  );
}

export default function FaultHub() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedFault, setSelectedFault] = useState<EquipmentFault | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [managePage, setManagePage] = useState(1);
  const debouncedSearch = useDebounce(searchText, 300);

  const { data: rawFaults } = useQuery<any>({
    queryKey: ["/api/faults"],
  });
  const faults = (Array.isArray(rawFaults) ? rawFaults : rawFaults?.data || []) as EquipmentFault[];
  const isFaultsLoading = false;

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const form = useForm<z.infer<typeof updateFaultSchema>>({
    resolver: zodResolver(updateFaultSchema),
    defaultValues: { currentStage: "bekliyor" },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof updateFaultSchema>) => {
      if (!selectedFault) return;
      await apiRequest(`/api/faults/${selectedFault.id}`, "PATCH", {
        currentStage: data.currentStage,
        assignedTo: data.assignedTo || null,
        actualCost: data.actualCost ? parseFloat(data.actualCost) : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/faults"] });
      toast({ title: "Başarılı", description: "Arıza güncellendi" });
      setIsUpdateDialogOpen(false);
      setSelectedFault(null);
    },
    onError: () => {
      toast({ title: "Hata", description: "Güncelleme başarısız", variant: "destructive" });
    },
  });

  // Memoized calculations
  const metrics = useMemo(() => {
    const critical = faults.filter((f: EquipmentFault) => f.priority === "kritik" && f.currentStage !== "kapatildi");
    const high = faults.filter((f: EquipmentFault) => f.priority === "yuksek" && f.currentStage !== "kapatildi");
    const resolved = faults.filter((f: EquipmentFault) => f.currentStage === "kapatildi");
    const open = faults.filter((f: EquipmentFault) => f.currentStage !== "kapatildi");
    const myFaults = faults.filter((f: EquipmentFault) => f.assignedTo === user?.id && f.currentStage !== "kapatildi");
    
    const breached = open.filter((f: EquipmentFault) => {
      if (!f.createdAt) return false;
      const hours = differenceInHours(new Date(), new Date(f.createdAt));
      return (f.priority === "kritik" && hours > SLA_CRITICAL_HOURS) || (f.priority === "yuksek" && hours > SLA_HIGH_HOURS);
    });

    const atRisk = open.filter((f: EquipmentFault) => {
      if (!f.createdAt || breached.some((b: EquipmentFault) => b.id === f.id)) return false;
      const hours = differenceInHours(new Date(), new Date(f.createdAt));
      return (f.priority === "kritik" && hours > SLA_CRITICAL_RISK_HOURS) || (f.priority === "yuksek" && hours > SLA_HIGH_RISK_HOURS);
    });

    const healthy = open.filter((f: EquipmentFault) => !breached.some((b: EquipmentFault) => b.id === f.id) && !atRisk.some((a: EquipmentFault) => a.id === f.id));

    return { critical, high, resolved, open, myFaults, breached, atRisk, healthy };
  }, [faults, user?.id]);

  // Memoized search results with debounced search
  const manageFaults = useMemo(() => {
    return metrics.open.filter((f: EquipmentFault) => 
      debouncedSearch === "" || 
      f.equipmentName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      f.description?.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [metrics.open, debouncedSearch]);

  const paginatedManageFaults = useMemo(() => {
    const start = (managePage - 1) * FAULTS_PER_PAGE;
    return manageFaults.slice(start, start + FAULTS_PER_PAGE);
  }, [manageFaults, managePage]);

  // Clamp managePage when manageFaults shrinks
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(manageFaults.length / FAULTS_PER_PAGE));
    if (managePage > maxPage) {
      setManagePage(maxPage);
    }
  }, [manageFaults.length, managePage]);

  const handleUpdateFault = useCallback((fault: EquipmentFault) => {
    setSelectedFault(fault);
    form.reset({ currentStage: fault.currentStage });
    setIsUpdateDialogOpen(true);
  }, [form]);

  return (
    <div className="min-h-screen pb-20">
      <div className="p-3">

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="sla">Arıza Süreleri</TabsTrigger>
          <TabsTrigger value="manage">Yönet</TabsTrigger>
          {user?.id && <TabsTrigger value="myFaults">Benim Arızalarım</TabsTrigger>}
        </TabsList>

        {/* TAB 1: Overview */}
        <TabsContent value="overview" className="w-full">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            <Card>
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center gap-1.5">
                  <div className="h-4 w-4 rounded-full bg-destructive/10 dark:bg-destructive/5/20 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </div>
                  <p className="text-xs text-muted-foreground">Kritik</p>
                  <p className="text-lg font-bold text-destructive" data-testid="text-critical-count">{metrics.critical.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center gap-1.5">
                  <div className="h-4 w-4 rounded-full bg-warning/10 dark:bg-warning/5/20 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-warning" />
                  </div>
                  <p className="text-xs text-muted-foreground">Yüksek</p>
                  <p className="text-lg font-bold text-warning" data-testid="text-high-count">{metrics.high.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center gap-1.5">
                  <div className="h-4 w-4 rounded-full bg-success/10 dark:bg-success/10 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </div>
                  <p className="text-xs text-muted-foreground">Çözüldü</p>
                  <p className="text-lg font-bold text-success" data-testid="text-resolved-count">{metrics.resolved.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center gap-1.5">
                  <div className="h-4 w-4 rounded-full bg-primary/10 dark:bg-primary/5/20 flex items-center justify-center">
                    <Wrench className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground">Açık</p>
                  <p className="text-lg font-bold" data-testid="text-open-count">{metrics.open.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {metrics.critical.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Kritik Arızalar</h3>
              <div className="flex flex-col gap-3 sm:gap-4">
                {metrics.critical.map((fault: EquipmentFault) => (
                  <Card key={fault.id} className="border-destructive bg-destructive/10 dark:bg-red-950 hover-elevate" data-testid={`card-critical-fault-${fault.id}`}>
                    <CardContent className="p-3">
                      <p className="font-medium text-sm line-clamp-2">{fault.equipmentName}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{fault.description}</p>
                      <div className="mt-2">
                        <Badge className={getStageColor(fault.currentStage)}>{STAGE_LABELS[fault.currentStage] || fault.currentStage}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium mb-2">Son Arızalar</h3>
            <div className="flex flex-col gap-3 sm:gap-4">
              {faults.slice(0, RECENT_FAULTS_LIMIT).map((fault: EquipmentFault) => (
                <Card key={fault.id} className="hover-elevate" data-testid={`card-recent-fault-${fault.id}`}>
                  <CardContent className="p-3">
                    <p className="font-medium text-sm line-clamp-2">{fault.equipmentName}</p>
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(fault.createdAt || new Date()), "dd MMM HH:mm", { locale: tr })}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Badge className={getPriorityColor(fault.priority)}>{fault.priority === "kritik" ? "Kritik" : "Yüksek"}</Badge>
                      <Badge className={getStageColor(fault.currentStage)}>{STAGE_LABELS[fault.currentStage]}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: Arıza Süreleri */}
        <TabsContent value="sla" className="w-full space-y-2 sm:space-y-3">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Card className="border-destructive bg-destructive/10 dark:bg-red-950">
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center gap-1.5">
                  <div className="h-4 w-4 rounded-full bg-destructive/10 dark:bg-destructive/5/20 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </div>
                  <p className="text-xs text-destructive">Zaman Aşımı</p>
                  <p className="text-lg font-bold text-destructive" data-testid="text-breached-count">{metrics.breached.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-500 bg-warning/10 dark:bg-orange-950">
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center gap-1.5">
                  <div className="h-4 w-4 rounded-full bg-warning/10 dark:bg-warning/5/20 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-warning" />
                  </div>
                  <p className="text-xs text-warning">Risk Altında</p>
                  <p className="text-lg font-bold text-warning" data-testid="text-atrisk-count">{metrics.atRisk.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-success bg-success/10 dark:bg-success/5">
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center gap-1.5">
                  <div className="h-4 w-4 rounded-full bg-success/10 dark:bg-success/10 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </div>
                  <p className="text-xs text-success">Sağlıklı</p>
                  <p className="text-lg font-bold text-success" data-testid="text-healthy-count">{metrics.healthy.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {metrics.breached.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2 text-destructive">Zaman Aşımı Yapan</h3>
              <div className="flex flex-col gap-3 sm:gap-4">
                {metrics.breached.map((fault: EquipmentFault) => (
                  <Card key={fault.id} className="border-destructive bg-destructive/10 dark:bg-red-950 hover-elevate" data-testid={`card-breached-fault-${fault.id}`}>
                    <CardContent className="p-3">
                      <p className="font-medium text-sm line-clamp-2">{fault.equipmentName}</p>
                      <p className="text-xs text-muted-foreground mt-1">{getTimeSinceCreation(fault.createdAt)} açık</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {metrics.atRisk.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2 text-warning">Risk Altında Olan</h3>
              <div className="flex flex-col gap-3 sm:gap-4">
                {metrics.atRisk.map((fault: EquipmentFault) => (
                  <Card key={fault.id} className="border-orange-500 bg-warning/10 dark:bg-orange-950 hover-elevate" data-testid={`card-atrisk-fault-${fault.id}`}>
                    <CardContent className="p-3">
                      <p className="font-medium text-sm line-clamp-2">{fault.equipmentName}</p>
                      <p className="text-xs text-muted-foreground mt-1">{getTimeSinceCreation(fault.createdAt)} (sınıra yaklaşıyor)</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* TAB 3: Manage Faults */}
        <TabsContent value="manage" className="w-full space-y-2 sm:space-y-3">
          <Card className="col-span-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tüm Arızalar ({manageFaults.length})</CardTitle>
              <CardDescription className="text-xs">Arızaları atayın, durumlarını güncelleyin ve maliyeti takip edin</CardDescription>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ekipman veya açıklama ara..."
                  value={searchText}
                  onChange={(e) => { setSearchText(e.target.value); setManagePage(1); }}
                  className="pl-9"
                  data-testid="input-search-faults"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 sm:gap-4">
                {isFaultsLoading ? (
                  <FaultSkeletonList />
                ) : paginatedManageFaults.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-3">Arıza bulunamadı</p>
                ) : (
                  paginatedManageFaults.map((fault: EquipmentFault) => (
                    <div key={fault.id} className="flex items-center justify-between p-3 border rounded hover:bg-muted" data-testid={`card-manage-fault-${fault.id}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{fault.equipmentName}</p>
                          <Badge className={getPriorityColor(fault.priority)}>
                            {fault.priority === "kritik" ? "Kritik" : fault.priority === "yuksek" ? "Yüksek" : "Normal"}
                          </Badge>
                          <Badge className={getStageColor(fault.currentStage)}>
                            {STAGE_LABELS[fault.currentStage]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{fault.description}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleUpdateFault(fault)}
                        variant="outline"
                        data-testid={`button-update-fault-${fault.id}`}
                      >
                        Güncelle
                      </Button>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {manageFaults.length > FAULTS_PER_PAGE && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {(managePage - 1) * FAULTS_PER_PAGE + 1} - {Math.min(managePage * FAULTS_PER_PAGE, manageFaults.length)} / {manageFaults.length}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setManagePage(p => Math.max(1, p - 1))}
                      disabled={managePage === 1}
                      data-testid="button-prev-page"
                    >
                      Önceki
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setManagePage(p => p + 1)}
                      disabled={managePage * FAULTS_PER_PAGE >= manageFaults.length}
                      data-testid="button-next-page"
                    >
                      Sonraki
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Arıza Güncelleyin: {selectedFault?.equipmentName}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))} className="w-full space-y-2 sm:space-y-3">
                  <FormField
                    control={form.control}
                    name="currentStage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Durum</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bekliyor">Beklemede</SelectItem>
                              <SelectItem value="isleme_alindi">İşleme Alındı</SelectItem>
                              <SelectItem value="devam_ediyor">Devam Ediyor</SelectItem>
                              <SelectItem value="servis_cagrildi">Servis Çağrıldı</SelectItem>
                              <SelectItem value="kargoya_verildi">Kargoya Verildi</SelectItem>
                              <SelectItem value="kapatildi">Kapatıldı</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="assignedTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Technician</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger data-testid="select-assigned-to">
                              <SelectValue placeholder="Seçin..." />
                            </SelectTrigger>
                            <SelectContent>
                              {users.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.fullName || u.username}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="actualCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maliyet (₺)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0.00" {...field} data-testid="input-actual-cost" />
                        </FormControl>
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
                          <Textarea placeholder="Servis notları..." {...field} data-testid="textarea-fault-notes" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={updateMutation.isPending} className="w-full" data-testid="button-fault-save">
                    {updateMutation.isPending ? "Güncelleniyor..." : "Kaydet"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* TAB 4: My Faults (Technician) */}
        {user?.id && (
          <TabsContent value="myFaults" className="w-full space-y-2 sm:space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Toplam</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold" data-testid="text-my-total">{metrics.myFaults.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-destructive">Kritik</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-destructive" data-testid="text-my-critical">{metrics.myFaults.filter((f: EquipmentFault) => f.priority === "kritik").length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-primary">Devam Ediyor</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary" data-testid="text-my-inprogress">{metrics.myFaults.filter((f: EquipmentFault) => f.currentStage === "devam_ediyor").length}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Benim Arızalarım</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3 sm:gap-4">
                  {metrics.myFaults.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-3">Size atanmış arıza yok</p>
                  ) : (
                    metrics.myFaults.map((fault: EquipmentFault) => (
                      <div key={fault.id} className="p-3 border rounded" data-testid={`card-my-fault-${fault.id}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{fault.equipmentName}</p>
                            <p className="text-xs text-muted-foreground">{fault.description}</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge className={getPriorityColor(fault.priority)}>{fault.priority === "kritik" ? "Kritik" : "Yüksek"}</Badge>
                            <Badge className={getStageColor(fault.currentStage)}>{STAGE_LABELS[fault.currentStage]}</Badge>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
      </div>
    </div>
  );
}
