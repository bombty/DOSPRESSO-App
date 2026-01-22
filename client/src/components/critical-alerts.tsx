import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, X, ChevronRight, AlertCircle, Wrench, Clock
} from "lucide-react";
import { useLocation } from "wouter";

interface CriticalAlert {
  id: number;
  type: 'urgent_fault' | 'sla_breach' | 'equipment_critical' | 'overdue_task';
  severity: 'critical' | 'high' | 'warning';
  title: string;
  description?: string;
  entityId: number;
  entityType: string;
  createdAt: string;
}

const SEVERITY_CONFIG: Record<string, { bg: string; border: string; icon: any }> = {
  critical: { 
    bg: 'bg-destructive/15', 
    border: 'border-destructive/50',
    icon: AlertCircle
  },
  high: { 
    bg: 'bg-orange-500/15', 
    border: 'border-orange-500/50',
    icon: AlertTriangle
  },
  warning: { 
    bg: 'bg-yellow-500/15', 
    border: 'border-yellow-500/50',
    icon: Clock
  },
};

const TYPE_LABELS: Record<string, string> = {
  urgent_fault: 'Acil Arıza',
  sla_breach: 'SLA İhlali',
  equipment_critical: 'Kritik Ekipman',
  overdue_task: 'Gecikmiş Görev',
};

export function CriticalAlerts() {
  const [, navigate] = useLocation();
  const [dismissedIds, setDismissedIds] = useState<number[]>([]);

  const { data: alerts, isError } = useQuery<CriticalAlert[]>({
    queryKey: ["/api/alerts/critical"],
    refetchInterval: 30000,
  });

  // Don't show error state for alerts - just hide if error
  if (isError) {
    console.error("CriticalAlerts: Failed to fetch alerts");
    return null;
  }

  const visibleAlerts = alerts?.filter(a => !dismissedIds.includes(a.id)) || [];

  if (visibleAlerts.length === 0) {
    return null;
  }

  const handleDismiss = (id: number) => {
    setDismissedIds(prev => [...prev, id]);
  };

  const handleNavigate = (alert: CriticalAlert) => {
    if (alert.entityType === 'fault') {
      navigate(`/ariza/${alert.entityId}`);
    } else if (alert.entityType === 'task') {
      navigate(`/gorev/${alert.entityId}`);
    } else if (alert.entityType === 'equipment') {
      navigate(`/ekipman/${alert.entityId}`);
    }
  };

  return (
    <div className="space-y-2 mb-4">
      {visibleAlerts.slice(0, 3).map((alert) => {
        const config = SEVERITY_CONFIG[alert.severity];
        const Icon = config.icon;
        
        return (
          <Alert 
            key={alert.id} 
            className={`${config.bg} ${config.border} border-2 animate-pulse-slow`}
            data-testid={`critical-alert-${alert.id}`}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                <Icon className={`h-5 w-5 ${alert.severity === 'critical' ? 'text-destructive' : alert.severity === 'high' ? 'text-orange-500' : 'text-yellow-500'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <AlertTitle className="flex items-center gap-2 text-sm font-semibold mb-1">
                  {alert.title}
                  <Badge 
                    variant={alert.severity === 'critical' ? 'destructive' : 'outline'} 
                    className="text-[10px]"
                  >
                    {TYPE_LABELS[alert.type]}
                  </Badge>
                </AlertTitle>
                {alert.description && (
                  <AlertDescription className="text-xs text-muted-foreground">
                    {alert.description}
                  </AlertDescription>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => handleNavigate(alert)}
                >
                  Görüntüle
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleDismiss(alert.id)}
                  data-testid={`dismiss-alert-${alert.id}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Alert>
        );
      })}
      
      {visibleAlerts.length > 3 && (
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => navigate('/ariza?filter=critical')}
        >
          +{visibleAlerts.length - 3} daha fazla uyarı
        </Button>
      )}
    </div>
  );
}
