import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Target,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

interface ComparisonData {
  weekStart: string;
  weekEnd: string;
  summary: Array<{
    productId: number;
    name: string;
    category: string;
    unit: string;
    totalPlanned: number;
    totalProduced: number;
    totalWaste: number;
    completionRate: number | null;
  }>;
  planned: any[];
  actual: any[];
}

const DAY_NAMES = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().split("T")[0];
}

export default function PlanComparisonTab() {
  const [currentWeek, setCurrentWeek] = useState(() => getWeekStart(new Date()));
  const weekEnd = useMemo(() => {
    const d = new Date(currentWeek);
    d.setDate(d.getDate() + 6);
    return d.toISOString().split("T")[0];
  }, [currentWeek]);

  const { data, isLoading } = useQuery<ComparisonData>({
    queryKey: [`/api/production-planning/comparison?weekStart=${currentWeek}`],
  });

  function navigateWeek(dir: number) {
    const d = new Date(currentWeek);
    d.setDate(d.getDate() + dir * 7);
    setCurrentWeek(d.toISOString().split("T")[0]);
  }

  const weekLabel = useMemo(() => {
    const s = new Date(currentWeek);
    const e = new Date(weekEnd);
    return `${s.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} - ${e.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}`;
  }, [currentWeek, weekEnd]);

  const totalPlanned = data?.summary?.reduce((s, r) => s + r.totalPlanned, 0) || 0;
  const totalProduced = data?.summary?.reduce((s, r) => s + r.totalProduced, 0) || 0;
  const totalWaste = data?.summary?.reduce((s, r) => s + r.totalWaste, 0) || 0;
  const overallRate = totalPlanned > 0 ? Math.round((totalProduced / totalPlanned) * 100) : null;

  return (
    <div className="space-y-4" data-testid="plan-comparison-tab">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateWeek(-1)} data-testid="comp-prev-week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium" data-testid="comp-week-label">{weekLabel}</span>
          </div>
          <Button variant="outline" size="icon" onClick={() => navigateWeek(1)} data-testid="comp-next-week">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
          <Skeleton className="h-48 rounded-lg" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <Target className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                <p className="text-lg font-bold" data-testid="kpi-total-planned">{totalPlanned.toLocaleString("tr-TR")}</p>
                <p className="text-[10px] text-muted-foreground">Planlanan</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <TrendingUp className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
                <p className="text-lg font-bold" data-testid="kpi-total-produced">{totalProduced.toLocaleString("tr-TR")}</p>
                <p className="text-[10px] text-muted-foreground">Üretilen</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                <p className="text-lg font-bold" data-testid="kpi-total-waste">{totalWaste.toLocaleString("tr-TR")}</p>
                <p className="text-[10px] text-muted-foreground">Fire</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className={`text-lg font-bold ${(overallRate ?? 0) >= 90 ? "text-emerald-600" : (overallRate ?? 0) >= 70 ? "text-amber-600" : "text-red-600"}`} data-testid="kpi-completion-rate">
                  {overallRate != null ? `%${overallRate}` : "—"}
                </div>
                <p className="text-[10px] text-muted-foreground">Tamamlanma</p>
              </CardContent>
            </Card>
          </div>

          {(!data?.summary || data.summary.length === 0) ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">Bu hafta için plan veya üretim kaydı yok</p>
                <p className="text-xs text-muted-foreground mt-1">Haftalık Plan sekmesinden plan oluşturabilirsiniz</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Ürün Bazlı Karşılaştırma</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.summary.map((item) => {
                  const rate = item.completionRate ?? 0;
                  return (
                    <div key={item.productId} className="flex items-center gap-3 p-2 rounded-md bg-muted/30" data-testid={`comp-product-${item.productId}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-medium truncate">{item.name}</span>
                          <Badge variant="outline" className="text-[9px] h-4">{item.category}</Badge>
                        </div>
                        <Progress value={Math.min(rate, 100)} className="h-2" />
                        <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
                          <span>Plan: {item.totalPlanned} {item.unit}</span>
                          <span>Üretim: {item.totalProduced} {item.unit}</span>
                          <span>Fire: {item.totalWaste} {item.unit}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`text-sm font-bold ${rate >= 90 ? "text-emerald-600" : rate >= 70 ? "text-amber-600" : "text-red-600"}`}>
                          %{rate}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
