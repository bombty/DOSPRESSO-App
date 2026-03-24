import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertOctagon, CheckCircle2, Bell } from "lucide-react";
import EmptyStateCard from "./EmptyStateCard";

export interface DashboardAlert {
  type: "critical" | "warning" | "positive";
  message: string;
  branchId?: number;
  link?: string;
}

interface AlertPanelProps {
  alerts: DashboardAlert[];
  onAlertClick?: (alert: DashboardAlert) => void;
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

export default function AlertPanel({ alerts, onAlertClick, className }: AlertPanelProps) {
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

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Uyarılar & Bildirimler</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((alert, idx) => (
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
        ))}
      </CardContent>
    </Card>
  );
}
