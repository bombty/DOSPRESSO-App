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
  FileText
} from "lucide-react";
import { Link, Redirect } from "wouter";

const ROLE_GROUPS = {
  admin: { label: "Admin", color: "bg-red-500", roles: ["admin"] },
  hq: { 
    label: "HQ Rolleri", 
    color: "bg-blue-500", 
    roles: ["muhasebe", "teknik", "destek", "coach", "satinalma", "yatirimci_hq"] 
  },
  fabrika: { label: "Fabrika", color: "bg-orange-500", roles: ["fabrika"] },
  sube: { label: "Şube Rolleri", color: "bg-green-500", roles: ["supervisor", "supervisor_buddy", "barista"] },
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
    name: "Akademi",
    icon: GraduationCap,
    modules: [
      { key: "academy", label: "Akademi" },
      { key: "academy_management", label: "Akademi Yönetimi" },
      { key: "knowledge_base", label: "Bilgi Bankası" },
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
    name: "Destek & İletişim",
    icon: MessageSquare,
    modules: [
      { key: "support", label: "Destek Talepleri" },
      { key: "notifications", label: "Bildirimler" },
      { key: "announcements", label: "Duyurular" },
    ]
  },
  {
    name: "Yönetim",
    icon: Settings,
    modules: [
      { key: "settings", label: "Ayarlar" },
      { key: "users", label: "Kullanıcılar" },
      { key: "menu_management", label: "Menü Yönetimi" },
      { key: "content_management", label: "İçerik Yönetimi" },
    ]
  },
];

type PermissionState = Record<string, { view: boolean; edit: boolean }>;

export default function AdminYetkilendirme() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<string>("supervisor");
  const [permissions, setPermissions] = useState<PermissionState>({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data: rolePermissions = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/role-permissions", selectedRole],
    enabled: user?.role === "admin",
  });

  useEffect(() => {
    if (rolePermissions.length > 0) {
      const loaded: PermissionState = {};
      rolePermissions.forEach((perm: any) => {
        loaded[perm.moduleKey] = {
          view: perm.canView ?? false,
          edit: perm.canEdit ?? false,
        };
      });
      setPermissions(loaded);
      setHasChanges(false);
    }
  }, [rolePermissions, selectedRole]);

  if (user?.role !== "admin") {
    return <Redirect to="/" />;
  }

  const saveMutation = useMutation({
    mutationFn: (data: { role: string; permissions: PermissionState }) =>
      apiRequest("POST", "/api/admin/role-permissions/bulk", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/role-permissions"] });
      setHasChanges(false);
      toast({ title: "Yetkiler kaydedildi" });
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
    saveMutation.mutate({ role: selectedRole, permissions });
  };

  return (
    <div className="flex h-[calc(100vh-120px)]">
      <div className="w-56 border-r bg-muted/30 p-3 space-y-4">
        <div className="flex items-center gap-2">
          <Link href="/admin">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h2 className="font-semibold text-sm">Roller</h2>
        </div>

        <ScrollArea className="h-[calc(100%-60px)]">
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
                      onClick={() => {
                        setSelectedRole(role);
                        setPermissions({});
                        setHasChanges(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedRole === role 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-muted"
                      }`}
                      data-testid={`button-role-${role}`}
                    >
                      {ROLE_LABELS[role] || role}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 p-4 overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {ROLE_LABELS[selectedRole]} Yetkileri
            </h1>
            <p className="text-sm text-muted-foreground">
              Bu rol için sayfa ve modül erişim izinlerini ayarlayın
            </p>
          </div>
          {hasChanges && (
            <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-permissions">
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {MODULE_GROUPS.map((group) => (
            <Card key={group.name}>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <group.icon className="h-4 w-4" />
                  {group.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {group.modules.map((module, idx) => (
                    <div key={module.key}>
                      {idx > 0 && <Separator className="my-2" />}
                      <div className="flex items-center justify-between py-1">
                        <span className="text-sm">{module.label}</span>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Görüntüle</span>
                            <Switch
                              checked={getPermission(module.key, "view")}
                              onCheckedChange={() => handleToggle(module.key, "view")}
                              data-testid={`switch-${module.key}-view`}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Düzenle</span>
                            <Switch
                              checked={getPermission(module.key, "edit")}
                              onCheckedChange={() => handleToggle(module.key, "edit")}
                              disabled={!getPermission(module.key, "view")}
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
      </div>
    </div>
  );
}
