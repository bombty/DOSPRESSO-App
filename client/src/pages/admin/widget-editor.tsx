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
import { ConfirmDeleteDialog, useConfirmDelete } from "@/components/confirm-delete-dialog";
import type { DashboardWidgetItem } from "@shared/schema";
import {
  LayoutGrid,
  Plus,
  Trash2,
  Pencil,
  GripVertical,
  Target,
  ClipboardList,
  GraduationCap,
  Wrench,
  BarChart3,
  Settings,
  BookOpen,
  Users,
  Package,
  ShoppingCart,
  Bell,
  Calendar,
  Shield,
  Briefcase,
  Heart,
  Star,
  Zap,
  TrendingUp,
  FileText,
  MessageSquare,
  Award,
  CheckCircle2,
  Save,
  type LucideIcon
} from "lucide-react";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";

const ICON_OPTIONS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "Target", label: "Target", icon: Target },
  { value: "ClipboardList", label: "ClipboardList", icon: ClipboardList },
  { value: "GraduationCap", label: "GraduationCap", icon: GraduationCap },
  { value: "Wrench", label: "Wrench", icon: Wrench },
  { value: "BarChart3", label: "BarChart3", icon: BarChart3 },
  { value: "Settings", label: "Settings", icon: Settings },
  { value: "BookOpen", label: "BookOpen", icon: BookOpen },
  { value: "Users", label: "Users", icon: Users },
  { value: "Package", label: "Package", icon: Package },
  { value: "ShoppingCart", label: "ShoppingCart", icon: ShoppingCart },
  { value: "Bell", label: "Bell", icon: Bell },
  { value: "Calendar", label: "Calendar", icon: Calendar },
  { value: "Shield", label: "Shield", icon: Shield },
  { value: "Briefcase", label: "Briefcase", icon: Briefcase },
  { value: "Heart", label: "Heart", icon: Heart },
  { value: "Star", label: "Star", icon: Star },
  { value: "Zap", label: "Zap", icon: Zap },
  { value: "TrendingUp", label: "TrendingUp", icon: TrendingUp },
  { value: "FileText", label: "FileText", icon: FileText },
  { value: "MessageSquare", label: "MessageSquare", icon: MessageSquare },
  { value: "Award", label: "Award", icon: Award },
  { value: "CheckCircle2", label: "CheckCircle2", icon: CheckCircle2 },
];

const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  ICON_OPTIONS.map(o => [o.value, o.icon])
);

const ROLE_OPTIONS = [
  { value: "ceo", label: "CEO" },
  { value: "cgo", label: "CGO" },
  { value: "admin", label: "Admin" },
  { value: "coach", label: "Coach" },
  { value: "trainer", label: "Trainer" },
  { value: "supervisor", label: "Supervisor" },
  { value: "mudur", label: "Müdür" },
  { value: "barista", label: "Barista" },
  { value: "bar_buddy", label: "Bar Buddy" },
  { value: "stajyer", label: "Stajyer" },
  { value: "teknik", label: "Teknik" },
  { value: "ekipman_teknik", label: "Ekipman Teknik" },
  { value: "muhasebe", label: "Muhasebe" },
  { value: "muhasebe_ik", label: "Muhasebe & İK" },
  { value: "satinalma", label: "Satın Alma" },
  { value: "marketing", label: "Marketing" },
  { value: "pazarlama", label: "Pazarlama" },
  { value: "destek", label: "Destek" },
  { value: "kalite_kontrol", label: "Kalite Kontrol" },
  { value: "fabrika", label: "Fabrika" },
  { value: "fabrika_mudur", label: "Fabrika Müdürü" },
  { value: "fabrika_sorumlu", label: "Fabrika Sorumlu" },
  { value: "yatirimci_hq", label: "Yatırımcı HQ" },
  { value: "yatirimci_branch", label: "Yatırımcı Branch" },
  { value: "ik", label: "İK" },
];

const TYPE_OPTIONS = [
  { value: "link", label: "Link" },
  { value: "shortcut", label: "Kısayol" },
  { value: "counter", label: "Sayaç" },
  { value: "info", label: "Bilgi" },
];

const SYSTEM_PAGES = [
  { value: "/gorevler", label: "Görevler" },
  { value: "/checklistler", label: "Checklistler" },
  { value: "/akademi", label: "Akademi / Eğitim" },
  { value: "/ekipman/ariza", label: "Arızalar" },
  { value: "/raporlar", label: "Raporlar" },
  { value: "/vardiyalar", label: "Vardiyalar" },
  { value: "/satinalma", label: "Satınalma" },
  { value: "/muhasebe", label: "Muhasebe" },
  { value: "/performans", label: "Performans" },
  { value: "/receteler", label: "Reçeteler" },
  { value: "/bilgi-bankasi", label: "Bilgi Bankası" },
  { value: "/operasyon", label: "Operasyon" },
  { value: "/crm", label: "CRM" },
  { value: "/kayip-esya", label: "Kayıp Eşya" },
  { value: "/destek", label: "Destek" },
  { value: "/subeler", label: "Şubeler" },
  { value: "/denetimler", label: "Denetimler" },
  { value: "/devam-takibi", label: "Devam Takibi" },
  { value: "/mesaj", label: "Mesajlar" },
  { value: "/ceo-command-center", label: "Komuta Merkezi" },
  { value: "/franchise-acilis", label: "Franchise Açılış" },
  { value: "/fabrika", label: "Fabrika" },
  { value: "/kalite-kontrol-dashboard", label: "Kalite Kontrol" },
  { value: "/ayin-elemani", label: "Ayın Elemanı" },
  { value: "/kampanya-yonetimi", label: "Kampanya Yönetimi" },
  { value: "/sikayetler", label: "Şikayetler" },
  { value: "/mali-yonetim", label: "Mali Yönetim" },
];

interface WidgetFormData {
  title: string;
  subtitle: string;
  type: string;
  icon: string;
  url: string;
  targetRoles: string[];
  displayOrder: number;
  isActive: boolean;
}

const defaultFormData: WidgetFormData = {
  title: "",
  subtitle: "",
  type: "link",
  icon: "Target",
  url: "",
  targetRoles: [],
  displayOrder: 0,
  isActive: true,
};

export default function WidgetEditor() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<DashboardWidgetItem | null>(null);
  const [formData, setFormData] = useState<WidgetFormData>(defaultFormData);
  const [allRolesChecked, setAllRolesChecked] = useState(true);
  const { deleteState, requestDelete, cancelDelete, confirmDelete } = useConfirmDelete();

  const { data: widgets = [], isLoading, isError, refetch } = useQuery<DashboardWidgetItem[]>({
    queryKey: ["/api/admin/dashboard-widgets"],
  });

  const createMutation = useMutation({
    mutationFn: (data: WidgetFormData) =>
      apiRequest("POST", "/api/admin/dashboard-widgets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard-widgets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-widgets"] });
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
      apiRequest("PATCH", `/api/admin/dashboard-widgets/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard-widgets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-widgets"] });
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
      apiRequest("DELETE", `/api/admin/dashboard-widgets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard-widgets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-widgets"] });
      toast({ title: "Widget silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Widget silinemedi", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/dashboard-widgets/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard-widgets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-widgets"] });
    },
  });

  if (user?.role !== "admin" && user?.role !== "ceo") {
    return <Redirect to="/" />;
  }

  function resetForm() {
    setFormData(defaultFormData);
    setEditingWidget(null);
    setAllRolesChecked(true);
  }

  function openCreateDialog() {
    resetForm();
    setDialogOpen(true);
  }

  function openEditDialog(widget: DashboardWidgetItem) {
    setEditingWidget(widget);
    const roles = widget.targetRoles || [];
    const isAllRoles = roles.length === 0;
    setAllRolesChecked(isAllRoles);
    setFormData({
      title: widget.title,
      subtitle: widget.subtitle || "",
      type: widget.type,
      icon: widget.icon || "Target",
      url: widget.url || "",
      targetRoles: roles,
      displayOrder: widget.displayOrder,
      isActive: widget.isActive,
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!formData.title?.trim()) {
      toast({ title: "Hata", description: "Başlık zorunludur", variant: "destructive" });
      return;
    }
    const submitData = {
      ...formData,
      targetRoles: allRolesChecked ? [] : formData.targetRoles,
    };
    if (editingWidget) {
      updateMutation.mutate({ id: editingWidget.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  }

  function toggleRole(role: string) {
    setFormData(prev => ({
      ...prev,
      targetRoles: prev.targetRoles.includes(role)
        ? prev.targetRoles.filter(r => r !== role)
        : [...prev.targetRoles, role],
    }));
  }

  const sortedWidgets = [...widgets].sort((a, b) => a.displayOrder - b.displayOrder);

  
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold" data-testid="text-widget-editor-title">Hero Widget Editör</h1>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-create-hero-widget">
          <Plus className="h-4 w-4 mr-1" />
          Yeni Widget
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Dashboard hero alanında görünen kısayol widget'larını yönetin. Boş hedef roller = tüm rollere gösterilir.
      </p>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : sortedWidgets.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <LayoutGrid className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Henüz hero widget oluşturulmamış</p>
            <Button variant="outline" className="mt-3" onClick={openCreateDialog} data-testid="button-create-hero-widget-empty">
              <Plus className="h-4 w-4 mr-1" />
              İlk Widget'ı Oluştur
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedWidgets.map((widget) => {
            const IconComp = ICON_MAP[widget.icon || ""] || Target;
            return (
              <Card key={widget.id} className={`${!widget.isActive ? "opacity-60" : ""}`} data-testid={`card-hero-widget-${widget.id}`}>
                <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <IconComp className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <span className="font-medium text-sm truncate block" data-testid={`text-hero-widget-title-${widget.id}`}>{widget.title}</span>
                      {widget.subtitle && (
                        <span className="text-xs text-muted-foreground truncate block">{widget.subtitle}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Switch
                      checked={widget.isActive}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: widget.id, isActive: checked })}
                      data-testid={`switch-hero-widget-active-${widget.id}`}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" data-testid={`badge-hero-widget-type-${widget.id}`}>
                      {TYPE_OPTIONS.find(t => t.value === widget.type)?.label || widget.type}
                    </Badge>
                    <Badge variant="outline">
                      #{widget.displayOrder}
                    </Badge>
                    {widget.icon && (
                      <Badge variant="outline">
                        {widget.icon}
                      </Badge>
                    )}
                  </div>
                  {widget.url && (
                    <div className="text-xs text-muted-foreground truncate">
                      URL: {widget.url}
                    </div>
                  )}
                  {widget.targetRoles && widget.targetRoles.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {widget.targetRoles.map(role => (
                        <Badge key={role} variant="outline" className="text-xs" data-testid={`badge-hero-widget-role-${widget.id}-${role}`}>
                          {ROLE_OPTIONS.find(r => r.value === role)?.label || role}
                        </Badge>
                      ))}
                    </div>
                  ) : (
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
                      data-testid={`button-edit-hero-widget-${widget.id}`}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Düzenle
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => requestDelete(widget.id, widget.title)}
                      data-testid={`button-delete-hero-widget-${widget.id}`}
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

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); resetForm(); } else { setDialogOpen(true); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-hero-widget-form">
          <DialogHeader>
            <DialogTitle data-testid="text-hero-widget-dialog-title">
              {editingWidget ? "Widget Düzenle" : "Yeni Widget Oluştur"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="hw-title">Başlık</Label>
              <Input
                id="hw-title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Widget başlığı"
                data-testid="input-hero-widget-title"
              />
            </div>

            <div>
              <Label htmlFor="hw-subtitle">Alt Başlık</Label>
              <Input
                id="hw-subtitle"
                value={formData.subtitle}
                onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                placeholder="Opsiyonel alt başlık"
                data-testid="input-hero-widget-subtitle"
              />
            </div>

            <div>
              <Label>Tip</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger data-testid="select-trigger-hero-widget-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map(t => (
                    <SelectItem key={t.value} value={t.value} data-testid={`select-item-hw-type-${t.value}`}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>İkon</Label>
              <Select
                value={formData.icon}
                onValueChange={(value) => setFormData(prev => ({ ...prev, icon: value }))}
              >
                <SelectTrigger data-testid="select-trigger-hero-widget-icon">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map(ico => {
                    const IcoComp = ico.icon;
                    return (
                      <SelectItem key={ico.value} value={ico.value} data-testid={`select-item-hw-icon-${ico.value}`}>
                        <div className="flex items-center gap-2">
                          <IcoComp className="h-4 w-4" />
                          {ico.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>URL / Sayfa</Label>
              <Select
                value={SYSTEM_PAGES.some(p => p.value === formData.url) ? formData.url : "__custom__"}
                onValueChange={(value) => {
                  if (value === "__custom__") {
                    setFormData(prev => ({ ...prev, url: "" }));
                  } else {
                    setFormData(prev => ({ ...prev, url: value }));
                  }
                }}
              >
                <SelectTrigger data-testid="select-trigger-hero-widget-url">
                  <SelectValue placeholder="Sayfa seçin" />
                </SelectTrigger>
                <SelectContent>
                  {SYSTEM_PAGES.map(page => (
                    <SelectItem key={page.value} value={page.value} data-testid={`select-item-hw-page-${page.value.replace(/\//g, '-')}`}>
                      {page.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom__" data-testid="select-item-hw-page-custom">
                    Özel URL
                  </SelectItem>
                </SelectContent>
              </Select>
              {!SYSTEM_PAGES.some(p => p.value === formData.url) && (
                <Input
                  className="mt-2"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="/ozel-sayfa-yolu"
                  data-testid="input-hero-widget-custom-url"
                />
              )}
            </div>

            <div>
              <Label htmlFor="hw-order">Sıralama</Label>
              <Input
                id="hw-order"
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))}
                data-testid="input-hero-widget-order"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="hw-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                data-testid="switch-hero-widget-form-active"
              />
              <Label htmlFor="hw-active">Aktif</Label>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Checkbox
                  id="hw-all-roles"
                  checked={allRolesChecked}
                  onCheckedChange={(checked) => {
                    setAllRolesChecked(!!checked);
                    if (checked) {
                      setFormData(prev => ({ ...prev, targetRoles: [] }));
                    }
                  }}
                  data-testid="checkbox-hero-widget-all-roles"
                />
                <Label htmlFor="hw-all-roles" className="cursor-pointer font-medium">Tüm Roller</Label>
              </div>
              {!allRolesChecked && (
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
                  {ROLE_OPTIONS.map(role => (
                    <div key={role.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`hw-role-${role.value}`}
                        checked={formData.targetRoles.includes(role.value)}
                        onCheckedChange={() => toggleRole(role.value)}
                        data-testid={`checkbox-hero-widget-role-${role.value}`}
                      />
                      <Label htmlFor={`hw-role-${role.value}`} className="text-sm cursor-pointer">
                        {role.label}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }} data-testid="button-hero-widget-cancel">
              İptal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-hero-widget-save"
            >
              <Save className="h-4 w-4 mr-1" />
              {editingWidget ? "Güncelle" : "Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteState.open}
        onOpenChange={(open) => { if (!open) cancelDelete(); }}
        title="Widget Sil"
        description={`"${deleteState.itemName}" widget'ını silmek istediğinize emin misiniz?`}
        onConfirm={() => {
          if (deleteState.itemId !== null) {
            deleteMutation.mutate(deleteState.itemId as number);
          }
          confirmDelete();
        }}
      />
    </div>
  );
}
