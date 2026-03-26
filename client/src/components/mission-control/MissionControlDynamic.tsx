import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { LayoutDashboard, RefreshCw, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WidgetRenderer } from "./widgets/WidgetRenderer";
import type { WidgetData } from "./widgets/WidgetRenderer";
import { queryClient } from "@/lib/queryClient";

interface KPIItem {
  key: string;
  label: string;
  value: number | string;
  subtext?: string;
  color?: string;
}

interface DashboardResponse {
  role: string;
  widgets: WidgetData[];
  kpis: KPIItem[];
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

function KPIStrip({ kpis }: { kpis: KPIItem[] }) {
  if (!kpis || kpis.length === 0) return null;
  const colorMap: Record<string, string> = {
    destructive: "text-destructive",
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
  };
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2" data-testid="kpi-strip">
      {kpis.map((kpi) => (
        <Card key={kpi.key} data-testid={`kpi-${kpi.key}`}>
          <CardContent className="p-3 text-center">
            <div className={`text-xl font-bold ${kpi.color ? colorMap[kpi.color] || "" : ""}`}>
              {kpi.value}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase">{kpi.label}</div>
            {kpi.subtext && (
              <div className="text-[9px] text-muted-foreground mt-0.5">{kpi.subtext}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CollapsibleSection({
  category,
  widgets,
  defaultOpen,
}: {
  category: string;
  widgets: WidgetData[];
  defaultOpen: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          className="flex items-center gap-1.5 w-full text-left group"
          data-testid={`collapsible-trigger-${category}`}
        >
          <ChevronDown
            className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isOpen ? "" : "-rotate-90"}`}
          />
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {categoryLabels[category] || category}
          </h2>
          <Badge variant="outline" className="text-[9px] h-4 ml-1">
            {widgets.length}
          </Badge>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
          {widgets.map((widget) => (
            <WidgetRenderer key={widget.key} widget={widget} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
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
  const categoryOrder = ["ai", "operasyon", "personel", "fabrika", "finans", "egitim", "musteri", "ekipman", "genel"];
  const knownCategories = categoryOrder.filter((c) => grouped[c]);
  const unknownCategories = Object.keys(grouped).filter((c) => !categoryOrder.includes(c));
  const orderedCategories = [...knownCategories, ...unknownCategories];

  const getCategoryDefaultOpen = (category: string): boolean => {
    const widgets = grouped[category];
    if (!widgets || widgets.length === 0) return true;
    return widgets.some((w) => w.defaultOpen !== false);
  };

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

      <KPIStrip kpis={data.kpis} />

      {orderedCategories.map((category) => (
        <CollapsibleSection
          key={category}
          category={category}
          widgets={grouped[category]}
          defaultOpen={getCategoryDefaultOpen(category)}
        />
      ))}
    </div>
  );
}
