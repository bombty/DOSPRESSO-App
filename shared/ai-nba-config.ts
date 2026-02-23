import { UserRole } from '@shared/schema';

export const TASK_BUCKETS = {
  T1: { id: 'T1', label: 'Operasyonel Checklist', labelTR: 'Operasyonel Checklist', examples: ['Açılış/Kapanış kontrolleri', 'Günlük denetimler'] },
  T2: { id: 'T2', label: 'Eğitim & Gelişim', labelTR: 'Eğitim & Gelişim', examples: ['Modül tamamlama', 'Quiz', 'Sertifika'] },
  T3: { id: 'T3', label: 'Kalite & Denetim', labelTR: 'Kalite & Denetim', examples: ['Üretim kalite', 'Gıda güvenliği'] },
  T4: { id: 'T4', label: 'İK & Personel', labelTR: 'İK & Personel', examples: ['İzin onayı', 'Bordro', 'Yoklama'] },
  T5: { id: 'T5', label: 'Stok & Tedarik', labelTR: 'Stok & Tedarik', examples: ['Stok sayımı', 'Sipariş takibi'] },
  T6: { id: 'T6', label: 'Finansal & Raporlama', labelTR: 'Finansal & Raporlama', examples: ['Kasa kontrolü', 'Gelir tablosu'] },
  T7: { id: 'T7', label: 'Ekipman & Bakım', labelTR: 'Ekipman & Bakım', examples: ['Arıza takibi', 'Bakım planı'] },
  T8: { id: 'T8', label: 'Stratejik & Yönetim', labelTR: 'Stratejik & Yönetim', examples: ['Performans değerlendirme', 'Şube analiz'] },
} as const;

export type RoleGroup = 'branch_floor' | 'branch_mgmt' | 'hq_ops' | 'hq_finance' | 'factory' | 'executive';

export const ROLE_GROUPS: Record<RoleGroup, string[]> = {
  branch_floor: [UserRole.STAJYER, UserRole.BAR_BUDDY, UserRole.BARISTA, UserRole.SUPERVISOR_BUDDY, UserRole.YATIRIMCI_BRANCH],
  branch_mgmt: [UserRole.SUPERVISOR, UserRole.MUDUR],
  hq_ops: [UserRole.COACH, UserRole.TRAINER, UserRole.KALITE_KONTROL, UserRole.GIDA_MUHENDISI, UserRole.MARKETING, UserRole.DESTEK],
  hq_finance: [UserRole.MUHASEBE_IK, UserRole.SATINALMA],
  factory: [UserRole.FABRIKA_MUDUR, UserRole.FABRIKA_OPERATOR, UserRole.FABRIKA_SORUMLU, UserRole.FABRIKA_PERSONEL],
  executive: [UserRole.ADMIN, UserRole.CEO, UserRole.CGO],
};

export function getRoleGroup(role: string): RoleGroup | null {
  for (const [group, roles] of Object.entries(ROLE_GROUPS)) {
    if (roles.includes(role)) {
      return group as RoleGroup;
    }
  }
  return null;
}

export type AlertSeverity = 'critical' | 'warning';
export type ActionSeverity = 'high' | 'medium' | 'low';

export interface AlertTemplate {
  type: string;
  titleTR: string;
  severity: AlertSeverity;
  dataSource: string;
  bucket: string;
}

export interface ActionTemplate {
  type: string;
  titleTR: string;
  reasonTR: string;
  severity: ActionSeverity;
  deepLink: string;
  estimatedMinutes: number;
  bucket: string;
  dataSource: string;
}

export interface RoleNBAConfig {
  role: string;
  group: RoleGroup;
  alerts: AlertTemplate[];
  actions: ActionTemplate[];
}

export const NBA_CONFIG: Record<string, RoleNBAConfig> = {
  [UserRole.STAJYER]: {
    role: UserRole.STAJYER,
    group: 'branch_floor',
    alerts: [
      { type: 'overdue_onboarding', titleTR: 'Tamamlanmamış onboarding adımı', severity: 'warning', dataSource: 'employee_onboarding_progress', bucket: 'T2' },
    ],
    actions: [
      { type: 'complete_training', titleTR: 'Eğitim modülü tamamla', reasonTR: 'Onboarding sürecinde bekleyen adımlar var', severity: 'high', deepLink: '/akademi/benim-yolum', estimatedMinutes: 15, bucket: 'T2', dataSource: 'user_career_progress' },
      { type: 'take_quiz', titleTR: 'Haftalık quiz çöz', reasonTR: 'Quiz ortalamanızı yükseltmek için', severity: 'medium', deepLink: '/akademi/genel-egitimler', estimatedMinutes: 10, bucket: 'T2', dataSource: 'quiz_results' },
      { type: 'review_checklist', titleTR: 'Temel checklist kontrol', reasonTR: 'Günlük görev tamamlama', severity: 'medium', deepLink: '/gorevler', estimatedMinutes: 5, bucket: 'T1', dataSource: 'checklist_completions' },
    ],
  },

  [UserRole.BAR_BUDDY]: {
    role: UserRole.BAR_BUDDY,
    group: 'branch_floor',
    alerts: [
      { type: 'gate_deadline', titleTR: 'Gate sınavı son tarihi yaklaşıyor', severity: 'warning', dataSource: 'gate_attempts', bucket: 'T2' },
    ],
    actions: [
      { type: 'gate_prep', titleTR: 'Gate sınavına hazırlan', reasonTR: 'Bir sonraki seviye için sınav yaklaşıyor', severity: 'high', deepLink: '/akademi/benim-yolum', estimatedMinutes: 20, bucket: 'T2', dataSource: 'user_career_progress' },
      { type: 'complete_checklist', titleTR: 'Checklist tamamla', reasonTR: 'Vardiya checklist\'i bekliyor', severity: 'medium', deepLink: '/gorevler', estimatedMinutes: 10, bucket: 'T1', dataSource: 'checklist_completions' },
      { type: 'review_recipes', titleTR: 'Reçeteleri incele', reasonTR: 'Standart reçete bilgisi güncelle', severity: 'low', deepLink: '/receteler', estimatedMinutes: 10, bucket: 'T2', dataSource: 'recipes' },
    ],
  },

  [UserRole.BARISTA]: {
    role: UserRole.BARISTA,
    group: 'branch_floor',
    alerts: [
      { type: 'overdue_checklist', titleTR: 'Tamamlanmamış checklist', severity: 'warning', dataSource: 'checklist_completions', bucket: 'T1' },
      { type: 'low_practice_score', titleTR: 'Pratik skor düşük', severity: 'warning', dataSource: 'user_career_progress', bucket: 'T2' },
    ],
    actions: [
      { type: 'complete_checklist', titleTR: 'Checklist tamamla', reasonTR: 'Günlük açılış/kapanış checklist bekliyor', severity: 'high', deepLink: '/gorevler', estimatedMinutes: 10, bucket: 'T1', dataSource: 'checklist_completions' },
      { type: 'improve_score', titleTR: 'Eğitim skoru iyileştir', reasonTR: 'Pratik skorunuz ortalamanın altında', severity: 'medium', deepLink: '/akademi/benim-yolum', estimatedMinutes: 15, bucket: 'T2', dataSource: 'user_career_progress' },
      { type: 'take_quiz', titleTR: 'Quiz çöz', reasonTR: 'Bilgi seviyenizi test edin', severity: 'low', deepLink: '/akademi/genel-egitimler', estimatedMinutes: 10, bucket: 'T2', dataSource: 'quiz_results' },
    ],
  },

  [UserRole.SUPERVISOR_BUDDY]: {
    role: UserRole.SUPERVISOR_BUDDY,
    group: 'branch_floor',
    alerts: [
      { type: 'overdue_checklist', titleTR: 'Tamamlanmamış checklist', severity: 'warning', dataSource: 'checklist_completions', bucket: 'T1' },
    ],
    actions: [
      { type: 'complete_checklist', titleTR: 'Checklist denetimi yap', reasonTR: 'Ekip checklist durumunu kontrol et', severity: 'high', deepLink: '/gorevler', estimatedMinutes: 10, bucket: 'T1', dataSource: 'checklist_completions' },
      { type: 'coordinate_team', titleTR: 'Personel koordinasyonu', reasonTR: 'Günlük görev dağılımı', severity: 'medium', deepLink: '/gorevler', estimatedMinutes: 10, bucket: 'T4', dataSource: 'tasks' },
      { type: 'review_training', titleTR: 'Eğitim takibi', reasonTR: 'Haftalık eğitim ilerlemesi', severity: 'low', deepLink: '/akademi/benim-yolum', estimatedMinutes: 10, bucket: 'T2', dataSource: 'user_career_progress' },
    ],
  },

  [UserRole.YATIRIMCI_BRANCH]: {
    role: UserRole.YATIRIMCI_BRANCH,
    group: 'branch_floor',
    alerts: [
      { type: 'branch_score_drop', titleTR: 'Şube skoru düşüş', severity: 'warning', dataSource: 'user_career_progress', bucket: 'T8' },
    ],
    actions: [
      { type: 'review_performance', titleTR: 'Şube performans kontrol', reasonTR: 'Haftalık şube metrikleri', severity: 'high', deepLink: '/', estimatedMinutes: 5, bucket: 'T8', dataSource: 'user_career_progress' },
      { type: 'check_faults', titleTR: 'Açık arıza durumu', reasonTR: 'Şubedeki aktif arızalar', severity: 'medium', deepLink: '/arizalar', estimatedMinutes: 5, bucket: 'T7', dataSource: 'equipment_faults' },
      { type: 'view_reports', titleTR: 'Raporları incele', reasonTR: 'Finansal durum özeti', severity: 'low', deepLink: '/raporlar', estimatedMinutes: 10, bucket: 'T6', dataSource: 'missing' },
    ],
  },

  [UserRole.SUPERVISOR]: {
    role: UserRole.SUPERVISOR,
    group: 'branch_mgmt',
    alerts: [
      { type: 'team_risk', titleTR: 'Ekip üyesi performans riski', severity: 'critical', dataSource: 'user_career_progress', bucket: 'T8' },
      { type: 'overdue_checklist', titleTR: 'Tamamlanmamış checklist', severity: 'warning', dataSource: 'checklist_completions', bucket: 'T1' },
      { type: 'pending_leave', titleTR: 'Bekleyen izin talebi', severity: 'warning', dataSource: 'leave_requests', bucket: 'T4' },
    ],
    actions: [
      { type: 'review_team_scores', titleTR: 'Ekip skorlarını incele', reasonTR: 'Bir personelin composit skoru düşük', severity: 'high', deepLink: '/personel', estimatedMinutes: 10, bucket: 'T8', dataSource: 'user_career_progress' },
      { type: 'complete_checklist', titleTR: 'Checklist takibi yap', reasonTR: 'Tamamlanmamış checklist\'ler var', severity: 'high', deepLink: '/gorevler', estimatedMinutes: 10, bucket: 'T1', dataSource: 'checklist_completions' },
      { type: 'approve_leaves', titleTR: 'İzin taleplerini onayla', reasonTR: 'Bekleyen izin talepleri', severity: 'medium', deepLink: '/ik', estimatedMinutes: 5, bucket: 'T4', dataSource: 'leave_requests' },
    ],
  },

  [UserRole.MUDUR]: {
    role: UserRole.MUDUR,
    group: 'branch_mgmt',
    alerts: [
      { type: 'sla_breach', titleTR: 'SLA ihlali', severity: 'critical', dataSource: 'equipment_faults', bucket: 'T7' },
      { type: 'pending_leave', titleTR: 'Bekleyen izin talebi', severity: 'warning', dataSource: 'leave_requests', bucket: 'T4' },
      { type: 'stock_overdue', titleTR: 'Stok sayımı gecikmiş', severity: 'warning', dataSource: 'inventory_counts', bucket: 'T5' },
    ],
    actions: [
      { type: 'check_faults', titleTR: 'Arıza durumunu kontrol et', reasonTR: 'SLA süresi dolan arızalar var', severity: 'high', deepLink: '/arizalar', estimatedMinutes: 10, bucket: 'T7', dataSource: 'equipment_faults' },
      { type: 'approve_leaves', titleTR: 'İzin taleplerini onayla', reasonTR: 'Bekleyen onay talepleri', severity: 'medium', deepLink: '/ik', estimatedMinutes: 5, bucket: 'T4', dataSource: 'leave_requests' },
      { type: 'stock_count', titleTR: 'Stok sayımını tamamla', reasonTR: 'Haftalık stok sayımı gecikmede', severity: 'medium', deepLink: '/gorevler', estimatedMinutes: 15, bucket: 'T5', dataSource: 'inventory_counts' },
    ],
  },

  [UserRole.COACH]: {
    role: UserRole.COACH,
    group: 'hq_ops',
    alerts: [
      { type: 'multi_branch_decline', titleTR: 'Çoklu şube skor düşüşü', severity: 'critical', dataSource: 'user_career_progress', bucket: 'T8' },
      { type: 'low_training_score', titleTR: 'Düşük eğitim skoru', severity: 'warning', dataSource: 'user_career_progress', bucket: 'T2' },
    ],
    actions: [
      { type: 'review_branches', titleTR: 'Şube skorlarını incele', reasonTR: 'Kritik skoru olan şubeler var', severity: 'high', deepLink: '/subeler', estimatedMinutes: 15, bucket: 'T8', dataSource: 'user_career_progress' },
      { type: 'review_training', titleTR: 'Eğitim etkinlik raporu', reasonTR: 'Düşük eğitim skoru olan personel', severity: 'medium', deepLink: '/personel', estimatedMinutes: 10, bucket: 'T2', dataSource: 'user_career_progress' },
      { type: 'review_ai_panel', titleTR: 'AI panel durumunu incele', reasonTR: 'Sistem hata ve analizleri', severity: 'low', deepLink: '/akademi/ai-kanit', estimatedMinutes: 5, bucket: 'T8', dataSource: 'ai_agent_logs' },
    ],
  },

  [UserRole.TRAINER]: {
    role: UserRole.TRAINER,
    group: 'hq_ops',
    alerts: [
      { type: 'low_quiz_pass', titleTR: 'Quiz başarı oranı düşük', severity: 'warning', dataSource: 'quiz_results', bucket: 'T2' },
    ],
    actions: [
      { type: 'review_quiz_results', titleTR: 'Quiz sonuçlarını incele', reasonTR: 'Başarı oranı ortalamanın altında', severity: 'high', deepLink: '/akademi/analitik', estimatedMinutes: 10, bucket: 'T2', dataSource: 'quiz_results' },
      { type: 'update_content', titleTR: 'Eğitim materyali güncelle', reasonTR: 'İçerik güncellemesi bekleyen modüller', severity: 'medium', deepLink: '/akademi/icerik-kutuphanesi', estimatedMinutes: 20, bucket: 'T2', dataSource: 'training_modules' },
      { type: 'check_recipes', titleTR: 'Reçete güncellemelerini kontrol et', reasonTR: 'Güncellenmiş reçete bildirimleri', severity: 'low', deepLink: '/receteler', estimatedMinutes: 10, bucket: 'T2', dataSource: 'recipes' },
    ],
  },

  [UserRole.KALITE_KONTROL]: {
    role: UserRole.KALITE_KONTROL,
    group: 'hq_ops',
    alerts: [
      { type: 'open_complaints', titleTR: 'Açık ürün şikayeti', severity: 'critical', dataSource: 'product_complaints', bucket: 'T3' },
      { type: 'high_reject_rate', titleTR: 'Yüksek batch red oranı', severity: 'warning', dataSource: 'factory_batch_verifications', bucket: 'T3' },
    ],
    actions: [
      { type: 'review_complaints', titleTR: 'Şikayetleri incele', reasonTR: '48 saatten fazla açık şikayet var', severity: 'high', deepLink: '/kalite', estimatedMinutes: 15, bucket: 'T3', dataSource: 'product_complaints' },
      { type: 'review_batches', titleTR: 'Batch red oranlarını incele', reasonTR: 'Red oranı eşiğin üstünde', severity: 'medium', deepLink: '/fabrika', estimatedMinutes: 10, bucket: 'T3', dataSource: 'factory_batch_verifications' },
      { type: 'review_checklists', titleTR: 'Checklist uyumluluğu', reasonTR: 'Checklist tamamlama oranları', severity: 'low', deepLink: '/checklistler', estimatedMinutes: 10, bucket: 'T1', dataSource: 'checklist_completions' },
    ],
  },

  [UserRole.GIDA_MUHENDISI]: {
    role: UserRole.GIDA_MUHENDISI,
    group: 'hq_ops',
    alerts: [
      { type: 'food_safety_violation', titleTR: 'Gıda güvenliği ihlali', severity: 'critical', dataSource: 'product_complaints', bucket: 'T3' },
    ],
    actions: [
      { type: 'review_safety', titleTR: 'Gıda güvenliği kontrolü', reasonTR: 'Kalite kontrol formları bekliyor', severity: 'high', deepLink: '/kalite', estimatedMinutes: 15, bucket: 'T3', dataSource: 'product_complaints' },
      { type: 'review_checklists', titleTR: 'Checklist denetimi', reasonTR: 'Gıda güvenliği checklist durumu', severity: 'medium', deepLink: '/checklistler', estimatedMinutes: 10, bucket: 'T1', dataSource: 'checklist_completions' },
      { type: 'review_complaints', titleTR: 'Ürün şikayetleri', reasonTR: 'Gıda kalitesi şikayetleri', severity: 'low', deepLink: '/kalite', estimatedMinutes: 10, bucket: 'T3', dataSource: 'product_complaints' },
    ],
  },

  [UserRole.MARKETING]: {
    role: UserRole.MARKETING,
    group: 'hq_ops',
    alerts: [
      { type: 'expired_banners', titleTR: 'Süresi dolan banner', severity: 'warning', dataSource: 'announcements', bucket: 'T6' },
    ],
    actions: [
      { type: 'update_banners', titleTR: 'Banner güncelle', reasonTR: 'Süresi dolmak üzere olan bannerlar', severity: 'high', deepLink: '/icerik-studyosu', estimatedMinutes: 15, bucket: 'T6', dataSource: 'announcements' },
      { type: 'check_announcements', titleTR: 'Duyuru takibi', reasonTR: 'Aktif duyuruların okunma durumu', severity: 'medium', deepLink: '/icerik-studyosu', estimatedMinutes: 10, bucket: 'T6', dataSource: 'announcements' },
      { type: 'plan_content', titleTR: 'İçerik planla', reasonTR: 'Haftalık içerik planlaması', severity: 'low', deepLink: '/icerik-studyosu', estimatedMinutes: 20, bucket: 'T6', dataSource: 'missing' },
    ],
  },

  [UserRole.DESTEK]: {
    role: UserRole.DESTEK,
    group: 'hq_ops',
    alerts: [
      { type: 'open_tickets', titleTR: 'Açık destek talebi', severity: 'warning', dataSource: 'equipment_faults', bucket: 'T7' },
    ],
    actions: [
      { type: 'respond_tickets', titleTR: 'Destek taleplerini yanıtla', reasonTR: 'Yanıt bekleyen talepler var', severity: 'high', deepLink: '/arizalar', estimatedMinutes: 15, bucket: 'T7', dataSource: 'equipment_faults' },
      { type: 'update_kb', titleTR: 'Bilgi bankasını güncelle', reasonTR: 'Sık sorulan sorulara göre güncelleme', severity: 'medium', deepLink: '/bilgi-bankasi', estimatedMinutes: 20, bucket: 'T2', dataSource: 'missing' },
      { type: 'track_issues', titleTR: 'Şube sorunlarını takip et', reasonTR: 'Devam eden sorunlar', severity: 'low', deepLink: '/arizalar', estimatedMinutes: 10, bucket: 'T7', dataSource: 'equipment_faults' },
    ],
  },

  [UserRole.MUHASEBE_IK]: {
    role: UserRole.MUHASEBE_IK,
    group: 'hq_finance',
    alerts: [
      { type: 'pending_leaves', titleTR: 'Bekleyen izin talepleri', severity: 'critical', dataSource: 'leave_requests', bucket: 'T4' },
      { type: 'missing_payroll', titleTR: 'Bordro verisi eksik', severity: 'warning', dataSource: 'missing', bucket: 'T4' },
    ],
    actions: [
      { type: 'approve_leaves', titleTR: 'İzin taleplerini onayla', reasonTR: '72 saatten fazla bekleyen talepler', severity: 'high', deepLink: '/ik', estimatedMinutes: 10, bucket: 'T4', dataSource: 'leave_requests' },
      { type: 'review_overtime', titleTR: 'Mesai raporu hazırla', reasonTR: 'Haftalık mesai verisi incelenmeli', severity: 'medium', deepLink: '/ik', estimatedMinutes: 15, bucket: 'T4', dataSource: 'shift_attendance' },
      { type: 'check_contracts', titleTR: 'Personel sözleşme kontrol', reasonTR: 'Sözleşme bitiş tarihleri yaklaşıyor', severity: 'low', deepLink: '/personel', estimatedMinutes: 10, bucket: 'T4', dataSource: 'users' },
    ],
  },

  [UserRole.SATINALMA]: {
    role: UserRole.SATINALMA,
    group: 'hq_finance',
    alerts: [
      { type: 'pending_po', titleTR: 'Onay bekleyen sipariş', severity: 'critical', dataSource: 'purchase_orders', bucket: 'T5' },
      { type: 'low_stock', titleTR: 'Kritik stok seviyesi', severity: 'warning', dataSource: 'inventory', bucket: 'T5' },
    ],
    actions: [
      { type: 'approve_po', titleTR: 'Sipariş onaylarını kontrol et', reasonTR: 'Bekleyen satınalma siparişleri', severity: 'high', deepLink: '/satinalma', estimatedMinutes: 10, bucket: 'T5', dataSource: 'purchase_orders' },
      { type: 'check_stock', titleTR: 'Stok durumunu incele', reasonTR: 'Eşik altı ürünler var', severity: 'high', deepLink: '/satinalma', estimatedMinutes: 10, bucket: 'T5', dataSource: 'inventory' },
      { type: 'compare_suppliers', titleTR: 'Tedarikçi karşılaştırması', reasonTR: 'Teklif süresi dolan tedarikçiler', severity: 'medium', deepLink: '/satinalma', estimatedMinutes: 15, bucket: 'T5', dataSource: 'supplier_quotes' },
    ],
  },

  [UserRole.FABRIKA_MUDUR]: {
    role: UserRole.FABRIKA_MUDUR,
    group: 'factory',
    alerts: [
      { type: 'batch_verification_overdue', titleTR: 'Batch onay gecikmesi', severity: 'critical', dataSource: 'factory_batch_verifications', bucket: 'T3' },
      { type: 'critical_stock', titleTR: 'Kritik hammadde stoku', severity: 'warning', dataSource: 'factory_inventory', bucket: 'T5' },
    ],
    actions: [
      { type: 'review_production', titleTR: 'Üretim planını kontrol et', reasonTR: 'Günlük üretim hedefi takibi', severity: 'high', deepLink: '/fabrika', estimatedMinutes: 10, bucket: 'T3', dataSource: 'factory_production_batches' },
      { type: 'verify_batches', titleTR: 'Batch onaylarını tamamla', reasonTR: 'Onay bekleyen batchler var', severity: 'high', deepLink: '/fabrika', estimatedMinutes: 10, bucket: 'T3', dataSource: 'factory_batch_verifications' },
      { type: 'check_stock', titleTR: 'Hammadde stok kontrol', reasonTR: 'Kritik seviyedeki hammaddeler', severity: 'medium', deepLink: '/satinalma', estimatedMinutes: 10, bucket: 'T5', dataSource: 'factory_inventory' },
    ],
  },

  [UserRole.FABRIKA_OPERATOR]: {
    role: UserRole.FABRIKA_OPERATOR,
    group: 'factory',
    alerts: [
      { type: 'active_batch_expiring', titleTR: 'Aktif batch süresi doluyor', severity: 'warning', dataSource: 'factory_production_batches', bucket: 'T3' },
    ],
    actions: [
      { type: 'check_batch', titleTR: 'Aktif batch durumu', reasonTR: 'Üretim batch\'i süresi doluyor', severity: 'high', deepLink: '/fabrika', estimatedMinutes: 5, bucket: 'T3', dataSource: 'factory_production_batches' },
      { type: 'maintenance_check', titleTR: 'Makine bakım kontrolü', reasonTR: 'Planlı bakım yaklaşıyor', severity: 'medium', deepLink: '/ekipman', estimatedMinutes: 10, bucket: 'T7', dataSource: 'equipment_maintenance_logs' },
      { type: 'complete_checklist', titleTR: 'Vardiya checklist tamamla', reasonTR: 'Günlük üretim checklist bekliyor', severity: 'medium', deepLink: '/gorevler', estimatedMinutes: 10, bucket: 'T1', dataSource: 'checklist_completions' },
    ],
  },

  [UserRole.FABRIKA_SORUMLU]: {
    role: UserRole.FABRIKA_SORUMLU,
    group: 'factory',
    alerts: [
      { type: 'shift_handover_incomplete', titleTR: 'Vardiya devri tamamlanmadı', severity: 'warning', dataSource: 'factory_shift_sessions', bucket: 'T4' },
    ],
    actions: [
      { type: 'production_line_check', titleTR: 'Üretim hattı kontrolü', reasonTR: 'Günlük hat denetimi bekliyor', severity: 'high', deepLink: '/fabrika', estimatedMinutes: 10, bucket: 'T3', dataSource: 'factory_production_batches' },
      { type: 'shift_handover', titleTR: 'Vardiya devir teslim', reasonTR: 'Vardiya bilgileri aktarılmalı', severity: 'high', deepLink: '/fabrika', estimatedMinutes: 10, bucket: 'T4', dataSource: 'factory_shift_sessions' },
      { type: 'equipment_status', titleTR: 'Ekipman durumu takibi', reasonTR: 'Ekipman bakım takvimi kontrol', severity: 'medium', deepLink: '/ekipman', estimatedMinutes: 10, bucket: 'T7', dataSource: 'equipment' },
    ],
  },

  [UserRole.FABRIKA_PERSONEL]: {
    role: UserRole.FABRIKA_PERSONEL,
    group: 'factory',
    alerts: [
      { type: 'overdue_daily_tasks', titleTR: 'Tamamlanmamış günlük görevler', severity: 'warning', dataSource: 'role_task_completions', bucket: 'T1' },
    ],
    actions: [
      { type: 'daily_tasks', titleTR: 'Günlük görev listesi', reasonTR: 'Bugünkü görevlerinizi tamamlayın', severity: 'high', deepLink: '/gorevler', estimatedMinutes: 15, bucket: 'T1', dataSource: 'role_task_completions' },
      { type: 'safety_check', titleTR: 'İş güvenliği kontrolü', reasonTR: 'Günlük güvenlik checklist', severity: 'medium', deepLink: '/gorevler', estimatedMinutes: 5, bucket: 'T1', dataSource: 'checklist_completions' },
      { type: 'training_module', titleTR: 'Eğitim modülü', reasonTR: 'Aylık eğitim hedefi', severity: 'low', deepLink: '/akademi', estimatedMinutes: 15, bucket: 'T2', dataSource: 'user_career_progress' },
    ],
  },

  [UserRole.CEO]: {
    role: UserRole.CEO,
    group: 'executive',
    alerts: [
      { type: 'multi_branch_decline', titleTR: 'Çoklu şube skor düşüşü', severity: 'critical', dataSource: 'user_career_progress', bucket: 'T8' },
      { type: 'sla_compliance_drop', titleTR: 'SLA uyum oranı düşüşü', severity: 'warning', dataSource: 'equipment_faults', bucket: 'T7' },
    ],
    actions: [
      { type: 'review_overview', titleTR: 'Genel durum özeti', reasonTR: 'Şube skorları ve trend analizi', severity: 'high', deepLink: '/ceo-command-center', estimatedMinutes: 10, bucket: 'T8', dataSource: 'user_career_progress' },
      { type: 'review_sla', titleTR: 'SLA uyum raporu', reasonTR: 'SLA performans trendi', severity: 'medium', deepLink: '/raporlar', estimatedMinutes: 10, bucket: 'T7', dataSource: 'equipment_faults' },
      { type: 'review_training', titleTR: 'Eğitim tamamlama oranı', reasonTR: 'Genel eğitim metrikleri', severity: 'low', deepLink: '/raporlar', estimatedMinutes: 10, bucket: 'T2', dataSource: 'user_career_progress' },
    ],
  },

  [UserRole.CGO]: {
    role: UserRole.CGO,
    group: 'executive',
    alerts: [
      { type: 'ops_kpi_breach', titleTR: 'Operasyon KPI ihlali', severity: 'critical', dataSource: 'equipment_faults', bucket: 'T8' },
    ],
    actions: [
      { type: 'review_ops', titleTR: 'Operasyon durumu', reasonTR: 'Haftalık arıza trendi artışta', severity: 'high', deepLink: '/cgo-command-center', estimatedMinutes: 10, bucket: 'T8', dataSource: 'equipment_faults' },
      { type: 'review_branches', titleTR: 'Şube personel durumu', reasonTR: 'Personel eksikliği olan şubeler', severity: 'medium', deepLink: '/subeler', estimatedMinutes: 10, bucket: 'T4', dataSource: 'users' },
      { type: 'review_projects', titleTR: 'Franchise proje durumu', reasonTR: 'Devam eden açılış projeleri', severity: 'low', deepLink: '/projeler', estimatedMinutes: 10, bucket: 'T8', dataSource: 'franchise_project_tasks' },
    ],
  },

  [UserRole.ADMIN]: {
    role: UserRole.ADMIN,
    group: 'executive',
    alerts: [
      { type: 'system_errors', titleTR: 'Sistem hata sayısı yüksek', severity: 'critical', dataSource: 'ai_agent_logs', bucket: 'T8' },
      { type: 'pending_users', titleTR: 'Onay bekleyen kullanıcılar', severity: 'warning', dataSource: 'users', bucket: 'T4' },
    ],
    actions: [
      { type: 'check_ai_logs', titleTR: 'AI panel hata kontrolü', reasonTR: 'Son 24 saatteki hata logları', severity: 'high', deepLink: '/akademi/ai-kanit', estimatedMinutes: 5, bucket: 'T8', dataSource: 'ai_agent_logs' },
      { type: 'check_backup', titleTR: 'Yedekleme durumu', reasonTR: 'Son yedekleme zamanı kontrol', severity: 'medium', deepLink: '/admin', estimatedMinutes: 5, bucket: 'T8', dataSource: 'missing' },
      { type: 'approve_users', titleTR: 'Kullanıcı onayları', reasonTR: 'Bekleyen kullanıcı başvuruları', severity: 'medium', deepLink: '/admin', estimatedMinutes: 10, bucket: 'T4', dataSource: 'users' },
    ],
  },
};

export function getNBAConfigForRole(role: string): RoleNBAConfig | null {
  return NBA_CONFIG[role] ?? null;
}

export function getAlertTemplatesForRole(role: string): AlertTemplate[] {
  return NBA_CONFIG[role]?.alerts ?? [];
}

export function getActionTemplatesForRole(role: string): ActionTemplate[] {
  return NBA_CONFIG[role]?.actions ?? [];
}

export function getAllActiveRoles(): string[] {
  return Object.keys(NBA_CONFIG);
}

export function getDeepLinksForRole(role: string): string[] {
  const config = NBA_CONFIG[role];
  if (!config) return [];
  return config.actions.map((a) => a.deepLink);
}
