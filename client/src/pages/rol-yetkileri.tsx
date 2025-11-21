import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Shield, Building2, Factory, Save } from "lucide-react";
import { UserRole, PERMISSIONS, type UserRoleType, type PermissionModule, type PermissionAction } from "@shared/schema";

// Rol grupları
const ROLE_GROUPS = {
  hq: {
    title: "Merkez Ofis Rolleri",
    icon: Building2,
    roles: [
      UserRole.ADMIN,
      UserRole.MUHASEBE,
      UserRole.SATINALMA,
      UserRole.COACH,
      UserRole.TEKNIK,
      UserRole.DESTEK,
      UserRole.YATIRIMCI_HQ,
    ] as UserRoleType[],
  },
  branch: {
    title: "Şube Rolleri",
    icon: Shield,
    roles: [
      UserRole.SUPERVISOR,
      UserRole.SUPERVISOR_BUDDY,
      UserRole.BARISTA,
      UserRole.BAR_BUDDY,
      UserRole.STAJYER,
      UserRole.YATIRIMCI_BRANCH,
    ] as UserRoleType[],
  },
  factory: {
    title: "Fabrika Rolleri",
    icon: Factory,
    roles: [
      UserRole.FABRIKA,
    ] as UserRoleType[],
  },
};

// Rol etiketleri (Türkçe)
const ROLE_LABELS: Record<UserRoleType, string> = {
  admin: "Sistem Yöneticisi",
  muhasebe: "Muhasebe",
  satinalma: "Satınalma",
  coach: "Coach",
  teknik: "Teknik",
  destek: "Destek",
  fabrika: "Fabrika",
  yatirimci_hq: "Yatırımcı (HQ)",
  stajyer: "Stajyer",
  bar_buddy: "Bar Buddy",
  barista: "Barista",
  supervisor_buddy: "Supervisor Buddy",
  supervisor: "Supervisor (Şube Müdürü)",
  yatirimci_branch: "Yatırımcı (Şube)",
};

// Modül etiketleri (Türkçe)
const MODULE_LABELS: Record<PermissionModule, string> = {
  dashboard: "Panel",
  tasks: "Görevler",
  checklists: "Kontrol Listeleri",
  equipment: "Ekipmanlar",
  equipment_faults: "Ekipman Arızaları",
  knowledge_base: "Bilgi Bankası",
  ai_assistant: "AI Asistan",
  performance: "Performans",
  attendance: "Devam/Yoklama",
  branches: "Şubeler",
  users: "Kullanıcılar",
  employees: "Personel",
  hr: "İnsan Kaynakları",
  training: "Eğitimler",
  schedules: "Vardiyalar",
  messages: "Mesajlar",
  announcements: "Duyurular",
  complaints: "Şikayetler",
  leave_requests: "İzin Talepleri",
  overtime_requests: "Mesai Talepleri",
};

// Aksiyon etiketleri (Türkçe)
const ACTION_LABELS: Record<PermissionAction, string> = {
  view: "Görüntüle",
  create: "Oluştur",
  edit: "Düzenle",
  delete: "Sil",
  approve: "Onayla",
};

export default function RolYetkileri() {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState(PERMISSIONS);
  const [hasChanges, setHasChanges] = useState(false);

  // Yetki toggle fonksiyonu
  const togglePermission = (
    role: UserRoleType,
    module: PermissionModule,
    action: PermissionAction
  ) => {
    setPermissions(prev => {
      const rolePerms = prev[role];
      const modulePerms = rolePerms[module] || [];
      
      const newModulePerms = modulePerms.includes(action)
        ? modulePerms.filter(a => a !== action)
        : [...modulePerms, action];

      return {
        ...prev,
        [role]: {
          ...rolePerms,
          [module]: newModulePerms,
        },
      };
    });
    setHasChanges(true);
  };

  // Değişiklikleri kaydet
  const handleSave = () => {
    // TODO: Backend API'sine gönder
    toast({
      title: "Başarılı",
      description: "Rol yetkileri güncellendi",
    });
    setHasChanges(false);
  };

  // Tüm aksiyonlar
  const allActions: PermissionAction[] = ['view', 'create', 'edit', 'delete', 'approve'];

  // Tüm modüller
  const allModules: PermissionModule[] = Object.keys(MODULE_LABELS) as PermissionModule[];

  return (
    <div className="container mx-auto py-6 space-y-6" data-testid="page-rol-yetkileri">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rol ve Yetki Yönetimi</h1>
          <p className="text-muted-foreground mt-1">
            Sistem rollerinin modül ve işlem yetkilerini yönetin
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} data-testid="button-save-permissions">
            <Save className="w-4 h-4 mr-2" />
            Değişiklikleri Kaydet
          </Button>
        )}
      </div>

      <Accordion type="multiple" defaultValue={["hq", "branch"]} className="space-y-4">
        {Object.entries(ROLE_GROUPS).map(([groupKey, group]) => {
          const Icon = group.icon;
          return (
            <AccordionItem
              key={groupKey}
              value={groupKey}
              className="border rounded-lg"
              data-testid={`accordion-group-${groupKey}`}
            >
              <AccordionTrigger className="px-6 hover:no-underline">
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-primary" />
                  <span className="text-lg font-semibold">{group.title}</span>
                  <Badge variant="secondary">{group.roles.length} Rol</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-6 mt-4">
                  {group.roles.map(role => (
                    <Card key={role} data-testid={`card-role-${role}`}>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          {ROLE_LABELS[role]}
                        </CardTitle>
                        <CardDescription>
                          Rol kodu: <code className="text-xs bg-muted px-1 py-0.5 rounded">{role}</code>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {allModules.map(module => {
                            const modulePerms = permissions[role]?.[module] || [];
                            if (modulePerms.length === 0 && role !== UserRole.ADMIN) {
                              // Yetkisi olmayan modülleri gizle (admin hariç)
                              return null;
                            }
                            
                            return (
                              <div 
                                key={module} 
                                className="grid grid-cols-[200px_1fr] gap-4 items-center border-b pb-3 last:border-b-0"
                                data-testid={`module-${role}-${module}`}
                              >
                                <Label className="font-medium text-sm">
                                  {MODULE_LABELS[module]}
                                </Label>
                                <div className="flex flex-wrap gap-4">
                                  {allActions.map(action => {
                                    const hasPermission = modulePerms.includes(action);
                                    return (
                                      <div key={action} className="flex items-center gap-2">
                                        <Checkbox
                                          id={`${role}-${module}-${action}`}
                                          checked={hasPermission}
                                          onCheckedChange={() => togglePermission(role, module, action)}
                                          data-testid={`checkbox-${role}-${module}-${action}`}
                                        />
                                        <Label
                                          htmlFor={`${role}-${module}-${action}`}
                                          className="text-sm font-normal cursor-pointer"
                                        >
                                          {ACTION_LABELS[action]}
                                        </Label>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {hasChanges && (
        <div className="flex justify-end gap-3 sticky bottom-6">
          <Button
            variant="outline"
            onClick={() => {
              setPermissions(PERMISSIONS);
              setHasChanges(false);
            }}
            data-testid="button-reset-permissions"
          >
            İptal
          </Button>
          <Button onClick={handleSave} data-testid="button-save-permissions-bottom">
            <Save className="w-4 h-4 mr-2" />
            Değişiklikleri Kaydet
          </Button>
        </div>
      )}
    </div>
  );
}
