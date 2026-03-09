import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, AlertTriangle, BookOpen, TrendingUp } from "lucide-react";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

export default function WasteTrainerConsole() {
  const { t } = useTranslation("common");
  const { toast } = useToast();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: events = [], isLoading, isError, refetch } = useQuery<any[]>({
    queryKey: ["/api/waste/events", "trainer"],
    queryFn: async () => {
      const res = await fetch(`/api/waste/events?from=${sevenDaysAgo}&responsibilityScope=prep_error`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: allEvents = [] } = useQuery<any[]>({
    queryKey: ["/api/waste/events", "trainer-all"],
    queryFn: async () => {
      const res = await fetch(`/api/waste/events?from=${sevenDaysAgo}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: insights } = useQuery<any>({
    queryKey: ["/api/waste/insights/weekly", "trainer"],
    queryFn: async () => {
      const res = await fetch(`/api/waste/insights/weekly?from=${sevenDaysAgo}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const prepErrorCount = events.length;
  const recipeIssues = allEvents.filter((ev: any) => {
    const scope = (ev.event || ev).responsibilityScope;
    return scope === "recipe_quality" || scope === "prep_error";
  });

  const productIssues = new Map<string, number>();
  recipeIssues.forEach((ev: any) => {
    const e = ev.event || ev;
    const key = e.productGroup || ev.reasonName || "Bilinmiyor";
    productIssues.set(key, (productIssues.get(key) || 0) + 1);
  });
  const sortedProducts = Array.from(productIssues.entries()).sort((a, b) => b[1] - a[1]);

  function handleSuggestTraining(product: string) {
    toast({
      title: t("waste.trainingSuggested", { defaultValue: "Eğitim önerisi oluşturuldu" }),
      description: `${product} için eğitim atanabilir`,
    });
  }

  
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400" data-testid="text-prep-error-count">
              {prepErrorCount}
            </div>
            <p className="text-sm text-muted-foreground">
              {t("waste.prepErrors", { defaultValue: "Hazırlık Hatası" })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold" data-testid="text-recipe-issues">
              {recipeIssues.length}
            </div>
            <p className="text-sm text-muted-foreground">
              {t("waste.recipeIssues", { defaultValue: "Reçete Kalite Sorunları" })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold" data-testid="text-product-count">
              {sortedProducts.length}
            </div>
            <p className="text-sm text-muted-foreground">
              {t("waste.affectedProducts", { defaultValue: "Etkilenen Ürün" })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <GraduationCap className="h-5 w-5" />
          <CardTitle className="text-base">
            {t("waste.productIssuesBreakdown", { defaultValue: "Ürün Bazlı Sorunlar" })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("waste.noIssues", { defaultValue: "Sorun bulunamadı" })}
            </p>
          ) : (
            <div className="space-y-2">
              {sortedProducts.map(([product, count], i) => (
                <div key={i} className="flex items-center justify-between rounded-md border p-3" data-testid={`row-product-issue-${i}`}>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{product}</span>
                    <Badge variant="secondary">{count} {t("waste.events", { defaultValue: "olay" })}</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSuggestTraining(product)}
                    data-testid={`button-suggest-training-${i}`}
                  >
                    <GraduationCap className="h-3 w-3 mr-1" />
                    {t("waste.suggestTraining", { defaultValue: "Eğitim Öner" })}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <AlertTriangle className="h-5 w-5" />
          <CardTitle className="text-base">
            {t("waste.prepErrorDetails", { defaultValue: "Hazırlık Hatası Detayları" })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("waste.noPrepErrors", { defaultValue: "Hazırlık hatası bulunamadı" })}
            </p>
          ) : (
            <div className="space-y-2">
              {events.slice(0, 15).map((ev: any) => {
                const e = ev.event || ev;
                return (
                  <div key={e.id} className="rounded-md border p-3" data-testid={`card-prep-error-${e.id}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="destructive" className="text-xs">{ev.categoryName}</Badge>
                        <span className="text-sm">{ev.branchName}</span>
                        <span className="text-xs text-muted-foreground">{ev.reasonName}</span>
                      </div>
                      <span className="text-sm font-medium">{e.quantity} {e.unit}</span>
                    </div>
                    {e.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{e.notes}</p>}
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(e.eventTs).toLocaleString("tr-TR")} - {ev.createdByName}
                    </div>
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
