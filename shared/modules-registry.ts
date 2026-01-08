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

  // ═══════════════════════════════════════════════════════════════
  // EQUIPMENT - Ekipman ve arıza yönetimi
  // ═══════════════════════════════════════════════════════════════
  { moduleKey: 'equipment', moduleName: 'Ekipmanlar', category: 'shared', megaModule: 'equipment', description: 'Ekipman yönetimi', icon: 'Coffee', route: '/ekipman', sortOrder: 20 },
  { moduleKey: 'equipment_faults', moduleName: 'Ekipman Arızaları', category: 'shared', megaModule: 'equipment', description: 'Arıza takibi', icon: 'Wrench', route: '/ekipman-arizalari', sortOrder: 21 },
  { moduleKey: 'faults', moduleName: 'Arıza Yönetimi', category: 'shared', megaModule: 'equipment', description: 'Arıza takibi ve yönetimi', icon: 'AlertTriangle', route: '/ariza', sortOrder: 22 },
  { moduleKey: 'equipment_analytics', moduleName: 'Ekipman Analitik', category: 'hq', megaModule: 'equipment', description: 'Ekipman analitik raporları', icon: 'BarChart3', route: '/ekipman-analitik', sortOrder: 23 },

  // ═══════════════════════════════════════════════════════════════
  // HR - Personel ve İK yönetimi
  // ═══════════════════════════════════════════════════════════════
  { moduleKey: 'employees', moduleName: 'Personel', category: 'shared', megaModule: 'hr', description: 'Personel yönetimi', icon: 'Users', route: '/ik', sortOrder: 30 },
  { moduleKey: 'hr', moduleName: 'İnsan Kaynakları', category: 'hq', megaModule: 'hr', description: 'İK süreçleri', icon: 'Users', route: '/personel-yonetimi', sortOrder: 31 },
  { moduleKey: 'shifts', moduleName: 'Vardiyalar', category: 'shared', megaModule: 'hr', description: 'Vardiya yönetimi', icon: 'Calendar', route: '/vardiyalar', sortOrder: 32 },
  { moduleKey: 'shift_planning', moduleName: 'Vardiya Planlama', category: 'hq', megaModule: 'hr', description: 'Vardiya planlama', icon: 'CalendarDays', route: '/vardiya-planlama', sortOrder: 33 },
  { moduleKey: 'attendance', moduleName: 'Devam/Yoklama', category: 'shared', megaModule: 'hr', description: 'Çalışan devam takibi', icon: 'Clock', route: '/devam-takibi', sortOrder: 34 },
  { moduleKey: 'leave_requests', moduleName: 'İzin Talepleri', category: 'shared', megaModule: 'hr', description: 'İzin talep yönetimi', icon: 'Calendar', route: '/izin-talepleri', sortOrder: 35 },
  { moduleKey: 'overtime_requests', moduleName: 'Mesai Talepleri', category: 'shared', megaModule: 'hr', description: 'Mesai talep yönetimi', icon: 'Clock', route: '/mesai-talepleri', sortOrder: 36 },
  { moduleKey: 'accounting', moduleName: 'Muhasebe', category: 'hq', megaModule: 'hr', description: 'Muhasebe işlemleri', icon: 'Calculator', route: '/muhasebe', sortOrder: 37 },
  { moduleKey: 'employee_of_month', moduleName: 'Ayın Elemanı', category: 'hq', megaModule: 'hr', description: 'Ayın elemanı seçimi ve ödüllendirme', icon: 'Award', route: '/ayin-elemani', sortOrder: 38 },
  { moduleKey: 'staff_qr_tokens', moduleName: 'Personel QR Token', category: 'hq', megaModule: 'hr', description: 'Personel değerlendirme QR kodları', icon: 'QrCode', route: '/personel-qr-tokenlar', sortOrder: 39 },
  { moduleKey: 'branch_shift_tracking', moduleName: 'Şube Puantaj', category: 'shared', megaModule: 'hr', description: 'Şube puantaj takibi', icon: 'Clock', route: '/sube-puantaj', sortOrder: 40 },

  // ═══════════════════════════════════════════════════════════════
  // TRAINING - Akademi (Hub sayfa)
  // ═══════════════════════════════════════════════════════════════
  { moduleKey: 'training', moduleName: 'Eğitimler', category: 'shared', megaModule: 'training', description: 'Eğitim modülleri', icon: 'GraduationCap', route: '/training', sortOrder: 50 },
  { moduleKey: 'academy_general', moduleName: 'Genel Akademi', category: 'academy', megaModule: 'training', description: 'Temel akademi erişimi', icon: 'BookOpen', route: '/akademi', sortOrder: 51 },
  { moduleKey: 'academy_hq', moduleName: 'HQ Akademi', category: 'academy', megaModule: 'training', description: 'Merkez eğitim yönetimi', icon: 'GraduationCap', route: '/yonetim/akademi', sortOrder: 52 },
  { moduleKey: 'academy_analytics', moduleName: 'Akademi Analitik', category: 'academy', megaModule: 'training', description: 'Eğitim istatistikleri', icon: 'BarChart3', route: '/akademi/analitik', sortOrder: 53 },
  { moduleKey: 'academy_badges', moduleName: 'Rozetler', category: 'academy', megaModule: 'training', description: 'Rozet ve başarı sistemi', icon: 'Award', route: '/akademi/rozetler', sortOrder: 54 },
  { moduleKey: 'academy_certificates', moduleName: 'Sertifikalar', category: 'academy', megaModule: 'training', description: 'Sertifika yönetimi', icon: 'Award', route: '/akademi/sertifikalar', sortOrder: 55 },
  { moduleKey: 'academy_leaderboard', moduleName: 'Liderlik Tablosu', category: 'academy', megaModule: 'training', description: 'Sıralama ve yarışmalar', icon: 'Trophy', route: '/akademi/leaderboard', sortOrder: 56 },
  { moduleKey: 'academy_quizzes', moduleName: 'Quizler', category: 'academy', megaModule: 'training', description: 'Quiz ve sınav sistemi', icon: 'FileQuestion', route: '/akademi/quizler', sortOrder: 57 },
  { moduleKey: 'academy_learning_paths', moduleName: 'Öğrenme Yolları', category: 'academy', megaModule: 'training', description: 'Kariyer ve öğrenme yolları', icon: 'Route', route: '/akademi/ogrenme-yollari', sortOrder: 58 },
  { moduleKey: 'academy_ai', moduleName: 'AI Asistan', category: 'academy', megaModule: 'training', description: 'Yapay zeka destekli eğitim', icon: 'Bot', route: '/akademi/ai-asistan', sortOrder: 59 },
  { moduleKey: 'knowledge_base', moduleName: 'Bilgi Bankası', category: 'shared', megaModule: 'training', description: 'Bilgi ve dokümantasyon', icon: 'BookOpen', route: '/bilgi-bankasi', sortOrder: 60 },

  // ═══════════════════════════════════════════════════════════════
  // FACTORY - Fabrika modülleri (Hub sayfa)
  // ═══════════════════════════════════════════════════════════════
  { moduleKey: 'factory', moduleName: 'Fabrika Genel', category: 'factory', megaModule: 'factory', description: 'Fabrika ana modülü', icon: 'Factory', route: '/fabrika', sortOrder: 70 },
  { moduleKey: 'factory_dashboard', moduleName: 'Fabrika Dashboard', category: 'factory', megaModule: 'factory', description: 'Fabrika kontrol paneli', icon: 'LayoutDashboard', route: '/fabrika/dashboard', sortOrder: 71 },
  { moduleKey: 'factory_kiosk', moduleName: 'Fabrika Kiosk', category: 'factory', megaModule: 'factory', description: 'Fabrika kiosk modu', icon: 'Tablet', route: '/fabrika/kiosk', sortOrder: 72 },
  { moduleKey: 'factory_production', moduleName: 'Üretim Planlama', category: 'factory', megaModule: 'factory', description: 'Üretim planlama ve takibi', icon: 'Factory', route: '/fabrika/uretim', sortOrder: 73 },
  { moduleKey: 'factory_quality', moduleName: 'Fabrika Kalite', category: 'factory', megaModule: 'factory', description: 'Fabrika kalite kontrol', icon: 'Star', route: '/fabrika/kalite', sortOrder: 74 },
  { moduleKey: 'factory_analytics', moduleName: 'Fabrika Analitik', category: 'factory', megaModule: 'factory', description: 'Fabrika analiz raporları', icon: 'BarChart3', route: '/fabrika/analitik', sortOrder: 75 },
  { moduleKey: 'factory_stations', moduleName: 'Fabrika İstasyonlar', category: 'factory', megaModule: 'factory', description: 'İstasyon yönetimi', icon: 'Layers', route: '/admin/fabrika-istasyonlar', sortOrder: 76 },
  { moduleKey: 'factory_compliance', moduleName: 'Fabrika Uyumluluk', category: 'factory', megaModule: 'factory', description: 'Vardiya uyumluluk takibi', icon: 'ShieldCheck', route: '/fabrika/uyumluluk', sortOrder: 77 },

  // ═══════════════════════════════════════════════════════════════
  // REPORTS - Raporlama modülleri (Hub sayfa)
  // ═══════════════════════════════════════════════════════════════
  { moduleKey: 'reports', moduleName: 'Performans Raporları', category: 'hq', megaModule: 'reports', description: 'Performans raporları', icon: 'BarChart3', route: '/raporlar', sortOrder: 80 },
  { moduleKey: 'e2e_reports', moduleName: 'E2E Raporlar', category: 'hq', megaModule: 'reports', description: 'Uçtan uca raporlar', icon: 'FileBarChart', route: '/e2e-raporlar', sortOrder: 81 },
  { moduleKey: 'advanced_reports', moduleName: 'Gelişmiş Raporlar', category: 'hq', megaModule: 'reports', description: 'PDF ve detaylı analiz raporları', icon: 'FileText', route: '/gelismis-raporlar', sortOrder: 82 },
  { moduleKey: 'cash_reports', moduleName: 'Kasa Raporları', category: 'hq', megaModule: 'reports', description: 'Kasa raporları', icon: 'Wallet', route: '/kasa-raporlari', sortOrder: 83 },
  { moduleKey: 'hr_reports', moduleName: 'İK Raporları', category: 'hq', megaModule: 'reports', description: 'İK raporları', icon: 'Users', route: '/ik-raporlari', sortOrder: 84 },
  { moduleKey: 'quality_audit', moduleName: 'Kalite Denetimi', category: 'hq', megaModule: 'reports', description: 'Kalite denetim yönetimi', icon: 'FileSearch', route: '/kalite-denetimi', sortOrder: 85 },
  { moduleKey: 'audit_templates', moduleName: 'Denetim Şablonları', category: 'hq', megaModule: 'reports', description: 'Denetim şablon yönetimi', icon: 'ClipboardList', route: '/denetim-sablonlari', sortOrder: 86 },
  { moduleKey: 'capa', moduleName: 'CAPA Yönetimi', category: 'hq', megaModule: 'reports', description: 'Düzeltici ve önleyici faaliyetler', icon: 'AlertTriangle', route: '/capa-yonetimi', sortOrder: 87 },
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
  { moduleKey: 'authorization', moduleName: 'Yetkilendirme', category: 'admin', megaModule: 'admin', description: 'Rol ve yetki yönetimi', icon: 'Shield', route: '/admin/yetkilendirme', sortOrder: 111 },
  { moduleKey: 'settings', moduleName: 'Ayarlar', category: 'admin', megaModule: 'admin', description: 'Sistem ayarları', icon: 'Settings', route: '/yonetim/ayarlar', sortOrder: 112 },
  { moduleKey: 'menu_management', moduleName: 'Menü Yönetimi', category: 'admin', megaModule: 'admin', description: 'Menü yönetimi', icon: 'Menu', route: '/yonetim/menu', sortOrder: 113 },
  { moduleKey: 'content_management', moduleName: 'İçerik Yönetimi', category: 'admin', megaModule: 'admin', description: 'İçerik yönetimi', icon: 'FileText', route: '/yonetim/icerik', sortOrder: 114 },
  { moduleKey: 'content_studio', moduleName: 'İçerik Stüdyosu', category: 'hq', megaModule: 'admin', description: 'Banner ve duyuru oluşturma', icon: 'Palette', route: '/icerik-studyosu', sortOrder: 115 },
  { moduleKey: 'banner_management', moduleName: 'Banner Yönetimi', category: 'hq', megaModule: 'admin', description: 'Banner tasarımı ve yayınlama', icon: 'Image', route: '/admin/bannerlar', sortOrder: 116 },
  { moduleKey: 'admin_panel', moduleName: 'Admin Panel', category: 'admin', megaModule: 'admin', description: 'Admin paneli erişimi', icon: 'Shield', route: '/admin', sortOrder: 117 },
  { moduleKey: 'admin_settings', moduleName: 'Admin Ayarları', category: 'admin', megaModule: 'admin', description: 'Admin sistem ayarları', icon: 'Cog', route: '/admin/ayarlar', sortOrder: 118 },
  { moduleKey: 'bulk_data', moduleName: 'Toplu Veri', category: 'admin', megaModule: 'admin', description: 'Toplu veri yönetimi', icon: 'Database', route: '/admin/toplu-veri-yonetimi', sortOrder: 119 },

  // ═══════════════════════════════════════════════════════════════
  // COMMUNICATION - İletişim modülleri (Admin altında)
  // ═══════════════════════════════════════════════════════════════
  { moduleKey: 'announcements', moduleName: 'Duyurular', category: 'shared', megaModule: 'admin', description: 'Duyuru yönetimi', icon: 'Megaphone', route: '/admin/duyurular', sortOrder: 120 },
  { moduleKey: 'notifications', moduleName: 'Bildirimler', category: 'shared', megaModule: 'admin', description: 'Bildirim sistemi', icon: 'Bell', route: '/bildirimler', sortOrder: 121 },
  { moduleKey: 'messages', moduleName: 'Mesajlar', category: 'shared', megaModule: 'admin', description: 'Mesajlaşma sistemi', icon: 'MessageSquare', route: '/mesajlar', sortOrder: 122 },
  { moduleKey: 'support', moduleName: 'Destek Talepleri', category: 'shared', megaModule: 'admin', description: 'Destek talepleri', icon: 'Headphones', route: '/hq-destek', sortOrder: 123 },
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
