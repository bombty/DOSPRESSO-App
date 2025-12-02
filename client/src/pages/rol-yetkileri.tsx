import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Shield, Building2, Factory, Save, Loader2, AlertCircle } from "lucide-react";
import { UserRole, PERMISSIONS, type UserRoleType, type PermissionModule, type PermissionAction } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const { user, isLoading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<Record<UserRoleType, Record<PermissionModule, PermissionAction[]>>>(PERMISSIONS);
  const [moduleLabels, setModuleLabels] = useState<Record<string, string>>(MODULE_LABELS);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch role permissions and modules from backend - only when authenticated as admin
  const { data: backendData, isLoading, error } = useQuery({
    queryKey: ['/api/admin/role-permissions'],
    enabled: !!user && user.role === 'admin',
  });

  // Merge backend permissions and modules with defaults
  useEffect(() => {
    if (backendData && typeof backendData === 'object') {
      const { permissions: backendPermissions, modules: backendModules } = backendData as {
        permissions?: Array<{ role: string; module: string; actions: string[] }>;
        modules?: Array<{ moduleKey: string; moduleName: string; description: string | null; category: string | null; isActive: boolean }>;
      };

      // Update permissions
      if (backendPermissions && Array.isArray(backendPermissions)) {
        const mergedPermissions = JSON.parse(JSON.stringify(PERMISSIONS)) as Record<UserRoleType, Record<PermissionModule, PermissionAction[]>>;
        
        backendPermissions.forEach((perm) => {
          const role = perm.role as UserRoleType;
          const module = perm.module as PermissionModule;
          
          if (!mergedPermissions[role]) {
            mergedPermissions[role] = {} as Record<PermissionModule, PermissionAction[]>;
          }
          
          mergedPermissions[role][module] = [...perm.actions] as PermissionAction[];
        });
        
        setPermissions(mergedPermissions);
      }

      // Update module labels from backend if available
      if (backendModules && Array.isArray(backendModules) && backendModules.length > 0) {
        const newLabels: Record<string, string> = {};
        backendModules.forEach((mod) => {
          newLabels[mod.moduleKey] = mod.moduleName;
        });
        setModuleLabels(newLabels);
      }
    }
  }, [backendData]);

  // Mutation for updating permissions
  const updatePermissionsMutation = useMutation({
    mutationFn: async (updates: Array<{ role: string; module: string; actions: string[] }>) => {
      return await apiRequest('/api/admin/role-permissions', {
        method: 'PUT',
        body: JSON.stringify(updates),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/role-permissions'] });
      toast({
        title: "Başarılı",
        description: "Rol yetkileri güncellendi",
      });
      setHasChanges(false);
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Rol yetkileri güncellenirken hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Yetki toggle fonksiyonu - immutable deep update
  const togglePermission = (
    role: UserRoleType,
    module: PermissionModule,
    action: PermissionAction
  ) => {
    setPermissions(prev => {
      // Deep clone to avoid mutation
      const newPermissions = JSON.parse(JSON.stringify(prev)) as Record<UserRoleType, Record<PermissionModule, PermissionAction[]>>;
      
      const modulePerms = newPermissions[role]?.[module] || [];
      
      const newModulePerms = modulePerms.includes(action)
        ? modulePerms.filter(a => a !== action)
        : [...modulePerms, action];

      newPermissions[role][module] = newModulePerms;
      
      return newPermissions;
    });
    setHasChanges(true);
  };

  // Değişiklikleri kaydet - send ALL role-module combinations including empty arrays
  const handleSave = () => {
    // Convert permissions object to array for backend
    const updates: Array<{ role: string; module: string; actions: string[] }> = [];
    
    // Iterate through ALL roles
    Object.keys(PERMISSIONS).forEach((role) => {
      // Iterate through ALL modules
      allModules.forEach((module) => {
        const actions = permissions[role as UserRoleType]?.[module] || [];
        
        // Always send the entry, even if actions is empty (to notify backend of deletions)
        updates.push({
          role,
          module,
          actions,
        });
      });
    });

    updatePermissionsMutation.mutate(updates);
  };

  // Tüm aksiyonlar
  const allActions: PermissionAction[] = ['view', 'create', 'edit', 'delete', 'approve'];

  // Tüm modüller - use moduleLabels state which can be updated from backend
  const allModules: PermissionModule[] = Object.keys(moduleLabels) as PermissionModule[];

  // Auth check - show unauthorized if not admin
  if (!authLoading && (!user || user.role !== 'admin')) {
    return (
      <div className="container mx-auto py-6 grid grid-cols-1 gap-6" data-testid="page-rol-yetkileri">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rol ve Yetki Yönetimi</h1>
          <p className="text-muted-foreground mt-1">
            Sistem rollerinin modül ve işlem yetkilerini yönetin
          </p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Bu sayfaya erişim yetkiniz yok. Sadece admin kullanıcılar rol yönetimi yapabilir.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto py-6 grid grid-cols-1 gap-6" data-testid="page-rol-yetkileri">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rol ve Yetki Yönetimi</h1>
          <p className="text-muted-foreground mt-1">
            Sistem rollerinin modül ve işlem yetkilerini yönetin
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto py-6 grid grid-cols-1 gap-6" data-testid="page-rol-yetkileri">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rol ve Yetki Yönetimi</h1>
          <p className="text-muted-foreground mt-1">
            Sistem rollerinin modül ve işlem yetkilerini yönetin
          </p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Rol yetkileri yüklenirken hata oluştu. Lütfen daha sonra tekrar deneyin.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 grid grid-cols-1 gap-6" data-testid="page-rol-yetkileri">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rol ve Yetki Yönetimi</h1>
          <p className="text-muted-foreground mt-1">
            Sistem rollerinin modül ve işlem yetkilerini yönetin
          </p>
        </div>
        {hasChanges && (
          <Button 
            onClick={handleSave} 
            disabled={updatePermissionsMutation.isPending}
            data-testid="button-save-permissions"
          >
            {updatePermissionsMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Değişiklikleri Kaydet
              </>
            )}
          </Button>
        )}
      </div>

      <Accordion type="multiple" defaultValue={["hq", "branch"]} className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                <div className="grid grid-cols-1 gap-6 mt-4">
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
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          {allModules.map(module => {
                            const modulePerms = permissions[role]?.[module] || [];
                            
                            return (
                              <div 
                                key={module} 
                                className="grid grid-cols-[200px_1fr] gap-4 items-center border-b pb-3 last:border-b-0"
                                data-testid={`module-${role}-${module}`}
                              >
                                <Label className="font-medium text-sm">
                                  {moduleLabels[module] || module}
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
              // Deep clone to reset properly
              setPermissions(JSON.parse(JSON.stringify(PERMISSIONS)));
              setHasChanges(false);
            }}
            data-testid="button-reset-permissions"
          >
            İptal
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={updatePermissionsMutation.isPending}
            data-testid="button-save-permissions-bottom"
          >
            {updatePermissionsMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Değişiklikleri Kaydet
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
