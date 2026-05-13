// ═══════════════════════════════════════════════════════════════════
// Sprint 49 (Aslan 13 May 2026) — AI Alerts Bell + List
// ═══════════════════════════════════════════════════════════════════
// Header'da bell ikonu + badge (critical/warning sayısı)
// Tıklanınca popover ile aktif alertler listesi
// ═══════════════════════════════════════════════════════════════════

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  AlertTriangle,
  Info,
  CheckCircle2,
  X,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface AiAlert {
  id: number;
  alertType: string;
  category: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: string;
}

interface AlertSummary {
  critical: number;
  warning: number;
  info: number;
  total: number;
}

export function AiAlertsBell() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: summary } = useQuery<AlertSummary>({
    queryKey: ["/api/ai-alerts/summary"],
    refetchInterval: 5 * 60 * 1000, // 5 dk
    staleTime: 60 * 1000,
  });

  const { data: alertData, refetch } = useQuery<{ alerts: AiAlert[]; count: number }>({
    queryKey: ["/api/ai-alerts"],
    enabled: open,
    staleTime: 60 * 1000,
  });

  const dismissMutation = useMutation({
    mutationFn: async (alertId: number) => {
      await apiRequest("POST", `/api/ai-alerts/${alertId}/dismiss`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-alerts/summary"] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (alertId: number) => {
      await apiRequest("POST", `/api/ai-alerts/${alertId}/resolve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-alerts/summary"] });
    },
  });

  const iconFor = (sev: string) => {
    if (sev === "critical") return <AlertTriangle className="w-4 h-4 text-red-600" />;
    if (sev === "warning") return <AlertTriangle className="w-4 h-4 text-orange-600" />;
    return <Info className="w-4 h-4 text-blue-600" />;
  };

  const colorFor = (sev: string) => {
    if (sev === "critical") return "border-red-200 bg-red-50/50 dark:bg-red-950/20";
    if (sev === "warning") return "border-orange-200 bg-orange-50/50 dark:bg-orange-950/20";
    return "border-blue-200 bg-blue-50/50 dark:bg-blue-950/20";
  };

  const badgeColor = summary?.critical
    ? "bg-red-600 hover:bg-red-700"
    : summary?.warning
    ? "bg-orange-500 hover:bg-orange-600"
    : "bg-blue-500 hover:bg-blue-600";

  const handleActionClick = (alert: AiAlert) => {
    if (alert.actionUrl) {
      setOpen(false);
      setLocation(alert.actionUrl);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-9 w-9 p-0"
          data-testid="btn-ai-alerts-bell"
        >
          <Bell className="w-5 h-5" />
          {summary && summary.total > 0 && (
            <span
              className={`absolute -top-1 -right-1 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ${badgeColor}`}
              data-testid="alert-badge-count"
            >
              {summary.total > 99 ? "99+" : summary.total}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[380px] sm:w-[420px] p-0 max-h-[70vh] flex flex-col" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-blue-50/80 to-purple-50/80 dark:from-blue-950/30 dark:to-purple-950/30">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-sm">AI Uyarıları</h3>
          </div>
          {summary && summary.total > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              {summary.critical > 0 && (
                <Badge variant="destructive" className="h-5">
                  {summary.critical} kritik
                </Badge>
              )}
              {summary.warning > 0 && (
                <Badge variant="outline" className="h-5 border-orange-400 text-orange-700">
                  {summary.warning} uyarı
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Liste */}
        <ScrollArea className="flex-1 max-h-[60vh]">
          {!alertData?.alerts || alertData.alerts.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500 opacity-60" />
              <p className="text-sm font-medium">Aktif uyarı yok 🎉</p>
              <p className="text-xs text-muted-foreground mt-1">
                Mr. Dobody düzenli kontrol yapıyor
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {alertData.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-md border p-2.5 ${colorFor(alert.severity)}`}
                  data-testid={`alert-${alert.id}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">{iconFor(alert.severity)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium mb-0.5">{alert.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        {alert.actionUrl && (
                          <Button
                            variant="default"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleActionClick(alert)}
                            data-testid={`btn-action-${alert.id}`}
                          >
                            {alert.actionLabel || "Detay"}
                            <ChevronRight className="w-3 h-3 ml-0.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground"
                          onClick={() => resolveMutation.mutate(alert.id)}
                          data-testid={`btn-resolve-${alert.id}`}
                        >
                          ✓ Çözdüm
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground ml-auto"
                          onClick={() => dismissMutation.mutate(alert.id)}
                          data-testid={`btn-dismiss-${alert.id}`}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-2 border-t bg-muted/30 text-center">
          <p className="text-[10px] text-muted-foreground">
            Mr. Dobody · Günde 2 kez kontrol · 08:00 & 16:00
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
