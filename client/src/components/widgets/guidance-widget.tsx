import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { AlertTriangle, ChevronRight, ChevronDown, ChevronUp, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";

const MANAGEMENT_ROLES = [
  "admin", "ceo", "cgo", "coach", "trainer", "muhasebe_ik",
  "satinalma", "kalite_kontrol", "gida_muhendisi", "fabrika_mudur",
  "mudur", "supervisor", "supervisor_buddy",
];

interface GuidanceItem {
  id: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  deepLink: string;
}

interface GuidanceData {
  totalGaps: number;
  criticalCount: number;
  items: GuidanceItem[];
  grouped: {
    critical: GuidanceItem[];
    high: GuidanceItem[];
    medium: GuidanceItem[];
    low: GuidanceItem[];
  };
}

export function GuidanceWidget() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [dismissedLocal, setDismissedLocal] = useState<Set<string>>(new Set());

  const { data: guidance } = useQuery<GuidanceData>({
    queryKey: ["/api/agent/guidance"],
    refetchInterval: 5 * 60 * 1000,
    enabled: !!user && MANAGEMENT_ROLES.includes(user.role),
  });

  const dismissMutation = useMutation({
    mutationFn: async (guidanceId: string) => {
      await apiRequest("POST", `/api/agent/guidance/${encodeURIComponent(guidanceId)}/dismiss`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/guidance"] });
    },
  });

  if (!user || !MANAGEMENT_ROLES.includes(user.role)) return null;
  if (!guidance || guidance.totalGaps === 0) return null;

  const filterDismissed = (items: GuidanceItem[]) =>
    items.filter(i => !dismissedLocal.has(i.id));

  const criticalItems = filterDismissed(guidance.grouped.critical || []);
  const highItems = filterDismissed(guidance.grouped.high || []);
  const mediumItems = filterDismissed(guidance.grouped.medium || []);
  const lowItems = filterDismissed(guidance.grouped.low || []);

  const visibleCount = criticalItems.length + highItems.length + mediumItems.length + lowItems.length;
  if (visibleCount === 0) return null;

  const handleDismiss = (id: string) => {
    setDismissedLocal(prev => new Set(prev).add(id));
    dismissMutation.mutate(id);
  };

  const severityConfig = {
    critical: { dot: "bg-destructive", bg: "bg-destructive/5 border border-destructive/20", label: "Kritik" },
    high: { dot: "bg-amber-500", bg: "bg-amber-500/5 border border-amber-500/20", label: "Yüksek" },
    medium: { dot: "bg-blue-500", bg: "", label: "Orta" },
    low: { dot: "bg-muted-foreground", bg: "", label: "Düşük" },
  };

  const renderItem = (item: GuidanceItem, showBg: boolean) => {
    const config = severityConfig[item.severity];
    return (
      <div
        key={item.id}
        data-testid={`guidance-item-${item.id}`}
        className={`flex items-start gap-3 p-3 rounded-md mb-2 ${showBg ? config.bg : "hover-elevate"}`}
      >
        {item.severity === "critical" ? (
          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
        ) : (
          <div className={`w-2 h-2 rounded-full ${config.dot} flex-shrink-0 mt-2`} />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{item.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            size="sm"
            variant={item.severity === "critical" ? "outline" : "ghost"}
            className="text-xs h-7"
            data-testid={`guidance-fix-${item.id}`}
            onClick={() => navigate(item.deepLink)}
          >
            {item.severity === "critical" ? "Düzelt" : "Git"}
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground"
            data-testid={`guidance-dismiss-${item.id}`}
            onClick={() => handleDismiss(item.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  };

  const extraCount = mediumItems.length + lowItems.length;

  return (
    <div className="border rounded-md p-4 mb-4 bg-card" data-testid="guidance-widget">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-medium">Mr. Dobody — Yapılması Gerekenler</h3>
          <Badge variant="outline" className="text-xs">
            {visibleCount} eksik
          </Badge>
        </div>
        {criticalItems.length > 0 && (
          <Badge variant="destructive" className="text-xs">
            {criticalItems.length} kritik
          </Badge>
        )}
      </div>

      {criticalItems.map(item => renderItem(item, true))}
      {highItems.slice(0, 3).map(item => renderItem(item, true))}

      {expanded && (
        <>
          {highItems.slice(3).map(item => renderItem(item, true))}
          {mediumItems.map(item => renderItem(item, false))}
          {lowItems.map(item => renderItem(item, false))}
        </>
      )}

      {!expanded && extraCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs mt-2"
          data-testid="guidance-show-more"
          onClick={() => setExpanded(true)}
        >
          <ChevronDown className="h-3 w-3 mr-1" />
          {extraCount} eksik daha — tümünü gör
        </Button>
      )}

      {expanded && extraCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs mt-2"
          data-testid="guidance-show-less"
          onClick={() => setExpanded(false)}
        >
          <ChevronUp className="h-3 w-3 mr-1" />
          Daralt
        </Button>
      )}
    </div>
  );
}
