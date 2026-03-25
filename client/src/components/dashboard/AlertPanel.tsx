import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertOctagon, CheckCircle2, Bell, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import EmptyStateCard from "./EmptyStateCard";

export interface DashboardAlert {
  type: "critical" | "warning" | "positive";
  message: string;
  branchId?: number;
  branchName?: string;
  link?: string;
}

interface GroupedAlert {
  groupKey: string;
  groupLabel: string;
  count: number;
  highestSeverity: "critical" | "warning" | "positive";
  alerts: DashboardAlert[];
}

interface AlertPanelProps {
  alerts: DashboardAlert[];
  onAlertClick?: (alert: DashboardAlert) => void;
  grouped?: boolean;
  className?: string;
}

function alertIcon(type: string) {
  if (type === "critical") return <AlertOctagon className="h-4 w-4 text-red-500 flex-shrink-0" />;
  if (type === "warning") return <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />;
  return <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />;
}

function alertBadge(type: string) {
  if (type === "critical") return <Badge variant="destructive" className="text-[10px]">Kritik</Badge>;
  if (type === "warning") return <Badge className="bg-amber-500 text-white text-[10px]">Uyarı</Badge>;
  return <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Olumlu</Badge>;
}

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, positive: 2 };

function groupAlerts(alerts: DashboardAlert[]): GroupedAlert[] {
  const groups = new Map<string, DashboardAlert[]>();
  alerts.forEach(alert => {
    const key = extractGroupKey(alert);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(alert);
  });

  return Array.from(groups.entries())
    .map(([key, items]) => ({
      groupKey: key,
      groupLabel: items[0].branchName || extractLabelFromMessage(items[0].message) || key,
      count: items.length,
      highestSeverity: items.reduce((best, a) =>
        (SEVERITY_ORDER[a.type] ?? 2) < (SEVERITY_ORDER[best] ?? 2) ? a.type : best,
        "positive" as "critical" | "warning" | "positive"
      ),
      alerts: items,
    }))
    .sort((a, b) => (SEVERITY_ORDER[a.highestSeverity] ?? 2) - (SEVERITY_ORDER[b.highestSeverity] ?? 2));
}

function extractGroupKey(alert: DashboardAlert): string {
  if (alert.branchId) return `branch-${alert.branchId}`;
  if (alert.branchName) return alert.branchName;
  const match = alert.message?.match(/^([^—–\-]+?)[\s]*[—–\-]/);
  if (match) return match[1].trim();
  return `alert-${alert.type}`;
}

function extractLabelFromMessage(message: string): string {
  const match = message?.match(/^([^—–\-]+?)[\s]*[—–\-]/);
  return match ? match[1].trim() : "";
}

function AlertGroupRow({ group, onAlertClick }: { group: GroupedAlert; onAlertClick?: (a: DashboardAlert) => void }) {
  const [expanded, setExpanded] = useState(false);

  if (group.count === 1) {
    return (
      <div
        className="flex items-start gap-2 p-2 rounded-md hover-elevate cursor-pointer"
        onClick={() => onAlertClick?.(group.alerts[0])}
        data-testid={`alert-group-${group.groupKey}`}
      >
        {alertIcon(group.highestSeverity)}
        <div className="flex-1 min-w-0">
          <p className="text-xs leading-relaxed">{group.alerts[0].message}</p>
        </div>
        {alertBadge(group.highestSeverity)}
      </div>
    );
  }

  return (
    <div data-testid={`alert-group-${group.groupKey}`}>
      <button
        type="button"
        className="w-full flex items-center gap-2 p-2 rounded-md hover-elevate cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        data-testid={`alert-group-toggle-${group.groupKey}`}
      >
        {alertIcon(group.highestSeverity)}
        <span className="text-xs font-medium flex-1 text-left truncate">{group.groupLabel}</span>
        <Badge variant="outline" className="text-[10px] h-5 flex-shrink-0">{group.count} uyarı</Badge>
        <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded && (
        <div className="ml-6 mt-1 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
          {group.alerts.map((alert, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 p-1.5 rounded-md hover-elevate cursor-pointer text-muted-foreground"
              onClick={() => onAlertClick?.(alert)}
              data-testid={`alert-group-item-${group.groupKey}-${idx}`}
            >
              <span className="text-[10px] leading-relaxed">{alert.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AlertPanel({ alerts, onAlertClick, grouped = true, className }: AlertPanelProps) {
  if (!alerts.length) {
    return (
      <EmptyStateCard
        icon={<Bell className="h-10 w-10" />}
        title="Uyarı yok"
        description="Şu anda dikkat gerektiren bir durum bulunmuyor"
        className={className}
      />
    );
  }

  const shouldGroup = grouped && alerts.length > 3;
  const groups = shouldGroup ? groupAlerts(alerts) : null;

  return (
    <Card className={className} data-testid="alert-panel">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          Uyarılar & Bildirimler
          <Badge variant="outline" className="text-[10px] h-5">{alerts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {shouldGroup && groups ? (
          groups.map(g => (
            <AlertGroupRow key={g.groupKey} group={g} onAlertClick={onAlertClick} />
          ))
        ) : (
          alerts.map((alert, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 p-2 rounded-md hover-elevate cursor-pointer"
              onClick={() => onAlertClick?.(alert)}
              data-testid={`alert-${idx}`}
            >
              {alertIcon(alert.type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {alertBadge(alert.type)}
                </div>
                <p className="text-xs leading-relaxed">{alert.message}</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
