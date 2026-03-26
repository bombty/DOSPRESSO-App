import { db } from "../db";
import { dashboardWidgets, dashboardRoleWidgets } from "@shared/schema";
import { sql } from "drizzle-orm";

const WIDGET_REGISTRY = [
  { widgetKey: "branch_status", title: "Şube Durumu", dataSource: "branch_health", type: "kpi", size: "medium", category: "operasyon", componentKey: "BranchStatusWidget", description: "Toplam şube sayısı ve aktif şube durumu", sortOrder: 1 },
  { widgetKey: "sla_tracker", title: "SLA Takip", dataSource: "sla_stats", type: "kpi", size: "medium", category: "operasyon", componentKey: "SLATrackerWidget", description: "SLA uyum oranı ve ihlal takibi", sortOrder: 2 },
  { widgetKey: "open_tickets", title: "Açık Talepler", dataSource: "tickets_open", type: "kpi", size: "small", category: "operasyon", componentKey: "OpenTicketsWidget", description: "Destek talebi sayıları ve kritik talepler", sortOrder: 3 },
  { widgetKey: "todays_tasks", title: "Bugünkü Görevler", dataSource: "my_tasks", type: "list", size: "medium", category: "operasyon", componentKey: "TodaysTasksWidget", description: "Bekleyen, tamamlanan ve geciken görevler", sortOrder: 4 },
  { widgetKey: "staff_count", title: "Personel Özeti", dataSource: "staff_count", type: "kpi", size: "medium", category: "personel", componentKey: "StaffOverviewWidget", description: "Aktif ve onaylı personel sayıları", sortOrder: 5 },
  { widgetKey: "leave_requests", title: "İzin Takip", dataSource: "pending_leaves", type: "kpi", size: "small", category: "personel", componentKey: "LeaveTrackerWidget", description: "Bekleyen izin ve mesai talepleri", sortOrder: 6 },
  { widgetKey: "ik_summary", title: "İK Özeti", dataSource: "ik_dashboard", type: "detail", size: "large", category: "personel", componentKey: "IKSummaryWidget", description: "Belgeler, disiplin işlemleri genel durumu", sortOrder: 7 },
  { widgetKey: "factory_production", title: "Fabrika Üretim", dataSource: "factory_summary", type: "chart", size: "large", category: "fabrika", componentKey: "FactoryProductionWidget", description: "Üretim istatistikleri ve günlük çıktılar", sortOrder: 8 },
  { widgetKey: "qc_stats", title: "Kalite Kontrol", dataSource: "qc_stats", type: "kpi", size: "medium", category: "fabrika", componentKey: "QCStatsWidget", description: "Kalite kontrol kayıtları ve başarı oranı", sortOrder: 9 },
  { widgetKey: "pending_shipments", title: "Bekleyen Sevkiyat", dataSource: "pending_shipments", type: "kpi", size: "small", category: "fabrika", componentKey: "PendingShipmentsWidget", description: "Bekleyen sevkiyat sayısı", sortOrder: 10 },
  { widgetKey: "financial_overview", title: "Finansal Özet", dataSource: "financial_summary", type: "chart", size: "large", category: "finans", componentKey: "FinancialOverviewWidget", description: "Gelir, gider ve net kar özeti", sortOrder: 11 },
  { widgetKey: "pending_orders", title: "Bekleyen Siparişler", dataSource: "pending_orders", type: "kpi", size: "small", category: "finans", componentKey: "PendingOrdersWidget", description: "Onay bekleyen sipariş sayısı ve toplam tutar", sortOrder: 12 },
  { widgetKey: "training_progress", title: "Eğitim İlerlemesi", dataSource: "training_stats", type: "chart", size: "medium", category: "egitim", componentKey: "TrainingProgressWidget", description: "Toplam kurs ve aktif kayıt sayıları", sortOrder: 13 },
  { widgetKey: "customer_feedback", title: "Müşteri Geri Bildirimi", dataSource: "customer_feedback", type: "chart", size: "medium", category: "musteri", componentKey: "CustomerFeedbackWidget", description: "Geri bildirim sayısı ve ortalama puan", sortOrder: 14 },
  { widgetKey: "crm_summary", title: "CRM Özeti", dataSource: "crm_stats", type: "detail", size: "medium", category: "musteri", componentKey: "CRMSummaryWidget", description: "İletişim ve kampanya durumu", sortOrder: 15 },
  { widgetKey: "equipment_faults", title: "Ekipman Arızaları", dataSource: "faults_count", type: "kpi", size: "small", category: "ekipman", componentKey: "EquipmentFaultsWidget", description: "Açık arıza ve kritik arıza sayıları", sortOrder: 16 },
  { widgetKey: "equipment_maintenance", title: "Ekipman Bakım", dataSource: "equipment_alerts", type: "kpi", size: "small", category: "ekipman", componentKey: "EquipmentMaintenanceWidget", description: "Planlı bakım ve geciken bakım sayıları", sortOrder: 17 },
  { widgetKey: "ai_briefing", title: "AI Brifing", dataSource: "ai_briefing", type: "detail", size: "large", category: "ai", componentKey: "AIBriefingWidget", description: "Otomatik üretilen günlük brifing", sortOrder: 18 },
  { widgetKey: "quick_actions", title: "Hızlı İşlemler", dataSource: "quick_actions", type: "actions", size: "medium", category: "genel", componentKey: "QuickActionsWidget", description: "Role özel hızlı eylem kısayolları", sortOrder: 19 },
];

const ROLE_WIDGET_MAPPINGS: Record<string, { keys: string[]; }> = {
  ceo: {
    keys: ["branch_status","sla_tracker","open_tickets","todays_tasks","staff_count","financial_overview","factory_production","customer_feedback","equipment_faults","training_progress","ai_briefing","crm_summary","quick_actions"],
  },
  cgo: {
    keys: ["branch_status","sla_tracker","todays_tasks","staff_count","financial_overview","customer_feedback","training_progress","equipment_faults","crm_summary","quick_actions"],
  },
  admin: {
    keys: ["branch_status","sla_tracker","open_tickets","todays_tasks","staff_count","leave_requests","ik_summary","factory_production","qc_stats","pending_shipments","financial_overview","pending_orders","training_progress","customer_feedback","crm_summary","equipment_faults","equipment_maintenance","quick_actions"],
  },
  satinalma: {
    keys: ["pending_orders","equipment_faults","equipment_maintenance","todays_tasks","financial_overview","quick_actions"],
  },
  kalite_kontrol: {
    keys: ["qc_stats","factory_production","equipment_faults","todays_tasks","pending_shipments","quick_actions"],
  },
  gida_muhendisi: {
    keys: ["qc_stats","factory_production","pending_shipments","todays_tasks","equipment_faults","quick_actions"],
  },
  marketing: {
    keys: ["customer_feedback","crm_summary","branch_status","todays_tasks","training_progress","quick_actions"],
  },
  teknik: {
    keys: ["equipment_faults","equipment_maintenance","open_tickets","todays_tasks","branch_status","pending_orders","sla_tracker","quick_actions"],
  },
  destek: {
    keys: ["open_tickets","sla_tracker","todays_tasks","customer_feedback","crm_summary","branch_status","quick_actions"],
  },
  muhasebe: {
    keys: ["financial_overview","pending_orders","todays_tasks","staff_count","leave_requests","quick_actions"],
  },
  muhasebe_ik: {
    keys: ["ik_summary","staff_count","leave_requests","financial_overview","todays_tasks","pending_orders","quick_actions"],
  },
  coach: {
    keys: ["todays_tasks","training_progress","staff_count","customer_feedback","quick_actions"],
  },
  trainer: {
    keys: ["training_progress","todays_tasks","staff_count","customer_feedback","quick_actions"],
  },
};

export async function seedDashboardWidgets() {
  console.log("[Seed] Seeding dashboard widgets...");

  for (const w of WIDGET_REGISTRY) {
    await db.execute(sql`
      INSERT INTO dashboard_widgets (title, data_source, widget_type, size, is_active, sort_order, widget_key, category, component_key, description)
      VALUES (${w.title}, ${w.dataSource}, ${w.type}, ${w.size}, true, ${w.sortOrder}, ${w.widgetKey}, ${w.category}, ${w.componentKey}, ${w.description})
      ON CONFLICT (widget_key) DO UPDATE SET
        title = EXCLUDED.title,
        data_source = EXCLUDED.data_source,
        widget_type = EXCLUDED.widget_type,
        size = EXCLUDED.size,
        sort_order = EXCLUDED.sort_order,
        category = EXCLUDED.category,
        component_key = EXCLUDED.component_key,
        description = EXCLUDED.description
    `);
  }
  console.log(`[Seed] ${WIDGET_REGISTRY.length} widgets upserted.`);

  let totalMappings = 0;
  for (const [role, config] of Object.entries(ROLE_WIDGET_MAPPINGS)) {
    for (let i = 0; i < config.keys.length; i++) {
      const widgetKey = config.keys[i];
      await db.execute(sql`
        INSERT INTO dashboard_role_widgets (role, widget_key, is_enabled, display_order, default_open)
        VALUES (${role}, ${widgetKey}, true, ${i + 1}, true)
        ON CONFLICT (role, widget_key) DO UPDATE SET
          display_order = EXCLUDED.display_order,
          is_enabled = EXCLUDED.is_enabled,
          default_open = EXCLUDED.default_open
      `);
      totalMappings++;
    }
  }
  console.log(`[Seed] ${totalMappings} role-widget mappings upserted across ${Object.keys(ROLE_WIDGET_MAPPINGS).length} roles.`);
}
