import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Clock, CheckCircle2, Wrench, Search, Building2, User, AlertCircle } from "lucide-react";
import { EmptyStatePreset } from "@/components/empty-state";
import { CompactKPIStrip } from "@/components/compact-kpi-strip";
import { format, differenceInHours } from "date-fns";
import { tr } from "date-fns/locale";
import { useLocation } from "wouter";
import type { EquipmentFault } from "@shared/schema";

// Extended fault type with details
interface ExtendedFault extends EquipmentFault {
  branchName?: string;
  reportedByName?: string;
}

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


const PRIORITY_COLORS: Record<string, string> = {
  kritik: "bg-red-500 text-white",
  yuksek: "bg-orange-500 text-white",
  default: "bg-blue-500 text-white",
};

const STAGE_COLORS: Record<string, string> = {
  bekliyor: "bg-slate-500 text-white",
  isleme_alindi: "bg-blue-500 text-white",
  devam_ediyor: "bg-amber-500 text-white",
  servis_cagrildi: "bg-purple-500 text-white",
  kargoya_verildi: "bg-indigo-500 text-white",
  kapatildi: "bg-green-500 text-white",
};

const getPriorityColor = (priority: string | null): string => 
  PRIORITY_COLORS[priority as string] || PRIORITY_COLORS.default;

const getStageColor = (stage: string | null): string => 
  STAGE_COLORS[stage as string] || "bg-secondary text-foreground";

const getTimeSinceCreation = (createdAt: unknown): string => {
  if (!createdAt) return "-";
  const hours = differenceInHours(new Date(), new Date(createdAt as string));
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
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
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
  const [, setLocation] = useLocation();
  const [searchText, setSearchText] = useState("");
  const [managePage, setManagePage] = useState(1);
  const debouncedSearch = useDebounce(searchText, 300);

  const { data: rawFaults, isError, refetch } = useQuery<unknown>({
    queryKey: ["/api/faults"],
  });
  const faults = (Array.isArray(rawFaults) ? rawFaults : (rawFaults as any)?.data || []) as ExtendedFault[];
  const isFaultsLoading = false;


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
      f.equipmentName.toLocaleLowerCase('tr-TR').includes(debouncedSearch.toLocaleLowerCase('tr-TR')) ||
      f.description?.toLocaleLowerCase('tr-TR').includes(debouncedSearch.toLocaleLowerCase('tr-TR'))
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

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold">Bir hata oluştu</h3>
        <p className="text-muted-foreground mt-2">Veriler yüklenirken sorun oluştu.</p>
        <Button onClick={() => refetch()} className="mt-4" data-testid="button-retry">Tekrar Dene</Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 space-y-4">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="sla">Arıza Süreleri</TabsTrigger>
          <TabsTrigger value="manage">Yönet</TabsTrigger>
          {user?.id && <TabsTrigger value="myFaults">Benim Arızalarım</TabsTrigger>}
        </TabsList>

        {/* TAB 1: Overview */}
        <TabsContent value="overview" className="w-full">
          <CompactKPIStrip
            items={[
              { label: "Kritik", value: metrics.critical.length, icon: <AlertTriangle className="h-4 w-4 text-destructive" />, color: "danger", testId: "text-critical-count" },
              { label: "Yüksek", value: metrics.high.length, icon: <Clock className="h-4 w-4 text-warning" />, color: "warning", testId: "text-high-count" },
              { label: "Çözüldü", value: metrics.resolved.length, icon: <CheckCircle2 className="h-4 w-4 text-success" />, color: "success", testId: "text-resolved-count" },
              { label: "Açık", value: metrics.open.length, icon: <Wrench className="h-4 w-4 text-primary" />, color: "info", testId: "text-open-count" },
            ]}
            desktopColumns={4}
          />

          {metrics.critical.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Kritik Arızalar</h3>
              <div className="flex flex-col gap-3 sm:gap-4">
                {metrics.critical.map((fault: EquipmentFault) => (
                  <Card key={fault.id} className="border-destructive bg-destructive/10 dark:bg-red-950 hover-elevate cursor-pointer" data-testid={`card-critical-fault-${fault.id}`} onClick={() => setLocation(`/ariza-detay/${fault.id}`)}>
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
              {faults.slice(0, RECENT_FAULTS_LIMIT).map((fault: ExtendedFault) => (
                <Card 
                  key={fault.id}
                  className="hover-elevate cursor-pointer" 
                  data-testid={`card-recent-fault-${fault.id}`}
                  onClick={() => setLocation(`/ariza-detay/${fault.id}`)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-1">{fault.equipmentName}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          {fault.branchName && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {fault.branchName}
                            </span>
                          )}
                          <span>{format(new Date(fault.createdAt || new Date()), "dd MMM HH:mm", { locale: tr })}</span>
                        </div>
                        {fault.reportedByName && (
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {fault.reportedByName}
                          </p>
                        )}
                      </div>
                    </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            <Card className="border-destructive bg-destructive/10 dark:bg-red-950">
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center gap-1.5">
                  <div className="h-4 w-4 rounded-full bg-destructive/10 dark:bg-destructive/5/20 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </div>
                  <p className="text-xs text-muted-foreground">Zaman Aşımı</p>
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
                  <p className="text-xs text-muted-foreground">Risk Altında</p>
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
                  <p className="text-xs text-muted-foreground">Sağlıklı</p>
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
                  <EmptyStatePreset preset="faults" variant={searchText ? "search" : "default"} />
                ) : (
                  paginatedManageFaults.map((fault: EquipmentFault) => (
                    <div key={fault.id} className="flex items-center justify-between p-3 border rounded hover:bg-muted cursor-pointer hover-elevate" data-testid={`card-manage-fault-${fault.id}`} onClick={() => setLocation(`/ariza-detay/${fault.id}`)}>
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
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{fault.description}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setLocation(`/ariza-detay/${fault.id}`); }}
                        variant="outline"
                        data-testid={`button-update-fault-${fault.id}`}
                      >
                        Detay
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

        </TabsContent>

        {/* TAB 4: My Faults (Technician) */}
        {user?.id && (
          <TabsContent value="myFaults" className="w-full space-y-2 sm:space-y-3">
            <CompactKPIStrip
              items={[
                { label: "Toplam", value: metrics.myFaults.length, color: "info", testId: "text-my-total" },
                { label: "Kritik", value: metrics.myFaults.filter((f: EquipmentFault) => f.priority === "kritik").length, color: "danger", testId: "text-my-critical" },
                { label: "Devam Ediyor", value: metrics.myFaults.filter((f: EquipmentFault) => f.currentStage === "devam_ediyor").length, color: "info", testId: "text-my-inprogress" },
              ]}
              desktopColumns={3}
            />

            <Card>
              <CardHeader>
                <CardTitle>Benim Arızalarım</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3 sm:gap-4">
                  {metrics.myFaults.length === 0 ? (
                    <EmptyStatePreset preset="faults" />
                  ) : (
                    metrics.myFaults.map((fault: EquipmentFault) => (
                      <div key={fault.id} className="p-3 border rounded hover-elevate cursor-pointer" data-testid={`card-my-fault-${fault.id}`} onClick={() => setLocation(`/ariza-detay/${fault.id}`)}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{fault.equipmentName}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{fault.description}</p>
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
