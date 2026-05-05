import { useState, useEffect, useCallback, Suspense, type ReactNode } from "react";
import { ErrorBoundary, LazyErrorBoundary } from "@/components/error-boundary";
import { lazyWithRetry } from "@/lib/lazy-with-retry";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient, onLockError, type LockInfo, apiRequest } from "./lib/queryClient";
import { QueryClientProvider, useQuery, useMutation } from "@tanstack/react-query";
import { LockedRecordDialog } from "@/components/locked-record-dialog";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/theme-context";
import { BottomNav } from "@/components/bottom-nav";
import { BreadcrumbNavigation, BreadcrumbProvider } from "@/components/breadcrumb-navigation";
import { AnnouncementHeaderBanner } from "@/components/AnnouncementHeaderBanner";
import { GlobalSearch } from "@/components/global-search";

import { AppHeader } from "@/components/app-header";
import { QRScannerModal } from "@/components/qr-scanner-modal";
import { GlobalAIAssistant } from "@/components/global-ai-assistant";
import { PushPermissionBanner } from "@/components/push-permission";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_CONTROL_PATH } from "@/lib/role-routes";
import { DobodyFlowProvider } from "@/contexts/dobody-flow-context";
import { DobodyMiniBar } from "@/components/dobody-mini-bar";
import { OfflineBanner } from "@/components/offline-banner";
import { NetworkStatusProvider } from "@/hooks/useNetworkStatus";
import { useLanguageSync } from "@/hooks/useLanguageSync";
import { ProtectedRoute } from "@/components/protected-route";
import { ModuleGuard } from "@/components/module-guard";
import { GuidanceWidget } from "@/components/widgets/guidance-widget";
import { RouteModuleSidebar } from "@/components/layout/RouteModuleSidebar";
import { BranchOnboardingWizard } from "@/components/branch-onboarding-wizard";
import { RoleOnboardingWizard } from "@/components/role-onboarding-wizard";
import logoPath from "@assets/IMG_6637_1765138781125.png";

const GUIDANCE_ROLES = [
  "admin", "ceo", "cgo", "coach", "trainer", "muhasebe_ik",
  "satinalma", "kalite_kontrol", "gida_muhendisi", "fabrika_mudur",
  "mudur", "supervisor", "supervisor_buddy",
];

const GUIDANCE_PATHS = ["/", "/ana-sayfa", "/mission-control"];

function GuidanceWidgetWrapper({ user }: { user: any }) {
  const [location] = useLocation();
  if (!user || !GUIDANCE_ROLES.includes(user.role)) return null;
  if (!GUIDANCE_PATHS.includes(location)) return null;
  return <GuidanceWidget />;
}

function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center" data-testid="page-loader">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

const FaultHub = lazyWithRetry(() => import("@/pages/ariza"));
const FaultDetail = lazyWithRetry(() => import("@/pages/ariza-detay"));
const EquipmentAnalytics = lazyWithRetry(() => import("@/pages/ekipman-analitics"));
const Login = lazyWithRetry(() => import("@/pages/login"));
const Register = lazyWithRetry(() => import("@/pages/register"));
const ForgotPassword = lazyWithRetry(() => import("@/pages/forgot-password"));
const ResetPassword = lazyWithRetry(() => import("@/pages/reset-password"));
const HomeScreen = lazyWithRetry(() => import("@/components/home-screen/HomeScreen"));
const Subeler = lazyWithRetry(() => import("@/pages/subeler"));
const SubeDetay = lazyWithRetry(() => import("@/pages/sube-detay"));
const SubeNFCDetay = lazyWithRetry(() => import("@/pages/sube-nfc-detay"));
const PersonelProfil = lazyWithRetry(() => import("@/pages/personel-profil"));
const PrivacyPolicy = lazyWithRetry(() => import("@/pages/privacy-policy"));
const PersonelDetay = lazyWithRetry(() => import("@/pages/personel-detay"));
const PersonelDuzenle = lazyWithRetry(() => import("@/pages/personel-duzenle"));
const Tasks = lazyWithRetry(() => import("@/pages/tasks"));
const Checklists = lazyWithRetry(() => import("@/pages/checklists"));
const Equipment = lazyWithRetry(() => import("@/pages/equipment"));
const EquipmentDetail = lazyWithRetry(() => import("@/pages/equipment-detail"));
const QRScanner = lazyWithRetry(() => import("@/pages/qr-scanner"));
const NewFaultReport = lazyWithRetry(() => import("@/pages/ariza-yeni"));
const KnowledgeBase = lazyWithRetry(() => import("@/pages/knowledge-base"));
const TrainingAssign = lazyWithRetry(() => import("@/pages/training-assign"));
const Academy = lazyWithRetry(() => import("@/pages/academy"));
const BranchRecipes = lazyWithRetry(() => import("@/pages/branch-recipes/index"));
const BranchRecipeDetail = lazyWithRetry(() => import("@/pages/branch-recipes/detail"));
const BranchRecipesAdmin = lazyWithRetry(() => import("@/pages/branch-recipes/admin"));
const BranchRecipeEditor = lazyWithRetry(() => import("@/pages/branch-recipes/recipe-editor"));
const OnboardingAdmin = lazyWithRetry(() => import("@/pages/branch-recipes/onboarding-admin"));
const MyOnboarding = lazyWithRetry(() => import("@/pages/onboarding-my"));
const AcademySupervisor = lazyWithRetry(() => import("@/pages/academy-supervisor"));
const AcademyHQ = lazyWithRetry(() => import("@/pages/akademi-hq"));
const ModuleDetail = lazyWithRetry(() => import("@/pages/module-detail"));
const AcademyModuleEditor = lazyWithRetry(() => import("@/pages/academy-module-editor"));
const AcademyAnalytics = lazyWithRetry(() => import("@/pages/academy-analytics"));
const AcademyBadges = lazyWithRetry(() => import("@/pages/academy-badges"));
const AcademyLeaderboard = lazyWithRetry(() => import("@/pages/academy-leaderboard"));
const AcademyQuiz = lazyWithRetry(() => import("@/pages/academy-quiz"));
const AcademyBranchAnalytics = lazyWithRetry(() => import("@/pages/academy-branch-analytics"));
const AcademyTeamCompetitions = lazyWithRetry(() => import("@/pages/academy-team-competitions"));
const AcademyCertificates = lazyWithRetry(() => import("@/pages/academy-certificates"));
const AcademyCohortAnalytics = lazyWithRetry(() => import("@/pages/academy-cohort-analytics"));
const AcademyLearningPaths = lazyWithRetry(() => import("@/pages/academy-learning-paths"));
const AcademyLearningPathDetail = lazyWithRetry(() => import("@/pages/academy-learning-path-detail"));
const AcademyAchievements = lazyWithRetry(() => import("@/pages/academy-achievements"));
const AcademyProgressOverview = lazyWithRetry(() => import("@/pages/academy-progress-overview"));
const AcademyStreakTracker = lazyWithRetry(() => import("@/pages/academy-streak-tracker"));
const AcademyAIAssistant = lazyWithRetry(() => import("@/pages/academy-ai-assistant"));
const AcademyAdaptiveEngine = lazyWithRetry(() => import("@/pages/academy-adaptive-engine"));
const AcademySocialGroups = lazyWithRetry(() => import("@/pages/academy-social-groups"));
const AcademyAdvancedAnalytics = lazyWithRetry(() => import("@/pages/academy-advanced-analytics"));
const EgitimProgrami = lazyWithRetry(() => import("@/pages/egitim-programi"));
const BadgeCollection = lazyWithRetry(() => import("@/pages/badge-collection"));
const GorevDetay = lazyWithRetry(() => import("@/pages/gorev-detay"));
const SubeGorevler = lazyWithRetry(() => import("@/pages/sube-gorevler"));
const IK = lazyWithRetry(() => import("@/pages/ik"));
const LeaveRequests = lazyWithRetry(() => import("@/pages/leave-requests"));
const OvertimeRequests = lazyWithRetry(() => import("@/pages/overtime-requests"));
const Attendance = lazyWithRetry(() => import("@/pages/attendance"));
const HRReports = lazyWithRetry(() => import("@/pages/hr-reports"));
const HQSupport = lazyWithRetry(() => import("@/pages/hq-support"));
const Notifications = lazyWithRetry(() => import("@/pages/notifications"));
const CashReports = lazyWithRetry(() => import("@/pages/cash-reports"));
const E2EReports = lazyWithRetry(() => import("@/pages/e2e-raporlar"));
const Vardiyalar = lazyWithRetry(() => import("@/pages/vardiyalar"));
const VardiyaCheckin = lazyWithRetry(() => import("@/pages/vardiya-checkin"));
const NFCGiris = lazyWithRetry(() => import("@/pages/nfc-giris"));
const VardiyaPlanlama = lazyWithRetry(() => import("@/pages/vardiya-planlama"));
const Vardiyalarim = lazyWithRetry(() => import("@/pages/vardiyalarim"));
const PersonelMusaitlik = lazyWithRetry(() => import("@/pages/personel-musaitlik"));
const Performance = lazyWithRetry(() => import("@/pages/performance"));
const AdminContentManagement = lazyWithRetry(() => import("@/pages/yonetim/icerik"));
const Settings = lazyWithRetry(() => import("@/pages/yonetim/ayarlar"));
const UserCRM = lazyWithRetry(() => import("@/pages/yonetim/kullanicilar"));
const AICostDashboard = lazyWithRetry(() => import("@/pages/yonetim/ai-maliyetler"));
const AdminChecklistManagement = lazyWithRetry(() => import("@/pages/yonetim/checklistler"));
const ChecklistTrackingPage = lazyWithRetry(() => import("@/pages/yonetim/checklist-takip"));
const EquipmentManagement = lazyWithRetry(() => import("@/pages/yonetim/ekipman-yonetimi"));
const AdminAcademy = lazyWithRetry(() => import("@/pages/yonetim/akademi"));
const KaliteDenetimi = lazyWithRetry(() => import("@/pages/kalite-denetimi"));
const KaliteAlerjen = lazyWithRetry(() => import("@/pages/kalite-alerjen"));
const KaliteBesinOnay = lazyWithRetry(() => import("@/pages/kalite/besin-onay"));
const MusteriAlerjenPublic = lazyWithRetry(() => import("@/pages/musteri-alerjen-public"));
const CoachSubeDenetim = lazyWithRetry(() => import("@/pages/coach-sube-denetim"));

const PublicStaffRating = lazyWithRetry(() => import("@/pages/public-staff-rating"));
const PublicUrun = lazyWithRetry(() => import("@/pages/public-urun"));
const StaffQrTokensPage = lazyWithRetry(() => import("@/pages/staff-qr-tokens"));
const EmployeeOfMonthPage = lazyWithRetry(() => import("@/pages/employee-of-month"));
const AdvancedReportsPage = lazyWithRetry(() => import("@/pages/advanced-reports"));
const MyPerformancePage = lazyWithRetry(() => import("@/pages/my-performance"));

const FranchiseAcilis = lazyWithRetry(() => import("@/pages/franchise-acilis"));
const FranchiseYatirimcilar = lazyWithRetry(() => import("@/pages/franchise-yatirimcilar"));
const FranchiseYatirimciDetay = lazyWithRetry(() => import("@/pages/franchise-yatirimci-detay"));
const DenetimSablonlari = lazyWithRetry(() => import("@/pages/denetim-sablonlari"));
const DenetimYurutme = lazyWithRetry(() => import("@/pages/denetim-yurutme"));
const DenetimDetayV2 = lazyWithRetry(() => import("@/pages/denetim-detay-v2"));
const Denetimler = lazyWithRetry(() => import("@/pages/denetimler"));
const CapaDetay = lazyWithRetry(() => import("@/pages/capa-detay"));
const BranchFeedback = lazyWithRetry(() => import("@/pages/branch-feedback"));
const KayipEsya = lazyWithRetry(() => import("@/pages/kayip-esya"));
const KayipEsyaHQ = lazyWithRetry(() => import("@/pages/kayip-esya-hq"));
const ReceteDetay = lazyWithRetry(() => import("@/pages/recete-detay"));
const Receteler = lazyWithRetry(() => import("@/pages/receteler"));
const Projeler = lazyWithRetry(() => import("@/pages/projeler"));
const ProjeDetay = lazyWithRetry(() => import("@/pages/proje-detay"));
const ProjeGorevDetay = lazyWithRetry(() => import("@/pages/proje-gorev-detay"));
const YeniSubeProjeler = lazyWithRetry(() => import("@/pages/yeni-sube-projeler"));
const YeniSubeDetay = lazyWithRetry(() => import("@/pages/yeni-sube-detay"));
const Raporlar = lazyWithRetry(() => import("@/pages/raporlar"));
const RaporlarHub = lazyWithRetry(() => import("@/pages/raporlar-hub"));
const Destek = lazyWithRetry(() => import("@/pages/destek"));
const Muhasebe = lazyWithRetry(() => import("@/pages/muhasebe"));
const MaliYonetim = lazyWithRetry(() => import("@/pages/mali-yonetim"));
const FabrikaMegaModule = lazyWithRetry(() => import("@/pages/fabrika/index"));
const FabrikaKiosk = lazyWithRetry(() => import("@/pages/fabrika/kiosk"));
const SubeSiparisStok = lazyWithRetry(() => import("@/pages/sube/siparis-stok"));
const SubeKiosk = lazyWithRetry(() => import("@/pages/sube/kiosk"));
const HqKiosk = lazyWithRetry(() => import("@/pages/hq/kiosk"));
const HqStaffDashboard = lazyWithRetry(() => import("@/pages/hq/staff-dashboard"));
const SubeDashboard = lazyWithRetry(() => import("@/pages/sube/dashboard"));
const EmployeeDashboard = lazyWithRetry(() => import("@/pages/sube/employee-dashboard"));
const ChecklistExecutionPage = lazyWithRetry(() => import("@/pages/sube/checklist-execution"));
const HQFabrikaAnalitik = lazyWithRetry(() => import("@/pages/hq-fabrika-analitik"));
const SubeKarsilastirma = lazyWithRetry(() => import("@/pages/sube-karsilastirma"));
const CanliTakip = lazyWithRetry(() => import("@/pages/canli-takip"));
const SubeBordroOzet = lazyWithRetry(() => import("@/pages/sube-bordro-ozet"));
const SubeUyumMerkezi = lazyWithRetry(() => import("@/pages/sube-uyum-merkezi"));
const CoachUyumPaneli = lazyWithRetry(() => import("@/pages/coach-uyum-paneli"));
const RolYetkileri = lazyWithRetry(() => import("@/pages/admin/rol-yetkileri"));
// Sprint A1 (21 Nisan 2026) — 14 kırık admin sidebar linkine karşılık gelen sayfa import'ları
const AdminAktiviteLoglari = lazyWithRetry(() => import("@/pages/admin/aktivite-loglari"));
const AdminPilotDashboard = lazyWithRetry(() => import("@/pages/admin/pilot-dashboard"));
const AdminSifreYonetimi = lazyWithRetry(() => import("@/pages/admin/sifre-yonetimi"));
const AdminCriticalLogs = lazyWithRetry(() => import("@/pages/admin/critical-logs"));
const AdminBannerlar = lazyWithRetry(() => import("@/pages/admin/bannerlar"));
const AdminDuyurular = lazyWithRetry(() => import("@/pages/admin/duyurular"));
const AdminEmailAyarlari = lazyWithRetry(() => import("@/pages/admin/email-ayarlari"));
const AdminFabrikaFireSebepleri = lazyWithRetry(() => import("@/pages/admin/fabrika-fire-sebepleri"));
const AdminFabrikaIstasyonlar = lazyWithRetry(() => import("@/pages/admin/fabrika-istasyonlar"));
const AdminFabrikaKaliteKriterleri = lazyWithRetry(() => import("@/pages/admin/fabrika-kalite-kriterleri"));
const AdminFabrikaPinYonetimi = lazyWithRetry(() => import("@/pages/admin/fabrika-pin-yonetimi"));
const AdminServisMailAyarlari = lazyWithRetry(() => import("@/pages/admin/servis-mail-ayarlari"));
const AdminTopluVeriYonetimi = lazyWithRetry(() => import("@/pages/admin/toplu-veri-yonetimi"));
const AdminYapayZekaAyarlari = lazyWithRetry(() => import("@/pages/admin/yapay-zeka-ayarlari"));
const AdminYedekleme = lazyWithRetry(() => import("@/pages/admin/yedekleme"));
const AdminYetkilendirme = lazyWithRetry(() => import("@/pages/admin/yetkilendirme"));
const YonetimMenu = lazyWithRetry(() => import("@/pages/yonetim/menu"));
const TaskAtama = lazyWithRetry(() => import("@/pages/task-atama"));
const TaskTakip = lazyWithRetry(() => import("@/pages/task-takip"));
const CgoTeknikKomuta = lazyWithRetry(() => import("@/pages/cgo-teknik-komuta"));
const Cowork = lazyWithRetry(() => import("@/pages/cowork"));
const CoachKontrolMerkezi = lazyWithRetry(() => import("@/pages/coach-kontrol-merkezi"));
const TrainerEgitimMerkezi = lazyWithRetry(() => import("@/pages/trainer-egitim-merkezi"));
const YoneticiDegerlendirme = lazyWithRetry(() => import("@/pages/admin/yonetici-degerlendirme"));
const BannerEditor = lazyWithRetry(() => import("@/pages/banner-editor"));
const DuyuruStudioV2 = lazyWithRetry(() => import("@/components/DuyuruStudioV2/DuyuruStudio"));
const GidaGuvenligiDashboard = lazyWithRetry(() => import("@/pages/gida-guvenligi-dashboard"));
const Setup = lazyWithRetry(() => import("@/pages/setup"));
const MisafirGeriBildirimPublic = lazyWithRetry(() => import("@/pages/misafir-geri-bildirim"));

const NotFound = lazyWithRetry(() => import("@/pages/not-found"));
const MegaModulePage = lazyWithRetry(() => import("@/pages/modul"));
const IcerikStudyosu = lazyWithRetry(() => import("@/pages/icerik-studyosu"));
const RaporlarMegaModule = lazyWithRetry(() => import("@/pages/raporlar-mega"));
const EkipmanMegaModule = lazyWithRetry(() => import("@/pages/ekipman-mega"));
const YeniSubeMegaModule = lazyWithRetry(() => import("@/pages/yeni-sube-mega"));
const OperasyonMegaModule = lazyWithRetry(() => import("@/pages/operasyon-mega"));
const AdminMegaModule = lazyWithRetry(() => import("@/pages/admin-mega"));
const AkademiMegaModule = lazyWithRetry(() => import("@/pages/akademi-mega"));
const AkademiV3 = lazyWithRetry(() => import("@/pages/akademi-v3/index"));
const CRMMegaModule = lazyWithRetry(() => import("@/pages/crm-mega"));
const IletisimMerkeziRedirect = () => { const [, nav] = useLocation(); useEffect(() => { nav("/crm"); }, []); return null; };
// Sprint A1 (21 Nisan 2026) — 2 kırık link redirect (Karar 4 + Karar 5)
const MusteriGeribildirimiRedirect = () => { const [, nav] = useLocation(); useEffect(() => { nav("/crm"); }, []); return null; };
const TrainingRedirect = () => { const [, nav] = useLocation(); useEffect(() => { nav("/akademi"); }, []); return null; };
const AjandaPage = lazyWithRetry(() => import("@/pages/ajanda"));
const CEOCommandCenter = lazyWithRetry(() => import("@/pages/ceo-command-center"));
const CGOCommandCenter = lazyWithRetry(() => import("@/pages/cgo-command-center"));
const SatinalmaMega = lazyWithRetry(() => import("@/pages/satinalma-mega"));

// Centrum v5 pages
const MuhasebeCentrum = lazyWithRetry(() => import("@/pages/muhasebe-centrum"));
const SatinalmaCentrum = lazyWithRetry(() => import("@/pages/satinalma-centrum"));
const FabrikaCentrum = lazyWithRetry(() => import("@/pages/fabrika-centrum"));
const MRPDailyPlan = lazyWithRetry(() => import("@/pages/mrp-daily-plan"));
const FabrikaStokMerkezi = lazyWithRetry(() => import("@/pages/fabrika-stok-merkezi"));
const FabrikaReceteler = lazyWithRetry(() => import("@/pages/fabrika-receteler"));
const MaliyetAnalizi = lazyWithRetry(() => import("@/pages/maliyet-analizi"));
const FabrikaReceteDetay = lazyWithRetry(() => import("@/pages/fabrika-recete-detay"));
const FabrikaUretimModu = lazyWithRetry(() => import("@/pages/fabrika-uretim-modu"));
const FabrikaKeyblendYonetimi = lazyWithRetry(() => import("@/pages/fabrika-keyblend-yonetimi"));
const FabrikaReceteDuzenle = lazyWithRetry(() => import("@/pages/fabrika-recete-duzenle"));
const DepoCentrum = lazyWithRetry(() => import("@/pages/depo-centrum"));
const SubeCentrum = lazyWithRetry(() => import("@/pages/sube-centrum"));
const SupervisorCentrum = lazyWithRetry(() => import("@/pages/supervisor-centrum"));
const SupBuddyCentrum = lazyWithRetry(() => import("@/pages/supbuddy-centrum"));
const PersonelCentrum = lazyWithRetry(() => import("@/pages/personel-centrum"));
const YatirimciCentrum = lazyWithRetry(() => import("@/pages/yatirimci-centrum"));
const MarketingCentrum = lazyWithRetry(() => import("@/pages/marketing-centrum"));
const DestekCentrum = lazyWithRetry(() => import("@/pages/destek-centrum"));
const YatirimciHQCentrum = lazyWithRetry(() => import("@/pages/yatirimci-hq-centrum"));

const SubeSaglikSkoru = lazyWithRetry(() => import("@/pages/sube-saglik-skoru"));
const HqVardiyaGoruntuleme = lazyWithRetry(() => import("@/pages/hq-vardiya-goruntuleme"));
const HQPersonelIstatistikleri = lazyWithRetry(() => import("@/pages/hq-personel-istatistikleri"));
const MuhasebeRaporlama = lazyWithRetry(() => import("@/pages/muhasebe-raporlama"));
const KullanimKilavuzu = lazyWithRetry(() => import("@/pages/kullanim-kilavuzu"));
const WasteMegaModule = lazyWithRetry(() => import("@/pages/waste-mega"));
const HubPage = lazyWithRetry(() => import("@/pages/hub-page"));
const AgentMerkezi = lazyWithRetry(() => import("@/pages/agent-merkezi"));
const SistemAtolyesi = lazyWithRetry(() => import("@/pages/sistem-atolyesi"));
const PdksPage = lazyWithRetry(() => import("@/pages/pdks"));
const PdksIzinGunleri = lazyWithRetry(() => import("@/pages/pdks-izin-gunleri"));
const PdksExcelImport = lazyWithRetry(() => import("@/pages/pdks-excel-import"));
const MaasPage = lazyWithRetry(() => import("@/pages/maas"));
const BordromPage = lazyWithRetry(() => import("@/pages/bordrom"));
const PersonelPuantajim = lazyWithRetry(() => import("@/pages/personel-puantajim"));  // Sprint 4 (5 May 2026)
const GirdiYonetimi = lazyWithRetry(() => import("@/pages/girdi-yonetimi"));  // Sprint 7 (5 May 2026): TGK 2017/2284
const EtiketHesapla = lazyWithRetry(() => import("@/pages/etiket-hesapla"));  // Sprint 7 v3 (5 May 2026): Reçete → Etiket
const PerformansYonetim = lazyWithRetry(() => import("@/pages/performans-yonetim"));  // Sprint 8 (5 May 2026): Yönetici performans
const SkorParametreleri = lazyWithRetry(() => import("@/pages/admin/skor-parametreleri"));  // Sprint 8 (5 May 2026): Skor admin paneli
const TedarikciKalite = lazyWithRetry(() => import("@/pages/tedarikci-kalite"));  // Sprint 9 #348 (5 May 2026): Tedarikçi QC
const Turkomp = lazyWithRetry(() => import("@/pages/turkomp"));  // Sprint 9 #348 (5 May 2026): TÜRKOMP arama
const BordroMerkezi = lazyWithRetry(() => import("@/pages/bordro-merkezi"));  // Sprint 11 (5 May 2026): Bordro Hub
const ManagerRating = lazyWithRetry(() => import("@/pages/manager-rating"));  // Sprint 12 (5 May 2026): Yönetici puanlama
const PilotLaunch = lazyWithRetry(() => import("@/pages/pilot-launch"));
// ── Orphan → Linked (Sistem Atölyesi kararı) ──
const Announcements = lazyWithRetry(() => import("@/pages/announcements"));
const DuyuruDetay = lazyWithRetry(() => import("@/pages/duyuru-detay"));
const Mesajlar = lazyWithRetry(() => import("@/pages/mesajlar"));
const PersonelOnboarding = lazyWithRetry(() => import("@/pages/personel-onboarding"));
const EkipmanKatalog = lazyWithRetry(() => import("@/pages/ekipman-katalog"));
const AcademyWebinars = lazyWithRetry(() => import("@/pages/academy-webinars"));
const AcademyContentMgmt = lazyWithRetry(() => import("@/pages/academy-content-management"));
const AdminEmployeeTypes = lazyWithRetry(() => import("@/pages/admin-employee-types"));
const GuestFormSettings = lazyWithRetry(() => import("@/pages/guest-form-settings"));
const KampanyaYonetimi = lazyWithRetry(() => import("@/pages/kampanya-yonetimi"));
const CoachOnboardingStudio = lazyWithRetry(() => import("@/pages/coach-onboarding-studio"));
const OnboardingProgramlar = lazyWithRetry(() => import("@/pages/onboarding-programlar"));
const AksiyonTakip = lazyWithRetry(() => import("@/pages/aksiyon-takip"));
const AcademyLanding = lazyWithRetry(() => import("@/pages/academy-landing"));
const AcademyMyPath = lazyWithRetry(() => import("@/pages/academy-my-path"));
const CoachKpiSignals = lazyWithRetry(() => import("@/pages/coach-kpi-signals"));
const SupervisorOnboarding = lazyWithRetry(() => import("@/pages/supervisor-onboarding"));
const CoachGateManagement = lazyWithRetry(() => import("@/pages/coach-gate-management"));
const CapaRaporlari = lazyWithRetry(() => import("@/pages/capa-raporlari"));
const AcademyAiPanel = lazyWithRetry(() => import("@/pages/academy-ai-panel"));
const CoachTeamProgress = lazyWithRetry(() => import("@/pages/coach-team-progress"));

const PUBLIC_PATH_PREFIXES = [
  "/login", 
  "/register", 
  "/forgot-password", 
  "/reset-password", 
  "/misafir-geri-bildirim",
  "/setup",
  "/sube/dashboard",
  "/fabrika/kiosk",
  "/hq/kiosk",
  "/sube/kiosk",
  "/p/urun"
];

function isPublicPath(path: string) {
  return PUBLIC_PATH_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
}

function AdminOnly({ children }: { children: ReactNode }) {
  return <ProtectedRoute allowedRoles={["admin"]}>{children}</ProtectedRoute>;
}

function HQOnly({ children }: { children: ReactNode }) {
  return <ProtectedRoute allowedGroups={["admin", "hq"]}>{children}</ProtectedRoute>;
}

function FabrikaOnly({ children }: { children: ReactNode }) {
  return <ProtectedRoute allowedGroups={["admin", "hq", "fabrika"]}>{children}</ProtectedRoute>;
}

function ExecutiveOnly({ children }: { children: ReactNode }) {
  return <ProtectedRoute allowedRoles={["admin", "ceo", "cgo", "coach", "trainer", "muhasebe", "muhasebe_ik", "satinalma", "teknik", "destek", "fabrika"]}>{children}</ProtectedRoute>;
}

function CEOOnly({ children }: { children: ReactNode }) {
  return <ProtectedRoute allowedRoles={["ceo", "cgo"]} strictRoles>{children}</ProtectedRoute>;
}

function FabrikaDashboardRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/fabrika-centrum", { replace: true });
  }, [setLocation]);
  return null;
}

function ProfileRedirect() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (user?.id) {
      setLocation(`/personel/${user.id}`, { replace: true });
    }
  }, [user, setLocation]);
  return null;
}

// Redirects for shortcut paths used in MC components
function VardiyaRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/vardiya-planlama", { replace: true }); }, [setLocation]);
  return null;
}
function StokRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/sube/siparis-stok", { replace: true }); }, [setLocation]);
  return null;
}
function IletisimRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/crm", { replace: true }); }, [setLocation]);
  return null;
}


function AuthCatchAllToLogin() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (isPublicPath(location)) return;
    
    sessionStorage.setItem("postLoginRedirect", location);
    const next = encodeURIComponent(location);
    setLocation(`/login?next=${next}`);
  }, [location, setLocation]);

  return null;
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();
  
  // Don't show loading spinner for public paths - they should render immediately
  const isPublic = isPublicPath(location);
  
  if (isLoading && !isPublic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <LazyErrorBoundary>
    <Suspense fallback={<PageLoader />}>
    <Switch>
      {/* Public routes */}
      <Route path="/setup" component={Setup} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password/:token" component={ResetPassword} />
      <Route path="/personel-degerlendirme/:token" component={PublicStaffRating} />
      <Route path="/p/urun/:code" component={PublicUrun} />
      <Route path="/misafir-geri-bildirim/:token" component={MisafirGeriBildirimPublic} />
      <Route path="/m/alerjen/:id" component={MusteriAlerjenPublic} />
      <Route path="/m/alerjen" component={MusteriAlerjenPublic} />
      <Route path="/fabrika/dashboard">{() => <FabrikaOnly><FabrikaDashboardRedirect /></FabrikaOnly>}</Route>
      <Route path="/fabrika/kiosk">{() => <FabrikaKiosk />}</Route>
      <Route path="/hq/kiosk">{() => <HqKiosk />}</Route>
      <Route path="/sube/checklist-execution/:completionId" component={ChecklistExecutionPage} />
      <Route path="/sube/kiosk/:branchId">{() => <SubeKiosk />}</Route>
      <Route path="/sube/kiosk">{() => <SubeKiosk />}</Route>
      <Route path="/sube/employee-dashboard" component={EmployeeDashboard} />
      <Route path="/sube/dashboard" component={SubeDashboard} />

      {/* Auth guard - catch-all for unauthenticated users */}
      {!isAuthenticated && <Route component={AuthCatchAllToLogin} />}

      {/* Protected routes - only rendered when authenticated */}
      {isAuthenticated && (
        <>
          <Route path="/" component={HomeScreen} />
          <Route path="/control">{() => { const { user } = useAuth(); const [,nav] = useLocation(); useEffect(() => { const target = ROLE_CONTROL_PATH[user?.role || ''] || '/'; if (target !== '/control') nav(target); }, [user?.role]); return null; }}</Route>
          <Route path="/control-legacy">{() => { const [,nav] = useLocation(); useEffect(() => { nav("/control"); }, []); return null; }}</Route>
          <Route path="/merkez-dashboard">{() => { const { user } = useAuth(); const [,nav] = useLocation(); useEffect(() => { const target = ROLE_CONTROL_PATH[user?.role || ''] || '/muhasebe-centrum'; if (target !== '/merkez-dashboard') nav(target); }, [user?.role]); return null; }}</Route>
          <Route path="/modul/:moduleId" component={MegaModulePage} />
          <Route path="/subeler/:id/nfc">{() => <ExecutiveOnly><SubeNFCDetay /></ExecutiveOnly>}</Route>
          <Route path="/subeler/:id">{() => <ExecutiveOnly><SubeDetay /></ExecutiveOnly>}</Route>
          <Route path="/subeler">{() => <ExecutiveOnly><Subeler /></ExecutiveOnly>}</Route>
          <Route path="/gizlilik-politikasi" component={PrivacyPolicy} />
          <Route path="/profil" component={ProfileRedirect} />
          <Route path="/vardiya" component={VardiyaRedirect} />
          <Route path="/stok">{() => <ProtectedRoute allowedRoles={["admin","ceo","cgo","coach","satinalma","mudur","supervisor"]}><StokRedirect /></ProtectedRoute>}</Route>
          <Route path="/iletisim">{() => <ProtectedRoute allowedRoles={["admin","ceo","cgo","coach","trainer","muhasebe_ik","satinalma","marketing","teknik","destek","mudur","supervisor"]}><IletisimRedirect /></ProtectedRoute>}</Route>
          <Route path="/crm">{() => <ProtectedRoute allowedRoles={["admin","ceo","cgo","coach","trainer","muhasebe_ik","satinalma","marketing","teknik","destek","mudur","supervisor"]}><CRMMegaModule /></ProtectedRoute>}</Route>
          <Route path="/crm/:tab?">{() => <ProtectedRoute allowedRoles={["admin","ceo","cgo","coach","trainer","muhasebe_ik","satinalma","marketing","teknik","destek","mudur","supervisor"]}><CRMMegaModule /></ProtectedRoute>}</Route>
          <Route path="/personel/:id">{() => <ProtectedRoute allowedRoles={["admin","ceo","cgo","muhasebe_ik","coach","trainer","mudur","supervisor","fabrika_mudur","gida_muhendisi","kalite_kontrol"]}><PersonelProfil /></ProtectedRoute>}</Route>
          <Route path="/personel-detay/:id">{() => <ExecutiveOnly><PersonelDetay /></ExecutiveOnly>}</Route>
          <Route path="/personel-qr-tokenlar">{() => <ExecutiveOnly><StaffQrTokensPage /></ExecutiveOnly>}</Route>
          <Route path="/ayin-elemani">{() => <ProtectedRoute allowedRoles={["admin","ceo","coach","trainer","mudur"]}><EmployeeOfMonthPage /></ProtectedRoute>}</Route>
          <Route path="/gelismis-raporlar">{() => <ExecutiveOnly><AdvancedReportsPage /></ExecutiveOnly>}</Route>
          <Route path="/performansim" component={MyPerformancePage} />
          <Route path="/personel-duzenle/:id">{() => <ExecutiveOnly><PersonelDuzenle /></ExecutiveOnly>}</Route>
          <Route path="/personel-onboarding"><Redirect to="/personel-onboarding-akisi" /></Route>
          <Route path="/akademi/personel-onboarding"><Redirect to="/personel-onboarding-akisi" /></Route>
          <Route path="/akademi/onboarding-programlar"><Redirect to="/onboarding-programlar" /></Route>
          <Route path="/onboarding-programlar">{() => <ProtectedRoute allowedRoles={["admin","ceo","cgo","coach","trainer","mudur","supervisor","supervisor_buddy","muhasebe_ik","fabrika_mudur"]}><OnboardingProgramlar /></ProtectedRoute>}</Route>
          <Route path="/vardiyalar">{() => <ModuleGuard moduleKey="vardiya"><Vardiyalar /></ModuleGuard>}</Route>
          <Route path="/vardiya-planlama">{() => <ModuleGuard moduleKey="vardiya"><VardiyaPlanlama /></ModuleGuard>}</Route>
          <Route path="/vardiyalarim">{() => <ModuleGuard moduleKey="vardiya"><Vardiyalarim /></ModuleGuard>}</Route>
          <Route path="/vardiya-checkin">{() => <ModuleGuard moduleKey="vardiya"><VardiyaCheckin /></ModuleGuard>}</Route>
          <Route path="/nfc-giris">{() => <ProtectedRoute allowedRoles={["admin","ceo","cgo","coach","trainer","muhasebe_ik","muhasebe","satinalma","marketing","teknik","destek","kalite_kontrol","gida_muhendisi","fabrika_mudur","fabrika","sef","recete_gm","mudur","supervisor","supervisor_buddy","barista","bar_buddy","stajyer","uretim_sefi","fabrika_operator","fabrika_sorumlu","fabrika_personel","fabrika_depo","ekipman_teknik","ik","pazarlama"]}><NFCGiris /></ProtectedRoute>}</Route>
          <Route path="/personel-musaitlik">{() => <ProtectedRoute allowedRoles={["admin","ceo","cgo","coach","trainer","muhasebe_ik","mudur","supervisor"]}><PersonelMusaitlik /></ProtectedRoute>}</Route>
          <Route path="/devam-takibi">{() => <ModuleGuard moduleKey="pdks"><Attendance /></ModuleGuard>}</Route>
          <Route path="/sube-vardiya-takibi">{() => <ProtectedRoute allowedRoles={["admin","ceo","cgo","coach","mudur","supervisor","supervisor_buddy","muhasebe_ik"]}><SubeDashboard /></ProtectedRoute>}</Route>
          <Route path="/gorevler">{() => <ModuleGuard moduleKey="gorevler"><Tasks /></ModuleGuard>}</Route>
          <Route path="/gorev-detay/:id">{() => <ModuleGuard moduleKey="gorevler"><GorevDetay /></ModuleGuard>}</Route>
          <Route path="/sube-gorevler/:id">{() => <ModuleGuard moduleKey="gorevler"><SubeGorevler /></ModuleGuard>}</Route>
          <Route path="/checklistler">{() => <ModuleGuard moduleKey="checklist"><Checklists /></ModuleGuard>}</Route>
          <Route path="/ekipman-detay/:id">{() => <ModuleGuard moduleKey="ekipman"><EquipmentDetail /></ModuleGuard>}</Route>
          <Route path="/ekipman/:tab?">{() => <ModuleGuard moduleKey="ekipman"><EkipmanMegaModule /></ModuleGuard>}</Route>
          <Route path="/ariza">{() => <ModuleGuard moduleKey="ekipman"><FaultHub /></ModuleGuard>}</Route>
          <Route path="/ariza-detay/:id">{() => <ModuleGuard moduleKey="ekipman"><FaultDetail /></ModuleGuard>}</Route>
          <Route path="/ariza-yeni">{() => <ModuleGuard moduleKey="ekipman"><NewFaultReport /></ModuleGuard>}</Route>
          <Route path="/ekipman-analitics">{() => <ModuleGuard moduleKey="ekipman"><EquipmentAnalytics /></ModuleGuard>}</Route>
          <Route path="/qr-tara">{() => <ProtectedRoute><QRScanner /></ProtectedRoute>}</Route>
          <Route path="/bilgi-bankasi">{() => <ProtectedRoute><KnowledgeBase /></ProtectedRoute>}</Route>
          <Route path="/akademi/*?">{() => <ModuleGuard moduleKey="akademi"><AkademiV3 /></ModuleGuard>}</Route>
          <Route path="/akademi-v3/*?">{() => <ModuleGuard moduleKey="akademi"><AkademiV3 /></ModuleGuard>}</Route>
          <Route path="/akademi-legacy/*?">{() => <ModuleGuard moduleKey="akademi"><AkademiMegaModule /></ModuleGuard>}</Route>
          <Route path="/akademi-modul-editor/:id">{() => <ModuleGuard moduleKey="akademi"><AcademyModuleEditor /></ModuleGuard>}</Route>
          <Route path="/akademi-modul-editor">{() => <ModuleGuard moduleKey="akademi"><AcademyModuleEditor /></ModuleGuard>}</Route>
          <Route path="/akademi-modul/:id">{() => <ModuleGuard moduleKey="akademi"><ModuleDetail /></ModuleGuard>}</Route>
          <Route path="/akademi-quiz/:quizId">{() => <ModuleGuard moduleKey="akademi"><AcademyQuiz /></ModuleGuard>}</Route>
          <Route path="/akademi-rozet-koleksiyonum">{() => <ModuleGuard moduleKey="akademi"><BadgeCollection /></ModuleGuard>}</Route>
          <Route path="/akademi-learning-path/:pathId">{() => <ModuleGuard moduleKey="akademi"><AcademyLearningPathDetail /></ModuleGuard>}</Route>
          <Route path="/egitim-programi/:topicId">{() => <ModuleGuard moduleKey="akademi"><EgitimProgrami /></ModuleGuard>}</Route>
          <Route path="/akademi-hq">{() => <ModuleGuard moduleKey="akademi"><AcademyHQ /></ModuleGuard>}</Route>

          {/* Şube Reçete Sistemi (4 May 2026 — Aslan onayı) */}
          <Route path="/branch-recipes/admin/onboarding">{() => <OnboardingAdmin />}</Route>
          <Route path="/branch-recipes/admin/recipe/:recipeId">{() => <BranchRecipeEditor />}</Route>
          <Route path="/branch-recipes/admin">{() => <BranchRecipesAdmin />}</Route>
          <Route path="/branch-recipes/:id">{(params) => <BranchRecipeDetail />}</Route>
          <Route path="/branch-recipes">{() => <BranchRecipes />}</Route>
          <Route path="/onboarding">{() => <MyOnboarding />}</Route>
          <Route path="/akademi/onboarding">{() => <MyOnboarding />}</Route>
          <Route path="/receteler">{() => <Redirect to="/branch-recipes" />}</Route>
          <Route path="/recipes">{() => <Redirect to="/branch-recipes" />}</Route>
          <Route path="/akademi-supervisor">{() => <ModuleGuard moduleKey="akademi"><AcademySupervisor /></ModuleGuard>}</Route>
          <Route path="/akademi-analytics">{() => <ModuleGuard moduleKey="akademi"><AcademyAnalytics /></ModuleGuard>}</Route>
          <Route path="/akademi-badges">{() => <ModuleGuard moduleKey="akademi"><AcademyBadges /></ModuleGuard>}</Route>
          <Route path="/akademi-leaderboard">{() => <ModuleGuard moduleKey="akademi"><AcademyLeaderboard /></ModuleGuard>}</Route>
          <Route path="/akademi-certificates">{() => <ModuleGuard moduleKey="akademi"><AcademyCertificates /></ModuleGuard>}</Route>
          <Route path="/akademi-learning-paths">{() => <ModuleGuard moduleKey="akademi"><AcademyLearningPaths /></ModuleGuard>}</Route>
          <Route path="/akademi-ai-assistant">{() => <ModuleGuard moduleKey="akademi"><AcademyAIAssistant /></ModuleGuard>}</Route>
          <Route path="/akademi-team-competitions">{() => <ModuleGuard moduleKey="akademi"><AcademyTeamCompetitions /></ModuleGuard>}</Route>
          <Route path="/akademi-achievements">{() => <ModuleGuard moduleKey="akademi"><AcademyAchievements /></ModuleGuard>}</Route>
          <Route path="/akademi-progress-overview">{() => <ModuleGuard moduleKey="akademi"><AcademyProgressOverview /></ModuleGuard>}</Route>
          <Route path="/akademi-streak-tracker">{() => <ModuleGuard moduleKey="akademi"><AcademyStreakTracker /></ModuleGuard>}</Route>
          <Route path="/akademi-adaptive-engine">{() => <ModuleGuard moduleKey="akademi"><AcademyAdaptiveEngine /></ModuleGuard>}</Route>
          <Route path="/akademi-social-groups">{() => <ModuleGuard moduleKey="akademi"><AcademySocialGroups /></ModuleGuard>}</Route>
          <Route path="/akademi-advanced-analytics">{() => <ModuleGuard moduleKey="akademi"><AcademyAdvancedAnalytics /></ModuleGuard>}</Route>
          <Route path="/akademi-branch-analytics">{() => <ModuleGuard moduleKey="akademi"><AcademyBranchAnalytics /></ModuleGuard>}</Route>
          <Route path="/akademi-cohort-analytics">{() => <ModuleGuard moduleKey="akademi"><AcademyCohortAnalytics /></ModuleGuard>}</Route>
          <Route path="/receteler">{() => <FabrikaOnly><Receteler /></FabrikaOnly>}</Route>
          <Route path="/recete/:id">{() => <FabrikaOnly><ReceteDetay /></FabrikaOnly>}</Route>
          <Route path="/egitim/:id">{() => <ModuleGuard moduleKey="akademi"><ModuleDetail /></ModuleGuard>}</Route>
          <Route path="/egitim-ata">{() => <ProtectedRoute allowedRoles={["trainer","admin","ceo","coach"]}><TrainingAssign /></ProtectedRoute>}</Route>
          <Route path="/egitim">{() => { if (typeof window !== 'undefined') window.location.href = '/akademi'; return null; }}</Route>
          <Route path="/bildirimler">{() => <ProtectedRoute><Notifications /></ProtectedRoute>}</Route>
          <Route path="/duyurular">{() => <HQOnly><IcerikStudyosu /></HQOnly>}</Route>
          <Route path="/icerik-studyosu">{() => <HQOnly><IcerikStudyosu /></HQOnly>}</Route>
          <Route path="/mesajlar">{() => { if (typeof window !== 'undefined') window.location.href = '/bildirimler?tab=mesajlar'; return null; }}</Route>
          <Route path="/proje-gorev/:id">{() => <ExecutiveOnly><ProjeGorevDetay /></ExecutiveOnly>}</Route>
          <Route path="/projeler/:id">{() => <ExecutiveOnly><ProjeDetay /></ExecutiveOnly>}</Route>
          <Route path="/projeler">{() => <ExecutiveOnly><Projeler /></ExecutiveOnly>}</Route>
          <Route path="/yeni-sube-projeler">{() => <ExecutiveOnly><YeniSubeProjeler /></ExecutiveOnly>}</Route>
          <Route path="/yeni-sube-detay/:id">{() => <ExecutiveOnly><YeniSubeDetay /></ExecutiveOnly>}</Route>
          <Route path="/ik/:tab?">{() => <ProtectedRoute allowedRoles={["admin","ceo","cgo","coach","trainer","muhasebe_ik","muhasebe","satinalma","mudur","supervisor"]}><IK /></ProtectedRoute>}</Route>
          <Route path="/izin-talepleri">{() => <ProtectedRoute allowedRoles={["admin","ceo","cgo","muhasebe_ik","coach","mudur","supervisor","fabrika_mudur","uretim_sefi"]}><LeaveRequests /></ProtectedRoute>}</Route>
          <Route path="/mesai-talepleri">{() => <ProtectedRoute allowedRoles={["admin","ceo","cgo","muhasebe_ik","coach","mudur","supervisor","fabrika_mudur","uretim_sefi"]}><OvertimeRequests /></ProtectedRoute>}</Route>
          <Route path="/ik-raporlari">{() => <ExecutiveOnly><HRReports /></ExecutiveOnly>}</Route>
          <Route path="/kasa-raporlari">{() => <ExecutiveOnly><CashReports /></ExecutiveOnly>}</Route>
          <Route path="/e2e-raporlar">{() => <ExecutiveOnly><E2EReports /></ExecutiveOnly>}</Route>
          <Route path="/raporlar/:tab?">{() => <ModuleGuard moduleKey="raporlar"><RaporlarMegaModule /></ModuleGuard>}</Route>
          <Route path="/raporlar-hub">{() => <ModuleGuard moduleKey="raporlar"><RaporlarHub /></ModuleGuard>}</Route>
          <Route path="/performans">{() => <ProtectedRoute allowedRoles={["admin","ceo","cgo","coach","trainer","muhasebe_ik","mudur","supervisor","fabrika_mudur"]}><Performance /></ProtectedRoute>}</Route>
          <Route path="/muhasebe">{() => <ModuleGuard moduleKey="finans"><Muhasebe /></ModuleGuard>}</Route>
          <Route path="/mali-yonetim">{() => <ModuleGuard moduleKey="finans"><MaliYonetim /></ModuleGuard>}</Route>
          <Route path="/hq-fabrika-analitik">{() => <FabrikaOnly><HQFabrikaAnalitik /></FabrikaOnly>}</Route>
          {/* P7.2 (29 Nis 2026): ceo (Aslan) yeni reçete oluşturabilir, sef (Ümit) oluşturamaz */}
          <Route path="/fabrika/receteler/yeni">{() => <ProtectedRoute allowedRoles={["admin","recete_gm","ceo"]}><FabrikaReceteDuzenle /></ProtectedRoute>}</Route>
          <Route path="/fabrika/receteler/:id/uretim">{() => <FabrikaOnly><FabrikaUretimModu /></FabrikaOnly>}</Route>
          {/* P7.2 (29 Nis 2026): ceo (Aslan) reçete düzenleyebilir, sef (Ümit) düzenleyemez */}
          <Route path="/fabrika/receteler/:id/duzenle">{() => <ProtectedRoute allowedRoles={["admin","recete_gm","ceo"]}><FabrikaReceteDuzenle /></ProtectedRoute>}</Route>
          <Route path="/fabrika/receteler/:id">{() => <FabrikaOnly><FabrikaReceteDetay /></FabrikaOnly>}</Route>
          <Route path="/fabrika/receteler">{() => <FabrikaOnly><FabrikaReceteler /></FabrikaOnly>}</Route>
          {/* P7.2 (29 Nis 2026): ceo (Aslan) keyblend yönetebilir */}
          <Route path="/fabrika/keyblend-yonetimi">{() => <ProtectedRoute allowedRoles={["admin","recete_gm","ceo"]}><FabrikaKeyblendYonetimi /></ProtectedRoute>}</Route>
          <Route path="/fabrika/malzeme-cekme">{() => <FabrikaOnly><MRPDailyPlan /></FabrikaOnly>}</Route>
          <Route path="/fabrika/maliyet-analizi">{() => <ProtectedRoute allowedRoles={["admin","ceo","cgo","muhasebe","muhasebe_ik","satinalma","recete_gm","gida_muhendisi","fabrika_mudur","uretim_sefi"]}><MaliyetAnalizi /></ProtectedRoute>}</Route>
          <Route path="/fabrika/stok-merkezi">{() => <FabrikaOnly><FabrikaStokMerkezi /></FabrikaOnly>}</Route>
          <Route path="/fabrika/:tab?">{() => <FabrikaOnly><FabrikaMegaModule /></FabrikaOnly>}</Route>
          <Route path="/canli-takip">{() => <ExecutiveOnly><CanliTakip /></ExecutiveOnly>}</Route>
          <Route path="/sube-bordro-ozet">{() => <ExecutiveOnly><SubeBordroOzet /></ExecutiveOnly>}</Route>
          <Route path="/sube-uyum-merkezi">{() => <ExecutiveOnly><SubeUyumMerkezi /></ExecutiveOnly>}</Route>
          <Route path="/coach-uyum-paneli">{() => <ExecutiveOnly><CoachUyumPaneli /></ExecutiveOnly>}</Route>
          <Route path="/admin/rol-yetkileri">{() => <AdminOnly><RolYetkileri /></AdminOnly>}</Route>
          {/* Sprint A1 (21 Nisan 2026) — 14 kırık admin/yonetim linki düzeltmesi (wildcard /admin/*?'dan ÖNCE olmalı) */}
          <Route path="/admin/aktivite-loglari">{() => <AdminOnly><AdminAktiviteLoglari /></AdminOnly>}</Route>
          <Route path="/admin/pilot-dashboard">{() => <ProtectedRoute allowedRoles={["admin", "ceo", "cgo"]}><AdminPilotDashboard /></ProtectedRoute>}</Route>
          <Route path="/admin/sifre-yonetimi">{() => <ProtectedRoute allowedRoles={["admin", "ceo", "cgo", "adminhq"]}><AdminSifreYonetimi /></ProtectedRoute>}</Route>
          <Route path="/admin/critical-logs">{() => <ProtectedRoute allowedRoles={["admin", "ceo", "cgo"]}><AdminCriticalLogs /></ProtectedRoute>}</Route>
          <Route path="/admin/bannerlar">{() => <AdminOnly><AdminBannerlar /></AdminOnly>}</Route>
          <Route path="/admin/duyurular">{() => <AdminOnly><AdminDuyurular /></AdminOnly>}</Route>
          <Route path="/admin/email-ayarlari">{() => <AdminOnly><AdminEmailAyarlari /></AdminOnly>}</Route>
          <Route path="/admin/fabrika-fire-sebepleri">{() => <AdminOnly><AdminFabrikaFireSebepleri /></AdminOnly>}</Route>
          <Route path="/admin/fabrika-istasyonlar">{() => <AdminOnly><AdminFabrikaIstasyonlar /></AdminOnly>}</Route>
          <Route path="/admin/fabrika-kalite-kriterleri">{() => <AdminOnly><AdminFabrikaKaliteKriterleri /></AdminOnly>}</Route>
          <Route path="/admin/fabrika-pin-yonetimi">{() => <AdminOnly><AdminFabrikaPinYonetimi /></AdminOnly>}</Route>
          <Route path="/admin/servis-mail-ayarlari">{() => <AdminOnly><AdminServisMailAyarlari /></AdminOnly>}</Route>
          <Route path="/admin/toplu-veri-yonetimi">{() => <AdminOnly><AdminTopluVeriYonetimi /></AdminOnly>}</Route>
          <Route path="/admin/yapay-zeka-ayarlari">{() => <AdminOnly><AdminYapayZekaAyarlari /></AdminOnly>}</Route>
          <Route path="/admin/yedekleme">{() => <AdminOnly><AdminYedekleme /></AdminOnly>}</Route>
          <Route path="/admin/yetkilendirme">{() => <AdminOnly><AdminYetkilendirme /></AdminOnly>}</Route>
          <Route path="/yonetim/menu">{() => <AdminOnly><YonetimMenu /></AdminOnly>}</Route>
          <Route path="/task-atama">{() => <ExecutiveOnly><TaskAtama /></ExecutiveOnly>}</Route>
          <Route path="/task-takip">{() => <ExecutiveOnly><TaskTakip /></ExecutiveOnly>}</Route>
          <Route path="/cgo-teknik-komuta">{() => <ProtectedRoute allowedRoles={["cgo","admin","ceo","teknik","ekipman_teknik"]}><CgoTeknikKomuta /></ProtectedRoute>}</Route>
          <Route path="/cowork">{() => <ExecutiveOnly><Cowork /></ExecutiveOnly>}</Route>
          <Route path="/coach-kontrol-merkezi">{() => <ProtectedRoute allowedRoles={["coach","admin","ceo"]}><CoachKontrolMerkezi /></ProtectedRoute>}</Route>
          <Route path="/trainer-egitim-merkezi">{() => <ProtectedRoute allowedRoles={["trainer","admin","ceo"]}><TrainerEgitimMerkezi /></ProtectedRoute>}</Route>
          {/* Centrum v5 pages — rol bazlı erişim */}
          <Route path="/muhasebe-centrum">{() => <ProtectedRoute allowedRoles={["muhasebe_ik","muhasebe","ik","admin","ceo"]}><MuhasebeCentrum /></ProtectedRoute>}</Route>
          <Route path="/satinalma-centrum">{() => <ProtectedRoute allowedRoles={["satinalma","admin","ceo"]}><SatinalmaCentrum /></ProtectedRoute>}</Route>
          <Route path="/fabrika-centrum">{() => <FabrikaOnly><FabrikaCentrum /></FabrikaOnly>}</Route>
          <Route path="/depo-centrum">{() => <FabrikaOnly><DepoCentrum /></FabrikaOnly>}</Route>
          <Route path="/sube-centrum">{() => <ProtectedRoute allowedRoles={["mudur","supervisor","supervisor_buddy","admin","ceo","cgo","coach"]}><SubeCentrum /></ProtectedRoute>}</Route>
          <Route path="/supervisor-centrum">{() => <ProtectedRoute allowedRoles={["supervisor","supervisor_buddy","admin","ceo","cgo","coach","mudur"]}><SupervisorCentrum /></ProtectedRoute>}</Route>
          <Route path="/supbuddy-centrum">{() => <ProtectedRoute allowedRoles={["supervisor_buddy","supervisor","admin","ceo","mudur"]}><SupBuddyCentrum /></ProtectedRoute>}</Route>
          <Route path="/personel-centrum">{() => <ProtectedRoute allowedRoles={["barista","bar_buddy","stajyer","supervisor","supervisor_buddy","mudur","admin","ceo"]}><PersonelCentrum /></ProtectedRoute>}</Route>
          <Route path="/yatirimci-centrum">{() => <ProtectedRoute allowedRoles={["yatirimci_branch","admin","ceo"]}><YatirimciCentrum /></ProtectedRoute>}</Route>
          <Route path="/marketing-centrum">{() => <ProtectedRoute allowedRoles={["marketing","pazarlama","admin","ceo","cgo"]}><MarketingCentrum /></ProtectedRoute>}</Route>
          <Route path="/destek-centrum">{() => <ProtectedRoute allowedRoles={["destek","admin","ceo","cgo"]}><DestekCentrum /></ProtectedRoute>}</Route>
          <Route path="/yatirimci-hq-centrum">{() => <ProtectedRoute allowedRoles={["yatirimci_hq","admin","ceo"]}><YatirimciHQCentrum /></ProtectedRoute>}</Route>
          <Route path="/hq-personel-durum">{() => <ExecutiveOnly><HqStaffDashboard /></ExecutiveOnly>}</Route>
          <Route path="/hq-vardiya-goruntuleme">{() => <ExecutiveOnly><HqVardiyaGoruntuleme /></ExecutiveOnly>}</Route>
          <Route path="/hq-personel-istatistikleri">{() => <ExecutiveOnly><HQPersonelIstatistikleri /></ExecutiveOnly>}</Route>
          <Route path="/muhasebe-raporlama">{() => <ExecutiveOnly><MuhasebeRaporlama /></ExecutiveOnly>}</Route>
          <Route path="/kalite-denetimi">{() => <ModuleGuard moduleKey="denetim"><KaliteDenetimi /></ModuleGuard>}</Route>
          <Route path="/kalite/alerjen">{() => <ProtectedRoute><KaliteAlerjen /></ProtectedRoute>}</Route>
          <Route path="/kalite/besin-onay">{() => <ProtectedRoute allowedRoles={["admin","gida_muhendisi","kalite_yoneticisi","ust_yonetim"]}><KaliteBesinOnay /></ProtectedRoute>}</Route>
          <Route path="/coach-sube-denetim">{() => <ModuleGuard moduleKey="denetim"><CoachSubeDenetim /></ModuleGuard>}</Route>
          <Route path="/denetim-sablonlari">{() => <ModuleGuard moduleKey="denetim"><DenetimSablonlari /></ModuleGuard>}</Route>
          <Route path="/denetimler">{() => <ModuleGuard moduleKey="denetim"><Denetimler /></ModuleGuard>}</Route>
          <Route path="/denetim/:id">{() => <ModuleGuard moduleKey="denetim"><DenetimYurutme /></ModuleGuard>}</Route>
          <Route path="/denetim-v2/:id">{() => <ModuleGuard moduleKey="denetim"><DenetimDetayV2 /></ModuleGuard>}</Route>
          <Route path="/capa/:id">{() => <ModuleGuard moduleKey="denetim"><CapaDetay /></ModuleGuard>}</Route>
          <Route path="/misafir-geri-bildirim">{() => { window.location.replace("/crm?channel=misafir"); return null; }}</Route>
          <Route path="/misafir-memnuniyeti/:tab?">{() => { window.location.replace("/crm?channel=misafir"); return null; }}</Route>
          <Route path="/misafir-memnuniyeti">{() => { window.location.replace("/crm?channel=misafir"); return null; }}</Route>
          <Route path="/sikayetler">{() => { window.location.replace("/crm/ticket-talepler"); return null; }}</Route>
          <Route path="/hq-destek">{() => <ExecutiveOnly><HQSupport /></ExecutiveOnly>}</Route>
          <Route path="/franchise-acilis">{() => <ModuleGuard moduleKey="franchise"><FranchiseAcilis /></ModuleGuard>}</Route>
          <Route path="/franchise-yatirimcilar">{() => <ModuleGuard moduleKey="franchise"><FranchiseYatirimcilar /></ModuleGuard>}</Route>
          <Route path="/franchise-yatirimcilar/:id">{() => <ModuleGuard moduleKey="franchise"><FranchiseYatirimciDetay /></ModuleGuard>}</Route>
          <Route path="/yonetim/icerik">{() => <AdminOnly><AdminContentManagement /></AdminOnly>}</Route>
          <Route path="/yonetim/ayarlar">{() => <AdminOnly><Settings /></AdminOnly>}</Route>
          <Route path="/yonetim/kullanicilar">{() => <AdminOnly><UserCRM /></AdminOnly>}</Route>
          <Route path="/yonetim/degerlendirme">{() => <ExecutiveOnly><YoneticiDegerlendirme /></ExecutiveOnly>}</Route>
          <Route path="/yonetim/ai-maliyetler">{() => <AdminOnly><AICostDashboard /></AdminOnly>}</Route>
          <Route path="/yonetim/checklistler">{() => <ExecutiveOnly><AdminChecklistManagement /></ExecutiveOnly>}</Route>
          <Route path="/yonetim/checklist-takip">{() => <ExecutiveOnly><ChecklistTrackingPage /></ExecutiveOnly>}</Route>
          <Route path="/yonetim/ekipman-servis">{() => <ExecutiveOnly><EquipmentManagement /></ExecutiveOnly>}</Route>
          <Route path="/yonetim/servis-talepleri">{() => <ExecutiveOnly><EquipmentManagement /></ExecutiveOnly>}</Route>
          <Route path="/yonetim/ekipman-yonetimi">{() => <ExecutiveOnly><EquipmentManagement /></ExecutiveOnly>}</Route>
                    <Route path="/yonetim/akademi">{() => <AdminOnly><AdminAcademy /></AdminOnly>}</Route>
          <Route path="/muhasebe-geribildirimi">{() => <ExecutiveOnly><BranchFeedback /></ExecutiveOnly>}</Route>
          <Route path="/kayip-esya" component={KayipEsya} />
          <Route path="/kayip-esya-hq">{() => <ExecutiveOnly><KayipEsyaHQ /></ExecutiveOnly>}</Route>
          <Route path="/destek" component={Destek} />
          <Route path="/operasyon/:tab?" component={OperasyonMegaModule} />
          <Route path="/waste/:tab?">{() => <FabrikaOnly><WasteMegaModule /></FabrikaOnly>}</Route>
          <Route path="/hub/:sectionId" component={HubPage} />
          <Route path="/yeni-sube/:tab?">{() => <ExecutiveOnly><YeniSubeMegaModule /></ExecutiveOnly>}</Route>
          <Route path="/banner-editor">{() => <ProtectedRoute allowedRoles={["admin","ceo","cgo","coach","trainer","supervisor","marketing","destek"]}><BannerEditor /></ProtectedRoute>}</Route>
          <Route path="/duyuru-studio">{() => <ProtectedRoute allowedRoles={["admin","ceo","cgo","coach","trainer","supervisor","marketing","destek"]}><DuyuruStudioV2 /></ProtectedRoute>}</Route>
          <Route path="/pilot-baslat">{() => <AdminOnly><PilotLaunch /></AdminOnly>}</Route>
          <Route path="/sistem-atolyesi">{() => <ProtectedRoute allowedRoles={["admin","ceo","cgo","coach","trainer"]}><SistemAtolyesi /></ProtectedRoute>}</Route>
          {/* ── Orphan → Linked (17 sayfa) ── */}
          <Route path="/duyuru-yonetimi">{() => <ProtectedRoute allowedRoles={["admin","ceo","cgo","coach"]}><Announcements /></ProtectedRoute>}</Route>
          <Route path="/duyuru/:id">{() => <ProtectedRoute><DuyuruDetay /></ProtectedRoute>}</Route>
          <Route path="/mesajlarim" component={Mesajlar} />
          <Route path="/personel-onboarding-akisi">{() => <ProtectedRoute allowedRoles={["admin","ceo","cgo","muhasebe_ik","mudur","supervisor","coach","trainer","fabrika_mudur"]}><PersonelOnboarding /></ProtectedRoute>}</Route>
          <Route path="/ekipman-katalog">{() => <ProtectedRoute allowedRoles={["cgo","admin","teknik"]}><EkipmanKatalog /></ProtectedRoute>}</Route>
          <Route path="/akademi-webinars">{() => <ProtectedRoute allowedRoles={["trainer","admin","coach"]}><AcademyWebinars /></ProtectedRoute>}</Route>
          <Route path="/akademi-icerik-yonetimi">{() => <ProtectedRoute allowedRoles={["trainer","admin"]}><AcademyContentMgmt /></ProtectedRoute>}</Route>
          <Route path="/personel-tipleri">{() => <AdminOnly><AdminEmployeeTypes /></AdminOnly>}</Route>
          <Route path="/gb-form-ayarlari">{() => <ProtectedRoute allowedRoles={["marketing","admin","ceo"]}><GuestFormSettings /></ProtectedRoute>}</Route>
          <Route path="/kampanya-yonetimi">{() => <ProtectedRoute allowedRoles={["marketing","admin","ceo"]}><KampanyaYonetimi /></ProtectedRoute>}</Route>
          <Route path="/onboarding-studio">{() => <ProtectedRoute allowedRoles={["coach","trainer","admin"]}><CoachOnboardingStudio /></ProtectedRoute>}</Route>
          <Route path="/aksiyon-takip">{() => <ProtectedRoute allowedRoles={["coach","ceo","cgo","admin"]}><AksiyonTakip /></ProtectedRoute>}</Route>
          <Route path="/akademi-ana">{() => <ModuleGuard moduleKey="akademi"><AcademyLanding /></ModuleGuard>}</Route>
          <Route path="/ogrenme-yolum">{() => <ModuleGuard moduleKey="akademi"><AcademyMyPath /></ModuleGuard>}</Route>
          <Route path="/kpi-sinyalleri">{() => <ProtectedRoute allowedRoles={["coach","ceo","cgo"]}><CoachKpiSignals /></ProtectedRoute>}</Route>
          <Route path="/supervisor-egitim">{() => <ProtectedRoute allowedRoles={["supervisor","coach","trainer"]}><SupervisorOnboarding /></ProtectedRoute>}</Route>
          <Route path="/gecit-yonetimi">{() => <ProtectedRoute allowedRoles={["coach","trainer"]}><CoachGateManagement /></ProtectedRoute>}</Route>
          <Route path="/capa-raporlari">{() => <ProtectedRoute allowedRoles={["coach","cgo","admin"]}><CapaRaporlari /></ProtectedRoute>}</Route>
          <Route path="/akademi-ai-panel">{() => <ProtectedRoute allowedRoles={["trainer","admin"]}><AcademyAiPanel /></ProtectedRoute>}</Route>
          <Route path="/takim-ilerleme">{() => <ProtectedRoute allowedRoles={["coach","trainer","ceo"]}><CoachTeamProgress /></ProtectedRoute>}</Route>
          <Route path="/crm/*?">{() => <ModuleGuard moduleKey="crm"><CRMMegaModule /></ModuleGuard>}</Route>
          <Route path="/ajanda">{() => <ModuleGuard moduleKey="ajanda"><AjandaPage /></ModuleGuard>}</Route>
          <Route path="/admin/*?">{() => <AdminOnly><AdminMegaModule /></AdminOnly>}</Route>
          <Route path="/ceo-command-center">{() => <HQOnly><CEOCommandCenter /></HQOnly>}</Route>
          <Route path="/cgo-command-center">{() => <ExecutiveOnly><CGOCommandCenter /></ExecutiveOnly>}</Route>
          <Route path="/hq-dashboard/:department?">{({ params }: any) => { const [,nav] = useLocation(); useEffect(() => { const dept = params?.department; if (dept === "marketing") nav("/marketing-centrum"); else if (dept === "destek") nav("/destek-centrum"); else nav("/ceo-command-center"); }, []); return null; }}</Route>
          <Route path="/kalite-kontrol-dashboard">{() => { const [,nav] = useLocation(); useEffect(() => { nav("/fabrika-centrum"); }, []); return null; }}</Route>
          <Route path="/gida-guvenligi-dashboard">{() => <HQOnly><GidaGuvenligiDashboard /></HQOnly>}</Route>
          <Route path="/satinalma/:tab?">{() => <ProtectedRoute allowedRoles={["satinalma","admin","ceo","cgo"]}><SatinalmaMega /></ProtectedRoute>}</Route>
          <Route path="/urun-sikayet">{() => { window.location.replace("/crm/ticket-talepler"); return null; }}</Route>
          <Route path="/raporlar/sube-saglik">{() => <ExecutiveOnly><SubeSaglikSkoru /></ExecutiveOnly>}</Route>
          <Route path="/sube-saglik-skoru">{() => <ExecutiveOnly><SubeSaglikSkoru /></ExecutiveOnly>}</Route>
          <Route path="/sube-karsilastirma">{() => <HQOnly><SubeKarsilastirma /></HQOnly>}</Route>
          <Route path="/kullanim-kilavuzu" component={KullanimKilavuzu} />
          <Route path="/sube/siparis-stok">{() => <ModuleGuard moduleKey="stok"><SubeSiparisStok /></ModuleGuard>}</Route>
          <Route path="/agent-merkezi">{() => <ExecutiveOnly><AgentMerkezi /></ExecutiveOnly>}</Route>
          <Route path="/benim-gunum">{() => { const [,nav] = useLocation(); useEffect(() => { nav("/personel-centrum"); }, []); return null; }}</Route>
          <Route path="/sube-ozet">{() => { const [,nav] = useLocation(); useEffect(() => { nav("/sube-centrum"); }, []); return null; }}</Route>
          <Route path="/hq-ozet">{() => { const [,nav] = useLocation(); useEffect(() => { nav("/ceo-command-center"); }, []); return null; }}</Route>
          <Route path="/kocluk-paneli">{() => { const [,nav] = useLocation(); useEffect(() => { nav("/coach-kontrol-merkezi"); }, []); return null; }}</Route>
          <Route path="/franchise-ozet">{() => { const { user } = useAuth(); const [,nav] = useLocation(); useEffect(() => { const target = ROLE_CONTROL_PATH[user?.role || ''] || '/'; if (target !== '/franchise-ozet') nav(target); }, [user?.role]); return null; }}</Route>
          <Route path="/pdks">{() => <ModuleGuard moduleKey="pdks"><PdksPage /></ModuleGuard>}</Route>
          <Route path="/pdks-izin-gunleri">{() => <ModuleGuard moduleKey="pdks"><PdksIzinGunleri /></ModuleGuard>}</Route>
          <Route path="/pdks-excel-import">{() => <ProtectedRoute allowedRoles={["admin","muhasebe","muhasebe_ik"]}><PdksExcelImport /></ProtectedRoute>}</Route>
          <Route path="/maas" component={MaasPage} />
          <Route path="/bordrom" component={BordromPage} />
          {/* Sprint 4 (5 May 2026): Personel Self-Service — kendi puantaj/izin/mesai */}
          <Route path="/personel-puantajim" component={PersonelPuantajim} />
          <Route path="/girdi-yonetimi">
            {() => <ProtectedRoute allowedRoles={["admin","ceo","cgo","satinalma","gida_muhendisi","kalite_kontrol","fabrika_mudur","fabrika_sorumlu","kalite"]}><GirdiYonetimi /></ProtectedRoute>}
          </Route>
          <Route path="/etiket-hesapla">
            {() => <ProtectedRoute allowedRoles={["admin","ceo","cgo","satinalma","gida_muhendisi","kalite_kontrol","fabrika_mudur","fabrika_sorumlu","kalite","sef","recete_gm","coach","trainer"]}><EtiketHesapla /></ProtectedRoute>}
          </Route>
          <Route path="/performans-yonetim">
            {() => <ProtectedRoute allowedRoles={["admin","ceo","cgo","coach","trainer","muhasebe","muhasebe_ik","manager","supervisor"]}><PerformansYonetim /></ProtectedRoute>}
          </Route>
          <Route path="/admin/skor-parametreleri">
            {() => <ProtectedRoute allowedRoles={["admin","ceo"]}><SkorParametreleri /></ProtectedRoute>}
          </Route>
          <Route path="/tedarikci-kalite">
            {() => <ProtectedRoute allowedRoles={["admin","ceo","cgo","satinalma","gida_muhendisi","kalite_kontrol","fabrika_mudur","fabrika_sorumlu","kalite"]}><TedarikciKalite /></ProtectedRoute>}
          </Route>
          <Route path="/turkomp">
            {() => <ProtectedRoute allowedRoles={["admin","ceo","cgo","satinalma","gida_muhendisi","kalite_kontrol","fabrika_mudur","fabrika_sorumlu","kalite"]}><Turkomp /></ProtectedRoute>}
          </Route>
          <Route path="/bordro-merkezi">
            {() => <ProtectedRoute><BordroMerkezi /></ProtectedRoute>}
          </Route>
          <Route path="/yonetici-puanlama">
            {() => <ProtectedRoute allowedRoles={["admin","ceo","cgo","manager","supervisor","fabrika_mudur"]}><ManagerRating /></ProtectedRoute>}
          </Route>
          <Route path="/puantajim" component={PersonelPuantajim} />
          <Route path="/iletisim-merkezi" component={IletisimMerkeziRedirect} />
          {/* Sprint A1 (21 Nisan 2026) — 2 kırık link redirect (Karar 4 + Karar 5) */}
          <Route path="/musteri-geribildirimi" component={MusteriGeribildirimiRedirect} />
          <Route path="/training" component={TrainingRedirect} />
        </>
      )}
      
      <Route component={NotFound} />
    </Switch>
    </Suspense>
    </LazyErrorBoundary>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading, user } = useAuth();
  useLanguageSync();
  const [location, setLocation] = useLocation();
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const { data: branches } = useQuery<any[]>({
    queryKey: ["/api/branches"],
    enabled: isAuthenticated && !!user,
  });

  if (isLoading || !isAuthenticated) {
    return <Router />;
  }

  // Kiosk rolleri sadece kendi sayfalarında olabilir
  if (user?.role === 'sube_kiosk') {
    const kioskPath = `/sube/kiosk/${user.branchId || ''}`;
    if (!location.startsWith('/sube/kiosk')) {
      setLocation(kioskPath);
      return null;
    }
  }
  if (user?.role === 'fabrika_kiosk') {
    if (!location.startsWith('/fabrika/kiosk')) {
      setLocation('/fabrika/kiosk');
      return null;
    }
  }

  const getRoleLabel = (role: string | undefined) => {
    const roleMap: Record<string, string> = {
      "admin": "Admin",
      "ceo": "CEO",
      "cgo": "CGO",
      "muhasebe_ik": "Muhasebe & İK",
      "satinalma": "Satın Alma",
      "coach": "Coach",
      "marketing": "Marketing",
      "trainer": "Trainer (Eğitmen)",
      "kalite_kontrol": "Kalite Kontrol",
      "fabrika_mudur": "Fabrika Müdürü",
      "muhasebe": "Muhasebe",
      "teknik": "Teknik",
      "destek": "Destek",
      "fabrika": "Fabrika",
      "yatirimci_hq": "Franchise Yatırımcı",
      "stajyer": "Stajyer",
      "bar_buddy": "Bar Buddy",
      "barista": "Barista",
      "supervisor_buddy": "Supervisor Buddy",
      "supervisor": "Supervisor",
      "mudur": "Müdür",
      "yatirimci_branch": "Yatırımcı",
      "fabrika_operator": "Fabrika Operatör",
      "fabrika_sorumlu": "Fabrika Sorumlu",
      "fabrika_personel": "Fabrika Personel",
    };
    return role ? roleMap[role] || role : "";
  };

  const getBranchName = (branchId: number | null | undefined) => {
    if (!branchId) return null;
    const branch = branches?.find((b) => b.id === branchId);
    return branch?.name || `Şube ${branchId}`;
  };

  const isHomePage = location === "/";
  const isFullWidthPage = location === "/" || location === "/control";

  const branchName = getBranchName(user?.branchId);

  const isStandaloneDashboard = location.startsWith("/merkez-dashboard") || 
    location.startsWith("/sube/dashboard") || 
    location.startsWith("/sube/employee-dashboard") ||
    location.startsWith("/fabrika/dashboard") ||
    location.startsWith("/hq/kiosk") ||
    location.startsWith("/sube/kiosk") ||
    location.startsWith("/fabrika/kiosk");

  if (isStandaloneDashboard) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        <OfflineBanner />
        <main className="flex-1 overflow-y-auto">
          <Router />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <OfflineBanner />
      <AppHeader 
        user={user}
        branchName={branchName}
        onQRClick={() => setQrModalOpen(true)}
      />
      
      {/* QR Scanner Modal */}
      <QRScannerModal open={qrModalOpen} onOpenChange={setQrModalOpen} />
      
      {/* Main layout: optional module sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Module-specific sidebar — auto-detected from URL path */}
        {!isFullWidthPage && <RouteModuleSidebar />}
        
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Breadcrumb Navigation - only on sub-pages */}
          {!isFullWidthPage && (
            <div className="px-2 pt-1">
              <BreadcrumbNavigation />
            </div>
          )}
          
          {/* Announcement Header Banner — rol bazlı aktif duyurular */}
          {!isFullWidthPage && user && <AnnouncementHeaderBanner />}
          
          {/* Main Content */}
          <main className="flex-1 overflow-auto pb-20 md:pb-4">
            <div className="max-w-[1600px] mx-auto w-full">
              {!isFullWidthPage && <GuidanceWidgetWrapper user={user} />}
              <Router />
            </div>
          </main>
          
          {/* Flow Mode Mini-Bar - only on sub-pages */}
          {!isFullWidthPage && <DobodyMiniBar />}
        </div>
      </div>
      
      {/* Bottom Navigation */}
      <BottomNav />
      
      {/* Global Search (Ctrl+K) */}
      <GlobalSearch />
      
      {/* Global AI Assistant */}
      {user && <GlobalAIAssistant />}
    </div>
  );
}

function ForcePasswordChangeDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user && (user as any).mustChangePassword) {
      setOpen(true);
    }
  }, [user]);

  const changeMutation = useMutation({
    mutationFn: async () => {
      if (newPw !== confirmPw) throw new Error("Şifreler eşleşmiyor");
      if (newPw.length < 6) throw new Error("Yeni şifre en az 6 karakter olmalıdır");
      const res = await apiRequest("POST", "/api/me/change-password", { currentPassword: currentPw, newPassword: newPw });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Şifre değiştirilemedi");
      }
      return res.json();
    },
    onSuccess: () => {
      setOpen(false);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setError("");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60" data-testid="force-password-dialog">
      <div className="bg-card border rounded-lg p-6 w-full max-w-sm mx-4 shadow-xl">
        <h2 className="text-lg font-semibold mb-1" data-testid="text-force-password-title">Şifrenizi Değiştirin</h2>
        <p className="text-sm text-muted-foreground mb-4">Güvenliğiniz için lütfen yeni bir şifre belirleyin.</p>
        {error && <p className="text-sm text-destructive mb-3" data-testid="text-password-error">{error}</p>}
        <div className="space-y-3">
          <input type="password" placeholder="Mevcut Şifre" value={currentPw} onChange={e => { setCurrentPw(e.target.value); setError(""); }}
            className="w-full px-3 py-2 border rounded-md bg-background text-sm" data-testid="input-force-current-pw" />
          <input type="password" placeholder="Yeni Şifre (en az 6 karakter)" value={newPw} onChange={e => { setNewPw(e.target.value); setError(""); }}
            className="w-full px-3 py-2 border rounded-md bg-background text-sm" data-testid="input-force-new-pw" />
          <input type="password" placeholder="Yeni Şifre (Tekrar)" value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setError(""); }}
            className="w-full px-3 py-2 border rounded-md bg-background text-sm" data-testid="input-force-confirm-pw" />
          <button onClick={() => changeMutation.mutate()}
            disabled={changeMutation.isPending || !currentPw || !newPw || !confirmPw}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50"
            data-testid="button-force-change-pw">
            {changeMutation.isPending ? "Değiştiriliyor..." : "Şifreyi Değiştir"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GlobalLockDialogHost() {
  const [lockInfo, setLockInfo] = useState<LockInfo | null>(null);
  useEffect(() => {
    return onLockError((info) => setLockInfo(info));
  }, []);
  const handleClose = useCallback(() => setLockInfo(null), []);
  return (
    <LockedRecordDialog
      open={!!lockInfo}
      onClose={handleClose}
      reason={lockInfo?.reason}
      tableName={lockInfo?.tableName}
      recordId={lockInfo?.recordId}
    />
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <NetworkStatusProvider>
            <TooltipProvider>
              <DobodyFlowProvider>
                <BreadcrumbProvider>
                    <AppContent />
                </BreadcrumbProvider>
              </DobodyFlowProvider>
              <Toaster />
              <PushPermissionBanner />
              <ForcePasswordChangeDialog />
              <BranchOnboardingWizard />
              <RoleOnboardingWizard />
              <GlobalLockDialogHost />
            </TooltipProvider>
          </NetworkStatusProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
