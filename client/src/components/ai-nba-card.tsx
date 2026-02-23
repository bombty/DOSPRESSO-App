import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, AlertTriangle, AlertCircle, ChevronRight, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AiNbaData {
  role: string;
  group: string;
  alerts: Array<{
    type: string;
    title: string;
    severity: 'critical' | 'warning';
    count: number;
  }>;
  actions: Array<{
    type: string;
    title: string;
    reason: string;
    severity: 'high' | 'medium' | 'low';
    deepLink: string;
    estimatedMinutes: number;
  }>;
  analyzedAt: string;
}

export function AiNbaCard() {
  const [, setLocation] = useLocation();

  const { data, isLoading, isError } = useQuery<AiNbaData>({
    queryKey: ['/api/ai/dashboard-nba'],
    staleTime: 60000,
    refetchInterval: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card data-testid="nba-card-loading">
        <CardContent className="p-4">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card data-testid="nba-card-error">
        <CardContent className="p-4 text-center text-muted-foreground">
          AI önerileri yüklenemedi
        </CardContent>
      </Card>
    );
  }

  const criticalCount = data.alerts
    .filter(a => a.severity === 'critical')
    .reduce((sum, a) => sum + a.count, 0);
  
  const hasContent = data.alerts.length > 0 || data.actions.length > 0;

  if (!hasContent) {
    return (
      <Card data-testid="nba-card-empty">
        <CardContent className="p-4 text-center text-muted-foreground">
          Harika! Tamamlanmamis oneri yok.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="nba-card">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2 px-4 pt-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">AI Önerileri</CardTitle>
        </div>
        {criticalCount > 0 && (
          <Badge variant="destructive" className="text-xs" data-testid="nba-p0-badge">
            {criticalCount} P0
          </Badge>
        )}
      </CardHeader>

      <CardContent className="px-4 pb-3 space-y-2">
        {/* Alerts section */}
        {data.alerts.filter(a => a.count > 0).map(alert => (
          <div
            key={alert.type}
            className="flex items-center gap-2 text-xs flex-wrap"
            data-testid={`nba-alert-${alert.type}`}
          >
            {alert.severity === 'critical' ? (
              <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-yellow-500 dark:text-yellow-400 shrink-0" />
            )}
            <span
              className={
                alert.severity === 'critical'
                  ? 'text-destructive font-medium'
                  : 'text-muted-foreground'
              }
            >
              {alert.title}
            </span>
            <Badge variant="secondary" className="text-xs ml-auto">
              {alert.count}
            </Badge>
          </div>
        ))}

        {/* Actions section */}
        {data.actions.map(action => (
          <div
            key={action.type}
            className="flex items-center gap-2 p-2 rounded-md hover-elevate cursor-pointer"
            onClick={() => setLocation(action.deepLink)}
            role="button"
            tabIndex={0}
            data-testid={`nba-action-${action.type}`}
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{action.title}</div>
              <div className="text-xs text-muted-foreground truncate">{action.reason}</div>
            </div>
            <div className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{action.estimatedMinutes}dk</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        ))}

        {/* Analyzed at footer */}
        <div className="text-xs text-muted-foreground pt-1" data-testid="nba-analyzed-at">
          Analiz: {new Date(data.analyzedAt).toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </CardContent>
    </Card>
  );
}
