import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardWidget } from "@shared/schema";
import {
  Hash,
  BarChart3,
  List,
  Link2,
  Info,
  AlertTriangle,
  CheckCircle,
  Users,
  Activity,
  GraduationCap,
  Wrench,
  MessageSquare,
  TrendingUp,
  ArrowRight
} from "lucide-react";

const DATA_SOURCE_ICONS: Record<string, typeof Hash> = {
  faults_count: AlertTriangle,
  tasks_pending: CheckCircle,
  checklists_today: List,
  branch_health: Activity,
  training_progress: GraduationCap,
  staff_count: Users,
  equipment_alerts: Wrench,
  complaints_open: MessageSquare,
};

const DATA_SOURCE_LABELS: Record<string, string> = {
  faults_count: "Açık Arızalar",
  tasks_pending: "Bekleyen Görevler",
  checklists_today: "Checklist Tamamlanma",
  branch_health: "Şube Sağlık Puanı",
  training_progress: "Eğitim İlerlemesi",
  staff_count: "Aktif Personel",
  equipment_alerts: "Ekipman Uyarıları",
  complaints_open: "Açık Şikayetler",
};

const DATA_SOURCE_COLORS: Record<string, string> = {
  faults_count: "text-orange-500",
  tasks_pending: "text-blue-500",
  checklists_today: "text-green-500",
  branch_health: "text-emerald-500",
  training_progress: "text-purple-500",
  staff_count: "text-sky-500",
  equipment_alerts: "text-red-500",
  complaints_open: "text-amber-500",
};

function WidgetDataRenderer({ widget }: { widget: DashboardWidget }) {
  const { data: widgetData, isLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/widget-data", widget.id],
    refetchInterval: 60000,
  });

  const [, setLocation] = useLocation();
  const Icon = DATA_SOURCE_ICONS[widget.dataSource] || Hash;
  const colorClass = DATA_SOURCE_COLORS[widget.dataSource] || "text-primary";
  const label = DATA_SOURCE_LABELS[widget.dataSource] || widget.dataSource;

  if (isLoading) {
    return <Skeleton className="h-full w-full min-h-[80px]" />;
  }

  const value = widgetData?.value ?? 0;
  const unit = widgetData?.unit || "";
  const items = widgetData?.items || [];

  if (widget.widgetType === "counter") {
    return (
      <div className="flex flex-col items-center justify-center h-full py-3" data-testid={`widget-counter-${widget.id}`}>
        <Icon className={`h-5 w-5 ${colorClass} mb-1`} />
        <div className="text-3xl font-bold">{value}{unit === "%" ? "%" : ""}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </div>
    );
  }

  if (widget.widgetType === "chart") {
    const bars = Array.isArray(items) && items.length > 0
      ? items.map((item: any) => item.value || 0)
      : [40, 65, 45, 80, 55, 70, 60, 75].map(v => Math.round(v * (value / 100 || 1)));
    const maxVal = Math.max(...bars, 1);

    return (
      <div className="flex flex-col h-full" data-testid={`widget-chart-${widget.id}`}>
        <div className="flex items-center gap-1.5 mb-2">
          <Icon className={`h-4 w-4 ${colorClass}`} />
          <span className="text-xs text-muted-foreground">{label}</span>
          <Badge variant="secondary" className="ml-auto text-xs">{value}{unit === "%" ? "%" : ""}</Badge>
        </div>
        <div className="flex items-end gap-1 flex-1 min-h-[48px]">
          {bars.slice(0, 12).map((h: number, i: number) => (
            <div
              key={i}
              className="bg-primary/60 rounded-sm flex-1 min-w-[4px] transition-all"
              style={{ height: `${Math.max((h / maxVal) * 100, 8)}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (widget.widgetType === "list") {
    return (
      <div className="space-y-1.5" data-testid={`widget-list-${widget.id}`}>
        <div className="flex items-center gap-1.5 mb-2">
          <Icon className={`h-4 w-4 ${colorClass}`} />
          <span className="text-xs text-muted-foreground">{label}</span>
          <Badge variant="secondary" className="ml-auto text-xs">{value}</Badge>
        </div>
        {items.length > 0 ? items.slice(0, 5).map((item: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className={`h-1.5 w-1.5 rounded-full ${colorClass.replace("text-", "bg-")}`} />
            <span className="truncate flex-1">{item.label || item.name || `Öğe ${i + 1}`}</span>
            {item.value !== undefined && <span className="text-muted-foreground">{item.value}</span>}
          </div>
        )) : (
          <div className="text-xs text-muted-foreground text-center py-2">Veri bulunamadı</div>
        )}
      </div>
    );
  }

  if (widget.widgetType === "shortcut") {
    let config: any = {};
    try { config = widget.config ? JSON.parse(widget.config) : {}; } catch {}
    const targetPath = config.path || "/";

    return (
      <div
        className="flex flex-col items-center justify-center h-full py-3 cursor-pointer group"
        onClick={() => setLocation(targetPath)}
        data-testid={`widget-shortcut-${widget.id}`}
      >
        <Icon className={`h-6 w-6 ${colorClass} mb-1.5`} />
        <span className="text-sm font-medium">{widget.title}</span>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  }

  if (widget.widgetType === "info") {
    let config: any = {};
    try { config = widget.config ? JSON.parse(widget.config) : {}; } catch {}

    return (
      <div className="space-y-2" data-testid={`widget-info-${widget.id}`}>
        <div className="flex items-center gap-1.5">
          <Info className={`h-4 w-4 ${colorClass}`} />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <div className="text-sm text-muted-foreground leading-relaxed">
          {config.text || `${label}: ${value}${unit === "%" ? "%" : ""}`}
        </div>
        {value > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            <span>Güncel değer: {value}{unit === "%" ? "%" : ""}</span>
          </div>
        )}
      </div>
    );
  }

  return null;
}

export function DashboardWidgets() {
  const { data: widgets = [], isLoading } = useQuery<DashboardWidget[]>({
    queryKey: ["/api/dashboard/widgets"],
  });

  if (isLoading) {
    return (
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="dashboard-widgets-loading">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  if (widgets.length === 0) {
    return null;
  }

  const sortedWidgets = [...widgets].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="w-full space-y-3" data-testid="dashboard-widgets-container">
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sortedWidgets.map((widget) => {
          const sizeClass =
            widget.size === "small" ? "col-span-1" :
            widget.size === "large" ? "sm:col-span-2" :
            "col-span-1";

          return (
            <Card key={widget.id} className={`${sizeClass} overflow-visible`} data-testid={`dashboard-widget-${widget.id}`}>
              <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between gap-1">
                <CardTitle className="text-xs font-medium text-muted-foreground truncate">
                  {widget.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <WidgetDataRenderer widget={widget} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}