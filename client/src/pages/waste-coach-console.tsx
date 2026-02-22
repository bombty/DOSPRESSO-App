import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  BarChart3, TrendingDown, AlertTriangle, Filter,
  ChevronDown, ChevronUp, ClipboardPlus, Eye
} from "lucide-react";

export default function WasteCoachConsole() {
  const { t, i18n } = useTranslation("common");
  const { toast } = useToast();
  const lang = i18n.language?.startsWith("en") ? "en" : "tr";

  const [branchFilter, setBranchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: events = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/waste/events", branchFilter, categoryFilter],
    queryFn: async () => {
      let url = `/api/waste/events?from=${sevenDaysAgo}`;
      if (branchFilter) url += `&branchId=${branchFilter}`;
      if (categoryFilter) url += `&categoryId=${categoryFilter}`;
      const res = await fetch(url, { credentials: "include" });
      return res.json();
    },
  });

  const { data: insights, isLoading: insightsLoading } = useQuery<any>({
    queryKey: ["/api/waste/insights/weekly"],
    queryFn: async () => {
      const res = await fetch(`/api/waste/insights/weekly?from=${sevenDaysAgo}`, { credentials: "include" });
      return res.json();
    },
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/waste/categories"],
  });

  async function handleCreateTask(event: any) {
    toast({
      title: t("waste.taskDraftCreated", { defaultValue: "Aksiyon taslağı oluşturuldu" }),
      description: `Olay #${event.event?.id || event.id} ile ilişkilendirildi`,
    });
  }

  async function handleConfirmEvent(eventId: number) {
    try {
      await apiRequest("PATCH", `/api/waste/events/${eventId}/status`, { status: "confirmed" });
      queryClient.invalidateQueries({ queryKey: ["/api/waste/events"] });
      toast({ title: t("waste.eventConfirmed", { defaultValue: "Olay onaylandı" }) });
    } catch {
      toast({ title: "Hata", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold" data-testid="text-total-events">
              {insightsLoading ? <Skeleton className="h-8 w-16" /> : insights?.totalEvents || 0}
            </div>
            <p className="text-sm text-muted-foreground">
              {t("waste.weeklyTotal", { defaultValue: "Haftalık Toplam" })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold" data-testid="text-open-count">
              {insightsLoading ? <Skeleton className="h-8 w-16" /> :
                insights?.statusBreakdown?.find((s: any) => s.status === "open")?.cnt || 0}
            </div>
            <p className="text-sm text-muted-foreground">
              {t("waste.openEvents", { defaultValue: "Açık Olaylar" })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-destructive" data-testid="text-red-flags">
              {insightsLoading ? <Skeleton className="h-8 w-16" /> : insights?.redFlags?.length || 0}
            </div>
            <p className="text-sm text-muted-foreground">
              {t("waste.redFlags", { defaultValue: "Kırmızı Bayrak" })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold" data-testid="text-branch-count">
              {insightsLoading ? <Skeleton className="h-8 w-16" /> : insights?.branchRanking?.length || 0}
            </div>
            <p className="text-sm text-muted-foreground">
              {t("waste.affectedBranches", { defaultValue: "Etkilenen Şube" })}
            </p>
          </CardContent>
        </Card>
      </div>

      {insights?.redFlags?.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-base">{t("waste.redFlagAlerts", { defaultValue: "Kırmızı Bayraklar" })}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {insights.redFlags.map((flag: string, i: number) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
                  <span data-testid={`text-red-flag-${i}`}>{flag}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <TrendingDown className="h-5 w-5" />
            <CardTitle className="text-base">{t("waste.topReasons", { defaultValue: "En Sık Nedenler" })}</CardTitle>
          </CardHeader>
          <CardContent>
            {insightsLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-6 w-full" />)}</div>
            ) : (
              <div className="space-y-2">
                {(insights?.topReasons || []).slice(0, 5).map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between" data-testid={`row-top-reason-${i}`}>
                    <span className="text-sm">{r.reasonName}</span>
                    <Badge variant="secondary">{r.cnt}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <BarChart3 className="h-5 w-5" />
            <CardTitle className="text-base">{t("waste.branchRanking", { defaultValue: "Şube Sıralaması" })}</CardTitle>
          </CardHeader>
          <CardContent>
            {insightsLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-6 w-full" />)}</div>
            ) : (
              <div className="space-y-2">
                {(insights?.branchRanking || []).slice(0, 5).map((b: any, i: number) => (
                  <div key={i} className="flex items-center justify-between" data-testid={`row-branch-rank-${i}`}>
                    <span className="text-sm">{b.branchName}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{b.cnt}</Badge>
                      {Number(b.totalCost) > 0 && (
                        <span className="text-xs text-muted-foreground">₺{Number(b.totalCost).toFixed(0)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center gap-2 pb-2">
          <Filter className="h-5 w-5" />
          <CardTitle className="text-base">{t("waste.eventList", { defaultValue: "Olay Listesi" })}</CardTitle>
          <div className="flex gap-2 ml-auto">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]" data-testid="filter-category">
                <SelectValue placeholder={t("waste.allCategories", { defaultValue: "Tüm Kategoriler" })} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("waste.allCategories", { defaultValue: "Tümü" })}</SelectItem>
                {categories.map((c: any) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.nameTr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t("waste.noEvents", { defaultValue: "Kayıt bulunamadı" })}</p>
          ) : (
            <div className="space-y-2">
              {events.map((ev: any) => {
                const e = ev.event || ev;
                const isExpanded = expandedEvent === e.id;
                return (
                  <div key={e.id} className="rounded-md border p-3 space-y-2" data-testid={`card-waste-event-${e.id}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={e.status === "open" ? "destructive" : e.status === "confirmed" ? "default" : "secondary"}>
                          {e.status}
                        </Badge>
                        <span className="text-sm font-medium">{ev.branchName}</span>
                        <span className="text-xs text-muted-foreground">{ev.categoryName}</span>
                        <span className="text-xs text-muted-foreground">- {ev.reasonName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm">{e.quantity} {e.unit}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setExpandedEvent(isExpanded ? null : e.id)}
                          data-testid={`button-expand-${e.id}`}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="space-y-2 pt-2 border-t">
                        <p className="text-sm">{e.notes}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{new Date(e.eventTs).toLocaleString("tr-TR")}</span>
                          <span>{ev.createdByName}</span>
                          {e.lotId && <Badge variant="outline">Lot: {e.lotId}</Badge>}
                          {e.responsibilityScope && e.responsibilityScope !== "unknown" && (
                            <Badge variant="outline">{e.responsibilityScope}</Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {e.status === "open" && (
                            <Button size="sm" variant="outline" onClick={() => handleConfirmEvent(e.id)} data-testid={`button-confirm-${e.id}`}>
                              <Eye className="h-3 w-3 mr-1" />
                              {t("waste.confirm", { defaultValue: "Onayla" })}
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => handleCreateTask(ev)} data-testid={`button-create-task-${e.id}`}>
                            <ClipboardPlus className="h-3 w-3 mr-1" />
                            {t("waste.createTask", { defaultValue: "Aksiyon Oluştur" })}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
