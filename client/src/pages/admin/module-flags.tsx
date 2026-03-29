import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ModuleActivationChecklist } from "@/components/module-activation-checklist";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Lock,
  ToggleLeft,
  Info,
  Trash2,
  ChevronRight,
  Factory,
  Bot,
  Shield,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";

const MODULE_DISPLAY_NAMES: Record<string, string> = {
  admin: "Admin Paneli",
  dashboard: "Dashboard",
  bordro: "Bordro",
  dobody: "Mr. Dobody",
  fabrika: "Fabrika",
  satinalma: "Satınalma",
  pdks: "PDKS (Giriş/Çıkış)",
  vardiya: "Vardiya Planlama",
  checklist: "Checklist",
  gorevler: "Görevler",
  akademi: "Akademi / Eğitim",
  crm: "CRM",
  stok: "Stok Yönetimi",
  ekipman: "Ekipman / Arıza",
  denetim: "Denetim / Kalite",
  iletisim_merkezi: "İletişim Merkezi",
  raporlar: "Raporlar",
  finans: "Finans / Muhasebe",
  delegasyon: "Delegasyon",
  franchise: "Franchise / Yatırımcı",
  "fabrika.sevkiyat": "Sevkiyat",
  "fabrika.sayim": "Sayım",
  "fabrika.hammadde": "Hammadde",
  "fabrika.siparis": "Sipariş Hazırlama",
  "fabrika.vardiya": "Vardiya Planlama",
  "fabrika.kalite": "Kalite Kontrol",
  "fabrika.kavurma": "Kavurma",
  "fabrika.stok": "Stok",
  "dobody.chat": "AI Sohbet Asistanı",
  "dobody.bildirim": "Bildirim / Görev Oluşturma",
  "dobody.flow": "Flow Mode",
};

const ALWAYS_ON_KEYS = ["admin", "dashboard", "bordro", "dobody", "fabrika", "satinalma"];
const DATA_CONTINUES_KEYS = ["pdks", "vardiya", "fabrika.vardiya"];
const BRANCH_MODULE_KEYS = [
  "checklist", "gorevler", "akademi", "crm", "stok", "ekipman",
  "denetim", "iletisim_merkezi", "raporlar", "finans", "delegasyon", "franchise"
];
const FABRIKA_SUB_KEYS = [
  "fabrika.sevkiyat", "fabrika.sayim", "fabrika.hammadde", "fabrika.siparis",
  "fabrika.kalite", "fabrika.kavurma", "fabrika.stok"
];
const DOBODY_SUB_KEYS = ["dobody.chat", "dobody.bildirim", "dobody.flow"];

const ALL_ROLES = [
  "admin", "ceo", "cgo", "muhasebe_ik", "satinalma", "coach", "marketing",
  "trainer", "kalite_kontrol", "gida_muhendisi", "fabrika_mudur",
  "muhasebe", "teknik", "destek", "fabrika", "yatirimci_hq",
  "stajyer", "bar_buddy", "barista", "supervisor_buddy", "supervisor",
  "mudur", "yatirimci_branch", "fabrika_operator", "fabrika_sorumlu",
  "fabrika_personel", "sube_kiosk"
];

const TOGGLEABLE_KEYS = [
  ...DATA_CONTINUES_KEYS, ...BRANCH_MODULE_KEYS, ...FABRIKA_SUB_KEYS, ...DOBODY_SUB_KEYS
];

interface GlobalFlag {
  id: number;
  moduleKey: string;
  scope: string;
  branchId: number | null;
  isEnabled: boolean;
  flagLevel: string;
  flagBehavior: string;
  parentKey: string | null;
  targetRole: string | null;
}

interface BranchEffectiveFlag {
  moduleKey: string;
  flagLevel: string;
  flagBehavior: string;
  parentKey: string | null;
  globalEnabled: boolean;
  branchOverride: boolean | null;
  effectiveEnabled: boolean;
  globalFlagId: number;
  branchFlagId: number | null;
  roleOverrides: Array<{ scope: string; targetRole: string | null; isEnabled: boolean; id: number }>;
}

interface Branch {
  id: number;
  name: string;
}

export default function AdminModuleFlags() {
  const { toast } = useToast();
  const [selectedBranchId, setSelectedBranchId] = useState<string>("global");
  const [roleModule, setRoleModule] = useState("");
  const [roleRole, setRoleRole] = useState("");
  const [roleScope, setRoleScope] = useState("global");
  const [roleEnabled, setRoleEnabled] = useState(true);

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const isGlobalView = selectedBranchId === "global";
  const branchIdNum = isGlobalView ? null : parseInt(selectedBranchId);

  const { data: globalFlags = [], isLoading: globalLoading } = useQuery<GlobalFlag[]>({
    queryKey: ["/api/module-flags"],
    enabled: isGlobalView,
  });

  const { data: branchFlags = [], isLoading: branchLoading } = useQuery<BranchEffectiveFlag[]>({
    queryKey: ["/api/module-flags/branch", branchIdNum],
    queryFn: async () => {
      const res = await fetch(`/api/module-flags/branch/${branchIdNum}`);
      if (!res.ok) throw new Error("Failed to fetch branch flags");
      return res.json();
    },
    enabled: !isGlobalView && !!branchIdNum,
  });

  const isLoading = isGlobalView ? globalLoading : branchLoading;
  const selectedBranch = !isGlobalView && branchIdNum;
  const CHECKLIST_MODULES = ["satinalma", "checklist", "akademi", "kalite", "crm", "stok", "ekipman", "gorevler"];
  const enabledModules = branchFlags
    .filter(bf => bf.effectiveEnabled && CHECKLIST_MODULES.includes(bf.moduleKey))
    .map(bf => bf.moduleKey);

  const toggleMutation = useMutation({
    mutationFn: (data: { id: number; isEnabled: boolean }) =>
      apiRequest("PATCH", `/api/module-flags/${data.id}`, { isEnabled: data.isEnabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/module-flags"] });
      if (branchIdNum) queryClient.invalidateQueries({ queryKey: ["/api/module-flags/branch", branchIdNum] });
      toast({ title: "Modül durumu güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Güncelleme başarısız", variant: "destructive" });
    },
  });

  const createOverrideMutation = useMutation({
    mutationFn: (data: { moduleKey: string; branchId?: number | null; isEnabled: boolean; targetRole?: string | null }) =>
      apiRequest("POST", "/api/module-flags", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/module-flags"] });
      if (branchIdNum) queryClient.invalidateQueries({ queryKey: ["/api/module-flags/branch", branchIdNum] });
      toast({ title: "Override oluşturuldu" });
    },
    onError: (err: any) => {
      const msg = err?.message || "Override oluşturulamadı";
      toast({ title: "Hata", description: msg, variant: "destructive" });
    },
  });

  const deleteOverrideMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/module-flags/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/module-flags"] });
      if (branchIdNum) queryClient.invalidateQueries({ queryKey: ["/api/module-flags/branch", branchIdNum] });
      toast({ title: "Override kaldırıldı" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Override silinemedi", variant: "destructive" });
    },
  });

  const getGlobalFlag = (key: string): GlobalFlag | undefined =>
    globalFlags.filter(f => !f.targetRole).find(f => f.moduleKey === key);

  const getRoleOverrides = (): GlobalFlag[] =>
    globalFlags.filter(f => f.targetRole);

  function handleGlobalToggle(key: string, currentEnabled: boolean) {
    const flag = getGlobalFlag(key);
    if (!flag) return;
    toggleMutation.mutate({ id: flag.id, isEnabled: !currentEnabled });
  }

  function handleBranchToggle(bf: BranchEffectiveFlag) {
    if (bf.branchFlagId) {
      toggleMutation.mutate({ id: bf.branchFlagId, isEnabled: !bf.effectiveEnabled });
    } else {
      createOverrideMutation.mutate({
        moduleKey: bf.moduleKey,
        branchId: branchIdNum,
        isEnabled: !bf.globalEnabled,
      });
    }
  }

  function handleDeleteBranchOverride(flagId: number) {
    deleteOverrideMutation.mutate(flagId);
  }

  function handleCreateRoleOverride() {
    if (!roleModule || !roleRole) {
      toast({ title: "Modül ve rol seçimi zorunludur", variant: "destructive" });
      return;
    }
    createOverrideMutation.mutate({
      moduleKey: roleModule,
      branchId: roleScope === "global" ? null : branchIdNum,
      isEnabled: roleEnabled,
      targetRole: roleRole,
    });
    setRoleModule("");
    setRoleRole("");
    setRoleEnabled(true);
  }

  function StatusBadge({ behavior, enabled }: { behavior: string; enabled: boolean }) {
    if (behavior === "always_on") {
      return <Badge variant="secondary" className="text-xs" data-testid="badge-always-on"><Lock className="h-3 w-3 mr-1" />Her zaman aktif</Badge>;
    }
    if (behavior === "ui_hidden_data_continues" && !enabled) {
      return <Badge variant="outline" className="text-xs border-amber-500 text-amber-600 dark:text-amber-400" data-testid="badge-data-continues"><Eye className="h-3 w-3 mr-1" />UI Gizli — Veri Toplanıyor</Badge>;
    }
    if (enabled) {
      return <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" data-testid="badge-active">Aktif</Badge>;
    }
    return <Badge variant="destructive" className="text-xs" data-testid="badge-disabled"><EyeOff className="h-3 w-3 mr-1" />Kapalı</Badge>;
  }

  function FlagRow({ moduleKey, enabled, behavior, disabled, onToggle, indented }: {
    moduleKey: string;
    enabled: boolean;
    behavior: string;
    disabled?: boolean;
    onToggle: () => void;
    indented?: boolean;
  }) {
    return (
      <div className={`flex items-center justify-between gap-3 py-3 px-4 ${indented ? "pl-10" : ""}`} data-testid={`flag-row-${moduleKey}`}>
        <div className="flex items-center gap-3 min-w-0">
          {indented && <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{MODULE_DISPLAY_NAMES[moduleKey] || moduleKey}</p>
            <p className="text-xs text-muted-foreground truncate">{moduleKey}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <StatusBadge behavior={behavior} enabled={enabled} />
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            disabled={disabled || toggleMutation.isPending}
            data-testid={`switch-${moduleKey}`}
          />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-1" data-testid="loading-skeleton">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  if (isGlobalView) {
    return (
      <div className="space-y-4 p-1" data-testid="global-flags-view">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2"><ToggleLeft className="h-5 w-5" />Modül Bayrakları</h2>
            <p className="text-sm text-muted-foreground">Modülleri global veya şube bazlı açıp kapatın</p>
          </div>
          <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
            <SelectTrigger className="w-[220px]" data-testid="select-scope">
              <SelectValue placeholder="Kapsam seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Global Ayarlar</SelectItem>
              {branches.map(b => (
                <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card data-testid="card-system">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" />Sistem (Kapatılamaz)</CardTitle>
            <CardDescription className="text-xs">Temel sistem modülleri her zaman aktiftir</CardDescription>
          </CardHeader>
          <CardContent className="p-0 divide-y">
            {ALWAYS_ON_KEYS.map(key => {
              const flag = getGlobalFlag(key);
              return (
                <FlagRow
                  key={key}
                  moduleKey={key}
                  enabled={true}
                  behavior="always_on"
                  disabled={true}
                  onToggle={() => {}}
                />
              );
            })}
          </CardContent>
        </Card>

        <Card data-testid="card-data-continues">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4 text-amber-500" />Veri Toplama Devam Eder
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[240px]">
                  <p className="text-xs">Bu modüller kapatıldığında kullanıcılar görmez ama arka planda veri toplanmaya devam eder</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y">
            {DATA_CONTINUES_KEYS.map(key => {
              const flag = getGlobalFlag(key);
              const enabled = flag?.isEnabled ?? true;
              return (
                <FlagRow
                  key={key}
                  moduleKey={key}
                  enabled={enabled}
                  behavior="ui_hidden_data_continues"
                  onToggle={() => handleGlobalToggle(key, enabled)}
                  indented={key.includes(".")}
                />
              );
            })}
          </CardContent>
        </Card>

        <Card data-testid="card-branch-modules">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><ToggleLeft className="h-4 w-4" />Şube Modülleri</CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y">
            {BRANCH_MODULE_KEYS.map(key => {
              const flag = getGlobalFlag(key);
              const enabled = flag?.isEnabled ?? true;
              return (
                <FlagRow
                  key={key}
                  moduleKey={key}
                  enabled={enabled}
                  behavior="fully_hidden"
                  onToggle={() => handleGlobalToggle(key, enabled)}
                />
              );
            })}
          </CardContent>
        </Card>

        <Card data-testid="card-fabrika-sub">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Factory className="h-4 w-4" />Fabrika Alt-Modülleri</CardTitle>
            <CardDescription className="text-xs">Ana fabrika modülü her zaman aktiftir. Alt-modüller bağımsız kapatılabilir.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 divide-y">
            {FABRIKA_SUB_KEYS.map(key => {
              const flag = getGlobalFlag(key);
              const enabled = flag?.isEnabled ?? true;
              const behavior = key === "fabrika.vardiya" ? "ui_hidden_data_continues" : "fully_hidden";
              return (
                <FlagRow
                  key={key}
                  moduleKey={key}
                  enabled={enabled}
                  behavior={behavior}
                  onToggle={() => handleGlobalToggle(key, enabled)}
                  indented
                />
              );
            })}
          </CardContent>
        </Card>

        <Card data-testid="card-dobody-sub">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Bot className="h-4 w-4" />Mr. Dobody</CardTitle>
            <CardDescription className="text-xs">AI arka plan analizleri her zaman çalışır. Burada sadece kullanıcıya görünen özellikler kapatılır.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 divide-y">
            {DOBODY_SUB_KEYS.map(key => {
              const flag = getGlobalFlag(key);
              const enabled = flag?.isEnabled ?? true;
              return (
                <FlagRow
                  key={key}
                  moduleKey={key}
                  enabled={enabled}
                  behavior="fully_hidden"
                  onToggle={() => handleGlobalToggle(key, enabled)}
                  indented
                />
              );
            })}
          </CardContent>
        </Card>

        <Accordion type="single" collapsible>
          <AccordionItem value="role-overrides" className="border rounded-lg" data-testid="accordion-role-overrides">
            <AccordionTrigger className="px-4 text-sm">
              <span className="flex items-center gap-2"><Shield className="h-4 w-4" />Rol Bazlı Özelleştirmeler</span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">Modül</Label>
                    <Select value={roleModule} onValueChange={setRoleModule}>
                      <SelectTrigger data-testid="select-role-module"><SelectValue placeholder="Modül seçin" /></SelectTrigger>
                      <SelectContent>
                        {TOGGLEABLE_KEYS.map(k => (
                          <SelectItem key={k} value={k}>{MODULE_DISPLAY_NAMES[k] || k}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Rol</Label>
                    <Select value={roleRole} onValueChange={setRoleRole}>
                      <SelectTrigger data-testid="select-role-role"><SelectValue placeholder="Rol seçin" /></SelectTrigger>
                      <SelectContent>
                        {ALL_ROLES.map(r => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Durum</Label>
                    <div className="flex items-center gap-2 h-9">
                      <Switch checked={roleEnabled} onCheckedChange={setRoleEnabled} data-testid="switch-role-enabled" />
                      <span className="text-sm">{roleEnabled ? "Aktif" : "Kapalı"}</span>
                    </div>
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleCreateRoleOverride}
                      disabled={createOverrideMutation.isPending || !roleModule || !roleRole}
                      data-testid="button-create-role-override"
                    >
                      Override Oluştur
                    </Button>
                  </div>
                </div>

                {getRoleOverrides().length > 0 && (
                  <Table data-testid="table-role-overrides">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Modül</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getRoleOverrides().map(ro => (
                        <TableRow key={ro.id}>
                          <TableCell className="text-sm">{MODULE_DISPLAY_NAMES[ro.moduleKey] || ro.moduleKey}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{ro.targetRole}</Badge></TableCell>
                          <TableCell>
                            {ro.isEnabled
                              ? <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Aktif</Badge>
                              : <Badge variant="destructive" className="text-xs">Kapalı</Badge>
                            }
                          </TableCell>
                          <TableCell>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteOverrideMutation.mutate(ro.id)}
                              disabled={deleteOverrideMutation.isPending}
                              data-testid={`button-delete-role-override-${ro.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {getRoleOverrides().length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Henüz rol bazlı override oluşturulmamış</p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    );
  }

  const selectedBranchObj = branches.find(b => b.id === branchIdNum);

  return (
    <div className="space-y-4 p-1" data-testid="branch-flags-view">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><ToggleLeft className="h-5 w-5" />Modül Bayrakları</h2>
          <p className="text-sm text-muted-foreground">
            {selectedBranchObj ? `${selectedBranchObj.name} — Şube Override'ları` : "Şube seçin"}
          </p>
        </div>
        <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
          <SelectTrigger className="w-[220px]" data-testid="select-scope">
            <SelectValue placeholder="Kapsam seçin" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="global">Global Ayarlar</SelectItem>
            {branches.map(b => (
              <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card data-testid="card-branch-overrides">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Şube Override Yönetimi</CardTitle>
          <CardDescription className="text-xs">Global değeri değiştirmek için toggle'a tıklayın. "Override Kaldır" ile global ayara dönün.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Modül</TableHead>
                <TableHead>Global</TableHead>
                <TableHead>Şube Override</TableHead>
                <TableHead className="w-[120px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branchFlags
                .filter(bf => !ALWAYS_ON_KEYS.includes(bf.moduleKey) || bf.moduleKey.includes("."))
                .map(bf => {
                  const isAlwaysOn = bf.flagBehavior === "always_on";
                  const hasBranchOverride = bf.branchFlagId !== null;

                  return (
                    <TableRow key={bf.moduleKey} data-testid={`branch-row-${bf.moduleKey}`}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{MODULE_DISPLAY_NAMES[bf.moduleKey] || bf.moduleKey}</p>
                          <p className="text-xs text-muted-foreground">{bf.moduleKey}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isAlwaysOn ? (
                          <Badge variant="secondary" className="text-xs"><Lock className="h-3 w-3 mr-1" />Her zaman aktif</Badge>
                        ) : bf.globalEnabled ? (
                          <span className="text-xs text-green-600 dark:text-green-400">Aktif</span>
                        ) : (
                          <span className="text-xs text-red-500">Kapalı</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isAlwaysOn ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={bf.effectiveEnabled}
                              onCheckedChange={() => handleBranchToggle(bf)}
                              disabled={toggleMutation.isPending || createOverrideMutation.isPending}
                              data-testid={`branch-switch-${bf.moduleKey}`}
                            />
                            {!hasBranchOverride && (
                              <span className="text-xs text-muted-foreground">Global</span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {hasBranchOverride && !isAlwaysOn && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteBranchOverride(bf.branchFlagId!)}
                            disabled={deleteOverrideMutation.isPending}
                            data-testid={`button-remove-override-${bf.moduleKey}`}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            <span className="text-xs">Kaldır</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedBranch && enabledModules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Modül Aktivasyon Kontrol Listeleri
            </CardTitle>
            <CardDescription>Aktif modüllerin kurulum durumlarını kontrol edin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {enabledModules.map(mk => (
              <ModuleActivationChecklist key={mk} moduleKey={mk} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
