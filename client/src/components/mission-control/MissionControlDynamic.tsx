import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WidgetRenderer } from "./widgets/WidgetRenderer";
import type { WidgetData } from "./widgets/WidgetRenderer";
import { queryClient } from "@/lib/queryClient";

interface DashboardResponse {
  role: string;
  widgets: WidgetData[];
  kpis: any[];
  quickActions: any[];
}

const categoryLabels: Record<string, string> = {
  operasyon: "Operasyon",
  personel: "Personel",
  fabrika: "Fabrika",
  finans: "Finans",
  egitim: "Eğitim",
  musteri: "Müşteri",
  ekipman: "Ekipman",
  ai: "AI",
  genel: "Genel",
};

function groupByCategory(widgets: WidgetData[]): Record<string, WidgetData[]> {
  const groups: Record<string, WidgetData[]> = {};
  for (const w of widgets) {
    const cat = w.category || "operasyon";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(w);
  }
  for (const cat of Object.keys(groups)) {
    groups[cat].sort((a, b) => a.order - b.order);
  }
  return groups;
}

export default function MissionControlDynamic() {
  const { data, isLoading, isError, error } = useQuery<DashboardResponse>({
    queryKey: ["/api/me/dashboard-data"],
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4" data-testid="mc-dynamic-loading">
        <Skeleton className="h-12 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 text-center" data-testid="mc-dynamic-error">
        <p className="text-destructive text-sm mb-2">Dashboard verileri yüklenemedi</p>
        <p className="text-xs text-muted-foreground mb-3">{(error as Error)?.message}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/me/dashboard-data"] })}
          data-testid="button-retry-dashboard"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Tekrar Dene
        </Button>
      </div>
    );
  }

  if (!data || !data.widgets || data.widgets.length === 0) {
    return (
      <div className="p-4 text-center" data-testid="mc-dynamic-empty">
        <LayoutDashboard className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Henüz dashboard widget&apos;ı atanmamış.</p>
        <p className="text-xs text-muted-foreground mt-1">Yöneticinizden widget ataması talep edin.</p>
      </div>
    );
  }

  const grouped = groupByCategory(data.widgets);
  const categoryOrder = ["operasyon", "personel", "fabrika", "finans", "egitim", "musteri", "ekipman", "ai", "genel"];
  const orderedCategories = categoryOrder.filter((c) => grouped[c]);

  return (
    <div className="p-3 md:p-4 space-y-4 max-w-7xl mx-auto" data-testid="mc-dynamic-dashboard">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-base font-semibold">Komuta Merkezi</h1>
          <Badge variant="secondary" className="text-[10px]">{data.role}</Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/me/dashboard-data"] })}
          data-testid="button-refresh-dashboard"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {orderedCategories.map((category) => (
        <section key={category} data-testid={`widget-category-${category}`}>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {categoryLabels[category] || category}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {grouped[category].map((widget) => (
              <WidgetRenderer key={widget.key} widget={widget} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
