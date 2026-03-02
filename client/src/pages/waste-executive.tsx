import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle, TrendingDown, BarChart3, Target,
  ShieldAlert, Lightbulb, Clock
} from "lucide-react";

export default function WasteExecutive() {
  const { t } = useTranslation("common");

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: insights, isLoading } = useQuery<any>({
    queryKey: ["/api/waste/insights/weekly", "executive"],
    queryFn: async () => {
      const res = await fetch(`/api/waste/insights/weekly?from=${sevenDaysAgo}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: prevInsights } = useQuery<any>({
    queryKey: ["/api/waste/insights/weekly", "executive-prev"],
    queryFn: async () => {
      const res = await fetch(`/api/waste/insights/weekly?from=${fourteenDaysAgo}&to=${sevenDaysAgo}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const totalEvents = insights?.totalEvents || 0;
  const prevTotal = prevInsights?.totalEvents || 0;
  const trend = prevTotal > 0 ? ((totalEvents - prevTotal) / prevTotal * 100).toFixed(0) : "0";
  const openCount = insights?.statusBreakdown?.find((s: any) => s.status === "open")?.cnt || 0;

  const topReasons = (insights?.topReasons || []).slice(0, 5);
  const branchRanking = (insights?.branchRanking || []).slice(0, 5);
  const redFlags = insights?.redFlags || [];
  const lotClusters = (insights?.lotClusters || []).filter((l: any) => Number(l.affectedBranches) >= 2);
  const scopeBreakdown = insights?.scopeBreakdown || [];

  const opportunities: string[] = [];
  if (topReasons.length > 0) {
    opportunities.push(`"${topReasons[0].reasonName}" en sık neden - hedefli aksiyon planı oluşturulabilir`);
  }
  if (branchRanking.length > 0 && Number(branchRanking[0].cnt) > 5) {
    opportunities.push(`${branchRanking[0].branchName} en yüksek kayıp - Coach müdahalesi planlanabilir`);
  }
  const prepErrors = scopeBreakdown.find((s: any) => s.scope === "prep_error");
  if (prepErrors && Number(prepErrors.cnt) >= 3) {
    opportunities.push(`${prepErrors.cnt} hazırlık hatası - Trainer eğitim programı gerekli`);
  }
  const marketingScope = scopeBreakdown.find((s: any) => s.scope === "demand" || s.scope === "merchandising");
  if (marketingScope && Number(marketingScope.cnt) >= 2) {
    opportunities.push(`Talep/görünürlük kayıpları: ${marketingScope.cnt} olay - Marketing aksiyon planı`);
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2].map(i => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold" data-testid="text-exec-total">{totalEvents}</div>
                <p className="text-sm text-muted-foreground">{t("waste.weeklyTotal", { defaultValue: "Haftalık Toplam" })}</p>
              </div>
              <div className={`text-sm font-medium ${Number(trend) > 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
                {Number(trend) > 0 ? '+' : ''}{trend}%
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400" data-testid="text-exec-open">{openCount}</div>
            <p className="text-sm text-muted-foreground">{t("waste.openEvents", { defaultValue: "Açık Olaylar" })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-destructive" data-testid="text-exec-red-flags">{redFlags.length}</div>
            <p className="text-sm text-muted-foreground">{t("waste.redFlags", { defaultValue: "Kırmızı Bayrak" })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-exec-opportunities">{opportunities.length}</div>
            <p className="text-sm text-muted-foreground">{t("waste.opportunities", { defaultValue: "Fırsat Alanları" })}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {redFlags.length > 0 && (
          <Card className="border-destructive/50">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              <CardTitle className="text-base">{t("waste.topRedFlags", { defaultValue: "Top 5 Kırmızı Bayrak" })}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {redFlags.slice(0, 5).map((flag: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm" data-testid={`text-exec-flag-${i}`}>
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {opportunities.length > 0 && (
          <Card className="border-blue-500/30">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-base">{t("waste.topOpportunities", { defaultValue: "Top 5 Fırsat Alanı" })}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {opportunities.slice(0, 5).map((opp, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" data-testid={`text-exec-opp-${i}`}>
                    <Target className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <span>{opp}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <TrendingDown className="h-5 w-5" />
            <CardTitle className="text-base">{t("waste.topReasons", { defaultValue: "En Sık Nedenler" })}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topReasons.map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between" data-testid={`row-exec-reason-${i}`}>
                  <span className="text-sm">{r.reasonName}</span>
                  <Badge variant="secondary">{r.cnt}</Badge>
                </div>
              ))}
              {topReasons.length === 0 && (
                <p className="text-sm text-muted-foreground text-center">{t("waste.noData", { defaultValue: "Henüz veri bulunmuyor" })}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <BarChart3 className="h-5 w-5" />
            <CardTitle className="text-base">{t("waste.branchesNeedingAttention", { defaultValue: "Müdahale Gereken Şubeler" })}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {branchRanking.map((b: any, i: number) => (
                <div key={i} className="flex items-center justify-between" data-testid={`row-exec-branch-${i}`}>
                  <span className="text-sm">{b.branchName}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={Number(b.cnt) > 5 ? "destructive" : "secondary"}>{b.cnt}</Badge>
                    {Number(b.totalCost) > 0 && (
                      <span className="text-xs text-muted-foreground">₺{Number(b.totalCost).toFixed(0)}</span>
                    )}
                  </div>
                </div>
              ))}
              {branchRanking.length === 0 && (
                <p className="text-sm text-muted-foreground text-center">{t("waste.noData", { defaultValue: "Henüz veri bulunmuyor" })}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <Clock className="h-5 w-5" />
          <CardTitle className="text-base">{t("waste.decisionNeeded", { defaultValue: "Karar Bekleyen Konular" })}</CardTitle>
        </CardHeader>
        <CardContent>
          {lotClusters.length > 0 ? (
            <div className="space-y-2">
              {lotClusters.map((cluster: any, i: number) => (
                <div key={i} className="flex items-center justify-between rounded-md border p-3" data-testid={`row-decision-${i}`}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">Lot {cluster.lotId}: {cluster.cnt} olay, {cluster.affectedBranches} şube</span>
                  </div>
                  <Badge variant="destructive">{t("waste.needsDecision", { defaultValue: "Karar Gerekli" })}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("waste.noDecisionsNeeded", { defaultValue: "Şu an bekleyen karar yok" })}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
