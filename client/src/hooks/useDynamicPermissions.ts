import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { hasPermission, type PermissionModule, type UserRoleType } from "@shared/schema";

interface PermissionsResponse {
  role: string;
  permissions: Record<string, string[]>;
  hasDynamicPermissions: boolean;
}

const MODULE_ALIASES: Record<string, string[]> = {
  guest_satisfaction: ["customer_satisfaction", "misafir-memnuniyeti", "misafir_memnuniyeti"],
  guest_feedback: ["misafir-geri-bildirim", "customer_satisfaction"],
  complaints: ["product_complaints", "sikayetler"],
  advanced_reports: ["gelismis-raporlar"],
  cash_management: ["cash_reports", "kasa-raporlari"],
  banners: ["banner-editor", "banner_editor", "bannerlar"],
  backup: ["yedekleme"],
  ai_settings: ["ai_ayarlari", "yapay-zeka-ayarlari", "ai-asistan"],
  ai_costs: ["ai-maliyetler"],
  email_settings: ["email-ayarlari", "email_ayarlari", "servis-mail-ayarlari"],
  quality_templates: ["denetim-sablonlari", "kalite-denetim-sablonlari", "audit_templates"],
  campaigns: ["kampanya-yonetimi", "kampanya_yonetimi"],
  equipment_service: ["ekipman-servis", "servis-talepleri"],
  equipment_admin: ["ekipman-yonetimi"],
  equipment_analytics: ["ekipman-analitics"],
  live_tracking: ["canli-takip", "canli_takip"],
  onboarding: ["personel-onboarding", "personel_onboarding"],
  nfc_entry: ["nfc-giris", "nfc_giris"],
  qr_scanner: ["qr-tara", "qr_tara"],
  activity_logs: ["aktivite-loglari", "aktivite_loglari"],
  user_management: ["kullanicilar"],
  seed_data: ["admin-seed", "toplu-veri-yonetimi", "bulk_data"],
  service_email: ["servis-mail-ayarlari"],
  support_requests: ["hq-destek", "hq_destek", "support"],
  hq_support: ["hq-destek", "hq_destek", "support"],
  franchise_opening: ["yeni-sube", "yeni-sube-projeler", "new_branch_projects", "projects"],
  new_shop_projects: ["yeni-sube-projeler", "new_branch_projects", "projects"],
  branch_dashboard: ["sube-dashboard", "dashboard"],
  sube_takibi: ["branches", "subeler"],
  ariza_takibi: ["faults", "ariza"],
  checklist_management: ["checklistler-yonetim", "checklists"],
  content_studio: ["icerik-studyosu", "icerik", "content_management"],
  announcements_admin: ["duyurular", "announcements"],
  data_export: ["toplu-veri-yonetimi", "bulk_data"],
  mentor_notlari: ["training"],
  service_requests: ["servis-talepleri"],
  academy_admin: ["akademi-yonetim"],
  factory_waste: ["factory_waste_reasons"],
  factory_pins: ["factory_pins", "admin-pin-yonetimi"],
  crm_dashboard: ["customer_satisfaction", "misafir_memnuniyeti"],
  crm_tickets: ["complaints", "sikayetler", "product_complaints"],
  crm_feedback: ["misafir-geri-bildirim", "customer_satisfaction"],
  crm_performance: ["performance"],
  crm_sla: ["faults"],
  authorization: ["admin-yetkilendirme", "rol-yetkileri"],
  admin_panel: ["admin-panel"],
};

export function useDynamicPermissions() {
  const { user } = useAuth();

  const { data: permData, isLoading } = useQuery<PermissionsResponse>({
    queryKey: ["dynamic-permissions", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/me/permissions", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch permissions");
      return res.json();
    },
    staleTime: 15 * 1000,
    gcTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000,
    enabled: !!user,
  });

  const canAccess = (moduleKey: string, action: string = "view"): boolean => {
    if (!user?.role) return false;

    if (permData?.hasDynamicPermissions) {
      const actions = permData.permissions[moduleKey];
      if (actions && actions.length > 0 && actions.includes(action)) return true;

      const aliases = MODULE_ALIASES[moduleKey];
      if (aliases) {
        for (const alias of aliases) {
          const aliasActions = permData.permissions[alias];
          if (aliasActions && aliasActions.length > 0 && aliasActions.includes(action)) return true;
        }
      }

      return false;
    }

    return hasPermission(user.role as UserRoleType, moduleKey as PermissionModule, action as any);
  };

  return { canAccess, isLoading, permissions: permData?.permissions || {} };
}
