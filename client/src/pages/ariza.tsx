import { useState, useMemo, useCallback, useEffect, useRef } from "react";
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
import { AlertTriangle, Clock, CheckCircle2, Wrench, Search, Loader2 } from "lucide-react";
import { format, differenceInHours } from "date-fns";
import { tr } from "date-fns/locale";
import { FixedSizeList as List } from "react-window";
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
  kritik: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  yuksek: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  default: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

const STAGE_COLORS: Record<string, string> = {
  bekliyor: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  isleme_alindi: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  devam_ediyor: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  servis_cagrildi: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  kargoya_verildi: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  kapatildi: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const getPriorityColor = (priority: string | null): string => 
  PRIORITY_COLORS[priority as string] || PRIORITY_COLORS.default;

const getStageColor = (stage: string | null): string => 
  STAGE_COLORS[stage as string] || "bg-gray-100 text-gray-800";

const getTimeSinceCreation = (createdAt: any): string => {
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
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      </div>
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
    </div>
  );
}

export default function FaultHub() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedFault, setSelectedFault] = useState<EquipmentFault | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [managePage, setManagePage] = useState(1);
  const debouncedSearch = useDebounce(searchText, 300);

  const { data: faultsData = [], isLoading: isFaultsLoading } = useQuery<EquipmentFault[]>({
    queryKey: ["/api/faults"],
  });

  const faults = Array.isArray(faultsData) ? faultsData : faultsData?.data || [];

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
    const critical = faults.filter(f => f.priority === "kritik" && f.currentStage !== "kapatildi");
    const high = faults.filter(f => f.priority === "yuksek" && f.currentStage !== "kapatildi");
    const resolved = faults.filter(f => f.currentStage === "kapatildi");
    const open = faults.filter(f => f.currentStage !== "kapatildi");
    const myFaults = faults.filter(f => f.assignedTo === user?.id && f.currentStage !== "kapatildi");
    
    const breached = open.filter(f => {
      if (!f.createdAt) return false;
      const hours = differenceInHours(new Date(), new Date(f.createdAt));
      return (f.priority === "kritik" && hours > SLA_CRITICAL_HOURS) || (f.priority === "yuksek" && hours > SLA_HIGH_HOURS);
    });

    const atRisk = open.filter(f => {
      if (!f.createdAt || breached.some(b => b.id === f.id)) return false;
      const hours = differenceInHours(new Date(), new Date(f.createdAt));
      return (f.priority === "kritik" && hours > SLA_CRITICAL_RISK_HOURS) || (f.priority === "yuksek" && hours > SLA_HIGH_RISK_HOURS);
    });

    const healthy = open.filter(f => !breached.some(b => b.id === f.id) && !atRisk.some(a => a.id === f.id));

    return { critical, high, resolved, open, myFaults, breached, atRisk, healthy };
  }, [faults, user?.id]);

  // Memoized search results with debounced search
  const manageFaults = useMemo(() => {
    return metrics.open.filter(f => 
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Arıza Yönetimi</h1>
        <p className="text-muted-foreground mt-1">Tüm ekipman arızalarını merkezi olarak yönetin</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="sla">SLA Durumu</TabsTrigger>
          <TabsTrigger value="manage">Yönet</TabsTrigger>
          {user?.id && <TabsTrigger value="myFaults">Benim Arızalarım</TabsTrigger>}
        </TabsList>

        {/* TAB 1: Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  Kritik
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600" data-testid="text-critical-count">{metrics.critical.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Acil müdahale</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  Yüksek
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600" data-testid="text-high-count">{metrics.high.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Kısa sürede çözülmeli</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Çözüldü
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600" data-testid="text-resolved-count">{metrics.resolved.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Toplam çözülen</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-blue-600" />
                  Açık
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="text-open-count">{metrics.open.length}</div>
                <p className="text-xs text-muted-foreground mt-1">İşlem halinde</p>
              </CardContent>
            </Card>
          </div>

          {metrics.critical.length > 0 && (
            <Card className="border-red-500 bg-red-50 dark:bg-red-950">
              <CardHeader>
                <CardTitle className="text-red-600 dark:text-red-400">Kritik Arızalar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics.critical.map((fault) => (
                    <div key={fault.id} className="flex items-center justify-between p-2 bg-white dark:bg-red-900/20 rounded border border-red-200" data-testid={`card-critical-fault-${fault.id}`}>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{fault.equipmentName}</p>
                        <p className="text-xs text-muted-foreground">{fault.description}</p>
                      </div>
                      <Badge className={getStageColor(fault.currentStage)}>{STAGE_LABELS[fault.currentStage] || fault.currentStage}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Son Arızalar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {faults.slice(0, RECENT_FAULTS_LIMIT).map((fault) => (
                  <div key={fault.id} className="flex items-center justify-between p-2 border rounded" data-testid={`card-recent-fault-${fault.id}`}>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{fault.equipmentName}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(fault.createdAt || new Date()), "dd MMM HH:mm", { locale: tr })}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getPriorityColor(fault.priority)}>{fault.priority === "kritik" ? "Kritik" : "Yüksek"}</Badge>
                      <Badge className={getStageColor(fault.currentStage)}>{STAGE_LABELS[fault.currentStage]}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: SLA Status */}
        <TabsContent value="sla" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-red-500 bg-red-50 dark:bg-red-950">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-red-600">SLA İhlali</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600" data-testid="text-breached-count">{metrics.breached.length}</div>
              </CardContent>
            </Card>

            <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-orange-600">Risk Altında</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600" data-testid="text-atrisk-count">{metrics.atRisk.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Sağlıklı</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600" data-testid="text-healthy-count">{metrics.healthy.length}</div>
              </CardContent>
            </Card>
          </div>

          {metrics.breached.length > 0 && (
            <Card className="border-red-500">
              <CardHeader>
                <CardTitle className="text-red-600">SLA İhlali Yapan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics.breached.map((fault) => (
                    <div key={fault.id} className="p-2 bg-red-50 dark:bg-red-950 rounded" data-testid={`card-breached-fault-${fault.id}`}>
                      <p className="font-medium text-sm">{fault.equipmentName}</p>
                      <p className="text-xs text-muted-foreground">{getTimeSinceCreation(fault.createdAt)} açık</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {metrics.atRisk.length > 0 && (
            <Card className="border-orange-500">
              <CardHeader>
                <CardTitle className="text-orange-600">Risk Altında Olan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics.atRisk.map((fault) => (
                    <div key={fault.id} className="p-2 bg-orange-50 dark:bg-orange-950 rounded" data-testid={`card-atrisk-fault-${fault.id}`}>
                      <p className="font-medium text-sm">{fault.equipmentName}</p>
                      <p className="text-xs text-muted-foreground">{getTimeSinceCreation(fault.createdAt)} (sınıra yaklaşıyor)</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB 3: Manage Faults */}
        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Tüm Arızalar ({manageFaults.length})</span>
              </CardTitle>
              <CardDescription>Arızaları atayın, durumlarını güncelleyin ve maliyeti takip edin</CardDescription>
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
              <div className="space-y-3">
                {paginatedManageFaults.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Arıza bulunamadı</p>
                ) : (
                  paginatedManageFaults.map((fault) => (
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
                <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
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
                        <FormLabel>Teknisyen</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
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
                          <Input type="number" placeholder="0.00" {...field} />
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
                          <Textarea placeholder="Servis notları..." {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={updateMutation.isPending} className="w-full">
                    {updateMutation.isPending ? "Güncelleniyor..." : "Kaydet"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* TAB 4: My Faults (Technician) */}
        {user?.id && (
          <TabsContent value="myFaults" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <CardTitle className="text-sm font-medium text-red-600">Kritik</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600" data-testid="text-my-critical">{metrics.myFaults.filter(f => f.priority === "kritik").length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-blue-600">Devam Ediyor</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600" data-testid="text-my-inprogress">{metrics.myFaults.filter(f => f.currentStage === "devam_ediyor").length}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Benim Arızalarım</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.myFaults.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Size atanmış arıza yok</p>
                  ) : (
                    metrics.myFaults.map((fault) => (
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
  );
}
