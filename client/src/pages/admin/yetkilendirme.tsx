import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  Users, 
  ArrowLeft, 
  Building2, 
  Coffee, 
  Save,
  LayoutDashboard,
  ClipboardList,
  GraduationCap,
  Wrench,
  BarChart3,
  Calendar,
  MessageSquare,
  Settings,
  FileText,
  ChevronRight,
  Calculator,
  Package,
  FolderKanban,
  Plus,
  X
} from "lucide-react";
import { Link, Redirect } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROLE_GROUPS = {
  admin: { label: "Admin", color: "bg-red-500", roles: ["admin"], scope: "admin" },
  hq: { 
    label: "HQ Rolleri", 
    color: "bg-blue-500", 
    roles: ["muhasebe", "teknik", "destek", "coach", "satinalma", "yatirimci_hq"],
    scope: "hq"
  },
  fabrika: { label: "Fabrika", color: "bg-orange-500", roles: ["fabrika"], scope: "hq" },
  sube: { label: "Şube Rolleri", color: "bg-green-500", roles: ["supervisor", "supervisor_buddy", "barista", "bar_buddy", "stajyer", "yatirimci_branch"], scope: "branch" },
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  muhasebe: "Muhasebe",
  teknik: "Teknik",
  destek: "Destek",
  coach: "Coach",
  satinalma: "Satın Alma",
  yatirimci_hq: "Yatırımcı HQ",
  fabrika: "Fabrika",
  supervisor: "Supervisor",
  supervisor_buddy: "Supervisor Buddy",
  barista: "Barista",
  bar_buddy: "Bar Buddy",
  stajyer: "Stajyer",
  yatirimci_branch: "Yatırımcı Şube",
};

const MODULE_GROUPS = [
  {
    name: "Operasyonlar",
    icon: LayoutDashboard,
    modules: [
      { key: "dashboard", label: "Dashboard" },
      { key: "tasks", label: "Görevler" },
      { key: "checklists", label: "Checklistler" },
      { key: "branches", label: "Şubeler" },
    ]
  },
  {
    name: "Ekipman & Arıza",
    icon: Wrench,
    modules: [
      { key: "equipment", label: "Ekipman" },
      { key: "faults", label: "Arıza Yönetimi" },
      { key: "equipment_analytics", label: "Ekipman Analitik" },
    ]
  },
  {
    name: "Kalite & Denetim",
    icon: Shield,
    modules: [
      { key: "quality_audit", label: "Kalite Denetimi" },
      { key: "audit_templates", label: "Denetim Şablonları" },
      { key: "capa", label: "CAPA Yönetimi" },
    ]
  },
  {
    name: "Akademi Paketi",
    icon: GraduationCap,
    modules: [
      { key: "academy.general", label: "Genel Eğitimler" },
      { key: "academy.hq", label: "HQ Yönetim Paneli" },
      { key: "academy.analytics", label: "Analitik & Raporlar" },
      { key: "academy.badges", label: "Rozetler & Başarılar" },
      { key: "academy.certificates", label: "Sertifikalar" },
      { key: "academy.leaderboard", label: "Sıralama" },
      { key: "academy.quizzes", label: "Quizler & Sınavlar" },
      { key: "academy.learning_paths", label: "Öğrenme Yolları" },
      { key: "academy.ai", label: "AI Asistan" },
      { key: "academy.social", label: "Sosyal & Takımlar" },
      { key: "academy.supervisor", label: "Supervisor Görünümü" },
    ]
  },
  {
    name: "Vardiya & İK",
    icon: Calendar,
    modules: [
      { key: "shifts", label: "Vardiyalar" },
      { key: "shift_planning", label: "Vardiya Planlama" },
      { key: "hr", label: "İK Yönetimi" },
      { key: "attendance", label: "Devam Takibi" },
      { key: "leave_requests", label: "İzin Talepleri" },
    ]
  },
  {
    name: "Muhasebe & Mali",
    icon: Calculator,
    modules: [
      { key: "accounting", label: "Muhasebe" },
    ]
  },
  {
    name: "Raporlar",
    icon: BarChart3,
    modules: [
      { key: "reports", label: "Performans" },
      { key: "e2e_reports", label: "E2E Raporlar" },
      { key: "cash_reports", label: "Kasa Raporları" },
      { key: "hr_reports", label: "İK Raporları" },
    ]
  },
  {
    name: "Kayıp & Eşya",
    icon: Package,
    modules: [
      { key: "lost_found", label: "Kayıp Eşya" },
      { key: "lost_found_hq", label: "Kayıp Eşya (HQ)" },
    ]
  },
  {
    name: "Projeler",
    icon: FolderKanban,
    modules: [
      { key: "projects", label: "Projeler" },
      { key: "new_branch_projects", label: "Yeni Şube Açılış" },
    ]
  },
  {
    name: "Destek & İletişim",
    icon: MessageSquare,
    modules: [
      { key: "support", label: "Destek Talepleri" },
      { key: "notifications", label: "Bildirimler" },
      { key: "announcements", label: "Duyurular" },
      { key: "messages", label: "Mesajlar" },
    ]
  },
  {
    name: "Yönetim & Admin",
    icon: Settings,
    modules: [
      { key: "settings", label: "Ayarlar" },
      { key: "users", label: "Kullanıcılar" },
      { key: "menu_management", label: "Menü Yönetimi" },
      { key: "content_management", label: "İçerik Yönetimi" },
      { key: "admin_panel", label: "Admin Panel" },
      { key: "authorization", label: "Yetkilendirme" },
    ]
  },
];

type PermissionState = Record<string, { view: boolean; edit: boolean }>;

export default function AdminYetkilendirme() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<PermissionState>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [isNewRoleDialogOpen, setIsNewRoleDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleScope, setNewRoleScope] = useState<"admin" | "hq" | "branch">("hq");
  const [newRoleDescription, setNewRoleDescription] = useState("");

  const { data: rolePermissions = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/role-permissions", selectedRole],
    queryFn: async () => {
      const response = await fetch(`/api/admin/role-permissions?role=${encodeURIComponent(selectedRole || '')}`);
      if (!response.ok) throw new Error('Failed to fetch permissions');
      return response.json();
    },
    enabled: user?.role === "admin" && !!selectedRole,
  });

  useEffect(() => {
    if (selectedRole) {
      // Initialize all modules with default view=false, edit=false
      const defaultPermissions: PermissionState = {};
      
      MODULE_GROUPS.forEach((group) => {
        group.modules.forEach((mod) => {
          defaultPermissions[mod.key] = { view: false, edit: false };
        });
      });
      
      // Override with loaded permissions
      if (rolePermissions.length > 0) {
        rolePermissions.forEach((perm: any) => {
          const actions = perm.actions || [];
          defaultPermissions[perm.module] = {
            view: actions.includes('view') || perm.canView || false,
            edit: actions.includes('edit') || perm.canEdit || false,
          };
        });
      }
      
      setPermissions(defaultPermissions);
      setHasChanges(false);
    }
  }, [rolePermissions, selectedRole]);

  if (user?.role !== "admin") {
    return <Redirect to="/" />;
  }

  const saveMutation = useMutation({
    mutationFn: (data: { role: string; permissions: PermissionState }) => {
      // Convert {view, edit} format to {actions} format for storage
      const updates = Object.entries(data.permissions).map(([module, perms]) => ({
        role: data.role,
        module,
        actions: [
          ...(perms.view ? ['view'] : []),
          ...(perms.edit ? ['edit'] : []),
        ],
      }));
      return apiRequest("PUT", "/api/admin/role-permissions", updates);
    },
    onSuccess: () => {
      // Invalidate permission queries
      queryClient.invalidateQueries({ queryKey: ["/api/admin/role-permissions"] });
      // Invalidate all sidebar-menu caches so users see updated menus
      queryClient.invalidateQueries({ queryKey: ["sidebar-menu"] });
      setHasChanges(false);
      toast({ title: "Yetkiler kaydedildi", description: "Menü değişiklikleri etkilenen kullanıcılar için yenilenecek." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Yetkiler kaydedilemedi", variant: "destructive" });
    },
  });

  const handleToggle = (moduleKey: string, type: "view" | "edit") => {
    setPermissions(prev => {
      const current = prev[moduleKey] || { view: false, edit: false };
      const updated = { ...current, [type]: !current[type] };
      if (type === "view" && !updated.view) {
        updated.edit = false;
      }
      if (type === "edit" && updated.edit) {
        updated.view = true;
      }
      return { ...prev, [moduleKey]: updated };
    });
    setHasChanges(true);
  };

  const getPermission = (moduleKey: string, type: "view" | "edit") => {
    return permissions[moduleKey]?.[type] ?? false;
  };

  const handleSave = () => {
    if (selectedRole) {
      saveMutation.mutate({ role: selectedRole, permissions });
    }
  };

  const createRoleMutation = useMutation({
    mutationFn: (data: { roleName: string; scope: string; description: string }) =>
      apiRequest("POST", "/api/admin/roles", data),
    onSuccess: () => {
      toast({ title: "Rol oluşturuldu" });
      setIsNewRoleDialogOpen(false);
      setNewRoleName("");
      setNewRoleScope("hq");
      setNewRoleDescription("");
      window.location.reload();
    },
    onError: (err) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const handleCreateRole = () => {
    if (!newRoleName.trim()) {
      toast({ title: "Hata", description: "Rol adı gerekli", variant: "destructive" });
      return;
    }
    createRoleMutation.mutate({ roleName: newRoleName.trim().toLowerCase(), scope: newRoleScope, description: newRoleDescription });
  };

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    setPermissions({});
    setHasChanges(false);
    setShowPermissions(true);
  };

  const handleBackToRoles = () => {
    setShowPermissions(false);
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col md:flex-row">
      {/* Rol Listesi - Mobilde tam ekran, masaüstünde sidebar */}
      <div className={`${showPermissions ? 'hidden md:block' : 'block'} w-full md:w-56 md:border-r bg-muted/30 p-3 space-y-4 md:h-full`}>
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Link href="/admin">
              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-back-admin">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h2 className="font-semibold text-sm">Roller</h2>
          </div>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={() => setIsNewRoleDialogOpen(true)}
            data-testid="button-new-role"
            title="Yeni Rol Ekle"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-200px)] md:h-[calc(100%-60px)]">
          <div className="space-y-4">
            {Object.entries(ROLE_GROUPS).map(([groupKey, group]) => (
              <div key={groupKey}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${group.color}`} />
                  <span className="text-xs font-medium text-muted-foreground">{group.label}</span>
                </div>
                <div className="space-y-1">
                  {group.roles.map(role => (
                    <button
                      key={role}
                      onClick={() => handleRoleSelect(role)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${
                        selectedRole === role 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-muted"
                      }`}
                      data-testid={`button-role-${role}`}
                    >
                      <span>{ROLE_LABELS[role] || role}</span>
                      <ChevronRight className="h-4 w-4 md:hidden" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* İzin Ayarları - Mobilde tam ekran, masaüstünde ana alan */}
      <div className={`${showPermissions ? 'block' : 'hidden md:block'} flex-1 p-4 overflow-auto`}>
        {selectedRole ? (
          <>
            <div className="flex items-center justify-between mb-4 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 md:hidden flex-shrink-0" 
                  onClick={handleBackToRoles}
                  data-testid="button-back-roles"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0">
                  <h1 className="text-lg md:text-xl font-semibold flex items-center gap-2">
                    <Shield className="h-5 w-5 flex-shrink-0 hidden md:block" />
                    <span className="truncate">{ROLE_LABELS[selectedRole]} Yetkileri</span>
                  </h1>
                  <p className="text-xs md:text-sm text-muted-foreground hidden md:block">
                    Bu rol için sayfa ve modül erişim izinlerini ayarlayın
                  </p>
                </div>
              </div>
              {hasChanges && (
                <Button 
                  onClick={handleSave} 
                  disabled={saveMutation.isPending} 
                  size="sm"
                  className="flex-shrink-0"
                  data-testid="button-save-permissions"
                >
                  <Save className="h-4 w-4 mr-1 md:mr-2" />
                  <span className="hidden md:inline">{saveMutation.isPending ? "Kaydediliyor..." : "Kaydet"}</span>
                  <span className="md:hidden">Kaydet</span>
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {MODULE_GROUPS.map((group) => (
                <Card key={group.name}>
                  <CardHeader className="py-2 md:py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <group.icon className="h-4 w-4" />
                      {group.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pb-2 md:pb-4">
                    <div className="space-y-1 md:space-y-2">
                      {group.modules.map((module, idx) => (
                        <div key={module.key}>
                          {idx > 0 && <Separator className="my-1 md:my-2" />}
                          <div className="flex items-center justify-between py-1">
                            <span className="text-xs md:text-sm">{module.label}</span>
                            <div className="flex items-center gap-2 md:gap-4">
                              <div className="flex items-center gap-1 md:gap-2">
                                <span className="text-[10px] md:text-xs text-muted-foreground">Gör</span>
                                <Switch
                                  checked={getPermission(module.key, "view")}
                                  onCheckedChange={() => handleToggle(module.key, "view")}
                                  className="scale-75 md:scale-100"
                                  data-testid={`switch-${module.key}-view`}
                                />
                              </div>
                              <div className="flex items-center gap-1 md:gap-2">
                                <span className="text-[10px] md:text-xs text-muted-foreground">Düz</span>
                                <Switch
                                  checked={getPermission(module.key, "edit")}
                                  onCheckedChange={() => handleToggle(module.key, "edit")}
                                  disabled={!getPermission(module.key, "view")}
                                  className="scale-75 md:scale-100"
                                  data-testid={`switch-${module.key}-edit`}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <div className="hidden md:flex h-full items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Yetkileri düzenlemek için bir rol seçin</p>
            </div>
          </div>
        )}
      </div>

      {/* Rol Ekle Modal */}
      <Dialog open={isNewRoleDialogOpen} onOpenChange={setIsNewRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Rol Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rol Adı</Label>
              <Input
                placeholder="örn: lead_barista, quality_manager"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                data-testid="input-role-name"
              />
            </div>
            <div>
              <Label>Rol Kapsamı</Label>
              <Select value={newRoleScope} onValueChange={(v) => setNewRoleScope(v as "admin" | "hq" | "branch")}>
                <SelectTrigger data-testid="select-role-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="hq">HQ</SelectItem>
                  <SelectItem value="branch">Şube</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Açıklama (İsteğe Bağlı)</Label>
              <Input
                placeholder="Rol için açıklama girin"
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
                data-testid="input-role-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewRoleDialogOpen(false)}>İptal</Button>
            <Button onClick={handleCreateRole} disabled={createRoleMutation.isPending} data-testid="button-create-role">
              {createRoleMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
