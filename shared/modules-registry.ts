/**
 * DOSPRESSO Modules Registry - Tek Kaynak Noktası
 * Tüm modüller, mega-modül grupları ve navigasyon ayarları burada tanımlı
 */

export type NavigationType = 'direct' | 'hub';
export type ModuleScope = 'shared' | 'hq' | 'branch' | 'factory' | 'admin' | 'academy';

export interface ModuleDefinition {
  moduleKey: string;
  moduleName: string;
  category: ModuleScope;
  megaModule: MegaModuleId;
  description: string;
  icon: string;
  route?: string;
  roles?: string[];
  sortOrder: number;
}

export type MegaModuleId = 
  | 'dashboard'
  | 'operations'
  | 'equipment'
  | 'hr'
  | 'training'
  | 'factory'
  | 'reports'
  | 'newshop'
  | 'admin';

export interface MegaModuleDefinition {
  id: MegaModuleId;
  title: string;
  icon: string;
  color: string;
  navigationType: NavigationType;
  sortOrder: number;
  hubRoute?: string;
}

export const MEGA_MODULES: Record<MegaModuleId, MegaModuleDefinition> = {
  dashboard: {
    id: 'dashboard',
    title: 'Dashboard',
    icon: 'LayoutDashboard',
    color: 'bg-slate-500',
    navigationType: 'direct',
    sortOrder: 1,
  },
  operations: {
    id: 'operations',
    title: 'Operasyonlar',
    icon: 'ClipboardCheck',
    color: 'bg-green-500',
    navigationType: 'direct',
    sortOrder: 2,
  },
  equipment: {
    id: 'equipment',
    title: 'Ekipman & Bakım',
    icon: 'Wrench',
    color: 'bg-orange-500',
    navigationType: 'direct',
    sortOrder: 3,
  },
  hr: {
    id: 'hr',
    title: 'Personel & İK',
    icon: 'Users',
    color: 'bg-pink-500',
    navigationType: 'direct',
    sortOrder: 4,
  },
  training: {
    id: 'training',
    title: 'Eğitim & Akademi',
    icon: 'GraduationCap',
    color: 'bg-blue-500',
    navigationType: 'hub',
    sortOrder: 5,
    hubRoute: '/akademi',
  },
  factory: {
    id: 'factory',
    title: 'Fabrika & Üretim',
    icon: 'Factory',
    color: 'bg-indigo-600',
    navigationType: 'hub',
    sortOrder: 6,
    hubRoute: '/fabrika',
  },
  reports: {
    id: 'reports',
    title: 'Raporlar & Analitik',
    icon: 'BarChart3',
    color: 'bg-cyan-500',
    navigationType: 'hub',
    sortOrder: 7,
    hubRoute: '/raporlar-hub',
  },
  newshop: {
    id: 'newshop',
    title: 'Yeni Mağaza Açılışı',
    icon: 'Building2',
    color: 'bg-violet-600',
    navigationType: 'direct',
    sortOrder: 8,
  },
  admin: {
    id: 'admin',
    title: 'Yönetim & Ayarlar',
    icon: 'Settings',
    color: 'bg-slate-600',
    navigationType: 'hub',
    sortOrder: 9,
    hubRoute: '/admin',
  },
};

export const MODULES: ModuleDefinition[] = [
  // ═══════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════════
  { moduleKey: 'dashboard', moduleName: 'Panel', category: 'shared', megaModule: 'dashboard', description: 'Ana kontrol paneli', icon: 'LayoutDashboard', route: '/', sortOrder: 1 },

  // ═══════════════════════════════════════════════════════════════
  // OPERATIONS - Günlük operasyonel modüller (direkt erişim)
  // ═══════════════════════════════════════════════════════════════
  { moduleKey: 'tasks', moduleName: 'Görevler', category: 'shared', megaModule: 'operations', description: 'Görev yönetimi', icon: 'CheckSquare', route: '/gorevler', sortOrder: 10 },
  { moduleKey: 'checklists', moduleName: 'Kontrol Listeleri', category: 'shared', megaModule: 'operations', description: 'Checklist yönetimi', icon: 'ClipboardList', route: '/checklistler', sortOrder: 11 },
  { moduleKey: 'branches', moduleName: 'Şubeler', category: 'hq', megaModule: 'operations', description: 'Şube yönetimi', icon: 'Building2', route: '/subeler', sortOrder: 12 },
  { moduleKey: 'lost_found', moduleName: 'Kayıp Eşya', category: 'shared', megaModule: 'operations', description: 'Kayıp eşya takibi', icon: 'Briefcase', route: '/kayip-esya', sortOrder: 13 },
  { moduleKey: 'lost_found_hq', moduleName: 'Kayıp Eşya (HQ)', category: 'hq', megaModule: 'operations', description: 'Merkez kayıp eşya yönetimi', icon: 'Briefcase', route: '/kayip-esya-hq', sortOrder: 14 },
  { moduleKey: 'live_tracking', moduleName: 'Canlı Takip', category: 'hq', megaModule: 'operations', description: 'Personel konum takibi', icon: 'MapPin', route: '/canli-takip', sortOrder: 15 },
  { moduleKey: 'qr_scanner', moduleName: 'QR Tarama', category: 'shared', megaModule: 'operations', description: 'QR kod tarama', icon: 'QrCode', route: '/qr-tara', sortOrder: 16 },
  { moduleKey: 'branch_dashboard', moduleName: 'Şube Dashboard', category: 'branch', megaModule: 'operations', description: 'Şube kontrol paneli', icon: 'LayoutDashboard', route: '/sube/dashboard', sortOrder: 17 },
  { moduleKey: 'branch_kiosk', moduleName: 'Şube Kiosk', category: 'branch', megaModule: 'operations', description: 'Şube kiosk modu', icon: 'Tablet', route: '/sube/kiosk', sortOrder: 18 },

  // ═══════════════════════════════════════════════════════════════
  // EQUIPMENT - Ekipman ve arıza yönetimi
  // ═══════════════════════════════════════════════════════════════
  { moduleKey: 'equipment', moduleName: 'Ekipmanlar', category: 'shared', megaModule: 'equipment', description: 'Ekipman yönetimi', icon: 'Coffee', route: '/ekipman', sortOrder: 20 },
  { moduleKey: 'equipment_faults', moduleName: 'Ekipman Arızaları', category: 'shared', megaModule: 'equipment', description: 'Arıza takibi', icon: 'Wrench', route: '/ariza', sortOrder: 21 },
  { moduleKey: 'faults', moduleName: 'Arıza Yönetimi', category: 'shared', megaModule: 'equipment', description: 'Arıza takibi ve yönetimi', icon: 'AlertTriangle', route: '/ariza', sortOrder: 22 },
  { moduleKey: 'equipment_analytics', moduleName: 'Ekipman Analitik', category: 'hq', megaModule: 'equipment', description: 'Ekipman analitik raporları', icon: 'BarChart3', route: '/ekipman-analitics', sortOrder: 23 },
  { moduleKey: 'new_fault', moduleName: 'Yeni Arıza', category: 'shared', megaModule: 'equipment', description: 'Yeni arıza bildirimi', icon: 'AlertOctagon', route: '/ariza-yeni', sortOrder: 24 },

  // ═══════════════════════════════════════════════════════════════
  // HR - Personel ve İK yönetimi
  // ═══════════════════════════════════════════════════════════════
  { moduleKey: 'employees', moduleName: 'Personel', category: 'shared', megaModule: 'hr', description: 'Personel yönetimi', icon: 'Users', route: '/ik', sortOrder: 30 },
  { moduleKey: 'hr', moduleName: 'İnsan Kaynakları', category: 'hq', megaModule: 'hr', description: 'İK süreçleri', icon: 'Users', route: '/ik', sortOrder: 31 },
  { moduleKey: 'shifts', moduleName: 'Vardiyalar', category: 'shared', megaModule: 'hr', description: 'Vardiya yönetimi', icon: 'Calendar', route: '/vardiyalar', sortOrder: 32 },
  { moduleKey: 'shift_planning', moduleName: 'Vardiya Planlama', category: 'hq', megaModule: 'hr', description: 'Vardiya planlama', icon: 'CalendarDays', route: '/vardiya-planlama', sortOrder: 33 },
  { moduleKey: 'attendance', moduleName: 'Devam/Yoklama', category: 'shared', megaModule: 'hr', description: 'Çalışan devam takibi', icon: 'Clock', route: '/devam-takibi', sortOrder: 34 },
  { moduleKey: 'leave_requests', moduleName: 'İzin Talepleri', category: 'shared', megaModule: 'hr', description: 'İzin talep yönetimi', icon: 'Calendar', route: '/izin-talepleri', sortOrder: 35 },
  { moduleKey: 'overtime_requests', moduleName: 'Mesai Talepleri', category: 'shared', megaModule: 'hr', description: 'Mesai talep yönetimi', icon: 'Clock', route: '/mesai-talepleri', sortOrder: 36 },
  { moduleKey: 'accounting', moduleName: 'Muhasebe', category: 'hq', megaModule: 'hr', description: 'Muhasebe işlemleri', icon: 'Calculator', route: '/muhasebe', sortOrder: 37 },
  { moduleKey: 'employee_of_month', moduleName: 'Ayın Elemanı', category: 'hq', megaModule: 'hr', description: 'Ayın elemanı seçimi ve ödüllendirme', icon: 'Award', route: '/ayin-elemani', sortOrder: 38 },
  { moduleKey: 'staff_qr_tokens', moduleName: 'Personel QR Token', category: 'hq', megaModule: 'hr', description: 'Personel değerlendirme QR kodları', icon: 'QrCode', route: '/personel-qr-tokenlar', sortOrder: 39 },
  { moduleKey: 'personel_onboarding', moduleName: 'Personel Onboarding', category: 'hq', megaModule: 'hr', description: 'Yeni personel başlangıç süreci', icon: 'UserPlus', route: '/personel-onboarding', sortOrder: 40 },
  { moduleKey: 'personel_musaitlik', moduleName: 'Personel Müsaitlik', category: 'shared', megaModule: 'hr', description: 'Personel müsaitlik takibi', icon: 'CalendarCheck', route: '/personel-musaitlik', sortOrder: 41 },
  { moduleKey: 'my_shifts', moduleName: 'Vardiyalarım', category: 'shared', megaModule: 'hr', description: 'Kendi vardiya takibi', icon: 'CalendarDays', route: '/vardiyalarim', sortOrder: 42 },
  { moduleKey: 'shift_checkin', moduleName: 'Vardiya Giriş', category: 'shared', megaModule: 'hr', description: 'Vardiya check-in', icon: 'Clock', route: '/vardiya-checkin', sortOrder: 43 },
  { moduleKey: 'nfc_entry', moduleName: 'NFC Giriş', category: 'branch', megaModule: 'hr', description: 'NFC kart ile giriş', icon: 'CreditCard', route: '/nfc-giris', sortOrder: 44 },

  // ═══════════════════════════════════════════════════════════════
  // TRAINING - Akademi (Hub sayfa)
  // ═══════════════════════════════════════════════════════════════
  { moduleKey: 'training', moduleName: 'Eğitimler', category: 'shared', megaModule: 'training', description: 'Eğitim modülleri', icon: 'GraduationCap', route: '/akademi', sortOrder: 50 },
  { moduleKey: 'academy_general', moduleName: 'Genel Akademi', category: 'academy', megaModule: 'training', description: 'Temel akademi erişimi', icon: 'BookOpen', route: '/akademi', sortOrder: 51 },
  { moduleKey: 'academy_hq', moduleName: 'HQ Akademi', category: 'academy', megaModule: 'training', description: 'Merkez eğitim yönetimi', icon: 'GraduationCap', route: '/akademi-hq', sortOrder: 52 },
  { moduleKey: 'academy_supervisor', moduleName: 'Supervisor Akademi', category: 'academy', megaModule: 'training', description: 'Supervisor eğitim yönetimi', icon: 'UserCheck', route: '/akademi-supervisor', sortOrder: 53 },
  { moduleKey: 'academy_analytics', moduleName: 'Akademi Analitik', category: 'academy', megaModule: 'training', description: 'Eğitim istatistikleri', icon: 'BarChart3', route: '/akademi-analytics', sortOrder: 54 },
  { moduleKey: 'academy_advanced_analytics', moduleName: 'Gelişmiş Analitik', category: 'academy', megaModule: 'training', description: 'Detaylı analiz raporları', icon: 'LineChart', route: '/akademi-advanced-analytics', sortOrder: 55 },
  { moduleKey: 'academy_branch_analytics', moduleName: 'Şube Analitik', category: 'academy', megaModule: 'training', description: 'Şube bazlı eğitim istatistikleri', icon: 'Building2', route: '/akademi-branch-analytics', sortOrder: 56 },
  { moduleKey: 'academy_cohort_analytics', moduleName: 'Kohort Analitik', category: 'academy', megaModule: 'training', description: 'Kohort bazlı analiz', icon: 'Users2', route: '/akademi-cohort-analytics', sortOrder: 57 },
  { moduleKey: 'academy_badges', moduleName: 'Rozetler', category: 'academy', megaModule: 'training', description: 'Rozet ve başarı sistemi', icon: 'Award', route: '/akademi-badges', sortOrder: 58 },
  { moduleKey: 'academy_certificates', moduleName: 'Sertifikalar', category: 'academy', megaModule: 'training', description: 'Sertifika yönetimi', icon: 'Award', route: '/akademi-certificates', sortOrder: 59 },
  { moduleKey: 'academy_leaderboard', moduleName: 'Liderlik Tablosu', category: 'academy', megaModule: 'training', description: 'Sıralama ve yarışmalar', icon: 'Trophy', route: '/akademi-leaderboard', sortOrder: 60 },
  { moduleKey: 'academy_learning_paths', moduleName: 'Öğrenme Yolları', category: 'academy', megaModule: 'training', description: 'Kariyer ve öğrenme yolları', icon: 'Route', route: '/akademi-learning-paths', sortOrder: 61 },
  { moduleKey: 'academy_ai', moduleName: 'AI Asistan', category: 'academy', megaModule: 'training', description: 'Yapay zeka destekli eğitim', icon: 'Bot', route: '/akademi-ai-assistant', sortOrder: 62 },
  { moduleKey: 'academy_team_competitions', moduleName: 'Takım Yarışmaları', category: 'academy', megaModule: 'training', description: 'Takım bazlı yarışmalar', icon: 'Users', route: '/akademi-team-competitions', sortOrder: 63 },
  { moduleKey: 'academy_achievements', moduleName: 'Başarılar', category: 'academy', megaModule: 'training', description: 'Başarı sistemi', icon: 'Star', route: '/akademi-achievements', sortOrder: 64 },
  { moduleKey: 'academy_progress', moduleName: 'İlerleme', category: 'academy', megaModule: 'training', description: 'İlerleme takibi', icon: 'TrendingUp', route: '/akademi-progress-overview', sortOrder: 65 },
  { moduleKey: 'academy_streak', moduleName: 'Günlük Seri', category: 'academy', megaModule: 'training', description: 'Günlük öğrenme serisi', icon: 'Flame', route: '/akademi-streak-tracker', sortOrder: 66 },
  { moduleKey: 'academy_adaptive', moduleName: 'Adaptif Öğrenme', category: 'academy', megaModule: 'training', description: 'Kişiselleştirilmiş öğrenme', icon: 'Brain', route: '/akademi-adaptive-engine', sortOrder: 67 },
  { moduleKey: 'academy_social', moduleName: 'Sosyal Gruplar', category: 'academy', megaModule: 'training', description: 'Sosyal öğrenme grupları', icon: 'MessageCircle', route: '/akademi-social-groups', sortOrder: 68 },
  { moduleKey: 'knowledge_base', moduleName: 'Bilgi Bankası', category: 'shared', megaModule: 'training', description: 'Bilgi ve dokümantasyon', icon: 'BookOpen', route: '/bilgi-bankasi', sortOrder: 69 },

  // ═══════════════════════════════════════════════════════════════
  // FACTORY - Fabrika modülleri (Hub sayfa)
  // ═══════════════════════════════════════════════════════════════
  { moduleKey: 'factory', moduleName: 'Fabrika Genel', category: 'factory', megaModule: 'factory', description: 'Fabrika ana modülü', icon: 'Factory', route: '/fabrika', sortOrder: 70 },
  { moduleKey: 'factory_dashboard', moduleName: 'Fabrika Dashboard', category: 'factory', megaModule: 'factory', description: 'Fabrika kontrol paneli', icon: 'LayoutDashboard', route: '/fabrika/dashboard', sortOrder: 71 },
  { moduleKey: 'factory_kiosk', moduleName: 'Fabrika Kiosk', category: 'factory', megaModule: 'factory', description: 'Fabrika kiosk modu', icon: 'Tablet', route: '/fabrika/kiosk', sortOrder: 72 },
  { moduleKey: 'factory_production', moduleName: 'Üretim Planlama', category: 'factory', megaModule: 'factory', description: 'Üretim planlama ve takibi', icon: 'Factory', route: '/fabrika/uretim-planlama', sortOrder: 73 },
  { moduleKey: 'factory_quality', moduleName: 'Fabrika Kalite', category: 'factory', megaModule: 'factory', description: 'Fabrika kalite kontrol', icon: 'Star', route: '/fabrika/kalite-kontrol', sortOrder: 74 },
  { moduleKey: 'factory_performance', moduleName: 'Fabrika Performans', category: 'factory', megaModule: 'factory', description: 'Fabrika performans analizi', icon: 'TrendingUp', route: '/fabrika/performans', sortOrder: 75 },
  { moduleKey: 'factory_ai_reports', moduleName: 'AI Raporlar', category: 'factory', megaModule: 'factory', description: 'AI destekli fabrika raporları', icon: 'Bot', route: '/fabrika/ai-raporlar', sortOrder: 76 },
  { moduleKey: 'factory_compliance', moduleName: 'Fabrika Uyumluluk', category: 'factory', megaModule: 'factory', description: 'Vardiya uyumluluk takibi', icon: 'ShieldCheck', route: '/fabrika/vardiya-uyumluluk', sortOrder: 77 },
  { moduleKey: 'factory_hq_analytics', moduleName: 'HQ Fabrika Analitik', category: 'hq', megaModule: 'factory', description: 'Merkez fabrika analizi', icon: 'BarChart3', route: '/hq-fabrika-analitik', sortOrder: 78 },
  { moduleKey: 'factory_stations', moduleName: 'Fabrika İstasyonlar', category: 'admin', megaModule: 'factory', description: 'İstasyon yönetimi', icon: 'Layers', route: '/admin/fabrika-istasyonlar', sortOrder: 79 },
  { moduleKey: 'factory_waste_reasons', moduleName: 'Fire Sebepleri', category: 'admin', megaModule: 'factory', description: 'Fire sebepleri yönetimi', icon: 'Trash2', route: '/admin/fabrika-fire-sebepleri', sortOrder: 80 },
  { moduleKey: 'factory_quality_criteria', moduleName: 'Kalite Kriterleri', category: 'admin', megaModule: 'factory', description: 'Kalite kriterleri yönetimi', icon: 'CheckCircle', route: '/admin/fabrika-kalite-kriterleri', sortOrder: 81 },
  { moduleKey: 'factory_pin_management', moduleName: 'PIN Yönetimi', category: 'admin', megaModule: 'factory', description: 'Fabrika PIN yönetimi', icon: 'Key', route: '/admin/fabrika-pin-yonetimi', sortOrder: 82 },

  // ═══════════════════════════════════════════════════════════════
  // REPORTS - Raporlama modülleri (Hub sayfa)
  // ═══════════════════════════════════════════════════════════════
  { moduleKey: 'reports_hub', moduleName: 'Raporlar Hub', category: 'hq', megaModule: 'reports', description: 'Raporlama merkezi', icon: 'LayoutGrid', route: '/raporlar-hub', sortOrder: 79 },
  { moduleKey: 'reports', moduleName: 'Performans Raporları', category: 'hq', megaModule: 'reports', description: 'Performans raporları', icon: 'BarChart3', route: '/raporlar', sortOrder: 80 },
  { moduleKey: 'e2e_reports', moduleName: 'E2E Raporlar', category: 'hq', megaModule: 'reports', description: 'Uçtan uca raporlar', icon: 'FileBarChart', route: '/e2e-raporlar', sortOrder: 81 },
  { moduleKey: 'advanced_reports', moduleName: 'Gelişmiş Raporlar', category: 'hq', megaModule: 'reports', description: 'PDF ve detaylı analiz raporları', icon: 'FileText', route: '/gelismis-raporlar', sortOrder: 82 },
  { moduleKey: 'cash_reports', moduleName: 'Kasa Raporları', category: 'hq', megaModule: 'reports', description: 'Kasa raporları', icon: 'Wallet', route: '/kasa-raporlari', sortOrder: 83 },
  { moduleKey: 'hr_reports', moduleName: 'İK Raporları', category: 'hq', megaModule: 'reports', description: 'İK raporları', icon: 'Users', route: '/ik-raporlari', sortOrder: 84 },
  { moduleKey: 'quality_audit', moduleName: 'Kalite Denetimi', category: 'hq', megaModule: 'reports', description: 'Kalite denetim yönetimi', icon: 'FileSearch', route: '/kalite-denetimi', sortOrder: 85 },
  { moduleKey: 'audits', moduleName: 'Denetimler', category: 'hq', megaModule: 'reports', description: 'Denetim listesi', icon: 'ClipboardCheck', route: '/denetimler', sortOrder: 86 },
  { moduleKey: 'audit_templates', moduleName: 'Denetim Şablonları', category: 'hq', megaModule: 'reports', description: 'Denetim şablon yönetimi', icon: 'ClipboardList', route: '/denetim-sablonlari', sortOrder: 87 },
  { moduleKey: 'customer_satisfaction', moduleName: 'Müşteri Memnuniyeti', category: 'shared', megaModule: 'reports', description: 'Müşteri geri bildirimleri', icon: 'Heart', route: '/misafir-memnuniyeti', sortOrder: 88 },
  { moduleKey: 'performance', moduleName: 'Performans', category: 'shared', megaModule: 'reports', description: 'Performans takibi', icon: 'TrendingUp', route: '/performans', sortOrder: 89 },
  { moduleKey: 'my_performance', moduleName: 'Performansım', category: 'shared', megaModule: 'reports', description: 'Kişisel performans takibi', icon: 'User', route: '/performansim', sortOrder: 90 },

  // ═══════════════════════════════════════════════════════════════
  // NEW SHOP - Yeni mağaza açılış
  // ═══════════════════════════════════════════════════════════════
  { moduleKey: 'projects', moduleName: 'Projeler', category: 'hq', megaModule: 'newshop', description: 'Proje yönetimi', icon: 'FolderKanban', route: '/projeler', sortOrder: 100 },
  { moduleKey: 'new_branch_projects', moduleName: 'Yeni Şube Açılış', category: 'hq', megaModule: 'newshop', description: 'Yeni şube açılış projeleri', icon: 'Store', route: '/yeni-sube-projeler', sortOrder: 101 },
  { moduleKey: 'franchise_opening', moduleName: 'Franchise Açılış', category: 'hq', megaModule: 'newshop', description: 'Franchise açılış süreç yönetimi', icon: 'Building', route: '/franchise-acilis', sortOrder: 102 },
  { moduleKey: 'campaigns', moduleName: 'Kampanya Yönetimi', category: 'hq', megaModule: 'newshop', description: 'Kampanya oluşturma ve takibi', icon: 'Megaphone', route: '/kampanya-yonetimi', sortOrder: 103 },

  // ═══════════════════════════════════════════════════════════════
  // ADMIN - Yönetim ve ayarlar (Hub sayfa)
  // ═══════════════════════════════════════════════════════════════
  { moduleKey: 'users', moduleName: 'Kullanıcılar', category: 'hq', megaModule: 'admin', description: 'Kullanıcı yönetimi', icon: 'Users', route: '/yonetim/kullanicilar', sortOrder: 110 },
  { moduleKey: 'admin_users', moduleName: 'Admin Kullanıcılar', category: 'admin', megaModule: 'admin', description: 'Admin kullanıcı yönetimi', icon: 'UserCog', route: '/admin/kullanicilar', sortOrder: 111 },
  { moduleKey: 'authorization', moduleName: 'Rol ve Yetki Yönetimi', category: 'admin', megaModule: 'admin', description: 'Rol ve yetki yönetimi', icon: 'Shield', route: '/admin/yetkilendirme', sortOrder: 112 },
  { moduleKey: 'settings', moduleName: 'Ayarlar', category: 'admin', megaModule: 'admin', description: 'Sistem ayarları', icon: 'Settings', route: '/yonetim/ayarlar', sortOrder: 114 },
  { moduleKey: 'menu_management', moduleName: 'Menü Yönetimi', category: 'admin', megaModule: 'admin', description: 'Menü yönetimi', icon: 'Menu', route: '/yonetim/menu', sortOrder: 115 },
  { moduleKey: 'content_management', moduleName: 'İçerik Yönetimi', category: 'admin', megaModule: 'admin', description: 'İçerik yönetimi', icon: 'FileText', route: '/yonetim/icerik', sortOrder: 116 },
  { moduleKey: 'content_studio', moduleName: 'İçerik Stüdyosu', category: 'hq', megaModule: 'admin', description: 'Banner ve duyuru oluşturma', icon: 'Palette', route: '/icerik-studyosu', sortOrder: 117 },
  { moduleKey: 'banner_management', moduleName: 'Banner Yönetimi', category: 'hq', megaModule: 'admin', description: 'Banner tasarımı ve yayınlama', icon: 'Image', route: '/admin/bannerlar', sortOrder: 118 },
  { moduleKey: 'banner_editor', moduleName: 'Banner Editörü', category: 'hq', megaModule: 'admin', description: 'Banner tasarım aracı', icon: 'Palette', route: '/banner-editor', sortOrder: 119 },
  { moduleKey: 'admin_panel', moduleName: 'Admin Panel', category: 'admin', megaModule: 'admin', description: 'Admin paneli erişimi', icon: 'Shield', route: '/admin', sortOrder: 120 },
  { moduleKey: 'bulk_data', moduleName: 'Toplu Veri', category: 'admin', megaModule: 'admin', description: 'Toplu veri yönetimi', icon: 'Database', route: '/admin/toplu-veri-yonetimi', sortOrder: 121 },
  { moduleKey: 'email_settings', moduleName: 'Email Ayarları', category: 'admin', megaModule: 'admin', description: 'SMTP ve email yapılandırması', icon: 'Mail', route: '/admin/email-ayarlari', sortOrder: 122 },
  { moduleKey: 'service_mail_settings', moduleName: 'Servis Mail Ayarları', category: 'admin', megaModule: 'admin', description: 'Servis mail yapılandırması', icon: 'MailCheck', route: '/admin/servis-mail-ayarlari', sortOrder: 123 },
  { moduleKey: 'ai_settings', moduleName: 'AI Ayarları', category: 'admin', megaModule: 'admin', description: 'Yapay zeka ayarları', icon: 'Bot', route: '/admin/yapay-zeka-ayarlari', sortOrder: 124 },
  { moduleKey: 'ai_costs', moduleName: 'AI Maliyetler', category: 'admin', megaModule: 'admin', description: 'AI maliyet takibi', icon: 'DollarSign', route: '/yonetim/ai-maliyetler', sortOrder: 125 },
  { moduleKey: 'backup', moduleName: 'Yedekleme', category: 'admin', megaModule: 'admin', description: 'Sistem yedekleme', icon: 'HardDrive', route: '/admin/yedekleme', sortOrder: 126 },
  { moduleKey: 'activity_logs', moduleName: 'Aktivite Logları', category: 'admin', megaModule: 'admin', description: 'Sistem aktivite logları', icon: 'FileText', route: '/admin/aktivite-loglari', sortOrder: 127 },
  { moduleKey: 'admin_seed', moduleName: 'Seed Yönetimi', category: 'admin', megaModule: 'admin', description: 'Veritabanı seed işlemleri', icon: 'Database', route: '/admin/seed', sortOrder: 128 },
  { moduleKey: 'checklist_management', moduleName: 'Checklist Yönetimi', category: 'admin', megaModule: 'admin', description: 'Checklist şablon yönetimi', icon: 'ClipboardList', route: '/yonetim/checklistler', sortOrder: 129 },
  { moduleKey: 'checklist_tracking', moduleName: 'Checklist Takip', category: 'admin', megaModule: 'admin', description: 'Checklist tamamlanma takibi', icon: 'ClipboardCheck', route: '/yonetim/checklist-takip', sortOrder: 130 },
  { moduleKey: 'equipment_management', moduleName: 'Ekipman Yönetimi', category: 'admin', megaModule: 'admin', description: 'Ekipman tanımları', icon: 'Wrench', route: '/yonetim/ekipman-yonetimi', sortOrder: 131 },
  { moduleKey: 'equipment_service', moduleName: 'Ekipman Servis', category: 'admin', megaModule: 'admin', description: 'Servis firma yönetimi', icon: 'Settings2', route: '/yonetim/ekipman-servis', sortOrder: 132 },
  { moduleKey: 'service_requests', moduleName: 'Servis Talepleri', category: 'admin', megaModule: 'admin', description: 'Servis talep yönetimi', icon: 'Clipboard', route: '/yonetim/servis-talepleri', sortOrder: 133 },
  { moduleKey: 'quality_audit_templates', moduleName: 'Kalite Denetim Şablonları', category: 'admin', megaModule: 'admin', description: 'Kalite denetim şablonları', icon: 'FileSearch', route: '/admin/kalite-denetim-sablonlari', sortOrder: 134 },

  // ═══════════════════════════════════════════════════════════════
  // COMMUNICATION - İletişim modülleri (Admin altında)
  // ═══════════════════════════════════════════════════════════════
  { moduleKey: 'announcements', moduleName: 'Duyurular', category: 'shared', megaModule: 'admin', description: 'Duyuru yönetimi', icon: 'Megaphone', route: '/admin/duyurular', sortOrder: 120 },
  { moduleKey: 'notifications', moduleName: 'Bildirimler', category: 'shared', megaModule: 'admin', description: 'Bildirim sistemi', icon: 'Bell', route: '/bildirimler', sortOrder: 121 },
  { moduleKey: 'messages', moduleName: 'Mesajlar', category: 'shared', megaModule: 'admin', description: 'Mesajlaşma sistemi', icon: 'MessageSquare', route: '/mesajlar', sortOrder: 122 },
  { moduleKey: 'support', moduleName: 'Destek Talepleri', category: 'shared', megaModule: 'admin', description: 'Destek talepleri', icon: 'Headphones', route: '/hq-destek', sortOrder: 123 },
  { moduleKey: 'support_general', moduleName: 'Destek', category: 'shared', megaModule: 'admin', description: 'Genel destek', icon: 'HelpCircle', route: '/destek', sortOrder: 124 },
  { moduleKey: 'complaints', moduleName: 'Şikayetler', category: 'shared', megaModule: 'admin', description: 'Şikayet yönetimi', icon: 'MessageCircle', route: '/sikayetler', sortOrder: 124 },

  // ═══════════════════════════════════════════════════════════════
  // AI - Yapay zeka modülleri
  // ═══════════════════════════════════════════════════════════════
  { moduleKey: 'ai_assistant', moduleName: 'AI Asistan', category: 'shared', megaModule: 'dashboard', description: 'Yapay zeka asistanı', icon: 'Bot', route: '/ai-asistan', sortOrder: 130 },
];

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function getModuleByKey(moduleKey: string): ModuleDefinition | undefined {
  return MODULES.find(m => m.moduleKey === moduleKey);
}

export function getModulesByMegaModule(megaModuleId: MegaModuleId): ModuleDefinition[] {
  return MODULES.filter(m => m.megaModule === megaModuleId).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getModulesByCategory(category: ModuleScope): ModuleDefinition[] {
  return MODULES.filter(m => m.category === category).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getMegaModuleOrder(): MegaModuleId[] {
  return Object.values(MEGA_MODULES)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(m => m.id);
}

export function getModulesForPermissionSeed(): Array<{
  moduleKey: string;
  moduleName: string;
  category: string;
  description: string;
}> {
  return MODULES.map(m => ({
    moduleKey: m.moduleKey,
    moduleName: m.moduleName,
    category: m.category,
    description: m.description,
  }));
}

export function getMegaModuleMapping(): Record<string, string[]> {
  const mapping: Record<string, string[]> = {};
  
  for (const megaId of getMegaModuleOrder()) {
    mapping[megaId] = getModulesByMegaModule(megaId).map(m => m.moduleKey);
  }
  
  return mapping;
}

// Role-based module filtering
export const ROLE_MODULE_DEFAULTS: Record<string, string[]> = {
  admin: ['*'],
  muhasebe: ['dashboard', 'accounting', 'hr_reports', 'cash_reports', 'employees'],
  supervisor: ['dashboard', 'tasks', 'checklists', 'equipment', 'faults', 'shifts', 'employees', 'attendance', 'leave_requests', 'training', 'knowledge_base'],
  supervisor_buddy: ['dashboard', 'tasks', 'checklists', 'equipment', 'faults', 'shifts', 'employees', 'attendance'],
  barista: ['dashboard', 'tasks', 'checklists', 'training', 'my_performance', 'knowledge_base'],
  staff: ['dashboard', 'tasks', 'checklists', 'training', 'my_performance'],
  fabrika: ['factory', 'factory_dashboard', 'factory_kiosk', 'factory_production'],
  fabrika_mudur: ['factory', 'factory_dashboard', 'factory_kiosk', 'factory_production', 'factory_quality', 'factory_analytics', 'factory_compliance'],
  fabrika_kalite: ['factory', 'factory_dashboard', 'factory_quality'],
  yatirimci_hq: ['dashboard', 'branches', 'reports', 'e2e_reports', 'performance'],
  yatirimci_branch: ['dashboard', 'tasks', 'checklists', 'equipment', 'shifts', 'employees', 'reports'],
};
