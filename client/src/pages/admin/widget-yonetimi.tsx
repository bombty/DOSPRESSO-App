import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import type { DashboardWidget } from "@shared/schema";
import {
  Settings,
  Plus,
  Trash2,
  Pencil,
  BarChart3,
  Hash,
  List,
  Link2,
  Info,
  LayoutGrid,
  Save,
  Eye,
  EyeOff,
  GripVertical,
  AlertTriangle,
  Users,
  CheckCircle,
  Activity,
  GraduationCap,
  Wrench,
  MessageSquare,
  Store
} from "lucide-react";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "muhasebe", label: "Muhasebe" },
  { value: "teknik", label: "Teknik" },
  { value: "destek", label: "Destek" },
  { value: "coach", label: "Coach" },
  { value: "satinalma", label: "Satın Alma" },
  { value: "yatirimci_hq", label: "Yatırımcı HQ" },
  { value: "fabrika", label: "Fabrika" },
  { value: "supervisor", label: "Supervisor" },
  { value: "supervisor_buddy", label: "Supervisor Buddy" },
  { value: "barista", label: "Barista" },
  { value: "ceo", label: "CEO" },
  { value: "cgo", label: "CGO" },
  { value: "trainer", label: "Trainer" },
];

const WIDGET_TYPES = [
  { value: "counter", label: "Sayaç", icon: Hash },
  { value: "chart", label: "Grafik", icon: BarChart3 },
  { value: "list", label: "Liste", icon: List },
  { value: "shortcut", label: "Kısayol", icon: Link2 },
  { value: "info", label: "Bilgi", icon: Info },
];

const SIZE_OPTIONS = [
  { value: "small", label: "Küçük" },
  { value: "medium", label: "Orta" },
  { value: "large", label: "Büyük" },
];

const DATA_SOURCES = [
  { value: "faults_count", label: "Açık Arıza Sayısı", icon: AlertTriangle },
  { value: "tasks_pending", label: "Bekleyen Görevler", icon: CheckCircle },
  { value: "checklists_today", label: "Bugünkü Checklist Oranı", icon: List },
  { value: "branch_health", label: "Şube Sağlık Puanı", icon: Activity },
  { value: "training_progress", label: "Eğitim İlerlemesi", icon: GraduationCap },
  { value: "staff_count", label: "Aktif Personel Sayısı", icon: Users },
  { value: "equipment_alerts", label: "Ekipman Uyarıları", icon: Wrench },
  { value: "complaints_open", label: "Açık Şikayetler", icon: MessageSquare },
];

const DISPLAY_LOCATIONS = [
  { value: "menu", label: "Menü" },
  { value: "dashboard", label: "Dashboard" },
  { value: "widget", label: "Widget" },
  { value: "hidden", label: "Gizli" },
];

function getWidgetTypeIcon(type: string) {
  const found = WIDGET_TYPES.find(wt => wt.value === type);
  if (!found) return Hash;
  return found.icon;
}

function getWidgetTypeLabel(type: string) {
  return WIDGET_TYPES.find(wt => wt.value === type)?.label || type;
}

function getSizeLabel(size: string) {
  return SIZE_OPTIONS.find(s => s.value === size)?.label || size;
}

function getDataSourceLabel(ds: string) {
  return DATA_SOURCES.find(d => d.value === ds)?.label || ds;
}

interface WidgetFormData {
  title: string;
  widgetType: string;
  size: string;
  dataSource: string;
  config: string;
  roles: string[];
  sortOrder: number;
  isActive: boolean;
}

const defaultFormData: WidgetFormData = {
  title: "",
  widgetType: "counter",
  size: "medium",
  dataSource: "faults_count",
  config: "",
  roles: [],
  sortOrder: 0,
  isActive: true,
};

function WidgetPreview({ formData }: { formData: WidgetFormData }) {
  const Icon = getWidgetTypeIcon(formData.widgetType);
  const sizeClass = formData.size === "small" ? "w-36" : formData.size === "large" ? "w-64" : "w-48";

  return (
    <Card className={`${sizeClass} overflow-visible`} data-testid="widget-preview">
      <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between gap-1">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium truncate">{formData.title || "Başlıksız"}</span>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-1">
        {formData.widgetType === "counter" && (
          <div className="text-center py-2">
            <div className="text-2xl font-bold text-primary">42</div>
            <div className="text-xs text-muted-foreground mt-0.5">{getDataSourceLabel(formData.dataSource)}</div>
          </div>
        )}
        {formData.widgetType === "chart" && (
          <div className="flex items-end gap-1 h-12 justify-center py-1">
            {[40, 65, 45, 80, 55, 70, 60].map((h, i) => (
              <div key={i} className="bg-primary/70 rounded-sm" style={{ width: 6, height: `${h}%` }} />
            ))}
          </div>
        )}
        {formData.widgetType === "list" && (
          <div className="space-y-1 py-1">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <div className="h-2 bg-muted rounded flex-1" />
              </div>
            ))}
          </div>
        )}
        {formData.widgetType === "shortcut" && (
          <div className="flex flex-col items-center gap-1 py-2">
            <Link2 className="h-5 w-5 text-primary" />
            <span className="text-xs text-muted-foreground">Hızlı Erişim</span>
          </div>
        )}
        {formData.widgetType === "info" && (
          <div className="py-2">
            <div className="text-xs text-muted-foreground leading-relaxed">Bilgi içeriği burada görünecek...</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminWidgetYonetimi() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<DashboardWidget | null>(null);
  const [formData, setFormData] = useState<WidgetFormData>(defaultFormData);

  if (user?.role !== "admin") {
    return <Redirect to="/" />;
  }

  const { data: widgets = [], isLoading } = useQuery<DashboardWidget[]>({
    queryKey: ["/api/admin/widgets"],
  });

  const { data: moduleVisibility = [], isLoading: modulesLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/module-visibility"],
  });

  const createMutation = useMutation({
    mutationFn: (data: WidgetFormData) =>
      apiRequest("POST", "/api/admin/widgets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/widgets"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: "Widget oluşturuldu" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Widget oluşturulamadı", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<WidgetFormData> }) =>
      apiRequest("PATCH", `/api/admin/widgets/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/widgets"] });
      setDialogOpen(false);
      setEditingWidget(null);
      resetForm();
      toast({ title: "Widget güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Widget güncellenemedi", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/admin/widgets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/widgets"] });
      toast({ title: "Widget silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Widget silinemedi", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/widgets/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/widgets"] });
    },
  });

  const moduleVisibilityMutation = useMutation({
    mutationFn: ({ moduleId, data }: { moduleId: string; data: any }) =>
      apiRequest("PATCH", `/api/admin/module-visibility/${moduleId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/module-visibility"] });
      toast({ title: "Modül görünürlüğü güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Modül görünürlüğü güncellenemedi", variant: "destructive" });
    },
  });

  function resetForm() {
    setFormData(defaultFormData);
    setEditingWidget(null);
  }

  function openCreateDialog() {
    resetForm();
    setDialogOpen(true);
  }

  function openEditDialog(widget: DashboardWidget) {
    setEditingWidget(widget);
    setFormData({
      title: widget.title,
      widgetType: widget.widgetType,
      size: widget.size,
      dataSource: widget.dataSource,
      config: widget.config || "",
      roles: widget.roles || [],
      sortOrder: widget.sortOrder,
      isActive: widget.isActive,
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!formData.title.trim()) {
      toast({ title: "Başlık zorunludur", variant: "destructive" });
      return;
    }
    if (editingWidget) {
      updateMutation.mutate({ id: editingWidget.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  }

  function toggleRole(role: string) {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role],
    }));
  }

  const sortedWidgets = [...widgets].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold" data-testid="text-page-title">Widget Yönetimi</h1>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-create-widget">
          <Plus className="h-4 w-4 mr-1" />
          Yeni Widget
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : sortedWidgets.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <LayoutGrid className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Henüz widget oluşturulmamış</p>
            <Button variant="outline" className="mt-3" onClick={openCreateDialog} data-testid="button-create-widget-empty">
              <Plus className="h-4 w-4 mr-1" />
              İlk Widget'ı Oluştur
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedWidgets.map((widget) => {
            const TypeIcon = getWidgetTypeIcon(widget.widgetType);
            return (
              <Card key={widget.id} className={`${!widget.isActive ? "opacity-60" : ""}`} data-testid={`card-widget-${widget.id}`}>
                <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <TypeIcon className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium text-sm truncate" data-testid={`text-widget-title-${widget.id}`}>{widget.title}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Switch
                      checked={widget.isActive}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: widget.id, isActive: checked })}
                      data-testid={`switch-widget-active-${widget.id}`}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" data-testid={`badge-widget-type-${widget.id}`}>
                      {getWidgetTypeLabel(widget.widgetType)}
                    </Badge>
                    <Badge variant="outline" data-testid={`badge-widget-size-${widget.id}`}>
                      {getSizeLabel(widget.size)}
                    </Badge>
                    <Badge variant="outline">
                      #{widget.sortOrder}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <Store className="h-3 w-3 inline mr-1" />
                    {getDataSourceLabel(widget.dataSource)}
                  </div>
                  {widget.roles && widget.roles.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {widget.roles.map(role => (
                        <Badge key={role} variant="outline" className="text-xs" data-testid={`badge-widget-role-${widget.id}-${role}`}>
                          {ROLE_OPTIONS.find(r => r.value === role)?.label || role}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {(!widget.roles || widget.roles.length === 0) && (
                    <div className="text-xs text-muted-foreground">
                      <Users className="h-3 w-3 inline mr-1" />
                      Tüm roller
                    </div>
                  )}
                  <div className="flex items-center gap-1 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(widget)}
                      data-testid={`button-edit-widget-${widget.id}`}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Düzenle
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm("Bu widget'ı silmek istediğinize emin misiniz?")) {
                          deleteMutation.mutate(widget.id);
                        }
                      }}
                      data-testid={`button-delete-widget-${widget.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold" data-testid="text-module-visibility-title">Modül Görünürlüğü</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Her modülün dashboard'da nerede görüneceğini ayarlayın.
        </p>

        {modulesLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : moduleVisibility.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <EyeOff className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Modül görünürlük ayarı bulunamadı</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {moduleVisibility.map((mod: any) => (
              <Card key={mod.id || mod.moduleId} data-testid={`card-module-${mod.moduleId}`}>
                <CardContent className="p-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <Settings className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium" data-testid={`text-module-id-${mod.moduleId}`}>{mod.moduleId}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={mod.displayLocation || "menu"}
                      onValueChange={(value) => {
                        moduleVisibilityMutation.mutate({
                          moduleId: mod.moduleId,
                          data: { displayLocation: value, roles: mod.roles },
                        });
                      }}
                      data-testid={`select-module-location-${mod.moduleId}`}
                    >
                      <SelectTrigger className="w-32" data-testid={`select-trigger-module-location-${mod.moduleId}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DISPLAY_LOCATIONS.map(loc => (
                          <SelectItem key={loc.value} value={loc.value} data-testid={`select-item-location-${loc.value}`}>
                            {loc.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); resetForm(); } else { setDialogOpen(true); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-widget-form">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingWidget ? "Widget Düzenle" : "Yeni Widget Oluştur"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="widget-title">Başlık</Label>
              <Input
                id="widget-title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Widget başlığı"
                data-testid="input-widget-title"
              />
            </div>

            <div>
              <Label>Widget Tipi</Label>
              <Select
                value={formData.widgetType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, widgetType: value }))}
              >
                <SelectTrigger data-testid="select-trigger-widget-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WIDGET_TYPES.map(wt => (
                    <SelectItem key={wt.value} value={wt.value} data-testid={`select-item-type-${wt.value}`}>
                      <div className="flex items-center gap-2">
                        <wt.icon className="h-4 w-4" />
                        {wt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Boyut</Label>
              <Select
                value={formData.size}
                onValueChange={(value) => setFormData(prev => ({ ...prev, size: value }))}
              >
                <SelectTrigger data-testid="select-trigger-widget-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIZE_OPTIONS.map(s => (
                    <SelectItem key={s.value} value={s.value} data-testid={`select-item-size-${s.value}`}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Veri Kaynağı</Label>
              <Select
                value={formData.dataSource}
                onValueChange={(value) => setFormData(prev => ({ ...prev, dataSource: value }))}
              >
                <SelectTrigger data-testid="select-trigger-data-source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATA_SOURCES.map(ds => (
                    <SelectItem key={ds.value} value={ds.value} data-testid={`select-item-source-${ds.value}`}>
                      <div className="flex items-center gap-2">
                        <ds.icon className="h-4 w-4" />
                        {ds.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Roller</Label>
              <p className="text-xs text-muted-foreground mb-2">Boş bırakılırsa tüm rollere gösterilir</p>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
                {ROLE_OPTIONS.map(role => (
                  <div key={role.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`role-${role.value}`}
                      checked={formData.roles.includes(role.value)}
                      onCheckedChange={() => toggleRole(role.value)}
                      data-testid={`checkbox-role-${role.value}`}
                    />
                    <Label htmlFor={`role-${role.value}`} className="text-sm cursor-pointer">
                      {role.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="widget-sort-order">Sıralama</Label>
              <Input
                id="widget-sort-order"
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                data-testid="input-widget-sort-order"
              />
            </div>

            <div>
              <Label className="mb-2 block">Önizleme</Label>
              <div className="flex justify-center p-4 bg-muted/30 rounded-md">
                <WidgetPreview formData={formData} />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }} data-testid="button-cancel-widget">
              İptal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-widget"
            >
              <Save className="h-4 w-4 mr-1" />
              {createMutation.isPending || updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}