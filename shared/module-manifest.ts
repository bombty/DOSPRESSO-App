/**
 * DOSPRESSO Modül Manifest Sistemi
 * Tek kaynak: Tüm modüller, alt modüller, roller, yetkiler burada tanımlı
 * 
 * Bu dosya şunları kontrol eder:
 * 1. HomeScreen'de hangi kartlar gösterilir
 * 2. Module flags seed verileri
 * 3. API endpoint yetkileri
 * 4. Sidebar menü yapısı
 * 5. Admin yetkilendirme paneli
 */

export interface SubModule {
  id: string;
  name: string;
  description: string;
  path: string;               // Frontend route
  apiPrefix?: string;          // API endpoint prefix
  canDisable: boolean;         // Admin kapatabılır mı
  defaultEnabled: boolean;     // Varsayılan aktif mi
  flagBehavior: 'always_on' | 'standard' | 'ui_hidden_data_continues' | 'fully_hidden';
}

export interface ModuleRoleAccess {
  view: boolean | 'own';       // true = görür, 'own' = sadece kendini görür
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
  scope: 'own_branch' | 'managed_branches' | 'all_branches' | 'own_data';
}

export interface ModuleManifest {
  id: string;
  flagKey: string;             // Mevcut module_flags tablosundaki key (geriye uyumlu)
  name: string;
  nameTr: string;
  icon: string;
  color: string;
  category: 'core' | 'hr' | 'operations' | 'finance' | 'customer' | 'factory' | 'analytics' | 'ai';
  canDisable: boolean;
  defaultEnabled: boolean;
  flagBehavior: 'always_on' | 'standard' | 'ui_hidden_data_continues' | 'fully_hidden';
  requires: string[];          // Bağımlı olduğu modüller
  provides: string[];          // Sağladığı veri türleri (event bus)
  subModules: SubModule[];
  roles: Record<string, ModuleRoleAccess>;
  homeScreenCard?: {
    title: string;
    subtitle: string;
    path: string;
  };
}

// ═══════════════════════════════════════════════════
// M01: ÇEKİRDEK SİSTEM (kapatılamaz)
// ═══════════════════════════════════════════════════
export const M01_CORE: ModuleManifest = {
  id: 'm01-core',
  flagKey: 'admin',
  name: 'Core System',
  nameTr: 'Çekirdek Sistem',
  icon: 'Shield',
  color: '#8a7d6d',
  category: 'core',
  canDisable: false,
  defaultEnabled: true,
  flagBehavior: 'always_on',
  requires: [],
  provides: ['user_data', 'branch_data', 'notification_data', 'auth_data'],
  subModules: [
    { id: 'auth', name: 'Kimlik Doğrulama', description: 'Login, session, şifre', path: '/login', canDisable: false, defaultEnabled: true, flagBehavior: 'always_on' },
    { id: 'users', name: 'Kullanıcı Yönetimi', description: 'Personel CRUD', path: '/admin/kullanicilar', canDisable: false, defaultEnabled: true, flagBehavior: 'always_on' },
    { id: 'branches', name: 'Şube Yönetimi', description: 'Şube CRUD', path: '/subeler', canDisable: false, defaultEnabled: true, flagBehavior: 'always_on' },
    { id: 'notifications', name: 'Bildirim Sistemi', description: 'Push, email, in-app', path: '/bildirimler', canDisable: false, defaultEnabled: true, flagBehavior: 'always_on' },
    { id: 'module-flags', name: 'Modül Yönetimi', description: 'Admin modül on/off', path: '/admin/yetkilendirme', canDisable: false, defaultEnabled: true, flagBehavior: 'always_on' },
    { id: 'audit', name: 'Denetim Kaydı', description: 'Tüm işlem logları', path: '/admin/aktivite-loglari', canDisable: false, defaultEnabled: true, flagBehavior: 'always_on' },
  ],
  roles: {
    admin:            { view: true, create: true, edit: true, delete: true, approve: true, scope: 'all_branches' },
    ceo:              { view: true, create: false, edit: false, delete: false, approve: true, scope: 'all_branches' },
    cgo:              { view: true, create: false, edit: false, delete: false, approve: true, scope: 'all_branches' },
    coach:            { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    trainer:          { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    muhasebe_ik:      { view: true, create: true, edit: true, delete: false, approve: false, scope: 'managed_branches' },
    muhasebe:         { view: true, create: false, edit: false, delete: false, approve: false, scope: 'managed_branches' },
    supervisor:       { view: true, create: true, edit: true, delete: false, approve: false, scope: 'own_branch' },
    mudur:            { view: true, create: true, edit: true, delete: false, approve: false, scope: 'own_branch' },
    yatirimci_branch: { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
    yatirimci_hq:    { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    sube_kiosk:      { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
    barista:          { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
    supervisor_buddy: { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
    bar_buddy:        { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
    stajyer:          { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
    teknik:           { view: true, create: true, edit: true, delete: false, approve: true, scope: 'all_branches' },
    fabrika_mudur:    { view: true, create: true, edit: true, delete: false, approve: false, scope: 'own_branch' },
  },
};

// ═══════════════════════════════════════════════════
// M02: İK & PERSONEL
// ═══════════════════════════════════════════════════
export const M02_IK: ModuleManifest = {
  id: 'm02-ik',
  flagKey: 'ik',
  name: 'HR & Personnel',
  nameTr: 'İK & Personel',
  icon: 'Users',
  color: '#2ecc71',
  category: 'hr',
  canDisable: false,
  defaultEnabled: true,
  flagBehavior: 'always_on',
  requires: ['m01-core'],
  provides: ['employee_data', 'leave_data', 'onboarding_data'],
  subModules: [
    { id: 'personnel-cards', name: 'Personel Kartları', description: 'Profil, belgeler, iletişim', path: '/ik', canDisable: false, defaultEnabled: true, flagBehavior: 'always_on' },
    { id: 'leave-mgmt', name: 'İzin Yönetimi', description: 'Talep, onay, bakiye', path: '/izin-talepleri', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
    { id: 'onboarding', name: 'Onboarding', description: 'Yeni personel süreci', path: '/akademi/personel-onboarding', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
    { id: 'performance', name: 'Performans Değerlendirme', description: 'Personel değerlendirme', path: '/personel-degerlendirme', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
    { id: 'attendance-overview', name: 'Devam Takibi', description: 'Yıllık devamsızlık özeti', path: '/devam-takibi', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
  ],
  roles: {
    admin:            { view: true, create: true, edit: true, delete: true, approve: true, scope: 'all_branches' },
    ceo:              { view: true, create: false, edit: false, delete: false, approve: true, scope: 'all_branches' },
    cgo:              { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    muhasebe_ik:      { view: true, create: true, edit: true, delete: false, approve: true, scope: 'managed_branches' },
    muhasebe:         { view: true, create: false, edit: false, delete: false, approve: false, scope: 'managed_branches' },
    coach:            { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    trainer:          { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    mudur:            { view: true, create: true, edit: true, delete: false, approve: true, scope: 'own_branch' },
    supervisor:       { view: true, create: false, edit: false, delete: false, approve: true, scope: 'own_branch' },
    yatirimci_branch: { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
    barista:          { view: true, create: true, edit: false, delete: false, approve: false, scope: 'own_data' },
    supervisor_buddy: { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
    bar_buddy:        { view: true, create: true, edit: false, delete: false, approve: false, scope: 'own_data' },
    stajyer:          { view: true, create: true, edit: false, delete: false, approve: false, scope: 'own_data' },
  },
};

// ═══════════════════════════════════════════════════
// M03: VARDİYA & PUANTAJ
// ═══════════════════════════════════════════════════
export const M03_VARDIYA: ModuleManifest = {
  id: 'm03-vardiya',
  flagKey: 'vardiya',
  name: 'Shift & Attendance',
  nameTr: 'Vardiya & Puantaj',
  icon: 'Clock',
  color: '#5dade2',
  category: 'hr',
  canDisable: false,
  defaultEnabled: true,
  flagBehavior: 'always_on',
  requires: ['m01-core', 'm02-ik'],
  provides: ['shift_data', 'pdks_records', 'attendance_summary', 'overtime_data'],
  subModules: [
    { id: 'shift-planning', name: 'Vardiya Planlama', description: 'Haftalık/aylık planlama', path: '/vardiya-planlama', canDisable: false, defaultEnabled: true, flagBehavior: 'always_on' },
    { id: 'my-shifts', name: 'Vardiyalarım', description: 'Çalışan vardiya görünümü', path: '/vardiyalarim', canDisable: false, defaultEnabled: true, flagBehavior: 'always_on' },
    { id: 'kiosk', name: 'Kiosk Sistemi', description: 'QR + PIN check-in/out', path: '/sube/kiosk', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
    { id: 'pdks', name: 'Puantaj (PDKS)', description: 'Puantaj kayıtları', path: '/pdks', canDisable: false, defaultEnabled: true, flagBehavior: 'ui_hidden_data_continues' },
    { id: 'overtime', name: 'Fazla Mesai Talepleri', description: 'Talep ve onay', path: '/mesai-talepleri', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
    { id: 'shift-swap', name: 'Vardiya Takas', description: 'Çift onay takas', path: '/vardiyalarim', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
    { id: 'shift-templates', name: 'Vardiya Şablonları', description: 'Tekrarlayan planlar', path: '/vardiya-planlama', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
  ],
  roles: {
    admin:            { view: true, create: true, edit: true, delete: true, approve: true, scope: 'all_branches' },
    ceo:              { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    cgo:              { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    muhasebe_ik:      { view: true, create: false, edit: false, delete: false, approve: false, scope: 'managed_branches' },
    coach:            { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    trainer:            { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    mudur:            { view: true, create: true, edit: true, delete: true, approve: true, scope: 'own_branch' },
    supervisor:       { view: true, create: true, edit: true, delete: true, approve: false, scope: 'own_branch' },
    supervisor_buddy: { view: true, create: true, edit: true, delete: false, approve: false, scope: 'own_branch' },
    barista:          { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_data' },
    bar_buddy:        { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_data' },
    stajyer:          { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_data' },
  },
};

// ═══════════════════════════════════════════════════
// M04: BORDRO & FİNANS
// ═══════════════════════════════════════════════════
export const M04_BORDRO: ModuleManifest = {
  id: 'm04-bordro',
  flagKey: 'bordro',
  name: 'Payroll & Finance',
  nameTr: 'Bordro & Finans',
  icon: 'Banknote',
  color: '#f39c12',
  category: 'finance',
  canDisable: false,
  defaultEnabled: true,
  flagBehavior: 'always_on',
  requires: ['m01-core', 'm02-ik', 'm03-vardiya'],
  provides: ['payroll_data', 'salary_data'],
  subModules: [
    { id: 'payroll-calc', name: 'Bordro Hesaplama', description: 'Aylık bordro', path: '/pdks', canDisable: false, defaultEnabled: true, flagBehavior: 'always_on' },
    { id: 'payroll-view', name: 'Bordro Görüntüleme', description: 'Çalışan bordro', path: '/bordrom', canDisable: false, defaultEnabled: true, flagBehavior: 'always_on' },
    { id: 'salary-table', name: 'Maaş Tablosu', description: 'Pozisyon maaşları', path: '/pdks', canDisable: false, defaultEnabled: true, flagBehavior: 'always_on' },
    { id: 'cost-mgmt', name: 'Maliyet Yönetimi', description: 'Şube maliyet analizi', path: '/muhasebe', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
  ],
  roles: {
    admin:            { view: true, create: true, edit: true, delete: true, approve: true, scope: 'all_branches' },
    ceo:              { view: true, create: false, edit: false, delete: false, approve: true, scope: 'all_branches' },
    cgo:              { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    muhasebe_ik:      { view: true, create: true, edit: true, delete: false, approve: true, scope: 'managed_branches' },
    muhasebe:         { view: true, create: true, edit: true, delete: false, approve: true, scope: 'managed_branches' },
    mudur:            { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
    supervisor:       { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
    yatirimci_branch: { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
    barista:          { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_data' },
    supervisor_buddy: { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
    bar_buddy:        { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_data' },
    stajyer:          { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_data' },
  },
};

// ═══════════════════════════════════════════════════
// M05: OPERASYON
// ═══════════════════════════════════════════════════
export const M05_OPERASYON: ModuleManifest = {
  id: 'm05-operasyon',
  flagKey: 'gorevler',
  name: 'Operations',
  nameTr: 'Operasyon',
  icon: 'ClipboardCheck',
  color: '#2ecc71',
  category: 'operations',
  canDisable: true,
  defaultEnabled: true,
  flagBehavior: 'standard',
  requires: ['m01-core'],
  provides: ['task_data', 'checklist_data'],
  subModules: [
    { id: 'tasks', name: 'Görev Yönetimi', description: 'Atama, takip, onay', path: '/gorevler', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
    { id: 'checklists', name: 'Checklist Sistemi', description: 'Günlük/haftalık kontroller', path: '/checklistler', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
    { id: 'lost-found', name: 'Kayıp Eşya', description: 'Kayıp/bulunan eşya', path: '/kayip-esya', canDisable: true, defaultEnabled: true, flagBehavior: 'fully_hidden' },
    { id: 'quality-audit', name: 'Kalite Denetim', description: 'Şube denetim formları', path: '/kalite-denetim', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
    { id: 'agenda', name: 'Ajanda', description: 'Takvim ve planlama', path: '/ajanda', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
  ],
  roles: {
    admin:            { view: true, create: true, edit: true, delete: true, approve: true, scope: 'all_branches' },
    ceo:              { view: true, create: true, edit: true, delete: false, approve: true, scope: 'all_branches' },
    cgo:              { view: true, create: true, edit: true, delete: false, approve: true, scope: 'all_branches' },
    coach:            { view: true, create: true, edit: true, delete: false, approve: true, scope: 'all_branches' },
    trainer:            { view: true, create: true, edit: true, delete: false, approve: true, scope: 'all_branches' },
    mudur:            { view: true, create: true, edit: true, delete: true, approve: true, scope: 'own_branch' },
    supervisor:       { view: true, create: true, edit: true, delete: false, approve: false, scope: 'own_branch' },
    supervisor_buddy: { view: true, create: true, edit: true, delete: false, approve: false, scope: 'own_branch' },
    barista:          { view: true, create: true, edit: false, delete: false, approve: false, scope: 'own_branch' },
    bar_buddy:        { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
    stajyer:          { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
    yatirimci_branch: { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
  },
};

// ═══════════════════════════════════════════════════
// M06: EKİPMAN & ARIZA
// ═══════════════════════════════════════════════════
export const M06_EKIPMAN: ModuleManifest = {
  id: 'm06-ekipman',
  flagKey: 'ekipman',
  name: 'Equipment & Faults',
  nameTr: 'Ekipman & Arıza',
  icon: 'Wrench',
  color: '#e74c3c',
  category: 'operations',
  canDisable: true,
  defaultEnabled: true,
  flagBehavior: 'standard',
  requires: ['m01-core'],
  provides: ['fault_data', 'equipment_data'],
  subModules: [
    { id: 'equipment-list', name: 'Ekipman Envanteru', description: 'Ekipman listesi', path: '/ekipman', canDisable: false, defaultEnabled: true, flagBehavior: 'always_on' },
    { id: 'fault-reporting', name: 'Arıza Bildirimi', description: 'Fotoğraflı bildirim', path: '/ariza', canDisable: false, defaultEnabled: true, flagBehavior: 'always_on' },
    { id: 'sla', name: 'SLA Yönetimi', description: 'Servis sözleşmeleri', path: '/ekipman', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
    { id: 'maintenance', name: 'Bakım Takvimi', description: 'Periyodik bakım', path: '/ekipman', canDisable: true, defaultEnabled: false, flagBehavior: 'fully_hidden' },
  ],
  roles: {
    admin:            { view: true, create: true, edit: true, delete: true, approve: true, scope: 'all_branches' },
    ceo:              { view: true, create: false, edit: false, delete: false, approve: true, scope: 'all_branches' },
    cgo:              { view: true, create: true, edit: true, delete: false, approve: true, scope: 'all_branches' },
    teknik:           { view: true, create: true, edit: true, delete: false, approve: true, scope: 'all_branches' },
    coach:            { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    trainer:          { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    fabrika_mudur:    { view: true, create: true, edit: true, delete: false, approve: false, scope: 'all_branches' },
    mudur:            { view: true, create: true, edit: true, delete: false, approve: false, scope: 'own_branch' },
    yatirimci_branch: { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
    supervisor:       { view: true, create: true, edit: true, delete: false, approve: false, scope: 'own_branch' },
    supervisor_buddy: { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
    barista:          { view: true, create: true, edit: false, delete: false, approve: false, scope: 'own_branch' },
    bar_buddy:        { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
    stajyer:          { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
  },
};

// ═══════════════════════════════════════════════════
// M07: AKADEMİ & EĞİTİM
// ═══════════════════════════════════════════════════
export const M07_AKADEMI: ModuleManifest = {
  id: 'm07-akademi',
  flagKey: 'akademi',
  name: 'Academy & Training',
  nameTr: 'Akademi & Eğitim',
  icon: 'GraduationCap',
  color: '#9b59b6',
  category: 'hr',
  canDisable: true,
  defaultEnabled: true,
  flagBehavior: 'standard',
  requires: ['m01-core'],
  provides: ['training_data', 'certificate_data', 'quiz_data'],
  subModules: [
    { id: 'modules', name: 'Eğitim Modülleri', description: 'İçerik, video, metin', path: '/akademi', canDisable: false, defaultEnabled: true, flagBehavior: 'always_on' },
    { id: 'quiz', name: 'Quiz & Sınav', description: 'Bilgi testleri', path: '/akademi', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
    { id: 'certificates', name: 'Sertifika Sistemi', description: 'Otomatik sertifika', path: '/akademi/sertifikalar', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
    { id: 'badges', name: 'Rozet & Başarılar', description: 'Gamification', path: '/akademi/rozetler', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
    { id: 'leaderboard', name: 'Liderlik Tablosu', description: 'Sıralama', path: '/akademi/siralama', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
    { id: 'learning-paths', name: 'Öğrenme Yolları', description: 'Kariyer yolu', path: '/akademi/ogrenme-yollari', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
  ],
  roles: {
    admin:            { view: true, create: true, edit: true, delete: true, approve: true, scope: 'all_branches' },
    coach:            { view: true, create: true, edit: true, delete: false, approve: true, scope: 'all_branches' },
    trainer:          { view: true, create: true, edit: true, delete: false, approve: true, scope: 'all_branches' },
    mudur:            { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
    supervisor:       { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
    barista:          { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_data' },
    bar_buddy:        { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_data' },
    stajyer:          { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_data' },
    ceo:              { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    cgo:              { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    supervisor_buddy: { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
    yatirimci_branch: { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
  },
};

// ═══════════════════════════════════════════════════
// M08: CRM & MÜŞTERİ İLİŞKİLERİ
// ═══════════════════════════════════════════════════
export const M08_CRM: ModuleManifest = {
  id: 'm08-crm',
  flagKey: 'crm',
  name: 'CRM & Customer Relations',
  nameTr: 'CRM & Müşteri',
  icon: 'Heart',
  color: '#e91e63',
  category: 'customer',
  canDisable: true,
  defaultEnabled: true,
  flagBehavior: 'standard',
  requires: ['m01-core'],
  provides: ['feedback_data', 'complaint_data', 'ticket_data'],
  subModules: [
    { id: 'feedback', name: 'Müşteri Geri Bildirim', description: 'QR feedback', path: '/crm', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
    { id: 'complaints', name: 'Şikayet Yönetimi', description: 'Şikayet takip', path: '/crm', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
    { id: 'tickets', name: 'Destek Talepleri', description: 'Ticket sistemi', path: '/iletisim-merkezi', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
    { id: 'campaigns', name: 'Kampanya Yönetimi', description: 'Promosyon kampanyaları', path: '/crm', canDisable: true, defaultEnabled: false, flagBehavior: 'fully_hidden' },
    { id: 'announcements', name: 'Duyuru Sistemi', description: 'Personel duyuruları', path: '/duyurular', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
  ],
  roles: {
    admin:            { view: true, create: true, edit: true, delete: true, approve: true, scope: 'all_branches' },
    ceo:              { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    marketing:        { view: true, create: true, edit: true, delete: false, approve: true, scope: 'all_branches' },
    coach:            { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    trainer:            { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    destek:           { view: true, create: true, edit: true, delete: false, approve: false, scope: 'all_branches' },
    mudur:            { view: true, create: true, edit: true, delete: false, approve: false, scope: 'own_branch' },
    supervisor:       { view: true, create: true, edit: false, delete: false, approve: false, scope: 'own_branch' },
    cgo:              { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    supervisor_buddy: { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
    barista:          { view: true, create: true, edit: false, delete: false, approve: false, scope: 'own_branch' },
    yatirimci_branch: { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
  },
};

// ═══════════════════════════════════════════════════
// M09: FABRİKA
// ═══════════════════════════════════════════════════
export const M09_FABRIKA: ModuleManifest = {
  id: 'm09-fabrika',
  flagKey: 'fabrika',
  name: 'Factory',
  nameTr: 'Fabrika',
  icon: 'Factory',
  color: '#795548',
  category: 'factory',
  canDisable: true,
  defaultEnabled: true,
  flagBehavior: 'standard',
  requires: ['m01-core'],
  provides: ['production_data', 'shipment_data', 'lot_data', 'quality_data'],
  subModules: [
    { id: 'production', name: 'Üretim Planlama', description: 'Günlük üretim', path: '/fabrika/dashboard', canDisable: false, defaultEnabled: true, flagBehavior: 'always_on' },
    { id: 'quality', name: 'Kalite Kontrol', description: '2 aşamalı QC', path: '/fabrika/kalite-kontrol', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
    { id: 'shipment', name: 'Sevkiyat', description: 'LOT + sevkiyat takibi', path: '/fabrika/sevkiyat', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
    { id: 'factory-kiosk', name: 'Fabrika Kiosk', description: 'Fabrika vardiya', path: '/fabrika/kiosk', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
    { id: 'haccp', name: 'HACCP & Gıda Güvenliği', description: 'Gıda güvenliği', path: '/fabrika/haccp', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
    { id: 'roasting', name: 'Kavurma Logları', description: 'Kahve kavurma', path: '/fabrika/kavurma', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
  ],
  roles: {
    admin:            { view: true, create: true, edit: true, delete: true, approve: true, scope: 'all_branches' },
    ceo:              { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    cgo:              { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    fabrika_mudur:    { view: true, create: true, edit: true, delete: true, approve: true, scope: 'own_branch' },
    kalite_kontrol:   { view: true, create: true, edit: true, delete: false, approve: true, scope: 'all_branches' },
    gida_muhendisi:   { view: true, create: true, edit: true, delete: false, approve: true, scope: 'all_branches' },
    uretim_sefi:      { view: true, create: true, edit: true, delete: false, approve: false, scope: 'own_branch' },
    fabrika_operator: { view: true, create: true, edit: false, delete: false, approve: false, scope: 'own_branch' },
    fabrika_sorumlu:  { view: true, create: true, edit: true, delete: false, approve: false, scope: 'own_branch' },
    fabrika_personel: { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
    fabrika:          { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' }, // Legacy
  },
};

// ═══════════════════════════════════════════════════
// M10: STOK & SATIN ALMA
// ═══════════════════════════════════════════════════
export const M10_STOK: ModuleManifest = {
  id: 'm10-stok',
  flagKey: 'stok',
  name: 'Inventory & Procurement',
  nameTr: 'Stok & Satın Alma',
  icon: 'Package',
  color: '#00bcd4',
  category: 'operations',
  canDisable: true,
  defaultEnabled: true,
  flagBehavior: 'standard',
  requires: ['m01-core'],
  provides: ['stock_data', 'order_data', 'supplier_data'],
  subModules: [
    { id: 'branch-stock', name: 'Şube Stok', description: 'Stok durumu', path: '/sube/siparis-stok', canDisable: false, defaultEnabled: true, flagBehavior: 'always_on' },
    { id: 'orders', name: 'Sipariş Yönetimi', description: 'Şube siparişleri', path: '/sube/siparis-stok', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
    { id: 'suppliers', name: 'Tedarikçi Yönetimi', description: 'Tedarikçi listesi', path: '/satinalma', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
    { id: 'purchase-orders', name: 'Satınalma Talepleri', description: 'Merkez satınalma', path: '/satinalma', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
  ],
  roles: {
    admin:            { view: true, create: true, edit: true, delete: true, approve: true, scope: 'all_branches' },
    ceo:              { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    cgo:              { view: true, create: false, edit: false, delete: false, approve: true, scope: 'all_branches' },
    satinalma:        { view: true, create: true, edit: true, delete: true, approve: true, scope: 'all_branches' },
    coach:            { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    fabrika_mudur:    { view: true, create: true, edit: true, delete: false, approve: false, scope: 'all_branches' },
    mudur:            { view: true, create: true, edit: true, delete: false, approve: false, scope: 'own_branch' },
    yatirimci_branch: { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
    supervisor:       { view: true, create: true, edit: true, delete: false, approve: false, scope: 'own_branch' },
    supervisor_buddy: { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
    barista:          { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
  },
};

// ═══════════════════════════════════════════════════
// M11: RAPORLAR & ANALİTİK
// ═══════════════════════════════════════════════════
export const M11_RAPORLAR: ModuleManifest = {
  id: 'm11-raporlar',
  flagKey: 'raporlar',
  name: 'Reports & Analytics',
  nameTr: 'Raporlar & Analitik',
  icon: 'BarChart3',
  color: '#3f51b5',
  category: 'analytics',
  canDisable: true,
  defaultEnabled: true,
  flagBehavior: 'standard',
  requires: ['m01-core'],
  provides: [],
  subModules: [
    { id: 'branch-reports', name: 'Şube Raporları', description: 'Şube bazlı', path: '/raporlar', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
    { id: 'performance', name: 'Performans Raporları', description: 'Personel performans', path: '/raporlar', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
    { id: 'financial', name: 'Mali Raporlar', description: 'Maliyet analizi', path: '/raporlar', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
    { id: 'advanced', name: 'Gelişmiş Raporlar', description: 'AI destekli', path: '/gelismis-raporlar', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
  ],
  roles: {
    admin:            { view: true, create: true, edit: false, delete: false, approve: false, scope: 'all_branches' },
    ceo:              { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    cgo:              { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    coach:            { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    trainer:            { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    muhasebe_ik:      { view: true, create: false, edit: false, delete: false, approve: false, scope: 'managed_branches' },
    mudur:            { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
    yatirimci_branch: { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
  },
};

// ═══════════════════════════════════════════════════
// M12: MR. DOBODY (AI ASİSTAN)
// ═══════════════════════════════════════════════════
export const M12_DOBODY: ModuleManifest = {
  id: 'm12-dobody',
  flagKey: 'dobody',
  name: 'Mr. Dobody AI Assistant',
  nameTr: 'Mr. Dobody',
  icon: 'Bot',
  color: '#c0392b',
  category: 'ai',
  canDisable: true,
  defaultEnabled: true,
  flagBehavior: 'standard',
  requires: ['m01-core'],
  provides: ['guidance_data', 'ai_insights'],
  subModules: [
    { id: 'guidance', name: 'Akıllı Uyarılar', description: 'Pattern-based bildirimler', path: '/', canDisable: false, defaultEnabled: true, flagBehavior: 'always_on' },
    { id: 'flow-mode', name: 'Günlük Akış', description: 'Flow Mode', path: '/agent-merkezi', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
    { id: 'chat', name: 'AI Chat', description: 'Soru-cevap', path: '/akademi-ai-assistant', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
    { id: 'avatar', name: 'Avatar Sistemi', description: 'Kişiselleştirilmiş avatar', path: '/', canDisable: true, defaultEnabled: true, flagBehavior: 'standard' },
  ],
  roles: {
    admin:            { view: true, create: true, edit: true, delete: true, approve: true, scope: 'all_branches' },
    ceo:              { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    cgo:              { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    coach:            { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    trainer:          { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    muhasebe_ik:      { view: true, create: false, edit: false, delete: false, approve: false, scope: 'managed_branches' },
    mudur:            { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
    supervisor:       { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
    barista:          { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_data' },
    supervisor_buddy: { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
    yatirimci_branch: { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_branch' },
    satinalma:        { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    fabrika_mudur:    { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    bar_buddy:        { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_data' },
    stajyer:          { view: true, create: false, edit: false, delete: false, approve: false, scope: 'own_data' },
    destek:           { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    teknik:           { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
    marketing:        { view: true, create: false, edit: false, delete: false, approve: false, scope: 'all_branches' },
  },
};

// ═══════════════════════════════════════════════════
// TÜM MODÜLLER
// ═══════════════════════════════════════════════════
export const ALL_MODULES: ModuleManifest[] = [
  M01_CORE, M02_IK, M03_VARDIYA, M04_BORDRO,
  M05_OPERASYON, M06_EKIPMAN, M07_AKADEMI, M08_CRM,
  M09_FABRIKA, M10_STOK, M11_RAPORLAR, M12_DOBODY,
];

// ═══════════════════════════════════════════════════
// YARDIMCI FONKSİYONLAR
// ═══════════════════════════════════════════════════

/** Belirtilen rol için erişilebilir modülleri döner */
export function getModulesForRole(role: string): ModuleManifest[] {
  return ALL_MODULES.filter(m => {
    const access = m.roles[role];
    return access && (access.view === true || access.view === 'own');
  });
}

/** Modül manifest'ten module_flags seed verisi üretir (flagKey kullanır — DB uyumlu) */
export function generateModuleFlagSeeds(): Array<{ key: string; level: string; behavior: string; parent: string | null }> {
  const seeds: Array<{ key: string; level: string; behavior: string; parent: string | null }> = [];
  for (const m of ALL_MODULES) {
    seeds.push({ key: m.flagKey, level: 'module', behavior: m.flagBehavior, parent: null });
    for (const sub of m.subModules) {
      seeds.push({ key: `${m.flagKey}.${sub.id}`, level: 'submodule', behavior: sub.flagBehavior, parent: m.flagKey });
    }
  }
  return seeds;
}

/** flagKey → manifest mapping (hızlı lookup) */
export function getModuleByFlagKey(flagKey: string): ModuleManifest | undefined {
  return ALL_MODULES.find(m => m.flagKey === flagKey);
}

/** Rol için modül erişim yetkisini kontrol et */
export function hasModuleAccess(role: string, flagKey: string, action: 'view' | 'create' | 'edit' | 'delete' | 'approve'): boolean {
  const module = getModuleByFlagKey(flagKey);
  if (!module) return false;
  const access = module.roles[role];
  if (!access) return false;
  if (action === 'view') return access.view === true || access.view === 'own';
  return access[action] === true;
}

/** Rol için modül scope'unu döner */
export function getModuleScope(role: string, flagKey: string): string | null {
  const module = getModuleByFlagKey(flagKey);
  if (!module) return null;
  const access = module.roles[role];
  return access?.scope ?? null;
}

/** Modül bağımlılık grafiğini kontrol et — circular dependency var mı? */
export function validateDependencies(): string[] {
  const errors: string[] = [];
  const moduleMap = new Map(ALL_MODULES.map(m => [m.id, m]));
  
  for (const m of ALL_MODULES) {
    for (const dep of m.requires) {
      if (!moduleMap.has(dep)) {
        errors.push(`${m.id} requires ${dep} but it doesn't exist`);
      }
    }
  }
  return errors;
}
