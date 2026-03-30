import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutDashboard, Save, RotateCcw, GripVertical,
  ChevronUp, ChevronDown, Eye, ShieldAlert,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Widget {
  id: number;
  widgetKey: string;
  title: string;
  widgetType: string;
  category: string;
  dataSource: string;
  size: string;
  isActive: boolean;
  requiredPermissions?: string[];
}

interface RoleWidget {
  id?: number;
  role: string;
  widgetKey: string;
  isEnabled: boolean;
  displayOrder: number;
  defaultOpen: boolean;
}

interface LocalAssignment {
  widgetKey: string;
  isEnabled: boolean;
  displayOrder: number;
  defaultOpen: boolean;
}

const CONFIGURABLE_ROLES = [
  { value: "ceo", label: "CEO" },
  { value: "cgo", label: "CGO" },
  { value: "admin", label: "Admin" },
  { value: "coach", label: "Coach" },
  { value: "trainer", label: "Trainer" },
  { value: "supervisor", label: "Supervisor" },
  { value: "mudur", label: "Müdür" },
  { value: "muhasebe", label: "Muhasebe" },
  { value: "muhasebe_ik", label: "Muhasebe & İK" },
  { value: "satinalma", label: "Satınalma" },
  { value: "marketing", label: "Marketing" },
  { value: "kalite_kontrol", label: "Kalite Kontrol" },
  { value: "gida_muhendisi", label: "Gıda Mühendisi" },
  { value: "teknik", label: "Teknik" },
  { value: "destek", label: "Destek" },
  { value: "fabrika_mudur", label: "Fabrika Müdür" },
  { value: "uretim_sefi", label: "Üretim Şefi" },
  { value: "fabrika_sorumlu", label: "Fabrika Sorumlu" },
  { value: "fabrika_personel", label: "Fabrika Personel" },
  { value: "yatirimci_hq", label: "Yatırımcı HQ" },
  { value: "yatirimci_branch", label: "Yatırımcı Şube" },
  { value: "stajyer", label: "Stajyer" },
  { value: "barista", label: "Barista" },
  { value: "bar_buddy", label: "Bar Buddy" },
];

const categoryLabels: Record<string, string> = {
  operasyon: "Operasyon",
  personel: "Personel",
  fabrika: "Fabrika",
  finans: "Finans",
  egitim: "Eğitim",
  musteri: "Müşteri",
  ekipman: "Ekipman",
};

export default function DashboardAyarlari() {
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState("ceo");
  const [localAssignments, setLocalAssignments] = useState<LocalAssignment[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: widgets, isLoading: widgetsLoading } = useQuery<Widget[]>({
    queryKey: ["/api/admin/mc-widgets"],
  });

  const { data: roleWidgets, isLoading: roleWidgetsLoading } = useQuery<RoleWidget[]>({
    queryKey: ["/api/admin/dashboard-role-widgets", selectedRole],
    enabled: !!selectedRole,
  });

  useEffect(() => {
    if (widgets) {
      const existingKeys = new Set((roleWidgets || []).map((rw) => rw.widgetKey));
      const existingAssignments: LocalAssignment[] = (roleWidgets || []).map((rw) => ({
        widgetKey: rw.widgetKey,
        isEnabled: rw.isEnabled,
        displayOrder: rw.displayOrder,
        defaultOpen: rw.defaultOpen,
      }));
      const missingWidgets: LocalAssignment[] = widgets
        .filter((w) => w.isActive && !existingKeys.has(w.widgetKey))
        .map((w, i) => ({
          widgetKey: w.widgetKey,
          isEnabled: false,
          displayOrder: existingAssignments.length + i + 1,
          defaultOpen: true,
        }));
      setLocalAssignments([...existingAssignments, ...missingWidgets]);
      setHasChanges(false);
    }
  }, [roleWidgets, widgets, selectedRole]);

  const saveMutation = useMutation({
    mutationFn: async (assignments: LocalAssignment[]) => {
      await apiRequest("PUT", `/api/admin/dashboard-role-widgets/${selectedRole}`, {
        widgets: (Array.isArray(assignments) ? assignments : []).map((a) => ({
          widgetKey: a.widgetKey,
          isEnabled: a.isEnabled,
          displayOrder: a.displayOrder,
          defaultOpen: a.defaultOpen,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard-role-widgets", selectedRole] });
      toast({ title: "Kaydedildi", description: `${selectedRole} widget atamaları güncellendi.` });
      setHasChanges(false);
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err.message || "Kayıt başarısız.", variant: "destructive" });
    },
  });

  const toggleVisibility = (widgetKey: string) => {
    setLocalAssignments((prev) =>
      prev.map((a) => (a.widgetKey === widgetKey ? { ...a, isEnabled: !a.isEnabled } : a))
    );
    setHasChanges(true);
  };

  const toggleDefaultOpen = (widgetKey: string) => {
    setLocalAssignments((prev) =>
      prev.map((a) => (a.widgetKey === widgetKey ? { ...a, defaultOpen: !a.defaultOpen } : a))
    );
    setHasChanges(true);
  };

  const moveWidget = (widgetKey: string, direction: "up" | "down") => {
    setLocalAssignments((prev) => {
      const sorted = [...prev].sort((a, b) => a.displayOrder - b.displayOrder);
      const idx = sorted.findIndex((a) => a.widgetKey === widgetKey);
      if (idx < 0) return prev;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return prev;
      const tempOrder = sorted[idx].displayOrder;
      sorted[idx].displayOrder = sorted[swapIdx].displayOrder;
      sorted[swapIdx].displayOrder = tempOrder;
      return sorted;
    });
    setHasChanges(true);
  };

  const resetToDefaults = () => {
    if (widgets) {
      const defaults: LocalAssignment[] = widgets
        .filter((w) => w.isActive)
        .map((w, i) => ({
          widgetKey: w.widgetKey,
          isEnabled: true,
          displayOrder: i + 1,
          defaultOpen: true,
        }));
      setLocalAssignments(defaults);
      setHasChanges(true);
    }
  };

  const getWidgetByKey = (key: string) => widgets?.find((w) => w.widgetKey === key);

  const isLoading = widgetsLoading || roleWidgetsLoading;
  const sortedAssignments = [...localAssignments].sort((a, b) => a.displayOrder - b.displayOrder);
  const visibleCount = localAssignments.filter((a) => a.isEnabled).length;

  return (
    <div className="space-y-4" data-testid="admin-dashboard-settings">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">Dashboard Widget Atamaları</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-[180px]" data-testid="select-role-trigger">
              <SelectValue placeholder="Rol seçin" />
            </SelectTrigger>
            <SelectContent>
              {CONFIGURABLE_ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value} data-testid={`select-role-${r.value}`}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">
            {visibleCount} aktif / {localAssignments.length} toplam
          </Badge>
          {hasChanges && (
            <Badge variant="destructive" className="text-[10px]">
              Kaydedilmemiş değişiklik
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefaults}
            data-testid="button-reset-defaults"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Varsayılan
          </Button>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate(localAssignments)}
            disabled={!hasChanges || saveMutation.isPending}
            data-testid="button-save-assignments"
          >
            <Save className="w-3 h-3 mr-1" />
            {saveMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {sortedAssignments.map((assignment, idx) => {
            const widget = getWidgetByKey(assignment.widgetKey);
            if (!widget) return null;
            return (
              <Card
                key={assignment.widgetKey}
                className={`transition-opacity ${!assignment.isEnabled ? "opacity-50" : ""}`}
                data-testid={`widget-row-${widget.widgetKey}`}
              >
                <CardContent className="p-2.5 flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-medium truncate">{widget.title}</span>
                      <Badge variant="outline" className="text-[9px] h-4">
                        {categoryLabels[widget.category] || widget.category}
                      </Badge>
                      <Badge variant="secondary" className="text-[9px] h-4">
                        {widget.widgetType}
                      </Badge>
                      {widget.requiredPermissions && widget.requiredPermissions.length > 0 && assignment.isEnabled && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex">
                              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[200px]">
                            <p className="text-[10px]">Bu widget şu izinleri gerektirir: {widget.requiredPermissions.join(", ")}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={idx === 0}
                      onClick={() => moveWidget(assignment.widgetKey, "up")}
                      data-testid={`button-move-up-${widget.widgetKey}`}
                    >
                      <ChevronUp className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={idx === sortedAssignments.length - 1}
                      onClick={() => moveWidget(assignment.widgetKey, "down")}
                      data-testid={`button-move-down-${widget.widgetKey}`}
                    >
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                    <Button
                      variant={assignment.defaultOpen ? "default" : "ghost"}
                      size="icon"
                      onClick={() => toggleDefaultOpen(assignment.widgetKey)}
                      title={assignment.defaultOpen ? "Varsayılan açık" : "Varsayılan kapalı"}
                      data-testid={`button-default-open-${widget.widgetKey}`}
                    >
                      <Eye className={`w-3 h-3 ${assignment.defaultOpen ? "" : "opacity-30"}`} />
                    </Button>
                    <Switch
                      checked={assignment.isEnabled}
                      onCheckedChange={() => toggleVisibility(assignment.widgetKey)}
                      data-testid={`switch-visibility-${widget.widgetKey}`}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
