import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  Timer,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { formatDistanceToNow, differenceInHours } from "date-fns";
import { tr } from "date-fns/locale";

interface SLAItem {
  id: number;
  type: string;
  title: string;
  priority: string;
  branchName: string;
  createdAt: string;
  slaDeadline: string;
  status: "on_track" | "warning" | "breached";
  hoursRemaining: number;
}

interface SLAOverview {
  totalActive: number;
  onTrack: number;
  warning: number;
  breached: number;
  complianceRate: number;
  avgResolutionHours: number;
  items: SLAItem[];
  prioritySLA: { priority: string; target: number; actual: number }[];
}

const STATUS_CONFIG = {
  on_track: { 
    label: "Zamanında", 
    icon: CheckCircle, 
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-900/30"
  },
  warning: { 
    label: "Uyarı", 
    icon: AlertTriangle, 
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-100 dark:bg-yellow-900/30"
  },
  breached: { 
    label: "Aşıldı", 
    icon: AlertCircle, 
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/30"
  }
};

export default function CRMSLA() {
  const { data: slaData, isLoading } = useQuery<SLAOverview>({
    queryKey: ["/api/crm/sla"],
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-32" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  if (!slaData) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        SLA verileri yüklenemedi
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card data-testid="stat-compliance">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{slaData.complianceRate}%</p>
                  <p className="text-xs text-muted-foreground">SLA Uyumu</p>
                </div>
                <div className={`p-2 rounded-lg ${slaData.complianceRate >= 90 ? 'bg-green-100 dark:bg-green-900/30' : slaData.complianceRate >= 70 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                  <TrendingUp className={`h-5 w-5 ${slaData.complianceRate >= 90 ? 'text-green-600' : slaData.complianceRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="stat-on-track">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-green-600">{slaData.onTrack}</p>
                  <p className="text-xs text-muted-foreground">Zamanında</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card data-testid="stat-warning">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-yellow-600">{slaData.warning}</p>
                  <p className="text-xs text-muted-foreground">Uyarı</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-200" />
              </div>
            </CardContent>
          </Card>

          <Card data-testid="stat-breached">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-red-600">{slaData.breached}</p>
                  <p className="text-xs text-muted-foreground">Aşıldı</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="priority-sla">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Öncelik Bazlı SLA Hedefleri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {slaData.prioritySLA.map((item) => {
                const percentage = Math.min(100, (item.actual / item.target) * 100);
                const isOnTarget = item.actual <= item.target;
                return (
                  <div key={item.priority} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize font-medium">{item.priority}</span>
                      <span className={isOnTarget ? 'text-green-600' : 'text-red-600'}>
                        {item.actual}s / {item.target}s hedef
                      </span>
                    </div>
                    <Progress 
                      value={percentage} 
                      className={`h-2 ${isOnTarget ? '' : '[&>div]:bg-red-500'}`}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="sla-items">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Aktif Talepler ({slaData.totalActive})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {slaData.items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Aktif talep yok</p>
              ) : (
                slaData.items.map((item) => {
                  const config = STATUS_CONFIG[item.status];
                  const StatusIcon = config.icon;
                  return (
                    <div 
                      key={`${item.type}-${item.id}`} 
                      className={`p-3 rounded-lg border ${item.status === 'breached' ? 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20' : item.status === 'warning' ? 'border-yellow-300 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20' : 'bg-muted/30'}`}
                      data-testid={`sla-item-${item.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="capitalize">{item.priority}</Badge>
                            <Badge className={config.bg}>
                              <StatusIcon className={`h-3 w-3 mr-1 ${config.color}`} />
                              {config.label}
                            </Badge>
                          </div>
                          <h4 className="font-medium text-sm truncate">{item.title}</h4>
                          <p className="text-xs text-muted-foreground">{item.branchName}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {item.status === 'breached' ? (
                            <p className="text-sm font-medium text-red-600">
                              {Math.abs(item.hoursRemaining)}s aşıldı
                            </p>
                          ) : (
                            <p className={`text-sm font-medium ${item.status === 'warning' ? 'text-yellow-600' : 'text-green-600'}`}>
                              {item.hoursRemaining}s kaldı
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(item.slaDeadline), { locale: tr })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
