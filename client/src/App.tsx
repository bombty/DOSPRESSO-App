import { useState, useEffect, useCallback, lazy, Suspense, type ReactNode } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { Switch, Route, useLocation } from "wouter";
import { queryClient, onLockError, type LockInfo } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { LockedRecordDialog } from "@/components/locked-record-dialog";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/theme-context";
import { BottomNav } from "@/components/bottom-nav";
import { BreadcrumbNavigation, BreadcrumbProvider } from "@/components/breadcrumb-navigation";
import { GlobalSearch } from "@/components/global-search";
import { InboxDialog } from "@/components/inbox-dialog";
import { AppHeader } from "@/components/app-header";
import { QRScannerModal } from "@/components/qr-scanner-modal";
import { GlobalAIAssistant } from "@/components/global-ai-assistant";
import { PushPermissionBanner } from "@/components/push-permission";
import { useAuth } from "@/hooks/useAuth";
import { DobodyFlowProvider } from "@/contexts/dobody-flow-context";
import { DobodyMiniBar } from "@/components/dobody-mini-bar";
import { OfflineBanner } from "@/components/offline-banner";
import { NetworkStatusProvider } from "@/hooks/useNetworkStatus";
import { useLanguageSync } from "@/hooks/useLanguageSync";
import { ProtectedRoute } from "@/components/protected-route";
import logoPath from "@assets/IMG_6637_1765138781125.png";

function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center" data-testid="page-loader">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

const FaultHub = lazy(() => import("@/pages/ariza"));
const FaultDetail = lazy(() => import("@/pages/ariza-detay"));
const EquipmentAnalytics = lazy(() => import("@/pages/ekipman-analitics"));
const Login = lazy(() => import("@/pages/login"));
const Register = lazy(() => import("@/pages/register"));
const ForgotPassword = lazy(() => import("@/pages/forgot-password"));
const ResetPassword = lazy(() => import("@/pages/reset-password"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Subeler = lazy(() => import("@/pages/subeler"));
const SubeDetay = lazy(() => import("@/pages/sube-detay"));
const SubeNFCDetay = lazy(() => import("@/pages/sube-nfc-detay"));
const PersonelProfil = lazy(() => import("@/pages/personel-profil"));
const PrivacyPolicy = lazy(() => import("@/pages/privacy-policy"));
const PersonelDetay = lazy(() => import("@/pages/personel-detay"));
const PersonelDuzenle = lazy(() => import("@/pages/personel-duzenle"));
const Tasks = lazy(() => import("@/pages/tasks"));
const Checklists = lazy(() => import("@/pages/checklists"));
const Equipment = lazy(() => import("@/pages/equipment"));
const EquipmentDetail = lazy(() => import("@/pages/equipment-detail"));
const QRScanner = lazy(() => import("@/pages/qr-scanner"));
const NewFaultReport = lazy(() => import("@/pages/ariza-yeni"));
const KnowledgeBase = lazy(() => import("@/pages/knowledge-base"));
const TrainingAssign = lazy(() => import("@/pages/training-assign"));
const Academy = lazy(() => import("@/pages/academy"));
const AcademySupervisor = lazy(() => import("@/pages/academy-supervisor"));
const AcademyHQ = lazy(() => import("@/pages/academy-hq"));
const ModuleDetail = lazy(() => import("@/pages/module-detail"));
const AcademyModuleEditor = lazy(() => import("@/pages/academy-module-editor"));
const AcademyAnalytics = lazy(() => import("@/pages/academy-analytics"));
const AcademyBadges = lazy(() => import("@/pages/academy-badges"));
const AcademyLeaderboard = lazy(() => import("@/pages/academy-leaderboard"));
const AcademyQuiz = lazy(() => import("@/pages/academy-quiz"));
const AcademyBranchAnalytics = lazy(() => import("@/pages/academy-branch-analytics"));
const AcademyTeamCompetitions = lazy(() => import("@/pages/academy-team-competitions"));
const AcademyCertificates = lazy(() => import("@/pages/academy-certificates"));
const AcademyCohortAnalytics = lazy(() => import("@/pages/academy-cohort-analytics"));
const AcademyLearningPaths = lazy(() => import("@/pages/academy-learning-paths"));
const AcademyLearningPathDetail = lazy(() => import("@/pages/academy-learning-path-detail"));
const AcademyAchievements = lazy(() => import("@/pages/academy-achievements"));
const AcademyProgressOverview = lazy(() => import("@/pages/academy-progress-overview"));
const AcademyStreakTracker = lazy(() => import("@/pages/academy-streak-tracker"));
const AcademyAIAssistant = lazy(() => import("@/pages/academy-ai-assistant"));
const AcademyAdaptiveEngine = lazy(() => import("@/pages/academy-adaptive-engine"));
const AcademySocialGroups = lazy(() => import("@/pages/academy-social-groups"));
const AcademyAdvancedAnalytics = lazy(() => import("@/pages/academy-advanced-analytics"));
const EgitimProgrami = lazy(() => import("@/pages/egitim-programi"));
const BadgeCollection = lazy(() => import("@/pages/badge-collection"));
const GorevDetay = lazy(() => import("@/pages/gorev-detay"));
const SubeGorevler = lazy(() => import("@/pages/sube-gorevler"));
const IK = lazy(() => import("@/pages/ik"));
const LeaveRequests = lazy(() => import("@/pages/leave-requests"));
const OvertimeRequests = lazy(() => import("@/pages/overtime-requests"));
const Attendance = lazy(() => import("@/pages/attendance"));
const HRReports = lazy(() => import("@/pages/hr-reports"));
const HQSupport = lazy(() => import("@/pages/hq-support"));
const Notifications = lazy(() => import("@/pages/notifications"));
const Announcements = lazy(() => import("@/pages/announcements"));
const Mesajlar = lazy(() => import("@/pages/mesajlar"));
const CashReports = lazy(() => import("@/pages/cash-reports"));
const E2EReports = lazy(() => import("@/pages/e2e-raporlar"));
const Vardiyalar = lazy(() => import("@/pages/vardiyalar"));
const VardiyaCheckin = lazy(() => import("@/pages/vardiya-checkin"));
const NFCGiris = lazy(() => import("@/pages/nfc-giris"));
const VardiyaPlanlama = lazy(() => import("@/pages/vardiya-planlama"));
const Vardiyalarim = lazy(() => import("@/pages/vardiyalarim"));
const PersonelMusaitlik = lazy(() => import("@/pages/personel-musaitlik"));
const Performance = lazy(() => import("@/pages/performance"));
const AdminContentManagement = lazy(() => import("@/pages/yonetim/icerik"));
const Settings = lazy(() => import("@/pages/yonetim/ayarlar"));
const UserCRM = lazy(() => import("@/pages/yonetim/kullanicilar"));
const AICostDashboard = lazy(() => import("@/pages/yonetim/ai-maliyetler"));
const AdminChecklistManagement = lazy(() => import("@/pages/yonetim/checklistler"));
const ChecklistTrackingPage = lazy(() => import("@/pages/yonetim/checklist-takip"));
const EquipmentManagement = lazy(() => import("@/pages/yonetim/ekipman-yonetimi"));
const AdminAcademy = lazy(() => import("@/pages/yonetim/akademi"));
const KaliteDenetimi = lazy(() => import("@/pages/kalite-denetimi"));
const CoachSubeDenetim = lazy(() => import("@/pages/coach-sube-denetim"));

const PublicStaffRating = lazy(() => import("@/pages/public-staff-rating"));
const StaffQrTokensPage = lazy(() => import("@/pages/staff-qr-tokens"));
const EmployeeOfMonthPage = lazy(() => import("@/pages/employee-of-month"));
const AdvancedReportsPage = lazy(() => import("@/pages/advanced-reports"));
const MyPerformancePage = lazy(() => import("@/pages/my-performance"));

const FranchiseAcilis = lazy(() => import("@/pages/franchise-acilis"));
const FranchiseYatirimcilar = lazy(() => import("@/pages/franchise-yatirimcilar"));
const FranchiseYatirimciDetay = lazy(() => import("@/pages/franchise-yatirimci-detay"));
const DenetimSablonlari = lazy(() => import("@/pages/denetim-sablonlari"));
const DenetimYurutme = lazy(() => import("@/pages/denetim-yurutme"));
const Denetimler = lazy(() => import("@/pages/denetimler"));
const CapaDetay = lazy(() => import("@/pages/capa-detay"));
const BranchFeedback = lazy(() => import("@/pages/branch-feedback"));
const KayipEsya = lazy(() => import("@/pages/kayip-esya"));
const KayipEsyaHQ = lazy(() => import("@/pages/kayip-esya-hq"));
const ReceteDetay = lazy(() => import("@/pages/recete-detay"));
const Receteler = lazy(() => import("@/pages/receteler"));
const Projeler = lazy(() => import("@/pages/projeler"));
const ProjeDetay = lazy(() => import("@/pages/proje-detay"));
const ProjeGorevDetay = lazy(() => import("@/pages/proje-gorev-detay"));
const YeniSubeProjeler = lazy(() => import("@/pages/yeni-sube-projeler"));
const YeniSubeDetay = lazy(() => import("@/pages/yeni-sube-detay"));
const Raporlar = lazy(() => import("@/pages/raporlar"));
const RaporlarHub = lazy(() => import("@/pages/raporlar-hub"));
const Destek = lazy(() => import("@/pages/destek"));
const Muhasebe = lazy(() => import("@/pages/muhasebe"));
const MaliYonetim = lazy(() => import("@/pages/mali-yonetim"));
const FabrikaMegaModule = lazy(() => import("@/pages/fabrika/index"));
const FabrikaKiosk = lazy(() => import("@/pages/fabrika/kiosk"));
const FabrikaDashboard = lazy(() => import("@/pages/fabrika/dashboard"));
const FabrikaKaliteKontrol = lazy(() => import("@/pages/fabrika/kalite-kontrol"));
const FabrikaPerformans = lazy(() => import("@/pages/fabrika/performans"));
const FabrikaAIRaporlar = lazy(() => import("@/pages/fabrika/ai-raporlar"));
const FabrikaUretimPlanlama = lazy(() => import("@/pages/fabrika/uretim-planlama"));
const FabrikaVardiyaUyumluluk = lazy(() => import("@/pages/fabrika/vardiya-uyumluluk"));
const SubeSiparisStok = lazy(() => import("@/pages/sube/siparis-stok"));
const SubeKiosk = lazy(() => import("@/pages/sube/kiosk"));
const HqKiosk = lazy(() => import("@/pages/hq/kiosk"));
const HqStaffDashboard = lazy(() => import("@/pages/hq/staff-dashboard"));
const SubeDashboard = lazy(() => import("@/pages/sube/dashboard"));
const EmployeeDashboard = lazy(() => import("@/pages/sube/employee-dashboard"));
const MerkezDashboard = lazy(() => import("@/pages/merkez-dashboard"));
const ChecklistExecutionPage = lazy(() => import("@/pages/sube/checklist-execution"));
const HQFabrikaAnalitik = lazy(() => import("@/pages/hq-fabrika-analitik"));
const SubeKarsilastirma = lazy(() => import("@/pages/sube-karsilastirma"));
const CanliTakip = lazy(() => import("@/pages/canli-takip"));
const AdminDashboard = lazy(() => import("@/pages/admin/index"));
const AdminYetkilendirme = lazy(() => import("@/pages/admin/yetkilendirme"));
const YoneticiDegerlendirme = lazy(() => import("@/pages/admin/yonetici-degerlendirme"));
const AdminAktiviteLoglar = lazy(() => import("@/pages/admin/aktivite-loglari"));
const AdminYedekleme = lazy(() => import("@/pages/admin/yedekleme"));
const AdminKullanicilar = lazy(() => import("@/pages/admin/kullanicilar"));
const AdminEmailAyarlari = lazy(() => import("@/pages/admin/email-ayarlari"));
const AdminServisMailAyarlari = lazy(() => import("@/pages/admin/servis-mail-ayarlari"));
const AdminBannerlar = lazy(() => import("@/pages/admin/bannerlar"));
const BannerEditor = lazy(() => import("@/pages/banner-editor"));
const AdminDuyurular = lazy(() => import("@/pages/admin/duyurular"));
const AdminYapayZekaAyarlari = lazy(() => import("@/pages/admin/yapay-zeka-ayarlari"));
const AdminKaliteDenetimSablonuDuzenle = lazy(() => import("@/pages/admin/kalite-denetim-sablonu-duzenle"));
const AdminTopluVeriYonetimi = lazy(() => import("@/pages/admin/toplu-veri-yonetimi"));
const AdminFabrikaIstasyonlar = lazy(() => import("@/pages/admin/fabrika-istasyonlar"));
const AdminFabrikaFireSebepleri = lazy(() => import("@/pages/admin/fabrika-fire-sebepleri"));
const AdminFabrikaPinYonetimi = lazy(() => import("@/pages/admin/fabrika-pin-yonetimi"));
const AdminFabrikaKaliteKriterleri = lazy(() => import("@/pages/admin/fabrika-kalite-kriterleri"));
const KaliteKontrolDashboard = lazy(() => import("@/pages/kalite-kontrol-dashboard"));
const GidaGuvenligiDashboard = lazy(() => import("@/pages/gida-guvenligi-dashboard"));
const Setup = lazy(() => import("@/pages/setup"));
const MisafirGeriBildirimPublic = lazy(() => import("@/pages/misafir-geri-bildirim"));

const NotFound = lazy(() => import("@/pages/not-found"));
const MegaModulePage = lazy(() => import("@/pages/modul"));
const IcerikStudyosu = lazy(() => import("@/pages/icerik-studyosu"));
const RaporlarMegaModule = lazy(() => import("@/pages/raporlar-mega"));
const EkipmanMegaModule = lazy(() => import("@/pages/ekipman-mega"));
const YeniSubeMegaModule = lazy(() => import("@/pages/yeni-sube-mega"));
const OperasyonMegaModule = lazy(() => import("@/pages/operasyon-mega"));
const AdminMegaModule = lazy(() => import("@/pages/admin-mega"));
const AkademiMegaModule = lazy(() => import("@/pages/akademi-mega"));
const AkademiV3 = lazy(() => import("@/pages/akademi-v3/index"));
const CRMMegaModule = lazy(() => import("@/pages/crm-mega"));
const MisafirMemnuniyetiModul = lazy(() => import("@/pages/misafir-memnuniyeti-modul"));
const CEOCommandCenter = lazy(() => import("@/pages/ceo-command-center"));
const CGOCommandCenter = lazy(() => import("@/pages/cgo-command-center"));
const HQDashboard = lazy(() => import("@/pages/hq-dashboard"));
const SatinalmaMega = lazy(() => import("@/pages/satinalma-mega"));

const SubeSaglikSkoru = lazy(() => import("@/pages/sube-saglik-skoru"));
const HqVardiyaGoruntuleme = lazy(() => import("@/pages/hq-vardiya-goruntuleme"));
const HQPersonelIstatistikleri = lazy(() => import("@/pages/hq-personel-istatistikleri"));
const MuhasebeRaporlama = lazy(() => import("@/pages/muhasebe-raporlama"));
const KullanimKilavuzu = lazy(() => import("@/pages/kullanim-kilavuzu"));
const WasteMegaModule = lazy(() => import("@/pages/waste-mega"));
const HubPage = lazy(() => import("@/pages/hub-page"));
const AgentMerkezi = lazy(() => import("@/pages/agent-merkezi"));
const BenimGunum = lazy(() => import("@/pages/benim-gunum"));
const SubeOzet = lazy(() => import("@/pages/sube-ozet"));
const HQOzet = lazy(() => import("@/pages/hq-ozet"));
const KoclukPaneli = lazy(() => import("@/pages/kocluk-paneli"));
const FranchiseOzet = lazy(() => import("@/pages/franchise-ozet"));
const PdksPage = lazy(() => import("@/pages/pdks"));
const MaasPage = lazy(() => import("@/pages/maas"));
const BordromPage = lazy(() => import("@/pages/bordrom"));

const PUBLIC_PATH_PREFIXES = [
  "/login", 
  "/register", 
  "/forgot-password", 
  "/reset-password", 
  "/misafir-geri-bildirim",
  "/setup",
  "/sube/dashboard",
  "/sube/kiosk",
  "/fabrika/dashboard",
  "/fabrika/kiosk",
  "/hq/kiosk"
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
  return <ProtectedRoute allowedRoles={["admin", "ceo", "cgo", "coach", "trainer", "muhasebe", "muhasebe_ik", "satinalma", "teknik", "destek", "fabrika", "yatirimci_hq"]}>{children}</ProtectedRoute>;
}

function CEOOnly({ children }: { children: ReactNode }) {
  return <ProtectedRoute allowedRoles={["ceo", "cgo"]} strictRoles>{children}</ProtectedRoute>;
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
    <Suspense fallback={<PageLoader />}>
    <Switch>
      {/* Public routes */}
      <Route path="/setup" component={Setup} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password/:token" component={ResetPassword} />
      <Route path="/personel-degerlendirme/:token" component={PublicStaffRating} />
      <Route path="/misafir-geri-bildirim/:token" component={MisafirGeriBildirimPublic} />
      <Route path="/fabrika/dashboard" component={FabrikaDashboard} />
      <Route path="/fabrika/kiosk" component={FabrikaKiosk} />
      <Route path="/hq/kiosk" component={HqKiosk} />
      <Route path="/sube/checklist-execution/:completionId" component={ChecklistExecutionPage} />
      <Route path="/sube/kiosk/:branchId" component={SubeKiosk} />
      <Route path="/sube/kiosk" component={SubeKiosk} />
      <Route path="/sube/employee-dashboard" component={EmployeeDashboard} />
      <Route path="/sube/dashboard" component={SubeDashboard} />

      {/* Auth guard - catch-all for unauthenticated users */}
      {!isAuthenticated && <Route component={AuthCatchAllToLogin} />}

      {/* Protected routes - only rendered when authenticated */}
      {isAuthenticated && (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/merkez-dashboard" component={MerkezDashboard} />
          <Route path="/modul/:moduleId" component={MegaModulePage} />
          <Route path="/subeler/:id/nfc" component={SubeNFCDetay} />
          <Route path="/subeler/:id" component={SubeDetay} />
          <Route path="/subeler" component={Subeler} />
          <Route path="/gizlilik-politikasi" component={PrivacyPolicy} />
          <Route path="/personel/:id" component={PersonelProfil} />
          <Route path="/personel-detay/:id" component={PersonelDetay} />
          <Route path="/personel-qr-tokenlar" component={StaffQrTokensPage} />
          <Route path="/ayin-elemani" component={EmployeeOfMonthPage} />
          <Route path="/gelismis-raporlar" component={AdvancedReportsPage} />
          <Route path="/performansim" component={MyPerformancePage} />
          <Route path="/personel-duzenle/:id" component={PersonelDuzenle} />
          <Route path="/personel-onboarding">{() => { if (typeof window !== 'undefined') window.location.href = '/akademi/personel-onboarding'; return null; }}</Route>
          <Route path="/onboarding-programlar">{() => { if (typeof window !== 'undefined') window.location.href = '/akademi/onboarding-programlar'; return null; }}</Route>
          <Route path="/vardiyalar" component={Vardiyalar} />
          <Route path="/vardiya-planlama" component={VardiyaPlanlama} />
          <Route path="/vardiyalarim" component={Vardiyalarim} />
          <Route path="/vardiya-checkin" component={VardiyaCheckin} />
          <Route path="/nfc-giris" component={NFCGiris} />
          <Route path="/personel-musaitlik" component={PersonelMusaitlik} />
          <Route path="/devam-takibi" component={Attendance} />
          <Route path="/sube-vardiya-takibi" component={SubeDashboard} />
          <Route path="/gorevler" component={Tasks} />
          <Route path="/gorev-detay/:id" component={GorevDetay} />
          <Route path="/sube-gorevler/:id" component={SubeGorevler} />
          <Route path="/checklistler" component={Checklists} />
          <Route path="/ekipman-detay/:id" component={EquipmentDetail} />
          <Route path="/ekipman/:tab?" component={EkipmanMegaModule} />
          <Route path="/ariza" component={FaultHub} />
          <Route path="/ariza-detay/:id" component={FaultDetail} />
          <Route path="/ariza-yeni" component={NewFaultReport} />
          <Route path="/ekipman-analitics" component={EquipmentAnalytics} />
          <Route path="/qr-tara" component={QRScanner} />
          <Route path="/bilgi-bankasi" component={KnowledgeBase} />
          <Route path="/akademi-v3/*?" component={AkademiV3} />
          <Route path="/akademi/*?" component={AkademiMegaModule} />
          <Route path="/akademi-modul-editor/:id" component={AcademyModuleEditor} />
          <Route path="/akademi-modul-editor" component={AcademyModuleEditor} />
          <Route path="/akademi-modul/:id" component={ModuleDetail} />
          <Route path="/akademi-quiz/:quizId" component={AcademyQuiz} />
          <Route path="/akademi-rozet-koleksiyonum" component={BadgeCollection} />
          <Route path="/akademi-learning-path/:pathId" component={AcademyLearningPathDetail} />
          <Route path="/egitim-programi/:topicId" component={EgitimProgrami} />
          <Route path="/akademi-hq" component={AcademyHQ} />
          <Route path="/akademi-supervisor" component={AcademySupervisor} />
          <Route path="/akademi-analytics" component={AcademyAnalytics} />
          <Route path="/akademi-badges" component={AcademyBadges} />
          <Route path="/akademi-leaderboard" component={AcademyLeaderboard} />
          <Route path="/akademi-certificates" component={AcademyCertificates} />
          <Route path="/akademi-learning-paths" component={AcademyLearningPaths} />
          <Route path="/akademi-ai-assistant" component={AcademyAIAssistant} />
          <Route path="/akademi-team-competitions" component={AcademyTeamCompetitions} />
          <Route path="/akademi-achievements" component={AcademyAchievements} />
          <Route path="/akademi-progress-overview" component={AcademyProgressOverview} />
          <Route path="/akademi-streak-tracker" component={AcademyStreakTracker} />
          <Route path="/akademi-adaptive-engine" component={AcademyAdaptiveEngine} />
          <Route path="/akademi-social-groups" component={AcademySocialGroups} />
          <Route path="/akademi-advanced-analytics" component={AcademyAdvancedAnalytics} />
          <Route path="/akademi-branch-analytics" component={AcademyBranchAnalytics} />
          <Route path="/akademi-cohort-analytics" component={AcademyCohortAnalytics} />
          <Route path="/receteler" component={Receteler} />
          <Route path="/recete/:id" component={ReceteDetay} />
          <Route path="/egitim/:id" component={ModuleDetail} />
          <Route path="/egitim-ata" component={TrainingAssign} />
          <Route path="/egitim">{() => { if (typeof window !== 'undefined') window.location.href = '/akademi'; return null; }}</Route>
          <Route path="/bildirimler" component={Notifications} />
          <Route path="/duyurular">{() => <HQOnly><IcerikStudyosu /></HQOnly>}</Route>
          <Route path="/icerik-studyosu">{() => <HQOnly><IcerikStudyosu /></HQOnly>}</Route>
          <Route path="/mesajlar">{() => { if (typeof window !== 'undefined') window.location.href = '/bildirimler?tab=mesajlar'; return null; }}</Route>
          <Route path="/proje-gorev/:id" component={ProjeGorevDetay} />
          <Route path="/projeler/:id" component={ProjeDetay} />
          <Route path="/projeler" component={Projeler} />
          <Route path="/yeni-sube-projeler" component={YeniSubeProjeler} />
          <Route path="/yeni-sube-detay/:id" component={YeniSubeDetay} />
          <Route path="/ik/:tab?" component={IK} />
          <Route path="/izin-talepleri" component={LeaveRequests} />
          <Route path="/mesai-talepleri" component={OvertimeRequests} />
          <Route path="/ik-raporlari" component={HRReports} />
          <Route path="/kasa-raporlari" component={CashReports} />
          <Route path="/e2e-raporlar" component={E2EReports} />
          <Route path="/raporlar/:tab?" component={RaporlarMegaModule} />
          <Route path="/raporlar-hub" component={RaporlarHub} />
          <Route path="/performans" component={Performance} />
          <Route path="/muhasebe" component={Muhasebe} />
          <Route path="/mali-yonetim" component={MaliYonetim} />
          <Route path="/fabrika/:tab?" component={FabrikaMegaModule} />
          <Route path="/hq-fabrika-analitik" component={HQFabrikaAnalitik} />
          <Route path="/canli-takip" component={CanliTakip} />
          <Route path="/hq-personel-durum" component={HqStaffDashboard} />
          <Route path="/hq-vardiya-goruntuleme" component={HqVardiyaGoruntuleme} />
          <Route path="/hq-personel-istatistikleri" component={HQPersonelIstatistikleri} />
          <Route path="/muhasebe-raporlama" component={MuhasebeRaporlama} />
          <Route path="/kalite-denetimi" component={KaliteDenetimi} />
          <Route path="/coach-sube-denetim" component={CoachSubeDenetim} />
          <Route path="/denetim-sablonlari" component={DenetimSablonlari} />
          <Route path="/denetimler" component={Denetimler} />
          <Route path="/denetim/:id" component={DenetimYurutme} />
          <Route path="/capa/:id" component={CapaDetay} />
          <Route path="/misafir-geri-bildirim">{() => { window.location.replace("/misafir-memnuniyeti"); return null; }}</Route>
          <Route path="/misafir-memnuniyeti/:tab?" component={MisafirMemnuniyetiModul} />
          <Route path="/sikayetler">{() => { window.location.replace("/crm/ticket-talepler"); return null; }}</Route>
          <Route path="/hq-destek" component={HQSupport} />
          <Route path="/kampanya-yonetimi">{() => { window.location.replace("/crm/kampanyalar"); return null; }}</Route>
          <Route path="/franchise-acilis" component={FranchiseAcilis} />
          <Route path="/franchise-yatirimcilar" component={FranchiseYatirimcilar} />
          <Route path="/franchise-yatirimcilar/:id" component={FranchiseYatirimciDetay} />
          <Route path="/yonetim/icerik" component={AdminContentManagement} />
          <Route path="/yonetim/ayarlar" component={Settings} />
          <Route path="/yonetim/kullanicilar" component={UserCRM} />
          <Route path="/yonetim/degerlendirme" component={YoneticiDegerlendirme} />
          <Route path="/yonetim/ai-maliyetler" component={AICostDashboard} />
          <Route path="/yonetim/checklistler" component={AdminChecklistManagement} />
          <Route path="/yonetim/checklist-takip" component={ChecklistTrackingPage} />
          <Route path="/yonetim/ekipman-servis" component={EquipmentManagement} />
          <Route path="/yonetim/servis-talepleri" component={EquipmentManagement} />
          <Route path="/yonetim/ekipman-yonetimi" component={EquipmentManagement} />
                    <Route path="/yonetim/akademi" component={AdminAcademy} />
          <Route path="/muhasebe-geribildirimi" component={BranchFeedback} />
          <Route path="/kayip-esya" component={KayipEsya} />
          <Route path="/kayip-esya-hq" component={KayipEsyaHQ} />
          <Route path="/destek" component={Destek} />
          <Route path="/operasyon/:tab?" component={OperasyonMegaModule} />
          <Route path="/waste/:tab?" component={WasteMegaModule} />
          <Route path="/hub/:sectionId" component={HubPage} />
          <Route path="/yeni-sube/:tab?" component={YeniSubeMegaModule} />
          <Route path="/banner-editor">{() => <AdminOnly><BannerEditor /></AdminOnly>}</Route>
          <Route path="/crm/*?" component={CRMMegaModule} />
          <Route path="/admin/*?" component={AdminMegaModule} />
          <Route path="/ceo-command-center">{() => <HQOnly><CEOCommandCenter /></HQOnly>}</Route>
          <Route path="/cgo-command-center">{() => <ExecutiveOnly><CGOCommandCenter /></ExecutiveOnly>}</Route>
          <Route path="/hq-dashboard/:department?">{() => <HQOnly><HQDashboard /></HQOnly>}</Route>
          <Route path="/kalite-kontrol-dashboard">{() => <HQOnly><KaliteKontrolDashboard /></HQOnly>}</Route>
          <Route path="/gida-guvenligi-dashboard">{() => <HQOnly><GidaGuvenligiDashboard /></HQOnly>}</Route>
          <Route path="/satinalma/:tab?" component={SatinalmaMega} />
          <Route path="/urun-sikayet">{() => { window.location.replace("/crm/ticket-talepler"); return null; }}</Route>
          <Route path="/raporlar/sube-saglik" component={SubeSaglikSkoru} />
          <Route path="/sube-saglik-skoru" component={SubeSaglikSkoru} />
          <Route path="/sube-karsilastirma">{() => <HQOnly><SubeKarsilastirma /></HQOnly>}</Route>
          <Route path="/kullanim-kilavuzu" component={KullanimKilavuzu} />
          <Route path="/sube/siparis-stok" component={SubeSiparisStok} />
          <Route path="/agent-merkezi" component={AgentMerkezi} />
          <Route path="/benim-gunum" component={BenimGunum} />
          <Route path="/sube-ozet" component={SubeOzet} />
          <Route path="/hq-ozet" component={HQOzet} />
          <Route path="/kocluk-paneli" component={KoclukPaneli} />
          <Route path="/franchise-ozet" component={FranchiseOzet} />
          <Route path="/pdks" component={PdksPage} />
          <Route path="/maas" component={MaasPage} />
          <Route path="/bordrom" component={BordromPage} />
        </>
      )}
      
      <Route component={NotFound} />
    </Switch>
    </Suspense>
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
      "yatirimci_hq": "Yatırımcı HQ",
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
      <div className="flex flex-col min-h-screen bg-background">
        <OfflineBanner />
        <main className="flex-1 overflow-auto">
          <Router />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <OfflineBanner />
      <AppHeader 
        user={user}
        branchName={branchName}
        onQRClick={() => setQrModalOpen(true)}
      />
      
      {/* QR Scanner Modal */}
      <QRScannerModal open={qrModalOpen} onOpenChange={setQrModalOpen} />
      
      {/* Breadcrumb Navigation */}
      <div className="px-2 pt-1">
        <BreadcrumbNavigation />
      </div>
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20">
        <Router />
      </main>
      
      {/* Flow Mode Mini-Bar */}
      <DobodyMiniBar />
      
      {/* Bottom Navigation */}
      <BottomNav />
      
      {/* Global Search (Ctrl+K) */}
      <GlobalSearch />
      
      {/* Global AI Assistant */}
      {user && <GlobalAIAssistant />}
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
              <GlobalLockDialogHost />
            </TooltipProvider>
          </NetworkStatusProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
