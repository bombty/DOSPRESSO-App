import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useGuidanceData, type GuidanceItem } from "@/hooks/useGuidanceData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  X,
  Users,
  CheckSquare,
  Calendar,
  GraduationCap,
  Factory,
  Settings,
  ClipboardList,
  ShieldCheck,
  Search,
  Zap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { SmartNotificationDialog } from "@/components/smart-notification-dialog";

const CATEGORY_ICONS: Record<string, typeof Users> = {
  personnel: Users,
  checklist: CheckSquare,
  shifts: Calendar,
  training: GraduationCap,
  factory: Factory,
  settings: Settings,
  data: ClipboardList,
  quality: ShieldCheck,
  configuration: Settings,
};

const CATEGORY_LABELS: Record<string, string> = {
  personnel: "Personel",
  checklist: "Checklist",
  shifts: "Vardiya",
  training: "Eğitim",
  factory: "Fabrika",
  settings: "Ayarlar",
  data: "Veri",
  quality: "Kalite",
  configuration: "Yapılandırma",
};

const SEVERITY_CONFIG = {
  critical: { dot: "bg-destructive", text: "text-destructive", label: "Kritik" },
  high: { dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", label: "Yüksek" },
  medium: { dot: "bg-blue-500", text: "text-blue-600 dark:text-blue-400", label: "Orta" },
  low: { dot: "bg-muted-foreground", text: "text-muted-foreground", label: "Düşük" },
};

const ROLE_PERSONALITY: Record<string, string> = {
  admin: "Operasyon asistanı",
  ceo: "Operasyon asistanı",
  cgo: "Operasyon asistanı",
  coach: "Operasyon asistanı",
  trainer: "Operasyon asistanı",
  supervisor: "Şube asistanı",
  supervisor_buddy: "Şube asistanı",
  mudur: "Şube asistanı",
  stajyer: "Kişisel eğitim koçu",
  barista: "Kişisel eğitim koçu",
  bar_buddy: "Kişisel eğitim koçu",
  fabrika_mudur: "Üretim asistanı",
  fabrika_sorumlu: "Üretim asistanı",
  fabrika_personel: "Üretim asistanı",
  fabrika_pisman: "Üretim asistanı",
  fabrika_depo: "Üretim asistanı",
  fabrika_kalite: "Üretim asistanı",
  muhasebe_ik: "İK ve finans asistanı",
  muhasebe: "İK ve finans asistanı",
};

export function DobodyPanel() {
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionItem, setActionItem] = useState<GuidanceItem | null>(null);
  const [expanded, setExpanded] = useState(() => {
    try {
      return localStorage.getItem("dobody-panel-expanded") === "true";
    } catch {
      return false;
    }
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [dismissedLocal, setDismissedLocal] = useState<Set<string>>(new Set());
  const [, navigate] = useLocation();

  const { guidance, isEligible, dismissGuidance, userRole } = useGuidanceData();
  const personality = ROLE_PERSONALITY[userRole || ""] || "Asistan";

  useEffect(() => {
    try {
      localStorage.setItem("dobody-panel-expanded", String(expanded));
    } catch {}
  }, [expanded]);

  if (!isEligible) return null;

  const allItems = [
    ...(guidance?.grouped.critical || []),
    ...(guidance?.grouped.high || []),
    ...(guidance?.grouped.medium || []),
    ...(guidance?.grouped.low || []),
  ].filter(i => !dismissedLocal.has(i.id));

  const filteredItems = searchQuery
    ? allItems.filter(i =>
        i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allItems;

  const criticalCount = allItems.filter(i => i.severity === "critical").length;
  const highCount = allItems.filter(i => i.severity === "high").length;

  const handleDismiss = (id: string) => {
    setDismissedLocal(prev => new Set(prev).add(id));
    dismissGuidance(id);
  };

  if (!expanded) {
    return (
      <div
        className="flex flex-col items-center py-3 gap-3 w-11 border-r bg-card/50 cursor-pointer select-none flex-shrink-0"
        onClick={() => setExpanded(true)}
        data-testid="dobody-rail"
      >
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          {allItems.length > 0 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
              {allItems.length > 9 ? "9+" : allItems.length}
            </div>
          )}
        </div>
        {criticalCount > 0 && <div className="w-2 h-2 rounded-full bg-destructive" />}
        {highCount > 0 && <div className="w-2 h-2 rounded-full bg-amber-500" />}
        {allItems.length > criticalCount + highCount && (
          <div className="w-2 h-2 rounded-full bg-blue-500" />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60 border-r bg-card/50 flex-shrink-0" data-testid="dobody-panel">
      <div className="flex items-center justify-between px-3 py-2.5 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight">Mr. Dobody</span>
            <span className="text-[9px] text-muted-foreground leading-tight">{personality}</span>
          </div>
          {allItems.length > 0 && (
            <Badge variant="outline" className="text-[10px] h-5">
              {allItems.length}
            </Badge>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => setExpanded(false)}
          data-testid="dobody-collapse"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
      </div>

      {criticalCount + highCount > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b bg-muted/20">
          {criticalCount > 0 && (
            <Badge variant="destructive" className="text-[9px] h-4 px-1.5">
              {criticalCount} kritik
            </Badge>
          )}
          {highCount > 0 && (
            <Badge className="text-[9px] h-4 px-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
              {highCount} yüksek
            </Badge>
          )}
        </div>
      )}

      <div className="px-2 py-1.5">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Mr. Dobody'ye sor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 pl-7 text-xs"
            data-testid="dobody-search"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 pb-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-6">
              {searchQuery ? "Sonuç bulunamadı" : "Tebrikler! Eksik yok"}
            </div>
          ) : (
            filteredItems.map(item => (
              <DobodyFeedItem
                key={item.id}
                item={item}
                onNavigate={navigate}
                onDismiss={handleDismiss}
                onAction={(gi) => { setActionItem(gi); setActionDialogOpen(true); }}
              />
            ))
          )}
        </div>
      </ScrollArea>
      <SmartNotificationDialog
        open={actionDialogOpen}
        onOpenChange={setActionDialogOpen}
        suggestion={actionItem ? {
          id: actionItem.id,
          message: actionItem.description,
          title: actionItem.title,
          branchId: actionItem.branchId,
          category: actionItem.category,
          severity: actionItem.severity,
        } : null}
      />
    </div>
  );
}

function DobodyFeedItem({
  item,
  onNavigate,
  onDismiss,
  onAction,
}: {
  item: GuidanceItem;
  onNavigate: (path: string) => void;
  onDismiss: (id: string) => void;
  onAction?: (item: GuidanceItem) => void;
}) {
  const config = SEVERITY_CONFIG[item.severity];
  const CatIcon = CATEGORY_ICONS[item.category] || ClipboardList;
  const catLabel = CATEGORY_LABELS[item.category] || item.category;
  const showBg = item.severity === "critical" || item.severity === "high";

  return (
    <div
      className={`rounded-md p-2 space-y-1 ${
        showBg
          ? item.severity === "critical"
            ? "bg-destructive/5 border border-destructive/20"
            : "bg-amber-500/5 border border-amber-500/20"
          : "hover-elevate border border-transparent"
      }`}
      data-testid={`dobody-item-${item.id}`}
    >
      <div className="flex items-start gap-1.5">
        {item.severity === "critical" ? (
          <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0 mt-0.5" />
        ) : (
          <div className={`w-1.5 h-1.5 rounded-full ${config.dot} flex-shrink-0 mt-1.5`} />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium leading-tight">{item.title}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight line-clamp-2">{item.description}</p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-5 w-5 text-muted-foreground flex-shrink-0"
          onClick={() => onDismiss(item.id)}
          data-testid={`dobody-dismiss-${item.id}`}
        >
          <X className="h-2.5 w-2.5" />
        </Button>
      </div>
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <CatIcon className="h-2.5 w-2.5 text-muted-foreground" />
          <span className="text-[9px] text-muted-foreground">{catLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          {onAction && (item.severity === "critical" || item.severity === "high") && (
            <Button
              size="sm"
              variant="outline"
              className="h-5 px-1.5 text-[10px]"
              onClick={() => onAction(item)}
              data-testid={`dobody-action-${item.id}`}
            >
              <Zap className="h-2.5 w-2.5 mr-0.5" />
              Aksiyon Al
            </Button>
          )}
          <Button
            size="sm"
            variant={item.severity === "critical" ? "outline" : "ghost"}
            className="h-5 px-1.5 text-[10px]"
            onClick={() => onNavigate(item.deepLink)}
            data-testid={`dobody-fix-${item.id}`}
          >
            {item.severity === "critical" ? "Düzelt" : "Git"}
            <ChevronRight className="h-2.5 w-2.5 ml-0.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DobodyMobileCard() {
  const [expanded, setExpanded] = useState(false);
  const [, navigate] = useLocation();
  const [dismissedLocal, setDismissedLocal] = useState<Set<string>>(new Set());
  const { guidance, isEligible, dismissGuidance } = useGuidanceData();

  if (!isEligible) return null;

  const allItems = [
    ...(guidance?.grouped.critical || []),
    ...(guidance?.grouped.high || []),
    ...(guidance?.grouped.medium || []),
    ...(guidance?.grouped.low || []),
  ].filter(i => !dismissedLocal.has(i.id));

  if (allItems.length === 0) return null;

  const criticalCount = allItems.filter(i => i.severity === "critical").length;
  const previewItems = allItems.slice(0, 3);

  const handleDismiss = (id: string) => {
    setDismissedLocal(prev => new Set(prev).add(id));
    dismissGuidance(id);
  };

  return (
    <div className="border rounded-md bg-card mx-3 mt-3 mb-1" data-testid="dobody-mobile-card">
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <span className="text-sm font-medium">Mr. Dobody</span>
          <Badge variant="outline" className="text-[10px] h-5">
            {allItems.length} eksik
          </Badge>
          {criticalCount > 0 && (
            <Badge variant="destructive" className="text-[10px] h-5">
              {criticalCount} kritik
            </Badge>
          )}
        </div>
      </div>
      {expanded && (
        <div className="px-3 pb-2 space-y-1">
          {previewItems.map(item => {
            const config = SEVERITY_CONFIG[item.severity];
            const showBg = item.severity === "critical" || item.severity === "high";
            return (
              <div
                key={item.id}
                className={`flex items-start gap-2 p-2 rounded-md ${
                  showBg
                    ? item.severity === "critical"
                      ? "bg-destructive/5 border border-destructive/20"
                      : "bg-amber-500/5 border border-amber-500/20"
                    : ""
                }`}
              >
                {item.severity === "critical" ? (
                  <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0 mt-0.5" />
                ) : (
                  <div className={`w-1.5 h-1.5 rounded-full ${config.dot} flex-shrink-0 mt-1.5`} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium leading-tight">{item.title}</p>
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 px-1.5 text-[10px]"
                    onClick={() => navigate(item.deepLink)}
                  >
                    Git <ChevronRight className="h-2.5 w-2.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5"
                    onClick={() => handleDismiss(item.id)}
                  >
                    <X className="h-2.5 w-2.5" />
                  </Button>
                </div>
              </div>
            );
          })}
          {allItems.length > 3 && (
            <p className="text-[10px] text-muted-foreground text-center py-1">
              +{allItems.length - 3} daha fazla
            </p>
          )}
        </div>
      )}
    </div>
  );
}
