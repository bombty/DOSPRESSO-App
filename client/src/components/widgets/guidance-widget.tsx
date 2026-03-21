import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { AlertTriangle, ChevronRight, ChevronDown, ChevronUp, Sparkles, X, Users, CheckSquare, Calendar, GraduationCap, Factory, Settings, ClipboardList, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
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

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof Users }> = {
  personnel: { label: "Personel", icon: Users },
  checklist: { label: "Checklist", icon: CheckSquare },
  shifts: { label: "Vardiya", icon: Calendar },
  training: { label: "Eğitim", icon: GraduationCap },
  factory: { label: "Fabrika", icon: Factory },
  settings: { label: "Ayarlar", icon: Settings },
  data: { label: "Veri", icon: ClipboardList },
  quality: { label: "Kalite", icon: ShieldCheck },
  configuration: { label: "Yapılandırma", icon: Settings },
};

function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG[category] || { label: category, icon: ClipboardList };
}

export function GuidanceWidget() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
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

  const allItems = [
    ...(guidance.grouped.critical || []),
    ...(guidance.grouped.high || []),
    ...(guidance.grouped.medium || []),
    ...(guidance.grouped.low || []),
  ].filter(i => !dismissedLocal.has(i.id));

  if (allItems.length === 0) return null;

  const criticalItems = allItems.filter(i => i.severity === "critical");
  const highItems = allItems.filter(i => i.severity === "high");

  const handleDismiss = (id: string) => {
    setDismissedLocal(prev => new Set(prev).add(id));
    dismissMutation.mutate(id);
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const categoryGroups = useMemo(() => {
    const groups: Record<string, GuidanceItem[]> = {};
    allItems.forEach(item => {
      const cat = item.category || "other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return Object.entries(groups).sort((a, b) => {
      const aCrit = a[1].filter(i => i.severity === "critical").length;
      const bCrit = b[1].filter(i => i.severity === "critical").length;
      return bCrit - aCrit;
    });
  }, [allItems]);

  const severityConfig = {
    critical: { dot: "bg-destructive", bg: "bg-destructive/5 border border-destructive/20" },
    high: { dot: "bg-amber-500", bg: "bg-amber-500/5 border border-amber-500/20" },
    medium: { dot: "bg-blue-500", bg: "" },
    low: { dot: "bg-muted-foreground", bg: "" },
  };

  const renderItem = (item: GuidanceItem, compact = false) => {
    const config = severityConfig[item.severity];
    const showBg = item.severity === "critical" || item.severity === "high";
    return (
      <div
        key={item.id}
        data-testid={`guidance-item-${item.id}`}
        className={`flex items-start gap-2 ${compact ? "p-2" : "p-2.5"} rounded-md ${showBg ? config.bg : "hover-elevate"}`}
      >
        {item.severity === "critical" ? (
          <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0 mt-0.5" />
        ) : (
          <div className={`w-1.5 h-1.5 rounded-full ${config.dot} flex-shrink-0 mt-2`} />
        )}
        <div className="flex-1 min-w-0">
          <p className={`${compact ? "text-xs" : "text-sm"} font-medium leading-tight`}>{item.title}</p>
          {!compact && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{item.description}</p>
          )}
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Button
            size="sm"
            variant={item.severity === "critical" ? "outline" : "ghost"}
            className="text-xs h-6 px-2"
            data-testid={`guidance-fix-${item.id}`}
            onClick={() => navigate(item.deepLink)}
          >
            {item.severity === "critical" ? "Düzelt" : "Git"}
            <ChevronRight className="h-3 w-3 ml-0.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-muted-foreground"
            data-testid={`guidance-dismiss-${item.id}`}
            onClick={() => handleDismiss(item.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  };

  const previewItems = [...criticalItems, ...highItems].slice(0, 3);
  const remainingCount = allItems.length - previewItems.length;

  return (
    <div className="border rounded-md bg-card mx-3 mt-3 mb-1" data-testid="guidance-widget">
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
        data-testid="guidance-header"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <span className="text-sm font-medium">Mr. Dobody</span>
          <Badge variant="outline" className="text-[10px] h-5">
            {allItems.length} eksik
          </Badge>
          {criticalItems.length > 0 && (
            <Badge variant="destructive" className="text-[10px] h-5">
              {criticalItems.length} kritik
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" data-testid="guidance-toggle">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {!expanded && previewItems.length > 0 && (
        <div className="px-3 pb-2 space-y-1">
          {previewItems.map(item => renderItem(item, true))}
          {remainingCount > 0 && (
            <button
              className="w-full text-xs text-muted-foreground py-1 hover:text-foreground transition-colors"
              data-testid="guidance-show-more"
              onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
            >
              +{remainingCount} daha fazla
            </button>
          )}
        </div>
      )}

      {expanded && (
        <div className="px-3 pb-3 space-y-1.5">
          {categoryGroups.map(([category, items]) => {
            const catConfig = getCategoryConfig(category);
            const CatIcon = catConfig.icon;
            const catCritical = items.filter(i => i.severity === "critical").length;
            const isExpanded = expandedCategories.has(category);

            return (
              <div key={category} className="border border-border/50 rounded-md overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-2.5 py-1.5 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                  onClick={() => toggleCategory(category)}
                  data-testid={`guidance-category-${category}`}
                >
                  <div className="flex items-center gap-2">
                    <CatIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">{catConfig.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {catCritical > 0 && (
                      <Badge variant="destructive" className="text-[9px] h-4 px-1">
                        {catCritical}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[9px] h-4 px-1">
                      {items.length}
                    </Badge>
                    <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </div>
                </button>
                {isExpanded && (
                  <div className="p-1.5 space-y-1">
                    {items.map(item => renderItem(item))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
