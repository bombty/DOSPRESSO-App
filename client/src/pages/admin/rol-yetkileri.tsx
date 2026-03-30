import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Save, Shield, Settings, ChevronDown, ChevronUp } from "lucide-react";

// ─── Sabitler ──────────────────────────────────────────────────────────────

const MODULES = [
  { key: "admin",    label: "Çekirdek Sistem" },
  { key: "ik",       label: "İK & Personel" },
  { key: "vardiya",  label: "Vardiya & Puantaj" },
  { key: "bordro",   label: "Bordro & Finans" },
  { key: "gorevler", label: "Operasyon & Görevler" },
  { key: "ekipman",  label: "Ekipman & Arıza" },
  { key: "akademi",  label: "Akademi & Eğitim" },
  { key: "crm",      label: "CRM & Müşteri" },
  { key: "raporlar", label: "Raporlar & Analitik" },
  { key: "dobody",   label: "Mr. Dobody Agent" },
];

const ROLES = [
  { key: "coach",   label: "Coach",   color: "#3b82f6" },
  { key: "trainer", label: "Trainer", color: "#8b5cf6" },
  { key: "cgo",     label: "CGO",     color: "#ef4444" },
  { key: "mudur",   label: "Müdür",   color: "#f59e0b" },
  { key: "supervisor", label: "Supervisor", color: "#22c55e" },
  { key: "muhasebe_ik", label: "Muhasebe İK", color: "#06b6d4" },
];

const PERMS = ["canView", "canCreate", "canEdit", "canDelete", "canApprove"] as const;
const PERM_LABELS: Record<string, string> = {
  canView: "Görüntüle", canCreate: "Oluştur", canEdit: "Düzenle",
  canDelete: "Sil", canApprove: "Onayla",
};

// Manifest'teki varsayılan yetkiler
const MANIFEST_DEFAULTS: Record<string, Record<string, Record<string, boolean>>> = {
  coach:    { admin: {canView:true}, ik: {canView:true}, vardiya: {canView:true}, gorevler: {canView:true,canCreate:true,canEdit:true,canApprove:true}, ekipman: {canView:true}, akademi: {canView:true,canCreate:true,canEdit:true,canApprove:true}, crm: {canView:true}, raporlar: {canView:true}, dobody: {canView:true} },
  trainer:  { admin: {canView:true}, ik: {canView:true}, vardiya: {canView:true}, gorevler: {canView:true,canCreate:true,canEdit:true,canApprove:true}, ekipman: {canView:true}, akademi: {canView:true,canCreate:true,canEdit:true,canApprove:true}, crm: {canView:true}, raporlar: {canView:true}, dobody: {canView:true} },
  cgo:      { admin: {canView:true}, ik: {canView:true,canCreate:true,canEdit:true,canApprove:true}, vardiya: {canView:true}, gorevler: {canView:true,canCreate:true,canEdit:true,canApprove:true}, ekipman: {canView:true,canApprove:true}, akademi: {canView:true,canApprove:true}, crm: {canView:true}, raporlar: {canView:true,canCreate:true}, dobody: {canView:true,canApprove:true} },
  mudur:    { ik: {canView:true,canCreate:true}, vardiya: {canView:true,canCreate:true,canEdit:true}, gorevler: {canView:true,canCreate:true,canEdit:true}, ekipman: {canView:true,canCreate:true}, akademi: {canView:true}, crm: {canView:true}, raporlar: {canView:true} },
  supervisor: { vardiya: {canView:true,canCreate:true,canEdit:true}, gorevler: {canView:true,canCreate:true}, ekipman: {canView:true,canCreate:true}, akademi: {canView:true} },
  muhasebe_ik: { ik: {canView:true,canCreate:true,canEdit:true}, bordro: {canView:true,canCreate:true,canEdit:true,canApprove:true}, raporlar: {canView:true} },
};

// ─── Eskalasyon Konfigürasyon Bileşeni ─────────────────────────────────────

function EscalationPanel() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: levels = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/escalation-config"],
    staleTime: 60000,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ level, slaDays, isActive }: { level: number; slaDays: number; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/escalation-config/${level}`, { slaDays, isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/escalation-config"] });
      toast({ title: "Kaydedildi" });
    },
  });

  const icons = ["", "🟡", "🟠", "🔴", "🚨", "‼️"];

  return (
    <div className="rounded-xl border p-5 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="h-4 w-4 text-primary" />
        <h2 className="font-semibold text-sm">Franchise Eskalasyon Zinciri</h2>
        <Badge variant="outline" className="text-xs ml-auto">5 Kademe SLA</Badge>
      </div>

      {/* Görsel zincir */}
      <div className="flex items-start gap-2 overflow-x-auto pb-2">
        {levels.map((lvl: any, i: number) => (
          <div key={lvl.level} className="flex items-start gap-2 flex-shrink-0">
            <div className="rounded-lg border p-3 w-44 space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="text-base">{icons[lvl.level]}</span>
                <span className="text-xs font-semibold">{lvl.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">SLA:</span>
                <input
                  type="number" min={1} max={90}
                  defaultValue={lvl.slaDays}
                  className="w-14 text-xs border rounded px-2 py-0.5 bg-background"
                  onBlur={(e) => {
                    const v = parseInt(e.target.value);
                    if (v > 0 && v !== lvl.slaDays) {
                      saveMutation.mutate({ level: lvl.level, slaDays: v, isActive: lvl.isActive });
                    }
                  }}
                />
                <span className="text-xs text-muted-foreground">gün</span>
              </div>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" defaultChecked={lvl.isActive}
                  onChange={(e) => saveMutation.mutate({ level: lvl.level, slaDays: lvl.slaDays, isActive: e.target.checked })} />
                Aktif
              </label>
              <p className="text-[10px] text-muted-foreground leading-tight">{lvl.description}</p>
            </div>
            {i < levels.length - 1 && (
              <div className="flex items-center mt-4 text-muted-foreground text-xs">→</div>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        SLA süreleri kümülatif olarak hesaplanır. Örnek: Seviye 3'e (Coach/Trainer) ulaşmak için sorunun toplam {levels.slice(0,3).reduce((s:number,l:any)=>s+(l.slaDays||0),0)} gün çözümsüz kalması gerekir.
      </p>
    </div>
  );
}

// ─── Ana Sayfa ──────────────────────────────────────────────────────────────

export default function RolYetkileri() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [expandedRole, setExpandedRole] = useState<string | null>("coach");
  const [pendingChanges, setPendingChanges] = useState<Record<string, Record<string, Record<string, boolean>>>>({});

  const { data: overrides = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/role-permissions"],
    staleTime: 30000,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ role, moduleKey, perms }: { role: string; moduleKey: string; perms: any }) =>
      apiRequest("POST", "/api/admin/role-permissions", { role, moduleKey, ...perms }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/role-permissions"] });
    },
  });

  // Bir permission'ın efektif değerini al (override > manifest default)
  function getEffective(role: string, moduleKey: string, perm: string): boolean {
    // Önce pending changes
    if (pendingChanges[role]?.[moduleKey]?.[perm] !== undefined) {
      return pendingChanges[role][moduleKey][perm];
    }
    // Sonra DB override
    const override = overrides.find((o: any) => o.role === role && o.moduleKey === moduleKey);
    if (override && override[perm] !== undefined) return override[perm];
    // Son olarak manifest default
    return MANIFEST_DEFAULTS[role]?.[moduleKey]?.[perm] ?? false;
  }

  function toggle(role: string, moduleKey: string, perm: string) {
    const current = getEffective(role, moduleKey, perm);
    setPendingChanges(prev => ({
      ...prev,
      [role]: { ...(prev[role] || {}), [moduleKey]: { ...(prev[role]?.[moduleKey] || {}), [perm]: !current } },
    }));
  }

  async function saveRole(role: string) {
    const roleChanges = pendingChanges[role] || {};
    const promises = Object.entries(roleChanges).map(([moduleKey, perms]) =>
      saveMutation.mutateAsync({ role, moduleKey, perms })
    );
    await Promise.all(promises);
    setPendingChanges(prev => { const n = {...prev}; delete n[role]; return n; });
    toast({ title: `${role} yetkileri kaydedildi` });
  }

  const hasPending = (role: string) => Object.keys(pendingChanges[role] || {}).length > 0;

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">Rol Yetki Yönetimi</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Franchise sistemi — HQ rolleri için modül bazlı erişim kontrolü. Manifest varsayılanlarını override eder.
        </p>
      </div>

      {/* Eskalasyon zinciri */}
      <EscalationPanel />

      {/* Rol yetki tabloları */}
      <div className="space-y-3">
        {ROLES.map(roleInfo => (
          <div key={roleInfo.key} className="rounded-xl border overflow-hidden">
            <button
              className="w-full flex items-center gap-3 p-4 hover:bg-muted/20 transition-colors"
              onClick={() => setExpandedRole(expandedRole === roleInfo.key ? null : roleInfo.key)}
            >
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: roleInfo.color }} />
              <span className="font-semibold text-sm">{roleInfo.label}</span>
              {hasPending(roleInfo.key) && (
                <Badge className="ml-2 text-xs" style={{ background: roleInfo.color + "30", color: roleInfo.color }}>
                  {Object.keys(pendingChanges[roleInfo.key] || {}).length} değişiklik
                </Badge>
              )}
              <div className="ml-auto flex items-center gap-2">
                {hasPending(roleInfo.key) && (
                  <button
                    className="text-xs px-3 py-1 rounded-md bg-primary text-primary-foreground"
                    onClick={(e) => { e.stopPropagation(); saveRole(roleInfo.key); }}
                  >
                    <Save size={11} className="inline mr-1" />Kaydet
                  </button>
                )}
                {expandedRole === roleInfo.key ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </button>

            {expandedRole === roleInfo.key && (
              <div className="border-t overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/10">
                      <th className="text-left p-3 font-medium text-muted-foreground w-44">Modül</th>
                      {PERMS.map(p => (
                        <th key={p} className="text-center p-3 font-medium text-muted-foreground">{PERM_LABELS[p]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MODULES.map(mod => (
                      <tr key={mod.key} className="border-b hover:bg-muted/10 transition-colors">
                        <td className="p-3 font-medium">{mod.label}</td>
                        {PERMS.map(perm => {
                          const val = getEffective(roleInfo.key, mod.key, perm);
                          const isOverridden = pendingChanges[roleInfo.key]?.[mod.key]?.[perm] !== undefined
                            || overrides.some((o:any) => o.role === roleInfo.key && o.moduleKey === mod.key);
                          return (
                            <td key={perm} className="p-3 text-center">
                              <button
                                onClick={() => toggle(roleInfo.key, mod.key, perm)}
                                className={`w-8 h-5 rounded-full transition-all relative ${val ? "bg-green-500/30 border border-green-500/50" : "bg-muted border border-border"}`}
                                title={isOverridden ? "Override aktif" : "Manifest varsayılanı"}
                              >
                                <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${val ? "left-3.5 bg-green-500" : "left-0.5 bg-muted-foreground/40"}`} />
                                {isOverridden && <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500" />}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        🟡 turuncu nokta = manifest'ten override edilmiş | değişiklikler "Kaydet" butonu ile DB'ye yazılır
      </p>
    </div>
  );
}
